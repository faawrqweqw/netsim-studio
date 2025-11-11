import { Vendor } from '../../types';

export const routingRules = [
    {
      pattern: "ip route",
      regex: "^ip\\s+route\\s+(?<prefix>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<mask>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<nextHop>\\S+)$",
      paramNames: ["prefix","mask","nextHop"],
      explanation: "创建一条静态路由，目标网络为 ${prefix} ${mask}，下一跳为 ${nextHop}。",
      conversions: { [Vendor.Huawei]: "ip route-static ${prefix} ${mask} ${nextHop}", [Vendor.H3C]: "ip route-static ${prefix} ${mask} ${nextHop}" }
    },
    {
      pattern: "router ospf",
      regex: "^router\\s+ospf\\s+(?<process>\\d+)$",
      paramNames: ["process"],
      explanation: "启动OSPF进程 ${process}。",
      conversions: { [Vendor.Huawei]: "ospf ${process}", [Vendor.H3C]: "ospf ${process}" }
    },
    {
      pattern: "router-id",
      regex: "^router-id\\s+(?<rid>\\d+\\.\\d+\\.\\d+\\.\\d+)$",
      paramNames: ["rid"],
      explanation: "为OSPF进程配置Router ID ${rid}。",
      conversions: { [Vendor.Huawei]: "# 在OSPF进程视图下\n router-id ${rid}", [Vendor.H3C]: "# 在OSPF进程视图下\n router-id ${rid}" }
    },
    {
      pattern: "network",
      regex: "^network\\s+(?<network>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+(?<wildcard>\\d+\\.\\d+\\.\\d+\\.\\d+)\\s+area\\s+(?<area>\\S+)$",
      paramNames: ["network","wildcard","area"],
      explanation: "在OSPF中宣告网络 ${network} (通配符掩码 ${wildcard})，并将其划分到区域 ${area}。",
      conversions: { [Vendor.Huawei]: "area ${area}\n network ${network} ${wildcard}", [Vendor.H3C]: "area ${area}\n network ${network} ${wildcard}" }
    },
    {
      pattern: "redistribute static",
      explanation: "在OSPF中重分发静态路由。",
      conversions: { [Vendor.Huawei]: "import-route static", [Vendor.H3C]: "import-route static" }
    },
    {
      pattern: "ip ospf priority",
      regex: "^ip\\s+ospf\\s+priority\\s+(?<priority>\\d+)$",
      paramNames: ["priority"],
      explanation: "设置接口的OSPF DR选举优先级为 ${priority}。",
      conversions: { [Vendor.Huawei]: "ospf dr-priority ${priority}", [Vendor.H3C]: "ospf dr-priority ${priority}" }
    },
    {
      pattern: "redistribute connected",
      explanation: "在OSPF中重分发直连路由。",
      conversions: { [Vendor.Huawei]: "import-route direct", [Vendor.H3C]: "import-route direct" }
    },
    {
      pattern: "default-information originate",
      explanation: "通告默认路由。",
      conversions: { [Vendor.Huawei]: "default-route-advertise", [Vendor.H3C]: "default-route-advertise" }
    },
    {
      pattern: "area type",
      regex: "^area\\s+(?<area>\\S+)\\s+(?<type>stub|nssa)(?:\\s+no-summary)?$",
      paramNames: ["area","type"],
      explanation: "配置区域 ${area} 类型为 ${type}。",
      conversions: { [Vendor.Huawei]: (_: string[], n?: any) => `area ${n?.area}\n ${n?.type}${''}`, [Vendor.H3C]: (_: string[], n?: any) => `area ${n?.area}\n ${n?.type}${''}` }
    },
    {
      pattern: "area default-cost",
      regex: "^area\\s+(?<area>\\S+)\\s+default-cost\\s+(?<cost>\\d+)$",
      paramNames: ["area","cost"],
      explanation: "配置区域 ${area} 的默认成本为 ${cost}。",
      conversions: { [Vendor.Huawei]: (_: string[], n?: any) => `area ${n?.area}\n default-cost ${n?.cost}`, [Vendor.H3C]: (_: string[], n?: any) => `area ${n?.area}\n default-cost ${n?.cost}` }
    },
];
