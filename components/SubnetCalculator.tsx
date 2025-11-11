import React, { useState, useMemo } from 'react';

// --- IP Calculation Utilities ---
const ipToLong = (ip: string): number | null => {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return null;
    }
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
};

const longToIp = (long: number): string => {
    return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
};

const longToBinary = (long: number): string => {
    return [
        (long >>> 24).toString(2).padStart(8, '0'),
        ((long >>> 16) & 255).toString(2).padStart(8, '0'),
        ((long >>> 8) & 255).toString(2).padStart(8, '0'),
        (long & 255).toString(2).padStart(8, '0')
    ].join('.');
};

const longToHex = (long: number): string => {
    return [
        (long >>> 24).toString(16).padStart(2, '0').toUpperCase(),
        ((long >>> 16) & 255).toString(16).padStart(2, '0').toUpperCase(),
        ((long >>> 8) & 255).toString(16).padStart(2, '0').toUpperCase(),
        (long & 255).toString(16).padStart(2, '0').toUpperCase()
    ].join('.');
};


const cidrToMaskLong = (cidr: number): number => {
    if (cidr < 0 || cidr > 32) return 0;
    return cidr === 0 ? 0 : -1 << (32 - cidr);
};

const parseMask = (maskStr: string): number | null => {
    if (maskStr.includes('.')) {
        const longMask = ipToLong(maskStr);
        // Validate it's a valid mask
        if (longMask === null) return null;
        const inverted = ~longMask;
        if ((inverted & (inverted + 1)) !== 0) return null; // Check if it's a continuous block of 1s
        
        let cidr = 0;
        let tempMask = longMask;
        while (tempMask & 0x80000000) {
            cidr++;
            tempMask <<= 1;
        }
        return cidrToMaskLong(cidr);
    }
    const cidr = parseInt(maskStr, 10);
    if (isNaN(cidr) || cidr < 0 || cidr > 32) return null;
    return cidrToMaskLong(cidr);
};

