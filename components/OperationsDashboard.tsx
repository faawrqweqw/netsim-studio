


import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Node, ManagedDevice, OperationalDevice, Vendor, DeviceType, DeviceRuntimeStatus } from '../types';
// FIX: Removed unused icon imports (FolderIcon, UploadIcon, DownloadIcon) that were causing export errors.
import { WifiIcon, CalculatorIcon, InspectionIcon, ListIcon, SettingsIcon, BackupIcon } from './Icons';
import DeviceInspectionView from './DeviceInspectionView';
import SubnetCalculator from './SubnetCalculator';
import { BatchPingView } from './BatchPingView';
import EnhancedDeviceManagement from './EnhancedDeviceManagement';
import TemplateManager from './TemplateManager';
import ConfigBackupView from './backup/ConfigBackupView';


type OpsView = 'inspection' | 'ping' | 'calculator' | 'management' | 'templates' | 'backup';

interface OperationsDashboardProps {
    nodes: Node[];
    onNodeUpdate: (node: Node) => void;
    managedDevices: ManagedDevice[];
    onManagedDevicesUpdate: (devices: ManagedDevice[]) => void;
}

const Header = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex justify-between items-center mb-6 flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-lg shadow-lg">
            <h1 className="text-xl font-bold text-white">运维中心</h1>
            <div className="text-right text-slate-300">
                <div className="font-semibold text-lg">{time.toLocaleTimeString('zh-CN', { hour12: false })}</div>
                <div className="text-xs">{time.toLocaleDateString('zh-CN')}</div>
            </div>
        </div>
    );
};


const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ nodes, onNodeUpdate, managedDevices, onManagedDevicesUpdate }) => {
    const [activeView, setActiveView] = useState<OpsView>('management');

    const operationalDevices: OperationalDevice[] = useMemo(() => {
        // FIX: Correctly map Node to OperationalDevice by explicitly selecting properties and providing a fallback for the optional 'runtime' property.
        const topologyDevices: OperationalDevice[] = nodes
            .filter(n => n.config.management.ipAddress && n.vendor !== Vendor.Generic)
            .map((n): OperationalDevice => ({ 
                id: n.id,
                name: n.name,
                vendor: n.vendor,
                type: n.type,
                management: n.config.management,
                source: 'topology',
                runtime: n.runtime || {},
                group: '拓扑设备',
            }));
        // FIX: Explicitly map ManagedDevice to OperationalDevice for type safety and consistency, providing a fallback for 'runtime'.
        const inventoryDevices: OperationalDevice[] = managedDevices.map((d): OperationalDevice => ({ 
            id: d.id,
            name: d.name,
            vendor: d.vendor,
            type: d.type,
            management: d.management,
            source: 'inventory',
            runtime: d.runtime || {},
            group: d.group || '默认分组',
        }));
        
        return [...topologyDevices, ...inventoryDevices];
    }, [nodes, managedDevices]);

    const handleUpdateDevice = useCallback((updatedDevice: OperationalDevice) => {
        if (updatedDevice.source === 'topology') {
            const nodeToUpdate = nodes.find(n => n.id === updatedDevice.id);
            if (nodeToUpdate) {
                // FIX: Access 'management' and 'runtime' directly from updatedDevice, which is an OperationalDevice.
                const updatedNode: Node = {
                    ...nodeToUpdate,
                    name: updatedDevice.name,
                    config: {
                        ...nodeToUpdate.config,
                        management: updatedDevice.management,
                    },
                    runtime: updatedDevice.runtime,
                };
                onNodeUpdate(updatedNode);
            }
        } else { // source === 'inventory'
            // FIX: Access 'management' and 'runtime' directly from updatedDevice.
            // Also update type and vendor as they can be changed in the form.
            const updatedManagedDevices: ManagedDevice[] = managedDevices.map(d => 
                d.id === updatedDevice.id 
                ? { 
                    ...d, 
                    name: updatedDevice.name, 
                    type: updatedDevice.type,
                    vendor: updatedDevice.vendor,
                    management: updatedDevice.management, 
                    runtime: updatedDevice.runtime,
                    group: updatedDevice.group,
                  }
                : d
            );
            onManagedDevicesUpdate(updatedManagedDevices);
        }
    }, [nodes, onNodeUpdate, managedDevices, onManagedDevicesUpdate]);

    const renderView = () => {
        switch (activeView) {
            case 'inspection':
                return <DeviceInspectionView devices={operationalDevices} onUpdateDevice={handleUpdateDevice} />;
            case 'ping':
                return <BatchPingView devices={operationalDevices} onUpdateDevice={handleUpdateDevice} />;
            case 'calculator':
                return <SubnetCalculator />;
            case 'management':
                return <EnhancedDeviceManagement devices={managedDevices} onUpdate={onManagedDevicesUpdate} />;
            case 'templates':
                return <TemplateManager />;
            case 'backup':
                return <ConfigBackupView managedDevices={managedDevices} onManagedDevicesUpdate={onManagedDevicesUpdate} />;
            default:
                return null;
        }
    };
    
    const menuItems: { id: OpsView, label: string, icon: React.ReactNode }[] = [
        { id: 'management', label: '设备管理', icon: <ListIcon className="w-5 h-5"/> },
        { id: 'inspection', label: '配置巡检', icon: <InspectionIcon className="w-5 h-5"/> },
        { id: 'templates', label: '模板管理', icon: <SettingsIcon className="w-5 h-5"/> },
        { id: 'ping', label: '批量Ping', icon: <WifiIcon className="w-5 h-5"/> },
        { id: 'calculator', label: 'IP子网计算', icon: <CalculatorIcon className="w-5 h-5"/> },
        { id: 'backup', label: '备份配置', icon: <BackupIcon className="w-5 h-5"/> },
    ];

    return (
        <div className="flex-1 flex bg-slate-900 text-white">
            <main className="flex-1 p-6 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 flex bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    <aside className="w-56 p-4 border-r border-slate-700 flex-shrink-0 flex flex-col">
                        <nav className="space-y-2">
                           {menuItems.map(item => (
                             <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeView === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                                {item.icon}
                                {item.label}
                             </button>
                           ))}
                        </nav>
                    </aside>
                     <div className="flex-1 overflow-y-auto p-4">
                        {renderView()}
                    </div>
                </div>
                 <footer className="text-center text-xs text-slate-500 pt-4 mt-auto flex-shrink-0">
                    <p>© {new Date().getFullYear()} NetSim Studio. All Rights Reserved.</p>
                </footer>
            </main>
        </div>
    );
};

export default OperationsDashboard;