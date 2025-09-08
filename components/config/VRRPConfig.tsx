
import React, { useCallback, useMemo, useEffect } from 'react';
import { Node, DeviceType } from '../../types';
import { SpinnerIcon } from '../Icons';

interface VRRPConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const VRRPConfig: React.FC<VRRPConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateVRRPConfig = useCallback((updates: Partial<Node['config']['vrrp']>) => {
        if (!selectedNode) return;
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                vrrp: { ...selectedNode.config.vrrp, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addVRRPGroup = useCallback(() => {
        if (!selectedNode) return;
        const { groups } = selectedNode.config.vrrp;
        const newGroup = {
            groupId: (groups.length + 1).toString(), virtualIp: '192.168.1.1', priority: '100',
            preempt: true, preemptDelay: '0', authType: 'none' as const, authKey: '', advertisementInterval: '1',
            description: `VRRP Group ${groups.length + 1}`
        };
        updateVRRPConfig({ groups: [...groups, newGroup] });
    }, [selectedNode, updateVRRPConfig]);

    const updateVRRPGroup = useCallback((index: number, updates: any) => {
        if (!selectedNode) return;
        const updatedGroups = [...selectedNode.config.vrrp.groups];
        updatedGroups[index] = { ...updatedGroups[index], ...updates };
        updateVRRPConfig({ groups: updatedGroups });
    }, [selectedNode, updateVRRPConfig]);

    const removeVRRPGroup = useCallback((index: number) => {
        if (!selectedNode) return;
        const updatedGroups = selectedNode.config.vrrp.groups.filter((_, i) => i !== index);
        updateVRRPConfig({ groups: updatedGroups });
    }, [selectedNode, updateVRRPConfig]);

    if (!selectedNode) return null;

    const config = selectedNode.config.vrrp;
    const isApplicable = selectedNode.type === DeviceType.Router ||
        selectedNode.type === DeviceType.L3Switch ||
        selectedNode.type === DeviceType.Firewall;
        
    const availableInterfaces = useMemo(() => {
        if (!selectedNode) return [];

        if (selectedNode.type === DeviceType.L3Switch || selectedNode.type === DeviceType.L2Switch) {
            return selectedNode.config.vlan.vlanInterfaces
                .filter(vlan => vlan.vlanId && vlan.ipAddress && vlan.subnetMask)
                .map(vlan => {
                    const vendorLower = selectedNode.vendor.toLowerCase();
                    if (vendorLower === 'cisco') return `Vlan${vlan.vlanId}`;
                    if (vendorLower === 'huawei') return `Vlanif${vlan.vlanId}`;
                    if (vendorLower === 'h3c') return `Vlan-interface${vlan.vlanId}`;
                    return `Vlan-interface${vlan.vlanId}`;
                });
        } else {
            return selectedNode.ports.map(port => port.name);
        }
    }, [selectedNode]);

    useEffect(() => {
        if (config.interfaceName && !availableInterfaces.includes(config.interfaceName)) {
            updateVRRPConfig({ interfaceName: '' });
        }
    }, [availableInterfaces, config.interfaceName, updateVRRPConfig]);

    return (
        <div className="bg-slate-800/30 rounded-lg">
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/30 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">VRRP配置 (Virtual Router Redundancy Protocol)</h4>
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
                    {/* 接口选择 */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">接口名称</label>
                        <select
                            value={config.interfaceName}
                            onChange={(e) => updateVRRPConfig({ interfaceName: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">选择接口</option>
                            {availableInterfaces.map((name, index) => (
                                <option key={index} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        {selectedNode.type.includes('Switch') && availableInterfaces.length === 0 && (
                            <p className="text-xs text-yellow-400 mt-1">
                                无可用的VLAN接口。请先在 "VLAN接口" 中创建并配置三层VLAN接口。
                            </p>
                        )}
                    </div>

                    {/* VRRP组配置 */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-slate-400">VRRP组配置</label>
                            <button
                                onClick={addVRRPGroup}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                            >
                                添加VRRP组
                            </button>
                        </div>

                        {config.groups.map((group, groupIndex) => (
                            <div key={groupIndex} className="bg-slate-700/50 p-3 rounded space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-300">VRRP组 {group.groupId}</span>
                                    <button
                                        onClick={() => removeVRRPGroup(groupIndex)}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                    >
                                        删除
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">组ID</label>
                                        <input type="text" placeholder="1" value={group.groupId} onChange={(e) => updateVRRPGroup(groupIndex, { groupId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">虚拟IP</label>
                                        <input type="text" placeholder="192.168.1.1" value={group.virtualIp} onChange={(e) => updateVRRPGroup(groupIndex, { virtualIp: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">优先级</label>
                                        <input type="text" placeholder="100" value={group.priority} onChange={(e) => updateVRRPGroup(groupIndex, { priority: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        <p className="text-xs text-slate-500 mt-1">1-254，默认100</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">通告间隔</label>
                                        <input type="text" placeholder="1" value={group.advertisementInterval} onChange={(e) => updateVRRPGroup(groupIndex, { advertisementInterval: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        <p className="text-xs text-slate-500 mt-1">秒，默认1</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">描述</label>
                                    <input type="text" placeholder="VRRP Group description" value={group.description} onChange={(e) => updateVRRPGroup(groupIndex, { description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={group.preempt} onChange={(e) => updateVRRPGroup(groupIndex, { preempt: e.target.checked })} className="rounded" />
                                        <span className="text-xs text-slate-300">启用抢占</span>
                                    </label>
                                </div>

                                {group.preempt && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">抢占延迟</label>
                                        <input type="text" placeholder="0" value={group.preemptDelay || '0'} onChange={(e) => updateVRRPGroup(groupIndex, { preemptDelay: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        <p className="text-xs text-slate-500 mt-1">秒，默认0</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">认证类型</label>
                                        <select value={group.authType} onChange={(e) => updateVRRPGroup(groupIndex, { authType: e.target.value as 'none' | 'simple' | 'md5' })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" >
                                            <option value="none">无认证</option>
                                            <option value="simple">简单认证</option>
                                            <option value="md5">MD5认证</option>
                                        </select>
                                    </div>
                                    {group.authType !== 'none' && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">认证密钥</label>
                                            <input type="text" placeholder="认证密钥" value={group.authKey || ''} onChange={(e) => updateVRRPGroup(groupIndex, { authKey: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
                    <p className="text-xs text-slate-500 italic">VRRP only available on routers, L3 switches, and firewalls.</p>
                </div>
            )}
        </div>
    );
};

export default VRRPConfig;