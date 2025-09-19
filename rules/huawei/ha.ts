import { Vendor } from '../../types';

export const haRules = [
  {
    pattern: "hrp enable",
    explanation: "在设备上全局启用双机热备（HRP）功能。",
    conversions: { [Vendor.H3C]: "# H3C 在 remote-backup group 视图下进行整体配置" }
  },
  {
    pattern: "hrp interface",
    explanation: "指定心跳接口为 $1，并配置对端心跳接口的IP地址为 $2。",
    conversions: { [Vendor.H3C]: "remote-backup group\n data-channel interface $1" }
  },
  {
    pattern: "hrp track interface",
    explanation: "配置HRP监控接口 $1 的状态。当接口故障时，会降低本设备优先级。",
    conversions: { [Vendor.H3C]: "track <id> interface $1\nremote-backup group\n track <id>" }
  },
  {
    pattern: "hrp track vlan",
    explanation: "配置HRP监控VLAN $1。当该VLAN中所有接口都Down时，会降低本设备优先级。",
    conversions: { [Vendor.H3C]: "track <id> vlan $1\nremote-backup group\n track <id>" }
  },
  {
    pattern: "hrp authentication-key",
    explanation: "配置HRP报文的认证密钥为 $1。",
    conversions: {}
  },
  {
    pattern: "hrp auto-sync config",
    explanation: "配置除静态路由和策略路由外的命令进行自动备份。",
    conversions: { [Vendor.H3C]: "configuration auto-sync enable" }
  },
  {
    pattern: "hrp auto-sync static-route",
    explanation: "配置静态路由命令进行自动备份。",
    conversions: {}
  },
  {
    pattern: "hrp auto-sync connection-status",
    explanation: "配置会话状态信息进行自动备份。",
    conversions: { [Vendor.H3C]: "hot-backup enable" }
  },
  {
    pattern: "hrp preempt enable",
    explanation: "开启主动抢占功能。",
    conversions: { [Vendor.H3C]: "# H3C 默认开启抢占，通过 delay-time 开启并设置延迟" }
  },
  {
    pattern: "hrp preempt delay",
    explanation: "配置抢占延迟时间为 $1 秒。",
    conversions: { [Vendor.H3C]: "delay-time $1" }
  },
  {
    pattern: "hrp device",
    explanation: "配置设备的角色为 $1 (active 或 standby)。",
    conversions: { [Vendor.H3C]: "device-role <primary/secondary>" }
  },
  {
    pattern: "hrp escape enable",
    explanation: "开启双机热备逃生功能，在心跳线故障时尝试通过业务口发送心跳报文，避免双主。",
    conversions: {}
  }
];