import React, { useCallback } from 'react';
import { Node, AddressGroup, AddressMember, Vendor } from '../../types';

interface AddressGroupConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    isEnabled: boolean;
    onToggleEnabled: () => void;
}

const AddressGroupConfig: React.FC<AddressGroupConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, isEnabled, onToggleEnabled }) => {
    const config = selectedNode.config.objectGroups;

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
        const newGroup: AddressGroup = { id: `ag-${Date.now()}`, name: `address-group-${config.addressGroups.length + 1}`, members: [] };
        updateObjectGroups({ addressGroups: [...config.addressGroups, newGroup] });
    };

    const updateGroup = (index: number, updates: Partial<AddressGroup>) => {
        const newGroups = [...config.addressGroups];
        newGroups[index] = { ...newGroups[index], ...updates };
        updateObjectGroups({ addressGroups: newGroups });
    };

    const removeGroup = (index: number) => {
        const newGroups = config.addressGroups.filter((_, i) => i !== index);
        updateObjectGroups({ addressGroups: newGroups });
    };

    const addMember = (groupIndex: number) => {
        const newMember: AddressMember = { id: `am-${Date.now()}`, type: 'ip-mask', address: '192.168.1.1', mask: '255.255.255.255' };
        const newGroups = config.addressGroups.map((g, i) =>
            i === groupIndex ? { ...g, members: [...g.members, newMember] } : g
        );
        updateObjectGroups({ addressGroups: newGroups });
    };
    
    const updateMember = (groupIndex: number, memberIndex: number, updates: Partial<AddressMember>) => {
        const newGroups = config.addressGroups.map((g, i) => {
            if (i !== groupIndex) return g;
            const oldMember = g.members[memberIndex];
            const nextMember: AddressMember = { ...oldMember, ...updates } as AddressMember;

            // Reset fields when type changes
            if (oldMember.type !== nextMember.type) {
                if (nextMember.type === 'ip-mask') {
                    nextMember.startAddress = ''; nextMember.endAddress = ''; nextMember.hostName = '';
                } else if (nextMember.type === 'range') {
                    nextMember.address = ''; nextMember.mask = ''; nextMember.hostName = '';
                } else if (nextMember.type === 'host-name') {
                    nextMember.address = ''; nextMember.mask = ''; nextMember.startAddress = ''; nextMember.endAddress = '';
                }
            }

            const nextMembers = g.members.map((m, mi) => mi === memberIndex ? nextMember : m);
            return { ...g, members: nextMembers };
        });
        updateObjectGroups({ addressGroups: newGroups });
    };

    const removeMember = (groupIndex: number, memberIndex: number) => {
        const newGroups = config.addressGroups.map((g, i) =>
            i === groupIndex ? { ...g, members: g.members.filter((_, mi) => mi !== memberIndex) } : g
        );
        updateObjectGroups({ addressGroups: newGroups });
    };

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">地址对象组</h4></div>
                 <button
                    onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
                    className={`px-2 py-1 text-xs rounded-full ${isEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            {isExpanded && isEnabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end"><button onClick={addGroup} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加地址组</button></div>
                    {config.addressGroups.map((group, gIndex) => (
                        <div key={group.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center"><input type="text" value={group.name} onChange={e => updateGroup(gIndex, { name: e.target.value })} className="bg-transparent text-sm font-medium text-slate-300 focus:bg-slate-700 rounded px-2" /><button onClick={() => removeGroup(gIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除组</button></div>
                            <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                <div className="flex justify-between items-center"><h6 className="text-xs font-medium text-slate-400">成员</h6><button onClick={() => addMember(gIndex)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">+</button></div>
                                {group.members.map((member, mIndex) => (
                                    <div key={member.id} className="bg-slate-900/50 p-2 rounded space-y-2">
                                        <div className="flex items-center justify-end"><button onClick={() => removeMember(gIndex, mIndex)} className="px-1 text-red-400 text-xs">移除</button></div>
                                        <select value={member.type} onChange={e => updateMember(gIndex, mIndex, { type: e.target.value as any })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                            <option value="ip-mask">IP/Mask</option>
                                            <option value="range">Range</option>
                                            {selectedNode.vendor === Vendor.H3C && <option value="host-name">Host Name</option>}
                                        </select>
                                        {member.type === 'ip-mask' && (<div className="grid grid-cols-2 gap-2"><input placeholder="IP Address" value={member.address || ''} onChange={e => updateMember(gIndex, mIndex, { address: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/><input placeholder={selectedNode.vendor === Vendor.H3C ? "Wildcard" : "Mask"} value={member.mask || ''} onChange={e => updateMember(gIndex, mIndex, { mask: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></div>)}
                                        {member.type === 'range' && (<div className="grid grid-cols-2 gap-2"><input placeholder="Start Address" value={member.startAddress || ''} onChange={e => updateMember(gIndex, mIndex, { startAddress: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/><input placeholder="End Address" value={member.endAddress || ''} onChange={e => updateMember(gIndex, mIndex, { endAddress: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></div>)}
                                        {member.type === 'host-name' && (<input placeholder="e.g., www.example.com" value={member.hostName || ''} onChange={e => updateMember(gIndex, mIndex, { hostName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>)}
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
export default AddressGroupConfig;
