import React, { useState, useCallback, useMemo } from 'react';
import { Node, GRETunnel, Vendor, DeviceType } from '../../types';
import { SpinnerIcon } from '../Icons';

// Reusable components from another file, but I'll define them here for simplicity.
const Field = ({ label, children, note }: { label: string, children: React.ReactNode, note?: string }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
        {children}
        {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
);
const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
        <input type="checkbox" {...props} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"/>
        {label}
    </label>
);


interface GREVPNConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const GREVPNConfig: React.FC<GREVPNConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.gre;
    const vendor = selectedNode.vendor;
    const [expandedTunnels, setExpandedTunnels] = useState<Set<string>>(new Set());

    const toggleTunnelExpansion = (id: string) => {
        setExpandedTunnels(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    
    const updateGREConfig = useCallback((updates: Partial<Node['config']['gre']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, gre: { ...config, ...updates } } });
    }, [selectedNode, config, onNodeUpdate]);

    const addTunnel = () => {
        const newTunnel: GRETunnel = {
            id: `gre-${Date.now()}`,
            tunnelNumber: `${config.tunnels.length}`,
            sourceType: 'address',
            sourceValue: '',
            destinationAddress: '',
            keepalive: { enabled: false },
        };
        updateGREConfig({ tunnels: [...config.tunnels, newTunnel] });
        toggleTunnelExpansion(newTunnel.id);
    };

    const updateTunnel = (index: number, updates: Partial<GRETunnel>) => {
        const newTunnels = [...config.tunnels];
        const oldTunnel = newTunnels[index];
        const updatedTunnel = { ...oldTunnel, ...updates };

        // Reset fields when source type changes
        if ('sourceType' in updates && updates.sourceType !== oldTunnel.sourceType) {
            updatedTunnel.sourceValue = '';
        }

        newTunnels[index] = updatedTunnel;
        updateGREConfig({ tunnels: newTunnels });
    };

    const removeTunnel = (index: number) => {
        updateGREConfig({ tunnels: config.tunnels.filter((_, i) => i !== index) });
    };

    const isApplicable = selectedNode.type === DeviceType.Router || selectedNode.type === DeviceType.Firewall;

    const availableInterfaces = useMemo(() => {
        const physical = selectedNode.ports.map(p => p.name);
        const vlan = selectedNode.config.vlan.vlanInterfaces.map(v => `Vlan-interface${v.vlanId}`); // Simplified
        return [...physical, ...vlan];
    }, [selectedNode]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">GRE VPN</h4></div>
                {isApplicable && <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    <div className="flex justify-end"><button onClick={addTunnel} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加Tunnel接口</button></div>
                    {config.tunnels.map((tunnel, index) => (
                        <div key={tunnel.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleTunnelExpansion(tunnel.id)}>
                                <div className="flex items-center gap-2">
                                    <span className={`transition-transform text-slate-400 ${expandedTunnels.has(tunnel.id) ? 'rotate-90' : ''}`}>▶</span>
                                    <h5 className="text-sm font-medium text-slate-300">Tunnel {tunnel.tunnelNumber}</h5>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeTunnel(index); }} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                            </div>
                             {expandedTunnels.has(tunnel.id) && (
                                <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Tunnel接口号"><Input value={tunnel.tunnelNumber} onChange={e => updateTunnel(index, { tunnelNumber: e.target.value })}/></Field>
                                        <Field label="描述"><Input value={tunnel.description || ''} onChange={e => updateTunnel(index, { description: e.target.value })} /></Field>
                                        <Field label="IP地址"><Input value={tunnel.ipAddress || ''} onChange={e => updateTunnel(index, { ipAddress: e.target.value })} placeholder="e.g., 10.1.1.1"/></Field>
                                        <Field label="掩码"><Input value={tunnel.mask || ''} onChange={e => updateTunnel(index, { mask: e.target.value })} placeholder="e.g., 255.255.255.252"/></Field>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="源类型"><Select value={tunnel.sourceType} onChange={e => updateTunnel(index, { sourceType: e.target.value as any})}><option value="address">IP地址</option><option value="interface">接口</option></Select></Field>
                                        <Field label="源值">
                                            {tunnel.sourceType === 'address' ? 
                                            <Input value={tunnel.sourceValue} onChange={e => updateTunnel(index, { sourceValue: e.target.value })} placeholder="源IP地址"/> :
                                            <Select value={tunnel.sourceValue} onChange={e => updateTunnel(index, { sourceValue: e.target.value })}><option value="">--选择接口--</option>{availableInterfaces.map(i => <option key={i} value={i}>{i}</option>)}</Select>
                                            }
                                        </Field>
                                    </div>
                                     <Field label="目的地址"><Input value={tunnel.destinationAddress} onChange={e => updateTunnel(index, { destinationAddress: e.target.value })} placeholder="对端公网IP"/></Field>
                                     <div className="pt-2 border-t border-slate-600/50 space-y-3">
                                         <h6 className="text-xs font-semibold text-slate-300">可选配置</h6>
                                         <div className="grid grid-cols-2 gap-3">
                                            <Field label="MTU"><Input value={tunnel.mtu || ''} onChange={e => updateTunnel(index, { mtu: e.target.value })} placeholder="e.g., 1400"/></Field>
                                            <Field label="GRE Key"><Input value={tunnel.greKey || ''} onChange={e => updateTunnel(index, { greKey: e.target.value })} /></Field>
                                         </div>
                                         <div className="flex gap-4">
                                            {vendor === Vendor.H3C && <Checkbox label="启用校验和 (Checksum)" checked={!!tunnel.greChecksum} onChange={e => updateTunnel(index, { greChecksum: e.target.checked })}/>}
                                            {vendor === Vendor.H3C && <Checkbox label="设置不分片 (DF Bit)" checked={!!tunnel.dfBitEnable} onChange={e => updateTunnel(index, { dfBitEnable: e.target.checked })}/>}
                                         </div>
                                         <div className="space-y-2">
                                            <Checkbox label="启用Keepalive" checked={tunnel.keepalive.enabled} onChange={e => updateTunnel(index, { keepalive: {...tunnel.keepalive, enabled: e.target.checked} })} />
                                            {tunnel.keepalive.enabled && (
                                                <div className="grid grid-cols-2 gap-3 pl-6">
                                                    <Field label="周期 (秒)"><Input value={tunnel.keepalive.period || ''} onChange={e => updateTunnel(index, { keepalive: {...tunnel.keepalive, period: e.target.value} })} placeholder="e.g., 5"/></Field>
                                                    <Field label="重试次数"><Input value={tunnel.keepalive.retryTimes || ''} onChange={e => updateTunnel(index, { keepalive: {...tunnel.keepalive, retryTimes: e.target.value} })} placeholder="e.g., 3"/></Field>
                                                </div>
                                            )}
                                         </div>
                                         {vendor === Vendor.Huawei && selectedNode.type === DeviceType.Firewall &&
                                            <Field label="加入安全域">
                                                <Select value={tunnel.securityZone || ''} onChange={e => updateTunnel(index, { securityZone: e.target.value })}>
                                                    <option value="">--不加入--</option>
                                                    {selectedNode.config.security.zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                                                </Select>
                                            </Field>
                                         }
                                     </div>
                                </div>
                             )}
                        </div>
                    ))}
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">{isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}</pre>
                    </div>
                </div>
            )}
            {isExpanded && !isApplicable && (<div className="border-t border-slate-600 p-3"><p className="text-xs text-slate-500 italic">GRE VPN is only available for Routers and Firewalls.</p></div>)}
        </div>
    );
};
export default GREVPNConfig;