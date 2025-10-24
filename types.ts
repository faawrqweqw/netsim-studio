


export enum DeviceType {
  Router = 'Router',
  L3Switch = 'L3 Switch',
  L2Switch = 'L2 Switch',
  PC = 'PC',
  Server = 'Server',
  Print = 'Print',
  Monitor = 'Monitor',
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

export interface ManagementConfig {
  ipAddress: string;
  credentials: {
    username: string;
    password: string;
  };
}

// FIX: Add ParsedData and ParsedResult types
export interface ParsedData {
    [key: string]: any;
}

export interface ParsedResult {
    type: 'cpu' | 'memory' | 'fan' | 'power' | 'temperature' | 'deviceInfo' | 'unknown';
    data: ParsedData;
    original: string;
}

export interface DeviceRuntimeStatus {
  isOnline?: boolean;
  inspectionStatus?: 'success' | 'failed' | 'pending' | 'unknown' | 'inspecting';
  lastInspected?: string;
  // FIX: Changed type to allow for structured log objects (ParsedResult) in addition to strings.
  inspectionLog?: any;
  pingResult?: {
    latency: number | string | null;
    status: 'online' | 'offline' | 'unknown';
    time?: { min: number | null; avg: number | null; max: number | null } | string | null;
  };
  inspectionProgress?: number;
  taskId?: string;
}


export interface DHCPStaticBinding {
  ipAddress: string;
  macAddress: string;
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
  dhcpMode: 'global' | 'interface';
  selectedPool?: string;
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
  ipsecPolicyId?: string;
  natStaticEnable?: boolean;
  huaweiNatEnable?: boolean;
  natHairpinEnable?: boolean;
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
  dhcpMode: 'global' | 'interface';
  selectedPool?: string;
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
  ipsecPolicyId?: string;
  natStaticEnable?: boolean;
  huaweiNatEnable?: boolean;
  natHairpinEnable?: boolean;
}

export interface VLANConfig {
  enabled: boolean;
  vlanInterfaces: VLANInterface[];
  cli: string;
  explanation: string;
}

export interface LinkAggregationMember {
    id: string; // For React keys
    name: string;
    // H3C specific
    lacpMode?: 'active' | 'passive';
    lacpPeriod?: 'short' | 'long';
    // Both H3C and Huawei
    portPriority?: string;
}

export interface LinkAggregationConfig {
  enabled: boolean;
  groupId: string;
  mode: string; // 改为string以支持不同厂商的模式
  members: LinkAggregationMember[];
  systemPriority?: string; // H3C & Huawei
  loadBalanceAlgorithm: string; // 改为string以支持不同厂商的算法
  description: string;
  // 聚合口VLAN配置
  interfaceMode: 'unconfigured' | 'access' | 'trunk' | 'l3';
  accessVlan: string;
  trunkNativeVlan: string;
  trunkAllowedVlans: string;
   // Huawei specific
  preemptEnabled?: boolean;
  preemptDelay?: string;
  timeout?: 'fast' | 'slow';
  huaweiLacpPriorityMode?: 'default' | 'system-priority';
  cli: string;
  explanation: string;
}

export interface PortIsolationGroup {
  id: string;
  groupId: string;
  interfaces: string[];
  communityVlans?: string; // H3C
}

export interface PortIsolationConfig {
  enabled: boolean;
  mode: 'l2' | 'all'; // Huawei
  excludedVlans: string; // Huawei
  groups: PortIsolationGroup[];
  cli: string;
  explanation: string;
}

export interface StackingIRFPortConfig {
    id: string;
    portGroup: string[];
}

export interface StackingMemberConfig {
    id: string;
    memberId: string;
    newMemberId: string; // For renumbering on old models
    priority: string;
    irfPorts: StackingIRFPortConfig[];
}

export interface StackingConfig {
    enabled: boolean;
    modelType: 'new' | 'old';
    domainId: string;
    members: StackingMemberConfig[];
    cli: string;
    explanation: string;
}

export interface MLAGInterfaceConfig {
    id: string;
    bridgeAggregationId: string;
    groupId: string;
    systemMac?: string;
    systemPriority?: string;
    drcpShortTimeout?: boolean;
}

export interface HuaweiMLAGInterfaceConfig {
    id: string;
    ethTrunkId: string;
    mlagId: string;
    mode: 'dual-active' | 'active-standby';
}

export interface MLAGConfig {
    enabled: boolean;
    // H3C fields
    systemMac: string;
    systemNumber: string;
    systemPriority: string;
    rolePriority: string;
    standalone: {
        enabled: boolean;
        delayTime?: string;
    };
    macAddressHold?: boolean;
    peerLinkBridgeAggregationId: string;
    peerLinkDrcpShortTimeout?: boolean;
    interfaces: MLAGInterfaceConfig[];
    keepalive: {
        enabled: boolean;
        destinationIp: string;
        sourceIp: string;
        udpPort: string;
        vpnInstance: string;
        interval: string;
        timeout: string;
    };
    mad: {
        defaultAction: 'down' | 'none';
        excludeInterfaces: { id: string; name: string }[];
        excludeLogicalInterfaces: boolean;
        includeInterfaces: { id: string; name: string }[];
        persistent: boolean;
    };
    // Huawei specific config
    huawei?: {
        dfsGroupId: string;
        dfsGroupPriority: string;
        authenticationPassword: string;
        dualActiveSourceIp: string;
        dualActivePeerIp: string;
        peerLinkTrunkId: string;
        interfaces: HuaweiMLAGInterfaceConfig[];
        activeStandbyElection?: {
            arp?: boolean;
            nd?: boolean;
            igmp?: boolean;
            dhcp?: boolean;
        }
    };
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
  noSummary?: boolean; // For Totally Stub/NSSA areas
  defaultCost?: string; // Cost for the default route injected into stub/nssa areas
  networks: {
    network: string;
    wildcardMask: string;
  }[];
}

export interface OSPFInterfaceConfig {
  id: string;
  interfaceName: string;
  priority: string;
}

export interface OSPFConfig {
  enabled: boolean;
  processId: string;
  routerId: string;
  areas: OSPFArea[];
  redistributeStatic: boolean;
  redistributeConnected: boolean;
  defaultRoute: boolean;
  interfaceConfigs: OSPFInterfaceConfig[];
  cli: string;
  explanation: string;
}

export interface VRRPGroup {
  id: string;
  groupId: string;
  virtualIp: string;
  priority: string;
  preempt: boolean;
  preemptDelay?: string; // H3C/Huawei/Cisco
  authType: 'none' | 'simple' | 'md5';
  authKey?: string;
  advertisementInterval: string;
  description: string;
}

export interface VRRPInterfaceConfig {
  id: string;
  interfaceName: string;
  groups: VRRPGroup[];
}

export interface VRRPConfig {
  enabled: boolean;
  interfaces: VRRPInterfaceConfig[];
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

export interface NATAddressPool {
  id: string;
  groupId: string;
  name?: string;
  startAddress: string;
  endAddress: string;
}

export interface NATStaticOutboundRule {
  id: string;
  direction: 'outbound' | 'inbound';
  type: 'one-to-one' | 'net-to-net' | 'address-group';
  
