import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ManagedDevice } from '../../types';

// 使用相对路径，支持部署到服务器
const API_BASE_URL = '/api';

// 兼容服务端返回和本地存储的任务结构
interface TaskDeviceRef { id?: string; name?: string }
interface Task {
  id: string;
  cronExpression: string;
  // 可能是字符串（本地存储的仅名称），也可能是对象数组（服务端返回）
  devices?: (string | TaskDeviceRef)[];
  deviceCount?: number;
  createdAt: string;
}

interface SchedulerViewProps {
  managedDevices: ManagedDevice[];
}

const SchedulerView: React.FC<SchedulerViewProps> = ({ managedDevices }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  // 设备 -> 最近一次备份时间
  const [lastBackupMap, setLastBackupMap] = useState<Record<string, string>>({});
  // 分组筛选与搜索
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // 筛选出有管理信息的设备（兼容两种结构：management.credentials.username 或 management.username）
  const availableDevices = useMemo(() => {
    return managedDevices.filter(d => {
      const m: any = d.management;
      const hasIP = !!m?.ipAddress;
      const hasUser = !!(m?.credentials?.username ?? m?.username);
      return hasIP && hasUser;
    });
  }, [managedDevices]);

  // 便捷索引
  const deviceByName = useMemo(() => {
    const map: Record<string, ManagedDevice> = {};
    managedDevices.forEach(d => { map[d.name] = d; });
    return map;
  }, [managedDevices]);

  // 分组列表（从设备管理的 group 字段获取）
  const groups = useMemo(() => {
    const set = new Set<string>();
    availableDevices.forEach(d => set.add(d.group || 'default'));
    return ['all', ...Array.from(set).sort()];
  }, [availableDevices]);

  // 当前可见设备（按分组+搜索过滤）
  const visibleDevices = useMemo(() => {
    let list = availableDevices;
    if (groupFilter !== 'all') {
      list = list.filter(d => (d.group || 'default') === groupFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.management?.ipAddress?.includes(q));
    }
    return list;
  }, [availableDevices, groupFilter, search]);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    // 根据任务中的设备，批量拉取最近备份时间
    const names = new Set<string>();
    tasks.forEach(t => {
      (t.devices || []).forEach((dv: any) => {
        const name = typeof dv === 'string' ? dv : dv?.name;
        if (name) names.add(name);
      });
    });
    if (names.size > 0) {
      fetchLastBackups(Array.from(names));
    }
  }, [tasks]);

  const loadTasks = async () => {
    const localTasks = JSON.parse(localStorage.getItem('backup-tasks') || '[]');
    try {
      const response = await axios.get(`${API_BASE_URL}/scheduler/tasks`);
      const serverTasks = response.data.tasks || [];
      setTasks([...localTasks, ...serverTasks]);
    } catch (error) {
      setTasks(localTasks);
    }
  };

  const fetchLastBackups = async (deviceNames: string[]) => {
    try {
      const results = await Promise.allSettled(
        deviceNames.map(name => axios.get(`${API_BASE_URL}/device/${encodeURIComponent(name)}/backups?t=${Date.now()}`))
      );
      const map: Record<string, string> = {};
      results.forEach((res, idx) => {
        const name = deviceNames[idx];
        if (res.status === 'fulfilled') {
          const backups = (res.value.data?.backups || []) as { timestamp: string }[];
          if (backups.length > 0) {
            // 取最新时间
            const latest = backups.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b);
            map[name] = latest.timestamp;
          }
        }
      });
      setLastBackupMap(prev => ({ ...prev, ...map }));
    } catch {}
  };

  const handleDeviceToggle = (deviceId: string) => {
    if (selectedDevices.includes(deviceId)) {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    } else {
      setSelectedDevices([...selectedDevices, deviceId]);
    }
  };

  const handleCreateTask = async () => {
    if (selectedDevices.length === 0) {
      showMessage('error', '请至少选择一个设备');
      return;
    }

    try {
      // 从 prop 中获取选中的完整设备对象
      const selectedDeviceObjects = availableDevices.filter(d => 
        selectedDevices.includes(d.id)
      );
      
      if (selectedDeviceObjects.length === 0) {
        showMessage('error', '请选择已配置管理凭证的设备');
        return;
      }
      
      // 规范化设备对象，确保后端能拿到 credentials 与端口
      const normalizedDevices = selectedDeviceObjects.map((d: any) => ({
        ...d,
        management: {
          ipAddress: d.management?.ipAddress,
          credentials: {
            username: d.management?.credentials?.username ?? d.management?.username ?? 'admin',
            password: d.management?.credentials?.password ?? d.management?.password ?? '',
            port: d.management?.credentials?.port ?? d.management?.port ?? 22
          }
        }
      }));

      const response = await axios.post(`${API_BASE_URL}/scheduler/task`, {
        cronExpression,
        devices: normalizedDevices
      });

      const newTask: Task = {
        id: response.data.taskId,
        cronExpression,
        devices: selectedDeviceObjects.map(d => d.name),
        createdAt: new Date().toISOString()
      };

      // 保存到 localStorage
      const updatedTasks = [...tasks, newTask];
      localStorage.setItem('backup-tasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);

      setShowForm(false);
      setSelectedDevices([]);
      setCronExpression('0 2 * * *');

      showMessage('success', '定时任务创建成功');
    } catch (error: any) {
      showMessage('error', `创建失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm('确认删除此定时任务？')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/scheduler/task/${task.id}`);
      
      const updatedTasks = tasks.filter(t => t.id !== task.id);
      localStorage.setItem('backup-tasks', JSON.stringify(updatedTasks));
      setTasks(updatedTasks);
      
      showMessage('success', '任务删除成功');
    } catch (error: any) {
      showMessage('error', `删除失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const cronPresets = [
    { label: '每天凌晨2点', value: '0 2 * * *' },
    { label: '每周日凌晨2点', value: '0 2 * * 0' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每天中午12点', value: '0 12 * * *' },
    { label: '每月1号凌晨2点', value: '0 2 1 * *' }
  ];

  // 简单的 Cron 解释器（支持常见 5 字段表达式）
  const explainCron = (expr: string) => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) return expr;
    const [min, hour, dom, mon, dow] = parts;

    const hm = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    const m = mon === '*' ? '' : `${mon}月`;

    if (dom === '*' && mon === '*' && dow === '*') return `每天 ${hm}`;
    if (dow !== '*') return `每周${dowToCN(dow)} ${hm}`;
    if (dom !== '*' && mon === '*') return `每月${dom}日 ${hm}`;
    if (dom !== '*' && mon !== '*') return `每年${m}${dom}日 ${hm}`;
    if (dom === '*' && mon !== '*') return `每年${m}的每天 ${hm}`;
    return expr;
  };

  const dowToCN = (v: string) => {
    const map: Record<string, string> = { '0': '日', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六' };
    return map[v] ?? v;
  };

  // 将任务扁平为表格行
  const tableRows = useMemo(() => {
    const rows: Array<{
      task: Task;
      deviceName: string;
      ip?: string;
      lastBackup?: string;
    }> = [];
    tasks.forEach(task => {
      const list = (task.devices && task.devices.length > 0)
        ? task.devices
        : [];
      if (list.length === 0 && task.deviceCount) {
        // 没有具体设备清单时，仅放一行占位
        rows.push({ task, deviceName: `${task.deviceCount} 台设备` });
      } else {
        list.forEach((dv: any) => {
          const name = typeof dv === 'string' ? dv : dv?.name;
          if (!name) return;
          const md = deviceByName[name];
          rows.push({
            task,
            deviceName: name,
            ip: md?.management?.ipAddress,
            lastBackup: lastBackupMap[name]
          });
        });
      }
    });
    return rows;
  }, [tasks, deviceByName, lastBackupMap]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">定时备份管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          {showForm ? '取消' : '创建定时任务'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-4 ${
          message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700' :
          message.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700' :
          'bg-blue-900/30 text-blue-300 border border-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-semibold mb-4 text-white">新建定时任务</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">选择设备</label>

            {availableDevices.length === 0 ? (
              <p className="text-slate-400">暂无已配置管理凭证的设备。请先到"设备管理"界面添加。</p>
            ) : (
              <>
                {/* 分组筛选 */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {groups.map(g => (
                    <button
                      key={g}
                      onClick={() => setGroupFilter(g)}
                      className={`px-3 py-1 rounded text-xs ${groupFilter === g ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                    >
                      {g === 'all' ? '全部' : g}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="按名称/IP 搜索"
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    />
                    <span className="text-slate-400 text-xs">已选 {selectedDevices.length} 台</span>
                  </div>
                </div>

                {/* 批量操作 */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => {
                      const allIds = visibleDevices.map(d => d.id);
                      const merged = Array.from(new Set([...selectedDevices, ...allIds]));
                      setSelectedDevices(merged);
                    }}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                  >
                    全选当前分组/搜索({visibleDevices.length})
                  </button>
                  <button
                    onClick={() => {
                      const removeSet = new Set(visibleDevices.map(d => d.id));
                      setSelectedDevices(selectedDevices.filter(id => !removeSet.has(id)));
                    }}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                  >
                    清空当前分组
                  </button>
                </div>

                {/* 列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto p-1 bg-slate-900/40 rounded border border-slate-700">
                  {visibleDevices.map(device => (
                    <label key={device.id} className="flex items-center gap-2 cursor-pointer p-2 bg-slate-700 rounded hover:bg-slate-600">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleDeviceToggle(device.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-white text-sm">{device.name} ({device.management?.ipAddress})</span>
                      <span className="ml-auto text-xs text-slate-300">{device.group || 'default'}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Cron 表达式</label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 2 * * *"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white mb-2"
            />
            <p className="text-xs text-slate-400 mb-3">{explainCron(cronExpression)}</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-slate-400 text-sm mr-2">快速选择:</span>
              {cronPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => setCronExpression(preset.value)}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateTask}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            创建任务
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">当前任务列表</h3>
        {tasks.length === 0 ? (
          <div className="text-center py-16 bg-slate-800 rounded-lg text-slate-400">
            <p className="text-lg">暂无定时任务</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-700/50 text-slate-200">
                  <th className="px-4 py-3 text-left">任务ID</th>
                  <th className="px-4 py-3 text-left">Cron</th>
                  <th className="px-4 py-3 text-left">计划说明</th>
                  <th className="px-4 py-3 text-left">设备名称</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">最后备份时间</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => (
                  <tr key={`${row.task.id}-${row.deviceName}-${idx}`} className={idx % 2 ? 'bg-slate-800' : 'bg-slate-800/70'}>
                    <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{row.task.id.substring(0, 8)}...</td>
                    <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{row.task.cronExpression}</td>
                    <td className="px-4 py-2 text-slate-300">{explainCron(row.task.cronExpression)}</td>
                    <td className="px-4 py-2 text-white">{row.deviceName}</td>
                    <td className="px-4 py-2 text-slate-300">{row.ip || '-'}</td>
                    <td className="px-4 py-2 text-slate-300">{row.lastBackup ? new Date(row.lastBackup).toLocaleString('zh-CN') : '-'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteTask(row.task)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                      >
                        删除任务
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
  );
};

export default SchedulerView;
