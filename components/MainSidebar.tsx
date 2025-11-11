
import React, { useState, useRef, useEffect } from 'react';
import { AppView } from '../App';
import { LayoutDashboardIcon, NetworkIcon, PlusIcon, ChevronDownIcon, EditIcon, TrashIcon } from './Icons';
import { AppState } from '../types';

interface MainSidebarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
    onNewTopology: () => void;
    appState: AppState;
    onSwitchTopology: (id: string) => void;
    onRenameTopology: (id: string, newName: string) => void;
    onDeleteTopology: (id: string) => void;
}

const MainSidebar: React.FC<MainSidebarProps> = ({ 
    currentView, 
    onViewChange, 
    onNewTopology, 
    appState,
    onSwitchTopology,
    onRenameTopology,
    onDeleteTopology
}) => {
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);
    const activeTopology = appState.topologies[appState.activeTopologyId];
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsSwitcherOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [switcherRef]);

    const canDelete = Object.keys(appState.topologies).length > 1;

    return (
        <div className="w-20 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 space-y-4">
            <div className="text-blue-500 font-bold text-lg">N</div>

            <div ref={switcherRef} className="relative w-full px-2 mt-4">
                <button
                    onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                    className="w-full text-center px-2 py-2 rounded-lg transition-colors text-slate-300 hover:bg-slate-700 flex items-center justify-center gap-1"
                    title={activeTopology?.name}
                >
                    <span className="truncate text-xs flex-1 text-center">{activeTopology?.name || '...'}</span>
                    <ChevronDownIcon className="w-3 h-3 flex-shrink-0" />
                </button>
                {isSwitcherOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20">
                        <ul className="py-1 text-sm text-slate-300 max-h-48 overflow-y-auto">
                            {Object.values(appState.topologies).map(topo => (
                                <li key={topo.id}>
                                    <button
                                        onClick={() => { onSwitchTopology(topo.id); setIsSwitcherOpen(false); }}
                                        className={`w-full text-left px-3 py-1.5 truncate ${topo.id === appState.activeTopologyId ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}
                                    >
                                        {topo.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="border-t border-slate-600 my-1"></div>
                        <ul className="py-1 text-sm text-slate-300">
                             <li>
                                <button onClick={() => {
                                    const newName = prompt('输入新的拓扑名称:', activeTopology.name);
                                    if (newName && newName.trim()) {
                                        onRenameTopology(activeTopology.id, newName.trim());
                                    }
                                    setIsSwitcherOpen(false);
                                }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center gap-2">
                                    <EditIcon className="w-4 h-4" /> 重命名...
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => {
                                        onDeleteTopology(activeTopology.id);
                                        setIsSwitcherOpen(false);
                                    }} 
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${canDelete ? 'text-red-400 hover:bg-slate-700' : 'text-slate-500 cursor-not-allowed'}`}
                                    disabled={!canDelete}
                                    title={canDelete ? "删除拓扑" : "无法删除最后一个拓扑"}
                                >
                                    <TrashIcon className="w-4 h-4" /> 删除...
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-start space-y-4 mt-8">
                 <button 
                    onClick={() => onViewChange('topology')}
                    className={`p-3 rounded-lg transition-colors ${currentView === 'topology' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="拓扑设计"
                >
                    <NetworkIcon className="w-6 h-6" />
                </button>
                 <button 
                    onClick={() => onViewChange('operations')}
                    className={`p-3 rounded-lg transition-colors ${currentView === 'operations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="运维中心"
                >
                    <LayoutDashboardIcon className="w-6 h-6" />
                </button>
                <div className="border-t border-slate-700 w-full my-2"></div>
                <button
                    onClick={onNewTopology}
                    className="p-3 rounded-lg transition-colors text-slate-400 hover:bg-slate-700"
                    title="新建拓扑"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default MainSidebar;
