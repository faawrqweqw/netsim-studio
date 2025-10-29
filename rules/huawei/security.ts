
import { Vendor } from '../../types';

export const securityRules = [
    {
      pattern: "firewall zone name",
      explanation: "创建名为 $1 的安全区域，并进入安全区域视图。",
      conversions: { [Vendor.H3C]: "security-zone name $1" }
    },
    {
      pattern: "set priority",
      explanation: "为当前安全区域配置优先级为 $1。",
      conversions: { [Vendor.H3C]: "# H3C安全域没有直接的优先级配置命令。" }
    },
    {
      pattern: "add interface",
      explanation: "将接口 $1 加入当前安全区域。",
      conversions: { [Vendor.H3C]: "import interface $1" }
    },
    {
      pattern: "firewall interzone",
      explanation: "进入从源安全区域 $1 到目的安全区域 $2 的安全域间视图。",
      conversions: { [Vendor.H3C]: "zone-pair security source $1 destination $2" }
    },
    {
      pattern: "security-policy",
      explanation: "进入安全策略视图。",
      conversions: { [Vendor.H3C]: "security-policy ip" }
    },
    {
      pattern: "rule name",
      explanation: "创建名为 $1 的安全策略规则。",
      conversions: { [Vendor.H3C]: "rule name $1" }
    },
    {
      pattern: "source-zone",
      explanation: "配置源安全区域为 $1。",
      conversions: { [Vendor.H3C]: "source-zone $1" }
    },
    {
      pattern: "destination-zone",
      explanation: "配置目的安全区域为 $1。",
      conversions: { [Vendor.H3C]: "destination-zone $1" }
    },
    {
        pattern: "source-address address-set",
        explanation: "配置源地址为地址集（对象组）$1。",
        conversions: { [Vendor.H3C]: "source-ip object-group-name $1" }
    },
    {
        pattern: "source-address range",
        explanation: "配置源地址为从 $1 到 $2 的范围。",
        conversions: { [Vendor.H3C]: "source-ip-range $1 $2" }
    },
    {
        pattern: "source-address",
        explanation: "配置源地址为IP $1，掩码为 $2。",
        conversions: {
            [Vendor.H3C]: (params: string[]) => {
                const ip = params[0];
                const mask = params[1];
                if (!ip) return "# Invalid source-address command";
                if (mask === '32' || mask === '255.255.255.255') {
                    return `source-ip-host ${ip}`;
                }
                return `source-ip-subnet ${ip} ${mask}`;
            }
        }
    },
    {
        pattern: "destination-address address-set",
        explanation: "配置目的地址为地址集（对象组）$1。",
        conversions: { [Vendor.H3C]: "destination-ip object-group-name $1" }
    },
    {
        pattern: "destination-address range",
        explanation: "配置目的地址为从 $1 到 $2 的范围。",
        conversions: { [Vendor.H3C]: "destination-ip-range $1 $2" }
    },
    {
        pattern: "destination-address",
        explanation: "配置目的地址为IP $1，掩码为 $2。",
        conversions: {
            [Vendor.H3C]: (params: string[]) => {
                const ip = params[0];
                const mask = params[1];
                if (!ip) return "# Invalid destination-address command";
                if (mask === '32' || mask === '255.255.255.255') {
                    return `destination-ip-host ${ip}`;
                }
                return `destination-ip-subnet ${ip} ${mask}`;
            }
        }
    },
    {
        pattern: "service service-set",
        explanation: "配置服务为服务集（对象组）$1。",
        conversions: { [Vendor.H3C]: "service object-group-name $1" }
    },
    {
      pattern: "time-range",
      explanation: "将安全策略规则与名为 $1 的时间段对象关联，使规则只在该时间段内生效。",
      conversions: { [Vendor.H3C]: "time-range $1" }
    },
    {
      pattern: "action permit",
      explanation: "配置动作为允许(permit)。",
      conversions: { [Vendor.H3C]: "action pass" }
    },
    {
        pattern: "action deny",
        explanation: "配置动作为丢弃(deny)。",
        conversions: { [Vendor.H3C]: "action drop" }
    },
];