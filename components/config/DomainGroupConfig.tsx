import React, { useCallback } from 'react';
import { Node, DomainGroup, DomainMember, Vendor } from '../../types';

interface DomainGroupConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    isEnabled: boolean;
    onToggleEnabled: () => void;
}

const DomainGroupConfig: React.FC<DomainGroupConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, isEnabled, onToggleEnabled }) => {
    const config = selectedNode.config.objectGroups;

    // Domain groups are only supported on Huawei. For H3C, they are part of Address Groups.
    if (selectedNode.vendor === Vendor.H3C) {
        return null;
    }

    const updateObjectGroups = useCallback((updates: Partial<Node['config']['objectGroups']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                objectGroups: { ...selectedNode.config.objectGroups, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addGroup = () => {
        const newGroup: DomainGroup = { id: `dg-${Date.now()}`, name: `domain-group-${config.domainGroups.length + 1}`, members: [] };
        updateObjectGroups({ domainGroups: [...config.domainGroups, newGroup] });
    };

    const updateGroup = (index: number, updates: Partial<DomainGroup>) => {
        const newGroups = [...config.domainGroups];
        newGroups[index] = { ...newGroups[index], ...updates };
        updateObjectGroups({ domainGroups: newGroups });
    };

    const removeGroup = (index: number) => {
        const newGroups = config.domainGroups.filter((_, i) => i !== index);
        updateObjectGroups({ domainGroups: newGroups });
    };

    const addMember = (groupIndex: number) => {
        const newMember: DomainMember = { id: `dm-${Date.now()}`, name: 'www.example.com' };
        const newGroups = config.domainGroups.map((g, i) =>
            i === groupIndex ? { ...g, members: [...g.members, newMember] } : g
        );
        updateObjectGroups({ domainGroups: newGroups });
    };

    const updateMember = (groupIndex: number, memberIndex: number, updates: Partial<DomainMember>) => {
        const newGroups = config.domainGroups.map((g, i) => {
            if (i !== groupIndex) return g;
            const nextMembers = g.members.map((m, mi) => mi === memberIndex ? { ...m, ...updates } : m);
            return { ...g, members: nextMembers };
        });
        updateObjectGroups({ domainGroups: newGroups });
    };

    const removeMember = (groupIndex: number, memberIndex: number) => {
        const newGroups = config.domainGroups.map((g, i) =>
            i === groupIndex ? { ...g, members: g.members.filter((_, mi) => mi !== memberIndex) } : g
        );
        updateObjectGroups({ domainGroups: newGroups });
    };

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">域名对象组</h4></div>
                 <button
                    onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
                    className={`px-2 py-1 text-xs rounded-full ${isEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            {isExpanded && isEnabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end"><button onClick={addGroup} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加域名组</button></div>
                    {config.domainGroups.map((group, gIndex) => (
                        <div key={group.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center"><input type="text" value={group.name} onChange={e => updateGroup(gIndex, { name: e.target.value })} className="bg-transparent text-sm font-medium text-slate-300 focus:bg-slate-700 rounded px-2" /><button onClick={() => removeGroup(gIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除组</button></div>
                            <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                <div className="flex justify-between items-center"><h6 className="text-xs font-medium text-slate-400">成员</h6><button onClick={() => addMember(gIndex)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">+</button></div>
                                {group.members.map((member, mIndex) => (
                                    <div key={member.id} className="flex items-center gap-2">
                                        <input placeholder="www.example.com" value={member.name} onChange={e => updateMember(gIndex, mIndex, { name: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>
                                        <button onClick={() => removeMember(gIndex, mIndex)} className="px-2 py-1 bg-red-600/80 hover:bg-red-700 text-white text-xs rounded">-</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DomainGroupConfig;
