import React, { useState, useCallback, useEffect } from 'react';
import { Node, NATStaticOutboundRule, Vendor, NATPortMappingRule, NATAddressPool, NATMappingType, NATServerGroup, NATServerGroupMember, HuaweiNATConfig, HuaweiNATAddressPoolSection, HuaweiNATServer, DeviceType } from '../../types';
import { SpinnerIcon } from '../Icons';

interface NATConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

type H3CActiveTab = 'port-mapping' | 'static-translation' | 'address-pool';
type HuaweiActiveTab = 'source' | 'destination';

const Field = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (
    <div className={className}>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
);
const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
        <input type="checkbox" {...props} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"/>
        {label}
    </label>
);

const NATServerGroupModal = ({ isOpen, onClose, serverGroups: initialServerGroups, onSave }: { isOpen: boolean, onClose: () => void, serverGroups: NATServerGroup[], onSave: (groups: NATServerGroup[]) => void }) => {
    const [serverGroups, setServerGroups] = useState<NATServerGroup[]>(() => JSON.parse(JSON.stringify(initialServerGroups)));
    
    useEffect(() => {
        setServerGroups(JSON.parse(JSON.stringify(initialServerGroups)));
    }, [initialServerGroups, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => onSave(serverGroups);
    
    const addGroup = () => setServerGroups([...serverGroups, { id: `sg-${Date.now()}`, groupId: `${serverGroups.length + 1}`, members: [] }]);
    const updateGroup = (index: number, updates: Partial<NATServerGroup>) => {
        const newGroups = [...serverGroups];
        newGroups[index] = { ...newGroups[index], ...updates };
        setServerGroups(newGroups);
    };
    const removeGroup = (index: number) => setServerGroups(serverGroups.filter((_, i) => i !== index));

    const addMember = (groupIndex: number) => {
        const newMember: NATServerGroupMember = { id: `sgm-${Date.now()}`, ip: '', port: '80', weight: '100' };
        const newGroups = [...serverGroups];
        newGroups[groupIndex].members.push(newMember);
        setServerGroups(newGroups);
    };
    const updateMember = (groupIndex: number, memberIndex: number, updates: Partial<NATServerGroupMember>) => {
        const newGroups = [...serverGroups];
        newGroups[groupIndex].members[memberIndex] = { ...newGroups[groupIndex].members[memberIndex], ...updates };
        setServerGroups(newGroups);
    };
    const removeMember = (groupIndex: number, memberIndex: number) => {
        const newGroups = [...serverGroups];
        newGroups[groupIndex].members = newGroups[groupIndex].members.filter((_, i) => i !== memberIndex);
        setServerGroups(newGroups);
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-600 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold p-4 border-b border-slate-700">管理NAT服务器组</h3>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {serverGroups.map((sg, gIndex) => (
                        <div key={sg.id} className="bg-slate-700/50 p-3 rounded-lg space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Field label="服务器组ID"><Input value={sg.groupId} onChange={e => updateGroup(gIndex, { groupId: e.target.value })} className="w-24"/></Field>
                                </div>
                                <button onClick={() => removeGroup(gIndex)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">删除组</button>
                            </div>
                            <div className="pl-4 space-y-2 border-l-2 border-slate-600">
                                {sg.members.map((member, mIndex) => (
                                    <div key={member.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                                        <Field label="成员IP地址"><Input value={member.ip} onChange={e => updateMember(gIndex, mIndex, { ip: e.target.value })}/></Field>
                                        <Field label="端口"><Input value={member.port} onChange={e => updateMember(gIndex, mIndex, { port: e.target.value })}/></Field>
                                        <Field label="权重"><Input value={member.weight} onChange={e => updateMember(gIndex, mIndex, { weight: e.target.value })}/></Field>
                                        <button onClick={() => removeMember(gIndex, mIndex)} className="px-2 py-1.5 bg-red-600 text-white text-xs rounded">移除</button>
                                    </div>
                                ))}
                                <button onClick={() => addMember(gIndex)} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加成员</button>
                            </div>
                        </div>
                    ))}
                    <button onClick={addGroup} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">添加服务器组</button>
                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md text-sm">取消</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 rounded-md text-sm">保存并关闭</button>
                </div>
            </div>
        </div>
    );
};

const PortMappingRuleForm = ({ rule, updateRule, availableInterfaces, acls, serverGroups, onManageServerGroups }: {
    rule: NATPortMappingRule,
    updateRule: (updates: Partial<NATPortMappingRule>) => void,
    availableInterfaces: string[],
    acls: Node['config']['acl']['acls'],
    serverGroups: NATServerGroup[],
    onManageServerGroups: () => void
}) => {
    const renderGlobalFields = () => (
        <div className="p-3 bg-slate-800/60 rounded-lg space-y-3">
            <h6 className="text-sm font-semibold text-slate-300">外网信息 (Global)</h6>
            {[  NATMappingType.SINGLE_GLOBAL_IP_NO_PORT, NATMappingType.SINGLE_GLOBAL_IP_RANGE_PORT ].includes(rule.mappingType) && (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="外网地址类型">
                        <Select value={rule.globalAddressType} onChange={e => updateRule({ globalAddressType: e.target.value as any })}>
                            <option value="ip">指定IP地址</option>
                            <option value="interface">使用接口IP</option>
                        </Select>
                    </Field>
                    {rule.globalAddressType === 'ip' && <Field label="外网地址"><Input value={rule.globalAddress || ''} onChange={e => updateRule({ globalAddress: e.target.value })} /></Field>}
                </div>
            )}
            {[ NATMappingType.RANGE_GLOBAL_IP_NO_PORT, NATMappingType.RANGE_GLOBAL_IP_SINGLE_PORT ].includes(rule.mappingType) && (
                 <div className="grid grid-cols-2 gap-3">
                    <Field label="外网起始地址"><Input value={rule.globalAddress || ''} onChange={e => updateRule({ globalAddress: e.target.value })} /></Field>
                    <Field label="外网结束地址"><Input value={rule.globalEndAddress || ''} onChange={e => updateRule({ globalEndAddress: e.target.value })} /></Field>
                </div>
            )}
            {[ NATMappingType.SINGLE_GLOBAL_IP_NO_PORT, NATMappingType.RANGE_GLOBAL_IP_SINGLE_PORT ].includes(rule.mappingType) && (
                <Field label="外网端口"><Input value={rule.globalPort || ''} onChange={e => updateRule({ globalPort: e.target.value })} placeholder="为空则不转换端口"/></Field>
            )}
            {[ NATMappingType.SINGLE_GLOBAL_IP_RANGE_PORT ].includes(rule.mappingType) && (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="外网起始端口"><Input value={rule.globalStartPort || ''} onChange={e => updateRule({ globalStartPort: e.target.value })} /></Field>
                    <Field label="外网结束端口"><Input value={rule.globalEndPort || ''} onChange={e => updateRule({ globalEndPort: e.target.value })} /></Field>
                </div>
            )}
        </div>
    );

    const renderInsideFields = () => (
        <div className="p-3 bg-slate-800/60 rounded-lg space-y-3">
            <h6 className="text-sm font-semibold text-slate-300">内网信息 (Inside)</h6>
            {[ NATMappingType.SINGLE_GLOBAL_IP_NO_PORT, NATMappingType.ACL_BASED ].includes(rule.mappingType) && (
                 <div className="grid grid-cols-2 gap-3">
                    <Field label="内网服务器IP"><Input value={rule.localAddress || ''} onChange={e => updateRule({ localAddress: e.target.value })} /></Field>
                    <Field label="内网端口"><Input value={rule.localPort || ''} onChange={e => updateRule({ localPort: e.target.value })} placeholder="为空则与外网端口相同"/></Field>
                </div>
            )}
            {[ NATMappingType.SINGLE_GLOBAL_IP_RANGE_PORT, NATMappingType.RANGE_GLOBAL_IP_NO_PORT, NATMappingType.RANGE_GLOBAL_IP_SINGLE_PORT ].includes(rule.mappingType) && (
                <div className="grid grid-cols-2 gap-3">
                    <Field label="内网起始地址/IP"><Input value={rule.localAddress || ''} onChange={e => updateRule({ localAddress: e.target.value })}/></Field>
                    <Field label="内网结束地址 (可选)"><Input value={rule.localEndAddress || ''} onChange={e => updateRule({ localEndAddress: e.target.value })}/></Field>
                    <Field label="内网起始端口/端口"><Input value={rule.localStartPort || ''} onChange={e => updateRule({ localStartPort: e.target.value })}/></Field>
                    <Field label="内网结束端口 (可选)"><Input value={rule.localEndPort || ''} onChange={e => updateRule({ localEndPort: e.target.value })}/></Field>
                </div>
            )}
            {rule.mappingType === NATMappingType.LOAD_BALANCING && (
                 <Field label="内网服务器组">
                     <Select value={rule.serverGroupId || ''} onChange={e => e.target.value === '__manage__' ? onManageServerGroups() : updateRule({ serverGroupId: e.target.value })}>
                         <option value="">-- 选择服务器组 --</option>
                         {serverGroups.map(sg => <option key={sg.id} value={sg.groupId}>{sg.groupId}</option>)}
                         <option value="__manage__" className="italic text-blue-400">管理服务器组...</option>
                     </Select>
                 </Field>
            )}
        </div>
    );
    
    return (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
                <Field label="策略名称 (可选)"><Input value={rule.policyName || ''} onChange={e => updateRule({ policyName: e.target.value })} /></Field>
                <Field label="应用接口"><Select value={rule.interfaceName} onChange={e => updateRule({ interfaceName: e.target.value })}><option value="">-- 选择接口 --</option>{availableInterfaces.map(name => <option key={name} value={name}>{name}</option>)}</Select></Field>
            </div>
            <Field label="映射方式"><Select value={rule.mappingType} onChange={e => updateRule({ mappingType: e.target.value as NATMappingType })}>{Object.values(NATMappingType).map(v => <option key={v} value={v}>{v}</option>)}</Select></Field>

            { rule.mappingType !== NATMappingType.ACL_BASED &&
                <Field label="协议类型">
                    <Select value={rule.protocol} onChange={e => updateRule({ protocol: e.target.value as any })}>
                        <option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option><option value="all">ALL</option>
                    </Select>
                </Field>
            }

            { rule.mappingType !== NATMappingType.ACL_BASED && renderGlobalFields() }
            { renderInsideFields() }
            
             <div className="p-3 bg-slate-800/60 rounded-lg space-y-3">
                 <h6 className="text-sm font-semibold text-slate-300">选项</h6>
                 <Field label="ACL (可选)">
                    <Select value={rule.aclId || ''} onChange={e => updateRule({ aclId: e.target.value })}>
                        <option value="">无</option>
                        {acls.map(acl => (<option key={acl.id} value={acl.id}>{acl.number} {acl.name && `(${acl.name})`}</option>))}
                    </Select>
                 </Field>
                 <Checkbox label="Reversible (支持私网侧主动访问外网)" checked={!!rule.reversible} onChange={e => updateRule({ reversible: e.target.checked })}/>
            </div>
        </div>
    );
}

const H3C_NATConfig: React.FC<NATConfigProps> = ({ selectedNode, onNodeUpdate, isGenerating }) => {
    const [activeTab, setActiveTab] = useState<H3CActiveTab>('port-mapping');
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [isServerGroupModalOpen, setIsServerGroupModalOpen] = useState(false);

    const config = selectedNode.config.nat;
    const acls = selectedNode.config.acl.acls;

    const previewCli = config.cli;

    const updateNATConfig = useCallback((updates: Partial<Node['config']['nat']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, nat: { ...selectedNode.config.nat, ...updates } } });
    }, [selectedNode, onNodeUpdate]);

    const handleSaveServerGroups = (updatedGroups: NATServerGroup[]) => {
        updateNATConfig({ serverGroups: updatedGroups });
        setIsServerGroupModalOpen(false);
    };

    // --- Static Outbound Callbacks ---
    const updateStaticOutbound = useCallback((updates: Partial<Node['config']['nat']['staticOutbound']>) => {
        updateNATConfig({ staticOutbound: { ...config.staticOutbound, ...updates } });
    }, [config.staticOutbound, updateNATConfig]);
    const addStaticRule = () => {
        const newRule: NATStaticOutboundRule = { id: `nat-static-${Date.now()}`, type: 'one-to-one', localIp: '192.168.1.10', globalIp: '10.1.1.10' };
        updateStaticOutbound({ rules: [...config.staticOutbound.rules, newRule] });
        setEditingRuleId(newRule.id);
    };
    const updateStaticRule = (id: string, updates: Partial<NATStaticOutboundRule>) => {
        const newRules = config.staticOutbound.rules.map(r => r.id === id ? { ...r, ...updates } : r);
        updateStaticOutbound({ rules: newRules });
    };
    const removeStaticRule = (id: string) => {
        const newRules = config.staticOutbound.rules.filter(r => r.id !== id);
        updateStaticOutbound({ rules: newRules });
        if (editingRuleId === id) setEditingRuleId(null);
    };

    // --- Port Mapping Callbacks ---
    const updatePortMapping = useCallback((updates: Partial<Node['config']['nat']['portMapping']>) => {
        updateNATConfig({ portMapping: { ...config.portMapping, ...updates } });
    }, [config.portMapping, updateNATConfig]);
    const addPortMappingRule = () => {
        const newRule: NATPortMappingRule = {
            id: `nat-pm-${Date.now()}`, 
            interfaceName: '', 
            protocol: 'tcp',
            mappingType: NATMappingType.SINGLE_GLOBAL_IP_NO_PORT,
            globalAddressType: 'ip',
            globalAddress: '', 
            localAddress: '',
        };
        updatePortMapping({ rules: [...config.portMapping.rules, newRule] });
        setEditingRuleId(newRule.id);
    };
    const updatePortMappingRule = (id: string, updates: Partial<NATPortMappingRule>) => {
        const newRules = config.portMapping.rules.map(r => r.id === id ? { ...r, ...updates } : r);
        updatePortMapping({ rules: newRules });
    };
    const removePortMappingRule = (id: string) => {
        const newRules = config.portMapping.rules.filter(r => r.id !== id);
        updatePortMapping({ rules: newRules });
        if (editingRuleId === id) setEditingRuleId(null);
    };

    // --- Address Pool Callbacks ---
    const updateAddressPoolConfig = useCallback((updates: Partial<Node['config']['nat']['addressPool']>) => {
        updateNATConfig({ addressPool: { ...config.addressPool, ...updates } });
    }, [config.addressPool, updateNATConfig]);

    const addAddressPool = () => {
        const newPool: NATAddressPool = {
            id: `nat-ap-${Date.now()}`,
            groupId: `${config.addressPool.pools.length + 1}`,
            name: `pool${config.addressPool.pools.length + 1}`,
            startAddress: '202.100.1.1',
            endAddress: '202.100.1.10'
        };
        updateAddressPoolConfig({ pools: [...config.addressPool.pools, newPool] });
    };

    const updateAddressPool = (id: string, updates: Partial<NATAddressPool>) => {
        const newPools = config.addressPool.pools.map(p => p.id === id ? { ...p, ...updates } : p);
        updateAddressPoolConfig({ pools: newPools });
    };

    const removeAddressPool = (id: string) => {
        updateAddressPoolConfig({ pools: config.addressPool.pools.filter(p => p.id !== id) });
    };
     const availableInterfaces = [
        ...selectedNode.config.interfaceIP.interfaces.map(i => i.interfaceName),
        ...selectedNode.config.vlan.vlanInterfaces.map(v => {
            switch (selectedNode.vendor) {
                case Vendor.H3C: return `Vlan-interface${v.vlanId}`;
                case Vendor.Huawei: return `Vlanif${v.vlanId}`;
                case Vendor.Cisco: return `Vlan${v.vlanId}`;
                default: return `Vlan-interface${v.vlanId}`;
            }
        })
    ].filter(Boolean);

    const renderPortMapping = () => {
        return (
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-400">配置内部服务器端口映射 (nat server)。</p>
                    <button onClick={addPortMappingRule} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                        添加规则
                    </button>
                </div>
                 {config.portMapping.rules.map((rule) => (
                     <div key={rule.id} className="bg-slate-800/50 p-3 rounded-lg">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}>
                             <div className="flex items-center gap-2">
                                <span className={`transition-transform text-slate-400 ${editingRuleId === rule.id ? 'rotate-90' : ''}`}>▶</span>
                                <span className="text-sm font-medium">{rule.policyName || rule.interfaceName || '(新规则)'}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removePortMappingRule(rule.id); }} className="text-red-400 hover:text-red-300 text-xs">删除</button>
                        </div>
                         {editingRuleId === rule.id && (
                             <PortMappingRuleForm
                                rule={rule}
                                updateRule={(updates) => updatePortMappingRule(rule.id, updates)}
                                availableInterfaces={availableInterfaces}
                                acls={acls}
                                serverGroups={config.serverGroups}
                                onManageServerGroups={() => setIsServerGroupModalOpen(true)}
                             />
                         )}
                     </div>
                 ))}
             </div>
        );
    };

    const renderStaticTranslation = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-400">配置出方向静态地址转换 (nat static outbound)。</p>
                <button onClick={addStaticRule} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                    添加映射
                </button>
            </div>
            {config.staticOutbound.rules.map((rule) => (
                <div key={rule.id} className="bg-slate-800/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}>
                        <div className="flex items-center gap-2">
                            <span className={`transition-transform text-slate-400 ${editingRuleId === rule.id ? 'rotate-90' : ''}`}>▶</span>
                            <span className="text-sm font-medium">
                                {rule.type === 'one-to-one' && `一对一: ${rule.localIp || '...'} -> ${rule.globalIp || '...'}`}
                                {rule.type === 'net-to-net' && `网段对网段: ${rule.localStartIp || '...'}-... -> ${rule.globalNetwork || '...'}`}
                                {rule.type === 'address-group' && `地址组: ${rule.localAddressGroup || '...'} -> ${rule.globalAddressGroup || '...'}`}
                            </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeStaticRule(rule.id); }} className="text-red-400 hover:text-red-300 text-xs">删除</button>
                    </div>

                    {editingRuleId === rule.id && (
                        <div className="mt-3 pt-3 border-t border-slate-700 space-y-3 text-xs">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2"><input type="radio" value="one-to-one" checked={rule.type === 'one-to-one'} onChange={() => updateStaticRule(rule.id, { type: 'one-to-one' })} /> 一对一</label>
                                <label className="flex items-center gap-2"><input type="radio" value="net-to-net" checked={rule.type === 'net-to-net'} onChange={() => updateStaticRule(rule.id, { type: 'net-to-net' })} /> 网段对网段</label>
                                <label className="flex items-center gap-2"><input type="radio" value="address-group" checked={rule.type === 'address-group'} onChange={() => updateStaticRule(rule.id, { type: 'address-group' })} /> 地址对象组</label>
                            </div>
                            {rule.type === 'one-to-one' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="内网地址 (Local IP)"><Input type="text" value={rule.localIp || ''} onChange={e => updateStaticRule(rule.id, { localIp: e.target.value })} /></Field>
                                    <Field label="外网地址 (Global IP)"><Input type="text" value={rule.globalIp || ''} onChange={e => updateStaticRule(rule.id, { globalIp: e.target.value })} /></Field>
                                </div>
                            )}
                            {rule.type === 'net-to-net' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="内网起始地址"><Input type="text" value={rule.localStartIp || ''} onChange={e => updateStaticRule(rule.id, { localStartIp: e.target.value })} /></Field>
                                        <Field label="内网结束地址"><Input type="text" value={rule.localEndIp || ''} onChange={e => updateStaticRule(rule.id, { localEndIp: e.target.value })} /></Field>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label="外网网络"><Input type="text" value={rule.globalNetwork || ''} onChange={e => updateStaticRule(rule.id, { globalNetwork: e.target.value })} /></Field>
                                        <Field label="外网掩码"><Input type="text" value={rule.globalMask || ''} onChange={e => updateStaticRule(rule.id, { globalMask: e.target.value })} /></Field>
                                    </div>
                                </div>
                            )}
                             {rule.type === 'address-group' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="内网地址组 (Local)">
                                        <Select value={rule.localAddressGroup || ''} onChange={e => updateStaticRule(rule.id, { localAddressGroup: e.target.value })}>
                                            <option value="">-- 选择地址池 --</option>
                                            {config.addressPool.pools.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                        </Select>
                                    </Field>
                                    <Field label="外网地址组 (Global)">
                                        <Select value={rule.globalAddressGroup || ''} onChange={e => updateStaticRule(rule.id, { globalAddressGroup: e.target.value })}>
                                             <option value="">-- 选择地址池 --</option>
                                             {config.addressPool.pools.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                        </Select>
                                    </Field>
                                </div>
                            )}
                            <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50">
                                <Field label="ACL (可选)">
                                    <Select value={rule.aclId || ''} onChange={e => updateStaticRule(rule.id, { aclId: e.target.value })}>
                                        <option value="">无</option>
                                        {acls.filter(a => a.type === 'advanced').map(acl => (
                                            <option key={acl.id} value={acl.id}>{acl.number} {acl.name && `(${acl.name})`}</option>
                                        ))}
                                    </Select>
                                </Field>
                                <div className="mt-5">
                                    <Checkbox label="Reversible" checked={!!rule.reversible} onChange={e => updateStaticRule(rule.id, { reversible: e.target.checked })} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderAddressPool = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-400">配置NAT地址池 (nat address-group)。</p>
                <button onClick={addAddressPool} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                    添加地址池
                </button>
            </div>
            <div className="space-y-2">
                {config.addressPool.pools.map((pool) => (
                    <div key={pool.id} className="bg-slate-800/50 p-3 rounded-lg grid grid-cols-[0.5fr_1.5fr_1fr_1fr_auto] gap-3 items-end">
                        <Field label="ID"><Input value={pool.groupId} onChange={e => updateAddressPool(pool.id, { groupId: e.target.value })} /></Field>
                        <Field label="名称 (可选)"><Input value={pool.name || ''} onChange={e => updateAddressPool(pool.id, { name: e.target.value })} /></Field>
                        <Field label="起始地址"><Input value={pool.startAddress} onChange={e => updateAddressPool(pool.id, { startAddress: e.target.value })} /></Field>
                        <Field label="结束地址"><Input value={pool.endAddress} onChange={e => updateAddressPool(pool.id, { endAddress: e.target.value })} /></Field>
                        <button onClick={() => removeAddressPool(pool.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md h-fit">删除</button>
                    </div>
                ))}
                {config.addressPool.pools.length === 0 && <p className="text-xs text-slate-500 text-center py-4">暂无地址池。</p>}
            </div>
        </div>
    );

    const tabs: { id: H3CActiveTab, label: string }[] = [
        { id: 'port-mapping', label: '端口映射' },
        { id: 'static-translation', label: 'NAT静态转换' },
        { id: 'address-pool', label: '地址池' },
    ];

    return (
        <>
            <div className="border-b border-slate-600 flex">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="pt-2">
                {activeTab === 'port-mapping' && renderPortMapping()}
                {activeTab === 'static-translation' && renderStaticTranslation()}
                {activeTab === 'address-pool' && renderAddressPool()}
            </div>
            {isServerGroupModalOpen && <NATServerGroupModal isOpen={isServerGroupModalOpen} onClose={() => setIsServerGroupModalOpen(false)} serverGroups={config.serverGroups} onSave={handleSaveServerGroups}/>}
        </>
    );
}

const Huawei_NATConfig: React.FC<NATConfigProps> = ({ selectedNode, onNodeUpdate, isGenerating }) => {
    const [activeTab, setActiveTab] = useState<HuaweiActiveTab>('source');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    const config = selectedNode.config.nat;
    const huaweiConfig = config.huawei!;

    const updateHuaweiConfig = useCallback((updates: Partial<HuaweiNATConfig>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, nat: { ...config, huawei: { ...config.huawei!, ...updates } } } });
    }, [selectedNode, onNodeUpdate, config]);
    
    // --- Address Pool Callbacks ---
    const addAddressPool = () => {
        const newPool = { id: `pool-${Date.now()}`, groupName: `pool${huaweiConfig.addressPools.length + 1}`, sections: [{ id: `sec-${Date.now()}`, startAddress: '', endAddress: '' }], mode: 'pat' as const, routeEnable: false };
        updateHuaweiConfig({ addressPools: [...huaweiConfig.addressPools, newPool] });
    };
    const updateAddressPool = (index: number, updates: any) => {
        const newPools = [...huaweiConfig.addressPools];
        newPools[index] = { ...newPools[index], ...updates };
        updateHuaweiConfig({ addressPools: newPools });
    };
    const removeAddressPool = (index: number) => {
        updateHuaweiConfig({ addressPools: huaweiConfig.addressPools.filter((_, i) => i !== index) });
    };
    const addAddressPoolSection = (poolIndex: number) => {
        const newPools = [...huaweiConfig.addressPools];
        const newSection: HuaweiNATAddressPoolSection = { id: `sec-${Date.now()}`, startAddress: '', endAddress: '' };
        newPools[poolIndex].sections.push(newSection);
        updateHuaweiConfig({ addressPools: newPools });
    }
    const removeAddressPoolSection = (poolIndex: number, sectionIndex: number) => {
        const newPools = [...huaweiConfig.addressPools];
        newPools[poolIndex].sections = newPools[poolIndex].sections.filter((_, i) => i !== sectionIndex);
        updateHuaweiConfig({ addressPools: newPools });
    }
    
    // --- Policy Rule Callbacks ---
    const addRule = () => {
        const newRule = { id: `rule-${Date.now()}`, ruleName: `rule${huaweiConfig.rules.length + 1}`, action: 'source-nat' as const };
        updateHuaweiConfig({ rules: [...huaweiConfig.rules, newRule] });
    };
    const updateRule = (index: number, updates: any) => {
        const newRules = [...huaweiConfig.rules];
        newRules[index] = { ...newRules[index], ...updates };
        updateHuaweiConfig({ rules: newRules });
    };
    const removeRule = (index: number) => {
        updateHuaweiConfig({ rules: huaweiConfig.rules.filter((_, i) => i !== index) });
    };

    // --- NAT Server Callbacks ---
    const addServer = () => {
        const newServer: HuaweiNATServer = { 
            id: `server-${Date.now()}`, 
            name: `server${huaweiConfig.servers.length + 1}`, 
            protocol: 'any',
            globalAddressType: 'ip',
            globalAddress: '',
            insideHostAddress: '',
        };
        updateHuaweiConfig({ servers: [...huaweiConfig.servers, newServer] });
    };
    const updateServer = (index: number, updates: any) => {
        const newServers = [...huaweiConfig.servers];
        newServers[index] = { ...newServers[index], ...updates };
        updateHuaweiConfig({ servers: newServers });
    };
    const removeServer = (index: number) => {
        updateHuaweiConfig({ servers: huaweiConfig.servers.filter((_, i) => i !== index) });
    };

    const renderSourceNAT = () => (
        <div className="space-y-6">
            {/* Address Pools */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h5 className="text-base font-semibold text-slate-300">源NAT地址池</h5>
                    <button onClick={addAddressPool} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">添加地址池</button>
                </div>
                <div className="space-y-3">
                    {huaweiConfig.addressPools.map((pool, index) => (
                        <div key={pool.id} className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingItemId(editingItemId === pool.id ? null : pool.id)}>
                                <span className="text-sm font-medium">{pool.groupName}</span>
                                <button onClick={(e) => { e.stopPropagation(); removeAddressPool(index); }} className="text-red-400 hover:text-red-300 text-xs">删除</button>
                            </div>
                            {editingItemId === pool.id && (
                                <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="地址池名称"><Input value={pool.groupName} onChange={e => updateAddressPool(index, { groupName: e.target.value })}/></Field>
                                        <Field label="地址池编号 (可选)"><Input value={pool.groupNumber || ''} onChange={e => updateAddressPool(index, { groupNumber: e.target.value })}/></Field>
                                    </div>
                                    <Field label="地址段">
                                        {pool.sections.map((sec, sIndex) => (
                                            <div key={sec.id} className="grid grid-cols-[0.5fr_1fr_1fr_auto] gap-2 items-end mb-1">
                                                <Input placeholder="ID" value={sec.sectionId || ''} onChange={e => { const newSecs = [...pool.sections]; newSecs[sIndex].sectionId = e.target.value; updateAddressPool(index, { sections: newSecs }); }} />
                                                <Input placeholder="起始IP" value={sec.startAddress} onChange={e => { const newSecs = [...pool.sections]; newSecs[sIndex].startAddress = e.target.value; updateAddressPool(index, { sections: newSecs }); }} />
                                                <Input placeholder="结束IP (可选)" value={sec.endAddress || ''} onChange={e => { const newSecs = [...pool.sections]; newSecs[sIndex].endAddress = e.target.value; updateAddressPool(index, { sections: newSecs }); }} />
                                                <button onClick={() => removeAddressPoolSection(index, sIndex)} className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md h-fit">Del</button>
                                            </div>
                                        ))}
                                        <button onClick={() => addAddressPoolSection(index)} className="px-2 py-1 mt-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加地址段</button>
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="地址池模式">
                                            <Select value={pool.mode} onChange={e => updateAddressPool(index, { mode: e.target.value as any })}>
                                                <option value="pat">PAT</option>
                                                <option value="no-pat-global">No-PAT Global</option>
                                                <option value="no-pat-local">No-PAT Local</option>
                                            </Select>
                                        </Field>
                                        <div className="flex items-end pb-1">
                                            <Checkbox label="启用黑洞路由" checked={pool.routeEnable} onChange={e => updateAddressPool(index, { routeEnable: e.target.checked })} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Policy Rules */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h5 className="text-base font-semibold text-slate-300">源NAT策略</h5>
                    <button onClick={addRule} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">添加规则</button>
                </div>
                <div className="space-y-3">
                     {huaweiConfig.rules.map((rule, index) => (
                        <div key={rule.id} className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingItemId(editingItemId === rule.id ? null : rule.id)}>
                                <span className="text-sm font-medium">{rule.ruleName}</span>
                                <button onClick={(e) => { e.stopPropagation(); removeRule(index); }} className="text-red-400 hover:text-red-300 text-xs">删除</button>
                            </div>
                            {editingItemId === rule.id && (
                                <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                                    <Field label="规则名称"><Input value={rule.ruleName} onChange={e => updateRule(index, { ruleName: e.target.value })} /></Field>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="源地址"><Input value={rule.sourceAddress || ''} onChange={e => updateRule(index, { sourceAddress: e.target.value })} placeholder="192.168.1.0" /></Field>
                                        <Field label="源掩码"><Input value={rule.sourceMask || ''} onChange={e => updateRule(index, { sourceMask: e.target.value })} placeholder="24" /></Field>
                                    </div>
                                    {!(rule.action === 'source-nat' && rule.easyIp) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="目的地址"><Input value={rule.destinationAddress || ''} onChange={e => updateRule(index, { destinationAddress: e.target.value })} placeholder="Any" /></Field>
                                            <Field label="目的掩码"><Input value={rule.destinationMask || ''} onChange={e => updateRule(index, { destinationMask: e.target.value })} placeholder="0" /></Field>
                                        </div>
                                    )}
                                    <Field label="动作">
                                        <Select value={rule.action} onChange={e => updateRule(index, { action: e.target.value as any })}>
                                            <option value="source-nat">源NAT</option>
                                            <option value="no-nat">不执行NAT</option>
                                        </Select>
                                    </Field>
                                    {rule.action === 'source-nat' && (
                                        <div className="pl-4 border-l-2 border-slate-600 space-y-2">
                                            <label className="flex items-center gap-2"><input type="radio" name={`nat-type-${rule.id}`} checked={!rule.easyIp} onChange={() => updateRule(index, { easyIp: false })} /> 使用地址池</label>
                                            <Select value={rule.natAddressGroup || ''} disabled={!!rule.easyIp} onChange={e => updateRule(index, { natAddressGroup: e.target.value })}>
                                                <option value="">选择地址池</option>
                                                {huaweiConfig.addressPools.map(p => <option key={p.id} value={p.groupName}>{p.groupName}</option>)}
                                            </Select>
                                            <label className="flex items-center gap-2"><input type="radio" name={`nat-type-${rule.id}`} checked={!!rule.easyIp} onChange={() => updateRule(index, { easyIp: true, natAddressGroup: undefined })}/> Easy IP (使用出接口地址)</label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const renderDestinationNAT = () => {
        return (
            <div>
               <div className="flex justify-between items-center mb-2">
                   <h5 className="text-base font-semibold text-slate-300">目的NAT (NAT Server)</h5>
                   <button onClick={addServer} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">添加NAT Server</button>
               </div>
               <div className="space-y-3">
                   {huaweiConfig.servers.map((server, index) => {
                       const needsPort = server.protocol === 'tcp' || server.protocol === 'udp' || server.protocol === 'sctp';
                       return (
                           <div key={server.id} className="bg-slate-800/50 p-3 rounded-lg">
                               <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingItemId(editingItemId === server.id ? null : server.id)}>
                                   <span className="text-sm font-medium">{server.name}</span>
                                   <button onClick={(e) => { e.stopPropagation(); removeServer(index); }} className="text-red-400 hover:text-red-300 text-xs">删除</button>
                               </div>
                               {editingItemId === server.id && (
                                   <div className="mt-3 pt-3 border-t border-slate-700 space-y-4">
                                       <div className={`grid ${selectedNode.type === DeviceType.Firewall ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                           <Field label="名称"><Input value={server.name} onChange={e => updateServer(index, { name: e.target.value })} /></Field>
                                           {selectedNode.type === DeviceType.Firewall && (
                                               <Field label="区域 (Zone)"><Input value={server.zone || ''} onChange={e => updateServer(index, { zone: e.target.value })} placeholder="例如: untrust" /></Field>
                                           )}
                                       </div>
                                        <Field label="协议">
                                           <Select value={server.protocol} onChange={e => updateServer(index, { protocol: e.target.value as any })}>
                                               <option value="any">any</option><option value="tcp">tcp</option><option value="udp">udp</option><option value="icmp">icmp</option><option value="sctp">sctp</option>
                                           </Select>
                                       </Field>
                                       
                                       {/* Global Config */}
                                       <div className="p-3 bg-slate-700/30 rounded-lg space-y-3">
                                           <h6 className="text-sm font-semibold text-slate-300">公网信息 (Global)</h6>
                                           <Field label="地址类型">
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2"><input type="radio" value="ip" checked={server.globalAddressType === 'ip'} onChange={e => updateServer(index, { globalAddressType: 'ip' })} /> IP地址</label>
                                                    <label className="flex items-center gap-2"><input type="radio" value="interface" checked={server.globalAddressType === 'interface'} onChange={e => updateServer(index, { globalAddressType: 'interface' })} /> 接口</label>
                                                </div>
                                           </Field>
                                           {server.globalAddressType === 'ip' ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="公网地址"><Input value={server.globalAddress || ''} onChange={e => updateServer(index, { globalAddress: e.target.value })} /></Field>
                                                    <Field label="公网结束地址 (可选)"><Input value={server.globalAddressEnd || ''} onChange={e => updateServer(index, { globalAddressEnd: e.target.value })} /></Field>
                                                </div>
                                           ) : (
                                                <Field label="接口名称"><Input value={server.globalInterface || ''} onChange={e => updateServer(index, { globalInterface: e.target.value })} placeholder="GigabitEthernet0/0/1" /></Field>
                                           )}
                                            {needsPort && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="公网端口"><Input value={server.globalPort || ''} onChange={e => updateServer(index, { globalPort: e.target.value })} placeholder="例如: 80" /></Field>
                                                    <Field label="公网结束端口 (可选)"><Input value={server.globalPortEnd || ''} onChange={e => updateServer(index, { globalPortEnd: e.target.value })} /></Field>
                                                </div>
                                            )}
                                       </div>
                                       
                                       {/* Inside Config */}
                                        <div className="p-3 bg-slate-700/30 rounded-lg space-y-3">
                                           <h6 className="text-sm font-semibold text-slate-300">内网信息 (Inside)</h6>
                                            <div className="flex gap-3">
                                                <Field label="内网地址" className="flex-1"><Input value={server.insideHostAddress} onChange={e => updateServer(index, { insideHostAddress: e.target.value })} /></Field>
                                                <Field label="内网结束地址(可选)" className="flex-1"><Input value={server.insideHostAddressEnd || ''} onChange={e => updateServer(index, { insideHostAddressEnd: e.target.value })} /></Field>
                                            </div>
                                            {needsPort && (
                                                <div className="flex gap-3">
                                                    <Field label="内网主机端口" className="flex-1"><Input value={server.insideHostPort || ''} onChange={e => updateServer(index, { insideHostPort: e.target.value })} placeholder="例如: 8080" /></Field>
                                                    <Field label="内网主机结束端口 (可选)" className="flex-1"><Input value={server.insideHostPortEnd || ''} onChange={e => updateServer(index, { insideHostPortEnd: e.target.value })} /></Field>
                                                </div>
                                            )}
                                       </div>
                                       
                                       {/* Options */}
                                       <div className="space-y-3">
                                           <Field label="描述"><Input value={server.description || ''} onChange={e => updateServer(index, { description: e.target.value })}/></Field>
                                           <div className="flex gap-4">
                                                <Checkbox label="No-Reverse" checked={!!server.noReverse} onChange={e => updateServer(index, { noReverse: e.target.checked })} />
                                                <Checkbox label="Route" checked={!!server.route} onChange={e => updateServer(index, { route: e.target.checked })} />
                                                <Checkbox label="Disable" checked={!!server.disabled} onChange={e => updateServer(index, { disabled: e.target.checked })} />
                                           </div>
                                       </div>
                                   </div>
                               )}
                           </div>
                       );
                   })}
               </div>
           </div>
       );
    };

    const tabs: { id: HuaweiActiveTab, label: string }[] = [
        { id: 'source', label: '源NAT' },
        { id: 'destination', label: '目的NAT' },
    ];

    return (
        <>
            <div className="border-b border-slate-600 flex">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="pt-4">
                {activeTab === 'source' && renderSourceNAT()}
                {activeTab === 'destination' && renderDestinationNAT()}
            </div>
        </>
    );
};

const NATConfig: React.FC<NATConfigProps> = ({ selectedNode, onNodeUpdate, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.nat;

    return (
        <div className="bg-slate-700/50 rounded-lg p-3 space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold">NAT 配置</h4>
                <button onClick={onToggleFeature} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>
                    {config.enabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            {config.enabled && (
                <>
                    {selectedNode.vendor === Vendor.Huawei ? 
                        <Huawei_NATConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} onToggleFeature={onToggleFeature} isGenerating={isGenerating} /> :
                        <H3C_NATConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} onToggleFeature={onToggleFeature} isGenerating={isGenerating} />
                    }
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                            {isGenerating ? (
                                <div className="flex items-center text-slate-400">
                                    <SpinnerIcon className="w-4 h-4 mr-2" />
                                    <span>Generating...</span>
                                </div>
                            ) : (
                                config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                            )}
                        </pre>
                    </div>
                </>
            )}
        </div>
    );
};

export default NATConfig;