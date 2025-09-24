import React, { useCallback, useMemo } from 'react';
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

const LinkAggregationConfig: React.FC<LinkAggregationConfigProps> = ({ selectedNode, connections, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateLinkAggregationConfig = useCallback((updates: Partial<Node['config']['linkAggregation']>) => {
        if (!selectedNode) return;
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                linkAggregation: { ...selectedNode.config.linkAggregation, ...updates }
            }
        });
    }, [selectedNode, onNodeUpdate]);

    const handleInterfaceModeChange = useCallback((mode: 'access' | 'trunk' | 'l3') => {
        if (!selectedNode) return;
        const config = selectedNode.config.linkAggregation;
        const newMode = config.interfaceMode === mode ? 'unconfigured' : mode;
        updateLinkAggregationConfig({ interfaceMode: newMode });
    }, [selectedNode, updateLinkAggregationConfig]);

    const handleAutoDetectInterfaces = useCallback(() => {
        if (!selectedNode) return;
        const nodeConnections = connections.filter(c =>
            c.from.nodeId === selectedNode.id || c.to.nodeId === selectedNode.id
        );

        // Fix: Explicitly type the member object to satisfy LinkAggregationMember type.
        const detectedMembers: LinkAggregationMember[] = nodeConnections.map(connection => {
            const isFromNode = connection.from.nodeId === selectedNode.id;
            const portId = isFromNode ? connection.from.portId : connection.to.portId;
            const port = selectedNode.ports.find(p => p.id === portId);
            const member: LinkAggregationMember = {
                id: `member-${portId}-${Date.now()}`,
                name: port?.name || '',
                portPriority: '32768',
                lacpMode: 'active',
                lacpPeriod: 'long',
            };
            return member;
        }).filter(member => member.name);

        const uniqueMembers = Array.from(new Map(detectedMembers.map(item => [item.name, item])).values());
        updateLinkAggregationConfig({ members: uniqueMembers });
    }, [selectedNode, connections, updateLinkAggregationConfig]);

    const handleAddMember = useCallback(() => {
        if (!selectedNode) return;
        const config = selectedNode.config.linkAggregation;
        const newMember: LinkAggregationMember = { 
            id: `member-new-${Date.now()}`, 
            name: '', 
            portPriority: '32768', 
            lacpMode: 'active', 
            lacpPeriod: 'long' 
        };
        updateLinkAggregationConfig({ members: [...config.members, newMember] });
    }, [selectedNode, updateLinkAggregationConfig]);

    const handleUpdateMember = useCallback((index: number, updates: Partial<LinkAggregationMember>) => {
        if (!selectedNode) return;
        const config = selectedNode.config.linkAggregation;
        const updatedMembers = [...config.members];
        updatedMembers[index] = { ...updatedMembers[index], ...updates };
        updateLinkAggregationConfig({ members: updatedMembers });
    }, [selectedNode, updateLinkAggregationConfig]);

    const handleRemoveMember = useCallback((index: number) => {
        if (!selectedNode) return;
        const config = selectedNode.config.linkAggregation;
        const updatedMembers = config.members.filter((_, i) => i !== index);
        updateLinkAggregationConfig({ members: updatedMembers });
    }, [selectedNode, updateLinkAggregationConfig]);
    
    if (!selectedNode) return null;
    
    const config = selectedNode.config.linkAggregation;
    const isApplicable = selectedNode.type.includes('Switch') ||
        selectedNode.type === DeviceType.Router ||
        selectedNode.type === DeviceType.AC ||
        selectedNode.type === DeviceType.Firewall;

    const isDynamicMode = useMemo(() => {
        const { vendor } = selectedNode;
        const { mode } = config;
        if (vendor === Vendor.Cisco) return mode === 'active' || mode === 'passive';
        if (vendor === Vendor.Huawei) return mode === 'lacp-static';
        if (vendor === Vendor.H3C) return mode === 'dynamic';
        return false;
    }, [selectedNode.vendor, config.mode]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">Link Aggregation</h4>
                </div>
                {isApplicable && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFeature();
                        }}
                        className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        {config.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                )}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-3">
                    {/* 基本配置 */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Group ID</label>
                            <input
                                type="text"
                                value={config.groupId}
                                onChange={(e) => updateLinkAggregationConfig({ groupId: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Mode</label>
                            <select
                                value={(() => {
                                    const availableOptions = (() => {
                                        switch (selectedNode.vendor) {
                                            case Vendor.Cisco: return ['active', 'passive', 'auto', 'desirable', 'on'];
                                            case Vendor.Huawei: return ['manual', 'lacp-static'];
                                            case Vendor.H3C: return ['static', 'dynamic'];
                                            default: return ['active', 'passive', 'on'];
                                        }
                                    })();
                                    return availableOptions.includes(config.mode) ? config.mode : availableOptions[0];
                                })()}
                                onChange={(e) => updateLinkAggregationConfig({ mode: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {(() => {
                                    switch (selectedNode.vendor) {
                                        case Vendor.Cisco:
                                            return (<> <option value="active">Active (LACP主动)</option> <option value="passive">Passive (LACP被动)</option> <option value="auto">Auto (PAgP自动)</option> <option value="desirable">Desirable (PAgP期望)</option> <option value="on">On (强制聚合)</option> </>);
                                        case Vendor.Huawei:
                                            return (<> <option value="manual">手工负载均衡 (manual)</option> <option value="lacp-static">静态LACP (lacp-static)</option> </>);
                                        case Vendor.H3C:
                                            return (<> <option value="static">静态聚合 (static)</option> <option value="dynamic">动态聚合 (dynamic LACP)</option> </>);
                                        default:
                                            return (<> <option value="active">Active</option> <option value="passive">Passive</option> <option value="on">On</option> </>);
                                    }
                                })()}
                            </select>
                        </div>
                    </div>
                    {isDynamicMode && (
                        <div className="p-2 bg-slate-800/50 rounded-md space-y-3">
                            <h5 className="text-xs font-semibold text-slate-300">LACP System Settings</h5>
                             {selectedNode.vendor === Vendor.Huawei && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Priority Command Mode</label>
                                    <select
                                        value={config.huaweiLacpPriorityMode || 'default'}
                                        onChange={(e) => updateLinkAggregationConfig({ huaweiLacpPriorityMode: e.target.value as any })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                    >
                                        <option value="default">Default (lacp priority ...)</option>
                                        <option value="system-priority">System Priority (lacp system-priority ...)</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">System Priority</label>
                                <input type="text" value={config.systemPriority} onChange={(e) => updateLinkAggregationConfig({ systemPriority: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                            </div>
                        </div>
                    )}
                     {selectedNode.vendor === Vendor.Huawei && config.mode === 'lacp-static' && (
                        <div className="p-2 bg-slate-800/50 rounded-md space-y-3">
                            <h5 className="text-xs font-semibold text-slate-300">Huawei LACP Settings</h5>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Timeout</label>
                                    <select value={config.timeout} onChange={e => updateLinkAggregationConfig({ timeout: e.target.value as any })} className="w-full bg-slate-700 rounded px-2 py-1 text-xs">
                                        <option value="slow">Slow (90s)</option>
                                        <option value="fast">Fast (3s)</option>
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-xs text-slate-400 mb-1">Preempt Delay (s)</label>
                                    <input type="text" value={config.preemptDelay} onChange={e => updateLinkAggregationConfig({ preemptDelay: e.target.value })} disabled={!config.preemptEnabled} className="w-full bg-slate-700 rounded px-2 py-1 text-xs" />
                                </div>
                            </div>
                             <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                                <input type="checkbox" checked={config.preemptEnabled} onChange={e => updateLinkAggregationConfig({ preemptEnabled: e.target.checked })} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"/>
                                Enable Preemption
                            </label>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                        <input
                            type="text"
                            placeholder="e.g., Link to Core Switch"
                            value={config.description}
                            onChange={(e) => updateLinkAggregationConfig({ description: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Load Balance Algorithm</label>
                        <select
                            value={(() => {
                                const availableOptions = (() => {
                                    switch (selectedNode.vendor) {
                                        case Vendor.Cisco: return ['src-dst-ip', 'src-dst-mac', 'src-ip', 'dst-ip', 'src-mac', 'dst-mac', 'src-dst-port'];
                                        case Vendor.Huawei: return ['dst-ip', 'src-ip', 'src-dst-ip', 'dst-mac', 'src-mac', 'src-dst-mac'];
                                        case Vendor.H3C: return ['destination-ip', 'destination-mac', 'source-ip', 'source-mac'];
                                        default: return ['src-dst-ip', 'src-dst-mac', 'src-ip', 'dst-ip', 'src-mac', 'dst-mac'];
                                    }
                                })();
                                return availableOptions.includes(config.loadBalanceAlgorithm) ? config.loadBalanceAlgorithm : availableOptions[0];
                            })()}
                            onChange={(e) => updateLinkAggregationConfig({ loadBalanceAlgorithm: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {(() => {
                                switch (selectedNode.vendor) {
                                    case Vendor.Cisco:
                                        return (<> <option value="src-dst-ip">Source-Destination IP</option> <option value="src-dst-mac">Source-Destination MAC</option> <option value="src-ip">Source IP</option> <option value="dst-ip">Destination IP</option> <option value="src-mac">Source MAC</option> <option value="dst-mac">Destination MAC</option> <option value="src-dst-port">Source-Destination Port</option> </>);
                                    case Vendor.Huawei:
                                        return (<> <option value="dst-ip">Destination IP (dst-ip)</option> <option value="src-ip">Source IP (src-ip)</option> <option value="src-dst-ip">Source-Destination IP (src-dst-ip)</option> <option value="dst-mac">Destination MAC (dst-mac)</option> <option value="src-mac">Source MAC (src-mac)</option> <option value="src-dst-mac">Source-Destination MAC (src-dst-mac)</option> </>);
                                    case Vendor.H3C:
                                        return (<> <option value="destination-ip">Destination IP Address</option> <option value="destination-mac">Destination MAC Address</option> <option value="source-ip">Source IP Address</option> <option value="source-mac">Source MAC Address</option> </>);
                                    default:
                                        return (<> <option value="src-dst-ip">Source-Destination IP</option> <option value="src-dst-mac">Source-Destination MAC</option> <option value="src-ip">Source IP</option> <option value="dst-ip">Destination IP</option> <option value="src-mac">Source MAC</option> <option value="dst-mac">Destination MAC</option> </>);
                                }
                            })()}
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-medium text-slate-400">Member Interfaces</label>
                            <button
                                onClick={handleAutoDetectInterfaces}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                            >
                                Auto Detect
                            </button>
                        </div>
                        <div className="space-y-1 mb-2">
                            {config.members.map((member, index) => (
                                <div key={member.id} className="bg-slate-800/50 p-2 rounded-md space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <input type="text" placeholder="e.g., GigabitEthernet0/1" value={member.name} onChange={(e) => handleUpdateMember(index, { name: e.target.value })} className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>
                                        <button onClick={() => handleRemoveMember(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Del</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {isDynamicMode && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && (
                                            <div>
                                                <label className="block text-2xs text-slate-400 mb-1">Port Priority</label>
                                                <input type="text" value={member.portPriority} onChange={e => handleUpdateMember(index, { portPriority: e.target.value })} className="w-full bg-slate-700 rounded px-2 py-1 text-xs" />
                                            </div>
                                        )}
                                        {isDynamicMode && selectedNode.vendor === Vendor.H3C && (
                                            <div>
                                                <label className="block text-2xs text-slate-400 mb-1">LACP Mode</label>
                                                <div className="flex text-xs">
                                                     <button onClick={() => handleUpdateMember(index, { lacpMode: 'active' })} className={`flex-1 px-1 py-1 rounded-l ${member.lacpMode === 'active' ? 'bg-blue-600' : 'bg-slate-600'}`}>Active</button>
                                                     <button onClick={() => handleUpdateMember(index, { lacpMode: 'passive' })} className={`flex-1 px-1 py-1 rounded-r ${member.lacpMode === 'passive' ? 'bg-blue-600' : 'bg-slate-600'}`}>Passive</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isDynamicMode && selectedNode.vendor === Vendor.H3C && (
                                        <div>
                                            <label className="block text-2xs text-slate-400 mb-1">LACP Timeout</label>
                                            <div className="flex text-xs">
                                                <button onClick={() => handleUpdateMember(index, { lacpPeriod: 'long' })} className={`flex-1 px-1 py-1 rounded-l ${member.lacpPeriod !== 'short' ? 'bg-blue-600' : 'bg-slate-600'}`}>Long (90s)</button>
                                                <button onClick={() => handleUpdateMember(index, { lacpPeriod: 'short' })} className={`flex-1 px-1 py-1 rounded-r ${member.lacpPeriod === 'short' ? 'bg-blue-600' : 'bg-slate-600'}`}>Short (3s)</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddMember} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Add Interface</button>
                    </div>

                    {/* 聚合口VLAN模式配置 */}
                    <div className="border-t border-slate-600 pt-3">
                        <h6 className="text-xs font-medium text-slate-300 mb-2">Aggregation Interface Mode</h6>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <button
                                onClick={() => handleInterfaceModeChange('access')}
                                className={`px-2 py-1 text-xs rounded ${config.interfaceMode === 'access' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white'}`}
                            >
                                Access
                            </button>
                            <button
                                onClick={() => handleInterfaceModeChange('trunk')}
                                className={`px-2 py-1 text-xs rounded ${config.interfaceMode === 'trunk' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white'}`}
                            >
                                Trunk
                            </button>
                            <button
                                onClick={() => handleInterfaceModeChange('l3')}
                                className={`px-2 py-1 text-xs rounded ${config.interfaceMode === 'l3' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white'}`}
                            >
                                三层
                            </button>
                        </div>

                        {/* Access模式配置 */}
                        {config.interfaceMode === 'access' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    {selectedNode.vendor === Vendor.Huawei ? 'Default VLAN' : 'VLAN ID'}
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., 10"
                                    value={config.accessVlan}
                                    onChange={(e) => updateLinkAggregationConfig({ accessVlan: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {/* Trunk模式配置 */}
                        {config.interfaceMode === 'trunk' && (
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        {selectedNode.vendor === Vendor.Cisco ? 'Native VLAN' : 'PVID'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 1"
                                        value={config.trunkNativeVlan}
                                        onChange={(e) => updateLinkAggregationConfig({ trunkNativeVlan: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Allowed VLANs</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 10,20,30 or 10-15"
                                        value={config.trunkAllowedVlans}
                                        onChange={(e) => updateLinkAggregationConfig({ trunkAllowedVlans: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 min-h-[5rem] flex items-center justify-center">
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
                    <p className="text-xs text-slate-500 italic">Link aggregation only available on switches, routers, firewalls, and access controllers.</p>
                </div>
            )}
        </div>
    );
};

export default LinkAggregationConfig;