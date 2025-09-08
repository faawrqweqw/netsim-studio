import React from 'react';
import { DeviceType, Vendor, Port, LinkConfig, NATConfig } from './types';
import {
  RouterIcon,
  L3SwitchIcon,
  L2SwitchIcon,
  PCIcon,
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
} from './components/Icons';

export const TOOLBAR_ITEMS = [
  {
    title: '路由设备',
    items: [
      { name: '路由器', type: DeviceType.Router, icon: <RouterIcon className="w-full h-full" />, color: 'border-blue-500' },
      { name: '防火墙', type: DeviceType.Firewall, icon: <FirewallIcon className="w-10 h-10 text-red-400" />, color: 'border-red-500' }
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
      { name: 'PC', type: DeviceType.PC, icon: <PCIcon className="w-10 h-10 text-orange-400" />, color: 'border-orange-400' }
    ]
  },
  {
    title: '无线设备',
    items: [
      { name: 'AP', type: DeviceType.AP, icon: <APIcon className="w-10 h-10 text-teal-400" />, color: 'border-teal-500' },
      { name: 'AC', type: DeviceType.AC, icon: <ACIcon className="w-10 h-10 text-indigo-400" />, color: 'border-indigo-500' },
    ]
  },
  {
    title: '连接线',
    items: [
      { name: '实线', tool: 'connect', connectionType: 'solid', icon: <SolidLineIcon className="w-10 h-10" />, color: 'border-purple-500' },
      { name: '虚线', tool: 'connect', connectionType: 'dashed', icon: <DashedLineIcon className="w-10 h-10" />, color: 'border-purple-500' }
    ]
  },
  {
    title: '文本输入框',
    items: [
      { name: '实线边框', type: DeviceType.Text, borderStyle: 'solid', icon: <TextBoxSolidIcon className="w-8 h-8 text-blue-400" />, color: 'border-gray-400' },
      { name: '无边框', type: DeviceType.Text, borderStyle: 'none', icon: <TextBoxNoneIcon className="w-8 h-8 text-blue-400" />, color: 'border-gray-400' },
    ]
  },
  {
    title: '区域框',
    items: [
      { name: '矩形', type: DeviceType.Rectangle, borderStyle: 'solid', icon: <RectangleIcon className="w-8 h-8 text-yellow-400" />, color: 'border-yellow-400' },
      { name: '圆形', type: DeviceType.Circle, icon: <CircleIcon className="w-8 h-8 text-yellow-400" />, color: 'border-yellow-400' },
      { name: '聚合光环', type: DeviceType.Halo, icon: <HaloIcon className="w-8 h-8 text-purple-400" />, color: 'border-purple-400' },
    ]
  }
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
    cli: '',
    explanation: ''
};


export const DEFAULT_NODE_CONFIG = {
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
  vlan: {
    enabled: false,
    vlanInterfaces: [
      {
        vlanId: '10',
        ipAddress: '192.168.10.1',
        subnetMask: '255.255.255.0',
        vlanDescription: 'Management VLAN',
        interfaceDescription: 'Gateway for Management VLAN',
        enableDHCP: false,
        dhcpMode: 'global',
        selectedPool: '',
        dhcpServerIP: '',
        natStaticEnable: false,
        interfacePoolConfig: {
          network: '192.168.10.0',
          subnetMask: '255.255.255.0',
          gateway: '192.168.10.1',
          dnsServer: '8.8.8.8',
          leaseDays: '0',
          leaseHours: '1',
          leaseMinutes: '0',
          leaseSeconds: '0'
        }
      }
    ],
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
    interfaces: [],
    loadBalanceAlgorithm: 'src-dst-ip',
    description: '',
    interfaceMode: 'unconfigured' as const,
    accessVlan: '',
    trunkNativeVlan: '',
    trunkAllowedVlans: '',
    cli: '',
    explanation: ''
  },
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
      cli: '',
      explanation: ''
    },
    cli: '',
    explanation: ''
  },
  vrrp: {
    enabled: false,
    interfaceName: '',
    groups: [
      {
        groupId: '1',
        virtualIp: '192.168.1.1',
        priority: '100',
        preempt: true,
        preemptDelay: '0',
        authType: 'none',
        authKey: '',
        advertisementInterval: '1',
        description: 'VRRP Group 1'
      }
    ],
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
          channel: 'auto',
          power: '20',
        },
        radio5G: {
          enabled: true,
          channel: 'auto',
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
  iconSize: 48,
};

const DEVICE_PORT_COUNTS: Partial<Record<DeviceType, number>> = {
  [DeviceType.Router]: 12,
  [DeviceType.L3Switch]: 48,
  [DeviceType.L2Switch]: 48,
  [DeviceType.PC]: 1,
  [DeviceType.Firewall]: 12,
  [DeviceType.AP]: 1,
  [DeviceType.AC]: 12,
  [DeviceType.Text]: 0,
  [DeviceType.Rectangle]: 0,
  [DeviceType.Circle]: 0,
  [DeviceType.Halo]: 0,
};

const vendorPortNamer = (vendor: Vendor, type: DeviceType, i: number): string => {
  const portNumber = (type === DeviceType.PC) ? i : (i + 1);
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
      if (type === DeviceType.PC) return `FastEthernet0/${portNumber}`;
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