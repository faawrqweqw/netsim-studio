import { Vendor } from '../../types';

export const linkAggregationRules = [
    {
      pattern: "interface Eth-Trunk",
      explanation: "创建并进入Eth-Trunk接口 $1。",
      conversions: { [Vendor.Cisco]: "interface Port-channel$1", [Vendor.H3C]: "interface Bridge-Aggregation$1" }
    },
    {
      pattern: "eth-trunk",
      explanation: "将当前物理接口加入Eth-Trunk $1。",
      conversions: { [Vendor.Cisco]: "channel-group $1 mode active", [Vendor.H3C]: "port link-aggregation group $1" }
    },
    {
      pattern: "mode lacp-static",
      explanation: "将 Eth-Trunk 接口配置为静态 LACP 模式。",
      conversions: { [Vendor.Cisco]: "# 在物理接口下配置\n channel-group <id> mode active/passive", [Vendor.H3C]: "# 在Bridge-Aggregation接口下配置\n link-aggregation mode dynamic" }
    },
    {
      pattern: "mode manual load-balance",
      explanation: "将 Eth-Trunk 接口配置为手工负载均衡模式（静态聚合）。",
      conversions: { [Vendor.Cisco]: "# 在物理接口下配置\n channel-group <id> mode on", [Vendor.H3C]: "# 在Bridge-Aggregation接口下配置\n link-aggregation mode static" }
    },
    {
      pattern: "load-balance",
      explanation: "配置Eth-Trunk接口的负载均衡算法为 $1。",
      conversions: { [Vendor.Cisco]: "port-channel load-balance $1", [Vendor.H3C]: "link-aggregation global load-sharing mode $1" }
    },
    {
      pattern: "lacp system-priority",
      explanation: "设置LACP系统优先级为 $1。用于LACP主动端选举。",
      conversions: { [Vendor.Cisco]: "lacp system-priority $1", [Vendor.H3C]: "lacp system-priority $1" }
    },
    {
      pattern: "lacp priority",
      explanation: "设置接口的LACP端口优先级为 $1。用于选择活动接口。",
      conversions: { [Vendor.Cisco]: "lacp port-priority $1", [Vendor.H3C]: "link-aggregation port-priority $1" }
    },
    {
      pattern: "lacp preempt enable",
      explanation: "在Eth-Trunk接口上启用LACP抢占功能。",
      conversions: { 
          [Vendor.Cisco]: "# Cisco默认启用抢占，无特定开启命令", 
          [Vendor.H3C]: "# H3C默认启用抢占，无特定开启命令"
      }
    },
    {
      pattern: "lacp preempt delay",
      explanation: "配置LACP抢占延迟时间为 $1 秒。",
      conversions: { 
          [Vendor.Cisco]: "# 无直接对应命令", 
          [Vendor.H3C]: "# 无直接对应命令" 
      }
    },
    {
      pattern: "lacp timeout",
      explanation: "配置LACP超时时间。fast为3秒，slow为90秒。",
      conversions: { 
          [Vendor.Cisco]: "# 无直接对应命令", 
          [Vendor.H3C]: (params: string[]) => `lacp period ${params[0] === 'fast' ? 'short' : 'long'}`
      }
    },
];
