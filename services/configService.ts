
import { Node, Connection, LinkConfig, NodeConfig, Vendor } from '../types';
import { generateInterfaceCli } from '../components/config/utils';

import { generateDhcpCli } from './cli/dhcp';
import { generateVlanCli } from './cli/vlan';
import { generateInterfaceIpCli } from './cli/interface';
import { generateLinkAggregationCli } from './cli/linkAggregation';
import { generatePortIsolationCli } from './cli/portIsolation';
import { generateStpCli } from './cli/stp';
import { generateRoutingCli } from './cli/routing';
import { generateVrrpCli } from './cli/vrrp';
import { generateAclCli, generateTimeRangeCli } from './cli/acl';
import { generateNatCli } from './cli/nat';
import { generateWirelessCli } from './cli/wireless';
import { generateSshCli } from './cli/ssh';
import { generateSecurityCli } from './cli/security';
import { generateObjectGroupCli } from './cli/objectGroup';
import { generateIpsecCli } from './cli/ipsec';
import { generateHACli } from './cli/ha';
import { generateGreCli } from './cli/gre';
import { generateStackingCli } from './cli/stacking';
import { generateMlagCli } from './cli/mlag';
import { generateDhcpRelayCli } from './cli/dhcpRelay';
import { generateDhcpSnoopingCli } from './cli/dhcpSnooping';


// This function now uses local CLI generators to provide instant feedback for each feature panel.
export const generateConfig = (node: Node, feature: string): { cli: string; explanation: string } => {
    const { vendor, type, config } = node;

    switch (feature) {
        case 'Link Aggregation':
            return generateLinkAggregationCli(vendor, type, config.linkAggregation);
        case 'Port Isolation':
            return generatePortIsolationCli(vendor, type, config.portIsolation);
        case 'Stacking (IRF)':
            return generateStackingCli(vendor, config.stacking);
        case 'M-LAG':
            return generateMlagCli(vendor, config.mlag);
        case 'DHCP':
            return generateDhcpCli(vendor, type, config.dhcp);
        case 'DHCP Relay':
            return generateDhcpRelayCli(vendor, config.dhcpRelay);
        case 'DHCP Snooping':
            return generateDhcpSnoopingCli(vendor, type, config.dhcpSnooping);
        case 'VLAN':
            return generateVlanCli(vendor, type, config.vlan, config.ipsec, config.acl.acls);
        case 'Interface':
            return generateInterfaceIpCli(vendor, type, config.interfaceIP, config.ipsec, config.acl.acls);
        case 'STP':
            return generateStpCli(vendor, type, config.stp);
        case 'Routing':
            return generateRoutingCli(vendor, type, config.routing);
        case 'VRRP':
            return generateVrrpCli(vendor, type, config.vrrp);
        case 'HA':
            return generateHACli(vendor, type, config);
        case 'ACL': {
            const { cli: aclGenCli, explanation: aclExplanation } = generateAclCli(vendor, type, config.acl);
            const { cli: timeRangeGenCli } = generateTimeRangeCli(vendor, config);
            const combinedCli = [timeRangeGenCli, aclGenCli].filter(Boolean).join('\n\n').trim();
            return {
                cli: combinedCli,
                explanation: aclExplanation || "ACL and Time-Range configuration generated locally.",
            };
        }
        case 'NAT':
            return generateNatCli(vendor, type, config);
        case 'Wireless':
            return generateWirelessCli(vendor, config.wireless);
        case 'SSH':
            return generateSshCli(vendor, type, config.ssh);
        case 'Security':
            return generateSecurityCli(vendor, type, config.security);
        case 'Object Groups':
            return generateObjectGroupCli(vendor, type, config.objectGroups);
        case 'IPsec':
            return generateIpsecCli(vendor, type, config);
        case 'GRE VPN':
            return generateGreCli(vendor, type, config.gre);
        default:
            console.warn(`generateConfig: Unknown feature '${feature}'`);
            return { cli: `# Feature '${feature}' not implemented for local generation.`, explanation: '' };
    }
};

const parseVlanString = (vlanStr: string | undefined): number[] => {
    if (!vlanStr) return [];
    const vlans = new Set<number>();
    vlanStr.split(',').forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(v => parseInt(v.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) vlans.add(i);
            }
        } else {
            const num = parseInt(trimmed);
            if (!isNaN(num)) vlans.add(num);
        }
    });
    return Array.from(vlans);
};

