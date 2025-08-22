import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Node, Connection, DeviceType, NodeConfig } from '../types';
import { generateConfig } from '../services/configService';
import WirelessConfigModal from './WirelessConfigModal';
import AdvancedWirelessConfigModal from './AdvancedWirelessConfigModal';

import NodeInfo from './config/NodeInfo';
import StyleConfig from './config/StyleConfig';
import CommandsView from './config/CommandsView';
import ExplanationView from './config/ExplanationView';
import DHCPConfig from './config/DHCPConfig';
import VLANConfig from './config/VLANConfig';
import InterfaceConfig from './config/InterfaceConfig';
import LinkAggregationConfig from './config/LinkAggregationConfig';
import STPConfig from './config/STPConfig';
import VRRPConfig from './config/VRRPConfig';
import WirelessConfig from './config/WirelessConfig';
import AdvancedWirelessConfig from './config/AdvancedWirelessConfig';
import RoutingConfig from './config/RoutingConfig';
import ConnectionConfig from './config/ConnectionConfig';
import ACLConfig from './config/ACLConfig';
import { generateAllCliCommands, generateFullExplanation } from '../services/configService';


interface ConfigPanelProps {
    selectedNode: Node | null;
    selectedConnection: Connection | null;
    nodes: Node[];
    connections: Connection[];
    onNodeUpdate: (node: Node) => void;
    onConnectionUpdate: (conn: Connection) => void;
}

type Tab = 'info' | 'manage' | 'style' | 'commands' | 'explanation';
type Feature = 'DHCP' | 'VLAN' | 'Interface' | 'Link Aggregation' | 'STP' | 'Routing' | 'VRRP' | 'Wireless' | 'ACL';

// A type that represents config objects that have an 'enabled' property
type ToggleableFeatureConfig = { enabled: boolean; [key: string]: any; };

// A type for keys of NodeConfig that correspond to ToggleableFeatureConfig
type ToggleableFeatureKey = {
    [K in keyof NodeConfig]: NodeConfig[K] extends ToggleableFeatureConfig ? K : never;
}[keyof NodeConfig];


type ExpandedSections = {
    l3IpServices: boolean;
    l2Switching: boolean;
    l3IpRouting: boolean;
    reliability: boolean;
    wirelessConfig: boolean;
    aclAndQos: boolean;
    dhcp: boolean;
    vlan: boolean;
    interfaceIP: boolean;
    linkAggregation: boolean;
    stp: boolean;
    staticRouting: boolean;
    ospf: boolean;
    vrrp: boolean;
    acl: boolean;
    wireless: boolean;
};

const featureApplicability: Record<string, DeviceType[]> = {
    'DHCP': [DeviceType.Router, DeviceType.L3Switch, DeviceType.AC, DeviceType.Firewall],
    'VLAN': [DeviceType.L2Switch, DeviceType.L3Switch, DeviceType.Router, DeviceType.AC],
    'Interface': [DeviceType.Router, DeviceType.Firewall],
    'Link Aggregation': [DeviceType.L2Switch, DeviceType.L3Switch, DeviceType.Router, DeviceType.AC],
    'STP': [DeviceType.L2Switch, DeviceType.L3Switch],
    'Routing': [DeviceType.Router, DeviceType.L3Switch, DeviceType.AC, DeviceType.Firewall],
    'VRRP': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
    'ACL': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
    'Wireless': [DeviceType.AC],
};

