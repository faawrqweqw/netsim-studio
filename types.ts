export enum DeviceType {
  Router = 'Router',
  L3Switch = 'L3 Switch',
  L2Switch = 'L2 Switch',
  PC = 'PC',
  Firewall = 'Firewall',
  AP = 'Access Point',
  AC = 'Access Controller',
  Text = 'Text',
  Rectangle = 'Rectangle',
  Circle = 'Circle',
  Halo = 'Halo',
}

export enum Vendor {
  Cisco = 'Cisco',
  Huawei = 'Huawei',
  H3C = 'H3C',
  Generic = 'Generic'
}

export interface DHCPStaticBinding {
  ipAddress: string;
  macAddress: string;
  type: 'MAC地址' | 'IP地址' | '客户端ID';
  clientId?: string;
}

export interface DHCPPool {
  poolName: string;
  network: string;
  subnetMask: string;
  gateway: string;
  dnsServer: string;
  option43?: string;
  excludeStart?: string;
  excludeEnd?: string;
  leaseDays: string;
  leaseHours: string;
  leaseMinutes: string;
  leaseSeconds: string;
  staticBindings: DHCPStaticBinding[];
}

export interface DHCPConfig {
  enabled: boolean;
  pools: DHCPPool[];
  cli: string;
  explanation: string;
}

export interface PhysicalInterfaceIPConfig {
  interfaceName: string;
  ipAddress: string;
  subnetMask: string;
  description?: string;
  enableDHCP: boolean;
  dhcpMode: 'relay' | 'global';
  selectedPool?: string;
  dhcpServerIP?: string;
  packetFilterInboundAclId?: string;
  packetFilterOutboundAclId?: string;
}

export interface InterfaceIPConfig {
  enabled: boolean;
  interfaces: PhysicalInterfaceIPConfig[];
  cli: string;
  explanation: string;
}

export interface VLANInterface {
  vlanId: string;
  ipAddress: string;
  subnetMask: string;
  vlanDescription: string;
  interfaceDescription: string;
  enableDHCP: boolean;
  dhcpMode: 'global' | 'relay' | 'interface';
  selectedPool?: string;
  dhcpServerIP?: string; // DHCP中继服务器地址
  interfacePoolConfig?: {
    network: string;
    subnetMask: string;
    gateway: string;
    dnsServer: string;
    leaseDays: string;
    leaseHours: string;
    leaseMinutes: string;
    leaseSeconds: string;
  };
  packetFilterInboundAclId?: string;
  packetFilterOutboundAclId?: string;
}

export interface VLANConfig {
  enabled: boolean;
  vlanInterfaces: VLANInterface[];
  cli: string;
  explanation: string;
}

export interface LinkAggregationConfig {
  enabled: boolean;
  groupId: string;
  mode: string; // 改为string以支持不同厂商的模式
  interfaces: string[];
  loadBalanceAlgorithm: string; // 改为string以支持不同厂商的算法
  description: string;
  // 聚合口VLAN配置
  interfaceMode: 'unconfigured' | 'access' | 'trunk' | 'l3';
  accessVlan: string;
  trunkNativeVlan: string;
  trunkAllowedVlans: string;
  cli: string;
  explanation: string;
}

export interface STPConfig {
  enabled: boolean;
  mode: 'stp' | 'rstp' | 'pvst' | 'mstp';
  priority: string;
  maxAge: string;
  helloTime: string;
  forwardDelay: string;
  // 根桥配置
  rootBridge: 'none' | 'primary' | 'secondary';
  // 路径开销计算标准
  pathCostStandard: 'dot1d-1998' | 'dot1t' | 'legacy';
  // MSTP域配置（华为、华三）
  mstpRegion: {
    regionName: string;
    revisionLevel: string;
    vlanMappingMode: 'manual' | 'modulo'; // 手动映射或模运算映射
    moduloValue: string; // 模运算值
  };
  // MSTP配置
  mstpInstances: {
    instanceId: string;
    vlanList: string;
    priority: string;
    rootBridge: 'none' | 'primary' | 'secondary';
  }[];
  // PVST配置
  pvstVlans: {
    vlanList: string;
    priority: string;
    rootBridge: 'none' | 'primary' | 'secondary';
  }[];
  // 端口配置
  portConfigs: {
    interfaceName: string;
    portPriority: string;
    pathCost: string;
    edgePort: boolean;
    bpduGuard: boolean;
    // 针对不同模式的路径开销
    stpCost: string;
    pvstVlanCosts: {
      vlanList: string;
      cost: string;
    }[];
    mstpInstanceCosts: {
      instanceList: string;
      cost: string;
    }[];
    // MSTP实例端口优先级配置
    mstpInstancePriorities: {
      instanceList: string;
      priority: string;
    }[];
  }[];
  cli: string;
  explanation: string;
}

