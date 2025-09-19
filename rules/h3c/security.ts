

import { Vendor } from '../../types';

export const securityRules = [
    {
      pattern: "security-zone name",
      explanation: "创建名为 $1 的安全域，并进入安全域视图。",
      conversions: { [Vendor.Huawei]: "firewall zone name $1" }
    },
    {
      pattern: "import interface",
      explanation: "向当前安全域中添加三层接口成员 $1。",
      conversions: { [Vendor.Huawei]: "add interface $1" }
    },
    {
      pattern: "zone-pair security source",
      explanation: "创建安全域间实例，源为 $1，目的为 $2。",
      conversions: { [Vendor.Huawei]: "firewall interzone $1 $2" }
    },
    {
      pattern: "security-policy ip",
      explanation: "进入IPv4安全策略视图。",
      conversions: { [Vendor.Huawei]: "security-policy" }
    },
    {
      pattern: "rule name",
      explanation: "创建名为 $1 的安全策略规则。",
      conversions: { [Vendor.Huawei]: "rule name $1" }
    },
    {
      pattern: "source-zone",
      explanation: "配置源安全区域为 $1。",
      conversions: { [Vendor.Huawei]: "source-zone $1" }
    },
    {
      pattern: "destination-zone",
      explanation: "配置目的安全区域为 $1。",
      conversions: { [Vendor.Huawei]: "destination-zone $1" }
    },
    {
      pattern: "source-ip-host",
      explanation: "配置源IP地址为单个主机 $1。",
      conversions: { [Vendor.Huawei]: "source-address $1 32" }
    },
    {
      pattern: "source-ip-subnet",
      explanation: "配置源IP地址为子网 $1，掩码为 $2。",
      conversions: { [Vendor.Huawei]: "source-address $1 $2" }
    },
    {
      pattern: "source-ip-range",
      explanation: "配置源IP地址为范围从 $1 到 $2。",
      conversions: { [Vendor.Huawei]: "source-address range $1 $2" }
    },
    {
      pattern: "source-ip object-group-name",
      explanation: "配置源IP地址为地址对象组 $1。",
      conversions: { [Vendor.Huawei]: "source-address address-set $1" }
    },
    {
      pattern: "destination-ip-host",
      explanation: "配置目的IP地址为单个主机 $1。",
      conversions: { [Vendor.Huawei]: "destination-address $1 32" }
    },
    {
      pattern: "destination-ip-subnet",
      explanation: "配置目的IP地址为子网 $1，掩码为 $2。",
      conversions: { [Vendor.Huawei]: "destination-address $1 $2" }
    },
    {
      pattern: "destination-ip-range",
      explanation: "配置目的IP地址为范围从 $1 到 $2。",
      conversions: { [Vendor.Huawei]: "destination-address range $1 $2" }
    },
    {
      pattern: "destination-ip object-group-name",
      explanation: "配置目的IP地址为地址对象组 $1。",
      conversions: { [Vendor.Huawei]: "destination-address address-set $1" }
    },
    {
        pattern: "service object-group-name",
        explanation: "配置服务为服务对象组 $1。",
        conversions: { [Vendor.Huawei]: "service service-set $1" }
    },
    {
      pattern: "time-range",
      explanation: "将安全策略规则与名为 $1 的时间段对象关联，使规则只在该时间段内生效。",
      conversions: { [Vendor.Huawei]: "time-range $1" }
    },
    {
      pattern: "action pass",
      explanation: "配置动作为允许(pass)。",
      conversions: { [Vendor.Huawei]: "action permit" }
    },
    {
        pattern: "action drop",
        explanation: "配置动作为丢弃(drop)。",
        conversions: { [Vendor.Huawei]: "action deny" }
    },
];

export const natGlobalPolicyRules = [
    {
      pattern: "nat global-policy",
      explanation: "进入全局NAT策略视图。",
      conversions: { [Vendor.Huawei]: "# 华为在nat-policy视图下配置" }
    },
    {
      pattern: "rule name",
      explanation: "创建名为 $1 的全局NAT规则。",
      conversions: { [Vendor.Huawei]: "rule name $1" }
    },
    {
      pattern: "action snat easy-ip",
      explanation: "配置源地址转换为出接口的IP地址（PAT）。",
      conversions: { [Vendor.Huawei]: "action source-nat easy-ip" }
    },
    {
      pattern: "action snat address-group",
      explanation: "配置源地址转换为地址池 $1。",
      conversions: { [Vendor.Huawei]: "action source-nat address-group $1" }
    },
    {
      pattern: "action dnat ip-address",
      explanation: "配置目的地址转换为内网IP $1，可选端口 $2。",
      conversions: { [Vendor.Huawei]: "nat server protocol <tcp/udp> global <global_ip> <global_port> inside $1 $2" }
    },
    {
      pattern: "action snat no-nat",
      explanation: "配置对匹配的流量不执行源地址转换。",
      conversions: { [Vendor.Huawei]: "action no-nat" }
    },
    {
      pattern: "action dnat no-nat",
      explanation: "配置对匹配的流量不执行目的地址转换。",
      conversions: { [Vendor.Huawei]: "# 华为通过 action no-nat 实现" }
    },
    {
      pattern: "counting enable",
      explanation: "开启NAT规则的命中统计功能。",
      conversions: { }
    },
];
