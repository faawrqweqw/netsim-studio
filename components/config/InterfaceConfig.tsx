import React, { useCallback, useMemo } from 'react';
import { Node, DeviceType, Vendor, Port } from '../../types';
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
            dhcpMode: 'global' as const,
            selectedPool: '',
            natStaticEnable: false,
            huaweiNatEnable: false,
            natHairpinEnable: false,
            ipsecPolicyId: undefined,
            interfacePoolConfig: {
                network: '192.168.1.0',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                dnsServer: '8.8.8.8',
                leaseDays: '0',
                leaseHours: '1',
                leaseMinutes: '0',
                leaseSeconds: '0'
            }
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
    const { ipsec, linkAggregation } = selectedNode.config;
    const isApplicable = selectedNode.type === DeviceType.Router || selectedNode.type === DeviceType.Firewall;

    const configuredInterfaceNames = new Set(config.interfaces.map(i => i.interfaceName));
    const lagMemberNames = new Set((selectedNode.config.linkAggregation.groups || []).flatMap(g => g.members.map(m => m.name)));

    const allAvailableInterfaces = useMemo(() => {
        const interfaces: Port[] = [...selectedNode.ports];
        const aggInterfaces: Port[] = [];

        if (linkAggregation.enabled && (selectedNode.type === DeviceType.Router || selectedNode.type === DeviceType.Firewall)) {
            (linkAggregation.groups || []).forEach(g => {
                if (g.interfaceMode === 'l3') {
                    const groupId = g.groupId;
                    let aggInterfaceName = '';
                    const vendor = selectedNode.vendor;
                    if (vendor === Vendor.Cisco) aggInterfaceName = `Port-channel${groupId}`;
                    else if (vendor === Vendor.Huawei) aggInterfaceName = `Eth-Trunk${groupId}`;
                    else if (vendor === Vendor.H3C) aggInterfaceName = `Route-Aggregation${groupId}`;
                    if (aggInterfaceName) {
                        aggInterfaces.push({ id: `agg-l3-${groupId}`, name: aggInterfaceName, status: 'available' });
                    }
                }
            });
        }
        
        if (aggInterfaces.length > 0) {
            return [...aggInterfaces, ...interfaces];
        }
        
        return interfaces;

    }, [selectedNode.ports, selectedNode.type, selectedNode.vendor, linkAggregation]);


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
                                        {allAvailableInterfaces.map(port => {
                                            const isConfigured = configuredInterfaceNames.has(port.name) && port.name !== intf.interfaceName;
                                            const isLagMember = lagMemberNames.has(port.name);
                                            // An L3 aggregate interface should not be disabled as a LAG member
                                            const isDisabled = isConfigured || (isLagMember && !port.id.startsWith('agg-l3-'));
                                            let label = port.name;
                                            if (port.id.startsWith('agg-l3-')) {
                                                label += ' (聚合接口)';
                                            } else if (isLagMember) {
                                                label += ' (聚合组成员)';
                                            }
                                            
                                            if (isConfigured) {
                                                 label += ' (已配置IP)';
                                            }
                                            
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
                                    <label htmlFor={`dhcp-${index}`} className="text-xs font-medium text-slate-400">启用DHCP Server功能</label>
                                </div>
                                {intf.enableDHCP && (
                                    <div className="ml-6 space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">DHCP服务模式:</label>
                                            <select
                                                value={(() => { const availableOptions = selectedNode.vendor === 'Huawei' ? ['global', 'interface'] : ['global']; return availableOptions.includes(intf.dhcpMode) ? intf.dhcpMode : 'global'; })()}
                                                onChange={(e) => updateInterface(index, { dhcpMode: e.target.value as any })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="global">{selectedNode.vendor === 'H3C' ? 'DHCP服务器模式' : '全局地址池模式'}</option>
                                                {selectedNode.vendor === 'Huawei' && (<option value="interface">接口地址池模式</option>)}
                                            </select>
                                        </div>
                                        {intf.dhcpMode === 'global' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">关联地址池:</label>
                                                <select value={intf.selectedPool || ''} onChange={(e) => updateInterface(index, { selectedPool: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" >
                                                    <option value="">请选择地址池</option>
                                                    {selectedNode.config.dhcp.pools.map((pool, poolIndex) => (<option key={poolIndex} value={pool.poolName}> {pool.poolName} ({pool.network}) </option>))}
                                                </select>
                                                {selectedNode.config.dhcp.pools.length === 0 && (<p className="text-xs text-yellow-400 mt-1">⚠ 没有可用的DHCP地址池，请先启用DHCP Server功能并配置地址池</p>)}
                                            </div>
                                        )}
                                        {intf.dhcpMode === 'interface' && (selectedNode.vendor === 'Huawei' || selectedNode.vendor === 'H3C') && (
                                            <div className="bg-slate-900/50 p-3 rounded space-y-2">
                                                <h6 className="text-xs font-medium text-slate-300">接口地址池配置</h6>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">网络地址</label><input type="text" value={intf.interfacePoolConfig?.network || ''} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, network: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">子网掩码</label><input type="text" value={intf.interfacePoolConfig?.subnetMask || ''} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, subnetMask: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">网关</label><input type="text" value={intf.interfacePoolConfig?.gateway || ''} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, gateway: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                    <div><label className="block text-xs font-medium text-slate-400 mb-1">DNS服务器</label><input type="text" value={intf.interfacePoolConfig?.dnsServer || ''} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, dnsServer: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2">租约时间</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div className="flex items-center gap-1"><input type="number" min="0" value={intf.interfacePoolConfig?.leaseDays || '0'} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, leaseDays: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">天</span></div>
                                                        <div className="flex items-center gap-1"><input type="number" min="0" max="23" value={intf.interfacePoolConfig?.leaseHours || '1'} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, leaseHours: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">时</span></div>
                                                        <div className="flex items-center gap-1"><input type="number" min="0" max="59" value={intf.interfacePoolConfig?.leaseMinutes || '0'} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, leaseMinutes: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">分</span></div>
                                                        <div className="flex items-center gap-1"><input type="number" min="0" max="59" value={intf.interfacePoolConfig?.leaseSeconds || '0'} onChange={(e) => updateInterface(index, { interfacePoolConfig: { ...intf.interfacePoolConfig, leaseSeconds: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><span className="text-xs text-slate-400">秒</span></div>
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

                             {ipsec.enabled && (
                                <div className="pt-3 border-t border-slate-700">
                                    <h6 className="text-xs font-medium text-slate-400 mb-2">IPsec Policy</h6>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Apply Policy:</label>
                                        <select
                                            value={intf.ipsecPolicyId || ''}
                                            onChange={(e) => updateInterface(index, { ipsecPolicyId: e.target.value })}
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
                                                id={`nat-static-enable-${index}`}
                                                checked={!!intf.natStaticEnable}
                                                onChange={(e) => updateInterface(index, { natStaticEnable: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={`nat-static-enable-${index}`} className="text-xs font-medium text-slate-400">
                                                开启NAT静态地址转换 (nat static enable)
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`nat-hairpin-enable-${index}`}
                                                checked={!!intf.natHairpinEnable}
                                                onChange={(e) => updateInterface(index, { natHairpinEnable: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={`nat-hairpin-enable-${index}`} className="text-xs font-medium text-slate-400">
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
                                            id={`huawei-nat-enable-${index}`}
                                            checked={!!intf.huaweiNatEnable}
                                            onChange={(e) => updateInterface(index, { huaweiNatEnable: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor={`huawei-nat-enable-${index}`} className="text-xs font-medium text-slate-400">
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
        </div>
    );
};

export default InterfaceConfig;
