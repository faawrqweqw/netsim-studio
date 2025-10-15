
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
    const isApplicable = useMemo(() => 
        selectedNode.type.includes('Switch') ||
        [DeviceType.Router, DeviceType.AC, DeviceType.Firewall].includes(selectedNode.type),
    [selectedNode.type]);
    
    const vendorOptions = useMemo(() => 
        VENDOR_LAG_OPTIONS[selectedNode.vendor] || VENDOR_LAG_OPTIONS[Vendor.Cisco], 
    [selectedNode.vendor]);

    // --- State Update Logic ---
    const updateConfig = useCallback((updates: Partial<Node['config']['linkAggregation']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                linkAggregation: { ...selectedNode.config.linkAggregation, ...updates }
            }
        });
    }, [selectedNode, onNodeUpdate]);

    // --- Member Interface Handlers ---
    const handleAutoDetectInterfaces = useCallback(() => {
        const nodeConnections = connections.filter(c => c.from.nodeId === selectedNode.id || c.to.nodeId === selectedNode.id);
        const detectedMembers: LinkAggregationMember[] = nodeConnections.map(connection => {
            const portId = connection.from.nodeId === selectedNode.id ? connection.from.portId : connection.to.portId;
            const port = selectedNode.ports.find(p => p.id === portId);
            const newMember: LinkAggregationMember = {
                id: `member-${portId}-${Date.now()}`,
                name: port?.name || '',
                portPriority: '32768',
                lacpMode: 'active',
                lacpPeriod: 'long',
            };
            return newMember;
        }).filter(member => member.name);
        
        const uniqueMembers = Array.from(new Map(detectedMembers.map(item => [item.name, item])).values());
        updateConfig({ members: uniqueMembers });
    }, [selectedNode, connections, updateConfig]);

    const handleAddMember = useCallback(() => {
        const newMember: LinkAggregationMember = { 
            id: `member-new-${Date.now()}`, name: '', portPriority: '32768', lacpMode: 'active', lacpPeriod: 'long' 
        };
        updateConfig({ members: [...config.members, newMember] });
    }, [config.members, updateConfig]);

    const handleUpdateMember = useCallback((index: number, updates: Partial<LinkAggregationMember>) => {
        const updatedMembers = [...config.members];
        updatedMembers[index] = { ...updatedMembers[index], ...updates };
        updateConfig({ members: updatedMembers });
    }, [config.members, updateConfig]);

    const handleRemoveMember = useCallback((index: number) => {
        updateConfig({ members: config.members.filter((_, i) => i !== index) });
    }, [config.members, updateConfig]);
    
    // --- Memoized Derived State ---
    const isDynamicMode = useMemo(() => {
        const { vendor } = selectedNode;
        const { mode } = config;
        if (vendor === Vendor.Cisco) return ['active', 'passive', 'auto', 'desirable'].includes(mode);
        if (vendor === Vendor.Huawei) return mode === 'lacp-static';
        if (vendor === Vendor.H3C) return mode === 'dynamic';
        return false;
    }, [selectedNode.vendor, config.mode]);

    const configuredMemberPorts = useMemo(() => new Set(config.members.map(m => m.name)), [config.members]);
    const availablePorts = useMemo(() => selectedNode.ports.filter(p => p.status === 'connected'), [selectedNode.ports]);

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
                    
                    {/* --- Global Config Card --- */}
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <h5 className="text-sm font-medium text-slate-300">全局配置</h5>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Group ID"><Input type="text" value={config.groupId} onChange={e => updateConfig({ groupId: e.target.value })} /></Field>
                            <Field label="Mode"><Select value={config.mode} onChange={e => updateConfig({ mode: e.target.value })}>{vendorOptions.modeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Select></Field>
                        </div>
                        <Field label="Description"><Input placeholder="e.g., Link to Core Switch" value={config.description} onChange={e => updateConfig({ description: e.target.value })} /></Field>
                        <Field label="Load Balance Algorithm"><Select value={config.loadBalanceAlgorithm} onChange={e => updateConfig({ loadBalanceAlgorithm: e.target.value })}>{vendorOptions.loadBalanceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Select></Field>
                        
                        {isDynamicMode && (
                            <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                <h6 className="text-xs font-semibold text-slate-300">LACP System Settings</h6>
                                {selectedNode.vendor === Vendor.Huawei && <Field label="Priority Command Mode"><Select value={config.huaweiLacpPriorityMode || 'default'} onChange={e => updateConfig({ huaweiLacpPriorityMode: e.target.value as any })}><option value="default">Default (lacp priority ...)</option><option value="system-priority">System Priority (lacp system-priority ...)</option></Select></Field>}
                                <Field label="System Priority"><Input type="text" value={config.systemPriority} onChange={e => updateConfig({ systemPriority: e.target.value })} /></Field>
                            </div>
                        )}
                         {selectedNode.vendor === Vendor.Huawei && config.mode === 'lacp-static' && (
                            <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                <h6 className="text-xs font-semibold text-slate-300">Huawei LACP Settings</h6>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Timeout"><Select value={config.timeout} onChange={e => updateConfig({ timeout: e.target.value as any })}><option value="slow">Slow (90s)</option><option value="fast">Fast (3s)</option></Select></Field>
                                    <Field label="Preempt Delay (s)"><Input type="text" value={config.preemptDelay} onChange={e => updateConfig({ preemptDelay: e.target.value })} disabled={!config.preemptEnabled} /></Field>
                                </div>
                                <Checkbox label="Enable Preemption" checked={!!config.preemptEnabled} onChange={e => updateConfig({ preemptEnabled: e.target.checked })} />
                            </div>
                         )}
                    </div>

                    {/* --- Member Interfaces Card --- */}
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">成员接口</h5><div className="flex items-center gap-2"><button onClick={handleAutoDetectInterfaces} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">自动识别</button><button onClick={handleAddMember} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加接口</button></div></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400">
                                        <th className="py-2 pr-2">接口</th>
                                        {isDynamicMode && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && <th className="py-2 px-2">端口优先级</th>}
                                        {isDynamicMode && selectedNode.vendor === Vendor.H3C && <th className="py-2 px-2">LACP 模式</th>}
                                        {isDynamicMode && selectedNode.vendor === Vendor.H3C && <th className="py-2 px-2">LACP 超时</th>}
                                        <th className="py-2 pl-2 w-12 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {config.members.map((member, index) => (
                                        <tr key={member.id} className="border-b border-slate-700/50">
                                            <td className="py-2 pr-2">
                                                <Select value={member.name} onChange={e => handleUpdateMember(index, { name: e.target.value })}>
                                                    <option value="">-- 选择接口 --</option>
                                                    {availablePorts.map(p => <option key={p.id} value={p.name} disabled={configuredMemberPorts.has(p.name) && p.name !== member.name}>{p.name}</option>)}
                                                </Select>
                                            </td>
                                            {isDynamicMode && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && <td className="py-2 px-2"><Input type="text" value={member.portPriority} onChange={e => handleUpdateMember(index, { portPriority: e.target.value })} /></td>}
                                            {isDynamicMode && selectedNode.vendor === Vendor.H3C && <td className="py-2 px-2"><Select value={member.lacpMode} onChange={e => handleUpdateMember(index, { lacpMode: e.target.value as any })}><option value="active">Active</option><option value="passive">Passive</option></Select></td>}
                                            {isDynamicMode && selectedNode.vendor === Vendor.H3C && <td className="py-2 px-2"><Select value={member.lacpPeriod} onChange={e => handleUpdateMember(index, { lacpPeriod: e.target.value as any })}><option value="long">Long (90s)</option><option value="short">Short (3s)</option></Select></td>}
                                            <td className="py-2 pl-2 text-right"><button onClick={() => handleRemoveMember(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* --- Aggregation Interface Mode Card --- */}
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <h5 className="text-sm font-medium text-slate-300">聚合口模式</h5>
                         <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => updateConfig({ interfaceMode: config.interfaceMode === 'access' ? 'unconfigured' : 'access' })} className={`px-2 py-1 text-xs rounded ${config.interfaceMode === 'access' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300'}`}>Access</button>
                            <button onClick={() => updateConfig({ interfaceMode: config.interfaceMode === 'trunk' ? 'unconfigured' : 'trunk' })} className={`px-2 py-1 text-xs rounded ${config.interfaceMode === 'trunk' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300'}`}>Trunk</button>
                            <button onClick={() => updateConfig({ interfaceMode: config.interfaceMode === 'l3' ? 'unconfigured' : 'l3' })} className={`px-2 py-1 text-xs rounded ${config.interfaceMode === 'l3' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300'}`}>三层</button>
                        </div>
                        {config.interfaceMode === 'access' && <Field label={selectedNode.vendor === Vendor.Huawei ? 'Default VLAN' : 'VLAN ID'}><Input type="text" placeholder="e.g., 10" value={config.accessVlan} onChange={e => updateConfig({ accessVlan: e.target.value })} /></Field>}
                        {config.interfaceMode === 'trunk' && (
                            <div className="space-y-2">
                                <Field label={selectedNode.vendor === Vendor.Cisco ? 'Native VLAN' : 'PVID'}><Input type="text" placeholder="e.g., 1" value={config.trunkNativeVlan} onChange={e => updateConfig({ trunkNativeVlan: e.target.value })} /></Field>
                                <Field label="Allowed VLANs"><Input type="text" placeholder="e.g., 10,20,30-40" value={config.trunkAllowedVlans} onChange={e => updateConfig({ trunkAllowedVlans: e.target.value })} /></Field>
                            </div>
                        )}
                    </div>
                    
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
