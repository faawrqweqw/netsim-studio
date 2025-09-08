import { Node, NATPortMappingRule, NATMappingType, Vendor, NodeConfig, HuaweiNATServer, DeviceType } from '../../types';

const generateHuaweiNatCli = (nodeConfig: Node['config'], deviceType: string): string => {
    const natConfig = nodeConfig.nat.huawei;
    if (!natConfig) return '';

    let cli = '';

    if (natConfig.addressPools.length > 0) {
        cli += `! Source NAT Address Pools\n`;
        natConfig.addressPools.forEach(pool => {
            if (!pool.groupName) return;
            cli += `nat address-group ${pool.groupName}`;
            if (pool.groupNumber) cli += ` ${pool.groupNumber}`;
            cli += `\n`;
            pool.sections.forEach(section => {
                if (section.startAddress) {
                    cli += ` section`;
                    if (section.sectionId) {
                        cli += ` ${section.sectionId}`;
                    }
                    cli += ` ${section.startAddress}`;
                    if (section.endAddress) cli += ` ${section.endAddress}`;
                    cli += `\n`;
                }
            });
            if (pool.mode === 'pat') {
                cli += ` mode pat\n`;
            } else if (pool.mode === 'no-pat-global') {
                cli += ` mode no-pat global\n`;
            } else if (pool.mode === 'no-pat-local') {
                cli += ` mode no-pat local\n`;
            }

            if (pool.routeEnable) cli += ` route enable\n`;
            cli += 'quit\n\n';
        });
    }
    
    if (natConfig.rules.length > 0) {
        cli += `! Source NAT Policy\n`;
        cli += 'nat-policy\n';
        natConfig.rules.forEach(rule => {
            if (!rule.ruleName) return;
            cli += ` rule name ${rule.ruleName}\n`;
            
            if (rule.sourceAddress && rule.sourceMask) {
                 cli += `  source-address ${rule.sourceAddress} ${rule.sourceMask}\n`;
            }
            // Only add destination if it's not easy-ip
            if (!(rule.action === 'source-nat' && rule.easyIp)) {
                if (rule.destinationAddress && rule.destinationMask) {
                    cli += `  destination-address ${rule.destinationAddress} ${rule.destinationMask}\n`;
                }
            }
            
            cli += `  action ${rule.action}`;
            if (rule.action === 'source-nat') {
                if (rule.easyIp) {
                     cli += ' easy-ip';
                } else if (rule.natAddressGroup) {
                    cli += ` address-group ${rule.natAddressGroup}`;
                }
            }
            cli += '\n';
        });
        cli += 'quit\n\n';
    }

    if (natConfig.servers.length > 0) {
        cli += `! Destination NAT (NAT Server)\n`;
        natConfig.servers.forEach(server => {
            if (!server.name) return;
            let serverCli = `nat server name ${server.name}`;

            if (server.zone && deviceType === DeviceType.Firewall) serverCli += ` zone ${server.zone}`;
            if (server.protocol && server.protocol !== 'any') serverCli += ` protocol ${server.protocol}`;
            
            serverCli += ' global';
            if (server.globalAddressType === 'interface') {
                if (server.globalInterface) serverCli += ` interface ${server.globalInterface}`;
            } else {
                if (server.globalAddress) serverCli += ` ${server.globalAddress}`;
                if (server.globalAddressEnd) serverCli += ` ${server.globalAddressEnd}`;
            }
            
            const needsPort = server.protocol === 'tcp' || server.protocol === 'udp' || server.protocol === 'sctp';
            if (needsPort) {
                if (server.globalPort) serverCli += ` ${server.globalPort}`;
                if (server.globalPortEnd) serverCli += ` ${server.globalPortEnd}`;
            }
            
            serverCli += ' inside';
            if (server.insideHostAddress) serverCli += ` ${server.insideHostAddress}`;
            if (server.insideHostAddressEnd) serverCli += ` ${server.insideHostAddressEnd}`;
            
            if (needsPort) {
                if (server.insideHostPort) serverCli += ` ${server.insideHostPort}`;
                if (server.insideHostPortEnd) serverCli += ` ${server.insideHostPortEnd}`;
            }

            if (server.noReverse) serverCli += ' no-reverse';
            if (server.route) serverCli += ' route';
            if (server.disabled) serverCli += ' nat-disable';
            if (server.description) serverCli += ` description ${server.description}`;

            cli += `${serverCli}\n`;
        });
        cli += '\n';
    }

    return cli.trim();
};


