

import React, { useState, useCallback, useEffect } from 'react';
import { Node, NATStaticOutboundRule, Vendor, NATPortMappingRule, NATAddressPool, NATMappingType, NATServerGroup, NATServerGroupMember, HuaweiNATConfig, HuaweiNATAddressPool, HuaweiNATAddressPoolSection, HuaweiNATServer, DeviceType, H3CGlobalNatRule, SecurityZone, AddressGroup, ServiceGroup, HuaweiNATRule } from '../../types';
import { SpinnerIcon } from '../Icons';

interface NATConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

interface VendorNATConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isGenerating: boolean;
}


type H3CActiveTab = 'port-mapping' | 'static-translation' | 'address-pool' | 'global-policy';
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

const H3CGlobalNatRuleForm: React.FC<{
    rule: H3CGlobalNatRule;
    onUpdate: (updates: Partial<H3CGlobalNatRule>) => void;
    zones: SecurityZone[];
    addressGroups: AddressGroup[];
    serviceGroups: ServiceGroup[];
    deviceType: DeviceType;
    vendor: Vendor;
}> = ({ rule, onUpdate, zones, addressGroups, serviceGroups, deviceType, vendor }) => {
    const isRouter = vendor === Vendor.H3C && deviceType === DeviceType.Router;
    return (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-4">
            {/* General */}
            <div className="p-3 bg-slate-800/60 rounded-lg space-y-3">
                <h6 className="text-sm font-semibold text-slate-300">通用设置</h6>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="规则名称"><Input value={rule.name} onChange={e => onUpdate({ name: e.target.value })}/></Field>
                    <Field label="描述"><Input value={rule.description} onChange={e => onUpdate({ description: e.target.value })}/></Field>
                </div>
                <div className="flex gap-4">
                    <Checkbox label="启用规则" checked={rule.enabled} onChange={e => onUpdate({ enabled: e.target.checked })}/>
                    <Checkbox label="启用命中统计" checked={rule.countingEnabled} onChange={e => onUpdate({ countingEnabled: e.target.checked })}/>
                </div>
            </div>

            {/* Conditions */}
            <div className="p-3 bg-slate-800/60 rounded-lg space-y-3">
                <h6 className="text-sm font-semibold text-slate-300">当IP地址符合以下条件时</h6>
                {!isRouter && (
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="源安全域"><Select value={rule.sourceZone} onChange={e => onUpdate({ sourceZone: e.target.value })}><option value="">Any</option>{zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}</Select></Field>
                        <Field label="目的安全域"><Select value={rule.destinationZone} onChange={e => onUpdate({ destinationZone: e.target.value })}><option value="">Any</option>{zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}</Select></Field>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <Field label="源地址"><Select value={rule.sourceIpType} onChange={e => onUpdate({ sourceIpType: e.target.value as any })}><option value="any">Any</option><option value="object-group">地址对象组</option><option value="host">主机</option><option value="subnet">子网</option></Select></Field>
                    {rule.sourceIpType !== 'any' && <Field label="值"><Input value={rule.sourceIpValue} onChange={e => onUpdate({ sourceIpValue: e.target.value })} placeholder={rule.sourceIpType === 'subnet' ? '192.168.1.0/24' : 'Value'}/></Field>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="目的地址"><Select value={rule.destinationIpType} onChange={e => onUpdate({ destinationIpType: e.target.value as any })}><option value="any">Any</option><option value="object-group">地址对象组</option><option value="host">主机</option><option value="subnet">子网</option></Select></Field>
                    {rule.destinationIpType !== 'any' && <Field label="值"><Input value={rule.destinationIpValue} onChange={e => onUpdate({ destinationIpValue: e.target.value })} placeholder={rule.destinationIpType === 'subnet' ? '10.0.0.0/8' : 'Value'}/></Field>}
                </div>
                 <div className="grid grid-cols-2 gap-3">
                    <Field label="服务"><Select value={rule.serviceType} onChange={e => onUpdate({ serviceType: e.target.value as any })}><option value="any">Any</option><option value="object-group">服务对象组</option></Select></Field>
                    {rule.serviceType === 'object-group' && <Field label="服务对象组名称"><Input value={rule.serviceValue} onChange={e => onUpdate({ serviceValue: e.target.value })} /></Field>}
                </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-slate-800/60 rounded-lg space-y-3">
                <h6 className="text-sm font-semibold text-slate-300">将地址转换为</h6>
                 {/* SNAT */}
                <div className="space-y-2 pt-2 border-t border-slate-700/50">
                    <label className="text-sm text-slate-300">源地址转换 (SNAT)</label>
                    <Select value={rule.snatAction} onChange={e => onUpdate({ snatAction: e.target.value as any })}>
                        <option value="none">无操作</option><option value="pat">PAT (地址池)</option><option value="no-pat">No-PAT (地址池)</option><option value="easy-ip">Easy IP (接口地址)</option><option value="static">静态转换</option><option value="no-nat">不转换</option>
                    </Select>
                    {(rule.snatAction === 'pat' || rule.snatAction === 'no-pat') && <Field label="地址池组"><Input value={rule.snatAddressGroup} onChange={e => onUpdate({ snatAddressGroup: e.target.value })}/></Field>}
                    {rule.snatAction === 'pat' && <Checkbox label="保留端口 (Port Preserved)" checked={rule.snatPortPreserved} onChange={e => onUpdate({ snatPortPreserved: e.target.checked })}/>}
                    {rule.snatAction === 'no-pat' && <Checkbox label="可逆的 (Reversible)" checked={rule.snatReversible} onChange={e => onUpdate({ snatReversible: e.target.checked })}/>}
                    {rule.snatAction === 'easy-ip' && <Checkbox label="保留端口 (Port Preserved)" checked={rule.snatPortPreserved} onChange={e => onUpdate({ snatPortPreserved: e.target.checked })}/>}
                    {rule.snatAction === 'static' && <Field label="转换后的全局地址/子网"><Input value={rule.snatStaticGlobalValue} onChange={e => onUpdate({ snatStaticGlobalValue: e.target.value })}/></Field>}
                </div>
                 {/* DNAT */}
                 <div className="space-y-2 pt-2 border-t border-slate-700/50">
                    <label className="text-sm text-slate-300">目的地址转换 (DNAT)</label>
                     <Select value={rule.dnatAction} onChange={e => onUpdate({ dnatAction: e.target.value as any })}>
                        <option value="none">无操作</option><option value="static">静态转换</option><option value="no-nat">不转换</option>
                    </Select>
                    {rule.dnatAction === 'static' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="转换后的内网地址"><Input value={rule.dnatLocalAddress} onChange={e => onUpdate({ dnatLocalAddress: e.target.value })}/></Field>
                            <Field label="转换后的内网端口 (可选)"><Input value={rule.dnatLocalPort} onChange={e => onUpdate({ dnatLocalPort: e.target.value })}/></Field>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};


const H3C_NATConfig: React.FC<VendorNATConfigProps> = ({ selectedNode, onNodeUpdate, isGenerating }) => {
    const [activeTab, setActiveTab] = useState<H3CActiveTab>('global-policy');
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [isServerGroupModalOpen, setIsServerGroupModalOpen] = useState(false);

    const config = selectedNode.config.nat;
    const acls = selectedNode.config.acl.acls;
    const addressGroups = selectedNode.config.objectGroups.addressGroups;

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
        const newRule: NATStaticOutboundRule = { id: `nat-static-${Date.now()}`, direction: 'outbound', type: 'one-to-one', localIp: '192.168.1.10', globalIp: '10.1.1.10' };
        updateStaticOutbound({ rules: [...config.staticOutbound.rules, newRule] });
        setEditingRuleId(newRule.id);
    };
   const updateStaticRule = (id: string, updates: Partial<NATStaticOutboundRule>) => {
        const ruleToUpdate = config.staticOutbound.rules.find(r => r.id === id);
        if (!ruleToUpdate) return;
        
        let newRule = { ...ruleToUpdate, ...updates };

        // When type changes, reset all other type-specific fields to avoid carrying over invalid data.
        if ('type' in updates && updates.type !== ruleToUpdate.type) {
             newRule = {
                id: newRule.id,
                direction: newRule.direction,
                type: newRule.type,
                localIp: '',
                globalIp: '',
                localStartIp: '',
                localEndIp: '',
                globalNetwork: '',
                globalMask: '',
                globalStartIp: '',
                globalEndIp: '',
                localNetwork: '',
                localMask: '',
                localAddressGroup: '',
                globalAddressGroup: '',
                aclId: newRule.aclId, // Preserve common fields
                reversible: newRule.reversible,
            };
        }

        const newRules = config.staticOutbound.rules.map(r => r.id === id ? newRule : r);
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

     // --- Global Policy Callbacks ---
    const updateGlobalPolicy = useCallback((updates: Partial<Node['config']['nat']['globalPolicy']>) => {
        updateNATConfig({ globalPolicy: { ...config.globalPolicy!, ...updates } });
    }, [config.globalPolicy, updateNATConfig]);

    const addH3CGlobalRule = () => {
        const newRule: H3CGlobalNatRule = {
            id: `nat-global-${Date.now()}`, name: `rule${(config.globalPolicy?.rules.length || 0) + 1}`, description: '',
            enabled: true, countingEnabled: false, sourceZone: '', destinationZone: '',
            sourceIpType: 'any', sourceIpValue: '', destinationIpType: 'any', destinationIpValue: '',
            serviceType: 'any', serviceValue: '', snatAction: 'none', snatAddressGroup: '',
            snatPortPreserved: false, snatReversible: false, snatStaticGlobalValue: '',
            dnatAction: 'none', dnatLocalAddress: '', dnatLocalPort: ''
        };
        const newRules = [...(config.globalPolicy?.rules || []), newRule];
        updateGlobalPolicy({ rules: newRules });
        setEditingRuleId(newRule.id);
    };
    
    const updateH3CGlobalRule = (id: string, updates: Partial<H3CGlobalNatRule>) => {
        const newRules = (config.globalPolicy?.rules || []).map(r => r.id === id ? { ...r, ...updates } : r);
        updateGlobalPolicy({ rules: newRules });
    };

    const removeH3CGlobalRule = (id: string) => {
        const newRules = (config.globalPolicy?.rules || []).filter(r => r.id !== id);
        updateGlobalPolicy({ rules: newRules });
        if (editingRuleId === id) setEditingRuleId(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex border-b border-slate-600 text-xs">
                <button onClick={() => { setActiveTab('global-policy'); setEditingRuleId(null); }} className={`px-3 py-2 ${activeTab === 'global-policy' ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}>全局策略</button>
                <button onClick={() => { setActiveTab('port-mapping'); setEditingRuleId(null); }} className={`px-3 py-2 ${activeTab === 'port-mapping' ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}>端口映射</button>
                <button onClick={() => { setActiveTab('static-translation'); setEditingRuleId(null); }} className={`px-3 py-2 ${activeTab === 'static-translation' ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}>静态转换</button>
                <button onClick={() => { setActiveTab('address-pool'); setEditingRuleId(null); }} className={`px-3 py-2 ${activeTab === 'address-pool' ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}>地址池</button>
            </div>

            {activeTab === 'port-mapping' && (
                <div className="space-y-2">
                    <Checkbox label="启用端口映射" checked={config.portMapping.enabled} onChange={e => updatePortMapping({ enabled: e.target.checked })} />
                    {config.portMapping.enabled && (
                        <div className="space-y-2">
                            <div className="flex justify-end"><button onClick={addPortMappingRule} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加规则</button></div>
                            {config.portMapping.rules.map(rule => (
                                <div key={rule.id} className="bg-slate-800/50 p-2 rounded">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}>
                                        <span className="text-xs">{rule.policyName || `Rule on ${rule.interfaceName}`}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">{rule.mappingType}</span>
                                            <button onClick={(e) => {e.stopPropagation(); removePortMappingRule(rule.id)}} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                                        </div>
                                    </div>
                                    {editingRuleId === rule.id && <PortMappingRuleForm rule={rule} updateRule={(u) => updatePortMappingRule(rule.id, u)} availableInterfaces={selectedNode.ports.map(p => p.name)} acls={acls} serverGroups={config.serverGroups} onManageServerGroups={() => setIsServerGroupModalOpen(true)} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'static-translation' && (
                <div className="space-y-2">
                    <Checkbox label="启用静态转换" checked={config.staticOutbound.enabled} onChange={e => updateStaticOutbound({ enabled: e.target.checked })} />
                    {config.staticOutbound.enabled && (
                        <div className="space-y-2">
                            <div className="flex justify-end"><button onClick={addStaticRule} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加规则</button></div>
                             {config.staticOutbound.rules.map(rule => (
                                <div key={rule.id} className="bg-slate-800/50 p-2 rounded text-xs">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}>
                                        <div className="flex items-center gap-2">
                                            <span className={`transition-transform text-slate-400 ${editingRuleId === rule.id ? 'rotate-90' : ''}`}>▶</span>
                                            <span className="capitalize">{rule.direction}</span>
                                            <span>-</span>
                                            <span className="capitalize">{rule.type.replace('-', ' ')}</span>
                                        </div>
                                        <button onClick={(e) => {e.stopPropagation(); removeStaticRule(rule.id)}} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                                    </div>
                                    {editingRuleId === rule.id && (
                                         <div className="mt-2 pt-2 border-t border-slate-700 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Direction"><Select value={rule.direction} onChange={e => updateStaticRule(rule.id, { direction: e.target.value as any })}><option value="outbound">Outbound</option><option value="inbound">Inbound</option></Select></Field>
                                                <Field label="Type"><Select value={rule.type} onChange={e => updateStaticRule(rule.id, { type: e.target.value as any })}><option value="one-to-one">One-to-One</option><option value="net-to-net">Net-to-Net</option><option value="address-group">Object Address Group</option></Select></Field>
                                            </div>
                                            {rule.type === 'one-to-one' && <div className="grid grid-cols-2 gap-2"><Field label="Local IP"><Input value={rule.localIp || ''} onChange={e => updateStaticRule(rule.id, { localIp: e.target.value })} /></Field><Field label="Global IP"><Input value={rule.globalIp || ''} onChange={e => updateStaticRule(rule.id, { globalIp: e.target.value })} /></Field></div>}
                                            {rule.type === 'net-to-net' && rule.direction === 'outbound' && <div className="grid grid-cols-2 gap-2"><Field label="Local Start IP"><Input value={rule.localStartIp || ''} onChange={e => updateStaticRule(rule.id, { localStartIp: e.target.value })} /></Field><Field label="Local End IP"><Input value={rule.localEndIp || ''} onChange={e => updateStaticRule(rule.id, { localEndIp: e.target.value })} /></Field><Field label="Global Network"><Input value={rule.globalNetwork || ''} onChange={e => updateStaticRule(rule.id, { globalNetwork: e.target.value })} /></Field><Field label="Global Mask"><Input value={rule.globalMask || ''} onChange={e => updateStaticRule(rule.id, { globalMask: e.target.value })} placeholder="e.g., 24 or 255.255.255.0"/></Field></div>}
                                            {rule.type === 'net-to-net' && rule.direction === 'inbound' && <div className="grid grid-cols-2 gap-2"><Field label="Global Start IP"><Input value={rule.globalStartIp || ''} onChange={e => updateStaticRule(rule.id, { globalStartIp: e.target.value })} /></Field><Field label="Global End IP"><Input value={rule.globalEndIp || ''} onChange={e => updateStaticRule(rule.id, { globalEndIp: e.target.value })} /></Field><Field label="Local Network"><Input value={rule.localNetwork || ''} onChange={e => updateStaticRule(rule.id, { localNetwork: e.target.value })} /></Field><Field label="Local Mask"><Input value={rule.localMask || ''} onChange={e => updateStaticRule(rule.id, { localMask: e.target.value })} placeholder="e.g., 24 or 255.255.255.0"/></Field></div>}
                                            {rule.type === 'address-group' && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Field label="Local Object Group">
                                                            <Select value={rule.localAddressGroup} onChange={e => updateStaticRule(rule.id, {localAddressGroup: e.target.value})}>
                                                                <option value="">-- Select Group --</option>
                                                                {addressGroups.map(ag => <option key={ag.id} value={ag.name}>{ag.name}</option>)}
                                                            </Select>
                                                        </Field>
                                                        <Field label="Global Object Group">
                                                            <Select value={rule.globalAddressGroup} onChange={e => updateStaticRule(rule.id, {globalAddressGroup: e.target.value})}>
                                                                <option value="">-- Select Group --</option>
                                                                {addressGroups.map(ag => <option key={ag.id} value={ag.name}>{ag.name}</option>)}
                                                            </Select>
                                                        </Field>
                                                    </div>
                                                    {addressGroups.length === 0 && <p className="text-xs text-yellow-400 mt-1">No Address Object Groups found. Please create them under 'Manage' -&gt; 'Object Groups'.</p>}
                                                </>
                                            )}
                                            
                                            <div className="pt-2 border-t border-slate-600/50 flex items-center justify-between">
                                                <Field label="ACL (Optional)">
                                                    <Select value={rule.aclId || ''} onChange={e => updateStaticRule(rule.id, { aclId: e.target.value })}>
                                                        <option value="">(None)</option>
                                                        {acls.map(acl => (<option key={acl.id} value={acl.id}>{acl.number} {acl.name && `(${acl.name})`}</option>))}
                                                    </Select>
                                                    {!selectedNode.config.acl.enabled && <p className="text-xs text-yellow-400 mt-1">ACL feature is disabled. Please enable it under 'ACL & QoS'.</p>}
                                                    {selectedNode.config.acl.enabled && acls.length === 0 && <p className="text-xs text-yellow-400 mt-1">No ACLs found. Please create one under 'ACL & QoS'.</p>}
                                                </Field>
                                                <div className="mt-5">
                                                    <Checkbox label="Reversible" checked={!!rule.reversible} onChange={e => updateStaticRule(rule.id, { reversible: e.target.checked })}/>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'address-pool' && (
                <div className="space-y-2">
                     <Checkbox label="启用地址池" checked={config.addressPool.enabled} onChange={e => updateAddressPoolConfig({ enabled: e.target.checked })} />
                     {config.addressPool.enabled && (
                        <div className="space-y-2">
                            <div className="flex justify-end"><button onClick={addAddressPool} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加地址池</button></div>
                            {config.addressPool.pools.map(pool => (
                                <div key={pool.id} className="bg-slate-800/50 p-2 rounded text-xs">
                                     <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingRuleId(editingRuleId === pool.id ? null : pool.id)}>
                                        <span>{pool.name || `Pool ${pool.groupId}`}</span>
                                        <button onClick={(e) => {e.stopPropagation(); removeAddressPool(pool.id)}} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                                    </div>
                                    {editingRuleId === pool.id && (
                                        <div className="mt-2 pt-2 border-t border-slate-700 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Field label="Group ID"><Input value={pool.groupId} onChange={e => updateAddressPool(pool.id, { groupId: e.target.value })} /></Field>
                                                <Field label="Name (Optional)"><Input value={pool.name || ''} onChange={e => updateAddressPool(pool.id, { name: e.target.value })} /></Field>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Field label="Start Address"><Input value={pool.startAddress} onChange={e => updateAddressPool(pool.id, { startAddress: e.target.value })} /></Field>
                                                <Field label="End Address"><Input value={pool.endAddress} onChange={e => updateAddressPool(pool.id, { endAddress: e.target.value })} /></Field>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            )}
             {activeTab === 'global-policy' && (
                 <div className="space-y-2">
                     <Checkbox label="启用全局NAT策略" checked={config.globalPolicy?.enabled || false} onChange={e => updateGlobalPolicy({ enabled: e.target.checked })} />
                     {config.globalPolicy?.enabled && (
                        <div className="space-y-2">
                            <div className="flex justify-end"><button onClick={addH3CGlobalRule} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加规则</button></div>
                             {(config.globalPolicy.rules || []).map((rule, index) => (
                                 <div key={rule.id} className="bg-slate-800/50 p-2 rounded">
                                     <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingRuleId(editingRuleId === rule.id ? null : rule.id)}>
                                         <div className="flex items-center gap-2">
                                            <span className={`transition-transform text-slate-400 text-xs ${editingRuleId === rule.id ? 'rotate-90' : ''}`}>▶</span>
                                            <span className="text-xs font-semibold">{rule.name || `Rule ${index + 1}`}</span>
                                         </div>
                                         <button onClick={(e) => { e.stopPropagation(); removeH3CGlobalRule(rule.id); }} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                                     </div>
                                     {editingRuleId === rule.id && (
                                         <H3CGlobalNatRuleForm
                                            rule={rule}
                                            onUpdate={(updates) => updateH3CGlobalRule(rule.id, updates)}
                                            zones={selectedNode.config.security.zones}
                                            addressGroups={selectedNode.config.objectGroups.addressGroups}
                                            serviceGroups={selectedNode.config.objectGroups.serviceGroups}
                                            deviceType={selectedNode.type}
                                            vendor={selectedNode.vendor}
                                         />
                                     )}
                                 </div>
                             ))}
                        </div>
                     )}
                 </div>
            )}
            
            {isServerGroupModalOpen && <NATServerGroupModal isOpen={isServerGroupModalOpen} onClose={() => setIsServerGroupModalOpen(false)} serverGroups={config.serverGroups} onSave={handleSaveServerGroups} />}
        </div>
    );
};

const Huawei_NATConfig: React.FC<VendorNATConfigProps> = ({ selectedNode, onNodeUpdate, isGenerating }) => {
    const [activeTab, setActiveTab] = useState<HuaweiActiveTab>('source');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    const config = selectedNode.config.nat;
    const huaweiConfig = config.huawei;

    const updateHuaweiConfig = useCallback((updates: Partial<HuaweiNATConfig>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, nat: { ...config, huawei: { ...huaweiConfig, ...updates } } } });
    }, [selectedNode, config, huaweiConfig, onNodeUpdate]);

    const addAddressPool = () => {
        const newPool: HuaweiNATAddressPool = { id: `hpool-${Date.now()}`, groupName: `pool${huaweiConfig.addressPools.length + 1}`, sections: [{id: `hsec-${Date.now()}`, startAddress: ''}], mode: 'pat' as const, routeEnable: false };
        updateHuaweiConfig({ addressPools: [...huaweiConfig.addressPools, newPool] });
    };

    const updateAddressPool = (poolIndex: number, updates: Partial<HuaweiNATAddressPool>) => {
        const newPools = [...huaweiConfig.addressPools];
        newPools[poolIndex] = { ...newPools[poolIndex], ...updates };
        updateHuaweiConfig({ addressPools: newPools });
    };
    
    const removePool = (index: number) => {
        const pools = huaweiConfig.addressPools.filter((_, i) => i !== index);
        updateHuaweiConfig({addressPools: pools});
    }
    
    const addSectionToPool = (poolIndex: number) => {
        const newPools = [...huaweiConfig.addressPools];
        const newSection: HuaweiNATAddressPoolSection = { id: `hsec-${Date.now()}`, startAddress: '' };
        newPools[poolIndex].sections.push(newSection);
        updateHuaweiConfig({ addressPools: newPools });
    };

    const updateSectionInPool = (poolIndex: number, secIndex: number, updates: Partial<HuaweiNATAddressPoolSection>) => {
        const newPools = [...huaweiConfig.addressPools];
        newPools[poolIndex].sections[secIndex] = { ...newPools[poolIndex].sections[secIndex], ...updates };
        updateHuaweiConfig({ addressPools: newPools });
    };

    const removeSectionFromPool = (poolIndex: number, secIndex: number) => {
        const newPools = [...huaweiConfig.addressPools];
        newPools[poolIndex].sections = newPools[poolIndex].sections.filter((_, i) => i !== secIndex);
        updateHuaweiConfig({ addressPools: newPools });
    };


    const addRule = () => {
        const newRule: HuaweiNATRule = { id: `hrule-${Date.now()}`, ruleName: `rule${huaweiConfig.rules.length + 1}`, action: 'source-nat' as const, easyIp: true };
        updateHuaweiConfig({ rules: [...huaweiConfig.rules, newRule] });
    };
    
    const updateRule = (ruleIndex: number, updates: Partial<HuaweiNATRule>) => {
        const newRules = [...huaweiConfig.rules];
        const updatedRule = { ...newRules[ruleIndex], ...updates };
        if (updates.easyIp === true) {
            updatedRule.natAddressGroup = undefined;
        }
        if (updates.natAddressGroup) {
            updatedRule.easyIp = false;
        }
        newRules[ruleIndex] = updatedRule;
        updateHuaweiConfig({ rules: newRules });
    };

    const removeRule = (index: number) => {
        const rules = huaweiConfig.rules.filter((_, i) => i !== index);
        updateHuaweiConfig({rules: rules});
    }

    const addServer = () => {
        const newServer: HuaweiNATServer = { id: `hserver-${Date.now()}`, name: `server${huaweiConfig.servers.length + 1}`, protocol: 'tcp', globalAddressType: 'ip', insideHostAddress: '' };
        updateHuaweiConfig({ servers: [...huaweiConfig.servers, newServer] });
    };
    
    const updateServer = (serverIndex: number, updates: Partial<HuaweiNATServer>) => {
        const newServers = [...huaweiConfig.servers];
        newServers[serverIndex] = { ...newServers[serverIndex], ...updates };
        updateHuaweiConfig({ servers: newServers });
    };
    
    const removeServer = (index: number) => {
        const servers = huaweiConfig.servers.filter((_, i) => i !== index);
        updateHuaweiConfig({servers: servers});
    }

    return (
        <div className="space-y-4">
            <div className="flex border-b border-slate-600 text-xs">
                <button onClick={() => { setEditingItemId(null); setActiveTab('source'); }} className={`px-3 py-2 ${activeTab === 'source' ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}>源NAT</button>
                <button onClick={() => { setEditingItemId(null); setActiveTab('destination'); }} className={`px-3 py-2 ${activeTab === 'destination' ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400'}`}>目的NAT (NAT Server)</button>
            </div>
            {activeTab === 'source' && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">地址池</h5><button onClick={addAddressPool} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加地址池</button></div>
                        {huaweiConfig.addressPools.map((pool, index) => (
                            <div key={pool.id} className="bg-slate-800/50 p-2 rounded text-xs">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingItemId(editingItemId === pool.id ? null : pool.id)}>
                                    <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${editingItemId === pool.id ? 'rotate-90' : ''}`}>▶</span><span>{pool.groupName || `Pool ${index + 1}`}</span></div>
                                    <button onClick={(e)=>{e.stopPropagation(); removePool(index)}} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                                </div>
                                {editingItemId === pool.id && (
                                    <div className="mt-2 pt-2 border-t border-slate-700 space-y-3">
                                        <div className="grid grid-cols-2 gap-2"><Field label="Group Name"><Input value={pool.groupName} onChange={e => updateAddressPool(index, { groupName: e.target.value })} /></Field><Field label="Group Number (Optional)"><Input value={pool.groupNumber || ''} onChange={e => updateAddressPool(index, { groupNumber: e.target.value })} /></Field></div>
                                        <Field label="Sections"><div className="space-y-2">{pool.sections.map((sec, secIndex) => (<div key={sec.id} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input value={sec.startAddress} onChange={e => updateSectionInPool(index, secIndex, { startAddress: e.target.value })} placeholder="Start Address"/><Input value={sec.endAddress || ''} onChange={e => updateSectionInPool(index, secIndex, { endAddress: e.target.value })} placeholder="End Address (Optional)"/><button onClick={() => removeSectionFromPool(index, secIndex)} className="px-2 py-1 bg-red-600/80 text-white rounded">-</button></div>))}<button onClick={() => addSectionToPool(index)} className="w-full text-xs py-1 bg-blue-600/80 rounded mt-1">+</button></div></Field>
                                        <Field label="Mode"><Select value={pool.mode} onChange={e => updateAddressPool(index, { mode: e.target.value as any })}><option value="pat">PAT</option><option value="no-pat-global">No-PAT (Global)</option><option value="no-pat-local">No-PAT (Local)</option></Select></Field>
                                        <Checkbox label="Enable Blackhole Route" checked={pool.routeEnable} onChange={e => updateAddressPool(index, { routeEnable: e.target.checked })} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">NAT策略</h5><button onClick={addRule} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加策略</button></div>
                        {huaweiConfig.rules.map((rule, index) => (
                            <div key={rule.id} className="bg-slate-800/50 p-2 rounded text-xs">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingItemId(editingItemId === rule.id ? null : rule.id)}>
                                     <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${editingItemId === rule.id ? 'rotate-90' : ''}`}>▶</span><span>{rule.ruleName}</span></div>
                                     <button onClick={(e)=>{e.stopPropagation(); removeRule(index)}} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                                </div>
                                {editingItemId === rule.id && (
                                    <div className="mt-2 pt-2 border-t border-slate-700 space-y-3">
                                        <Field label="Rule Name"><Input value={rule.ruleName} onChange={e => updateRule(index, { ruleName: e.target.value })} /></Field>
                                        <div className="grid grid-cols-2 gap-2"><Field label="Source Address"><Input value={rule.sourceAddress || ''} onChange={e => updateRule(index, { sourceAddress: e.target.value })} placeholder="e.g. 192.168.1.0"/></Field><Field label="Source Mask"><Input value={rule.sourceMask || ''} onChange={e => updateRule(index, { sourceMask: e.target.value })} placeholder="e.g. 24"/></Field></div>
                                        <div className="grid grid-cols-2 gap-2"><Field label="Dest. Address (Optional)"><Input value={rule.destinationAddress || ''} onChange={e => updateRule(index, { destinationAddress: e.target.value })} placeholder="e.g. 10.0.0.0"/></Field><Field label="Dest. Mask (Optional)"><Input value={rule.destinationMask || ''} onChange={e => updateRule(index, { destinationMask: e.target.value })} placeholder="e.g. 8"/></Field></div>
                                        <Field label="Action"><Select value={rule.action} onChange={e => updateRule(index, { action: e.target.value as any })}><option value="source-nat">Source NAT</option><option value="no-nat">No NAT</option></Select></Field>
                                        {rule.action === 'source-nat' && <div className="pl-4 space-y-2"><Checkbox label="Easy IP" checked={!!rule.easyIp} onChange={e => updateRule(index, { easyIp: e.target.checked })} /><Field label="Address Group"><Select value={rule.natAddressGroup || ''} onChange={e => updateRule(index, { natAddressGroup: e.target.value })} disabled={!!rule.easyIp}><option value="">-- Select Pool --</option>{huaweiConfig.addressPools.map(p => <option key={p.id} value={p.groupName}>{p.groupName}</option>)}</Select></Field></div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {activeTab === 'destination' && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">NAT Server (服务器映射)</h5><button onClick={addServer} className="px-2 py-1 bg-green-600 text-white text-xs rounded">添加服务器</button></div>
                     {huaweiConfig.servers.map((server, index) => (
                        <div key={server.id} className="bg-slate-800/50 p-2 rounded text-xs">
                             <div className="flex justify-between items-center cursor-pointer" onClick={() => setEditingItemId(editingItemId === server.id ? null : server.id)}>
                                 <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${editingItemId === server.id ? 'rotate-90' : ''}`}>▶</span><span>{server.name}</span></div>
                                 <button onClick={(e)=>{e.stopPropagation(); removeServer(index)}} className="px-2 py-1 bg-red-600 text-white text-xs rounded">X</button>
                             </div>
                             {editingItemId === server.id && (
                                <div className="mt-2 pt-2 border-t border-slate-700 space-y-3">
                                    <div className="grid grid-cols-2 gap-2"><Field label="Name"><Input value={server.name} onChange={e => updateServer(index, { name: e.target.value })} /></Field><Field label="Zone (Optional)"><Input value={server.zone || ''} onChange={e => updateServer(index, { zone: e.target.value })} /></Field></div>
                                    <Field label="Protocol"><Select value={server.protocol} onChange={e => updateServer(index, { protocol: e.target.value as any})}><option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option><option value="sctp">SCTP</option><option value="any">Any</option></Select></Field>
                                    <div className="p-2 bg-slate-700/50 rounded space-y-2"><h6 className="text-xs font-semibold text-slate-300">Global (External)</h6><Field label="Address Type"><Select value={server.globalAddressType} onChange={e => updateServer(index, { globalAddressType: e.target.value as any})}><option value="ip">IP Address</option><option value="interface">Interface</option></Select></Field>{server.globalAddressType === 'ip' && <div className="grid grid-cols-2 gap-2"><Input value={server.globalAddress || ''} onChange={e => updateServer(index, { globalAddress: e.target.value })} placeholder="Start IP"/><Input value={server.globalAddressEnd || ''} onChange={e => updateServer(index, { globalAddressEnd: e.target.value })} placeholder="End IP (Optional)"/></div>}{server.globalAddressType === 'interface' && <Input value={server.globalInterface || ''} onChange={e => updateServer(index, { globalInterface: e.target.value })} placeholder="e.g. GigabitEthernet0/0/1"/>}<div className="grid grid-cols-2 gap-2"><Input value={server.globalPort || ''} onChange={e => updateServer(index, { globalPort: e.target.value })} placeholder="Start Port (Optional)"/><Input value={server.globalPortEnd || ''} onChange={e => updateServer(index, { globalPortEnd: e.target.value })} placeholder="End Port (Optional)"/></div></div>
                                    <div className="p-2 bg-slate-700/50 rounded space-y-2"><h6 className="text-xs font-semibold text-slate-300">Inside (Internal)</h6><div className="grid grid-cols-2 gap-2"><Input value={server.insideHostAddress || ''} onChange={e => updateServer(index, { insideHostAddress: e.target.value })} placeholder="Start IP"/><Input value={server.insideHostAddressEnd || ''} onChange={e => updateServer(index, { insideHostAddressEnd: e.target.value })} placeholder="End IP (Optional)"/></div><div className="grid grid-cols-2 gap-2"><Input value={server.insideHostPort || ''} onChange={e => updateServer(index, { insideHostPort: e.target.value })} placeholder="Start Port (Optional)"/><Input value={server.insideHostPortEnd || ''} onChange={e => updateServer(index, { insideHostPortEnd: e.target.value })} placeholder="End Port (Optional)"/></div></div>
                                    <Field label="Description"><Input value={server.description || ''} onChange={e => updateServer(index, { description: e.target.value })} /></Field>
                                    <div className="flex gap-4"><Checkbox label="No Reverse" checked={!!server.noReverse} onChange={e => updateServer(index, {noReverse: e.target.checked})}/><Checkbox label="Route" checked={!!server.route} onChange={e => updateServer(index, {route: e.target.checked})}/><Checkbox label="Disabled" checked={!!server.disabled} onChange={e => updateServer(index, {disabled: e.target.checked})}/></div>
                                </div>
                             )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const NATConfig: React.FC<NATConfigProps> = ({ selectedNode, onNodeUpdate, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.nat;
    const vendor = selectedNode.vendor;
    
    const isApplicable = selectedNode.type === DeviceType.Router || selectedNode.type === DeviceType.Firewall;

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={() => { /* This component is always expanded inside another one */ }}>
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold">NAT配置 (Network Address Translation)</h4>
                </div>
                {isApplicable && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFeature(); }}
                        className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        {config.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                )}
            </div>
            {config.enabled && isApplicable && (
                <div className="p-3 border-t border-slate-600 space-y-4">
                    {vendor === Vendor.H3C && <H3C_NATConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isGenerating={isGenerating} />}
                    {vendor === Vendor.Huawei && <Huawei_NATConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isGenerating={isGenerating} />}
                    {vendor === Vendor.Cisco && <p className="text-xs text-slate-500">Cisco NAT configuration via this panel is not yet supported. Please use the Command Helper or Device Commands tab.</p>}
                    
                     <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                            {isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}
                        </pre>
                    </div>
                </div>
            )}
             {isApplicable && !config.enabled && (
                <div className="p-3 border-t border-slate-600">
                    <p className="text-xs text-slate-500 italic">Enable NAT to begin configuration.</p>
                </div>
            )}
             {!isApplicable && (
                <div className="p-3 border-t border-slate-600">
                    <p className="text-xs text-slate-500 italic">NAT is only available on Routers and Firewalls.</p>
                </div>
            )}
        </div>
    )
};

export default NATConfig;
