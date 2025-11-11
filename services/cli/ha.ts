import { HAConfig, Vendor, Node } from '../../types';

const generateH3cHaCli = (config: Node['config']): string => {
    const haConfig = config.ha;
    let trackCli = '';
    if (haConfig.monitoring.type === 'track' && haConfig.monitoring.trackItems.length > 0) {
        haConfig.monitoring.trackItems.forEach(item => {
            if (item.id && item.value && item.type === 'interface') {
                trackCli += `track ${item.id} interface ${item.value}\n`;
                trackCli += 'quit\n';
            }
        });
    }

    let haGroupCli = 'remote-backup group\n';
    haGroupCli += ` device-role ${haConfig.deviceRole}\n`;
    if (haConfig.workMode === 'dual-active') {
        haGroupCli += ' backup-mode dual-active\n';
    } else {
        haGroupCli += ' undo backup-mode\n';
    }
    if (haConfig.controlChannel.localIp && haConfig.controlChannel.remoteIp) {
        haGroupCli += ` local-ip ${haConfig.controlChannel.localIp}\n`;
        haGroupCli += ` remote-ip ${haConfig.controlChannel.remoteIp} port ${haConfig.controlChannel.port || '1026'}\n`;
    }
    if (haConfig.controlChannel.keepaliveInterval && haConfig.controlChannel.keepaliveInterval !== '1') {
        haGroupCli += ` keepalive interval ${haConfig.controlChannel.keepaliveInterval}\n`;
    }
    if (haConfig.controlChannel.keepaliveCount && haConfig.controlChannel.keepaliveCount !== '10') {
        haGroupCli += ` keepalive count ${haConfig.controlChannel.keepaliveCount}\n`;
    }
    if (haConfig.dataChannelInterface) {
        haGroupCli += ` data-channel interface ${haConfig.dataChannelInterface}\n`;
    }
    if (haConfig.hotBackupEnabled) {
        haGroupCli += ' hot-backup enable\n';
    } else {
        haGroupCli += ' undo hot-backup enable\n';
    }
    if (haConfig.autoSyncEnabled) {
        haGroupCli += ' configuration auto-sync enable\n';
    } else {
        haGroupCli += ' undo configuration auto-sync enable\n';
    }
    if (haConfig.syncCheckEnabled) {
        haGroupCli += ' configuration sync-check\n';
    } else {
        haGroupCli += ' undo configuration sync-check\n';
    }
    if (haConfig.failback.enabled) {
        haGroupCli += ` delay-time ${haConfig.failback.delayTime || '30'}\n`;
    }
    if (haConfig.monitoring.type === 'track' && haConfig.monitoring.trackItems.length > 0) {
        haConfig.monitoring.trackItems.forEach(item => {
            if (item.id) haGroupCli += ` track ${item.id}\n`;
        });
    }
    haGroupCli += 'quit\n';
    
    return [trackCli.trim(), haGroupCli.trim()].filter(Boolean).join('\n\n');
};

