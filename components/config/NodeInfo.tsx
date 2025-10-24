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

const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
);


const NodeInfo: React.FC<NodeInfoProps> = ({ selectedNode, nodes, connections, onNodeUpdate, onConnectionUpdate }) => {
    
    const isConfigurableDevice = ![DeviceType.Text, DeviceType.Rectangle, DeviceType.Circle, DeviceType.Halo].includes(selectedNode.type);

    const handleManagementUpdate = (updates: Partial<Node['config']['management']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                management: {
                    ...selectedNode.config.management,
                    ...updates,
                },
            },
        });
    };

    const handleCredentialsUpdate = (updates: Partial<Node['config']['management']['credentials']>) => {
        handleManagementUpdate({
            credentials: {
                ...selectedNode.config.management.credentials,
                ...updates
            }
        });
    };

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

                            const updatedPorts = newPorts.map((newPort, index) => {
                                const oldPort = selectedNode.ports[index];
                                if (oldPort && oldPort.status === 'connected') {
                                    const portNumberMatch = oldPort.name.match(/(\d+)(?!.*\d)/);
                                    const numberPart = portNumberMatch ? portNumberMatch[0] : '';
                                    const prefixPart = newPort.name.replace(/(\d+)(?!.*\d)/, '');
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

                            const getDefaultLinkAggregationMode = (vendor: Vendor) => {
                                switch (vendor) {
                                    case Vendor.Cisco: return 'active';
                                    case Vendor.Huawei: return 'manual';
                                    case Vendor.H3C: return 'static';
                                    default: return 'active';
                                }
                            };

                            const getDefaultLoadBalanceAlgorithm = (vendor: Vendor) => {
                                switch (vendor) {
                                    case Vendor.Cisco: return 'src-dst-ip';
                                    case Vendor.Huawei: return 'src-dst-ip';
                                    case Vendor.H3C: return 'destination-ip';
                                    default: return 'src-dst-ip';
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
            
            {isConfigurableDevice && (
                 <div className="pt-4 border-t border-slate-700 mt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Operations Management</h4>
                    <div className="space-y-3 p-3 bg-slate-700/50 rounded-lg">
                        <Field label="Management IP Address">
                            <Input 
                                value={selectedNode.config.management.ipAddress} 
                                onChange={e => handleManagementUpdate({ ipAddress: e.target.value })}
                                placeholder="e.g., 192.168.1.1"
                            />
                        </Field>
                        <Field label="Username">
                             <Input 
                                value={selectedNode.config.management.credentials.username}
                                onChange={e => handleCredentialsUpdate({ username: e.target.value })}
                            />
                        </Field>
                        <Field label="Password">
                             <Input 
                                type="password"
                                value={selectedNode.config.management.credentials.password}
                                onChange={e => handleCredentialsUpdate({ password: e.target.value })}
                            />
                        </Field>
                    </div>
                </div>
            )}

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