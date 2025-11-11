import { Vendor } from '../../types';

export const dhcpRules = [
    {
      pattern: "service dhcp",
      explanation: "全局启用DHCP服务。",
      conversions: { [Vendor.Huawei]: "dhcp enable", [Vendor.H3C]: "dhcp enable" }
    },
    {
      pattern: "ip dhcp pool",
      regex: "^ip\\s+dhcp\\s+pool\\s+(?<name>\\S+)$",
      paramNames: ["name"],
      explanation: "创建名为 ${name} 的DHCP地址池并进入DHCP池配置模式。",
      conversions: { [Vendor.Huawei]: "ip pool ${name}", [Vendor.H3C]: "dhcp server ip-pool ${name}" }
    },
    {
      pattern: "network",
      regex: "^network\\s+(?<net>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<mask>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["net","mask"],
      explanation: "在DHCP池中定义网络地址 ${net} 和子网掩码 ${mask}。",
      conversions: { [Vendor.Huawei]: "network ${net} mask ${mask}", [Vendor.H3C]: "network ${net} mask ${mask}" }
    },
    {
      pattern: "default-router",
      regex: "^default-router\\s+(?<gw>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["gw"],
      explanation: "在DHCP池中定义默认网关 ${gw}。",
      conversions: { [Vendor.Huawei]: "gateway-list ${gw}", [Vendor.H3C]: "gateway-list ${gw}" }
    },
    {
      pattern: "dns-server",
      regex: "^dns-server\\s+(?<dns>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["dns"],
      explanation: "在DHCP池中定义DNS服务器 ${dns}。",
      conversions: { [Vendor.Huawei]: "dns-list ${dns}", [Vendor.H3C]: "dns-list ${dns}" }
    },
    {
      pattern: "lease",
      regex: "^lease\\s+(?<d>\\d+)\\s+(?<h>\\d+)\\s+(?<m>\\d+)$",
      paramNames: ["d","h","m"],
      explanation: "设置DHCP租约时间为 ${d} 天 ${h} 小时 ${m} 分钟。",
      conversions: { [Vendor.Huawei]: "lease day ${d} hour ${h} minute ${m}", [Vendor.H3C]: "expired day ${d} hour ${h} minute ${m}" }
    },
    {
      pattern: "ip dhcp excluded-address",
      regex: "^ip\\s+dhcp\\s+excluded-address\\s+(?<start>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<end>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["start","end"],
      explanation: "配置DHCP服务器不分配的地址范围，从 ${start} 到 ${end}。",
      conversions: { [Vendor.Huawei]: "# 在ip pool内配置\n excluded-ip-address ${start} ${end}", [Vendor.H3C]: "# 在dhcp server ip-pool内配置\n forbidden-ip ${start} ${end}" }
    },
    {
      pattern: "ip helper-address",
      regex: "^ip\\s+helper-address\\s+(?<srv>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["srv"],
      explanation: "在接口上配置DHCP中继，指向DHCP服务器 ${srv}。",
      conversions: { [Vendor.Huawei]: "dhcp select relay\n dhcp relay server-ip ${srv}", [Vendor.H3C]: "dhcp select relay\n dhcp relay server-select ${srv}" }
    },
];
