import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ManagedDevice } from '../../types';

// 使用相对路径，支持部署到服务器
const API_BASE_URL = '/api';

interface Device {
  id: string;
  name: string;
  ip: string;
}

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

const BackupHistoryView: React.FC<BackupHistoryViewProps> = ({ onCompare, managedDevices = [] }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedBackups, setSelectedBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  useEffect(() => {
    loadDevices();
  }, [managedDevices]);

  const loadDevices = () => {
    // 从 props 中的 managedDevices 转换为 Device 格式
    const devicesList: Device[] = managedDevices.map(d => ({
      id: d.id,
      name: d.name,
      ip: d.management.ipAddress
    }));
    setDevices(devicesList);
  };

  const handleDeviceSelect = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    setSelectedDevice(device);
    setSelectedBackups([]);
    await loadBackupsForDevice(device);
  };

  const loadBackupsForDevice = async (device: Device) => {
    setLoading(true);
    try {
      // 直接从服务器获取备份历史（服务器是单一数据源）
      // 添加时间戳防止浏览器缓存
      const timestamp = new Date().getTime();
      const response = await axios.get(`${API_BASE_URL}/device/${device.name}/backups?t=${timestamp}`);
      const serverBackups = response.data.backups || [];
      setBackups(serverBackups);
    } catch (error) {
      // 如果服务器请求失败，显示空列表
      console.error('获取备份历史失败:', error);
      setBackups([]);
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
      alert('最多只能选择两个备份进行对比');
    }
  };

  const handleCompare = () => {
    if (selectedBackups.length !== 2) {
      alert('请选择两个备份进行对比');
      return;
    }
    onCompare(selectedBackups[0], selectedBackups[1]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDeleteBackup = async (backup: Backup) => {
    if (!window.confirm(`确认删除备份文件 "${backup.filename}" ？`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/backup`, {
        data: { filepath: backup.filepath }
      });
      
      // 重新加载备份列表
      if (selectedDevice) {
        await loadBackupsForDevice(selectedDevice);
      }
      
      setMessage({ type: 'success', text: '删除成功' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `删除失败: ${error.response?.data?.error || error.message}` });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-6">备份历史</h2>

      {message && (
        <div className={`p-4 rounded-md mb-4 ${
          message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700' :
          message.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700' :
          'bg-blue-900/30 text-blue-300 border border-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">选择设备</label>
        <select
          onChange={(e) => handleDeviceSelect(e.target.value)}
          className="w-full max-w-md bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
        >
          <option value="">-- 请选择设备 --</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.ip})
            </option>
          ))}
        </select>
      </div>

      {selectedDevice && (
        <div className="mb-6 flex gap-3">
          <button
            onClick={handleCompare}
            disabled={selectedBackups.length !== 2}
            className={`px-6 py-2 rounded-md transition-colors ${
              selectedBackups.length === 2
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            对比选中的备份 ({selectedBackups.length}/2)
          </button>
          <button
            onClick={() => loadBackupsForDevice(selectedDevice)}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {loading ? '加载中...' : '刷新列表'}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">加载中...</p>
        </div>
      )}

      {!loading && selectedDevice && backups.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">暂无备份记录</p>
        </div>
      )}

      {!loading && backups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backups.map((backup, index) => {
            const isSelected = selectedBackups.find(b => b.id === backup.id);
            return (
              <div
                key={backup.id || index}
                className={`p-5 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'bg-blue-900/50 border-blue-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 
                    className="text-lg font-semibold text-white cursor-pointer hover:text-blue-400"
                    onClick={() => handleBackupSelect(backup)}
                  >
                    备份 #{backups.length - index}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        已选择
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteBackup(backup)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                      title="删除备份"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div 
                  className="space-y-2 text-sm cursor-pointer"
                  onClick={() => handleBackupSelect(backup)}
                >
                  <p className="text-slate-300">
                    <span className="text-slate-400">时间:</span> {formatDate(backup.timestamp)}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-400">文件:</span> {backup.filename}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-400">大小:</span> {formatSize(backup.size)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BackupHistoryView;
