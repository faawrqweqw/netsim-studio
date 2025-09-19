
import { SecurityConfig, Vendor, DeviceType, SecurityPolicyRule } from '../../types';

const parseAddress = (address: string, forVendor: Vendor): string => {
    if (!address) return '';
    const trimmed = address.trim();

    if (forVendor === Vendor.H3C) {
        if (trimmed.includes('-')) {
            const parts = trimmed.split('-');
            if (parts.length === 2) return `range ${parts[0].trim()} ${parts[1].trim()}`;
        }
        if (trimmed.includes('/')) {
            const [ip, mask] = trimmed.split('/');
            return `subnet ${ip} ${mask}`;
        }
        if (trimmed.includes(' ')) {
            const [ip, mask] = trimmed.split(' ');
            return `subnet ${ip} ${mask}`;
        }
        // Assume host if no other format matches
        return `host ${trimmed}`;
    }

    if (forVendor === Vendor.Huawei) {
        if (trimmed.includes('-')) {
            const parts = trimmed.split('-');
            if (parts.length === 2) return `range ${parts[0].trim()} ${parts[1].trim()}`;
        }
        if (trimmed.includes('/')) {
            const [ip, mask] = trimmed.split('/');
            return `${ip} ${mask}`;
        }
        if (trimmed.includes(' ')) {
            return trimmed;
        }
        // Assume host, append /32 mask
        return `${trimmed} 32`;
    }

    return address; // Default/Cisco format
}

export const generateSecurityCli = (vendor: Vendor, deviceType: DeviceType, config: SecurityConfig): { cli: string; explanation: string } => {
    let zoneCli = '';
    let policyCli = '';
    const vendorLower = vendor.toLowerCase();

    // Zone Generation
    if (config.zonesEnabled && config.zones.length > 0) {
        if (vendorLower === 'huawei') {
            config.zones.forEach(zone => {
                zoneCli += `firewall zone name ${zone.name}\n`;
                if (zone.priority) zoneCli += ` set priority ${zone.priority}\n`;
                if (zone.description) zoneCli += ` description "${zone.description}"\n`;
                zone.members.forEach(member => {
                    if (member.interfaceName) {
                        zoneCli += ` add interface ${member.interfaceName}\n`;
                    }
                });
                zoneCli += 'quit\n\n';
            });
        } else if (vendorLower === 'h3c') {
            config.zones.forEach(zone => {
                zoneCli += `security-zone name ${zone.name}\n`;
                if (zone.description) zoneCli += ` description "${zone.description}"\n`;
                zone.members.forEach(member => {
                    if (member.interfaceName) {
                        zoneCli += ` import interface ${member.interfaceName}\n`;
                    }
                });
                zoneCli += 'quit\n\n';
            });
        } else {
            zoneCli = `# Security zones for ${vendor} are not supported.`;
        }
    }
    
    // Policy Generation
    if (config.policiesEnabled) {
        const enabledPolicies = config.policies.filter(p => p.enabled);
        
        let rulesCli = '';
        if (enabledPolicies.length > 0) {
            if (vendorLower === 'huawei') {
                rulesCli += 'security-policy\n';
                enabledPolicies.forEach((rule: SecurityPolicyRule) => {
                    rulesCli += ` rule name ${rule.name || rule.id}\n`;
                    if (rule.description) rulesCli += `  description "${rule.description}"\n`;
                    if (rule.sourceZone) rulesCli += `  source-zone ${rule.sourceZone}\n`;
                    if (rule.destinationZone) rulesCli += `  destination-zone ${rule.destinationZone}\n`;
                    
                    if (rule.sourceAddressType === 'group' && rule.sourceAddressValue) {
                        rulesCli += `  source-address address-set ${rule.sourceAddressValue}\n`;
                    } else if (rule.sourceAddressType === 'custom' && rule.sourceAddressValue) {
                        rulesCli += `  source-address ${parseAddress(rule.sourceAddressValue, vendor)}\n`;
                    }

                    if (rule.destinationAddressType === 'group' && rule.destinationAddressValue) {
                        rulesCli += `  destination-address address-set ${rule.destinationAddressValue}\n`;
                    } else if (rule.destinationAddressType === 'custom' && rule.destinationAddressValue) {
                        rulesCli += `  destination-address ${parseAddress(rule.destinationAddressValue, vendor)}\n`;
                    }

                    if (rule.serviceType === 'group' && rule.serviceValue) {
                        rulesCli += `  service service-set ${rule.serviceValue}\n`;
                    } else if (rule.serviceType === 'custom' && rule.serviceValue) {
                        rulesCli += `  service ${rule.serviceValue}\n`;
                    }

                    if (rule.timeRange) rulesCli += `  time-range ${rule.timeRange}\n`;
                    if (rule.action) rulesCli += `  action ${rule.action}\n`;
                });
                rulesCli += 'quit\n\n';
            } else if (vendorLower === 'h3c') {
                rulesCli += 'security-policy ip\n';
                enabledPolicies.forEach((rule: SecurityPolicyRule) => {
                    rulesCli += ` rule name ${rule.name || rule.id}\n`;
                    if (rule.description) rulesCli += `  description "${rule.description}"\n`;
                    if (rule.sourceZone) rulesCli += `  source-zone ${rule.sourceZone}\n`;
                    if (rule.destinationZone) rulesCli += `  destination-zone ${rule.destinationZone}\n`;

                    if (rule.sourceAddressType === 'group' && rule.sourceAddressValue) {
                        rulesCli += `  source-ip object-group-name ${rule.sourceAddressValue}\n`;
                    } else if (rule.sourceAddressType === 'custom' && rule.sourceAddressValue) {
                        rulesCli += `  source-ip-${parseAddress(rule.sourceAddressValue, vendor)}\n`;
                    }

                    if (rule.destinationAddressType === 'group' && rule.destinationAddressValue) {
                        rulesCli += `  destination-ip object-group-name ${rule.destinationAddressValue}\n`;
                    } else if (rule.destinationAddressType === 'custom' && rule.destinationAddressValue) {
                        rulesCli += `  destination-ip-${parseAddress(rule.destinationAddressValue, vendor)}\n`;
                    }

                    if (rule.serviceType === 'group' && rule.serviceValue) {
                        rulesCli += `  service object-group-name ${rule.serviceValue}\n`;
                    } else if (rule.serviceType === 'custom' && rule.serviceValue) {
                        rulesCli += `  service ${rule.serviceValue}\n`;
                    }

                    if (rule.timeRange) rulesCli += `  time-range ${rule.timeRange}\n`;
                    if (rule.logging) rulesCli += '  logging enable\n';
                    if (rule.counting) rulesCli += '  counting enable\n';
                    
                    const action = rule.action === 'permit' ? 'pass' : 'drop';
                    rulesCli += `  action ${action}\n`;
                });
                rulesCli += 'quit\n\n';
            }
        }
        
        if(rulesCli || vendorLower === 'h3c') {
            if (vendorLower === 'h3c') {
                policyCli = 'undo security-policy disable\n\n' + rulesCli;
            } else {
                policyCli = rulesCli;
            }
        }
    }


    const fullCli = [zoneCli.trim(), policyCli.trim()].filter(Boolean).join('\n\n');
    return { cli: fullCli, explanation: 'Security Zone and Policy configuration generated.' };
};
