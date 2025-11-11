import { Vendor } from '../../types';

export const dhcpRules = [
    {
      pattern: "dhcp enable",
      explanation: "在设备上全局启用DHCP功能。",
      conversions: { [Vendor.Cisco]: "service dhcp", [Vendor.H3C]: "dhcp enable" }
    },
    {
      pattern: "ip pool",
      explanation: "创建名为 $1 的DHCP地址池并进入地址池视图。",
      conversions: { [Vendor.Cisco]: "ip dhcp pool $1", [Vendor.H3C]: "dhcp server ip-pool $1" }
    },
    {
      pattern: "network",
      explanation: "在DHCP地址池中定义网络地址 $1 和子网掩码 $2。",
      conversions: { [Vendor.Cisco]: "network $1 $2", [Vendor.H3C]: "network $1 mask $2" }
    },
    {
      pattern: "gateway-list",
      explanation: "在DHCP地址池中配置网关地址 $1。",
      conversions: { [Vendor.Cisco]: "default-router $1", [Vendor.H3C]: "gateway-list $1" }
    },
    {
      pattern: "dns-list",
      explanation: "在DHCP地址池中配置DNS服务器地址 $1。",
      conversions: { [Vendor.Cisco]: "dns-server $1", [Vendor.H3C]: "dns-list $1" }
    },
    {
      pattern: "lease",
      explanation: "设置DHCP租约时间为 $1 天 $2 小时 $3 分钟。",
      conversions: { [Vendor.Cisco]: "lease $1 $2 $3", [Vendor.H3C]: "expired day $1 hour $2 minute $3" }
    },
    {
      pattern: "excluded-ip-address",
      explanation: "在DHCP地址池中排除地址范围，从 $1 到 $2。",
      conversions: { [Vendor.Cisco]: "ip dhcp excluded-address $1 $2", [Vendor.H3C]: "dhcp server ip-pool <pool_name>\n forbidden-ip $1 $2" }
    },
    {
      pattern: "static-bind ip-address",
      explanation: "为DHCP地址池配置静态绑定，IP为 $1，MAC为 $2。",
      conversions: { [Vendor.Cisco]: "# 需要为每个静态绑定创建一个独立的DHCP池\n ip dhcp pool STATIC_$2\n host $1\n client-identifier 01$2", [Vendor.H3C]: "static-bind ip-address $1 mask <mask> hardware-address $2" }
    },
    {
      pattern: "dhcp select relay",
      explanation: "将接口的DHCP模式设置为中继。",
      conversions: { [Vendor.Cisco]: "ip helper-address <server_ip>", [Vendor.H3C]: "dhcp select relay" }
    },
];
