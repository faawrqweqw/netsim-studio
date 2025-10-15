import { MLAGConfig, Vendor } from '../../types';

const generateH3cMlagCli = (config: MLAGConfig): { cli: string; explanation: string } => {
    let cli = '';

    // System-wide commands
    if (config.systemMac) {
        cli += `m-lag system-mac ${config.systemMac}\n`;
        cli += `Y\n`;
    }
    if (config.systemNumber) {
        cli += `m-lag system-number ${config.systemNumber}\n`;
        cli += `Y\n`;
    }
    if (config.systemPriority && config.systemPriority !== '32768') {
        cli += `m-lag system-priority ${config.systemPriority}\n`;
        cli += `Y\n`;
    }
    if (config.rolePriority && config.rolePriority !== '32768') {
        cli += `m-lag role priority ${config.rolePriority}\n`;
    }
    if (config.standalone.enabled) {
        let standaloneCmd = 'm-lag standalone enable';
        if (config.standalone.delayTime) {
            standaloneCmd += ` delay ${config.standalone.delayTime}`;
        }
        cli += `${standaloneCmd}\n`;
    }
    if (config.macAddressHold) {
        cli += `m-lag peer-link mac-address hold\n`;
    }
    
    // Keepalive
    if (config.keepalive.enabled) {
        let keepaliveCmd = 'm-lag keepalive';
        if (config.keepalive.destinationIp) {
            keepaliveCmd += ` destination ${config.keepalive.destinationIp}`;
        }
        if (config.keepalive.sourceIp) {
            keepaliveCmd += ` source ${config.keepalive.sourceIp}`;
        }
        if (config.keepalive.udpPort && config.keepalive.udpPort !== '6400') {
            keepaliveCmd += ` udp-port ${config.keepalive.udpPort}`;
        }
        if (config.keepalive.vpnInstance) {
            keepaliveCmd += ` vpn-instance ${config.keepalive.vpnInstance}`;
        }
        cli += `\n${keepaliveCmd}\n`;

        let keepaliveTimerCmd = 'm-lag keepalive';
        let hasTimerConfig = false;
        if (config.keepalive.interval && config.keepalive.interval !== '1000') {
            keepaliveTimerCmd += ` interval ${config.keepalive.interval}`;
            hasTimerConfig = true;
        }
        if (config.keepalive.timeout && config.keepalive.timeout !== '5') {
            keepaliveTimerCmd += ` timeout ${config.keepalive.timeout}`;
            hasTimerConfig = true;
        }
        if (hasTimerConfig) {
            cli += `${keepaliveTimerCmd}\n`;
        }
    }

    // M-LAG MAD
    let madCli = '';
    if (config.mad.defaultAction !== 'down') {
        madCli += `m-lag mad default-action ${config.mad.defaultAction}\n`;
    }
    config.mad.excludeInterfaces.forEach(iface => {
        if (iface.name) {
            madCli += `m-lag mad exclude interface ${iface.name}\n`;
        }
    });
    if (config.mad.excludeLogicalInterfaces) {
        madCli += `m-lag mad exclude logical-interfaces\n`;
    }
    config.mad.includeInterfaces.forEach(iface => {
        if (iface.name) {
            madCli += `m-lag mad include interface ${iface.name}\n`;
        }
    });
    if (config.mad.persistent) {
        madCli += `m-lag mad persistent\n`;
    }

    if (madCli) {
        cli += `\n# M-LAG MAD Configuration\n${madCli}`;
    }

    // Peer-link
    if (config.peerLinkBridgeAggregationId) {
        cli += `\ninterface Bridge-Aggregation ${config.peerLinkBridgeAggregationId}\n`;
        cli += ` port m-lag peer-link ${config.peerLinkBridgeAggregationId}\n`;
        if (config.peerLinkDrcpShortTimeout) {
            cli += ` m-lag drcp period short\n`;
        }
        cli += 'quit\n';
    }

    // M-LAG interfaces
    config.interfaces.forEach(iface => {
        if (iface.bridgeAggregationId) {
            cli += `\ninterface Bridge-Aggregation ${iface.bridgeAggregationId}\n`;
            if (iface.groupId) {
                cli += ` port m-lag group ${iface.groupId}\n`;
            }
            if (iface.systemMac) {
                cli += ` port m-lag system-mac ${iface.systemMac}\n`;
            }
            if (iface.systemPriority) {
                cli += ` port m-lag system-priority ${iface.systemPriority}\n`;
            }
            if (iface.drcpShortTimeout) {
                cli += ` m-lag drcp period short\n`;
            }
            cli += 'quit\n';
        }
    });
    return { cli: cli.trim(), explanation: 'H3C M-LAG configuration generated.' };
};

