
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, exec } from 'child_process';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import net from 'net';
import { promises as dns } from 'dns';
import { ProgressCallback, SshCredentials } from './scripts/inspection/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// --- WebSocket Setup for real-time progress ---
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Use noServer option for manual upgrade handling

const clients = new Set<WebSocket>();
wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', console.error);
});

// Manually handle the HTTP upgrade request for WebSockets
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/api/ws/inspection-progress') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // If the path doesn't match, destroy the socket to reject the connection
    socket.destroy();
  }
});


function broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data, (err) => {
                if (err) console.error('WebSocket send error:', err);
            });
        }
    }
}

// In-memory store for active SSH connections
const connections = new Map<string, { conn: Client, stream: ClientChannel }>();
// In-memory store for inspection history
const inspectionHistory = new Map<string, any[]>();


// --- New NetOps Endpoints ---

function tcpPing(host: string, port: number, timeout: number): Promise<{ alive: boolean, time: number | null }> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const startTime = Date.now();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            const endTime = Date.now();
            socket.destroy();
            resolve({ alive: true, time: endTime - startTime });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ alive: false, time: null });
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve({ alive: false, time: null });
        });

        socket.connect(port, host);
    });
}

function execPing(ip: string, options: { count: number, timeout: number, packetSize: number }): Promise<any> {
    return new Promise((resolve) => {
        const { count, timeout, packetSize } = options;
        const timeoutInSeconds = Math.max(1, Math.round(timeout / 1000));
        
        // FIX: Use -w for timeout on Linux/macOS, not -t (which is TTL)
        const command = `ping -c ${count} -w ${timeoutInSeconds} -s ${packetSize} ${ip}`;

        exec(command, async (error, stdout, stderr) => {
            if (error) {
                resolve({ ip, host: '--', status: 'offline', time: 'Timeout', ttl: 'N/A', error: 'Timeout or host unreachable' });
                return;
            }

            try {
                let hostname = '--';
                try {
                    const hostnames = await dns.reverse(ip);
                    hostname = hostnames[0] || '--';
                } catch (e) { /* Ignore */ }
                
                const ttlMatch = stdout.match(/ttl=(\d+)/);
                const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : 'N/A';
                
                const statsMatch = stdout.match(/min\/avg\/max\/.+?\s=\s([\d.]+)\/([\d.]+)\/([\d.]+)/);
                if (statsMatch) {
                    resolve({
                        ip, host: hostname, status: 'online',
                        time: { min: parseFloat(statsMatch[1]), avg: parseFloat(statsMatch[2]), max: parseFloat(statsMatch[3]) },
                        ttl: ttl,
                    });
                    return;
                }

                const timeMatch = stdout.match(/time=([\d.]+)\s*ms/);
                if (timeMatch) {
                    const time = parseFloat(timeMatch[1]);
                    resolve({ ip, host: hostname, status: 'online', time: { min: time, avg: time, max: time }, ttl: ttl });
                    return;
                }

                resolve({ ip, host: hostname, status: 'online', time: { min: 0, avg: 0, max: 0 }, ttl: ttl, error: 'Could not parse time' });
            } catch (parseError) {
                resolve({ ip, host: '--', status: 'error', time: null, ttl: 'N/A', error: 'Failed to parse ping output.' });
            }
        });
    });
}


// Fix: Add Request and Response types to express route handlers
app.post('/api/ping', async (req: Request, res: Response) => {
    const { ips, options } = req.body;
    if (!Array.isArray(ips)) return res.status(400).json({ error: 'Expected an array of IPs.' });

    const { count = 1, timeout = 2000, packetSize = 56, tcp = false } = options || {};

    try {
        const results = await Promise.all(
            ips.map(async (ip) => {
                try {
                     if (tcp) {
                        const result = await tcpPing(ip, 80, timeout);
                        let hostname = '--';
                         if (result.alive) {
                            try { hostname = (await dns.reverse(ip))[0] || '--'; } catch (e) { /* ignore */ }
                        }
                        return {
                            ip, host: hostname, status: result.alive ? 'online' : 'offline',
                            time: result.alive ? { min: result.time, avg: result.time, max: result.time } : 'Timeout',
                            ttl: 'N/A', error: result.alive ? '' : 'Connection timed out',
                        };
                    } else {
                        return await execPing(ip, { count, timeout, packetSize });
                    }
                } catch (e: any) {
                    return { ip, host: ip, status: 'error', time: null, ttl: 'N/A', error: e.message };
                }
            })
        );
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to execute ping command.' });
    }
});

