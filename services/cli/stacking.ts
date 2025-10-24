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

    cli += '# ========================================\n';
    cli += '# 华为设备堆叠配置 (CSS/iStack)\n';
    cli += '# 注意：CSS通常需要硬件堆叠卡或专用堆叠线缆\n';
    cli += '# 配置原则：先配置 → 后重编 → 再保存 → 最后重启\n';
    cli += '# ========================================\n\n';

    if (config.modelType === 'new') {
        // 新型号设备 - 使用CSS2/iStack方式
        cli += '# ===== 阶段一：基础配置（在每台交换机上独立配置）=====\n\n';

        const hasRenumber = config.members.some(m => m.memberId && m.newMemberId && m.memberId !== m.newMemberId);

        config.members.forEach(member => {
            const currentSlotId = member.memberId; // 当前设备的slot ID（重编号前）

            cli += `# --- 交换机当前Slot ID ${currentSlotId} 配置步骤 ---\n`;
            cli += 'system-view\n\n';

            // 步骤1：配置域ID（如果有）
            if (config.domainId) {
                cli += '# 步骤1：配置堆叠域ID\n';
                cli += `stack domain ${config.domainId}\n\n`;
            }

            // 步骤2：配置当前slot ID的堆叠端口（使用当前的slot ID，不是目标ID）
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `# 步骤2：配置当前slot ${currentSlotId} 的堆叠物理端口\n`;
                    cli += `# 注意：此时设备的slot ID还是 ${currentSlotId}，所以使用 ${currentSlotId} 配置端口\n`;
                    port.portGroup.forEach((iface, index) => {
                        const stackPortId = index + 1;
                        cli += `interface stack-port ${currentSlotId}/${stackPortId}\n`;
                        cli += ` port interface ${iface} enable\n`;
                        cli += ` quit\n`;
                    });
                    cli += '\n';
                }
            }

            // 步骤3：配置优先级（如果不需要重编号，在重编号前配置优先级没有意义）
            if (member.priority && !hasRenumber) {
                cli += `# 步骤3：配置堆叠成员 ${currentSlotId} 的优先级\n`;
                cli += `stack slot ${currentSlotId}\n`;
                cli += ` priority ${member.priority}\n`;
                cli += ` quit\n\n`;
            }

            cli += 'quit\n\n';

            // 步骤4：保存配置
            cli += '# 步骤4：保存基础配置\n';
            cli += 'save\n';
            cli += 'y\n\n';
        });

        // 如果需要重编号
        if (hasRenumber) {
            cli += '# ===== 阶段二：成员重编号（需要重启）=====\n';
            cli += '# 重要：重编号必须在配置完堆叠端口之后进行\n\n';

            config.members.forEach(member => {
                if (member.memberId && member.newMemberId && member.memberId !== member.newMemberId) {
                    cli += `# --- 重编号交换机：Slot ${member.memberId} → Slot ${member.newMemberId} ---\n`;
                    cli += 'system-view\n';
                    cli += `stack slot ${member.memberId}\n`;
                    cli += ` renumber ${member.newMemberId}\n`;
                    cli += ` quit\n`;
                    cli += 'quit\n\n';
                    cli += '# 保存配置\n';
                    cli += 'save\n';
                    cli += 'y\n\n';
                    cli += `# ！！！重要：设备将自动重启，重启后slot ID变为 ${member.newMemberId}\n`;
                    cli += '# 等待设备重启完成后，堆叠端口会自动映射到新的slot ID\n';
                    cli += '# 然后继续配置优先级\n\n';
                }
            });

            cli += '# ===== 阶段三：重启后配置优先级和验证端口 =====\n';
            cli += '# 在所有设备重启完成后执行\n\n';

            config.members.forEach(member => {
                const memberIdToUse = member.newMemberId || member.memberId;
                if (member.priority || (member.newMemberId && member.irfPorts.length > 0)) {
                    cli += `# --- 在重启后的交换机 Slot ${memberIdToUse} 上配置 ---\n`;
                    cli += 'system-view\n\n';

                    // 配置优先级
                    if (member.priority) {
                        cli += `# 配置Slot ${memberIdToUse} 的优先级\n`;
                        cli += `stack slot ${memberIdToUse}\n`;
                        cli += ` priority ${member.priority}\n`;
                        cli += ` quit\n\n`;
                    }

                    // 验证堆叠端口（重编号后端口配置会自动迁移）
                    if (member.newMemberId && member.irfPorts.length > 0) {
                        const port = member.irfPorts[0];
                        if (port.portGroup.length > 0) {
                            cli += `# 验证堆叠端口配置已自动迁移到新的Slot ID\n`;
                            cli += `# display interface stack-port ${memberIdToUse}/1\n`;
                            cli += `# display interface stack-port ${memberIdToUse}/2\n\n`;
                        }
                    }

                    cli += 'quit\n\n';
                    cli += '# 保存配置\n';
                    cli += 'save\n';
                    cli += 'y\n\n';
                }
            });
        }

        cli += '# ===== 阶段四：物理连接堆叠线缆 =====\n';
        cli += '# 1. 确保所有配置已保存\n';
        cli += '# 2. 使用专用堆叠线缆连接交换机的堆叠端口\n';
        cli += '# 3. 连接完成后，堆叠会自动形成\n';
        cli += '# 4. 使用 display stack 命令验证堆叠状态\n\n';

        cli += '# ===== 验证命令 =====\n';
        cli += '# display stack\n';
        cli += '# display stack topology\n';
        cli += '# display stack configuration\n';

    } else {
        // 旧型号设备 - 使用传统CSS方式
        cli += '# ===== 传统CSS堆叠配置流程 =====\n\n';

        const hasRenumber = config.members.some(m => m.memberId && m.newMemberId && m.memberId !== m.newMemberId);

        cli += '# ===== 阶段一：基础配置 =====\n\n';
        cli += 'system-view\n\n';

        // 步骤1：配置域ID
        if (config.domainId) {
            cli += '# 步骤1：配置堆叠域ID\n';
            cli += `stack domain ${config.domainId}\n\n`;
        }

        // 步骤2：配置优先级（如果不需要重编号）
        if (!hasRenumber) {
            config.members.forEach(member => {
                if (member.priority) {
                    cli += `# 步骤2：配置成员 ${member.memberId} 的优先级\n`;
                    cli += `stack slot ${member.memberId}\n`;
                    cli += ` priority ${member.priority}\n`;
                    cli += ` quit\n\n`;
                }
            });
        }

        // 步骤3：配置堆叠端口
        config.members.forEach(member => {
            const memberIdToUse = member.newMemberId || member.memberId;
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `# 步骤3：配置成员 ${memberIdToUse} 的堆叠端口\n`;
                    port.portGroup.forEach((iface, index) => {
                        const stackPortId = index + 1;
                        cli += `interface stack-port ${memberIdToUse}/${stackPortId}\n`;
                        cli += ` port interface ${iface} enable\n`;
                        cli += ` quit\n`;
                    });
                    cli += '\n';
                }
            }
        });

        cli += 'quit\n\n';

        // 步骤4：保存配置
        cli += '# 步骤4：保存基础配置\n';
        cli += 'save\n';
        cli += 'y\n\n';

        // 如果需要重编号
        if (hasRenumber) {
            cli += '# ===== 阶段二：成员重编号（需要重启）=====\n\n';

            config.members.forEach(member => {
                if (member.memberId && member.newMemberId && member.memberId !== member.newMemberId) {
                    cli += `# 重新编号成员 ${member.memberId} → ${member.newMemberId}\n`;
                    cli += 'system-view\n';
                    cli += `stack slot ${member.memberId}\n`;
                    cli += ` renumber ${member.newMemberId}\n`;
                    cli += ` quit\n`;
                    cli += 'quit\n\n';
                    cli += '# 保存配置\n';
                    cli += 'save\n';
                    cli += 'y\n\n';
                    cli += '# ！！！重要：设备将自动重启以应用新的成员ID\n';
                    cli += '# 等待设备重启完成后，继续配置优先级\n\n';
                }
            });

            cli += '# ===== 阶段三：重启后配置优先级 =====\n\n';
            cli += 'system-view\n\n';

            config.members.forEach(member => {
                const memberIdToUse = member.newMemberId || member.memberId;
                if (member.priority) {
                    cli += `# 配置成员 ${memberIdToUse} 的优先级\n`;
                    cli += `stack slot ${memberIdToUse}\n`;
                    cli += ` priority ${member.priority}\n`;
                    cli += ` quit\n\n`;
                }
            });

            cli += 'quit\n\n';
            cli += '# 保存配置\n';
            cli += 'save\n';
            cli += 'y\n\n';
        }

        cli += '# ===== 阶段四：物理连接堆叠线缆 =====\n';
        cli += '# 1. 确保所有配置已保存\n';
        cli += '# 2. 使用专用堆叠线缆连接交换机的堆叠端口\n';
        cli += '# 3. 连接完成后，堆叠会自动激活\n';
        cli += '# 4. 使用验证命令检查堆叠状态\n\n';

        cli += '# ===== 验证命令 =====\n';
        cli += '# display stack\n';
        cli += '# display stack topology\n';
        cli += '# display stack configuration\n';
    }

    return { cli: cli.trim(), explanation: "华为设备堆叠 (CSS/iStack) 配置生成完成。配置遵循：先配置 → 后重编 → 再保存 → 最后重启的原则。" };
};

