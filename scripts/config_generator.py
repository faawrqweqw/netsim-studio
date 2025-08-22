#!/usr/bin/env python3
"""
Network Configuration Generator
Generates CLI commands for different network devices and vendors
"""

import json
import sys
import argparse
from typing import Dict, List, Any

def optimize_vlan_ranges(vlans: List[int]) -> str:
    """将VLAN ID数组优化为范围格式"""
    if not vlans:
        return ''
    
    sorted_vlans = sorted(vlans)
    ranges = []
    start = sorted_vlans[0]
    end = start
    
    for i in range(1, len(sorted_vlans)):
        if sorted_vlans[i] == end + 1:
            end = sorted_vlans[i]
        else:
            if start == end:
                ranges.append(str(start))
            elif end == start + 1:
                ranges.append(str(start))
                ranges.append(str(end))
            else:
                ranges.append(f"{start}-{end}")
            start = sorted_vlans[i]
            end = start
    
    # 处理最后一个范围
    if start == end:
        ranges.append(str(start))
    elif end == start + 1:
        ranges.append(str(start))
        ranges.append(str(end))
    else:
        ranges.append(f"{start}-{end}")
    
    return ','.join(ranges)

class ConfigGenerator:
    def __init__(self, vendor: str, device_type: str):
        self.vendor = vendor.lower()
        self.device_type = device_type.lower()
    
    def generate_dhcp_config(self, config: Dict[str, Any]) -> Dict[str, str]:
        """Generate DHCP server configuration"""
        pools = config.get('pools', [])
        
        if self.vendor == 'cisco':
            cli_lines = ["service dhcp"]
            
            # 添加排除地址
            for pool in pools:
                exclude_start = pool.get('excludeStart', '')
                exclude_end = pool.get('excludeEnd', '')
                if exclude_start and exclude_end:
                    cli_lines.append(f"ip dhcp excluded-address {exclude_start} {exclude_end}")
            
            # 添加地址池
            for pool in pools:
                pool_name = pool.get('poolName', 'LAN_POOL')
                network = pool.get('network', '192.168.1.0')
                subnet_mask = pool.get('subnetMask', '255.255.255.0')
                gateway = pool.get('gateway', '192.168.1.1')
                dns_server = pool.get('dnsServer', '8.8.8.8')
                
                # 计算租约时间
                days = int(pool.get('leaseDays', '0'))
                hours = int(pool.get('leaseHours', '1'))
                minutes = int(pool.get('leaseMinutes', '0'))
                seconds = int(pool.get('leaseSeconds', '0'))
                
                cli_lines.extend([
                    f"ip dhcp pool {pool_name}",
                    f" network {network} {subnet_mask}",
                    f" default-router {gateway}",
                    f" dns-server {dns_server}"
                ])
                
                if days > 0 or hours > 0 or minutes > 0 or seconds > 0:
                    lease_parts = []
                    if days > 0: lease_parts.append(f"{days}")
                    if hours > 0: lease_parts.append(f"{hours}")
                    if minutes > 0: lease_parts.append(f"{minutes}")
                    if seconds > 0: lease_parts.append(f"{seconds}")
                    cli_lines.append(f" lease {' '.join(lease_parts)}")
                
                cli_lines.append("exit")
            
            # 为每个地址池添加静态绑定
            for pool in pools:
                pool_name = pool.get('poolName', 'LAN_POOL')
                subnet_mask = pool.get('subnetMask', '255.255.255.0')
                static_bindings = pool.get('staticBindings', [])
                
                for binding in static_bindings:
                    ip_address = binding.get('ipAddress', '')
                    mac_address = binding.get('macAddress', '')
                    binding_type = binding.get('type', 'MAC地址')
                    client_id = binding.get('clientId', '')
                    
                    if ip_address and (mac_address or client_id):
                        if binding_type == 'MAC地址' and mac_address:
                            cli_lines.extend([
                                f"ip dhcp pool {pool_name}_STATIC_{ip_address.replace('.', '_')}",
                                f" host {ip_address} {subnet_mask}",
                                f" client-identifier 01{mac_address.replace(':', '').replace('-', '')}",
                                "exit"
                            ])
                        elif binding_type == '客户端ID' and client_id:
                            cli_lines.extend([
                                f"ip dhcp pool {pool_name}_STATIC_{ip_address.replace('.', '_')}",
                                f" host {ip_address} {subnet_mask}",
                                f" client-identifier {client_id}",
                                "exit"
                            ])
            
            cli = "\n".join(cli_lines)
            explanation = """• service dhcp - 启用DHCP服务
• ip dhcp excluded-address - 排除地址范围
• ip dhcp pool - 创建DHCP地址池
• network - 指定网络地址和子网掩码
• default-router - 设置默认网关
• dns-server - 设置DNS服务器
• lease - 设置租约时间（天 小时 分钟 秒）
• host - 配置静态主机绑定
• client-identifier - 设置客户端标识符"""

        elif self.vendor == 'huawei':
            cli_lines = ["dhcp enable"]
            
            # 添加地址池
            for pool in pools:
                pool_name = pool.get('poolName', 'LAN_POOL')
                network = pool.get('network', '192.168.1.0')
                subnet_mask = pool.get('subnetMask', '255.255.255.0')
                gateway = pool.get('gateway', '192.168.1.1')
                dns_server = pool.get('dnsServer', '8.8.8.8')
                exclude_start = pool.get('excludeStart', '')
                exclude_end = pool.get('excludeEnd', '')
                
                # 计算租约时间
                days = int(pool.get('leaseDays', '0'))
                hours = int(pool.get('leaseHours', '1'))
                minutes = int(pool.get('leaseMinutes', '0'))
                
                cli_lines.extend([
                    f"ip pool {pool_name}",
                    f" gateway-list {gateway}",
                    f" network {network} mask {subnet_mask}",
                    f" dns-list {dns_server}"
                ])
                
                if days > 0 or hours > 0 or minutes > 0:
                    lease_cmd = " lease"
                    if days > 0: lease_cmd += f" day {days}"
                    if hours > 0: lease_cmd += f" hour {hours}"
                    if minutes > 0: lease_cmd += f" minute {minutes}"
                    cli_lines.append(lease_cmd)
                
                if exclude_start and exclude_end:
                    cli_lines.append(f" excluded-ip-address {exclude_start} {exclude_end}")
                
                cli_lines.append("quit")
            
            # 为每个地址池添加静态绑定
            for pool in pools:
                static_bindings = pool.get('staticBindings', [])
                for binding in static_bindings:
                    ip_address = binding.get('ipAddress', '')
                    mac_address = binding.get('macAddress', '')
                    if ip_address and mac_address:
                        cli_lines.extend([
                            f"ip pool STATIC_{ip_address.replace('.', '_')}",
                            f" static-bind ip-address {ip_address} mac-address {mac_address}",
                            "quit"
                        ])
            
            cli = "\n".join(cli_lines)
            explanation = """• dhcp enable - 启用DHCP功能
• ip pool - 创建地址池
• gateway-list - 设置网关列表
• network mask - 指定网络和掩码
• dns-list - 设置DNS服务器列表
• lease day hour minute - 设置租约时间
• excluded-ip-address - 排除IP地址范围
• static-bind - 配置静态绑定"""

        elif self.vendor == 'h3c':
            cli_lines = ["dhcp server enable"]
            
            # 添加地址池
            for pool in pools:
                pool_name = pool.get('poolName', 'LAN_POOL')
                network = pool.get('network', '192.168.1.0')
                subnet_mask = pool.get('subnetMask', '255.255.255.0')
                gateway = pool.get('gateway', '192.168.1.1')
                dns_server = pool.get('dnsServer', '8.8.8.8')
                exclude_start = pool.get('excludeStart', '')
                exclude_end = pool.get('excludeEnd', '')
                
                # 计算租约时间
                days = int(pool.get('leaseDays', '0'))
                hours = int(pool.get('leaseHours', '1'))
                minutes = int(pool.get('leaseMinutes', '0'))
                
                cli_lines.extend([
                    f"dhcp server ip-pool {pool_name}",
                    f" network {network} mask {subnet_mask}",
                    f" gateway-list {gateway}",
                    f" dns-list {dns_server}"
                ])
                
                if days > 0 or hours > 0 or minutes > 0:
                    lease_cmd = " expired"
                    if days > 0: lease_cmd += f" day {days}"
                    if hours > 0: lease_cmd += f" hour {hours}"
                    if minutes > 0: lease_cmd += f" minute {minutes}"
                    cli_lines.append(lease_cmd)
                
                if exclude_start and exclude_end:
                    cli_lines.append(f" forbidden-ip {exclude_start} {exclude_end}")
                
                cli_lines.append("quit")
            
            # 为每个地址池添加静态绑定
            for pool in pools:
                static_bindings = pool.get('staticBindings', [])
                for binding in static_bindings:
                    ip_address = binding.get('ipAddress', '')
                    mac_address = binding.get('macAddress', '')
                    if ip_address and mac_address:
                        cli_lines.append(f"dhcp server static-bind ip-address {ip_address} mac-address {mac_address}")
            
            cli = "\n".join(cli_lines)
            explanation = """• dhcp server enable - 启用DHCP服务器
• dhcp server ip-pool - 创建IP地址池
• network mask - 指定网络和掩码
• gateway-list - 设置网关
• dns-list - 设置DNS服务器
• expired day hour minute - 设置租约过期时间
• forbidden-ip - 设置禁用IP范围
• dhcp server static-bind - 配置静态绑定"""

        else:
            cli = "# Unsupported vendor for DHCP configuration"
            explanation = "该厂商暂不支持DHCP配置生成"

        return {"cli": cli, "explanation": explanation}

    def generate_vlan_config(self, config: Dict[str, Any]) -> Dict[str, str]:
        """Generate VLAN Interface configuration"""
        vlan_interfaces = config.get('vlanInterfaces', [])
        
        if self.vendor == 'cisco':
            cli_lines = []
            
            # 创建VLAN
            for vlan_intf in vlan_interfaces:
                vlan_id = vlan_intf.get('vlanId', '')
                vlan_desc = vlan_intf.get('vlanDescription', '')
                if vlan_id:
                    cli_lines.append(f"vlan {vlan_id}")
                    if vlan_desc:
                        cli_lines.append(f" name {vlan_desc}")
                    cli_lines.append("exit")
            
            # 配置VLAN接口
            for vlan_intf in vlan_interfaces:
                vlan_id = vlan_intf.get('vlanId', '')
                ip_address = vlan_intf.get('ipAddress', '')
                subnet_mask = vlan_intf.get('subnetMask', '')
                intf_desc = vlan_intf.get('interfaceDescription', '')
                enable_dhcp = vlan_intf.get('enableDHCP', False)
                dhcp_mode = vlan_intf.get('dhcpMode', 'global')
                
                if vlan_id and ip_address and subnet_mask:
                    cli_lines.append(f"interface vlan {vlan_id}")
                    if intf_desc:
                        cli_lines.append(f" description {intf_desc}")
                    cli_lines.append(f" ip address {ip_address} {subnet_mask}")
                    cli_lines.append(" no shutdown")
                    
                    if enable_dhcp:
                        if dhcp_mode == 'global':
                            cli_lines.append(" ip helper-address [DHCP_SERVER_IP]")
                        elif dhcp_mode == 'relay':
                            cli_lines.append(" ip dhcp relay information trusted")
                    
                    cli_lines.append("exit")
            
            cli = "\n".join(cli_lines)
            explanation = """• vlan - 创建VLAN并设置名称
• interface vlan - 进入VLAN接口配置模式
• description - 设置接口描述
• ip address - 配置接口IP地址和子网掩码
• no shutdown - 启用接口
• ip helper-address - 配置DHCP中继
• ip dhcp relay - 配置DHCP中继信任"""

        elif self.vendor == 'huawei':
            cli_lines = []
            
            # 创建VLAN
            for vlan_intf in vlan_interfaces:
                vlan_id = vlan_intf.get('vlanId', '')
                vlan_desc = vlan_intf.get('vlanDescription', '')
                if vlan_id:
                    cli_lines.append(f"vlan {vlan_id}")
                    if vlan_desc:
                        cli_lines.append(f" description {vlan_desc}")
                    cli_lines.append("quit")
            
            # 配置VLAN接口
            for vlan_intf in vlan_interfaces:
                vlan_id = vlan_intf.get('vlanId', '')
                ip_address = vlan_intf.get('ipAddress', '')
                subnet_mask = vlan_intf.get('subnetMask', '')
                intf_desc = vlan_intf.get('interfaceDescription', '')
                enable_dhcp = vlan_intf.get('enableDHCP', False)
                dhcp_mode = vlan_intf.get('dhcpMode', 'global')
                
                if vlan_id and ip_address and subnet_mask:
                    cli_lines.append(f"interface vlanif {vlan_id}")
                    if intf_desc:
                        cli_lines.append(f" description {intf_desc}")
                    cli_lines.append(f" ip address {ip_address} {subnet_mask}")
                    cli_lines.append(" undo shutdown")
                    
                    if enable_dhcp:
                        if dhcp_mode == 'global':
                            selected_pool = vlan_intf.get('selectedPool', '')
                            if selected_pool:
                                cli_lines.append(f" dhcp select global pool {selected_pool}")
                            else:
                                cli_lines.append(" dhcp select global")
                        elif dhcp_mode == 'relay':
                            cli_lines.append(" dhcp select relay")
                            cli_lines.append(" dhcp relay server-ip [DHCP_SERVER_IP]")
                        elif dhcp_mode == 'interface':
                            cli_lines.append(" dhcp select interface")
                            # 添加接口地址池配置
                            interface_pool = vlan_intf.get('interfacePoolConfig', {})
                            if interface_pool:
                                network = interface_pool.get('network', '192.168.10.0')
                                mask = interface_pool.get('subnetMask', '255.255.255.0')
                                gateway = interface_pool.get('gateway', '192.168.10.1')
                                dns = interface_pool.get('dnsServer', '8.8.8.8')
                                days = int(interface_pool.get('leaseDays', '0'))
                                hours = int(interface_pool.get('leaseHours', '1'))
                                minutes = int(interface_pool.get('leaseMinutes', '0'))
                                
                                cli_lines.append(f" dhcp server ip-pool")
                                cli_lines.append(f" network {network} mask {mask}")
                                cli_lines.append(f" gateway-list {gateway}")
                                cli_lines.append(f" dns-list {dns}")
                                
                                if days > 0 or hours > 0 or minutes > 0:
                                    lease_cmd = " lease"
                                    if days > 0: lease_cmd += f" day {days}"
                                    if hours > 0: lease_cmd += f" hour {hours}"
                                    if minutes > 0: lease_cmd += f" minute {minutes}"
                                    cli_lines.append(lease_cmd)
                    
                    cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• vlan - 创建VLAN并设置描述
