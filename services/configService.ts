import { Node, DeviceType, Vendor, WirelessConfig, Connection, LinkConfig, ACLsConfig, ACL, ACLBasicRule, ACLAdvancedRule, TimeRange, TimeRangeDaySelection } from '../types';
import { generateInterfaceCli } from '../components/config/utils';

// #region --- Local CLI Generation Engine ---

const generateDhcpCli = (vendor: string, deviceType: string, config: any): { cli: string; explanation: string } => {
    const { pools = [] } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    const ipToHex = (ip: string): string => {
        if (!ip) return '';
        try {
            return ip.split('.')
                .map(octet => {
                    const num = parseInt(octet, 10);
                    if (isNaN(num) || num < 0 || num > 255) {
                        throw new Error('Invalid IP octet');
                    }
                    return num.toString(16).padStart(2, '0');
                })
                .join('');
        } catch (e) {
            return ''; // Return empty string for invalid IP
        }
    };

    if (vendorLower === 'cisco') {
        cli += 'service dhcp\n';
        pools.forEach((pool: any) => {
            if (pool.excludeStart && pool.excludeEnd) {
                cli += `ip dhcp excluded-address ${pool.excludeStart} ${pool.excludeEnd}\n`;
            }
        });
        pools.forEach((pool: any) => {
            cli += `ip dhcp pool ${pool.poolName}\n`;
            cli += ` network ${pool.network} ${pool.subnetMask}\n`;
            cli += ` default-router ${pool.gateway}\n`;
            cli += ` dns-server ${pool.dnsServer}\n`;
            if (pool.option43) {
                const hexIp = ipToHex(pool.option43);
                if (hexIp) {
                    cli += ` option 43 hex f104${hexIp}\n`;
                }
            }
            const lease = `${pool.leaseDays || 0} ${pool.leaseHours || 0} ${pool.leaseMinutes || 0} ${pool.leaseSeconds || 0}`;
            if (lease.trim() !== '0 0 0 0') cli += ` lease ${lease.trim()}\n`;
            cli += 'exit\n';

            (pool.staticBindings || []).forEach((binding: any) => {
                cli += `ip dhcp pool STATIC_${binding.macAddress.replace(/[:.]/g, '')}\n`;
                cli += ` host ${binding.ipAddress} ${pool.subnetMask}\n`;
                if (binding.type === '客户端ID' && binding.clientId) {
                     cli += ` client-identifier ${binding.clientId}\n`;
                } else {
                     cli += ` client-identifier 01${binding.macAddress.replace(/[:.]/g, '')}\n`;
                }
                cli += 'exit\n';
            });
        });
    } else if (vendorLower === 'huawei') {
        cli += 'dhcp enable\n';
        pools.forEach((pool: any) => {
            cli += `ip pool ${pool.poolName}\n`;
            cli += ` gateway-list ${pool.gateway}\n`;
            cli += ` network ${pool.network} mask ${pool.subnetMask}\n`;
            cli += ` dns-list ${pool.dnsServer}\n`;
            if (pool.option43) {
                cli += ` option 43 sub-option 3 ascii ${pool.option43}\n`;
            }
            if (pool.excludeStart && pool.excludeEnd) {
                cli += ` excluded-ip-address ${pool.excludeStart} ${pool.excludeEnd}\n`;
            }
            const lease = `day ${pool.leaseDays || 0} hour ${pool.leaseHours || 0} minute ${pool.leaseMinutes || 0} second ${pool.leaseSeconds || 0}`;
            if (lease.trim() !== 'day 0 hour 0 minute 0 second 0') cli += ` lease ${lease}\n`;
            (pool.staticBindings || []).forEach((binding: any) => {
                cli += ` static-bind ip-address ${binding.ipAddress} mac-address ${binding.macAddress}\n`;
            });
            cli += 'quit\n';
        });
    } else if (vendorLower === 'h3c') {
        cli += 'dhcp enable\n';
        pools.forEach((pool: any) => {
            cli += `dhcp server ip-pool ${pool.poolName}\n`;
            cli += ` network ${pool.network} mask ${pool.subnetMask}\n`;
            cli += ` gateway-list ${pool.gateway}\n`;
            cli += ` dns-list ${pool.dnsServer}\n`;
            if (pool.option43) {
                const hexIp = ipToHex(pool.option43);
                if (hexIp) {
                    cli += ` option 43 hex 8007000001${hexIp}\n`;
                }
            }
            if (pool.excludeStart && pool.excludeEnd) {
                cli += ` forbidden-ip ${pool.excludeStart} ${pool.excludeEnd}\n`;
            }
            const lease = `day ${pool.leaseDays || 0} hour ${pool.leaseHours || 0} minute ${pool.leaseMinutes || 0}`;
            if (lease.trim() !== 'day 0 hour 0 minute 0') cli += ` expired ${lease}\n`;
            (pool.staticBindings || []).forEach((binding: any) => {
                cli += ` static-bind ip-address ${binding.ipAddress} mac-address ${binding.macAddress}\n`;
            });
            cli += 'quit\n';
        });
    }

    return { cli: cli.trim(), explanation: "DHCP configuration generated locally." };
};

