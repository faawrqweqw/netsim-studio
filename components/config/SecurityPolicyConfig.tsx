
import React, { useCallback, useState } from 'react';
import { Node, SecurityPolicyRule } from '../../types';
import TimeRangeManagerModal from './TimeRangeManagerModal';

const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
    </div>
);

const AddressServiceSelector = ({
    label, type, value, onUpdate, groupOptions
}: {
    label: string;
    type: 'any' | 'custom' | 'group';
    value: string;
    onUpdate: (updates: { type: 'any' | 'custom' | 'group', value: string }) => void;
    groupOptions: { id: string, name: string }[];
}) => (
    <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-300">{label}</label>
        <div className="flex items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="any" checked={type === 'any'} onChange={() => onUpdate({ type: 'any', value: '' })} className="form-radio" /> Any</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="group" checked={type === 'group'} onChange={() => onUpdate({ type: 'group', value: groupOptions[0]?.name || '' })} className="form-radio" /> Group</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" value="custom" checked={type === 'custom'} onChange={() => onUpdate({ type: 'custom', value: '' })} className="form-radio" /> Custom</label>
        </div>
        {type === 'group' && (
            <select value={value} onChange={e => onUpdate({ type: 'group', value: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                {groupOptions.length === 0 && <option disabled>No groups defined</option>}
                {groupOptions.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
        )}
        {type === 'custom' && (
            <input
                placeholder="e.g., 1.2.3.4, 1.2.3.0/24, 1.2.3.4-1.2.3.10"
                type="text"
                value={value}
                onChange={(e) => onUpdate({ type: 'custom', value: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
            />
        )}
    </div>
);

const SecurityPolicyConfig = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, isEnabled, onToggleEnabled }: {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    isEnabled: boolean;
    onToggleEnabled: () => void;
}) => {
    const config = selectedNode.config.security;
    const objectGroups = selectedNode.config.objectGroups;
    const timeRanges = selectedNode.config.timeRanges || [];
    const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
    const [isTimeRangeManagerOpen, setIsTimeRangeManagerOpen] = useState(false);

    const togglePolicyExpansion = (id: string) => {
        setExpandedPolicies(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    
    const updatePolicies = useCallback((policies: SecurityPolicyRule[]) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, security: { ...config, policies } } });
    }, [selectedNode, config, onNodeUpdate]);

    const addPolicy = () => {
        const newPolicy: SecurityPolicyRule = {
            id: `policy-${Date.now()}`, name: `policy_${config.policies.length + 1}`, description: '', action: 'deny',
            sourceZone: '', destinationZone: '',
            sourceAddressType: 'any', sourceAddressValue: '',
            destinationAddressType: 'any', destinationAddressValue: '',
            serviceType: 'any', serviceValue: '',
            application: '', user: '', timeRange: '', logging: false, counting: false, enabled: true
        };
        updatePolicies([...config.policies, newPolicy]);
        togglePolicyExpansion(newPolicy.id);
    };

    const updatePolicy = (index: number, updates: Partial<SecurityPolicyRule>) => {
        const newPolicies = [...config.policies];
        newPolicies[index] = { ...newPolicies[index], ...updates };
        updatePolicies(newPolicies);
    };
    
    const removePolicy = (index: number) => {
        updatePolicies(config.policies.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">安全策略 (Security Policy)</h4>
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
                    <div className="flex justify-end"><button onClick={addPolicy} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加策略</button></div>
                    {config.policies.map((policy, pIndex) => (
                        <div key={policy.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => togglePolicyExpansion(policy.id)}>
                                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${expandedPolicies.has(policy.id) ? 'rotate-90' : ''}`}>▶</span><h5 className="text-sm font-medium text-slate-300">{policy.name}</h5></div>
                                <div className="flex items-center gap-3"><label className="flex items-center cursor-pointer"><input type="checkbox" checked={policy.enabled} onChange={(e) => updatePolicy(pIndex, { enabled: e.target.checked })} className="sr-only peer" /><div className="relative w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div></label><button onClick={(e) => { e.stopPropagation(); removePolicy(pIndex); }} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button></div>
                            </div>
                            {expandedPolicies.has(policy.id) && (
                                <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                    <div className="grid grid-cols-2 gap-3"><Field label="名称"><input type="text" value={policy.name} onChange={(e) => updatePolicy(pIndex, { name: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></Field><Field label="动作"><select value={policy.action} onChange={e => updatePolicy(pIndex, { action: e.target.value as any })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="deny">Deny / Drop</option><option value="permit">Permit / Pass</option></select></Field></div>
                                    <Field label="描述"><input type="text" value={policy.description} onChange={(e) => updatePolicy(pIndex, { description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/></Field>
                                    <div className="grid grid-cols-2 gap-3"><Field label="源区域"><select value={policy.sourceZone} onChange={e => updatePolicy(pIndex, { sourceZone: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="">Any</option>{config.zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}</select></Field><Field label="目的区域"><select value={policy.destinationZone} onChange={e => updatePolicy(pIndex, { destinationZone: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"><option value="">Any</option>{config.zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}</select></Field></div>
                                    
                                    <AddressServiceSelector label="源地址" type={policy.sourceAddressType} value={policy.sourceAddressValue} onUpdate={updates => updatePolicy(pIndex, { sourceAddressType: updates.type, sourceAddressValue: updates.value })} groupOptions={objectGroups.addressGroups} />
                                    <AddressServiceSelector label="目的地址" type={policy.destinationAddressType} value={policy.destinationAddressValue} onUpdate={updates => updatePolicy(pIndex, { destinationAddressType: updates.type, destinationAddressValue: updates.value })} groupOptions={objectGroups.addressGroups} />
                                    <AddressServiceSelector label="服务" type={policy.serviceType} value={policy.serviceValue} onUpdate={updates => updatePolicy(pIndex, { serviceType: updates.type, serviceValue: updates.value })} groupOptions={objectGroups.serviceGroups} />
                                    
                                    <Field label="生效时间段">
                                        <select
                                            value={policy.timeRange || ''}
                                            onChange={e => {
                                                if (e.target.value === '__manage__') {
                                                    setIsTimeRangeManagerOpen(true);
                                                    setTimeout(() => {
                                                        const selectElement = e.target as HTMLSelectElement;
                                                        selectElement.value = policy.timeRange || '';
                                                    }, 0);
                                                } else {
                                                    updatePolicy(pIndex, { timeRange: e.target.value || undefined });
                                                }
                                            }}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                        >
                                            <option value="">无</option>
                                            {timeRanges.map(tr => <option key={tr.id} value={tr.name}>{tr.name}</option>)}
                                            <option value="__manage__" className="italic text-blue-400 font-semibold">管理时间段...</option>
                                        </select>
                                    </Field>

                                    <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50"><label className="flex items-center gap-2"><input type="checkbox" checked={policy.logging} onChange={(e) => updatePolicy(pIndex, { logging: e.target.checked })} className="rounded"/> <span className="text-xs">记录日志</span></label><label className="flex items-center gap-2"><input type="checkbox" checked={policy.counting} onChange={(e) => updatePolicy(pIndex, { counting: e.target.checked })} className="rounded"/> <span className="text-xs">启用统计</span></label></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {isTimeRangeManagerOpen && (
                <TimeRangeManagerModal
                    timeRanges={timeRanges}
                    selectedNode={selectedNode}
                    onNodeUpdate={onNodeUpdate}
                    onClose={() => setIsTimeRangeManagerOpen(false)}
                />
            )}
        </div>
    );
};

export default SecurityPolicyConfig;
