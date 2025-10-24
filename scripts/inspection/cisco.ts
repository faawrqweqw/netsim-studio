
export const COMMAND_CATEGORIES: Record<string, string[]> = {
    '基本巡检': [
        'show version', 
        'show ip interface brief', 
        'show running-config | include hostname',
        'show inventory',
        'show interfaces status',
        'show cdp neighbors detail',
        'show log | include %'
    ],
    '设备运行情况巡检': [
        'show processes cpu sorted | include CPU utilization',
        'show memory summary',
        'show environment all'
    ]
};

export const categories = Object.keys(COMMAND_CATEGORIES);