const generateHuaweiMlagCli = (config: MLAGConfig): { cli: string; explanation: string } => {
    if (!config.huawei) return { cli: '', explanation: '' };

    const { dfsGroupId, dfsGroupPriority, authenticationPassword, dualActiveSourceIp, dualActivePeerIp, peerLinkTrunkId, interfaces, activeStandbyElection } = config.huawei;

    let cli = '';
    let explanation = 'Huawei M-LAG (V-STP mode) configuration.\n' +
                      'NOTE: Ensure STP is correctly configured on both devices before applying.\n\n';

    // 1. DFS Group & Dual-Active Detection
    cli += `! DFS Group & Dual-Active Detection Configuration\n`;
    cli += `dfs-group ${dfsGroupId}\n`;
    if (dfsGroupPriority && dfsGroupPriority !== '100') {
        cli += ` priority ${dfsGroupPriority}\n`;
    }
    if (authenticationPassword) {
        cli += ` authentication-mode hmac-sha256 password ${authenticationPassword}\n`;
    }
    if (dualActiveSourceIp && dualActivePeerIp) {
        cli += ` dual-active detection source ip ${dualActiveSourceIp} peer ${dualActivePeerIp}\n`;
    }
    if (interfaces.some(iface => iface.mode === 'active-standby') && activeStandbyElection) {
        const electionTypes = Object.entries(activeStandbyElection)
            .filter(([_, enabled]) => enabled)
            .map(([type]) => type);
        if (electionTypes.length > 0) {
            cli += ` m-lag active-standby election ${electionTypes.join(' ')}\n`;
        }
    }
    cli += `quit\n\n`;

    // 2. Peer-link
    if (peerLinkTrunkId) {
        cli += `! Peer-Link Configuration\n`;
        cli += `interface Eth-Trunk${peerLinkTrunkId}\n`;
        cli += ` peer-link ${peerLinkTrunkId}\n`;
        cli += ` stp enable\n`; // Assuming V-STP mode as recommended
        cli += `quit\n\n`;
    }

    // 3. M-LAG Member Interfaces
    if (interfaces.length > 0) {
        cli += `! M-LAG Member Interfaces Configuration\n`;
        interfaces.forEach(iface => {
            if (iface.ethTrunkId && iface.mlagId) {
                cli += `interface Eth-Trunk${iface.ethTrunkId}\n`;
                let mlagCmd = ` dfs-group ${dfsGroupId} m-lag ${iface.mlagId}`;
                if (iface.mode === 'active-standby') {
                    mlagCmd += ' active-standby';
                }
                cli += `${mlagCmd}\n`;
                cli += `quit\n`;
            }
        });
    }
    
    return { cli: cli.trim(), explanation };
};

export const generateMlagCli = (vendor: Vendor, config: MLAGConfig): { cli: string; explanation: string } => {
    if (!config.enabled) {
        return { cli: '', explanation: 'M-LAG is disabled.' };
    }
    
    if (vendor === Vendor.H3C) {
        return generateH3cMlagCli(config);
    }
    
    if (vendor === Vendor.Huawei) {
        return generateHuaweiMlagCli(config);
    }
    
    return { cli: `# M-LAG for ${vendor} is not supported.`, explanation: 'Not supported.' };
};