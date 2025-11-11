import { Vendor } from '../../types';

export const vlanRules = [
    {
      pattern: "vlan",
      explanation: "创建VLAN $*。",
      conversions: { 
          [Vendor.Cisco]: (params: string[]) => `vlan ${params.join(' ').replace(/ to /g, '-').replace(/ /g, ',')}`, 
          [Vendor.Huawei]: "vlan batch $*" 
      }
    },
    {
      pattern: "port link-type access",
      explanation: "将接口的链路类型配置为Access。",
      conversions: { [Vendor.Cisco]: "switchport mode access", [Vendor.Huawei]: "port link-type access" }
    },
    {
      pattern: "port access vlan",
      explanation: "配置Access接口的默认VLAN为 $1。",
      conversions: { [Vendor.Cisco]: "switchport access vlan $1", [Vendor.Huawei]: "port default vlan $1" }
    },
    {
      pattern: "port link-type trunk",
      explanation: "将接口的链路类型配置为Trunk。",
      conversions: { [Vendor.Cisco]: "switchport mode trunk", [Vendor.Huawei]: "port link-type trunk" }
    },
    {
      pattern: "port trunk permit vlan",
      explanation: "配置Trunk接口允许通过的VLAN $*。",
      conversions: { 
          [Vendor.Cisco]: (params: string[]) => {
              const command = params.join(' ');
              if (command.toLowerCase() === 'all') {
                  return 'switchport trunk allowed vlan all';
              }
              return `switchport trunk allowed vlan ${command.replace(/ to /g, '-').replace(/ /g, ',')}`;
          },
          [Vendor.Huawei]: "port trunk allow-pass vlan $*" 
      }
    },
    {
      pattern: "port trunk pvid vlan",
      explanation: "配置Trunk接口的PVID为 $1。",
      conversions: { [Vendor.Cisco]: "switchport trunk native vlan $1", [Vendor.Huawei]: "port trunk pvid vlan $1" }
    },
];
