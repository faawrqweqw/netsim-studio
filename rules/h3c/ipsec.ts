
import { Vendor } from '../../types';

export const ipsecRules = [
    {
      pattern: "ipsec transform-set",
      explanation: "创建名为 $1 的IPsec安全提议。",
      conversions: { [Vendor.Huawei]: "ipsec proposal $1", [Vendor.Cisco]: "crypto ipsec transform-set $1" }
    },
    {
      pattern: "ike keychain",
      explanation: "创建名为 $1 的IKE密钥链。",
      conversions: { [Vendor.Huawei]: "ike keychain $1", [Vendor.Cisco]: "crypto isakmp key <key> address <address> <mask>" }
    },
    {
      pattern: "ike profile",
      explanation: "创建名为 $1 的IKE配置文件。",
      conversions: { [Vendor.Huawei]: "# 华为没有直接对应的profile，配置分散在isakmp peer等处", [Vendor.Cisco]: "crypto isakmp profile $1" }
    },
    {
      pattern: "ipsec policy",
      explanation: "创建名为 $1，序号为 $2 的IPsec策略，模式为 $3。",
      conversions: { 
          [Vendor.Huawei]: "ipsec policy $1 $2 $3", 
          [Vendor.Cisco]: "crypto map $1 $2 ipsec-isakmp\n# 注意：此为 ISAKMP 等效命令。Cisco 的手动模式配置方式不同。" 
      }
    },
    {
      pattern: "security acl",
      explanation: "在IPsec策略中引用ACL $1 来定义保护的数据流。",
      conversions: { [Vendor.Huawei]: "security acl $1", [Vendor.Cisco]: "match address $1" }
    },
    {
      pattern: "remote-address",
      explanation: "指定IPsec隧道的对端地址为 $1。",
      conversions: { [Vendor.Huawei]: "remote-address $1", [Vendor.Cisco]: "set peer $1" }
    },
    {
        pattern: "sa spi inbound",
        explanation: "在手动IPsec策略中，为入向 $1 SA 配置SPI值为 $2。",
        conversions: { [Vendor.Huawei]: "sa spi inbound $1 $2", [Vendor.Cisco]: "set security-association spi inbound $1 $2" }
    },
    {
        pattern: "sa string-key inbound",
        explanation: "在手动IPsec策略中，为入向 $1 SA 配置明文 ($2) 字符串密钥 $3。",
        conversions: { [Vendor.Huawei]: "sa string-key inbound $1 $3", [Vendor.Cisco]: "# (密钥在SA中配置)" }
    },
    {
        pattern: "sa spi outbound",
        explanation: "在手动IPsec策略中，为出向 $1 SA 配置SPI值为 $2。",
        conversions: { [Vendor.Huawei]: "sa spi outbound $1 $2", [Vendor.Cisco]: "set security-association spi outbound $1 $2" }
    },
    {
        pattern: "sa string-key outbound",
        explanation: "在手动IPsec策略中，为出向 $1 SA 配置明文 ($2) 字符串密钥 $3。",
        conversions: { [Vendor.Huawei]: "sa string-key outbound $1 $3", [Vendor.Cisco]: "# (密钥在SA中配置)" }
    }
];