// Fix: Add Request and Response types to express route handlers
app.get('/api/inspection/templates/:vendor', async (req: Request, res: Response) => {
    const { vendor } = req.params;
    if (!vendor || typeof vendor !== 'string') return res.status(400).json({ error: 'Vendor is required.' });

    try {
        const vendorScriptPath = `./scripts/inspection/${vendor.toLowerCase()}.ts`;
        const scriptModule: { categories?: string[] } = await import(vendorScriptPath);
        const categories = scriptModule.categories || [];
        const templates = [
            { name: '基础巡检', categories: categories.filter(c => c.includes('基本') || c.includes('巡检')) },
            { name: '完整巡检', categories: categories },
        ];
        res.json(templates);
    } catch (error) {
        res.status(404).json({ error: `Templates for vendor '${vendor}' not found.` });
    }
});

// Fix: Add Request and Response types to express route handlers
app.get('/api/inspection/history/:deviceId', (req: Request, res: Response) => {
    const { deviceId } = req.params;
    const history = inspectionHistory.get(deviceId) || [];
    res.json(history);
});

// Fix: Add Request and Response types to express route handlers
app.post('/api/inspect', (req: Request, res: Response) => {
    const { deviceId, host, port: portStr = '22', username, password, vendor, categories: categoriesToRun } = req.body;
    const port = parseInt(portStr, 10);

    if (!deviceId || !host || !username || !password || isNaN(port) || !vendor) {
        return res.status(400).json({ error: 'Missing or invalid inspection parameters.' });
    }
    if (!Array.isArray(categoriesToRun) || categoriesToRun.length === 0) {
        return res.status(400).json({ error: 'Missing or invalid inspection categories.' });
    }
    
    const taskId = crypto.randomUUID();

    // Respond to the client immediately
    res.json({ taskId });

    // The inspection runs in the background
    (async () => {
        const progressCallback: ProgressCallback = (update) => {
            console.log(`Inspection progress for ${deviceId}:`, update);
            broadcast({ deviceId, taskId, ...update });
        };

        const finalResults: Record<string, Record<string, string>> = {};
        let finalError: string | undefined;

        try {
            console.log(`Starting inspection for device ${deviceId} (${vendor}) with categories:`, categoriesToRun);
            
            const vendorScriptPath = `./scripts/inspection/${vendor.toLowerCase()}.ts`;
            // The script now only exports command definitions
            const scriptModule: { COMMAND_CATEGORIES: Record<string, string[]> } = await import(vendorScriptPath);

            if (!scriptModule.COMMAND_CATEGORIES) throw new Error(`Invalid script for ${vendor}: COMMAND_CATEGORIES not found.`);
            
            const allCommandsToRun: { category: string, command: string }[] = [];
            categoriesToRun.forEach(category => {
                const commands = scriptModule.COMMAND_CATEGORIES[category];
                if (commands) {
                    finalResults[category] = {};
                    commands.forEach(command => allCommandsToRun.push({ category, command }));
                }
            });

            if (allCommandsToRun.length === 0) {
                throw new Error('No commands found for the selected categories.');
            }

            progressCallback({ 
                progress: 1, 
                status: 'inspecting',
                log: { 'Status': { 'Connecting...': `Attempting to connect to device ${host}:${port}` } } 
            });
            
            const credentials = { host, port, username, password };
            
            const conn = new Client();
            await new Promise<void>((resolve, reject) => {
                conn.on('ready', resolve)
                    .on('error', reject)
                    .on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
                        if (prompts.length > 0 && (prompts[0].prompt.toLowerCase().includes('password') || prompts[0].prompt.toLowerCase().includes('passwd'))) {
                            finish([credentials.password]);
                        } else {
                            finish([]);
                        }
                    })
                    .connect({ ...credentials, readyTimeout: 20000, keepaliveInterval: 5000, keepaliveCountMax: 3 });
            });

            // This block will be executed only after the connection is ready
            try {
                const setupCommand = vendor === 'cisco' ? 'terminal length 0' : 'screen-length 0 temporary';
                await new Promise<void>((resolve, reject) => {
                    conn.exec(setupCommand, (err, stream) => {
                        if (err) return reject(err);
                        stream.on('close', resolve).on('data', () => {}).stderr.on('data', () => {}); // Consume streams
                    });
                });

                let completedCommands = 0;
                const totalCommands = allCommandsToRun.length;

                for (const { category, command } of allCommandsToRun) {
                    let output = '';
                    try {
                        output = await new Promise<string>((resolve, reject) => {
                            let commandOutput = '';
                            const commandTimeout = setTimeout(() => {
                               reject(new Error('Command execution timed out after 60 seconds'));
                            }, 60000);

                            conn.exec(command, (err, stream) => {
                                if (err) {
                                    clearTimeout(commandTimeout);
                                    return reject(err);
                                }
                                stream.on('data', (data: Buffer) => {
                                    commandOutput += data.toString();
                                }).on('close', () => {
                                    clearTimeout(commandTimeout);
                                    resolve(commandOutput);
                                }).stderr.on('data', (data: Buffer) => {
                                    commandOutput += `[STDERR] ${data.toString()}`;
                                });
                            });
                        });
                        
                        // Clean output to remove the command echo and device prompt
                        const lines = output.split('\n');
                        let startIndex = 0;
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].trim().includes(command.trim())) {
                                startIndex = i + 1;
                                break;
                            }
                        }
                        const promptRegex = /(<[^>]+>|\[[^\]]+\]|#\s*$)/;
                        let endIndex = lines.length;
                        for (let i = lines.length - 1; i >= startIndex; i--) {
                            if (promptRegex.test(lines[i].trim())) {
                                endIndex = i;
                                break;
                            }
                        }
                        const cleanedOutput = lines.slice(startIndex, endIndex).join('\n').trim();
                        finalResults[category][command] = cleanedOutput || output.trim();
                    } catch (e) {
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        console.error(`Command execution failed for ${command}:`, errorMessage);
                        finalResults[category][command] = `Error executing command: ${errorMessage}`;
                    }
                    
                    completedCommands++;
                    progressCallback({
                        progress: Math.min(99, (completedCommands / totalCommands) * 100),
                        log: { [category]: { [command]: finalResults[category][command] } }
                    });
                }
            } finally {
                conn.end();
            }

        } catch (error: any) {
            console.error(`Inspection failed for ${deviceId}:`, error);
            finalError = error.code === 'MODULE_NOT_FOUND' ? 
                `Script for '${vendor}' not found.` : 
                `Inspection failed: ${error.message}`;
            
            const errorLog = { 'Error': { 'Inspection Failed': finalError, 'Details': error.stack || error.toString() } };
            Object.assign(finalResults, errorLog);
        }

        // --- Final broadcast and history logging ---
        const historyEntry = {
            taskId,
            timestamp: new Date().toLocaleString(),
            status: finalError ? 'failed' : 'success',
            log: finalResults,
            error: finalError
        };
        if (!inspectionHistory.has(deviceId)) inspectionHistory.set(deviceId, []);
        inspectionHistory.get(deviceId)!.unshift(historyEntry);
        if (inspectionHistory.get(deviceId)!.length > 20) {
            inspectionHistory.get(deviceId)!.pop();
        }
        
        broadcast({ 
            deviceId, 
            taskId, 
            progress: 100, 
            status: finalError ? 'failed' : 'success', 
            log: finalResults,
            lastInspected: new Date().toLocaleString()
        });
    })();
});


