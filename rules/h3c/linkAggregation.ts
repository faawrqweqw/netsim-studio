import { Vendor } from '../../types';

export const linkAggregationRules = [
    {
      pattern: "interface Bridge-Aggregation",
      explanation: "创建并进入二层聚合接口 (Bridge-Aggregation) $1。",
      conversions: { [Vendor.Cisco]: "interface Port-channel$1", [Vendor.Huawei]: "interface Eth-Trunk$1" }
    },
    {
      pattern: "interface Route-Aggregation",
      explanation: "创建并进入三层聚合接口 (Route-Aggregation) $1。",
      conversions: { [Vendor.Cisco]: "interface Port-channel$1\n no switchport", [Vendor.Huawei]: "interface Eth-Trunk$1\n undo portswitch" }
    },
    {
      pattern: "port link-aggregation group",
      explanation: "将当前物理接口加入聚合组 $1。",
      conversions: { [Vendor.Cisco]: "channel-group $1 mode active", [Vendor.Huawei]: "eth-trunk $1" }
    },
    {
      pattern: "link-aggregation mode static",
      explanation: "将聚合接口配置为静态聚合模式（不使用LACP）。",
      conversions: { [Vendor.Cisco]: "# 在物理接口下配置\n channel-group <id> mode on", [Vendor.Huawei]: "# 在Eth-Trunk接口下配置\n mode manual load-balance" }
    },
    {
      pattern: "link-aggregation mode dynamic",
      explanation: "将聚合接口配置为动态聚合模式（LACP）。",
      conversions: { [Vendor.Cisco]: "# 在物理接口下配置\n channel-group <id> mode active", [Vendor.Huawei]: "# 在Eth-Trunk接口下配置\n mode lacp-static" }
    },
    {
      pattern: "link-aggregation load-sharing mode",
      explanation: "全局配置链路聚合的负载均衡模式为 $1。",
      conversions: { [Vendor.Cisco]: "port-channel load-balance $1", [Vendor.Huawei]: "# 在Eth-Trunk接口下配置\n load-balance $1" }
    },
];
