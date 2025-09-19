import { Vendor } from '../../types';

export const portIsolationRules = [
    {
      pattern: "port-isolate enable group",
      explanation: "在当前接口上启用端口隔离功能，并将其加入隔离组 $1。同一组内的端口互相隔离。",
      conversions: {
        [Vendor.Cisco]: "switchport protected\n# 注意：Cisco的protected port功能只能实现本交换机内的隔离，更高级功能需使用Private VLAN (PVLAN)。",
        [Vendor.H3C]: "port-isolate enable group $1"
      }
    },
    {
      pattern: "port-isolate mode",
      explanation: "配置全局端口隔离模式为 $1。'l2' 表示仅二层隔离，'all' 表示二层和三层都隔离。",
      conversions: {
        [Vendor.Cisco]: "# Cisco无此命令。隔离范围由PVLAN的具体配置决定。",
        [Vendor.H3C]: "# H3C默认二层隔离三层互通，无直接对应命令切换为all模式。"
      }
    },
    {
      pattern: "port-isolate exclude vlan",
      explanation: "全局配置，使端口隔离功能在指定的VLAN $1 中不生效。",
      conversions: {
        [Vendor.H3C]: "# H3C是在隔离组内配置非隔离VLAN (community-vlan)，效果相反。\nport-isolate group <group_id>\n community-vlan vlan $1",
        [Vendor.Cisco]: "# Cisco PVLAN中，可以将VLAN配置为community类型实现组内互通。"
      }
    },
    {
      pattern: "am isolate",
      explanation: "在当前接口上配置与接口 $1 的单向隔离。从当前接口发送的报文不能到达接口 $1。",
      conversions: {
        [Vendor.Cisco]: "# Cisco无直接对应的单向隔离命令，需通过VACL等复杂方式实现。",
        [Vendor.H3C]: "# H3C无直接对应的单向隔离命令。"
      }
    },
];
