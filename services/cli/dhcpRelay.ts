

import { DHCPRelayConfig, Vendor, Node } from '../../types';

const generateH3cDhcpRelayCli = (config: DHCPRelayConfig): { cli: string; explanation: string } => {
    let cli = '';
    let explanation = '`dhcp enable`: 全局使能DHCP功能。\n\n';

    cli += 'dhcp enable\n\n';

    // Global settings for H3C
    let globalSettingsCli = '';
    let globalExplanation = '';

    if (config.security.clientInfoRecording) {
        globalSettingsCli += 'dhcp relay client-information record\n';
        globalExplanation += '`dhcp relay client-information record`: 开启DHCP中继的用户地址表项记录功能。\n';
    }
    if (config.security.clientInfoRefresh) {
        globalSettingsCli += 'dhcp relay client-information refresh enable\n';
        if (config.security.clientInfoRefreshType === 'interval' && config.security.clientInfoRefreshInterval) {
            globalSettingsCli += `dhcp relay client-information refresh interval ${config.security.clientInfoRefreshInterval}\n`;
            globalExplanation += `\`dhcp relay client-information refresh interval ...\`: 设置动态用户地址表项的定时刷新周期为 ${config.security.clientInfoRefreshInterval} 秒。\n`;
        } else if (config.security.clientInfoRefreshType === 'auto') {
            globalSettingsCli += 'dhcp relay client-information refresh auto\n';
            globalExplanation += '`dhcp relay client-information refresh auto`: 设置动态用户地址表项的定时刷新周期为自动模式。\n';
        }
    }
    if (config.security.macCheck && config.security.macCheckAgingTime) {
        globalSettingsCli += `dhcp relay check mac-address aging-time ${config.security.macCheckAgingTime}\n`;
        globalExplanation += `\`dhcp relay check mac-address aging-time ...\`: 配置MAC地址检查表项的老化时间为 ${config.security.macCheckAgingTime} 秒。\n`;
    }
    if (config.dscp && config.dscp !== '56') {
        globalSettingsCli += `dhcp dscp ${config.dscp}\n`;
        globalExplanation += `\`dhcp dscp ...\`: 配置DHCP中继发送DHCP报文的DSCP优先级为 ${config.dscp}。\n`;
    }
    if (globalSettingsCli) {
        cli += `! 全局DHCP中继配置\n${globalSettingsCli}\n`;
        explanation += globalExplanation + '\n';
    }

    // Per-interface settings
    config.interfaces.forEach(iface => {
        if (!iface.interfaceName) return;

        let interfaceCli = `interface ${iface.interfaceName}\n`;
        let interfaceExplanation = `\`interface ${iface.interfaceName}\`: 进入接口视图。\n`;

        interfaceCli += ' dhcp select relay\n';
        interfaceExplanation += '`dhcp select relay`: 配置接口工作在DHCP中继模式。\n';

        iface.serverAddresses.forEach(server => {
            if (server.ip) {
                interfaceCli += ` dhcp relay server-address ${server.ip}\n`;
                interfaceExplanation += `\`dhcp relay server-address ${server.ip}\`: 指定DHCP服务器的地址为 ${server.ip}。\n`;
            }
        });
        
        if(config.security.macCheck){
            interfaceCli += ' dhcp relay check mac-address\n';
            interfaceExplanation += '`dhcp relay check mac-address`: 在接口上启用DHCP中继的MAC地址检查功能。\n';
        }

        const opt82 = iface.option82;
        if (opt82.enabled) {
            interfaceCli += ' dhcp relay information enable\n';
            interfaceExplanation += '`dhcp relay information enable`: 启用DHCP中继支持Option 82功能。\n';
            interfaceCli += ` dhcp relay information strategy ${opt82.strategy}\n`;
            interfaceExplanation += `\`dhcp relay information strategy ${opt82.strategy}\`: 配置对包含Option 82的请求报文的处理策略为 ${opt82.strategy}。\n`;
            
            let circuitIdCmd = ' dhcp relay information circuit-id';
            if (opt82.circuitIdFormat === 'string' && opt82.circuitIdString) {
                circuitIdCmd += ` string ${opt82.circuitIdString}`;
            } else if (opt82.circuitIdFormat === 'normal' || opt82.circuitIdFormat === 'verbose') {
                circuitIdCmd += ` ${opt82.circuitIdFormat}`;
                if (opt82.circuitIdFormat === 'verbose' && opt82.circuitIdVerboseNodeIdentifier) {
                    circuitIdCmd += ` node-identifier ${opt82.circuitIdVerboseNodeIdentifier}`;
                    if (opt82.circuitIdVerboseNodeIdentifier === 'user-defined' && opt82.circuitIdVerboseNodeIdentifierString) {
                        circuitIdCmd += ` ${opt82.circuitIdVerboseNodeIdentifierString}`;
                    }
                }
                if (opt82.circuitIdFormatType) circuitIdCmd += ` format ${opt82.circuitIdFormatType}`;
            }
            interfaceCli += `${circuitIdCmd}\n`;
            interfaceExplanation += `\`${circuitIdCmd.trim()}\`: 配置Circuit ID子选项的填充内容和格式。\n`;

            let remoteIdCmd = ' dhcp relay information remote-id';
            if (opt82.remoteIdFormat === 'string' && opt82.remoteIdString) {
                remoteIdCmd += ` string ${opt82.remoteIdString}`;
            } else if (opt82.remoteIdFormat === 'sysname') {
                 remoteIdCmd += ` sysname`;
            } else if (opt82.remoteIdFormat === 'normal') {
                remoteIdCmd += ` normal`;
                if(opt82.remoteIdFormatType) remoteIdCmd += ` format ${opt82.remoteIdFormatType}`;
            }
            interfaceCli += `${remoteIdCmd}\n`;
            interfaceExplanation += `\`${remoteIdCmd.trim()}\`: 配置Remote ID子选项的填充内容和格式。\n`;
        }
        
        interfaceCli += 'quit\n';
        cli += `! 接口 ${iface.interfaceName} 配置\n${interfaceCli}\n`;
        explanation += `\n--- 接口 ${iface.interfaceName} ---\n${interfaceExplanation}`;
    });

    return { cli: cli.trim(), explanation: explanation.trim() };
};

