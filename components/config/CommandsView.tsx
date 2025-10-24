import React, { useState, useRef, useEffect } from 'react';
import { Vendor } from '../../types';
import { SpinnerIcon, DownloadIcon } from '../Icons';

interface TerminalModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliCommands: string;
    vendor: Vendor;
}

const TerminalModal: React.FC<TerminalModalProps> = ({ isOpen, onClose, cliCommands, vendor }) => {
    const [host, setHost] = useState('');
    const [port, setPort] = useState('22');
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [output, setOutput] = useState('');
    const [userInput, setUserInput] = useState('');
    
    const outputRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);
    
    const cleanup = async (sid: string | null = sessionId) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (sid) {
            await fetch(`/api/ssh/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid }),
                keepalive: true, // Important for cleanup on page unload
            });
        }
        setIsConnected(false);
        setIsConnecting(false);
        setSessionId(null);
    };

    const handleConnect = async () => {
        setIsConnecting(true);
        setOutput(`➡️ Attempting to connect to ${host}:${port}...\n`);

        try {
            const response = await fetch('/api/ssh/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port, username, password }),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || `Connection failed with status ${response.status}`);
            }

            const { sessionId: newSessionId } = await response.json();
            setSessionId(newSessionId);
            setIsConnected(true);
            setOutput(prev => prev + '✅ Connection established.\n');
            streamOutput(newSessionId);
            
            // Auto-deploy initial configuration
            sendInitialCommands(newSessionId, cliCommands, vendor);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setOutput(prev => prev + `\n❌ [ERROR] ${errorMessage}\n`);
            await cleanup();
        } finally {
            setIsConnecting(false);
        }
    };

    const sendInitialCommands = async (sid: string, commands: string, v: Vendor) => {
        const commandList = commands.split('\n');
        let wrappedCommands: string[] = [];

        if (v === 'Cisco') {
            wrappedCommands = ['configure terminal', ...commandList, 'end'];
        } else if (v === 'Huawei' || v === 'H3C') {
            wrappedCommands = [ ...commandList]; // system-view is already included from service
        } else {
            wrappedCommands = commandList;
        }

        const fullCommandBlock = wrappedCommands.join('\n') + '\n';
        await sendInput(fullCommandBlock, sid);
    };

    const streamOutput = async (sid: string) => {
        try {
            abortControllerRef.current = new AbortController();
            const response = await fetch(`/api/ssh/stream/${sid}`, {
                signal: abortControllerRef.current.signal,
            });
            if (!response.ok) {
                throw new Error(`Streaming failed with status ${response.status}`);
            }
            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                setOutput(prev => prev + decoder.decode(value));
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                setOutput(prev => prev + `\n❌ [STREAM ERROR] ${error.message}\nConnection closed.\n`);
                await cleanup(sid);
            }
        }
    };

    const sendInput = async (command: string, sid: string | null = sessionId) => {
        if (!sid) return;
        try {
            await fetch(`/api/ssh/input/${sid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command }),
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setOutput(prev => prev + `\n❌ [INPUT ERROR] ${errorMessage}\n`);
        }
    };

    const handleUserInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && userInput.trim() !== '') {
            await sendInput(userInput + '\n');
            setUserInput('');
        }
    };

    const handleClose = async () => {
        await cleanup();
        onClose();
    };

    useEffect(() => {
        // Cleanup on component unmount
        return () => {
            cleanup();
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={!isConnecting && !isConnected ? onClose : undefined}>
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Interactive SSH Terminal</h2>
                    <button onClick={handleClose} disabled={isConnecting} className="text-slate-400 hover:text-white disabled:opacity-50" aria-label="Close">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {!isConnected ? (
                    <div className="p-6 space-y-4">
                        <h3 className="text-lg text-slate-300">Connection Details</h3>
                         <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Host / IP Address</label>
                                <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="e.g., 192.168.1.1" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Port</label>
                                <input type="number" value={port} onChange={e => setPort(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <button onClick={handleConnect} disabled={isConnecting || !host || !username || !password} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors">
                            {isConnecting && <SpinnerIcon className="w-5 h-5"/>}
                            {isConnecting ? 'Connecting...' : 'Connect & Deploy'}
                        </button>
                        <div ref={outputRef} className="text-xs bg-black rounded p-3 h-64 overflow-y-auto whitespace-pre-wrap border border-slate-600 text-slate-300 font-mono">
                           {output}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 p-4 pt-2 flex flex-col min-h-0">
                        <div ref={outputRef} className="text-sm bg-black rounded-t p-3 overflow-y-auto whitespace-pre-wrap flex-1 border border-b-0 border-slate-600 text-slate-300 font-mono leading-relaxed">
                           <pre><code>{output}</code></pre>
                        </div>
                        <div className="flex items-center bg-black border border-slate-600 rounded-b p-1">
                            <span className="text-green-400 pl-2 pr-1 font-mono">{'>'}</span>
                            <input 
                                type="text" 
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={handleUserInput}
                                className="w-full bg-transparent text-slate-300 font-mono focus:outline-none"
                                placeholder="Type a command and press Enter..."
                                autoFocus
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


interface CommandsViewProps {
    cliCommands: string;
    vendor: Vendor;
}

const CommandsView: React.FC<CommandsViewProps> = ({ cliCommands, vendor }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDownload = () => {
        if (!cliCommands) return;
        const blob = new Blob([cliCommands], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'commands.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-slate-300">Device Configuration Commands</h4>
                <div className="flex items-center gap-2">
                     <button
                        onClick={handleDownload}
                        disabled={!cliCommands}
                        className="p-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 text-sm disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                        title="Download as TXT"
                    >
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        disabled={!cliCommands}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        Deploy via SSH
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <pre className="text-xs bg-slate-900 rounded p-3 overflow-y-auto whitespace-pre-wrap h-full border border-slate-600">
                    {cliCommands || <span className="text-slate-500">Enable and configure features to generate CLI commands.</span>}
                </pre>
            </div>
            
            {isModalOpen && <TerminalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} cliCommands={cliCommands} vendor={vendor} />}
        </div>
    );
};

export default CommandsView;