const SubnetCalculator: React.FC = () => {
    const [input, setInput] = useState('192.168.1.10/24');
    const [hostCount, setHostCount] = useState('120');
    const [ipToConvert, setIpToConvert] = useState('192.168.1.1');
    
    const subnetCalculation = useMemo(() => {
        const [ipStr, maskStr] = input.split('/');
        if (!ipStr || !maskStr) return { error: 'Invalid format. Use IP/Mask (e.g., 192.168.1.1/24).' };

        const ipLong = ipToLong(ipStr);
        const maskLong = parseMask(maskStr);
        
        if (ipLong === null) return { error: 'Invalid IP address.' };
        if (maskLong === null) return { error: 'Invalid subnet mask or CIDR.' };

        const networkLong = ipLong & maskLong;
        const broadcastLong = networkLong | ~maskLong;
        const numHosts = broadcastLong - networkLong - 1;
        
        return {
            address: ipStr,
            networkAddress: longToIp(networkLong),
            broadcastAddress: longToIp(broadcastLong),
            subnetMask: longToIp(maskLong),
            wildcardMask: longToIp(~maskLong),
            hostRange: numHosts > 0 ? `${longToIp(networkLong + 1)} - ${longToIp(broadcastLong - 1)}` : 'N/A',
            numHosts: numHosts > 0 ? numHosts : 0,
        };
    }, [input]);

    const hostCalculation = useMemo(() => {
        const numHosts = parseInt(hostCount, 10);
        if (isNaN(numHosts) || numHosts <= 0) {
            return { error: 'Please enter a positive number of hosts.' };
        }
        if (numHosts > Math.pow(2, 30) - 2) {
            return { error: 'Number of hosts is too large for a single IPv4 subnet.' };
        }

        let hostBits = 0;
        while (Math.pow(2, hostBits) - 2 < numHosts) {
            hostBits++;
        }
        
        const cidr = 32 - hostBits;
        if (cidr < 1) { // practically /1 and /2 are not used for host subnets
             return { error: 'Number of hosts is too large for a typical IPv4 subnet.' };
        }

        const maskLong = cidrToMaskLong(cidr);
        const totalHosts = Math.pow(2, hostBits);
        const usableHosts = totalHosts > 1 ? totalHosts - 2 : 0;

        return {
            requiredHosts: numHosts,
            cidr: `/${cidr}`,
            subnetMask: longToIp(maskLong),
            totalHosts: totalHosts,
            usableHosts: usableHosts,
        };
    }, [hostCount]);

     const ipConversion = useMemo(() => {
        const long = ipToLong(ipToConvert);
        if (long === null) {
            return { error: 'Invalid IPv4 Address.' };
        }
        return {
            binary: longToBinary(long),
            hex: longToHex(long),
            decimal: long.toString(),
        };
    }, [ipToConvert]);

    const ResultRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
        <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
            <span className="text-slate-400">{label}</span>
            <span className="font-mono text-white break-all">{value || '...'}</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-800 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4 text-white">IP子网计算器</h3>
                    <div>
                        <label htmlFor="ip-input" className="block text-sm font-medium text-slate-300 mb-1">IP Address / CIDR or Mask</label>
                        <input
                            id="ip-input"
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="e.g., 192.168.1.1/24 or 10.0.0.5/255.255.0.0"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="mt-6">
                        {'error' in subnetCalculation ? (
                            <div className="text-center py-8 text-red-400 bg-red-500/10 rounded-md">
                                {subnetCalculation.error}
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <ResultRow label="IP Address" value={subnetCalculation.address} />
                                <ResultRow label="网络地址" value={subnetCalculation.networkAddress} />
                                <ResultRow label="广播地址" value={subnetCalculation.broadcastAddress} />
                                <ResultRow label="子网掩码" value={subnetCalculation.subnetMask} />
                                <ResultRow label="反掩码" value={subnetCalculation.wildcardMask} />
                                <ResultRow label="可用主机ip地址段" value={subnetCalculation.hostRange} />
                                <ResultRow label="可用主机数" value={subnetCalculation.numHosts} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-800 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4 text-white">主机数量转换器</h3>
                    <div>
                        <label htmlFor="host-count-input" className="block text-sm font-medium text-slate-300 mb-1">所需可用主机数</label>
                        <input
                            id="host-count-input"
                            type="number"
                            value={hostCount}
                            onChange={(e) => setHostCount(e.target.value)}
                            placeholder="e.g., 120"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="mt-6">
                         {'error' in hostCalculation ? (
                            <div className="text-center py-8 text-red-400 bg-red-500/10 rounded-md">
                                {hostCalculation.error}
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 p-4 rounded-lg">
                                <ResultRow label="所需可用主机" value={hostCalculation.requiredHosts} />
                                <ResultRow label="CIDR 前缀" value={hostCalculation.cidr} />
                                <ResultRow label="子网掩码" value={hostCalculation.subnetMask} />
                                <ResultRow label="子网总主机数" value={hostCalculation.totalHosts} />
                                <ResultRow label="子网可用主机数" value={hostCalculation.usableHosts} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-6 bg-slate-800 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 text-white">IP 进制转换器</h3>
                <div>
                    <label htmlFor="ip-convert-input" className="block text-sm font-medium text-slate-300 mb-1">点分十进制 IP 地址</label>
                    <input
                        id="ip-convert-input"
                        type="text"
                        value={ipToConvert}
                        onChange={(e) => setIpToConvert(e.target.value)}
                        placeholder="e.g., 192.168.1.1"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="mt-6">
                    {'error' in ipConversion ? (
                        <div className="text-center py-8 text-red-400 bg-red-500/10 rounded-md">
                            {ipConversion.error}
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 p-4 rounded-lg">
                            <ResultRow label="二进制" value={ipConversion.binary} />
                            <ResultRow label="十六进制" value={ipConversion.hex} />
                            <ResultRow label="十进制整数" value={ipConversion.decimal} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubnetCalculator;
