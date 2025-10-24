

import React, { useState, useCallback, useMemo } from 'react';
import { ManagedDevice, Vendor, DeviceType } from '../types';
import { DEFAULT_MANAGEMENT_CONFIG } from '../constants';
import DeviceFormModal from './DeviceFormModal';

interface DeviceManagementViewProps {
    devices: ManagedDevice[];
    onUpdate: (devices: ManagedDevice[]) => void;
}

const DeviceManagementView: React.FC<DeviceManagementViewProps> = ({ devices, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<ManagedDevice | null>(null);

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
        if (window.confirm('Are you sure you want to delete this device?')) {
            onUpdate(devices.filter(d => d.id !== deviceId));
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
        } else {
            onUpdate(devices.map(d => d.id === device.id ? device : d));
        }
        setIsModalOpen(false);
    };


    return (
        <div className="p-6 bg-slate-800 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">设备信息管理</h3>
                <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    添加设备
                </button>
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">主机名</th>
                            <th scope="col" className="px-6 py-3">设备IP地址</th>
                            <th scope="col" className="px-6 py-3">厂商</th>
                            <th scope="col" className="px-6 py-3">设备类型</th>
                             <th scope="col" className="px-6 py-3">分组</th>
                            <th scope="col" className="px-6 py-3">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {devices.map(device => (
                            <tr key={device.id} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="px-6 py-4 font-medium text-white">{device.name}</td>
                                <td className="px-6 py-4">{device.management.ipAddress}</td>
                                <td className="px-6 py-4">{device.vendor}</td>
                                <td className="px-6 py-4">{device.type}</td>
                                 <td className="px-6 py-4">{device.group}</td>
                                <td className="px-6 py-4 space-x-4">
                                    <button onClick={() => handleEdit(device)} className="font-medium text-blue-400 hover:underline">编辑</button>
                                    <button onClick={() => handleDelete(device.id)} className="font-medium text-red-400 hover:underline">删除</button>
                                </td>
                            </tr>
                        ))}
                         {devices.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">没有手动管理的设备。</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
             {isModalOpen && (
                <DeviceFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    device={editingDevice}
                    // FIX: Pass the 'groups' prop to DeviceFormModal to satisfy its required props.
                    groups={groups}
                />
             )}
        </div>
    );
};

export default DeviceManagementView;