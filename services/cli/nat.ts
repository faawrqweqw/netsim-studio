

import { Node, NATPortMappingRule, NATMappingType, Vendor, NodeConfig, HuaweiNATServer, DeviceType, H3CGlobalNatRule, NATStaticOutboundRule } from '../../types';

const generateHuaweiNatCli = (nodeConfig: Node['config'], deviceType: string): { cli: string, explanation: string } => {
    const natConfig = nodeConfig.nat.huawei;
    if (!natConfig) return { cli: '', explanation: '' };

    let cli = '';
    let explanation = '';

    if (natConfig.addressPools.length > 0) {
        cli += `! Source NAT Address Pools\n`;
        explanation += `--- Source NAT Address Pools ---\n`;
        natConfig.addressPools.forEach(pool => {
            if (!pool.groupName) return;
            let poolCmd = `nat address-group ${pool.groupName}`;
            if (pool.groupNumber) poolCmd += ` ${pool.groupNumber}`;
            cli += `${poolCmd}\n`;
            explanation += `\`${poolCmd}\`: Creates a NAT address pool named '${pool.groupName}'.\n`;

            pool.sections.forEach(section => {
                if (section.startAddress) {
                    let sectionCmd = ` section`;
                    if (section.sectionId) sectionCmd += ` ${section.sectionId}`;
                    sectionCmd += ` ${section.startAddress}`;
                    if (section.endAddress) sectionCmd += ` ${section.endAddress}`;
                    cli += `${sectionCmd}\n`;
                    explanation += `\`${sectionCmd.trim()}\`: Defines an address range from ${section.startAddress} to ${section.endAddress || section.startAddress} within the pool.\n`;
                }
            });
            if (pool.mode) {
                cli += ` mode ${pool.mode}\n`;
                explanation += `\`mode ${pool.mode}\`: Sets the address pool mode to ${pool.mode}.\n`;
            }

            if (pool.routeEnable) {
                cli += ` route enable\n`;
                explanation += '`route enable`: Enables the advertising of a blackhole route for the address pool to prevent routing loops.\n';
            }
            cli += 'quit\n\n';
        });
    }
    
    if (natConfig.rules.length > 0) {
        cli += `! Source NAT Policy\n`;
        cli += 'nat-policy\n';
        explanation += `--- Source NAT Policy ---\n\`nat-policy\`: Enters the NAT policy view to configure rules.\n`;
        natConfig.rules.forEach(rule => {
            if (!rule.ruleName) return;
            cli += ` rule name ${rule.ruleName}\n`;
            explanation += `\`rule name ${rule.ruleName}\`: Creates a NAT policy rule named '${rule.ruleName}'.\n`;
            
            if (rule.sourceAddress && rule.sourceMask) {
                 cli += `  source-address ${rule.sourceAddress} ${rule.sourceMask}\n`;
                 explanation += ` \`source-address ...\`: Matches traffic from source network ${rule.sourceAddress}/${rule.sourceMask}.\n`;
            }

            if (rule.destinationAddress && rule.destinationMask) {
                cli += `  destination-address ${rule.destinationAddress} ${rule.destinationMask}\n`;
                explanation += ` \`destination-address ...\`: Matches traffic to destination network ${rule.destinationAddress}/${rule.destinationMask}.\n`;
            }
            
            let actionCmd = `  action ${rule.action}`;
            if (rule.action === 'source-nat') {
                if (rule.easyIp) {
                     actionCmd += ' easy-ip';
                     explanation += ` \`${actionCmd.trim()}\`: Applies Source NAT using the egress interface's IP address (Easy IP).\n`;
                } else if (rule.natAddressGroup) {
                    actionCmd += ` address-group ${rule.natAddressGroup}`;
                    explanation += ` \`${actionCmd.trim()}\`: Applies Source NAT using the address pool '${rule.natAddressGroup}'.\n`;
                }
            } else if (rule.action === 'no-nat') {
                explanation += ` \`${actionCmd.trim()}\`: Specifies that matching traffic should not undergo NAT.\n`;
            }
            cli += `${actionCmd}\n`;
        });
        cli += 'quit\n\n';
    }

    if (natConfig.servers.length > 0) {
        cli += `! Destination NAT (NAT Server)\n`;
        explanation += `--- Destination NAT (NAT Server) ---\n`;
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
            if (server.description) serverCli += ` description "${server.description}"`;

            cli += `${serverCli}\n`;
            explanation += `\`${serverCli}\`: Configures a destination NAT mapping for an internal server named '${server.name}'.\n`;
        });
        cli += '\n';
    }

    return { cli: cli.trim(), explanation: explanation.trim() };
};

