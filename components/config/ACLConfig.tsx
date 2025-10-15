import React, { useState, useCallback, useEffect } from 'react';
import { Node, ACL, ACLBasicRule, ACLAdvancedRule, TimeRange, Vendor } from '../../types';
import { SpinnerIcon } from '../Icons';
import TimeRangeManagerModal from './TimeRangeManagerModal';

interface ACLConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const getAclType = (numStr: string): 'basic' | 'advanced' | 'unknown' => {
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return 'unknown';
    if (num >= 2000 && num <= 2999) return 'basic';
    if (num >= 3000 && num <= 3999) return 'advanced';
    return 'unknown';
};

// Sub-components for Rule Forms
const PROTOCOL_OPTIONS = [
    { value: 'ip', label: 'ip' }, { value: 'tcp', label: 'tcp(6)' }, { value: 'udp', label: 'udp(17)' },
    { value: 'icmp', label: 'icmp(1)' }, { value: 'gre', label: 'gre(47)' }, { value: 'igmp', label: 'igmp(2)' },
    { value: 'ipinip', label: 'ipinip(4)' }, { value: 'ospf', label: 'ospf(89)' },
];
const PORT_OPERATOR_OPTIONS = [ { value: 'eq', label: '==' }, { value: 'neq', label: '!=' }, { value: 'gt', label: '>' }, { value: 'lt', label: '<' }, { value: 'range', label: 'Range' } ];

