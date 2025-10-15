import { Vendor } from '../../types';

export const routingRules = [
    {
      pattern: "ip route-static",
      explanation: "创建一条静态路由，目标网络为 $1 $2，下一跳为 $3。",
      conversions: { [Vendor.Cisco]: "ip route $1 $2 $3", [Vendor.Huawei]: "ip route-static $1 $2 $3" }
    },
    {
      pattern: "ospf",
      explanation: "启动OSPF进程 $1。",
      conversions: { [Vendor.Cisco]: "router ospf $1", [Vendor.Huawei]: "ospf $1" }
    },
    {
      pattern: "area",
      explanation: "进入OSPF区域 $1 的配置模式。",
      conversions: { [Vendor.Cisco]: "# 在OSPF进程下配置\n network ... area $1", [Vendor.Huawei]: "area $1" }
    },
    {
      pattern: "network",
      explanation: "在当前OSPF区域中宣告网络 $1 (掩码/通配符 $2)。",
      conversions: { [Vendor.Cisco]: "network $1 $2 area <area_id>", [Vendor.Huawei]: "network $1 $2" }
    },
    {
      pattern: "import-route static",
      explanation: "在OSPF中重分发静态路由。",
      conversions: { [Vendor.Cisco]: "redistribute static subnets", [Vendor.Huawei]: "import-route static" }
    },
    {
      pattern: "ospf dr-priority",
      explanation: "设置接口的DR优先级为 $1，取值范围为0～255。缺省情况下，接口的DR优先级为1。接口的DR优先级决定了该接口在选举DR/BDR时所具有的资格，数值越大，优先级越高。如果一台设备的优先级为0，则它不会被选举为DR或BDR。",
      conversions: { [Vendor.Cisco]: "ip ospf priority $1", [Vendor.Huawei]: "ospf dr-priority $1" }
    },
];