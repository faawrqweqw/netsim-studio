import { Vendor } from '../../types';

export const stackingRules = [
    {
        pattern: "chassis convert mode irf",
        explanation: "将设备的运行模式从独立模式切换到IRF模式。此命令执行后，设备会自动重启以使新模式生效。切换前必须已配置成员编号。",
        conversions: {
            [Vendor.Huawei]: "# 华为iStack/CSS通过 'stack enable' 等命令配置或硬件自动启用",
            [Vendor.Cisco]: "# Cisco StackWise/StackWise Virtual在物理连接后自动启用"
        }
    },
    {
        pattern: "irf-mode enable",
        explanation: "将设备切换到IRF模式，需要重启设备才能生效。这是部分新型号H3C设备启用IRF的命令。",
        conversions: {
            [Vendor.Huawei]: "# 华为iStack/CSS通过 'stack enable' 等命令配置或硬件自动启用",
            [Vendor.Cisco]: "# Cisco StackWise/StackWise Virtual在物理连接后自动启用"
        }
    },
    {
        pattern: "irf member renumber",
        explanation: "将成员设备 $1 的编号重新配置为 $2。此为旧型号设备命令，执行后设备会重启。",
        conversions: {
            [Vendor.Cisco]: "switch $1 renumber $2",
            [Vendor.Huawei]: "stack member-id $1 renumber $2"
        }
    },
    {
        pattern: "irf member",
        explanation: "配置设备的成员编号为 $1。在独立模式下，这是切换到IRF模式前的必需步骤；在IRF模式下，此命令用于配置优先级等参数。",
        conversions: {
            [Vendor.Cisco]: "switch $1 provision <model>",
            [Vendor.Huawei]: "# 华为设备通常自动分配成员ID"
        }
    },
    {
        pattern: "irf domain",
        explanation: "配置IRF域编号为 $1。同一IRF中的所有成员设备必须有相同的域编号。",
        conversions: {
            [Vendor.Cisco]: "switch virtual domain $1",
            [Vendor.Huawei]: "# 华为CSS集群需要配置 domain <id>"
        }
    },
    {
        pattern: "irf member priority",
        explanation: "配置成员设备 $1 的优先级为 $2。优先级越高的设备在选举中越有可能成为主设备。",
        conversions: {
            [Vendor.Cisco]: "switch $1 priority $2",
            [Vendor.Huawei]: "stack priority $2 member-id $1"
        }
    },
    {
        pattern: "irf priority",
        explanation: "在独立运行模式下，为设备预配置其在未来IRF中的优先级为 $1。",
        conversions: {
            [Vendor.Cisco]: "switch <member-id> priority $1",
            [Vendor.Huawei]: "stack priority $1"
        }
    },
    {
        pattern: "irf-port",
        explanation: "创建并进入成员 $1 的IRF端口 $2 的视图。",
        conversions: {
            [Vendor.Cisco]: "# Cisco StackWise端口是专用的，或通过 'switch virtual link' 配置",
            [Vendor.Huawei]: "interface stack-port $1/$2"
        }
    },
    {
        pattern: "port group interface",
        explanation: "将物理接口 $1 绑定到当前IRF端口。",
        conversions: {
            [Vendor.Cisco]: "# Cisco StackWise使用专用堆叠线缆",
            [Vendor.Huawei]: "port interface $1 enable"
        }
    },
    {
        pattern: "irf-port-configuration active",
        explanation: "激活IRF端口配置，使IRF形成或合并。这是旧型号设备形成IRF的最后一步，通常会导致从设备重启。",
        conversions: {
            [Vendor.Cisco]: "# 无直接对应命令，堆叠在物理连接和配置后自动激活",
            [Vendor.Huawei]: "# 无直接对应命令，堆叠在物理连接和配置后自动激活"
        }
    },
    {
        pattern: "display irf",
        explanation: "显示IRF的状态，包括成员设备、拓扑结构和主设备信息。",
        conversions: {
            [Vendor.Cisco]: "show switch",
            [Vendor.Huawei]: "display stack"
        }
    },
    {
        pattern: "display irf configuration",
        explanation: "显示IRF的配置信息，包括域编号、成员编号、优先级和IRF端口绑定情况。",
        conversions: {
            [Vendor.Cisco]: "show running-config | include switch",
            [Vendor.Huawei]: "display stack configuration"
        }
    }
];
