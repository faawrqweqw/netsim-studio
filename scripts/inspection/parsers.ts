
import { Vendor } from '../../types';

export interface ParsedData {
    // A union of all possible structured data types
    [key: string]: any;
}

export interface ParsedResult {
    type: 'cpu' | 'memory' | 'fan' | 'power' | 'temperature' | 'deviceInfo' | 'unknown';
    data: ParsedData;
    original: string;
}

// --- Huawei & H3C Parsers ---
const parseHuaweiCpuUsage = (output: string): ParsedResult | null => {
    const match = output.match(/CPU Usage\s*:\s*(\d+)%/i) || output.match(/CPU utilization for five seconds:\s*(\d+)%/i);
    if (match && match[1]) {
        return {
            type: 'cpu',
            data: { usage: parseInt(match[1], 10) },
            original: output,
        };
    }
    return null;
}

const parseHuaweiMemory = (output: string): ParsedResult | null => {
    // First try the standard Huawei format
    const huaweiMatch = output.match(/Memory Using Percentage Is:\s*(\d+)%/i);
    if (huaweiMatch && huaweiMatch[1]) {
        return {
            type: 'memory',
            data: { usage: parseInt(huaweiMatch[1], 10) },
            original: output,
        };
    }

    // Then try H3C format with FreeRatio
    const h3cFreeMatch = output.match(/FreeRatio\s+(\d+\.?\d*)%/i);
    if (h3cFreeMatch && h3cFreeMatch[1]) {
        const freeRatio = parseFloat(h3cFreeMatch[1]);
        const usedRatio = Math.round(100 - freeRatio);
        return {
            type: 'memory',
            data: { usage: usedRatio },
            original: output,
        };
    }

    // Also try to parse the detailed H3C format for more accuracy
    const h3cDetailMatch = output.match(/Mem:\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (h3cDetailMatch) {
        const total = parseInt(h3cDetailMatch[1]);
        const used = parseInt(h3cDetailMatch[2]);
        if (!isNaN(total) && !isNaN(used) && total > 0) {
            return {
                type: 'memory',
                data: {
                    usage: Math.round((used / total) * 100),
                    totalKB: total,
                    usedKB: used
                },
                original: output,
            };
        }
    }

    return null;
}

const parseHuaweiFan = (output: string): ParsedResult | null => {
    const lines = output.split('\n');
    const fans: { id: string; status: string }[] = [];
    let dataFound = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(FAN\d*)\s+(Normal|Abnormal|Not Present)/i);
        if (match) {
            dataFound = true;
            fans.push({ id: match[1], status: match[2] });
        }
    }
    return dataFound ? { type: 'fan', data: { fans }, original: output } : null;
};

const parseHuaweiPower = (output: string): ParsedResult | null => {
    const lines = output.split('\n');
    const power: { id: string; status: string }[] = [];
    let dataFound = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(POWER\d*)\s+(Normal|Abnormal|Not Present)/i);
        if (match) {
            dataFound = true;
            power.push({ id: match[1], status: match[2] });
        }
    }
    return dataFound ? { type: 'power', data: { power }, original: output } : null;
};

const parseHuaweiTemperature = (output: string): ParsedResult | null => {
    const lines = output.split('\n');
    const temperatures: { sensor: string; temperature: string; status: string }[] = [];
    let dataFound = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().includes('celsius')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 3) {
                 const tempIndex = parts.findIndex(p => p.toLowerCase() === 'celsius');
                 if (tempIndex > 0) {
                     dataFound = true;
                     temperatures.push({
                         sensor: parts.slice(0, tempIndex - 1).join(' '),
                         temperature: `${parts[tempIndex-1]} C`,
                         status: parts[tempIndex + 1] || 'Normal',
                     });
                 }
            }
        }
    }
    return dataFound ? { type: 'temperature', data: { temperatures }, original: output } : null;
};

