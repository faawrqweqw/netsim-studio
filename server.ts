
// Fix: Import `Express`, `Request`, and `Response` types from express for proper type checking.
import express, { Express, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { Client, ClientChannel, ConnectConfig, Prompt } from 'ssh2';
import crypto from 'crypto';
// Fix: Add import for Buffer to resolve a potential type error.
import { Buffer } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix: Explicitly type `app` as `Express` for correct type inference.
const app: Express = express();
const PORT = 3001;

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
// Fix: The `app.use` method is correctly typed when `app` is of type `Express`, resolving the overload error.
app.use(express.json({ limit: '5mb' }));

// In-memory store for active SSH connections
const connections = new Map<string, { conn: Client, stream: ClientChannel }>();

// Fix: Type request and response objects to resolve errors on properties like `body`, `status`, and `json`.
app.post('/api/ssh/connect', (req: Request, res: Response) => {
    const { host, port: portStr = '22', username, password } = req.body;
    const port = parseInt(portStr, 10);

    if (!host || !username || !password || isNaN(port)) {
        return res.status(400).json({ error: 'Missing or invalid connection parameters.' });
    }

    const sessionId = crypto.randomUUID();
    const conn = new Client();
    let stream: ClientChannel;

    const cleanup = () => {
        connections.delete(sessionId);
    };

    conn.on('ready', () => {
        conn.shell((err, newStream) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to open shell.' });
            }
            stream = newStream;
            connections.set(sessionId, { conn, stream });

            stream.on('close', () => {
                conn.end();
            });
            stream.on('error', (streamErr) => {
                 console.error(`[${sessionId}] Stream error:`, streamErr);
                 conn.end();
            });
            
            res.json({ sessionId });
        });
    }).on('error', (err) => {
        console.error(`[${sessionId}] Connection error:`, err);
        cleanup();
        res.status(500).json({ error: `Connection failed: ${err.message}` });
    }).on('close', () => {
        cleanup();
    }).on('keyboard-interactive', (name: string, instructions: string, lang: string, prompts: Prompt[], finish: (responses: string[]) => void) => {
        if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish([password]);
        } else {
            finish([]);
        }
    }).connect({
        host,
        port,
        username,
        password,
        readyTimeout: 20000,
        timeout: 20000,
        algorithms: {
            kex: [
                'curve25519-sha256', 'curve25519-sha256@libssh.org', 'ecdh-sha2-nistp256',
                'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256',
                'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1',
            ],
            serverHostKey: [
                'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521',
                'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa', 'ssh-dss',
            ],
            cipher: [
                'chacha20-poly1305@openssh.com', 'aes256-gcm@openssh.com', 'aes128-gcm@openssh.com',
                'aes256-ctr', 'aes192-ctr', 'aes128-ctr', 'aes256-cbc', 'aes192-cbc', 'aes128-cbc', '3des-cbc',
            ],
            hmac: [
                'hmac-sha2-256-etm@openssh.com', 'hmac-sha2-512-etm@openssh.com', 'hmac-sha2-256',
                'hmac-sha2-512', 'hmac-sha1',
            ],
        }
    } as ConnectConfig);
});

// Fix: Type request and response objects to resolve errors on properties like `params`, `setHeader`, etc.
app.get('/api/ssh/stream/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const connInfo = connections.get(sessionId);

    if (!connInfo) {
        return res.status(404).send('Session not found.');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const onData = (data: Buffer) => {
        res.write(data);
    };

    connInfo.stream.on('data', onData);

    req.on('close', () => {
        connInfo.stream.removeListener('data', onData);
    });
});

// Fix: Type request and response objects.
app.post('/api/ssh/input/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { command } = req.body;
    const connInfo = connections.get(sessionId);

    if (!connInfo) {
        return res.status(404).json({ error: 'Session not found.' });
    }
    if (typeof command !== 'string') {
        return res.status(400).json({ error: 'Invalid command.' });
    }

    connInfo.stream.write(command);
    res.status(200).send();
});


// Fix: Type request and response objects.
app.post('/api/ssh/disconnect', (req: Request, res: Response) => {
    const { sessionId } = req.body;
    const connInfo = connections.get(sessionId);

    if (connInfo) {
        connInfo.conn.end();
        connections.delete(sessionId);
    }
    res.status(200).send();
});


app.listen(PORT, () => {
    console.log(`Interactive SSH API server running on port ${PORT}`);
});

export default app;
