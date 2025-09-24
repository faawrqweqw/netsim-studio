import { DHCPSnoopingConfig, Vendor } from '../../types';

export const generateDhcpSnoopingCli = (vendor: Vendor, deviceType: string, config: DHCPSnoopingConfig): { cli: string; explanation: string } => {
    let cli = '';
    let explanation = '';

    if (!config.enabled) {
        return { cli: '', explanation: 'DHCP Snooping is disabled.' };
    }

    if (vendor === Vendor.H3C) {
        cli += 'dhcp snooping enable\n\n';
        explanation += '`dhcp snooping enable`: 全局使能DHCP Snooping功能。\n\n';

        if (config.h3c?.bindingDatabase?.enabled) {
            let backupCli = '! 配置DHCP Snooping表项备份功能\n';
            let backupExplanation = '--- 表项备份配置 ---\n';
            if (config.h3c.bindingDatabase.filename) {
                backupCli += `dhcp snooping binding database filename ${config.h3c.bindingDatabase.filename}\n`;
                backupExplanation += `\`dhcp snooping binding database filename ...\`: 指定存储DHCP Snooping表项的文件名称为 ${config.h3c.bindingDatabase.filename}。\n`;
            }
            if (config.h3c.bindingDatabase.updateInterval) {
                backupCli += `dhcp snooping binding database update interval ${config.h3c.bindingDatabase.updateInterval}\n`;
                backupExplanation += `\`dhcp snooping binding database update interval ...\`: 配置DHCP Snooping表项存储文件的刷新时间间隔为 ${config.h3c.bindingDatabase.updateInterval} 秒。\n`;
            }
            cli += `${backupCli}\n`;
            explanation += `${backupExplanation}\n`;
        }
        
        if (config.interfaces.length > 0) {
            let interfaceCli = '';
            let interfaceExplanation = '';

            config.interfaces.forEach(iface => {
                // Only generate a block if the interface has a name and at least one snooping option enabled.
                if (iface.interfaceName && (iface.trust || iface.bindingRecord)) {
                    interfaceCli += `interface ${iface.interfaceName}\n`;
                    interfaceExplanation += `\n# 接口 ${iface.interfaceName}\n\`interface ${iface.interfaceName}\`: 进入接口视图。\n`;
                    
                    if (iface.trust) {
                        interfaceCli += ' dhcp snooping trust\n';
                        interfaceExplanation += '`dhcp snooping trust`: 配置为信任端口。\n';
                    }
                    if (iface.bindingRecord) {
                        interfaceCli += ' dhcp snooping binding record\n';
                        interfaceExplanation += '`dhcp snooping binding record`: 启用表项记录功能。\n';
                    }
                    interfaceCli += 'quit\n\n';
                }
            });

            if (interfaceCli) {
                cli += `! 接口配置\n${interfaceCli}`;
                explanation += `--- 接口配置 ---${interfaceExplanation}`;
            }
        }
    } else if (vendor === Vendor.Huawei) {
        cli += 'dhcp enable\n';
        cli += 'dhcp snooping enable\n\n';
        explanation += '`dhcp enable`: 全局使能DHCP服务 (Snooping依赖)。\n';
        explanation += '`dhcp snooping enable`: 全局使能DHCP Snooping功能。\n\n';
        
        if (config.huawei.enabledOnVlans) {
            const vlanList = config.huawei.enabledOnVlans.replace(/,/g, ' ').replace(/-/g, ' to ');
            cli += `dhcp snooping enable vlan ${vlanList}\n\n`;
            explanation += `\`dhcp snooping enable vlan ${vlanList}\`: 在指定的VLAN中使能DHCP Snooping。\n\n`;
        }

        if (config.huawei.userBindAutosave?.enabled) {
            cli += '! 配置DHCP Snooping绑定表自动备份\n';
            explanation += '--- 绑定表自动备份 ---\n';
            
            const backupConfig = config.huawei.userBindAutosave;
            if (backupConfig.filename) {
                let cmd = `dhcp snooping user-bind autosave ${backupConfig.filename}`;
                if (backupConfig.writeDelay && backupConfig.writeDelay !== '3600') {
                    cmd += ` write-delay ${backupConfig.writeDelay}`;
                }
                cli += `${cmd}\n\n`;
                explanation += `\`${cmd}\`: 开启绑定表自动备份功能，文件为 ${backupConfig.filename}，更新周期为 ${backupConfig.writeDelay || '3600'} 秒。\n\n`;
            }
        }

        if (config.huawei.trustedInterfaces.length > 0) {
            cli += '! 配置信任端口\n';
            explanation += '--- 信任端口配置 ---\n';
            config.huawei.trustedInterfaces.forEach(iface => {
                if (iface.name) {
                    cli += `interface ${iface.name}\n`;
                    cli += ' dhcp snooping trusted\n';
                    cli += 'quit\n';
                    explanation += `\`interface ${iface.name}\` & \`dhcp snooping trusted\`: 进入接口 ${iface.name} 并将其配置为信任端口。\n`;
                }
            });
            cli += '\n';
        }

    } else {
        return { cli: `# DHCP Snooping for ${vendor} is not currently supported.`, explanation: 'Feature not supported for this vendor.' };
    }

    return { cli: cli.trim(), explanation: explanation.trim() };
};