export const generateAllCliCommands = (node: Node, connections: Connection[]): string => {
    if (!node) return '';

    let fullCli = '';
    const { config, vendor, type, name } = node;

    if (vendor === 'Huawei' || vendor === 'H3C') {
        fullCli += 'system-view\n';
        if (name) {
            fullCli += `sysname ${name}\n`;
        }
    } else if (vendor === 'Cisco') {
        if (name) {
            fullCli += `hostname ${name}\n`;
        }
    }
    
    const allVlanIds = new Set<string>();
    
    config.vlan.vlanInterfaces.forEach(vlan => { if (vlan.vlanId) allVlanIds.add(vlan.vlanId); });

    if (config.linkAggregation.enabled) {
        const { interfaceMode, accessVlan, trunkNativeVlan, trunkAllowedVlans } = config.linkAggregation;
        if (interfaceMode === 'access' && accessVlan) allVlanIds.add(accessVlan);
        else if (interfaceMode === 'trunk') {
            if (trunkNativeVlan) allVlanIds.add(trunkNativeVlan);
            if (trunkAllowedVlans) parseVlanString(trunkAllowedVlans).forEach(id => allVlanIds.add(id.toString()));
        }
    }
    
    connections.forEach(conn => {
        if (conn.from.nodeId === node.id || conn.to.nodeId === node.id) {
            const { mode, accessVlan, trunkNativeVlan, trunkAllowedVlans } = conn.config;
            if (mode === 'access' && accessVlan) allVlanIds.add(accessVlan);
            else if (mode === 'trunk') {
                if (trunkNativeVlan) allVlanIds.add(trunkNativeVlan);
                if (trunkAllowedVlans) parseVlanString(trunkAllowedVlans).forEach(id => allVlanIds.add(id.toString()));
            }
        }
    });

    const vlanIdsToCreate = Array.from(allVlanIds).filter(Boolean).sort((a,b) => parseInt(a) - parseInt(b));
    if (vlanIdsToCreate.length > 0) {
       let vlanCreationCli = '!\n! VLAN Database\n!\n';
       const vlanDescriptions = new Map(
            config.vlan.vlanInterfaces
                .filter(vi => vi.vlanId && vi.vlanDescription)
                .map(vi => [vi.vlanId, vi.vlanDescription] as [string, string])
       );

       if (vendor === 'Cisco') {
            vlanIdsToCreate.forEach(id => {
                vlanCreationCli += `vlan ${id}\n`;
                const description = vlanDescriptions.get(id);
                if (description) vlanCreationCli += ` name ${description}\n`;
                vlanCreationCli += `exit\n`;
            });
       } else if (vendor === 'Huawei') {
            vlanCreationCli += `vlan batch ${vlanIdsToCreate.join(' ')}\n\n`;
            vlanIdsToCreate.forEach(id => {
                const description = vlanDescriptions.get(id);
                if (description) {
                    vlanCreationCli += `vlan ${id}\n`;
                    vlanCreationCli += ` description ${description}\n`;
                    vlanCreationCli += `quit\n`;
                }
            });
       } else if (vendor === 'H3C') {
            const numericIds = vlanIdsToCreate.map(id => parseInt(id, 10)).sort((a, b) => a - b);
            const ranges: string[] = [];
            if (numericIds.length > 0) {
                let start = numericIds[0];
                let end = start;
                for (let i = 1; i < numericIds.length; i++) {
                    if (numericIds[i] === end + 1) {
                        end = numericIds[i];
                    } else {
                        ranges.push(start === end ? `${start}` : `${start} to ${end}`);
                        start = numericIds[i];
                        end = start;
                    }
                }
                ranges.push(start === end ? `${start}` : `${start} to ${end}`);
                vlanCreationCli += ranges.map(range => `vlan ${range}`).join('\n') + '\n\n';
            }
            
            vlanIdsToCreate.forEach(id => {
                const description = vlanDescriptions.get(id);
                if (description) {
                    vlanCreationCli += `vlan ${id}\n`;
                    vlanCreationCli += ` description ${description}\n`;
                    vlanCreationCli += `quit\n`;
                }
            });
       }
       fullCli += vlanCreationCli.trim() ? `${vlanCreationCli.trim()}\n\n` : '';
    }

    const appendCli = (title: string, cli: string) => {
        if (cli && cli.trim()) {
            fullCli += `!\n! ${title} Configuration\n!\n${cli.trim()}\n\n`;
        }
    };
    
    if (config.stacking.enabled && (vendor === 'H3C' || vendor === Vendor.Huawei || vendor === Vendor.Cisco)) {
        const { cli: stackingCli } = generateStackingCli(vendor, config.stacking);
        appendCli('Stacking (IRF)', stackingCli);
    }
    
    if (config.mlag.enabled && (vendor === Vendor.H3C || vendor === Vendor.Huawei)) {
        const { cli: mlagCli } = generateMlagCli(vendor, config.mlag);
        appendCli('M-LAG', mlagCli);
    }

    if (config.ssh.enabled) {
        const { cli: sshCli } = generateSshCli(vendor, type, config.ssh);
        appendCli('SSH Server', sshCli);
    }
    
    const { cli: timeRangeCli } = generateTimeRangeCli(vendor, config);
    appendCli('Time Ranges', timeRangeCli);

    const { addressGroupsEnabled, serviceGroupsEnabled, domainGroupsEnabled } = config.objectGroups;
    if (addressGroupsEnabled || serviceGroupsEnabled || domainGroupsEnabled) {
        const { cli: objectGroupCli } = generateObjectGroupCli(vendor, type, config.objectGroups);
        appendCli('Object Groups', objectGroupCli);
    }
    
    if (config.acl.enabled) {
        const { cli: aclCli } = generateAclCli(vendor, type, config.acl);
        appendCli('ACL', aclCli);
    }
    
    if (config.security.zonesEnabled || config.security.policiesEnabled) {
        const { cli: securityCli } = generateSecurityCli(vendor, type, config.security);
        appendCli('Security', securityCli);
    }

    if (config.ipsec.enabled) {
        const { cli: ipsecCli } = generateIpsecCli(vendor, type, config);
        appendCli('IPsec', ipsecCli);
    }
    
    if (config.dhcp.enabled) {
        const { cli: dhcpCli } = generateDhcpCli(vendor, type, config.dhcp);
        appendCli('DHCP Server', dhcpCli);
    }

    if (config.dhcpRelay.enabled) {
        const { cli: dhcpRelayCli } = generateDhcpRelayCli(vendor, config.dhcpRelay);
        appendCli('DHCP Relay', dhcpRelayCli);
    }

    if (config.dhcpSnooping.enabled) {
        const { cli: dhcpSnoopingCli } = generateDhcpSnoopingCli(vendor, type, config.dhcpSnooping);
        appendCli('DHCP Snooping', dhcpSnoopingCli);
    }

    if (config.vlan.enabled) {
        const { cli: vlanCli } = generateVlanCli(vendor, type, config.vlan, config.ipsec, config.acl.acls);
        appendCli('VLAN Interfaces', vlanCli);
    }
    
    if (config.interfaceIP.enabled) {
        const { cli: interfaceIpCli } = generateInterfaceIpCli(vendor, type, config.interfaceIP, config.ipsec, config.acl.acls);
        appendCli('Physical Interfaces', interfaceIpCli);
    }
    
    if (config.linkAggregation.enabled) {
        const { cli: linkAggCli } = generateLinkAggregationCli(vendor, type, config.linkAggregation);
        appendCli('Link Aggregation', linkAggCli);
    }

    if (config.portIsolation.enabled) {
        const { cli: portIsolationCli } = generatePortIsolationCli(vendor, type, config.portIsolation);
        appendCli('Port Isolation', portIsolationCli);
    }

    const interfaceConfigs: string[] = [];
    connections.forEach(conn => {
        let portName = '';
        if (conn.from.nodeId === node.id) {
            portName = node.ports.find(p => p.id === conn.from.portId)?.name || '';
        } else if (conn.to.nodeId === node.id) {
            portName = node.ports.find(p => p.id === conn.to.portId)?.name || '';
        }
        
        if (portName) {
            const isPortInAggregation = node.config.linkAggregation.enabled && node.config.linkAggregation.members.some(m => m.name === portName);
            if (!isPortInAggregation) {
                const cli = generateInterfaceCli(portName, vendor, conn.config, type);
                if (cli) {
                    interfaceConfigs.push(cli);
                }
            }
        }
    });
    if (interfaceConfigs.length > 0) {
        appendCli('Interface Link Modes', interfaceConfigs.join('\n'));
    }

    if (config.stp.enabled) {
        const { cli: stpCli } = generateStpCli(vendor, type, config.stp);
        appendCli('Spanning Tree Protocol', stpCli);
    }
    
    if (config.routing.staticRoutes.length > 0 || config.routing.ospf.enabled) {
        const { cli: routingCli } = generateRoutingCli(vendor, type, config.routing);
        appendCli('Routing', routingCli);
    }
    
    if (config.vrrp.enabled) {
        const { cli: vrrpCli } = generateVrrpCli(vendor, type, config.vrrp);
        appendCli('VRRP', vrrpCli);
    }
    
    if (config.ha.enabled) {
        const { cli: haCli } = generateHACli(vendor, type, config);
        appendCli('High Availability (HA)', haCli);
    }

    if (config.nat.enabled) {
        const { cli: natCli } = generateNatCli(vendor, type, config);
        appendCli('NAT', natCli);
    }

    if (config.wireless.enabled) {
        const { cli: wirelessCli } = generateWirelessCli(vendor, config.wireless);
        appendCli('Wireless', wirelessCli);
    }

    if (config.gre.enabled) {
        const { cli: greCli } = generateGreCli(vendor, type, config.gre);
        appendCli('GRE VPN', greCli);
    }

    return fullCli.trim();
};