• interface vlanif - 进入VLAN接口配置视图
• description - 设置接口描述
• ip address - 配置接口IP地址和子网掩码
• undo shutdown - 启用接口
• dhcp select global - 启用全局DHCP池模式
• dhcp select relay - 启用DHCP中继模式
• dhcp select interface - 启用接口地址池模式
• dhcp server ip-pool - 配置接口地址池
• dhcp relay server-ip - 配置DHCP服务器地址"""

        elif self.vendor == 'h3c':
            cli_lines = []
            
            # 创建VLAN
            for vlan_intf in vlan_interfaces:
                vlan_id = vlan_intf.get('vlanId', '')
                vlan_desc = vlan_intf.get('vlanDescription', '')
                if vlan_id:
                    cli_lines.append(f"vlan {vlan_id}")
                    if vlan_desc:
                        cli_lines.append(f" name {vlan_desc}")
                    cli_lines.append("quit")
            
            # 配置VLAN接口
            for vlan_intf in vlan_interfaces:
                vlan_id = vlan_intf.get('vlanId', '')
                ip_address = vlan_intf.get('ipAddress', '')
                subnet_mask = vlan_intf.get('subnetMask', '')
                intf_desc = vlan_intf.get('interfaceDescription', '')
                enable_dhcp = vlan_intf.get('enableDHCP', False)
                dhcp_mode = vlan_intf.get('dhcpMode', 'global')
                
                if vlan_id and ip_address and subnet_mask:
                    cli_lines.append(f"interface vlan-interface {vlan_id}")
                    if intf_desc:
                        cli_lines.append(f" description {intf_desc}")
                    cli_lines.append(f" ip address {ip_address} {subnet_mask}")
                    cli_lines.append(" undo shutdown")
                    
                    if enable_dhcp:
                        if dhcp_mode == 'global':
                            cli_lines.append(" dhcp select server")
                            # 如果指定了地址池，则绑定到该地址池
                            selected_pool = vlan_intf.get('selectedPool', '')
                            if selected_pool:
                                cli_lines.append(f" dhcp server apply ip-pool {selected_pool}")
                        elif dhcp_mode == 'relay':
                            dhcp_server_ip = vlan_intf.get('dhcpServerIP', '[DHCP_SERVER_IP]')
                            cli_lines.append(" dhcp select relay")
                            cli_lines.append(f" dhcp relay server-select {dhcp_server_ip}")
                    
                    cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• vlan - 创建VLAN并设置名称
• interface vlan-interface - 进入VLAN接口配置视图
• description - 设置接口描述
• ip address - 配置接口IP地址和子网掩码
• undo shutdown - 启用接口
• dhcp select server - 启用DHCP服务器模式
• dhcp server apply ip-pool - 绑定指定的DHCP地址池
• dhcp select relay - 启用DHCP中继模式
• dhcp relay server-select - 配置DHCP服务器地址"""

        else:
            cli = "# Unsupported vendor for VLAN Interface configuration"
            explanation = "该厂商暂不支持VLAN接口配置生成"

        return {"cli": cli, "explanation": explanation}

    def generate_link_aggregation_config(self, config: Dict[str, Any]) -> Dict[str, str]:
        """Generate Link Aggregation configuration"""
        group_id = config.get('groupId', '1')
        mode = config.get('mode', 'active')
        interfaces = config.get('interfaces', [])
        load_balance = config.get('loadBalanceAlgorithm', 'src-dst-ip')
        description = config.get('description', '')
        interface_mode = config.get('interfaceMode', 'unconfigured')
        access_vlan = config.get('accessVlan', '')
        trunk_native_vlan = config.get('trunkNativeVlan', '')
        trunk_allowed_vlans = config.get('trunkAllowedVlans', '')
        
        if self.vendor == 'cisco':
            cli_lines = []
            
            # 创建Port-Channel接口
            cli_lines.append(f"interface port-channel {group_id}")
            if description:
                cli_lines.append(f" description {description}")
            
            # Cisco负载均衡算法
            cisco_load_balance_map = {
                'src-dst-ip': 'src-dst-ip',
                'src-dst-mac': 'src-dst-mac',
                'src-ip': 'src-ip',
                'dst-ip': 'dst-ip',
                'src-mac': 'src-mac',
                'dst-mac': 'dst-mac',
                'src-dst-port': 'src-dst-port'
            }
            if load_balance in cisco_load_balance_map:
                cli_lines.append(f" port-channel load-balance {cisco_load_balance_map[load_balance]}")
            
            # 聚合口VLAN模式配置
            if interface_mode == 'l3':
                cli_lines.append(" no switchport")
            elif interface_mode == 'access' and access_vlan:
                cli_lines.append(" switchport mode access")
                cli_lines.append(f" switchport access vlan {access_vlan}")
            elif interface_mode == 'trunk':
                cli_lines.append(" switchport mode trunk")
                if trunk_native_vlan:
                    cli_lines.append(f" switchport trunk native vlan {trunk_native_vlan}")
                if trunk_allowed_vlans:
                    # 使用优化的VLAN范围格式
                    vlans = []
                    for part in trunk_allowed_vlans.split(','):
                        part = part.strip()
                        if '-' in part:
                            start, end = part.split('-')
                            vlans.extend(range(int(start), int(end) + 1))
                        else:
                            vlans.append(int(part))
                    formatted_vlans = optimize_vlan_ranges(sorted(set(vlans)))
                    cli_lines.append(f" switchport trunk allowed vlan {formatted_vlans}")
            
            cli_lines.append("exit")
            
            # 配置成员接口
            for interface in interfaces:
                if interface.strip():
                    cli_lines.append(f"interface {interface}")
                    if description:
                        cli_lines.append(f" description Member of Port-Channel {group_id}")
                    cli_lines.append(f" channel-group {group_id} mode {mode}")
                    cli_lines.append("exit")
            
            cli = "\n".join(cli_lines)
            explanation = """• interface port-channel - 创建端口通道接口
• description - 设置接口描述
• port-channel load-balance - 设置负载均衡算法
  - src-dst-ip: 基于源目的IP地址
  - src-dst-mac: 基于源目的MAC地址
  - src-ip: 基于源IP地址
  - dst-ip: 基于目的IP地址
  - src-mac: 基于源MAC地址
  - dst-mac: 基于目的MAC地址
  - src-dst-port: 基于源目的端口
• no switchport - 关闭交换端口功能（三层模式）
• switchport mode access - 设置接口为Access模式
• switchport access vlan - 设置Access VLAN
• switchport mode trunk - 设置接口为Trunk模式
• switchport trunk native vlan - 设置Native VLAN
• switchport trunk allowed vlan - 设置允许通过的VLAN
• channel-group mode - 将接口加入通道组并设置模式
• active - LACP主动模式
• passive - LACP被动模式
• auto - PAgP自动模式
• desirable - PAgP期望模式
• on - 强制聚合模式"""

        elif self.vendor == 'huawei':
            cli_lines = []
            
            # 创建Eth-Trunk接口
            cli_lines.append(f"interface Eth-Trunk {group_id}")
            if description:
                cli_lines.append(f" description {description}")
            
            # 设置模式
            if mode == 'manual':
                cli_lines.append(" mode manual load-balance")
            elif mode == 'lacp-static':
                cli_lines.append(" mode lacp-static")
            elif mode == 'lacp-dynamic':
                cli_lines.append(" mode lacp-dynamic")
            
            # 华为负载均衡算法
            huawei_load_balance_map = {
                'dst-ip': 'dst-ip',
                'src-ip': 'src-ip',
                'src-dst-ip': 'src-dst-ip',
                'dst-mac': 'dst-mac',
                'src-mac': 'src-mac',
                'src-dst-mac': 'src-dst-mac'
            }
            if load_balance in huawei_load_balance_map:
                cli_lines.append(f" load-balance {huawei_load_balance_map[load_balance]}")
            
            # 聚合口VLAN模式配置
            if interface_mode == 'l3':
                cli_lines.append(" undo portswitch")
            elif interface_mode == 'access' and access_vlan:
                cli_lines.append(" port link-type access")
                cli_lines.append(f" port default vlan {access_vlan}")
            elif interface_mode == 'trunk':
                cli_lines.append(" port link-type trunk")
                if trunk_native_vlan:
                    cli_lines.append(f" port trunk pvid vlan {trunk_native_vlan}")
                if trunk_allowed_vlans:
                    # 华为格式：使用 to 表示范围
                    vlans = []
                    for part in trunk_allowed_vlans.split(','):
                        part = part.strip()
                        if '-' in part:
                            start, end = part.split('-')
                            vlans.extend(range(int(start), int(end) + 1))
                        else:
                            vlans.append(int(part))
                    
                    # 转换为华为格式
                    sorted_vlans = sorted(set(vlans))
                    ranges = []
                    i = 0
                    while i < len(sorted_vlans):
                        start = sorted_vlans[i]
                        end = start
                        while i + 1 < len(sorted_vlans) and sorted_vlans[i + 1] == sorted_vlans[i] + 1:
                            i += 1
                            end = sorted_vlans[i]
                        
                        if start == end:
                            ranges.append(str(start))
                        elif end == start + 1:
                            ranges.append(str(start))
                            ranges.append(str(end))
                        else:
                            ranges.append(f"{start} to {end}")
                        i += 1
                    
                    cli_lines.append(f" port trunk allow-pass vlan {' '.join(ranges)}")
            
            cli_lines.append("quit")
            
            # 配置成员接口
            for interface in interfaces:
                if interface.strip():
                    cli_lines.append(f"interface {interface}")
                    if description:
                        cli_lines.append(f" description Member of Eth-Trunk {group_id}")
                    cli_lines.append(f" eth-trunk {group_id}")
                    cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• interface Eth-Trunk - 创建以太网Trunk接口
