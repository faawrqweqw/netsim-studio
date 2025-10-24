
import React from 'react';
import { Node } from '../../types';
import SecurityZoneConfig from './SecurityZoneConfig';
import SecurityPolicyConfig from './SecurityPolicyConfig';
import { SpinnerIcon } from '../Icons';

interface SecurityConfigContainerProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    isGenerating: boolean;
    expandedSections: Record<string, boolean>;
    toggleSection: (section: string) => void;
}

const SecurityConfig: React.FC<SecurityConfigContainerProps> = ({
    selectedNode,
    onNodeUpdate,
    isExpanded,
    onToggle,
    isGenerating,
    expandedSections,
    toggleSection
}) => {
    const config = selectedNode.config.security;

    const handleToggleZones = () => {
        onNodeUpdate({
            ...selectedNode,
            config: { ...selectedNode.config, security: { ...config, zonesEnabled: !config.zonesEnabled } }
        });
    };

    const handleTogglePolicies = () => {
        onNodeUpdate({
            ...selectedNode,
            config: { ...selectedNode.config, security: { ...config, policiesEnabled: !config.policiesEnabled } }
        });
    };

    return (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={onToggle}>
                <div className="flex items-center gap-3">
                    <span className={`transition-transform text-slate-300 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h3 className="font-bold text-base text-slate-200">安全配置</h3>
                </div>
            </div>
            {isExpanded && (
                <div className="p-2 space-y-2 border-t border-slate-700">
                    <SecurityZoneConfig
                        selectedNode={selectedNode}
                        onNodeUpdate={onNodeUpdate}
                        isExpanded={expandedSections.securityZone}
                        onToggle={() => toggleSection('securityZone')}
                        isEnabled={config.zonesEnabled}
                        onToggleEnabled={handleToggleZones}
                    />
                    <SecurityPolicyConfig
                        selectedNode={selectedNode}
                        onNodeUpdate={onNodeUpdate}
                        isExpanded={expandedSections.securityPolicy}
                        onToggle={() => toggleSection('securityPolicy')}
                        isEnabled={config.policiesEnabled}
                        onToggleEnabled={handleTogglePolicies}
                    />
                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-auto whitespace-pre-wrap max-h-48 min-h-[5rem]">
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
            )}
        </div>
    );
};

export default SecurityConfig;
