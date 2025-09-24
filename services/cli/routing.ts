import { RoutingConfig, StaticRoute, OSPFArea, Vendor } from '../../types';

export const generateRoutingCli = (vendor: string, deviceType: string, config: RoutingConfig): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    config.staticRoutes.forEach((route: StaticRoute) => {
        const cmd = (vendorLower === 'cisco') ? 'ip route' : 'ip route-static';
        const pref = (vendorLower !== 'cisco' && route.adminDistance) ? ` preference ${route.adminDistance}` : (route.adminDistance || '');
        cli += `${cmd} ${route.network} ${route.subnetMask} ${route.nextHop}${pref}\n`;
    });

    if (config.ospf.enabled) {
        let ospfProcessCli = '';
        if (vendorLower === 'cisco') {
            ospfProcessCli += `router ospf ${config.ospf.processId}\n`;
            ospfProcessCli += ` router-id ${config.ospf.routerId}\n`;
            
            config.ospf.areas.forEach((area: OSPFArea) => {
                area.networks.forEach((net: any) => {
                    ospfProcessCli += ` network ${net.network} ${net.wildcardMask} area ${area.areaId}\n`;
                });

                if (area.areaId !== '0') {
                    if (area.areaType === 'stub') {
                        ospfProcessCli += ` area ${area.areaId} stub${area.noSummary ? ' no-summary' : ''}\n`;
                    } else if (area.areaType === 'nssa') {
                        ospfProcessCli += ` area ${area.areaId} nssa${area.noSummary ? ' no-summary' : ''}\n`;
                    }
                }
                
                if ((area.areaType === 'stub' || area.areaType === 'nssa') && area.defaultCost) {
                    ospfProcessCli += ` area ${area.areaId} default-cost ${area.defaultCost}\n`;
                }
            });

            if (config.ospf.redistributeStatic) ospfProcessCli += ' redistribute static subnets\n';
            if (config.ospf.redistributeConnected) ospfProcessCli += ' redistribute connected subnets\n';
            if (config.ospf.defaultRoute) ospfProcessCli += ' default-information originate\n';
            ospfProcessCli += 'exit\n';
        } else { // Huawei/H3C
            ospfProcessCli += `ospf ${config.ospf.processId} router-id ${config.ospf.routerId}\n`;
            if (config.ospf.redistributeStatic) ospfProcessCli += ' import-route static\n';
            if (config.ospf.redistributeConnected) ospfProcessCli += ' import-route direct\n';
            if (config.ospf.defaultRoute) ospfProcessCli += ' default-route-advertise\n';
            
            config.ospf.areas.forEach((area: OSPFArea) => {
                ospfProcessCli += ` area ${area.areaId}\n`;
                if (area.areaId !== '0') {
                    if (area.areaType === 'stub') {
                        ospfProcessCli += `  stub${area.noSummary ? ' no-summary' : ''}\n`;
                    } else if (area.areaType === 'nssa') {
                        ospfProcessCli += `  nssa${area.noSummary ? ' no-summary' : ''}\n`;
                    }
                }
                
                if ((area.areaType === 'stub' || area.areaType === 'nssa') && area.defaultCost) {
                    ospfProcessCli += `  default-cost ${area.defaultCost}\n`;
                }

                area.networks.forEach((net: any) => {
                    ospfProcessCli += `  network ${net.network} ${net.wildcardMask}\n`;
                });
                ospfProcessCli += ' quit\n';
            });
            ospfProcessCli += 'quit\n';
        }

        let ospfInterfaceCli = '';
        if (config.ospf.interfaceConfigs && config.ospf.interfaceConfigs.length > 0) {
            config.ospf.interfaceConfigs.forEach(ifaceConfig => {
                if (ifaceConfig.interfaceName && ifaceConfig.priority) {
                    ospfInterfaceCli += `interface ${ifaceConfig.interfaceName}\n`;
                    if (vendorLower === 'cisco') {
                        ospfInterfaceCli += ` ip ospf priority ${ifaceConfig.priority}\n`;
                        ospfInterfaceCli += ' exit\n';
                    } else { // Huawei & H3C
                        ospfInterfaceCli += ` ospf dr-priority ${ifaceConfig.priority}\n`;
                        ospfInterfaceCli += ' quit\n';
                    }
                }
            });
        }
        
        if (ospfProcessCli.trim() || ospfInterfaceCli.trim()) {
            cli += `\n${ospfProcessCli}${ospfInterfaceCli}`;
        }
    }
    
    return { cli: cli.trim(), explanation: "Routing configuration generated locally." };
};