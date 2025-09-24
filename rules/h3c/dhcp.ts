import { Vendor } from '../../types';

export const dhcpRules = [
    {
      pattern: "dhcp enable",
      explanation: "在设备上全局启用DHCP服务。",
      conversions: { [Vendor.Cisco]: "service dhcp", [Vendor.Huawei]: "dhcp enable" }
    },
    {
      pattern: "dhcp server ip-pool",
      explanation: "创建名为 $1 的DHCP地址池并进入地址池视图。",
      conversions: { [Vendor.Cisco]: "ip dhcp pool $1", [Vendor.Huawei]: "ip pool $1" }
    },
    {
      pattern: "network",
      explanation: "配置DHCP地址池动态分配的主网段地址为 $1，掩码为 $2。",
      conversions: { [Vendor.Cisco]: "network $1 $2", [Vendor.Huawei]: "network $1 mask $2" }
    },
    {
        pattern: "address range",
        explanation: "配置地址池动态分配的IP地址范围，从 $1 到 $2。",
        conversions: { [Vendor.Cisco]: "# Cisco通过 network 命令定义整个范围，通过 ip dhcp excluded-address 排除地址", [Vendor.Huawei]: "# 华为通过 network 命令定义整个范围，通过 excluded-ip-address 排除地址" }
    },
    {
      pattern: "gateway-list",
      explanation: "配置为DHCP客户端分配的网关地址为 $1。",
      conversions: { [Vendor.Cisco]: "default-router $1", [Vendor.Huawei]: "gateway-list $1" }
    },
    {
      pattern: "dns-list",
      explanation: "配置为DHCP客户端分配的DNS服务器地址为 $1。",
      conversions: { [Vendor.Cisco]: "dns-server $1", [Vendor.Huawei]: "dns-list $1" }
    },
    {
        pattern: "domain-name",
        explanation: "配置为DHCP客户端分配的域名后缀为 $1。",
        conversions: { [Vendor.Cisco]: "domain-name $1", [Vendor.Huawei]: "domain-name $1" }
    },
    {
      pattern: "expired day",
      explanation: "配置动态分配IP地址的租约有效期限为 $1 天 $2 小时 $3 分钟。",
      conversions: { [Vendor.Cisco]: "lease $1 $2 $3", [Vendor.Huawei]: "lease day $1 hour $2 minute $3" }
    },
    {
        pattern: "forbidden-ip",
        explanation: "配置DHCP地址池中不参与自动分配的IP地址范围，从 $1 到 $2。",
        conversions: { [Vendor.Cisco]: "ip dhcp excluded-address $1 $2", [Vendor.Huawei]: "# 在ip pool内配置\n excluded-ip-address $1 $2" }
    },
    {
        pattern: "dhcp server forbidden-ip",
        explanation: "配置全局不参与自动分配的IP地址范围，从 $1 到 $2。此配置对所有地址池生效。",
        conversions: { [Vendor.Cisco]: "ip dhcp excluded-address $1 $2", [Vendor.Huawei]: "# 华为没有完全等效的全局排除命令，需要在每个ip pool内单独配置。" }
    },
    {
        pattern: "static-bind ip-address",
        explanation: "为客户端配置静态地址绑定。IP地址为 $1，MAC地址为 $2。",
        conversions: { [Vendor.Cisco]: "# 思科需要为每个静态绑定创建一个独立的DHCP池\nip dhcp pool STATIC_$2\n host $1\n client-identifier 01$2", [Vendor.Huawei]: "static-bind ip-address $1 mac-address $2" }
    },
    {
        pattern: "option 43 hex",
        explanation: "配置DHCP Option 43选项，通常用于告知AP AC的IP地址。十六进制字符串为 $1。",
        conversions: { [Vendor.Cisco]: "option 43 hex $1", [Vendor.Huawei]: "# 华为使用 sub-option 格式\noption 43 sub-option 3 ascii <AC_IP>" }
    },
    {
        pattern: "dhcp select server",
        explanation: "在当前接口上启用DHCP服务器功能。接口将使用与接口IP地址在同一网段的地址池为客户端分配地址。",
        conversions: { [Vendor.Cisco]: "# 思科无需此命令，在接口上配置了ip helper-address即为中继，否则为服务器侧接口", [Vendor.Huawei]: "dhcp select global" }
    },
    {
        pattern: "dhcp server apply ip-pool",
        explanation: "在当前接口上应用（关联）名为 $1 的DHCP地址池。",
        conversions: { [Vendor.Cisco]: "# 思科没有直接的关联命令，地址池通过network命令与接口IP网段自动匹配", [Vendor.Huawei]: "dhcp select global pool $1" }
    },
    {
        pattern: "dhcp select relay",
        explanation: "在当前接口上启用DHCP中继功能，将DHCP请求转发给指定的DHCP服务器。",
        conversions: { [Vendor.Cisco]: "# 在接口上配置 ip helper-address 即可启用中继", [Vendor.Huawei]: "dhcp select relay" }
    },
    {
        pattern: "dhcp relay server-address",
        explanation: "为DHCP中继指定DHCP服务器的IP地址为 $1。",
        conversions: { [Vendor.Cisco]: "ip helper-address $1", [Vendor.Huawei]: "dhcp relay server-ip $1" }
    },
];