• description - 设置接口描述
• mode manual load-balance - 设置手工模式，所有链路参与负载分担（缺省模式）
• mode lacp-static - 设置静态LACP模式
• mode lacp-dynamic - 设置动态LACP模式
• load-balance - 设置负载均衡算法
  - dst-ip: 基于目的IP地址
  - src-ip: 基于源IP地址
  - src-dst-ip: 基于源目的IP地址
  - dst-mac: 基于目的MAC地址
  - src-mac: 基于源MAC地址
  - src-dst-mac: 基于源目的MAC地址
• undo portswitch - 关闭端口交换功能（三层模式）
• port link-type access - 设置端口链路类型为Access
• port default vlan - 设置默认VLAN
• port link-type trunk - 设置端口链路类型为Trunk
• port trunk pvid vlan - 设置端口VLAN ID
• port trunk allow-pass vlan - 设置允许通过的VLAN
• eth-trunk - 将接口加入Trunk组"""

        elif self.vendor == 'h3c':
            cli_lines = []
            
            # 创建Bridge-Aggregation接口
            cli_lines.append(f"interface Bridge-Aggregation {group_id}")
            if description:
                cli_lines.append(f" description {description}")
            
            # H3C链路聚合模式
            if mode == 'dynamic':
                cli_lines.append(" link-aggregation mode dynamic")
            # 静态模式是默认的，不需要显式配置
            
            # H3C负载均衡算法
            h3c_load_balance_map = {
                'destination-ip': 'destination-ip',
                'destination-mac': 'destination-mac',
                'source-ip': 'source-ip',
                'source-mac': 'source-mac'
            }
            if load_balance in h3c_load_balance_map:
                cli_lines.append(f" link-aggregation load-sharing mode {h3c_load_balance_map[load_balance]}")
            
            # 聚合口VLAN模式配置
            if interface_mode == 'l3':
                cli_lines.append(" undo port link-type")
            elif interface_mode == 'access' and access_vlan:
                cli_lines.append(f" port access vlan {access_vlan}")
            elif interface_mode == 'trunk':
                cli_lines.append(" port link-type trunk")
                if trunk_native_vlan:
                    cli_lines.append(f" port trunk pvid vlan {trunk_native_vlan}")
                if trunk_allowed_vlans:
                    # H3C格式：使用 to 表示范围
                    vlans = []
                    for part in trunk_allowed_vlans.split(','):
                        part = part.strip()
                        if '-' in part:
                            start, end = part.split('-')
                            vlans.extend(range(int(start), int(end) + 1))
                        else:
                            vlans.append(int(part))
                    
                    # 转换为H3C格式
                    sorted_vlans = sorted(set(vlans))
                    ranges = []
                    i = 0
                    while i < len(sorted_vlans):
                        start = sorted_vlans[i]
                        end = start
                        while i + 1 < len(sorted_vlans) and sorted_vlans[i + 1] == sorted_vlans[i] + 1:
                            i += 1
                            end = sorted_vlans[i]
                        
                        if start == end:
                            ranges.append(str(start))
                        elif end == start + 1:
                            ranges.append(str(start))
                            ranges.append(str(end))
                        else:
                            ranges.append(f"{start} to {end}")
                        i += 1
                    
                    cli_lines.append(f" port trunk permit vlan {' '.join(ranges)}")
            
            cli_lines.append("quit")
            
            # 配置成员接口
            for interface in interfaces:
                if interface.strip():
                    cli_lines.append(f"interface {interface}")
                    if description:
                        cli_lines.append(f" description Member of Bridge-Aggregation {group_id}")
                    cli_lines.append(f" port link-aggregation group {group_id}")
                    
                    # 根据模式启用LACP
                    if mode == 'dynamic':
                        cli_lines.append(" lacp enable")
                    
                    cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• interface Bridge-Aggregation - 创建聚合接口
• description - 设置接口描述
• link-aggregation mode dynamic - 设置动态聚合模式（LACP）
• link-aggregation load-sharing mode - 设置负载分担模式
  - destination-ip: 基于目的IP地址
  - destination-mac: 基于目的MAC地址
  - source-ip: 基于源IP地址
  - source-mac: 基于源MAC地址
• undo port link-type - 关闭端口链路类型（三层模式）
• port access vlan - 设置Access VLAN
• port link-type trunk - 设置端口链路类型为Trunk
• port trunk pvid vlan - 设置端口VLAN ID
• port trunk permit vlan - 设置允许通过的VLAN
• port link-aggregation group - 将端口加入聚合组
• lacp enable - 启用LACP协议（动态聚合模式）"""

        else:
            cli = "# Unsupported vendor for Link Aggregation configuration"
            explanation = "该厂商暂不支持链路聚合配置生成"

        return {"cli": cli, "explanation": explanation}

    def generate_stp_config(self, config: Dict[str, Any]) -> Dict[str, str]:
        """Generate STP (Spanning Tree Protocol) configuration"""
        mode = config.get('mode', 'rstp')
        priority = config.get('priority', '32768')
        max_age = config.get('maxAge', '20')
        hello_time = config.get('helloTime', '2')
        forward_delay = config.get('forwardDelay', '15')
        root_bridge = config.get('rootBridge', 'none')
        path_cost_standard = config.get('pathCostStandard', 'legacy')
        mstp_instances = config.get('mstpInstances', [])
        pvst_vlans = config.get('pvstVlans', [])
        port_configs = config.get('portConfigs', [])
        
        cli_lines = []
        
        if self.vendor == 'cisco':
            # 设置STP模式
            if mode == 'stp':
                cli_lines.append("spanning-tree mode pvst")
            elif mode == 'rstp':
                cli_lines.append("spanning-tree mode rapid-pvst")
            elif mode == 'mstp':
                cli_lines.append("spanning-tree mode mst")
                # 配置MSTP实例
                for instance in mstp_instances:
                    instance_id = instance.get('instanceId', '1')
                    vlan_list = instance.get('vlanList', '10,20')
                    instance_priority = instance.get('priority', '32768')
                    instance_root = instance.get('rootBridge', 'none')
                    cli_lines.append(f"spanning-tree mst {instance_id} vlan {vlan_list}")
                    if instance_root == 'primary':
                        cli_lines.append(f"spanning-tree mst {instance_id} root primary")
                    elif instance_root == 'secondary':
                        cli_lines.append(f"spanning-tree mst {instance_id} root secondary")
                    else:
                        cli_lines.append(f"spanning-tree mst {instance_id} priority {instance_priority}")
            
            # 根桥配置
            if root_bridge == 'primary':
                cli_lines.append("spanning-tree vlan 1-4094 root primary")
            elif root_bridge == 'secondary':
                cli_lines.append("spanning-tree vlan 1-4094 root secondary")
            else:
                # 设置全局优先级
                cli_lines.append(f"spanning-tree vlan 1-4094 priority {priority}")
            
            # 设置定时器（如果不是默认值）
            if max_age != '20':
                cli_lines.append(f"spanning-tree vlan 1-4094 max-age {max_age}")
            if hello_time != '2':
                cli_lines.append(f"spanning-tree vlan 1-4094 hello-time {hello_time}")
            if forward_delay != '15':
                cli_lines.append(f"spanning-tree vlan 1-4094 forward-time {forward_delay}")
            
            # 端口配置
            for port_config in port_configs:
                interface_name = port_config.get('interfaceName', 'GigabitEthernet0/1')
                port_priority = port_config.get('portPriority', '128')
                path_cost = port_config.get('pathCost', 'auto')
                edge_port = port_config.get('edgePort', False)
                bpdu_guard = port_config.get('bpduGuard', False)
                
                cli_lines.append(f"interface {interface_name}")
                if port_priority != '128':
                    cli_lines.append(f" spanning-tree port-priority {port_priority}")
                if path_cost != 'auto':
                    cli_lines.append(f" spanning-tree cost {path_cost}")
                if edge_port:
                    cli_lines.append(" spanning-tree portfast")
                if bpdu_guard:
                    cli_lines.append(" spanning-tree bpduguard enable")
                cli_lines.append("exit")
            
            cli = "\n".join(cli_lines)
            explanation = """• spanning-tree mode - 设置生成树协议模式
  - pvst: Per-VLAN Spanning Tree (STP)
  - rapid-pvst: Rapid Per-VLAN Spanning Tree (RSTP)
  - mst: Multiple Spanning Tree (MSTP)
• spanning-tree vlan root primary/secondary - 设置主/备份根桥
• spanning-tree vlan priority - 设置VLAN的桥优先级
• spanning-tree mst - 配置MSTP实例和VLAN映射
• spanning-tree mst root primary/secondary - 设置MSTP实例根桥
• spanning-tree port-priority - 设置端口优先级
• spanning-tree cost - 设置端口路径开销（设置大值如20000可阻塞端口）
• spanning-tree portfast - 启用端口快速转发
• spanning-tree bpduguard - 启用BPDU保护"""

        elif self.vendor == 'huawei':
            # 设置路径开销计算标准
            cli_lines.append(f"stp pathcost-standard {path_cost_standard}")
            
            # 设置STP模式
            if mode == 'stp':
                cli_lines.append("stp mode stp")
            elif mode == 'rstp':
                cli_lines.append("stp mode rstp")
            elif mode == 'mstp':
                cli_lines.append("stp mode mstp")
                
                # 进入MST域视图配置
                mstp_region = config.get('mstpRegion', {})
                cli_lines.append("stp region-configuration")
                
                # 配置MST域的域名
                region_name = mstp_region.get('regionName', '')
                if region_name:
                    cli_lines.append(f" region-name {region_name}")
                
                # 配置MSTP的修订级别
                revision_level = mstp_region.get('revisionLevel', '0')
                if revision_level and revision_level != '0':
                    cli_lines.append(f" revision-level {revision_level}")
                
                # 配置VLAN映射表
                vlan_mapping_mode = mstp_region.get('vlanMappingMode', 'manual')
                if vlan_mapping_mode == 'modulo':
                    # 使用模运算映射
                    modulo_value = mstp_region.get('moduloValue', '2')
                    cli_lines.append(f" vlan-mapping modulo {modulo_value}")
                else:
                    # 手动配置VLAN映射表
                    for instance in mstp_instances:
                        instance_id = instance.get('instanceId', '1')
                        vlan_list = instance.get('vlanList', '10,20')
                        if vlan_list:
                            cli_lines.append(f" instance {instance_id} vlan {vlan_list}")
                
                
                
                # 激活MST域的配置
                cli_lines.append(" active region-configuration")
                cli_lines.append("quit")
                
                # 配置MSTP实例优先级
                for instance in mstp_instances:
                    instance_id = instance.get('instanceId', '1')
                    instance_priority = instance.get('priority', '32768')
                    instance_root = instance.get('rootBridge', 'none')
                    if instance_root == 'primary':
                        cli_lines.append(f"stp instance {instance_id} root primary")
                    elif instance_root == 'secondary':
                        cli_lines.append(f"stp instance {instance_id} root secondary")
                    elif instance_priority and instance_priority != '32768':
                        cli_lines.append(f"stp instance {instance_id} priority {instance_priority}")
            
            # 根桥配置
            if root_bridge == 'primary':
                cli_lines.append("stp root primary")
            elif root_bridge == 'secondary':
                cli_lines.append("stp root secondary")
            else:
                # 设置全局优先级
                cli_lines.append(f"stp priority {priority}")
            
            # 设置定时器
            if max_age != '20':
                cli_lines.append(f"stp max-age {max_age}")
            if hello_time != '2':
                cli_lines.append(f"stp hello-time {hello_time}")
            if forward_delay != '15':
                cli_lines.append(f"stp forward-delay {forward_delay}")
            
            # 端口配置
            for port_config in port_configs:
                interface_name = port_config.get('interfaceName', 'GigabitEthernet0/0/1')
                port_priority = port_config.get('portPriority', '128')
                path_cost = port_config.get('pathCost', 'auto')
                stp_cost = port_config.get('stpCost', 'auto')
                edge_port = port_config.get('edgePort', False)
                bpdu_guard = port_config.get('bpduGuard', False)
                mstp_instance_costs = port_config.get('mstpInstanceCosts', [])
                mstp_instance_priorities = port_config.get('mstpInstancePriorities', [])
                
                cli_lines.append(f"interface {interface_name}")
                # 如果是二层接口，需要启用端口交换功能
                cli_lines.append(" portswitch")
                
                # 端口优先级配置
                if mode == 'mstp':
                    # MSTP模式下的实例端口优先级配置
                    for instance_priority in mstp_instance_priorities:
                        instance_list = instance_priority.get('instanceList', '1')
                        priority_value = instance_priority.get('priority', '128')
                        if priority_value != '128':
                            cli_lines.append(f" stp instance {instance_list} port priority {priority_value}")
                else:
                    # 非MSTP模式的端口优先级配置
                    if port_priority != '128':
                        cli_lines.append(f" stp port priority {port_priority}")
                
                # 路径开销配置
                if mode == 'mstp':
                    # MSTP模式下的实例路径开销配置
                    for instance_cost in mstp_instance_costs:
                        instance_list = instance_cost.get('instanceList', '1')
                        cost_value = instance_cost.get('cost', 'auto')
                        if cost_value != 'auto':
                            cli_lines.append(f" stp instance {instance_list} cost {cost_value}")
                    
                    # 如果没有配置实例开销，但配置了全局开销
                    if not mstp_instance_costs:
                        if stp_cost and stp_cost != 'auto':
                            cli_lines.append(f" stp cost {stp_cost}")
                        elif path_cost != 'auto':
                            cli_lines.append(f" stp cost {path_cost}")
                else:
                    # 非MSTP模式的路径开销配置
                    if stp_cost and stp_cost != 'auto':
                        cli_lines.append(f" stp cost {stp_cost}")
                    elif path_cost != 'auto':
                        cli_lines.append(f" stp cost {path_cost}")
                
                if edge_port:
                    cli_lines.append(" stp edged-port enable")
                if bpdu_guard:
                    cli_lines.append(" stp bpdu-protection")
                cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• stp pathcost-standard - 设置路径开销计算标准
  - legacy: 华为私有计算方法（推荐）
  - dot1d-1998: IEEE 802.1D-1998标准
  - dot1t: IEEE 802.1t标准
