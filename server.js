
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import ssh2 from 'ssh2';
const { Client } = ssh2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Explicitly configure CORS to allow requests from the Vite frontend.
const corsOptions = {
  origin: 'http://localhost:5173', // The origin of your frontend app
  methods: ['POST', 'GET', 'OPTIONS'],   // Allowed HTTP methods
  allowedHeaders: ['Content-Type'], // Allowed headers
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

app.post('/deploy', (req, res) => {
    // This is the outermost failsafe try/catch block.
    // Its purpose is to catch any synchronous error during the setup phase
    // and guarantee a response is sent.
    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // A safer log function that stringifies and catches write errors.
        const log = (message) => {
            try {
                if (!res.writableEnded) {
                    res.write(String(message));
                }
            } catch (e) {
                console.error("LOGGING_ERROR: Failed to write to response stream:", e instanceof Error ? e.message : String(e));
            }
        };

        log('➡️ [SERVER] Received deployment request...\n');

        const { host, port: portStr = '22', username, password, commands, vendor } = req.body;
        const port = parseInt(portStr, 10);

        if (!host || !username || !password || !commands || !vendor || isNaN(port) || port <= 0 || port > 65535) {
            const errorMsg = '❌ [SERVER] Error: Invalid or missing parameters for deployment.\n';
            log(errorMsg);
            console.error(errorMsg, { body: req.body });
            return res.status(400).end();
        }

        log('✔️ [SERVER] Parameters validated.\n');

        const conn = new Client();
        log('ℹ️ [SERVER] SSH client instantiated.\n');

        let connectionEstablished = false;
        let streamEnded = false;

        const cleanupAndEnd = (finalMessage?: string) => {
            if (streamEnded) return;
            streamEnded = true;
            clearTimeout(failsafeTimeout);
            if (conn) conn.end();
            if (!res.writableEnded) {
                if (finalMessage) log(finalMessage);
                res.end();
            }
        };
        
        const handleError = (err) => {
             if (streamEnded) return;
             clearTimeout(failsafeTimeout);

             let userMessage = `\n❌ [SERVER] Connection Error: ${err.message} (Level: ${err.level})\n`;
             if (err.level === 'client-authentication') {
                 userMessage += '⚠️ Authentication failed. Please double-check your username and password.\n';
             } else if (err.code === 'ECONNREFUSED') {
                 userMessage += '⚠️ Connection refused. Check if the device IP and port are correct and if an SSH server is running and not blocked by a firewall.\n';
             } else if (err.message.toLowerCase().includes('no matching host key type found')) {
                 userMessage += '⚠️ Host key negotiation failed. The device may be using an old or unsupported key type (e.g., ssh-rsa).\n';
             } else if (err.message.toLowerCase().includes('timed out')) {
                  userMessage += '⚠️ Connection timed out. The device is not responding. Check network connectivity and firewall rules.\n';
             } else {
                 userMessage += `⚠️ An unhandled SSH error occurred. Raw error: ${JSON.stringify(err, null, 2)}\n`;
             }
             cleanupAndEnd(userMessage);
        };
        
        const failsafeTimeout = setTimeout(() => {
            if (!connectionEstablished) {
                 cleanupAndEnd('\n❌ [SERVER] Failsafe Timeout: Connection could not be established within 25 seconds. Please check network connectivity, firewalls, and device IP address.\n');
            }
        }, 25000);

        log('ℹ️ [SERVER] Failsafe timeout set.\n');

        const commandList = commands.split('\n');
        let wrappedCommands = [];

        if (vendor === 'Cisco') {
            wrappedCommands = ['configure terminal', ...commandList, 'end', 'write memory'];
        } else if (vendor === 'Huawei' || vendor === 'H3C') {
            wrappedCommands = ['system-view', ...commandList, 'save', 'y'];
        } else {
            wrappedCommands = commandList;
        }
        
        const commandsWithNewline = wrappedCommands.filter(cmd => cmd.trim() !== '').map(cmd => `${cmd}\n`);
        log('ℹ️ [SERVER] Commands prepared.\n');

        conn.on('ready', () => {
            connectionEstablished = true;
            clearTimeout(failsafeTimeout);
            log('✅ [SERVER] SSH connection ready.\n🚀 [SERVER] Starting command execution...\n');

            conn.shell((err, stream) => {
                if (err) return handleError(err);

                stream.on('close', () => {
                    log('🚪 [SERVER] Shell stream closed.\n');
                    cleanupAndEnd('✅ [SERVER] Deployment process finished.\n');
                }).on('data', (data) => {
                    log(data.toString().replace(/\x1B\[[0-9;]*[A-Za-z]/g, ''));
                }).stderr.on('data', (data) => {
                    log(`stderr: ${data.toString()}`);
                });
                
                for (const cmd of commandsWithNewline) {
                    stream.write(cmd);
                }
                stream.end('exit\n');
            });
        });
        
        conn.on('hostkey', (key, callback) => {
            log('ℹ️ [SERVER] Verifying host key... auto-accepting.\n');
            callback(true);
        });

        conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
            log('ℹ️ [SERVER] Server requested keyboard-interactive authentication... responding with password.\n');
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                finish([password]);
            } else {
                finish([]);
            }
        });

        conn.on('error', handleError);
        conn.on('close', () => cleanupAndEnd('\nℹ️ [SERVER] SSH connection closed.\n'));
        
        log('ℹ️ [SERVER] SSH event listeners attached.\n');
        log(`➡️ [SERVER] Attempting to connect to ${host}:${port}...\n`);
        
        conn.connect({
            host,
            port,
            username,
            password,
            readyTimeout: 20000,
            timeout: 20000,
            debug: (s) => {
                log(s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') + '\n');
            },
            algorithms: {
                kex: [
                    'curve25519-sha256',
                    'curve25519-sha256@libssh.org',
                    'ecdh-sha2-nistp256',
                    'ecdh-sha2-nistp384',
                    'ecdh-sha2-nistp521',
                    'diffie-hellman-group-exchange-sha256',
                    'diffie-hellman-group14-sha256',
                    'diffie-hellman-group14-sha1',
                    'diffie-hellman-group1-sha1',
                ],
                serverHostKey: [
                    'ssh-ed25519',
                    'ecdsa-sha2-nistp256',
                    'ecdsa-sha2-nistp384',
                    'ecdsa-sha2-nistp521',
                    'rsa-sha2-512',
                    'rsa-sha2-256',
                    'ssh-rsa',
                    'ssh-dss',
                ],
                cipher: [
                    'chacha20-poly1305@openssh.com',
                    'aes256-gcm@openssh.com',
                    'aes128-gcm@openssh.com',
                    'aes256-ctr',
                    'aes192-ctr',
                    'aes128-ctr',
                    'aes256-cbc',
                    'aes192-cbc',
                    'aes128-cbc',
                    '3des-cbc',
                ],
                mac: [
                    'hmac-sha2-256-etm@openssh.com',
                    'hmac-sha2-512-etm@openssh.com',
                    'hmac-sha2-256',
                    'hmac-sha2-512',
                    'hmac-sha1',
                ],
            }
        });
        
        log('ℹ️ [SERVER] conn.connect() called.\n');

    } catch (error) {
        console.error('CRITICAL_ERROR: Unhandled synchronous error in /deploy route:', error);
        let errorMessage = '❌ A critical server error occurred during initial setup.\n';
        if (error instanceof Error) {
            errorMessage += `Message: ${error.message}\nStack: ${error.stack}\n`;
        } else {
             errorMessage += `Details: ${String(error)}\n`;
        }
        
        if (!res.headersSent) {
            res.status(500).send(errorMessage);
        } else if (!res.writableEnded) {
            res.write(errorMessage);
            res.end();
        }
    }
});


app.post('/generate-config', async (req, res) => {
    const { vendor, deviceType, feature, config } = req.body;

    if (!vendor || !deviceType || !feature || !config) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const scriptPath = path.join(__dirname, 'scripts', 'config_generator.py');
        const configJson = JSON.stringify(config);

        const pythonProcess = spawn('python3', [
            scriptPath,
            '--vendor', vendor,
            '--device-type', deviceType,
            '--feature', feature,
            '--config', configJson
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Python script error:', errorOutput);
                return res.status(500).json({ 
                    cli: '# Configuration generation failed', 
                    explanation: `脚本执行失败: ${errorOutput}` 
                });
            }

            try {
                const result = JSON.parse(output);
                res.status(200).json(result);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                res.status(500).json({ 
                    cli: '# Failed to parse configuration output', 
                    explanation: '配置输出解析失败' 
                });
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            res.status(500).json({ 
                cli: '# Failed to execute configuration generator', 
                explanation: `无法执行配置生成器: ${error.message}` 
            });
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
            cli: '# Internal server error', 
            explanation: `服务器内部错误: ${error.message}` 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Config generator and deployment API server running on port ${PORT}`);
});

export default app;