const parseHuaweiVersion = (output: string): ParsedResult | null => {
    const versionInfo: { [key: string]: string } = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // VRP (R) software, Version X.XXX
        const vrpMatch = trimmed.match(/VRP\s*\(.*?\)\s*[Ss]oftware,?\s*[Vv]ersion\s+([\d.()\w\s-]+)/i);
        if (vrpMatch) versionInfo['Software Version'] = vrpMatch[1].trim();
        
        // Huawei Versatile Routing Platform Software
        const productMatch = trimmed.match(/Huawei\s+(.+?)\s+[Ss]oftware/i);
        if (productMatch && !versionInfo['Product']) versionInfo['Product'] = productMatch[1].trim();
        
        // Copyright Info
        if (trimmed.toLowerCase().includes('copyright') && !versionInfo['Copyright']) {
            versionInfo['Copyright'] = trimmed;
        }
        
        // Uptime
        const uptimeMatch = trimmed.match(/uptime\s+is\s+(.+)/i);
        if (uptimeMatch) versionInfo['Uptime'] = uptimeMatch[1].trim();
    }
    
    return Object.keys(versionInfo).length > 0 
        ? { type: 'version', data: versionInfo, original: output }
        : null;
};

const parseHuaweiInterface = (output: string): ParsedResult | null => {
    const interfaces: { name: string; status: string; protocol: string; ip?: string; description?: string }[] = [];
    const lines = output.split('\n');
    let isTableSection = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip header and separator lines
        if (trimmed.includes('Interface') && trimmed.includes('PHY') || trimmed.match(/^-+$/)) {
            isTableSection = true;
            continue;
        }
        
        if (!isTableSection || !trimmed) continue;
        
        // Parse interface lines: "GigabitEthernet0/0/1  up   up   10.1.1.1/24"
        const match = trimmed.match(/^([\w\/.-]+)\s+(up|down|admin\s*down)\s+(up|down|\*down)(?:\s+([\d.]+(?:\/\d+)?))?/i);
        if (match) {
            interfaces.push({
                name: match[1],
                status: match[2].toLowerCase().replace(/\s+/g, '_'),
                protocol: match[3].toLowerCase(),
                ip: match[4] || undefined
            });
        }
    }
    
    return interfaces.length > 0
        ? { type: 'interface', data: { interfaces }, original: output }
        : null;
};


// --- Cisco Parsers ---
const parseCiscoProcessesCpu = (output: string): ParsedResult | null => {
    const match = output.match(/CPU utilization for five seconds:\s*(\d+)%/i);
    if (match && match[1]) {
        return {
            type: 'cpu',
            data: { usage: parseInt(match[1], 10) },
            original: output,
        };
    }
    return null;
};

const parseCiscoMemory = (output: string): ParsedResult | null => {
    const processorLine = output.split('\n').find(line => line.trim().toLowerCase().startsWith('processor'));
    if (processorLine) {
        const parts = processorLine.trim().split(/\s+/);
        if (parts.length >= 4) {
            const total = parseInt(parts[2]);
            const used = parseInt(parts[3]);
            if (!isNaN(total) && !isNaN(used) && total > 0) {
                return {
                    type: 'memory',
                    data: {
                        usage: parseFloat(((used / total) * 100).toFixed(2)),
                        totalBytes: total,
                        usedBytes: used,
                    },
                    original: output
                };
            }
        }
    }
    return null;
};

const parseCiscoEnvironment = (output: string): ParsedResult | null => {
    const fans: { id: string; status: string }[] = [];
    const power: { id: string; status: string }[] = [];
    const temperatures: { id: string; value: string; status: string }[] = [];

    output.split('\n').forEach(line => {
        line = line.trim();
        let match;
        // Fan 1 is OK
        match = line.match(/^Fan\s+(\d+)\s+is\s+(\w+)/i);
        if (match) fans.push({ id: `Fan ${match[1]}`, status: match[2] });

        // POWER SUPPLY A is OK
        match = line.match(/^POWER SUPPLY\s+(\w+)\s+is\s+(\w+)/i);
        if (match) power.push({ id: `PSU ${match[1]}`, status: match[2] });

        // Inlet Temperature is 25 degrees C, Normal
        match = line.match(/(.*) Temperature is\s+(\d+\s+degrees\s+\w+),\s*(\w+)/i);
        if (match) temperatures.push({ id: match[1].trim() || 'System', value: match[2], status: match[3] });
    });

    const data: ParsedData = {};
    if (fans.length > 0) data.fans = fans;
    if (power.length > 0) data.power = power;
    if (temperatures.length > 0) data.temperatures = temperatures;

    if (Object.keys(data).length > 0) {
        let type: ParsedResult['type'] = 'unknown';
        if (fans.length > 0) type = 'fan';
        else if (power.length > 0) type = 'power';
        else if (temperatures.length > 0) type = 'temperature';
        return { type, data, original: output };
    }
    
    return null;
};

