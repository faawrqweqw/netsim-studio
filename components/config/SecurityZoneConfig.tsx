import React, { useCallback, useMemo } from 'react';
import { Node, SecurityZone, SecurityZoneMember } from '../../types';

const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
    </div>
);

const SecurityZoneConfig = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, isEnabled, onToggleEnabled }: {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    isEnabled: boolean;
    onToggleEnabled: () => void;
}) => {
    const config = selectedNode.config.security;

    const updateSecurityConfig = useCallback((updates: Partial<Node['config']['security']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, security: { ...selectedNode.config.security, ...updates } } });
    }, [selectedNode, onNodeUpdate]);

    const addZone = useCallback(() => {
        const newZone: SecurityZone = { id: `zone-${Date.now()}`, name: `zone${config.zones.length + 1}`, priority: '50', description: '', members: [] };
        updateSecurityConfig({ zones: [...config.zones, newZone] });
    }, [config.zones, updateSecurityConfig]);

    const updateZone = useCallback((index: number, updates: Partial<SecurityZone>) => {
        const newZones = [...config.zones];
        newZones[index] = { ...newZones[index], ...updates };
        updateSecurityConfig({ zones: newZones });
    }, [config.zones, updateSecurityConfig]);

    const removeZone = useCallback((index: number) => {
        updateSecurityConfig({ zones: config.zones.filter((_, i) => i !== index) });
    }, [config.zones, updateSecurityConfig]);

    const addMember = useCallback((zoneIndex: number) => {
        const newMember: SecurityZoneMember = { id: `member-${Date.now()}`, interfaceName: '' };
        const newZones = [...config.zones];
        newZones[zoneIndex].members.push(newMember);
        updateSecurityConfig({ zones: newZones });
    }, [config.zones, updateSecurityConfig]);

    const updateMember = useCallback((zoneIndex: number, memberIndex: number, updates: Partial<SecurityZoneMember>) => {
        const newZones = [...config.zones];
        newZones[zoneIndex].members[memberIndex] = { ...newZones[zoneIndex].members[memberIndex], ...updates };
        updateSecurityConfig({ zones: newZones });
    }, [config.zones, updateSecurityConfig]);

    const removeMember = useCallback((zoneIndex: number, memberIndex: number) => {
        const newZones = [...config.zones];
        newZones[zoneIndex].members = newZones[zoneIndex].members.filter((_, i) => i !== memberIndex);
        updateSecurityConfig({ zones: newZones });
    }, [config.zones, updateSecurityConfig]);

    const allAssignedInterfaces = useMemo(() => new Set(config.zones.flatMap(zone => zone.members.map(m => m.interfaceName))), [config.zones]);
    const availableInterfaces = useMemo(() => selectedNode.ports.map(p => p.name), [selectedNode.ports]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">安全域 (Security Zone)</h4>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
                    className={`px-2 py-1 text-xs rounded-full ${isEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            {isExpanded && isEnabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end"><button onClick={addZone} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加安全域</button></div>
                    {config.zones.map((zone, zIndex) => (
                        <div key={zone.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center"><h5 className="text-sm font-medium text-slate-300">安全域: {zone.name}</h5><button onClick={() => removeZone(zIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button></div>
                            <div className="grid grid-cols-2 gap-3"><Field label="名称"><input type="text" value={zone.name} onChange={(e) => updateZone(zIndex, { name: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></Field><Field label="优先级 (1-100)"><input type="number" min="1" max="100" value={zone.priority} onChange={(e) => updateZone(zIndex, { priority: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></Field></div>
                            <Field label="描述"><input type="text" value={zone.description} onChange={(e) => updateZone(zIndex, { description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></Field>
                            <div className="pt-2 border-t border-slate-700/50">
                                <div className="flex justify-between items-center mb-2"><h6 className="text-xs font-medium text-slate-400">成员接口</h6><button onClick={() => addMember(zIndex)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">+</button></div>
                                <div className="space-y-2">{zone.members.map((member, mIndex) => (<div key={member.id} className="flex items-center gap-2"><select value={member.interfaceName} onChange={(e) => updateMember(zIndex, mIndex, { interfaceName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="">-- 选择接口 --</option>{availableInterfaces.map(iface => (<option key={iface} value={iface} disabled={allAssignedInterfaces.has(iface) && iface !== member.interfaceName}>{iface}{allAssignedInterfaces.has(iface) && iface !== member.interfaceName ? ' (已分配)' : ''}</option>))}</select><button onClick={() => removeMember(zIndex, mIndex)} className="px-2 py-1 bg-red-600/80 hover:bg-red-700 text-white text-xs rounded">-</button></div>))}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SecurityZoneConfig;