export interface StaticRoute {
  network: string;
  subnetMask: string;
  nextHop: string;
  adminDistance?: string;
  priority?: string;
}

export interface OSPFArea {
  areaId: string;
  areaType: 'standard' | 'stub' | 'nssa';
  networks: {
    network: string;
    wildcardMask: string;
  }[];
}

export interface OSPFConfig {
  enabled: boolean;
  processId: string;
  routerId: string;
  areas: OSPFArea[];
  redistributeStatic: boolean;
  redistributeConnected: boolean;
  defaultRoute: boolean;
  cli: string;
  explanation: string;
}

export interface VRRPGroup {
  groupId: string;
  virtualIp: string;
  priority: string;
  preempt: boolean;
  authType: 'none' | 'simple' | 'md5';
  authKey?: string;
  advertisementInterval: string;
  description: string;
}

export interface VRRPConfig {
  enabled: boolean;
  interfaceName: string;
  groups: VRRPGroup[];
  cli: string;
  explanation: string;
}

export interface RadioConfig {
  enabled: boolean;
  channel: string;
  power: string;
}

export interface VAPBinding {
  vapProfileName: string;
  radio: '0' | '1' | 'all';
}

export interface APGroup {
  groupName: string;
  description: string;
  radio2G: RadioConfig;
  radio5G: RadioConfig;
  serviceTemplates: string[]; // H3C: serviceTemplate
  vapBindings?: VAPBinding[]; // Huawei/Cisco
  vlanId: string;
  countryCode: string; // Only for H3C
}

// For H3C
export interface WirelessServiceTemplate {
  templateName: string;
  ssid: string;
  description: string;
  defaultVlan: string;
  ssidHide: boolean;
  forwardType: 'centralized' | 'local';
  maxClients: string;
  authMode: 'static-psk' | 'static-wep';
  authLocation: 'local-ac' | 'central-ac' | 'ap';
  securityMode?: 'wpa' | 'wpa2' | 'wpa-wpa2';
  pskPassword?: string;
  pskType?: 'passphrase' | 'rawkey';
  wepKeyId?: string;
  wepKeyType?: 'passphrase' | 'hex';
  wepEncryption?: 'wep40' | 'wep104';
  wepPassword?: string;
  enabled: boolean;
}

// For Huawei/Cisco
export interface SecurityProfile {
  profileName: string;
  securityType: 'wpa2-psk'; // Add more later
  psk: string;
}

export interface SSIDProfile {
  profileName: string;
  ssid: string;
}

export interface VAPProfile {
  profileName: string;
  securityProfile: string;
  ssidProfile: string;
  vlanId: string;
  forwardMode: 'direct-forward' | 'tunnel';
}

export interface APDevice {
  apName: string;
  model: string;
  serialNumber: string;
  macAddress: string;
  groupName: string;
  description?: string;
}

export interface ACConfig {
  acSourceInterface: string;
  countryCode: string;
  apAuthMode: 'mac' | 'sn';
}

export interface WirelessConfig {
  enabled: boolean;
  // Global settings for Huawei/Cisco
  acConfig: ACConfig;
  // Profiles for Huawei/Cisco
  securityProfiles: SecurityProfile[];
  ssidProfiles: SSIDProfile[];
  vapProfiles: VAPProfile[];
  // Shared Structures
  apGroups: APGroup[];
  apDevices: APDevice[];
  // H3C Specific
  serviceTemplates: WirelessServiceTemplate[];
  // Output
  cli: string;
  explanation: string;
}

export interface RoutingConfig {
  staticRoutes: StaticRoute[];
  ospf: OSPFConfig;
  cli: string;
  explanation: string;
}

export interface TimeRangeDaySelection {
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  daily?: boolean;
}