// --- Existing Interactive SSH Endpoints ---
// Fix: Add Request and Response types to express route handlers
app.post('/api/ssh/connect', (req: Request, res: Response) => {
    const { host, port: portStr = '22', username, password } = req.body;
    const port = parseInt(portStr, 10);

    if (!host || !username || !password || isNaN(port)) {
        return res.status(400).json({ error: 'Missing or invalid connection parameters.' });
    }

    const sessionId = crypto.randomUUID();
    const conn = new Client();
    let stream: ClientChannel;

    const cleanup = () => connections.delete(sessionId);

    conn.on('ready', () => {
        conn.shell((err, newStream) => {
            if (err) return res.status(500).json({ error: 'Failed to open shell.' });
            stream = newStream;
            connections.set(sessionId, { conn, stream });
            stream.on('close', () => conn.end());
            stream.on('error', (streamErr) => conn.end());
            res.json({ sessionId });
        });
    }).on('error', (err) => {
        cleanup();
        res.status(500).json({ error: `Connection failed: ${err.message}` });
    }).on('close', cleanup)
      .on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
        if (prompts.length > 0) {
            finish([password]);
        } else {
            finish([]);
        }
    }).connect({
        host, port, username, password, readyTimeout: 20000, timeout: 20000,
    } as ConnectConfig);
});

// Fix: Add Request and Response types to express route handlers
app.get('/api/ssh/stream/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const connInfo = connections.get(sessionId);

    if (!connInfo) return res.status(404).send('Session not found.');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const onData = (data: Buffer) => res.write(data);
    connInfo.stream.on('data', onData);
    req.on('close', () => connInfo.stream.removeListener('data', onData));
});

// Fix: Add Request and Response types to express route handlers
app.post('/api/ssh/input/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { command } = req.body;
    const connInfo = connections.get(sessionId);

    if (!connInfo) return res.status(404).json({ error: 'Session not found.' });
    if (typeof command !== 'string') return res.status(400).json({ error: 'Invalid command.' });

    connInfo.stream.write(command);
    res.status(200).send();
});

// Fix: Add Request and Response types to express route handlers
app.post('/api/ssh/disconnect', (req: Request, res: Response) => {
    const { sessionId } = req.body;
    const connInfo = connections.get(sessionId);
    if (connInfo) {
        connInfo.conn.end();
        connections.delete(sessionId);
    }
    res.status(200).send();
});


server.listen(PORT, () => {
    console.log(`API and WebSocket server running on port ${PORT}`);
});

export default app;
