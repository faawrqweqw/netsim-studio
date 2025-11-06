
import React, { useCallback, useMemo, useState } from 'react';
import { Node, MLAGInterfaceConfig, Vendor, DeviceType, HuaweiMLAGInterfaceConfig } from '../../types';
import { SpinnerIcon } from '../Icons';


interface MLAGConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const Field: React.FC<{ label: string; children: React.ReactNode; note?: string }> = ({ label, children, note }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
        {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
);
const Checkbox: React.FC<{ label: string } & React.InputHTMLAttributes<HTMLInputElement>> = ({ label, ...props }) => (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
        <input type="checkbox" {...props} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"/>
        {label}
    </label>
);

const InterfaceListManager: React.FC<{
    title: string;
    interfaces: { id: string; name: string }[];
    onUpdate: (interfaces: { id: string; name: string }[]) => void;
    availableInterfaces: string[];
    configuredInterfaces: Set<string>;
}> = ({ title, interfaces, onUpdate, availableInterfaces, configuredInterfaces }) => {
    
    const addIface = () => {
        onUpdate([...interfaces, { id: `mad-if-${Date.now()}`, name: '' }]);
    };

    const updateIface = (index: number, name: string) => {
        const newInterfaces = [...interfaces];
        newInterfaces[index].name = name;
        onUpdate(newInterfaces);
    };

    const removeIface = (index: number) => {
        onUpdate(interfaces.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <h6 className="text-xs font-semibold text-slate-300">{title}</h6>
                <button onClick={addIface} className="px-2 py-1 bg-blue-600/80 text-white text-xs rounded">+</button>
            </div>
            {interfaces.map((iface, index) => (
                <div key={iface.id} className="flex items-center gap-2">
                    <Select value={iface.name} onChange={e => updateIface(index, e.target.value)}>
                        <option value="">--选择接口--</option>
                        {availableInterfaces.map(name => (
                            <option key={name} value={name} disabled={configuredInterfaces.has(name) && name !== iface.name}>{name}</option>
                        ))}
                    </Select>
                    <button onClick={() => removeIface(index)} className="px-2 py-1.5 bg-red-600/80 text-white text-xs rounded">-</button>
                </div>
            ))}
        </div>
    );
};


const MLAGConfig: React.FC<MLAGConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const config = selectedNode.config.mlag;
    const isApplicable = selectedNode.type.includes('Switch');
    const [expandedInterfaces, setExpandedInterfaces] = useState<Set<string>>(new Set());

    const toggleInterfaceExpansion = (id: string) => {
        setExpandedInterfaces(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const updateMlagConfig = useCallback((updates: Partial<Node['config']['mlag']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, mlag: { ...config, ...updates } } });
    }, [selectedNode, config, onNodeUpdate]);

    // H3C Callbacks
    const updateKeepaliveConfig = useCallback((updates: Partial<Node['config']['mlag']['keepalive']>) => {
        updateMlagConfig({ keepalive: { ...config.keepalive, ...updates } });
    }, [config.keepalive, updateMlagConfig]);

    const updateMadConfig = useCallback((updates: Partial<Node['config']['mlag']['mad']>) => {
        updateMlagConfig({ mad: { ...config.mad, ...updates } });
    }, [config.mad, updateMlagConfig]);

    const addInterface = () => {
        const newInterface: MLAGInterfaceConfig = {
            id: `mlag-iface-${Date.now()}`,
            bridgeAggregationId: '',
            groupId: '',
            drcpShortTimeout: false,
        };
        updateMlagConfig({ interfaces: [...config.interfaces, newInterface] });
    };

    const updateInterface = (index: number, updates: Partial<MLAGInterfaceConfig>) => {
        const newInterfaces = [...config.interfaces];
        newInterfaces[index] = { ...newInterfaces[index], ...updates };
        updateMlagConfig({ interfaces: newInterfaces });
    };

    const removeInterface = (index: number) => {
        updateMlagConfig({ interfaces: config.interfaces.filter((_, i) => i !== index) });
    };

    // Huawei Callbacks
    const updateHuaweiMlagConfig = useCallback((updates: Partial<Node['config']['mlag']['huawei']>) => {
        updateMlagConfig({ huawei: { ...(config.huawei || {}), ...updates } as any });
    }, [config.huawei, updateMlagConfig]);
    
    const addHuaweiInterface = () => {
        const newInterface: HuaweiMLAGInterfaceConfig = {
            id: `huawei-mlag-iface-${Date.now()}`,
            ethTrunkId: '',
            mlagId: '',
            mode: 'dual-active',
        };
        const currentInterfaces = config.huawei?.interfaces || [];
        updateHuaweiMlagConfig({ interfaces: [...currentInterfaces, newInterface] });
    };

    const updateHuaweiInterface = (index: number, updates: Partial<HuaweiMLAGInterfaceConfig>) => {
        const newInterfaces = [...(config.huawei?.interfaces || [])];
        newInterfaces[index] = { ...newInterfaces[index], ...updates };
        updateHuaweiMlagConfig({ interfaces: newInterfaces });
    };

    const removeHuaweiInterface = (index: number) => {
        const newInterfaces = (config.huawei?.interfaces || []).filter((_, i) => i !== index);
        updateHuaweiMlagConfig({ interfaces: newInterfaces });
    };
    
    const availableBridgeAggregations = useMemo(() => {
        const groupIds = new Set<string>();
        if (selectedNode.config.linkAggregation.enabled) {
            (selectedNode.config.linkAggregation.groups || []).forEach(g => { if (g.groupId) groupIds.add(g.groupId); });
        }
        return Array.from(groupIds).map(id => ({ id, name: `Bridge-Aggregation${id}` }));
    }, [selectedNode.config.linkAggregation]);
    
    const configuredBaggInterfaces = useMemo(() => 
        new Set(config.interfaces.map(i => i.bridgeAggregationId)), 
    [config.interfaces]);
    
    const allAvailableInterfacesForMad = useMemo(() => {
        return selectedNode.ports.map(p => p.name);
    }, [selectedNode.ports]);

    const allMadInterfaces = useMemo(() => new Set([
        ...config.mad.excludeInterfaces.map(i => i.name),
        ...config.mad.includeInterfaces.map(i => i.name)
    ]), [config.mad.excludeInterfaces, config.mad.includeInterfaces]);

    const availableEthTrunks = useMemo(() => {
        const trunkIds = new Set<string>();

        // From Link Aggregation panel
        if (selectedNode.config.linkAggregation.enabled) {
            (selectedNode.config.linkAggregation.groups || []).forEach(g => { if (g.groupId) trunkIds.add(g.groupId); });
        }

        // From M-LAG peer-link config
        if (config.huawei?.peerLinkTrunkId) {
            trunkIds.add(config.huawei.peerLinkTrunkId);
        }

        // From any already configured M-LAG member interfaces
        config.huawei?.interfaces.forEach(iface => {
            if (iface.ethTrunkId) {
                trunkIds.add(iface.ethTrunkId);
            }
        });
        
        return Array.from(trunkIds).sort((a,b) => parseInt(a) - parseInt(b));
    }, [selectedNode.config.linkAggregation, config.huawei?.interfaces, config.huawei?.peerLinkTrunkId]);


    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">M-LAG</h4></div>
                {isApplicable && <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    {selectedNode.vendor === Vendor.H3C && (
                        <>
                            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-medium text-slate-300">全局 M-LAG 配置</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="系统MAC地址" note="两台设备必须相同"><Input value={config.systemMac} onChange={e => updateMlagConfig({ systemMac: e.target.value })} placeholder="e.g., 0011-2233-4455" /></Field>
                                    <Field label="系统编号" note="两台设备必须不同"><Input value={config.systemNumber} onChange={e => updateMlagConfig({ systemNumber: e.target.value })} placeholder="e.g., 1 or 2" /></Field>
                                    <Field label="系统优先级" note="默认 32768, 值小优先"><Input value={config.systemPriority} onChange={e => updateMlagConfig({ systemPriority: e.target.value })} /></Field>
                                    <Field label="角色优先级" note="默认 32768, 值小优先"><Input value={config.rolePriority} onChange={e => updateMlagConfig({ rolePriority: e.target.value })} /></Field>
                                </div>
                                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                    <Checkbox label="开启MAC地址保持功能" checked={config.macAddressHold || false} onChange={e => updateMlagConfig({ macAddressHold: e.target.checked })} />
                                    <Checkbox label="启用独立工作模式 (Standalone)" checked={config.standalone.enabled} onChange={e => updateMlagConfig({ standalone: { ...config.standalone, enabled: e.target.checked } })} />
                                    {config.standalone.enabled && <Field label="延迟时间 (秒)" note="默认 90"><Input value={config.standalone.delayTime} onChange={e => updateMlagConfig({ standalone: { ...config.standalone, delayTime: e.target.value } })} /></Field>}
                                </div>
                            </div>

                            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-medium text-slate-300">接口配置</h5>
                                <div className="pt-2 border-t border-slate-700/50">
                                    <h6 className="text-xs font-semibold text-slate-300 mb-2">Peer-Link 接口配置</h6>
                                    <Field label="Peer-Link 接口">
                                        <Select value={config.peerLinkBridgeAggregationId} onChange={e => updateMlagConfig({ peerLinkBridgeAggregationId: e.target.value })}>
                                            <option value="">-- 选择一个聚合接口 --</option>
                                            {availableBridgeAggregations.map(bagg => <option key={bagg.id} value={bagg.id}>{bagg.name}</option>)}
                                        </Select>
                                    </Field>
                                    <div className="mt-2">
                                        <Checkbox label="DRCP短超时" checked={config.peerLinkDrcpShortTimeout || false} onChange={e => updateMlagConfig({ peerLinkDrcpShortTimeout: e.target.checked })} />
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-700/50 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h6 className="text-xs font-semibold text-slate-300">M-LAG 接口配置</h6>
                                        <button onClick={addInterface} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加接口</button>
                                    </div>
                                    {config.interfaces.map((iface, index) => (
                                        <div key={iface.id} className="bg-slate-900/50 p-3 rounded space-y-3">
                                            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleInterfaceExpansion(iface.id)}>
                                                <h6 className="text-xs font-semibold text-slate-400">接口 {iface.bridgeAggregationId ? `Bridge-Aggregation${iface.bridgeAggregationId}` : `(未指定)`}</h6>
                                                <div className="flex items-center gap-2">
                                                    <span className={`transition-transform text-slate-400 ${expandedInterfaces.has(iface.id) ? 'rotate-90' : ''}`}>▶</span>
                                                    <button onClick={(e) => { e.stopPropagation(); removeInterface(index); }} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                                                </div>
                                            </div>
                                            {expandedInterfaces.has(iface.id) && (
                                                <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field label="聚合接口">
                                                            <Select value={iface.bridgeAggregationId} onChange={e => updateInterface(index, { bridgeAggregationId: e.target.value })}>
                                                                <option value="">--选择接口--</option>
                                                                {availableBridgeAggregations.map(bagg => <option key={bagg.id} value={bagg.id} disabled={configuredBaggInterfaces.has(bagg.id) && bagg.id !== iface.bridgeAggregationId}>{bagg.name}</option>)}
                                                            </Select>
                                                        </Field>
                                                        <Field label="M-LAG 组 ID"><Input value={iface.groupId} onChange={e => updateInterface(index, { groupId: e.target.value })} /></Field>
                                                    </div>
                                                    <div className="pt-2 border-t border-slate-600/50">
                                                        <h6 className="text-xs font-semibold text-slate-300 mb-2">接口级参数 (覆盖全局)</h6>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Field label="系统MAC地址"><Input value={iface.systemMac || ''} onChange={e => updateInterface(index, { systemMac: e.target.value })} placeholder="使用全局配置"/></Field>
                                                            <Field label="系统优先级"><Input value={iface.systemPriority || ''} onChange={e => updateInterface(index, { systemPriority: e.target.value })} placeholder="使用全局配置"/></Field>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-slate-600/50">
                                                        <Checkbox label="DRCP短超时" checked={iface.drcpShortTimeout || false} onChange={e => updateInterface(index, { drcpShortTimeout: e.target.checked })} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-medium text-slate-300">Keepalive 配置</h5>
                                <Checkbox label="启用 Keepalive" checked={config.keepalive.enabled} onChange={e => updateKeepaliveConfig({ enabled: e.target.checked })} />
                                {config.keepalive.enabled && (
                                    <div className="pl-6 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="目的IP"><Input value={config.keepalive.destinationIp} onChange={e => updateKeepaliveConfig({ destinationIp: e.target.value })} /></Field>
                                            <Field label="源IP"><Input value={config.keepalive.sourceIp} onChange={e => updateKeepaliveConfig({ sourceIp: e.target.value })} /></Field>
                                            <Field label="UDP端口" note="默认6400"><Input value={config.keepalive.udpPort} onChange={e => updateKeepaliveConfig({ udpPort: e.target.value })} /></Field>
                                            <Field label="VPN实例 (可选)"><Input value={config.keepalive.vpnInstance} onChange={e => updateKeepaliveConfig({ vpnInstance: e.target.value })} /></Field>
                                            <Field label="发送间隔(ms)" note="默认1000"><Input value={config.keepalive.interval} onChange={e => updateKeepaliveConfig({ interval: e.target.value })} /></Field>
                                            <Field label="超时时间(s)" note="默认5"><Input value={config.keepalive.timeout} onChange={e => updateKeepaliveConfig({ timeout: e.target.value })} /></Field>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-medium text-slate-300">MAD (Multi-Active Detection) 配置</h5>
                                <Field label="分裂后接口默认动作">
                                    <div className="flex text-xs">
                                        <button onClick={() => updateMadConfig({ defaultAction: 'down' })} className={`px-2 py-1 rounded-l ${config.mad.defaultAction === 'down' ? 'bg-blue-600 text-white' : 'bg-slate-600'}`}>Down (默认)</button>
                                        <button onClick={() => updateMadConfig({ defaultAction: 'none' })} className={`px-2 py-1 rounded-r ${config.mad.defaultAction === 'none' ? 'bg-blue-600 text-white' : 'bg-slate-600'}`}>保持原状 (None)</button>
                                    </div>
                                </Field>
                                <div className="pt-2 border-t border-slate-700/50 space-y-3">
                                    <InterfaceListManager title="M-LAG保留接口 (Exclude)" interfaces={config.mad.excludeInterfaces} onUpdate={val => updateMadConfig({ excludeInterfaces: val })} availableInterfaces={allAvailableInterfacesForMad} configuredInterfaces={allMadInterfaces} />
                                    <InterfaceListManager title="M-LAG MAD DOWN接口 (Include)" interfaces={config.mad.includeInterfaces} onUpdate={val => updateMadConfig({ includeInterfaces: val })} availableInterfaces={allAvailableInterfacesForMad} configuredInterfaces={allMadInterfaces} />
                                </div>
                                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                    <Checkbox label="所有逻辑接口为保留接口" checked={config.mad.excludeLogicalInterfaces} onChange={e => updateMadConfig({ excludeLogicalInterfaces: e.target.checked })} />
                                    <Checkbox label="开启M-LAG MAD DOWN状态保持功能" checked={config.mad.persistent} onChange={e => updateMadConfig({ persistent: e.target.checked })} />
                                </div>
                            </div>
                        </>
                    )}

                    {selectedNode.vendor === Vendor.Huawei && config.huawei && (
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-medium text-slate-300">DFS Group &amp; Dual-Active Detection</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="DFS Group ID"><Input value={config.huawei.dfsGroupId} onChange={e => updateHuaweiMlagConfig({ dfsGroupId: e.target.value })} /></Field>
                                    <Field label="DFS Group Priority" note="数值越大越优先"><Input value={config.huawei.dfsGroupPriority} onChange={e => updateHuaweiMlagConfig({ dfsGroupPriority: e.target.value })} /></Field>
                                </div>
                                <Field label="Authentication Password"><Input type="password" value={config.huawei.authenticationPassword} onChange={e => updateHuaweiMlagConfig({ authenticationPassword: e.target.value })} /></Field>
                                <div className="pt-2 border-t border-slate-700/50">
                                     <h6 className="text-xs font-semibold text-slate-300 my-2">Dual-Active Detection</h6>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Source IP"><Input value={config.huawei.dualActiveSourceIp} onChange={e => updateHuaweiMlagConfig({ dualActiveSourceIp: e.target.value })} /></Field>
                                        <Field label="Peer IP"><Input value={config.huawei.dualActivePeerIp} onChange={e => updateHuaweiMlagConfig({ dualActivePeerIp: e.target.value })} /></Field>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-700/50">
                                    <h6 className="text-xs font-semibold text-slate-300 mb-2">Active-Standby Election Protocols</h6>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Checkbox label="ARP" checked={config.huawei.activeStandbyElection?.arp} onChange={e => updateHuaweiMlagConfig({ activeStandbyElection: { ...config.huawei.activeStandbyElection, arp: e.target.checked } })} />
                                        <Checkbox label="ND" checked={config.huawei.activeStandbyElection?.nd} onChange={e => updateHuaweiMlagConfig({ activeStandbyElection: { ...config.huawei.activeStandbyElection, nd: e.target.checked } })} />
                                        <Checkbox label="IGMP" checked={config.huawei.activeStandbyElection?.igmp} onChange={e => updateHuaweiMlagConfig({ activeStandbyElection: { ...config.huawei.activeStandbyElection, igmp: e.target.checked } })} />
                                        <Checkbox label="DHCP" checked={config.huawei.activeStandbyElection?.dhcp} onChange={e => updateHuaweiMlagConfig({ activeStandbyElection: { ...config.huawei.activeStandbyElection, dhcp: e.target.checked } })} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <h5 className="text-sm font-medium text-slate-300">Peer-Link Interface</h5>
                                <Field label="Peer-Link Eth-Trunk ID"><Input value={config.huawei.peerLinkTrunkId} onChange={e => updateHuaweiMlagConfig({ peerLinkTrunkId: e.target.value })} placeholder="e.g., 100" /></Field>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">M-LAG Member Interfaces</h5><button onClick={addHuaweiInterface} className="px-2 py-1 bg-green-600 text-white text-xs rounded">Add Interface</button></div>
                                {config.huawei.interfaces.map((iface, index) => (
                                    <div key={iface.id} className="bg-slate-900/50 p-3 rounded space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h6 className="text-xs font-semibold text-slate-400">接口 {index + 1}</h6>
                                            <button onClick={() => removeHuaweiInterface(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <Field label="聚合接口 Eth-Trunk ID">
                                                <Select value={iface.ethTrunkId} onChange={e => updateHuaweiInterface(index, { ethTrunkId: e.target.value })}>
                                                    <option value="">-- 选择 --</option>
                                                    {availableEthTrunks.map(id => (
                                                        <option key={id} value={id}>Eth-Trunk {id}</option>
                                                    ))}
                                                </Select>
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="M-LAG ID"><Input value={iface.mlagId} onChange={e => updateHuaweiInterface(index, { mlagId: e.target.value })} /></Field>
                                            <Field label="DFS Group ID"><Input value={config.huawei?.dfsGroupId} disabled /></Field>
                                        </div>
                                        <Field label="模式">
                                            <Select value={iface.mode} onChange={e => updateHuaweiInterface(index, { mode: e.target.value as any })}>
                                                <option value="dual-active">双活模式 (Dual-Active)</option>
                                                <option value="active-standby">主备模式 (Active-Standby)</option>
                                            </Select>
                                        </Field>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-48 min-h-[5rem]">
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
                </div>
            )}
             {isExpanded && !isApplicable && (
                <div className="border-t border-slate-600 p-3">
                    <p className="text-xs text-slate-500 italic">M-LAG is only available on switches.</p>
                </div>
            )}
        </div>
    );
};

export default MLAGConfig;
