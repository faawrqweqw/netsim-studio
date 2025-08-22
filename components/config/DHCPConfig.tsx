
import React, { useCallback } from 'react';
import { Node, DeviceType } from '../../types';
import { SpinnerIcon } from '../Icons';

interface DHCPConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const DHCPConfig: React.FC<DHCPConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateDHCPConfig = useCallback((updates: Partial<Node['config']['dhcp']>) => {
        if (!selectedNode) return;
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                dhcp: {
                    ...selectedNode.config.dhcp,
                    ...updates,
                },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addPool = useCallback(() => {
        if (!selectedNode) return;
        const { pools } = selectedNode.config.dhcp;
        const newPool = {
            poolName: `POOL_${pools.length + 1}`,
            network: '192.168.1.0',
            subnetMask: '255.255.255.0',
            gateway: '192.168.1.1',
            dnsServer: '8.8.8.8',
            option43: '',
            excludeStart: '',
            excludeEnd: '',
            leaseDays: '0',
            leaseHours: '1',
            leaseMinutes: '0',
            leaseSeconds: '0',
            staticBindings: []
        };
        updateDHCPConfig({ pools: [...pools, newPool] });
    }, [selectedNode, updateDHCPConfig]);

    const updatePool = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedPools = [...selectedNode.config.dhcp.pools];
        updatedPools[index] = { ...updatedPools[index], ...updates };
        updateDHCPConfig({ pools: updatedPools });
    }, [selectedNode, updateDHCPConfig]);

    const removePool = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedPools = selectedNode.config.dhcp.pools.filter((_, i) => i !== index);
        updateDHCPConfig({ pools: updatedPools });
    }, [selectedNode, updateDHCPConfig]);

    const addStaticBinding = useCallback((poolIndex: number) => {
        if (!selectedNode) return;
        const newBinding = {
            ipAddress: '192.168.1.100',
            macAddress: '00:11:22:33:44:55',
            type: 'MAC地址' as const,
            clientId: ''
        };
        const updatedPools = [...selectedNode.config.dhcp.pools];
        updatedPools[poolIndex] = {
            ...updatedPools[poolIndex],
            staticBindings: [...updatedPools[poolIndex].staticBindings, newBinding]
        };
        updateDHCPConfig({ pools: updatedPools });
    }, [selectedNode, updateDHCPConfig]);

    const updateStaticBinding = useCallback((poolIndex: number, bindingIndex: number, updates: any) => {
        if (!selectedNode) return;
        const updatedPools = [...selectedNode.config.dhcp.pools];
        const updatedBindings = [...updatedPools[poolIndex].staticBindings];
        updatedBindings[bindingIndex] = { ...updatedBindings[bindingIndex], ...updates };
        updatedPools[poolIndex] = { ...updatedPools[poolIndex], staticBindings: updatedBindings };
        updateDHCPConfig({ pools: updatedPools });
    }, [selectedNode, updateDHCPConfig]);

    const removeStaticBinding = useCallback((poolIndex: number, bindingIndex: number) => {
        if (!selectedNode) return;
        const updatedPools = [...selectedNode.config.dhcp.pools];
        const updatedBindings = updatedPools[poolIndex].staticBindings.filter((_, i) => i !== bindingIndex);
        updatedPools[poolIndex] = { ...updatedPools[poolIndex], staticBindings: updatedBindings };
        updateDHCPConfig({ pools: updatedPools });
    }, [selectedNode, updateDHCPConfig]);

    if (!selectedNode) return null;

    const config = selectedNode.config.dhcp;
    const isApplicable = selectedNode.type === DeviceType.Router ||
        selectedNode.type === DeviceType.L3Switch ||
        selectedNode.type === DeviceType.AC ||
        selectedNode.type === DeviceType.Firewall;

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">DHCP Server</h4>
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
                    {/* 地址池配置 */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-slate-300">地址池配置</label>
                            <button
                                onClick={addPool}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                            >
                                添加地址池
                            </button>
                        </div>
                        {config.pools.map((pool, poolIndex) => (
                            <div key={poolIndex} className="bg-slate-800/50 p-3 rounded mb-2 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-400">地址池 {poolIndex + 1}</span>
                                    <button
                                        onClick={() => removePool(poolIndex)}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                    >
                                        删除
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">池名称</label>
                                        <input
                                            type="text"
                                            value={pool.poolName}
                                            onChange={(e) => updatePool(poolIndex, { poolName: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">网络地址</label>
                                        <input
                                            type="text"
                                            value={pool.network}
                                            onChange={(e) => updatePool(poolIndex, { network: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">子网掩码</label>
                                        <input
                                            type="text"
                                            value={pool.subnetMask}
                                            onChange={(e) => updatePool(poolIndex, { subnetMask: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">网关</label>
                                        <input
                                            type="text"
                                            value={pool.gateway}
                                            onChange={(e) => updatePool(poolIndex, { gateway: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">DNS服务器</label>
                                        <input
                                            type="text"
                                            value={pool.dnsServer}
                                            onChange={(e) => updatePool(poolIndex, { dnsServer: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Option 43 (AC IP)</label>
                                        <input
                                            type="text"
                                            placeholder="AC Controller IP Address"
                                            value={pool.option43 || ''}
                                            onChange={(e) => updatePool(poolIndex, { option43: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">排除起始地址</label>
                                        <input
                                            type="text"
                                            value={pool.excludeStart || ''}
                                            onChange={(e) => updatePool(poolIndex, { excludeStart: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">排除结束地址</label>
                                        <input
                                            type="text"
                                            value={pool.excludeEnd || ''}
                                            onChange={(e) => updatePool(poolIndex, { excludeEnd: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                {/* 租约时间 */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">租约时间</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                value={pool.leaseDays}
                                                onChange={(e) => updatePool(poolIndex, { leaseDays: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400">天</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="23"
                                                value={pool.leaseHours}
                                                onChange={(e) => updatePool(poolIndex, { leaseHours: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400">时</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={pool.leaseMinutes}
                                                onChange={(e) => updatePool(poolIndex, { leaseMinutes: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400">分</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={pool.leaseSeconds}
                                                onChange={(e) => updatePool(poolIndex, { leaseSeconds: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400">秒</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">格式：天:时:分:秒</p>
                                </div>

                                {/* 静态绑定地址 - 每个地址池内部 */}
                                <div className="mt-3 pt-3 border-t border-slate-600">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-medium text-slate-400">静态绑定地址</label>
                                        <button
                                            onClick={() => addStaticBinding(poolIndex)}
                                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                        >
                                            添加绑定
                                        </button>
                                    </div>
                                    {pool.staticBindings.map((binding, bindingIndex) => (
                                        <div key={bindingIndex} className="bg-slate-900/50 p-2 rounded mb-2">
                                            <div className="grid grid-cols-4 gap-2 mb-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">IP地址</label>
                                                    <input
                                                        type="text"
                                                        placeholder="192.168.1.100"
                                                        value={binding.ipAddress}
                                                        onChange={(e) => updateStaticBinding(poolIndex, bindingIndex, { ipAddress: e.target.value })}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">MAC地址</label>
                                                    <input
                                                        type="text"
                                                        placeholder="00:11:22:33:44:55"
                                                        value={binding.macAddress}
                                                        onChange={(e) => updateStaticBinding(poolIndex, bindingIndex, { macAddress: e.target.value })}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">类型</label>
                                                    <select
                                                        value={binding.type}
                                                        onChange={(e) => updateStaticBinding(poolIndex, bindingIndex, { type: e.target.value })}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="MAC地址">MAC地址</option>
                                                        <option value="IP地址">IP地址</option>
                                                        <option value="客户端ID">客户端ID</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        onClick={() => removeStaticBinding(poolIndex, bindingIndex)}
                                                        className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                                    >
                                                        删除
                                                    </button>
                                                </div>
                                            </div>
                                            {binding.type === '客户端ID' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">客户端ID</label>
                                                    <input
                                                        type="text"
                                                        placeholder="02:42:18:97:0d:1a"
                                                        value={binding.clientId || ''}
                                                        onChange={(e) => updateStaticBinding(poolIndex, bindingIndex, { clientId: e.target.value })}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
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
                    <p className="text-xs text-slate-500 italic">DHCP server only available on routers, L3 switches, access controllers, and firewalls.</p>
                </div>
            )}
        </div>
    );
};

export default DHCPConfig;