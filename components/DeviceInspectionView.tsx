import React, { useState, useEffect, useMemo, Fragment, useCallback, useRef } from 'react';
import { OperationalDevice, Vendor, DeviceRuntimeStatus as RuntimeState, ParsedResult } from '../types';
import { DownloadIcon } from './Icons';

// === 样式定义 ===
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .fade-in { animation: fadeIn 0.2s ease-in; }
  .slide-up { animation: slideUp 0.2s ease-out; }
  
  .device-row {
    transition: background-color 0.15s ease;
  }
  
  .device-row:hover {
    background-color: rgba(51, 65, 85, 0.3);
  }
  
  .device-row.selected {
    background-color: rgba(59, 130, 246, 0.08);
    border-left: 3px solid #3b82f6;
  }
  
  .progress-bar {
    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    transition: width 0.3s ease;
  }

  .tree-node {
    transition: background-color 0.15s ease;
  }
  
  .tree-node:hover {
    background-color: rgba(51, 65, 85, 0.3);
  }
`;

if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('device-inspection-styles');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'device-inspection-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

// === Types ===
interface CommandTemplate {
  id?: string;
  name: string;
  vendor: string;
  deviceType: string;
  commands: CommandEntry[];
}

interface CommandEntry {
  id: string;
  name: string;
  cmd: string;
  parse?: string;
  category: string;
}

interface TreeNode {
  id: string;
  type: 'group' | 'vendor' | 'device';
  label: string;
  vendor?: Vendor;
  device?: OperationalDevice;
  children?: TreeNode[];
  count?: number;
}

interface InspectionTask {
  id: string;
  cronExpression: string;
  devices?: (string | { id?: string; name?: string })[];
  templates?: string[];
  deviceCount?: number;
  createdAt: string;
}

// === Utility Functions ===
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

const getVendorIcon = (vendor: Vendor | string) => {
  const icons: Record<string, string> = {
    Cisco: '🔷',
    Huawei: '🔴',
    H3C: '🟣',
  };
  return icons[vendor] || '⚙️';
};

const getDeviceTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    Switch: '🔀',
    Router: '🔁',
    Firewall: '🔥',
    Server: '🖥️',
    Unknown: '❓',
  };
  return icons[type] || '⚙️';
};

// === StructuredDataViewer 组件 ===
const StructuredDataViewer: React.FC<{ data: ParsedResult }> = ({ data }) => {
    const renderTable = (title: string, items: { id: string, [key: string]: string }[], statusKey: string, valueKey: string | null = null) => (
        <div>
            <h5 className="text-xs font-semibold text-slate-400 mb-1">{title}</h5>
            <table className="w-full text-xs my-2">
                <tbody>
                    {items.map((item: any, index: number) => (
                        <tr key={item.id || index} className="border-b border-slate-700/50">
                            <td className="py-1 pr-2 text-slate-300">{item.id}</td>
                            {valueKey && <td className="py-1 pr-2 font-mono text-white">{item[valueKey]}</td>}
                            <td className={`py-1 text-right font-semibold ${String(item[statusKey]).toLowerCase().includes('normal') || String(item[statusKey]).toLowerCase().includes('ok') ? 'text-green-400' : 'text-red-400'}`}>
                                {item[statusKey]}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    switch (data.type) {
        case 'cpu':
            return (
                <div className="flex items-baseline gap-2">
                    <h5 className="text-sm font-semibold text-slate-300">CPU:</h5>
                    <span className="font-bold text-lg text-green-400">{data.data.usage}%</span>
                </div>
            );
        case 'memory':
             return (
                <div className="flex items-baseline gap-2">
                    <h5 className="text-sm font-semibold text-slate-300">Memory:</h5>
                    <span className="font-bold text-lg text-yellow-400">{data.data.usage}%</span>
                </div>
            );
        case 'fan':
            return renderTable('Fan Status', data.data.fans, 'status');
        case 'power':
            return renderTable('Power Supply', data.data.power, 'status');
        case 'temperature':
            return renderTable('Temperature', data.data.temperatures, 'status', 'value');
        case 'version':
            return (
                <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-2">Version</h5>
                    <div className="space-y-1">
                        {Object.entries(data.data).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-xs">
                                <span className="text-slate-400 min-w-[120px]">{key}:</span>
                                <span className="text-white font-mono">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'interface':
            return (
                <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-1">Interfaces</h5>
                    <table className="w-full text-xs my-2">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="py-1 text-left text-slate-400">Interface</th>
                                <th className="py-1 text-left text-slate-400">IP</th>
                                <th className="py-1 text-right text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.data.interfaces.map((iface: any, index: number) => (
                                <tr key={index} className="border-b border-slate-700/50">
                                    <td className="py-1 pr-2 text-slate-300">{iface.name}</td>
                                    <td className="py-1 pr-2 font-mono text-white">{iface.ip || '-'}</td>
                                    <td className={`py-1 text-right font-semibold ${
                                        iface.status === 'up' ? 'text-green-400' : 
                                        iface.status === 'down' ? 'text-red-400' : 'text-gray-400'
                                    }`}>
                                        {iface.status.toUpperCase()} / {iface.protocol.toUpperCase()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        default:
            return null;
    }
};

// === LogModal 组件 ===
const LogModal: React.FC<{ log: any; nodeName: string; onClose: () => void }> = ({ log, nodeName, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAllExpanded, setIsAllExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    const hasStructuredData = useMemo(() => {
        if (typeof log !== 'object' || log === null) return false;
        return Object.values(log).some(commands => 
            typeof commands === 'object' && commands !== null && 
            Object.values(commands).some(output => typeof output === 'object' && output !== null && 'type' in output && output.type !== 'unknown')
        );
    }, [log]);

    useEffect(() => {
        if (!hasStructuredData) {
            setActiveTab('raw');
        }
    }, [hasStructuredData]);

    const handleDownload = () => {
        let logContent = '';
        
        const rawLogCategory = log['Raw Log'];
        if (rawLogCategory && typeof rawLogCategory === 'object' && rawLogCategory !== null) {
            const completeSessionOutput = rawLogCategory['Complete Session Output'];
            if (completeSessionOutput) {
                const sessionContent = (typeof completeSessionOutput === 'object' && 'original' in completeSessionOutput) 
                    ? completeSessionOutput.original 
                    : String(completeSessionOutput);
                logContent = sessionContent;
            }
        }
        
        if (!logContent) {
            logContent = `Inspection Log for ${nodeName}\nTimestamp: ${new Date().toLocaleString()}\n\n`;
            if (typeof log === 'string') {
                logContent += log;
            } else {
                logContent += Object.entries(log).map(([category, commands]) => {
                    let categoryContent = `====================\n[ ${category} ]\n====================\n\n`;
                    if (typeof commands === 'object' && commands !== null) {
                        categoryContent += Object.entries(commands).map(([command, output]) => {
                            const outputContent = (typeof output === 'object' && output !== null && 'original' in output) ? output.original : String(output);
                            return `--- Command: ${command} ---\n${outputContent}\n`;
                        }).join('\n');
                    } else {
                        categoryContent += commands;
                    }
                    return categoryContent;
                }).join('\n\n');
            }
        }
        
        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        a.download = `${nodeName.replace(/\s+/g, '_')}_${timestamp}.txt`;
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
                const newCommands: Record<string, string | ParsedResult> = {};
                let match = false;
                for (const command in log[category]) {
                    const output = log[category][command];
                    const outputString = (typeof output === 'object' && 'original' in output) ? output.original : String(output);
                    if (command.toLowerCase().includes(lowerSearch) || outputString.toLowerCase().includes(lowerSearch)) {
                        newCommands[command] = output;
                        match = true;
                    }
                }
                if (match) newLog[category] = newCommands;
            }
        }
        return newLog;
    }, [log, searchTerm]);

    const renderSummary = () => (
        <div className="space-y-4">
             {Object.entries(filteredLog).map(([category, commands], catIdx) => {
                if (typeof commands !== 'object' || commands === null) return null;
                const structuredOutputs = Object.entries(commands).map(([command, output]) => ({ command, output }))
                    .filter(item => typeof item.output === 'object' && item.output !== null && item.output.type !== 'unknown');
                
                if (structuredOutputs.length === 0) return null;

                return (
                    <div key={category} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                        <h4 className="font-semibold text-white mb-3 text-sm">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {structuredOutputs.map((item) => (
                                <div key={item.command} className="bg-slate-900/40 p-3 rounded border border-slate-700/30">
                                    <div className="text-xs font-mono text-cyan-400 mb-2 pb-2 border-b border-slate-700/50">$ {item.command}</div>
                                    <StructuredDataViewer data={item.output} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
             {!hasStructuredData && (
               <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                 <div className="text-4xl mb-3 opacity-30">📭</div>
                 <p className="text-sm">无结构化数据</p>
               </div>
             )}
        </div>
    );
    
    const renderRawLog = () => {
         if (!filteredLog || (typeof filteredLog === 'string' && filteredLog.trim() === '')) {
            return (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <div className="text-4xl mb-3 opacity-30">📭</div>
                <p className="text-sm">无输出数据</p>
              </div>
            );
        }
        if (typeof filteredLog === 'string') {
            return <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-black/20 p-4 rounded border border-slate-700/30">{filteredLog}</pre>
        }
        
        const rawLogSource = filteredLog['Raw Log'] || log['Raw Log'];
        if (rawLogSource && typeof rawLogSource === 'object' && rawLogSource !== null) {
            const completeSessionOutput = rawLogSource['Complete Session Output'];
            if (completeSessionOutput) {
                const sessionContent = (typeof completeSessionOutput === 'object' && 'original' in completeSessionOutput) 
                    ? completeSessionOutput.original 
                    : String(completeSessionOutput);
                return (
                  <div className="bg-black/20 p-4 rounded border border-slate-700/30">
                    <div className="text-xs text-slate-400 mb-2 font-mono">完整会话输出</div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{sessionContent}</pre>
                  </div>
                );
            }
        }
        
        return (
            <div className="space-y-2">
                {Object.entries(filteredLog).map(([category, commands]) => (
                    <details key={category} open={isAllExpanded} className="bg-slate-800/30 rounded border border-slate-700/50">
                        <summary className="font-medium text-white p-3 cursor-pointer hover:bg-slate-700/30 text-sm">
                          {category}
                        </summary>
                        <div className="p-3 border-t border-slate-700/30 bg-black/10 space-y-2">
                            {typeof commands === 'object' && commands !== null ? Object.entries(commands).map(([command, output]) => {
                                const rawOutput = (typeof output === 'object' && output !== null && 'original' in output) ? output.original : String(output);
                                return (
                                <details key={command} open className="mb-2 rounded border border-slate-700/30">
                                    <summary className="text-xs font-mono text-cyan-400 p-2 cursor-pointer bg-slate-800/30 hover:bg-slate-700/30">$ {command}</summary>
                                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-black/20 p-2">{rawOutput || 'No output.'}</pre>
                                </details>
                            )}) : <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{String(commands)}</pre>}
                        </div>
                    </details>
                ))}
            </div>
        )
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
                    <div>
                        <h3 className="text-base font-semibold text-white">巡检日志</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{nodeName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="搜索..." 
                          value={searchTerm} 
                          onChange={e => setSearchTerm(e.target.value)} 
                          className="bg-slate-700 text-xs rounded px-2 py-1.5 w-40 border border-slate-600 focus:border-blue-500 focus:outline-none" 
                        />
                        <button 
                          onClick={() => setIsAllExpanded(!isAllExpanded)} 
                          className="text-xs text-slate-300 hover:text-white px-2 py-1.5"
                        >
                          {isAllExpanded ? '收起' : '展开'}
                        </button>
                        <button 
                          onClick={handleDownload} 
                          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1.5"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" /> 下载
                        </button>
                        <button 
                          onClick={onClose} 
                          className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center"
                        >
                          ×
                        </button>
                    </div>
                </div>

                {hasStructuredData && (
                    <div className="flex border-b border-slate-700 bg-slate-800/30">
                        <button 
                          onClick={() => setActiveTab('summary')} 
                          className={`py-2 px-4 text-sm transition-colors ${
                            activeTab === 'summary' 
                              ? 'text-white border-b-2 border-blue-500' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          摘要
                        </button>
                        <button 
                          onClick={() => setActiveTab('raw')} 
                          className={`py-2 px-4 text-sm transition-colors ${
                            activeTab === 'raw' 
                              ? 'text-white border-b-2 border-blue-500' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          原始日志
                        </button>
                    </div>
                )}
                
                <div className="flex-1 p-4 overflow-y-auto">
                   {activeTab === 'summary' ? renderSummary() : renderRawLog()}
                </div>
            </div>
        </div>
    );
};

// === InspectionHistoryModal 组件 ===
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start p-4 border-b border-slate-700 bg-slate-800/50">
          <div>
            <h3 className="text-base font-semibold text-white">巡检历史</h3>
            <p className="text-xs text-slate-400 mt-0.5">{device.name}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="text-4xl mb-3 opacity-30">📭</div>
              <p className="text-sm">暂无历史记录</p>
            </div>
          ) : (
            <table className="w-full text-sm text-slate-300">
              <thead className="bg-slate-800/50 border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">时间</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">结果</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-xs font-mono text-slate-400">{h.timestamp}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        h.status === 'success' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {h.status === 'success' ? '✓' : '✗'} {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        onClick={() => onOpenLog(h.log)} 
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// === DeviceTreeSelector 组件 ===
const DeviceTreeSelector: React.FC<{
  devices: OperationalDevice[];
  selectedDeviceIds: Set<string>;
  onToggleDevice: (deviceId: string) => void;
  onToggleAll: (deviceIds: string[], selected: boolean) => void;
}> = ({ devices, selectedDeviceIds, onToggleDevice, onToggleAll }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const treeData = useMemo(() => {
    const tree: TreeNode[] = [];
    const groupMap = new Map<string, Map<Vendor, Map<string, OperationalDevice[]>>>();

    devices.forEach(device => {
      const group = (device as any).group || '未分组';
      const deviceType = (device as any).deviceType || device.type || 'Unknown';
      
      if (!groupMap.has(group)) {
        groupMap.set(group, new Map());
      }
      const vendorMap = groupMap.get(group)!;
      
      if (!vendorMap.has(device.vendor)) {
        vendorMap.set(device.vendor, new Map());
      }
      const typeMap = vendorMap.get(device.vendor)!;
      
      if (!typeMap.has(deviceType)) {
        typeMap.set(deviceType, []);
      }
      typeMap.get(deviceType)!.push(device);
    });

    Array.from(groupMap.entries()).forEach(([groupName, vendorMap]) => {
      const vendorNodes: TreeNode[] = [];
      let groupDeviceCount = 0;

      Array.from(vendorMap.entries()).forEach(([vendor, typeMap]) => {
        const deviceTypeNodes: TreeNode[] = [];
        let vendorDeviceCount = 0;

        Array.from(typeMap.entries()).forEach(([deviceType, typeDevices]) => {
          const filteredDevices = typeDevices.filter(d => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return d.name.toLowerCase().includes(term) || 
                   d.management.ipAddress.includes(term);
          });

          if (filteredDevices.length === 0 && searchTerm) return;

          vendorDeviceCount += filteredDevices.length;
          groupDeviceCount += filteredDevices.length;

          deviceTypeNodes.push({
            id: `${groupName}-${vendor}-${deviceType}`,
            type: 'vendor',
            label: deviceType,
            children: filteredDevices.map(device => ({
              id: device.id,
              type: 'device',
              label: device.name,
              device,
            })),
            count: filteredDevices.length,
          });
        });

        if (deviceTypeNodes.length > 0) {
          vendorNodes.push({
            id: `${groupName}-${vendor}`,
            type: 'vendor',
            label: vendor,
            vendor,
            children: deviceTypeNodes,
            count: vendorDeviceCount,
          });
        }
      });

      if (vendorNodes.length > 0) {
        tree.push({
          id: groupName,
          type: 'group',
          label: groupName,
          children: vendorNodes,
          count: groupDeviceCount,
        });
      }
    });

    return tree;
  }, [devices, searchTerm]);

  useEffect(() => {
    const allNodeIds = new Set<string>();
    const collectNodeIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children) {
          collectNodeIds(node.children);
        }
      });
    };
    collectNodeIds(treeData);
    setExpandedNodes(allNodeIds);
  }, [treeData]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getNodeDevices = (node: TreeNode): string[] => {
    if (node.type === 'device') {
      return [node.id];
    }
    if (node.children) {
      return node.children.flatMap(getNodeDevices);
    }
    return [];
  };

  const isNodeSelected = (node: TreeNode): boolean | 'indeterminate' => {
    const deviceIds = getNodeDevices(node);
    const selectedCount = deviceIds.filter(id => selectedDeviceIds.has(id)).length;
    if (selectedCount === 0) return false;
    if (selectedCount === deviceIds.length) return true;
    return 'indeterminate';
  };

  const handleNodeToggle = (node: TreeNode) => {
    const deviceIds = getNodeDevices(node);
    const selected = isNodeSelected(node);
    onToggleAll(deviceIds, selected !== true);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const selected = isNodeSelected(node);
    const isDeviceTypeNode = level === 2;

    return (
      <div key={node.id}>
        <div
          className="tree-node flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <span className={`transform transition-transform text-xs ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <input
            type="checkbox"
            checked={selected === true}
            ref={input => {
              if (input) input.indeterminate = selected === 'indeterminate';
            }}
            onChange={() => {
              if (node.type === 'device') {
                onToggleDevice(node.id);
              } else {
                handleNodeToggle(node);
              }
            }}
            className="w-3.5 h-3.5 rounded accent-blue-500"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {node.type === 'group' && <span className="text-base">📁</span>}
            {node.type === 'vendor' && !isDeviceTypeNode && <span className="text-base">{getVendorIcon(node.vendor || node.label)}</span>}
            {isDeviceTypeNode && <span className="text-base">{getDeviceTypeIcon(node.label)}</span>}
            {node.type === 'device' && (
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  node.device?.runtime?.inspectionStatus === 'success'
                    ? 'bg-green-500'
                    : node.device?.runtime?.inspectionStatus === 'failed'
                    ? 'bg-red-500'
                    : node.device?.runtime?.inspectionStatus === 'pending' ||
                      node.device?.runtime?.inspectionStatus === 'inspecting'
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
            )}

            <span className={`text-sm truncate ${
              node.type === 'device' ? 'text-slate-200' : 'text-white font-medium'
            }`}>
              {node.label}
            </span>

            {node.type !== 'device' && node.count !== undefined && (
              <span className="text-xs text-slate-500 ml-auto">
                ({node.count})
              </span>
            )}

            {node.type === 'device' && node.device && (
              <code className="text-xs text-slate-500 ml-auto font-mono">
                {node.device.management.ipAddress}
              </code>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg h-full flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <input
          type="text"
          placeholder="搜索设备..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-slate-700 text-white text-sm rounded px-3 py-1.5 border border-slate-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="text-3xl mb-2 opacity-30">🔍</div>
            <p className="text-xs">无匹配设备</p>
          </div>
        ) : (
          <div className="space-y-1">
            {treeData.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};

// === TemplateSelector 组件 ===
const TemplateSelector: React.FC<{
  selectedTemplateIds: Set<string>;
  onToggleTemplate: (templateId: string) => void;
  devices: OperationalDevice[];
  selectedDeviceIds: Set<string>;
}> = ({ selectedTemplateIds, onToggleTemplate, devices, selectedDeviceIds }) => {
  const [templates, setTemplates] = useState<CommandTemplate[]>([]);

  useEffect(() => {
    const loadTemplates = () => {
      try {
        const stored = localStorage.getItem('inspection-templates');
        if (stored) {
          setTemplates(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    };

    loadTemplates();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inspection-templates') {
        loadTemplates();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const pollInterval = setInterval(loadTemplates, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  const availableTemplates = useMemo(() => {
    const selectedDevices = devices.filter(d => selectedDeviceIds.has(d.id));
    if (selectedDevices.length === 0) return templates;

    const vendors = new Set(selectedDevices.map(d => d.vendor));
    return templates.filter(t => vendors.has(t.vendor as Vendor));
  }, [templates, devices, selectedDeviceIds]);

  const templatesByVendor = useMemo(() => {
    const grouped = new Map<string, Map<string, { templates: CommandTemplate[], commandCount: number }>>();
    
    availableTemplates.forEach(template => {
      if (!grouped.has(template.vendor)) {
        grouped.set(template.vendor, new Map());
      }
      
      const vendorMap = grouped.get(template.vendor)!;
      const deviceType = template.deviceType || 'Unknown';
      
      if (!vendorMap.has(deviceType)) {
        vendorMap.set(deviceType, { templates: [], commandCount: 0 });
      }
      
      const typeGroup = vendorMap.get(deviceType)!;
      typeGroup.templates.push(template);
      typeGroup.commandCount += template.commands.length;
    });
    
    return grouped;
  }, [availableTemplates]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-white mb-3">命令模板</h4>

      {availableTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <div className="text-3xl mb-2 opacity-30">📋</div>
          <p className="text-xs">请先选择设备</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(templatesByVendor.entries()).map(([vendor, deviceTypeMap]) => (
            <div key={vendor} className="bg-slate-700/30 rounded p-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{getVendorIcon(vendor)}</span>
                <span className="text-sm font-medium text-white">{vendor}</span>
              </div>

              <div className="space-y-2">
                {Array.from(deviceTypeMap.entries()).map(([deviceType, { templates: deviceTemplates }]) => (
                  <div key={deviceType} className="space-y-1.5">
                    {deviceTemplates.map(template => {
                      const templateId = template.id || `${template.vendor}-${template.name}`;
                      const isSelected = selectedTemplateIds.has(templateId);

                      return (
                        <label
                          key={templateId}
                          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-500/30 border border-blue-500/50'
                              : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleTemplate(templateId)}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium">{template.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {deviceType} · {template.commands.length} 条命令
                            </div>
                          </div>
                        </label>
                      );
                    })}
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

// === ScheduledInspectionPanel 组件 ===
const ScheduledInspectionPanel: React.FC<{
  devices: OperationalDevice[];
  templates: CommandTemplate[];
  onClose: () => void;
}> = ({ devices, templates, onClose }) => {
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const availableDevices = useMemo(() => {
    return devices.filter(d => 
      d.management?.credentials?.username && 
      d.management?.credentials?.password
    );
  }, [devices]);

  const deviceByName = useMemo(() => {
    const map: Record<string, OperationalDevice> = {};
    devices.forEach(d => { map[d.name] = d; });
    return map;
  }, [devices]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    availableDevices.forEach(d => set.add((d as any).group || '未分组'));
    return ['all', ...Array.from(set).sort()];
  }, [availableDevices]);

  const visibleDevices = useMemo(() => {
    let list = availableDevices;
    if (groupFilter !== 'all') {
      list = list.filter(d => ((d as any).group || '未分组') === groupFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.management?.ipAddress?.includes(q));
    }
    return list;
  }, [availableDevices, groupFilter, search]);

  const templatesByVendor = useMemo(() => {
    const grouped = new Map<string, CommandTemplate[]>();
    templates.forEach(t => {
      if (!grouped.has(t.vendor)) {
        grouped.set(t.vendor, []);
      }
      grouped.get(t.vendor)!.push(t);
    });
    return grouped;
  }, [templates]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const localTasks = JSON.parse(localStorage.getItem('inspection-tasks') || '[]');
    try {
      const response = await apiFetch('/api/scheduler/inspection-tasks');
      const serverTasks = (response as any).tasks || [];
      setTasks([...localTasks, ...serverTasks]);
    } catch (error) {
      setTasks(localTasks);
    }
  };

  const handleCreateTask = async () => {
    if (selectedDeviceIds.size === 0) {
      showMessage('error', '请至少选择一个设备');
      return;
    }

    if (selectedTemplateIds.size === 0) {
      showMessage('error', '请至少选择一个命令模板');
      return;
    }

    try {
      const selectedDevices = availableDevices.filter(d => selectedDeviceIds.has(d.id));
      const selectedTemplates = templates.filter(t => 
        selectedTemplateIds.has(t.id || `${t.vendor}-${t.name}`)
      );

      const response = await apiFetch('/api/scheduler/inspection-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cronExpression,
          devices: selectedDevices.map(d => ({
            id: d.id,
            name: d.name,
            ip: d.management.ipAddress,
            vendor: d.vendor,
            credentials: d.management.credentials
          })),
          templates: selectedTemplates.map(t => ({
            id: t.id || `${t.vendor}-${t.name}`,
            name: t.name,
            vendor: t.vendor,
            commands: t.commands
          }))
        })
      }) as any;

      const newTask: InspectionTask = {
        id: response.taskId,
        cronExpression,
        devices: selectedDevices.map(d => d.name),
        templates: Array.from(selectedTemplateIds),
        createdAt: new Date().toISOString()
      };

      const updatedTasks = [...tasks, newTask];
      localStorage.setItem('inspection-tasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);

      setShowForm(false);
      setSelectedDeviceIds(new Set());
      setSelectedTemplateIds(new Set());
      setCronExpression('0 2 * * *');

      showMessage('success', '定时巡检任务创建成功');
    } catch (error: any) {
      showMessage('error', `创建失败: ${error.message}`);
    }
  };

  const handleDeleteTask = async (task: InspectionTask) => {
    if (!window.confirm('确认删除此定时巡检任务？')) {
      return;
    }

    try {
      await apiFetch(`/api/scheduler/inspection-task/${task.id}`, {
        method: 'DELETE'
      });

      const updatedTasks = tasks.filter(t => t.id !== task.id);
      localStorage.setItem('inspection-tasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);

      showMessage('success', '任务删除成功');
    } catch (error: any) {
      showMessage('error', `删除失败: ${error.message}`);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const cronPresets = [
    { label: '每天凌晨2点', value: '0 2 * * *' },
    { label: '每天上午9点', value: '0 9 * * *' },
    { label: '每周一上午9点', value: '0 9 * * 1' },
    { label: '每4小时', value: '0 */4 * * *' },
    { label: '每小时', value: '0 * * * *' },
  ];

  const explainCron = (expr: string) => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) return expr;
    const [min, hour, dom, mon, dow] = parts;

    const hm = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;

    if (dom === '*' && mon === '*' && dow === '*') {
      if (hour.includes('*/')) {
        const interval = hour.replace('*/', '');
        return `每${interval}小时`;
      }
      return `每天 ${hm}`;
    }
    if (dow !== '*') {
      const dowMap: Record<string, string> = { '0': '日', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六' };
      return `每周${dowMap[dow] || dow} ${hm}`;
    }
    if (dom !== '*' && mon === '*') return `每月${dom}日 ${hm}`;
    return expr;
  };

  const tableRows = useMemo(() => {
    const rows: Array<{
      task: InspectionTask;
      deviceName: string;
      ip?: string;
      templateNames: string[];
      lastInspection?: string;
    }> = [];

    tasks.forEach(task => {
      const deviceList = (task.devices && task.devices.length > 0) ? task.devices : [];
      const templateNames = (task.templates || []).map(tid => {
        const t = templates.find(tmpl => (tmpl.id || `${tmpl.vendor}-${tmpl.name}`) === tid);
        return t?.name || tid;
      });

      if (deviceList.length === 0 && task.deviceCount) {
        rows.push({
          task,
          deviceName: `${task.deviceCount} 台设备`,
          templateNames
        });
      } else {
        deviceList.forEach((dv: any) => {
          const name = typeof dv === 'string' ? dv : dv?.name;
          if (!name) return;
          const md = deviceByName[name];
          rows.push({
            task,
            deviceName: name,
            ip: md?.management?.ipAddress,
            templateNames,
            lastInspection: md?.runtime?.lastInspected
          });
        });
      }
    });

    return rows;
  }, [tasks, deviceByName, templates]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-lg font-semibold text-white">定时巡检管理</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              {showForm ? '取消' : '创建定时任务'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {message && (
          <div className={`mx-4 mt-4 p-3 rounded-md text-sm ${
            message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700' :
            message.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700' :
            'bg-blue-900/30 text-blue-300 border border-blue-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {showForm && (
            <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-700">
              <h4 className="text-base font-semibold mb-4 text-white">新建定时巡检任务</h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">选择设备</label>
                {availableDevices.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无已配置SSH凭证的设备</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {groups.map(g => (
                        <button
                          key={g}
                          onClick={() => setGroupFilter(g)}
                          className={`px-2 py-1 rounded text-xs ${
                            groupFilter === g ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          }`}
                        >
                          {g === 'all' ? '全部' : g}
                        </button>
                      ))}
                      <div className="ml-auto flex items-center gap-2">
                        <input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="搜索..."
                          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white w-32"
                        />
                        <span className="text-slate-400 text-xs">已选 {selectedDeviceIds.size} 台</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto p-2 bg-slate-900/40 rounded border border-slate-700">
                      {visibleDevices.map(device => (
                        <label
                          key={device.id}
                          className="flex items-center gap-2 cursor-pointer p-2 bg-slate-700 rounded hover:bg-slate-600 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDeviceIds.has(device.id)}
                            onChange={() => {
                              const next = new Set(selectedDeviceIds);
                              if (next.has(device.id)) {
                                next.delete(device.id);
                              } else {
                                next.add(device.id);
                              }
                              setSelectedDeviceIds(next);
                            }}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-white text-xs truncate">{device.name}</span>
                          <code className="text-xs text-slate-400 ml-auto">{device.management?.ipAddress}</code>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">选择命令模板</label>
                {templates.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无可用模板</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-auto p-2 bg-slate-900/40 rounded border border-slate-700">
                    {Array.from(templatesByVendor.entries()).map(([vendor, vendorTemplates]) => (
                      <div key={vendor} className="bg-slate-700/30 rounded p-2">
                        <div className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                          <span>{getVendorIcon(vendor)}</span>
                          <span>{vendor}</span>
                        </div>
                        <div className="space-y-1">
                          {vendorTemplates.map(template => {
                            const templateId = template.id || `${template.vendor}-${template.name}`;
                            return (
                              <label
                                key={templateId}
                                className="flex items-center gap-2 cursor-pointer p-1.5 bg-slate-700/50 rounded hover:bg-slate-600 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedTemplateIds.has(templateId)}
                                  onChange={() => {
                                    const next = new Set(selectedTemplateIds);
                                    if (next.has(templateId)) {
                                      next.delete(templateId);
                                    } else {
                                      next.add(templateId);
                                    }
                                    setSelectedTemplateIds(next);
                                  }}
                                  className="w-3.5 h-3.5"
                                />
                                <span className="text-white">{template.name}</span>
                                <span className="text-slate-400 text-xs ml-auto">
                                  {template.commands.length} 条命令
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Cron 表达式</label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={e => setCronExpression(e.target.value)}
                  placeholder="0 2 * * *"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-white text-sm mb-2"
                />
                <p className="text-xs text-slate-400 mb-2">{explainCron(cronExpression)}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-slate-400 text-xs mr-1">快速选择:</span>
                  {cronPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => setCronExpression(preset.value)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                创建任务
              </button>
            </div>
          )}

          <div>
            <h4 className="text-base font-semibold text-white mb-3">当前任务列表</h4>
            {tasks.length === 0 ? (
              <div className="text-center py-12 bg-slate-800 rounded-lg text-slate-400">
                <p className="text-sm">暂无定时巡检任务</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700/50 text-slate-200">
                      <th className="px-3 py-2 text-left">任务ID</th>
                      <th className="px-3 py-2 text-left">Cron</th>
                      <th className="px-3 py-2 text-left">计划</th>
                      <th className="px-3 py-2 text-left">设备</th>
                      <th className="px-3 py-2 text-left">IP</th>
                      <th className="px-3 py-2 text-left">命令模板</th>
                      <th className="px-3 py-2 text-left">最后巡检</th>
                      <th className="px-3 py-2 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => (
                      <tr
                        key={`${row.task.id}-${row.deviceName}-${idx}`}
                        className="border-t border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <td className="px-3 py-2 text-slate-300">{row.task.id.substring(0, 8)}...</td>
                        <td className="px-3 py-2 text-slate-300 font-mono">{row.task.cronExpression}</td>
                        <td className="px-3 py-2 text-slate-300">{explainCron(row.task.cronExpression)}</td>
                        <td className="px-3 py-2 text-white">{row.deviceName}</td>
                        <td className="px-3 py-2 text-slate-300">{row.ip || '-'}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.templateNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.templateNames.map((name, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-blue-500/20 rounded text-xs">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {row.lastInspection || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDeleteTask(row.task)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// === DeviceInspectionView 主组件 ===
const DeviceInspectionView: React.FC<{
  devices: OperationalDevice[];
  onUpdateDevice: (d: OperationalDevice) => void;
}> = ({ devices, onUpdateDevice }) => {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [isInspecting, setIsInspecting] = useState(false);
  const [logModal, setLogModal] = useState<{ nodeName: string; log: any } | null>(null);
  const [historyModalDevice, setHistoryModalDevice] = useState<OperationalDevice | null>(null);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [templates, setTemplates] = useState<CommandTemplate[]>([]);

  const manageableDevices = useMemo(
    () => devices.filter(d => d.vendor !== Vendor.Generic),
    [devices]
  );

  const selectedDevices = useMemo(
    () => manageableDevices.filter(d => selectedDeviceIds.has(d.id)),
    [manageableDevices, selectedDeviceIds]
  );

  const onUpdateDeviceRuntime = useCallback(
    (deviceId: string, updater: (prev?: RuntimeState) => RuntimeState) => {
      const dev = devices.find(d => d.id === deviceId);
      if (!dev) return;
      const next: OperationalDevice = { ...dev, runtime: updater(dev.runtime) };
      onUpdateDevice(next);
    },
    [devices, onUpdateDevice]
  );

  const onUpdateDeviceRuntimeRef = useRef(onUpdateDeviceRuntime);
  onUpdateDeviceRuntimeRef.current = onUpdateDeviceRuntime;

  // 加载模板
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const stored = localStorage.getItem('inspection-templates');
        if (stored) {
          setTemplates(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    };

    loadTemplates();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inspection-templates') {
        loadTemplates();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const pollInterval = setInterval(loadTemplates, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // WebSocket 监听巡检进度
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = location.hostname;
      const wsUrl = `${protocol}//${hostname}:3001/api/ws/inspection-progress`;
      ws = new WebSocket(wsUrl);
      ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          const { deviceId, progress, status, log, lastInspected } = msg;
          if (!deviceId) return;
          onUpdateDeviceRuntimeRef.current(deviceId, prev => {
            const newLog = log
              ? {
                  ...(typeof prev?.inspectionLog === 'object' && prev.inspectionLog !== null
                    ? prev.inspectionLog
                    : {}),
                  ...log,
                }
              : prev?.inspectionLog;
            return {
              ...prev,
              inspectionProgress: typeof progress === 'number' ? progress : prev?.inspectionProgress,
              inspectionStatus: status || prev?.inspectionStatus,
              inspectionLog: newLog,
              lastInspected: lastInspected || prev?.lastInspected,
            };
          });
        } catch (e) {}
      };
    } catch (e) {}
    return () => ws && ws.close();
  }, []);

  const toggleDevice = (deviceId: string) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const toggleDevices = (deviceIds: string[], selected: boolean) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      deviceIds.forEach(id => {
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  // 批量巡检
  const handleBatchInspect = async () => {
    if (selectedDeviceIds.size === 0) {
      alert('请先选择要巡检的设备');
      return;
    }

    if (selectedTemplateIds.size === 0) {
      alert('请先选择命令模板');
      return;
    }

    const tasksToInspect = selectedDevices.filter(
      d => d.management?.credentials?.username && d.management?.credentials?.password
    );

    if (tasksToInspect.length === 0) {
      alert('所选设备均未配置SSH凭证');
      return;
    }

    if (tasksToInspect.length < selectedDevices.length) {
      alert(
        `${selectedDevices.length - tasksToInspect.length} 台设备缺少SSH凭证，将被跳过`
      );
    }

    setIsInspecting(true);

    // 初始化状态
    tasksToInspect.forEach(device => {
      onUpdateDevice({
        ...device,
        runtime: {
          ...device.runtime,
          inspectionStatus: 'pending',
          inspectionProgress: 0,
          inspectionLog: {},
        },
      });
    });

    // 获取模板命令
    const selectedTemplates = templates.filter(t => 
      selectedTemplateIds.has(t.id || `${t.vendor}-${t.name}`)
    );

    await limitConcurrency(
      tasksToInspect,
      async device => {
        try {
          // 找到该设备对应的模板
          const deviceTemplates = selectedTemplates.filter(t => t.vendor === device.vendor);
          const allCommands = deviceTemplates.flatMap(t => t.commands);
          const categories = Array.from(new Set(allCommands.map(cmd => cmd.category)));

          const payload = {
            deviceId: device.id,
            host: device.management.ipAddress,
            username: device.management.credentials?.username,
            password: device.management.credentials?.password,
            vendor: device.vendor,
            categories,
            commands: allCommands.map(cmd => ({
              name: cmd.name,
              cmd: cmd.cmd,
              parse: cmd.parse,
              category: cmd.category,
            })),
          };

          await apiFetch(
            '/api/inspect',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
            600000
          );
        } catch (err: any) {
          onUpdateDeviceRuntime(device.id, prev => ({
            ...prev,
            inspectionStatus: 'failed',
            inspectionProgress: 100,
            inspectionLog: { error: { 'Request Failed': err.message || String(err) } },
            lastInspected: new Date().toLocaleString(),
          }));
        }
      },
      3
    );

    setTimeout(() => setIsInspecting(false), 5000);
  };

  // 单个设备巡检
  const handleSingleInspect = async (device: OperationalDevice) => {
    if (!device.management?.credentials?.username || !device.management?.credentials?.password) {
      alert('该设备未配置SSH凭证');
      return;
    }

    if (selectedTemplateIds.size === 0) {
      alert('请先选择命令模板');
      return;
    }

    onUpdateDevice({
      ...device,
      runtime: {
        ...device.runtime,
        inspectionStatus: 'pending',
        inspectionProgress: 0,
        inspectionLog: {},
      },
    });

    try {
      const selectedTemplates = templates.filter(
        t => selectedTemplateIds.has(t.id || `${t.vendor}-${t.name}`) && t.vendor === device.vendor
      );
      const allCommands = selectedTemplates.flatMap(t => t.commands);
      const categories = Array.from(new Set(allCommands.map(cmd => cmd.category)));

      const payload = {
        deviceId: device.id,
        host: device.management.ipAddress,
        username: device.management.credentials?.username,
        password: device.management.credentials?.password,
        vendor: device.vendor,
        categories,
        commands: allCommands.map(cmd => ({
          name: cmd.name,
          cmd: cmd.cmd,
          parse: cmd.parse,
          category: cmd.category,
        })),
      };

      await apiFetch(
        '/api/inspect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        600000
      );
    } catch (err: any) {
      onUpdateDeviceRuntime(device.id, prev => ({
        ...prev,
        inspectionStatus: 'failed',
        inspectionProgress: 100,
        inspectionLog: { error: { 'Request Failed': err.message || String(err) } },
        lastInspected: new Date().toLocaleString(),
      }));
    }
  };

  const statistics = useMemo(() => {
    const stats = {
      total: manageableDevices.length,
      selected: selectedDeviceIds.size,
      inspecting: 0,
      success: 0,
      failed: 0,
    };

    manageableDevices.forEach(d => {
      const status = d.runtime?.inspectionStatus;
      if (status === 'pending' || status === 'inspecting') stats.inspecting++;
      if (status === 'success') stats.success++;
      if (status === 'failed') stats.failed++;
    });

    if (stats.inspecting === 0 && isInspecting) setIsInspecting(false);

    return stats;
  }, [manageableDevices, selectedDeviceIds, isInspecting]);

  return (
    <Fragment>
      <div className="p-6 bg-slate-900 rounded-lg space-y-4">
        {/* 头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">设备巡检</h2>
            <p className="text-xs text-slate-400 mt-1">
              {statistics.total} 台设备 · {statistics.selected} 已选 · {statistics.inspecting} 巡检中
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSchedulePanel(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm transition-colors"
            >
              定时巡检
            </button>
            <button
              onClick={handleBatchInspect}
              disabled={isInspecting || selectedDeviceIds.size === 0 || selectedTemplateIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              {isInspecting && (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isInspecting ? '巡检中...' : '批量巡检'}
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '总数', value: statistics.total, color: 'slate' },
            { label: '已选', value: statistics.selected, color: statistics.selected > 0 ? 'blue' : 'slate' },
            { label: '巡检中', value: statistics.inspecting, color: statistics.inspecting > 0 ? 'blue' : 'slate' },
            { label: '成功', value: statistics.success, color: statistics.success > 0 ? 'green' : 'slate' },
            { label: '失败', value: statistics.failed, color: statistics.failed > 0 ? 'red' : 'slate' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-800 rounded p-3 border border-slate-700">
              <div className="text-xs text-slate-400">{stat.label}</div>
              <div
                className={`text-2xl font-bold ${
                  stat.color === 'green'
                    ? 'text-green-400'
                    : stat.color === 'blue'
                    ? 'text-blue-400'
                    : stat.color === 'red'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* 左右分栏布局 */}
        <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 350px)' }}>
          {/* 左侧：设备树 + 模板选择 */}
          <div className="col-span-3 space-y-4 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <DeviceTreeSelector
                devices={manageableDevices}
                selectedDeviceIds={selectedDeviceIds}
                onToggleDevice={toggleDevice}
                onToggleAll={toggleDevices}
              />
            </div>
            <div className="h-64 overflow-y-auto">
              <TemplateSelector
                selectedTemplateIds={selectedTemplateIds}
                onToggleTemplate={toggleTemplate}
                devices={manageableDevices}
                selectedDeviceIds={selectedDeviceIds}
              />
            </div>
          </div>

          {/* 右侧：设备列表 */}
          <div className="col-span-9 overflow-hidden">
            <div className="bg-slate-800 border border-slate-700 rounded-lg h-full flex flex-col">
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-sm font-semibold text-white">
                  设备列表 ({selectedDevices.length})
                </h4>
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedDevices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <div className="text-4xl mb-3 opacity-30">📱</div>
                    <p className="text-sm">请从左侧选择设备</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700/50 text-xs sticky top-0">
                      <tr>
                        <th className="p-2 text-left text-slate-400">主机名</th>
                        <th className="p-2 text-left text-slate-400">IP地址</th>
                        <th className="p-2 text-left text-slate-400">厂商</th>
                        <th className="p-2 text-left text-slate-400">设备类型</th>
                        <th className="p-2 text-left text-slate-400">状态</th>
                        <th className="p-2 text-left text-slate-400">最后巡检</th>
                        <th className="p-2 text-center text-slate-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDevices.map(device => {
                        const deviceType = (device as any).deviceType || (device as any).type || 'Unknown';
                        
                        return (
                          <tr
                            key={device.id}
                            className="device-row border-t border-slate-700/50"
                          >
                            <td className="p-2">
                              <span className="text-white">{device.name}</span>
                            </td>
                            <td className="p-2">
                              <code className="text-xs bg-slate-900/50 px-1.5 py-0.5 rounded text-cyan-400">
                                {device.management.ipAddress}
                              </code>
                            </td>
                            <td className="p-2">
                              <span className="text-xs text-slate-300">
                                {getVendorIcon(device.vendor)} {device.vendor}
                              </span>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">
                                  {getDeviceTypeIcon(deviceType)}
                                </span>
                                <span className="text-xs text-slate-300">{deviceType}</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    device.runtime?.inspectionStatus === 'success'
                                      ? 'bg-green-500'
                                      : device.runtime?.inspectionStatus === 'failed'
                                      ? 'bg-red-500'
                                      : device.runtime?.inspectionStatus === 'pending' ||
                                        device.runtime?.inspectionStatus === 'inspecting'
                                      ? 'bg-blue-400 animate-pulse'
                                      : 'bg-slate-500'
                                  }`}
                                />
                                <span className="text-xs">
                                  {device.runtime?.inspectionStatus === 'success' && '成功'}
                                  {device.runtime?.inspectionStatus === 'failed' && '失败'}
                                  {(device.runtime?.inspectionStatus === 'pending' ||
                                    device.runtime?.inspectionStatus === 'inspecting') &&
                                    `巡检中 ${(device.runtime?.inspectionProgress || 0).toFixed(0)}%`}
                                  {!device.runtime?.inspectionStatus && '未检测'}
                                </span>
                              </div>
                              {(device.runtime?.inspectionStatus === 'pending' ||
                                device.runtime?.inspectionStatus === 'inspecting') && (
                                <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                                  <div
                                    className="progress-bar h-1 rounded-full"
                                    style={{ width: `${device.runtime.inspectionProgress || 0}%` }}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-xs text-slate-400">
                              {device.runtime?.lastInspected || '—'}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleSingleInspect(device)}
                                  disabled={
                                    device.runtime?.inspectionStatus === 'pending' ||
                                    device.runtime?.inspectionStatus === 'inspecting'
                                  }
                                  className="text-xs text-green-400 hover:text-green-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                                >
                                  巡检
                                </button>
                                <button
                                  onClick={() =>
                                    setLogModal({
                                      nodeName: device.name,
                                      log: device.runtime?.inspectionLog || 'No log available.',
                                    })
                                  }
                                  disabled={
                                    !device.runtime?.inspectionLog ||
                                    Object.keys(device.runtime.inspectionLog).length === 0
                                  }
                                  className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                                >
                                  日志
                                </button>
                                <button
                                  onClick={() => setHistoryModalDevice(device)}
                                  className="text-xs text-purple-400 hover:text-purple-300"
                                >
                                  历史
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 模态框 */}
      {logModal && (
        <LogModal
          log={logModal.log}
          nodeName={logModal.nodeName}
          onClose={() => setLogModal(null)}
        />
      )}
      {historyModalDevice && (
        <InspectionHistoryModal
          device={historyModalDevice}
          onClose={() => setHistoryModalDevice(null)}
          onOpenLog={log => setLogModal({ nodeName: historyModalDevice.name, log })}
        />
      )}
      {showSchedulePanel && (
        <ScheduledInspectionPanel
          devices={manageableDevices}
          templates={templates}
          onClose={() => setShowSchedulePanel(false)}
        />
      )}
    </Fragment>
  );
};

export default DeviceInspectionView;