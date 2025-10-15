



import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Node, Connection, DeviceType, NodeConfig, Vendor } from '../types';
import { generateConfig } from '../services/configService';
import WirelessConfigModal from './WirelessConfigModal';
import AdvancedWirelessConfigModal from './AdvancedWirelessConfigModal';

import NodeInfo from './config/NodeInfo';
import CommandsView from './config/CommandsView';
import CommandHelperView from './config/CommandHelperView';
import DHCPConfig from './config/DHCPConfig';
import DHCPRelayConfig from './config/DHCPRelayConfig';
import DHCPSnoopingConfig from './config/DHCPSnoopingConfig';
import VLANConfig from './config/VLANConfig';
import InterfaceConfig from './config/InterfaceConfig';
import LinkAggregationConfig from './config/LinkAggregationConfig';
import PortIsolationConfig from './config/PortIsolationConfig';
import StackingConfig from './config/StackingConfig';
import MLAGConfig from './config/MLAGConfig';
import STPConfig from './config/STPConfig';
import VRRPConfig from './config/VRRPConfig';
import WirelessConfig from './config/WirelessConfig';
import AdvancedWirelessConfig from './config/AdvancedWirelessConfig';
import RoutingConfig from './config/RoutingConfig';
import ConnectionConfig from './config/ConnectionConfig';
import ACLConfig from './config/ACLConfig';
// Fix: Use default import for NATConfig
import NATConfig from './config/NATConfig';
import SSHConfig from './config/SSHConfig';
import SecurityZoneConfig from './config/SecurityZoneConfig';
import SecurityPolicyConfig from './config/SecurityPolicyConfig';
import AddressGroupConfig from './config/AddressGroupConfig';
import ServiceGroupConfig from './config/ServiceGroupConfig';
import DomainGroupConfig from './config/DomainGroupConfig';
import IPsecConfig from './config/IPsecConfig';
import HAConfig from './config/HAConfig';
import GREVPNConfig from './config/GREVPNConfig';

import { generateAllCliCommands } from '../services/configService';
import { SpinnerIcon } from './Icons';


interface ConfigPanelProps {
    selectedNode: Node | null;
    selectedConnection: Connection | null;
    nodes: Node[];
    connections: Connection[];
    onNodeUpdate: (node: Node) => void;
    onConnectionUpdate: (conn: Connection) => void;
}

type Tab = 'info' | 'manage' | 'commands' | 'helper';
type Feature = 'DHCP' | 'DHCP Relay' | 'DHCP Snooping' | 'VLAN' | 'Interface' | 'Link Aggregation' | 'Port Isolation' | 'STP' | 'Routing' | 'VRRP' | 'Wireless' | 'ACL' | 'NAT' | 'SSH' | 'Security' | 'Object Groups' | 'IPsec' | 'HA' | 'GRE VPN' | 'Stacking (IRF)' | 'M-LAG';

// A type that represents config objects that have an 'enabled' property
type ToggleableFeatureConfig = { enabled: boolean; [key: string]: any; };

// A type for keys of NodeConfig that correspond to ToggleableFeatureConfig
type ToggleableFeatureKey = {
    [K in keyof NodeConfig]: NodeConfig[K] extends ToggleableFeatureConfig ? K : never;
}[keyof NodeConfig];


type ExpandedSections = {
    generalConfig: boolean;
    l3IpServices: boolean;
    l2Switching: boolean;
    l3IpRouting: boolean;
    reliability: boolean;
    natConfig: boolean;
    wirelessConfig: boolean;
    aclAndQos: boolean;
    securityConfiguration: boolean;
    objectGroupConfiguration: boolean;
    vpnConfiguration: boolean;
    dhcp: boolean;
    dhcpRelay: boolean;
    dhcpSnooping: boolean;
    vlan: boolean;
    interfaceIP: boolean;
    linkAggregation: boolean;
    portIsolation: boolean;
    stacking: boolean;
    mlag: boolean;
    stp: boolean;
    staticRouting: boolean;
    ospf: boolean;
    vrrp: boolean;
    acl: boolean;
    nat: boolean;
    ssh: boolean;
    wireless: boolean;
    securityZone: boolean;
    securityPolicy: boolean;
    addressGroups: boolean;
    serviceGroups: boolean;
    domainGroups: boolean;
    ipsec: boolean;
    ha: boolean;
    gre: boolean;
};

