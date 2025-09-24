import React from 'react';
import { Connection, Node } from '../../types';
import { SolidLineIcon, DashedLineIcon, LineChartIcon, CurveIcon, OrthogonalLineIcon } from '../Icons';

interface ConnectionConfigProps {
    selectedConnection: Connection;
    nodes: Node[];
    onConnectionUpdate: (conn: Connection) => void;
}

const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ selectedConnection, nodes, onConnectionUpdate }) => {
    
    const fromNode = nodes.find(n => n.id === selectedConnection.from.nodeId);
    const toNode = nodes.find(n => n.id === selectedConnection.to.nodeId);
    
    const handleStyleChange = (style: 'direct' | 'orthogonal') => {
        onConnectionUpdate({ ...selectedConnection, style });
    };

    const handleTypeChange = (type: 'solid' | 'dashed') => {
        onConnectionUpdate({ ...selectedConnection, type });
    };

    const handlePathRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onConnectionUpdate({
            ...selectedConnection,
            path: {
                ...selectedConnection.path,
                midPointRatio: parseFloat(e.target.value)
            }
        });
    }

    return (
         <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-bold">Connection</h3>
                <p className="text-sm text-slate-400 truncate">
                    From: {fromNode?.name || '...'} to: {toNode?.name || '...'}
                </p>
            </div>
             <div className="flex-1 p-4 min-h-0 space-y-6 overflow-y-auto">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Line Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleTypeChange('solid')} className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-colors ${selectedConnection.type === 'solid' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            <SolidLineIcon className="w-8 h-8"/>
                            <span className="text-xs">Solid</span>
                        </button>
                        <button onClick={() => handleTypeChange('dashed')} className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-colors ${selectedConnection.type === 'dashed' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            <DashedLineIcon className="w-8 h-8"/>
                            <span className="text-xs">Dashed</span>
                        </button>
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Line Style</label>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => handleStyleChange('direct')} className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-colors ${selectedConnection.style === 'direct' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            <LineChartIcon className="w-6 h-6 rotate-45"/>
                            <span className="text-xs">Direct</span>
                        </button>
                        <button onClick={() => handleStyleChange('orthogonal')} className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-colors ${selectedConnection.style === 'orthogonal' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            <OrthogonalLineIcon className="w-6 h-6"/>
                            <span className="text-xs">Orthogonal</span>
                        </button>
                    </div>
                </div>
                
                {selectedConnection.style === 'orthogonal' && (
                    <div>
                        <label htmlFor="pathRatio" className="block text-sm font-medium text-slate-300 mb-1">
                            Path Position ({(selectedConnection.path?.midPointRatio ?? 0.5) * 100}%)
                        </label>
                        <input
                            type="range"
                            id="pathRatio"
                            min="0.05"
                            max="0.95"
                            step="0.01"
                            value={selectedConnection.path?.midPointRatio ?? 0.5}
                            onChange={handlePathRatioChange}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                         <p className="text-xs text-slate-500 mt-1">Adjusts the position of the orthogonal bend.</p>
                    </div>
                )}
             </div>
        </div>
    );
};

export default ConnectionConfig;