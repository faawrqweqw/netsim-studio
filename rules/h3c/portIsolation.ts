import { Vendor } from '../../types';

export const portIsolationRules = [
    {
      pattern: "port-isolate group",
      explanation: "创建端口隔离组 $1 并进入其视图。",
      conversions: {
        [Vendor.Huawei]: "# 华为设备在接口上直接启用并指定组，无需先创建组\n# interface <interface_name>\n# port-isolate enable group $1",
        [Vendor.Cisco]: "# 思科使用Private VLANs (PVLANs)实现类似功能，配置更复杂\n# vlan <isolate_vlan_id>\n# private-vlan isolated"
      }
    },
    {
      pattern: "community-vlan vlan",
      explanation: "在隔离组中配置非隔离VLAN $1，使这些VLAN内的流量可以互通。",
      conversions: {
        [Vendor.Huawei]: "# 华为使用全局排除VLAN的命令，效果相反\nport-isolate exclude vlan $1",
        [Vendor.Cisco]: "# 思科PVLAN中，可以将VLAN配置为community类型实现组内互通"
      }
    },
    {
      pattern: "port-isolate enable group",
      explanation: "在当前接口上启用端口隔离功能，并将其加入隔离组 $1。",
      conversions: {
        [Vendor.Huawei]: "port-isolate enable group $1",
        [Vendor.Cisco]: "switchport protected\n# 或使用更复杂的Private VLANs (PVLANs)配置"
      }
    },
];