const featureApplicability: Record<string, DeviceType[]> = {
    'Security': [DeviceType.Firewall],
    'Object Groups': [DeviceType.Firewall],
    'SSH': [DeviceType.Router, DeviceType.L3Switch, DeviceType.L2Switch, DeviceType.AC, DeviceType.Firewall],
    'DHCP': [DeviceType.Router, DeviceType.L3Switch, DeviceType.AC, DeviceType.Firewall],
    'DHCP Relay': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
    'DHCP Snooping': [DeviceType.L2Switch, DeviceType.L3Switch],
    'VLAN': [DeviceType.L2Switch, DeviceType.L3Switch, DeviceType.Router, DeviceType.AC],
    'Interface': [DeviceType.Router, DeviceType.Firewall],
    'Link Aggregation': [DeviceType.L2Switch, DeviceType.L3Switch, DeviceType.Router, DeviceType.AC, DeviceType.Firewall],
    'Port Isolation': [DeviceType.L2Switch, DeviceType.L3Switch],
    'Stacking (IRF)': [DeviceType.L2Switch, DeviceType.L3Switch],
    'M-LAG': [DeviceType.L2Switch, DeviceType.L3Switch],
    'STP': [DeviceType.L2Switch, DeviceType.L3Switch],
    'Routing': [DeviceType.Router, DeviceType.L3Switch, DeviceType.AC, DeviceType.Firewall],
    'VRRP': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
    'HA': [DeviceType.Firewall],
    'ACL': [DeviceType.Router, DeviceType.L3Switch, DeviceType.Firewall],
    'NAT': [DeviceType.Router, DeviceType.Firewall],
    'Wireless': [DeviceType.AC],
    'IPsec': [DeviceType.Firewall, DeviceType.Router],
    'GRE VPN': [DeviceType.Router, DeviceType.Firewall],
};

