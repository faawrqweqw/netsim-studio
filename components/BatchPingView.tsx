

import React, { useState, useCallback, useRef } from 'react';
import { HourglassIcon } from './Icons';
import { OperationalDevice } from '../types';

interface PingResult {
    ip: string;
    status: 'pending' | 'online' | 'offline' | 'error';
    time: { min: number | null; avg: number | null; max: number | null } | string | null;
    ttl: string | number;
    hostname: string;
    other: string;
}

const ControlField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <label className="text-sm text-slate-300 whitespace-nowrap w-20 text-right">{label}:</label>
        {children}
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border-none rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-700 border-none rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
);

interface BatchPingViewProps {
    devices: OperationalDevice[];
    onUpdateDevice: (device: OperationalDevice) => void;
}

export const BatchPingView: React.FC<BatchPingViewProps> = ({ devices, onUpdateDevice }) => {
    const [startIp, setStartIp] = useState('192.168.1.1');
    const [endIp, setEndIp] = useState('192.168.1.254');
    const [count, setCount] = useState(1);
    const [concurrency, setConcurrency] = useState(32);
    const [timeout, setTimeoutVal] = useState(2000);
    const [packetSize, setPacketSize] = useState(56);
    const [filter, setFilter] = useState('none');
    const [interval, setIntervalVal] = useState(100);
    const [step, setStep] = useState(1);
    const [useTcp, setUseTcp] = useState(false);

    const [results, setResults] = useState<PingResult[]>([]);
    const [isPinging, setIsPinging] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [totalPings, setTotalPings] = useState(0);
    const [processedPings, setProcessedPings] = useState(0);

    const pingControllerRef = useRef({ stop: false });

    const ipToLong = (ip: string): number | null => {
        const parts = ip.split('.').map(part => parseInt(part, 10));
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
        return (parts[0] * 256 * 256 * 256) + (parts[1] * 256 * 256) + (parts[2] * 256) + parts[3];
    };

    const longToIp = (long: number): string => {
        return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
    };

    const generateIpRange = useCallback((startIpStr: string, endIpStr: string, stepVal: number): string[] | null => {
        const startLong = ipToLong(startIpStr);
        const endLong = ipToLong(endIpStr);
        if (startLong === null || endLong === null || endLong < startLong || stepVal < 1) return null;
        const ips: string[] = [];
        for (let i = startLong; i <= endLong; i += stepVal) ips.push(longToIp(i));
        return ips;
    }, []);

    const handleStartPing = useCallback(async () => {
        pingControllerRef.current.stop = false;
        setError('');
        const allIps = generateIpRange(startIp, endIp, step);

        if (!allIps || allIps.length === 0) {
            setError('Invalid IP range or step value.');
            return;
        }

        setTotalPings(allIps.length);
        setProcessedPings(0);
        setResults(allIps.map(ip => ({ ip, status: 'pending', time: '...', ttl: '...', hostname: '...', other: '' })));
        setIsPinging(true);
        setProgress(0);

        const pingOptions = { count, timeout, packetSize, tcp: useTcp };
        const chunks: string[][] = [];
        for (let i = 0; i < allIps.length; i += concurrency) chunks.push(allIps.slice(i, i + concurrency));
        
        let processedCount = 0;
        for (const chunk of chunks) {
            if (pingControllerRef.current.stop) {
                setResults(prev => prev.map(r => r.status === 'pending' ? {...r, status: 'error', other: 'Stopped'} : r));
                break;
            }
            try {
                const response = await fetch('/api/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ips: chunk, options: pingOptions }),
                });
                const chunkResults = await response.json();
                if (!response.ok) throw new Error(chunkResults.error || 'Server error');

                setResults(prevResults => {
                    const newResults = [...prevResults];
                    chunkResults.forEach((res: any) => {
                        const index = newResults.findIndex(r => r.ip === res.ip);
                        if (index !== -1) {
                            newResults[index] = {
                                ip: res.ip,
                                status: res.status,
                                time: res.time,
                                ttl: res.ttl ?? 'N/A',
                                hostname: (res.host && res.host !== res.ip) ? res.host : '--',
                                other: res.error || ''
                            };
                        }
                    });
                    
                    // Sort results: online first, then by IP
                    newResults.sort((a, b) => {
                        if (a.status === 'online' && b.status !== 'online') return -1;
                        if (a.status !== 'online' && b.status === 'online') return 1;
                        
                        const aLong = ipToLong(a.ip);
                        const bLong = ipToLong(b.ip);
                        if (aLong !== null && bLong !== null) return aLong - bLong;

                        return a.ip.localeCompare(b.ip);
                    });

                    return newResults;
                });
            } catch (err) {
                 setResults(prev => {
                    const newResults = [...prev];
                    chunk.forEach(ip => {
                         const idx = newResults.findIndex(r => r.ip === ip);
                         if(idx !== -1 && newResults[idx].status === 'pending') {
                             newResults[idx].status = 'error';
                             newResults[idx].other = err instanceof Error ? err.message : 'Request failed';
                         }
                    });
                    return newResults;
                 });
            }
            processedCount += chunk.length;
            setProcessedPings(processedCount);
            setProgress((processedCount / allIps.length) * 100);
            if (interval > 0) await new Promise(resolve => setTimeout(resolve, interval));
        }
        setIsPinging(false);
    }, [startIp, endIp, step, count, timeout, packetSize, useTcp, concurrency, interval, generateIpRange]);

    const handleStopPing = () => {
        pingControllerRef.current.stop = true;
        setIsPinging(false);
    };

    // FIX: Refactored function to be more explicit with type narrowing, resolving a TypeScript compiler error.
    const formatTime = (time: PingResult['time']): string | null => {
        if (time === null) {
            return null;
        }
        if (typeof time === 'object' && time !== null) {
            const { min, avg, max } = time;
            const format = (n: number | null) => (n !== null ? Math.round(n) : '-');
            return `${format(min)} / ${format(avg)} / ${format(max)}`;
        }
        // After the previous checks, `time` can only be a string.
        return String(time);
    };
    
    return (
        <div className="bg-slate-900 text-slate-200 h-full flex flex-col p-6">
            <h2 className="text-2xl font-bold text-white mb-6">批量PING</h2>
            
            <div className="bg-slate-800 p-4 rounded-lg mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-6"><ControlField label="起始IP"><Input type="text" value={startIp} onChange={e => setStartIp(e.target.value)} /></ControlField></div>
                    <div className="lg:col-span-6"><ControlField label="终止IP"><Input type="text" value={endIp} onChange={e => setEndIp(e.target.value)} /></ControlField></div>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4 items-center">
                    <div className="lg:col-span-2"><ControlField label="次数"><Input type="number" value={count} onChange={e => setCount(parseInt(e.target.value, 10))} /></ControlField></div>
                    <div className="lg:col-span-2"><ControlField label="并发"><Input type="number" value={concurrency} onChange={e => setConcurrency(parseInt(e.target.value, 10))} /></ControlField></div>
                    <div className="lg:col-span-2"><ControlField label="超时(ms)"><Input type="number" value={timeout} onChange={e => setTimeoutVal(parseInt(e.target.value, 10))} /></ControlField></div>
                    <div className="lg:col-span-2"><ControlField label="包长"><Input type="number" value={packetSize} onChange={e => setPacketSize(parseInt(e.target.value, 10))} /></ControlField></div>
                    <div className="lg:col-span-2"><ControlField label="过滤(ms)">
                        <Select value={filter} onChange={e => setFilter(e.target.value)}>
                           <option value="none">不过滤</option>
                           <option value="online">仅显示在线</option>
                        </Select>
                    </ControlField></div>
                    <div className="lg:col-span-2"><ControlField label="间隔(ms)"><Input type="number" value={interval} onChange={e => setIntervalVal(parseInt(e.target.value, 10))} /></ControlField></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4 items-center">
                    <div className="lg:col-span-2"><ControlField label="步长"><Input type="number" value={step} onChange={e => setStep(parseInt(e.target.value, 10) || 1)} /></ControlField></div>
                    <div className="flex items-center lg:col-span-4">
                        <input type="checkbox" id="tcp-ping" checked={useTcp} onChange={e => setUseTcp(e.target.checked)} className="form-checkbox h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-500" />
                        <label htmlFor="tcp-ping" className="ml-2 text-sm text-slate-300 whitespace-nowrap">TCP(80端口, 管理员)</label>
                    </div>
                    <div className="col-span-2 md:col-span-4 lg:col-span-6 flex items-center gap-2">
                        {isPinging ? (
                             <button onClick={handleStopPing} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded">停止</button>
                        ) : (
                             <button onClick={handleStartPing} disabled={!startIp || !endIp} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded disabled:bg-slate-600 disabled:cursor-not-allowed">开始</button>
                        )}
                        <button disabled className="flex-1 bg-slate-700 text-slate-400 font-bold py-2 px-4 rounded cursor-not-allowed">导入</button>
                        <button disabled className="flex-1 bg-slate-700 text-slate-400 font-bold py-2 px-4 rounded cursor-not-allowed">导出</button>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="w-full bg-slate-700 rounded-lg h-6 overflow-hidden">
                    <div className="bg-green-600 h-6" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}></div>
                </div>
                <div className="text-sm font-mono text-slate-300 whitespace-nowrap">
                    {processedPings}/{totalPings} {progress >= 100 && !isPinging ? ' 完成' : ''}
                </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/70 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">IP</th>
                            <th scope="col" className="px-6 py-3">时间(min/avg/max ms)</th>
                            <th scope="col" className="px-6 py-3">TTL</th>
                            <th scope="col" className="px-6 py-3">主机名</th>
                            <th scope="col" className="px-6 py-3">其他</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {results.filter(r => filter === 'none' || r.status === 'online').map((result, index) => (
                             <tr key={result.ip + '-' + index}>
                                <td className={`px-6 py-2 whitespace-nowrap font-mono ${
                                    result.status === 'online' ? 'text-green-400' :
                                    result.status === 'offline' ? 'text-red-400' :
                                    result.status === 'error' ? 'text-orange-400' :
                                    'text-slate-500'
                                }`}>{result.ip}</td>
                                <td className="px-6 py-2 whitespace-nowrap">
                                    {formatTime(result.time)}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap">{result.ttl}</td>
                                <td className="px-6 py-2 whitespace-nowrap">{result.hostname}</td>
                                <td className="px-6 py-2 text-orange-400">{result.other}</td>
                            </tr>
                        ))}
                         {results.length === 0 && !isPinging && (
                            <tr>
                                <td colSpan={5} className="text-center py-16 text-slate-500">
                                    请设置IP范围并点击 "开始".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
