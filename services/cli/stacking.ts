import { StackingConfig, Vendor } from '../../types';

export const generateStackingCli = (vendor: Vendor, config: StackingConfig): { cli: string; explanation: string } => {
    let cli = '';

    if (!config.enabled) {
        return { cli: '', explanation: 'Stacking (IRF) is disabled.' };
    }

    // 华为设备的堆叠配置
    if (vendor === Vendor.Huawei) {
        return generateHuaweiStackingCli(config);
    }

    // 思科设备的堆叠配置
    if (vendor === Vendor.Cisco) {
        return generateCiscoStackingCli(config);
    }

    // H3C设备的堆叠配置（原有逻辑）
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

// 华为设备堆叠配置生成函数
const generateHuaweiStackingCli = (config: StackingConfig): { cli: string; explanation: string } => {
    let cli = '';

    cli += '# 华为设备堆叠配置 (CSS/iStack)\n';
    cli += '# 注意：CSS通常需要硬件堆叠卡或专用堆叠线缆\n\n';

    if (config.modelType === 'new') {
        // 新型号设备 - 使用CSS2/iStack方式
        cli += '# Phase 1: 配置堆叠成员和优先级\n';
        cli += '# 在每台交换机上独立配置\n\n';

        config.members.forEach(member => {
            cli += `\n# --- 成员 ${member.memberId} 配置 ---\n`;
            
            // 配置优先级
            if (member.priority) {
                cli += `stack priority ${member.priority}\n`;
            }

            // 华为配置：每个物理接口需要独立的 stack-port 配置
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `\n# 配置堆叠端口（每个物理接口需要独立配置）\n`;
                    port.portGroup.forEach((iface, index) => {
                        // 华为：每个物理接口对应一个独立的 stack-port 逻辑接口
                        const stackPortId = index + 1; // 堆叠端口ID从1开始
                        cli += `interface stack-port ${member.memberId}/${stackPortId}\n`;
                        cli += ` port interface ${iface} enable\n`;
                        cli += 'quit\n';
                    });
                }
            }
        });

        cli += '\n# Phase 2: 保存配置并连接堆叠线缆\n';
        cli += 'save\n';
        cli += '# 物理连接堆叠线缆后，设备会自动形成堆叠\n\n';

        if (config.domainId) {
            cli += '# Phase 3: 在主交换机上配置域ID（可选）\n';
            cli += `domain ${config.domainId}\n`;
        }

    } else {
        // 旧型号设备 - 使用传统CSS方式
        cli += '# 传统CSS堆叠配置\n\n';

        // 配置域ID
        if (config.domainId) {
            cli += `domain ${config.domainId}\n`;
        }

        // 成员重编号和优先级配置
        config.members.forEach(member => {
            if (member.memberId && member.newMemberId && member.memberId !== member.newMemberId) {
                cli += `stack member-id ${member.memberId} renumber ${member.newMemberId}\n`;
            }
            
            const memberIdToUse = member.newMemberId || member.memberId;
            if (memberIdToUse && member.priority) {
                cli += `stack priority ${member.priority} member-id ${memberIdToUse}\n`;
            }
        });

        // 华为配置：每个物理接口需要独立的 stack-port 配置
        config.members.forEach(member => {
            const memberIdToUse = member.newMemberId || member.memberId;
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `\n# 成员 ${memberIdToUse} 堆叠端口配置\n`;
                    port.portGroup.forEach((iface, index) => {
                        // 华为：每个物理接口对应一个独立的 stack-port 逻辑接口
                        const stackPortId = index + 1;
                        cli += `interface stack-port ${memberIdToUse}/${stackPortId}\n`;
                        cli += ` port interface ${iface} enable\n`;
                        cli += 'quit\n';
                    });
                }
            }
        });

        cli += '\n# 保存配置\n';
        cli += 'save\n';
        cli += '# 连接堆叠线缆后，堆叠将自动激活\n';
    }

    return { cli: cli.trim(), explanation: "华为设备堆叠 (CSS/iStack) 配置生成完成。" };
};

