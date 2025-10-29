import React, { useCallback, useMemo } from 'react';
import { Node, DeviceType, VRRPInterfaceConfig, VRRPGroup } from '../../types';
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
    
    const config = selectedNode.config.vrrp;

    const updateVRRPConfig = useCallback((updates: Partial<Node['config']['vrrp']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                vrrp: { ...config, ...updates },
            },
        });
    }, [selectedNode, config, onNodeUpdate]);

    const addVrrpInterface = useCallback(() => {
        const newInterfaceConfig: VRRPInterfaceConfig = {
            id: `vrrp-iface-${Date.now()}`,
            interfaceName: '',
            groups: []
        };
        updateVRRPConfig({ interfaces: [...config.interfaces, newInterfaceConfig] });
    }, [config.interfaces, updateVRRPConfig]);

    const updateVrrpInterface = useCallback((ifaceIndex: number, updates: Partial<VRRPInterfaceConfig>) => {
        const newInterfaces = [...config.interfaces];
        newInterfaces[ifaceIndex] = { ...newInterfaces[ifaceIndex], ...updates };
        updateVRRPConfig({ interfaces: newInterfaces });
    }, [config.interfaces, updateVRRPConfig]);

    const removeVrrpInterface = useCallback((ifaceIndex: number) => {
        const newInterfaces = config.interfaces.filter((_, i) => i !== ifaceIndex);
        updateVRRPConfig({ interfaces: newInterfaces });
    }, [config.interfaces, updateVRRPConfig]);

    const addVRRPGroup = useCallback((ifaceIndex: number) => {
        const newInterfaces = [...config.interfaces];
        const newGroup: VRRPGroup = {
            id: `vrrp-group-${Date.now()}`,
            groupId: (newInterfaces[ifaceIndex].groups.length + 1).toString(), 
            virtualIp: '192.168.1.1', 
            priority: '100',
            preempt: true, 
            preemptDelay: '0', 
            authType: 'none' as const, 
            authKey: '', 
            advertisementInterval: '1',
            description: `VRRP Group ${newInterfaces[ifaceIndex].groups.length + 1}`
        };
        newInterfaces[ifaceIndex].groups.push(newGroup);
        updateVRRPConfig({ interfaces: newInterfaces });
    }, [config.interfaces, updateVRRPConfig]);

    const updateVRRPGroup = useCallback((ifaceIndex: number, groupIndex: number, updates: Partial<VRRPGroup>) => {
        const newInterfaces = [...config.interfaces];
        newInterfaces[ifaceIndex].groups[groupIndex] = { ...newInterfaces[ifaceIndex].groups[groupIndex], ...updates };
        updateVRRPConfig({ interfaces: newInterfaces });
    }, [config.interfaces, updateVRRPConfig]);

    const removeVRRPGroup = useCallback((ifaceIndex: number, groupIndex: number) => {
        const newInterfaces = [...config.interfaces];
        newInterfaces[ifaceIndex].groups = newInterfaces[ifaceIndex].groups.filter((_, i) => i !== groupIndex);
        updateVRRPConfig({ interfaces: newInterfaces });
    }, [config.interfaces, updateVRRPConfig]);

    const isApplicable = selectedNode.type === DeviceType.Router ||
        selectedNode.type === DeviceType.L3Switch ||
        selectedNode.type === DeviceType.Firewall;
        
    const availableInterfaces = useMemo(() => {
        if (!selectedNode) return [];
        if (selectedNode.type.includes('Switch')) {
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
             return selectedNode.config.interfaceIP.interfaces
                .filter(iface => iface.interfaceName && iface.ipAddress)
                .map(iface => iface.interfaceName);
        }
    }, [selectedNode]);
    
    const configuredInterfaces = useMemo(() => new Set(config.interfaces.map(i => i.interfaceName)), [config.interfaces]);

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
                        onClick={(e) => { e.stopPropagation(); onToggleFeature(); }}
                        className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        {config.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                )}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end">
                        <button onClick={addVrrpInterface} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加接口VRRP配置</button>
                    </div>

                    {config.interfaces.map((vrrpIface, ifaceIndex) => (
                        <div key={vrrpIface.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center">
                                <select
                                    value={vrrpIface.interfaceName}
                                    onChange={(e) => updateVrrpInterface(ifaceIndex, { interfaceName: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                >
                                    <option value="">-- 选择接口 --</option>
                                    {availableInterfaces.map(name => (
                                        <option key={name} value={name} disabled={configuredInterfaces.has(name) && name !== vrrpIface.interfaceName}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                                <button onClick={() => removeVrrpInterface(ifaceIndex)} className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除接口</button>
                            </div>
                            
                            <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-medium text-slate-400">VRRP组配置</label>
                                    <button onClick={() => addVRRPGroup(ifaceIndex)} className="px-2 py-1 bg-green-600/80 hover:bg-green-700 text-white text-xs rounded">添加VRRP组</button>
                                </div>

                                {vrrpIface.groups.map((group, groupIndex) => (
                                    <div key={group.id} className="bg-slate-700/50 p-3 rounded space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-300">VRRP组 {group.groupId}</span>
                                            <button onClick={() => removeVRRPGroup(ifaceIndex, groupIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="block text-xs font-medium text-slate-400 mb-1">组ID</label><input type="text" value={group.groupId} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { groupId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /></div>
                                            <div><label className="block text-xs font-medium text-slate-400 mb-1">虚拟IP</label><input type="text" value={group.virtualIp} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { virtualIp: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /></div>
                                            <div><label className="block text-xs font-medium text-slate-400 mb-1">优先级</label><input type="text" value={group.priority} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { priority: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /><p className="text-xs text-slate-500 mt-1">1-254，默认100</p></div>
                                            <div><label className="block text-xs font-medium text-slate-400 mb-1">通告间隔</label><input type="text" value={group.advertisementInterval} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { advertisementInterval: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /><p className="text-xs text-slate-500 mt-1">秒，默认1</p></div>
                                        </div>
                                        <div><label className="block text-xs font-medium text-slate-400 mb-1">描述</label><input type="text" value={group.description} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /></div>
                                        <div className="flex items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={group.preempt} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { preempt: e.target.checked })} className="rounded" /> <span className="text-xs text-slate-300">启用抢占</span></label></div>
                                        {group.preempt && <div><label className="block text-xs font-medium text-slate-400 mb-1">抢占延迟</label><input type="text" value={group.preemptDelay || '0'} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { preemptDelay: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /><p className="text-xs text-slate-500 mt-1">秒，默认0</p></div>}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="block text-xs font-medium text-slate-400 mb-1">认证类型</label><select value={group.authType} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { authType: e.target.value as any })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="none">无认证</option><option value="simple">简单认证</option><option value="md5">MD5认证</option></select></div>
                                            {group.authType !== 'none' && <div><label className="block text-xs font-medium text-slate-400 mb-1">认证密钥</label><input type="password" value={group.authKey || ''} onChange={(e) => updateVRRPGroup(ifaceIndex, groupIndex, { authKey: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" /></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-48 min-h-[5rem]">
                            {isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VRRPConfig;