const Field = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (<div className={className}><label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>{children}</div>);
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (<input {...props} className={`w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`} />);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (<select {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />);
const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (<label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300"><input type="checkbox" {...props} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"/> {label}</label>);

const AddressField = ({ title, ruleId, isAny, address, wildcard, onUpdate }: { title: string, ruleId: string, isAny: boolean, address: string, wildcard: string, onUpdate: Function }) => (
    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
        <h6 className="text-sm font-semibold text-slate-300">{title} Match Condition</h6>
        <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm p-1 rounded-md hover:bg-slate-700/50">
                <input 
                    type="radio" 
                    name={`match-type-${title}-${ruleId}`}
                    checked={isAny} 
                    onChange={() => onUpdate({ isAny: true, address, wildcard })} 
                    className="w-4 h-4 bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span>Any {title}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm p-1 rounded-md hover:bg-slate-700/50">
                <input 
                    type="radio" 
                    name={`match-type-${title}-${ruleId}`}
                    checked={!isAny} 
                    onChange={() => onUpdate({ isAny: false, address, wildcard })} 
                    className="w-4 h-4 bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span>Match IP/Wildcard</span>
            </label>
        </div>
        {!isAny && (
            <div className="space-y-3 pt-3 border-t border-slate-700/50">
                 <Field label="Address"><Input placeholder="192.168.1.0" value={address} onChange={e => onUpdate({ isAny, address: e.target.value, wildcard })} /></Field>
                 <Field label="Wildcard"><Input placeholder="0.0.0.255" value={wildcard} onChange={e => onUpdate({ isAny, address, wildcard: e.target.value })} /></Field>
            </div>
        )}
    </div>
);

// Basic ACL rule editor remains inline for simplicity
const BasicRuleEditor = ({ rule, updateRule, removeRule, index, vendor, timeRanges, onManageTimeRanges }: { 
    rule: ACLBasicRule, 
    updateRule: (ruleId: string, updates: Partial<ACLBasicRule>) => void, 
    removeRule: (ruleId: string) => void, 
    index: number, 
    vendor: Vendor,
    timeRanges: TimeRange[],
    onManageTimeRanges: () => void 
}) => {
    const [isRuleExpanded, setIsRuleExpanded] = useState(true);
    const ruleSummary = `${rule.action}${rule.sourceIsAny ? ' source any' : ` source ${rule.sourceAddress || '...'} ...`}`;

    return (
        <div className="bg-slate-900/50 rounded">
            <div className="flex justify-between items-center p-2 cursor-pointer" onClick={() => setIsRuleExpanded(!isRuleExpanded)}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 text-xs ${isRuleExpanded ? 'rotate-90' : ''}`}>▶</span><span className="text-xs font-mono text-slate-400">Rule {rule.autoRuleId ? `(auto)` : rule.ruleId || index + 1}</span><span className="text-xs text-slate-300 truncate hidden sm:block">{ruleSummary}</span></div>
                <button onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }} className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded">-</button>
            </div>
            {isRuleExpanded && (
                <div className="p-3 border-t border-slate-700 space-y-4">
                    <div className="grid grid-cols-2 gap-3 items-end">
                        <Field label="Action"><Select value={rule.action} onChange={e => updateRule(rule.id, { action: e.target.value as 'permit' | 'deny' })}><option value="permit">permit</option><option value="deny">deny</option></Select></Field>
                         <Field label="规则编号">
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="text" 
                                    placeholder={rule.autoRuleId ? "自动" : "0-65534"}
                                    disabled={rule.autoRuleId}
                                    value={rule.autoRuleId ? '' : rule.ruleId || ''} 
                                    onChange={e => updateRule(rule.id, { ruleId: e.target.value, autoRuleId: false })}
                                    className="flex-grow"
                                />
                                <Checkbox 
                                    label="自动" 
                                    checked={rule.autoRuleId} 
                                    onChange={e => updateRule(rule.id, { autoRuleId: e.target.checked, ruleId: e.target.checked ? '' : rule.ruleId })} 
                                />
                            </div>
                        </Field>
                    </div>
                    <div className="grid grid-cols-1">
                        <AddressField title="Source" ruleId={rule.id} isAny={rule.sourceIsAny} address={rule.sourceAddress} wildcard={rule.sourceWildcard} onUpdate={(u: any) => updateRule(rule.id, { sourceIsAny: u.isAny, sourceAddress: u.address, sourceWildcard: u.wildcard })} />
                    </div>
                     <div className="pt-3 border-t border-slate-700 space-y-4">
                        <Field label="规则生效时间段">
                            <Select value={rule.timeRange || ''} onChange={e => {
                                if (e.target.value === '__manage__') {
                                    onManageTimeRanges();
                                    setTimeout(() => {
                                        const selectElement = e.target as HTMLSelectElement;
                                        selectElement.value = rule.timeRange || '';
                                    }, 0);
                                } else {
                                    updateRule(rule.id, { timeRange: e.target.value || undefined });
                                }
                            }}>
                                <option value="">无</option>
                                {timeRanges.map(tr => <option key={tr.id} value={tr.name}>{tr.name}</option>)}
                                <option value="__manage__" className="italic text-blue-400 font-semibold">管理时间段...</option>
                            </Select>
                        </Field>
                        <div className="flex flex-wrap gap-x-6 gap-y-3 items-center pt-3 border-t border-slate-700/50">
                            <Checkbox label="Logging" checked={rule.logging} onChange={e => updateRule(rule.id, { logging: e.target.checked })} />
                            <Checkbox label="Fragment" checked={rule.fragment} onChange={e => updateRule(rule.id, { fragment: e.target.checked })} />
                            {vendor !== Vendor.Huawei && (
                              <Checkbox label="Counting" checked={rule.counting} onChange={e => updateRule(rule.id, { counting: e.target.checked })} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Modal for Advanced ACL rules
const ACLRuleModal = ({ acl, initialRule, onSave, onClose, timeRanges, onManageTimeRanges }: { acl: ACL, initialRule: ACLAdvancedRule | null, onSave: (rule: ACLAdvancedRule) => void, onClose: () => void, timeRanges: TimeRange[], onManageTimeRanges: () => void }) => {
    const isNewRule = !initialRule;
    const defaultRule: ACLAdvancedRule = {
        id: `rule-${Date.now()}`, action: 'permit', autoRuleId: true, protocol: 'tcp', description: '', sourceIsAny: true, sourceAddress: '', sourceWildcard: '', destinationIsAny: true, destinationAddress: '', destinationWildcard: '', fragment: false, logging: false, counting: false
    };
    const [rule, setRule] = useState<ACLAdvancedRule>(initialRule || defaultRule);
    const [conditions, setConditions] = useState<Record<string, boolean>>(() => {
        const initialConditions: Record<string, boolean> = {};
        if (initialRule) {
            if (initialRule.sourceAddress) initialConditions['source'] = true;
            if (initialRule.destinationAddress) initialConditions['destination'] = true;
            if (initialRule.sourcePortOperator) initialConditions['sourcePort'] = true;
            if (initialRule.destinationPortOperator) initialConditions['destinationPort'] = true;
            if (initialRule.icmpType) initialConditions['icmp'] = true;
            if (initialRule.established) initialConditions['established'] = true;
            if (initialRule.tcpFlags && Object.keys(initialRule.tcpFlags).length > 0) initialConditions['tcpFlags'] = true;
            if (initialRule.dscp) initialConditions['dscp'] = true;
            if (initialRule.precedence) initialConditions['precedence'] = true;
            if (initialRule.tos) initialConditions['tos'] = true;
        }
        return initialConditions;
    });

    const updateRule = (updates: Partial<ACLAdvancedRule>) => setRule(prev => ({ ...prev, ...updates }));
    const toggleCondition = (key: string) => {
        const isEnabled = !conditions[key];
        setConditions(prev => ({ ...prev, [key]: isEnabled }));
        if (!isEnabled) {
            const resetMap: Record<string, Partial<ACLAdvancedRule>> = {
                'source': { sourceIsAny: true, sourceAddress: '', sourceWildcard: ''},
                'destination': { destinationIsAny: true, destinationAddress: '', destinationWildcard: ''},
                'sourcePort': { sourcePortOperator: undefined, sourcePort1: '', sourcePort2: '' },
                'destinationPort': { destinationPortOperator: undefined, destinationPort1: '', destinationPort2: '' },
                'icmp': { icmpType: '', icmpCode: '' },
                'established': { established: false },
                'tcpFlags': { tcpFlags: {} },
                'dscp': { dscp: '' },
                'precedence': { precedence: '' },
                'tos': { tos: '' },
            };
            if(resetMap[key]) updateRule(resetMap[key]);
        } else {
             if (key === 'source') updateRule({ sourceIsAny: false });
             if (key === 'destination') updateRule({ destinationIsAny: false });
        }
    };
    
    useEffect(() => {
        const newConditions: Record<string, boolean> = { ...conditions };
        let stateUpdates: Partial<ACLAdvancedRule> = {};
        const isTcpUdp = rule.protocol === 'tcp' || rule.protocol === 'udp';
        const isTcpOnly = rule.protocol === 'tcp';
        const isIcmpOnly = rule.protocol === 'icmp';

        if (!isTcpUdp && (newConditions['sourcePort'] || newConditions['destinationPort'])) {
            newConditions['sourcePort'] = false;
            newConditions['destinationPort'] = false;
            stateUpdates = { ...stateUpdates, sourcePortOperator: undefined, sourcePort1: '', sourcePort2: '', destinationPortOperator: undefined, destinationPort1: '', destinationPort2: '' };
        }
        if (!isTcpOnly && (newConditions['established'] || newConditions['tcpFlags'])) {
            newConditions['established'] = false;
            newConditions['tcpFlags'] = false;
            stateUpdates = { ...stateUpdates, established: false, tcpFlags: {} };
        }
        if (!isIcmpOnly && newConditions['icmp']) {
            newConditions['icmp'] = false;
            stateUpdates = { ...stateUpdates, icmpType: '', icmpCode: '' };
        }
        setConditions(newConditions);
        if (Object.keys(stateUpdates).length > 0) {
            updateRule(stateUpdates);
        }
    }, [rule.protocol]);


    const handleSave = () => { onSave(rule); onClose(); };

    const renderCondition = (key: string, label: string, children: React.ReactNode, disabled: boolean = false) => (
        <>
            <label className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer'}`}>
                <input type="checkbox" disabled={disabled} checked={!disabled && !!conditions[key]} onChange={() => toggleCondition(key)} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />
                <span className="text-sm font-medium text-slate-300">{label}</span>
            </label>
            {!disabled && conditions[key] && <div className="pl-7 pt-2">{children}</div>}
        </>
    );

    const isTcpUdp = rule.protocol === 'tcp' || rule.protocol === 'udp';
    const isTcpOnly = rule.protocol === 'tcp';
    const isIcmpOnly = rule.protocol === 'icmp';

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg w-full max-w-3xl h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">{isNewRule ? '添加' : '编辑'}高级ACL规则</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
                </div>
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {/* Top Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Field label="规则编号">
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="text" 
                                    placeholder={rule.autoRuleId ? "自动分配" : "0-65534"}
                                    disabled={rule.autoRuleId} 
                                    value={rule.autoRuleId ? '' : rule.ruleId || ''} 
                                    onChange={e => updateRule({ ruleId: e.target.value, autoRuleId: false })}
                                    className="flex-grow"
                                />
                                <Checkbox 
                                    label="自动编号" 
                                    checked={rule.autoRuleId} 
                                    onChange={e => updateRule({ autoRuleId: e.target.checked, ruleId: e.target.checked ? '' : rule.ruleId })} 
                                />
                            </div>
                        </Field>
                        <Field label="动作"><div className="flex"><button onClick={() => updateRule({ action: 'permit' })} className={`flex-1 px-3 py-1.5 text-sm rounded-l-md ${rule.action === 'permit' ? 'bg-blue-600 text-white' : 'bg-slate-600'}`}>允许</button><button onClick={() => updateRule({ action: 'deny' })} className={`flex-1 px-3 py-1.5 text-sm rounded-r-md ${rule.action === 'deny' ? 'bg-red-600 text-white' : 'bg-slate-600'}`}>拒绝</button></div></Field>
                    </div>
                    <Field label="描述"><textarea value={rule.description || ''} onChange={e => updateRule({ description: e.target.value })} placeholder="1-127个字符" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs h-16 resize-none" /></Field>
                    <Field label="IP协议类型"><Select value={rule.protocol} onChange={e => updateRule({ protocol: e.target.value })}>{PROTOCOL_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>

                    {/* Matching Conditions */}
                    <div className="space-y-3 pt-4 border-t border-slate-700">
                        <h4 className="text-base font-semibold text-slate-200">匹配条件</h4>
                        <div className="space-y-4">
                            {renderCondition('source', '匹配源IP地址/通配符掩码', <AddressField title="Source" ruleId={rule.id} isAny={rule.sourceIsAny} address={rule.sourceAddress} wildcard={rule.sourceWildcard} onUpdate={(u: any) => updateRule({ sourceIsAny: u.isAny, sourceAddress: u.address, sourceWildcard: u.wildcard })} />)}
                            {renderCondition('destination', '匹配目的IP地址/通配符掩码', <AddressField title="Destination" ruleId={rule.id} isAny={rule.destinationIsAny} address={rule.destinationAddress} wildcard={rule.destinationWildcard} onUpdate={(u: any) => updateRule({ destinationIsAny: u.isAny, destinationAddress: u.address, destinationWildcard: u.wildcard })} />)}
                            {renderCondition('sourcePort', '匹配TCP/UDP报文的源端口号', <div className="grid grid-cols-3 gap-2"><Field label="Operator"><Select value={rule.sourcePortOperator || ''} onChange={e => updateRule({ sourcePortOperator: e.target.value as any })}><option value="">-</option>{PORT_OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field><Field label="Port 1"><Input value={rule.sourcePort1 || ''} onChange={e => updateRule({ sourcePort1: e.target.value })} /></Field>{rule.sourcePortOperator === 'range' && <Field label="Port 2"><Input value={rule.sourcePort2 || ''} onChange={e => updateRule({ sourcePort2: e.target.value })} /></Field>}</div>, !isTcpUdp)}
                            {renderCondition('destinationPort', '匹配TCP/UDP报文的目的端口号', <div className="grid grid-cols-3 gap-2"><Field label="Operator"><Select value={rule.destinationPortOperator || ''} onChange={e => updateRule({ destinationPortOperator: e.target.value as any })}><option value="">-</option>{PORT_OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field><Field label="Port 1"><Input value={rule.destinationPort1 || ''} onChange={e => updateRule({ destinationPort1: e.target.value })} /></Field>{rule.destinationPortOperator === 'range' && <Field label="Port 2"><Input value={rule.destinationPort2 || ''} onChange={e => updateRule({ destinationPort2: e.target.value })} /></Field>}</div>, !isTcpUdp)}
                            {renderCondition('established', '匹配TCP报文的连接建立标识', <Checkbox label="Established" checked={!!rule.established} onChange={e => updateRule({ established: e.target.checked, tcpFlags: e.target.checked ? undefined : rule.tcpFlags })} />, !isTcpOnly)}
                            {renderCondition('icmp', '匹配ICMP报文的消息类型和消息码', <div className="grid grid-cols-2 gap-2"><Field label="Type"><Input value={rule.icmpType || ''} onChange={e => updateRule({ icmpType: e.target.value })} /></Field><Field label="Code"><Input value={rule.icmpCode || ''} onChange={e => updateRule({ icmpCode: e.target.value })} /></Field></div>, !isIcmpOnly)}
                            {renderCondition('dscp', '匹配DSCP优先级', <Field label="DSCP Value"><Input value={rule.dscp || ''} onChange={e => updateRule({ dscp: e.target.value })} placeholder="0-63 或 af11, cs1, etc."/></Field>)}
                            {renderCondition('precedence', '匹配IP优先级', <Field label="Precedence Value"><Input value={rule.precedence || ''} onChange={e => updateRule({ precedence: e.target.value })} placeholder="0-7 或 routine, priority, etc."/></Field>)}
                            {renderCondition('tos', '匹配ToS优先级', <Field label="ToS Value"><Input value={rule.tos || ''} onChange={e => updateRule({ tos: e.target.value })} placeholder="0-15 或 normal, min-delay, etc."/></Field>)}
                        </div>
                    </div>
                    {/* Other options */}
                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                        <Field label="规则生效时间段">
                            <Select value={rule.timeRange || ''} onChange={e => {
                                if (e.target.value === '__manage__') {
                                    onManageTimeRanges();
                                    setTimeout(() => e.target.value = rule.timeRange || '', 0);
                                } else {
                                    updateRule({ timeRange: e.target.value });
                                }
                            }}>
                                <option value="">无</option>
                                {(timeRanges || []).map(tr => <option key={tr.id} value={tr.name}>{tr.name}</option>)}
                                <option value="__manage__" className="italic text-blue-400 font-semibold">管理时间段...</option>
                            </Select>
                        </Field>
                        <Field label="VRF"><Input value={rule.vpnInstance || ''} onChange={e => updateRule({ vpnInstance: e.target.value })} placeholder="vpn-instance-name" /></Field>
                    </div>
                    <div className="flex items-center gap-6">
                        <Checkbox label="仅对分片报文的非首个分片有效" checked={rule.fragment} onChange={e => updateRule({ fragment: e.target.checked })} />
                        <Checkbox label="对符合条件的报文记录日志信息" checked={rule.logging} onChange={e => updateRule({ logging: e.target.checked })} />
                        <Checkbox label="开启本规则的匹配统计功能" checked={rule.counting} onChange={e => updateRule({ counting: e.target.checked })} />
                    </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md text-sm">取消</button><button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded-md text-sm">保存</button></div>
            </div>
        </div>
    );
};

const ACLConfig: React.FC<ACLConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.acl;
    const timeRanges = selectedNode.config.timeRanges || [];
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [isTimeRangeManagerOpen, setIsTimeRangeManagerOpen] = useState(false);
    const [editingAclId, setEditingAclId] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<ACLAdvancedRule | null>(null);

    const updateACLs = (acls: ACL[]) => { onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, acl: { ...config, acls } } }); };
    const addAcl = () => { const newAcl: ACL = { id: `acl-${Date.now()}`, number: '2000', name: '', type: 'basic', matchOrder: 'config', step: '5', rules: [] }; updateACLs([...config.acls, newAcl]); };
    const removeAcl = (id: string) => { updateACLs(config.acls.filter(acl => acl.id !== id)); };
    const updateAcl = (id: string, updates: Partial<ACL>) => {
        const newAcls = config.acls.map(acl => {
            if (acl.id === id) {
                const newAcl = { ...acl, ...updates };
                if ('number' in updates && updates.number) {
                    const newType = getAclType(updates.number);
                    if (acl.type !== newType) {
                        newAcl.type = newType;
                        newAcl.rules = []; // Clear rules when type changes
                    }
                }
                return newAcl;
            }
            return acl;
        });
        updateACLs(newAcls);
    };
    
    // For Basic ACL
    const addBasicRule = (aclId: string) => {
        const newRule: ACLBasicRule = { id: `rule-${Date.now()}`, action: 'permit', autoRuleId: true, logging: false, fragment: false, counting: false, sourceIsAny: true, sourceAddress: '', sourceWildcard: '' };
        updateACLs(config.acls.map(a => a.id === aclId ? { ...a, rules: [...a.rules, newRule] } : a));
    };
    const updateBasicRule = (aclId: string, ruleId: string, updates: Partial<ACLBasicRule>) => {
        updateACLs(config.acls.map(acl => acl.id === aclId ? { ...acl, rules: acl.rules.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule) } : acl));
    };
    const removeBasicRule = (aclId: string, ruleId: string) => {
        updateACLs(config.acls.map(acl => acl.id === aclId ? { ...acl, rules: acl.rules.filter(rule => rule.id !== ruleId) } : acl));
    };

    // For Advanced ACL (Modal)
    const handleOpenModal = (aclId: string, rule: ACLAdvancedRule | null) => {
        setEditingAclId(aclId);
        setEditingRule(rule);
        setIsRuleModalOpen(true);
    };
    const handleSaveRule = (ruleToSave: ACLAdvancedRule) => {
        if (!editingAclId) return;
        const acl = config.acls.find(a => a.id === editingAclId);
        if (!acl) return;
        const isExisting = acl.rules.some(r => r.id === ruleToSave.id);
        const newRules = isExisting
            ? acl.rules.map(r => r.id === ruleToSave.id ? ruleToSave : r)
            : [...acl.rules, ruleToSave];
        updateACLs(config.acls.map(a => a.id === editingAclId ? { ...a, rules: newRules } : a));
    };
    const removeAdvancedRule = (aclId: string, ruleId: string) => {
        updateACLs(config.acls.map(acl => acl.id === aclId ? { ...acl, rules: acl.rules.filter(rule => rule.id !== ruleId) } : acl));
    };

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">ACL (Access Control List)</h4></div>
                <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>
            </div>
            {isExpanded && config.enabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end"><button onClick={addAcl} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加 ACL</button></div>
                    {config.acls.map(acl => (
                        <div key={acl.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">ACL {acl.number} {acl.name && `(${acl.name})`} - <span className="capitalize">{acl.type}</span></h5><button onClick={() => removeAcl(acl.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button></div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="编号"><Input type="text" value={acl.number} onChange={e => updateAcl(acl.id, { number: e.target.value })}/></Field>
                                <Field label="名称 (可选)"><Input type="text" value={acl.name || ''} onChange={e => updateAcl(acl.id, { name: e.target.value })} /></Field>
                                <Field label="匹配顺序"><Select value={acl.matchOrder} onChange={e => updateAcl(acl.id, { matchOrder: e.target.value as any })}><option value="config">配置顺序 (config)</option><option value="auto">自动排序 (auto)</option></Select></Field>
                                <Field label="步长"><Input type="text" placeholder="5" value={acl.step || ''} onChange={e => updateAcl(acl.id, { step: e.target.value })} /></Field>
                            </div>
                            <div className="pt-2 border-t border-slate-700">
                                <div className="flex justify-between items-center mb-2"><h6 className="text-sm font-medium text-slate-400">规则</h6><button onClick={() => acl.type === 'basic' ? addBasicRule(acl.id) : handleOpenModal(acl.id, null)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">添加规则</button></div>
                                <div className="space-y-2">
                                    {acl.type === 'basic' ? 
                                        acl.rules.map((rule, index) => (<BasicRuleEditor key={rule.id} rule={rule as ACLBasicRule} vendor={selectedNode.vendor} updateRule={(ruleId, updates) => updateBasicRule(acl.id, ruleId, updates)} removeRule={(ruleId) => removeBasicRule(acl.id, ruleId)} index={index} timeRanges={timeRanges} onManageTimeRanges={() => setIsTimeRangeManagerOpen(true)} />)) : 
                                        acl.rules.map((rule, index) => {
                                            const advRule = rule as ACLAdvancedRule;
                                            const summary = `${advRule.action} ${advRule.protocol} ${advRule.sourceIsAny ? 'any' : advRule.sourceAddress} -> ${advRule.destinationIsAny ? 'any' : advRule.destinationAddress}`;
                                            return (<div key={rule.id} className="flex justify-between items-center p-2 bg-slate-900/50 rounded text-xs">
                                                <div className="flex-1 truncate"><span className="font-mono text-slate-400 mr-2">Rule {advRule.ruleId || index + 1}:</span><span className="text-slate-300">{summary}</span></div>
                                                <div className="flex gap-2"><button onClick={() => handleOpenModal(acl.id, advRule)} className="text-blue-400 hover:text-blue-300">编辑</button><button onClick={() => removeAdvancedRule(acl.id, advRule.id)} className="text-red-400 hover:text-red-300">删除</button></div>
                                            </div>);
                                        })
                                    }
                                </div>
                            </div>
                        </div>
                    ))}
                    <div><h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5><pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-48 min-h-[5rem]">{isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}</pre></div>
                </div>
            )}
            {isRuleModalOpen && editingAclId && <ACLRuleModal acl={config.acls.find(a=>a.id===editingAclId)!} initialRule={editingRule} onSave={handleSaveRule} onClose={() => setIsRuleModalOpen(false)} timeRanges={timeRanges} onManageTimeRanges={() => setIsTimeRangeManagerOpen(true)} />}
            {isTimeRangeManagerOpen && <TimeRangeManagerModal timeRanges={timeRanges} selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} onClose={() => setIsTimeRangeManagerOpen(false)} />}
        </div>
    );
};

export default ACLConfig;