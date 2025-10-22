import { Vendor } from '../../types';

export const ikeRules = [
    {
      pattern: "ike proposal",
      explanation: "创建一个IKE提议，并指定其编号 $1。",
      conversions: { [Vendor.Cisco]: "crypto isakmp policy $1", [Vendor.Huawei]: "ike proposal $1" }
    },
    {
      pattern: "encryption-algorithm",
      explanation: "在IKE提议中，设置加密算法为 $1。",
      conversions: { [Vendor.Cisco]: "encryption $1", [Vendor.Huawei]: "encryption-algorithm $1" }
    },
    {
      pattern: "dh group",
      explanation: "在IKE提议中，设置Diffie-Hellman密钥交换组为 $1。",
      conversions: { [Vendor.Cisco]: "group $1", [Vendor.Huawei]: "dh group $1" }
    },
    {
      pattern: "authentication-algorithm",
      explanation: "在IKE提议中，设置认证（哈希）算法为 $1。",
      conversions: { [Vendor.Cisco]: "hash $1", [Vendor.Huawei]: "authentication-algorithm $1" }
    },
    {
      pattern: "authentication-method",
      explanation: "在IKE提议中，设置认证方法为 $1。",
      conversions: { [Vendor.Cisco]: "authentication $1", [Vendor.Huawei]: "authentication-method $1" }
    },
];