• stp mode - 设置生成树协议模式
  - stp: 标准生成树协议
  - rstp: 快速生成树协议
  - mstp: 多实例生成树协议
• stp region-configuration - 进入MST域配置视图
• region-name - 配置MST域名称（缺省情况下为设备的MAC地址）
• revision-level - 配置MSTP的修订级别（缺省情况下为0）
• instance vlan - 配置VLAN映射表（缺省情况下所有VLAN都映射到CIST即MSTI 0上）
• vlan-mapping modulo - 配置VLAN模运算映射
• active region-configuration - 激活MST域的配置
• stp root primary/secondary - 设置主/备份根桥
• stp priority - 设置桥优先级
• stp instance - 配置MSTP实例优先级
• portswitch - 启用端口交换功能（二层模式）
• stp cost - 设置端口路径开销（设置大值如20000可阻塞端口）
• stp instance cost - 设置MSTP实例端口路径开销
• stp port priority - 设置端口优先级
• stp instance port priority - 设置MSTP实例端口优先级
• stp edged-port enable - 启用边缘端口
• stp bpdu-protection - 启用BPDU保护"""

        elif self.vendor == 'h3c':
            # 设置路径开销计算标准
            cli_lines.append(f"stp pathcost-standard {path_cost_standard}")
            
            # 设置STP模式
            if mode == 'stp':
                cli_lines.append("stp mode stp")
                # 根桥配置
                if root_bridge == 'primary':
                    cli_lines.append("stp root primary")
                elif root_bridge == 'secondary':
                    cli_lines.append("stp root secondary")
                else:
                    cli_lines.append(f"stp priority {priority}")
            elif mode == 'rstp':
                cli_lines.append("stp mode rstp")
                # 根桥配置
                if root_bridge == 'primary':
                    cli_lines.append("stp root primary")
                elif root_bridge == 'secondary':
                    cli_lines.append("stp root secondary")
                else:
                    cli_lines.append(f"stp priority {priority}")
            elif mode == 'pvst':
                cli_lines.append("stp mode pvst")
                # 配置PVST VLAN
                for pvst in pvst_vlans:
                    vlan_list = pvst.get('vlanList', '10,20')
                    pvst_priority = pvst.get('priority', '32768')
                    pvst_root = pvst.get('rootBridge', 'none')
                    if pvst_root == 'primary':
                        cli_lines.append(f"stp vlan {vlan_list} root primary")
                    elif pvst_root == 'secondary':
                        cli_lines.append(f"stp vlan {vlan_list} root secondary")
                    else:
                        cli_lines.append(f"stp vlan {vlan_list} priority {pvst_priority}")
            elif mode == 'mstp':
                cli_lines.append("stp mode mstp")
                
                # 进入MST域视图配置
                mstp_region = config.get('mstpRegion', {})
                cli_lines.append("stp region-configuration")
                
                # 配置MST域的域名
                region_name = mstp_region.get('regionName', '')
                if region_name:
                    cli_lines.append(f" region-name {region_name}")
                
                # 配置MSTP的修订级别
                revision_level = mstp_region.get('revisionLevel', '0')
                if revision_level and revision_level != '0':
                    cli_lines.append(f" revision-level {revision_level}")
                
                # 配置VLAN映射表
                vlan_mapping_mode = mstp_region.get('vlanMappingMode', 'manual')
                if vlan_mapping_mode == 'modulo':
                    # 使用模运算映射
                    modulo_value = mstp_region.get('moduloValue', '2')
                    cli_lines.append(f" vlan-mapping modulo {modulo_value}")
                else:
                    # 手动配置VLAN映射表
                    for instance in mstp_instances:
                        instance_id = instance.get('instanceId', '1')
                        vlan_list = instance.get('vlanList', '10,20')
                        if vlan_list:
                            cli_lines.append(f" instance {instance_id} vlan {vlan_list}")
                
                
                
                # 激活MST域的配置
                cli_lines.append(" active region-configuration")
                cli_lines.append("quit")
                
                # 配置MSTP实例优先级
                for instance in mstp_instances:
                    instance_id = instance.get('instanceId', '1')
                    instance_priority = instance.get('priority', '32768')
                    instance_root = instance.get('rootBridge', 'none')
                    if instance_root == 'primary':
                        cli_lines.append(f"stp instance {instance_id} root primary")
                    elif instance_root == 'secondary':
                        cli_lines.append(f"stp instance {instance_id} root secondary")
                    elif instance_priority and instance_priority != '32768':
                        cli_lines.append(f"stp instance {instance_id} priority {instance_priority}")
            
            # 设置定时器
            if max_age != '20':
                cli_lines.append(f"stp max-age {max_age}")
            if hello_time != '2':
                cli_lines.append(f"stp hello-time {hello_time}")
            if forward_delay != '15':
                cli_lines.append(f"stp forward-delay {forward_delay}")
            
            # 端口配置
            for port_config in port_configs:
                interface_name = port_config.get('interfaceName', 'GigabitEthernet1/0/1')
                port_priority = port_config.get('portPriority', '128')
                path_cost = port_config.get('pathCost', 'auto')
                stp_cost = port_config.get('stpCost', 'auto')
                pvst_vlan_costs = port_config.get('pvstVlanCosts', [])
                mstp_instance_costs = port_config.get('mstpInstanceCosts', [])
                mstp_instance_priorities = port_config.get('mstpInstancePriorities', [])
                edge_port = port_config.get('edgePort', False)
                bpdu_guard = port_config.get('bpduGuard', False)
                
                cli_lines.append(f"interface {interface_name}")
                
                # 端口优先级配置
                if mode == 'mstp':
                    # MSTP模式下的实例端口优先级配置
                    for instance_priority in mstp_instance_priorities:
                        instance_list = instance_priority.get('instanceList', '1')
                        priority_value = instance_priority.get('priority', '128')
                        if priority_value != '128':
                            cli_lines.append(f" stp instance {instance_list} port priority {priority_value}")
                else:
                    # 非MSTP模式的端口优先级配置
                    if port_priority != '128':
                        cli_lines.append(f" stp port priority {port_priority}")
                
                # 根据STP模式配置路径开销
                if mode == 'stp' or mode == 'rstp':
                    if stp_cost and stp_cost != 'auto':
                        cli_lines.append(f" stp cost {stp_cost}")
                    elif path_cost != 'auto':
                        cli_lines.append(f" stp cost {path_cost}")
                elif mode == 'pvst':
                    # PVST模式的VLAN路径开销
                    for vlan_cost in pvst_vlan_costs:
                        vlan_list = vlan_cost.get('vlanList', '10')
                        cost = vlan_cost.get('cost', '20000')
                        cli_lines.append(f" stp vlan {vlan_list} cost {cost}")
                elif mode == 'mstp':
                    # MSTP模式的实例路径开销
                    for instance_cost in mstp_instance_costs:
                        instance_list = instance_cost.get('instanceList', '1')
                        cost = instance_cost.get('cost', '20000')
                        if cost != 'auto':
                            cli_lines.append(f" stp instance {instance_list} cost {cost}")
                    
                    # 如果没有配置实例开销，但配置了全局开销
                    if not mstp_instance_costs:
                        if stp_cost and stp_cost != 'auto':
                            cli_lines.append(f" stp cost {stp_cost}")
                        elif path_cost != 'auto':
                            cli_lines.append(f" stp cost {path_cost}")
                
                if edge_port:
                    cli_lines.append(" stp edge-port")
                if bpdu_guard:
                    cli_lines.append(" stp bpdu-protection")
                cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• stp pathcost-standard - 设置路径开销计算标准
  - legacy: 私有标准计算方法
  - dot1d-1998: IEEE 802.1D-1998标准
  - dot1t: IEEE 802.1t标准
• stp mode - 设置生成树协议模式
  - stp: 标准生成树协议
  - rstp: 快速生成树协议
  - pvst: Per-VLAN生成树协议（H3C）
  - mstp: 多实例生成树协议
• stp region-configuration - 进入MST域配置视图
• region-name - 配置MST域名称（缺省情况下为设备的MAC地址）
• revision-level - 配置MSTP的修订级别（缺省情况下为0）
• instance vlan - 配置VLAN映射表（缺省情况下所有VLAN都映射到CIST即MSTI 0上）
• vlan-mapping modulo - 配置VLAN模运算映射
• check region-configuration - 显示MST域的预配置信息
• active region-configuration - 激活MST域的配置
• stp root primary/secondary - 设置主/备份根桥
• stp priority - 设置根桥优先级
• stp instance - 配置MSTP实例优先级
• stp vlan - 配置PVST VLAN
• stp cost - 设置端口路径开销（设置大值如20000可阻塞端口）
• stp port priority - 设置端口优先级（0-240，步长16，缺省值128）
• stp instance cost - 设置MSTP实例端口路径开销
  格式: stp instance instance-list cost cost-value
  - instance-list: 实例列表，支持单个ID、逗号分隔列表或范围（如1,2或1-3）
  - cost-value: 路径开销值（1-200000000）或auto（自动计算）
• stp instance port priority - 设置MSTP实例端口优先级
  格式: stp instance instance-list port priority priority-value
  - instance-list: 实例列表，支持单个ID、逗号分隔列表或范围（如1,2或1-3）
  - priority-value: 端口优先级值（0-240，步长16，缺省值128）
• stp edge-port - 配置边缘端口（快速转发）
• stp bpdu-protection - 启用BPDU保护（防止环路）
• stp instance cost - 设置MSTP实例端口路径开销
• stp port priority - 设置端口优先级
• stp instance port priority - 设置MSTP实例端口优先级
• stp edge-port - 设置边缘端口
• stp bpdu-protection - 启用BPDU保护"""

        else:
            cli = "# Unsupported vendor for STP configuration"
            explanation = "不支持的厂商STP配置"

        return {"cli": cli, "explanation": explanation}

    def generate_routing_config(self, config: Dict[str, Any]) -> Dict[str, str]:
        """Generate Routing configuration (Static Routes and OSPF)"""
        static_routes = config.get('staticRoutes', [])
        ospf_config = config.get('ospf', {})
        
        cli_lines = []
        
        # 静态路由配置
        for route in static_routes:
            network = route.get('network', '')
            subnet_mask = route.get('subnetMask', '')
            next_hop = route.get('nextHop', '')
            admin_distance = route.get('adminDistance', '')
            description = route.get('description', '')
            
            if network and subnet_mask and next_hop:
                if self.vendor == 'cisco':
                    route_cmd = f"ip route {network} {subnet_mask} {next_hop}"
                    if admin_distance:
                        route_cmd += f" {admin_distance}"
                    cli_lines.append(route_cmd)
                    if description:
                        cli_lines.append(f"! {description}")
                        
                elif self.vendor == 'huawei':
                    route_cmd = f"ip route-static {network} {subnet_mask} {next_hop}"
                    if admin_distance:
                        route_cmd += f" preference {admin_distance}"
                    cli_lines.append(route_cmd)
                    if description:
                        cli_lines.append(f"# {description}")
                        
                elif self.vendor == 'h3c':
                    route_cmd = f"ip route-static {network} {subnet_mask} {next_hop}"
                    if admin_distance:
                        route_cmd += f" preference {admin_distance}"
                    cli_lines.append(route_cmd)
                    if description:
                        cli_lines.append(f"# {description}")
        
        # OSPF配置 (AC设备不支持OSPF)
        if ospf_config.get('enabled', False) and self.device_type != 'accesscontroller':
            process_id = ospf_config.get('processId', '1')
            router_id = ospf_config.get('routerId', '1.1.1.1')
            areas = ospf_config.get('areas', [])
            redistribute_static = ospf_config.get('redistributeStatic', False)
            redistribute_connected = ospf_config.get('redistributeConnected', False)
            default_route = ospf_config.get('defaultRoute', False)
            
            if self.vendor == 'cisco':
                cli_lines.append(f"router ospf {process_id}")
                cli_lines.append(f" router-id {router_id}")
                
                # 配置区域和网络
                for area in areas:
                    area_id = area.get('areaId', '0')
                    area_type = area.get('areaType', 'standard')
                    networks = area.get('networks', [])
                    
                    # 配置区域类型
                    if area_type == 'stub':
                        cli_lines.append(f" area {area_id} stub")
                    elif area_type == 'nssa':
                        cli_lines.append(f" area {area_id} nssa")
                    
                    # 配置网络
                    for network in networks:
                        net_addr = network.get('network', '')
                        wildcard = network.get('wildcardMask', '')
                        if net_addr and wildcard:
                            cli_lines.append(f" network {net_addr} {wildcard} area {area_id}")
                
                # 重分发配置
                if redistribute_static:
                    cli_lines.append(" redistribute static")
                if redistribute_connected:
                    cli_lines.append(" redistribute connected")
                if default_route:
                    cli_lines.append(" default-information originate")
                
                cli_lines.append("exit")
                
            elif self.vendor == 'huawei':
                cli_lines.append(f"ospf {process_id} router-id {router_id}")
                
                # 配置区域
                for area in areas:
                    area_id = area.get('areaId', '0')
                    area_type = area.get('areaType', 'standard')
                    networks = area.get('networks', [])
                    
                    cli_lines.append(f" area {area_id}")
                    
                    # 配置区域类型
                    if area_type == 'stub':
                        cli_lines.append("  stub")
                    elif area_type == 'nssa':
                        cli_lines.append("  nssa")
                    
                    # 配置网络
                    for network in networks:
                        net_addr = network.get('network', '')
                        wildcard = network.get('wildcardMask', '')
                        if net_addr and wildcard:
                            cli_lines.append(f"  network {net_addr} {wildcard}")
                    
                    cli_lines.append(" quit")
                
                # 重分发配置
                if redistribute_static:
                    cli_lines.append(" import-route static")
                if redistribute_connected:
                    cli_lines.append(" import-route direct")
                if default_route:
                    cli_lines.append(" default-route-advertise")
                
                cli_lines.append("quit")
                
            elif self.vendor == 'h3c':
                cli_lines.append(f"ospf {process_id} router-id {router_id}")
                
                # 配置区域
                for area in areas:
                    area_id = area.get('areaId', '0')
                    area_type = area.get('areaType', 'standard')
                    networks = area.get('networks', [])
                    
                    cli_lines.append(f" area {area_id}")
                    
                    # 配置区域类型
                    if area_type == 'stub':
                        cli_lines.append("  stub")
                    elif area_type == 'nssa':
                        cli_lines.append("  nssa")
                    
                    # 配置网络
                    for network in networks:
                        net_addr = network.get('network', '')
                        wildcard = network.get('wildcardMask', '')
                        if net_addr and wildcard:
                            cli_lines.append(f"  network {net_addr} {wildcard}")
                    
                    cli_lines.append(" quit")
                
                # 重分发配置
                if redistribute_static:
                    cli_lines.append(" import-route static")
                if redistribute_connected:
                    cli_lines.append(" import-route direct")
                if default_route:
                    cli_lines.append(" default-route-advertise")
                
                cli_lines.append("quit")
        
        cli = "\n".join(cli_lines)
        
        if self.vendor == 'cisco':
            explanation = """• ip route - 配置静态路由
  格式: ip route 目标网络 子网掩码 下一跳 [管理距离]
• router ospf - 启动OSPF路由进程
• router-id - 设置OSPF路由器ID
• network - 宣告网络到OSPF区域
• area stub - 配置Stub区域
• area nssa - 配置NSSA区域
• redistribute static - 重分发静态路由
• redistribute connected - 重分发直连路由
• default-information originate - 发布默认路由"""
        elif self.vendor == 'huawei':
            explanation = """• ip route-static - 配置静态路由
  格式: ip route-static 目标网络 子网掩码 下一跳 [preference 管理距离]
• ospf router-id - 启动OSPF进程并设置路由器ID
• area - 进入OSPF区域配置视图
• network - 在区域中宣告网络
• stub - 配置Stub区域
• nssa - 配置NSSA区域
• import-route static - 引入静态路由
• import-route direct - 引入直连路由
• default-route-advertise - 发布默认路由"""
        elif self.vendor == 'h3c':
            explanation = """• ip route-static - 配置静态路由
  格式: ip route-static 目标网络 子网掩码 下一跳 [preference 管理距离]
• ospf router-id - 启动OSPF进程并设置路由器ID
• area - 进入OSPF区域配置视图
• network - 在区域中宣告网络
• stub - 配置Stub区域
• nssa - 配置NSSA区域
• import-route static - 引入静态路由
• import-route direct - 引入直连路由
• default-route-advertise - 发布默认路由"""
        else:
            explanation = "路由配置包括静态路由和OSPF动态路由协议"

        return {"cli": cli, "explanation": explanation}

    def generate_vrrp_config(self, config):
        """生成VRRP配置"""
        interface_name = config.get('interfaceName', 'GigabitEthernet0/0/1')
        groups = config.get('groups', [])
        
        cli_lines = []
        
        if self.vendor == 'cisco':
            cli_lines.append(f"interface {interface_name}")
            
            for group in groups:
                group_id = group.get('groupId', '1')
                virtual_ip = group.get('virtualIp', '192.168.1.1')
                priority = group.get('priority', '100')
                preempt = group.get('preempt', True)
                auth_type = group.get('authType', 'none')
                auth_key = group.get('authKey', '')
                advertisement_interval = group.get('advertisementInterval', '1')
                description = group.get('description', '')
                
                # 配置虚拟IP
                cli_lines.append(f" vrrp {group_id} ip {virtual_ip}")
                
                # 配置优先级
                if priority != '100':
                    cli_lines.append(f" vrrp {group_id} priority {priority}")
                
                # 配置抢占
                if preempt:
                    cli_lines.append(f" vrrp {group_id} preempt")
                else:
                    cli_lines.append(f" no vrrp {group_id} preempt")
                
                # 配置认证
                if auth_type == 'simple' and auth_key:
                    cli_lines.append(f" vrrp {group_id} authentication text {auth_key}")
                elif auth_type == 'md5' and auth_key:
                    cli_lines.append(f" vrrp {group_id} authentication md5 key-string {auth_key}")
                
                # 配置通告间隔
                if advertisement_interval != '1':
                    cli_lines.append(f" vrrp {group_id} timers advertise {advertisement_interval}")
                
                # 配置描述
                if description:
                    cli_lines.append(f" vrrp {group_id} description {description}")
            
            cli_lines.append("exit")
            
            cli = "\n".join(cli_lines)
            explanation = """• vrrp group ip - 配置VRRP组虚拟IP地址
• vrrp group priority - 设置VRRP组优先级（1-254，默认100）
• vrrp group preempt - 启用抢占模式（优先级高的设备抢占Master角色）
• no vrrp group preempt - 禁用抢占模式
• vrrp group authentication text - 配置简单文本认证
• vrrp group authentication md5 - 配置MD5认证
• vrrp group timers advertise - 设置VRRP通告间隔（秒）
• vrrp group description - 配置VRRP组描述"""

        elif self.vendor == 'huawei':
            cli_lines.append(f"interface {interface_name}")
            
            for group in groups:
                group_id = group.get('groupId', '1')
                virtual_ip = group.get('virtualIp', '192.168.1.1')
                priority = group.get('priority', '100')
                preempt = group.get('preempt', True)
                auth_type = group.get('authType', 'none')
                auth_key = group.get('authKey', '')
                advertisement_interval = group.get('advertisementInterval', '1')
                description = group.get('description', '')
                
                # 配置虚拟IP
                cli_lines.append(f" vrrp vrid {group_id} virtual-ip {virtual_ip}")
                
                # 配置优先级
                if priority != '100':
                    cli_lines.append(f" vrrp vrid {group_id} priority {priority}")
                
                # 配置抢占
                if preempt:
                    cli_lines.append(f" vrrp vrid {group_id} preempt-mode")
                else:
                    cli_lines.append(f" undo vrrp vrid {group_id} preempt-mode")
                
                # 配置认证
                if auth_type == 'simple' and auth_key:
                    cli_lines.append(f" vrrp vrid {group_id} authentication-mode simple {auth_key}")
                elif auth_type == 'md5' and auth_key:
                    cli_lines.append(f" vrrp vrid {group_id} authentication-mode md5 {auth_key}")
                
                # 配置通告间隔
                if advertisement_interval != '1':
                    cli_lines.append(f" vrrp vrid {group_id} timer advertise {advertisement_interval}")
                
                # 配置描述
                if description:
                    cli_lines.append(f" description {description}")
            
            cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• vrrp vrid virtual-ip - 配置VRRP组虚拟IP地址
