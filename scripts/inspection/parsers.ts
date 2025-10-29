
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
    const match = output.match(/Memory Using Percentage Is:\s*(\d+)%/i);
    if (match && match[1]) {
        return {
            type: 'memory',
            data: { usage: parseInt(match[1], 10) },
            original: output,
        };
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

const huaweiParsers: Record<string, (output: string) => ParsedResult | null> = {
    'display cpu-usage': parseHuaweiCpuUsage,
    'display memory': parseHuaweiMemory,
    'display fan': parseHuaweiFan,
    'display power': parseHuaweiPower,
    'display device temperature': parseHuaweiTemperature,
};

const ciscoParsers: Record<string, (output: string) => ParsedResult | null> = {
    'show processes cpu': parseCiscoProcessesCpu,
    'show memory summary': parseCiscoMemory,
    'show environment all': parseCiscoEnvironment,
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