const generateH3cGlobalPolicyCli = (nodeConfig: Node['config'], deviceType: DeviceType): string => {
    const { nat } = nodeConfig;
    const { globalPolicy } = nat;
    const isRouter = deviceType === DeviceType.Router;

    if (!globalPolicy || !globalPolicy.enabled || globalPolicy.rules.length === 0) {
        return '';
    }

    let cli = 'nat global-policy\n';
    
    globalPolicy.rules.forEach(rule => {
        if (!rule.name) return;
        cli += ` rule name ${rule.name}\n`;
        if (rule.description) cli += `  description "${rule.description}"\n`;

        // Matching conditions
        if (!isRouter && rule.sourceZone) cli += `  source-zone ${rule.sourceZone}\n`;
        if (!isRouter && rule.destinationZone) cli += `  destination-zone ${rule.destinationZone}\n`;

        if (rule.sourceIpType !== 'any' && rule.sourceIpValue) {
            if (rule.sourceIpType === 'object-group') cli += `  source-ip object-group-name ${rule.sourceIpValue}\n`;
            else if (rule.sourceIpType === 'host') cli += `  source-ip host ${rule.sourceIpValue}\n`;
            else if (rule.sourceIpType === 'subnet') cli += `  source-ip subnet ${rule.sourceIpValue}\n`;
        }

        if (rule.destinationIpType !== 'any' && rule.destinationIpValue) {
            if (rule.destinationIpType === 'object-group') cli += `  destination-ip object-group-name ${rule.destinationIpValue}\n`;
            else if (rule.destinationIpType === 'host') cli += `  destination-ip host ${rule.destinationIpValue}\n`;
            else if (rule.destinationIpType === 'subnet') cli += `  destination-ip subnet ${rule.destinationIpValue}\n`;
        }

        if (rule.serviceType === 'object-group' && rule.serviceValue) {
            cli += `  service object-group-name ${rule.serviceValue}\n`;
        }
        
        // SNAT Action
        if (rule.snatAction !== 'none') {
            let snatCli = `  action snat`;
            if (rule.snatAction === 'easy-ip') {
                snatCli += ` easy-ip`;
                if (rule.snatPortPreserved) snatCli += ' port-preserved';
            }
            else if (rule.snatAction === 'static' && rule.snatStaticGlobalValue) {
                snatCli += ` static ${rule.snatStaticGlobalValue}`;
            }
            else if (rule.snatAddressGroup && (rule.snatAction === 'pat' || rule.snatAction === 'no-pat')) {
                snatCli += ` address-group ${rule.snatAddressGroup}`;
                if (rule.snatAction === 'no-pat') {
                    snatCli += ' no-pat';
                    if (rule.snatReversible) snatCli += ' reversible';
                }
                if (rule.snatAction === 'pat' && rule.snatPortPreserved) {
                    snatCli += ' port-preserved';
                }
            } else if (rule.snatAction === 'no-nat') {
                snatCli += ` no-nat`;
            }
            if (snatCli !== '  action snat') cli += `${snatCli}\n`;
        }

        // DNAT Action
        if (rule.dnatAction !== 'none') {
             if (rule.dnatAction === 'static' && rule.dnatLocalAddress) {
                let dnatCli = `  action dnat ip-address ${rule.dnatLocalAddress}`;
                if (rule.dnatLocalPort) dnatCli += ` port ${rule.dnatLocalPort}`;
                cli += `${dnatCli}\n`;
            } else if (rule.dnatAction === 'no-nat') {
                cli += `  action dnat no-nat\n`;
            }
        }

        if (rule.countingEnabled) cli += '  counting enable\n';
        if (!rule.enabled) cli += '  disable\n';
    });
    
    cli += 'quit\n';
    return cli;
};

