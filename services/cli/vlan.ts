import { VLANConfig, VLANInterface, ACL, Vendor, IPsecConfig } from '../../types';

export const generateVlanCli = (vendor: string, deviceType: string, config: VLANConfig, ipsecConfig: IPsecConfig, acls: ACL[] = []): { cli: string; explanation: string } => {
    const { vlanInterfaces = [] } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    // NOTE: VLAN database creation (e.g., `vlan 10`) is now handled centrally in `generateAllCliCommands`
    // to ensure all VLANs from physical and aggregate interfaces are also created.
    // This function now only handles the configuration of Switched Virtual Interfaces (SVIs).

    vlanInterfaces.forEach((vlan: VLANInterface) => {
        if (vlan.vlanId && vlan.ipAddress && vlan.subnetMask) {
            let interfaceName = '';
            if (vendorLower === 'cisco') interfaceName = `Vlan${vlan.vlanId}`;
            else if (vendorLower === 'huawei') interfaceName = `Vlanif${vlan.vlanId}`;
            else if (vendorLower === 'h3c') interfaceName = `Vlan-interface${vlan.vlanId}`;
            
            if (!interfaceName) return;

            let interfaceBlock = '';

            if (vlan.interfaceDescription) interfaceBlock += ` description ${vlan.interfaceDescription}\n`;
            interfaceBlock += ` ip address ${vlan.ipAddress} ${vlan.subnetMask}\n`;
            
            if (vlan.enableDHCP) {
                if (vendorLower === 'cisco') {
                    // Cisco doesn't have a simple global pool select on interface
                } else if (vendorLower === 'huawei') {
                    if (vlan.dhcpMode === 'global' && vlan.selectedPool) {
                        interfaceBlock += ` dhcp select global pool ${vlan.selectedPool}\n`;
                    } else if (vlan.dhcpMode === 'interface') {
                        interfaceBlock += ` dhcp select interface\n`;
                    }
                } else if (vendorLower === 'h3c') {
                    if (vlan.dhcpMode === 'global' && vlan.selectedPool) {
                        interfaceBlock += ` dhcp select server\n dhcp server apply ip-pool ${vlan.selectedPool}\n`;
                    }
                }
            }

            if (vlan.packetFilterInboundAclId) {
                const acl = acls.find(a => a.id === vlan.packetFilterInboundAclId);
                if(acl){
                    if(vendorLower === 'cisco') interfaceBlock += ` ip access-group ${acl.name || acl.number} in\n`;
                    else if (vendorLower === 'huawei') interfaceBlock += ` traffic-filter inbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                    else if (vendorLower === 'h3c') interfaceBlock += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} inbound\n`;
                }
            }
            if (vlan.packetFilterOutboundAclId) {
                const acl = acls.find(a => a.id === vlan.packetFilterOutboundAclId);
                if(acl){
                    if(vendorLower === 'cisco') interfaceBlock += ` ip access-group ${acl.name || acl.number} out\n`;
                    else if (vendorLower === 'huawei') interfaceBlock += ` traffic-filter outbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                    else if (vendorLower === 'h3c') interfaceBlock += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} outbound\n`;
                }
            }

            if (ipsecConfig.enabled && vlan.ipsecPolicyId) {
                const policy = ipsecConfig.policies.find(p => p.id === vlan.ipsecPolicyId);
                if (policy) {
                    if (vendorLower === 'cisco') {
                        interfaceBlock += ` crypto map ${policy.name}\n`;
                    } else if (vendorLower === 'huawei') {
                        interfaceBlock += ` ipsec policy ${policy.name}\n`;
                    } else if (vendorLower === 'h3c') {
                        interfaceBlock += ` ipsec apply policy ${policy.name}\n`;
                    }
                }
            }
            
            if (vendorLower === 'h3c' && vlan.natStaticEnable) {
                interfaceBlock += ` nat static enable\n`;
            }
            
            if (vendorLower === 'h3c' && vlan.natHairpinEnable) {
                interfaceBlock += ` nat hairpin enable\n`;
            }
            
            if (vendorLower === 'huawei' && vlan.huaweiNatEnable) {
                interfaceBlock += ` nat enable\n`;
            }

            cli += `interface ${interfaceName}\n${interfaceBlock}`;
            cli += (vendorLower === 'cisco' ? ` no shutdown\nexit\n` : `quit\n`);
        }
    });

    return { cli: cli.trim(), explanation: "VLAN configuration generated locally." };
};