import { Node, GREVPNConfig, Vendor, DeviceType } from '../../types';

export const generateGreCli = (vendor: Vendor, deviceType: string, config: GREVPNConfig): { cli: string; explanation: string } => {
    let cli = '';
    
    if (!config.enabled || config.tunnels.length === 0) {
        return { cli: '', explanation: 'GRE VPN is disabled or no tunnels are configured.' };
    }

    config.tunnels.forEach(tunnel => {
        if (!tunnel.tunnelNumber) return;
        
        let tunnelCli = '';
        let postInterfaceCli = '';

        if (vendor === Vendor.Huawei) {
            tunnelCli += `interface Tunnel${tunnel.tunnelNumber}\n`;
            if (tunnel.description) tunnelCli += ` description ${tunnel.description}\n`;
            if (tunnel.ipAddress && tunnel.mask) {
                tunnelCli += ` ip address ${tunnel.ipAddress} ${tunnel.mask}\n`;
            }
            tunnelCli += ` tunnel-protocol gre\n`;
            tunnelCli += ` source ${tunnel.sourceValue}\n`;
            tunnelCli += ` destination ${tunnel.destinationAddress}\n`;
            if (tunnel.mtu) tunnelCli += ` mtu ${tunnel.mtu}\n`;
            if (tunnel.greKey) tunnelCli += ` gre key ${tunnel.greKey}\n`;
            if (tunnel.keepalive.enabled) {
                tunnelCli += ` keepalive`;
                if (tunnel.keepalive.period) tunnelCli += ` period ${tunnel.keepalive.period}`;
                if (tunnel.keepalive.retryTimes) tunnelCli += ` retry-times ${tunnel.keepalive.retryTimes}`;
                tunnelCli += `\n`;
            }
            tunnelCli += 'quit\n';

            if (tunnel.securityZone && deviceType === DeviceType.Firewall) {
                postInterfaceCli += `firewall zone ${tunnel.securityZone}\n`;
                postInterfaceCli += ` add interface Tunnel${tunnel.tunnelNumber}\n`;
                postInterfaceCli += 'quit\n';
            }

        } else if (vendor === Vendor.H3C) {
            tunnelCli += `interface Tunnel${tunnel.tunnelNumber} mode gre\n`;
            if (tunnel.description) tunnelCli += ` description ${tunnel.description}\n`;
            if (tunnel.ipAddress && tunnel.mask) {
                tunnelCli += ` ip address ${tunnel.ipAddress} ${tunnel.mask}\n`;
            }
            tunnelCli += ` source ${tunnel.sourceValue}\n`;
            tunnelCli += ` destination ${tunnel.destinationAddress}\n`;
            if (tunnel.greKey) tunnelCli += ` gre key ${tunnel.greKey}\n`;
            if (tunnel.greChecksum) tunnelCli += ` gre checksum\n`;
            if (tunnel.dfBitEnable) tunnelCli += ` tunnel dfbit enable\n`;
             if (tunnel.keepalive.enabled) {
                tunnelCli += ` keepalive`;
                if (tunnel.keepalive.period) tunnelCli += ` ${tunnel.keepalive.period}`;
                if (tunnel.keepalive.retryTimes) tunnelCli += ` ${tunnel.keepalive.retryTimes}`;
                tunnelCli += `\n`;
            }
            tunnelCli += 'quit\n';
        }
        
        if (tunnelCli) {
            cli += tunnelCli;
            if (postInterfaceCli) {
                cli += `\n${postInterfaceCli}`;
            }
            cli += '\n';
        }
    });

    return { cli: cli.trim(), explanation: 'GRE VPN configuration generated.' };
};