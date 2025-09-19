import { Vendor } from '../../types';

export const objectGroupRules = [
    {
        pattern: "object-group ip address",
        explanation: "创建名为 $1 的IPv4地址对象组。",
        conversions: { [Vendor.Huawei]: "ip address-set $1 type object", [Vendor.Cisco]: "object-group network $1" }
    },
    {
        pattern: "network host address",
        explanation: "在地址对象组中添加主机地址 $1。",
        conversions: { [Vendor.Huawei]: "address $1 32", [Vendor.Cisco]: "host $1" }
    },
    {
        pattern: "network subnet",
        explanation: "在地址对象组中添加子网 $1，掩码为 $2。",
        conversions: { [Vendor.Huawei]: "address $1 mask $2", [Vendor.Cisco]: "$1 $2" }
    },
    {
        pattern: "network range",
        explanation: "在地址对象组中添加IP地址范围，从 $1 到 $2。",
        conversions: { [Vendor.Huawei]: "address range $1 $2", [Vendor.Cisco]: "range $1 $2" }
    },
    {
        pattern: "network host name",
        explanation: "在地址对象组中添加域名主机 $1 (FQDN)。",
        conversions: { [Vendor.Huawei]: "# 华为使用独立的domain-set\ndomain-set name <group_name>\n add domain $1" }
    },
    {
        pattern: "object-group service",
        explanation: "创建名为 $1 的服务对象组。",
        conversions: { [Vendor.Huawei]: "ip service-set $1 type object", [Vendor.Cisco]: "object-group service $1" }
    },
    {
        pattern: "service",
        explanation: "在服务对象组中定义一个服务，协议为 $1。",
        conversions: { [Vendor.Huawei]: "service protocol $1", [Vendor.Cisco]: "service $1" }
    },
];
