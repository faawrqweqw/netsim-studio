
import React, { useCallback, useMemo } from 'react';
import { Node, DeviceType, OSPFInterfaceConfig } from '../../types';
import { SpinnerIcon } from '../Icons';

interface RoutingConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isL3IpRoutingExpanded: boolean;
    isStaticRoutingExpanded: boolean;
    isOspfExpanded: boolean;
    onToggleSection: (section: 'l3IpRouting' | 'staticRouting' | 'ospf') => void;
    isGenerating: boolean;
}

const RoutingConfig: React.FC<RoutingConfigProps> = ({
    selectedNode,
    onNodeUpdate,
    isL3IpRoutingExpanded,
    isStaticRoutingExpanded,
    isOspfExpanded,
    onToggleSection,
    isGenerating,
}) => {
    const routingConfig = selectedNode.config.routing;
    const showOSPF = selectedNode.type !== DeviceType.AC;

    const updateRoutingConfig = useCallback((updates: Partial<Node['config']['routing']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                routing: { ...selectedNode.config.routing, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const updateOSPFConfig = useCallback((updates: Partial<Node['config']['routing']['ospf']>) => {
        updateRoutingConfig({ ospf: { ...selectedNode.config.routing.ospf, ...updates } });
    }, [selectedNode, updateRoutingConfig]);

    const addStaticRoute = useCallback(() => {
        const newRoute = {
            network: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '192.168.1.1',
            adminDistance: '1', priority: '1'
        };
        updateRoutingConfig({ staticRoutes: [...routingConfig.staticRoutes, newRoute] });
    }, [routingConfig.staticRoutes, updateRoutingConfig]);

    const updateStaticRoute = useCallback((index: number, updates: any) => {
        const updatedRoutes = [...routingConfig.staticRoutes];
        updatedRoutes[index] = { ...updatedRoutes[index], ...updates };
        updateRoutingConfig({ staticRoutes: updatedRoutes });
    }, [routingConfig.staticRoutes, updateRoutingConfig]);

    const removeStaticRoute = useCallback((index: number) => {
        const updatedRoutes = routingConfig.staticRoutes.filter((_, i) => i !== index);
        updateRoutingConfig({ staticRoutes: updatedRoutes });
    }, [routingConfig.staticRoutes, updateRoutingConfig]);

    const addOSPFArea = useCallback(() => {
        const newArea = { areaId: '1', areaType: 'standard' as const, noSummary: false, defaultCost: '1', networks: [] };
        updateOSPFConfig({ areas: [...routingConfig.ospf.areas, newArea] });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const updateOSPFArea = useCallback((index: number, updates: any) => {
        const updatedAreas = [...routingConfig.ospf.areas];
        let newArea = { ...updatedAreas[index], ...updates };

        // If area ID is changed to 0, force standard type and remove stub/nssa settings.
        if ('areaId' in updates && updates.areaId === '0') {
            newArea.areaType = 'standard';
            newArea.noSummary = false;
        }
        updatedAreas[index] = newArea;
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const removeOSPFArea = useCallback((index: number) => {
        const updatedAreas = routingConfig.ospf.areas.filter((_, i) => i !== index);
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const addNetworkToArea = useCallback((areaIndex: number) => {
        const updatedAreas = [...routingConfig.ospf.areas];
        updatedAreas[areaIndex].networks.push({ network: '192.168.1.0', wildcardMask: '0.0.0.0' });
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const updateAreaNetwork = useCallback((areaIndex: number, networkIndex: number, updates: any) => {
        const updatedAreas = [...routingConfig.ospf.areas];
        updatedAreas[areaIndex].networks[networkIndex] = {
            ...updatedAreas[areaIndex].networks[networkIndex],
            ...updates
        };
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const removeAreaNetwork = useCallback((areaIndex: number, networkIndex: number) => {
        const updatedAreas = [...routingConfig.ospf.areas];
        updatedAreas[areaIndex].networks = updatedAreas[areaIndex].networks.filter((_, i) => i !== networkIndex);
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const addOSPFInterfaceConfig = useCallback(() => {
        const newConfig: OSPFInterfaceConfig = {
            id: `ospf-iface-${Date.now()}`,
            interfaceName: '',
            priority: '1',
        };
        updateOSPFConfig({ interfaceConfigs: [...routingConfig.ospf.interfaceConfigs, newConfig] });
    }, [routingConfig.ospf.interfaceConfigs, updateOSPFConfig]);

    const updateOSPFInterfaceConfig = useCallback((index: number, updates: Partial<OSPFInterfaceConfig>) => {
        const newConfigs = [...routingConfig.ospf.interfaceConfigs];
        newConfigs[index] = { ...newConfigs[index], ...updates };
        updateOSPFConfig({ interfaceConfigs: newConfigs });
    }, [routingConfig.ospf.interfaceConfigs, updateOSPFConfig]);

    const removeOSPFInterfaceConfig = useCallback((index: number) => {
        const newConfigs = routingConfig.ospf.interfaceConfigs.filter((_, i) => i !== index);
        updateOSPFConfig({ interfaceConfigs: newConfigs });
    }, [routingConfig.ospf.interfaceConfigs, updateOSPFConfig]);

    const availableOspfInterfaces = useMemo(() => {
        const l3Interfaces = new Set<string>();
        const { type, config: { vlan, interfaceIP }, vendor } = selectedNode;

        if (type.includes('Switch')) {
            vlan.vlanInterfaces.forEach(vlanIntf => {
                if (vlanIntf.vlanId) {
                    if (vendor === 'Cisco') l3Interfaces.add(`Vlan${vlanIntf.vlanId}`);
                    else if (vendor === 'Huawei') l3Interfaces.add(`Vlanif${vlanIntf.vlanId}`);
                    else if (vendor === 'H3C') l3Interfaces.add(`Vlan-interface${vlanIntf.vlanId}`);
                }
            });
        }
        
        if (type === DeviceType.Router || type === DeviceType.Firewall) {
            interfaceIP.interfaces.forEach(physIntf => {
                if (physIntf.interfaceName) {
                    l3Interfaces.add(physIntf.interfaceName);
                }
            });
            vlan.vlanInterfaces.forEach(vlanIntf => {
                 if (vlanIntf.vlanId) {
                    if (vendor === 'Cisco') l3Interfaces.add(`Vlan${vlanIntf.vlanId}`);
                    else if (vendor === 'Huawei') l3Interfaces.add(`Vlanif${vlanIntf.vlanId}`);
                    else if (vendor === 'H3C') l3Interfaces.add(`Vlan-interface${vlanIntf.vlanId}`);
                }
            });
        }
        
        return Array.from(l3Interfaces);
    }, [selectedNode]);

    const configuredOspfInterfaces = useMemo(() => 
        new Set(routingConfig.ospf.interfaceConfigs.map(c => c.interfaceName)), 
    [routingConfig.ospf.interfaceConfigs]);

    return (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => onToggleSection('l3IpRouting')}>
                <div className="flex items-center gap-3">
                    <span className={`transition-transform text-slate-300 ${isL3IpRoutingExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h3 className="font-bold text-base text-slate-200">三层IP路由配置</h3>
                </div>
            </div>
            {isL3IpRoutingExpanded && (
                <div className="p-2 space-y-2 border-t border-slate-700">
                    <div className="bg-slate-700/50 rounded-lg">
                        <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={() => onToggleSection('staticRouting')}>
                            <div className="flex items-center gap-2">
                                <span className={`transition-transform text-slate-400 ${isStaticRoutingExpanded ? 'rotate-90' : ''}`}>▶</span>
                                <h4 className="font-semibold">静态路由</h4>
                            </div>
                        </div>
                        {isStaticRoutingExpanded && (
                             <div className="border-t border-slate-600 p-3 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h5 className="text-sm font-medium text-slate-300">静态路由表</h5>
                                    <button onClick={addStaticRoute} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加路由</button>
                                </div>
                                {routingConfig.staticRoutes.map((route, index) => (
                                    <div key={index} className="bg-slate-800/50 p-3 rounded space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400">静态路由 {index + 1}</span>
                                            <button onClick={() => removeStaticRoute(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">目标网络</label>
                                                <input type="text" placeholder="192.168.2.0" value={route.network} onChange={(e) => updateStaticRoute(index, { network: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">子网掩码</label>
                                                <input type="text" placeholder="255.255.255.0" value={route.subnetMask} onChange={(e) => updateStaticRoute(index, { subnetMask: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">下一跳</label>
                                                <input type="text" placeholder="192.168.1.1" value={route.nextHop} onChange={(e) => updateStaticRoute(index, { nextHop: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">管理距离</label>
                                                <input type="text" placeholder="1" value={route.adminDistance || ''} onChange={(e) => updateStaticRoute(index, { adminDistance: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )}
                    </div>

                    {showOSPF && (
                        <div className="bg-slate-700/50 rounded-lg">
                            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={() => onToggleSection('ospf')}>
                                <div className="flex items-center gap-2">
                                    <span className={`transition-transform text-slate-400 ${isOspfExpanded ? 'rotate-90' : ''}`}>▶</span>
                                    <h4 className="font-semibold">OSPF动态路由</h4>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); updateOSPFConfig({ enabled: !routingConfig.ospf.enabled });}} className={`px-2 py-1 text-xs rounded-full ${routingConfig.ospf.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>
                                    {routingConfig.ospf.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                            {isOspfExpanded && routingConfig.ospf.enabled && (
                                <div className="border-t border-slate-600 p-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Process ID</label>
                                            <input type="text" value={routingConfig.ospf.processId} onChange={(e) => updateOSPFConfig({ processId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Router ID</label>
                                            <input type="text" value={routingConfig.ospf.routerId} onChange={(e) => updateOSPFConfig({ routerId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-around">
                                        <label className="flex items-center space-x-2 text-xs text-slate-300">
                                            <input type="checkbox" checked={routingConfig.ospf.redistributeStatic} onChange={(e) => updateOSPFConfig({ redistributeStatic: e.target.checked })} className="rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500" />
                                            <span>重分发静态</span>
                                        </label>
                                        <label className="flex items-center space-x-2 text-xs text-slate-300">
                                            <input type="checkbox" checked={routingConfig.ospf.redistributeConnected} onChange={(e) => updateOSPFConfig({ redistributeConnected: e.target.checked })} className="rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500" />
                                            <span>重分发直连</span>
                                        </label>
                                        <label className="flex items-center space-x-2 text-xs text-slate-300">
                                            <input type="checkbox" checked={routingConfig.ospf.defaultRoute} onChange={(e) => updateOSPFConfig({ defaultRoute: e.target.checked })} className="rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500" />
                                            <span>发布默认路由</span>
                                        </label>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-slate-700">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-sm font-medium text-slate-300">OSPF Areas</h5>
                                            <button onClick={addOSPFArea} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">Add Area</button>
                                        </div>
                                        {routingConfig.ospf.areas.map((area, areaIndex) => {
                                            const isBackbone = area.areaId === '0';
                                            return (
                                            <div key={areaIndex} className="bg-slate-800/50 p-3 rounded space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-slate-400">Area {area.areaId}</span>
                                                    {!isBackbone && <button onClick={() => removeOSPFArea(areaIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Delete Area</button>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Area ID</label>
                                                        <input type="text" value={area.areaId} onChange={(e) => updateOSPFArea(areaIndex, { areaId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1">Area Type</label>
                                                        <select value={area.areaType} onChange={(e) => updateOSPFArea(areaIndex, { areaType: e.target.value as any })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                                            <option value="standard">Standard</option>
                                                            <option value="stub" disabled={isBackbone}>Stub</option>
                                                            <option value="nssa" disabled={isBackbone}>NSSA</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {(area.areaType === 'stub' || area.areaType === 'nssa') && !isBackbone && (
                                                    <div className="bg-slate-900/50 p-2 rounded space-y-2 mt-2">
                                                        <div className="grid grid-cols-2 gap-2 items-center">
                                                            <label className="flex items-center gap-2 text-xs text-slate-300">
                                                                <input type="checkbox" checked={!!area.noSummary} onChange={(e) => updateOSPFArea(areaIndex, { noSummary: e.target.checked })} className="rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500" />
                                                                Totally Stub/NSSA
                                                            </label>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-400 mb-1">Default Cost</label>
                                                                <input type="text" placeholder="1" value={area.defaultCost || '1'} onChange={(e) => updateOSPFArea(areaIndex, { defaultCost: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 pl-6">即 `no-summary` 选项，阻止区域间路由</p>
                                                    </div>
                                                )}

                                                <div className="space-y-2 pt-2 border-t border-slate-700">
                                                    <div className="flex justify-between items-center">
                                                        <h6 className="text-xs font-medium text-slate-400">Networks in Area</h6>
                                                        <button onClick={() => addNetworkToArea(areaIndex)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">Add Network</button>
                                                    </div>
                                                    {area.networks.map((network, netIndex) => (
                                                        <div key={netIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                                            <input type="text" placeholder="192.168.1.0" value={network.network} onChange={(e) => updateAreaNetwork(areaIndex, netIndex, { network: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                                            <input type="text" placeholder="0.0.0.255" value={network.wildcardMask} onChange={(e) => updateAreaNetwork(areaIndex, netIndex, { wildcardMask: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                                            <button onClick={() => removeAreaNetwork(areaIndex, netIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Del</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-slate-700">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-sm font-medium text-slate-300">OSPF接口DR优先级</h5>
                                            <button onClick={addOSPFInterfaceConfig} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加接口配置</button>
                                        </div>
                                        {routingConfig.ospf.interfaceConfigs.map((ifaceConfig, index) => (
                                            <div key={ifaceConfig.id} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                                                <select 
                                                    value={ifaceConfig.interfaceName} 
                                                    onChange={(e) => updateOSPFInterfaceConfig(index, { interfaceName: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                                >
                                                    <option value="">-- 选择接口 --</option>
                                                    {availableOspfInterfaces.map(name => (
                                                        <option 
                                                            key={name} 
                                                            value={name} 
                                                            disabled={configuredOspfInterfaces.has(name) && name !== ifaceConfig.interfaceName}
                                                        >
                                                            {name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input 
                                                    type="number" 
                                                    min="0" 
                                                    max="255"
                                                    value={ifaceConfig.priority}
                                                    onChange={(e) => updateOSPFInterfaceConfig(index, { priority: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                                    placeholder="优先级 (0-255)"
                                                />
                                                <button onClick={() => removeOSPFInterfaceConfig(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                                            </div>
                                        ))}
                                        {availableOspfInterfaces.length === 0 && (
                                            <p className="text-xs text-slate-500 text-center py-2 bg-slate-900/50 rounded">没有可用于配置OSPF优先级的L3接口。</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-32 min-h-[5rem]">
                           {isGenerating ? (
                                <div className="flex items-center text-slate-400">
                                    <SpinnerIcon className="w-4 h-4 mr-2" />
                                    <span>Generating...</span>
                                </div>
                            ) : (
                                routingConfig.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                            )}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoutingConfig;
