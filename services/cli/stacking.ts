import { StackingConfig, Vendor } from '../../types';

export const generateStackingCli = (vendor: Vendor, config: StackingConfig): { cli: string; explanation: string } => {
    let cli = '';

    if (!config.enabled) {
        return { cli: '', explanation: 'Stacking (IRF) is disabled.' };
    }

    if (vendor !== Vendor.H3C) {
        return { cli: `# Stacking for ${vendor} is not supported.`, explanation: 'Not supported' };
    }

    if (config.modelType === 'new') {
        cli += '# Phase 1: Pre-configure IRF in Independent Mode.\n';
        cli += '# Apply these commands to each switch before forming the stack.\n\n';
        
        const allInterfaces = new Set<string>();
        config.members.forEach(member => {
            member.irfPorts.forEach(port => {
                port.portGroup.forEach(iface => {
                    if (iface) allInterfaces.add(iface);
                });
            });
        });

        if (allInterfaces.size > 0) {
            cli += '# --- Shutdown IRF physical ports before binding ---\n';
            allInterfaces.forEach(iface => {
                cli += `interface ${iface}\n`;
                cli += ' shutdown\n';
                cli += 'quit\n';
            });
            cli += '\n';
        }
        
        config.members.forEach(member => {
            cli += `\n# --- Pre-configuration for intended Member ID ${member.memberId} ---\n`;
            cli += `irf member ${member.memberId}\n`;
            if (member.priority) {
                cli += `irf priority ${member.priority}\n`;
            }

            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                 if (port.portGroup.length > 0) {
                    cli += `irf-port ${port.id}\n`;
                    port.portGroup.forEach(iface => {
                        cli += ` port group interface ${iface}\n`;
                    });
                    cli += 'quit\n';
                 }
            }
        });
        
        if (allInterfaces.size > 0) {
            cli += '\n# --- Bring up IRF physical ports ---\n';
             allInterfaces.forEach(iface => {
                cli += `interface ${iface}\n`;
                cli += ' undo shutdown\n';
                cli += 'quit\n';
            });
        }
        
        cli += '\n# --- This is the end of per-device pre-configuration ---\n';
        cli += 'quit\n\n';

        cli += '# Phase 2: Save configuration and switch to IRF mode.\n';
        cli += '# IMPORTANT: The following command will cause the devices to reboot!\n';
        cli += 'save force\n';
        cli += 'chassis convert mode irf\n\n';

        if (config.domainId) {
            cli += '# Phase 3: After reboot and stack formation, apply domain ID on the master device.\n';
            cli += `irf domain ${config.domainId}\n`;
        }
        
    } else { // Old model logic
        if (config.domainId) {
            cli += `irf domain ${config.domainId}\n`;
        }

        const renumberInterface = (iface: string, memberId: string, newMemberId: string): string => {
            if (!newMemberId || memberId === newMemberId) {
                return iface;
            }
            // Interface format is like: Ten-GigabitEthernet1/0/49
            // We want to replace the first number (member ID)
            const regex = /^([a-zA-Z-]+)(\d+)(\/\d+\/\d+)$/;
            const match = iface.match(regex);

            if (match && match[2] === memberId) {
                return `${match[1]}${newMemberId}${match[3]}`;
            }
            return iface; // fallback if format is unexpected
        };

        config.members.forEach(member => {
            if (member.memberId && member.newMemberId) {
                cli += `irf member ${member.memberId} renumber ${member.newMemberId}\n`;
            }
            const memberIdToUse = member.newMemberId || member.memberId;
            if (memberIdToUse && member.priority) {
                cli += `irf member ${memberIdToUse} priority ${member.priority}\n`;
            }
        });
        
        const interfaceMap = new Map<string, string>(); // Original name -> Renumbered name
        config.members.forEach(member => {
            if (member.irfPorts.length > 0) {
                member.irfPorts[0].portGroup.forEach(iface => {
                    if (iface) {
                        const renumberedIface = renumberInterface(iface, member.memberId, member.newMemberId);
                        interfaceMap.set(iface, renumberedIface);
                    }
                });
            }
        });

        const allConfiguredInterfaces = new Set(interfaceMap.values());

        if (allConfiguredInterfaces.size > 0) {
             allConfiguredInterfaces.forEach(iface => {
                cli += `interface ${iface}\n`;
                cli += ' shutdown\n';
                cli += 'quit\n';
            });
        }
        
        config.members.forEach(member => {
            const memberIdToUse = member.newMemberId || member.memberId;
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `irf-port ${memberIdToUse}/${port.id}\n`;
                    port.portGroup.forEach(iface => {
                        if (iface) {
                            const ifaceToGroup = interfaceMap.get(iface) || iface;
                            cli += ` port group interface ${ifaceToGroup}\n`;
                        }
                    });
                    cli += 'quit\n';
                }
            }
        });
        
        if (allConfiguredInterfaces.size > 0) {
            allConfiguredInterfaces.forEach(iface => {
                cli += `interface ${iface}\n`;
                cli += ' undo shutdown\n';
                cli += 'quit\n';
            });
        }

        cli += '\n# IMPORTANT: Save the configuration before activating IRF ports.\n';
        cli += 'save force\n\n';
        cli += '# This command will activate the IRF configuration and may cause a reboot of member devices.\n';
        cli += 'irf-port-configuration active\n';
    }

    return { cli: cli.trim(), explanation: "H3C Stacking (IRF) configuration generated." };
};