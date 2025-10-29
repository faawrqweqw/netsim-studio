import { Vendor } from '../../types';

export const generalRules = [
    {
      pattern: "configure terminal",
      explanation: "进入全局配置模式。",
      conversions: { [Vendor.Huawei]: "system-view", [Vendor.H3C]: "system-view" }
    },
    {
      pattern: "hostname",
      regex: "^hostname\\s+(?<name>.+)$",
      paramNames: ["name"],
      explanation: "设置设备的主机名为 ${name}。",
      conversions: { [Vendor.Huawei]: "sysname ${name}", [Vendor.H3C]: "sysname ${name}" }
    },
    {
      pattern: "show ip interface brief",
      explanation: "显示IP接口状态和配置的简要摘要。",
      conversions: { [Vendor.Huawei]: "display ip interface brief", [Vendor.H3C]: "display ip interface brief" }
    },
    {
      pattern: "show running-config",
      explanation: "显示当前正在运行的配置。",
      conversions: { [Vendor.Huawei]: "display current-configuration", [Vendor.H3C]: "display current-configuration" }
    },
    {
      pattern: "copy running-config startup-config",
      explanation: "将当前运行的配置保存到启动配置中。",
      conversions: { [Vendor.Huawei]: "save", [Vendor.H3C]: "save" }
    },
];