const isFeatureApplicable = (feature: string, deviceType: DeviceType): boolean => {
    return featureApplicability[feature]?.includes(deviceType) ?? false;
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ selectedNode, selectedConnection, nodes, connections, onNodeUpdate, onConnectionUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [showWirelessModal, setShowWirelessModal] = useState(false);
    const [generatingFeatures, setGeneratingFeatures] = useState<Set<string>>(new Set());
    const debounceTimers = useRef<{ [key: string]: number }>({});

    const selectedNodeRef = useRef(selectedNode);
    useEffect(() => {
        selectedNodeRef.current = selectedNode;
    }, [selectedNode]);

    const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
        l3IpServices: false,
        l2Switching: false,
        l3IpRouting: false,
        reliability: false,
        wirelessConfig: false,
        aclAndQos: false,
        dhcp: false,
        vlan: false,
        interfaceIP: false,
        linkAggregation: false,
        stp: false,
        staticRouting: false,
        ospf: false,
        vrrp: false,
        acl: false,
        wireless: false
    });

    const toggleSection = useCallback((section: keyof ExpandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    }, []);

    const generateConfigAuto = useCallback(async (feature: Feature) => {
        const currentNode = selectedNodeRef.current;
        if (!currentNode || !isFeatureApplicable(feature, currentNode.type)) return;

        setGeneratingFeatures(prev => new Set(prev).add(feature));
        try {
            const { cli, explanation } = await generateConfig(currentNode, feature);
            
            let featureKey: keyof NodeConfig;
            switch(feature) {
                case 'Link Aggregation': featureKey = 'linkAggregation'; break;
                case 'DHCP': featureKey = 'dhcp'; break;
                case 'VLAN': featureKey = 'vlan'; break;
                case 'Interface': featureKey = 'interfaceIP'; break;
                case 'STP': featureKey = 'stp'; break;
                case 'Routing': featureKey = 'routing'; break;
                case 'VRRP': featureKey = 'vrrp'; break;
                case 'ACL': featureKey = 'acl'; break;
                case 'Wireless': featureKey = 'wireless'; break;
                default: return;
            }

            const latestNode = selectedNodeRef.current;
            if (!latestNode || latestNode.id !== currentNode.id) return;
            
            const currentFeatureConfig = latestNode.config[featureKey];
            if(typeof currentFeatureConfig === 'object' && currentFeatureConfig !== null && !Array.isArray(currentFeatureConfig)){
                onNodeUpdate({
                    ...latestNode,
                    config: {
                        ...latestNode.config,
                        [featureKey]: {
                            ...currentFeatureConfig,
                            cli,
                            explanation,
                        },
                    },
                });
            }

        } catch (error) {
            console.warn(`Failed to generate ${feature} config:`, error);
        } finally {
            setGeneratingFeatures(prev => {
                const next = new Set(prev);
                next.delete(feature);
                return next;
            });
        }
    }, [onNodeUpdate]);

    const debouncedGenerateConfig = useCallback((feature: Feature) => {
        if (debounceTimers.current[feature]) clearTimeout(debounceTimers.current[feature]);
        debounceTimers.current[feature] = window.setTimeout(() => generateConfigAuto(feature), 500);
    }, [generateConfigAuto]);

    const handleToggleFeature = useCallback((feature: Feature) => {
        const currentNode = selectedNodeRef.current;
        if (!currentNode) return;
        
        let featureKey: ToggleableFeatureKey;
        switch(feature) {
            case 'Link Aggregation': featureKey = 'linkAggregation'; break;
            case 'DHCP': featureKey = 'dhcp'; break;
            case 'VLAN': featureKey = 'vlan'; break;
            case 'Interface': featureKey = 'interfaceIP'; break;
            case 'STP': featureKey = 'stp'; break;
            case 'VRRP': featureKey = 'vrrp'; break;
            case 'ACL': featureKey = 'acl'; break;
            case 'Wireless': featureKey = 'wireless'; break;
            default: return; // Routing is not toggleable
        }
        
        const currentConfig = currentNode.config[featureKey] as ToggleableFeatureConfig;

        onNodeUpdate({
            ...currentNode,
            config: {
                ...currentNode.config,
                [featureKey]: { ...currentConfig, enabled: !currentConfig.enabled }
            }
        });
    }, [onNodeUpdate]);

    useEffect(() => {
        if (selectedNode?.config.dhcp.enabled && isFeatureApplicable('DHCP', selectedNode.type)) debouncedGenerateConfig('DHCP');
    }, [selectedNode?.config.dhcp, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.vlan.enabled && isFeatureApplicable('VLAN', selectedNode.type)) debouncedGenerateConfig('VLAN');
    }, [selectedNode?.config.vlan, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.interfaceIP.enabled && isFeatureApplicable('Interface', selectedNode.type)) debouncedGenerateConfig('Interface');
    }, [selectedNode?.config.interfaceIP, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.linkAggregation.enabled && isFeatureApplicable('Link Aggregation', selectedNode.type)) debouncedGenerateConfig('Link Aggregation');
    }, [selectedNode?.config.linkAggregation, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.stp.enabled && isFeatureApplicable('STP', selectedNode.type)) debouncedGenerateConfig('STP');
    }, [selectedNode?.config.stp, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if ((selectedNode?.config.routing.staticRoutes.length > 0 || selectedNode?.config.routing.ospf.enabled) && isFeatureApplicable('Routing', selectedNode.type)) {
            debouncedGenerateConfig('Routing');
        }
    }, [selectedNode?.config.routing, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.vrrp.enabled && isFeatureApplicable('VRRP', selectedNode.type)) debouncedGenerateConfig('VRRP');
    }, [selectedNode?.config.vrrp, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.acl.enabled && isFeatureApplicable('ACL', selectedNode.type)) debouncedGenerateConfig('ACL');
    }, [selectedNode?.config.acl, selectedNode?.config.timeRanges, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.wireless.enabled && isFeatureApplicable('Wireless', selectedNode.type)) debouncedGenerateConfig('Wireless');
    }, [selectedNode?.config.wireless, selectedNode?.type, debouncedGenerateConfig]);

    const isConfigurableDevice = selectedNode && ![DeviceType.Text, DeviceType.Rectangle, DeviceType.Circle, DeviceType.Halo].includes(selectedNode.type);
    
    const TABS: Array<{ key: Tab, label: string, show: boolean }> = [
        { key: 'info', label: 'Info', show: true },
        { key: 'manage', label: 'Manage', show: !!isConfigurableDevice },
        { key: 'style', label: 'Style', show: true },
        { key: 'commands', label: 'Device Commands', show: !!isConfigurableDevice },
        { key: 'explanation', label: '命令解释', show: !!isConfigurableDevice }
    ];
    
    const visibleTabs = useMemo(() => TABS.filter(tab => tab.show), [isConfigurableDevice]);
    
    useEffect(() => {
        if (selectedNode && !visibleTabs.some(t => t.key === activeTab)) {
            setActiveTab('info');
        }
    }, [selectedNode, activeTab, visibleTabs]);

    if (selectedConnection) {
        return <ConnectionConfig selectedConnection={selectedConnection} nodes={nodes} onConnectionUpdate={onConnectionUpdate} />;
    }

    if (!selectedNode) {
        return (
            <div className="w-96 bg-slate-800 p-4 border-l border-slate-700 flex items-center justify-center">
                <p className="text-slate-400">Select an item to configure</p>
            </div>
        );
    }
    
    const allCliCommands = generateAllCliCommands(selectedNode, connections);
    const allExplanations = generateFullExplanation(selectedNode, connections);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'info':
                return <NodeInfo selectedNode={selectedNode} nodes={nodes} connections={connections} onNodeUpdate={onNodeUpdate} onConnectionUpdate={onConnectionUpdate} />;
            case 'manage':
                if (!isConfigurableDevice) return null;
                return (
                    <div className="space-y-2 h-full overflow-y-auto">
                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('l3IpServices')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.l3IpServices ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">三层IP业务配置</h3>
                                </div>
                            </div>
                            {expandedSections.l3IpServices && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('Interface', selectedNode.type) && <InterfaceConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.interfaceIP} onToggle={() => toggleSection('interfaceIP')} onToggleFeature={() => handleToggleFeature('Interface')} isGenerating={generatingFeatures.has('Interface')} />}
                                    {isFeatureApplicable('VLAN', selectedNode.type) && <VLANConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.vlan} onToggle={() => toggleSection('vlan')} onToggleFeature={() => handleToggleFeature('VLAN')} isGenerating={generatingFeatures.has('VLAN')} />}
                                    {isFeatureApplicable('DHCP', selectedNode.type) && <DHCPConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.dhcp} onToggle={() => toggleSection('dhcp')} onToggleFeature={() => handleToggleFeature('DHCP')} isGenerating={generatingFeatures.has('DHCP')} />}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('l2Switching')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.l2Switching ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">二层交换配置</h3>
                                </div>
                            </div>
                            {expandedSections.l2Switching && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('Link Aggregation', selectedNode.type) && <LinkAggregationConfig selectedNode={selectedNode} connections={connections} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.linkAggregation} onToggle={() => toggleSection('linkAggregation')} onToggleFeature={() => handleToggleFeature('Link Aggregation')} isGenerating={generatingFeatures.has('Link Aggregation')} />}
                                    {isFeatureApplicable('STP', selectedNode.type) && <STPConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.stp} onToggle={() => toggleSection('stp')} onToggleFeature={() => handleToggleFeature('STP')} isGenerating={generatingFeatures.has('STP')} />}
                                </div>
                            )}
                        </div>

                        {isFeatureApplicable('Routing', selectedNode.type) && <RoutingConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isL3IpRoutingExpanded={expandedSections.l3IpRouting} isStaticRoutingExpanded={expandedSections.staticRouting} isOspfExpanded={expandedSections.ospf} onToggleSection={toggleSection} isGenerating={generatingFeatures.has('Routing')} />}
                        
                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('aclAndQos')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.aclAndQos ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">ACL和QOS</h3>
                                </div>
                            </div>
                            {expandedSections.aclAndQos && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('ACL', selectedNode.type) && <ACLConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.acl} onToggle={() => toggleSection('acl')} onToggleFeature={() => handleToggleFeature('ACL')} isGenerating={generatingFeatures.has('ACL')} />}
                                </div>
                            )}
                        </div>

                        {isFeatureApplicable('VRRP', selectedNode.type) && (
                           <div className="bg-slate-800 rounded-lg overflow-hidden">
                                <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('reliability')}>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-transform text-slate-300 ${expandedSections.reliability ? 'rotate-90' : ''}`}>▶</span>
                                        <h3 className="font-bold text-base text-slate-200">可靠性配置</h3>
                                    </div>
                                </div>
                                {expandedSections.reliability && <div className="p-2 space-y-2 border-t border-slate-700"><VRRPConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.vrrp} onToggle={() => toggleSection('vrrp')} onToggleFeature={() => handleToggleFeature('VRRP')} isGenerating={generatingFeatures.has('VRRP')} /></div>}
                            </div>
                        )}

                        {isFeatureApplicable('Wireless', selectedNode.type) && (
                             <div className="bg-slate-800 rounded-lg overflow-hidden">
                                <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('wirelessConfig')}>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-transform text-slate-300 ${expandedSections.wirelessConfig ? 'rotate-90' : ''}`}>▶</span>
                                        <h3 className="font-bold text-base text-slate-200">无线业务配置</h3>
                                    </div>
                                </div>
                                {expandedSections.wirelessConfig && (
                                    <div className="p-2 space-y-2 border-t border-slate-700">
                                        {(selectedNode.vendor === 'Huawei' || selectedNode.vendor === 'Cisco') ? 
                                            <AdvancedWirelessConfig selectedNode={selectedNode} isExpanded={expandedSections.wireless} onToggle={() => toggleSection('wireless')} onToggleFeature={() => handleToggleFeature('Wireless')} onOpenModal={() => setShowWirelessModal(true)} isGenerating={generatingFeatures.has('Wireless')} /> : 
                                            <WirelessConfig selectedNode={selectedNode} isExpanded={expandedSections.wireless} onToggle={() => toggleSection('wireless')} onToggleFeature={() => handleToggleFeature('Wireless')} onOpenModal={() => setShowWirelessModal(true)} isGenerating={generatingFeatures.has('Wireless')} />}
                                    </div>
                                )}
                             </div>
                        )}
                    </div>
                );
            case 'style': return <StyleConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} />;
            case 'commands': return <CommandsView cliCommands={allCliCommands} />;
            case 'explanation': return <ExplanationView explanation={allExplanations} />;
            default: return null;
        }
    };
    
    const renderWirelessModal = () => {
        if (!showWirelessModal || !selectedNode) return null;
        if (selectedNode.vendor === 'Huawei' || selectedNode.vendor === 'Cisco') {
            return <AdvancedWirelessConfigModal isOpen={showWirelessModal} selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} onClose={() => setShowWirelessModal(false)} />;
        }
        if (selectedNode.vendor === 'H3C') {
            return <WirelessConfigModal isOpen={showWirelessModal} selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} onClose={() => setShowWirelessModal(false)} />;
        }
        return null;
    };

    return (
        <>
            <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold">{selectedNode.name}</h3>
                    <p className="text-sm text-slate-400">{selectedNode.vendor} {selectedNode.type}</p>
                </div>
                <div className="flex border-b border-slate-700">
                    {visibleTabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === tab.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 p-4 min-h-0">{renderTabContent()}</div>
            </div>
            {renderWirelessModal()}
        </>
    );
};

export default ConfigPanel;