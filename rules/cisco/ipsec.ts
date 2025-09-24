
import { Vendor } from '../../types';

export const ipsecRules = [
    {
      pattern: "crypto ipsec transform-set",
      explanation: "创建名为 $1 的IPsec安全提议，并指定加密/认证算法。",
      conversions: { [Vendor.Huawei]: "ipsec proposal $1", [Vendor.H3C]: "ipsec transform-set $1" }
    },
    {
      pattern: "crypto isakmp key",
      explanation: "为对端地址 $2 配置预共享密钥 $1。",
      conversions: { [Vendor.Huawei]: "ike keychain <name>\n pre-shared-key address $2 key simple $1", [Vendor.H3C]: "ike keychain <name>\n pre-shared-key address $2 key simple $1" }
    },
    {
      pattern: "crypto isakmp profile",
      explanation: "创建名为 $1 的IKE配置文件。",
      conversions: { [Vendor.Huawei]: "# 华为没有直接对应的profile，配置分散在isakmp peer等处", [Vendor.H3C]: "ike profile $1" }
    },
    {
      pattern: "crypto map",
      explanation: "创建名为 $1，序号为 $2 的IPsec策略（Crypto Map）。",
      conversions: { [Vendor.Huawei]: "ipsec policy $1 $2", [Vendor.H3C]: "ipsec policy $1 $2 isakmp" }
    },
    {
      pattern: "match address",
      explanation: "在Crypto Map中引用ACL $1 来定义保护的数据流。",
      conversions: { [Vendor.Huawei]: "security acl $1", [Vendor.H3C]: "security acl $1" }
    },
    {
      pattern: "set peer",
      explanation: "指定IPsec隧道的对端地址为 $1。",
      conversions: { [Vendor.Huawei]: "remote-address $1", [Vendor.H3C]: "remote-address $1" }
    }
];
