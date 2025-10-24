import { ObjectGroupConfig, Vendor, DeviceType, AddressGroup, ServiceGroup, DomainGroup } from '../../types';

const generateAddressGroupCli = (vendor: Vendor, groups: AddressGroup[]): string => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    groups.forEach(group => {
        if (!group.name || group.members.length === 0) return;

        if (vendorLower === 'huawei') {
            cli += `ip address-set ${group.name} type object\n`;
            if (group.description) cli += ` description "${group.description}"\n`;
            group.members.forEach((member, index) => {
                if (member.type === 'ip-mask' && member.address) {
                    cli += ` address ${index} ${member.address} mask ${member.mask || '32'}\n`;
                } else if (member.type === 'range' && member.startAddress && member.endAddress) {
                    cli += ` address ${index} range ${member.startAddress} ${member.endAddress}\n`;
                }
            });
            cli += 'quit\n';
        } else if (vendorLower === 'h3c') {
            cli += `object-group ip address ${group.name}\n`;
            if (group.description) cli += ` description "${group.description}"\n`;
            group.members.forEach((member, index) => {
                const objectId = index + 1;
                if (member.type === 'ip-mask' && member.address) {
                    const mask = member.mask || '255.255.255.255';
                    if (mask === '255.255.255.255' || mask === '32') {
                         cli += ` ${objectId} network host address ${member.address}\n`;
                    } else {
                         cli += ` ${objectId} network subnet ${member.address} ${mask}\n`;
                    }
                } else if (member.type === 'range' && member.startAddress && member.endAddress) {
                    cli += ` ${objectId} network range ${member.startAddress} ${member.endAddress}\n`;
                } else if (member.type === 'host-name' && member.hostName) {
                    cli += ` ${objectId} network host name ${member.hostName}\n`;
                }
            });
            cli += 'quit\n';
        }
    });

    return cli;
};

const generateServiceGroupCli = (vendor: Vendor, groups: ServiceGroup[]): string => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();

    groups.forEach(group => {
        if (!group.name || group.members.length === 0) return;

        if (vendorLower === 'huawei') {
            cli += `ip service-set ${group.name} type object\n`;
            if (group.description) cli += ` description "${group.description}"\n`;
            group.members.forEach((member, index) => {
                let serviceCli = ` service ${index} protocol`;
                if (member.protocol === 'custom' && member.customProtocolNumber) {
                    serviceCli += ` ${member.customProtocolNumber}`;
                } else if (member.protocol !== 'custom') {
                    serviceCli += ` ${member.protocol}`;
                }

                if (member.protocol === 'tcp' || member.protocol === 'udp') {
                    if (member.sourcePortOperator && member.sourcePort1) {
                        serviceCli += ` source-port ${member.sourcePortOperator} ${member.sourcePort1}`;
                        if (member.sourcePortOperator === 'range') serviceCli += ` ${member.sourcePort2}`;
                    }
                    if (member.destinationPortOperator && member.destinationPort1) {
                        serviceCli += ` destination-port ${member.destinationPortOperator} ${member.destinationPort1}`;
                        if (member.destinationPortOperator === 'range') serviceCli += ` ${member.destinationPort2}`;
                    }
                } else if (member.protocol === 'icmp' && member.icmpType) {
                    serviceCli += ` icmp-type ${member.icmpType}${member.icmpCode ? ` ${member.icmpCode}` : ''}`;
                }
                cli += `${serviceCli}\n`;
            });
             cli += 'quit\n';
        } else if (vendorLower === 'h3c') {
            cli += `object-group service ${group.name}\n`;
            if (group.description) cli += ` description "${group.description}"\n`;
            group.members.forEach((member, index) => {
                const objectId = index + 1;
                let serviceCli = ` ${objectId} service`;
                 if (member.protocol === 'custom' && member.customProtocolNumber) {
                    serviceCli += ` ${member.customProtocolNumber}`;
                } else if (member.protocol !== 'custom') {
                    serviceCli += ` ${member.protocol}`;
                }
                
                if (member.protocol === 'tcp' || member.protocol === 'udp') {
                    if (member.sourcePortOperator && member.sourcePort1) {
                        serviceCli += ` source ${member.sourcePortOperator} ${member.sourcePort1}`;
                        if (member.sourcePortOperator === 'range') serviceCli += ` ${member.sourcePort2}`;
                    }
                    if (member.destinationPortOperator && member.destinationPort1) {
                        serviceCli += ` destination ${member.destinationPortOperator} ${member.destinationPort1}`;
                        if (member.destinationPortOperator === 'range') serviceCli += ` ${member.destinationPort2}`;
                    }
                } else if (member.protocol === 'icmp' && member.icmpType) {
                    serviceCli += ` icmp-type ${member.icmpType}${member.icmpCode ? ` ${member.icmpCode}` : ''}`;
                }
                cli += `${serviceCli}\n`;
            });
            cli += 'quit\n';
        }
    });
    
    return cli;
};

const generateDomainGroupCli = (vendor: Vendor, groups: DomainGroup[]): string => {
    let cli = '';
    const vendorLower = vendor.toLowerCase();
    
    if (vendorLower === 'huawei') {
        groups.forEach(group => {
            if (!group.name || group.members.length === 0) return;
            cli += `domain-set name ${group.name}\n`;
            if (group.description) cli += ` description "${group.description}"\n`;
            group.members.forEach(member => {
                if(member.name) cli += ` add domain ${member.name}\n`;
            });
            cli += 'quit\n';
        });
    } else if (vendorLower === 'h3c') {
        // H3C handles domains as part of address object groups
        // This logic will be handled within generateAddressGroupCli for H3C
        // by looking for 'host-name' type members.
        // We will generate a separate object group for each domain group for clarity.
        const h3cAddressGroups: AddressGroup[] = groups.map(dg => ({
            id: dg.id,
            name: dg.name,
            description: dg.description,
            members: dg.members.map(dm => ({
                id: dm.id,
                type: 'host-name',
                hostName: dm.name,
            })),
        }));
        cli = generateAddressGroupCli(vendor, h3cAddressGroups);
    }

    return cli;
};


export const generateObjectGroupCli = (vendor: Vendor, deviceType: DeviceType, config: ObjectGroupConfig): { cli: string; explanation: string } => {
    let cli = '';

    if (config.addressGroupsEnabled) {
        const addressCli = generateAddressGroupCli(vendor, config.addressGroups);
        if (addressCli) {
            cli += `! Address Groups\n${addressCli}\n`;
        }
    }
    
    if (config.serviceGroupsEnabled) {
        const serviceCli = generateServiceGroupCli(vendor, config.serviceGroups);
        if (serviceCli) {
            cli += `! Service Groups\n${serviceCli}\n`;
        }
    }

    if (config.domainGroupsEnabled) {
        const domainCli = generateDomainGroupCli(vendor, config.domainGroups);
        if (domainCli) {
            cli += `! Domain Groups\n${domainCli}\n`;
        }
    }
    
    if (!cli.trim()) {
        return { cli: '', explanation: 'Object Groups are disabled or no groups are configured.' };
    }

    return { cli: cli.trim(), explanation: 'Object Group configuration generated.' };
};