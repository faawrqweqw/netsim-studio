import React, { useCallback, useMemo } from 'react';
import { Node, PortIsolationGroup, Vendor, DeviceType } from '../../types';
import { SpinnerIcon } from '../Icons';

interface PortIsolationConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const PortIsolationConfig: React.FC<PortIsolationConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {

    const updatePortIsolationConfig = useCallback((updates: Partial<Node['config']['portIsolation']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                portIsolation: { ...selectedNode.config.portIsolation, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addGroup = useCallback(() => {
        const newGroup: PortIsolationGroup = {
            id: `pi-group-${Date.now()}`,
            groupId: '1',
            interfaces: [],
            communityVlans: '',
        };
        updatePortIsolationConfig({ groups: [...selectedNode.config.portIsolation.groups, newGroup] });
    }, [selectedNode.config.portIsolation.groups, updatePortIsolationConfig]);

    const updateGroup = useCallback((index: number, updates: Partial<PortIsolationGroup>) => {
        const newGroups = [...selectedNode.config.portIsolation.groups];
        newGroups[index] = { ...newGroups[index], ...updates };
        updatePortIsolationConfig({ groups: newGroups });
    }, [selectedNode.config.portIsolation.groups, updatePortIsolationConfig]);

    const removeGroup = useCallback((index: number) => {
        const newGroups = selectedNode.config.portIsolation.groups.filter((_, i) => i !== index);
        updatePortIsolationConfig({ groups: newGroups });
    }, [selectedNode.config.portIsolation.groups, updatePortIsolationConfig]);

    const addInterfaceToGroup = useCallback((groupIndex: number) => {
        const newGroups = [...selectedNode.config.portIsolation.groups];
        newGroups[groupIndex].interfaces.push('');
        updatePortIsolationConfig({ groups: newGroups });
    }, [selectedNode.config.portIsolation.groups, updatePortIsolationConfig]);

    const updateInterfaceInGroup = useCallback((groupIndex: number, interfaceIndex: number, interfaceName: string) => {
        const newGroups = [...selectedNode.config.portIsolation.groups];
        newGroups[groupIndex].interfaces[interfaceIndex] = interfaceName;
        updatePortIsolationConfig({ groups: newGroups });
    }, [selectedNode.config.portIsolation.groups, updatePortIsolationConfig]);
    
    const removeInterfaceFromGroup = useCallback((groupIndex: number, interfaceIndex: number) => {
        const newGroups = [...selectedNode.config.portIsolation.groups];
        newGroups[groupIndex].interfaces = newGroups[groupIndex].interfaces.filter((_, i) => i !== interfaceIndex);
        updatePortIsolationConfig({ groups: newGroups });
    }, [selectedNode.config.portIsolation.groups, updatePortIsolationConfig]);


    const config = selectedNode.config.portIsolation;
    const isApplicable = selectedNode.type.includes('Switch');

    const allConfiguredInterfaces = useMemo(() => {
        const configured = new Set<string>();
        config.groups.forEach(group => {
            group.interfaces.forEach(iface => {
                if(iface) configured.add(iface);
            });
        });
        return configured;
    }, [config.groups]);

    const availablePorts = useMemo(() => 
        selectedNode.ports
            .filter(p => p.status === 'connected')
            .map(p => p.name), 
    [selectedNode.ports]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">端口隔离 (Port Isolation)</h4></div>
                {isApplicable && <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    {/* Global Settings */}
                    {selectedNode.vendor === Vendor.Huawei && (
                        <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg">
                            <h5 className="text-sm font-medium text-slate-300">全局配置</h5>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">隔离模式</label>
                                <select value={config.mode} onChange={(e) => updatePortIsolationConfig({ mode: e.target.value as 'l2' | 'all' })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                    <option value="l2">二层隔离，三层互通 (L2)</option>
                                    <option value="all">二层和三层都隔离 (All)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">排除的VLAN</label>
                                <input type="text" placeholder="e.g., 10,20,30-40" value={config.excludedVlans} onChange={(e) => updatePortIsolationConfig({ excludedVlans: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>
                                <p className="text-xs text-slate-500 mt-1">在这些VLAN中，端口隔离不生效。</p>
                            </div>
                        </div>
                    )}

                    {/* Groups */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-sm font-medium text-slate-300">隔离组</label><button onClick={addGroup} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加隔离组</button></div>
                        {config.groups.map((group, gIndex) => (
                            <div key={group.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><label className="text-xs text-slate-400">组ID:</label><input type="text" value={group.groupId} onChange={(e) => updateGroup(gIndex, { groupId: e.target.value })} className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></div><button onClick={() => removeGroup(gIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除组</button></div>
                                {selectedNode.vendor === Vendor.H3C && (
                                     <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">非隔离VLAN (Community VLAN)</label>
                                        <input type="text" placeholder="e.g., 10,20,30-40" value={group.communityVlans} onChange={(e) => updateGroup(gIndex, { communityVlans: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>
                                        <p className="text-xs text-slate-500 mt-1">在这些VLAN中，本组内的端口可以互相通信。</p>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                    <label className="text-xs font-medium text-slate-400">成员接口</label>
                                    {group.interfaces.map((iface, ifIndex) => (
                                        <div key={ifIndex} className="flex items-center gap-2">
                                            <select value={iface} onChange={(e) => updateInterfaceInGroup(gIndex, ifIndex, e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                                <option value="">-- 选择接口 --</option>
                                                {availablePorts.map(p => <option key={p} value={p} disabled={allConfiguredInterfaces.has(p) && p !== iface}>{p}</option>)}
                                            </select>
                                            <button onClick={() => removeInterfaceFromGroup(gIndex, ifIndex)} className="px-2 py-1 bg-red-600/80 hover:bg-red-700 text-white text-xs rounded">-</button>
                                        </div>
                                    ))}
                                    <button onClick={() => addInterfaceToGroup(gIndex)} className="px-2 py-1 bg-blue-600/80 hover:bg-blue-700 text-white text-xs rounded w-full">+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div><h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5><pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-48 min-h-[5rem]">{isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}</pre></div>
                </div>
            )}
            {isExpanded && !isApplicable && (<div className="border-t border-slate-600 p-3"><p className="text-xs text-slate-500 italic">Port Isolation is only available on switches.</p></div>)}
        </div>
    );
};

export default PortIsolationConfig;