• vrrp vrid priority - 设置VRRP组优先级（1-254，默认100）
• vrrp vrid preempt-mode - 启用抢占模式
• undo vrrp vrid preempt-mode - 禁用抢占模式
• vrrp vrid authentication-mode simple - 配置简单认证
• vrrp vrid authentication-mode md5 - 配置MD5认证
• vrrp vrid timer advertise - 设置VRRP通告间隔（秒）
• description - 配置接口描述"""

        elif self.vendor == 'h3c':
            cli_lines.append(f"interface {interface_name}")
            
            for group in groups:
                group_id = group.get('groupId', '1')
                virtual_ip = group.get('virtualIp', '192.168.1.1')
                priority = group.get('priority', '100')
                preempt = group.get('preempt', True)
                auth_type = group.get('authType', 'none')
                auth_key = group.get('authKey', '')
                advertisement_interval = group.get('advertisementInterval', '1')
                description = group.get('description', '')
                
                # 配置虚拟IP
                cli_lines.append(f" vrrp vrid {group_id} virtual-ip {virtual_ip}")
                
                # 配置优先级
                if priority != '100':
                    cli_lines.append(f" vrrp vrid {group_id} priority {priority}")
                
                # 配置抢占
                if preempt:
                    cli_lines.append(f" vrrp vrid {group_id} preempt-mode")
                else:
                    cli_lines.append(f" undo vrrp vrid {group_id} preempt-mode")
                
                # 配置认证
                if auth_type == 'simple' and auth_key:
                    cli_lines.append(f" vrrp vrid {group_id} authentication-mode simple plain {auth_key}")
                elif auth_type == 'md5' and auth_key:
                    cli_lines.append(f" vrrp vrid {group_id} authentication-mode md5 plain {auth_key}")
                
                # 配置通告间隔
                if advertisement_interval != '1':
                    cli_lines.append(f" vrrp vrid {group_id} timer advertise {advertisement_interval}")
                
                # 配置描述
                if description:
                    cli_lines.append(f" description {description}")
            
            cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• vrrp vrid virtual-ip - 配置VRRP组虚拟IP地址
• vrrp vrid priority - 设置VRRP组优先级（1-254，默认100）
• vrrp vrid preempt-mode - 启用抢占模式
• undo vrrp vrid preempt-mode - 禁用抢占模式
• vrrp vrid authentication-mode simple plain - 配置简单认证
• vrrp vrid authentication-mode md5 plain - 配置MD5认证
• vrrp vrid timer advertise - 设置VRRP通告间隔（秒）
• description - 配置接口描述"""

        else:
            cli = "# VRRP configuration not supported for this vendor"
            explanation = "此厂商不支持VRRP配置"

        return {"cli": cli, "explanation": explanation}

    def generate_wireless_config(self, config):
        """生成无线配置"""
        country_code = config.get('countryCode', 'CN')
        ap_groups = config.get('apGroups', [])
        radio_profiles = config.get('radioProfiles', [])
        security_profiles = config.get('securityProfiles', [])
        ap_devices = config.get('apDevices', [])
        
        cli_lines = []
        
        if self.vendor == 'cisco':
            # Cisco WLC配置
            cli_lines.append(f"config country {country_code}")
            
            # 配置WLAN
            for i, security_profile in enumerate(security_profiles):
                wlan_id = i + 1
                ssid = security_profile.get('ssid', 'Corporate-WiFi')
                auth_mode = security_profile.get('authMode', 'wpa2-psk')
                password = security_profile.get('password', '')
                encryption = security_profile.get('encryption', 'aes')
                hide_ssid = security_profile.get('hideSsid', False)
                max_clients = security_profile.get('maxClients', '100')
                
                cli_lines.append(f"config wlan create {wlan_id} {ssid}")
                cli_lines.append(f"config wlan enable {wlan_id}")
                
                if auth_mode == 'wpa2-psk':
                    cli_lines.append(f"config wlan security wpa akm psk enable {wlan_id}")
                    cli_lines.append(f"config wlan security wpa akm psk set-key ascii {password} {wlan_id}")
                elif auth_mode == 'wpa3-psk':
                    cli_lines.append(f"config wlan security wpa akm sae enable {wlan_id}")
                    cli_lines.append(f"config wlan security wpa akm sae set-key ascii {password} {wlan_id}")
                elif auth_mode == 'open':
                    cli_lines.append(f"config wlan security open {wlan_id}")
                
                if encryption == 'aes':
                    cli_lines.append(f"config wlan security wpa wpa2 ciphers aes enable {wlan_id}")
                
                if hide_ssid:
                    cli_lines.append(f"config wlan broadcast-ssid disable {wlan_id}")
                
                cli_lines.append(f"config wlan max-clients {max_clients} {wlan_id}")
            
            # 配置AP组
            for ap_group in ap_groups:
                group_name = ap_group.get('groupName', 'default-group')
                description = ap_group.get('description', '')
                cli_lines.append(f"config ap-group {group_name}")
                if description:
                    cli_lines.append(f"config ap-group description {description} {group_name}")
            
            cli = "\n".join(cli_lines)
            explanation = """• config country - 设置国家代码
• config wlan create - 创建WLAN
• config wlan enable - 启用WLAN
• config wlan security wpa akm psk - 配置WPA2-PSK认证
• config wlan security wpa akm sae - 配置WPA3-SAE认证
• config wlan security open - 配置开放认证
• config wlan security wpa wpa2 ciphers aes - 配置AES加密
• config wlan broadcast-ssid disable - 隐藏SSID
• config wlan max-clients - 设置最大客户端数量
• config ap-group - 配置AP组"""

        elif self.vendor == 'huawei':
            # 华为AC配置
            cli_lines.append(f"country-code {country_code}")
            
            # 配置安全模板
            for security_profile in security_profiles:
                profile_name = security_profile.get('profileName', 'default-security')
                ssid = security_profile.get('ssid', 'Corporate-WiFi')
                auth_mode = security_profile.get('authMode', 'wpa2-psk')
                password = security_profile.get('password', '')
                encryption = security_profile.get('encryption', 'aes')
                hide_ssid = security_profile.get('hideSsid', False)
                max_clients = security_profile.get('maxClients', '100')
                
                cli_lines.append(f"security-profile name {profile_name}")
                
                if auth_mode == 'wpa2-psk':
                    cli_lines.append(" security wpa2 psk pass-phrase")
                    cli_lines.append(f" set-pass-phrase {password}")
                elif auth_mode == 'wpa3-psk':
                    cli_lines.append(" security wpa3 psk pass-phrase")
                    cli_lines.append(f" set-pass-phrase {password}")
                elif auth_mode == 'open':
                    cli_lines.append(" security open")
                
                if encryption == 'aes':
                    cli_lines.append(" security wpa-wpa2 cipher-suite ccmp")
                
                cli_lines.append("quit")
                
                # 配置SSID模板
                cli_lines.append(f"ssid-profile name {profile_name}")
                cli_lines.append(f" ssid {ssid}")
                if hide_ssid:
                    cli_lines.append(" ssid hide enable")
                cli_lines.append(f" max-user-number {max_clients}")
                cli_lines.append("quit")
            
            # 配置射频模板
            for radio_profile in radio_profiles:
                profile_name = radio_profile.get('profileName', 'default-radio')
                band = radio_profile.get('band', '2.4G')
                channel = radio_profile.get('channel', 'auto')
                channel_width = radio_profile.get('channelWidth', '20')
                power = radio_profile.get('power', 'auto')
                mode = radio_profile.get('mode', '802.11n')
                
                cli_lines.append(f"radio-profile name {profile_name}")
                
                if band == '2.4G':
                    cli_lines.append(" radio 0")
                else:
                    cli_lines.append(" radio 1")
                
                if channel != 'auto':
                    cli_lines.append(f" channel {channel}")
                
                cli_lines.append(f" channel-width {channel_width}")
                
                if power != 'auto':
                    cli_lines.append(f" power {power}")
                
                if mode == '802.11n':
                    cli_lines.append(" 11n enable")
                elif mode == '802.11ac':
                    cli_lines.append(" 11ac enable")
                elif mode == '802.11ax':
                    cli_lines.append(" 11ax enable")
                
                cli_lines.append("quit")
            
            # 配置AP组
            for ap_group in ap_groups:
                group_name = ap_group.get('groupName', 'default-group')
                description = ap_group.get('description', '')
                radio_2g = ap_group.get('radioProfile2G', 'default-2g')
                radio_5g = ap_group.get('radioProfile5G', 'default-5g')
                security_prof = ap_group.get('securityProfile', 'default-security')
                vlan_id = ap_group.get('vlanId', '1')
                
                cli_lines.append(f"ap-group name {group_name}")
                if description:
                    cli_lines.append(f" description {description}")
                cli_lines.append(f" radio-profile 0 {radio_2g}")
                cli_lines.append(f" radio-profile 1 {radio_5g}")
                cli_lines.append(f" security-profile {security_prof}")
                cli_lines.append(f" ssid-profile {security_prof}")
                cli_lines.append(f" vap-profile {security_prof} wlan 1 radio 0")
                cli_lines.append(f" vap-profile {security_prof} wlan 1 radio 1")
                cli_lines.append(f" vlan {vlan_id}")
                cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• country-code - 设置国家代码
