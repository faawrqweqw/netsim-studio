import { Vendor } from '../../types';

export const greRules = [
    {
      pattern: "interface Tunnel",
      explanation: "创建并进入Tunnel接口 $1。",
      conversions: { [Vendor.H3C]: "interface Tunnel$1 mode gre", [Vendor.Cisco]: "interface Tunnel$1" }
    },
    {
      pattern: "tunnel-protocol gre",
      explanation: "配置Tunnel接口的隧道模式为GRE。",
      conversions: { [Vendor.H3C]: "# 在创建接口时通过 'mode gre' 指定", [Vendor.Cisco]: "tunnel mode gre ip" }
    },
    {
      pattern: "source",
      explanation: "配置Tunnel接口的源地址或源接口为 $1。",
      conversions: { [Vendor.H3C]: "source $1", [Vendor.Cisco]: "tunnel source $1" }
    },
    {
      pattern: "destination",
      explanation: "配置Tunnel接口的目的地址为 $1。",
      conversions: { [Vendor.H3C]: "destination $1", [Vendor.Cisco]: "tunnel destination $1" }
    },
    {
      pattern: "gre key",
      explanation: "配置Tunnel接口的GRE识别关键字为 $1。",
      conversions: { [Vendor.H3C]: "gre key $1", [Vendor.Cisco]: "tunnel key $1" }
    },
    {
      pattern: "keepalive",
      explanation: "启用GRE Keepalive功能，检测隧道状态。",
      conversions: { [Vendor.H3C]: "keepalive", [Vendor.Cisco]: "keepalive" }
    },
];