const generateInterfaceIpCli = (vendor: string, deviceType: string, config: any, acls: ACL[] = []): { cli: string; explanation: string } => {
    const { interfaces = [] } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    interfaces.forEach((intf: any) => {
        if (intf.interfaceName && intf.ipAddress && intf.subnetMask) {
            cli += `interface ${intf.interfaceName}\n`;
            if (intf.description) cli += ` description ${intf.description}\n`;
            
            if (vendorLower === 'cisco') {
                cli += ` ip address ${intf.ipAddress} ${intf.subnetMask}\n`;
                if (intf.enableDHCP && intf.dhcpMode === 'relay' && intf.dhcpServerIP) {
                    cli += ` ip helper-address ${intf.dhcpServerIP}\n`;
                }
                if (intf.packetFilterInboundAclId) {
                    const acl = acls.find(a => a.id === intf.packetFilterInboundAclId);
                    if (acl) cli += ` ip access-group ${acl.name || acl.number} in\n`;
                }
                if (intf.packetFilterOutboundAclId) {
                    const acl = acls.find(a => a.id === intf.packetFilterOutboundAclId);
                    if (acl) cli += ` ip access-group ${acl.name || acl.number} out\n`;
                }
                cli += ` no shutdown\nexit\n`;
            } else if (vendorLower === 'huawei') {
                cli += ` ip address ${intf.ipAddress} ${intf.subnetMask}\n`;
                if (intf.enableDHCP) {
                    if (intf.dhcpMode === 'relay' && intf.dhcpServerIP) {
                        cli += ` dhcp select relay\n`;
                        cli += ` dhcp relay server-ip ${intf.dhcpServerIP}\n`;
                    }
                }
                if (intf.packetFilterInboundAclId) {
                    const acl = acls.find(a => a.id === intf.packetFilterInboundAclId);
                    if (acl) cli += ` traffic-filter inbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                }
                if (intf.packetFilterOutboundAclId) {
                    const acl = acls.find(a => a.id === intf.packetFilterOutboundAclId);
                    if (acl) cli += ` traffic-filter outbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                }
                cli += `quit\n`;
            } else if (vendorLower === 'h3c') {
                cli += ` ip address ${intf.ipAddress} ${intf.subnetMask}\n`;
                if (intf.enableDHCP) {
                    if (intf.dhcpMode === 'relay' && intf.dhcpServerIP) {
                        cli += ` dhcp select relay\n`;
                        cli += ` dhcp relay server-select ${intf.dhcpServerIP}\n`;
                    }
                }
                if (intf.packetFilterInboundAclId) {
                    const acl = acls.find(a => a.id === intf.packetFilterInboundAclId);
                    if (acl) cli += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} inbound\n`;
                }
                if (intf.packetFilterOutboundAclId) {
                    const acl = acls.find(a => a.id === intf.packetFilterOutboundAclId);
                    if (acl) cli += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} outbound\n`;
                }
                cli += `quit\n`;
            }
        }
    });

    return { cli: cli.trim(), explanation: "Physical interface IP configuration generated locally." };
};

const generateVlanCli = (vendor: string, deviceType: string, config: any, acls: ACL[] = []): { cli: string; explanation: string } => {
    const { vlanInterfaces = [] } = config;
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    const createVlansCli = (vlanIntfs: any[], command: string, nameField: string) => {
        let vlanCli = '';
        vlanIntfs.forEach(vlan => {
            if (vlan.vlanId) {
                vlanCli += `${command} ${vlan.vlanId}\n`;
                if (vlan.vlanDescription) vlanCli += ` ${nameField} ${vlan.vlanDescription}\n`;
                vlanCli += `quit\n`;
            }
        });
        return vlanCli;
    };

    if (vendorLower === 'cisco') {
        cli += createVlansCli(vlanInterfaces, 'vlan', 'name');
        vlanInterfaces.forEach((vlan: any) => {
            if (vlan.vlanId && vlan.ipAddress && vlan.subnetMask) {
                cli += `interface Vlan${vlan.vlanId}\n`;
                if (vlan.interfaceDescription) cli += ` description ${vlan.interfaceDescription}\n`;
                cli += ` ip address ${vlan.ipAddress} ${vlan.subnetMask}\n`;
                if (vlan.enableDHCP && vlan.dhcpMode === 'relay' && vlan.dhcpServerIP) {
                    cli += ` ip helper-address ${vlan.dhcpServerIP}\n`;
                }

                if (vlan.packetFilterInboundAclId) {
                    const acl = acls.find(a => a.id === vlan.packetFilterInboundAclId);
                    if (acl) cli += ` ip access-group ${acl.name || acl.number} in\n`;
                }
                if (vlan.packetFilterOutboundAclId) {
                    const acl = acls.find(a => a.id === vlan.packetFilterOutboundAclId);
                    if (acl) cli += ` ip access-group ${acl.name || acl.number} out\n`;
                }

                cli += ` no shutdown\nexit\n`;
            }
        });
    } else if (vendorLower === 'huawei') {
        cli += createVlansCli(vlanInterfaces, 'vlan', 'description');
        vlanInterfaces.forEach((vlan: any) => {
            if (vlan.vlanId && vlan.ipAddress && vlan.subnetMask) {
                cli += `interface Vlanif${vlan.vlanId}\n`;
                if (vlan.interfaceDescription) cli += ` description ${vlan.interfaceDescription}\n`;
                cli += ` ip address ${vlan.ipAddress} ${vlan.subnetMask}\n`;
                if (vlan.enableDHCP) {
                    if (vlan.dhcpMode === 'relay' && vlan.dhcpServerIP) {
                        cli += ` dhcp select relay\n`;
                        cli += ` dhcp relay server-ip ${vlan.dhcpServerIP}\n`;
                    } else if (vlan.dhcpMode === 'global' && vlan.selectedPool) {
                        cli += ` dhcp select global pool ${vlan.selectedPool}\n`;
                    } else if (vlan.dhcpMode === 'interface') {
                        cli += ` dhcp select interface\n`;
                    }
                }
                
                if (vlan.packetFilterInboundAclId) {
                    const acl = acls.find(a => a.id === vlan.packetFilterInboundAclId);
                    if (acl) cli += ` traffic-filter inbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                }
                if (vlan.packetFilterOutboundAclId) {
                    const acl = acls.find(a => a.id === vlan.packetFilterOutboundAclId);
                    if (acl) cli += ` traffic-filter outbound acl ${acl.name ? `name ${acl.name}` : acl.number}\n`;
                }

                cli += `quit\n`;
            }
        });
    } else if (vendorLower === 'h3c') {
        cli += createVlansCli(vlanInterfaces, 'vlan', 'name');
        vlanInterfaces.forEach((vlan: any) => {
            if (vlan.vlanId && vlan.ipAddress && vlan.subnetMask) {
                cli += `interface Vlan-interface${vlan.vlanId}\n`;
                if (vlan.interfaceDescription) cli += ` description ${vlan.interfaceDescription}\n`;
                cli += ` ip address ${vlan.ipAddress} ${vlan.subnetMask}\n`;
                if (vlan.enableDHCP) {
                    if (vlan.dhcpMode === 'relay' && vlan.dhcpServerIP) {
                        cli += ` dhcp select relay\n`;
                        cli += ` dhcp relay server-select ${vlan.dhcpServerIP}\n`;
                    } else if (vlan.dhcpMode === 'global' && vlan.selectedPool) {
                        cli += ` dhcp select server\n dhcp server apply ip-pool ${vlan.selectedPool}\n`;
                    }
                }
                
                if (vlan.packetFilterInboundAclId) {
                    const acl = acls.find(a => a.id === vlan.packetFilterInboundAclId);
                    if (acl) cli += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} inbound\n`;
                }
                if (vlan.packetFilterOutboundAclId) {
                    const acl = acls.find(a => a.id === vlan.packetFilterOutboundAclId);
                    if (acl) cli += ` packet-filter ${acl.name ? `name ${acl.name}` : acl.number} outbound\n`;
                }

                cli += `quit\n`;
            }
        });
    }

    return { cli: cli.trim(), explanation: "VLAN configuration generated locally." };
};

