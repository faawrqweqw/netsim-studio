import { Vendor } from '../../types';

export const stpRules = [
  // Global mode mapping
  {
    pattern: 'spanning-tree mode',
    regex: '^spanning-tree\s+mode\s+(?<mode>mst|rapid-pvst|pvst)$',
    paramNames: ['mode'],
    explanation: '配置STP模式为 ${mode}。',
    conversions: {
      [Vendor.Huawei]: (_: string[], n?: any) => `stp mode ${n?.mode === 'mst' ? 'mstp' : n?.mode === 'rapid-pvst' ? 'rstp' : 'stp'}`,
      [Vendor.H3C]: (_: string[], n?: any) => `stp mode ${n?.mode === 'mst' ? 'mstp' : n?.mode === 'rapid-pvst' ? 'rstp' : 'stp'}`,
    },
  },

  // Global bridge priority (approximate: apply to all VLANs)
  {
    pattern: 'spanning-tree vlan priority',
    regex: '^spanning-tree\s+vlan\s+(?<vlist>[\w,-]+)\s+priority\s+(?<prio>\d+)$',
    paramNames: ['vlist','prio'],
    explanation: '为VLAN ${vlist} 配置桥优先级为 ${prio}。',
    conversions: {
      [Vendor.Huawei]: (_: string[], n?: any) => `stp priority ${n?.prio}`,
      [Vendor.H3C]: (_: string[], n?: any) => `stp priority ${n?.prio}`,
    },
  },

  // Root primary/secondary (approximate for all VLANs)
  {
    pattern: 'spanning-tree vlan root',
    regex: '^spanning-tree\s+vlan\s+(?<vlist>[\w,-]+)\s+root\s+(?<which>primary|secondary)$',
    paramNames: ['vlist','which'],
    explanation: '将VLAN ${vlist} 的根桥设置为 ${which}。',
    conversions: {
      [Vendor.Huawei]: (_: string[], n?: any) => `stp root ${n?.which}`,
      [Vendor.H3C]: (_: string[], n?: any) => `stp root ${n?.which}`,
    },
  },

  // MST configuration block
  {
    pattern: 'spanning-tree mst configuration (name)',
    regex: '^spanning-tree\s+mst\s+configuration\s*$',
    explanation: '进入MST配置模式。',
    conversions: {
      [Vendor.Huawei]: 'stp region-configuration',
      [Vendor.H3C]: 'stp region-configuration',
    },
  },
  {
    pattern: 'mst name',
    regex: '^name\s+(?<name>.+)$',
    paramNames: ['name'],
    explanation: '配置MST区域名为 ${name}。',
    conversions: {
      [Vendor.Huawei]: 'region-name ${name}',
      [Vendor.H3C]: 'region-name ${name}',
    },
  },
  {
    pattern: 'mst revision',
    regex: '^revision\s+(?<rev>\d+)$',
    paramNames: ['rev'],
    explanation: '配置MST修订号为 ${rev}。',
    conversions: {
      [Vendor.Huawei]: 'revision-level ${rev}',
      [Vendor.H3C]: 'revision-level ${rev}',
    },
  },
  {
    pattern: 'mst instance vlan',
    regex: '^instance\s+(?<inst>\d+)\s+vlan\s+(?<vlist>.+)$',
    paramNames: ['inst','vlist'],
    explanation: '将VLAN ${vlist} 归属到MST实例 ${inst}。',
    conversions: {
      [Vendor.Huawei]: 'instance ${inst} vlan ${vlist}',
      [Vendor.H3C]: 'instance ${inst} vlan ${vlist}',
    },
  },
  {
    pattern: 'mst config end',
    regex: '^exit$',
    explanation: '退出MST配置。',
    conversions: {
      [Vendor.Huawei]: 'active region-configuration\nquit',
      [Vendor.H3C]: 'active region-configuration\nquit',
    },
  },

  // Per-instance root/priority
  {
    pattern: 'spanning-tree mst instance root',
    regex: '^spanning-tree\s+mst\s+(?<inst>\d+)\s+root\s+(?<which>primary|secondary)$',
    paramNames: ['inst','which'],
    explanation: '将MST实例 ${inst} 根桥设置为 ${which}。',
    conversions: {
      [Vendor.Huawei]: 'stp instance ${inst} root ${which}',
      [Vendor.H3C]: 'stp instance ${inst} root ${which}',
    },
  },
  {
    pattern: 'spanning-tree mst instance priority',
    regex: '^spanning-tree\s+mst\s+(?<inst>\d+)\s+priority\s+(?<prio>\d+)$',
    paramNames: ['inst','prio'],
    explanation: '设置MST实例 ${inst} 优先级为 ${prio}。',
    conversions: {
      [Vendor.Huawei]: 'stp instance ${inst} priority ${prio}',
      [Vendor.H3C]: 'stp instance ${inst} priority ${prio}',
    },
  },

  // Interface features
  {
    pattern: 'spanning-tree portfast',
    regex: '^spanning-tree\s+portfast$',
    explanation: '在接口上启用PortFast。',
    conversions: { [Vendor.Huawei]: 'stp edged-port enable', [Vendor.H3C]: 'stp edged-port enable' },
  },
  {
    pattern: 'spanning-tree bpduguard',
    regex: '^spanning-tree\s+bpduguard\s+enable$',
    explanation: '在接口上启用BPDU Guard。',
    conversions: { [Vendor.Huawei]: 'stp bpdu-protection', [Vendor.H3C]: 'stp bpdu-protection' },
  },
];
