import { Vendor } from '../../types';

export const vrrpRules = [
    {
      pattern: "vrrp",
      explanation: "为接口上的VRRP组 $1 配置虚拟IP地址 $2。",
      conversions: { [Vendor.Huawei]: "vrrp vrid $1 virtual-ip $2", [Vendor.H3C]: "vrrp vrid $1 virtual-ip $2" }
    }
];
