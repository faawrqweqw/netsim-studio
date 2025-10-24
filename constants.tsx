
import React from 'react';
import { DeviceType, Vendor, Port, LinkConfig, NATConfig, SecurityConfig, ObjectGroupConfig, IPsecConfig, HAConfig, GREVPNConfig, StackingConfig, LinkAggregationMember, DHCPRelayConfig, DHCPSnoopingConfig, ManagementConfig, MLAGConfig } from './types';
import {
  RouterIcon,
  L3SwitchIcon,
  L2SwitchIcon,
  PCIcon,
  PrintIcon,
  ServerIcon,
  FirewallIcon,
  APIcon,
  ACIcon,
  TextBoxSolidIcon,
  TextBoxNoneIcon,
  SolidLineIcon,
  DashedLineIcon,
  RectangleIcon,
  CircleIcon,
  HaloIcon,
  MonitorIcon
} from './components/Icons';

export const TOOLBAR_ITEMS = [
  {
    title: '路由设备',
    items: [
      { name: '路由器', type: DeviceType.Router, icon: <RouterIcon className="w-full h-full" />, color: 'border-blue-500' },
      { name: '防火墙', type: DeviceType.Firewall, icon: <FirewallIcon className="w-full h-full" />, color: 'border-red-500' }
    ]
  },
  {
    title: '交换设备',
    items: [
      { name: '三层交换机', type: DeviceType.L3Switch, icon: <L3SwitchIcon className="w-full h-full" />, color: 'border-green-500' },
      { name: '二层交换机', type: DeviceType.L2Switch, icon: <L2SwitchIcon className="w-full h-full" />, color: 'border-gray-400' }
    ]
  },
  {
    title: '终端设备',
    items: [
      { name: 'PC', type: DeviceType.PC, icon: <PCIcon className="w-full h-full text-orange-400" />, color: 'border-orange-400' },
      { name: '服务器', type: DeviceType.Server, icon: <ServerIcon className="w-full h-full text-orange-400" />, color: 'border-orange-400' },
      { name: '打印机', type: DeviceType.Print, icon: <PrintIcon className="w-full h-full text-orange-400" />,color: 'border-orange-400' },
      { name: '监控', type: DeviceType.Monitor, icon: <MonitorIcon className="w-full h-full text-orange-400" />, color: 'border-orange-400' }
    ]
  },
  {
    title: '无线设备',
    items: [
      { name: 'AP', type: DeviceType.AP, icon: <APIcon className="w-full h-full" />, color: 'border-teal-500' },
      { name: 'AC', type: DeviceType.AC, icon: <ACIcon className="w-full h-full" />, color: 'border-indigo-500' },
    ]
  },
  {
    title: '连接线',
    items: [
      { name: '实线', tool: 'connect', connectionType: 'solid', icon: <SolidLineIcon className="w-full h-full" />, color: 'border-purple-500' },
      { name: '虚线', tool: 'connect', connectionType: 'dashed', icon: <DashedLineIcon className="w-full h-full" />, color: 'border-purple-500' }
    ]
  },
];

export const SHAPE_TOOLS = [
    { name: '实线边框文本', type: DeviceType.Text, borderStyle: 'solid', icon: <TextBoxSolidIcon className="w-full h-full" /> },
    { name: '无边框文本', type: DeviceType.Text, borderStyle: 'none', icon: <TextBoxNoneIcon className="w-full h-full" /> },
    { name: '矩形', type: DeviceType.Rectangle, borderStyle: 'solid', icon: <RectangleIcon className="w-full h-full" /> },
    { name: '圆形', type: DeviceType.Circle, icon: <CircleIcon className="w-full h-full" /> },
    { name: '聚合光环', type: DeviceType.Halo, icon: <HaloIcon className="w-full h-full" /> },
];


export const VENDOR_LOGOS: Record<Vendor, string> = {
  [Vendor.Cisco]: 'Cisco',
  [Vendor.Huawei]: 'Huawei',
  [Vendor.H3C]: 'H3C',
  [Vendor.Generic]: 'Generic'
}

export const VENDOR_OPTIONS = [
  { value: Vendor.Cisco, label: 'Cisco' },
  { value: Vendor.Huawei, label: 'Huawei' },
  { value: Vendor.H3C, label: 'H3C' },
];

