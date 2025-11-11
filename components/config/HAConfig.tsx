import React, { useCallback, useMemo } from 'react';
import { Node, DeviceType, Vendor, HATrackItem, HuaweiHAConfig } from '../../types';
import { SpinnerIcon } from '../Icons.tsx';

interface HAConfigProps {
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

const HAConfig: React.FC<HAConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    
    const updateHAConfig = useCallback((updates: Partial<Node['config']['ha']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                ha: { ...selectedNode.config.ha, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const updateHuaweiHAConfig = useCallback((updates: Partial<HuaweiHAConfig>) => {
        const currentHuaweiConfig = selectedNode.config.ha.huawei;
        updateHAConfig({ huawei: { ...currentHuaweiConfig, ...updates } });
    }, [selectedNode.config.ha.huawei, updateHAConfig]);
    
    const handleUpdateMonitoring = useCallback((updates: Partial<Node['config']['ha']['monitoring']>) => {
        updateHAConfig({ monitoring: { ...selectedNode.config.ha.monitoring, ...updates } });
    }, [selectedNode.config.ha.monitoring, updateHAConfig]);

    const handleAddTrackItem = useCallback(() => {
        const newTrackItem: HATrackItem = { key: `track-${Date.now()}`, id: '', type: 'interface', value: '' };
        const newItems = [...selectedNode.config.ha.monitoring.trackItems, newTrackItem];
        handleUpdateMonitoring({ trackItems: newItems });
    }, [selectedNode.config.ha.monitoring.trackItems, handleUpdateMonitoring]);

    const handleUpdateTrackItem = useCallback((index: number, updates: Partial<HATrackItem>) => {
        const newItems = [...selectedNode.config.ha.monitoring.trackItems];
        newItems[index] = { ...newItems[index], ...updates };
        handleUpdateMonitoring({ trackItems: newItems });
    }, [selectedNode.config.ha.monitoring.trackItems, handleUpdateMonitoring]);

    const handleRemoveTrackItem = useCallback((index: number) => {
        const newItems = selectedNode.config.ha.monitoring.trackItems.filter((_, i) => i !== index);
        handleUpdateMonitoring({ trackItems: newItems });
    }, [selectedNode.config.ha.monitoring.trackItems, handleUpdateMonitoring]);

    const config = selectedNode.config.ha;
    const huaweiConfig = config.huawei;
    const isHuawei = selectedNode.vendor === Vendor.Huawei;
    const isH3C = selectedNode.vendor === Vendor.H3C;
    const isApplicable = selectedNode.type === DeviceType.Firewall && (isHuawei || isH3C);
    
    const availableInterfaces = useMemo(() => {
        if (!selectedNode) return [];
        const physicalInterfaces = selectedNode.ports.map(p => p.name);
        const aggIfaces: string[] = [];
        const linkAgg = selectedNode.config.linkAggregation;
        if (linkAgg.enabled) {
            (linkAgg.groups || []).forEach(g => {
                const gid = g.groupId;
                if (!gid) return;
                if (selectedNode.vendor === Vendor.Huawei) aggIfaces.push(`Eth-Trunk${gid}`);
                else if (selectedNode.vendor === Vendor.H3C) aggIfaces.push(`Bridge-Aggregation${gid}`);
                else if (selectedNode.vendor === Vendor.Cisco) aggIfaces.push(`Port-channel${gid}`);
            });
        }
        return [...aggIfaces, ...physicalInterfaces];
    }, [selectedNode.ports, selectedNode.config.linkAggregation, selectedNode.vendor]);

    const renderH3CConfig = () => (
        <>
            {/* Role & Mode */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">角色与模式</h5>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="设备管理角色"><Select value={config.deviceRole} onChange={e => updateHAConfig({ deviceRole: e.target.value as any })}><option value="primary">主管理设备 (primary)</option><option value="secondary">从管理设备 (secondary)</option></Select></Field>
                    <Field label="工作模式"><Select value={config.workMode} onChange={e => updateHAConfig({ workMode: e.target.value as any })}><option value="active-standby">主备模式</option><option value="dual-active">双主模式</option></Select></Field>
                </div>
            </div>

            {/* Channels */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">HA通道</h5>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="本端IP地址"><Input value={config.controlChannel.localIp} onChange={e => updateHAConfig({ controlChannel: { ...config.controlChannel, localIp: e.target.value } })} /></Field>
                    <Field label="对端IP地址"><Input value={config.controlChannel.remoteIp} onChange={e => updateHAConfig({ controlChannel: { ...config.controlChannel, remoteIp: e.target.value } })} /></Field>
                    <Field label="端口" note="默认1026"><Input value={config.controlChannel.port} onChange={e => updateHAConfig({ controlChannel: { ...config.controlChannel, port: e.target.value } })} /></Field>
                    <Field label="数据通道接口">
                        <Select value={config.dataChannelInterface} onChange={e => updateHAConfig({ dataChannelInterface: e.target.value })}>
                            <option value="">不配置</option>
                            {availableInterfaces.map(iface => <option key={iface} value={iface}>{iface}</option>)}
                        </Select>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                     <Field label="Keepalive间隔" note="秒, 默认1"><Input value={config.controlChannel.keepaliveInterval} onChange={e => updateHAConfig({ controlChannel: { ...config.controlChannel, keepaliveInterval: e.target.value } })} /></Field>
                     <Field label="Keepalive次数" note="默认10"><Input value={config.controlChannel.keepaliveCount} onChange={e => updateHAConfig({ controlChannel: { ...config.controlChannel, keepaliveCount: e.target.value } })} /></Field>
                </div>
            </div>
            
            {/* Sync & Failback */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">同步与回切</h5>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Checkbox label="热备业务表项" checked={config.hotBackupEnabled} onChange={e => updateHAConfig({ hotBackupEnabled: e.target.checked })} />
                        <Checkbox label="配置自动备份" checked={config.autoSyncEnabled} onChange={e => updateHAConfig({ autoSyncEnabled: e.target.checked })} />
                        <Checkbox label="配置一致性检查" checked={config.syncCheckEnabled} onChange={e => updateHAConfig({ syncCheckEnabled: e.target.checked })} />
                    </div>
                    <div className="space-y-2">
                        <Checkbox label="启用流量回切" checked={config.failback.enabled} onChange={e => updateHAConfig({ failback: { ...config.failback, enabled: e.target.checked } })} />
                        {config.failback.enabled && <Field label="回切延迟时间 (秒)" note="默认30"><Input value={config.failback.delayTime} onChange={e => updateHAConfig({ failback: { ...config.failback, delayTime: e.target.value } })} /></Field>}
                    </div>
                </div>
            </div>

            {/* Monitoring */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">状态监控</h5>
                <Field label="监控类型">
                    <Select value={config.monitoring.type} onChange={e => handleUpdateMonitoring({ type: e.target.value as any })}>
                        <option value="none">无</option>
                        <option value="track">Track项</option>
                    </Select>
                </Field>
                
                 {config.monitoring.type === 'track' && (
                    <Field label="Track项配置与联动">
                        <div className="space-y-2">
                            {config.monitoring.trackItems.length > 0 && (
                                <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center px-1">
                                    <label className="text-xs font-medium text-slate-400">Track ID</label>
                                    <label className="text-xs font-medium text-slate-400">监控接口</label>
                                    <div className="w-8"></div>
                                </div>
                            )}
                            {config.monitoring.trackItems.map((item, index) => (
                                <div key={item.key} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                                    <Input
                                        value={item.id}
                                        onChange={e => handleUpdateTrackItem(index, { id: e.target.value })}
                                        placeholder="e.g., 1"
                                    />
                                    <Select
                                        value={item.value}
                                        onChange={e => handleUpdateTrackItem(index, { value: e.target.value, type: 'interface' })}
                                    >
                                        <option value="">-- 选择接口 --</option>
                                        {availableInterfaces.map(iface => <option key={iface} value={iface}>{iface}</option>)}
                                    </Select>
                                    <button
                                        onClick={() => handleRemoveTrackItem(index)}
                                        className="px-2 py-1.5 bg-red-600/80 hover:bg-red-700 text-white text-xs rounded h-fit w-8"
                                    >
                                        -
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={handleAddTrackItem}
                                className="w-full text-xs py-1 bg-blue-600/80 hover:bg-blue-700 text-white rounded mt-1"
                            >
                                添加Track项
                            </button>
                        </div>
                    </Field>
                 )}
            </div>
        </>
    );

    const renderHuaweiConfig = () => (
        <>
            {/* Monitoring Items */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                 <h5 className="text-sm font-medium text-slate-300">监控项配置</h5>
                 {/* Simplified monitoring for now */}
                 <Field label="监控接口"><Input placeholder="e.g., GigabitEthernet0/0/1" onChange={(e) => updateHuaweiHAConfig({ monitoringItems: [{ key: '1', type: 'interface', value: e.target.value }] })}/></Field>
            </div>
            {/* Heartbeat Interfaces */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                 <h5 className="text-sm font-medium text-slate-300">心跳接口配置</h5>
                 {/* Simplified for one interface */}
                 <div className="grid grid-cols-2 gap-3">
                    <Field label="心跳接口"><Select value={huaweiConfig.heartbeatInterfaces[0]?.interfaceName || ''} onChange={(e) => updateHuaweiHAConfig({ heartbeatInterfaces: [{...huaweiConfig.heartbeatInterfaces[0], id: '1', interfaceName: e.target.value}] })}><option value="">--选择接口--</option>{availableInterfaces.map(i => <option key={i} value={i}>{i}</option>)}</Select></Field>
                    <Field label="对端心跳IP"><Input value={huaweiConfig.heartbeatInterfaces[0]?.remoteIp || ''} onChange={(e) => updateHuaweiHAConfig({ heartbeatInterfaces: [{...huaweiConfig.heartbeatInterfaces[0], id: '1', remoteIp: e.target.value}] })} /></Field>
                 </div>
                 <Checkbox label="仅作心跳接口 (不传备份报文)" checked={huaweiConfig.heartbeatInterfaces[0]?.heartbeatOnly || false} onChange={e => updateHuaweiHAConfig({ heartbeatInterfaces: [{...huaweiConfig.heartbeatInterfaces[0], id: '1', heartbeatOnly: e.target.checked}] })} />
            </div>
             {/* HRP Packet Settings */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                 <h5 className="text-sm font-medium text-slate-300">HRP报文配置</h5>
                 <Field label="认证密钥"><Input type="password" value={huaweiConfig.authenticationKey} onChange={e => updateHuaweiHAConfig({ authenticationKey: e.target.value })} /></Field>
                 <div className="grid grid-cols-2 gap-3">
                    <Field label="Hello间隔(ms)" note="默认1000"><Input value={huaweiConfig.helloInterval} onChange={e => updateHuaweiHAConfig({ helloInterval: e.target.value })} /></Field>
                    <Field label="IP头优先级" note="0-7, 默认6"><Input type="number" min="0" max="7" value={huaweiConfig.ipPacketPriority} onChange={e => updateHuaweiHAConfig({ ipPacketPriority: e.target.value })} /></Field>
                 </div>
                 <div className="flex gap-4"><Checkbox label="启用合法性校验" checked={huaweiConfig.checksumEnabled} onChange={e => updateHuaweiHAConfig({ checksumEnabled: e.target.checked })} /><Checkbox label="启用报文加密" checked={huaweiConfig.encryptionEnabled} onChange={e => updateHuaweiHAConfig({ encryptionEnabled: e.target.checked })} /></div>
                 <Checkbox label="启用加密密钥刷新" checked={huaweiConfig.encryptionKeyRefreshEnabled} onChange={e => updateHuaweiHAConfig({ encryptionKeyRefreshEnabled: e.target.checked })} />
                 {huaweiConfig.encryptionKeyRefreshEnabled && <Field label="刷新间隔(分钟)" note="默认30"><Input value={huaweiConfig.encryptionKeyRefreshInterval} onChange={e => updateHuaweiHAConfig({ encryptionKeyRefreshInterval: e.target.value })} /></Field>}
            </div>
             {/* Backup Method */}
            <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">备份方式</h5>
                <Checkbox label="状态信息自动备份" checked={huaweiConfig.autoSyncConnectionStatus} onChange={e => updateHuaweiHAConfig({ autoSyncConnectionStatus: e.target.checked })} />
                <Checkbox label="命令自动备份 (除路由外)" checked={huaweiConfig.autoSyncConfig} onChange={e => updateHuaweiHAConfig({ autoSyncConfig: e.target.checked })} />
                <Checkbox label="静态路由自动备份" checked={huaweiConfig.autoSyncStaticRoute} onChange={e => updateHuaweiHAConfig({ autoSyncStaticRoute: e.target.checked })} />
                <Checkbox label="策略路由自动备份" checked={huaweiConfig.autoSyncPolicyBasedRoute} onChange={e => updateHuaweiHAConfig({ autoSyncPolicyBasedRoute: e.target.checked })} />
            </div>
             {/* Preemption */}
             <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                <h5 className="text-sm font-medium text-slate-300">主动抢占</h5>
                <Checkbox label="开启抢占" checked={huaweiConfig.preemptEnabled} onChange={e => updateHuaweiHAConfig({ preemptEnabled: e.target.checked })} />
                {huaweiConfig.preemptEnabled && <Field label="抢占延迟(秒)" note="默认60"><Input value={huaweiConfig.preemptDelay} onChange={e => updateHuaweiHAConfig({ preemptDelay: e.target.value })} /></Field>}
             </div>
             {/* General Settings */}
             <div className="p-3 bg-slate-800/50 rounded-lg space-y-3">
                 <h5 className="text-sm font-medium text-slate-300">通用设置</h5>
                 <Checkbox label="开启双机热备逃生功能" checked={huaweiConfig.escapeEnabled} onChange={e => updateHuaweiHAConfig({ escapeEnabled: e.target.checked })} />
                 <Checkbox label="允许备设备执行部分配置" checked={huaweiConfig.standbyConfigEnabled} onChange={e => updateHuaweiHAConfig({ standbyConfigEnabled: e.target.checked })} />
                 <Field label="设备角色"><Select value={huaweiConfig.deviceRole} onChange={e => updateHuaweiHAConfig({ deviceRole: e.target.value as any })}><option value="none">不配置</option><option value="active">Active</option><option value="standby">Standby</option></Select></Field>
             </div>
        </>
    );

    const panelTitle = isHuawei ? '双机热备 (HRP)' : 'HA高可用';

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg" onClick={onToggle}>
                <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h4 className="font-semibold">{panelTitle}</h4></div>
                {isApplicable && <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>}
            </div>
            {isExpanded && config.enabled && isApplicable && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    {isH3C && renderH3CConfig()}
                    {isHuawei && renderHuaweiConfig()}

                    <div><h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5><pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">{isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}</pre></div>
                </div>
            )}
            {isExpanded && !isApplicable && (<div className="border-t border-slate-600 p-3"><p className="text-xs text-slate-500 italic">HA configuration is only available for H3C and Huawei Firewalls.</p></div>)}
        </div>
    );
};

export default HAConfig;