  // one-to-one
  localIp?: string;
  globalIp?: string;

  // net-to-net (outbound)
  localStartIp?: string;
  localEndIp?: string;
  globalNetwork?: string;
  globalMask?: string;
  
  // net-to-net (inbound)
  globalStartIp?: string;
  globalEndIp?: string;
  localNetwork?: string;
  localMask?: string;

  // address-group
  localAddressGroup?: string;
  globalAddressGroup?: string;

  // common
  aclId?: string;
  reversible?: boolean;
}

export enum NATMappingType {
    SINGLE_GLOBAL_IP_NO_PORT = '外网地址单一, 未使用外网端口或外网端口单一',
    SINGLE_GLOBAL_IP_RANGE_PORT = '外网地址单一, 外网端口连续',
    RANGE_GLOBAL_IP_NO_PORT = '外网地址连续, 未使用外网端口',
    RANGE_GLOBAL_IP_SINGLE_PORT = '外网地址连续, 外网端口单一',
    LOAD_BALANCING = '负载均衡内部服务器',
    ACL_BASED = '基于ACL的内部服务器'
}

export interface NATPortMappingRule {
  id: string;
  policyName?: string;
  interfaceName: string;
  mappingType: NATMappingType;
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  
  // Global (External)
  globalAddressType: 'ip' | 'interface';
  globalAddress?: string;
  globalEndAddress?: string;
  globalPort?: string;
  globalStartPort?: string;
  globalEndPort?: string;
  
  // Inside (Local)
  localAddress?: string;
  localEndAddress?: string;
  localPort?: string;
  localStartPort?: string;
  localEndPort?: string;
  
