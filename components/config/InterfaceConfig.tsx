import React, { useCallback } from 'react';
import { Node, DeviceType } from '../../types';
import { SpinnerIcon } from '../Icons';

interface InterfaceConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const InterfaceConfig: React.FC<InterfaceConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateInterfaceIPConfig = useCallback((updates: Partial<Node['config']['interfaceIP']>) => {
        if (!selectedNode) return;
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                interfaceIP: {
                    ...selectedNode.config.interfaceIP,
                    ...updates,
                },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addInterface = useCallback(() => {
        if (!selectedNode) return;
        const { interfaces } = selectedNode.config.interfaceIP;
        const newInterface = {
            interfaceName: '',
            ipAddress: '192.168.1.1',
            subnetMask: '255.255.255.0',
            description: '',
            enableDHCP: false,
            dhcpMode: 'relay' as const,
            dhcpServerIP: ''
        };
        updateInterfaceIPConfig({ interfaces: [...interfaces, newInterface] });
    }, [selectedNode, updateInterfaceIPConfig]);

    const updateInterface = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedInterfaces = [...selectedNode.config.interfaceIP.interfaces];
        updatedInterfaces[index] = { ...updatedInterfaces[index], ...updates };
        updateInterfaceIPConfig({ interfaces: updatedInterfaces });
    }, [selectedNode, updateInterfaceIPConfig]);

    const removeInterface = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedInterfaces = selectedNode.config.interfaceIP.interfaces.filter((_, i) => i !== index);
        updateInterfaceIPConfig({ interfaces: updatedInterfaces });
    }, [selectedNode, updateInterfaceIPConfig]);
    
    if (!selectedNode) return null;

    const config = selectedNode.config.interfaceIP;
    const { acls } = selectedNode.config.acl;
    const isApplicable = selectedNode.type === DeviceType.Router || selectedNode.type === DeviceType.Firewall;

    const configuredInterfaceNames = new Set(config.interfaces.map(i => i.interfaceName));
    const lagMemberNames = new Set(selectedNode.config.linkAggregation.interfaces);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">接口IP配置 (Interface IP)</h4>
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
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={addInterface}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                        >
                            添加接口配置
                        </button>
                    </div>

                    {config.interfaces.map((intf, index) => (
                        <div key={index} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center">
                                <h5 className="text-sm font-medium text-slate-300">接口配置 {index + 1}</h5>
                                <button
                                    onClick={() => removeInterface(index)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                >
                                    删除
                                </button>
                            </div>

                            <div className="grid grid-cols-1">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">接口名称:</label>
                                    <select 
                                      value={intf.interfaceName} 
                                      onChange={(e) => updateInterface(index, { interfaceName: e.target.value })} 
                                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                    >
                                        <option value="">-- 选择一个接口 --</option>
                                        {selectedNode.ports.map(port => {
                                            const isConfigured = configuredInterfaceNames.has(port.name) && port.name !== intf.interfaceName;
                                            const isLagMember = lagMemberNames.has(port.name);
                                            const isDisabled = isConfigured || isLagMember;
                                            let label = port.name;
                                            if (isConfigured) label += ' (已配置IP)';
                                            if (isLagMember) label += ' (聚合组成员)';
                                            return (
                                                <option key={port.id} value={port.name} disabled={isDisabled}>
                                                    {label}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">IP地址:</label>
                                    <input type="text" placeholder="192.168.1.1" value={intf.ipAddress} onChange={(e) => updateInterface(index, { ipAddress: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">子网掩码:</label>
                                    <input type="text" placeholder="255.255.255.0" value={intf.subnetMask} onChange={(e) => updateInterface(index, { subnetMask: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">接口描述:</label>
                                <input type="text" placeholder="Link to WAN" value={intf.description} onChange={(e) => updateInterface(index, { description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id={`dhcp-${index}`} checked={intf.enableDHCP} onChange={(e) => updateInterface(index, { enableDHCP: e.target.checked })} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500" />
                                    <label htmlFor={`dhcp-${index}`} className="text-xs font-medium text-slate-400">启用DHCP功能</label>
                                </div>
                                {intf.enableDHCP && (
                                     <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">DHCP服务器IP (中继):</label>
                                        <input type="text" placeholder="10.202.10.1" value={intf.dhcpServerIP || ''} onChange={(e) => updateInterface(index, { dhcpServerIP: e.target.value, dhcpMode: 'relay' })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        <p className="text-xs text-slate-500 mt-1">配置DHCP中继服务器的IP地址</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-700">
                                <h6 className="text-xs font-medium text-slate-400 mb-2">ACL包过滤</h6>
                                {selectedNode.config.acl.enabled ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Inbound:</label>
                                            <select
                                                value={intf.packetFilterInboundAclId || ''}
                                                onChange={(e) => updateInterface(index, { packetFilterInboundAclId: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                            >
                                                <option value="">(None)</option>
                                                {acls.map(acl => (
                                                    <option key={acl.id} value={acl.id}>
                                                        {acl.number} {acl.name ? `(${acl.name})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Outbound:</label>
                                            <select
                                                value={intf.packetFilterOutboundAclId || ''}
                                                onChange={(e) => updateInterface(index, { packetFilterOutboundAclId: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                            >
                                                <option value="">(None)</option>
                                                {acls.map(acl => (
                                                    <option key={acl.id} value={acl.id}>
                                                        {acl.number} {acl.name ? `(${acl.name})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 text-center py-2 bg-slate-900/50 rounded">请先在 ACL & QOS 配置中启用并创建 ACL。</p>
                                )}
                            </div>
                        </div>
                    ))}
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
        </div>
    );
};

export default InterfaceConfig;