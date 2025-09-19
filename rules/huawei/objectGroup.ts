import { Vendor } from '../../types';

export const objectGroupRules = [
    {
      pattern: "ip address-set",
      explanation: "创建名为 $1 的地址集（地址组）。",
      conversions: { [Vendor.H3C]: "object-group ip address $1", [Vendor.Cisco]: "object-group network $1" }
    },
    {
      pattern: "address",
      explanation: "在地址集中添加一个地址成员，IP为 $1，掩码为 $2。",
      conversions: { [Vendor.H3C]: "network subnet $1 $2", [Vendor.Cisco]: "$1 $2" }
    },
    {
      pattern: "address range",
      explanation: "在地址集中添加一个IP地址范围，从 $1 到 $2。",
      conversions: { [Vendor.H3C]: "network range $1 $2", [Vendor.Cisco]: "range $1 $2" }
    },
    {
      pattern: "ip service-set",
      explanation: "创建名为 $1 的服务集（服务组）。",
      conversions: { [Vendor.H3C]: "object-group service $1", [Vendor.Cisco]: "object-group service $1" }
    },
    {
      pattern: "service protocol",
      explanation: "在服务集中定义一个服务，协议为 $1。",
      conversions: { [Vendor.H3C]: "service $1", [Vendor.Cisco]: "service $1" }
    },
    {
      pattern: "domain-set name",
      explanation: "创建名为 $1 的域名组。",
      conversions: { [Vendor.H3C]: "# H3C将域名作为地址对象组的成员\nobject-group ip address $1\n network host name <domain>" }
    },
    {
      pattern: "add domain",
      explanation: "向域名组中添加域名 $1。",
      conversions: { [Vendor.H3C]: "network host name $1" }
    },
];
