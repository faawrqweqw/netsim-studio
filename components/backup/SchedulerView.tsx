import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ManagedDevice } from '../../types';

const API_BASE_URL = 'http://localhost:3001/api';

interface Task {
  id: string;
  cronExpression: string;
  devices?: string[];
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

  // 筛选出有管理信息的设备
  const availableDevices = managedDevices.filter(
    d => d.management?.ipAddress && d.management?.credentials?.username
  );

  useEffect(() => {
    loadTasks();
  }, []);

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
      
      const response = await axios.post(`${API_BASE_URL}/scheduler/task`, {
        cronExpression,
        devices: selectedDeviceObjects
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableDevices.length === 0 ? (
                <p className="text-slate-400 col-span-full">暂无已配置管理凭证的设备。请先到"设备管理"界面添加。</p>
              ) : (
              availableDevices.map(device => (
                <label key={device.id} className="flex items-center gap-2 cursor-pointer p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(device.id)}
                    onChange={() => handleDeviceToggle(device.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">{device.name} ({device.management?.ipAddress})</span>
                </label>
              ))
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Cron 表达式</label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 2 * * *"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white mb-3"
            />
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
          tasks.map(task => (
            <div key={task.id} className="bg-slate-800 p-5 rounded-lg border border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-lg font-semibold text-white">
                  任务 ID: {task.id.substring(0, 8)}...
                </h4>
                <button
                  onClick={() => handleDeleteTask(task)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  删除
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-slate-300">
                  <span className="text-slate-400">Cron:</span> {task.cronExpression}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">设备:</span>{' '}
                  {task.devices?.join(', ') || `${task.deviceCount} 台设备`}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">创建时间:</span>{' '}
                  {new Date(task.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SchedulerView;
