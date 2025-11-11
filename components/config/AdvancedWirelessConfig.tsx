
import React from 'react';
import { Node, DeviceType, Vendor } from '../../types';
import { SpinnerIcon } from '../Icons';

interface AdvancedWirelessConfigProps {
    selectedNode: Node;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    onOpenModal: () => void;
    isGenerating: boolean;
}

const AdvancedWirelessConfig: React.FC<AdvancedWirelessConfigProps> = ({ selectedNode, isExpanded, onToggle, onToggleFeature, onOpenModal, isGenerating }) => {
    
    if (!selectedNode) return null;

    const config = selectedNode.config.wireless;
    const isAC = selectedNode.type === DeviceType.AC;
    const isApplicable = isAC && (selectedNode.vendor === Vendor.Huawei || selectedNode.vendor === Vendor.Cisco);

    return (
        <div className="bg-slate-800/30 rounded-lg">
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/30 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">无线配置 (Wireless)</h4>
                </div>
                {isApplicable && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFeature();
                        }}
                        className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        {config.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                )}
            </div>
            {isExpanded && (
                <div className="border-t border-slate-600 p-3">
                    {isApplicable && config.enabled ? (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <button
                                    onClick={onOpenModal}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md flex items-center gap-2"
                                >
                                    <span>📡</span>
                                    打开无线配置
                                </button>
                            </div>
                            <div>
                                <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                                <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 min-h-[5rem] flex items-center justify-center">
                                    {isGenerating ? (
                                        <div className="flex items-center text-slate-400">
                                            <SpinnerIcon className="w-4 h-4 mr-2" />
                                            <span>Generating...</span>
                                        </div>
                                    ) : (
                                        config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                                    )}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 italic">
                            {
                                !isAC ? "Wireless configuration only available on Access Controllers." :
                                !isApplicable ? `Advanced wireless configuration is only available for Huawei and Cisco ACs.` :
                                "Enable the feature to begin configuration."
                            }
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdvancedWirelessConfig;
