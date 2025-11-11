
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
// In-memory store for scheduled backup tasks
const scheduledTasks = new Map<string, { task: cron.ScheduledTask; devices: any[]; cronExpression: string }>();

// 提取备份逻辑为可复用函数
async function performBackupForDevice(deviceId: string, deviceName: string, deviceIp: string, devicePort: number, deviceUsername: string, devicePassword: string, deviceVendor: string): Promise<{ success: boolean; backup?: any; error?: string }> {
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
app.get('/api/inspection/history/:deviceId', (req: Request, res: Response) => {
    const { deviceId } = req.params;
    const history = inspectionHistory.get(deviceId) || [];
    res.json(history);
});

// FIX: Use Request and Response types from 'express' to fix type errors.
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

    // Respond to the client immediately
    res.json({ taskId });

    // The inspection runs in the background
    (async () => {
        const progressCallback: ProgressCallback = (update) => {
            broadcast({ deviceId, taskId, ...update });
        };

        const finalResults: Record<string, Record<string, any>> = {};
        let finalError: string | undefined;

        try {

            const allCommandsToRun: { category: string, command: string, parse?: string, name?: string }[] = [];

            // Process template commands only
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
                        isEcho: true  // All inspection commands need echo markers to capture output
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

            // Long session execution: setup → inspection → cleanup → disconnect
            try {
                await new Promise<void>((resolve, reject) => {
                    conn.shell((err, stream) => {
                        if (err) return reject(err);

                        // Build complete command sequence
                        const commandSequence: string[] = [];
                        
                        // 1. Setup commands - disable terminal limits
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
                        
                        // 2. Add all inspection commands
                        allCommandsToRun.forEach(cmd => {
                            commandSequence.push(cmd.command);
                        });
                        
                        // 3. Cleanup commands - restore terminal limits
                        if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                            commandSequence.push('terminal length 40');
                        } else if (vendor.toLowerCase() === 'huawei' || vendor.toLowerCase() === 'h3c') {
                            commandSequence.push(
                                'user-interface vty 0 4',
                                'undo screen-length', 
                                'quit'
                            );
                        }
                        
                        // 4. Add exit commands to properly close session
                        commandSequence.push('exit');
                        commandSequence.push('exit');
                        
                        let buffer = '';
                        let commandIndex = 0;
                        let sessionStarted = false;
                        const MORE_REGEX = /---\s*More\s*---/;
                        
                        const sendNextCommand = () => {
                            if (commandIndex >= commandSequence.length) {
                                // All commands sent, wait for final output then close
                                setTimeout(() => {
                                    processAllOutput();
                                    stream.end();
                                }, 1000);
                                return;
                            }
                            
                            const command = commandSequence[commandIndex];
                            const isInspectionCommand = commandIndex >= getSetupCommandCount() && 
                                                      commandIndex < (commandSequence.length - getCleanupCommandCount() - 1);
                            
                            // Show progress for inspection commands
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
                            
                            // Send next command after delay (300ms for quit commands, 100ms for others)
                            const delay = command === 'quit' ? 300 : 100;
                            setTimeout(sendNextCommand, delay);
                        };
                        
                        const getSetupCommandCount = () => {
                            if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                                return 1; // terminal length 0
                            } else {
                                return 4; // system-view, user-interface, screen-length, quit
                            }
                        };
                        
                        const getCleanupCommandCount = () => {
                            if (vendor.toLowerCase() === 'cisco' || vendor.toLowerCase() === 'ruijie') {
                                return 1; // terminal length 40
                            } else {
                                return 4; // system-view, user-interface, undo screen-length, quit
                            }
                        };
                        
                        const processAllOutput = () => {
                            // Add complete session output to Raw Log for full inspection view
                            finalResults['Raw Log'] = {
                                'Complete Session Output': {
                                    type: 'raw',
                                    original: buffer,
                                    data: { raw: buffer }
                                }
                            };
                            
                            // Parse the complete output and extract results for each inspection command  
                            let currentBuffer = buffer;
                            
                            allCommandsToRun.forEach((cmdInfo, index) => {
                                const { category, command, name } = cmdInfo;
                                const commandDisplayName = name || command;
                                
                                // Try multiple approaches to find command output
                                let cleanedOutput = '';
                                
                                // Approach 1: Look for command followed by output until next prompt
                                const cmdRegex1 = new RegExp(`${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\s\S]*?)(?=<[^>]+>|\[[^\]]+\]|\S+[#>]|$)`, 'i');
                                const match1 = currentBuffer.match(cmdRegex1);
                                
                                if (match1 && match1[1]) {
                                    cleanedOutput = match1[1]
                                        .replace(/\r/g, '')
                                        .replace(/^\s*\n/gm, '')
                                        .replace(/^.*[#>$]\s*$/gm, '')
                                        .trim();
                                } else {
                                    // Approach 2: Look for command, then extract next lines
                                    const cmdIndex = currentBuffer.indexOf(command);
                                    if (cmdIndex !== -1) {
                                        const afterCommand = currentBuffer.substring(cmdIndex + command.length);
                                        const lines = afterCommand.split('\n');
                                        // Take up to 50 lines or until we hit a device prompt
                                        const outputLines: string[] = [];
                                        for (let i = 0; i < Math.min(50, lines.length); i++) {
                                            const line = lines[i].trim();
                                            if (line.match(/^<[^>]+>$|^\[[^\]]+\]$|^\S+[#>]$/)) {
                                                break; // Hit device prompt, stop
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
                                
                                // Parse the output
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
                            
                            // After processing all commands, send final completion message
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
                                // Wait for initial prompt, then start sending commands
                                setTimeout(sendNextCommand, 500);
                            }
                            
                            const dataStr = data.toString('utf-8').replace(/\r/g, '');
                            buffer += dataStr;
                            
                            // Handle pagination by sending space
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
                        
                        stream.stderr.on('data', (data: Buffer) => {
                            // Suppress STDERR output
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
                // Suppress cleanup errors
            }
        };

        const sendError = (error: string) => {
            if (!responseSent) {
                responseSent = true;
                try {
                    res.status(500).json({ error });
                } catch (e) {
                    // Suppress response error logging
                }
            }
        };

        const sendSuccess = (data: any) => {
            if (!responseSent) {
                responseSent = true;
                try {
                    res.json(data);
                } catch (e) {
                    // Suppress response error logging
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

// --- Backup Configuration Endpoints ---

// Helper function to get device config command by vendor
function getConfigCommand(vendor: string): string {
    const commands: Record<string, string> = {
        huawei: 'display current-configuration',
        cisco: 'show running-config',
        h3c: 'display current-configuration',
        ruijie: 'show running-config'
    };
    return commands[vendor.toLowerCase()] || 'show running-config';
}

// Test device connection
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

// Backup device configuration
app.post('/api/device/backup', async (req: Request, res: Response) => {
    const { id, name, ip, port = 22, username, password, vendor } = req.body;
    
    if (!name || !ip || !username || !password || !vendor) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    try {
        const conn = new Client();
        const command = getConfigCommand(vendor);
        
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                conn.end();
                reject(new Error('Connection timeout'));
            }, 60000); // 增加超时时间到 60 秒

            conn.on('ready', () => {
                clearTimeout(timeout);
                
                // 使用 shell 模式而不是 exec，更适合真机设备
                conn.shell((err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    let output = '';
                    let commandSent = false;
                    let outputProcessed = false;
                    let dataTimeout: NodeJS.Timeout;
                    
                    // 设置数据接收超时，如果 5 秒内没有新数据，认为命令执行完成
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
                        if (outputProcessed) {
                            return;
                        }
                        outputProcessed = true;
                        
                        try {
                            // 清理输出：移除 ANSI 控制字符、分页符和多余的提示符
                            let cleanOutput = output
                                .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '') // 移除 ANSI 颜色代码
                                .replace(/\r/g, '') // 移除回车符
                                .replace(/\x08/g, '') // 移除退格符
                                .replace(/---- More ----/g, '') // 移除华为/华三分页符
                                .replace(/-- More --/g, '') // 移除华三分页符
                                .replace(/--More--/g, '') // 移除思科分页符
                                .replace(/\[\d+D/g, '') // 移除 ANSI 光标控制
                                .replace(/\s+$/gm, ''); // 移除行尾空格
                            
                            // 提取配置内容：从命令后开始到最后一个提示符之前
                            const lines = cleanOutput.split('\n').filter(line => line.trim() !== '');
                            let configStartIndex = -1;
                            let configEndIndex = lines.length;
                            
                            // 找到命令执行的开始位置
                            for (let i = 0; i < lines.length; i++) {
                                if (lines[i].includes(command)) {
                                    configStartIndex = i + 1;
                                    break;
                                }
                            }
                            
                            // 找到配置结束位置（下一个提示符）
                            if (configStartIndex !== -1) {
                                for (let i = configStartIndex; i < lines.length; i++) {
                                    const line = lines[i].trim();
                                    // 检测常见的设备提示符
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
                            
                            // 如果没有提取到内容，使用原始输出
                            if (cleanOutput.length < 100) {
                                cleanOutput = output;
                            }

                            // Save backup file
                            const backupDir = path.join(__dirname, 'backups', name);
                            await fs.mkdir(backupDir, { recursive: true });
                            
                            // 格式化时间戳：中国上海时区 (UTC+8) YYYY-MM-DD_HH-mm-ss
                            const now = new Date();
                            const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
                            const timestamp = chinaTime.toISOString()
                                .replace(/T/, '_')
                                .replace(/\..+/, '')
                                .replace(/:/g, '-');
                            
                            // 文件名格式：设备名称_时间.cfg
                            const filename = `${name}_${timestamp}.cfg`;
                            const filepath = path.join(backupDir, filename);
                            
                            await fs.writeFile(filepath, cleanOutput, 'utf8');
                            
                            const backup = {
                                id: crypto.randomUUID(),
                                deviceId: id,
                                deviceName: name,
                                timestamp: new Date().toISOString(),
                                filename,
                                filepath,
                                size: cleanOutput.length
                            };
                            
                            res.json({ success: true, backup });
                            resolve();
                        } catch (err: any) {
                            reject(err);
                        }
                    };

                    stream.on('data', (data: Buffer) => {
                        const chunk = data.toString();
                        output += chunk;
                        
                        // 检测分页符并自动翻页
                        if (commandSent) {
                            // 华为/华三设备的分页符：---- More ----
                            if (chunk.includes('---- More ----')) {
                                stream.write(' ');
                                resetDataTimeout();
                                return;
                            }
                            
                            // 华三设备的另一种分页符：-- More --
                            if (chunk.includes('-- More --')) {
                                stream.write(' ');
                                resetDataTimeout();
                                return;
                            }
                            
                            // 思科设备的分页符：--More--
                            if (chunk.includes('--More--')) {
                                stream.write(' ');
                                resetDataTimeout();
                                return;
                            }
                            
                            // 检测到 lines 关键字（某些设备显示 "--More-- lines 1-24"）
                            if (chunk.match(/--\s*More\s*--.*lines/i)) {
                                stream.write(' ');
                                resetDataTimeout();
                                return;
                            }
                            
                            // 检测 ANSI 控制符（分页清除后留下的）
                            if (chunk.match(/\x1b\[\d+D/) || chunk.match(/\[\d+D/)) {
                                resetDataTimeout();
                                return;
                            }
                            
                            // 命令发送后，重置超时计时器
                            resetDataTimeout();
                        }
                        
                        // 等待设备准备好（出现提示符），然后发送命令
                        if (!commandSent && (chunk.includes('>') || chunk.includes('#') || chunk.includes(']'))) {
                            // 等待一小段时间确保设备就绪
                            setTimeout(() => {
                                stream.write(command + '\n');
                                commandSent = true;
                                resetDataTimeout();
                            }, 500);
                        }
                    }).on('close', () => {
                        if (dataTimeout) clearTimeout(dataTimeout);
                        conn.end();
                        if (!res.headersSent && !outputProcessed) {
                            processOutput();
                        }
                    });
                    
                    stream.stderr.on('data', (data: Buffer) => {
                        // 记录错误但不阻断
                        console.error('stderr:', data.toString());
                    });
                });
            }).on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            }).connect({
                host: ip,
                port: parseInt(port),
                username,
                password,
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
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get backup history for a device
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

// Get backup content
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

// Get backup content (alias)
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

// Delete backup
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

// Compare backups (diff)
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

// Create scheduled backup task
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
            console.log(`[${new Date().toISOString()}] 执行定时任务1: ${taskId}`);
            
            // 並联执行所有设备的备份
            const backupResults: any[] = [];
            
            for (const device of devices) {
                try {
                    // 检查设备是否有必要的信息
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
                
                // 延迟 100ms 以便不同设备之间的连接冲突
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log(`[完成] 定时任务 ${taskId} 执行完成。成功: ${backupResults.filter(r => r.success).length}/${backupResults.length}`);
            
            // 可选: 技查结果发送给所有连接的 WebSocket 客户端
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

// Remove scheduled task
app.delete('/api/scheduler/task/:taskId', (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const taskData = scheduledTasks.get(taskId);
        if (taskData) {
            taskData.task.stop();
            scheduledTasks.delete(taskId);
            console.log(`[删除] 定时任务 ${taskId} 已删除`);
            res.json({ success: true, message: 'Task removed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Task not found' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// List scheduled tasks
app.get('/api/scheduler/tasks', (req: Request, res: Response) => {
    try {
        const tasks = Array.from(scheduledTasks.entries()).map(([id, data]) => ({
            id,
            cronExpression: data.cronExpression,
            deviceCount: data.devices.length,
            devices: data.devices.map(d => ({ id: d.id, name: d.name })),
            status: data.task.status // Returns 'started' or 'stopped'
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
