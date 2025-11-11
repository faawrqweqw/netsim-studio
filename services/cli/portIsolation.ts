import { PortIsolationConfig, Vendor } from '../../types';

export const generatePortIsolationCli = (vendor: Vendor, deviceType: string, config: PortIsolationConfig): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    if (!config.enabled || config.groups.length === 0) {
        return { cli: '', explanation: 'Port Isolation is disabled or no groups are configured.' };
    }

    if (vendorLower === 'huawei') {
        if (config.mode === 'all') {
            cli += 'port-isolate mode all\n';
        }
        if (config.excludedVlans) {
            cli += `port-isolate exclude vlan ${config.excludedVlans.replace(/,/g, ' ').replace(/-/g, ' to ')}\n`;
        }

        const interfacesByGroup: Record<string, string[]> = {};
        config.groups.forEach(group => {
            if (!interfacesByGroup[group.groupId]) {
                interfacesByGroup[group.groupId] = [];
            }
            interfacesByGroup[group.groupId].push(...group.interfaces);
        });

        for (const groupId in interfacesByGroup) {
            interfacesByGroup[groupId].forEach(interfaceName => {
                if (interfaceName) {
                    cli += `interface ${interfaceName}\n`;
                    cli += ` port-isolate enable group ${groupId}\n`;
                    cli += 'quit\n';
                }
            });
        }
    } else if (vendorLower === 'h3c') {
        const interfaceConfigs: string[] = [];

        config.groups.forEach(group => {
            cli += `port-isolate group ${group.groupId}\n`;
            if (group.communityVlans) {
                cli += ` community-vlan vlan ${group.communityVlans.replace(/,/g, ' ').replace(/-/g, ' to ')}\n`;
            }
            cli += 'quit\n\n';

            group.interfaces.forEach(interfaceName => {
                if (interfaceName) {
                    interfaceConfigs.push(`interface ${interfaceName}\n port-isolate enable group ${group.groupId}\nquit`);
                }
            });
        });
        
        if (interfaceConfigs.length > 0) {
            cli += interfaceConfigs.join('\n');
        }

    } else if (vendorLower === 'cisco') {
        cli = `# Port Isolation is typically implemented using Private VLANs (PVLANs) on Cisco devices.\n# This feature is more complex and not directly equivalent to Huawei/H3C's port-isolate command.\n\n# Example of a basic PVLAN configuration:\n# vlan 100\n#  private-vlan isolated\n# vlan 200\n#  private-vlan community\n# vlan 300\n#  private-vlan primary\n#  private-vlan association 100,200\n#\n# interface GigabitEthernet0/1\n#  switchport private-vlan host-association 300 100\n#  switchport mode private-vlan host\n#\n# interface GigabitEthernet0/2\n#  switchport private-vlan host-association 300 200\n#  switchport mode private-vlan host`;
    }

    return { cli: cli.trim(), explanation: "Port Isolation configuration generated." };
};