• security-profile - 配置安全模板
• security wpa2 psk - 配置WPA2-PSK认证
• security wpa3 psk - 配置WPA3-PSK认证
• set-pass-phrase - 设置密码
• security wpa-wpa2 cipher-suite ccmp - 配置AES加密
• ssid-profile - 配置SSID模板
• ssid - 设置SSID名称
• ssid hide enable - 隐藏SSID
• max-user-number - 设置最大用户数
• radio-profile - 配置射频模板
• channel - 设置信道
• channel-width - 设置信道宽度
• power - 设置发射功率
• 11n/11ac/11ax enable - 启用对应协议
• ap-group - 配置AP组
• radio-profile - 关联射频模板
• security-profile - 关联安全模板
• vlan - 设置VLAN"""

        elif self.vendor == 'h3c':
            # H3C AC配置
            cli_lines.append(f"wlan country-code {country_code}")
            
            # 配置服务模板
            for security_profile in security_profiles:
                profile_name = security_profile.get('profileName', 'default-security')
                ssid = security_profile.get('ssid', 'Corporate-WiFi')
                auth_mode = security_profile.get('authMode', 'wpa2-psk')
                password = security_profile.get('password', '')
                encryption = security_profile.get('encryption', 'aes')
                hide_ssid = security_profile.get('hideSsid', False)
                max_clients = security_profile.get('maxClients', '100')
                
                cli_lines.append(f"wlan service-template {profile_name}")
                cli_lines.append(f" ssid {ssid}")
                
                if auth_mode == 'wpa2-psk':
                    cli_lines.append(" akm mode wpa2-psk")
                    cli_lines.append(f" preshared-key pass-phrase {password}")
                elif auth_mode == 'wpa3-psk':
                    cli_lines.append(" akm mode wpa3-sae")
                    cli_lines.append(f" preshared-key pass-phrase {password}")
                elif auth_mode == 'open':
                    cli_lines.append(" akm mode none")
                
                if encryption == 'aes':
                    cli_lines.append(" cipher-suite ccmp")
                
                if hide_ssid:
                    cli_lines.append(" ssid hide")
                
                cli_lines.append(f" max-user {max_clients}")
                cli_lines.append("quit")
            
            # 配置射频模板
            for radio_profile in radio_profiles:
                profile_name = radio_profile.get('profileName', 'default-radio')
                band = radio_profile.get('band', '2.4G')
                channel = radio_profile.get('channel', 'auto')
                channel_width = radio_profile.get('channelWidth', '20')
                power = radio_profile.get('power', 'auto')
                mode = radio_profile.get('mode', '802.11n')
                
                cli_lines.append(f"wlan radio-template {profile_name}")
                
                if channel != 'auto':
                    cli_lines.append(f" channel {channel}")
                
                cli_lines.append(f" channel-bandwidth {channel_width}")
                
                if power != 'auto':
                    cli_lines.append(f" power {power}")
                
                if mode == '802.11n':
                    cli_lines.append(" 11n enable")
                elif mode == '802.11ac':
                    cli_lines.append(" 11ac enable")
                elif mode == '802.11ax':
                    cli_lines.append(" 11ax enable")
                
                cli_lines.append("quit")
            
            # 配置AP组
            for ap_group in ap_groups:
                group_name = ap_group.get('groupName', 'default-group')
                description = ap_group.get('description', '')
                radio_2g = ap_group.get('radioProfile2G', 'default-2g')
                radio_5g = ap_group.get('radioProfile5G', 'default-5g')
                security_prof = ap_group.get('securityProfile', 'default-security')
                vlan_id = ap_group.get('vlanId', '1')
                
                cli_lines.append(f"wlan ap-group {group_name}")
                if description:
                    cli_lines.append(f" description {description}")
                cli_lines.append(f" radio 1 radio-template {radio_2g}")
                cli_lines.append(f" radio 2 radio-template {radio_5g}")
                cli_lines.append(f" service-template {security_prof} vlan {vlan_id} radio 1")
                cli_lines.append(f" service-template {security_prof} vlan {vlan_id} radio 2")
                cli_lines.append("quit")
            
            cli = "\n".join(cli_lines)
            explanation = """• wlan country-code - 设置国家代码
