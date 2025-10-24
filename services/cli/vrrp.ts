import { VRRPConfig, VRRPGroup } from '../../types';

export const generateVrrpCli = (vendor: string, deviceType: string, config: VRRPConfig): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    if (config.enabled && config.interfaces) {
        config.interfaces.forEach(ifaceConfig => {
            if (ifaceConfig.interfaceName && ifaceConfig.groups.length > 0) {
                cli += `interface ${ifaceConfig.interfaceName}\n`;
                ifaceConfig.groups.forEach((group: VRRPGroup) => {
                    if (vendorLower === 'cisco') {
                        cli += ` vrrp ${group.groupId} ip ${group.virtualIp}\n`;
                        cli += ` vrrp ${group.groupId} priority ${group.priority}\n`;
                        if (group.preempt) {
                            const delay = group.preemptDelay || '0';
                            if (delay !== '0') {
                                cli += ` vrrp ${group.groupId} preempt delay minimum ${delay}\n`;
                            } else {
                                cli += ` vrrp ${group.groupId} preempt\n`;
                            }
                        }
                        if (group.advertisementInterval) {
                            cli += ` vrrp ${group.groupId} timers advertise ${group.advertisementInterval}\n`;
                        }
                        if (group.authType !== 'none' && group.authKey) {
                            if (group.authType === 'simple') {
                                cli += ` vrrp ${group.groupId} authentication text ${group.authKey}\n`;
                            } else if (group.authType === 'md5') {
                                cli += ` vrrp ${group.groupId} authentication md5 key-string ${group.authKey}\n`;
                            }
                        }
                        if (group.description) cli += ` vrrp ${group.groupId} description ${group.description}\n`;
                    } else if (vendorLower === 'h3c') {
                        cli += ` vrrp vrid ${group.groupId} virtual-ip ${group.virtualIp}\n`;
                        cli += ` vrrp vrid ${group.groupId} priority ${group.priority}\n`;
                        if (group.preempt) {
                            const delay = group.preemptDelay || '0';
                            cli += ` vrrp vrid ${group.groupId} preempt-mode delay ${delay}\n`;
                        } else {
                            cli += ` undo vrrp vrid ${group.groupId} preempt-mode\n`;
                        }
                        if (group.advertisementInterval) {
                            cli += ` vrrp vrid ${group.groupId} timer advertise ${group.advertisementInterval}\n`;
                        }
                        if (group.authType !== 'none' && group.authKey) {
                            if (group.authType === 'simple') {
                                cli += ` vrrp vrid ${group.groupId} authentication-mode simple plain ${group.authKey}\n`;
                            } else if (group.authType === 'md5') {
                                cli += ` vrrp vrid ${group.groupId} authentication-mode md5 ${group.authKey}\n`;
                            }
                        }
                        if (group.description) cli += ` vrrp vrid ${group.groupId} description ${group.description}\n`;
                    } else if (vendorLower === 'huawei') {
                        cli += ` vrrp vrid ${group.groupId} virtual-ip ${group.virtualIp}\n`;
                        cli += ` vrrp vrid ${group.groupId} priority ${group.priority}\n`;
                        if (group.preempt) {
                            const delay = group.preemptDelay || '0';
                            cli += ` vrrp vrid ${group.groupId} preempt-mode timer delay ${delay}\n`;
                        } else {
                            cli += ` undo vrrp vrid ${group.groupId} preempt-mode\n`;
                        }
                        if (group.advertisementInterval) {
                            cli += ` vrrp vrid ${group.groupId} timer advertise ${group.advertisementInterval}\n`;
                        }
                        if (group.authType !== 'none' && group.authKey) {
                            if (group.authType === 'simple') {
                                cli += ` vrrp vrid ${group.groupId} authentication-mode simple plain ${group.authKey}\n`;
                            } else if (group.authType === 'md5') {
                                cli += ` vrrp vrid ${group.groupId} authentication-mode md5 ${group.authKey}\n`;
                            }
                        }
                        if (group.description) cli += ` vrrp vrid ${group.groupId} description ${group.description}\n`;
                    }
                });
                cli += vendorLower === 'cisco' ? ` no shutdown\nexit\n\n` : `quit\n\n`;
            }
        });
    }
    return { cli: cli.trim(), explanation: "VRRP configuration generated locally." };
};