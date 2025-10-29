import { Vendor } from '../../types';

export const natRules = [
    {
      pattern: "ip nat pool",
      regex: "^ip\\s+nat\\s+pool\\s+(?<name>\\S+)\\s+(?<start>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<end>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+netmask\\s+(?<mask>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["name","start","end","mask"],
      explanation: "创建一个名为 ${name} 的NAT地址池，地址范围从 ${start} 到 ${end}，子网掩码为 ${mask}。",
      conversions: {
          [Vendor.Huawei]: "nat address-group ${name}\n section ${start} ${end}",
          [Vendor.H3C]: "nat address-group <group_id> name ${name}\n address ${start} ${end}"
      }
    },
    {
      pattern: "ip nat inside source list",
      regex: "^ip\\s+nat\\s+inside\\s+source\\s+list\\s+(?<acl>\\S+)\\s+pool\\s+(?<pool>\\S+)(\\s+overload)?$",
      paramNames: ["acl","pool"],
      explanation: "配置源NAT，将匹配ACL ${acl} 的流量地址转换为地址池 ${pool} 中的地址。",
      conversions: {
          [Vendor.Huawei]: "nat-policy\n rule name <rule_name>\n  source-address acl ${acl}\n  action source-nat address-group ${pool}",
          [Vendor.H3C]: "nat outbound ${acl} address-group <group_id_of_pool_${pool}>"
      }
    },
    {
      pattern: "ip nat inside source static",
      regex: "^ip\\s+nat\\s+inside\\s+source\\s+static\\s+(?<proto>tcp|udp)\\s+(?<inIp>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<inPort>\\d+)\\s+(?<outIp>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<outPort>\\d+)$",
      paramNames: ["proto","inIp","inPort","outIp","outPort"],
      explanation: "配置静态NAT（端口映射），将协议为 ${proto} 的内网地址 ${inIp} 端口 ${inPort} 映射到公网地址 ${outIp} 端口 ${outPort}。",
      conversions: {
          [Vendor.Huawei]: "nat server protocol ${proto} global ${outIp} ${outPort} inside ${inIp} ${inPort}",
          [Vendor.H3C]: "nat server protocol ${proto} global ${outIp} ${outPort} inside ${inIp} ${inPort}"
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
