import { DHCPConfig, DHCPPool, DHCPStaticBinding } from '../../types';

export const generateDhcpCli = (vendor: string, deviceType: string, config: DHCPConfig): { cli: string; explanation: string } => {
    const { pools = [] } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    const ipToHex = (ip: string): string => {
        if (!ip) return '';
        try {
            return ip.split('.')
                .map(octet => {
                    const num = parseInt(octet, 10);
                    if (isNaN(num) || num < 0 || num > 255) {
                        throw new Error('Invalid IP octet');
                    }
                    return num.toString(16).padStart(2, '0');
                })
                .join('');
        } catch (e) {
            return ''; // Return empty string for invalid IP
        }
    };
    
    const formatMacH3H = (mac: string): string => {
        if (!mac) return '';
        // Remove all common separators
        const cleanedMac = mac.replace(/[:.-]/g, '');
        if (cleanedMac.length !== 12) {
            return mac; // Return original if not a standard MAC length
        }
        // Group into 4-char chunks and join with a hyphen
        return cleanedMac.match(/.{1,4}/g)?.join('-') || mac;
    };

    if (vendorLower === 'cisco') {
        cli += 'service dhcp\n';
        pools.forEach((pool: DHCPPool) => {
            if (pool.excludeStart && pool.excludeEnd) {
                cli += `ip dhcp excluded-address ${pool.excludeStart} ${pool.excludeEnd}\n`;
            }
        });
        pools.forEach((pool: DHCPPool) => {
            cli += `ip dhcp pool ${pool.poolName}\n`;
            cli += ` network ${pool.network} ${pool.subnetMask}\n`;
            cli += ` default-router ${pool.gateway}\n`;
            cli += ` dns-server ${pool.dnsServer}\n`;
            if (pool.option43) {
                const hexIp = ipToHex(pool.option43);
                if (hexIp) {
                    cli += ` option 43 hex f104${hexIp}\n`;
                }
            }
            const lease = `${pool.leaseDays || 0} ${pool.leaseHours || 0} ${pool.leaseMinutes || 0} ${pool.leaseSeconds || 0}`;
            if (lease.trim() !== '0 0 0 0') cli += ` lease ${lease.trim()}\n`;
            cli += 'exit\n';

            (pool.staticBindings || []).forEach((binding: DHCPStaticBinding) => {
                const cleanedMac = binding.macAddress.replace(/[:.-]/g, '');
                cli += `ip dhcp pool STATIC_${cleanedMac}\n`;
                cli += ` host ${binding.ipAddress} ${pool.subnetMask}\n`;
                cli += ` client-identifier 01${cleanedMac}\n`;
                cli += 'exit\n';
            });
        });
    } else if (vendorLower === 'huawei') {
        cli += 'dhcp enable\n';
        pools.forEach((pool: DHCPPool) => {
            cli += `ip pool ${pool.poolName}\n`;
            cli += ` gateway-list ${pool.gateway}\n`;
            cli += ` network ${pool.network} mask ${pool.subnetMask}\n`;
            cli += ` dns-list ${pool.dnsServer}\n`;
            if (pool.option43) {
                cli += ` option 43 sub-option 3 ascii ${pool.option43}\n`;
            }
            if (pool.excludeStart && pool.excludeEnd) {
                cli += ` excluded-ip-address ${pool.excludeStart} ${pool.excludeEnd}\n`;
            }
            const lease = `day ${pool.leaseDays || 0} hour ${pool.leaseHours || 0} minute ${pool.leaseMinutes || 0} `;
            if (lease.trim() !== 'day 0 hour 0 minute 0') cli += ` lease ${lease}\n`;
            (pool.staticBindings || []).forEach((binding: DHCPStaticBinding) => {
                const formattedMac = formatMacH3H(binding.macAddress);
                cli += ` static-bind ip-address ${binding.ipAddress} mac-address ${formattedMac}\n`;
            });
            cli += 'quit\n';
        });
    } else if (vendorLower === 'h3c') {
        cli += 'dhcp enable\n';
        pools.forEach((pool: DHCPPool) => {
            cli += `dhcp server ip-pool ${pool.poolName}\n`;
            cli += ` network ${pool.network} mask ${pool.subnetMask}\n`;
            cli += ` gateway-list ${pool.gateway}\n`;
            cli += ` dns-list ${pool.dnsServer}\n`;
            if (pool.option43) {
                const hexIp = ipToHex(pool.option43);
                if (hexIp) {
                    cli += ` option 43 hex 8007000001${hexIp}\n`;
                }
            }
            if (pool.excludeStart && pool.excludeEnd) {
                cli += ` forbidden-ip ${pool.excludeStart} ${pool.excludeEnd}\n`;
            }
            const lease = `day ${pool.leaseDays || 0} hour ${pool.leaseHours || 0} minute ${pool.leaseMinutes || 0}`;
            if (lease.trim() !== 'day 0 hour 0 minute 0') cli += ` expired ${lease}\n`;
            (pool.staticBindings || []).forEach((binding: DHCPStaticBinding) => {
                const formattedMac = formatMacH3H(binding.macAddress);
                cli += ` static-bind ip-address ${binding.ipAddress} mask ${pool.subnetMask} hardware-address ${formattedMac}\n`;
            });
            cli += 'quit\n';
        });
    }

    return { cli: cli.trim(), explanation: "DHCP configuration generated locally." };
};