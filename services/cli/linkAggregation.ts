
import { LinkAggregationConfig, Vendor, DeviceType, LinkAggregationGroup } from '../../types';

const generateForGroup = (vendor: Vendor, deviceType: DeviceType, group: LinkAggregationGroup): string => {
    const { groupId, mode, members, description, loadBalanceAlgorithm, interfaceMode, accessVlan, trunkNativeVlan, trunkAllowedVlans, systemPriority, preemptEnabled, preemptDelay, timeout } = group;
    if (!groupId || !members || members.length === 0) return '';

    let globalCli = '';
    let aggInterfaceCli = '';
    let memberInterfacesCli = '';

    const formatVlanList = (vlans: string): string => {
        if (!vlans) return '';
        return vlans.trim().replace(/,/g, ' ').replace(/-/g, ' to ');
    };

    if (vendor === Vendor.Cisco) {
        if (loadBalanceAlgorithm) globalCli += `port-channel load-balance ${loadBalanceAlgorithm}\n`;
        const aggIntfName = `Port-channel${groupId}`;
        aggInterfaceCli += `interface ${aggIntfName}\n`;
        if (description) aggInterfaceCli += ` description ${description}\n`;
        if (interfaceMode === 'l3') {
            aggInterfaceCli += ` no switchport\n`;
        } else if (interfaceMode === 'access' && accessVlan) {
            aggInterfaceCli += ` switchport mode access\n switchport access vlan ${accessVlan}\n`;
        } else if (interfaceMode === 'trunk') {
            aggInterfaceCli += ` switchport mode trunk\n`;
            if (trunkNativeVlan) aggInterfaceCli += ` switchport trunk native vlan ${trunkNativeVlan}\n`;
            if (trunkAllowedVlans) aggInterfaceCli += ` switchport trunk allowed vlan ${trunkAllowedVlans}\n`;
        }
        aggInterfaceCli += `exit\n`;

        members.forEach(member => {
            if (member.name) {
                memberInterfacesCli += `interface ${member.name}\n`;
                memberInterfacesCli += ` channel-group ${groupId} mode ${mode}\n`;
                memberInterfacesCli += ` no shutdown\n`;
                memberInterfacesCli += `exit\n`;
            }
        });
    }
    else if (vendor === Vendor.Huawei) {
        if (mode === 'lacp-static') {
            if (group.huaweiLacpPriorityMode === 'system-priority') globalCli += 'lacp priority-command-mode system-priority\n';
            if (systemPriority && systemPriority !== '32768') {
                if (group.huaweiLacpPriorityMode === 'system-priority') globalCli += `lacp system-priority ${systemPriority}\n`;
                else globalCli += `lacp priority ${systemPriority}\n`;
            }
        }
        const aggIntfName = `Eth-Trunk${groupId}`;
        aggInterfaceCli += `interface ${aggIntfName}\n`;
        if (mode === 'manual') aggInterfaceCli += ` mode manual load-balance\n`;
        else if (mode === 'lacp-static') aggInterfaceCli += ` mode lacp-static\n`;
        if (loadBalanceAlgorithm) aggInterfaceCli += ` load-balance ${loadBalanceAlgorithm}\n`;
        if (description) aggInterfaceCli += ` description "${description}"\n`;
        if (mode === 'lacp-static') {
            if (preemptEnabled) {
                aggInterfaceCli += ` lacp preempt enable\n`;
                if (preemptDelay && preemptDelay !== '30') aggInterfaceCli += ` lacp preempt delay ${preemptDelay}\n`;
            } else {
                aggInterfaceCli += ` undo lacp preempt enable\n`;
            }
            if (timeout && timeout !== 'slow') aggInterfaceCli += ` lacp timeout ${timeout}\n`;
        }
        if (interfaceMode === 'l3') aggInterfaceCli += ` undo portswitch\n`;
        else if (interfaceMode === 'access' && accessVlan) aggInterfaceCli += ` port link-type access\n port default vlan ${accessVlan}\n`;
        else if (interfaceMode === 'trunk') {
            aggInterfaceCli += ` port link-type trunk\n`;
            if (trunkNativeVlan) aggInterfaceCli += ` port trunk pvid vlan ${trunkNativeVlan}\n`;
            if (trunkAllowedVlans) aggInterfaceCli += ` port trunk allow-pass vlan ${formatVlanList(trunkAllowedVlans)}\n`;
        }
        aggInterfaceCli += `quit\n`;
        members.forEach(member => {
            if (member.name) {
                memberInterfacesCli += `interface ${member.name}\n`;
                if (mode === 'lacp-static' && member.portPriority && member.portPriority !== '32768') memberInterfacesCli += ` lacp priority ${member.portPriority}\n`;
                memberInterfacesCli += ` eth-trunk ${groupId}\n`;
                memberInterfacesCli += `quit\n`;
            }
        });
    }
    else if (vendor === Vendor.H3C) {
        if (mode === 'dynamic' && systemPriority && systemPriority !== '32768') globalCli += `lacp system-priority ${systemPriority}\n`;
        if (loadBalanceAlgorithm) globalCli += `link-aggregation global load-sharing mode ${loadBalanceAlgorithm}\n`;
        const isL3Interface = interfaceMode === 'l3';
        const aggIntfName = isL3Interface ? `Route-Aggregation${groupId}` : `Bridge-Aggregation${groupId}`;
        aggInterfaceCli += `interface ${aggIntfName}\n`;
        if (description) aggInterfaceCli += ` description "${description}"\n`;
        if (!isL3Interface) {
            if (interfaceMode === 'access' && accessVlan) aggInterfaceCli += ` port access vlan ${accessVlan}\n`;
            else if (interfaceMode === 'trunk') {
                aggInterfaceCli += ` port link-type trunk\n`;
                if (trunkNativeVlan) aggInterfaceCli += ` port trunk pvid vlan ${trunkNativeVlan}\n`;
                if (trunkAllowedVlans) aggInterfaceCli += ` port trunk permit vlan ${formatVlanList(trunkAllowedVlans)}\n`;
            }
        }
        if (mode === 'dynamic') aggInterfaceCli += ` link-aggregation mode dynamic\n`;
        else if (mode === 'static') aggInterfaceCli += ` link-aggregation mode static\n`;
        aggInterfaceCli += `quit\n`;
        members.forEach(member => {
            if (member.name) {
                memberInterfacesCli += `interface ${member.name}\n`;
                memberInterfacesCli += ` port link-aggregation group ${groupId}\n`;
                if (mode === 'dynamic') {
                    if (member.portPriority && member.portPriority !== '32768') memberInterfacesCli += ` link-aggregation port-priority ${member.portPriority}\n`;
                    if (member.lacpMode === 'passive') memberInterfacesCli += ` lacp mode passive\n`;
                    else memberInterfacesCli += ` undo lacp mode\n`;
                    if (member.lacpPeriod === 'short') memberInterfacesCli += ` lacp period short\n`;
                }
                memberInterfacesCli += `quit\n`;
            }
        });
    }

    return [globalCli.trim(), aggInterfaceCli.trim(), memberInterfacesCli.trim()].filter(Boolean).join('\n\n');
};

export const generateLinkAggregationCli = (vendor: Vendor, deviceType: DeviceType, config: LinkAggregationConfig): { cli: string; explanation: string } => {
    if (!config || !config.groups || config.groups.length === 0) {
        return { cli: '', explanation: 'No link aggregation groups configured.' };
    }
    const parts = config.groups.map(g => generateForGroup(vendor, deviceType, g)).filter(Boolean);
    const cli = parts.filter(p => p.trim().length > 0).join('\n\n');
    return { cli, explanation: 'Link Aggregation configuration generated locally.' };
};
