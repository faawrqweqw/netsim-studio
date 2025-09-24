import { Vendor } from '../../types';

const natRulesPart1 = [
    {
        pattern: "nat address-group",
        explanation: "创建NAT地址池，组ID为 $1，可选名称为 $2。",
        conversions: {
            [Vendor.Cisco]: "ip nat pool $2 <start_ip> <end_ip> netmask <netmask>",
            [Vendor.Huawei]: "nat address-group $2"
        }
    },
    {
        pattern: "nat server protocol",
        explanation: "配置静态NAT（服务器映射），将协议 $1 的公网地址 $2 端口 $3 映射到内网地址 $4 端口 $5。",
        conversions: {
            [Vendor.Cisco]: "ip nat inside source static $1 $4 $5 $2 $3",
            [Vendor.Huawei]: "nat server protocol $1 global $2 $3 inside $4 $5"
        }
    },
    {
        pattern: "nat outbound",
        explanation: "在接口上配置出方向的源NAT，使用ACL $1 匹配流量，并转换为地址池 $2 中的地址。",
        conversions: {
            [Vendor.Cisco]: "ip nat inside source list $1 pool <pool_name_of_$2> overload",
            [Vendor.Huawei]: "# 华为使用nat-policy实现\nnat-policy\n rule name <rule_name>\n  source-address acl $1\n  action source-nat address-group <group_name_of_$2>"
        }
    }
];

const natGlobalPolicyRules = [
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

export const natRules = [...natRulesPart1, ...natGlobalPolicyRules];