const generateHuaweiHaCli = (config: Node['config']): string => {
    const { ha } = config;
    const huaweiConfig = ha.huawei;
    if (!huaweiConfig) return '';
    let cli = '';

    // 1. Monitoring
    if (huaweiConfig.monitoringItems.length > 0) {
        cli += '! Monitoring Items\n';
        huaweiConfig.monitoringItems.forEach(item => {
            if (item.value) {
                cli += `hrp track ${item.type} ${item.value}`;
                if (item.type === 'bfd-session-dynamic-interface' && item.leastUpSession) {
                    cli += ` least-up-session ${item.leastUpSession}`;
                }
                cli += '\n';
            }
        });
        cli += '\n';
    }

    // 2. Heartbeat Interfaces
    if (huaweiConfig.heartbeatInterfaces.length > 0) {
        cli += '! Heartbeat Interfaces\n';
        huaweiConfig.heartbeatInterfaces.forEach(hb => {
            if (hb.interfaceName && hb.remoteIp) {
                cli += `hrp interface ${hb.interfaceName} remote ${hb.remoteIp}`;
                if (hb.heartbeatOnly) {
                    cli += ' heartbeat-only';
                }
                cli += '\n';
            }
        });
        cli += '\n';
    }
    
    // 3. HRP Packet Settings
    let packetSettings = '! HRP Packet Settings\n';
    let hasPacketSettings = false;
    if (huaweiConfig.authenticationKey) {
        packetSettings += `hrp authentication-key ${huaweiConfig.authenticationKey}\n`;
        hasPacketSettings = true;
    }
    if (huaweiConfig.checksumEnabled) {
        packetSettings += 'hrp checksum enable\n';
        hasPacketSettings = true;
    }
    if (!huaweiConfig.encryptionEnabled) {
        packetSettings += 'hrp encryption disable\n';
        hasPacketSettings = true;
    }
    if (huaweiConfig.encryptionKeyRefreshEnabled) {
        packetSettings += 'hrp encryption-key refresh enable\n';
        if (huaweiConfig.encryptionKeyRefreshInterval) {
            packetSettings += `hrp encryption-key refresh interval ${huaweiConfig.encryptionKeyRefreshInterval}\n`;
        }
        hasPacketSettings = true;
    }
    if (huaweiConfig.helloInterval && huaweiConfig.helloInterval !== '1000') {
        packetSettings += `hrp timer hello ${huaweiConfig.helloInterval}\n`;
        hasPacketSettings = true;
    }
    if (huaweiConfig.ipPacketPriority && huaweiConfig.ipPacketPriority !== '6') {
        const priorityMap: Record<string, string> = {'0':'0', '1':'32', '2':'64', '3':'96', '4':'128', '5':'160', '6':'192', '7':'224'};
        packetSettings += `hrp ip-packet priority ${priorityMap[huaweiConfig.ipPacketPriority] || '192'}\n`;
        hasPacketSettings = true;
    }
    if(hasPacketSettings) cli += packetSettings + '\n';
    
    // 4. Backup Method
    let backupSettings = '! Backup Method\n';
    let hasBackupSettings = false;
    if (huaweiConfig.autoSyncConnectionStatus) { backupSettings += `hrp auto-sync connection-status\n`; hasBackupSettings = true; }
    if (huaweiConfig.mirrorSessionEnabled) { backupSettings += `hrp mirror session enable\n`; hasBackupSettings = true; }
    if (huaweiConfig.autoSyncConfig) { backupSettings += `hrp auto-sync config\n`; hasBackupSettings = true; }
    if (huaweiConfig.autoSyncDnsTransparentPolicyDisabled) { backupSettings += `undo hrp auto-sync config dns-transparent-policy\n`; hasBackupSettings = true; }
    if (huaweiConfig.autoSyncStaticRoute) { backupSettings += `hrp auto-sync config static-route\n`; hasBackupSettings = true; }
    if (huaweiConfig.autoSyncPolicyBasedRoute) { backupSettings += `hrp auto-sync config policy-based-route\n`; hasBackupSettings = true; }
    if(hasBackupSettings) cli += backupSettings + '\n';

    // 5. Preemption
    if (huaweiConfig.preemptEnabled) {
        cli += '! Preemption\n';
        cli += `hrp preempt enable\n`;
        if (huaweiConfig.preemptDelay && huaweiConfig.preemptDelay !== '60') {
            cli += `hrp preempt delay ${huaweiConfig.preemptDelay}\n`;
        }
        cli += '\n';
    } else {
        cli += '! Preemption\n';
        cli += 'undo hrp preempt enable\n\n';
    }
    
    // 6. Final Enable
    let finalSettings = '! Final Enable\n';
    let hasFinalSettings = false;
    if (huaweiConfig.escapeEnabled) {
        finalSettings += `hrp escape enable\n`;
        hasFinalSettings = true;
    }
    if (huaweiConfig.deviceRole !== 'none') {
        finalSettings += `hrp device ${huaweiConfig.deviceRole}\n`;
        hasFinalSettings = true;
    }
    if (huaweiConfig.standbyConfigEnabled) {
        finalSettings += `hrp standby config enable\n`;
        hasFinalSettings = true;
    }
    if (huaweiConfig.adjustBgpCostEnabled) {
        finalSettings += `hrp adjust bgp-cost enable`;
        if (huaweiConfig.adjustBgpSlaveCost) finalSettings += ` ${huaweiConfig.adjustBgpSlaveCost}`;
        finalSettings += `\n`;
        hasFinalSettings = true;
    }
    if (huaweiConfig.adjustOspfCostEnabled) {
        finalSettings += `hrp adjust ospf-cost enable`;
        if (huaweiConfig.adjustOspfSlaveCost) finalSettings += ` ${huaweiConfig.adjustOspfSlaveCost}`;
        finalSettings += `\n`;
        hasFinalSettings = true;
    }
    if (huaweiConfig.tcpLinkStateCheckDelay) {
        finalSettings += `hrp tcp link-state check delay ${huaweiConfig.tcpLinkStateCheckDelay}\n`;
        hasFinalSettings = true;
    }
    
    if(hasFinalSettings) cli += finalSettings + '\n';
    
    cli += `hrp enable\n`;

    return cli.trim();
}

export const generateHACli = (vendor: Vendor, deviceType: string, config: Node['config']): { cli: string; explanation: string } => {
    const haConfig = config.ha;
    if (!haConfig.enabled) {
        return { cli: '', explanation: 'HA is disabled.' };
    }

    if (vendor === Vendor.H3C) {
        const cli = generateH3cHaCli(config);
        return { cli, explanation: 'H3C HA configuration generated.' };
    }
    
    if (vendor === Vendor.Huawei) {
        const cli = generateHuaweiHaCli(config);
        return { cli, explanation: 'Huawei HRP (双机热备) configuration generated.' };
    }

    return { cli: `# HA for ${vendor} is not yet supported.`, explanation: 'Not supported' };
};
