
// FIX: Import Request and Response types directly from 'express' to fix type errors.
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
import os from 'os';
import iconv from 'iconv-lite';
import { parseCommandOutput } from './scripts/inspection/parsers';

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
// FIX: Correctly handle middleware with app.use. The previous error suggested a type issue with express, which is resolved by using a qualified import.
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


interface PingOptions {
    count: number;
    timeout: number; // ms
    packetSize: number;
}

interface PingResult {
    ip: string;
    host: string;
    status: 'online' | 'offline' | 'error';
    time: { min: number; avg: number; max: number } | string;
    ttl: number | 'N/A';
    rawOutput?: string;
    error?: string;
}

export function execPing(ip: string, options: PingOptions): Promise<PingResult> {
    return new Promise(async (resolve) => {
        const { count, timeout, packetSize } = options;
        const platform = os.platform();
        let command = '';
        const pingCmd = platform === 'win32' && process.env.SystemRoot
            ? `${process.env.SystemRoot}\\System32\\ping.exe`
            : 'ping';

        if (platform === 'win32') {
            command = `${pingCmd} -n ${count} -l ${Math.max(1, packetSize)} -w ${timeout} ${ip}`;
        } else if (platform === 'linux') {
            const timeoutSec = Math.max(1, Math.ceil(timeout / 1000));
            command = `ping -c ${count} -s ${packetSize} -W ${timeoutSec} ${ip}`;
        } else if (platform === 'darwin') {
            command = `ping -c ${count} -s ${packetSize} -W ${timeout} ${ip}`;
        }

        exec(command, { encoding: 'buffer' }, async (error, stdoutBuf, stderrBuf) => {
            // 将 Windows 中文输出从 GBK 解码
            const stdout = iconv.decode(stdoutBuf, 'cp936');
            const stderr = iconv.decode(stderrBuf, 'cp936');

            if (error && !stdout) {
                resolve({
                    ip,
                    host: '--',
                    status: 'offline',
                    time: 'Timeout',
                    ttl: 'N/A',
                    rawOutput: stdout,
                    error: 'Timeout or host unreachable'
                });
                return;
            }

            try {
                let hostname = '--';
                try {
                    const hosts = await dns.reverse(ip);
                    if (hosts && hosts.length > 0) hostname = hosts[0];
                } catch {}

                let ttl: number | 'N/A' = 'N/A';
                let time: { min: number; avg: number; max: number } | string = 'Timeout';
                let status: 'online' | 'offline' = 'offline';

                if (platform === 'win32') {
                    // 失败提示直接 offline
                    if (/请求超时|无法访问目标主机/i.test(stdout)) {
                        status = 'offline';
                    } else {
                        // 丢包率判断
                        const lostMatch = stdout.match(/已发送\s*=\s*(\d+).*已接收\s*=\s*(\d+)/i);
                        if (lostMatch) {
                            const received = parseInt(lostMatch[2], 10);
                            status = received > 0 ? 'online' : 'offline';
                        }

                        // TTL 提取
                        const ttlMatch = stdout.match(/TTL=(\d+)/i);
                        ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : 'N/A';

                        // 时间统计
                        const statsMatch = stdout.match(/(?:Minimum|最短)\s*=\s*(\d+)\s*ms[，,]?\s*(?:Maximum|最长)\s*=\s*(\d+)\s*ms[，,]?\s*(?:Average|平均)\s*=\s*(\d+)\s*ms/i);
                        if (statsMatch) {
                            time = {
                                min: parseInt(statsMatch[1], 10),
                                max: parseInt(statsMatch[2], 10),
                                avg: parseInt(statsMatch[3], 10)
                            };
                        } else {
                            const timeMatch = stdout.match(/time[=<]([\d]+)ms/i);
                            if (timeMatch) {
                                const t = parseInt(timeMatch[1], 10);
                                time = { min: t, avg: t, max: t };
                            }
                        }
                    }
                } else {
                    // macOS / Linux
                    const ttlMatch = stdout.match(/ttl=(\d+)/i);
                    ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : 'N/A';

                    const statsMatch = stdout.match(/min\/avg\/max\/.*?=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/);
                    if (statsMatch) {
                        time = { min: parseFloat(statsMatch[1]), avg: parseFloat(statsMatch[2]), max: parseFloat(statsMatch[3]) };
                        status = 'online';
                    } else {
                        const timeMatch = stdout.match(/time=([\d.]+)\s*ms/);
                        if (timeMatch) {
                            const t = parseFloat(timeMatch[1]);
                            time = { min: t, avg: t, max: t };
                            status = 'online';
                        }
                    }

                    // 额外判断无响应情况
                    if (/100% packet loss|Destination Host Unreachable/i.test(stdout)) {
                        status = 'offline';
                    }
                }

                resolve({ ip, host: hostname, status, time, ttl, rawOutput: stdout });
            } catch {
                resolve({ ip, host: '--', status: 'error', time: 'Timeout', ttl: 'N/A', rawOutput: stdout, error: 'Failed to parse ping output' });
            }
        });
    });
}




