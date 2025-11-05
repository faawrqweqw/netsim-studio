
import React, { useCallback, useMemo, useState } from 'react';
import { Node, DeviceType, Vendor, Connection, LinkAggregationMember } from '../../types';
import { SpinnerIcon } from '../Icons';

interface LinkAggregationConfigProps {
    selectedNode: Node;
    connections: Connection[];
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

// --- Reusable Form Components for Consistent Styling ---
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

// --- Data-driven configuration for vendor-specific options ---
const VENDOR_LAG_OPTIONS: Record<Vendor, {
    modeOptions: { value: string; label: string }[];
    loadBalanceOptions: { value: string; label: string }[];
}> = {
    [Vendor.Cisco]: {
        modeOptions: [
            { value: 'active', label: 'Active (LACP 主动)' },
            { value: 'passive', label: 'Passive (LACP 被动)' },
            { value: 'auto', label: 'Auto (PAgP 自动)' },
            { value: 'desirable', label: 'Desirable (PAgP 期望)' },
            { value: 'on', label: 'On (强制聚合)' },
        ],
        loadBalanceOptions: [
            { value: 'src-dst-ip', label: 'Source-Destination IP' },
            { value: 'src-dst-mac', label: 'Source-Destination MAC' },
            { value: 'src-ip', label: 'Source IP' },
            { value: 'dst-ip', label: 'Destination IP' },
            { value: 'src-mac', label: 'Source MAC' },
            { value: 'dst-mac', label: 'Destination MAC' },
            { value: 'src-dst-port', label: 'Source-Destination Port' },
        ],
    },
    [Vendor.Huawei]: {
        modeOptions: [
            { value: 'manual', label: '手工负载均衡 (manual)' },
            { value: 'lacp-static', label: '静态 LACP (lacp-static)' },
        ],
        loadBalanceOptions: [
            { value: 'dst-ip', label: 'Destination IP (dst-ip)' },
            { value: 'src-ip', label: 'Source IP (src-ip)' },
            { value: 'src-dst-ip', label: 'Source-Destination IP (src-dst-ip)' },
            { value: 'dst-mac', label: 'Destination MAC (dst-mac)' },
            { value: 'src-mac', label: 'Source MAC (src-mac)' },
            { value: 'src-dst-mac', label: 'Source-Destination MAC (src-dst-mac)' },
        ],
    },
    [Vendor.H3C]: {
        modeOptions: [
            { value: 'static', label: '静态聚合 (static)' },
            { value: 'dynamic', label: '动态聚合 (dynamic LACP)' },
        ],
        loadBalanceOptions: [
            { value: 'destination-ip', label: 'Destination IP Address' },
            { value: 'destination-mac', label: 'Destination MAC Address' },
            { value: 'source-ip', label: 'Source IP Address' },
            { value: 'source-mac', label: 'Source MAC Address' },
        ],
    },
    [Vendor.Generic]: { modeOptions: [], loadBalanceOptions: [] },
};

// --- Sub-components for better structure ---

const CliDisplay: React.FC<{ cli: string; isGenerating: boolean }> = ({ cli, isGenerating }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const handleCopy = () => {
        navigator.clipboard.writeText(cli);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="bg-slate-800/50 rounded-lg">
            <div className="flex justify-between items-center p-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h5 className="text-sm font-semibold text-slate-300">CLI Commands</h5>
                </div>
                {isExpanded && (
                    <button onClick={handleCopy} className="px-2 py-1 text-xs bg-slate-600 rounded-md hover:bg-slate-500">
                        {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                )}
            </div>
            {isExpanded && (
                 <pre className="text-xs bg-slate-900 rounded-b-lg p-2 overflow-auto whitespace-pre-wrap max-h-48 min-h-[5rem] border-t border-slate-700">
                    {isGenerating ? (
                        <div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>
                    ) : (
                        cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                    )}
                </pre>
            )}
        </div>
    );
};


const LinkAggregationConfig: React.FC<LinkAggregationConfigProps> = ({ selectedNode, connections, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.linkAggregation;
    const isApplicable = useMemo(() => selectedNode.type.includes('Switch') || [DeviceType.Router, DeviceType.AC, DeviceType.Firewall].includes(selectedNode.type), [selectedNode.type]);
    const vendorOptions = useMemo(() => VENDOR_LAG_OPTIONS[selectedNode.vendor] || VENDOR_LAG_OPTIONS[Vendor.Cisco], [selectedNode.vendor]);

    const updateConfig = useCallback((updates: Partial<Node['config']['linkAggregation']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, linkAggregation: { ...selectedNode.config.linkAggregation, ...updates } } });
    }, [selectedNode, onNodeUpdate]);

