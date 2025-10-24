import { InterfaceIPConfig, PhysicalInterfaceIPConfig, ACL, Vendor, IPsecConfig } from '../../types';

export const generateInterfaceIpCli = (vendor: string, deviceType: string, config: InterfaceIPConfig, ipsecConfig: IPsecConfig, acls: ACL[] = []): { cli: string; explanation: string } => {
    const { interfaces = [] } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    interfaces.forEach((intf: PhysicalInterfaceIPConfig) => {
        if (!intf.interfaceName) return;

        let interfaceBlock = '';

        if (intf.description) interfaceBlock += ` description ${intf.description}\n`;

        if (intf.ipAddress && intf.subnetMask) {
            if (vendorLower === 'cisco') {
                interfaceBlock += ` ip address ${intf.ipAddress} ${intf.subnetMask}\n`;
            } else {
                interfaceBlock += ` ip address ${intf.ipAddress} ${intf.subnetMask}\n`;
            }
        }
        
        if (intf.enableDHCP) {
             if (vendorLower === 'cisco') {
                // Cisco has no simple global pool select, relies on helper-address for relay
             } else if (vendorLower === 'huawei') {
                 if (intf.dhcpMode === 'global' && intf.selectedPool) {
                    interfaceBlock += ` dhcp select global \n`;
                } else if (intf.dhcpMode === 'interface') {
                    interfaceBlock += ` dhcp select interface\n`;
                }
             } else if (vendorLower === 'h3c') {
                if (intf.dhcpMode === 'global' && intf.selectedPool) {
                    interfaceBlock += ` dhcp select server\n dhcp server apply ip-pool ${intf.selectedPool}\n`;
                }
             }
        }
        
        if (intf.packetFilterInboundAclId) {
            const acl = acls.find(a => a.id === intf.packetFilterInboundAclId);
            if (acl) {
                if(vendorLower === 'cisco') interfaceBlock += ` ip access-group ${acl.name || acl.number} in\n`;
                else if (vendorLower === 'huawei') interfaceBlock += ` traffic-filter inbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                else if (vendorLower === 'h3c') interfaceBlock += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} inbound\n`;
            }
        }
        if (intf.packetFilterOutboundAclId) {
            const acl = acls.find(a => a.id === intf.packetFilterOutboundAclId);
             if (acl) {
                if(vendorLower === 'cisco') interfaceBlock += ` ip access-group ${acl.name || acl.number} out\n`;
                else if (vendorLower === 'huawei') interfaceBlock += ` traffic-filter outbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                else if (vendorLower === 'h3c') interfaceBlock += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} outbound\n`;
            }
        }

        if (ipsecConfig.enabled && intf.ipsecPolicyId) {
            const policy = ipsecConfig.policies.find(p => p.id === intf.ipsecPolicyId);
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
        
        if (vendorLower === 'h3c' && intf.natStaticEnable) {
            interfaceBlock += ` nat static enable\n`;
        }

        if (vendorLower === 'h3c' && intf.natHairpinEnable) {
            interfaceBlock += ` nat hairpin enable\n`;
        }
        
        if (vendorLower === 'huawei' && intf.huaweiNatEnable) {
            interfaceBlock += ` nat enable\n`;
        }

        if(interfaceBlock.trim()){
            cli += `interface ${intf.interfaceName}\n${interfaceBlock}`;
            if (vendorLower === 'cisco') cli += ` no shutdown\nexit\n`;
            else cli += `quit\n`;
        }
    });

    return { cli: cli.trim(), explanation: "Physical interface IP configuration generated locally." };
};