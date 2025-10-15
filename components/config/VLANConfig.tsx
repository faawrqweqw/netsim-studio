import React, { useCallback } from 'react';
import { Node, DeviceType, Vendor } from '../../types';
import { SpinnerIcon } from '../Icons';

interface VLANConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const VLANConfig: React.FC<VLANConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateVLANConfig = useCallback((updates: Partial<Node['config']['vlan']>) => {
        if (!selectedNode) return;
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                vlan: {
                    ...selectedNode.config.vlan,
                    ...updates,
                },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addVLANInterface = useCallback(() => {
        if (!selectedNode) return;
        const { vlanInterfaces } = selectedNode.config.vlan;
        const newVLANInterface = {
            vlanId: '10',
            ipAddress: '192.168.10.1',
            subnetMask: '255.255.255.0',
            vlanDescription: 'Management VLAN',
            interfaceDescription: 'Gateway for Management VLAN',
            enableDHCP: false,
            dhcpMode: 'global' as const,
            selectedPool: '',
            natStaticEnable: false,
            huaweiNatEnable: false,
            natHairpinEnable: false,
            ipsecPolicyId: undefined,
            interfacePoolConfig: {
                network: '192.168.10.0',
                subnetMask: '255.255.255.0',
                gateway: '192.168.10.1',
                dnsServer: '8.8.8.8',
                leaseDays: '0',
                leaseHours: '1',
                leaseMinutes: '0',
                leaseSeconds: '0'
            }
        };
        updateVLANConfig({ vlanInterfaces: [...vlanInterfaces, newVLANInterface] });
    }, [selectedNode, updateVLANConfig]);

    const updateVLANInterface = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedInterfaces = [...selectedNode.config.vlan.vlanInterfaces];
        updatedInterfaces[index] = { ...updatedInterfaces[index], ...updates };
        updateVLANConfig({ vlanInterfaces: updatedInterfaces });
    }, [selectedNode, updateVLANConfig]);

    const removeVLANInterface = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedInterfaces = selectedNode.config.vlan.vlanInterfaces.filter((_, i) => i !== index);
        updateVLANConfig({ vlanInterfaces: updatedInterfaces });
    }, [selectedNode, updateVLANConfig]);
    
    if (!selectedNode) return null;

    const config = selectedNode.config.vlan;
    const { acls } = selectedNode.config.acl;
    const { ipsec } = selectedNode.config;
    const isApplicable = selectedNode.type.includes('Switch') ||
        selectedNode.type === DeviceType.Router ||
        selectedNode.type === DeviceType.AC;

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">VLAN接口 (VLAN Interface)</h4>
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
                            onClick={addVLANInterface}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                        >
                            添加VLAN接口
                        </button>
                    </div>

                    {config.vlanInterfaces.map((vlanIntf, index) => (
                        <div key={index} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center">
                                <h5 className="text-sm font-medium text-slate-300">VLAN接口 {index + 1}</h5>
                                <button
                                    onClick={() => removeVLANInterface(index)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                >
                                    删除
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">VLAN ID:</label>
                                    <input type="text" placeholder="10" value={vlanIntf.vlanId} onChange={(e) => updateVLANInterface(index, { vlanId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">IP地址:</label>
                                    <input type="text" placeholder="192.168.10.1" value={vlanIntf.ipAddress} onChange={(e) => updateVLANInterface(index, { ipAddress: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">子网掩码:</label>
                                <input type="text" placeholder="255.255.255.0" value={vlanIntf.subnetMask} onChange={(e) => updateVLANInterface(index, { subnetMask: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">VLAN描述:</label>
                                <input type="text" placeholder="Management VLAN" value={vlanIntf.vlanDescription} onChange={(e) => updateVLANInterface(index, { vlanDescription: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">接口描述:</label>
                                <input type="text" placeholder="Gateway for Management VLAN" value={vlanIntf.interfaceDescription} onChange={(e) => updateVLANInterface(index, { interfaceDescription: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id={`dhcp-${index}`} checked={vlanIntf.enableDHCP} onChange={(e) => updateVLANInterface(index, { enableDHCP: e.target.checked })} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500" />
                                    <label htmlFor={`dhcp-${index}`} className="text-xs font-medium text-slate-400">启用DHCP Server功能</label>
                                </div>
                                {vlanIntf.enableDHCP && (
                                    <div className="ml-6 space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">DHCP服务模式:</label>
                                            <select
                                                value={(() => { const availableOptions = selectedNode.vendor === 'Huawei' ? ['global', 'interface'] : ['global']; return availableOptions.includes(vlanIntf.dhcpMode) ? vlanIntf.dhcpMode : 'global'; })()}
                                                onChange={(e) => updateVLANInterface(index, { dhcpMode: e.target.value as any })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="global">{selectedNode.vendor === 'H3C' ? 'DHCP服务器模式' : '全局地址池模式'}</option>
                                                {selectedNode.vendor === 'Huawei' && (<option value="interface">接口地址池模式</option>)}
                                            </select>
                                        </div>
                                        {vlanIntf.dhcpMode === 'global' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">关联地址池:</label>
                                                <select value={vlanIntf.selectedPool || ''} onChange={(e) => updateVLANInterface(index, { selectedPool: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" >
                                                    <option value="">请选择地址池</option>
                                                    {selectedNode.config.dhcp.pools.map((pool, poolIndex) => (<option key={poolIndex} value={pool.poolName}> {pool.poolName} ({pool.network}) </option>))}
                                                </select>
                                                {selectedNode.config.dhcp.pools.length === 0 && (<p className="text-xs text-yellow-400 mt-1">⚠ 没有可用的DHCP地址池，请先启用DHCP Server功能并配置地址池</p>)}
                                            </div>
                                        )}
                                        {vlanIntf.dhcpMode === 'interface' && (selectedNode.vendor === 'Huawei' || selectedNode.vendor === 'H3C') && (
                                            <div className="bg-slate-900/50 p-3 rounded space-y-2">
                                                <h6 className="text-xs font-medium text-slate-300">接口地址池配置</h6>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">网络地址</label><input type="text" value={vlanIntf.interfacePoolConfig?.network || ''} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, network: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">子网掩码</label><input type="text" value={vlanIntf.interfacePoolConfig?.subnetMask || ''} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, subnetMask: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">网关</label><input type="text" value={vlanIntf.interfacePoolConfig?.gateway || ''} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, gateway: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">DNS服务器</label><input type="text" value={vlanIntf.interfacePoolConfig?.dnsServer || ''} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, dnsServer: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2">租约时间</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div className="flex items-center gap-1"><input type="number" min="0" value={vlanIntf.interfacePoolConfig?.leaseDays || '0'} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, leaseDays: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">天</span></div>
                                                        <div className="flex items-center gap-1"><input type="number" min="0" max="23" value={vlanIntf.interfacePoolConfig?.leaseHours || '1'} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, leaseHours: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">时</span></div>
                                                        <div className="flex items-center gap-1"><input type="number" min="0" max="59" value={vlanIntf.interfacePoolConfig?.leaseMinutes || '0'} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, leaseMinutes: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">分</span></div>
                                                        <div className="flex items-center gap-1"><input type="number" min="0" max="59" value={vlanIntf.interfacePoolConfig?.leaseSeconds || '0'} onChange={(e) => updateVLANInterface(index, { interfacePoolConfig: { ...vlanIntf.interfacePoolConfig, leaseSeconds: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">秒</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                value={vlanIntf.packetFilterInboundAclId || ''}
                                                onChange={(e) => updateVLANInterface(index, { packetFilterInboundAclId: e.target.value })}
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
                                                value={vlanIntf.packetFilterOutboundAclId || ''}
                                                onChange={(e) => updateVLANInterface(index, { packetFilterOutboundAclId: e.target.value })}
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
                             {ipsec.enabled && (
                                <div className="pt-3 border-t border-slate-700">
                                    <h6 className="text-xs font-medium text-slate-400 mb-2">IPsec Policy</h6>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Apply Policy:</label>
                                        <select
                                            value={vlanIntf.ipsecPolicyId || ''}
                                            onChange={(e) => updateVLANInterface(index, { ipsecPolicyId: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                        >
                                            <option value="">(None)</option>
                                            {ipsec.policies.map(policy => (
                                                <option key={policy.id} value={policy.id}>
                                                    {policy.name}
                                                </option>
                                            ))}
                                        </select>
                                        {ipsec.policies.length === 0 && <p className="text-xs text-yellow-400 mt-1">No IPsec policies defined.</p>}
                                    </div>
                                </div>
                            )}
                            {selectedNode.vendor === Vendor.H3C && selectedNode.config.nat.enabled && (
                                <div className="pt-3 border-t border-slate-700">
                                    <h6 className="text-xs font-medium text-slate-400 mb-2">H3C NAT Interface Options</h6>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`vlan-nat-enable-${index}`}
                                                checked={!!vlanIntf.natStaticEnable}
                                                onChange={(e) => updateVLANInterface(index, { natStaticEnable: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={`vlan-nat-enable-${index}`} className="text-xs font-medium text-slate-400">
                                                开启NAT静态地址转换 (nat static enable)
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`vlan-nat-hairpin-enable-${index}`}
                                                checked={!!vlanIntf.natHairpinEnable}
                                                onChange={(e) => updateVLANInterface(index, { natHairpinEnable: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={`vlan-nat-hairpin-enable-${index}`} className="text-xs font-medium text-slate-400">
                                                开启NAT Hairpin (nat hairpin enable)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {selectedNode.vendor === Vendor.Huawei && (
                                <div className="pt-3 border-t border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`huawei-vlan-nat-enable-${index}`}
                                            checked={!!vlanIntf.huaweiNatEnable}
                                            onChange={(e) => updateVLANInterface(index, { huaweiNatEnable: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor={`huawei-vlan-nat-enable-${index}`} className="text-xs font-medium text-slate-400">
                                            开启NAT功能 (nat enable)
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-32 min-h-[5rem]">
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
                    <p className="text-xs text-slate-500 italic">VLAN接口配置仅适用于交换机和路由器。</p>
                </div>
            )}
        </div>
    );
};

export default VLANConfig;