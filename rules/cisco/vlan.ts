import { Vendor } from '../../types';

export const vlanRules = [
    {
      pattern: "vlan",
      explanation: "创建VLAN $* 并进入VLAN配置模式。",
      conversions: { 
          [Vendor.Huawei]: (params: string[]) => `vlan batch ${params.join('').replace(/,/g, ' ').replace(/-/g, ' to ')}`,
          [Vendor.H3C]: (params: string[]) => `vlan ${params.join('').replace(/,/g, ' ').replace(/-/g, ' to ')}`
      }
    },
    {
      pattern: "name",
      explanation: "为当前VLAN配置名称/描述 $1。",
      conversions: { [Vendor.Huawei]: "# 在vlan视图下\n description $1", [Vendor.H3C]: "# 在vlan视图下\n description $1" }
    },
    {
      pattern: "switchport mode access",
      explanation: "将接口配置为Access模式。",
      conversions: { [Vendor.Huawei]: "port link-type access", [Vendor.H3C]: "port link-type access" }
    },
    {
      pattern: "switchport access vlan",
      explanation: "将Access模式的接口划分到VLAN $1。",
      conversions: { [Vendor.Huawei]: "port default vlan $1", [Vendor.H3C]: "port access vlan $1" }
    },
    {
      pattern: "switchport mode trunk",
      explanation: "将接口配置为Trunk模式。",
      conversions: { [Vendor.Huawei]: "port link-type trunk", [Vendor.H3C]: "port link-type trunk" }
    },
    {
      pattern: "switchport trunk allowed vlan",
      explanation: "配置Trunk接口允许通过的VLAN $*。",
      conversions: { 
          [Vendor.Huawei]: (params: string[]) => {
              const keyword = ['add', 'remove', 'except', 'none', 'all'].includes(params[0]) ? params.shift() : '';
              const vlanList = params.join(' ').replace(/,/g, ' ').replace(/-/g, ' to ');
              if (keyword === 'add') return `port trunk allow-pass vlan ${vlanList}`;
              if (keyword === 'remove') return `undo port trunk allow-pass vlan ${vlanList}`;
              return `port trunk allow-pass vlan ${vlanList}`;
          },
          [Vendor.H3C]: (params: string[]) => {
              const keyword = ['add', 'remove', 'except', 'none', 'all'].includes(params[0]) ? params.shift() : '';
              const vlanList = params.join(' ').replace(/,/g, ' ').replace(/-/g, ' to ');
              if (keyword === 'add') return `port trunk permit vlan ${vlanList}`;
              if (keyword === 'remove') return `undo port trunk permit vlan ${vlanList}`;
              return `port trunk permit vlan ${vlanList}`;
          } 
      }
    },
    {
      pattern: "switchport trunk native vlan",
      explanation: "配置Trunk接口的Native VLAN为 $1。",
      conversions: { [Vendor.Huawei]: "port trunk pvid vlan $1", [Vendor.H3C]: "port trunk pvid vlan $1" }
    },
    {
      pattern: "switchport protected",
      explanation: "将接口配置为受保护端口，同一VLAN内的受保护端口之间无法通信。这是实现端口隔离的一种方式。",
      conversions: { [Vendor.Huawei]: "port-isolate enable group 1", [Vendor.H3C]: "port-isolate enable group 1" }
    },
];