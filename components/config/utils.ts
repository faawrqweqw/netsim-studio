import { DeviceType, Vendor, LinkConfig } from '../../types';

// 将VLAN ID数组优化为范围格式
export const optimizeVlanRanges = (vlans: number[]): string => {
    if (vlans.length === 0) return '';

    const sortedVlans = vlans.sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sortedVlans[0];
    let end = start;

    for (let i = 1; i < sortedVlans.length; i++) {
        if (sortedVlans[i] === end + 1) {
            end = sortedVlans[i];
        } else {
            if (start === end) {
                ranges.push(start.toString());
            } else if (end === start + 1) {
                ranges.push(start.toString());
                ranges.push(end.toString());
            } else {
                ranges.push(`${start}-${end}`);
            }
            start = sortedVlans[i];
            end = start;
        }
    }

    // 处理最后一个范围
    if (start === end) {
        ranges.push(start.toString());
    } else if (end === start + 1) {
        ranges.push(start.toString());
        ranges.push(end.toString());
    } else {
        ranges.push(`${start}-${end}`);
    }

    return ranges.join(',');
};

const parsePortRange = (rangeStr: string): number[] => {
    if (!rangeStr) return [];
    const result = new Set<number>();
    const parts = rangeStr.split(',');
    parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(v => parseInt(v, 10));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    result.add(i);
                }
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num)) {
                result.add(num);
            }
        }
    });
    return Array.from(result).sort((a, b) => a - b);
};


const generateInterfaceConfigBody = (vendor: Vendor, config: LinkConfig, deviceType?: DeviceType): string => {
    let cli = '';
    if (config.mode === 'l3') {
        cli += ` no switchport\n`;
    } else if (config.mode === 'access') {
        const vlanId = config.accessVlan || '1';
        switch (vendor) {
            case Vendor.Cisco:
                cli += ` switchport mode access\n switchport access vlan ${vlanId}\n`;
                break;
            case Vendor.Huawei:
                cli += ` port link-type access\n port default vlan ${vlanId}\n`;
                break;
            case Vendor.H3C:
                cli += ` port access vlan ${vlanId}\n`;
                break;
        }
    } else if (config.mode === 'trunk') {
        const nativeVlan = config.trunkNativeVlan || '';
        const allowedVlans = config.trunkAllowedVlans || '1-4094';

        const formatVlanRange = (vlanRange: string, vendor: Vendor): string => {
            if (!vlanRange) return '';
            const vlans: number[] = [];
            vlanRange.split(',').forEach(part => {
                const trimmed = part.trim();
                if (trimmed.includes('-')) {
                    const [start, end] = trimmed.split('-').map(v => parseInt(v.trim()));
                    for (let i = start; i <= end && i <= 4094; i++) vlans.push(i);
                } else if (!isNaN(parseInt(trimmed))) vlans.push(parseInt(trimmed));
            });

            const sortedVlans = [...new Set(vlans)].sort((a, b) => a - b);
            
            if (vendor === Vendor.Huawei || vendor === Vendor.H3C) {
                 const ranges: string[] = [];
                    let i = 0;
                    while (i < sortedVlans.length) {
                        const start = sortedVlans[i];
                        let end = start;
                        while (i + 1 < sortedVlans.length && sortedVlans[i + 1] === sortedVlans[i] + 1) i++; end = sortedVlans[i];
                        if (start === end) ranges.push(start.toString());
                        else if (end === start + 1) ranges.push(start.toString(), end.toString());
                        else ranges.push(`${start} to ${end}`);
                        i++;
                    }
                    return ranges.join(' ');
            }
            return optimizeVlanRanges(sortedVlans);
        };

        const formattedVlans = formatVlanRange(allowedVlans, vendor);

        switch (vendor) {
            case Vendor.Cisco:
                cli += ` switchport mode trunk\n`;
                if (nativeVlan) cli += ` switchport trunk native vlan ${nativeVlan}\n`;
                cli += ` switchport trunk allowed vlan ${formattedVlans}\n`;
                break;
            case Vendor.Huawei:
                cli += ` port link-type trunk\n`;
                if (nativeVlan) cli += ` port trunk pvid vlan ${nativeVlan}\n`;
                cli += ` port trunk allow-pass vlan ${formattedVlans}\n`;
                break;
            case Vendor.H3C:
                cli += ` port link-type trunk\n`;
                if (nativeVlan) cli += ` port trunk pvid vlan ${nativeVlan}\n`;
                cli += ` port trunk permit vlan ${formattedVlans}\n`;
                break;
        }
    }
    return cli;
};

export const generateInterfaceCli = (portName: string, vendor: Vendor, config: LinkConfig, deviceType?: DeviceType): string => {
    if (!portName || config.mode === 'unconfigured') return '';

    const configBody = generateInterfaceConfigBody(vendor, config, deviceType);
    if (!configBody.trim()) return '';

    const getPortBase = (pName: string): string => {
        const lastSlash = pName.lastIndexOf('/');
        if (lastSlash === -1) {
            return pName.replace(/\d+$/, '');
        }
        return pName.substring(0, lastSlash + 1);
    };

    if (config.applyToPortRange) {
        const portNumbers = parsePortRange(config.applyToPortRange);
        if (portNumbers.length > 0) {
            const baseName = getPortBase(portName);
            let allCli = '';
            const exitCmd = (vendor === Vendor.Huawei || vendor === Vendor.H3C) ? 'quit' : 'exit';

            portNumbers.forEach(num => {
                const currentPortName = `${baseName}${num}`;
                allCli += `interface ${currentPortName}\n`;
                allCli += configBody;
                allCli += `${exitCmd}\n`;
            });
            return allCli;
        }
    }

    // Fallback to single port
    let cli = `interface ${portName}\n`;
    cli += configBody;
    cli += (vendor === Vendor.Huawei || vendor === Vendor.H3C) ? 'quit' : 'exit';
    return cli;
};