const parseCiscoVersion = (output: string): ParsedResult | null => {
    const versionInfo: { [key: string]: string } = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Cisco IOS Software, Version X.X.X
        const versionMatch = trimmed.match(/Cisco\s+IOS\s+Software.*?[Vv]ersion\s+([\d.()\w-]+)/i);
        if (versionMatch) versionInfo['IOS Version'] = versionMatch[1].trim();
        
        // System image file
        const imageMatch = trimmed.match(/System image file is "(.+)"/i);
        if (imageMatch) versionInfo['System Image'] = imageMatch[1];
        
        // Uptime
        const uptimeMatch = trimmed.match(/uptime is\s+(.+)/i);
        if (uptimeMatch) versionInfo['Uptime'] = uptimeMatch[1].trim();
        
        // Model
        const modelMatch = trimmed.match(/cisco\s+([\w-]+)\s+\(/i);
        if (modelMatch && !versionInfo['Model']) versionInfo['Model'] = modelMatch[1];
    }
    
    return Object.keys(versionInfo).length > 0
        ? { type: 'version', data: versionInfo, original: output }
        : null;
};

const parseCiscoInterface = (output: string): ParsedResult | null => {
    const interfaces: { name: string; status: string; protocol: string; ip?: string }[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Parse: "GigabitEthernet0/0 is up, line protocol is up"
        const match = trimmed.match(/^([\w\/.-]+)\s+is\s+(up|down|administratively down),\s+line protocol is\s+(up|down)/i);
        if (match) {
            interfaces.push({
                name: match[1],
                status: match[2].toLowerCase().replace(/\s+/g, '_'),
                protocol: match[3].toLowerCase()
            });
        }
        
        // Parse IP address from next lines
        const ipMatch = trimmed.match(/Internet address is\s+([\d.]+\/\d+)/i);
        if (ipMatch && interfaces.length > 0) {
            interfaces[interfaces.length - 1].ip = ipMatch[1];
        }
    }
    
    return interfaces.length > 0
        ? { type: 'interface', data: { interfaces }, original: output }
        : null;
};

const huaweiParsers: Record<string, (output: string) => ParsedResult | null> = {
    'display cpu-usage': parseHuaweiCpuUsage,
    'display memory': parseHuaweiMemory,
    'display fan': parseHuaweiFan,
    'display power': parseHuaweiPower,
    'display device temperature': parseHuaweiTemperature,
    'display version': parseHuaweiVersion,
    'display interface brief': parseHuaweiInterface,
    'display ip interface brief': parseHuaweiInterface,
};

const ciscoParsers: Record<string, (output: string) => ParsedResult | null> = {
    'show processes cpu': parseCiscoProcessesCpu,
    'show memory summary': parseCiscoMemory,
    'show environment all': parseCiscoEnvironment,
    'show version': parseCiscoVersion,
    'show ip interface brief': parseCiscoInterface,
    'show interface': parseCiscoInterface,
};

export const parseCommandOutput = (vendor: Vendor, command: string, output: string): ParsedResult | string => {
    let parser: ((output: string) => ParsedResult | null) | undefined;
    
    const trimmedCommand = command.trim();
    
    if (vendor === Vendor.Huawei || vendor === Vendor.H3C) {
        parser = huaweiParsers[trimmedCommand];
    } else if (vendor === Vendor.Cisco) {
        for (const key in ciscoParsers) {
            if (trimmedCommand.startsWith(key)) {
                parser = ciscoParsers[key];
                break;
            }
        }
    }

    if (parser) {
        try {
            const parsed = parser(output);
            if (parsed) return parsed;
        } catch (e) {
            console.error(`Error parsing command "${command}" for vendor ${vendor}:`, e);
        }
    }
    
    return output;
};