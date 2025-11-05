import React, { useState } from 'react';
import { ManagedDevice } from '../../types';
import BackupHistoryView from './BackupHistoryView';
import DiffViewerView from './DiffViewerView';
import SchedulerView from './SchedulerView';

interface Backup {
  id: string;
  filename: string;
  filepath: string;
  timestamp: string;
  size: number;
}

type BackupView = 'history' | 'diff' | 'scheduler';

interface ConfigBackupViewProps {
  managedDevices?: ManagedDevice[];
  onManagedDevicesUpdate?: (devices: ManagedDevice[]) => void;
}

const ConfigBackupView: React.FC<ConfigBackupViewProps> = ({ managedDevices = [], onManagedDevicesUpdate }) => {
  const [activeView, setActiveView] = useState<BackupView>('history');
  const [compareBackups, setCompareBackups] = useState<{
    backup1: Backup | null;
    backup2: Backup | null;
  }>({ backup1: null, backup2: null });

  const handleCompare = (backup1: Backup, backup2: Backup) => {
    setCompareBackups({ backup1, backup2 });
    setActiveView('diff');
  };

  const handleClearComparison = () => {
    setCompareBackups({ backup1: null, backup2: null });
    setActiveView('history');
  };

  const renderView = () => {
    switch (activeView) {
      case 'history':
        return <BackupHistoryView onCompare={handleCompare} managedDevices={managedDevices} />;
      case 'diff':
        return (
          <DiffViewerView
            backup1={compareBackups.backup1}
            backup2={compareBackups.backup2}
            onClear={handleClearComparison}
          />
        );
      case 'scheduler':
        return <SchedulerView managedDevices={managedDevices} />;
      default:
        return <BackupHistoryView onCompare={handleCompare} managedDevices={managedDevices} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex gap-2 mb-6 pb-4 border-b border-slate-700">
        <button
          onClick={() => setActiveView('history')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          备份历史
        </button>
        <button
          onClick={() => setActiveView('diff')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'diff'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          差异对比
        </button>
        <button
          onClick={() => setActiveView('scheduler')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'scheduler'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          定时任务
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderView()}
      </div>
    </div>
  );
};

export default ConfigBackupView;
