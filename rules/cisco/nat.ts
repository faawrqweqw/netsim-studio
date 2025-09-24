import { Vendor } from '../../types';

export const natRules = [
    {
      pattern: "ip nat pool",
      explanation: "创建一个名为 $1 的NAT地址池，地址范围从 $2 到 $3，子网掩码为 $4。",
      conversions: {
          [Vendor.Huawei]: "nat address-group $1\n section $2 $3",
          [Vendor.H3C]: "nat address-group <group_id> name $1\n address $2 $3"
      }
    },
    {
      pattern: "ip nat inside source list",
      explanation: "配置源NAT，将匹配ACL $1 的流量地址转换为地址池 $2 中的地址。overload表示启用端口复用 (PAT)。",
      conversions: {
          [Vendor.Huawei]: "nat-policy\n rule name <rule_name>\n  source-address acl $1\n  action source-nat address-group $2",
          [Vendor.H3C]: "nat outbound $1 address-group <group_id_of_pool_$2>"
      }
    },
    {
      pattern: "ip nat inside source static",
      explanation: "配置静态NAT（端口映射），将协议为 $1 的内网地址 $2 端口 $3 映射到公网地址 $4 端口 $5。",
      conversions: {
          [Vendor.Huawei]: "nat server protocol $1 global $4 $5 inside $2 $3",
          [Vendor.H3C]: "nat server protocol $1 global $4 $5 inside $2 $3"
      }
    },
    {
      pattern: "ip nat inside",
      explanation: "将当前接口标记为NAT内部接口。",
      conversions: {
          [Vendor.Huawei]: "# 华为通过安全区域或nat-policy中的出接口来区分内外网",
          [Vendor.H3C]: "# H3C通过安全区域或nat outbound命令所在接口来区分内外网"
      }
    },
    {
      pattern: "ip nat outside",
      explanation: "将当前接口标记为NAT外部接口。",
      conversions: {
          [Vendor.Huawei]: "# 华为通过安全区域或nat-policy中的出接口来区分内外网",
          [Vendor.H3C]: "# H3C通过安全区域或nat outbound命令所在接口来区分内外网"
      }
    }
];
