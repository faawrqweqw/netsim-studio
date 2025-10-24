import { Node, ACLsConfig, ACL, ACLBasicRule, ACLAdvancedRule, TimeRange, TimeRangeDaySelection, Vendor } from '../../types';

export const generateTimeRangeCli = (vendor: string, config: Node['config']): { cli: string; explanation: string } => {
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

export const generateAclCli = (vendor: string, deviceType: string, config: ACLsConfig): { cli: string; explanation: string } => {
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
