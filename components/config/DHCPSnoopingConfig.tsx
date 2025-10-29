

import React, { useCallback, useMemo } from 'react';
import { Node, DeviceType, Vendor, DHCPSnoopingInterfaceConfig, HuaweiDHCPSnoopingTrustedInterface } from '../../types';
import { SpinnerIcon } from '../Icons';

interface DHCPSnoopingConfigProps {
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

const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
        <input type="checkbox" {...props} className="form-checkbox h-4 w-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"/>
        {label}
    </label>
);

const DHCPSnoopingConfig: React.FC<DHCPSnoopingConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const config = selectedNode.config.dhcpSnooping;
    const vendor = selectedNode.vendor;

    const isApplicable = (selectedNode.type === DeviceType.L2Switch || selectedNode.type === DeviceType.L3Switch);

    const updateSnoopingConfig = useCallback((updates: Partial<Node['config']['dhcpSnooping']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, dhcpSnooping: { ...config, ...updates } } });
    }, [selectedNode, config, onNodeUpdate]);

    // H3C Specific Callbacks
    const addH3CInterface = () => {
        const newInterface: DHCPSnoopingInterfaceConfig = { id: `snoop-iface-${Date.now()}`, interfaceName: '', trust: false, bindingRecord: false };
        updateSnoopingConfig({ interfaces: [...config.interfaces, newInterface] });
    };
    const updateH3CInterface = (index: number, updates: Partial<DHCPSnoopingInterfaceConfig>) => {
        const newInterfaces = [...config.interfaces];
        newInterfaces[index] = { ...newInterfaces[index], ...updates };
        updateSnoopingConfig({ interfaces: newInterfaces });
    };
    const removeH3CInterface = (index: number) => {
        updateSnoopingConfig({ interfaces: config.interfaces.filter((_, i) => i !== index) });
    };

    // Huawei Specific Callbacks
    const updateHuaweiConfig = useCallback((updates: Partial<Node['config']['dhcpSnooping']['huawei']>) => {
        updateSnoopingConfig({ huawei: { ...config.huawei, ...updates } });
    }, [config.huawei, updateSnoopingConfig]);
    
    const addHuaweiTrustedInterface = () => {
        const newTrustedInterface: HuaweiDHCPSnoopingTrustedInterface = { id: `snoop-trust-${Date.now()}`, name: '' };
        updateHuaweiConfig({ trustedInterfaces: [...config.huawei.trustedInterfaces, newTrustedInterface] });
    };

    const updateHuaweiTrustedInterface = (index: number, updates: Partial<HuaweiDHCPSnoopingTrustedInterface>) => {
        const newInterfaces = [...config.huawei.trustedInterfaces];
        newInterfaces[index] = { ...newInterfaces[index], ...updates };
        updateHuaweiConfig({ trustedInterfaces: newInterfaces });
    };
    
    const removeHuaweiTrustedInterface = (index: number) => {
        updateHuaweiConfig({ trustedInterfaces: config.huawei.trustedInterfaces.filter((_, i) => i !== index) });
    };
    
    const availableInterfaces = useMemo(() => 
        selectedNode.ports
            .filter(p => p.status === 'connected')
            .map(p => p.name),
    [selectedNode.ports]);
    
    const h3cConfiguredInterfaces = useMemo(() => new Set(config.interfaces.map(i => i.interfaceName)), [config.interfaces]);
    const huaweiConfiguredInterfaces = useMemo(() => new Set(config.huawei.trustedInterfaces.map(i => i.name)), [config.huawei.trustedInterfaces]);

    const renderH3C = () => (
        <>
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">表项备份功能</h5>
                <Checkbox
                    label="启用 DHCP Snooping 表项备份"
                    checked={config.h3c?.bindingDatabase?.enabled ?? false}
                    onChange={e => updateSnoopingConfig({ h3c: { ...config.h3c!, bindingDatabase: { ...config.h3c?.bindingDatabase!, enabled: e.target.checked } } })}
                />
                {config.h3c?.bindingDatabase?.enabled && (
                    <div className="pl-6 space-y-3">
                        <Field label="备份文件名">
                            <Input
                                value={config.h3c.bindingDatabase.filename}
                                onChange={e => updateSnoopingConfig({ h3c: { ...config.h3c!, bindingDatabase: { ...config.h3c!.bindingDatabase, filename: e.target.value } } })}
                                placeholder="e.g., flash:/snooping.db"
                            />
                        </Field>
                        <Field label="刷新间隔 (秒)" note="默认300秒。表项无变化则不刷新。">
                            <Input
                                type="number"
                                value={config.h3c.bindingDatabase.updateInterval}
                                onChange={e => updateSnoopingConfig({ h3c: { ...config.h3c!, bindingDatabase: { ...config.h3c!.bindingDatabase, updateInterval: e.target.value } } })}
                            />
                        </Field>
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-700">
                <h5 className="text-sm font-medium text-slate-300">接口配置</h5>
                <button onClick={addH3CInterface} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded">添加接口</button>
            </div>
            {config.interfaces.map((iface, index) => (
                <div key={iface.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                    <div className="flex justify-between items-center">
                        <Field label="接口">
                            <select value={iface.interfaceName} onChange={e => updateH3CInterface(index, { interfaceName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                <option value="">--选择接口--</option>
                                {availableInterfaces.map(name => ( <option key={name} value={name} disabled={h3cConfiguredInterfaces.has(name) && name !== iface.interfaceName}>{name}</option>))}
                            </select>
                        </Field>
                        <button onClick={() => removeH3CInterface(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded self-end mb-1">删除</button>
                    </div>
                    <div className="pt-2 border-t border-slate-700/50 space-y-2">
                        <Checkbox label="信任端口 (Trust)" checked={iface.trust} onChange={e => updateH3CInterface(index, { trust: e.target.checked })} />
                        <Checkbox label="记录绑定表项 (Binding Record)" checked={iface.bindingRecord} onChange={e => updateH3CInterface(index, { bindingRecord: e.target.checked })} />
                        <p className="text-xs text-slate-500 pl-6">
                            - 信任端口通常是连接合法DHCP服务器的端口。<br/>
                            - 记录绑定表项通常在连接客户端的端口上启用。
                        </p>
                    </div>
                </div>
            ))}
        </>
    );

    const renderHuawei = () => (
        <>
            <div className="p-3 bg-slate-800/50 rounded-lg">
                <Field label="在VLAN中使能Snooping">
                    <input type="text" placeholder="e.g., 10,20,30-40" value={config.huawei.enabledOnVlans} onChange={(e) => updateHuaweiConfig({ enabledOnVlans: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"/>
                    <p className="text-xs text-slate-500 mt-1">指定在哪些VLAN中开启Snooping功能。</p>
                </Field>
            </div>
             <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">绑定表自动备份</h5>
                <Checkbox
                    label="启用绑定表自动备份"
                    checked={config.huawei.userBindAutosave?.enabled ?? false}
                    onChange={e => updateHuaweiConfig({ userBindAutosave: { ...config.huawei.userBindAutosave, enabled: e.target.checked } })}
                />
                {config.huawei.userBindAutosave?.enabled && (
                    <div className="pl-6 space-y-3">
                        <Field label="备份文件名" note="必须为 flash:/*.tbl 格式">
                            <Input
                                value={config.huawei.userBindAutosave.filename}
                                onChange={e => updateHuaweiConfig({ userBindAutosave: { ...config.huawei.userBindAutosave, filename: e.target.value } })}
                                placeholder="e.g., flash:/snooping.tbl"
                            />
                        </Field>
                        <Field label="备份周期 (秒)" note="默认3600秒。">
                            <Input
                                type="number"
                                value={config.huawei.userBindAutosave.writeDelay}
                                onChange={e => updateHuaweiConfig({ userBindAutosave: { ...config.huawei.userBindAutosave, writeDelay: e.target.value } })}
                            />
                        </Field>
                    </div>
                )}
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300">信任接口配置</label>
                    <button onClick={addHuaweiTrustedInterface} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加信任接口</button>
                </div>
                {config.huawei.trustedInterfaces.map((iface, index) => (
                    <div key={iface.id} className="flex items-center gap-2">
                        <select value={iface.name} onChange={e => updateHuaweiTrustedInterface(index, { name: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                            <option value="">--选择接口--</option>
                            {availableInterfaces.map(name => ( <option key={name} value={name} disabled={huaweiConfiguredInterfaces.has(name) && name !== iface.name}>{name}</option>))}
                        </select>
                        <button onClick={() => removeHuaweiTrustedInterface(index)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded">删除</button>
                    </div>
                ))}
            </div>
        </>
    );

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">DHCP Snooping</h4>
                </div>
                {isApplicable && <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    {vendor === Vendor.H3C && renderH3C()}
                    {vendor === Vendor.Huawei && renderHuawei()}

                     <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                            {isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}
                        </pre>
                    </div>
                </div>
            )}
            {isExpanded && !isApplicable && (
                 <div className="border-t border-slate-600 p-3">
                    <p className="text-xs text-slate-500 italic">DHCP Snooping configuration is currently supported for H3C and Huawei Switches.</p>
                </div>
            )}
        </div>
    );
};

export default DHCPSnoopingConfig;