
export const COMMAND_CATEGORIES: Record<string, string[]> = {
    '设备基础信息巡检': [
        'display version', 
        'display startup',
        'display license',
        'display clock',
        'dir flash:',
        'display current-configuration',
        'display debugging',
    ],
    '设备运行情况巡检': [
        'display device',
        'display fan',
        'display power',
        'display cpu-usage',
        'display memory',
        'display logbuffer',
        'display ftp-server',
    ],
    '端口内容巡检': [
        'display ip interface brief',
        'display current-configuration interface',
        'display interface brief',
        'display interface',
    ],
    '业务运行巡检': [
        'display mac-address',
        'display ip routing-table',
        'display vrrp',
        'display vrrp statistics',
        'display current-configuration | include car',
        'display stp brief',
        'display stp region-configuration',
        'display ospf peer',
        'display isis peer',
        'display current-configuration configuration ospf',
        'display router id',
        'display ospf vlink',
        'display current-configuration configuration isis',
        'display current-configuration configuration bgp',
        'display vlan',
    ]
};

export const categories = Object.keys(COMMAND_CATEGORIES);
