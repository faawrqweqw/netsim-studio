import { Vendor } from '../../types';

export const dhcpRules = [
    {
      pattern: "dhcp enable",
      explanation: "在设备上全局启用DHCP服务。",
      conversions: { [Vendor.Cisco]: "service dhcp", [Vendor.Huawei]: "dhcp enable" }
    },
    {
      pattern: "dhcp server ip-pool",
      regex: "^dhcp\\s+server\\s+ip-pool\\s+(?<name>\\S+)$",
      paramNames: ["name"],
      explanation: "创建名为 ${name} 的DHCP地址池并进入地址池视图。",
      conversions: { [Vendor.Cisco]: "ip dhcp pool ${name}", [Vendor.Huawei]: "ip pool ${name}" }
    },
    {
      pattern: "network",
      regex: "^network\\s+(?<net>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+mask\\s+(?<mask>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["net","mask"],
      explanation: "配置DHCP地址池动态分配的主网段地址为 ${net}，掩码为 ${mask}。",
      conversions: { [Vendor.Cisco]: "network ${net} ${mask}", [Vendor.Huawei]: "network ${net} mask ${mask}" }
    },
    {
        pattern: "address range",
        regex: "^address\\s+range\\s+(?<start>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<end>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
        paramNames: ["start","end"],
        explanation: "配置地址池动态分配的IP地址范围，从 ${start} 到 ${end}。",
        conversions: { [Vendor.Cisco]: "# Cisco通过 network 命令定义整个范围，通过 ip dhcp excluded-address 排除地址", [Vendor.Huawei]: "# 华为通过 network 命令定义整个范围，通过 excluded-ip-address 排除地址" }
    },
    {
      pattern: "gateway-list",
      regex: "^gateway-list\\s+(?<gw>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["gw"],
      explanation: "配置为DHCP客户端分配的网关地址为 ${gw}。",
      conversions: { [Vendor.Cisco]: "default-router ${gw}", [Vendor.Huawei]: "gateway-list ${gw}" }
    },
    {
      pattern: "dns-list",
      regex: "^dns-list\\s+(?<dns>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["dns"],
      explanation: "配置为DHCP客户端分配的DNS服务器地址为 ${dns}。",
      conversions: { [Vendor.Cisco]: "dns-server ${dns}", [Vendor.Huawei]: "dns-list ${dns}" }
    },
    {
        pattern: "domain-name",
        regex: "^domain-name\\s+(?<domain>\\S+)$",
        paramNames: ["domain"],
        explanation: "配置为DHCP客户端分配的域名后缀为 ${domain}。",
        conversions: { [Vendor.Cisco]: "domain-name ${domain}", [Vendor.Huawei]: "domain-name ${domain}" }
    },
    {
      pattern: "expired day",
      regex: "^expired\\s+day\\s+(?<d>\\d+)\\s+hour\\s+(?<h>\\d+)\\s+minute\\s+(?<m>\\d+)$",
      paramNames: ["d","h","m"],
      explanation: "配置动态分配IP地址的租约有效期限为 ${d} 天 ${h} 小时 ${m} 分钟。",
      conversions: { [Vendor.Cisco]: "lease ${d} ${h} ${m}", [Vendor.Huawei]: "lease day ${d} hour ${h} minute ${m}" }
    },
    {
        pattern: "forbidden-ip",
        regex: "^forbidden-ip\\s+(?<start>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<end>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
        paramNames: ["start","end"],
        explanation: "配置DHCP地址池中不参与自动分配的IP地址范围，从 ${start} 到 ${end}。",
        conversions: { [Vendor.Cisco]: "ip dhcp excluded-address ${start} ${end}", [Vendor.Huawei]: "# 在ip pool内配置\n excluded-ip-address ${start} ${end}" }
    },
    {
        pattern: "dhcp server forbidden-ip",
        regex: "^dhcp\\s+server\\s+forbidden-ip\\s+(?<start>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<end>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
        paramNames: ["start","end"],
        explanation: "配置全局不参与自动分配的IP地址范围，从 ${start} 到 ${end}。此配置对所有地址池生效。",
        conversions: { [Vendor.Cisco]: "ip dhcp excluded-address ${start} ${end}", [Vendor.Huawei]: "# 华为没有完全等效的全局排除命令，需要在每个ip pool内单独配置。" }
    },
    {
        pattern: "static-bind ip-address",
        regex: "^static-bind\\s+ip-address\\s+(?<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+mac-address\\s+(?<mac>[0-9A-Fa-f:-]+)$",
        paramNames: ["ip","mac"],
        explanation: "为客户端配置静态地址绑定。IP地址为 ${ip}，MAC地址为 ${mac}。",
        conversions: { [Vendor.Cisco]: "# 思科需要为每个静态绑定创建一个独立的DHCP池\nip dhcp pool STATIC_${mac}\n host ${ip}\n client-identifier 01${mac}", [Vendor.Huawei]: "static-bind ip-address ${ip} mac-address ${mac}" }
    },
    {
        pattern: "option 43 hex",
        regex: "^option\\s+43\\s+hex\\s+(?<hex>[0-9A-Fa-f]+)$",
        paramNames: ["hex"],
        explanation: "配置DHCP Option 43选项，通常用于告知AP AC的IP地址。十六进制字符串为 ${hex}。",
        conversions: { [Vendor.Cisco]: "option 43 hex ${hex}", [Vendor.Huawei]: "# 华为使用 sub-option 格式\noption 43 sub-option 3 ascii <AC_IP>" }
    },
    {
        pattern: "dhcp select server",
        explanation: "在当前接口上启用DHCP服务器功能。接口将使用与接口IP地址在同一网段的地址池为客户端分配地址。",
        conversions: { [Vendor.Cisco]: "# 思科无需此命令，在接口上配置了ip helper-address即为中继，否则为服务器侧接口", [Vendor.Huawei]: "dhcp select global" }
    },
    {
        pattern: "dhcp server apply ip-pool",
        regex: "^dhcp\\s+server\\s+apply\\s+ip-pool\\s+(?<name>\\S+)$",
        paramNames: ["name"],
        explanation: "在当前接口上应用（关联）名为 ${name} 的DHCP地址池。",
        conversions: { [Vendor.Cisco]: "# 思科没有直接的关联命令，地址池通过network命令与接口IP网段自动匹配", [Vendor.Huawei]: "dhcp select global pool ${name}" }
    },
    {
        pattern: "dhcp select relay",
        explanation: "在当前接口上启用DHCP中继功能，将DHCP请求转发给指定的DHCP服务器。",
        conversions: { [Vendor.Cisco]: "# 在接口上配置 ip helper-address 即可启用中继", [Vendor.Huawei]: "dhcp select relay" }
    },
    {
        pattern: "dhcp relay server-address",
        regex: "^dhcp\\s+relay\\s+server-address\\s+(?<srv>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
        paramNames: ["srv"],
        explanation: "为DHCP中继指定DHCP服务器的IP地址为 ${srv}。",
        conversions: { [Vendor.Cisco]: "ip helper-address ${srv}", [Vendor.Huawei]: "dhcp relay server-ip ${srv}" }
    },
];
