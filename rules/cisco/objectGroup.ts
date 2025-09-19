import { Vendor } from '../../types';

export const objectGroupRules = [
    {
      pattern: "object-group network",
      explanation: "创建或配置一个网络对象组。Cisco IOS使用此命令来组织IP地址、子网和主机。",
      conversions: {
          [Vendor.Huawei]: "ip address-set $1 type object",
          [Vendor.H3C]: "object-group ip address $1"
      }
    },
    {
      pattern: "object-group service",
      explanation: "创建或配置一个服务对象组，用于组织协议和端口。",
      conversions: {
          [Vendor.Huawei]: "ip service-set $1 type object",
          [Vendor.H3C]: "object-group service $1"
      }
    },
];
