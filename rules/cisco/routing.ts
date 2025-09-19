import { Vendor } from '../../types';

export const routingRules = [
    {
      pattern: "ip route",
      explanation: "创建一条静态路由，目标网络为 $1 $2，下一跳为 $3。",
      conversions: { [Vendor.Huawei]: "ip route-static $1 $2 $3", [Vendor.H3C]: "ip route-static $1 $2 $3" }
    },
    {
      pattern: "router ospf",
      explanation: "启动OSPF进程 $1。",
      conversions: { [Vendor.Huawei]: "ospf $1", [Vendor.H3C]: "ospf $1" }
    },
    {
      pattern: "router-id",
      explanation: "为OSPF进程配置Router ID $1。",
      conversions: { [Vendor.Huawei]: "# 在OSPF进程视图下\n router-id $1", [Vendor.H3C]: "# 在OSPF进程视图下\n router-id $1" }
    },
    {
      pattern: "network",
      explanation: "在OSPF中宣告网络 $1 (通配符掩码 $2)，并将其划分到区域 $3。",
      conversions: { [Vendor.Huawei]: "# 在OSPF区域视图下\n network $1 $2", [Vendor.H3C]: "# 在OSPF区域视图下\n network $1 $2" }
    },
    {
      pattern: "redistribute static",
      explanation: "在OSPF中重分发静态路由。",
      conversions: { [Vendor.Huawei]: "import-route static", [Vendor.H3C]: "import-route static" }
    },
];