// 思科设备堆叠配置生成函数
const generateCiscoStackingCli = (config: StackingConfig): { cli: string; explanation: string } => {
    let cli = '';

    if (config.modelType === 'new') {
        // StackWise Virtual 配置
        cli += '! ========================================\n';
        cli += '! Cisco StackWise Virtual 配置\n';
        cli += '! 适用于 Catalyst 9000 系列等支持 StackWise Virtual 的设备\n';
        cli += '! StackWise Virtual 仅支持两台交换机组成虚拟堆叠\n';
        cli += '! 配置原则：先配置 → 后重编 → 再保存 → 最后重启\n';
        cli += '! ========================================\n\n';

        const hasRenumber = config.members.some(m => m.memberId && m.newMemberId && m.memberId !== m.newMemberId);

        config.members.slice(0, 2).forEach((member) => {
            const currentSwitchId = member.memberId; // 当前交换机ID（重编号前）

            cli += `! ===== 阶段一：交换机 ${currentSwitchId} 基础配置 =====\n\n`;
            cli += 'configure terminal\n\n';

            // 步骤1：配置域ID
            if (config.domainId) {
                cli += '! 步骤1：配置 StackWise Virtual 域ID\n';
                cli += `stackwise-virtual domain ${config.domainId}\n\n`;
            }

            // 步骤2：配置当前switch ID的Virtual Link（使用当前ID，不是目标ID）
            if (member.irfPorts.length > 0) {
                const port = member.irfPorts[0];
                if (port.portGroup.length > 0) {
                    cli += `! 步骤2：在当前交换机 ${currentSwitchId} 上配置 Virtual Link\n`;
                    cli += `! 注意：此时设备的switch ID还是 ${currentSwitchId}，所以配置会关联到当前ID\n`;
                    port.portGroup.forEach((iface, index) => {
                        const linkId = index + 1;
                        cli += `interface ${iface}\n`;
                        cli += ` stackwise-virtual link ${linkId}\n`;
                        cli += ` no shutdown\n`;
                        cli += `exit\n`;
                    });
                    cli += '\n';
                }
            }

            // 步骤3：配置优先级（如果不需要重编号，在重编号前配置优先级没有意义）
            if (member.priority && !hasRenumber) {
                cli += `! 步骤3：配置交换机 ${currentSwitchId} 的优先级\n`;
                cli += `switch ${currentSwitchId} priority ${member.priority}\n\n`;
            }

            cli += 'end\n\n';

            // 步骤4：保存配置
            cli += '! 步骤4：保存基础配置\n';
            cli += 'copy running-config startup-config\n';
            cli += '! 提示时按Enter确认\n\n';
        });

        if (config.members.length > 2) {
            cli += '! 注意：StackWise Virtual 仅支持2台设备，其他成员将被忽略\n\n';
        }

        // 步骤5：配置双活检测（可选但推荐）
        cli += '! 步骤5：配置双活检测（强烈推荐）\n';
        cli += '! 双活检测用于防止堆叠分裂时的双主问题\n';
        cli += '! 示例：使用 PAgP 方式进行检测\n';
        cli += '! configure terminal\n';
        cli += '! stackwise-virtual\n';
        cli += '!  dual-active detection pagp\n';
        cli += '!  dual-active detection pagp trust channel-group <port-channel-id>\n';
        cli += '! exit\n';
        cli += '! 或在接口下配置：\n';
        cli += '! interface <interface-id>\n';
        cli += '!  stackwise-virtual dual-active-detection\n';
        cli += '! exit\n';
        cli += '! end\n\n';

        // 如果需要重编号
        if (hasRenumber) {
            cli += '! ===== 阶段二：成员重编号（需要重启）=====\n\n';

            config.members.slice(0, 2).forEach(member => {
                if (member.memberId && member.newMemberId && member.memberId !== member.newMemberId) {
                    cli += `! --- 重编号交换机 ${member.memberId} → ${member.newMemberId} ---\n`;
                    cli += 'configure terminal\n';
                    cli += `switch ${member.memberId} renumber ${member.newMemberId}\n`;
                    cli += 'end\n\n';
                    cli += '! 保存配置\n';
                    cli += 'copy running-config startup-config\n';
                    cli += '! 提示时按Enter确认\n\n';
                    cli += `! ！！！重要：交换机 ${member.memberId} 将自动重启以应用新的成员ID\n`;
                    cli += '! 等待设备重启完成后，Virtual Link配置会自动迁移到新的switch ID\n';
                    cli += '! 然后继续配置优先级\n\n';
                }
            });

            cli += '! ===== 阶段三：重启后配置优先级和验证 =====\n';
            cli += '! 在所有交换机重启完成后执行\n\n';

            config.members.slice(0, 2).forEach(member => {
                const memberIdToUse = member.newMemberId || member.memberId;
                if (member.priority || member.newMemberId) {
                    cli += `! --- 在重启后的交换机 ${memberIdToUse} 上配置 ---\n`;
                    cli += 'configure terminal\n\n';

                    // 配置优先级
                    if (member.priority) {
                        cli += `! 配置交换机 ${memberIdToUse} 的优先级\n`;
                        cli += `switch ${memberIdToUse} priority ${member.priority}\n\n`;
                    }

                    cli += 'end\n\n';
                    cli += '! 保存配置\n';
                    cli += 'copy running-config startup-config\n';
                    cli += '! 提示时按Enter确认\n\n';

                    // 验证Virtual Link配置（重编号后会自动迁移）
                    if (member.newMemberId) {
                        cli += `! 验证Virtual Link配置已自动迁移到交换机 ${memberIdToUse}\n`;
                        cli += `! show stackwise-virtual link\n`;
                        cli += `! show interface status | include SVL\n\n`;
                    }
                }
            });
        }

        cli += '! ===== 阶段四：重启设备使 StackWise Virtual 生效 =====\n';
        cli += '! 1. 确保所有配置已保存\n';
        cli += '! 2. 在两台交换机上都执行 reload 命令\n';
        cli += '! 3. 重启后设备将自动形成 StackWise Virtual 堆叠\n';
        cli += '! reload\n';
        cli += '! 提示时输入 yes 确认重启\n\n';

        cli += '! ===== 验证命令 =====\n';
        cli += '! show switch virtual\n';
        cli += '! show switch virtual config\n';
        cli += '! show stackwise-virtual link\n';
        cli += '! show stackwise-virtual dual-active-detection\n';

    } else {
        // 传统 StackWise 配置
        cli += '! ========================================\n';
        cli += '! Cisco StackWise 配置\n';
        cli += '! 适用于 Catalyst 3750/3850/9300 系列等传统堆叠设备\n';
        cli += '! StackWise 使用专用堆叠线缆，不需要配置物理接口\n';
        cli += '! 配置原则：先配置 → 后重编 → 再保存 → 最后重启\n';
        cli += '! ========================================\n\n';

        const hasRenumber = config.members.some(m => m.memberId && m.newMemberId && m.memberId !== m.newMemberId);

        config.members.forEach(member => {
            const currentSwitchId = member.memberId; // 当前交换机ID（重编号前）

            cli += `! ===== 阶段一：交换机 ${currentSwitchId} 基础配置 =====\n\n`;
            cli += 'configure terminal\n\n';

            // 步骤1：型号预配置
            cli += `! 步骤1：预配置当前交换机 ${currentSwitchId} 的型号（可选但推荐）\n`;
            cli += `! switch ${currentSwitchId} provision <model-type>\n`;
            cli += `! 例如: switch ${currentSwitchId} provision ws-c3850-24p\n\n`;

            // 步骤2：配置优先级（如果不需要重编号）
            if (member.priority && !hasRenumber) {
                cli += `! 步骤2：配置交换机 ${currentSwitchId} 的优先级\n`;
                cli += `switch ${currentSwitchId} priority ${member.priority}\n\n`;
            }

            cli += 'end\n\n';

            // 步骤3：保存配置
            cli += '! 步骤3：保存基础配置\n';
            cli += 'copy running-config startup-config\n';
            cli += '! 提示时按Enter确认\n\n';
        });

        // 如果需要重编号
        if (hasRenumber) {
            cli += '! ===== 阶段二：成员重编号（需要重启）=====\n\n';

            config.members.forEach(member => {
                if (member.memberId && member.newMemberId && member.memberId !== member.newMemberId) {
                    cli += `! --- 重编号交换机 ${member.memberId} → ${member.newMemberId} ---\n`;
                    cli += 'configure terminal\n';
                    cli += `switch ${member.memberId} renumber ${member.newMemberId}\n`;
                    cli += 'end\n\n';
                    cli += '! 保存配置\n';
                    cli += 'copy running-config startup-config\n';
                    cli += '! 提示时按Enter确认\n\n';
                    cli += `! ！！！重要：交换机 ${member.memberId} 将自动重启以应用新的成员ID\n`;
                    cli += '! 等待设备重启完成后，继续配置优先级\n\n';
                }
            });

            cli += '! ===== 阶段三：重启后配置型号和优先级 =====\n\n';
            cli += '! 等待所有交换机重启完成后执行\n\n';

            // 型号预配置和优先级配置
            config.members.forEach(member => {
                const memberIdToUse = member.newMemberId || member.memberId;

                cli += `! --- 在重启后的交换机 ${memberIdToUse} 上配置 ---\n`;
                cli += 'configure terminal\n\n';

                // 型号预配置
                cli += `! 配置交换机 ${memberIdToUse} 的型号（可选但推荐）\n`;
                cli += `! switch ${memberIdToUse} provision <model-type>\n`;
                cli += `! 例如: switch ${memberIdToUse} provision ws-c3850-24p\n\n`;

                // 配置优先级
                if (member.priority) {
                    cli += `! 配置交换机 ${memberIdToUse} 的优先级\n`;
                    cli += `switch ${memberIdToUse} priority ${member.priority}\n\n`;
                }

                cli += 'end\n\n';
                cli += '! 保存配置\n';
                cli += 'copy running-config startup-config\n';
                cli += '! 提示时按Enter确认\n\n';
            });
        }

        cli += '! ===== 阶段四：物理连接堆叠线缆 =====\n';
        cli += '! 1. 确保所有配置已保存\n';
        cli += '! 2. 使用专用StackWise线缆连接交换机\n';
        cli += '! 3. 连接完成后，堆叠会自动形成\n';
        cli += '! 4. 主交换机选举基于：优先级 > MAC地址\n';
        cli += '! 5. 使用验证命令检查堆叠状态\n\n';

        cli += '! ===== 验证命令 =====\n';
        cli += '! show switch\n';
        cli += '! show switch detail\n';
        cli += '! show switch stack-ports\n';
        cli += '! show switch neighbors\n';
    }

    return { cli: cli.trim(), explanation: "Cisco 堆叠配置生成完成。配置遵循：先配置 → 后重编 → 再保存 → 最后重启的原则。" };
};