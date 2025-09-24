import React from 'react';
import { Node, Connection, Vendor, DeviceType } from '../../types';
import { VENDOR_OPTIONS, generatePorts } from '../../constants';
import ConnectionInfo from './ConnectionInfo';

interface NodeInfoProps {
    selectedNode: Node;
    nodes: Node[];
    connections: Connection[];
    onNodeUpdate: (node: Node) => void;
    onConnectionUpdate: (conn: Connection) => void;
}

const NodeInfo: React.FC<NodeInfoProps> = ({ selectedNode, nodes, connections, onNodeUpdate, onConnectionUpdate }) => {
    return (
        <div className="space-y-4 overflow-y-auto">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Device Name</label>
                <input
                    type="text"
                    value={selectedNode.name}
                    onChange={(e) => onNodeUpdate({ ...selectedNode, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            {selectedNode.vendor !== Vendor.Generic && (
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Vendor</label>
                    <select
                        value={selectedNode.vendor}
                        onChange={(e) => {
                            const newVendor = e.target.value as Vendor;
                            const newPorts = generatePorts(selectedNode.type, newVendor);

                            // 保留已连接端口的连接信息，但更新端口名称格式
                            const updatedPorts = newPorts.map((newPort, index) => {
                                const oldPort = selectedNode.ports[index];
                                if (oldPort && oldPort.status === 'connected') {
                                    // Fix: The original logic incorrectly appended the old port number
                                    // to the full new port name (e.g., "GigabitEthernet0/0/1" + "1" -> "GigabitEthernet0/0/11").
                                    // The corrected logic extracts the prefix from the new port name and combines it
                                    // with the number from the old port name to preserve custom or default port numbers correctly.

                                    // Extract the trailing number from the old port name.
                                    const portNumberMatch = oldPort.name.match(/(\d+)(?!.*\d)/);
                                    const numberPart = portNumberMatch ? portNumberMatch[0] : '';

                                    // Extract the prefix from the new port name (everything before the trailing number).
                                    const prefixPart = newPort.name.replace(/(\d+)(?!.*\d)/, '');

                                    // If for some reason there's no number, just use the new port name as a fallback.
                                    const finalName = numberPart ? (prefixPart + numberPart) : newPort.name;

                                    return {
                                        ...newPort,
                                        status: oldPort.status,
                                        connectedTo: oldPort.connectedTo,
                                        name: finalName,
                                    };
                                }
                                return newPort;
                            });

                            // 根据厂商设置Link Aggregation的默认模式和负载均衡算法
                            const getDefaultLinkAggregationMode = (vendor: Vendor) => {
                                switch (vendor) {
                                    case Vendor.Cisco:
                                        return 'active';
                                    case Vendor.Huawei:
                                        return 'manual';
                                    case Vendor.H3C:
                                        return 'static';
                                    default:
                                        return 'active';
                                }
                            };

                            const getDefaultLoadBalanceAlgorithm = (vendor: Vendor) => {
                                switch (vendor) {
                                    case Vendor.Cisco:
                                        return 'src-dst-ip';
                                    case Vendor.Huawei:
                                        return 'src-dst-ip';
                                    case Vendor.H3C:
                                        return 'destination-ip';
                                    default:
                                        return 'src-dst-ip';
                                }
                            };

                            const updatedNode = {
                                ...selectedNode,
                                vendor: newVendor,
                                ports: updatedPorts,
                                config: {
                                    ...selectedNode.config,
                                    linkAggregation: {
                                        ...selectedNode.config.linkAggregation,
                                        mode: getDefaultLinkAggregationMode(newVendor),
                                        loadBalanceAlgorithm: getDefaultLoadBalanceAlgorithm(newVendor)
                                    }
                                }
                            };
                            onNodeUpdate(updatedNode);
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {VENDOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Device Type</label>
                <p className="text-slate-300">{selectedNode.type}</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Unique ID</label>
                <p className="text-slate-500 text-xs">{selectedNode.id}</p>
            </div>
            <ConnectionInfo
                selectedNode={selectedNode}
                nodes={nodes}
                connections={connections}
                onConnectionUpdate={onConnectionUpdate}
            />
        </div>
    );
};

export default NodeInfo;