export const DEFAULT_NAT_CONFIG: NATConfig = {
    enabled: false,
    staticOutbound: {
        enabled: true,
        rules: []
    },
    portMapping: { enabled: true, rules: [] },
    addressPool: { enabled: true, pools: [] },
    serverGroups: [],
    huawei: {
        addressPools: [],
        rules: [],
        servers: [],
    },
    globalPolicy: {
      enabled: false,
      rules: [],
    },
    cli: '',
    explanation: ''
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    zonesEnabled: false,
    policiesEnabled: false,
    zones: [
        { id: 'zone-trust', name: 'Trust', priority: '85', description: 'Internal trusted network', members: [] },
        { id: 'zone-untrust', name: 'Untrust', priority: '5', description: 'External untrusted network', members: [] },
        { id: 'zone-dmz', name: 'DMZ', priority: '50', description: 'Demilitarized Zone', members: [] },
    ],
    policies: [],
    cli: '',
    explanation: ''
};

export const DEFAULT_OBJECT_GROUP_CONFIG: ObjectGroupConfig = {
    addressGroupsEnabled: false,
    serviceGroupsEnabled: false,
    domainGroupsEnabled: false,
    addressGroups: [],
    serviceGroups: [],
    domainGroups: [],
    cli: '',
    explanation: ''
};

export const DEFAULT_IPSEC_CONFIG: IPsecConfig = {
    enabled: false,
    transformSets: [],
    ikeKeychains: [],
    ikeProfiles: [],
    policies: [],
    cli: '',
    explanation: ''
};

export const DEFAULT_HA_CONFIG: HAConfig = {
    enabled: false,
    deviceRole: 'primary',
    workMode: 'active-standby',
    controlChannel: {
        localIp: '',
        remoteIp: '',
        port: '1026',
        keepaliveInterval: '1',
        keepaliveCount: '10',
    },
    dataChannelInterface: '',
    hotBackupEnabled: true,
    autoSyncEnabled: true,
    syncCheckEnabled: true,
    failback: {
        enabled: false,
        delayTime: '30',
    },
    monitoring: {
        type: 'none',
        trackItems: [],
    },
    huawei: {
        monitoringItems: [],
        heartbeatInterfaces: [],
        authenticationKey: '',
        checksumEnabled: false,
        encryptionEnabled: true,
        encryptionKeyRefreshEnabled: false,
        encryptionKeyRefreshInterval: '30',
        helloInterval: '1000',
        ipPacketPriority: '6',
        escapeEnabled: true,
        autoSyncConnectionStatus: false,
        mirrorSessionEnabled: false,
        autoSyncConfig: true,
        autoSyncDnsTransparentPolicyDisabled: false,
        autoSyncStaticRoute: false,
        autoSyncPolicyBasedRoute: false,
        preemptEnabled: true,
        preemptDelay: '60',
        deviceRole: 'none',
        standbyConfigEnabled: false,
        adjustBgpCostEnabled: false,
        adjustBgpSlaveCost: '',
        adjustOspfCostEnabled: false,
        adjustOspfSlaveCost: '',
        tcpLinkStateCheckDelay: ''
    },
    cli: '',
    explanation: '',
};

export const DEFAULT_GRE_CONFIG: GREVPNConfig = {
    enabled: false,
    tunnels: [],
    cli: '',
    explanation: ''
};

export const DEFAULT_STACKING_CONFIG: StackingConfig = {
    enabled: false,
    modelType: 'new',
    domainId: '',
    members: [
        {
            id: 'member-1',
            memberId: '1',
            newMemberId: '',
            priority: '1',
            irfPorts: [
                { id: '1', portGroup: [] },
            ],
        }
    ],
    cli: '',
    explanation: '',
};

export const DEFAULT_MLAG_CONFIG: MLAGConfig = {
    enabled: false,
    systemMac: '',
    systemNumber: '',
    systemPriority: '32768',
    rolePriority: '32768',
    standalone: {
        enabled: false,
        delayTime: '90',
    },
    macAddressHold: false,
    peerLinkBridgeAggregationId: '',
    peerLinkDrcpShortTimeout: false,
    interfaces: [],
    keepalive: {
        enabled: false,
        destinationIp: '',
        sourceIp: '',
        udpPort: '6400',
        vpnInstance: '',
        interval: '1000',
        timeout: '5',
    },
    mad: {
        defaultAction: 'down',
        excludeInterfaces: [],
        excludeLogicalInterfaces: false,
        includeInterfaces: [],
        persistent: false,
    },
    huawei: {
        dfsGroupId: '1',
        dfsGroupPriority: '100',
        authenticationPassword: '',
        dualActiveSourceIp: '',
        dualActivePeerIp: '',
        peerLinkTrunkId: '',
        interfaces: [],
        activeStandbyElection: {
            arp: false,
            nd: false,
            igmp: false,
            dhcp: false
        }
    },
    cli: '',
    explanation: '',
};