  // Load Balancing & ACL
  serverGroupId?: string;
  aclId?: string; 
  
  // Options
  reversible?: boolean;
}

export interface NATServerGroupMember {
  id: string;
  ip: string;
  port: string;
  weight: string;
}

export interface NATServerGroup {
  id: string;
  groupId: string;
  members: NATServerGroupMember[];
}

// Huawei Specific NAT Types
export interface HuaweiNATAddressPoolSection {
    id: string;
    sectionId?: string;
    startAddress: string;
    endAddress?: string;
}

export interface HuaweiNATAddressPool {
    id: string;
    groupName: string;
    groupNumber?: string;
    sections: HuaweiNATAddressPoolSection[];
    mode: 'pat' | 'no-pat-global' | 'no-pat-local';
    routeEnable: boolean;
}

export interface HuaweiNATRule {
    id: string;
    ruleName: string;
    sourceAddress?: string;
    sourceMask?: string;
    destinationAddress?: string;
    destinationMask?: string;
    action: 'source-nat' | 'no-nat';
    natAddressGroup?: string;
    easyIp?: boolean;
}

export interface HuaweiNATServer {
    id: string;
    name: string;
    zone?: string;
    protocol: 'tcp' | 'udp' | 'sctp' | 'icmp' | 'any';

    globalAddressType: 'ip' | 'interface';
    globalAddress?: string;
    globalAddressEnd?: string;
    globalInterface?: string;
    globalPort?: string;
    globalPortEnd?: string;

    insideHostAddress: string;
    insideHostAddressEnd?: string;
    insideHostPort?: string;
    insideHostPortEnd?: string;

    noReverse?: boolean;
    route?: boolean;
    disabled?: boolean;
    description?: string;
}
export interface HuaweiNATConfig {
    addressPools: HuaweiNATAddressPool[];
    rules: HuaweiNATRule[];
    servers: HuaweiNATServer[];
}

export interface H3CGlobalNatRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    countingEnabled: boolean;
    sourceZone: string;
    destinationZone: string;
    sourceIpType: 'any' | 'object-group' | 'host' | 'subnet';
    sourceIpValue: string;
    destinationIpType: 'any' | 'object-group' | 'host' | 'subnet';
    destinationIpValue: string;
    serviceType: 'any' | 'object-group';
    serviceValue: string;
    snatAction: 'none' | 'no-pat' | 'pat' | 'easy-ip' | 'static' | 'no-nat';
    snatAddressGroup: string;
    snatPortPreserved: boolean;
    snatReversible: boolean;
    snatStaticGlobalValue: string;
    dnatAction: 'none' | 'static' | 'no-nat';
    dnatLocalAddress: string;
    dnatLocalPort: string;
}

export interface NATConfig {
    enabled: boolean;
    staticOutbound: {
        enabled: boolean;
        rules: NATStaticOutboundRule[];
    };
    portMapping: {
        enabled: boolean;
        rules: NATPortMappingRule[];
    };
    addressPool: {
        enabled: boolean;
        pools: NATAddressPool[];
    };
    serverGroups: NATServerGroup[];
    huawei: HuaweiNATConfig;
    globalPolicy: {
        enabled: boolean;
        rules: H3CGlobalNatRule[];
    };
    cli: string;
    explanation: string;
}

export interface SSHUser {
    id: string;
    username: string;
    password?: string;
    authType: 'password' | 'public-key';
    passwordError?: string;
}
export interface SSHConfig {
    enabled: boolean;
    publicKeyType: 'rsa' | 'dsa';
    users: SSHUser[];
    // Fix: The type was a literal '0 4', which prevented user input. Changed to string.
    vtyLines: string;
    authenticationMode: 'scheme' | 'password';
    protocolInbound: 'ssh' | 'telnet' | 'all';
    // Fix: The type was a literal 'example.com', which prevented user input. Changed to string.
    domainName: string;
    sourceInterface: string;
    cli: string;
    explanation: string;
}

export interface SecurityZoneMember {
    id: string;
    interfaceName: string;
}

export interface SecurityZone {
    id: string;
    name: string;
    priority: string;
    description: string;
    members: SecurityZoneMember[];
}

export interface SecurityPolicyRule {
    id: string;
    name: string;
    description: string;
    action: 'permit' | 'deny';

    sourceZone: string;
    destinationZone: string;

    sourceAddressType: 'any' | 'custom' | 'group';
    sourceAddressValue: string;