• wlan service-template - 配置服务模板
• ssid - 设置SSID名称
• akm mode wpa2-psk - 配置WPA2-PSK认证
• akm mode wpa3-sae - 配置WPA3-SAE认证
• preshared-key pass-phrase - 设置预共享密钥
• cipher-suite ccmp - 配置AES加密
• ssid hide - 隐藏SSID
• max-user - 设置最大用户数
• wlan radio-template - 配置射频模板
• channel - 设置信道
• channel-bandwidth - 设置信道宽度
• power - 设置发射功率
• 11n/11ac/11ax enable - 启用对应协议
• wlan ap-group - 配置AP组
• radio radio-template - 关联射频模板
• service-template - 关联服务模板"""

        else:
            cli = "# Wireless configuration not supported for this vendor"
            explanation = "此厂商不支持无线配置"

        return {"cli": cli, "explanation": explanation}

def main():
    parser = argparse.ArgumentParser(description='Generate network device configuration')
    parser.add_argument('--vendor', required=True, help='Device vendor (cisco, huawei, h3c)')
    parser.add_argument('--device-type', required=True, help='Device type (router, l3switch, l2switch)')
    parser.add_argument('--feature', required=True, help='Feature to configure (dhcp, vlan, link_aggregation, stp, routing)')
    parser.add_argument('--config', required=True, help='Configuration parameters as JSON string')
    
    args = parser.parse_args()
    
    try:
        config_data = json.loads(args.config)
        generator = ConfigGenerator(args.vendor, args.device_type)
        
        if args.feature.lower() == 'dhcp':
            result = generator.generate_dhcp_config(config_data)
        elif args.feature.lower() == 'vlan':
            result = generator.generate_vlan_config(config_data)
        elif args.feature.lower() == 'link_aggregation':
            result = generator.generate_link_aggregation_config(config_data)
        elif args.feature.lower() == 'stp':
            result = generator.generate_stp_config(config_data)
        elif args.feature.lower() == 'routing':
            result = generator.generate_routing_config(config_data)
        elif args.feature.lower() == 'vrrp':
            result = generator.generate_vrrp_config(config_data)
        elif args.feature.lower() == 'wireless':
            result = generator.generate_wireless_config(config_data)
        else:
            result = {"cli": "# Unsupported feature", "explanation": "不支持的功能"}
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except json.JSONDecodeError:
        print(json.dumps({"cli": "# Invalid JSON configuration", "explanation": "配置参数JSON格式错误"}))
    except Exception as e:
        print(json.dumps({"cli": f"# Error: {str(e)}", "explanation": f"生成配置时出错: {str(e)}"}))

if __name__ == '__main__':
    main()