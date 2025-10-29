import { Vendor } from '../../types';

export const stpRules = [
  // Global mode
  {
    pattern: 'stp mode',
    regex: '^stp\s+mode\s+(?<mode>mstp|rstp|stp)$',
    paramNames: ['mode'],
    explanation: '配置STP模式为 ${mode}。',
    conversions: {
      [Vendor.Cisco]: (_: string[], n?: any) => `spanning-tree mode ${n?.mode === 'mstp' ? 'mst' : n?.mode === 'rstp' ? 'rapid-pvst' : 'pvst'}`,
      [Vendor.Huawei]: (_: string[], n?: any) => `stp mode ${n?.mode}`,
    },
  },
  // Global priority/root (non-MST)
  {
    pattern: 'stp priority',
    regex: '^stp\s+priority\s+(?<prio>\d+)$',
    paramNames: ['prio'],
    explanation: '配置全局桥优先级为 ${prio}。',
    conversions: {
      [Vendor.Cisco]: (_: string[], n?: any) => `spanning-tree vlan 1-4094 priority ${n?.prio}`,
      [Vendor.Huawei]: (_: string[], n?: any) => `stp priority ${n?.prio}`,
    },
  },
  {
    pattern: 'stp root',
    regex: '^stp\s+root\s+(?<which>primary|secondary)$',
    paramNames: ['which'],
    explanation: '将设备配置为 ${which} 根桥（简化处理，等效于所有VLAN）。',
    conversions: {
      [Vendor.Cisco]: (_: string[], n?: any) => `spanning-tree vlan 1-4094 root ${n?.which}`,
      [Vendor.Huawei]: (_: string[], n?: any) => `stp root ${n?.which}`,
    },
  },

  // MST region configuration
  {
    pattern: 'stp region-configuration',
    regex: '^stp\s+region-configuration$',
    explanation: '进入MST区域配置。',
    conversions: {
      [Vendor.Cisco]: 'spanning-tree mst configuration',
      [Vendor.Huawei]: 'stp region-configuration',
    },
  },
  {
    pattern: 'stp region name',
    regex: '^region-name\s+(?<name>.+)$',
    paramNames: ['name'],
    explanation: '配置MST区域名为 ${name}。',
    conversions: {
      [Vendor.Cisco]: 'name ${name}',
      [Vendor.Huawei]: 'region-name ${name}',
    },
  },
  {
    pattern: 'stp region revision',
    regex: '^revision-level\s+(?<rev>\d+)$',
    paramNames: ['rev'],
    explanation: '配置MST修订号为 ${rev}。',
    conversions: {
      [Vendor.Cisco]: 'revision ${rev}',
      [Vendor.Huawei]: 'revision-level ${rev}',
    },
  },
  {
    pattern: 'stp instance vlan',
    regex: '^instance\s+(?<inst>\d+)\s+vlan\s+(?<vlist>.+)$',
    paramNames: ['inst','vlist'],
    explanation: '将VLAN ${vlist} 归属到实例 ${inst}。',
    conversions: {
      [Vendor.Cisco]: 'instance ${inst} vlan ${vlist}',
      [Vendor.Huawei]: 'instance ${inst} vlan ${vlist}',
    },
  },
  {
    pattern: 'stp region activate',
    regex: '^active\s+region-configuration$',
    explanation: '应用并退出MST区域配置。',
    conversions: {
      [Vendor.Cisco]: 'exit',
      [Vendor.Huawei]: 'active region-configuration',
    },
  },

  // Per-instance root/priority
  {
    pattern: 'stp instance root',
    regex: '^stp\s+instance\s+(?<inst>\d+)\s+root\s+(?<which>primary|secondary)$',
    paramNames: ['inst','which'],
    explanation: '为实例 ${inst} 配置根桥为 ${which}。',
    conversions: {
      [Vendor.Cisco]: 'spanning-tree mst ${inst} root ${which}',
      [Vendor.Huawei]: 'stp instance ${inst} root ${which}',
    },
  },
  {
    pattern: 'stp instance priority',
    regex: '^stp\s+instance\s+(?<inst>\d+)\s+priority\s+(?<prio>\d+)$',
    paramNames: ['inst','prio'],
    explanation: '为实例 ${inst} 配置优先级为 ${prio}。',
    conversions: {
      [Vendor.Cisco]: 'spanning-tree mst ${inst} priority ${prio}',
      [Vendor.Huawei]: 'stp instance ${inst} priority ${prio}',
    },
  },

  // Interface features
  {
    pattern: 'stp edged-port enable',
    explanation: '启用边缘端口（等同于Cisco PortFast）。',
    conversions: { [Vendor.Cisco]: 'spanning-tree portfast', [Vendor.Huawei]: 'stp edged-port enable' },
  },
  {
    pattern: 'stp bpdu-protection',
    explanation: '启用BPDU防护（等同于Cisco BPDU Guard）。',
    conversions: { [Vendor.Cisco]: 'spanning-tree bpduguard enable', [Vendor.Huawei]: 'stp bpdu-protection' },
  },
];