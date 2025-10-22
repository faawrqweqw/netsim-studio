import React, { useCallback, useState, useMemo } from 'react';
import { Node, StackingMemberConfig, Vendor } from '../../types';
import { SpinnerIcon } from '../Icons';

interface StackingConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const Field = ({ label, children, note }: { label: string, children: React.ReactNode, note?: string }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
        {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
);

const StackingConfig: React.FC<StackingConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.stacking;
    const vendor = selectedNode.vendor;
    const [portSelections, setPortSelections] = useState<Record<string, string>>({});

    // 根据厂商确定堆叠技术名称
    const stackingTechName = useMemo(() => {
        switch (vendor) {
            case Vendor.H3C:
                return 'IRF';
            case Vendor.Huawei:
                return 'CSS/iStack';
            case Vendor.Cisco:
                return 'StackWise';
            default:
                return 'IRF';
        }
    }, [vendor]);

    // 根据厂商确定型号类型说明
    const modelTypeTooltip = useMemo(() => {
        switch (vendor) {
            case Vendor.H3C:
                return '以S7500型号为界限，之前为旧型号，之后为新型号。';
            case Vendor.Huawei:
                return '新型号：S12700/S9700等数据中心交换机使用CSS2；旧型号：S系列传统交换机使用CSS。';
            case Vendor.Cisco:
                return '新型号：支持StackWise Virtual的设备（如Catalyst 9000系列）；旧型号：传统StackWise设备（如3750/3850系列）。';
            default:
                return '请选择设备型号类型。';
        }
    }, [vendor]);

    // 根据厂商确定配置标题
    const globalConfigTitle = useMemo(() => {
        switch (vendor) {
            case Vendor.H3C:
                return '全局IRF配置';
            case Vendor.Huawei:
                return '全局CSS配置';
            case Vendor.Cisco:
                return '全局StackWise配置';
            default:
                return '全局堆叠配置';
        }
    }, [vendor]);

    // 根据厂商确定域ID标签
    const domainIdLabel = useMemo(() => {
        switch (vendor) {
            case Vendor.H3C:
                return 'IRF Domain ID';
            case Vendor.Huawei:
                return 'CSS Domain ID';
            case Vendor.Cisco:
                return 'Virtual Domain ID';
            default:
                return 'Domain ID';
        }
    }, [vendor]);

    // 根据厂商确定堆叠端口ID标签
    const stackPortIdLabel = useMemo(() => {
        switch (vendor) {
            case Vendor.H3C:
                return 'IRF Port ID';
            case Vendor.Huawei:
                return 'Stack Port ID';
            case Vendor.Cisco:
                return 'Link ID';
            default:
                return 'Port ID';
        }
    }, [vendor]);

    // 根据厂商确定成员接口标签
    const memberInterfacesLabel = useMemo(() => {
        switch (vendor) {
            case Vendor.H3C:
                return 'Member Interfaces';
            case Vendor.Huawei:
                return '堆叠物理端口';
            case Vendor.Cisco:
                return 'Virtual Link Ports';
            default:
                return 'Member Interfaces';
        }
    }, [vendor]);

    const updateStackingConfig = useCallback((updates: Partial<Node['config']['stacking']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, stacking: { ...config, ...updates } } });
    }, [selectedNode, config, onNodeUpdate]);

    const addMember = useCallback(() => {
        const newMember: StackingMemberConfig = {
            id: `member-${Date.now()}`,
            memberId: `${config.members.length + 1}`,
            newMemberId: '',
            priority: '1',
            irfPorts: [ { id: '1', portGroup: [] } ],
        };
        updateStackingConfig({ members: [...config.members, newMember] });
    }, [config.members, updateStackingConfig]);

    const updateMember = useCallback((index: number, updates: Partial<StackingMemberConfig>) => {
        const newMembers = [...config.members];
        newMembers[index] = { ...newMembers[index], ...updates };
        updateStackingConfig({ members: newMembers });
    }, [config.members, updateStackingConfig]);

    const removeMember = useCallback((index: number) => {
        const newMembers = config.members.filter((_, i) => i !== index);
        updateStackingConfig({ members: newMembers });
    }, [config.members, updateStackingConfig]);
    
    const addInterfaceToPort = useCallback((memberIndex: number, portIndex: number, interfaceName: string) => {
        if (!interfaceName) return;
        const newMembers = [...config.members];
        newMembers[memberIndex].irfPorts[portIndex].portGroup.push(interfaceName);
        updateStackingConfig({ members: newMembers });
    }, [config.members, updateStackingConfig]);

    const removeInterfaceFromPort = useCallback((memberIndex: number, portIndex: number, pgIndex: number) => {
        const newMembers = [...config.members];
        const newPortGroup = newMembers[memberIndex].irfPorts[portIndex].portGroup.filter((_, i) => i !== pgIndex);
        newMembers[memberIndex].irfPorts[portIndex].portGroup = newPortGroup;
        updateStackingConfig({ members: newMembers });
    }, [config.members, updateStackingConfig]);

    const allUsedIrfPorts = useMemo(() => 
        new Set(config.members.flatMap(m => m.irfPorts.flatMap(p => p.portGroup))),
    [config.members]);
    
    const availablePortsForDropdown = useMemo(() => 
        selectedNode.ports.filter(p => !allUsedIrfPorts.has(p.name)),
    [selectedNode.ports, allUsedIrfPorts]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">堆叠 ({stackingTechName})</h4></div>
                <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>
            </div>
            {isExpanded && config.enabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                        <h5 className="text-sm font-medium text-slate-300">{globalConfigTitle}</h5>
                        <div className="grid grid-cols-2 gap-3 items-center">
                            <Field label="设备型号类型">
                                <div className="flex items-center gap-2">
                                    <div className="flex text-xs">
                                        <button onClick={() => updateStackingConfig({ modelType: 'new' })} className={`px-2 py-1 rounded-l ${config.modelType === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-600'}`}>新型号</button>
                                        <button onClick={() => updateStackingConfig({ modelType: 'old' })} className={`px-2 py-1 rounded-r ${config.modelType === 'old' ? 'bg-blue-600 text-white' : 'bg-slate-600'}`}>旧型号</button>
                                    </div>
                                    <div className="relative group">
                                        <span className="cursor-help text-xs bg-slate-600 rounded-full w-4 h-4 flex items-center justify-center text-slate-300">?</span>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-slate-900 border border-slate-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            {modelTypeTooltip}
                                        </div>
                                    </div>
                                </div>
                            </Field>
                            <Field label={domainIdLabel}><Input value={config.domainId} onChange={e => updateStackingConfig({ domainId: e.target.value })} /></Field>
                        </div>
                         {config.modelType === 'new' && vendor === Vendor.H3C && <p className="text-xs text-amber-400 bg-amber-900/50 p-2 rounded">新型号设备需要先配置成员编号，然后切换到IRF模式并重启才能使堆叠生效。</p>}
                         {config.modelType === 'new' && vendor === Vendor.Huawei && <p className="text-xs text-amber-400 bg-amber-900/50 p-2 rounded">新型号设备使用CSS2技术，需要配置堆叠端口并连接物理线缆后自动形成堆叠。</p>}
                         {config.modelType === 'new' && vendor === Vendor.Cisco && <p className="text-xs text-amber-400 bg-amber-900/50 p-2 rounded">StackWise Virtual需要配置虚拟链路和双活检测，配置完成后重启设备形成堆叠。</p>}
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-sm font-medium text-slate-300">成员设备</label><button onClick={addMember} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加成员</button></div>
                        {config.members.map((member, mIndex) => (
                            <div key={member.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                                <div className="flex justify-between items-center">
                                    <h6 className="text-xs font-semibold text-slate-400">成员 {mIndex + 1}</h6>
                                    <button onClick={() => removeMember(mIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <Field label={config.modelType === 'old' ? "当前成员ID" : "成员ID"}><Input value={member.memberId} onChange={e => updateMember(mIndex, { memberId: e.target.value })}/></Field>
                                    {config.modelType === 'old' && <Field label="新成员ID"><Input value={member.newMemberId} onChange={e => updateMember(mIndex, { newMemberId: e.target.value })}/></Field>}
                                    <Field label="优先级 (1-32)"><Input value={member.priority} onChange={e => updateMember(mIndex, { priority: e.target.value })}/></Field>
                                </div>
                                <div className="pt-2 border-t border-slate-700/50">
                                    {member.irfPorts.length > 0 && (() => {
                                        const port = member.irfPorts[0];
                                        const pIndex = 0;
                                        const selectionKey = `${mIndex}-${pIndex}`;
                                        const selectedPort = portSelections[selectionKey] || '';
                                        return (
                                            <div className="space-y-2">
                                                <Field label={stackPortIdLabel}>
                                                    <Input
                                                        value={port.id}
                                                        onChange={e => {
                                                            const newMembers = config.members.map((m, i) => {
                                                                if (i !== mIndex) return m;
                                                                const newIrfPorts = m.irfPorts.map((p, j) => {
                                                                    if (j !== pIndex) return p;
                                                                    return { ...p, id: e.target.value };
                                                                });
                                                                return { ...m, irfPorts: newIrfPorts };
                                                            });
                                                            updateStackingConfig({ members: newMembers });
                                                        }}
                                                    />
                                                </Field>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">{memberInterfacesLabel}</label>
                                                <div className="space-y-1">
                                                    {port.portGroup.map((iface, pgIndex) => (
                                                        <div key={pgIndex} className="flex items-center justify-between bg-slate-700/50 px-2 py-1 rounded">
                                                            <span className="text-xs font-mono">{iface}</span>
                                                            <button onClick={() => removeInterfaceFromPort(mIndex, pIndex, pgIndex)} className="px-1.5 py-0.5 text-xs bg-red-600 rounded-full leading-none">-</button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Select
                                                        value={selectedPort}
                                                        onChange={e => setPortSelections({...portSelections, [selectionKey]: e.target.value})}
                                                    >
                                                        <option value="">-- 选择端口 --</option>
                                                        {availablePortsForDropdown.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                                    </Select>
                                                    <button
                                                        onClick={() => {
                                                            if (selectedPort) {
                                                                addInterfaceToPort(mIndex, pIndex, selectedPort);
                                                                setPortSelections({...portSelections, [selectionKey]: ''});
                                                            }
                                                        }}
                                                        disabled={!selectedPort}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded disabled:bg-slate-500"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                            {isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StackingConfig;