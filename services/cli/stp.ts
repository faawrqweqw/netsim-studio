import { STPConfig, Vendor } from '../../types';

export const generateStpCli = (vendor: string, deviceType: string, config: STPConfig): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    cli += `stp mode ${config.mode}\n`;
    if (config.mode !== 'mstp') {
        cli += `stp priority ${config.priority}\n`;
        if (config.rootBridge === 'primary') cli += `stp root primary\n`;
        if (config.rootBridge === 'secondary') cli += `stp root secondary\n`;
    }

    if (config.mode === 'mstp') {
        cli += `stp region-configuration\n`;
        if (config.mstpRegion.regionName) cli += ` region-name ${config.mstpRegion.regionName}\n`;
        if (config.mstpRegion.revisionLevel) cli += ` revision-level ${config.mstpRegion.revisionLevel}\n`;
        config.mstpInstances.forEach((inst: any) => {
            cli += ` instance ${inst.instanceId} vlan ${inst.vlanList}\n`;
        });
        cli += ` active region-configuration\nquit\n`;
        config.mstpInstances.forEach((inst: any) => {
            if (inst.rootBridge === 'primary') cli += `stp instance ${inst.instanceId} root primary\n`;
            else if (inst.rootBridge === 'secondary') cli += `stp instance ${inst.instanceId} root secondary\n`;
            else cli += `stp instance ${inst.instanceId} priority ${inst.priority}\n`;
        });
    }

    config.portConfigs.forEach((pconf: any) => {
        cli += `interface ${pconf.interfaceName}\n`;
        if (pconf.edgePort) cli += vendorLower === 'cisco' ? ` spanning-tree portfast\n` : ` stp edged-port enable\n`;
        if (pconf.bpduGuard) cli += vendorLower === 'cisco' ? ` spanning-tree bpduguard enable\n` : ` stp bpdu-protection\n`;
        cli += vendorLower === 'cisco' ? `exit\n` : `quit\n`;
    });
    
    return { cli: cli.trim(), explanation: "STP configuration generated locally." };
};
