import { Vendor } from '../../types';

export const greRules = [
    {
      pattern: "interface Tunnel",
      explanation: "创建并进入Tunnel接口 $1。",
      conversions: { [Vendor.Huawei]: "interface Tunnel$1", [Vendor.H3C]: "interface Tunnel$1 mode gre" }
    },
    {
      pattern: "tunnel mode gre ip",
      explanation: "配置Tunnel接口的隧道模式为GRE over IP。",
      conversions: { [Vendor.Huawei]: "tunnel-protocol gre", [Vendor.H3C]: "# 在创建接口时通过 'mode gre' 指定" }
    },
    {
      pattern: "tunnel source",
      explanation: "配置Tunnel接口的源地址或源接口为 $1。",
      conversions: { [Vendor.Huawei]: "source $1", [Vendor.H3C]: "source $1" }
    },
    {
      pattern: "tunnel destination",
      explanation: "配置Tunnel接口的目的地址为 $1。",
      conversions: { [Vendor.Huawei]: "destination $1", [Vendor.H3C]: "destination $1" }
    },
    {
      pattern: "tunnel key",
      explanation: "配置Tunnel接口的GRE识别关键字为 $1。",
      conversions: { [Vendor.Huawei]: "gre key $1", [Vendor.H3C]: "gre key $1" }
    },
    {
      pattern: "keepalive",
      explanation: "启用GRE Keepalive功能，检测隧道状态。",
      conversions: { [Vendor.Huawei]: "keepalive", [Vendor.H3C]: "keepalive" }
    },
];