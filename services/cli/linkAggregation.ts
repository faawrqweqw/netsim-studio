import { LinkAggregationConfig, Vendor, DeviceType } from '../../types';

export const generateLinkAggregationCli = (vendor: string, deviceType: DeviceType, config: LinkAggregationConfig): { cli: string; explanation: string } => {
    const { groupId, mode, interfaces, description, loadBalanceAlgorithm, interfaceMode, accessVlan, trunkNativeVlan, trunkAllowedVlans } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    if (!groupId || !interfaces || interfaces.length === 0) {
        return { cli: '', explanation: "Group ID and member interfaces are required." };
    }

    let aggIntfName = '';

    if (vendorLower === 'cisco') {
        aggIntfName = `Port-channel${groupId}`;
        if (loadBalanceAlgorithm) {
            cli += `port-channel load-balance ${loadBalanceAlgorithm}\n\n`;
        }

        cli += `interface ${aggIntfName}\n`;
        if (description) cli += ` description ${description}\n`;
        
        if (interfaceMode === 'access' && accessVlan) {
            cli += ` switchport mode access\n switchport access vlan ${accessVlan}\n`;
        } else if (interfaceMode === 'trunk') {
            cli += ` switchport mode trunk\n`;
            if (trunkNativeVlan) cli += ` switchport trunk native vlan ${trunkNativeVlan}\n`;
            if (trunkAllowedVlans) cli += ` switchport trunk allowed vlan ${trunkAllowedVlans}\n`;
        } else if (interfaceMode === 'l3') {
            cli += ` no switchport\n`;
        }
        cli += `exit\n\n`;

        interfaces.forEach((intf: string) => {
            if (!intf) return;
            cli += `interface ${intf}\n`;
            cli += ` channel-group ${groupId} mode ${mode}\n`;
            cli += ` no shutdown\n`;
            cli += `exit\n`;
        });

    } else if (vendorLower === 'huawei') {
        aggIntfName = `Eth-Trunk${groupId}`;
        cli += `interface ${aggIntfName}\n`;
        if (mode === 'manual') {
            cli += ` mode manual load-balance\n`;
        } else if (mode) {
             cli += ` mode ${mode}\n`;
        }
        if (loadBalanceAlgorithm) cli += ` load-balance ${loadBalanceAlgorithm}\n`;
        if (description) cli += ` description ${description}\n`;
        
        if (interfaceMode === 'access' && accessVlan) {
            cli += ` port link-type access\n port default vlan ${accessVlan}\n`;
        } else if (interfaceMode === 'trunk') {
            cli += ` port link-type trunk\n`;
            if (trunkNativeVlan) cli += ` port trunk pvid vlan ${trunkNativeVlan}\n`;
            if (trunkAllowedVlans) cli += ` port trunk allow-pass vlan ${trunkAllowedVlans.replace(/,/g, ' ').replace(/-/g, ' to ')}\n`;
        } else if (interfaceMode === 'l3') {
            cli += ` undo portswitch\n`;
        }
        cli += `quit\n\n`;

        interfaces.forEach((intf: string) => {
            if (!intf) return;
            cli += `interface ${intf}\n`;
            cli += ` eth-trunk ${groupId}\n`;
            cli += `quit\n`;
        });

    } else if (vendorLower === 'h3c') {
        const isL3Agg = interfaceMode === 'l3' || deviceType === DeviceType.Router || deviceType === DeviceType.Firewall;
        aggIntfName = isL3Agg ? `Route-Aggregation${groupId}` : `Bridge-Aggregation${groupId}`;
    
        if (loadBalanceAlgorithm) {
            cli += `link-aggregation global\n`;
            cli += ` load-sharing mode ${loadBalanceAlgorithm}\n`;
            cli += `quit\n\n`;
        }
        
        cli += `interface ${aggIntfName}\n`;
        if (description) cli += ` description ${description}\n`;
        
        // Only configure L2 properties for Bridge-Aggregation (L2) interfaces
        if (!isL3Agg) {
            if (interfaceMode === 'access' && accessVlan) {
                cli += ` port access vlan ${accessVlan}\n`;
            } else if (interfaceMode === 'trunk') {
                cli += ` port link-type trunk\n`;
                if (trunkNativeVlan) cli += ` port trunk pvid vlan ${trunkNativeVlan}\n`;
                if (trunkAllowedVlans) cli += ` port trunk permit vlan ${trunkAllowedVlans.replace(/,/g, ' ').replace(/-/g, ' to ')}\n`;
            }
        }
    
        if (mode === 'dynamic') {
             cli += ` link-aggregation mode dynamic\n`;
        } else if (mode === 'static') {
             cli += ` link-aggregation mode static\n`;
        }
        cli += `quit\n\n`;
        
        interfaces.forEach((intf: string) => {
            if (!intf) return;
            cli += `interface ${intf}\n`;
            cli += ` port link-aggregation group ${groupId}\n`;
            cli += `quit\n`;
        });
    }
    
    return { cli: cli.trim(), explanation: "Link Aggregation configuration generated locally." };
};