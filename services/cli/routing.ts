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
        if (vendorLower === 'cisco') {
            cli += `router ospf ${config.ospf.processId}\n`;
            cli += ` router-id ${config.ospf.routerId}\n`;
            
            config.ospf.areas.forEach((area: OSPFArea) => {
                area.networks.forEach((net: any) => {
                    cli += ` network ${net.network} ${net.wildcardMask} area ${area.areaId}\n`;
                });

                if (area.areaId !== '0') {
                    if (area.areaType === 'stub') {
                        cli += ` area ${area.areaId} stub${area.noSummary ? ' no-summary' : ''}\n`;
                    } else if (area.areaType === 'nssa') {
                        cli += ` area ${area.areaId} nssa${area.noSummary ? ' no-summary' : ''}\n`;
                    }
                }
                
                if ((area.areaType === 'stub' || area.areaType === 'nssa') && area.defaultCost) {
                    cli += ` area ${area.areaId} default-cost ${area.defaultCost}\n`;
                }
            });

            if (config.ospf.redistributeStatic) cli += ' redistribute static subnets\n';
            if (config.ospf.redistributeConnected) cli += ' redistribute connected subnets\n';
            if (config.ospf.defaultRoute) cli += ' default-information originate\n';
            cli += 'exit\n';
        } else { // Huawei/H3C
            cli += `ospf ${config.ospf.processId} router-id ${config.ospf.routerId}\n`;
            if (config.ospf.redistributeStatic) cli += ' import-route static\n';
            if (config.ospf.redistributeConnected) cli += ' import-route direct\n';
            if (config.ospf.defaultRoute) cli += ' default-route-advertise\n';
            
            config.ospf.areas.forEach((area: OSPFArea) => {
                cli += ` area ${area.areaId}\n`;
                if (area.areaId !== '0') {
                    if (area.areaType === 'stub') {
                        cli += `  stub${area.noSummary ? ' no-summary' : ''}\n`;
                    } else if (area.areaType === 'nssa') {
                        cli += `  nssa${area.noSummary ? ' no-summary' : ''}\n`;
                    }
                }
                
                if ((area.areaType === 'stub' || area.areaType === 'nssa') && area.defaultCost) {
                    cli += `  default-cost ${area.defaultCost}\n`;
                }

                area.networks.forEach((net: any) => {
                    cli += `  network ${net.network} ${net.wildcardMask}\n`;
                });
                cli += ' quit\n';
            });
            cli += 'quit\n';
        }
    }
    
    return { cli: cli.trim(), explanation: "Routing configuration generated locally." };
};