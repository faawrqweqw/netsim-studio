import { Vendor } from '../../types';

export const natRules = [
    // --- NAT Address Pool ---
    {
      pattern: "nat address-group",
      explanation: "创建名为 $1 的NAT地址池。",
      conversions: {
          [Vendor.Cisco]: "ip nat pool $1 <start_ip> <end_ip> netmask <netmask>",
          [Vendor.H3C]: "nat address-group <group_id> name $1"
      }
    },
    {
      pattern: "section",
      explanation: "在当前地址池中定义一个地址段，从 $1 到 $2。",
      conversions: {
          [Vendor.Cisco]: "# (地址范围在 `ip nat pool` 命令中直接定义)",
          [Vendor.H3C]: "address $1 $2"
      }
    },
    {
      pattern: "mode pat",
      explanation: "设置地址池模式为PAT（端口地址转换），允许多个私网地址共享一个公网地址。",
      conversions: {
          [Vendor.Cisco]: "# (在 `ip nat inside source` 命令中使用 `overload` 关键字)",
          [Vendor.H3C]: "# (在 `nat global-policy` 中通过 `action snat pat` 实现)"
      }
    },
    {
      pattern: "mode no-pat",
      explanation: "设置地址池模式为No-PAT（一对一转换），不转换端口号。",
      conversions: {
          [Vendor.Cisco]: "# (在 `ip nat inside source` 命令中不使用 `overload` 关键字)",
          [Vendor.H3C]: "# (在 `nat global-policy` 中通过 `action snat no-pat` 实现)"
      }
    },
    {
      pattern: "route enable",
      explanation: "为NAT地址池中的地址生成黑洞路由，防止路由环路。",
      conversions: {
          [Vendor.Cisco]: "# Cisco通常不需要此命令，路由自动处理或手动配置黑洞路由 `ip route <pool_net> <pool_mask> Null0`",
          [Vendor.H3C]: "# H3C默认情况下会下发黑洞路由"
      }
    },

    // --- NAT Policy ---
    {
      pattern: "nat-policy",
      explanation: "进入NAT策略视图，用于配置基于策略的NAT。",
      conversions: {
          [Vendor.Cisco]: "# Cisco通过 access-list 和 ip nat inside source list ... 实现",
          [Vendor.H3C]: "nat global-policy"
      }
    },
    {
      pattern: "rule name",
      explanation: "在NAT策略中创建名为 $1 的规则。",
      conversions: {
          [Vendor.Cisco]: "# Cisco ACL规则没有名称，使用编号",
          [Vendor.H3C]: "rule name $1"
      }
    },
    {
      pattern: "source-address",
      explanation: "配置NAT规则匹配源地址为 $1，掩码/通配符为 $2。",
      conversions: {
          [Vendor.Cisco]: "# (在ACL中定义)\naccess-list <acl_number> permit ip $1 $2 any",
          [Vendor.H3C]: "source-ip-subnet $1 $2"
      }
    },
    {
      pattern: "destination-address",
      explanation: "配置NAT规则匹配目的地址为 $1，掩码/通配符为 $2。",
      conversions: {
          [Vendor.Cisco]: "# (在ACL中定义)\naccess-list <acl_number> permit ip any $1 $2",
          [Vendor.H3C]: "destination-ip-subnet $1 $2"
      }
    },
    {
        pattern: "source-zone",
        explanation: "配置NAT规则匹配源安全区域为 $1。",
        conversions: {
            [Vendor.H3C]: "source-zone $1",
            [Vendor.Cisco]: "# Cisco基于接口的内外网定义 (ip nat inside/outside)，不使用安全域"
        }
    },
    {
        pattern: "destination-zone",
        explanation: "配置NAT规则匹配目的安全区域为 $1。",
        conversions: {
            [Vendor.H3C]: "destination-zone $1",
            [Vendor.Cisco]: "# Cisco基于接口的内外网定义 (ip nat inside/outside)，不使用安全域"
        }
    },
    {
        pattern: "service protocol",
        explanation: "配置NAT规则匹配的服务/协议。例如: `service protocol tcp source-port 100 to 200`",
        conversions: {
            [Vendor.Cisco]: "# (在扩展ACL中定义)\naccess-list <acl_number> permit tcp any range 100 200 any",
            [Vendor.H3C]: "# (在服务对象组中定义)\nobject-group service <name>\n service tcp source range 100 200"
        }
    },
    {
      pattern: "action source-nat easy-ip",
      explanation: "配置动作为源NAT，并使用出接口的IP地址进行地址转换（PAT）。",
      conversions: {
          [Vendor.Cisco]: "ip nat inside source list <acl_number> interface <interface_name> overload",
          [Vendor.H3C]: "action snat easy-ip"
      }
    },
    {
      pattern: "action source-nat address-group",
      explanation: "配置动作为源NAT，并使用名为 $1 的地址池进行转换。",
      conversions: {
          [Vendor.Cisco]: "ip nat inside source list <acl_number> pool <pool_name_of_$1> overload",
          [Vendor.H3C]: "action snat address-group <group_id_of_pool_$1>"
      }
    },
    {
      pattern: "action no-nat",
      explanation: "配置动作为不进行NAT转换。",
      conversions: {
          [Vendor.Cisco]: "# (通过deny语句在ACL中实现)\naccess-list <acl_number> deny ip <source_net> <wildcard>",
          [Vendor.H3C]: "action snat no-nat"
      }
    },
    {
        pattern: "rule move",
        explanation: "移动NAT规则 $*。用于调整规则匹配的优先级。",
        conversions: {
            [Vendor.Cisco]: "# Cisco ACL规则按顺序匹配，移动需要重新编号或删除/重加",
            [Vendor.H3C]: "rule move $*"
        }
    },

    // --- NAT Server (Destination NAT) ---
    {
      pattern: "nat server",
      explanation: "配置静态NAT（服务器映射），将公网地址/端口映射到内网服务器地址/端口。",
      conversions: {
          [Vendor.Cisco]: (params: string[]) => {
              const globalIndex = params.indexOf('global');
              const insideIndex = params.indexOf('inside');
              if (globalIndex === -1 || insideIndex === -1) return "# Incomplete nat server command";
              
              const protocol = params[params.indexOf('protocol') + 1] || 'tcp';
              const globalIp = params[globalIndex + 1];
              const globalPort = params[globalIndex + 2] && !isNaN(parseInt(params[globalIndex + 2])) ? params[globalIndex + 2] : 'any';
              const insideIp = params[insideIndex + 1];
              const insidePort = params[insideIndex + 2] && !isNaN(parseInt(params[insideIndex + 2])) ? params[insideIndex + 2] : globalPort;

              return `ip nat inside source static ${protocol} ${insideIp} ${insidePort} ${globalIp} ${globalPort}`;
          },
          [Vendor.H3C]: (params: string[]) => `nat server ${params.join(' ')}`
      }
    }
];