// FIX: Use Request and Response types from 'express' to fix type errors.
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

// FIX: Use Request and Response types from 'express' to fix type errors.
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

// FIX: Use Request and Response types from 'express' to fix type errors.
app.get('/api/inspection/history/:deviceId', (req: Request, res: Response) => {
    const { deviceId } = req.params;
    const history = inspectionHistory.get(deviceId) || [];
    res.json(history);
});

// FIX: Use Request and Response types from 'express' to fix type errors.
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

        const finalResults: Record<string, Record<string, any>> = {};
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
                    .connect({ 
                        ...credentials, 
                        readyTimeout: 20000, 
                        keepaliveInterval: 5000, 
                        keepaliveCountMax: 3,
                        // 添加更多兼容的算法支持
                        algorithms: {
                            kex: [
                                'diffie-hellman-group1-sha1',
                                'diffie-hellman-group14-sha1',
                                'diffie-hellman-group-exchange-sha1',
                                'diffie-hellman-group-exchange-sha256',
                                'ecdh-sha2-nistp256',
                                'ecdh-sha2-nistp384',
                                'ecdh-sha2-nistp521'
                            ],
                            cipher: [
                                'aes128-ctr',
                                'aes192-ctr',
                                'aes256-ctr',
                                'aes128-gcm',
                                'aes256-gcm',
                                'aes128-cbc',
                                'aes192-cbc',
                                'aes256-cbc',
                                '3des-cbc'
                            ],
                            hmac: [
                                'hmac-sha2-256',
                                'hmac-sha2-512',
                                'hmac-sha1',
                                'hmac-sha1-96'
                            ],
                            serverHostKey: [
                                'ssh-rsa',
                                'ssh-dss',
                                'ecdsa-sha2-nistp256',
                                'ecdsa-sha2-nistp384',
                                'ecdsa-sha2-nistp521',
                                'ssh-ed25519'
                            ]
                        }
                    });
            });

            // This block will be executed only after the connection is ready
            try {
                await new Promise<void>((resolve, reject) => {
                    conn.shell((err, stream) => {
                        if (err) return reject(err);

                        const marker = `---END-OF-COMMAND-${crypto.randomUUID()}---`;
                        const allCommandsWithSetup = [
                            { category: '_setup', command: vendor === 'cisco' ? 'terminal length 0' : 'screen-length 0 temporary' },
                            ...allCommandsToRun
                        ];
                        const MORE_REGEX = /---\s*More\s*---/;

                        let buffer = '';
                        let commandIndex = 0;
                        let isFirstData = true;

                        const runNextCommand = () => {
                            if (commandIndex >= allCommandsWithSetup.length) {
                                stream.end('exit\n');
                                return;
                            }

                            const commandInfo = allCommandsWithSetup[commandIndex];
                            const commandToSend = commandInfo.command.trim();
                            
                            if (commandInfo.category !== '_setup') {
                                progressCallback({
                                    progress: Math.min(99, ((commandIndex -1) / allCommandsToRun.length) * 100),
                                    log: { [commandInfo.category]: { [commandInfo.command]: 'Running...' } }
                                });
                            }
                            stream.write(`${commandToSend}\necho ${marker}\n`);
                        };

                        stream.on('data', (data: Buffer) => {
                            if (isFirstData) {
                                isFirstData = false;
                                // Wait for the initial prompt, then start the command chain.
                                setTimeout(() => runNextCommand(), 500); 
                                return;
                            }
                            const dataStr = data.toString('utf-8').replace(/\r/g, '');
                            buffer += dataStr;
                            
                            // Handle pagination prompt by sending a space.
                            if (MORE_REGEX.test(buffer)) {
                                stream.write(' ');
                                buffer = buffer.replace(MORE_REGEX, '');
                                return; // Wait for the rest of the output
                            }

                            let processedSomething = false;
                            while (buffer.includes(marker)) {
                                processedSomething = true;
                                const markerIndex = buffer.indexOf(marker);
                                let outputBlock = buffer.substring(0, markerIndex);
                                buffer = buffer.substring(markerIndex + marker.length);
                                
                                const finishedCommandInfo = allCommandsWithSetup[commandIndex];
                                
                                if (finishedCommandInfo && finishedCommandInfo.category !== '_setup') {
                                    const { category, command } = finishedCommandInfo;
                                    
                                    let cleanedOutput = outputBlock;
                                    
                                    // 1. Remove command echo from the start
                                    const commandLines = command.split('\n');
                                    for (const cmdLine of commandLines) {
                                        const cmdPattern = new RegExp(`^.*${cmdLine.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\n?`, 'm');
                                        cleanedOutput = cleanedOutput.replace(cmdPattern, '');
                                    }

                                    // 2. Remove the echo command for the marker and the preceding prompt
                                    const echoPattern = new RegExp(`echo\\s+${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
                                    cleanedOutput = cleanedOutput.replace(echoPattern, '');
                                    
                                    // 3. Remove device prompt lines
                                    cleanedOutput = cleanedOutput.replace(/^.*[#>$]\s*$/gm, '');

                                    // 4. Trim excess newlines
                                    cleanedOutput = cleanedOutput.replace(/^\s*\n/gm, '').trim();
                                    
                                    const parsedData = parseCommandOutput(vendor as any, command, cleanedOutput || 'No output returned.');
                                    finalResults[category][command] = parsedData;
                                    
                                    progressCallback({
                                        progress: Math.min(99, ((commandIndex -1) / allCommandsToRun.length) * 100),
                                        log: { [category]: { [command]: parsedData } }
                                    });
                                }
                                
                                commandIndex++;
                            }
                            
                            if(processedSomething) {
                                runNextCommand();
                            }
                        });

                        stream.on('close', () => resolve());
                        stream.on('error', (streamErr) => reject(streamErr));
                        stream.stderr.on('data', (data: Buffer) => {
                           console.error(`[STDERR] ${data.toString()}`);
                        });
                        
                    });
                });
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
// FIX: Use Request and Response types from 'express' to fix type errors.
app.post('/api/ssh/connect', (req: Request, res: Response) => {
    try {
        const { host, port: portStr = '22', username, password } = req.body;
        const port = parseInt(portStr as string, 10);

        if (!host || !username || !password || isNaN(port)) {
            return res.status(400).json({ error: 'Missing or invalid connection parameters.' });
        }

        const sessionId = crypto.randomUUID();
        const conn = new Client();
        let stream: ClientChannel;
        let responseSent = false; // 添加标志防止重复发送响应

        const cleanup = () => {
            try {
                connections.delete(sessionId);
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        };

        const sendError = (error: string) => {
            if (!responseSent) {
                responseSent = true;
                try {
                    res.status(500).json({ error });
                } catch (e) {
                    console.error('Error sending error response:', e);
                }
            }
        };

        const sendSuccess = (data: any) => {
            if (!responseSent) {
                responseSent = true;
                try {
                    res.json(data);
                } catch (e) {
                    console.error('Error sending success response:', e);
                }
            }
        };

        // 添加超时处理
        const timeout = setTimeout(() => {
            if (!responseSent) {
                cleanup();
                sendError('Connection timeout');
            }
        }, 30000); // 30秒超时

        conn.on('ready', () => {
            clearTimeout(timeout);
            conn.shell((err, newStream) => {
                if (err) {
                    cleanup();
                    return sendError('Failed to open shell.');
                }
                stream = newStream;
                connections.set(sessionId, { conn, stream });
                stream.on('close', () => {
                    conn.end();
                    cleanup();
                });
                stream.on('error', (streamErr) => {
                    conn.end();
                    cleanup();
                });
                sendSuccess({ sessionId });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            cleanup();
            sendError(`Connection failed: ${err.message}`);
        }).on('close', () => {
            clearTimeout(timeout);
            cleanup();
            // 只有在连接关闭且没有发送过响应时才发送错误
            if (!responseSent) {
                sendError('Connection closed unexpectedly');
            }
        }).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
            if (prompts.length > 0) {
                finish([password as string]);
            } else {
                finish([]);
            }
        });

        try {
            conn.connect({
                host: host as string, 
                port, 
                username: username as string, 
                password: password as string, 
                readyTimeout: 20000, 
                timeout: 20000,
                // 添加更多兼容的算法支持
                algorithms: {
                    kex: [
                        'diffie-hellman-group1-sha1',
                        'diffie-hellman-group14-sha1',
                        'diffie-hellman-group-exchange-sha1',
                        'diffie-hellman-group-exchange-sha256',
                        'ecdh-sha2-nistp256',
                        'ecdh-sha2-nistp384',
                        'ecdh-sha2-nistp521'
                    ],
                    cipher: [
                        'aes128-ctr',
                        'aes192-ctr',
                        'aes256-ctr',
                        'aes128-gcm',
                        'aes256-gcm',
                        'aes128-cbc',
                        'aes192-cbc',
                        'aes256-cbc',
                        '3des-cbc'
                    ],
                    hmac: [
                        'hmac-sha2-256',
                        'hmac-sha2-512',
                        'hmac-sha1',
                        'hmac-sha1-96'
                    ],
                    serverHostKey: [
                        'ssh-rsa',
                        'ssh-dss',
                        'ecdsa-sha2-nistp256',
                        'ecdsa-sha2-nistp384',
                        'ecdsa-sha2-nistp521',
                        'ssh-ed25519'
                    ]
                }
            } as ConnectConfig);
        } catch (connectError) {
            clearTimeout(timeout);
            cleanup();
            sendError(`Connection setup failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
        }
    } catch (error) {
        console.error('Unexpected error in SSH connect:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// FIX: Use Request and Response types from 'express' to fix type errors.
app.get('/api/ssh/stream/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const connInfo = connections.get(sessionId);

    if (!connInfo) return res.status(404).send('Session not found.');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const onData = (data: Buffer) => {
        if (!res.writableEnded) {
            res.write(data);
        }
    };
    connInfo.stream.on('data', onData);
    req.on('close', () => connInfo.stream.removeListener('data', onData));
});

// FIX: Use Request and Response types from 'express' to fix type errors.
app.post('/api/ssh/input/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { command } = req.body;
    const connInfo = connections.get(sessionId);

    if (!connInfo) return res.status(404).json({ error: 'Session not found.' });
    if (typeof command !== 'string') return res.status(400).json({ error: 'Invalid command.' });

    try {
        connInfo.stream.write(command);
        if (!res.headersSent) {
            res.status(200).send();
        }
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to write command to stream.' });
        }
    }
});

// FIX: Use Request and Response types from 'express' to fix type errors.
app.post('/api/ssh/disconnect', (req: Request, res: Response) => {
    const { sessionId } = req.body;
    const connInfo = connections.get(sessionId as string);
    if (connInfo) {
        connInfo.conn.end();
        connections.delete(sessionId as string);
    }
    if (!res.headersSent) {
        res.status(200).send();
    }
});


server.listen(PORT, () => {
    console.log(`API and WebSocket server running on port ${PORT}`);
});

export default app;
