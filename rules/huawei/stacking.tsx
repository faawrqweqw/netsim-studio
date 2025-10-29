import { Vendor } from '../../types';

export const stackingRules = [
    {
        pattern: "stack enable",
        explanation: "启用堆叠功能。华为设备在物理连接堆叠线缆后，通过此命令启用堆叠功能。部分型号支持CSS（Cluster Switch System）或iStack。",
        conversions: {
            [Vendor.H3C]: "irf-mode enable",
            [Vendor.Cisco]: "# Cisco StackWise/StackWise Virtual在物理连接后自动启用"
        }
    },
    {
        pattern: "stack member-id renumber",
        explanation: "将当前设备的堆叠成员ID重新编号为 $1。执行后设备会重启以使新成员ID生效。",
        conversions: {
            [Vendor.H3C]: "irf member renumber <current-id> $1",
            [Vendor.Cisco]: "switch <current-id> renumber $1"
        }
    },
    {
        pattern: "stack member (\\d+) renumber (\\d+)",
        explanation: "（简写语法，不推荐）将成员ID为 $1 的设备重新编号为 $2。建议使用分步配置：先进入stack slot视图，再执行renumber。",
        conversions: {
            [Vendor.H3C]: "irf member $1\n renumber $2\n quit",
            [Vendor.Cisco]: "switch $1 renumber $2"
        }
    },
    {
        pattern: "stack slot (\\d+)",
        explanation: "进入堆叠成员 $1 的配置视图。用于配置该成员的优先级、重编号等参数。",
        conversions: {
            [Vendor.H3C]: "irf member $1",
            [Vendor.Cisco]: "# Cisco使用全局命令配置成员"
        }
    },
    {
        pattern: "priority (\\d+)",
        explanation: "在堆叠成员视图下配置优先级为 $1。优先级范围1-255，数值越大优先级越高，用于主设备选举。",
        conversions: {
            [Vendor.H3C]: "priority $1",
            [Vendor.Cisco]: "# Cisco在全局模式使用: switch <id> priority $1"
        }
    },
    {
        pattern: "renumber (\\d+)",
        explanation: "在堆叠成员视图下将当前成员重新编号为 $1。执行后设备会重启以使新成员ID生效。",
        conversions: {
            [Vendor.H3C]: "renumber $1",
            [Vendor.Cisco]: "# Cisco在全局模式使用: switch <old-id> renumber $1"
        }
    },
    {
        pattern: "stack slot (\\d+) priority (\\d+)",
        explanation: "（简写语法，不推荐）配置堆叠成员 $1 的优先级为 $2。建议使用分步配置：先进入stack slot视图，再配置priority。",
        conversions: {
            [Vendor.H3C]: "irf member $1\n priority $2\n quit",
            [Vendor.Cisco]: "switch $1 priority $2"
        }
    },
    {
        pattern: "stack priority",
        explanation: "配置当前设备在堆叠中的优先级为 $1。优先级范围1-255，数值越大优先级越高。",
        conversions: {
            [Vendor.H3C]: "irf priority $1",
            [Vendor.Cisco]: "switch <member-id> priority $1"
        }
    },
    {
        pattern: "interface stack-port (\\d+)/(\\d+)",
        explanation: "进入堆叠端口 $1/$2 视图，用于配置堆叠物理接口。注意：华为每个物理接口需要独立的stack-port。",
        conversions: {
            [Vendor.H3C]: "irf-port $1/$2",
            [Vendor.Cisco]: "# Cisco StackWise使用专用堆叠端口"
        }
    },
    {
        pattern: "port interface (\\S+) enable",
        explanation: "将物理接口 $1 绑定到当前堆叠端口，并启用该接口的堆叠功能。",
        conversions: {
            [Vendor.H3C]: "port group interface $1",
            [Vendor.Cisco]: "# Cisco StackWise使用专用堆叠线缆"
        }
    },
    {
        pattern: "stack domain (\\d+)",
        explanation: "配置堆叠域ID为 $1。域ID用于区分不同的堆叠系统。",
        conversions: {
            [Vendor.H3C]: "irf domain $1",
            [Vendor.Cisco]: "stackwise-virtual domain $1"
        }
    },
    {
        pattern: "stack topology-type ring",
        explanation: "配置堆叠拓扑为环形拓扑。环形拓扑可以提供更好的冗余性和带宽利用率。",
        conversions: {
            [Vendor.H3C]: "# H3C IRF默认支持环形拓扑",
            [Vendor.Cisco]: "# Cisco StackWise自动检测拓扑类型"
        }
    },
    {
        pattern: "stack topology-type chain",
        explanation: "配置堆叠拓扑为链形拓扑。链形拓扑适用于设备线性排列的场景。",
        conversions: {
            [Vendor.H3C]: "# H3C IRF默认支持链形拓扑",
            [Vendor.Cisco]: "# Cisco StackWise自动检测拓扑类型"
        }
    },
    {
        pattern: "stack reserved vlan",
        explanation: "配置堆叠管理预留VLAN为 $1。该VLAN用于堆叠成员间的内部通信。",
        conversions: {
            [Vendor.H3C]: "# H3C IRF使用内部VLAN进行通信",
            [Vendor.Cisco]: "# Cisco StackWise使用专用堆叠链路"
        }
    },
    {
        pattern: "mad detect mode relay",
        explanation: "配置MAD（Multi-Active Detection，多Active检测）方式为中继模式。用于检测堆叠分裂导致的多主设备问题。",
        conversions: {
            [Vendor.H3C]: "mad detect method <method>",
            [Vendor.Cisco]: "# Cisco StackWise Virtual支持dual-active detection"
        }
    },
    {
        pattern: "mad detect mode bfd",
        explanation: "配置MAD检测方式为BFD（双向转发检测）模式。通过BFD协议检测堆叠分裂。",
        conversions: {
            [Vendor.H3C]: "mad detect method bfd",
            [Vendor.Cisco]: "stackwise-virtual dual-active detection"
        }
    },
    {
        pattern: "mad bfd enable",
        explanation: "在当前接口上启用MAD BFD检测功能。",
        conversions: {
            [Vendor.H3C]: "mad bfd enable",
            [Vendor.Cisco]: "# 在StackWise Virtual配置中启用dual-active detection"
        }
    },
    {
        pattern: "mad ip address (\\S+) (\\d+\\.\\d+\\.\\d+\\.\\d+)",
        explanation: "配置MAD检测IP地址，$1为本端IP，$2为对端IP，用于BFD MAD检测。",
        conversions: {
            [Vendor.H3C]: "mad ip address member <id> $1 member <id> $2",
            [Vendor.Cisco]: "# 在接口配置BFD用于dual-active detection"
        }
    },
    {
        pattern: "display stack",
        explanation: "显示堆叠的基本信息，包括堆叠成员、角色、MAC地址、优先级和状态等。",
        conversions: {
            [Vendor.H3C]: "display irf",
            [Vendor.Cisco]: "show switch"
        }
    },
    {
        pattern: "display stack topology",
        explanation: "显示堆叠的拓扑结构，包括堆叠链路的连接状态和带宽信息。",
        conversions: {
            [Vendor.H3C]: "display irf topology",
            [Vendor.Cisco]: "show switch stack-ports"
        }
    },
    {
        pattern: "display stack configuration",
        explanation: "显示堆叠的配置信息，包括成员ID、优先级、堆叠端口绑定等详细配置。",
        conversions: {
            [Vendor.H3C]: "display irf configuration",
            [Vendor.Cisco]: "show running-config | include switch"
        }
    },
    {
        pattern: "display stack member",
        explanation: "显示堆叠成员的详细信息，包括设备型号、MAC地址、软件版本等。",
        conversions: {
            [Vendor.H3C]: "display irf member",
            [Vendor.Cisco]: "show switch detail"
        }
    },
    {
        pattern: "display mad",
        explanation: "显示MAD（Multi-Active Detection）的配置和状态信息。",
        conversions: {
            [Vendor.H3C]: "display mad",
            [Vendor.Cisco]: "show stackwise-virtual dual-active-detection"
        }
    },
    {
        pattern: "css cluster-id",
        explanation: "配置CSS集群ID为 $1。CSS是华为高端交换机的集群技术，不同于普通堆叠。",
        conversions: {
            [Vendor.H3C]: "# H3C使用IRF域编号",
            [Vendor.Cisco]: "# Cisco使用StackWise或VSS技术"
        }
    },
    {
        pattern: "css member-id",
        explanation: "配置当前设备在CSS集群中的成员ID为 $1。",
        conversions: {
            [Vendor.H3C]: "irf member $1",
            [Vendor.Cisco]: "switch $1 provision <model>"
        }
    },
    {
        pattern: "css priority",
        explanation: "配置当前设备在CSS集群中的优先级为 $1。",
        conversions: {
            [Vendor.H3C]: "irf priority $1",
            [Vendor.Cisco]: "switch <member-id> priority $1"
        }
    },
    {
        pattern: "interface css-port",
        explanation: "进入CSS端口视图，配置CSS物理端口。CSS端口用于CSS集群成员间的互连。",
        conversions: {
            [Vendor.H3C]: "irf-port <member>/<port>",
            [Vendor.Cisco]: "# Cisco VSS使用virtual-switch link"
        }
    },
    {
        pattern: "display css",
        explanation: "显示CSS集群的状态信息，包括集群ID、成员信息、主备状态等。",
        conversions: {
            [Vendor.H3C]: "display irf",
            [Vendor.Cisco]: "show switch virtual"
        }
    },
    {
        pattern: "display css configuration",
        explanation: "显示CSS集群的配置信息。",
        conversions: {
            [Vendor.H3C]: "display irf configuration",
            [Vendor.Cisco]: "show switch virtual config"
        }
    }
];