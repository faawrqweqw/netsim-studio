import { Vendor } from '../../types';

export const interfaceRules = [
    {
      pattern: "interface",
      explanation: "进入接口 $1 的配置模式。",
      conversions: { [Vendor.Cisco]: "interface $1", [Vendor.Huawei]: "interface $1" }
    },
    {
      pattern: "ip address",
      explanation: "为接口配置IP地址 $1 和子网掩码 $2。",
      conversions: { [Vendor.Cisco]: "ip address $1 $2", [Vendor.Huawei]: "ip address $1 $2" }
    },
    {
      pattern: "description",
      explanation: "为接口或VLAN设置描述 $1。",
      conversions: { [Vendor.Cisco]: "description $1", [Vendor.Huawei]: "description $1" }
    },
    {
      pattern: "shutdown",
      explanation: "禁用接口。",
      conversions: { [Vendor.Cisco]: "shutdown", [Vendor.Huawei]: "shutdown" }
    },
    {
      pattern: "undo shutdown",
      explanation: "启用接口。",
      conversions: { [Vendor.Cisco]: "no shutdown", [Vendor.Huawei]: "undo shutdown" }
    },
];
