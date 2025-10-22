import { Vendor } from '../../types';

export const dhcpRules = [
    {
      pattern: "service dhcp",
      explanation: "全局启用DHCP服务。",
      conversions: { [Vendor.Huawei]: "dhcp enable", [Vendor.H3C]: "dhcp enable" }
    },
    {
      pattern: "ip dhcp pool",
      explanation: "创建名为 $1 的DHCP地址池并进入DHCP池配置模式。",
      conversions: { [Vendor.Huawei]: "ip pool $1", [Vendor.H3C]: "dhcp server ip-pool $1" }
    },
    {
      pattern: "network",
      explanation: "在DHCP池中定义网络地址 $1 和子网掩码 $2。",
      conversions: { [Vendor.Huawei]: "network $1 mask $2", [Vendor.H3C]: "network $1 mask $2" }
    },
    {
      pattern: "default-router",
      explanation: "在DHCP池中定义默认网关 $1。",
      conversions: { [Vendor.Huawei]: "gateway-list $1", [Vendor.H3C]: "gateway-list $1" }
    },
    {
      pattern: "dns-server",
      explanation: "在DHCP池中定义DNS服务器 $1。",
      conversions: { [Vendor.Huawei]: "dns-list $1", [Vendor.H3C]: "dns-list $1" }
    },
    {
      pattern: "lease",
      explanation: "设置DHCP租约时间为 $1 天 $2 小时 $3 分钟。",
      conversions: { [Vendor.Huawei]: "lease day $1 hour $2 minute $3", [Vendor.H3C]: "expired day $1 hour $2 minute $3" }
    },
    {
      pattern: "ip dhcp excluded-address",
      explanation: "配置DHCP服务器不分配的地址范围，从 $1 到 $2。",
      conversions: { [Vendor.Huawei]: "# 在ip pool内配置\n excluded-ip-address $1 $2", [Vendor.H3C]: "# 在dhcp server ip-pool内配置\n forbidden-ip $1 $2" }
    },
    {
      pattern: "ip helper-address",
      explanation: "在接口上配置DHCP中继，指向DHCP服务器 $1。",
      conversions: { [Vendor.Huawei]: "dhcp select relay\n dhcp relay server-ip $1", [Vendor.H3C]: "dhcp select relay\n dhcp relay server-select $1" }
    },
];