    destinationAddressType: 'any' | 'custom' | 'group';
    destinationAddressValue: string;

    serviceType: 'any' | 'custom' | 'group';
    serviceValue: string;
    
    application: string;
    user: string;
    timeRange?: string;
    logging: boolean;
    counting: boolean;
    enabled: boolean;
}

export interface SecurityConfig {
    zonesEnabled: boolean;
    policiesEnabled: boolean;
    zones: SecurityZone[];
    policies: SecurityPolicyRule[];
    cli: string;
    explanation: string;
}

export interface AddressMember {
    id: string;
    type: 'ip-mask' | 'range' | 'host-name';
    address?: string;
    mask?: string;
    startAddress?: string;
    endAddress?: string;
    hostName?: string;
}

export interface AddressGroup {
    id: string;
    name: string;
    description?: string;
    members: AddressMember[];
}

export interface ServiceMember {
    id: string;
    protocol: 'tcp' | 'udp' | 'icmp' | 'custom';
    customProtocolNumber?: string;
    sourcePortOperator?: 'lt' | 'gt' | 'eq' | 'neq' | 'range';
    sourcePort1?: string;
    sourcePort2?: string;
    destinationPortOperator?: 'lt' | 'gt' | 'eq' | 'neq' | 'range';
    destinationPort1?: string;
    destinationPort2?: string;
    icmpType?: string;
    icmpCode?: string;
}

export interface ServiceGroup {
    id: string;
    name: string;
    description?: string;
    members: ServiceMember[];
}

export interface DomainMember {
    id: string;
    name: string;
}

export interface DomainGroup {
    id: string;
    name: string;
    description?: string;
    members: DomainMember[];
}

export interface ObjectGroupConfig {
    addressGroupsEnabled: boolean;
    serviceGroupsEnabled: boolean;
    domainGroupsEnabled: boolean;
    addressGroups: AddressGroup[];
    serviceGroups: ServiceGroup[];
    domainGroups: DomainGroup[];
    cli: string;
    explanation: string;
}

export type AuthAlgorithm = 'md5' | 'sha1' | 'sha2-256' | 'sha2-384' | 'sha2-512' | 'sm3';
export type EspEncryptionAlgorithm = 'des-cbc' | '3des-cbc' | 'aes-cbc-128' | 'aes-cbc-192' | 'aes-cbc-256' | 'sm1' | 'sm4' | 'aes-128-gcm-128' | 'aes-192-gcm-128' | 'aes-256-gcm-128' | 'aes-128-gmac' | 'aes-192-gmac' | 'aes-256-gmac';
export type PfsGroup = 'dh-group1' | 'dh-group2' | 'dh-group5' | 'dh-group14' | 'dh-group15' | 'dh-group16' | 'dh-group18' | 'dh-group19' | 'dh-group20' | 'dh-group21' | 'dh-group24';

export interface IPsecTransformSet {
    id: string;
    name: string;
    protocol: 'esp' | 'ah' | 'ah-esp';
    encapsulationMode: 'tunnel' | 'transport' | 'auto';
    espEncryption?: EspEncryptionAlgorithm;
    espAuth?: AuthAlgorithm;
    ahAuth?: AuthAlgorithm;
    pfs?: PfsGroup;
}


export interface IKEKeychainPresharedKey {
    id: string;
    address: string;
    mask?: string;
    key: string;
}

export interface IKEKeychain {
    id: string;
    name: string;
    preSharedKeys: IKEKeychainPresharedKey[];
}

export interface IKEProfile {
    id: string;
    name: string;
    keychainId: string;
    matchRemoteAddress: string;
    localIdentity?: string;
}

export interface ManualSAProtocolConfig {
    inboundSpi: string;
    outboundSpi: string;
    inboundKey: string;
    outboundKey: string;
}

export interface IPsecPolicyManualSA {
    esp?: ManualSAProtocolConfig;
    ah?: ManualSAProtocolConfig;
}

export interface IPsecPolicy {
    id: string;
    name: string;
    seqNumber: string;
    mode: 'manual' | 'isakmp';
    aclId: string;
    transformSetIds: string[];
    remoteAddress: string;
    localAddress?: string;
    ikeProfileId?: string;
    manualSA?: IPsecPolicyManualSA
}

export interface IPsecConfig {
    enabled: boolean;
    transformSets: IPsecTransformSet[];
    ikeKeychains: IKEKeychain[];
    ikeProfiles: IKEProfile[];
    policies: IPsecPolicy[];
    cli: string;
    explanation: string;
}

export interface HATrackItem {
  key: string;
  id?: string;
  type: 'interface' | 'vlan' | 'bfd-session-static' | 'bfd-session-dynamic-ip' | 'bfd-session-dynamic-interface' | 'healthcheck' | 'bridge-domain';
  value: string;
  leastUpSession?: string;
}

export interface HuaweiHeartbeatInterface {
  id: string;
  interfaceName: string;
  remoteIp: string;
  heartbeatOnly: boolean;
}

export interface HuaweiHAConfig {
  monitoringItems: HATrackItem[];
  heartbeatInterfaces: HuaweiHeartbeatInterface[];
  authenticationKey: string;
  checksumEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionKeyRefreshEnabled: boolean;
  encryptionKeyRefreshInterval: string;
  helloInterval: string;
  ipPacketPriority: string;
  escapeEnabled: boolean;
  autoSyncConnectionStatus: boolean;
  mirrorSessionEnabled: boolean;
  autoSyncConfig: boolean;
  autoSyncDnsTransparentPolicyDisabled: boolean;
  autoSyncStaticRoute: boolean;
  autoSyncPolicyBasedRoute: boolean;
  preemptEnabled: boolean;
  preemptDelay: string;
  deviceRole: 'active' | 'standby' | 'none';
  standbyConfigEnabled: boolean;
  adjustBgpCostEnabled: boolean;
  adjustBgpSlaveCost: string;
  adjustOspfCostEnabled: boolean;
  adjustOspfSlaveCost: string;
  tcpLinkStateCheckDelay: string;
}

export interface HAConfig {
  enabled: boolean;
  deviceRole: 'primary' | 'secondary';
  workMode: 'active-standby' | 'dual-active';
  controlChannel: {
    localIp: string;
    remoteIp: string;
    port: string;
    keepaliveInterval: string;
    keepaliveCount: string;
  };
  dataChannelInterface: string;
  hotBackupEnabled: boolean;
  autoSyncEnabled: boolean;
  syncCheckEnabled: boolean;
  failback: {
    enabled: boolean;
    delayTime: string;
  };
  monitoring: {
    type: 'none' | 'track';
    trackItems: HATrackItem[];
  };
  // Fix: Make the Huawei-specific HA configuration required to ensure type consistency,
  // as the application logic expects it to be present for Huawei devices.
  huawei: HuaweiHAConfig;
  cli: string;
  explanation: string;
}

export interface GRETunnel {
  id: string;
  tunnelNumber: string;
  description?: string;
  ipAddress?: string;
  mask?: string;
  ipAddressUnnumberedInterface?: string;
  sourceType: 'address' | 'interface';
  sourceValue: string;
  destinationAddress: string;
  mtu?: string;
  keepalive: {
    enabled: boolean;
    period?: string;
    retryTimes?: string;
  };
  securityZone?: string; // Huawei
  greKey?: string; // Both
  greChecksum?: boolean; // H3C
  dfBitEnable?: boolean; // H3C
}

export interface GREVPNConfig {
  enabled: boolean;
  tunnels: GRETunnel[];
  cli: string;
  explanation: string;
}

export interface DHCPOption82Config {
    enabled: boolean;
    strategy: 'drop' | 'keep' | 'replace';
    circuitIdFormat: 'normal' | 'verbose' | 'string';
    circuitIdString?: string;
    circuitIdVerboseNodeIdentifier?: 'mac' | 'sysname' | 'user-defined';
    circuitIdVerboseNodeIdentifierString?: string;
    circuitIdFormatType?: 'ascii' | 'hex';
    remoteIdFormat: 'normal' | 'string' | 'sysname';
    remoteIdString?: string;
    remoteIdFormatType?: 'ascii' | 'hex';
}

export interface DHCPRelaySecurityConfig {
    clientInfoRecording: boolean;
    clientInfoRefresh: boolean;
    clientInfoRefreshType: 'auto' | 'interval';
    clientInfoRefreshInterval?: string; // in seconds
    macCheck: boolean;
    macCheckAgingTime?: string; // in seconds
}

export interface HuaweiOption82Config {
    information: {
        enabled: boolean;
        strategy: 'drop' | 'keep' | 'replace';
    };
    insert: {
        vssControl: boolean;
        linkSelection: boolean;
        serverIdOverride: boolean;
    };
}

export interface DHCPRelayInterface {
    id: string;
    interfaceName: string;
    serverAddresses: { id: string, ip: string, vpnInstance?: string }[];
    option82: DHCPOption82Config; // H3C specific
    huaweiOptions?: {
        sourceIpAddress?: string;
        gateway?: string;
        option82: HuaweiOption82Config;
    }
}

export interface DHCPRelayConfig {
    enabled: boolean;
    security: DHCPRelaySecurityConfig; // H3C global security
    dscp?: string; // H3C DSCP
    interfaces: DHCPRelayInterface[];
    huawei: { // Huawei global settings
        serverMatchCheck: boolean;
        replyForwardAll: boolean;
        trustOption82: boolean;
    };
    cli: string;
    explanation: string;
}

export interface DHCPSnoopingInterfaceConfig {
  id: string;
  interfaceName: string;
  trust: boolean;
  bindingRecord: boolean; // H3C only
}

export interface HuaweiDHCPSnoopingTrustedInterface {
  id: string;
  name: string;
}

export interface DHCPSnoopingConfig {
  enabled: boolean;
  // H3C specific
  interfaces: DHCPSnoopingInterfaceConfig[];
  h3c?: {
    bindingDatabase: {
        enabled: boolean;
        filename: string;
        updateInterval?: string;
    }
  };
  // Huawei specific
  huawei: {
    enabledOnVlans: string;
    trustedInterfaces: HuaweiDHCPSnoopingTrustedInterface[];
    userBindAutosave: {
        enabled: boolean;
        filename: string;
        writeDelay?: string;
    }
  };
  cli: string;
  explanation: string;
}

export interface NodeConfig {
  dhcp: DHCPConfig;
  dhcpRelay: DHCPRelayConfig;
  dhcpSnooping: DHCPSnoopingConfig;
  vlan: VLANConfig;
  interfaceIP: InterfaceIPConfig;
  linkAggregation: LinkAggregationConfig;
  portIsolation: PortIsolationConfig;
  stp: STPConfig;
  stacking: StackingConfig;
  mlag: MLAGConfig;
  routing: RoutingConfig;
  vrrp: VRRPConfig;
  acl: ACLsConfig;
  nat: NATConfig;
  security: SecurityConfig;
  objectGroups: ObjectGroupConfig;
  ssh: SSHConfig;
  wireless: WirelessConfig;
  timeRanges: TimeRange[];
  ha: HAConfig;
  ipsec: IPsecConfig;
  gre: GREVPNConfig;
  management: ManagementConfig;
}

export interface Port {
  id: string;
  name: string;
  status: 'available' | 'connected';
  connectedTo?: {
    nodeId: string;
    portId: string;
  };
}

export interface LinkConfig {
    mode: 'unconfigured' | 'access' | 'trunk' | 'l3';
    accessVlan: string;
    trunkNativeVlan: string;
    trunkAllowedVlans: string;
    applyToPortRange: string;
}

export interface Node {
  id: string;
  type: DeviceType;
  vendor: Vendor;
  name: string;
  x: number;
  y: number;
  config: NodeConfig;
  style: {
    color: string;
    iconSize: number;
  };
  ports: Port[];
  text?: string;
  borderStyle?: 'solid' | 'dashed' | 'none';
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  runtime?: DeviceRuntimeStatus;
}

export interface Connection {
  id: string;
  from: {
    nodeId: string;
    portId: string;
  };
  to: {
    nodeId: string;
    portId: string;
  };
  type: 'solid' | 'dashed';
  style: 'direct' | 'orthogonal';
  path?: {
      points?: { x: number, y: number }[];
  };
  labelFromOffset: { x: number, y: number };
  labelToOffset: { x: number, y: number };
  config: LinkConfig;
}


// A device stored in the manual inventory list
export interface ManagedDevice {
  id: string;
  name: string;
  vendor: Vendor;
  type: DeviceType;
  management: ManagementConfig;
  runtime?: DeviceRuntimeStatus;
  group?: string;
}

// A unified type representing any device that can be targeted by operational tools
export interface OperationalDevice {
  id: string;
  name: string;
  vendor: Vendor;
  type: DeviceType;
  management: ManagementConfig;
  source: 'topology' | 'inventory';
  runtime: DeviceRuntimeStatus;
  group?: string;
};

export interface Topology {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  managedDevices: ManagedDevice[];
  canvasTranslate?: { x: number; y: number };
  canvasScale?: number;
}

export interface AppState {
  activeTopologyId: string;
  topologies: Record<string, Topology>;
}