const isFeatureApplicable = (feature: string, deviceType: DeviceType): boolean => {
    return featureApplicability[feature]?.includes(deviceType) ?? true;
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
        generalConfig: false,
        l3IpServices: false,
        l2Switching: false,
        l3IpRouting: false,
        reliability: false,
        natConfig: false,
        wirelessConfig: false,
        aclAndQos: false,
        securityConfiguration: false,
        objectGroupConfiguration: false,
        vpnConfiguration: false,
        dhcp: false,
        dhcpRelay: false,
        dhcpSnooping: false,
        vlan: false,
        interfaceIP: false,
        linkAggregation: false,
        portIsolation: false,
        stacking: false,
        mlag: false,
        stp: false,
        staticRouting: false,
        ospf: false,
        vrrp: false,
        acl: false,
        nat: false,
        ssh: false,
        wireless: false,
        securityZone: false,
        securityPolicy: false,
        addressGroups: false,
        serviceGroups: false,
        domainGroups: false,
        ipsec: false,
        ha: false,
        gre: false,
    });

    const toggleSection = useCallback((section: keyof ExpandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    }, []);

    const generateConfigAuto = useCallback((feature: Feature) => {
        const currentNode = selectedNodeRef.current;
        if (!currentNode || !isFeatureApplicable(feature, currentNode.type)) return;

        setGeneratingFeatures(prev => new Set(prev).add(feature));
        try {
            const { cli, explanation } = generateConfig(currentNode, feature);
            
            let featureKey: keyof NodeConfig;
            switch(feature) {
                case 'Link Aggregation': featureKey = 'linkAggregation'; break;
                case 'Port Isolation': featureKey = 'portIsolation'; break;
                case 'Stacking (IRF)': featureKey = 'stacking'; break;
                case 'M-LAG': featureKey = 'mlag'; break;
                case 'DHCP': featureKey = 'dhcp'; break;
                case 'DHCP Relay': featureKey = 'dhcpRelay'; break;
                case 'DHCP Snooping': featureKey = 'dhcpSnooping'; break;
                case 'VLAN': featureKey = 'vlan'; break;
                case 'Interface': featureKey = 'interfaceIP'; break;
                case 'STP': featureKey = 'stp'; break;
                case 'Routing': featureKey = 'routing'; break;
                case 'VRRP': featureKey = 'vrrp'; break;
                case 'ACL': featureKey = 'acl'; break;
                case 'NAT': featureKey = 'nat'; break;
                case 'SSH': featureKey = 'ssh'; break;
                case 'Wireless': featureKey = 'wireless'; break;
                case 'Security': featureKey = 'security'; break;
                case 'Object Groups': featureKey = 'objectGroups'; break;
                case 'IPsec': featureKey = 'ipsec'; break;
                case 'HA': featureKey = 'ha'; break;
                case 'GRE VPN': featureKey = 'gre'; break;
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
            case 'Port Isolation': featureKey = 'portIsolation'; break;
            case 'Stacking (IRF)': featureKey = 'stacking'; break;
            case 'M-LAG': featureKey = 'mlag'; break;
            case 'DHCP': featureKey = 'dhcp'; break;
            case 'DHCP Relay': featureKey = 'dhcpRelay'; break;
            case 'DHCP Snooping': featureKey = 'dhcpSnooping'; break;
            case 'VLAN': featureKey = 'vlan'; break;
            case 'Interface': featureKey = 'interfaceIP'; break;
            case 'STP': featureKey = 'stp'; break;
            case 'VRRP': featureKey = 'vrrp'; break;
            case 'ACL': featureKey = 'acl'; break;
            case 'NAT': featureKey = 'nat'; break;
            case 'SSH': featureKey = 'ssh'; break;
            case 'Wireless': featureKey = 'wireless'; break;
            case 'IPsec': featureKey = 'ipsec'; break;
            case 'HA': featureKey = 'ha'; break;
            case 'GRE VPN': featureKey = 'gre'; break;
            // Security and Object Groups are handled differently
            default: return;
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
        if (selectedNode && isFeatureApplicable('Object Groups', selectedNode.type)) {
            const { addressGroupsEnabled, serviceGroupsEnabled, domainGroupsEnabled } = selectedNode.config.objectGroups;
            if (addressGroupsEnabled || serviceGroupsEnabled || domainGroupsEnabled) {
                debouncedGenerateConfig('Object Groups');
            } else {
                const { cli, explanation } = generateConfig(selectedNode, 'Object Groups');
                 onNodeUpdate({
                    ...selectedNode,
                    config: { ...selectedNode.config, objectGroups: { ...selectedNode.config.objectGroups, cli, explanation } },
                });
            }
        }
    }, [selectedNode?.config.objectGroups, selectedNode?.type, debouncedGenerateConfig, onNodeUpdate]);


    useEffect(() => {
        if (selectedNode && isFeatureApplicable('Security', selectedNode.type) && (selectedNode.config.security.zonesEnabled || selectedNode.config.security.policiesEnabled)) {
            debouncedGenerateConfig('Security');
        } else if (selectedNode && isFeatureApplicable('Security', selectedNode.type)) {
            // When both are disabled, clear the CLI
            const { cli, explanation } = generateConfig(selectedNode, 'Security');
             onNodeUpdate({
                ...selectedNode,
                config: { ...selectedNode.config, security: { ...selectedNode.config.security, cli, explanation } },
            });
        }
    }, [selectedNode?.config.security, selectedNode?.type, debouncedGenerateConfig, onNodeUpdate]);


    useEffect(() => {
        if (selectedNode?.config.ssh.enabled && isFeatureApplicable('SSH', selectedNode.type)) debouncedGenerateConfig('SSH');
    }, [selectedNode?.config.ssh, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.ipsec.enabled && isFeatureApplicable('IPsec', selectedNode.type)) debouncedGenerateConfig('IPsec');
    }, [selectedNode?.config.ipsec, selectedNode?.config.acl, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.gre.enabled && isFeatureApplicable('GRE VPN', selectedNode.type)) debouncedGenerateConfig('GRE VPN');
    }, [selectedNode?.config.gre, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.dhcp.enabled && isFeatureApplicable('DHCP', selectedNode.type)) debouncedGenerateConfig('DHCP');
    }, [selectedNode?.config.dhcp, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.dhcpRelay.enabled && isFeatureApplicable('DHCP Relay', selectedNode.type)) debouncedGenerateConfig('DHCP Relay');
    }, [selectedNode?.config.dhcpRelay, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.dhcpSnooping.enabled && isFeatureApplicable('DHCP Snooping', selectedNode.type)) debouncedGenerateConfig('DHCP Snooping');
    }, [selectedNode?.config.dhcpSnooping, selectedNode?.type, debouncedGenerateConfig]);

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
        if (selectedNode?.config.portIsolation.enabled && isFeatureApplicable('Port Isolation', selectedNode.type)) debouncedGenerateConfig('Port Isolation');
    }, [selectedNode?.config.portIsolation, selectedNode?.type, debouncedGenerateConfig]);
    
    useEffect(() => {
        if (selectedNode?.config.stacking.enabled && isFeatureApplicable('Stacking (IRF)', selectedNode.type)) debouncedGenerateConfig('Stacking (IRF)');
    }, [selectedNode?.config.stacking, selectedNode?.type, debouncedGenerateConfig]);
    
    useEffect(() => {
        if (selectedNode?.config.mlag.enabled && isFeatureApplicable('M-LAG', selectedNode.type)) debouncedGenerateConfig('M-LAG');
    }, [selectedNode?.config.mlag, selectedNode?.type, debouncedGenerateConfig]);

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
        if (selectedNode?.config.ha.enabled && isFeatureApplicable('HA', selectedNode.type)) debouncedGenerateConfig('HA');
    }, [selectedNode?.config.ha, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.acl.enabled && isFeatureApplicable('ACL', selectedNode.type)) debouncedGenerateConfig('ACL');
    }, [selectedNode?.config.acl, selectedNode?.config.timeRanges, selectedNode?.type, debouncedGenerateConfig]);
    
    useEffect(() => {
        if (selectedNode?.config.nat.enabled && isFeatureApplicable('NAT', selectedNode.type)) {
            debouncedGenerateConfig('NAT');
        }
    }, [selectedNode?.config.nat, selectedNode?.type, debouncedGenerateConfig]);

    useEffect(() => {
        if (selectedNode?.config.wireless.enabled && isFeatureApplicable('Wireless', selectedNode.type)) debouncedGenerateConfig('Wireless');
    }, [selectedNode?.config.wireless, selectedNode?.type, debouncedGenerateConfig]);

    const isConfigurableDevice = selectedNode && ![DeviceType.Text, DeviceType.Rectangle, DeviceType.Circle, DeviceType.Halo].includes(selectedNode.type);
    
    const TABS: Array<{ key: Tab, label: string, show: boolean }> = [
        { key: 'info', label: 'Info', show: true },
        { key: 'manage', label: 'Manage', show: !!isConfigurableDevice },
        { key: 'commands', label: 'Device Commands', show: !!isConfigurableDevice },
        { key: 'helper', label: 'Command Helper', show: !!isConfigurableDevice }
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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'info':
                return <NodeInfo selectedNode={selectedNode} nodes={nodes} connections={connections} onNodeUpdate={onNodeUpdate} onConnectionUpdate={onConnectionUpdate} />;
            case 'manage':
                return (
                    <div className="space-y-2 h-full overflow-y-auto">
                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('generalConfig')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.generalConfig ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">通用配置</h3>
                                </div>
                            </div>
                            {expandedSections.generalConfig && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('SSH', selectedNode.type) && <SSHConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.ssh} onToggle={() => toggleSection('ssh')} onToggleFeature={() => handleToggleFeature('SSH')} isGenerating={generatingFeatures.has('SSH')} />}
                                </div>
                            )}
                        </div>

                        {isFeatureApplicable('Object Groups', selectedNode.type) && (
                            <div className="bg-slate-800 rounded-lg overflow-hidden">
                                <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('objectGroupConfiguration')}>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-transform text-slate-300 ${expandedSections.objectGroupConfiguration ? 'rotate-90' : ''}`}>▶</span>
                                        <h3 className="font-bold text-base text-slate-200">对象组配置</h3>
                                    </div>
                                </div>
                                {expandedSections.objectGroupConfiguration && (
                                    <div className="p-2 space-y-2 border-t border-slate-700">
                                        <AddressGroupConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.addressGroups}
                                            onToggle={() => toggleSection('addressGroups')}
                                            isEnabled={selectedNode.config.objectGroups.addressGroupsEnabled}
                                            onToggleEnabled={() => {
                                                const currentConfig = selectedNode.config.objectGroups;
                                                onNodeUpdate({
                                                    ...selectedNode,
                                                    config: { ...selectedNode.config, objectGroups: { ...currentConfig, addressGroupsEnabled: !currentConfig.addressGroupsEnabled } }
                                                });
                                            }}
                                        />
                                        <ServiceGroupConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.serviceGroups}
                                            onToggle={() => toggleSection('serviceGroups')}
                                            isEnabled={selectedNode.config.objectGroups.serviceGroupsEnabled}
                                            onToggleEnabled={() => {
                                                const currentConfig = selectedNode.config.objectGroups;
                                                onNodeUpdate({
                                                    ...selectedNode,
                                                    config: { ...selectedNode.config, objectGroups: { ...currentConfig, serviceGroupsEnabled: !currentConfig.serviceGroupsEnabled } }
                                                });
                                            }}
                                        />
                                        <DomainGroupConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.domainGroups}
                                            onToggle={() => toggleSection('domainGroups')}
                                            isEnabled={selectedNode.config.objectGroups.domainGroupsEnabled}
                                            onToggleEnabled={() => {
                                                const currentConfig = selectedNode.config.objectGroups;
                                                onNodeUpdate({
                                                    ...selectedNode,
                                                    config: { ...selectedNode.config, objectGroups: { ...currentConfig, domainGroupsEnabled: !currentConfig.domainGroupsEnabled } }
                                                });
                                            }}
                                        />
                                        <div>
                                            <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                                            <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                                                {generatingFeatures.has('Object Groups') ? (
                                                    <div className="flex items-center text-slate-400">
                                                        <SpinnerIcon className="w-4 h-4 mr-2" />
                                                        <span>Generating...</span>
                                                    </div>
                                                ) : (
                                                    selectedNode.config.objectGroups.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                                                )}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isFeatureApplicable('Security', selectedNode.type) && (
                            <div className="bg-slate-800 rounded-lg overflow-hidden">
                                <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('securityConfiguration')}>
                                    <div className="flex items-center gap-3">
                                        <span className={`transition-transform text-slate-300 ${expandedSections.securityConfiguration ? 'rotate-90' : ''}`}>▶</span>
                                        <h3 className="font-bold text-base text-slate-200">安全配置</h3>
                                    </div>
                                </div>
                                {expandedSections.securityConfiguration && (
                                    <div className="p-2 space-y-2 border-t border-slate-700">
                                        <SecurityZoneConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.securityZone}
                                            onToggle={() => toggleSection('securityZone')}
                                            isEnabled={selectedNode.config.security.zonesEnabled}
                                            onToggleEnabled={() => {
                                                const currentConfig = selectedNode.config.security;
                                                onNodeUpdate({
                                                    ...selectedNode,
                                                    config: { ...selectedNode.config, security: { ...currentConfig, zonesEnabled: !currentConfig.zonesEnabled } }
                                                });
                                            }}
                                        />
                                        <SecurityPolicyConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.securityPolicy}
                                            onToggle={() => toggleSection('securityPolicy')}
                                            isEnabled={selectedNode.config.security.policiesEnabled}
                                            onToggleEnabled={() => {
                                                const currentConfig = selectedNode.config.security;
                                                onNodeUpdate({
                                                    ...selectedNode,
                                                    config: { ...selectedNode.config, security: { ...currentConfig, policiesEnabled: !currentConfig.policiesEnabled } }
                                                });
                                            }}
                                        />
                                        <div>
                                            <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                                            <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                                                {generatingFeatures.has('Security') ? (
                                                    <div className="flex items-center text-slate-400">
                                                        <SpinnerIcon className="w-4 h-4 mr-2" />
                                                        <span>Generating...</span>
                                                    </div>
                                                ) : (
                                                    selectedNode.config.security.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                                                )}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('vpnConfiguration')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.vpnConfiguration ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">VPN 配置</h3>
                                </div>
                            </div>
                            {expandedSections.vpnConfiguration && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('IPsec', selectedNode.type) && (
                                        <IPsecConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.ipsec}
                                            onToggle={() => toggleSection('ipsec')}
                                            onToggleFeature={() => handleToggleFeature('IPsec')}
                                            isGenerating={generatingFeatures.has('IPsec')}
                                        />
                                    )}
                                    {isFeatureApplicable('GRE VPN', selectedNode.type) && (
                                        <GREVPNConfig
                                            selectedNode={selectedNode}
                                            onNodeUpdate={onNodeUpdate}
                                            isExpanded={expandedSections.gre}
                                            onToggle={() => toggleSection('gre')}
                                            onToggleFeature={() => handleToggleFeature('GRE VPN')}
                                            isGenerating={generatingFeatures.has('GRE VPN')}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

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
                                    {isFeatureApplicable('DHCP Relay', selectedNode.type) && <DHCPRelayConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.dhcpRelay} onToggle={() => toggleSection('dhcpRelay')} onToggleFeature={() => handleToggleFeature('DHCP Relay')} isGenerating={generatingFeatures.has('DHCP Relay')} />}
                                    {isFeatureApplicable('DHCP Snooping', selectedNode.type) && <DHCPSnoopingConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.dhcpSnooping} onToggle={() => toggleSection('dhcpSnooping')} onToggleFeature={() => handleToggleFeature('DHCP Snooping')} isGenerating={generatingFeatures.has('DHCP Snooping')} />}
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
                                    {isFeatureApplicable('Port Isolation', selectedNode.type) && <PortIsolationConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.portIsolation} onToggle={() => toggleSection('portIsolation')} onToggleFeature={() => handleToggleFeature('Port Isolation')} isGenerating={generatingFeatures.has('Port Isolation')} />}
                                    {isFeatureApplicable('Stacking (IRF)', selectedNode.type) && selectedNode.vendor === Vendor.H3C && <StackingConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.stacking} onToggle={() => toggleSection('stacking')} onToggleFeature={() => handleToggleFeature('Stacking (IRF)')} isGenerating={generatingFeatures.has('Stacking (IRF)')} />}
                                    {isFeatureApplicable('M-LAG', selectedNode.type)  && <MLAGConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.mlag} onToggle={() => toggleSection('mlag')} onToggleFeature={() => handleToggleFeature('M-LAG')} isGenerating={generatingFeatures.has('M-LAG')} />}
                                    {isFeatureApplicable('STP', selectedNode.type) && <STPConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.stp} onToggle={() => toggleSection('stp')} onToggleFeature={() => handleToggleFeature('STP')} isGenerating={generatingFeatures.has('STP')} />}
                                </div>
                            )}
                        </div>

                        {isFeatureApplicable('Routing', selectedNode.type) && <RoutingConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isL3IpRoutingExpanded={expandedSections.l3IpRouting} isStaticRoutingExpanded={expandedSections.staticRouting} isOspfExpanded={expandedSections.ospf} onToggleSection={toggleSection} isGenerating={generatingFeatures.has('Routing')} />}

                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('natConfig')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.natConfig ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">NAT配置</h3>
                                </div>
                            </div>
                            {expandedSections.natConfig && (
                                <div className="p-2 border-t border-slate-700">
                                    {isFeatureApplicable('NAT', selectedNode.type) && <NATConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} onToggleFeature={() => handleToggleFeature('NAT')} isGenerating={generatingFeatures.has('NAT')} />}
                                </div>
                            )}
                        </div>
                        
                        <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('aclAndQos')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.aclAndQos ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">ACL & QoS</h3>
                                </div>
                            </div>
                            {expandedSections.aclAndQos && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('ACL', selectedNode.type) && <ACLConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.acl} onToggle={() => toggleSection('acl')} onToggleFeature={() => handleToggleFeature('ACL')} isGenerating={generatingFeatures.has('ACL')} />}
                                </div>
                            )}
                        </div>

                       <div className="bg-slate-800 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={() => toggleSection('reliability')}>
                                <div className="flex items-center gap-3">
                                    <span className={`transition-transform text-slate-300 ${expandedSections.reliability ? 'rotate-90' : ''}`}>▶</span>
                                    <h3 className="font-bold text-base text-slate-200">可靠性配置</h3>
                                </div>
                            </div>
                            {expandedSections.reliability && (
                                <div className="p-2 space-y-2 border-t border-slate-700">
                                    {isFeatureApplicable('VRRP', selectedNode.type) && <VRRPConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.vrrp} onToggle={() => toggleSection('vrrp')} onToggleFeature={() => handleToggleFeature('VRRP')} isGenerating={generatingFeatures.has('VRRP')} />}
                                    {isFeatureApplicable('HA', selectedNode.type) && (selectedNode.vendor === Vendor.H3C || selectedNode.vendor === Vendor.Huawei) && <HAConfig selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} isExpanded={expandedSections.ha} onToggle={() => toggleSection('ha')} onToggleFeature={() => handleToggleFeature('HA')} isGenerating={generatingFeatures.has('HA')} />}
                                </div>
                            )}
                        </div>

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
            case 'commands': return <CommandsView cliCommands={allCliCommands} vendor={selectedNode.vendor} />;
            case 'helper':
                return <CommandHelperView vendor={selectedNode.vendor} />;
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