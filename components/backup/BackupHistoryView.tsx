import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ManagedDevice, Vendor } from '../../types';

const API_BASE_URL = '/api';

interface Backup {
  id: string;
  filename: string;
  filepath: string;
  timestamp: string;
  size: number;
}

interface BackupHistoryViewProps {
  onCompare: (backup1: Backup, backup2: Backup) => void;
  managedDevices?: ManagedDevice[];
}

interface TreeNode {
  id: string;
  type: 'group' | 'vendor' | 'deviceType' | 'device';
  label: string;
  vendor?: Vendor;
  device?: ManagedDevice;
  children?: TreeNode[];
  count?: number;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

// === 工具函数 ===
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
  };
  return icons[type] || '⚙️';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// === 设备树状选择器组件（支持多选） ===
const DeviceTreeSelector: React.FC<{
  devices: ManagedDevice[];
  selectedDeviceIds: Set<string>;
  onToggleDevice: (deviceId: string) => void;
  onToggleAll: (deviceIds: string[], selected: boolean) => void;
  highlightDeviceId?: string | null;
}> = ({ devices, selectedDeviceIds, onToggleDevice, onToggleAll, highlightDeviceId }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // 构建树状结构
  const treeData = useMemo(() => {
    const tree: TreeNode[] = [];
    const groupMap = new Map<string, Map<Vendor, Map<string, ManagedDevice[]>>>();

    devices.forEach(device => {
      const group = (device as any).group || '未分组';
      const deviceType = (device as any).deviceType || (device as any).type || 'Unknown';

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
            type: 'deviceType',
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

  // 默认展开所有节点
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
    const isHighlighted = node.type === 'device' && node.device?.id === highlightDeviceId;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isHighlighted ? 'bg-purple-500/30 border-l-2 border-purple-500' : 'hover:bg-slate-700/50'
          }`}
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
            {node.type === 'vendor' && <span className="text-base">{getVendorIcon(node.vendor!)}</span>}
            {node.type === 'deviceType' && <span className="text-base">{getDeviceTypeIcon(node.label)}</span>}
            {node.type === 'device' && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />}

            <span className={`text-sm truncate ${
              node.type === 'device' ? 'text-slate-200' : 'text-white font-medium'
            }`}>
              {node.label}
            </span>

            {node.type !== 'device' && node.count !== undefined && (
              <span className="text-xs text-slate-500 ml-auto">({node.count})</span>
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
        <h4 className="text-sm font-semibold text-white mb-2">设备列表</h4>
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

// === 备份卡片组件 ===
const BackupCard: React.FC<{
  backup: Backup;
  index: number;
  totalCount: number;
  isSelected: boolean;
  onSelect: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
}> = ({ backup, index, totalCount, isSelected, onSelect, onDelete }) => {
  return (
    <div
      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-900/50 border-blue-500'
          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
      }`}
      onClick={() => onSelect(backup)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            isSelected ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
          }`}>
            {totalCount - index}
          </div>
          <div>
            <p className="text-xs text-slate-400">{formatDate(backup.timestamp)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSelected && (
            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">
              已选
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(backup);
            }}
            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
          >
            删除
          </button>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">文件:</span>
          <code className="text-xs bg-slate-900/50 px-1 py-0.5 rounded text-cyan-400 flex-1 truncate">
            {backup.filename}
          </code>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">大小:</span>
          <span className="text-white">{formatSize(backup.size)}</span>
        </div>
      </div>
    </div>
  );
};

// === 主组件 ===
const BackupHistoryView: React.FC<BackupHistoryViewProps> = ({ onCompare, managedDevices = [] }) => {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [viewingDeviceId, setViewingDeviceId] = useState<string | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedBackups, setSelectedBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<Map<string, 'pending' | 'success' | 'failed'>>(new Map());
  const [message, setMessage] = useState<Message | null>(null);

  const selectedDevices = useMemo(
    () => managedDevices.filter(d => selectedDeviceIds.has(d.id)),
    [managedDevices, selectedDeviceIds]
  );

  const viewingDevice = useMemo(
    () => managedDevices.find(d => d.id === viewingDeviceId),
    [managedDevices, viewingDeviceId]
  );

  const loadBackupsForDevice = async (device: ManagedDevice) => {
    setLoading(true);
    setViewingDeviceId(device.id);
    setSelectedBackups([]);
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`${API_BASE_URL}/device/${device.name}/backups?t=${timestamp}`);
      const serverBackups = response.data.backups || [];
      setBackups(serverBackups);
    } catch (error) {
      console.error('获取备份历史失败:', error);
      setBackups([]);
      showMessage('error', '获取备份历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupSelect = (backup: Backup) => {
    if (selectedBackups.find(b => b.id === backup.id)) {
      setSelectedBackups(selectedBackups.filter(b => b.id !== backup.id));
    } else if (selectedBackups.length < 2) {
      setSelectedBackups([...selectedBackups, backup]);
    } else {
      showMessage('info', '最多只能选择两个备份进行对比');
    }
  };

  const handleCompare = () => {
    if (selectedBackups.length !== 2) {
      showMessage('info', '请选择两个备份进行对比');
      return;
    }
    onCompare(selectedBackups[0], selectedBackups[1]);
  };

  const handleDeleteBackup = async (backup: Backup) => {
    if (!window.confirm(`确认删除备份文件 "${backup.filename}" ？`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/backup`, {
        data: { filepath: backup.filepath }
      });

      if (viewingDevice) {
        await loadBackupsForDevice(viewingDevice);
      }

      setSelectedBackups(selectedBackups.filter(b => b.id !== backup.id));
      showMessage('success', '删除成功');
    } catch (error: any) {
      showMessage('error', `删除失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSingleBackup = async (device: ManagedDevice) => {
    if (!device.management?.credentials?.username || !device.management?.credentials?.password) {
      showMessage('error', '设备缺少SSH凭证');
      return;
    }

    setBackupProgress(prev => new Map(prev).set(device.id, 'pending'));
    
    try {
      await axios.post(`${API_BASE_URL}/device/backup`, {
        name: device.name,
        ip: device.management.ipAddress,
        port: device.management.credentials?.port || 22,
        vendor: device.vendor,
        username: device.management.credentials?.username,
        password: device.management.credentials?.password,
      });
      
      setBackupProgress(prev => new Map(prev).set(device.id, 'success'));
      showMessage('success', `${device.name} 备份成功`);
      
      // 如果正在查看该设备的备份，刷新列表
      if (viewingDeviceId === device.id) {
        await loadBackupsForDevice(device);
      }
    } catch (error: any) {
      setBackupProgress(prev => new Map(prev).set(device.id, 'failed'));
      showMessage('error', `${device.name} 备份失败: ${error.response?.data?.error || error.message}`);
    }

    // 3秒后清除进度状态
    setTimeout(() => {
      setBackupProgress(prev => {
        const next = new Map(prev);
        next.delete(device.id);
        return next;
      });
    }, 3000);
  };

  const handleBatchBackup = async () => {
    if (selectedDeviceIds.size === 0) {
      showMessage('error', '请至少选择一个设备');
      return;
    }

    const devicesToBackup = selectedDevices.filter(
      d => d.management?.credentials?.username && d.management?.credentials?.password
    );

    if (devicesToBackup.length === 0) {
      showMessage('error', '所选设备均未配置SSH凭证');
      return;
    }

    if (devicesToBackup.length < selectedDevices.length) {
      showMessage('info', `${selectedDevices.length - devicesToBackup.length} 台设备缺少SSH凭证，将被跳过`);
    }

    setBackingUp(true);
    let successCount = 0;
    let failCount = 0;

    showMessage('info', `正在备份 ${devicesToBackup.length} 台设备...`);

    for (const device of devicesToBackup) {
      setBackupProgress(prev => new Map(prev).set(device.id, 'pending'));
      
      try {
        await axios.post(`${API_BASE_URL}/device/backup`, {
          name: device.name,
          ip: device.management.ipAddress,
          port: device.management.credentials?.port || 22,
          vendor: device.vendor,
          username: device.management.credentials?.username,
          password: device.management.credentials?.password,
        });
        
        setBackupProgress(prev => new Map(prev).set(device.id, 'success'));
        successCount++;
      } catch (error: any) {
        console.error(`${device.name} 备份失败:`, error);
        setBackupProgress(prev => new Map(prev).set(device.id, 'failed'));
        failCount++;
      }
    }

    setBackingUp(false);

    if (failCount === 0) {
      showMessage('success', `批量备份完成！成功 ${successCount} 台`);
    } else {
      showMessage('error', `备份完成：成功 ${successCount} 台，失败 ${failCount} 台`);
    }

    // 如果正在查看某个设备的备份，刷新列表
    if (viewingDevice && devicesToBackup.find(d => d.id === viewingDevice.id)) {
      await loadBackupsForDevice(viewingDevice);
    }

    // 3秒后清除进度状态
    setTimeout(() => {
      setBackupProgress(new Map());
    }, 3000);
  };

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

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const statistics = useMemo(() => {
    return {
      totalDevices: managedDevices.length,
      selectedDevices: selectedDeviceIds.size,
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
    };
  }, [managedDevices, selectedDeviceIds, backups]);

  return (
    <div className="p-6 bg-slate-900 rounded-lg space-y-4">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">备份管理</h2>
          <p className="text-xs text-slate-400 mt-1">
            {statistics.totalDevices} 台设备 · {statistics.selectedDevices} 已选
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchBackup}
            disabled={selectedDeviceIds.size === 0 || backingUp}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              selectedDeviceIds.size === 0 || backingUp
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {backingUp ? '备份中...' : `批量备份 (${selectedDeviceIds.size})`}
          </button>
          {viewingDevice && (
            <button
              onClick={handleCompare}
              disabled={selectedBackups.length !== 2}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                selectedBackups.length === 2
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              对比备份 ({selectedBackups.length}/2)
            </button>
          )}
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700' :
          message.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700' :
          'bg-blue-900/30 text-blue-300 border border-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-slate-400">设备总数</div>
          <div className="text-2xl font-bold text-slate-400">{statistics.totalDevices}</div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-slate-400">已选设备</div>
          <div className="text-2xl font-bold text-blue-400">{statistics.selectedDevices}</div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-slate-400">备份数量</div>
          <div className="text-2xl font-bold text-green-400">{statistics.totalBackups}</div>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <div className="text-xs text-slate-400">备份大小</div>
          <div className="text-lg font-bold text-purple-400">{formatSize(statistics.totalSize)}</div>
        </div>
      </div>

      {/* 左右分栏布局 */}
      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 350px)' }}>
        {/* 左侧：设备树 */}
        <div className="col-span-3 overflow-hidden">
          <DeviceTreeSelector
            devices={managedDevices}
            selectedDeviceIds={selectedDeviceIds}
            onToggleDevice={toggleDevice}
            onToggleAll={toggleDevices}
            highlightDeviceId={viewingDeviceId}
          />
        </div>

        {/* 右侧：设备列表和备份历史 */}
        <div className="col-span-9 overflow-hidden flex flex-col gap-4">
          {/* 设备列表 */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-700">
              <h4 className="text-sm font-semibold text-white">
                已选设备 ({selectedDevices.length})
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
                      <th className="p-2 text-left text-slate-400">状态</th>
                      <th className="p-2 text-center text-slate-400">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDevices.map(device => {
                      const status = backupProgress.get(device.id);
                      return (
                        <tr
                          key={device.id}
                          className="border-t border-slate-700/50 hover:bg-slate-700/30"
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
                            {status === 'pending' && (
                              <span className="text-xs text-blue-400">备份中...</span>
                            )}
                            {status === 'success' && (
                              <span className="text-xs text-green-400">✓ 成功</span>
                            )}
                            {status === 'failed' && (
                              <span className="text-xs text-red-400">✗ 失败</span>
                            )}
                            {!status && <span className="text-xs text-slate-500">—</span>}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSingleBackup(device)}
                                disabled={status === 'pending'}
                                className="text-xs text-green-400 hover:text-green-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                              >
                                备份
                              </button>
                              <button
                                onClick={() => loadBackupsForDevice(device)}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                查看
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

          {/* 备份历史 */}
          
          {viewingDevice && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg flex-1 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-700 flex justify-between items-center">
                <h4 className="text-sm font-semibold text-white">
                  {viewingDevice.name} 的备份历史
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadBackupsForDevice(viewingDevice)}
                    disabled={loading}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-600"
                  >
                    {loading ? '刷新中...' : '刷新'}
                  </button>
                  <button
                    onClick={() => {
                      setViewingDeviceId(null);
                      setBackups([]);
                      setSelectedBackups([]);
                    }}
                    className="text-slate-400 hover:text-white text-lg w-6 h-6 flex items-center justify-center"
                    title="关闭"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs">加载中...</p>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <div className="text-3xl mb-2 opacity-30">📭</div>
                    <p className="text-xs">暂无备份记录</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {backups.map((backup, index) => (
                      <BackupCard
                        key={backup.id || index}
                        backup={backup}
                        index={index}
                        totalCount={backups.length}
                        isSelected={!!selectedBackups.find(b => b.id === backup.id)}
                        onSelect={handleBackupSelect}
                        onDelete={handleDeleteBackup}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupHistoryView;