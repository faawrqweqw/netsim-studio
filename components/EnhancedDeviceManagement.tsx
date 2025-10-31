import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ManagedDevice, Vendor, DeviceType } from '../types';
import { DEFAULT_MANAGEMENT_CONFIG } from '../constants';
import DeviceFormModal from './DeviceFormModal';

const API_BASE_URL = 'http://localhost:3001/api';

interface EnhancedDeviceManagementProps {
    devices: ManagedDevice[];
    onUpdate: (devices: ManagedDevice[]) => void;
}

interface Message {
    type: 'success' | 'error' | 'info';
    text: string;
}

const EnhancedDeviceManagement: React.FC<EnhancedDeviceManagementProps> = ({ devices, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<ManagedDevice | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [showImportModal, setShowImportModal] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [formData, setFormData] = useState<Omit<ManagedDevice, 'id' | 'type' | 'vendor'>>({
        name: '',
        management: { ipAddress: '', port: 22, username: '', password: '' },
        group: 'default',
        config: {},
        runtime: {}
    });

    const groups = useMemo(() => {
        const groupSet = new Set<string>();
        devices.forEach(d => {
            if (d.group) {
                groupSet.add(d.group);
            }
        });
        return Array.from(groupSet).sort();
    }, [devices]);

    const handleAdd = () => {
        setEditingDevice(null);
        setShowForm(true);
    };

    const handleEdit = (device: ManagedDevice) => {
        setEditingDevice(device);
        setFormData({
            name: device.name,
            management: device.management,
            group: device.group || 'default',
            config: device.config,
            runtime: device.runtime || {}
        });
        setShowForm(true);
    };

    const handleDelete = (deviceId: string) => {
        if (window.confirm('确认删除此设备？')) {
            const filtered = devices.filter(d => d.id !== deviceId);
            onUpdate(filtered);
            showMessage('success', '设备删除成功');
        }
    };
    
    const handleSave = (device: ManagedDevice) => {
        const isNew = !device.id;
        if (isNew) {
            const newDevice: ManagedDevice = {
                ...device,
                id: `managed-${Date.now()}`,
                management: { ...DEFAULT_MANAGEMENT_CONFIG.credentials, ...device.management }
            };
            onUpdate([...devices, newDevice]);
            showMessage('success', '设备添加成功');
        } else {
            onUpdate(devices.map(d => d.id === device.id ? device : d));
            showMessage('success', '设备更新成功');
        }
        setIsModalOpen(false);
        resetForm();
    };

    const handleTestConnection = async (device: ManagedDevice) => {
        try {
            showMessage('info', '正在测试连接...');
            await axios.post(`${API_BASE_URL}/device/test`, {
                name: device.name,
                ip: device.management.ipAddress,
                port: device.management.port,
                vendor: device.vendor,
                username: device.management.username,
                password: device.management.password,
            });
            showMessage('success', '连接成功');
        } catch (error: any) {
            showMessage('error', `连接失败: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleBatchBackup = async () => {
        if (selectedDeviceIds.size === 0) {
            showMessage('error', '请至少选择一个设备');
            return;
        }

        setIsBackingUp(true);
        const selectedDevices = devices.filter(d => selectedDeviceIds.has(d.id));
        let successCount = 0;
        let failCount = 0;

        showMessage('info', `正在备份 ${selectedDevices.length} 个设备...`);

        for (const device of selectedDevices) {
            try {
                await axios.post(`${API_BASE_URL}/device/backup`, {
                    name: device.name,
                    ip: device.management.ipAddress,
                    port: device.management.port,
                    vendor: device.vendor,
                    username: device.management.username,
                    password: device.management.password,
                });
                successCount++;
            } catch (error: any) {
                console.error(`${device.name} 备份失败:`, error);
                failCount++;
            }
        }

        setIsBackingUp(false);
        setSelectedDeviceIds(new Set());
        
        if (failCount === 0) {
            showMessage('success', `批量备份完成！成功 ${successCount} 个`);
        } else {
            showMessage('error', `备份完成：成功 ${successCount} 个，失败 ${failCount} 个`);
        }
    };

    const toggleDeviceSelection = (deviceId: string) => {
        const newSelection = new Set(selectedDeviceIds);
        if (newSelection.has(deviceId)) {
            newSelection.delete(deviceId);
        } else {
            newSelection.add(deviceId);
        }
        setSelectedDeviceIds(newSelection);
    };

    const toggleSelectAll = () => {
        const filteredDevices = getFilteredDevices();
        if (selectedDeviceIds.size === filteredDevices.length && filteredDevices.length > 0) {
            setSelectedDeviceIds(new Set());
        } else {
            setSelectedDeviceIds(new Set(filteredDevices.map(d => d.id)));
        }
    };

    const getFilteredDevices = () => {
        if (selectedGroup === 'all') {
            return devices;
        }
        return devices.filter(d => d.group === selectedGroup);
    };

    const downloadTemplate = () => {
        const template = [
            ['设备名称', 'IP地址', '端口', '设备厂商', '用户名', '密码', '分组'],
            ['核心交换机', '192.168.1.1', '22', 'huawei', 'admin', 'password', '核心层'],
            ['汇聚交换机', '192.168.1.2', '22', 'cisco', 'admin', 'password', '汇聚层'],
            ['接入交换机', '192.168.1.3', '22', 'h3c', 'admin', 'password', '接入层']
        ];
        
        const csvContent = template.map(row => row.join(',')).join('\n');
        const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '设备导入模板.csv';
        link.click();
        showMessage('success', '模板下载成功');
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    showMessage('error', '文件内容为空或格式不正确');
                    return;
                }

                const importedDevices: ManagedDevice[] = [];
                const errors: string[] = [];

                // 跳过标题行，从第二行开始解析
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const columns = line.split(',').map(col => col.trim());
                    
                    if (columns.length < 7) {
                        errors.push(`第 ${i + 1} 行：列数不足`);
                        continue;
                    }

                    const [name, ip, portStr, vendor, username, password, group] = columns;
                    
                    if (!name || !ip || !username || !password) {
                        errors.push(`第 ${i + 1} 行：必填字段缺失`);
                        continue;
                    }

                    const port = parseInt(portStr) || 22;
                    const validVendors = ['huawei', 'cisco', 'h3c', 'ruijie'];
                    const normalizedVendor = vendor.toLowerCase();
                    
                    if (!validVendors.includes(normalizedVendor)) {
                        errors.push(`第 ${i + 1} 行：不支持的设备厂商 "${vendor}"`);
                        continue;
                    }

                    importedDevices.push({
                        id: Date.now().toString() + '-' + i,
                        name,
                        vendor: normalizedVendor as Vendor,
                        type: DeviceType.Switch,
                        management: { ipAddress: ip, port, username, password },
                        group: group || 'default',
                        config: {},
                        runtime: {}
                    });
                }

                if (importedDevices.length > 0) {
                    const newDevices = [...devices, ...importedDevices];
                    onUpdate(newDevices);
                    showMessage('success', `成功导入 ${importedDevices.length} 个设备${errors.length > 0 ? `，${errors.length} 个失败` : ''}`);
                    setShowImportModal(false);
                } else {
                    showMessage('error', '没有成功导入任何设备');
                }

                if (errors.length > 0) {
                    console.error('导入错误：', errors);
                }
            } catch (error) {
                showMessage('error', '文件解析失败，请检查格式');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const resetForm = () => {
        setFormData({
            name: '',
            management: { ipAddress: '', port: 22, username: '', password: '' },
            group: 'default',
            config: {},
            runtime: {}
        });
        setEditingDevice(null);
        setShowForm(false);
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const filteredDevices = getFilteredDevices();

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">设备信息管理</h2>
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={handleBatchBackup}
                        disabled={selectedDeviceIds.size === 0 || isBackingUp}
                        className={`px-4 py-2 rounded-md transition-colors ${
                            selectedDeviceIds.size === 0 || isBackingUp
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        {isBackingUp ? '备份中...' : `一键备份 (${selectedDeviceIds.size})`}
                    </button>
                    <button
                        onClick={downloadTemplate}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                        title="下载 CSV 模板"
                    >
                        下载模板
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                        title="批量导入设备"
                    >
                        批量导入
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        {showForm ? '取消' : '添加设备'}
                    </button>
                </div>
            </div>

            {/* 分组筛选 */}
            {groups.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 text-sm">分组筛选：</span>
                        <button
                            onClick={() => setSelectedGroup('all')}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                                selectedGroup === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            全部 ({devices.length})
                        </button>
                        {groups.map(group => (
                            <button
                                key={group}
                                onClick={() => setSelectedGroup(group)}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                    selectedGroup === group
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                {group} ({devices.filter(d => d.group === group).length})
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
                <form onSubmit={(e) => {
                    e.preventDefault();
                    try {
                        if (editingDevice) {
                            const updatedDevice: ManagedDevice = {
                                ...editingDevice,
                                name: formData.name,
                                management: formData.management,
                                group: formData.group,
                                config: formData.config,
                                runtime: formData.runtime
                            };
                            handleSave(updatedDevice);
                        } else {
                            const newDevice: ManagedDevice = {
                                id: '',
                                name: formData.name,
                                vendor: Vendor.Huawei,
                                type: DeviceType.Switch,
                                management: formData.management,
                                group: formData.group,
                                config: formData.config,
                                runtime: formData.runtime
                            };
                            handleSave(newDevice);
                        }
                    } catch (error) {
                        showMessage('error', '操作失败');
                    }
                }} className="bg-slate-800 p-6 rounded-lg mb-6">
                    <h3 className="text-xl font-semibold mb-4 text-white">
                        {editingDevice ? '编辑设备' : '新增设备'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">设备名称</label>
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                                placeholder="例如: 核心交换机"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">IP 地址</label>
                            <input
                                value={formData.management.ipAddress}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    management: { ...formData.management, ipAddress: e.target.value }
                                })}
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                                placeholder="例如: 192.168.1.1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">SSH 端口</label>
                            <input
                                type="number"
                                value={formData.management.port}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    management: { ...formData.management, port: parseInt(e.target.value) }
                                })}
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">用户名</label>
                            <input
                                value={formData.management.username}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    management: { ...formData.management, username: e.target.value }
                                })}
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">密码</label>
                            <input
                                type="password"
                                value={formData.management.password}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    management: { ...formData.management, password: e.target.value }
                                })}
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">分组</label>
                            <input
                                value={formData.group}
                                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                                placeholder="例如: 核心层"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                            {editingDevice ? '更新' : '添加'}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </form>
            )}

            {/* 导入模态框 */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 p-6 rounded-lg max-w-lg w-full mx-4 border border-slate-700">
                        <h3 className="text-xl font-semibold text-white mb-4">批量导入设备</h3>
                        <div className="mb-4">
                            <p className="text-slate-300 text-sm mb-2">请上传 CSV 文件，格式说明：</p>
                            <ul className="text-slate-400 text-sm list-disc list-inside space-y-1 mb-4">
                                <li>第一行为标题行（必须包含）</li>
                                <li>支持的厂商：huawei, cisco, h3c, ruijie</li>
                                <li>缺省端口为 22，缺省分组为 default</li>
                                <li>建议先下载模板，按模板格式填写</li>
                            </ul>
                            <label className="block">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileImport}
                                    className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer"
                                />
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={downloadTemplate}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                            >
                                下载模板
                            </button>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-700 text-slate-300">
                        <tr>
                            <th className="p-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={filteredDevices.length > 0 && selectedDeviceIds.size === filteredDevices.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 cursor-pointer"
                                />
                            </th>
                            <th className="p-3 text-left text-white font-semibold">设备名称</th>
                            <th className="p-3 text-left text-white font-semibold">IP 地址</th>
                            <th className="p-3 text-left text-white font-semibold">端口</th>
                            <th className="p-3 text-left text-white font-semibold">厂商</th>
                            <th className="p-3 text-left text-white font-semibold">分组</th>
                            <th className="p-3 text-right text-white font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDevices.map(device => (
                            <tr key={device.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                                <td className="p-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedDeviceIds.has(device.id)}
                                        onChange={() => toggleDeviceSelection(device.id)}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                </td>
                                <td className="p-3 text-white font-medium">{device.name}</td>
                                <td className="p-3 text-slate-300">{device.management.ipAddress}</td>
                                <td className="p-3 text-slate-300">{device.management.port}</td>
                                <td className="p-3 text-slate-300">{device.vendor}</td>
                                <td className="p-3 text-slate-300">{device.group}</td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleTestConnection(device)}
                                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs transition-colors"
                                            title="测试连接"
                                        >
                                            测试
                                        </button>
                                        <button
                                            onClick={() => handleEdit(device)}
                                            className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs transition-colors"
                                            title="编辑"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDelete(device.id)}
                                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                                            title="删除"
                                        >
                                            删除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredDevices.length === 0 && !showForm && devices.length === 0 && (
                <div className="text-center py-16 text-slate-400 bg-slate-800 rounded-lg border border-slate-700 mt-4">
                    <p className="text-lg mb-2">暂无设备</p>
                    <p className="text-sm">点击"添加设备"开始配置备份任务</p>
                </div>
            )}

            {/* 保持原有的模态框支持 */}
            {isModalOpen && (
                <DeviceFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    device={editingDevice}
                    groups={groups}
                />
            )}
        </div>
    );
};

export default EnhancedDeviceManagement;