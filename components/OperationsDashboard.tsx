

import React, { useState, useCallback, useMemo } from 'react';
import { Node, ManagedDevice, OperationalDevice, Vendor, DeviceType, DeviceRuntimeStatus } from '../types';
import { WifiIcon, CalculatorIcon, ServerIcon, ListIcon } from './Icons';
import DeviceInspectionView from './DeviceInspectionView';
import SubnetCalculator from './SubnetCalculator';
import { BatchPingView } from './BatchPingView';
import DeviceManagementView from './DeviceManagementView';


type OpsView = 'inspection' | 'ping' | 'calculator' | 'management';

interface OperationsDashboardProps {
    nodes: Node[];
    onNodeUpdate: (node: Node) => void;
    managedDevices: ManagedDevice[];
    onManagedDevicesUpdate: (devices: ManagedDevice[]) => void;
}

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
                    runtime: updatedDevice.runtime 
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
                return <DeviceManagementView devices={managedDevices} onUpdate={onManagedDevicesUpdate} />;
            default:
                return null;
        }
    };
    
    const menuItems: { id: OpsView, label: string, icon: React.ReactNode }[] = [
        { id: 'management', label: '设备信息管理', icon: <ListIcon className="w-5 h-5"/> },
        { id: 'inspection', label: '配置巡检', icon: <WifiIcon className="w-5 h-5"/> },
        { id: 'ping', label: '批量Ping', icon: <WifiIcon className="w-5 h-5"/> },
        { id: 'calculator', label: 'IP子网计算', icon: <CalculatorIcon className="w-5 h-5"/> },
    ];

    return (
        <div className="flex-1 flex bg-slate-900 text-white">
            <aside className="w-56 p-4 border-r border-slate-700 flex-shrink-0 flex flex-col">
                <h2 className="text-lg font-bold text-white mb-6">Operations Center</h2>
                <nav className="space-y-2">
                   {menuItems.map(item => (
                     <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 ${activeView === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                        {item.icon}
                        {item.label}
                     </button>
                   ))}
                </nav>
            </aside>
            <main className="flex-1 p-6 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default OperationsDashboard;
