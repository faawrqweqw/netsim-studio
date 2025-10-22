import { Vendor } from '../../types';

export const stackingRules = [
    {
        pattern: "switch (\\d+) priority",
        explanation: "配置堆叠成员 $1 的优先级为 $2。优先级范围1-15，数值越大优先级越高，用于主设备选举。",
        conversions: {
            [Vendor.H3C]: "irf member priority $1 $2",
            [Vendor.Huawei]: "stack slot $1 priority $2"
        }
    },
    {
        pattern: "switch (\\d+) renumber",
        explanation: "将堆叠成员 $1 的编号重新配置为 $2。执行后目标成员会重启以使新编号生效。",
        conversions: {
            [Vendor.H3C]: "irf member renumber $1 $2",
            [Vendor.Huawei]: "stack member-id $1 renumber $2"
        }
    },
    {
        pattern: "switch (\\d+) provision",
        explanation: "预配置堆叠成员 $1 的设备型号为 $2。此配置有助于堆叠中设备的即插即用。",
        conversions: {
            [Vendor.H3C]: "# H3C IRF成员会自动识别型号",
            [Vendor.Huawei]: "# 华为堆叠成员会自动识别型号"
        }
    },
    {
        pattern: "stack-power stack",
        explanation: "创建堆叠电源组 $1 并进入配置模式。堆叠电源可以在成员间共享电源。",
        conversions: {
            [Vendor.H3C]: "# H3C部分设备支持RPS冗余电源系统",
            [Vendor.Huawei]: "# 华为设备支持CSS/iStack时电源状态可监控"
        }
    },
    {
        pattern: "stack-power mode redundant",
        explanation: "配置堆叠电源模式为冗余模式，提供电源冗余保护。",
        conversions: {
            [Vendor.H3C]: "# H3C配置RPS冗余电源",
            [Vendor.Huawei]: "# 华为配置冗余电源"
        }
    },
    {
        pattern: "stack-power mode combined",
        explanation: "配置堆叠电源模式为合并模式，所有电源功率合并使用。",
        conversions: {
            [Vendor.H3C]: "# H3C配置电源合并模式",
            [Vendor.Huawei]: "# 华为配置电源合并模式"
        }
    },
    {
        pattern: "switch virtual domain",
        explanation: "配置StackWise Virtual域ID为 $1。StackWise Virtual允许两台交换机作为单一逻辑设备运行。",
        conversions: {
            [Vendor.H3C]: "irf domain $1",
            [Vendor.Huawei]: "# 华为CSS使用 css cluster-id $1"
        }
    },
    {
        pattern: "stackwise-virtual",
        explanation: "启用StackWise Virtual功能并进入配置模式。StackWise Virtual是思科新一代虚拟化堆叠技术。",
        conversions: {
            [Vendor.H3C]: "# H3C使用IRF技术实现类似功能",
            [Vendor.Huawei]: "# 华为使用CSS或iStack实现类似功能"
        }
    },
    {
        pattern: "stackwise-virtual link",
        explanation: "配置StackWise Virtual链路编号为 $1。SVL用于成员间的控制和数据流量传输。",
        conversions: {
            [Vendor.H3C]: "irf-port <member>/<port>",
            [Vendor.Huawei]: "interface stack-port <slot>/<port>"
        }
    },
    {
        pattern: "stackwise-virtual dual-active-detection",
        explanation: "启用StackWise Virtual双活检测功能，防止堆叠分裂导致的双主问题。",
        conversions: {
            [Vendor.H3C]: "mad detect method <method>",
            [Vendor.Huawei]: "mad detect mode <mode>"
        }
    },
    {
        pattern: "dual-active detection pagp",
        explanation: "配置双活检测使用PAgP（Port Aggregation Protocol）方式。",
        conversions: {
            [Vendor.H3C]: "mad detect method lacp",
            [Vendor.Huawei]: "# 华为使用relay或BFD方式"
        }
    },
    {
        pattern: "dual-active detection pagp trust channel-group",
        explanation: "配置双活检测信任的端口通道组为 $1。",
        conversions: {
            [Vendor.H3C]: "mad detect method lacp aggregate <id>",
            [Vendor.Huawei]: "# 华为在聚合接口配置MAD"
        }
    },
    {
        pattern: "stack-mac persistent timer",
        explanation: "配置堆叠MAC地址持久化时间为 $1 分钟。持久化MAC避免堆叠重组时MAC地址变化。",
        conversions: {
            [Vendor.H3C]: "irf mac-address persistent timer $1",
            [Vendor.Huawei]: "stack mac-address persistent timer $1"
        }
    },
    {
        pattern: "stack-mac update force",
        explanation: "强制更新堆叠MAC地址。通常用于主设备变更后立即更新MAC地址。",
        conversions: {
            [Vendor.H3C]: "# H3C IRF MAC地址更新",
            [Vendor.Huawei]: "# 华为堆叠MAC地址更新"
        }
    },
    {
        pattern: "show switch",
        explanation: "显示堆叠的基本信息，包括成员编号、角色、MAC地址、优先级、软件版本和状态。",
        conversions: {
            [Vendor.H3C]: "display irf",
            [Vendor.Huawei]: "display stack"
        }
    },
    {
        pattern: "show switch detail",
        explanation: "显示堆叠成员的详细信息，包括端口数量、电源状态、序列号等。",
        conversions: {
            [Vendor.H3C]: "display irf member",
            [Vendor.Huawei]: "display stack member"
        }
    },
    {
        pattern: "show switch stack-ports",
        explanation: "显示堆叠端口的状态，包括堆叠链路的连接状态和带宽。",
        conversions: {
            [Vendor.H3C]: "display irf link",
            [Vendor.Huawei]: "display stack topology"
        }
    },
    {
        pattern: "show switch neighbors",
        explanation: "显示堆叠成员的邻居关系，用于了解堆叠拓扑连接情况。",
        conversions: {
            [Vendor.H3C]: "display irf topology",
            [Vendor.Huawei]: "display stack topology"
        }
    },
    {
        pattern: "show switch virtual",
        explanation: "显示StackWise Virtual的状态信息，包括域ID、成员角色、链路状态等。",
        conversions: {
            [Vendor.H3C]: "display irf",
            [Vendor.Huawei]: "display css"
        }
    },
    {
        pattern: "show switch virtual config",
        explanation: "显示StackWise Virtual的配置信息。",
        conversions: {
            [Vendor.H3C]: "display irf configuration",
            [Vendor.Huawei]: "display css configuration"
        }
    },
    {
        pattern: "show switch virtual link",
        explanation: "显示StackWise Virtual链路的详细状态，包括端口成员和链路健康状况。",
        conversions: {
            [Vendor.H3C]: "display irf link",
            [Vendor.Huawei]: "display stack topology"
        }
    },
    {
        pattern: "show switch virtual dual-active-detection",
        explanation: "显示StackWise Virtual双活检测的配置和状态。",
        conversions: {
            [Vendor.H3C]: "display mad",
            [Vendor.Huawei]: "display mad"
        }
    },
    {
        pattern: "show stack-power",
        explanation: "显示堆叠电源的状态信息，包括电源模式、总功率和各成员电源使用情况。",
        conversions: {
            [Vendor.H3C]: "display power",
            [Vendor.Huawei]: "display power"
        }
    },
    {
        pattern: "show stack-power detail",
        explanation: "显示堆叠电源的详细信息。",
        conversions: {
            [Vendor.H3C]: "display power verbose",
            [Vendor.Huawei]: "display power verbose"
        }
    },
    {
        pattern: "redundancy",
        explanation: "进入冗余配置模式，用于配置堆叠或VSS（Virtual Switching System）的冗余参数。",
        conversions: {
            [Vendor.H3C]: "# H3C在IRF配置中包含冗余设置",
            [Vendor.Huawei]: "# 华为在堆叠配置中包含冗余设置"
        }
    },
    {
        pattern: "mode sso",
        explanation: "配置冗余模式为SSO（Stateful Switchover，有状态切换）。SSO在主备切换时保持协议状态。",
        conversions: {
            [Vendor.H3C]: "# H3C IRF支持有状态切换",
            [Vendor.Huawei]: "# 华为堆叠支持有状态切换"
        }
    },
    {
        pattern: "platform pm port-mode-all",
        explanation: "配置平台端口模式为 $1。某些Cisco交换机支持统一端口模式切换。",
        conversions: {
            [Vendor.H3C]: "# H3C端口模式配置",
            [Vendor.Huawei]: "# 华为端口模式配置"
        }
    }
];
