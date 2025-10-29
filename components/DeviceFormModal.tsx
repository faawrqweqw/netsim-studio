
import React, { useState, useEffect } from 'react';
import { ManagedDevice, Vendor, DeviceType } from '../types';

interface DeviceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (device: ManagedDevice) => void;
    device: ManagedDevice | null;
    groups: string[];
}

const VENDOR_OPTIONS = Object.values(Vendor).filter(v => v !== Vendor.Generic);
const DEVICE_TYPE_OPTIONS = Object.values(DeviceType).filter(t => ![DeviceType.Text, DeviceType.Rectangle, DeviceType.Circle, DeviceType.Halo, DeviceType.PC].includes(t));

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        {children}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
);

const DeviceFormModal: React.FC<DeviceFormModalProps> = ({ isOpen, onClose, onSave, device, groups }) => {
    const [formData, setFormData] = useState<ManagedDevice>(() => {
        const defaultDevice: ManagedDevice = {
            id: '',
            name: '',
            vendor: Vendor.Huawei,
            type: DeviceType.Router,
            group: 'Default',
            management: {
                ipAddress: '',
                credentials: { username: 'admin', password: '' }
            }
        };
        return device || defaultDevice;
    });

    useEffect(() => {
        if (device) {
            setFormData(device);
        } else {
             setFormData({
                id: '', name: '', vendor: Vendor.Huawei, type: DeviceType.Router, group: 'Default',
                management: { ipAddress: '', credentials: { username: 'admin', password: '' } }
            });
        }
    }, [device, isOpen]);

    const handleChange = (field: keyof ManagedDevice, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleManagementChange = (field: string, value: string) => {
        if (field === 'ipAddress') {
            setFormData(prev => ({ ...prev, management: { ...prev.management, ipAddress: value } }));
        } else {
            setFormData(prev => ({ ...prev, management: { ...prev.management, credentials: { ...prev.management.credentials, [field]: value } } }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg w-full max-w-lg flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-lg font-semibold">{device ? '编辑设备' : '添加新设备'}</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <Field label="主机名">
                            <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
                        </Field>
                        <Field label="设备IP地址">
                            <Input value={formData.management.ipAddress} onChange={e => handleManagementChange('ipAddress', e.target.value)} required placeholder="e.g., 192.168.1.1" />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="厂商">
                                <Select value={formData.vendor} onChange={e => handleChange('vendor', e.target.value as Vendor)}>
                                    {VENDOR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                                </Select>
                            </Field>
                             <Field label="设备类型">
                                <Select value={formData.type} onChange={e => handleChange('type', e.target.value as DeviceType)}>
                                    {DEVICE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                            </Field>
                        </div>
                         <Field label="设备分组">
                            <Input 
                                value={formData.group || ''} 
                                onChange={e => handleChange('group', e.target.value)} 
                                list="group-suggestions" 
                                placeholder="e.g., Core Switches"
                                required
                            />
                            <datalist id="group-suggestions">
                                {groups.map(g => <option key={g} value={g} />)}
                            </datalist>
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="SSH 用户名">
                                <Input value={formData.management.credentials.username} onChange={e => handleManagementChange('username', e.target.value)} required />
                            </Field>
                             <Field label="SSH 密码">
                                <Input type="password" value={formData.management.credentials.password} onChange={e => handleManagementChange('password', e.target.value)} required />
                            </Field>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md text-sm hover:bg-slate-500">取消</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded-md text-sm hover:bg-blue-700">保存</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeviceFormModal;
