
import React, { useCallback } from 'react';
import { Node, DeviceType } from '../../types';
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
        const newArea = { areaId: '1', areaType: 'standard' as const, networks: [] };
        updateOSPFConfig({ areas: [...routingConfig.ospf.areas, newArea] });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const updateOSPFArea = useCallback((index: number, updates: any) => {
        const updatedAreas = [...routingConfig.ospf.areas];
        updatedAreas[index] = { ...updatedAreas[index], ...updates };
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const removeOSPFArea = useCallback((index: number) => {
        const updatedAreas = routingConfig.ospf.areas.filter((_, i) => i !== index);
        updateOSPFConfig({ areas: updatedAreas });
    }, [routingConfig.ospf.areas, updateOSPFConfig]);

    const addNetworkToArea = useCallback((areaIndex: number) => {
        const updatedAreas = [...routingConfig.ospf.areas];
        updatedAreas[areaIndex].networks.push({ network: '192.168.1.0', wildcardMask: '0.0.0.255' });
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
                                        {routingConfig.ospf.areas.map((area, areaIndex) => (
                                            <div key={areaIndex} className="bg-slate-800/50 p-3 rounded space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-slate-400">Area {area.areaId}</span>
                                                    <button onClick={() => removeOSPFArea(areaIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">Delete Area</button>
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
                                                            <option value="stub">Stub</option>
                                                            <option value="nssa">NSSA</option>
                                                        </select>
                                                    </div>
                                                </div>
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
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 min-h-[5rem] flex items-center justify-center">
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