const generateLinkAggregationCli = (vendor: string, deviceType: string, config: any): { cli: string; explanation: string } => {
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
        }
        cli += `quit\n\n`;

        interfaces.forEach((intf: string) => {
            if (!intf) return;
            cli += `interface ${intf}\n`;
            cli += ` eth-trunk ${groupId}\n`;
            cli += `quit\n`;
        });

    } else if (vendorLower === 'h3c') {
        aggIntfName = `Bridge-Aggregation${groupId}`;
        if (loadBalanceAlgorithm) {
            cli += `link-aggregation global\n`;
            cli += ` load-sharing mode ${loadBalanceAlgorithm}\n`;
            cli += `quit\n\n`;
        }
        
        cli += `interface ${aggIntfName}\n`;
        if (description) cli += ` description ${description}\n`;
        
        if (interfaceMode === 'access' && accessVlan) {
            cli += ` port access vlan ${accessVlan}\n`;
        } else if (interfaceMode === 'trunk') {
            cli += ` port link-type trunk\n`;
            if (trunkNativeVlan) cli += ` port trunk pvid vlan ${trunkNativeVlan}\n`;
            if (trunkAllowedVlans) cli += ` port trunk permit vlan ${trunkAllowedVlans.replace(/,/g, ' ').replace(/-/g, ' to ')}\n`;
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


const generateStpCli = (vendor: string, deviceType: string, config: any): { cli: string; explanation: string } => {
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

const generateRoutingCli = (vendor: string, deviceType: string, config: any): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    config.staticRoutes.forEach((route: any) => {
        const cmd = (vendorLower === 'cisco') ? 'ip route' : 'ip route-static';
        const pref = (vendorLower !== 'cisco' && route.adminDistance) ? ` preference ${route.adminDistance}` : (route.adminDistance || '');
        cli += `${cmd} ${route.network} ${route.subnetMask} ${route.nextHop}${pref}\n`;
    });

    if (config.ospf.enabled) {
        if (vendorLower === 'cisco') {
            cli += `router ospf ${config.ospf.processId}\n`;
            cli += ` router-id ${config.ospf.routerId}\n`;
            config.ospf.areas.forEach((area: any) => {
                area.networks.forEach((net: any) => {
                    cli += ` network ${net.network} ${net.wildcardMask} area ${area.areaId}\n`;
                });
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
            config.ospf.areas.forEach((area: any) => {
                cli += ` area ${area.areaId}\n`;
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

const generateVrrpCli = (vendor: string, deviceType: string, config: any): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    if (config.enabled && config.interfaceName) {
        cli += `interface ${config.interfaceName}\n`;
        config.groups.forEach((group: any) => {
            if (vendorLower === 'cisco') {
                cli += ` vrrp ${group.groupId} ip ${group.virtualIp}\n`;
                cli += ` vrrp ${group.groupId} priority ${group.priority}\n`;
                if (group.preempt) cli += ` vrrp ${group.groupId} preempt\n`;
                if (group.description) cli += ` vrrp ${group.groupId} description ${group.description}\n`;
            } else { // Huawei/H3C
                cli += ` vrrp vrid ${group.groupId} virtual-ip ${group.virtualIp}\n`;
                cli += ` vrrp vrid ${group.groupId} priority ${group.priority}\n`;
                if (group.preempt) cli += ` vrrp vrid ${group.groupId} preempt-mode timer delay 0\n`;
                if (group.description) cli += ` vrrp vrid ${group.groupId} description ${group.description}\n`;
            }
        });
        cli += vendorLower === 'cisco' ? `exit\n` : `quit\n`;
    }
    return { cli: cli.trim(), explanation: "VRRP configuration generated locally." };
};

const generateAclCli = (vendor: string, deviceType: string, config: ACLsConfig): { cli: string; explanation: string } => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    if (vendorLower === 'h3c') {
        config.acls.forEach((acl: ACL) => {
            cli += `acl number ${acl.number}`;
            if (acl.name) cli += ` name ${acl.name}`;
            cli += ` match-order ${acl.matchOrder}\n`;
            if (acl.step && /^\d+$/.test(acl.step)) cli += ` step ${acl.step}\n`;

            acl.rules.forEach(rule => {
                if (rule.description) cli += ` # ${rule.description}\n`;
                let ruleCli = ' rule';
                const commonRule = rule as (ACLBasicRule | ACLAdvancedRule);
                if (commonRule.ruleId && !commonRule.autoRuleId) ruleCli += ` ${commonRule.ruleId}`;
                ruleCli += ` ${rule.action}`;
        
                if (acl.type === 'basic') {
                    const basicRule = rule as ACLBasicRule;
                    if (basicRule.sourceIsAny) ruleCli += ' source any';
                    else if (basicRule.sourceAddress) ruleCli += ` source ${basicRule.sourceAddress} ${basicRule.sourceWildcard || '0.0.0.0'}`;
                    if (basicRule.fragment) ruleCli += ' fragment';
                    if (basicRule.logging) ruleCli += ' logging';
                    if (basicRule.counting) ruleCli += ' counting';
                    if (basicRule.timeRange) ruleCli += ` time-range ${basicRule.timeRange}`;
                    if (basicRule.vpnInstance) ruleCli += ` vpn-instance ${basicRule.vpnInstance}`;
                } else if (acl.type === 'advanced') {
                    const advRule = rule as ACLAdvancedRule;
                    if (advRule.protocol) ruleCli += ` ${advRule.protocol}`;
                    if (!advRule.sourceIsAny && advRule.sourceAddress) ruleCli += ` source ${advRule.sourceAddress} ${advRule.sourceWildcard || '0.0.0.0'}`;
                    else if (advRule.sourceIsAny) ruleCli += ' source any';
                    if (!advRule.destinationIsAny && advRule.destinationAddress) ruleCli += ` destination ${advRule.destinationAddress} ${advRule.destinationWildcard || '0.0.0.0'}`;
                    else if (advRule.destinationIsAny) ruleCli += ' destination any';
                    if ((advRule.protocol === 'tcp' || advRule.protocol === 'udp')) {
                        if (advRule.sourcePortOperator && advRule.sourcePort1) {
                            ruleCli += ` source-port ${advRule.sourcePortOperator} ${advRule.sourcePort1}`;
                            if (advRule.sourcePortOperator === 'range' && advRule.sourcePort2) ruleCli += ` ${advRule.sourcePort2}`;
                        }
                        if (advRule.destinationPortOperator && advRule.destinationPort1) {
                            ruleCli += ` destination-port ${advRule.destinationPortOperator} ${advRule.destinationPort1}`;
                            if (advRule.destinationPortOperator === 'range' && advRule.destinationPort2) ruleCli += ` ${advRule.destinationPort2}`;
                        }
                    }
                    if (advRule.protocol === 'tcp') {
                        if (advRule.established) ruleCli += ' established';
                        else if (advRule.tcpFlags && Object.values(advRule.tcpFlags).some(v => v)) {
                            Object.entries(advRule.tcpFlags).filter(([_, v]) => v).forEach(([flag]) => {
                                ruleCli += ` ${flag} 1`;
                            });
                        }
                    }
                    if (advRule.protocol === 'icmp' && advRule.icmpType) {
                        ruleCli += ` icmp-type ${advRule.icmpType}`;
                        if (advRule.icmpCode) ruleCli += ` ${advRule.icmpCode}`;
                    }
                    if (advRule.dscp) ruleCli += ` dscp ${advRule.dscp}`;
                    if (advRule.precedence) ruleCli += ` precedence ${advRule.precedence}`;
                    if (advRule.tos) ruleCli += ` tos ${advRule.tos}`;
                    if (advRule.fragment) ruleCli += ' fragment';
                    if (advRule.logging) ruleCli += ' logging';
                    if (advRule.counting) ruleCli += ' counting';
                    if (advRule.timeRange) ruleCli += ` time-range ${advRule.timeRange}`;
                    if (advRule.vpnInstance) ruleCli += ` vpn-instance ${advRule.vpnInstance}`;
                }
                cli += `${ruleCli.trim()}\n`;
            });
            cli += 'quit\n\n';
        });
    } else if (vendorLower === 'huawei') {
        config.acls.forEach((acl: ACL) => {
            if (acl.name) {
                cli += `acl name ${acl.name} ${acl.type === 'advanced' ? 'advance' : 'basic'}\n`;
            } else {
                cli += `acl ${acl.number}\n`;
            }
            if (acl.description) cli += ` description ${acl.description}\n`;
            if (acl.step && /^\d+$/.test(acl.step)) cli += ` step ${acl.step}\n`;

            acl.rules.forEach(rule => {
                let ruleCli = ' rule';
                const commonRule = rule as (ACLBasicRule | ACLAdvancedRule);
                if (commonRule.ruleId && !commonRule.autoRuleId) ruleCli += ` ${commonRule.ruleId}`;
                ruleCli += ` ${rule.action}`;
        
                if (acl.type === 'basic') {
                    const basicRule = rule as ACLBasicRule;
                    if (basicRule.sourceIsAny) ruleCli += ' source any';
                    else if (basicRule.sourceAddress) ruleCli += ` source ${basicRule.sourceAddress} ${basicRule.sourceWildcard || '0.0.0.0'}`;
                    if (basicRule.fragment) ruleCli += ' fragment-type fragment';
                    if (basicRule.logging) ruleCli += ' logging';
                    if (basicRule.timeRange) ruleCli += ` time-range ${basicRule.timeRange}`;
                } else if (acl.type === 'advanced') {
                    const advRule = rule as ACLAdvancedRule;
                    ruleCli += ` ${advRule.protocol || 'ip'}`;
                    if (advRule.sourceIsAny) ruleCli += ' source any';
                    else if (advRule.sourceAddress) ruleCli += ` source ${advRule.sourceAddress} ${advRule.sourceWildcard || '0.0.0.0'}`;
                    if (advRule.destinationIsAny) ruleCli += ' destination any';
                    else if (advRule.destinationAddress) ruleCli += ` destination ${advRule.destinationAddress} ${advRule.destinationWildcard || '0.0.0.0'}`;
                    if ((advRule.protocol === 'tcp' || advRule.protocol === 'udp')) {
                        if (advRule.sourcePortOperator && advRule.sourcePort1) {
                            ruleCli += ` source-port ${advRule.sourcePortOperator} ${advRule.sourcePort1}`;
                            if (advRule.sourcePortOperator === 'range' && advRule.sourcePort2) ruleCli += ` ${advRule.sourcePort2}`;
                        }
                        if (advRule.destinationPortOperator && advRule.destinationPort1) {
                            ruleCli += ` destination-port ${advRule.destinationPortOperator} ${advRule.destinationPort1}`;
                            if (advRule.destinationPortOperator === 'range' && advRule.destinationPort2) ruleCli += ` ${advRule.destinationPort2}`;
                        }
                    }
                    if (advRule.protocol === 'tcp') {
                        if (advRule.established) ruleCli += ' tcp-flag established';
                        else if (advRule.tcpFlags && Object.values(advRule.tcpFlags).some(v => v)) {
                            const flags = Object.entries(advRule.tcpFlags).filter(([_, v]) => v).map(([flag]) => flag).join(' ');
                            if(flags) ruleCli += ` tcp-flag ${flags}`;
                        }
                    }
                    if (advRule.protocol === 'icmp' && advRule.icmpType) {
                        ruleCli += ` icmp-type ${advRule.icmpType}`;
                        if (advRule.icmpCode) ruleCli += ` ${advRule.icmpCode}`;
                    }
                    if(advRule.ttlOperator && advRule.ttlValue1) {
                        ruleCli += ` ttl ${advRule.ttlOperator} ${advRule.ttlValue1}`;
                        if (advRule.ttlOperator === 'range' && advRule.ttlValue2) ruleCli += ` ${advRule.ttlValue2}`;
                    }
                    if (advRule.dscp) ruleCli += ` dscp ${advRule.dscp}`;
                    if (advRule.precedence) ruleCli += ` precedence ${advRule.precedence}`;
                    if (advRule.tos) ruleCli += ` tos ${advRule.tos}`;
                    if (advRule.fragment) ruleCli += ' fragment-type fragment';
                    if (advRule.logging) ruleCli += ' logging';
                    if (advRule.timeRange) ruleCli += ` time-range ${advRule.timeRange}`;
                }
                cli += `${ruleCli.trim()}\n`;
                // Huawei allows rule descriptions as a separate command
                if (rule.description && commonRule.ruleId && !commonRule.autoRuleId) {
                    cli += ` rule ${commonRule.ruleId} description ${rule.description}\n`;
                } else if (rule.description) {
                    cli += ` # rule description: ${rule.description}\n`;
                }
            });
            cli += 'quit\n\n';
        });
    } else {
        return { cli: `# ACL for ${vendor} is not yet supported.`, explanation: 'Not supported' };
    }
  
    return { cli: cli.trim(), explanation: 'ACL configuration generated locally.' };
};

const generateTimeRangeCli = (vendor: string, config: Node['config']): { cli: string; explanation: string } => {
    const timeRanges = config.timeRanges;
    if (!timeRanges || timeRanges.length === 0) return { cli: '', explanation: '' };

    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    timeRanges.forEach(tr => {
        let timeRangeCmd = `time-range ${tr.name}`;
        let periodicPart = '';
        let absolutePart = '';
        
        if (tr.periodic.enabled && tr.periodic.startTime && tr.periodic.endTime) {
            const daysOfWeek = tr.periodic.days;
            let daysString = '';
            if (daysOfWeek.daily) {
                daysString = 'daily';
            } else {
                const dayKeys: string[] = [];
                const dayMapH3C = { monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun' };
                const dayMapHuawei = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
                const dayMap = vendorLower === 'huawei' ? dayMapHuawei : dayMapH3C;

                const isWorkingDay = !!(daysOfWeek.monday && daysOfWeek.tuesday && daysOfWeek.wednesday && daysOfWeek.thursday && daysOfWeek.friday && !daysOfWeek.saturday && !daysOfWeek.sunday);
                const isOffDay = !!(daysOfWeek.saturday && daysOfWeek.sunday && !daysOfWeek.monday && !daysOfWeek.tuesday && !daysOfWeek.wednesday && !daysOfWeek.thursday && !daysOfWeek.friday);

                if (isWorkingDay) daysString = 'working-day';
                else if (isOffDay) daysString = 'off-day';
                else {
                    for (const [key, value] of Object.entries(dayMap)) {
                        if (daysOfWeek[key as keyof TimeRangeDaySelection]) dayKeys.push(value);
                    }
                    daysString = dayKeys.join(' ');
                }
            }
            if (daysString) {
                periodicPart = `${tr.periodic.startTime} to ${tr.periodic.endTime} ${daysString}`;
            }
        }
        
        if (tr.absolute.enabled) {
            if (tr.absolute.fromTime && tr.absolute.fromDate) {
                absolutePart += ` from ${tr.absolute.fromTime} ${tr.absolute.fromDate.replace(/-/g, '/')}`;
            }
            if (tr.absolute.toTime && tr.absolute.toDate) {
                absolutePart += ` to ${tr.absolute.toTime} ${tr.absolute.toDate.replace(/-/g, '/')}`;
            }
        }

        if (periodicPart || absolutePart.trim()) {
            cli += `${timeRangeCmd}${periodicPart ? ' ' + periodicPart : ''}${absolutePart}\n`;
        }
    });

    if(cli) cli += 'quit\n\n';

    return { cli: cli.trim(), explanation: "Time-range configuration generated." };
}

const generateH3cWirelessCli = (config: WirelessConfig): string => {
    let cli = 'undo terminal confirmation\n';
    
    // 1. Service Templates
    config.serviceTemplates.forEach((st) => {
        cli += `wlan service-template "${st.templateName}"\n`;
        cli += ` ssid "${st.ssid}"\n`;
        if (st.ssidHide) cli += ' beacon ssid-hide\n';
        if (st.description) cli += ` description "${st.description}"\n`;
        if (st.defaultVlan) cli += ` vlan ${st.defaultVlan}\n`;
        if (st.maxClients) cli += ` client max-count ${st.maxClients}\n`;

        if (st.authMode === 'static-psk') {
            cli += ' akm mode psk\n';
            if (st.pskPassword) {
                const pskType = st.pskType === 'rawkey' ? 'raw-key' : 'pass-phrase';
                cli += ` preshared-key ${pskType} simple ${st.pskPassword}\n`;
            }
            if (st.securityMode === 'wpa') {
                cli += ' security-ie wpa\n cipher-suite tkip\n';
            } else if (st.securityMode === 'wpa2') {
                cli += ' security-ie rsn\n cipher-suite ccmp\n';
            } else if (st.securityMode === 'wpa-wpa2') {
                cli += ' security-ie wpa\n security-ie rsn\n cipher-suite tkip\n cipher-suite ccmp\n';
            }
        } else if (st.authMode === 'static-wep') {
            cli += ` wep key ${st.wepKeyId || '1'} ${st.wepKeyType || 'passphrase'} simple ${st.wepPassword || ''}\n`;
        }
        
        if (st.enabled) cli += ' service-template enable\n';
        cli += 'quit\n\n';
    });

    // 2. Define Manual APs
    config.apDevices.forEach((ap) => {
        if (ap.serialNumber && ap.apName) {
            cli += `wlan ap "${ap.apName}" model "${ap.model || 'WA6320-HCL'}"\n`;
            cli += ` serial-id ${ap.serialNumber}\n`;
            if (ap.groupName) cli += ` ap-group "${ap.groupName}"\n`;
            if (ap.description) cli += ` description "${ap.description}"\n`;
            cli += 'quit\n\n';
        }
    });

    // 3. Configure AP Groups
    config.apGroups.forEach((ag) => {
        cli += `wlan ap-group "${ag.groupName}"\n`;
        if (ag.description) cli += ` description "${ag.description}"\n`;
        if (ag.countryCode) cli += ` region-code ${ag.countryCode}\n`;

        const apModelsInGroup = [...new Set(config.apDevices.filter(ap => ap.groupName === ag.groupName && ap.model).map(ap => ap.model))];

        apModelsInGroup.forEach(model => {
            cli += ` ap-model "${model}"\n`;
            // Radio 1 (5G)
            if (ag.radio5G?.enabled) {
                cli += '  radio 1\n';
                cli += `   type dot11ac\n`;
                cli += `   channel ${ag.radio5G.channel}\n`;
                cli += `   channel-width 80\n`;
                cli += `   max-power ${ag.radio5G.power}\n`;
                ag.serviceTemplates.forEach(stName => {
                    const st = config.serviceTemplates.find(s => s.templateName === stName);
                    if(st) cli += `   service-template "${stName}" vlan ${st.defaultVlan}\n`;
                });
                cli += '   radio enable\n  quit\n';
            }
            // Radio 2 (2.4G)
            if (ag.radio2G?.enabled) {
                cli += '  radio 2\n';
                cli += `   type dot11gn\n`;
                cli += `   channel ${ag.radio2G.channel}\n`;
                cli += `   channel-width 20\n`;
                cli += `   max-power ${ag.radio2G.power}\n`;
                ag.serviceTemplates.forEach(stName => {
                    const st = config.serviceTemplates.find(s => s.templateName === stName);
                    if(st) cli += `   service-template "${stName}" vlan ${st.defaultVlan}\n`;
                });
                cli += '   radio enable\n  quit\n';
            }
            cli += ' quit\n';
        });
        cli += 'quit\n\n';
    });

    return cli.trim();
};

const generateHuaweiWirelessCli = (config: WirelessConfig): string => {
    let cli = 'wlan\n';
    // 1. Global AC Config
    if (config.acConfig.acSourceInterface) {
        cli += ` ac-source interface ${config.acConfig.acSourceInterface}\n`;
    }
    if (config.acConfig.countryCode) {
        cli += ` country-code ${config.acConfig.countryCode}\n`;
    }
    if (config.acConfig.apAuthMode) {
        cli += ` ap auth-mode ${config.acConfig.apAuthMode}-auth\n`;
    }

    // 2. Security Profiles
    config.securityProfiles.forEach(sp => {
        cli += `security-profile name "${sp.profileName}"\n`;
        if (sp.securityType === 'wpa2-psk') {
            cli += ` security wpa2 psk pass-phrase ${sp.psk} aes\n`;
        }
        cli += 'quit\n';
    });

    // 3. SSID Profiles
    config.ssidProfiles.forEach(sp => {
        cli += `ssid-profile name "${sp.profileName}"\n`;
        cli += ` ssid "${sp.ssid}"\n`;
        cli += 'quit\n';
    });

    // 4. VAP Profiles
    config.vapProfiles.forEach(vp => {
        cli += `vap-profile name "${vp.profileName}"\n`;
        if (vp.securityProfile) cli += ` security-profile "${vp.securityProfile}"\n`;
        if (vp.ssidProfile) cli += ` ssid-profile "${vp.ssidProfile}"\n`;
        if (vp.vlanId) cli += ` service-vlan vlan-id ${vp.vlanId}\n`;
        if (vp.forwardMode) cli += ` forward-mode ${vp.forwardMode}\n`;
        cli += 'quit\n';
    });

    // 5. AP Groups
    config.apGroups.forEach(ag => {
        cli += `ap-group name "${ag.groupName}"\n`;
        if (ag.description) cli += ` description "${ag.description}"\n`;
        
        if (ag.vapBindings) {
            ag.vapBindings.forEach((binding, index) => {
                if (binding.vapProfileName) {
                    const wlanId = index + 1; // WLAN ID starts from 1
                    cli += ` vap-profile "${binding.vapProfileName}" wlan ${wlanId} radio ${binding.radio}\n`;
                }
            });
        }
        
        cli += 'quit\n';
    });
    
    // 6. AP Devices
    config.apDevices.forEach((ap, index) => {
        const id = index;
        cli += `ap-id ${id}`;
        if (ap.model) cli += ` type-id ${ap.model}`;
        if (ap.macAddress) cli += ` ap-mac ${ap.macAddress}`;
        if (ap.serialNumber) cli += ` ap-sn ${ap.serialNumber}`;
        cli += '\n';
        if (ap.apName) cli += `ap-name "${ap.apName}" ap-id ${id}\n`;
        if (ap.groupName) cli += `ap-group "${ap.groupName}" ap-id ${id}\n`;
    });

    cli += 'return\n';
    return cli;
};

const generateCiscoWirelessCli = (config: WirelessConfig): string => {
    let cli = 'configure terminal\n';
    // 1. Global
    if (config.acConfig.countryCode) cli += `wireless country ${config.acConfig.countryCode}\n`;
    if (config.acConfig.acSourceInterface) cli += `wireless management interface ${config.acConfig.acSourceInterface}\n`;

    // 2. WLANs (VAP + SSID + Security)
    config.vapProfiles.forEach((vp, index) => {
        const ssidProfile = config.ssidProfiles.find(s => s.profileName === vp.ssidProfile);
        const securityProfile = config.securityProfiles.find(s => s.profileName === vp.securityProfile);
        
        if (ssidProfile && securityProfile) {
            const wlanId = index + 1;
            cli += `wlan "${vp.profileName}" ${wlanId} "${ssidProfile.ssid}"\n`;
            if (securityProfile.securityType === 'wpa2-psk') {
                cli += ` security wpa wpa2 psk aes set-key ascii 0 ${securityProfile.psk}\n`;
            }
            if (vp.vlanId) {
                 cli += ` client vlan ${vp.vlanId}\n`;
            }
            cli += ` no shutdown\n`;
        }
    });

    // 3. AP Groups
    config.apGroups.forEach(ag => {
        cli += `ap group "${ag.groupName}"\n`;
        ag.serviceTemplates.forEach(vapName => {
            cli += ` wlan "${vapName}"\n`;
        });
        if (ag.description) cli += ` description "${ag.description}"\n`;
        cli += 'end\n';
    });

    // 4. AP Devices
    config.apDevices.forEach(ap => {
        if (ap.macAddress && ap.groupName) {
            cli += `ap ${ap.macAddress}\n`;
            cli += ` ap-groupname "${ap.groupName}"\n`;
            cli += 'end\n';
        }
    });

    return cli;
};

const generateWirelessCli = (vendor: string, deviceType: string, config: WirelessConfig): { cli: string; explanation: string } => {
    if (deviceType !== DeviceType.AC) {
        return { cli: '', explanation: "Wireless configuration is only applicable to Access Controllers." };
    }
    
    let cli = '';
    switch (vendor) {
        case Vendor.H3C:
            cli = generateH3cWirelessCli(config);
            break;
        case Vendor.Huawei:
            cli = generateHuaweiWirelessCli(config);
            break;
        case Vendor.Cisco:
            cli = generateCiscoWirelessCli(config);
            break;
        default:
            return { cli: '', explanation: `Wireless configuration for ${vendor} is not supported.` };
    }

    return { cli, explanation: `Wireless configuration generated for ${vendor}.` };
};


const generateCliCommands = (
    vendor: string,
    deviceType: string,
    feature: string,
    config: any
): { cli: string; explanation: string } => {
    const featureKey = feature.toLowerCase().replace(/\s+/g, '_');

    switch (featureKey) {
        case 'dhcp':
            return generateDhcpCli(vendor, deviceType, config);
        case 'vlan':
            // config is now { vlanConfig, acls }
            return generateVlanCli(vendor, deviceType, config.vlanConfig, config.acls);
        case 'interface':
            return generateInterfaceIpCli(vendor, deviceType, config.interfaceIPConfig, config.acls);
        case 'link_aggregation':
            return generateLinkAggregationCli(vendor, deviceType, config);
        case 'stp':
            return generateStpCli(vendor, deviceType, config);
        case 'routing':
            return generateRoutingCli(vendor, deviceType, config);
        case 'vrrp':
            return generateVrrpCli(vendor, deviceType, config);
        case 'acl':
            return generateAclCli(vendor, deviceType, config);
        case 'wireless':
            return generateWirelessCli(vendor, deviceType, config);
        default:
            return {
                cli: `# Configuration generation not available for ${vendor} ${feature}`,
                explanation: `暂不支持 ${vendor} 设备的 ${feature} 配置生成`
            };
    }
};

// #endregion

export const generateConfig = async (node: Node, feature: 'DHCP' | 'VLAN' | 'Interface' | 'Link Aggregation' | 'STP' | 'Routing' | 'VRRP' | 'Wireless' | 'ACL'): Promise<{ cli: string; explanation: string; }> => {
    if (node.type === DeviceType.PC || node.type === DeviceType.Text) {
        return { cli: 'N/A', explanation: `This feature is not applicable to a ${node.type}.` };
    }

    // Feature applicability checks
    const featureApplicability: Record<string, DeviceType[]> = {
        'DHCP': [DeviceType.Router, DeviceType.L3Switch, DeviceType.AC, DeviceType.Firewall],
        'VLAN': [DeviceType.L2Switch, DeviceType.L3Switch, DeviceType.Router, DeviceType.AC],
        'Interface': [DeviceType.Router, DeviceType.Firewall],
        'Link Aggregation': [DeviceType.L2Switch, DeviceType.L3Switch, DeviceType.Router, DeviceType.AC],
        'STP': [DeviceType.L2Switch, DeviceType.L3Switch],
        'Routing': [DeviceType.Router, DeviceType.L3Switch, DeviceType.AC, DeviceType.Firewall],
        'VRRP': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
        'ACL': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
        'Wireless': [DeviceType.AC],
    };

    const applicableTypes = featureApplicability[feature];
    if (applicableTypes && !applicableTypes.includes(node.type)) {
         return { cli: 'N/A', explanation: `${feature} feature is not applicable to ${node.type}.` };
    }

    let configData: any = {};
    let featureKey: keyof Node['config'];

    switch (feature) {
        case 'Link Aggregation':
            featureKey = 'linkAggregation';
            configData = node.config[featureKey];
            break;
        case 'VLAN': // Special handling for VLAN to include ACLs
            featureKey = 'vlan';
            configData = {
                vlanConfig: node.config.vlan,
                acls: node.config.acl.acls,
            };
            break;
         case 'Interface':
            featureKey = 'interfaceIP';
             configData = {
                interfaceIPConfig: node.config.interfaceIP,
                acls: node.config.acl.acls,
            };
            break;
        default:
            featureKey = feature.toLowerCase() as keyof Node['config'];
            configData = node.config[featureKey];
            break;
    }

    // Directly call the local generation engine
    const result = generateCliCommands(
        node.vendor,
        node.type,
        feature,
        configData
    );

    return Promise.resolve(result);
};

export const generateAllCliCommands = (node: Node | null, connections: Connection[]): string => {
    if (!node) return '';
    let allCli = '';
    const { config, vendor, type } = node;

    // Add Time Range CLI first
    if (config.timeRanges && config.timeRanges.length > 0) {
        const timeRangeResult = generateTimeRangeCli(vendor, config);
        if (timeRangeResult.cli) {
            allCli += `! Time-Range Configuration\n`;
            allCli += `${timeRangeResult.cli}\n\n`;
        }
    }

    const features = [
        { key: 'dhcp', name: 'DHCP', enabled: config.dhcp.enabled, cli: config.dhcp.cli },
        { key: 'interfaceIP', name: 'Interface IP', enabled: config.interfaceIP.enabled, cli: config.interfaceIP.cli },
        { key: 'vlan', name: 'VLAN Interface', enabled: config.vlan.enabled, cli: config.vlan.cli },
        { key: 'linkAggregation', name: 'Link Aggregation', enabled: config.linkAggregation.enabled, cli: config.linkAggregation.cli },
        { key: 'stp', name: 'STP', enabled: config.stp.enabled, cli: config.stp.cli },
        { key: 'routing', name: 'Routing', enabled: (config.routing.staticRoutes.length > 0 || config.routing.ospf.enabled), cli: config.routing.cli },
        { key: 'vrrp', name: 'VRRP', enabled: config.vrrp.enabled, cli: config.vrrp.cli },
        { key: 'acl', name: 'ACL', enabled: config.acl.enabled, cli: config.acl.cli },
        { key: 'wireless', name: 'Wireless', enabled: config.wireless.enabled, cli: config.wireless.cli },
    ];

    features.forEach(feature => {
        if (feature.enabled && feature.cli) {
            allCli += `! ${feature.name} Configuration\n`;
            allCli += `${feature.cli}\n\n`;
        }
    });

    const relevantConnections = connections.filter(c => c.from.nodeId === node.id || c.to.nodeId === node.id);
    let interfaceClis = '';
    const configuredPorts = new Set<string>();

    relevantConnections.forEach(conn => {
        if (conn.config.mode !== 'unconfigured') {
            const isFromNode = conn.from.nodeId === node.id;
            const portId = isFromNode ? conn.from.portId : conn.to.portId;
            const port = node.ports.find(p => p.id === portId);

            const isPortInLag = config.linkAggregation.enabled && config.linkAggregation.interfaces.includes(port?.name || '');
            const isPortWithIp = config.interfaceIP.enabled && config.interfaceIP.interfaces.some(i => i.interfaceName === port?.name);

            if (port && !configuredPorts.has(port.name) && !isPortInLag && !isPortWithIp) {
                const cli = generateInterfaceCli(port.name, vendor, conn.config, type);
                if (cli) {
                    interfaceClis += cli + '\n';
                    configuredPorts.add(port.name);
                }
            }
        }
    });

    if (interfaceClis) {
        allCli += `! Interface Switching Configuration\n${interfaceClis}\n`;
    }

    return allCli.trim();
};

export const generateFullExplanation = (node: Node | null, connections: Connection[]): string => {
    if (!node) return '';
    let allExplanation = '';
    const { config } = node;

    const features = [
        { key: 'dhcp', name: 'DHCP', enabled: config.dhcp.enabled, explanation: config.dhcp.explanation },
        { key: 'interfaceIP', name: 'Interface IP', enabled: config.interfaceIP.enabled, explanation: config.interfaceIP.explanation },
        { key: 'vlan', name: 'VLAN Interface', enabled: config.vlan.enabled, explanation: config.vlan.explanation },
        { key: 'linkAggregation', name: 'Link Aggregation', enabled: config.linkAggregation.enabled, explanation: config.linkAggregation.explanation },
        { key: 'stp', name: 'STP', enabled: config.stp.enabled, explanation: config.stp.explanation },
        { key: 'routing', name: 'Routing', enabled: (config.routing.staticRoutes.length > 0 || config.routing.ospf.enabled), explanation: config.routing.explanation },
        { key: 'vrrp', name: 'VRRP', enabled: config.vrrp.enabled, explanation: config.vrrp.explanation },
        { key: 'acl', name: 'ACL', enabled: config.acl.enabled, explanation: config.acl.explanation },
        { key: 'wireless', name: 'Wireless', enabled: config.wireless.enabled, explanation: config.wireless.explanation },
    ];

    features.forEach(feature => {
        if (feature.enabled && feature.explanation) {
            allExplanation += `--- ${feature.name} 配置说明 ---\n`;
            allExplanation += `${feature.explanation}\n\n`;
        }
    });

    return allExplanation.trim();
};