export const DEFAULT_DHCP_RELAY_CONFIG: DHCPRelayConfig = {
    enabled: false,
    security: {
        clientInfoRecording: false,
        clientInfoRefresh: true, // default is enabled
        clientInfoRefreshType: 'auto',
        clientInfoRefreshInterval: '',
        macCheck: false,
        macCheckAgingTime: '300',
    },
    dscp: '56',
    interfaces: [],
    huawei: {
        serverMatchCheck: true,
        replyForwardAll: false,
        trustOption82: true, // Default for Huawei
    },
    cli: '',
    explanation: '',
};

export const DEFAULT_DHCP_SNOOPING_CONFIG: DHCPSnoopingConfig = {
    enabled: false,
    interfaces: [],
    h3c: {
        bindingDatabase: {
            enabled: false,
            filename: 'dhcp_snooping.db',
            updateInterval: '300',
        }
    },
    huawei: {
        enabledOnVlans: '',
        trustedInterfaces: [],
        userBindAutosave: {
            enabled: false,
            filename: 'flash:/dhcp_snooping.tbl',
            writeDelay: '3600',
        }
    },
    cli: '',
    explanation: '',
};

export const DEFAULT_MANAGEMENT_CONFIG: ManagementConfig = {
  ipAddress: '',
  credentials: {
    username: 'admin',
    password: '',
  },
};


export const DEFAULT_NODE_CONFIG = {
  management: DEFAULT_MANAGEMENT_CONFIG,
  dhcp: {
    enabled: false,
    pools: [
      {
        poolName: 'LAN_POOL',
        network: '192.168.1.0',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        dnsServer: '8.8.8.8',
        option43: '',
        excludeStart: '',
        excludeEnd: '',
        leaseDays: '0',
        leaseHours: '1',
        leaseMinutes: '0',
        leaseSeconds: '0',
        staticBindings: []
      }
    ],
    cli: '',
    explanation: ''
  },
  dhcpRelay: DEFAULT_DHCP_RELAY_CONFIG,
  dhcpSnooping: DEFAULT_DHCP_SNOOPING_CONFIG,
  vlan: {
    enabled: false,
    vlanInterfaces: [],
    cli: '',
    explanation: ''
  },
  interfaceIP: {
    enabled: false,
    interfaces: [],
    cli: '',
    explanation: '',
  },
  linkAggregation: {
    enabled: false,
    groupId: '1',
    mode: 'active', // 默认为Cisco的active模式
    members: [] as LinkAggregationMember[],
    systemPriority: '32768',
    loadBalanceAlgorithm: 'src-dst-ip',
    description: '',
    interfaceMode: 'unconfigured' as const,
    accessVlan: '',
    trunkNativeVlan: '',
    trunkAllowedVlans: '',
    preemptEnabled: true,
    preemptDelay: '30',
    timeout: 'slow' as const,
    huaweiLacpPriorityMode: 'default' as const,
    cli: '',
    explanation: ''
  },
  portIsolation: {
    enabled: false,
    mode: 'l2' as const,
    excludedVlans: '',
    groups: [],
    cli: '',
    explanation: ''
  },
  stacking: DEFAULT_STACKING_CONFIG,
  mlag: DEFAULT_MLAG_CONFIG,
  stp: {
    enabled: false,
    mode: 'rstp',
    priority: '32768',
    maxAge: '20',
    helloTime: '2',
    forwardDelay: '15',
    rootBridge: 'none',
    pathCostStandard: 'legacy',
    mstpRegion: {
      regionName: '',
      revisionLevel: '0',
      vlanMappingMode: 'manual',
      moduloValue: '2'
    },
    mstpInstances: [],
    pvstVlans: [],
    portConfigs: [],
    cli: '',
    explanation: ''
  },
  routing: {
    staticRoutes: [],
    ospf: {
      enabled: false,
      processId: '1',
      routerId: '1.1.1.1',
      areas: [
        {
          areaId: '0',
          areaType: 'standard',
          noSummary: false,
          defaultCost: '1',
          networks: []
        }
      ],
      redistributeStatic: false,
      redistributeConnected: false,
      defaultRoute: false,
      interfaceConfigs: [],
      cli: '',
      explanation: ''
    },
    cli: '',
    explanation: ''
  },
  vrrp: {
    enabled: false,
    interfaces: [],
    cli: '',
    explanation: ''
  },
  acl: {
    enabled: false,
    acls: [],
    cli: '',
    explanation: '',
  },
  nat: DEFAULT_NAT_CONFIG,
  security: DEFAULT_SECURITY_CONFIG,
  objectGroups: DEFAULT_OBJECT_GROUP_CONFIG,
  ssh: {
    enabled: false,
    publicKeyType: 'rsa',
    users: [],
    vtyLines: '0 4',
    authenticationMode: 'scheme',
    protocolInbound: 'ssh',
    domainName: 'example.com',
    sourceInterface: '',
    cli: '',
    explanation: '',
  },
  wireless: {
    enabled: false,
    acConfig: {
      acSourceInterface: '',
      countryCode: 'CN',
      apAuthMode: 'mac',
    },
    securityProfiles: [],
    ssidProfiles: [],
    vapProfiles: [],
    apGroups: [
      {
        groupName: 'default-group',
        description: 'Default AP Group',
        radio2G: {
          enabled: true,
          channel: '1',
          power: '20',
        },
        radio5G: {
          enabled: true,
          channel: '44',
          power: '20',
        },
        serviceTemplates: [],
        vapBindings: [],
        vlanId: '1',
        countryCode: 'CN'
      }
    ],
    serviceTemplates: [],
    apDevices: [],
    cli: '',
    explanation: ''
  },
  timeRanges: [],
  ha: DEFAULT_HA_CONFIG,
  ipsec: DEFAULT_IPSEC_CONFIG,
  gre: DEFAULT_GRE_CONFIG,
};

