import React, { useState, useEffect, useMemo, Fragment, useCallback, useRef } from 'react';
import { OperationalDevice, Vendor, DeviceRuntimeStatus as RuntimeState } from '../types';
import { DownloadIcon } from './Icons';

// === Simple API client with timeout + JSON helper ===
const apiFetch = async (url: string, opts: RequestInit = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  } finally {
    clearTimeout(id);
  }
};

// === Simple concurrency limiter ===
const limitConcurrency = async <T,>(items: T[], handler: (t: T) => Promise<any>, concurrency = 3) => {
  const results: any[] = [];
  const queue = [...items];
  const runners: Promise<void>[] = [];
  const worker = async () => {
    while (queue.length) {
      const it = queue.shift()!;
      try { results.push(await handler(it)); } catch (e) { results.push(e); }
    }
  };
  for (let i = 0; i < concurrency; i++) runners.push(worker());
  await Promise.all(runners);
  return results;
};

// === Subcomponents ===
const LogModal: React.FC<{ log: string | Record<string, any>; nodeName: string; onClose: () => void }> = ({ log, nodeName, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAllExpanded, setIsAllExpanded] = useState(true);

    const handleDownload = () => {
        let logContent = `Inspection Log for ${nodeName}\nTimestamp: ${new Date().toLocaleString()}\n\n`;
        if (typeof log === 'string') {
            logContent += log;
        } else {
            logContent += Object.entries(log).map(([category, commands]) => {
                let categoryContent = `====================\n[ ${category} ]\n====================\n\n`;
                if (typeof commands === 'object' && commands !== null) {
                    categoryContent += Object.entries(commands).map(([command, output]) => {
                        return `--- Command: ${command} ---\n${output}\n`;
                    }).join('\n');
                } else {
                    categoryContent += commands;
                }
                return categoryContent;
            }).join('\n\n');
        }
        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspection-log-${nodeName.replace(/\s+/g, '_')}-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const filteredLog = useMemo(() => {
        if (!searchTerm || typeof log !== 'object' || log === null) return log;
        const lowerSearch = searchTerm.toLowerCase();
        const newLog: Record<string, any> = {};
        for (const category in log) {
            if (category.toLowerCase().includes(lowerSearch)) {
                newLog[category] = log[category];
                continue;
            }
            if (typeof log[category] === 'object' && log[category] !== null) {
                const newCommands: Record<string, string> = {};
                let match = false;
                for (const command in log[category]) {
                    if (command.toLowerCase().includes(lowerSearch) || String(log[category][command]).toLowerCase().includes(lowerSearch)) {
                        newCommands[command] = log[category][command];
                        match = true;
                    }
                }
                if (match) newLog[category] = newCommands;
            }
        }
        return newLog;
    }, [log, searchTerm]);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-white">Inspection Log: {nodeName}</h3>
                    <div className="flex items-center gap-4">
                        <input type="text" placeholder="Search log..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-700 text-xs rounded px-2 py-1" />
                        <button onClick={() => setIsAllExpanded(!isAllExpanded)} className="text-sm text-blue-400">{isAllExpanded ? 'Collapse All' : 'Expand All'}</button>
                        <button onClick={handleDownload} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><DownloadIcon className="w-4 h-4" /> Download</button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    {(!filteredLog || (typeof filteredLog === 'string' && filteredLog.trim() === '')) ? (
                        <p className="text-slate-400">No output received or no matches for search.</p>
                    ) : (typeof filteredLog === 'string' ? (
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{filteredLog}</pre>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(filteredLog).map(([category, commands]) => (
                                <details key={category} open={isAllExpanded} className="bg-slate-800/40 rounded-md">
                                    <summary className="font-medium text-slate-200 p-3 cursor-pointer">{category}</summary>
                                    <div className="p-3 border-t border-slate-700">
                                        {typeof commands === 'object' && commands !== null ? Object.entries(commands).map(([command, output]) => (
                                            <details key={command} open className="mb-2">
                                                <summary className="text-xs font-mono text-cyan-400 mb-1 cursor-pointer">$ {command}</summary>
                                                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-black/30 p-2 rounded ml-4">{String(output) || 'No output.'}</pre>
                                            </details>
                                        )) : <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{String(commands)}</pre>}
                                    </div>
                                </details>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const InspectionHistoryModal: React.FC<{ device: OperationalDevice; onClose: () => void; onOpenLog: (log: any) => void }>
  = ({ device, onClose, onOpenLog }) => {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    apiFetch(`/api/inspection/history/${device.id}`).then((data: any) => {
      if (!mounted) return;
      if (Array.isArray(data)) setHistory(data);
      else setHistory([]);
    }).catch(() => setHistory([]));
    return () => { mounted = false; };
  }, [device.id]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">历史记录 - {device.name}</h3>
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
              <tr>
                <th className="px-3 py-2 text-left">时间</th>
                <th className="px-3 py-2 text-left">结果</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-slate-500">暂无历史记录</td></tr>
              )}
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2">{h.timestamp}</td>
                  <td className={`px-3 py-2 ${h.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{h.status}</td>
                  <td className="px-3 py-2"><button onClick={() => onOpenLog(h.log)} className="text-blue-400 hover:underline">查看日志</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DeviceInspectionView: React.FC<{ devices: OperationalDevice[]; onUpdateDevice: (d: OperationalDevice) => void }> = ({ devices, onUpdateDevice }) => {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [isInspecting, setIsInspecting] = useState(false);
  const [logModal, setLogModal] = useState<{ nodeName: string; log: any } | null>(null);
  const [historyModalDevice, setHistoryModalDevice] = useState<OperationalDevice | null>(null);
  const [templatesByVendor, setTemplatesByVendor] = useState<Record<string, { name: string; categories: string[] }[]>>({});
  const [availableCategories, setAvailableCategories] = useState<Record<string, string[]>>({});
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const prevVendorRef = useRef<string | null>(null);

  const manageableDevices = useMemo(() => devices.filter(d => d.vendor !== Vendor.Generic), [devices]);
  const uniqueVendors = useMemo(() => Array.from(new Set(manageableDevices.map(d => d.vendor))), [manageableDevices]);

  useEffect(() => {
    let mounted = true;
    (async () => {
        const newTemplates: Record<string, any> = {};
        const newCategories: Record<string, string[]> = {};
        for (const vendor of uniqueVendors) {
            try {
                const templatesData: any[] = await apiFetch(`/api/inspection/templates/${vendor}`);
                newTemplates[vendor] = templatesData || [];
                const allCats = new Set<string>();
                (templatesData || []).forEach((t: any) => (t.categories || []).forEach((c: string) => allCats.add(c)));
                newCategories[vendor] = Array.from(allCats);
            } catch (e) { console.error(`Failed to fetch templates for ${vendor}:`, e); }
        }
        if (mounted) {
            setTemplatesByVendor(newTemplates);
            setAvailableCategories(newCategories);
        }
    })();
    return () => { mounted = false; };
  }, [uniqueVendors]);
  
  const onUpdateDeviceRuntime = useCallback((deviceId: string, updater: (prev?: RuntimeState) => RuntimeState) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;
    const next: OperationalDevice = { ...dev, runtime: updater(dev.runtime) };
    onUpdateDevice(next);
  }, [devices, onUpdateDevice]);
  
  const onUpdateDeviceRuntimeRef = useRef(onUpdateDeviceRuntime);
  onUpdateDeviceRuntimeRef.current = onUpdateDeviceRuntime;

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = location.hostname; // 自动获取IP，不带端口
      const wsUrl = `${protocol}//${hostname}:3001/api/ws/inspection-progress`; // ← 注意这里
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const { deviceId, progress, status, log } = msg;
          if (!deviceId) return;
          onUpdateDeviceRuntimeRef.current(deviceId, (prev) => ({
            ...prev,
            inspectionProgress: typeof progress === 'number' ? progress : prev?.inspectionProgress,
            inspectionStatus: status || prev?.inspectionStatus,
            inspectionLog: log ? { ...(typeof prev?.inspectionLog === 'object' && prev.inspectionLog !== null ? prev.inspectionLog : {}), ...log } : prev?.inspectionLog,
          }));
        } catch (e) { console.error('WS parse error', e); }
      };
      ws.onerror = (err) => {
          console.error('WebSocket error:', err);
      }
      ws.onclose = () => {
          console.log('WebSocket connection closed.');
      }
    } catch (e) { console.warn('WebSocket connection failed.'); }
    return () => ws && ws.close();
  }, []);

  const displayCategoriesAndTemplates = useMemo(() => {
    if (selectedDeviceIds.size > 0) {
      const firstId = Array.from(selectedDeviceIds)[0];
      const device = manageableDevices.find(d => d.id === firstId);
      if (device) return {
          categories: availableCategories[device.vendor] || [],
          templates: templatesByVendor[device.vendor] || [],
          vendor: device.vendor
      };
    }
    return { categories: [], templates: [], vendor: null };
  }, [selectedDeviceIds, manageableDevices, availableCategories, templatesByVendor]);

  const { vendor, templates } = displayCategoriesAndTemplates;

  useEffect(() => {
    if (vendor && vendor !== prevVendorRef.current) {
        if (templates && templates.length > 0) {
            const basicTemplate = templates.find(t => t.name === '基础巡检') || templates[0];
            if (basicTemplate && basicTemplate.categories) {
                setSelectedCategories(new Set(basicTemplate.categories));
                setSelectedTemplate(basicTemplate.name);
            } else {
                setSelectedCategories(new Set());
                setSelectedTemplate('');
            }
        } else {
            setSelectedCategories(new Set());
            setSelectedTemplate('');
        }
    } else if (!vendor && prevVendorRef.current) {
        setSelectedCategories(new Set());
        setSelectedTemplate('');
    }
    prevVendorRef.current = vendor;
  }, [vendor, templates]);

  useEffect(() => {
    const { categories } = displayCategoriesAndTemplates;
    if (categories.length === 0) {
        if (selectedCategories.size > 0) setSelectedCategories(new Set());
        return;
    }
    const currentSelected = new Set(Array.from(selectedCategories).filter(c => categories.includes(c)));
    if (currentSelected.size !== selectedCategories.size) {
        setSelectedCategories(currentSelected);
    }
  }, [displayCategoriesAndTemplates, selectedCategories]);

  const toggleSelectNode = (id: string) => setSelectedDeviceIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleStartInspect = async () => {
    const toInspect = manageableDevices.filter(d => selectedDeviceIds.has(d.id));
    if (toInspect.length === 0 || selectedCategories.size === 0) return;
    setIsInspecting(true);

    toInspect.forEach(d => onUpdateDevice({ ...d, runtime: { ...d.runtime, inspectionStatus: 'pending', inspectionProgress: 0, inspectionLog: {} } }));

    await limitConcurrency(toInspect, async (device) => {
      try {
        const payload = {
          deviceId: device.id,
          host: device.management.ipAddress,
          username: device.management.credentials.username,
          password: device.management.credentials.password,
          vendor: device.vendor,
          categories: Array.from(selectedCategories),
        };
        await apiFetch('/api/inspect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 600000);

      } catch (err: any) {
        onUpdateDeviceRuntime(device.id, (prev) => ({
            ...prev,
            inspectionStatus: 'failed',
            inspectionProgress: 100,
            inspectionLog: { error: { 'Request Failed': err.message || String(err) } },
            lastInspected: new Date().toLocaleString()
        }));
      }
    }, 3);
    setTimeout(() => setIsInspecting(false), 5000);
  };

  const summary = useMemo(() => {
    const inspecting = manageableDevices.filter(d => d.runtime?.inspectionStatus === 'pending' || d.runtime?.inspectionStatus === 'inspecting').length;
    const success = manageableDevices.filter(d => d.runtime?.inspectionStatus === 'success').length;
    const failed = manageableDevices.filter(d => d.runtime?.inspectionStatus === 'failed').length;
    if(inspecting === 0 && isInspecting) setIsInspecting(false);
    return { inspecting, success, failed };
  }, [manageableDevices, isInspecting]);

  const handleApplyTemplate = (vendor: string | null, templateName: string) => {
    setSelectedTemplate(templateName);
    if (!vendor || !templateName) {
        setSelectedCategories(new Set());
        return;
    }
    const t = (templatesByVendor[vendor] || []).find(tt => tt.name === templateName);
    if (t) setSelectedCategories(new Set(t.categories));
  };
  
  const openDeviceLog = (device: OperationalDevice) => setLogModal({ nodeName: device.name, log: device.runtime?.inspectionLog || 'No log available.' });

  return (
    <Fragment>
      <div className="p-6 bg-slate-800 rounded-lg space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">设备巡检</h3>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm">
                <span className="text-blue-400">巡检中: {summary.inspecting}</span>
                <span className="text-green-400">成功: {summary.success}</span>
                <span className="text-red-400">失败: {summary.failed}</span>
            </div>
            <button onClick={handleStartInspect} disabled={isInspecting || selectedDeviceIds.size === 0 || selectedCategories.size === 0} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-500 flex items-center gap-2">
              {isInspecting ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : null}
              开始巡检
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-base font-semibold text-slate-300">选择巡检内容</h4>
                {displayCategoriesAndTemplates.vendor && displayCategoriesAndTemplates.templates.length > 0 && (
                     <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400">模板:</label>
                        <select value={selectedTemplate} onChange={(e) => handleApplyTemplate(displayCategoriesAndTemplates.vendor, e.target.value)} className="bg-slate-700 text-sm rounded px-2 py-1">
                            <option value="">自定义</option>
                            {displayCategoriesAndTemplates.templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                     </div>
                )}
            </div>
          {displayCategoriesAndTemplates.categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-sm">
              {displayCategoriesAndTemplates.categories.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-800/50 rounded">
                  <input type="checkbox" checked={selectedCategories.has(cat)} onChange={() => {
                      setSelectedTemplate(''); // Switch to custom on manual change
                      setSelectedCategories(p => { const n=new Set(p); if(n.has(cat))n.delete(cat); else n.add(cat); return n;});
                    }} />
                  {cat}
                </label>
              ))}
            </div>
          ) : ( <p className="text-sm text-slate-500">请先从下方列表中选择一台设备以查看可用的巡检内容。</p> )}
        </div>
        
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                    <tr>
                        <th className="p-4"><input type="checkbox" onChange={e => setSelectedDeviceIds(e.target.checked ? new Set(manageableDevices.map(n => n.id)) : new Set())} /></th>
                        <th className="px-6 py-3">主机名</th>
                        <th className="px-6 py-3">设备IP</th>
                        <th className="px-6 py-3">厂商</th>
                        <th className="px-6 py-3 w-48">状态</th>
                        <th className="px-6 py-3">最后巡检时间</th>
                        <th className="px-6 py-3">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {manageableDevices.map(d => (
                    <tr key={d.id} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="p-4"><input type="checkbox" checked={selectedDeviceIds.has(d.id)} onChange={() => toggleSelectNode(d.id)} /></td>
                        <td className="px-6 py-2">{d.name}</td>
                        <td className="px-6 py-2">{d.management.ipAddress}</td>
                        <td className="px-6 py-2">{d.vendor}</td>
                        <td className="px-6 py-2">
                             <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${d.runtime?.inspectionStatus === 'success' ? 'bg-green-500' : d.runtime?.inspectionStatus === 'failed' ? 'bg-red-500' : d.runtime?.inspectionStatus === 'pending' || d.runtime?.inspectionStatus === 'inspecting' ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`}/>
                                <span className="capitalize">{d.runtime?.inspectionStatus || 'Unknown'}</span>
                                {(d.runtime?.inspectionStatus === 'pending' || d.runtime?.inspectionStatus === 'inspecting') && <span className="text-xs text-slate-400">({(d.runtime?.inspectionProgress || 0).toFixed(0)}%)</span>}
                             </div>
                             {(d.runtime?.inspectionStatus === 'pending' || d.runtime?.inspectionStatus === 'inspecting') && <div className="w-full bg-slate-600 rounded-full h-1 mt-1"><div className="bg-blue-500 h-1 rounded-full" style={{width: `${d.runtime.inspectionProgress || 0}%`}}></div></div>}
                        </td>
                        <td className="px-6 py-2">{d.runtime?.lastInspected || 'N/A'}</td>
                        <td className="px-6 py-2 space-x-3">
                            <button onClick={() => openDeviceLog(d)} disabled={!d.runtime?.inspectionLog || Object.keys(d.runtime.inspectionLog).length === 0} className="text-blue-400 hover:underline disabled:text-slate-500">日志</button>
                            <button onClick={() => setHistoryModalDevice(d)} className="text-blue-400 hover:underline">历史</button>
                        </td>
                    </tr>
                    ))}
                    {manageableDevices.length === 0 && (<tr><td colSpan={7} className="text-center py-8 text-slate-500">没有可巡检的设备。</td></tr>)}
                </tbody>
            </table>
         </div>
      </div>
      {logModal && <LogModal log={logModal.log} nodeName={logModal.nodeName} onClose={() => setLogModal(null)} />}
      {historyModalDevice && <InspectionHistoryModal device={historyModalDevice} onClose={() => setHistoryModalDevice(null)} onOpenLog={(log) => setLogModal({nodeName: historyModalDevice.name, log})} />}
    </Fragment>
  );
};

export default DeviceInspectionView;