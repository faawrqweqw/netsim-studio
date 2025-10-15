import React from 'react';
import { Node } from '../../types';

interface StyleConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
}

const StyleConfig: React.FC<StyleConfigProps> = ({ selectedNode, onNodeUpdate }) => {
    return (
        <div className="space-y-4 overflow-y-auto">
            <div>
                <label htmlFor="nodeColor" className="block text-sm font-medium text-slate-400 mb-1">Node Color</label>
                <input
                    type="color"
                    id="nodeColor"
                    value={selectedNode.style.color}
                    onChange={(e) => onNodeUpdate({ ...selectedNode, style: { ...selectedNode.style, color: e.target.value } })}
                    className="w-full h-10 p-1 bg-slate-700 border border-slate-600 rounded-md cursor-pointer"
                />
            </div>
            <div>
                <label htmlFor="iconSize" className="block text-sm font-medium text-slate-400 mb-1">Icon Size ({selectedNode.style.iconSize}px)</label>
                <input
                    type="range"
                    id="iconSize"
                    min="24"
                    max="96"
                    step="4"
                    value={selectedNode.style.iconSize}
                    onChange={(e) => onNodeUpdate({ ...selectedNode, style: { ...selectedNode.style, iconSize: parseInt(e.target.value, 10) } })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
    );
};

export default StyleConfig;