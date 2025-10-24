
import { Vendor } from '../../types';

export const ipsecRules = [
    // IPsec Proposal (Transform Set)
    {
      pattern: "ipsec proposal",
      explanation: "创建名为 $1 的IPsec安全提议，用于定义IPsec的安全参数。",
      conversions: { [Vendor.Cisco]: "crypto ipsec transform-set $1", [Vendor.H3C]: "ipsec transform-set $1" }
    },
    {
      pattern: "transform",
      explanation: "在IPsec提议中指定安全协议为 $1 (esp, ah, ah-esp)。",
      conversions: { [Vendor.H3C]: "protocol $1", [Vendor.Cisco]: "# (协议在transform-set名称后指定, e.g., esp-aes)" }
    },
    {
      pattern: "encapsulation-mode",
      explanation: "配置IPsec的封装模式为 $1 (tunnel, transport, auto)。",
      conversions: { [Vendor.Cisco]: "# (封装模式在transform-set中配置，或默认tunnel)", [Vendor.H3C]: "encapsulation-mode $1" }
    },
    {
      pattern: "esp encryption-algorithm",
      explanation: "在IPsec提议中配置ESP加密算法为 $1。",
      conversions: { [Vendor.Cisco]: "# (在transform-set中配置，如：esp-aes)", [Vendor.H3C]: "esp encryption-algorithm $1" }
    },
    {
      pattern: "esp authentication-algorithm",
      explanation: "在IPsec提议中配置ESP认证算法为 $1。",
      conversions: { [Vendor.Cisco]: "# (在transform-set中配置，如：esp-sha-hmac)", [Vendor.H3C]: "esp authentication-algorithm $1" }
    },
    {
      pattern: "ah authentication-algorithm",
      explanation: "在IPsec提议中配置AH认证算法为 $1。",
      conversions: { [Vendor.Cisco]: "# (在transform-set中配置，如：ah-sha-hmac)", [Vendor.H3C]: "ah authentication-algorithm $1" }
    },

    // IKE Keychain
    {
      pattern: "ike keychain",
      explanation: "创建名为 $1 的IKE密钥链，用于存放预共享密钥。",
      conversions: { [Vendor.H3C]: "ike keychain $1", [Vendor.Cisco]: "# Cisco直接配置密钥\ncrypto isakmp key <key> address <address>" }
    },
    {
      pattern: "pre-shared-key key simple",
      explanation: "在密钥链中配置明文预共享密钥 $1。",
      conversions: { [Vendor.H3C]: "pre-shared-key key simple $1", [Vendor.Cisco]: "crypto isakmp key $1 address <address>" }
    },

    // IKE Peer (IKE Profile)
    {
      pattern: "ike peer",
      explanation: "创建名为 $1 的IKE对等体配置。",
      conversions: { [Vendor.Cisco]: "crypto isakmp profile $1", [Vendor.H3C]: "ike profile $1" }
    },
    {
      pattern: "remote-address",
      explanation: "在IKE对等体中，指定对端的IP地址为 $1。",
      conversions: { [Vendor.Cisco]: "# (在crypto map中通过'set peer'指定)", [Vendor.H3C]: "# (在ipsec policy中通过'remote-address'指定)" }
    },
     {
      pattern: "pre-shared-key keychain",
      explanation: "在IKE对等体中，引用名为 $1 的IKE密钥链。",
      conversions: { [Vendor.H3C]: "keychain $1", [Vendor.Cisco]: "keyring <keyring_name>" }
    },

    // IPsec Policy
    {
      pattern: "ipsec policy",
      explanation: "创建名为 $1，序号为 $2 的IPsec策略，模式为 $3。",
      conversions: { 
          [Vendor.Cisco]: "crypto map $1 $2 ipsec-isakmp\n# 注意：此为 ISAKMP 等效命令。Cisco 的手动模式配置方式不同。", 
          [Vendor.H3C]: "ipsec policy $1 $2 $3" 
      }
    },
    {
      pattern: "security acl",
      explanation: "在IPsec策略中引用ACL $1 来定义需要保护的数据流。",
      conversions: { [Vendor.Cisco]: "match address $1", [Vendor.H3C]: "security acl $1" }
    },
    {
      pattern: "ike-peer",
      explanation: "在IPsec策略中引用IKE对等体 $1。",
      conversions: { [Vendor.Cisco]: "set isakmp-profile $1", [Vendor.H3C]: "ike-profile $1" }
    },
    {
      pattern: "proposal",
      explanation: "在IPsec策略中引用IPsec提议 $1。",
      conversions: { [Vendor.Cisco]: "set transform-set $1", [Vendor.H3C]: "transform-set $1" }
    },
    {
        pattern: "tunnel local",
        explanation: "在手动IPsec策略中，配置IPsec隧道的本端地址为 $1。",
        conversions: { [Vendor.H3C]: "local-address $1", [Vendor.Cisco]: "# (通过接口应用crypto map来确定)" }
    },
    {
        pattern: "tunnel remote",
        explanation: "在手动IPsec策略中，配置IPsec隧道的对端地址为 $1。",
        conversions: { [Vendor.H3C]: "remote-address $1", [Vendor.Cisco]: "set peer $1" }
    },
    {
        pattern: "sa spi inbound",
        explanation: "在手动IPsec策略中，为入向 $1 SA 配置SPI值为 $2。",
        conversions: { [Vendor.H3C]: "sa spi inbound $1 $2", [Vendor.Cisco]: "set security-association spi inbound $1 $2" }
    },
    {
        pattern: "sa string-key inbound",
        explanation: "在手动IPsec策略中，为入向 $1 SA 配置字符串密钥 $2。",
        conversions: { [Vendor.H3C]: "sa string-key inbound $1 simple $2", [Vendor.Cisco]: "# (密钥在SA中配置)" }
    },
    {
        pattern: "sa spi outbound",
        explanation: "在手动IPsec策略中，为出向 $1 SA 配置SPI值为 $2。",
        conversions: { [Vendor.H3C]: "sa spi outbound $1 $2", [Vendor.Cisco]: "set security-association spi outbound $1 $2" }
    },
    {
        pattern: "sa string-key outbound",
        explanation: "在手动IPsec策略中，为出向 $1 SA 配置字符串密钥 $2。",
        conversions: { [Vendor.H3C]: "sa string-key outbound $1 simple $2", [Vendor.Cisco]: "# (密钥在SA中配置)" }
    }
];
