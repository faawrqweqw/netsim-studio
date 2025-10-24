import React, { useCallback } from 'react';
import { Node, ServiceGroup, ServiceMember } from '../../types';

interface ServiceGroupConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    isEnabled: boolean;
    onToggleEnabled: () => void;
}

const ServiceGroupConfig: React.FC<ServiceGroupConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, isEnabled, onToggleEnabled }) => {
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
        const newGroup: ServiceGroup = { id: `sg-${Date.now()}`, name: `service-group-${config.serviceGroups.length + 1}`, members: [] };
        updateObjectGroups({ serviceGroups: [...config.serviceGroups, newGroup] });
    };

    const updateGroup = (index: number, updates: Partial<ServiceGroup>) => {
        const newGroups = [...config.serviceGroups];
        newGroups[index] = { ...newGroups[index], ...updates };
        updateObjectGroups({ serviceGroups: newGroups });
    };
    
    const removeGroup = (index: number) => {
        const newGroups = config.serviceGroups.filter((_, i) => i !== index);
        updateObjectGroups({ serviceGroups: newGroups });
    };

    const addMember = (groupIndex: number) => {
        const newMember: ServiceMember = { id: `sm-${Date.now()}`, protocol: 'tcp' };
        const newGroups = [...config.serviceGroups];
        newGroups[groupIndex].members.push(newMember);
        updateObjectGroups({ serviceGroups: newGroups });
    };

    const updateMember = (groupIndex: number, memberIndex: number, updates: Partial<ServiceMember>) => {
        const newGroups = [...config.serviceGroups];
        const newMembers = [...newGroups[groupIndex].members];
        const oldMember = newMembers[memberIndex];
        const newMember = { ...oldMember, ...updates };

        // Reset fields when protocol changes
        if (oldMember.protocol !== newMember.protocol) {
            newMember.sourcePortOperator = undefined; newMember.sourcePort1 = ''; newMember.sourcePort2 = '';
            newMember.destinationPortOperator = undefined; newMember.destinationPort1 = ''; newMember.destinationPort2 = '';
            newMember.icmpType = ''; newMember.icmpCode = '';
        }
        
        newMembers[memberIndex] = newMember;
        newGroups[groupIndex].members = newMembers;
        updateObjectGroups({ serviceGroups: newGroups });
    };
    
    const removeMember = (groupIndex: number, memberIndex: number) => {
        const newGroups = [...config.serviceGroups];
        newGroups[groupIndex].members = newGroups[groupIndex].members.filter((_, i) => i !== memberIndex);
        updateObjectGroups({ serviceGroups: newGroups });
    };
    
    const PORT_OPERATORS = ['lt', 'gt', 'eq', 'neq', 'range'];

    return (
         <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">服务对象组</h4></div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
                    className={`px-2 py-1 text-xs rounded-full ${isEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            {isExpanded && isEnabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end"><button onClick={addGroup} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加服务组</button></div>
                    {config.serviceGroups.map((group, gIndex) => (
                        <div key={group.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center"><input type="text" value={group.name} onChange={e => updateGroup(gIndex, { name: e.target.value })} className="bg-transparent text-sm font-medium text-slate-300 focus:bg-slate-700 rounded px-2" /><button onClick={() => removeGroup(gIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除组</button></div>
                            <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                <div className="flex justify-between items-center"><h6 className="text-xs font-medium text-slate-400">成员</h6><button onClick={() => addMember(gIndex)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded">+</button></div>
                                {group.members.map((member, mIndex) => (
                                    <div key={member.id} className="bg-slate-900/50 p-2 rounded space-y-2">
                                        <div className="flex items-center justify-end"><button onClick={() => removeMember(gIndex, mIndex)} className="px-1 text-red-400 text-xs">移除</button></div>
                                        <select value={member.protocol} onChange={e => updateMember(gIndex, mIndex, { protocol: e.target.value as any })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                            <option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option><option value="custom">Custom Protocol Number</option>
                                        </select>
                                        {member.protocol === 'custom' && <input placeholder="Protocol Number (e.g., 47 for GRE)" value={member.customProtocolNumber || ''} onChange={e => updateMember(gIndex, mIndex, { customProtocolNumber: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>}
                                        {(member.protocol === 'tcp' || member.protocol === 'udp') && (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2"><select value={member.sourcePortOperator || ''} onChange={e => updateMember(gIndex, mIndex, { sourcePortOperator: e.target.value as any })} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="">Source Port Op.</option>{PORT_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}</select><input placeholder="Port 1" value={member.sourcePort1 || ''} onChange={e => updateMember(gIndex, mIndex, { sourcePort1: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/><input placeholder="Port 2 (for range)" value={member.sourcePort2 || ''} onChange={e => updateMember(gIndex, mIndex, { sourcePort2: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" disabled={member.sourcePortOperator !== 'range'}/></div>
                                                <div className="grid grid-cols-3 gap-2"><select value={member.destinationPortOperator || ''} onChange={e => updateMember(gIndex, mIndex, { destinationPortOperator: e.target.value as any })} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="">Dest. Port Op.</option>{PORT_OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}</select><input placeholder="Port 1" value={member.destinationPort1 || ''} onChange={e => updateMember(gIndex, mIndex, { destinationPort1: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/><input placeholder="Port 2 (for range)" value={member.destinationPort2 || ''} onChange={e => updateMember(gIndex, mIndex, { destinationPort2: e.target.value })} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" disabled={member.destinationPortOperator !== 'range'}/></div>
                                            </div>
                                        )}
                                        {member.protocol === 'icmp' && (<div className="grid grid-cols-2 gap-2"><input placeholder="ICMP Type" value={member.icmpType || ''} onChange={e => updateMember(gIndex, mIndex, { icmpType: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/><input placeholder="ICMP Code" value={member.icmpCode || ''} onChange={e => updateMember(gIndex, mIndex, { icmpCode: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></div>)}
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
export default ServiceGroupConfig;