export const generateNatCli = (vendor: string, deviceType: string, nodeConfig: Node['config']): { cli: string; explanation: string } => {
    const config = nodeConfig.nat;
    const acls = nodeConfig.acl.acls;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    if (!config.enabled) {
        return { cli: '', explanation: 'NAT feature is disabled.' };
    }

    if (vendorLower === 'huawei') {
        const huaweiCli = generateHuaweiNatCli(nodeConfig, deviceType);
        return { cli: huaweiCli, explanation: "Huawei NAT configuration generated." };
    }
    
    const globalCliParts: string[] = [];
    if (config.addressPool.enabled && config.addressPool.pools.length > 0) {
        if (vendorLower === 'h3c') {
            const addressPoolCli = config.addressPool.pools
                .filter(pool => pool.groupId && pool.startAddress && pool.endAddress)
                .map(pool => {
                    let poolCli = `nat address-group ${pool.groupId}`;
                    if (pool.name) {
                        poolCli += ` name ${pool.name}`;
                    }
                    poolCli += `\n address ${pool.startAddress} ${pool.endAddress}\nquit`;
                    return poolCli;
                })
                .join('\n\n');
            if (addressPoolCli) {
                globalCliParts.push(`! NAT Address Pools\n${addressPoolCli}`);
            }
        }
    }
    
    if (vendorLower === 'h3c' && config.serverGroups.length > 0) {
        const serverGroupCli = config.serverGroups.map(sg => {
            let sgCli = `nat server-group ${sg.groupId}\n`;
            sg.members.forEach(m => {
                sgCli += ` inside ip ${m.ip} port ${m.port} weight ${m.weight}\n`;
            });
            sgCli += 'quit';
            return sgCli;
        }).join('\n\n');
        if(serverGroupCli) globalCliParts.push(`! NAT Server Groups\n${serverGroupCli}`);
    }
    
    if (config.staticOutbound.enabled && config.staticOutbound.rules.length > 0) {
        let staticCli = '';
        if (vendorLower === 'h3c') {
            staticCli = config.staticOutbound.rules.map(rule => {
                let ruleCli = '';
                if (rule.type === 'one-to-one' && rule.localIp && rule.globalIp) {
                    ruleCli = `nat static outbound ${rule.localIp} ${rule.globalIp}`;
                } else if (rule.type === 'net-to-net' && rule.localStartIp && rule.localEndIp && rule.globalNetwork && rule.globalMask) {
                    ruleCli = `nat static outbound net-to-net ${rule.localStartIp} ${rule.localEndIp} global ${rule.globalNetwork} ${rule.globalMask}`;
                } else if (rule.type === 'address-group' && rule.localAddressGroup && rule.globalAddressGroup) {
                    ruleCli = `nat static outbound address-group ${rule.localAddressGroup} global-group ${rule.globalAddressGroup}`;
                }

                if (ruleCli) {
                    const acl = acls.find(a => a.id === rule.aclId);
                    if (acl) ruleCli += ` acl ${acl.number}`;
                    if (rule.reversible) ruleCli += ' reversible';
                }
                return ruleCli;
            }).filter(Boolean).join('\n');
        } else {
             staticCli = `# Static NAT for ${vendor} is not yet supported.`;
        }
        if (staticCli) {
            globalCliParts.push(staticCli);
            if (staticCli.includes('nat static outbound')) {
                globalCliParts.push(`\n# NOTE: Apply "nat static enable" on the relevant outbound interface for these rules to take effect.`);
            }
        }
    }
    
    const globalCli = globalCliParts.join('\n\n');

    let portMappingCli = '';
    if (config.portMapping.enabled && config.portMapping.rules.length > 0) {
        if (vendorLower === 'h3c') {
            const rulesByInterface: Record<string, NATPortMappingRule[]> = {};
            config.portMapping.rules.forEach(rule => {
                if (!rule.interfaceName) return;
                if (!rulesByInterface[rule.interfaceName]) {
                    rulesByInterface[rule.interfaceName] = [];
                }
                rulesByInterface[rule.interfaceName].push(rule);
            });

            for (const interfaceName in rulesByInterface) {
                if (rulesByInterface[interfaceName].length > 0) {
                    portMappingCli += `interface ${interfaceName}\n`;
                    rulesByInterface[interfaceName].forEach(rule => {
                        let ruleCli = ' nat server';
                        if (rule.protocol && rule.protocol !== 'all') ruleCli += ` protocol ${rule.protocol}`;

                        let globalPart = ' global';
                        if (rule.mappingType === NATMappingType.ACL_BASED) {
                            const acl = acls.find(a => a.id === rule.aclId);
                            if (acl) globalPart += ` ${acl.number}`;
                        } else {
                            globalPart += ` ${rule.globalAddressType === 'interface' ? 'current-interface' : rule.globalAddress}`;
                            if (rule.globalEndAddress) globalPart += ` ${rule.globalEndAddress}`;
                            if (rule.globalPort) globalPart += ` ${rule.globalPort}`;
                            if (rule.globalStartPort && rule.globalEndPort) globalPart += ` ${rule.globalStartPort} ${rule.globalEndPort}`;
                        }
                        ruleCli += globalPart;
                        
                        let insidePart = ' inside';
                        if (rule.mappingType === NATMappingType.LOAD_BALANCING) {
                            if (rule.serverGroupId) insidePart += ` server-group ${rule.serverGroupId}`;
                        } else {
                            if (rule.localAddress) insidePart += ` ${rule.localAddress}`;
                            if (rule.localEndAddress) insidePart += ` ${rule.localEndAddress}`;
                            if (rule.localPort) insidePart += ` ${rule.localPort}`;
                            if (rule.localStartPort && rule.localEndPort) insidePart += ` ${rule.localStartPort} ${rule.localEndPort}`;
                        }
                        ruleCli += insidePart;
                        
                        if (rule.aclId && rule.mappingType !== NATMappingType.ACL_BASED) {
                            const acl = acls.find(a => a.id === rule.aclId);
                            if (acl) ruleCli += ` acl ${acl.number}`;
                        }
                        if (rule.reversible) ruleCli += ` reversible`;
                        if (rule.policyName) ruleCli += ` rule ${rule.policyName}`;
                        
                        portMappingCli += `${ruleCli.trim()}\n`;
                    });
                    portMappingCli += 'quit\n';
                }
            }
        }
    }

    cli = [globalCli, portMappingCli.trim()].filter(Boolean).join('\n\n');
    
    return { cli: cli.trim(), explanation: "NAT configuration generated locally." };
};