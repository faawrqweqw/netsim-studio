import React, { useCallback } from 'react';
import { Node, DeviceType, Vendor } from '../../types';
import { SpinnerIcon } from '../Icons';

interface STPConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const STPConfig: React.FC<STPConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateSTPConfig = useCallback((updates: Partial<Node['config']['stp']>) => {
        if (!selectedNode) return;
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                stp: { ...selectedNode.config.stp, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addMSTPInstance = useCallback(() => {
        if (!selectedNode) return;
        const newInstance = {
            instanceId: '1', vlanList: '10,20', priority: '32768', rootBridge: 'none' as const
        };
        updateSTPConfig({ mstpInstances: [...selectedNode.config.stp.mstpInstances, newInstance] });
    }, [selectedNode, updateSTPConfig]);

    const updateMSTPInstance = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedInstances = [...selectedNode.config.stp.mstpInstances];
        updatedInstances[index] = { ...updatedInstances[index], ...updates };
        updateSTPConfig({ mstpInstances: updatedInstances });
    }, [selectedNode, updateSTPConfig]);

    const removeMSTPInstance = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedInstances = selectedNode.config.stp.mstpInstances.filter((_, i) => i !== index);
        updateSTPConfig({ mstpInstances: updatedInstances });
    }, [selectedNode, updateSTPConfig]);

    const addPVSTVlan = useCallback(() => {
        if (!selectedNode) return;
        const newPVST = { vlanList: '10,20', priority: '32768', rootBridge: 'none' as const };
        updateSTPConfig({ pvstVlans: [...selectedNode.config.stp.pvstVlans, newPVST] });
    }, [selectedNode, updateSTPConfig]);

    const updatePVSTVlan = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedPVST = [...selectedNode.config.stp.pvstVlans];
        updatedPVST[index] = { ...updatedPVST[index], ...updates };
        updateSTPConfig({ pvstVlans: updatedPVST });
    }, [selectedNode, updateSTPConfig]);

    const removePVSTVlan = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedPVST = selectedNode.config.stp.pvstVlans.filter((_, i) => i !== index);
        updateSTPConfig({ pvstVlans: updatedPVST });
    }, [selectedNode, updateSTPConfig]);

    const addPortConfig = useCallback(() => {
        if (!selectedNode) return;
        const getAvailableStpInterfaces = () => {
            const interfaces = [];
            if (selectedNode.config.linkAggregation.enabled) {
                const groupId = selectedNode.config.linkAggregation.groupId;
                let aggregationInterface = '';
                if (selectedNode.vendor === Vendor.Cisco) aggregationInterface = `Port-channel${groupId}`;
                else if (selectedNode.vendor === Vendor.Huawei) aggregationInterface = `Eth-Trunk${groupId}`;
                else if (selectedNode.vendor === Vendor.H3C) aggregationInterface = `Bridge-Aggregation${groupId}`;
                if (aggregationInterface) interfaces.push(aggregationInterface);
            }
            // Fix: Property 'interfaces' does not exist on type 'LinkAggregationConfig'. Use 'members' instead.
            const aggregationMembers = selectedNode.config.linkAggregation.enabled ? selectedNode.config.linkAggregation.members.map(m => m.name) : [];
            selectedNode.ports.forEach(port => {
                if (port.status === 'connected' && !aggregationMembers.includes(port.name)) {
                    interfaces.push(port.name);
                }
            });
            return interfaces;
        };
        const configuredInterfaces = selectedNode.config.stp.portConfigs.map(pc => pc.interfaceName);
        const availableInterfaces = getAvailableStpInterfaces();
        const availableInterface = availableInterfaces.find(intf => !configuredInterfaces.includes(intf));
        const newPortConfig = {
            interfaceName: availableInterface || (availableInterfaces[0] || 'GigabitEthernet0/1'),
            portPriority: '128', pathCost: 'auto', edgePort: false, bpduGuard: false, stpCost: 'auto',
            pvstVlanCosts: [], mstpInstanceCosts: [], mstpInstancePriorities: []
        };
        updateSTPConfig({ portConfigs: [...selectedNode.config.stp.portConfigs, newPortConfig] });
    }, [selectedNode, updateSTPConfig]);

    const updatePortConfig = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedConfigs = [...selectedNode.config.stp.portConfigs];
        updatedConfigs[index] = { ...updatedConfigs[index], ...updates };
        updateSTPConfig({ portConfigs: updatedConfigs });
    }, [selectedNode, updateSTPConfig]);

    const removePortConfig = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedConfigs = selectedNode.config.stp.portConfigs.filter((_, i) => i !== index);
        updateSTPConfig({ portConfigs: updatedConfigs });
    }, [selectedNode, updateSTPConfig]);

    if (!selectedNode) return null;

    const config = selectedNode.config.stp;
    const isApplicable = selectedNode.type.includes('Switch');

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">STP (Spanning Tree Protocol)</h4>
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
                    {/* 基本配置 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">STP模式</label>
                            <select
                                value={config.mode}
                                onChange={(e) => updateSTPConfig({ mode: e.target.value as any })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="stp">STP</option>
                                <option value="rstp">RSTP</option>
                                {selectedNode.vendor === Vendor.H3C && (
                                    <option value="pvst">PVST</option>
                                )}
                                <option value="mstp">MSTP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">桥优先级</label>
                            <input
                                type="text"
                                placeholder="32768"
                                value={config.priority}
                                onChange={(e) => updateSTPConfig({ priority: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* 根桥和路径开销配置 - 仅在非MSTP模式下显示 */}
                    {config.mode !== 'mstp' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">根桥角色</label>
                                <select
                                    value={config.rootBridge}
                                    onChange={(e) => updateSTPConfig({ rootBridge: e.target.value as any })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="none">普通设备</option>
                                    <option value="primary">主根桥</option>
                                    <option value="secondary">备份根桥</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">路径开销标准</label>
                                <select
                                    value={config.pathCostStandard}
                                    onChange={(e) => updateSTPConfig({ pathCostStandard: e.target.value as any })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="legacy">私有标准 (legacy)</option>
                                    <option value="dot1d-1998">IEEE 802.1D-1998</option>
                                    <option value="dot1t">IEEE 802.1t</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* MSTP模式下的全局配置 */}
                    {config.mode === 'mstp' && (
                        <div className="space-y-4">
                            {/* MST域配置 - 仅华为和华三 */}
                            {(selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && (
                                <div className="bg-slate-700/30 p-3 rounded-lg">
                                    <h6 className="text-xs font-medium text-slate-300 mb-3 flex items-center">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                        MST域配置
                                    </h6>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">域名 (Region Name)</label>
                                            <input
                                                type="text"
                                                placeholder="默认为设备MAC地址"
                                                value={config.mstpRegion.regionName}
                                                onChange={(e) => updateSTPConfig({
                                                    mstpRegion: { ...config.mstpRegion, regionName: e.target.value }
                                                })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">MST域的标识名称，同域设备必须相同</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">修订级别 (Revision Level)</label>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={config.mstpRegion.revisionLevel}
                                                    onChange={(e) => updateSTPConfig({
                                                        mstpRegion: { ...config.mstpRegion, revisionLevel: e.target.value }
                                                    })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">配置版本号 (0-65535)</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">VLAN映射模式</label>
                                                <select
                                                    value={config.mstpRegion.vlanMappingMode}
                                                    onChange={(e) => updateSTPConfig({
                                                        mstpRegion: { ...config.mstpRegion, vlanMappingMode: e.target.value as 'manual' | 'modulo' }
                                                    })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="manual">手动映射</option>
                                                    <option value="modulo">模运算映射</option>
                                                </select>
                                            </div>
                                        </div>
                                        {config.mstpRegion.vlanMappingMode === 'modulo' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">模运算值 (Modulo)</label>
                                                <input
                                                    type="text"
                                                    placeholder="2"
                                                    value={config.mstpRegion.moduloValue}
                                                    onChange={(e) => updateSTPConfig({
                                                        mstpRegion: { ...config.mstpRegion, moduloValue: e.target.value }
                                                    })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">VLAN ID除以此值的余数决定映射到哪个实例</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CIST全局配置 */}
                            <div className="bg-slate-700/30 p-3 rounded-lg">
                                <h6 className="text-xs font-medium text-slate-300 mb-3 flex items-center">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                    CIST全局配置
                                </h6>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">CIST桥优先级</label>
                                        <input
                                            type="text"
                                            placeholder="32768"
                                            value={config.priority}
                                            onChange={(e) => updateSTPConfig({ priority: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">CIST (Common and Internal Spanning Tree) 优先级</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">路径开销标准</label>
                                        <select
                                            value={config.pathCostStandard}
                                            onChange={(e) => updateSTPConfig({ pathCostStandard: e.target.value as any })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="legacy">私有标准 (legacy)</option>
                                            <option value="dot1d-1998">IEEE 802.1D-1998</option>
                                            <option value="dot1t">IEEE 802.1t</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 定时器配置 */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Max Age (秒)</label>
                            <input
                                type="text"
                                placeholder="20"
                                value={config.maxAge}
                                onChange={(e) => updateSTPConfig({ maxAge: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Hello Time (秒)</label>
                            <input
                                type="text"
                                placeholder="2"
                                value={config.helloTime}
                                onChange={(e) => updateSTPConfig({ helloTime: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">转发延迟 (秒)</label>
                            <input
                                type="text"
                                placeholder="15"
                                value={config.forwardDelay}
                                onChange={(e) => updateSTPConfig({ forwardDelay: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* PVST配置 */}
                    {config.mode === 'pvst' && (
                        <div className="border-t border-slate-600 pt-3">
                            <div className="flex justify-between items-center mb-2">
                                <h5 className="text-sm font-medium text-slate-300">PVST VLAN配置</h5>
                                <button
                                    onClick={addPVSTVlan}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                >
                                    添加VLAN
                                </button>
                            </div>
                            {config.pvstVlans.map((pvst, index) => (
                                <div key={index} className="bg-slate-800/50 p-2 rounded mb-2">
                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">VLAN列表</label>
                                            <input
                                                type="text"
                                                placeholder="10,20,30-40"
                                                value={pvst.vlanList}
                                                onChange={(e) => updatePVSTVlan(index, { vlanList: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">优先级</label>
                                            <input
                                                type="text"
                                                value={pvst.priority}
                                                onChange={(e) => updatePVSTVlan(index, { priority: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">根桥角色</label>
                                            <select
                                                value={pvst.rootBridge}
                                                onChange={(e) => updatePVSTVlan(index, { rootBridge: e.target.value as any })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="none">普通</option>
                                                <option value="primary">主根桥</option>
                                                <option value="secondary">备份根桥</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={() => removePVSTVlan(index)}
                                                className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* MSTP实例配置 */}
                    {config.mode === 'mstp' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h5 className="text-sm font-medium text-slate-300 flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    MSTP实例配置
                                </h5>
                                <button
                                    onClick={addMSTPInstance}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                >
                                    添加实例
                                </button>
                            </div>
                            <div className="text-xs text-slate-400 bg-slate-700/20 p-2 rounded">
                                <p>💡 每个MSTP实例可以包含多个VLAN，并独立计算生成树</p>
                            </div>
                            {config.mstpInstances.map((instance, index) => (
                                <div key={index} className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <h6 className="text-xs font-medium text-slate-300">
                                            实例 {instance.instanceId || (index + 1)}
                                        </h6>
                                        <button
                                            onClick={() => removeMSTPInstance(index)}
                                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                        >
                                            删除实例
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">实例ID</label>
                                                <input
                                                    type="text"
                                                    placeholder="1"
                                                    value={instance.instanceId}
                                                    onChange={(e) => updateMSTPInstance(index, { instanceId: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">实例优先级</label>
                                                <input
                                                    type="text"
                                                    placeholder="32768"
                                                    value={instance.priority}
                                                    onChange={(e) => updateMSTPInstance(index, { priority: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        {/* VLAN映射配置 - 根据映射模式显示不同内容 */}
                                        {(selectedNode.vendor !== Vendor.Huawei && selectedNode.vendor !== Vendor.H3C) || config.mstpRegion.vlanMappingMode === 'manual' ? (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">包含的VLAN</label>
                                                <input
                                                    type="text"
                                                    placeholder="例如: 10,20,30-40"
                                                    value={instance.vlanList}
                                                    onChange={(e) => updateMSTPInstance(index, { vlanList: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">支持单个VLAN(10)、列表(10,20,30)或范围(10-20)</p>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-600/30 p-3 rounded border border-slate-600">
                                                <p className="text-xs text-slate-300 mb-1">
                                                    <span className="font-medium">模运算映射模式</span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    VLAN将根据 VLAN ID % {config.mstpRegion.moduloValue} 的结果自动映射到对应实例
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    实例 {instance.instanceId}: VLAN ID 除以 {config.mstpRegion.moduloValue} 余数为 {instance.instanceId} 的所有VLAN
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">此实例的根桥角色</label>
                                            <select
                                                value={instance.rootBridge}
                                                onChange={(e) => updateMSTPInstance(index, { rootBridge: e.target.value as any })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="none">普通设备</option>
                                                <option value="primary">主根桥 (最高优先级)</option>
                                                <option value="secondary">备份根桥 (次高优先级)</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-1">设置此设备在当前实例中的角色</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {config.mstpInstances.length === 0 && (
                                <div className="text-center py-4 text-slate-500 text-xs bg-slate-700/20 rounded-lg border-2 border-dashed border-slate-600">
                                    <p>暂无MSTP实例</p>
                                    <p>点击"添加实例"开始配置</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 端口配置 */}
                    <div className="border-t border-slate-600 pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-sm font-medium text-slate-300">端口配置</h5>
                            <button
                                onClick={addPortConfig}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                            >
                                添加端口
                            </button>
                        </div>
                        {config.portConfigs.map((portConfig, index) => (
                            <div key={index} className="bg-slate-800/50 p-3 rounded mb-2">
                                <div className="grid grid-cols-[2fr_1fr_auto] gap-2 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">接口名称</label>
                                        <select
                                            value={(() => {
                                                const getAvailableStpInterfaces = () => {
                                                    const interfaces = [];
                                                    if (selectedNode.config.linkAggregation.enabled) {
                                                        const groupId = selectedNode.config.linkAggregation.groupId;
                                                        let aggregationInterface = '';
                                                        if (selectedNode.vendor === Vendor.Cisco) {
                                                            aggregationInterface = `Port-channel${groupId}`;
                                                        } else if (selectedNode.vendor === Vendor.Huawei) {
                                                            aggregationInterface = `Eth-Trunk${groupId}`;
                                                        } else if (selectedNode.vendor === Vendor.H3C) {
                                                            aggregationInterface = `Bridge-Aggregation${groupId}`;
                                                        }
                                                        if (aggregationInterface) interfaces.push(aggregationInterface);
                                                    }
                                                    // Fix: Property 'interfaces' does not exist on type 'LinkAggregationConfig'. Use 'members' instead.
                                                    const aggregationMembers = selectedNode.config.linkAggregation.enabled ? selectedNode.config.linkAggregation.members.map(m => m.name) : [];
                                                    selectedNode.ports.forEach(port => {
                                                        if (port.status === 'connected' && !aggregationMembers.includes(port.name)) {
                                                            interfaces.push(port.name);
                                                        }
                                                    });
                                                    return interfaces;
                                                };
                                                const availableInterfaces = getAvailableStpInterfaces();
                                                return availableInterfaces.includes(portConfig.interfaceName) ? portConfig.interfaceName : (availableInterfaces[0] || '');
                                            })()}
                                            onChange={(e) => updatePortConfig(index, { interfaceName: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            {(() => {
                                                const getAvailableStpInterfaces = () => {
                                                    const interfaces = [];
                                                    if (selectedNode.config.linkAggregation.enabled) {
                                                        const groupId = selectedNode.config.linkAggregation.groupId;
                                                        let aggregationInterface = '';
                                                        let displayName = '';
                                                        if (selectedNode.vendor === Vendor.Cisco) {
                                                            aggregationInterface = `Port-channel${groupId}`;
                                                            displayName = `Port-channel${groupId} (聚合接口)`;
                                                        } else if (selectedNode.vendor === Vendor.Huawei) {
                                                            aggregationInterface = `Eth-Trunk${groupId}`;
                                                            displayName = `Eth-Trunk${groupId} (聚合接口)`;
                                                        } else if (selectedNode.vendor === Vendor.H3C) {
                                                            aggregationInterface = `Bridge-Aggregation${groupId}`;
                                                            displayName = `Bridge-Aggregation${groupId} (聚合接口)`;
                                                        }
                                                        if (aggregationInterface) interfaces.push({ name: aggregationInterface, displayName: displayName });
                                                    }
                                                    // Fix: Property 'interfaces' does not exist on type 'LinkAggregationConfig'. Use 'members' instead.
                                                    const aggregationMembers = selectedNode.config.linkAggregation.enabled ? selectedNode.config.linkAggregation.members.map(m => m.name) : [];
                                                    selectedNode.ports.forEach(port => {
                                                        if (port.status === 'connected' && !aggregationMembers.includes(port.name)) {
                                                            interfaces.push({ name: port.name, displayName: `${port.name} (已连接)` });
                                                        }
                                                    });
                                                    return interfaces;
                                                };
                                                const availableInterfaces = getAvailableStpInterfaces();
                                                if (availableInterfaces.length === 0) return (<option value="">无可用接口</option>);
                                                return availableInterfaces.map((intf, intfIndex) => (<option key={intfIndex} value={intf.name}> {intf.displayName} </option>));
                                            })()}
                                        </select>
                                    </div>
                                    {config.mode !== 'mstp' && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">端口优先级</label>
                                            <input
                                                type="text"
                                                placeholder="128"
                                                value={portConfig.portPriority}
                                                onChange={(e) => updatePortConfig(index, { portPriority: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => removePortConfig(index)}
                                            className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                        >
                                            删除端口
                                        </button>
                                    </div>
                                </div>

                                {/* 路径开销配置 */}
                                <div className="space-y-2">
                                    {(config.mode === 'stp' || config.mode === 'rstp') && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">路径开销</label>
                                            <input
                                                type="text"
                                                placeholder="auto 或具体数值如 20000"
                                                value={portConfig.stpCost || 'auto'}
                                                onChange={(e) => updatePortConfig(index, { stpCost: e.target.value })}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                设置较大值（如20000）可阻塞该端口
                                            </p>
                                        </div>
                                    )}

                                    {/* MSTP实例配置 - 仅在MSTP模式下显示 */}
                                    {config.mode === 'mstp' && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.H3C) && (
                                        <div className="space-y-3">
                                            <div className="border-t border-slate-600 pt-3">
                                                <h6 className="text-xs font-medium text-slate-300 mb-2">MSTP实例配置</h6>
                                                <div className="mb-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-xs font-medium text-slate-400">实例路径开销</label>
                                                        <button onClick={() => { const newCost = { instanceList: '1', cost: 'auto' }; updatePortConfig(index, { mstpInstanceCosts: [...(portConfig.mstpInstanceCosts || []), newCost] }); }} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded" > 添加实例开销 </button>
                                                    </div>
                                                    {(portConfig.mstpInstanceCosts || []).map((instanceCost, costIndex) => (
                                                        <div key={costIndex} className="grid grid-cols-3 gap-2 mb-2">
                                                            <input type="text" placeholder="实例ID (如: 1,2 或 1-3)" value={instanceCost.instanceList} onChange={(e) => { const updatedCosts = [...(portConfig.mstpInstanceCosts || [])]; updatedCosts[costIndex] = { ...updatedCosts[costIndex], instanceList: e.target.value }; updatePortConfig(index, { mstpInstanceCosts: updatedCosts }); }} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                                            <input type="text" placeholder="开销值 (auto 或数值)" value={instanceCost.cost} onChange={(e) => { const updatedCosts = [...(portConfig.mstpInstanceCosts || [])]; updatedCosts[costIndex] = { ...updatedCosts[costIndex], cost: e.target.value }; updatePortConfig(index, { mstpInstanceCosts: updatedCosts }); }} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                                            <button onClick={() => { const updatedCosts = (portConfig.mstpInstanceCosts || []).filter((_, i) => i !== costIndex); updatePortConfig(index, { mstpInstanceCosts: updatedCosts }); }} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded" > 删除 </button>
                                                        </div>
                                                    ))}
                                                    <p className="text-xs text-slate-500 mt-1">命令格式: stp [instance instance-list] cost cost</p>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-xs font-medium text-slate-400">实例端口优先级</label>
                                                        <button onClick={() => { const newPriority = { instanceList: '1', priority: '128' }; updatePortConfig(index, { mstpInstancePriorities: [...(portConfig.mstpInstancePriorities || []), newPriority] }); }} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded" > 添加实例优先级 </button>
                                                    </div>
                                                    {(portConfig.mstpInstancePriorities || []).map((instancePriority, priorityIndex) => (
                                                        <div key={priorityIndex} className="grid grid-cols-3 gap-2 mb-2">
                                                            <input type="text" placeholder="实例ID (如: 1,2 或 1-3)" value={instancePriority.instanceList} onChange={(e) => { const updatedPriorities = [...(portConfig.mstpInstancePriorities || [])]; updatedPriorities[priorityIndex] = { ...updatedPriorities[priorityIndex], instanceList: e.target.value }; updatePortConfig(index, { mstpInstancePriorities: updatedPriorities }); }} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                                            <input type="text" placeholder="优先级 (0-240)" value={instancePriority.priority} onChange={(e) => { const updatedPriorities = [...(portConfig.mstpInstancePriorities || [])]; updatedPriorities[priorityIndex] = { ...updatedPriorities[priorityIndex], priority: e.target.value }; updatePortConfig(index, { mstpInstancePriorities: updatedPriorities }); }} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                                            <button onClick={() => { const updatedPriorities = (portConfig.mstpInstancePriorities || []).filter((_, i) => i !== priorityIndex); updatePortConfig(index, { mstpInstancePriorities: updatedPriorities }); }} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded" > 删除 </button>
                                                        </div>
                                                    ))}
                                                    <p className="text-xs text-slate-500 mt-1">命令格式: stp [instance instance-list] port priority priority</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 端口特性配置 - 只在RSTP/MSTP模式下显示 */}
                                    {(config.mode === 'rstp' || config.mode === 'mstp') && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" id={`edge-port-${index}`} checked={portConfig.edgePort} onChange={(e) => updatePortConfig(index, { edgePort: e.target.checked })} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500" />
                                                <label htmlFor={`edge-port-${index}`} className="text-xs font-medium text-slate-400">边缘端口</label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" id={`bpdu-guard-${index}`} checked={portConfig.bpduGuard} onChange={(e) => updatePortConfig(index, { bpduGuard: e.target.checked })} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500" />
                                                <label htmlFor={`bpdu-guard-${index}`} className="text-xs font-medium text-slate-400">BPDU保护</label>
                                            </div>
                                        </div>
                                    )}
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
                    <p className="text-xs text-slate-500 italic">STP only available on switches.</p>
                </div>
            )}
        </div>
    );
};

export default STPConfig;