export const DEFAULT_LINK_CONFIG: LinkConfig = {
  mode: 'unconfigured',
  accessVlan: '',
  trunkNativeVlan: '',
  trunkAllowedVlans: '',
  applyToPortRange: '',
};

export const DEFAULT_NODE_STYLE = {
  color: '#3b82f6', // blue-500
  iconSize: 64,
};

const DEVICE_PORT_COUNTS: Partial<Record<DeviceType, number>> = {
  [DeviceType.Router]: 12,
  [DeviceType.L3Switch]: 52,
  [DeviceType.L2Switch]: 52,
  [DeviceType.PC]: 1,
  [DeviceType.Monitor]: 1,
  [DeviceType.Server]: 2,
  [DeviceType.Print]: 1,
  [DeviceType.Firewall]: 12,
  [DeviceType.AP]: 1,
  [DeviceType.AC]: 12,
  [DeviceType.Text]: 0,
  [DeviceType.Rectangle]: 0,
  [DeviceType.Circle]: 0,
  [DeviceType.Halo]: 0,
};

const vendorPortNamer = (vendor: Vendor, type: DeviceType, i: number): string => {
  // Optical ports for switches (indices 48-51)
  if ((type === DeviceType.L3Switch || type === DeviceType.L2Switch) && i >= 48) {
      const opticalPortNumber = i - 48 + 1; // Generates 1, 2, 3, 4
      switch (vendor) {
          case Vendor.Huawei:
              // e.g., XGigabitEthernet0/0/1
              return `XGigabitEthernet0/0/${opticalPortNumber}`;
          case Vendor.H3C:
              // H3C often has contiguous numbering for SFP+ ports
              // e.g., Ten-GigabitEthernet1/0/49
              const contiguousPortNumber = i + 1; // 49, 50, 51, 52
              return `Ten-GigabitEthernet1/0/${contiguousPortNumber}`;
          case Vendor.Cisco:
          default:
              // Simplified naming consistent with existing scheme
              // e.g., TenGigabitEthernet0/1
              return `TenGigabitEthernet0/${opticalPortNumber}`;
      }
  }
  
  // Existing logic for copper ports and other devices
  const portNumber = (type === DeviceType.PC || type === DeviceType.Server) ? i : (i + 1);
  switch (vendor) {
    case Vendor.Huawei:
      if (type === DeviceType.L3Switch || type === DeviceType.L2Switch || type === DeviceType.AC) return `GigabitEthernet0/0/${portNumber}`;
      return `GigabitEthernet0/0/${portNumber}`;
    case Vendor.H3C:
      if (type === DeviceType.L3Switch || type === DeviceType.L2Switch) return `GigabitEthernet1/0/${portNumber}`;
      return `GigabitEthernet1/0/${portNumber}`;
    case Vendor.Cisco:
    default:
      if (type === DeviceType.L3Switch || type === DeviceType.L2Switch) return `GigabitEthernet0/${portNumber}`;
      if (type === DeviceType.PC || type === DeviceType.Server) return `FastEthernet0/${portNumber}`;
      return `GigabitEthernet0/${portNumber}`;
  }
}

export const generatePorts = (type: DeviceType, vendor: Vendor): Port[] => {
  const count = DEVICE_PORT_COUNTS[type] ?? 0;
  if (count === 0) return [];

  return Array.from({ length: count }, (_, i) => ({
    id: `port-${i}`,
    name: vendorPortNamer(vendor, type, i),
    status: 'available',
  }));
};
