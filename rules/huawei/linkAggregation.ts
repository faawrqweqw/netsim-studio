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
      conversions: { [Vendor.Cisco]: "port-channel load-balance $1", [Vendor.H3C]: "link-aggregation global\n load-sharing mode $1" }
    },
];
