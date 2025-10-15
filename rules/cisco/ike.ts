import { Vendor } from '../../types';

export const ikeRules = [
    {
      pattern: "crypto isakmp policy",
      explanation: "创建一个IKE（ISAKMP）策略，并指定其优先级 $1。",
      conversions: { [Vendor.Huawei]: "ike proposal $1", [Vendor.H3C]: "ike proposal $1" }
    },
    {
      pattern: "encryption",
      explanation: "在IKE策略中，设置加密算法为 $1。",
      conversions: { [Vendor.Huawei]: "encryption-algorithm $1", [Vendor.H3C]: "encryption-algorithm $1" }
    },
    {
      pattern: "hash",
      explanation: "在IKE策略中，设置哈希（认证）算法为 $1。",
      conversions: { [Vendor.Huawei]: "authentication-algorithm $1", [Vendor.H3C]: "authentication-algorithm $1" }
    },
    {
      pattern: "authentication",
      explanation: "在IKE策略中，设置认证方法为 $1。",
      conversions: { [Vendor.Huawei]: "authentication-method $1", [Vendor.H3C]: "authentication-method $1" }
    },
    {
      pattern: "group",
      explanation: "在IKE策略中，设置Diffie-Hellman密钥交换组为 $1。",
      conversions: { [Vendor.Huawei]: "dh group$1", [Vendor.H3C]: "dh group$1" }
    },
];
