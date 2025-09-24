import { Vendor } from '../../types';

export const linkAggregationRules = [
    {
      pattern: "interface Port-channel",
      explanation: "创建并进入端口聚合接口 Port-channel $1。",
      conversions: { [Vendor.Huawei]: "interface Eth-Trunk$1", [Vendor.H3C]: "interface Bridge-Aggregation$1" }
    },
    {
      pattern: "channel-group",
      explanation: "将接口加入端口聚合组 $1，并设置模式为 $2。\n注意：华为和H3C的模式在聚合接口上配置。",
      conversions: { [Vendor.Huawei]: "eth-trunk $1\n# 模式在Eth-Trunk接口下配置 (e.g., mode lacp-static)", [Vendor.H3C]: "port link-aggregation group $1\n# 模式在Bridge-Aggregation接口下配置 (e.g., link-aggregation mode dynamic)" }
    },
    {
      pattern: "port-channel load-balance",
      explanation: "配置链路聚合的负载均衡算法为 $1。",
      conversions: { [Vendor.Huawei]: "# 在Eth-Trunk接口下配置\n load-balance $1", [Vendor.H3C]: "link-aggregation global load-sharing mode $1" }
    },
    {
      pattern: "lacp system-priority",
      explanation: "设置LACP系统优先级为 $1。值越小，优先级越高。用于LACP主动端选举。",
      conversions: { [Vendor.Huawei]: "lacp system-priority $1", [Vendor.H3C]: "lacp system-priority $1" }
    },
    {
      pattern: "lacp port-priority",
      explanation: "设置接口的LACP端口优先级为 $1。值越小，优先级越高。用于选择活动接口。",
      conversions: { [Vendor.Huawei]: "lacp priority $1", [Vendor.H3C]: "link-aggregation port-priority $1" }
    },
];
