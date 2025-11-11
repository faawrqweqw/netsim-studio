import { Vendor } from '../../types';

export const ikeRules = [
    {
        pattern: "ike proposal",
        explanation: "创建一个IKE提议，并指定其编号 $1。",
        conversions: { [Vendor.Cisco]: "crypto isakmp policy $1", [Vendor.H3C]: "ike proposal $1" }
    },
    {
        pattern: "encryption-algorithm",
        explanation: "在IKE提议中，设置加密算法为 $1。",
        conversions: { [Vendor.Cisco]: "encryption $1", [Vendor.H3C]: "encryption-algorithm $1" }
    },
    {
        pattern: "dh group",
        explanation: "在IKE提议中，设置Diffie-Hellman密钥交换组为 $1。",
        conversions: { [Vendor.Cisco]: "group $1", [Vendor.H3C]: "dh group $1" }
    },
    {
        pattern: "authentication-algorithm",
        explanation: "在IKE提议中，设置哈希（认证）算法为 $1。",
        conversions: { [Vendor.Cisco]: "hash $1", [Vendor.H3C]: "authentication-algorithm $1" }
    },
    {
        pattern: "authentication-method",
        explanation: "在IKE提议中，设置认证方法为 $1。",
        conversions: { [Vendor.Cisco]: "authentication $1", [Vendor.H3C]: "authentication-method $1" }
    },
    {
        pattern: "integrity-algorithm",
        explanation: "在IKEv2提议中，设置完整性保护算法为 $1。这是IKEv2特有的，用于替代IKEv1的认证算法。",
        conversions: { [Vendor.Cisco]: "# Cisco IKEv2 proposal: integrity $1", [Vendor.H3C]: "# H3C IKEv2 proposal: integrity $1" }
    },
    {
        pattern: "prf",
        explanation: "在IKEv2提议中，设置伪随机函数（PRF）算法为 $1。",
        conversions: { [Vendor.Cisco]: "# Cisco IKEv2 proposal: prf $1", [Vendor.H3C]: "# H3C IKEv2 proposal: prf $1" }
    }
];
