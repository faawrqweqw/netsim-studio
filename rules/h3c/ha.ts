import { Vendor } from '../../types';

export const haRules = [
    {
      pattern: "remote-backup group",
      explanation: "进入HA（高可靠性）管理视图。",
      conversions: {}
    },
    {
      pattern: "device-role primary",
      explanation: "配置设备为HA主管理角色。",
      conversions: {}
    },
    {
      pattern: "device-role secondary",
      explanation: "配置设备为HA从管理角色。",
      conversions: {}
    },
    {
      pattern: "backup-mode dual-active",
      explanation: "配置HA为双主工作模式。",
      conversions: {}
    },
    {
      pattern: "undo backup-mode",
      explanation: "配置HA为主备工作模式 (默认)。",
      conversions: {}
    },
    {
      pattern: "local-ip",
      explanation: "配置HA控制通道的本端IP地址为 $1。",
      conversions: {}
    },
    {
      pattern: "remote-ip",
      explanation: "配置HA控制通道的对端IP地址为 $1，端口为 $2。",
      conversions: {}
    },
    {
      pattern: "keepalive interval",
      explanation: "配置HA Keepalive报文的发送间隔为 $1 秒。",
      conversions: {}
    },
    {
      pattern: "keepalive count",
      explanation: "配置HA Keepalive报文的最大发送次数为 $1。",
      conversions: {}
    },
    {
      pattern: "data-channel interface",
      explanation: "配置HA数据通道使用的接口为 $1。",
      conversions: {}
    },
    {
      pattern: "hot-backup enable",
      explanation: "开启HA热备业务表项功能。",
      conversions: {}
    },
    {
      pattern: "configuration auto-sync enable",
      explanation: "开启配置信息自动备份功能。",
      conversions: {}
    },
    {
      pattern: "configuration sync-check",
      explanation: "开启配置信息一致性检查功能。",
      conversions: {}
    },
    {
      pattern: "delay-time",
      explanation: "开启HA流量回切功能，并设置延迟时间为 $1 秒。",
      conversions: {}
    },
    {
      pattern: "track interface",
      explanation: "配置HA监控接口 $1 的状态。",
      conversions: {}
    },
    {
      pattern: "track vlan",
      explanation: "配置HA监控VLAN $1 的状态。",
      conversions: {}
    },
    {
      pattern: "track",
      explanation: "配置HA与Track项 $1 联动。",
      conversions: {}
    },
    {
      pattern: "switchover request",
      explanation: "手动触发HA主备倒换。",
      conversions: {}
    },
];