// 思科设备堆叠配置生成函数
const generateCiscoStackingCli = (config: StackingConfig): { cli: string; explanation: string } => {
    let cli = '';

    if (config.modelType === 'new') {
        // StackWise Virtual 配置
        cli += '# Cisco StackWise Virtual 配置\n';
        cli += '# 适用于 Catalyst 9000 系列等支持 StackWise Virtual 的设备\n';
        cli += '# StackWise Virtual 仅支持两台交换机组成虚拟堆叠\n\n';

        cli += '# Phase 1: 全局启用 StackWise Virtual\n';
        cli += 'configure terminal\n';
        cli += 'stackwise-virtual\n';
        
        if (config.domainId) {
            cli += ` domain ${config.domainId}\n`;
        }
        cli += 'exit\n\n';

        // 配置每个成员
        config.members.slice(0, 2).forEach((member, idx) => {
            cli += `\n# --- 成员 ${member.memberId} 配置 ---\n`;
            
            // 配置优先级
            if (member.priority) {
                cli += `switch ${member.memberId} priority ${member.priority}\n`;
            }

            // 思科 StackWise Virtual：需要在接口下配置 stackwise-virtual link
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `\n# 配置 StackWise Virtual 链路（使用端口通道）\n`;
                    
                    // 每个成员需要配置独立的链路ID
                    port.portGroup.forEach((iface, index) => {
                        const linkId = index + 1;
                        cli += `interface ${iface}\n`;
                        cli += ` no switchport\n`;
                        cli += ` no shutdown\n`;
                        cli += ` stackwise-virtual link ${linkId}\n`;
                        cli += `exit\n`;
                    });
                }
            }
        });

        if (config.members.length > 2) {
            cli += '\n# 注意：StackWise Virtual 仅支持2台设备，其他成员将被忽略\n';
        }

        cli += '\n# Phase 2: 配置双活检测（强烈推荐）\n';
        cli += '# 双活检测用于防止堆叠分裂时的双主问题\n';
        cli += '# 示例1：使用快速以太网端口进行检测\n';
        cli += '# stackwise-virtual\n';
        cli += '#  dual-active detection pagp\n';
        cli += '#  dual-active detection pagp trust channel-group <port-channel-id>\n';
        cli += '# exit\n';
        cli += '# 或使用接口级配置：\n';
        cli += '# interface <interface-id>\n';
        cli += '#  stackwise-virtual dual-active-detection\n';
        cli += '# exit\n\n';

        cli += '# Phase 3: 保存配置并重启\n';
        cli += 'end\n';
        cli += 'write memory\n';
        cli += '# 重启设备使 StackWise Virtual 生效：\n';
        cli += '# reload\n';
        cli += '# 设备重启后将形成 StackWise Virtual 堆叠\n';

    } else {
        // 传统 StackWise 配置
        cli += '# Cisco StackWise 配置\n';
        cli += '# 适用于 Catalyst 3750/3850/9300 系列等传统堆叠设备\n';
        cli += '# StackWise 使用专用堆叠线缆，不需要配置物理接口\n\n';

        cli += 'configure terminal\n\n';

        // 成员重编号
        let hasRenumber = false;
        config.members.forEach(member => {
            if (member.memberId && member.newMemberId && member.memberId !== member.newMemberId) {
                cli += `# 重新编号交换机 ${member.memberId} 为 ${member.newMemberId}\n`;
                cli += `switch ${member.memberId} renumber ${member.newMemberId}\n`;
                cli += '# 注意：此命令会导致交换机重启\n\n';
                hasRenumber = true;
            }
        });

        if (hasRenumber) {
            cli += '# 等待重启完成后，继续配置优先级\n\n';
        }

        // 配置优先级和型号
        config.members.forEach(member => {
            const memberIdToUse = member.newMemberId || member.memberId;
            
            cli += `# 成员 ${memberIdToUse} 配置\n`;
            
            // 型号预配置（对于StackWise-480和更高版本很重要）
            cli += `# 预配置交换机型号（可选，但推荐）\n`;
            cli += `# switch ${memberIdToUse} provision <model-type>\n`;
            cli += `# 例如: switch ${memberIdToUse} provision ws-c3850-24p\n\n`;
            
            if (member.priority) {
                cli += `switch ${memberIdToUse} priority ${member.priority}\n`;
            }
            cli += '\n';
        });

        cli += '# 保存配置\n';
        cli += 'end\n';
        cli += 'write memory\n';
        cli += '\n# 查看堆叠状态\n';
        cli += '# show switch\n';
        cli += '# show switch detail\n';
        cli += '# show switch neighbors\n';
    }

    return { cli: cli.trim(), explanation: "Cisco 堆叠配置生成完成。" };
};