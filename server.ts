// FIX: Import Request and Response types directly from 'express' to fix type errors.
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { exec } from 'child_process';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import net from 'net';
import { promises as dns } from 'dns';
import { ProgressCallback } from './scripts/inspection/types';
import os from 'os';
import iconv from 'iconv-lite';
import { parseCommandOutput } from './scripts/inspection/parsers';
import fs from 'fs/promises';
import cron from 'node-cron';
import * as Diff from 'diff';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// --- WebSocket Setup for real-time progress ---
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const clients = new Set<WebSocket>();
wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', console.error);
});

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/api/ws/inspection-progress') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
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

// In-memory stores
const connections = new Map<string, { conn: Client, stream: ClientChannel }>();
const inspectionHistory = new Map<string, any[]>();
const scheduledTasks = new Map<string, { task: cron.ScheduledTask; devices: any[]; cronExpression: string }>();
const scheduledInspectionTasks = new Map<string, { task: cron.ScheduledTask; devices: any[]; templates: any[]; cronExpression: string }>();

// 提取备份逻辑为可复用函数
async function performBackupForDevice(
    deviceId: string, 
    deviceName: string, 
    deviceIp: string, 
    devicePort: number, 
    deviceUsername: string, 
    devicePassword: string, 
    deviceVendor: string
): Promise<{ success: boolean; backup?: any; error?: string }> {
    try {
        const conn = new Client();
        const command = getConfigCommand(deviceVendor);
        
        return await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                conn.end();
                resolve({ success: false, error: 'Connection timeout' });
            }, 60000);

            conn.on('ready', () => {
                clearTimeout(timeout);
                conn.shell(async (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, error: err.message });
                    }

                    let output = '';
                    let commandSent = false;
                    let outputProcessed = false;
                    let dataTimeout: NodeJS.Timeout;
                    
                    const resetDataTimeout = () => {
                        if (dataTimeout) clearTimeout(dataTimeout);
                        dataTimeout = setTimeout(() => {
                            if (commandSent && output.length > 200 && !outputProcessed) {
                                stream.end('quit\r');
                                setTimeout(() => {
                                    conn.end();
                                    processOutput();
                                }, 1000);
                            }
                        }, 5000);
                    };

                    const processOutput = async () => {
                        if (outputProcessed) return;
                        outputProcessed = true;
                        
                        try {
                            let cleanOutput = output
                                .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
                                .replace(/\r/g, '')
                                .replace(/\x08/g, '')
                                .replace(/---- More ----/g, '')
                                .replace(/-- More --/g, '')
                                .replace(/--More--/g, '')
                                .replace(/\[\d+D/g, '')
                                .replace(/\s+$/gm, '');
                            
                            const lines = cleanOutput.split('\n').filter(line => line.trim() !== '');
                            let configStartIndex = -1;
                            let configEndIndex = lines.length;
                            
                            for (let i = 0; i < lines.length; i++) {
                                if (lines[i].includes(command)) {
                                    configStartIndex = i + 1;
                                    break;
                                }
                            }
                            
                            if (configStartIndex !== -1) {
                                for (let i = configStartIndex; i < lines.length; i++) {
                                    const line = lines[i].trim();
                                    if (line.match(/^[<\[].*[>\]]$/) || 
                                        line.match(/^\S+#\s*$/) || 
                                        line.match(/^\S+>\s*$/) ||
                                        line === 'quit' ||
                                        line === 'return' ||
                                        line.startsWith('Error:') ||
                                        line.startsWith('%')) {
                                        configEndIndex = i;
                                        break;
                                    }
                                }
                                cleanOutput = lines.slice(configStartIndex, configEndIndex).join('\n').trim();
                            }
                            
                            if (cleanOutput.length < 100) {
                                cleanOutput = output;
                            }

                            const backupDir = path.join(__dirname, 'backups', deviceName);
                            await fs.mkdir(backupDir, { recursive: true });
                            
                            const now = new Date();
                            const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
                            const timestamp = chinaTime.toISOString()
                                .replace(/T/, '_')
                                .replace(/\..+/, '')
                                .replace(/:/g, '-');
                            
                            const filename = `${deviceName}_${timestamp}.cfg`;
                            const filepath = path.join(backupDir, filename);
                            
                            await fs.writeFile(filepath, cleanOutput, 'utf8');
                            
                            const backup = {
                                id: crypto.randomUUID(),
                                deviceId,
                                deviceName,
                                timestamp: new Date().toISOString(),
                                filename,
                                filepath,
                                size: cleanOutput.length
                            };
                            
                            resolve({ success: true, backup });
                        } catch (err: any) {
                            resolve({ success: false, error: err.message });
                        }
                    };

                    stream.on('data', (data: Buffer) => {
                        const chunk = data.toString();
                        output += chunk;
                        
                        if (commandSent) {
                            if (chunk.includes('---- More ----') || chunk.includes('-- More --') || chunk.includes('--More--')) {
                                stream.write(' ');
                                resetDataTimeout();
                                return;
                            }
                            if (chunk.match(/--\s*More\s*--.*lines/i)) {
                                stream.write(' ');
                                resetDataTimeout();
                                return;
                            }
                            if (chunk.match(/\x1b\[\d+D/) || chunk.match(/\[\d+D/)) {
                                resetDataTimeout();
                                return;
                            }
                            resetDataTimeout();
                        }
                        
                        if (!commandSent && (chunk.includes('>') || chunk.includes('#') || chunk.includes(']'))) {
                            setTimeout(() => {
                                stream.write(command + '\n');
                                commandSent = true;
                                resetDataTimeout();
                            }, 500);
                        }
                    }).on('close', () => {
                        if (dataTimeout) clearTimeout(dataTimeout);
                        conn.end();
                        if (!outputProcessed) {
                            processOutput();
                        }
                    });
                    
                    stream.stderr.on('data', () => {
                        // 忽略错误输出
                    });
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                resolve({ success: false, error: err.message });
            }).connect({
                host: deviceIp,
                port: devicePort,
                username: deviceUsername,
                password: devicePassword,
                readyTimeout: 20000,
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
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 提取巡检逻辑为可复用函数
async function performInspectionForDevice(
    deviceId: string, 
    deviceName: string, 
    deviceIp: string, 
    devicePort: number, 
    deviceUsername: string, 
    devicePassword: string, 
    deviceVendor: string,
    templates: any[]
): Promise<{ success: boolean; results?: any; error?: string }> {
    try {
        const conn = new Client();
        
        return await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                conn.end();
                resolve({ success: false, error: 'Connection timeout' });
            }, 120000);

            conn.on('ready', () => {
                clearTimeout(timeout);
                conn.shell(async (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, error: err.message });
                    }

                    const allCommands: { category: string; command: string; parse?: string; name: string }[] = [];
                    templates.forEach(template => {
                        if (template.commands && Array.isArray(template.commands)) {
                            template.commands.forEach((cmd: any) => {
                                allCommands.push({
                                    category: cmd.category,
                                    command: cmd.cmd,
                                    parse: cmd.parse,
                                    name: cmd.name
                                });
                            });
                        }
                    });

                    if (allCommands.length === 0) {
                        conn.end();
                        return resolve({ success: false, error: 'No commands to execute' });
                    }

                    const commandSequence: string[] = [];
                    
                    if (deviceVendor.toLowerCase() === 'cisco' || deviceVendor.toLowerCase() === 'ruijie') {
                        commandSequence.push('terminal length 0');
                    } else if (deviceVendor.toLowerCase() === 'huawei' || deviceVendor.toLowerCase() === 'h3c') {
                        commandSequence.push('screen-length 0 temporary');
                    }
                    
                    allCommands.forEach(cmd => {
                        commandSequence.push(cmd.command);
                    });
                    
                    commandSequence.push('quit');
                    
                    let buffer = '';
                    let commandIndex = 0;
                    let sessionStarted = false;
                    let outputProcessed = false;
                    const finalResults: Record<string, Record<string, any>> = {};
                    
                    const sendNextCommand = () => {
                        if (commandIndex >= commandSequence.length) {
                            setTimeout(() => {
                                processAllOutput();
                                stream.end();
                            }, 1000);
                            return;
                        }
                        
                        const command = commandSequence[commandIndex];
                        stream.write(command + '\n');
                        commandIndex++;
                        
                        setTimeout(sendNextCommand, 100);
                    };
                    
                    const processAllOutput = () => {
                        if (outputProcessed) return;
                        outputProcessed = true;
                        
                        try {
                            allCommands.forEach(cmdInfo => {
                                if (!finalResults[cmdInfo.category]) {
                                    finalResults[cmdInfo.category] = {};
                                }
                            });

                            let currentBuffer = buffer;
                            
                            allCommands.forEach((cmdInfo) => {
                                const { category, command, name } = cmdInfo;
                                
                                let cleanedOutput = '';
                                const cmdRegex = new RegExp(`${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=<[^>]+>|\\[[^\\]]+\\]|\\S+[#>]|$)`, 'i');
                                const match = currentBuffer.match(cmdRegex);
                                
                                if (match && match[1]) {
                                    cleanedOutput = match[1]
                                        .replace(/\r/g, '')
                                        .replace(/^\s*\n/gm, '')
                                        .replace(/^.*[#>$]\s*$/gm, '')
                                        .trim();
                                }
                                
                                if (!cleanedOutput) {
                                    cleanedOutput = 'No output returned.';
                                }
                                
                                const parsedData = parseCommandOutput(deviceVendor as any, command, cleanedOutput);
                                finalResults[category][name || command] = parsedData;
                            });
                            
                            resolve({ success: true, results: finalResults });
                        } catch (err: any) {
                            resolve({ success: false, error: err.message });
                        }
                    };

                    stream.on('data', (data: Buffer) => {
                        if (!sessionStarted) {
                            sessionStarted = true;
                            setTimeout(sendNextCommand, 500);
                        }
                        
                        const dataStr = data.toString('utf-8');
                        buffer += dataStr;
                        
                        if (dataStr.includes('---- More ----') || dataStr.includes('-- More --')) {
                            stream.write(' ');
                        }
                    });

                    stream.on('close', () => {
                        conn.end();
                        if (!outputProcessed) {
                            processAllOutput();
                        }
                    });
                    
                    stream.on('error', (streamErr) => {
                        conn.end();
                        if (!outputProcessed) {
                            resolve({ success: false, error: streamErr.message });
                        }
                    });
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                resolve({ success: false, error: err.message });
            }).connect({
                host: deviceIp,
                port: devicePort,
                username: deviceUsername,
                password: devicePassword,
                readyTimeout: 20000,
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
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Utility Functions ---
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

        socket.on('error', () => {
            socket.destroy();
            resolve({ alive: false, time: null });
        });

        socket.connect(port, host);
    });
}

interface PingOptions {
    count: number;
    timeout: number;
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
                    if (/请求超时|无法访问目标主机/i.test(stdout)) {
                        status = 'offline';
                    } else {
                        const lostMatch = stdout.match(/已发送\s*=\s*(\d+).*已接收\s*=\s*(\d+)/i);
                        if (lostMatch) {
                            const received = parseInt(lostMatch[2], 10);
                            status = received > 0 ? 'online' : 'offline';
                        }

                        const ttlMatch = stdout.match(/TTL=(\d+)/i);
                        ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : 'N/A';

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

function getConfigCommand(vendor: string): string {
    const commands: Record<string, string> = {
        huawei: 'display current-configuration',
        cisco: 'show running-config',
        h3c: 'display current-configuration',
        ruijie: 'show running-config'
    };
    return commands[vendor.toLowerCase()] || 'show running-config';
}

// --- API Endpoints ---

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

app.get('/api/inspection/history/:deviceId', (req: Request, res: Response) => {
    const { deviceId } = req.params;
    const history = inspectionHistory.get(deviceId) || [];
    res.json(history);
});

app.post('/api/inspect', (req: Request, res: Response) => {
    const { deviceId, host, port: portStr = '22', username, password, vendor, categories: categoriesToRun, commands: templateCommands } = req.body;
    const port = parseInt(portStr, 10);

    if (!deviceId || !host || !username || !password || isNaN(port) || !vendor) {
        return res.status(400).json({ error: 'Missing or invalid inspection parameters.' });
    }
    if (!Array.isArray(categoriesToRun) || categoriesToRun.length === 0) {
        return res.status(400).json({ error: 'Missing or invalid inspection categories.' });
    }
    
    const taskId = crypto.randomUUID();
    res.json({ taskId });

    (async () => {
        const progressCallback: ProgressCallback = (update) => {
            broadcast({ deviceId, taskId, ...update });
        };

        const finalResults: Record<string, Record<string, any>> = {};
        let finalError: string | undefined;

        try {
            const allCommandsToRun: { category: string, command: string, parse?: string, name?: string }[] = [];

            if (!templateCommands || !Array.isArray(templateCommands) || templateCommands.length === 0) {
                throw new Error('Template commands are required for inspection.');
            }

            templateCommands.forEach(templateCmd => {
                if (templateCmd.cmd && categoriesToRun.includes(templateCmd.category)) {
                    if (!finalResults[templateCmd.category]) {
                        finalResults[templateCmd.category] = {};
                    }
                    allCommandsToRun.push({
                        category: templateCmd.category,
                        command: templateCmd.cmd,
                        parse: templateCmd.parse,
                        name: templateCmd.name,
                    });
                }
            });

            if (allCommandsToRun.length === 0) {
                throw new Error(`No commands found for the selected categories: [${categoriesToRun.join(', ')}]`);
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

            try {
                await new Promise<void>((resolve, reject) => {
                    conn.shell((err, stream) => {
                        if (err) return reject(err);

                        const commandSequence: string[] = [];
                        
                        if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                            commandSequence.push('terminal length 0');
                        } else if (vendor.toLowerCase() === 'huawei' || vendor.toLowerCase() === 'h3c') {
                            commandSequence.push(
                                'system-view',
                                'user-interface vty 0 4', 
                                'screen-length 0',
                                'quit'
                            );
                        }
                        
                        allCommandsToRun.forEach(cmd => {
                            commandSequence.push(cmd.command);
                        });
                        
                        if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                            commandSequence.push('terminal length 40');
                        } else if (vendor.toLowerCase() === 'huawei' || vendor.toLowerCase() === 'h3c') {
                            commandSequence.push(
                                'user-interface vty 0 4',
                                'undo screen-length', 
                                'quit'
                            );
                        }
                        
                        commandSequence.push('exit');
                        commandSequence.push('exit');
                        
                        let buffer = '';
                        let commandIndex = 0;
                        let sessionStarted = false;
                        const MORE_REGEX = /---\s*More\s*---/;
                        
                        const sendNextCommand = () => {
                            if (commandIndex >= commandSequence.length) {
                                setTimeout(() => {
                                    processAllOutput();
                                    stream.end();
                                }, 1000);
                                return;
                            }
                            
                            const command = commandSequence[commandIndex];
                            const isInspectionCommand = commandIndex >= getSetupCommandCount() && 
                                                      commandIndex < (commandSequence.length - getCleanupCommandCount() - 1);
                            
                            if (isInspectionCommand) {
                                const inspectionIndex = commandIndex - getSetupCommandCount();
                                const inspectionCmd = allCommandsToRun[inspectionIndex];
                                if (inspectionCmd) {
                                    progressCallback({
                                        progress: Math.min(99, (inspectionIndex / allCommandsToRun.length) * 100),
                                        log: { [inspectionCmd.category]: { [inspectionCmd.name || inspectionCmd.command]: 'Running...' } }
                                    });
                                }
                            }
                            
                            stream.write(command + '\n');
                            commandIndex++;
                            
                            const delay = command === 'quit' ? 300 : 100;
                            setTimeout(sendNextCommand, delay);
                        };
                        
                        const getSetupCommandCount = () => {
                            if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                                return 1;
                            } else {
                                return 4;
                            }
                        };
                        
                        const getCleanupCommandCount = () => {
                            if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                                return 1;
                            } else {
                                return 4;
                            }
                        };
                        
                        const processAllOutput = () => {
                            finalResults['Raw Log'] = {
                                'Complete Session Output': {
                                    type: 'raw',
                                    original: buffer,
                                    data: { raw: buffer }
                                }
                            };
                            
                            let currentBuffer = buffer;
                            
                            allCommandsToRun.forEach((cmdInfo, index) => {
                                const { category, command, name } = cmdInfo;
                                const commandDisplayName = name || command;
                                
                                let cleanedOutput = '';
                                
                                const cmdRegex1 = new RegExp(`${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\s\S]*?)(?=<[^>]+>|\[[^\]]+\]|\S+[#>]|$)`, 'i');
                                const match1 = currentBuffer.match(cmdRegex1);
                                
                                if (match1 && match1[1]) {
                                    cleanedOutput = match1[1]
                                        .replace(/\r/g, '')
                                        .replace(/^\s*\n/gm, '')
                                        .replace(/^.*[#>$]\s*$/gm, '')
                                        .trim();
                                } else {
                                    const cmdIndex = currentBuffer.indexOf(command);
                                    if (cmdIndex !== -1) {
                                        const afterCommand = currentBuffer.substring(cmdIndex + command.length);
                                        const lines = afterCommand.split('\n');
                                        const outputLines: string[] = [];
                                        for (let i = 0; i < Math.min(50, lines.length); i++) {
                                            const line = lines[i].trim();
                                            if (line.match(/^<[^>]+>$|^\[[^\]]+\]$|^\S+[#>]$/)) {
                                                break;
                                            }
                                            if (line.length > 0) {
                                                outputLines.push(line);
                                            }
                                        }
                                        cleanedOutput = outputLines.join('\n');
                                    }
                                }
                                
                                if (!cleanedOutput) {
                                    cleanedOutput = 'No output returned.';
                                }
                                
                                const rawParsedResult = parseCommandOutput(vendor as any, command, cleanedOutput);
                                
                                let parsedData;
                                if (typeof rawParsedResult === 'string') {
                                    parsedData = {
                                        type: 'raw',
                                        original: rawParsedResult,
                                        data: { raw: rawParsedResult }
                                    };
                                } else {
                                    parsedData = rawParsedResult;
                                }
                                
                                finalResults[category][commandDisplayName] = parsedData;
                                
                                progressCallback({
                                    progress: ((index + 1) / allCommandsToRun.length) * 100,
                                    log: { [category]: { [commandDisplayName]: parsedData } }
                                });
                            });
                            
                            progressCallback({
                                progress: 100,
                                log: { 'Raw Log': { 'Complete Session Output': {
                                    type: 'raw',
                                    original: buffer,
                                    data: { raw: buffer }
                                }}}
                            });
                        };

                        stream.on('data', (data: Buffer) => {
                            if (!sessionStarted) {
                                sessionStarted = true;
                                setTimeout(sendNextCommand, 500);
                            }
                            
                            const dataStr = data.toString('utf-8').replace(/\r/g, '');
                            buffer += dataStr;
                            
                            if (MORE_REGEX.test(buffer)) {
                                stream.write(' ');
                            }
                        });

                        stream.on('close', () => {
                            resolve();
                        });
                        
                        stream.on('error', (streamErr) => {
                            reject(streamErr);
                        });
                        
                        stream.stderr.on('data', () => {
                            // Suppress STDERR
                        });
                    });
                });
            } finally {
                conn.end();
            }

        } catch (error: any) {
            finalError = `Inspection failed: ${error.message}`;
            const errorLog = { 'Error': { 'Inspection Failed': finalError, 'Details': error.stack || error.toString() } };
            Object.assign(finalResults, errorLog);
        }

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
        let responseSent = false;

        const cleanup = () => {
            try {
                connections.delete(sessionId);
            } catch (e) {}
        };

        const sendError = (error: string) => {
            if (!responseSent) {
                responseSent = true;
                try {
                    res.status(500).json({ error });
                } catch (e) {}
            }
        };

        const sendSuccess = (data: any) => {
            if (!responseSent) {
                responseSent = true;
                try {
                    res.json(data);
                } catch (e) {}
            }
        };

        const timeout = setTimeout(() => {
            if (!responseSent) {
                cleanup();
                sendError('Connection timeout');
            }
        }, 30000);

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
                stream.on('error', () => {
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
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

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

app.post('/api/device/test', async (req: Request, res: Response) => {
    const { ip, port = 22, username, password } = req.body;
    
    if (!ip || !username || !password) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const conn = new Client();
    let responseSent = false;
    
    const timeout = setTimeout(() => {
        if (!responseSent) {
            responseSent = true;
            conn.end();
            res.status(500).json({ success: false, error: 'Connection timeout' });
        }
    }, 10000);

    conn.on('ready', () => {
        clearTimeout(timeout);
        if (!responseSent) {
            responseSent = true;
            conn.end();
            res.json({ success: true, message: 'Connection successful' });
        }
    }).on('error', (err) => {
        clearTimeout(timeout);
        if (!responseSent) {
            responseSent = true;
            res.status(400).json({ success: false, error: err.message });
        }
    }).connect({
        host: ip,
        port: parseInt(port),
        username,
        password,
        readyTimeout: 10000,
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
});

app.post('/api/device/backup', async (req: Request, res: Response) => {
    const { id, name, ip, port = 22, username, password, vendor } = req.body;
    
    if (!name || !ip || !username || !password || !vendor) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    try {
        const result = await performBackupForDevice(id, name, ip, parseInt(port), username, password, vendor);
        if (result.success) {
            res.json({ success: true, backup: result.backup });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/device/:deviceName/backups', async (req: Request, res: Response) => {
    try {
        const { deviceName } = req.params;
        const backupDir = path.join(__dirname, 'backups', deviceName);
        
        try {
            const files = await fs.readdir(backupDir);
            const backups = await Promise.all(
                files.filter(f => f.endsWith('.cfg')).map(async (file) => {
                    const filepath = path.join(backupDir, file);
                    const stats = await fs.stat(filepath);
                    return {
                        id: crypto.randomUUID(),
                        filename: file,
                        filepath,
                        timestamp: stats.mtime.toISOString(),
                        size: stats.size
                    };
                })
            );
            
            backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            res.json({ success: true, backups });
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                res.json({ success: true, backups: [] });
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/backup/content', async (req: Request, res: Response) => {
    try {
        const { filepath } = req.query;
        if (!filepath || typeof filepath !== 'string') {
            return res.status(400).json({ success: false, error: 'Filepath is required' });
        }

        const content = await fs.readFile(filepath, 'utf8');
        res.json({ success: true, content });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/backups/content', async (req: Request, res: Response) => {
    try {
        const { filepath } = req.query;
        if (!filepath || typeof filepath !== 'string') {
            return res.status(400).json({ success: false, error: 'Filepath is required' });
        }

        const content = await fs.readFile(filepath, 'utf8');
        res.json({ success: true, content });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/backup', async (req: Request, res: Response) => {
    try {
        const { filepath } = req.body;
        if (!filepath) {
            return res.status(400).json({ success: false, error: 'Filepath is required' });
        }

        await fs.unlink(filepath);
        res.json({ success: true, message: 'Backup deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/diff/backups', async (req: Request, res: Response) => {
    try {
        const { oldFilepath, newFilepath } = req.body;

        if (!oldFilepath || !newFilepath) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both oldFilepath and newFilepath are required' 
            });
        }

        const oldContent = await fs.readFile(oldFilepath, 'utf8');
        const newContent = await fs.readFile(newFilepath, 'utf8');

        const changes = Diff.diffLines(oldContent, newContent);
        const stats = {
            added: 0,
            removed: 0,
            unchanged: 0
        };

        changes.forEach(change => {
            const lines = change.value.split('\n').length - 1;
            if (change.added) {
                stats.added += lines;
            } else if (change.removed) {
                stats.removed += lines;
            } else {
                stats.unchanged += lines;
            }
        });

        res.json({ 
            success: true, 
            diff: { 
                changes, 
                stats,
                patch: Diff.createPatch('config', oldContent, newContent, oldFilepath, newFilepath)
            } 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/scheduler/task', (req: Request, res: Response) => {
    try {
        const { cronExpression, devices } = req.body;

        if (!cronExpression || !devices || !Array.isArray(devices)) {
            return res.status(400).json({ 
                success: false, 
                error: 'cronExpression and devices array are required' 
            });
        }

        if (!cron.validate(cronExpression)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cron expression'
            });
        }

        const taskId = crypto.randomUUID();

        const task = cron.schedule(cronExpression, async () => {
            console.log(`[${new Date().toISOString()}] 执行定时备份任务: ${taskId}`);
            
            const backupResults: any[] = [];
            
            for (const device of devices) {
                try {
                    if (!device.management?.ipAddress || !device.management?.credentials?.username || !device.management?.credentials?.password) {
                        console.warn(`[警告] 设备 ${device.name} 信息不完整，跳过备份`);
                        backupResults.push({
                            deviceId: device.id,
                            deviceName: device.name,
                            success: false,
                            error: '设备信息不完整'
                        });
                        continue;
                    }
                    
                    console.log(`[开始] 执行设备 ${device.name} (${device.management.ipAddress}) 的备份`);
                    
                    const result = await performBackupForDevice(
                        device.id,
                        device.name,
                        device.management.ipAddress,
                        device.management.credentials?.port || 22,
                        device.management.credentials?.username,
                        device.management.credentials?.password,
                        device.vendor
                    );
                    
                    backupResults.push({
                        deviceId: device.id,
                        deviceName: device.name,
                        ...result
                    });
                    
                    if (result.success) {
                        console.log(`[成功] 设备 ${device.name} 备份完成，文件: ${result.backup?.filename}`);
                    } else {
                        console.error(`[失败] 设备 ${device.name} 备份失败: ${result.error}`);
                    }
                } catch (error: any) {
                    console.error(`[错误] 设备 ${device.name} 备份发生异常: ${error.message}`);
                    backupResults.push({
                        deviceId: device.id,
                        deviceName: device.name,
                        success: false,
                        error: error.message
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`[完成] 定时任务 ${taskId} 执行完成。成功: ${backupResults.filter(r => r.success).length}/${backupResults.length}`);
            
            broadcast({
                type: 'scheduled-backup-complete',
                taskId,
                timestamp: new Date().toISOString(),
                totalDevices: devices.length,
                successCount: backupResults.filter(r => r.success).length,
                results: backupResults
            });
        });

        scheduledTasks.set(taskId, { task, devices, cronExpression });

        res.json({ 
            success: true, 
            taskId,
            message: 'Scheduled task created successfully' 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/scheduler/task/:taskId', (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const taskData = scheduledTasks.get(taskId);
        if (taskData) {
            taskData.task.stop();
            scheduledTasks.delete(taskId);
            console.log(`[删除] 定时备份任务 ${taskId} 已删除`);
            res.json({ success: true, message: 'Task removed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Task not found' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/scheduler/tasks', (req: Request, res: Response) => {
    try {
        const tasks = Array.from(scheduledTasks.entries()).map(([id, data]) => ({
            id,
            cronExpression: data.cronExpression,
            deviceCount: data.devices.length,
            devices: data.devices.map(d => ({ id: d.id, name: d.name }))
        }));
        res.json({ success: true, tasks });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/scheduler/inspection-task', (req: Request, res: Response) => {
    try {
        const { cronExpression, devices, templates } = req.body;

        if (!cronExpression || !devices || !Array.isArray(devices)) {
            return res.status(400).json({ 
                success: false, 
                error: 'cronExpression and devices array are required' 
            });
        }

        if (!templates || !Array.isArray(templates) || templates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one template is required'
            });
        }

        if (!cron.validate(cronExpression)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cron expression'
            });
        }

        const taskId = crypto.randomUUID();

        const task = cron.schedule(cronExpression, async () => {
            console.log(`[${new Date().toISOString()}] 执行定时巡检任务: ${taskId}`);
            
            const inspectionResults: any[] = [];
            
            for (const device of devices) {
                try {
                    if (!device.credentials?.username || !device.credentials?.password) {
                        console.warn(`[警告] 设备 ${device.name} 缺少凭证，跳过巡检`);
                        inspectionResults.push({
                            deviceId: device.id,
                            deviceName: device.name,
                            success: false,
                            error: '设备缺少SSH凭证'
                        });
                        continue;
                    }
                    
                    console.log(`[开始] 执行设备 ${device.name} (${device.ip}) 的巡检`);
                    
                    const result = await performInspectionForDevice(
                        device.id,
                        device.name,
                        device.ip,
                        device.credentials?.port || 22,
                        device.credentials?.username,
                        device.credentials?.password,
                        device.vendor,
                        templates
                    );
                    
                    inspectionResults.push({
                        deviceId: device.id,
                        deviceName: device.name,
                        ...result
                    });
                    
                    if (result.success) {
                        console.log(`[成功] 设备 ${device.name} 巡检完成`);
                        
                        const historyEntry = {
                            taskId,
                            timestamp: new Date().toLocaleString(),
                            status: 'success',
                            log: result.results,
                            scheduled: true
                        };
                        
                        if (!inspectionHistory.has(device.id)) {
                            inspectionHistory.set(device.id, []);
                        }
                        inspectionHistory.get(device.id)!.unshift(historyEntry);
                        if (inspectionHistory.get(device.id)!.length > 20) {
                            inspectionHistory.get(device.id)!.pop();
                        }
                        
                        broadcast({
                            deviceId: device.id,
                            taskId,
                            progress: 100,
                            status: 'success',
                            log: result.results,
                            lastInspected: new Date().toLocaleString(),
                            scheduled: true
                        });
                    } else {
                        console.error(`[失败] 设备 ${device.name} 巡检失败: ${result.error}`);
                        
                        const historyEntry = {
                            taskId,
                            timestamp: new Date().toLocaleString(),
                            status: 'failed',
                            log: { error: { 'Inspection Failed': result.error } },
                            error: result.error,
                            scheduled: true
                        };
                        
                        if (!inspectionHistory.has(device.id)) {
                            inspectionHistory.set(device.id, []);
                        }
                        inspectionHistory.get(device.id)!.unshift(historyEntry);
                        
                        broadcast({
                            deviceId: device.id,
                            taskId,
                            progress: 100,
                            status: 'failed',
                            log: { error: { 'Inspection Failed': result.error } },
                            lastInspected: new Date().toLocaleString(),
                            scheduled: true
                        });
                    }
                } catch (error: any) {
                    console.error(`[错误] 设备 ${device.name} 巡检发生异常: ${error.message}`);
                    inspectionResults.push({
                        deviceId: device.id,
                        deviceName: device.name,
                        success: false,
                        error: error.message
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`[完成] 定时巡检任务 ${taskId} 执行完成。成功: ${inspectionResults.filter(r => r.success).length}/${inspectionResults.length}`);
            
            broadcast({
                type: 'scheduled-inspection-complete',
                taskId,
                timestamp: new Date().toISOString(),
                totalDevices: devices.length,
                successCount: inspectionResults.filter(r => r.success).length,
                results: inspectionResults
            });
        });

        scheduledInspectionTasks.set(taskId, { task, devices, templates, cronExpression });

        res.json({ 
            success: true, 
            taskId,
            message: 'Scheduled inspection task created successfully' 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/scheduler/inspection-task/:taskId', (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const taskData = scheduledInspectionTasks.get(taskId);
        if (taskData) {
            taskData.task.stop();
            scheduledInspectionTasks.delete(taskId);
            console.log(`[删除] 定时巡检任务 ${taskId} 已删除`);
            res.json({ success: true, message: 'Inspection task removed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Task not found' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/scheduler/inspection-tasks', (req: Request, res: Response) => {
    try {
        const tasks = Array.from(scheduledInspectionTasks.entries()).map(([id, data]) => ({
            id,
            cronExpression: data.cronExpression,
            deviceCount: data.devices.length,
            devices: data.devices.map(d => d.name),  // 返回设备名称数组
            templates: data.templates.map(t => t.id || `${t.vendor}-${t.name}`)  // 返回模板 ID 数组
        }));
        res.json({ success: true, tasks });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`API and WebSocket server running on port ${PORT}`);
});

export default app;