const generateH3cStaticNatCli = (rules: NATStaticOutboundRule[], acls: Node['config']['acl']['acls']): string => {
    if (!rules || rules.length === 0) return '';
    let cli = '';

    rules.forEach(rule => {
        let ruleCli = `nat static ${rule.direction}`;
        let isValid = false;

        switch(rule.type) {
            case 'one-to-one':
                if(rule.localIp && rule.globalIp) {
                    ruleCli += rule.direction === 'outbound' ? ` ${rule.localIp} ${rule.globalIp}` : ` ${rule.globalIp} ${rule.localIp}`;
                    isValid = true;
                }
                break;
            case 'net-to-net':
                if (rule.direction === 'outbound' && rule.localStartIp && rule.localEndIp && rule.globalNetwork && rule.globalMask) {
                    ruleCli += ` net-to-net ${rule.localStartIp} ${rule.localEndIp} global ${rule.globalNetwork} ${rule.globalMask}`;
                    isValid = true;
                } else if (rule.direction === 'inbound' && rule.globalStartIp && rule.globalEndIp && rule.localNetwork && rule.localMask) {
                    ruleCli += ` net-to-net ${rule.globalStartIp} ${rule.globalEndIp} local ${rule.localNetwork} ${rule.localMask}`;
                    isValid = true;
                }
                break;
            case 'address-group':
                if (rule.localAddressGroup && rule.globalAddressGroup) {
                    if (rule.direction === 'outbound') {
                        ruleCli += ` object-group ${rule.localAddressGroup} object-group ${rule.globalAddressGroup}`;
                    } else { // inbound
                        ruleCli += ` object-group ${rule.globalAddressGroup} object-group ${rule.localAddressGroup}`;
                    }
                    isValid = true;
                }
                break;
        }

        if (isValid) {
            const acl = acls.find(a => a.id === rule.aclId);
            if (acl) ruleCli += ` acl ${acl.number}`;
            if (rule.reversible) ruleCli += ' reversible';
            cli += `${ruleCli}\n`;
        }
    });

    if (cli) {
        cli += `\n# NOTE: Apply "nat static enable" on the relevant interface(s) for these rules to take effect.`;
    }

    return cli;
};


export const generateNatCli = (vendor: string, deviceType: DeviceType, nodeConfig: Node['config']): { cli: string; explanation: string } => {
    const config = nodeConfig.nat;
    const acls = nodeConfig.acl.acls;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    if (!config.enabled) {
        return { cli: '', explanation: 'NAT feature is disabled.' };
    }

    if (vendorLower === 'huawei') {
        const { cli: huaweiCli, explanation: huaweiExplanation } = generateHuaweiNatCli(nodeConfig, deviceType);
        return { cli: huaweiCli, explanation: huaweiExplanation };
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
        if (vendorLower === 'h3c') {
            const staticCli = generateH3cStaticNatCli(config.staticOutbound.rules, acls);
            if (staticCli) {
                globalCliParts.push(`! Static NAT\n${staticCli}`);
            }
        } else {
            const staticCli = `# Static NAT for ${vendor} is not supported.`;
            globalCliParts.push(staticCli);
        }
    }

    if (vendorLower === 'h3c') {
        const globalPolicyCli = generateH3cGlobalPolicyCli(nodeConfig, deviceType as DeviceType);
        if (globalPolicyCli) {
            globalCliParts.push(`! Global NAT Policy\n${globalPolicyCli}`);
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
