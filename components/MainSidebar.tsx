import React from 'react';
import { AppView } from '../App';
import { LayoutDashboardIcon, NetworkIcon } from './Icons';

interface MainSidebarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

const MainSidebar: React.FC<MainSidebarProps> = ({ currentView, onViewChange }) => {
    return (
        <div className="w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 space-y-4">
            <div className="text-blue-500 font-bold text-lg">N</div>
            <div className="flex-1 flex flex-col items-center justify-start space-y-4 mt-8">
                 <button 
                    onClick={() => onViewChange('topology')}
                    className={`p-3 rounded-lg transition-colors ${currentView === 'topology' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Topology Design"
                >
                    <NetworkIcon className="w-6 h-6" />
                </button>
                 <button 
                    onClick={() => onViewChange('operations')}
                    className={`p-3 rounded-lg transition-colors ${currentView === 'operations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Operations Center"
                >
                    <LayoutDashboardIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default MainSidebar;