import { Client } from 'ssh2';
import { SshCredentials } from './types';
import { Buffer } from 'buffer';

export const executeCommands = (credentials: SshCredentials, commands: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        let fullOutput = '';

        conn.on('ready', () => {
            conn.exec(commands, (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                stream.on('data', (data: Buffer) => {
                    fullOutput += data.toString();
                }).on('close', () => {
                    conn.end();
                    resolve(fullOutput);
                }).stderr.on('data', (data: Buffer) => {
                    fullOutput += `[STDERR] ${data.toString()}`;
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                finish([credentials.password]);
            } else {
                finish([]);
            }
        }).connect({ ...credentials, readyTimeout: 10000 });
    });
};