export interface TimeRange {
  id: string;
  name: string;
  periodic: {
    enabled: boolean;
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
    days: TimeRangeDaySelection;
  };
  absolute: {
    enabled: boolean;
    fromTime: string; // "HH:MM"
    fromDate: string; // "YYYY-MM-DD"
    toTime: string;   // "HH:MM"
    toDate: string;   // "YYYY-MM-DD"
  };
}


export interface ACLRule {
  id: string;
  action: 'permit' | 'deny';
  description?: string;
}

export interface ACLBasicRule extends ACLRule {
  ruleId?: string; // Optional for auto-numbering
  autoRuleId: boolean;
  logging: boolean;
  fragment: boolean;
  counting: boolean; // Not used by Huawei for basic ACLs
  timeRange?: string;
  vpnInstance?: string;
  sourceIsAny: boolean;
  sourceAddress: string;
  sourceWildcard: string;
}

export interface ACLAdvancedRule extends ACLRule {
  ruleId?: string; // Optional for auto-numbering
  autoRuleId: boolean;
  protocol: string;

  // Conditions controlled by checkboxes
  sourceIsAny: boolean;
  sourceAddress: string;
  sourceWildcard: string;
  destinationIsAny: boolean;
  destinationAddress: string;
  destinationWildcard: string;
  
  sourcePortOperator?: 'lt' | 'gt' | 'eq' | 'neq' | 'range';
  sourcePort1?: string;
  sourcePort2?: string;
  
  destinationPortOperator?: 'lt' | 'gt' | 'eq' | 'neq' | 'range';
  destinationPort1?: string;
  destinationPort2?: string;
  
  icmpType?: string;
  icmpCode?: string;
  
  dscp?: string;
  precedence?: string;
  tos?: string;

  established?: boolean;
  tcpFlags?: {
      ack?: boolean;
      fin?: boolean;
      psh?: boolean;
      rst?: boolean;
      syn?: boolean;
      urg?: boolean;
  };

  // Huawei specific TTL
  ttlOperator?: 'gt' | 'lt' | 'eq' | 'neq' | 'range';
  ttlValue1?: string;
  ttlValue2?: string;

  // Bottom checkboxes
  timeRange?: string;
  vpnInstance?: string;
  fragment: boolean;
  logging: boolean;
  counting: boolean;
}

export interface ACL {
  id: string;
  number: string;
  name?: string;
  description?: string;
  type: 'basic' | 'advanced' | 'unknown';
  matchOrder: 'auto' | 'config';
  step?: string;
  rules: (ACLBasicRule | ACLAdvancedRule)[];
}

export interface ACLsConfig {
  enabled: boolean;
  acls: ACL[];
  cli: string;
  explanation: string;
}

export interface NodeConfig {
  dhcp: DHCPConfig;
  vlan: VLANConfig;
  interfaceIP: InterfaceIPConfig;
  linkAggregation: LinkAggregationConfig;
  stp: STPConfig;
  routing: RoutingConfig;
  vrrp: VRRPConfig;
  acl: ACLsConfig;
  wireless: WirelessConfig;
  timeRanges?: TimeRange[];
}

export interface NodeStyle {
    color: string;
    iconSize: number;
}

export interface Port {
  id: string; // Unique within the node, e.g., 'port-0'
  name: string; // Display name, e.g., 'GE0/0/1'
  status: 'available' | 'connected';
  connectedTo?: { // Information about the other end of the connection
    nodeId: string;
    portId: string;
  };
}

export interface Node {
  id: string;
  type: DeviceType;
  vendor: Vendor;
  name: string;
  x: number;
  y: number;
  config: NodeConfig;
  style: NodeStyle;
  ports: Port[];
  text?: string;
  borderStyle?: 'solid' | 'dashed' | 'none';
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
}

export interface LinkConfig {
  mode: 'unconfigured' | 'access' | 'trunk' | 'l3';
  accessVlan?: string;
  trunkNativeVlan?: string;
  trunkAllowedVlans?: string;
  applyToPortRange?: string;
}

export interface Connection {
  id:string;
  from: { nodeId: string; portId: string; };
  to: { nodeId: string; portId: string; };
  type: 'solid' | 'dashed';
  style: 'direct' | 'orthogonal';
  path?: {
    midPointRatio?: number; // 0 to 1, for orthogonal line handle
  };
  labelFromOffset?: { x: number; y: number; };
  labelToOffset?: { x: number; y: number; };
  config: LinkConfig;
}