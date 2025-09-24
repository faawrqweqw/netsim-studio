import { Vendor } from '../../types';

export const vlanRules = [
    {
      pattern: "vlan batch",
      explanation: "批量创建VLAN $*。",
      conversions: { 
        [Vendor.Cisco]: (params: string[]) => `vlan ${params.join(' ').replace(/ to /g, '-').replace(/ /g, ',')}`, 
        [Vendor.H3C]: "vlan $*"
      }
    },
    {
      pattern: "port link-type access",
      explanation: "将接口的链路类型配置为Access。",
      conversions: { [Vendor.Cisco]: "switchport mode access", [Vendor.H3C]: "port link-type access" }
    },
    {
      pattern: "port default vlan",
      explanation: "配置Access接口的默认VLAN为 $1。",
      conversions: { [Vendor.Cisco]: "switchport access vlan $1", [Vendor.H3C]: "port access vlan $1" }
    },
    {
      pattern: "port link-type trunk",
      explanation: "将接口的链路类型配置为Trunk。",
      conversions: { [Vendor.Cisco]: "switchport mode trunk", [Vendor.H3C]: "port link-type trunk" }
    },
    {
      pattern: "port trunk allow-pass vlan",
      explanation: "配置Trunk接口允许通过的VLAN $*。",
      conversions: { 
          [Vendor.Cisco]: (params: string[]) => {
              const command = params.join(' ');
              if (command.toLowerCase() === 'all') {
                  return 'switchport trunk allowed vlan all';
              }
              return `switchport trunk allowed vlan ${command.replace(/ to /g, '-').replace(/ /g, ',')}`;
          },
          [Vendor.H3C]: "port trunk permit vlan $*" 
      }
    },
    {
      pattern: "port trunk pvid vlan",
      explanation: "配置Trunk接口的PVID为 $1。",
      conversions: { [Vendor.Cisco]: "switchport trunk native vlan $1", [Vendor.H3C]: "port trunk pvid vlan $1" }
    },
];