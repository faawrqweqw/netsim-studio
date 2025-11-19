import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import { ManagedDevice, Vendor, DeviceType } from '../types';
import { DEFAULT_MANAGEMENT_CONFIG } from '../constants';
import DeviceFormModal from './DeviceFormModal';

// 使用相对路径，支持部署到服务器
const API_BASE_URL = '/api';

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
    const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
    // 批量删除状态
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [showImportModal, setShowImportModal] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);

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
        setIsModalOpen(true);
    };

    const handleEdit = (device: ManagedDevice) => {
        setEditingDevice(device);
        setIsModalOpen(true);
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
                management: {
                    ipAddress: device.management.ipAddress,
                    credentials: device.management.credentials || DEFAULT_MANAGEMENT_CONFIG.credentials
                }
            };
            onUpdate([...devices, newDevice]);
            showMessage('success', '设备添加成功');
        } else {
            onUpdate(devices.map(d => d.id === device.id ? device : d));
            showMessage('success', '设备更新成功');
        }
        setIsModalOpen(false);
    };

    const handleTestConnection = async (device: ManagedDevice) => {
        try {
            // Validate credentials exist
            if (!device.management?.credentials?.username || !device.management?.credentials?.password) {
                showMessage('error', '设备缺少SSH凭证，请先编辑添加用户名和密码');
                return;
            }
            
            showMessage('info', '正在测试连接...');
            await axios.post(`${API_BASE_URL}/device/test`, {
                name: device.name,
                ip: device.management.ipAddress,
                port: device.management.credentials.port || 22,
                vendor: device.vendor,
                username: device.management.credentials.username,
                password: device.management.credentials.password,
            });
            showMessage('success', '连接成功');
        } catch (error: any) {
            showMessage('error', `连接失败: ${error.response?.data?.error || error.message}`);
        }
    };

    // 批量删除选中的设备
    const handleBatchDelete = () => {
        if (selectedDeviceIds.size === 0) {
            showMessage('error', '请至少选择一个设备');
            return;
        }

        if (!window.confirm(`确认删除选中的 ${selectedDeviceIds.size} 个设备？`)) {
            return;
        }

        setIsDeleting(true);
        const remainingDevices = devices.filter(d => !selectedDeviceIds.has(d.id));
        onUpdate(remainingDevices);
        setSelectedDeviceIds(new Set());
        setIsDeleting(false);
        showMessage('success', '批量删除成功');
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
                        management: { ipAddress: ip, credentials: { username, password } },
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

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingDevice(null);
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const filteredDevices = getFilteredDevices();

    return (
        <div className="w-full h-screen flex flex-col bg-slate-900">
            {/* 顶部工具栏 */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-700">
                <h2 className="text-2xl font-bold text-white">设备信息管理</h2>
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={handleBatchDelete}
                        disabled={selectedDeviceIds.size === 0 || isDeleting}
                        className={`px-4 py-2 rounded-md transition-colors ${
                            selectedDeviceIds.size === 0 || isDeleting
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                        {isDeleting ? '删除中...' : `批量删除 (${selectedDeviceIds.size})`}
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
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        添加设备
                    </button>
                </div>
            </div>

            {/* 消息提示 */}
            {message && (
                <div className={`mx-6 mt-4 p-4 rounded-md ${
                    message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700' :
                    message.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700' :
                    'bg-blue-900/30 text-blue-300 border border-blue-700'
                }`}>
                    {message.text}
                </div>
            )}

            {/* 主内容区：左侧树 + 右侧表格 */}
            <div className="flex-1 flex overflow-hidden p-6 gap-6">
                {/* 左侧分组树 */}
                <div className="w-56 bg-slate-800 rounded-lg border border-slate-700 overflow-y-auto flex-shrink-0">
                    <div className="p-4 space-y-1">
                        {/* 全部设备 */}
                        <button
                            onClick={() => setSelectedGroup('all')}
                            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                                selectedGroup === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            <span className="text-lg">📦</span>
                            <span className="flex-1">全部设备</span>
                            <span className="text-xs bg-slate-600 px-2 py-1 rounded">{devices.length}</span>
                        </button>

                        {/* 分组列表 */}
                        {groups.length > 0 && (
                            <>
                                <div className="px-3 py-2 text-xs font-semibold text-slate-400 mt-3">分组</div>
                                {groups.map(group => {
                                    const groupDeviceCount = devices.filter(d => d.group === group).length;
                                    return (
                                        <button
                                            key={group}
                                            onClick={() => setSelectedGroup(group)}
                                            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center gap-2 text-sm ${
                                                selectedGroup === group
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <span className="text-lg">📁</span>
                                            <span className="flex-1 truncate">{group}</span>
                                            <span className="text-xs bg-slate-600 px-2 py-1 rounded">{groupDeviceCount}</span>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>

                {/* 右侧设备列表 */}
                <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
                    {/* 列表标题 */}
                    <div className="bg-slate-700 px-6 py-4 border-b border-slate-600">
                        <h3 className="text-white font-semibold">
                            {selectedGroup === 'all' ? '所有设备' : `分组: ${selectedGroup}`}
                        </h3>
                    </div>

                    {/* 设备表格 */}
                    {filteredDevices.length > 0 ? (
                        <div className="overflow-x-auto overflow-y-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-700 text-slate-300 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-left w-12">
                                            <input
                                                type="checkbox"
                                                checked={filteredDevices.length > 0 && selectedDeviceIds.size === filteredDevices.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">设备名称</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">IP 地址</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">端口</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">厂商</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">设备类型</th>
                                        <th className="px-6 py-3 text-left text-white font-semibold">分组</th>
                                        <th className="px-6 py-3 text-right text-white font-semibold">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.map(device => (
                                        <tr key={device.id} className="border-t border-slate-700 hover:bg-slate-700/50 transition-colors">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDeviceIds.has(device.id)}
                                                    onChange={() => toggleDeviceSelection(device.id)}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-white font-medium">{device.name}</td>
                                            <td className="px-6 py-3 text-slate-300">{device.management.ipAddress}</td>
                                            <td className="px-6 py-3 text-slate-300">{device.management.credentials?.port || 22}</td>
                                            <td className="px-6 py-3 text-slate-300">{device.vendor}</td>
                                            <td className="px-6 py-3 text-slate-300">{device.type}</td>
                                            <td className="px-6 py-3 text-slate-300">{device.group}</td>
                                            <td className="px-6 py-3">
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
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <p className="text-lg mb-2">暂无设备</p>
                                <p className="text-sm">在此分组中没有设备</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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

            <DeviceFormModal 
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handleSave}
                device={editingDevice}
                groups={groups}
            />
        </div>
    );
};

export default EnhancedDeviceManagement;
