import { Vendor } from '../../types';

export const interfaceRules = [
    {
      pattern: "interface",
      regex: "^interface\\s+(?<ifname>.+)$",
      paramNames: ["ifname"],
      explanation: "进入接口 ${ifname} 的配置模式。",
      conversions: { [Vendor.Huawei]: "interface ${ifname}", [Vendor.H3C]: "interface ${ifname}" }
    },
    {
      pattern: "ip address",
      regex: "^ip\\s+address\\s+(?<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<mask>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["ip","mask"],
      explanation: "为接口配置IP地址 ${ip} 和子网掩码 ${mask}。",
      conversions: { [Vendor.Huawei]: "ip address ${ip} ${mask}", [Vendor.H3C]: "ip address ${ip} ${mask}" }
    },
    {
      pattern: "description",
      regex: "^description\\s+(?<text>.+)$",
      paramNames: ["text"],
      explanation: "为接口或VLAN设置描述 ${text}。",
      conversions: { [Vendor.Huawei]: "description ${text}", [Vendor.H3C]: "description ${text}" }
    },
    {
      pattern: "shutdown",
      explanation: "禁用接口。",
      conversions: { [Vendor.Huawei]: "shutdown", [Vendor.H3C]: "shutdown" }
    },
    {
      pattern: "no shutdown",
      explanation: "启用接口。",
      conversions: { [Vendor.Huawei]: "undo shutdown", [Vendor.H3C]: "undo shutdown" }
    },
    {
      pattern: "ip access-group",
      regex: "^ip\\s+access-group\\s+(?<acl>\\S+)\\s+(?<dir>in|out)$",
      paramNames: ["acl","dir"],
      explanation: "在接口上应用ACL ${acl} 到 ${dir} 方向。",
      conversions: {
        [Vendor.Huawei]: (_: string[], named?: any) => `traffic-filter ${named?.dir === 'in' ? 'inbound' : 'outbound'} acl ${named?.acl}`,
        [Vendor.H3C]: (_: string[], named?: any) => `packet-filter ${named?.acl} ${named?.dir === 'in' ? 'inbound' : 'outbound'}`
      }
    },
];
