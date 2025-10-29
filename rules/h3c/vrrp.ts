import { Vendor } from '../../types';

export const vrrpRules = [
    {
      pattern: "vrrp vrid",
      explanation: "为VRRP组 $1 配置虚拟IP地址 $2。",
      conversions: { [Vendor.Cisco]: "vrrp $1 ip $2", [Vendor.Huawei]: "vrrp vrid $1 virtual-ip $2" }
    }
];
