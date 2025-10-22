
import React, { useCallback, useState, useMemo } from 'react';
import { Node, DeviceType, Vendor, DHCPRelayInterface } from '../../types';
import { SpinnerIcon } from '../Icons';

interface DHCPRelayConfigProps {
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

const DHCPRelayConfig: React.FC<DHCPRelayConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const config = selectedNode.config.dhcpRelay;
    const vendor = selectedNode.vendor;

    const isApplicable = (selectedNode.type === DeviceType.Router || selectedNode.type === DeviceType.L3Switch || selectedNode.type === DeviceType.Firewall);

    const updateRelayConfig = useCallback((updates: Partial<Node['config']['dhcpRelay']>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, dhcpRelay: { ...config, ...updates } } });
    }, [selectedNode, config, onNodeUpdate]);

    const updateHuaweiConfig = useCallback((updates: Partial<Node['config']['dhcpRelay']['huawei']>) => {
        updateRelayConfig({ huawei: { ...config.huawei, ...updates } });
    }, [config.huawei, updateRelayConfig]);

    const addInterface = () => {
        const newInterface: DHCPRelayInterface = {
            id: `relay-iface-${Date.now()}`,
            interfaceName: '',
            serverAddresses: [{ id: `srv-${Date.now()}`, ip: '' }],
            option82: {
                enabled: false,
                strategy: 'replace',
                circuitIdFormat: 'normal',
                circuitIdFormatType: 'hex',
                remoteIdFormat: 'normal',
                remoteIdFormatType: 'hex',
            },
            huaweiOptions: {
                option82: {
                    information: { enabled: false, strategy: 'replace' },
                    insert: { vssControl: false, linkSelection: false, serverIdOverride: false },
                }
            }
        };
        updateRelayConfig({ interfaces: [...config.interfaces, newInterface] });
    };

    const updateInterface = (index: number, updates: Partial<DHCPRelayInterface>) => {
        const newInterfaces = [...config.interfaces];
        newInterfaces[index] = { ...newInterfaces[index], ...updates };
        updateRelayConfig({ interfaces: newInterfaces });
    };

    const removeInterface = (index: number) => {
        updateRelayConfig({ interfaces: config.interfaces.filter((_, i) => i !== index) });
    };
    
    const availableL3Interfaces = useMemo(() => {
        const vlanIfaces = selectedNode.config.vlan.vlanInterfaces
            .filter(vlan => vlan.vlanId && vlan.ipAddress)
            .map(vlan => {
                 if (vendor === Vendor.Huawei) return `Vlanif${vlan.vlanId}`;
                 if (vendor === Vendor.H3C) return `Vlan-interface${vlan.vlanId}`;
                 return `Vlan${vlan.vlanId}`;
            });
        
        const physicalIfaces = selectedNode.config.interfaceIP.interfaces
            .filter(iface => iface.interfaceName && iface.ipAddress)
            .map(iface => iface.interfaceName);
        
        return [...vlanIfaces, ...physicalIfaces];
    }, [selectedNode.config.vlan.vlanInterfaces, selectedNode.config.interfaceIP.interfaces, vendor]);

    const configuredInterfaces = useMemo(() => new Set(config.interfaces.map(i => i.interfaceName)), [config.interfaces]);

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">DHCP 中继 (DHCP Relay)</h4>
                </div>
                {isApplicable && <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                     {vendor === Vendor.H3C && (
                         <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                            <h5 className="text-sm font-medium text-slate-300">全局安全配置 (H3C)</h5>
                            <div className="grid grid-cols-2 gap-4">
                                <Checkbox label="记录用户地址表项" checked={config.security.clientInfoRecording} onChange={e => updateRelayConfig({ security: { ...config.security, clientInfoRecording: e.target.checked }})} />
                                <Checkbox label="启用MAC地址检查" checked={config.security.macCheck} onChange={e => updateRelayConfig({ security: { ...config.security, macCheck: e.target.checked }})} />
                            </div>
                            {config.security.macCheck && <Field label="MAC检查老化时间(秒)" note="默认300"><Input type="number" value={config.security.macCheckAgingTime} onChange={e => updateRelayConfig({ security: { ...config.security, macCheckAgingTime: e.target.value }})} /></Field>}
                            <div className="pt-2 border-t border-slate-700/50">
                                <Checkbox label="动态表项定时刷新" checked={config.security.clientInfoRefresh} onChange={e => updateRelayConfig({ security: { ...config.security, clientInfoRefresh: e.target.checked }})} />
                                {config.security.clientInfoRefresh && (
                                    <div className="pl-6 grid grid-cols-2 gap-3 mt-2">
                                        <Field label="刷新模式">
                                            <Select value={config.security.clientInfoRefreshType} onChange={e => updateRelayConfig({ security: { ...config.security, clientInfoRefreshType: e.target.value as any }})}>
                                                <option value="auto">自动 (auto)</option>
                                                <option value="interval">固定间隔 (interval)</option>
                                            </Select>
                                        </Field>
                                        {config.security.clientInfoRefreshType === 'interval' && <Field label="刷新间隔(秒)"><Input type="number" value={config.security.clientInfoRefreshInterval} onChange={e => updateRelayConfig({ security: { ...config.security, clientInfoRefreshInterval: e.target.value }})} /></Field>}
                                    </div>
                                )}
                            </div>
                             <div className="pt-2 border-t border-slate-700/50">
                                <Field label="DSCP优先级" note="0-63, 默认56"><Input type="number" min="0" max="63" value={config.dscp} onChange={e => updateRelayConfig({ dscp: e.target.value })} /></Field>
                             </div>
                        </div>
                     )}

                    {vendor === Vendor.Huawei && (
                        <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                            <h5 className="text-sm font-medium text-slate-300">全局配置 (Huawei)</h5>
                            <Checkbox label="检查DHCP REQUEST报文中的服务器标识符" checked={config.huawei?.serverMatchCheck ?? true} onChange={e => updateHuaweiConfig({ serverMatchCheck: e.target.checked })} />
                            <Checkbox label="转发所有DHCP ACK报文" checked={config.huawei?.replyForwardAll ?? false} onChange={e => updateHuaweiConfig({ replyForwardAll: e.target.checked })} />
                            <Checkbox label="信任携带Option82的报文 (默认开启)" checked={config.huawei?.trustOption82 ?? true} onChange={e => updateHuaweiConfig({ trustOption82: e.target.checked })} />
                        </div>
                    )}


                    <div className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-sm font-medium text-slate-300">中继接口</label><button onClick={addInterface} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">添加接口</button></div>
                         {config.interfaces.map((iface, ifaceIndex) => (
                             <div key={iface.id} className="bg-slate-800/50 p-3 rounded space-y-3">
                                <div className="flex justify-between items-center">
                                    <Field label="接口">
                                        <Select value={iface.interfaceName} onChange={e => updateInterface(ifaceIndex, { interfaceName: e.target.value })}>
                                            <option value="">--选择接口--</option>
                                            {availableL3Interfaces.map(name => <option key={name} value={name} disabled={configuredInterfaces.has(name) && name !== iface.interfaceName}>{name}</option>)}
                                        </Select>
                                    </Field>
                                    <button onClick={() => removeInterface(ifaceIndex)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded self-end mb-1">删除</button>
                                </div>
                                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                    <label className="text-xs font-medium text-slate-400">DHCP服务器地址</label>
                                    {iface.serverAddresses.map((server, srvIndex) => (
                                         <div key={server.id} className="flex items-center gap-2">
                                            <Input value={server.ip} onChange={e => {
                                                const newServers = [...iface.serverAddresses]; newServers[srvIndex].ip = e.target.value;
                                                updateInterface(ifaceIndex, { serverAddresses: newServers });
                                            }} placeholder="e.g., 10.1.1.2" />
                                            {vendor === Vendor.Huawei && <Input value={server.vpnInstance || ''} onChange={e => {
                                                const newServers = [...iface.serverAddresses]; newServers[srvIndex].vpnInstance = e.target.value;
                                                updateInterface(ifaceIndex, { serverAddresses: newServers });
                                            }} placeholder="VPN Instance (可选)" />}
                                            <button onClick={() => updateInterface(ifaceIndex, { serverAddresses: iface.serverAddresses.filter((_, i) => i !== srvIndex)})} className="px-2 py-1.5 bg-red-600/80 text-white text-xs rounded">-</button>
                                        </div>
                                    ))}
                                     <button onClick={() => updateInterface(ifaceIndex, { serverAddresses: [...iface.serverAddresses, {id: `srv-${Date.now()}`, ip: ''}]})} className="w-full text-xs py-1 bg-blue-600/80 rounded">+</button>
                                </div>
                                {vendor === Vendor.Huawei && (
                                     <div className="pt-2 border-t border-slate-700/50 space-y-3">
                                         <Field label="代理源地址 (可选)"><Input value={iface.huaweiOptions?.sourceIpAddress || ''} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, sourceIpAddress: e.target.value }})} /></Field>
                                         <Field label="网关地址 (可选)"><Input value={iface.huaweiOptions?.gateway || ''} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, gateway: e.target.value }})} /></Field>
                                         <div className="pt-2 border-t border-slate-700/50">
                                            <h6 className="text-xs font-medium text-slate-400 mb-2">Option 82 配置</h6>
                                            <Checkbox label="在接口上使能Option82处理" checked={iface.huaweiOptions?.option82.information.enabled || false} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, option82: { ...iface.huaweiOptions?.option82, information: { ...iface.huaweiOptions?.option82.information, enabled: e.target.checked } } } })} />
                                            {iface.huaweiOptions?.option82.information.enabled && (
                                                <div className="pl-6 mt-2">
                                                    <Field label="处理策略"><Select value={iface.huaweiOptions.option82.information.strategy} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, option82: { ...iface.huaweiOptions?.option82, information: { ...iface.huaweiOptions?.option82.information, strategy: e.target.value as any } } } })}><option value="replace">替换(replace)</option><option value="keep">保留(keep)</option><option value="drop">丢弃(drop)</option></Select></Field>
                                                </div>
                                            )}
                                            <div className="mt-3 pl-6 space-y-2">
                                                <p className="text-xs text-slate-400">跨VPN场景插入选项:</p>
                                                <Checkbox label="VSS Control" checked={iface.huaweiOptions?.option82.insert.vssControl || false} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, option82: { ...iface.huaweiOptions?.option82, insert: { ...iface.huaweiOptions?.option82.insert, vssControl: e.target.checked } } } })} />
                                                <Checkbox label="Link Selection" checked={iface.huaweiOptions?.option82.insert.linkSelection || false} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, option82: { ...iface.huaweiOptions?.option82, insert: { ...iface.huaweiOptions?.option82.insert, linkSelection: e.target.checked } } } })} />
                                                <Checkbox label="Server ID Override" checked={iface.huaweiOptions?.option82.insert.serverIdOverride || false} onChange={e => updateInterface(ifaceIndex, { huaweiOptions: { ...iface.huaweiOptions, option82: { ...iface.huaweiOptions?.option82, insert: { ...iface.huaweiOptions?.option82.insert, serverIdOverride: e.target.checked } } } })} />
                                            </div>
                                         </div>
                                     </div>
                                )}
                                {vendor === Vendor.H3C && (
                                    <div className="pt-2 border-t border-slate-700/50">
                                        <Checkbox label="启用 Option 82" checked={iface.option82.enabled} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, enabled: e.target.checked }})} />
                                        {iface.option82.enabled && (
                                            <div className="pl-6 mt-2 space-y-3">
                                                <Field label="处理策略">
                                                    <Select value={iface.option82.strategy} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, strategy: e.target.value as any }})}>
                                                        <option value="replace">替换 (replace)</option>
                                                        <option value="keep">保留 (keep)</option>
                                                        <option value="drop">丢弃 (drop)</option>
                                                    </Select>
                                                </Field>
                                                
                                                {/* Circuit ID */}
                                                <div className="p-2 bg-slate-900/50 rounded-md space-y-2">
                                                    <h6 className="text-xs font-semibold text-slate-300">Circuit ID</h6>
                                                    <Field label="填充模式">
                                                        <Select value={iface.option82.circuitIdFormat} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, circuitIdFormat: e.target.value as any }})}>
                                                            <option value="normal">Normal</option>
                                                            <option value="verbose">Verbose</option>
                                                            <option value="string">自定义字符串 (String)</option>
                                                        </Select>
                                                    </Field>
                                                    {iface.option82.circuitIdFormat === 'string' && (
                                                        <Field label="自定义 Circuit ID"><Input value={iface.option82.circuitIdString || ''} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, circuitIdString: e.target.value }})} /></Field>
                                                    )}
                                                    {iface.option82.circuitIdFormat === 'verbose' && (
                                                        <>
                                                            <Field label="节点标识符">
                                                                <Select value={iface.option82.circuitIdVerboseNodeIdentifier} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, circuitIdVerboseNodeIdentifier: e.target.value as any }})}>
                                                                    <option value="sysname">系统名称 (sysname)</option>
                                                                    <option value="mac">MAC地址 (mac)</option>
                                                                    <option value="user-defined">自定义 (user-defined)</option>
                                                                </Select>
                                                            </Field>
                                                            {iface.option82.circuitIdVerboseNodeIdentifier === 'user-defined' && (
                                                                <Field label="自定义节点标识符"><Input value={iface.option82.circuitIdVerboseNodeIdentifierString || ''} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, circuitIdVerboseNodeIdentifierString: e.target.value }})} /></Field>
                                                            )}
                                                        </>
                                                    )}
                                                    {(iface.option82.circuitIdFormat === 'normal' || iface.option82.circuitIdFormat === 'verbose') && (
                                                        <Field label="填充格式">
                                                            <Select value={iface.option82.circuitIdFormatType} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, circuitIdFormatType: e.target.value as any }})}>
                                                                <option value="hex">十六进制 (hex)</option>
                                                                <option value="ascii">ASCII</option>
                                                            </Select>
                                                        </Field>
                                                    )}
                                                </div>

                                                {/* Remote ID */}
                                                <div className="p-2 bg-slate-900/50 rounded-md space-y-2">
                                                    <h6 className="text-xs font-semibold text-slate-300">Remote ID</h6>
                                                    <Field label="填充模式">
                                                        <Select value={iface.option82.remoteIdFormat} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, remoteIdFormat: e.target.value as any }})}>
                                                            <option value="normal">Normal</option>
                                                            <option value="sysname">系统名称 (sysname)</option>
                                                            <option value="string">自定义字符串 (String)</option>
                                                        </Select>
                                                    </Field>
                                                    {iface.option82.remoteIdFormat === 'string' && (
                                                        <Field label="自定义 Remote ID"><Input value={iface.option82.remoteIdString || ''} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, remoteIdString: e.target.value }})} /></Field>
                                                    )}
                                                    {iface.option82.remoteIdFormat === 'normal' && (
                                                        <Field label="填充格式">
                                                            <Select value={iface.option82.remoteIdFormatType} onChange={e => updateInterface(ifaceIndex, { option82: { ...iface.option82, remoteIdFormatType: e.target.value as any }})}>
                                                                <option value="hex">十六进制 (hex)</option>
                                                                <option value="ascii">ASCII</option>
                                                            </Select>
                                                        </Field>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
             {isExpanded && !isApplicable && (
                <div className="border-t border-slate-600 p-3">
                    <p className="text-xs text-slate-500 italic">DHCP Relay is only available for L3 devices.</p>
                </div>
            )}
        </div>
    );
};

export default DHCPRelayConfig;
