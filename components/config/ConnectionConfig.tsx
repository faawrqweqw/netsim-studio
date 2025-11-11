
import React from 'react';
import { Connection, Node } from '../../types';
import { SolidLineIcon, DashedLineIcon, LineChartIcon, OrthogonalLineIcon } from '../Icons';

interface ConnectionConfigProps {
    selectedConnection: Connection;
    nodes: Node[];
    onConnectionUpdate: (conn: Connection) => void;
}

const getSmartEdgePoint = (sourceNode: Node, targetNode: Node): { x: number; y: number } => {
    const sx = sourceNode.x;
    const sy = sourceNode.y;
    const tx = targetNode.x;
    const ty = targetNode.y;
    const { iconSize } = sourceNode.style;
    const halfWidth = iconSize / 2;
    const halfHeight = iconSize / 2;

    const dx = tx - sx;
    const dy = ty - sy;

    if (dx === 0 && dy === 0) return { x: sx, y: sy };

    const tan_theta = Math.abs(dy / dx);
    const tan_alpha = halfHeight / halfWidth;

    let x, y;

    if (tan_theta < tan_alpha) {
        x = sx + halfWidth * Math.sign(dx);
        y = sy + halfWidth * Math.abs(dy / dx) * Math.sign(dy);
    } else {
        y = sy + halfHeight * Math.sign(dy);
        x = sx + halfHeight * Math.abs(dx / dy) * Math.sign(dx);
    }
    return { x, y };
};


const ConnectionConfig: React.FC<ConnectionConfigProps> = ({ selectedConnection, nodes, onConnectionUpdate }) => {
    
    const fromNode = nodes.find(n => n.id === selectedConnection.from.nodeId);
    const toNode = nodes.find(n => n.id === selectedConnection.to.nodeId);
    
    const handleStyleChange = (style: 'direct' | 'orthogonal') => {
        if (style === 'orthogonal') {
            if (fromNode && toNode) {
                const fromPos = getSmartEdgePoint(fromNode, toNode);
                const toPos = getSmartEdgePoint(toNode, fromNode);
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                const ratio = 0.5;
                let initialPoints;

                if (Math.abs(dx) > Math.abs(dy)) { // Horizontal-first
                    const midX = fromPos.x + dx * ratio;
                    initialPoints = [{ x: midX, y: fromPos.y }, { x: midX, y: toPos.y }];
                } else { // Vertical-first
                    const midY = fromPos.y + dy * ratio;
                    initialPoints = [{ x: fromPos.x, y: midY }, { x: toPos.x, y: midY }];
                }
                onConnectionUpdate({ ...selectedConnection, style, path: { ...selectedConnection.path, points: initialPoints } });
            }
        } else { // direct style
            onConnectionUpdate({ ...selectedConnection, style, path: { ...selectedConnection.path, points: [] } });
        }
    };


    const handleTypeChange = (type: 'solid' | 'dashed') => {
        onConnectionUpdate({ ...selectedConnection, type });
    };

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
             </div>
        </div>
    );
};

export default ConnectionConfig;
