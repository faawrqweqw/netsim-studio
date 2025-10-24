import { Vendor } from '../../types';

export const interfaceRules = [
    {
      pattern: "interface",
      explanation: "进入接口 $1 的配置模式。",
      conversions: { [Vendor.Huawei]: "interface $1", [Vendor.H3C]: "interface $1" }
    },
    {
      pattern: "ip address",
      explanation: "为接口配置IP地址 $1 和子网掩码 $2。",
      conversions: { [Vendor.Huawei]: "ip address $1 $2", [Vendor.H3C]: "ip address $1 $2" }
    },
    {
      pattern: "description",
      explanation: "为接口或VLAN设置描述 $1。",
      conversions: { [Vendor.Huawei]: "description $1", [Vendor.H3C]: "description $1" }
    },
    {
      pattern: "shutdown",
      explanation: "禁用接口。",
      conversions: { [Vendor.Huawei]: "shutdown", [Vendor.H3C]: "shutdown" }
    },
    {
      pattern: "no shutdown",
      explanation: "启用接口。",
      conversions: { [Vendor.Huawei]: "undo shutdown", [Vendor.H3C]: "undo shutdown" }
    },
];