const generateHuaweiDhcpRelayCli = (config: DHCPRelayConfig): { cli: string; explanation: string } => {
    let cli = '';
    let explanation = '`dhcp enable`: 全局使能DHCP功能。\n\n';

    cli += 'dhcp enable\n\n';

    let globalSettingsCli = '';
    let globalExplanation = '';

    if (config.huawei) {
        if (!config.huawei.serverMatchCheck) {
            globalSettingsCli += 'undo dhcp relay request server-match enable\n';
            globalExplanation += '`undo dhcp relay request server-match enable`: 配置DHCP中继转发DHCP REQUEST报文时不检查服务器标识符(Option54)。\n';
        }
        if (config.huawei.replyForwardAll) {
            globalSettingsCli += 'dhcp relay reply forward all enable\n';
            globalExplanation += '`dhcp relay reply forward all enable`: 配置DHCP中继转发所有的DHCP ACK报文。\n';
        }
        if (!config.huawei.trustOption82) {
            globalSettingsCli += 'undo dhcp relay trust option82\n';
            globalExplanation += '`undo dhcp relay trust option82`: 配置DHCP中继不信任携带Option82的报文，将丢弃它们。\n';
        }
    }
    if (globalSettingsCli) {
        cli += `! 全局DHCP中继配置\n${globalSettingsCli}\n`;
        explanation += globalExplanation + '\n';
    }

    config.interfaces.forEach(iface => {
        if (!iface.interfaceName) return;

        let interfaceCli = `interface ${iface.interfaceName}\n`;
        let interfaceExplanation = `\`interface ${iface.interfaceName}\`: 进入接口视图。\n`;

        interfaceCli += ' dhcp select relay\n';
        interfaceExplanation += '`dhcp select relay`: 使能接口的DHCPv4中继功能。\n';
        
        if (iface.huaweiOptions?.sourceIpAddress) {
            interfaceCli += ` dhcp relay source-ip-address ${iface.huaweiOptions.sourceIpAddress}\n`;
            interfaceExplanation += `\`dhcp relay source-ip-address ...\`: 配置DHCPv4中继代理的源地址。\n`;
        }
        if (iface.huaweiOptions?.gateway) {
            interfaceCli += ` dhcp relay gateway ${iface.huaweiOptions.gateway}\n`;
            interfaceExplanation += `\`dhcp relay gateway ...\`: 配置DHCPv4中继的网关地址。\n`;
        }

        iface.serverAddresses.forEach(server => {
            if (server.ip) {
                let serverCmd = ` dhcp relay server-ip ${server.ip}`;
                if (server.vpnInstance) {
                    serverCmd += ` vpn-instance ${server.vpnInstance}`;
                }
                interfaceCli += `${serverCmd}\n`;
                interfaceExplanation += `\`${serverCmd.trim()}\`: 配置DHCPv4服务器的IPv4地址，可选指定VPN实例。\n`;
            }
        });
        
        const opt82 = iface.huaweiOptions?.option82;
        if (opt82?.information.enabled) {
            interfaceCli += ' dhcp relay information enable\n';
            interfaceExplanation += '`dhcp relay information enable`: 在接口上使能对Option82的处理。\n';
            if (opt82.information.strategy !== 'replace') {
                interfaceCli += ` dhcp relay information strategy ${opt82.information.strategy}\n`;
                interfaceExplanation += `\`dhcp relay information strategy ${opt82.information.strategy}\`: 配置Option82处理策略为 ${opt82.information.strategy}。\n`;
            }
        }
        if (opt82?.insert.vssControl) {
            interfaceCli += ' dhcp option82 vss-control insert enable\n';
            interfaceExplanation += '`dhcp option82 vss-control insert enable`: 在跨VPN场景下，使能DHCPv4中继接口插入Option82的vss-control子选项。\n';
        }
        if (opt82?.insert.linkSelection) {
            interfaceCli += ' dhcp option82 link-selection insert enable\n';
            interfaceExplanation += '`dhcp option82 link-selection insert enable`: 在跨VPN场景下，使能DHCPv4中继接口插入Option82的link-selection子选项。\n';
        }
        if (opt82?.insert.serverIdOverride) {
            interfaceCli += ' dhcp option82 server-id-override insert enable\n';
            interfaceExplanation += '`dhcp option82 server-id-override insert enable`: 在跨VPN场景下，使能DHCPv4中继接口插入Option82的server-id-override子选项。\n';
        }
        
        interfaceCli += 'quit\n';
        cli += `! 接口 ${iface.interfaceName} 配置\n${interfaceCli}\n`;
        explanation += `\n--- 接口 ${iface.interfaceName} ---\n${interfaceExplanation}`;
    });

    return { cli: cli.trim(), explanation: explanation.trim() };
};

export const generateDhcpRelayCli = (vendor: Vendor, config: DHCPRelayConfig): { cli: string; explanation: string } => {
    if (!config.enabled) {
        return { cli: '', explanation: 'DHCP Relay is disabled.' };
    }
    
    if (vendor === Vendor.H3C) {
        return generateH3cDhcpRelayCli(config);
    }
    
    if (vendor === Vendor.Huawei) {
        return generateHuaweiDhcpRelayCli(config);
    }

    return { cli: `# DHCP Relay for ${vendor} is not supported.`, explanation: 'Not supported.' };
};