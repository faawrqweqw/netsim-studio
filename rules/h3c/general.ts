import { Vendor } from '../../types';

export const generalRules = [
    {
      pattern: "system-view",
      explanation: "进入系统视图，相当于Cisco的全局配置模式。",
      conversions: { [Vendor.Cisco]: "configure terminal", [Vendor.Huawei]: "system-view" }
    },
    {
      pattern: "sysname",
      explanation: "设置设备的主机名为 $1。",
      conversions: { [Vendor.Cisco]: "hostname $1", [Vendor.Huawei]: "sysname $1" }
    },
    {
      pattern: "display ip interface brief",
      explanation: "显示接口的 IP 地址、状态等简要信息。",
      conversions: { [Vendor.Cisco]: "show ip interface brief", [Vendor.Huawei]: "display ip interface brief" }
    },
    {
      pattern: "display current-configuration",
      explanation: "显示当前生效的配置信息。",
      conversions: { [Vendor.Cisco]: "show running-config", [Vendor.Huawei]: "display current-configuration" }
    },
    {
      pattern: "save",
      explanation: "保存当前配置。",
      conversions: { [Vendor.Cisco]: "copy running-config startup-config", [Vendor.Huawei]: "save" }
    },
];
