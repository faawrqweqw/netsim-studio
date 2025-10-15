import React, { useState } from 'react';
import { Node, Connection, LinkConfig, DeviceType, Vendor } from '../../types';
import { optimizeVlanRanges, generateInterfaceCli } from './utils';

const ConnectionItem: React.FC<{
    connection: Connection;
    sourceNode: Node;
    nodes: Node[];
    onConnectionUpdate: (conn: Connection) => void;
}> = ({ connection, sourceNode, nodes, onConnectionUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const targetEnd = connection.from.nodeId === sourceNode.id ? connection.to : connection.from;
    const sourceEnd = connection.from.nodeId === sourceNode.id ? connection.from : connection.to;

    const targetNode = nodes.find(n => n.id === targetEnd.nodeId);
    const sourcePort = sourceNode.ports.find(p => p.id === sourceEnd.portId);

    const isL3Device = (type: DeviceType) => type === DeviceType.Router || type === DeviceType.L3Switch;
    const canBeL3 = isL3Device(sourceNode.type) && targetNode && isL3Device(targetNode.type);
    const canBeL2 = sourceNode.type.includes('Switch') || sourceNode.type === DeviceType.AC;

    // 检查端口是否在聚合组中
    const isPortInAggregation = () => {
        if (!sourcePort || !sourceNode.config.linkAggregation.enabled) return false;
        return sourceNode.config.linkAggregation.members.some(member => member.name === sourcePort.name);
    };

    const portInAggregation = isPortInAggregation();

    const handleConfigChange = (newConfig: Partial<LinkConfig>) => {
        onConnectionUpdate({ ...connection, config: { ...connection.config, ...newConfig } });
    };

    const handleModeChange = (mode: LinkConfig['mode']) => {
        if (connection.config.mode === mode) {
            onConnectionUpdate({ ...connection, config: { ...connection.config, mode: 'unconfigured' } });
        } else {
            onConnectionUpdate({ ...connection, config: { ...connection.config, mode } });
        }
    };

    const handleTypeChange = (type: 'solid' | 'dashed') => {
        onConnectionUpdate({ ...connection, type });
    };

    const isConfigured = connection.config.mode !== 'unconfigured';
    const cliPreview = sourcePort ? generateInterfaceCli(sourcePort.name, sourceNode.vendor, connection.config, sourceNode.type) : 'Error: Port not found.';

    return (
        <div className="bg-slate-700/60 rounded-lg">
            <div
                className={`flex items-center justify-between p-2 cursor-pointer hover:bg-slate-700/80 rounded-t-lg ${isExpanded ? 'bg-slate-600/50 rounded-b-none' : 'rounded-lg'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform ${isExpanded ? 'rotate-90' : 'rotate-180'}`}>▼</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targetNode?.style.color }}></span>
                    <span className="font-semibold text-sm">{targetNode?.name || 'Unknown Device'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="font-mono text-slate-400">{sourcePort?.name.split('/').pop()} ↔ {targetNode?.ports.find(p => p.id === targetEnd.portId)?.name.split('/').pop()}</span>
                    <span className={`px-2 py-0.5 rounded-full ${portInAggregation ? 'bg-orange-500 text-white' : isConfigured ? 'bg-blue-600 text-white' : 'bg-slate-500'}`}>
                        {portInAggregation ? '聚合组成员' : isConfigured ? connection.config.mode.toUpperCase() : '未配置'}
                    </span>
                </div>
            </div>
            {isExpanded && (
                <div className="p-3 border-t border-slate-600 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">连接线类型:</span>
                        <div>
                            <button onClick={() => handleTypeChange('solid')} className={`px-3 py-1 text-sm rounded-l-md ${connection.type === 'solid' ? 'bg-blue-600 text-white' : 'bg-slate-500 hover:bg-slate-600'}`}>实线</button>
                            <button onClick={() => handleTypeChange('dashed')} className={`px-3 py-1 text-sm rounded-r-md ${connection.type === 'dashed' ? 'bg-blue-600 text-white' : 'bg-slate-500 hover:bg-slate-600'}`}>虚线</button>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-800/50 rounded-md space-y-3">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-slate-300">接口模式</p>
                            {portInAggregation && (
                                <span className="text-xs text-orange-400 bg-orange-400/20 px-2 py-1 rounded">
                                    已加入聚合组
                                </span>
                            )}
                        </div>

                        {portInAggregation ? (
                            <div className="text-xs text-slate-400 bg-slate-700/50 p-3 rounded">
                                <p>此端口已加入链路聚合组，无法单独配置接口模式。</p>
                                <p>请在 Link Aggregation 配置中设置聚合口的接口模式。</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {canBeL2 && <button onClick={() => handleModeChange('access')} className={`px-2 py-1 text-xs rounded ${connection.config.mode === 'access' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white'}`}>Access</button>}
                                {canBeL2 && <button onClick={() => handleModeChange('trunk')} className={`px-2 py-1 text-xs rounded ${connection.config.mode === 'trunk' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white'}`}>Trunk</button>}
                                {canBeL3 && <button onClick={() => handleModeChange('l3')} className={`px-2 py-1 text-xs rounded ${connection.config.mode === 'l3' ? 'bg-blue-600 text-white' : 'border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white'}`}>三层</button>}
                            </div>
                        )}

                        {!portInAggregation && connection.config.mode === 'access' && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    {sourceNode.vendor === Vendor.Huawei ? 'Default VLAN' : 'VLAN ID'}
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., 10"
                                    value={connection.config.accessVlan || ''}
                                    onChange={(e) => handleConfigChange({ accessVlan: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {!portInAggregation && connection.config.mode === 'trunk' && (
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        {sourceNode.vendor === Vendor.Cisco ? 'Native VLAN' : 'PVID'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 1"
                                        value={connection.config.trunkNativeVlan || ''}
                                        onChange={(e) => handleConfigChange({ trunkNativeVlan: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Allowed VLANs</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 10,20,30 or 10-15"
                                        value={connection.config.trunkAllowedVlans || ''}
                                        onChange={(e) => handleConfigChange({ trunkAllowedVlans: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {isConfigured && !portInAggregation && (sourceNode.type.includes('Switch') || sourceNode.type === DeviceType.Router || sourceNode.type === DeviceType.AC || sourceNode.type === DeviceType.Firewall) && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    应用到 {sourceNode.name} 的端口范围
                                </label>
                                <input
                                    type="text"
                                    placeholder="例如: 1-10,15"
                                    value={connection.config.applyToPortRange || ''}
                                    onChange={(e) => handleConfigChange({ applyToPortRange: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">留空则仅应用到当前端口。</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-4">
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Preview</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap h-24">
                            {cliPreview || <span className="text-slate-500">Select a mode to see CLI commands.</span>}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

const ConnectionInfo: React.FC<{
    selectedNode: Node;
    nodes: Node[];
    connections: Connection[];
    onConnectionUpdate: (conn: Connection) => void;
}> = ({ selectedNode, nodes, connections, onConnectionUpdate }) => {
    const relevantConnections = connections.filter(c => c.from.nodeId === selectedNode.id || c.to.nodeId === selectedNode.id);

    if (relevantConnections.length === 0) {
        return <p className="text-xs text-slate-500 mt-4">No connections for this device.</p>;
    }

    return (
        <div className="pt-4 border-t border-slate-700 mt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">连接信息 ({relevantConnections.length})</h4>
            <div className="space-y-2">
                <div className="grid grid-cols-3 text-xs text-slate-400 px-2 mb-1">
                    <span>目标设备</span>
                    <span className="text-center">接口</span>
                    <span className="text-right">配置</span>
                </div>
                {relevantConnections.map(conn => (
                    <ConnectionItem
                        key={conn.id}
                        connection={conn}
                        sourceNode={selectedNode}
                        nodes={nodes}
                        onConnectionUpdate={onConnectionUpdate}
                    />
                ))}
            </div>
        </div>
    );
};

export default ConnectionInfo;