    const updateGroup = useCallback((index: number, updates: any) => {
        const groups = [...(config.groups || [])];
        groups[index] = { ...groups[index], ...updates };
        updateConfig({ groups });
    }, [config.groups, updateConfig]);

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set((config.groups || []).map(g => g.id)));
    React.useEffect(() => {
        const ids = new Set((config.groups || []).map(g => g.id));
        // Keep only existing ids, add any new ones
        setExpandedGroups(prev => {
            const next = new Set<string>();
            ids.forEach(id => { if (prev.has(id)) next.add(id); });
            // If none expanded, expand the first by default
            if (next.size === 0 && (config.groups || []).length > 0) next.add((config.groups || [])[0].id);
            return next;
        });
    }, [config.groups]);

    const toggleGroupExpand = (id: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const addGroup = useCallback(() => {
        const defaultMode = selectedNode.vendor === Vendor.Huawei ? 'lacp-static' : (selectedNode.vendor === Vendor.H3C ? 'dynamic' : 'active');
        const groups = (config.groups || []) as any[];
        const newGroup = {
            id: `lag-${Date.now()}`,
            groupId: `${groups.length + 1}`,
            mode: defaultMode,
            members: [] as LinkAggregationMember[],
            systemPriority: '32768',
            loadBalanceAlgorithm: vendorOptions.loadBalanceOptions[0]?.value || '',
            description: '',
            interfaceMode: 'unconfigured' as const,
            accessVlan: '',
            trunkNativeVlan: '',
            trunkAllowedVlans: '',
            preemptEnabled: true,
            preemptDelay: '30',
            timeout: 'slow' as const,
            huaweiLacpPriorityMode: 'default' as const,
        };
        updateConfig({ groups: [...groups, newGroup] });
        setExpandedGroups(prev => new Set(prev).add(newGroup.id));
    }, [config.groups, selectedNode.vendor, vendorOptions.loadBalanceOptions, updateConfig]);

    const removeGroup = useCallback((index: number) => {
        const toRemove = (config.groups || [])[index]?.id;
        updateConfig({ groups: (config.groups || []).filter((_, i) => i !== index) });
        if (toRemove) setExpandedGroups(prev => { const next = new Set(prev); next.delete(toRemove); return next; });
    }, [config.groups, updateConfig]);

    const availablePorts = useMemo(() => selectedNode.ports.filter(p => p.status === 'connected'), [selectedNode.ports]);
    const usedPortsAcrossGroups = useMemo(() => new Set(((config.groups || []) as any[]).flatMap((g: any) => (g.members || []).map((m: any) => m.name)).filter(Boolean)), [config.groups]);

    // Legacy-to-new migration: if no groups[] present, create one from legacy fields
    React.useEffect(() => {
        if (!Array.isArray((config as any).groups)) {
            const legacy: any = config as any;
            const defaultMode = selectedNode.vendor === Vendor.Huawei ? 'lacp-static' : (selectedNode.vendor === Vendor.H3C ? 'dynamic' : 'active');
            const migrated = {
                id: 'lag-1',
                groupId: legacy.groupId || '1',
                mode: legacy.mode || defaultMode,
                members: legacy.members || [],
                systemPriority: legacy.systemPriority || '32768',
                loadBalanceAlgorithm: legacy.loadBalanceAlgorithm || (vendorOptions.loadBalanceOptions[0]?.value || ''),
                description: legacy.description || '',
                interfaceMode: legacy.interfaceMode || 'unconfigured',
                accessVlan: legacy.accessVlan || '',
                trunkNativeVlan: legacy.trunkNativeVlan || '',
                trunkAllowedVlans: legacy.trunkAllowedVlans || '',
                preemptEnabled: legacy.preemptEnabled ?? true,
                preemptDelay: legacy.preemptDelay || '30',
                timeout: legacy.timeout || 'slow',
                huaweiLacpPriorityMode: legacy.huaweiLacpPriorityMode || 'default',
            };
            updateConfig({ groups: [migrated] });
        }
    }, [config, selectedNode.vendor, vendorOptions.loadBalanceOptions, updateConfig]);

    const autoDetectMembers = useCallback((groupIndex: number) => {
        const nodeConnections = connections.filter(c => c.from.nodeId === selectedNode.id || c.to.nodeId === selectedNode.id);
        const detected: LinkAggregationMember[] = nodeConnections.map(connection => {
            const portId = connection.from.nodeId === selectedNode.id ? connection.from.portId : connection.to.portId;
            const port = selectedNode.ports.find(p => p.id === portId);
            return { id: `member-${portId}-${Date.now()}`, name: port?.name || '', portPriority: '32768', lacpMode: 'active', lacpPeriod: 'long' };
        }).filter(m => m.name);
        const unique = Array.from(new Map(detected.map(d => [d.name, d])).values());
        const keepSelf = new Set(config.groups[groupIndex].members.map(m => m.name));
        const filtered = unique.filter(m => !usedPortsAcrossGroups.has(m.name) || keepSelf.has(m.name));
        updateGroup(groupIndex, { members: filtered });
    }, [connections, selectedNode, config.groups, usedPortsAcrossGroups, updateGroup]);

    const addMember = useCallback((groupIndex: number) => {
        const newMember: LinkAggregationMember = { id: `member-new-${Date.now()}`, name: '', portPriority: '32768', lacpMode: 'active', lacpPeriod: 'long' };
        const members = [...config.groups[groupIndex].members, newMember];
        updateGroup(groupIndex, { members });
    }, [config.groups, updateGroup]);

    const updateMember = useCallback((groupIndex: number, index: number, updates: Partial<LinkAggregationMember>) => {
        const members = [...config.groups[groupIndex].members];
        members[index] = { ...members[index], ...updates };
        updateGroup(groupIndex, { members });
    }, [config.groups, updateGroup]);

    const removeMember = useCallback((groupIndex: number, index: number) => {
        const members = config.groups[groupIndex].members.filter((_, i) => i !== index);
        updateGroup(groupIndex, { members });
    }, [config.groups, updateGroup]);

    const isDynamicMode = useCallback((mode: string) => {
        const vendor = selectedNode.vendor;
        if (vendor === Vendor.Cisco) return ['active', 'passive', 'auto', 'desirable'].includes(mode);
        if (vendor === Vendor.Huawei) return mode === 'lacp-static';
        if (vendor === Vendor.H3C) return mode === 'dynamic';
        return false;
    }, [selectedNode.vendor]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">Link Aggregation</h4>
                </div>
                {isApplicable && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                )}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end">
                        <button onClick={addGroup} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">新增聚合口</button>
                    </div>

                    {(config.groups || []).map((group, gIndex) => {
                        const configuredMemberPorts = new Set(group.members.map(m => m.name));
                        return (
                            <div key={group.id} className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                                <div className="flex justify-between items-center">
                                    <button className="flex items-center gap-2" onClick={() => toggleGroupExpand(group.id)}>
                                        <span className={`transition-transform text-slate-400 ${expandedGroups.has(group.id) ? 'rotate-90' : ''}`}>▶</span>
                                        <h5 className="text-sm font-medium text-slate-300">聚合口 {group.groupId}</h5>
                                    </button>
                                    <button onClick={() => removeGroup(gIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除聚合口</button>
                                </div>
                                {expandedGroups.has(group.id) && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Group ID"><Input type="text" value={group.groupId} onChange={e => updateGroup(gIndex, { groupId: e.target.value })} /></Field>
                                            <Field label="Mode"><Select value={group.mode} onChange={e => updateGroup(gIndex, { mode: e.target.value })}>{vendorOptions.modeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Select></Field>
                                        </div>
                                        <Field label="Description"><Input placeholder="e.g., Link to Core Switch" value={group.description} onChange={e => updateGroup(gIndex, { description: e.target.value })} /></Field>
                                        <Field label="Load Balance Algorithm"><Select value={group.loadBalanceAlgorithm} onChange={e => updateGroup(gIndex, { loadBalanceAlgorithm: e.target.value })}>{vendorOptions.loadBalanceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Select></Field>

                                        {isDynamicMode(group.mode) && (
                                            <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                                <h6 className="text-xs font-semibold text-slate-300">LACP System Settings</h6>
                                                {selectedNode.vendor === Vendor.Huawei && (
                                                    <Field label="Priority Command Mode">
                                                        <Select value={group.huaweiLacpPriorityMode || 'default'} onChange={e => updateGroup(gIndex, { huaweiLacpPriorityMode: e.target.value as any })}>
                                                            <option value="default">Default (lacp priority ...)</option>
                                                            <option value="system-priority">System Priority (lacp system-priority ...)</option>
                                                        </Select>
                                                    </Field>
                                                )}
                                                <Field label="System Priority"><Input type="text" value={group.systemPriority} onChange={e => updateGroup(gIndex, { systemPriority: e.target.value })} /></Field>
                                            </div>
                                        )}

                                        {selectedNode.vendor === Vendor.Huawei && group.mode === 'lacp-static' && (
                                            <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                                <h6 className="text-xs font-semibold text-slate-300">Huawei LACP Settings</h6>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Timeout"><Select value={group.timeout} onChange={e => updateGroup(gIndex, { timeout: e.target.value as any })}><option value="slow">Slow (90s)</option><option value="fast">Fast (3s)</option></Select></Field>
                                                    <Field label="Preempt Delay (s)"><Input type="text" value={group.preemptDelay} onChange={e => updateGroup(gIndex, { preemptDelay: e.target.value })} disabled={!group.preemptEnabled} /></Field>
                                                </div>
                                                <Checkbox label="Enable Preemption" checked={!!group.preemptEnabled} onChange={e => updateGroup(gIndex, { preemptEnabled: e.target.checked })} />
                                            </div>
                                        )}

                                        <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                            <div className="flex justify-between items-center"><h6 className="text-xs font-semibold text-slate-300">成员接口</h6><div className="flex items-center gap-2"><button onClick={() => autoDetectMembers(gIndex)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">自动识别</button><button onClick={() => addMember(gIndex)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加接口</button></div></div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-700 text-slate-400">
                                                            <th className="py-2 pr-2">接口</th>
                                                            {isDynamicMode(group.mode) && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && <th className="py-2 px-2">端口优先级</th>}
                                                            {isDynamicMode(group.mode) && selectedNode.vendor === Vendor.H3C && <th className="py-2 px-2">LACP 模式</th>}
                                                            {isDynamicMode(group.mode) && selectedNode.vendor === Vendor.H3C && <th className="py-2 px-2">LACP 超时</th>}
                                                            <th className="py-2 pl-2 w-12 text-right">操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.members.map((member, index) => (
                                                            <tr key={member.id} className="border-b border-slate-700/50">
                                                                <td className="py-2 pr-2">
                                                                    <Select value={member.name} onChange={e => updateMember(gIndex, index, { name: e.target.value })}>
                                                                        <option value="">-- 选择接口 --</option>
                                                                        {availablePorts.map(p => {
                                                                            const taken = usedPortsAcrossGroups.has(p.name) && p.name !== member.name;
                                                                            const takenInGroup = configuredMemberPorts.has(p.name) && p.name !== member.name;
                                                                            return <option key={p.id} value={p.name} disabled={taken || takenInGroup}>{p.name}</option>;
                                                                        })}
                                                                    </Select>
                                                                </td>
                                                                {isDynamicMode(group.mode) && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && <td className="py-2 px-2"><Input type="text" value={member.portPriority} onChange={e => updateMember(gIndex, index, { portPriority: e.target.value })} /></td>}
                                                                {isDynamicMode(group.mode) && selectedNode.vendor === Vendor.H3C && <td className="py-2 px-2"><Select value={member.lacpMode} onChange={e => updateMember(gIndex, index, { lacpMode: e.target.value as any })}><option value="active">Active</option><option value="passive">Passive</option></Select></td>}
                                                                {isDynamicMode(group.mode) && selectedNode.vendor === Vendor.H3C && <td className="py-2 px-2"><Select value={member.lacpPeriod} onChange={e => updateMember(gIndex, index, { lacpPeriod: e.target.value as any })}><option value="long">Long (90s)</option><option value="short">Short (3s)</option></Select></td>}
                                                                <td className="py-2 pl-2 text-right"><button onClick={() => removeMember(gIndex, index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-slate-900/30 rounded-lg space-y-3">
                                            <h6 className="text-xs font-semibold text-slate-300">聚合口模式</h6>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button onClick={() => updateGroup(gIndex, { interfaceMode: group.interfaceMode === 'access' ? 'unconfigured' : 'access' })} className={`px-2 py-1 text-xs rounded ${group.interfaceMode === 'access' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300'}`}>Access</button>
                                                <button onClick={() => updateGroup(gIndex, { interfaceMode: group.interfaceMode === 'trunk' ? 'unconfigured' : 'trunk' })} className={`px-2 py-1 text-xs rounded ${group.interfaceMode === 'trunk' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300'}`}>Trunk</button>
                                                <button onClick={() => updateGroup(gIndex, { interfaceMode: group.interfaceMode === 'l3' ? 'unconfigured' : 'l3' })} className={`px-2 py-1 text-xs rounded ${group.interfaceMode === 'l3' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300'}`}>三层</button>
                                            </div>
                                            {group.interfaceMode === 'access' && <Field label={selectedNode.vendor === Vendor.Huawei ? 'Default VLAN' : 'VLAN ID'}><Input type="text" placeholder="e.g., 10" value={group.accessVlan} onChange={e => updateGroup(gIndex, { accessVlan: e.target.value })} /></Field>}
                                            {group.interfaceMode === 'trunk' && (
                                                <div className="space-y-2">
                                                    <Field label={selectedNode.vendor === Vendor.Cisco ? 'Native VLAN' : 'PVID'}><Input type="text" placeholder="e.g., 1" value={group.trunkNativeVlan} onChange={e => updateGroup(gIndex, { trunkNativeVlan: e.target.value })} /></Field>
                                                    <Field label="Allowed VLANs"><Input type="text" placeholder="e.g., 10,20,30-40" value={group.trunkAllowedVlans} onChange={e => updateGroup(gIndex, { trunkAllowedVlans: e.target.value })} /></Field>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    <CliDisplay cli={config.cli} isGenerating={isGenerating} />
                </div>
            )}
            {isExpanded && !isApplicable && (
                <div className="border-t border-slate-600 p-3">
                    <p className="text-xs text-slate-500 italic">Link aggregation only available on switches, routers, firewalls, and access controllers.</p>
                </div>
            )}
        </div>
    );
};

export default LinkAggregationConfig;
