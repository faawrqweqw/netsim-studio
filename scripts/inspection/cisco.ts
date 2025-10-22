
export const COMMAND_CATEGORIES: Record<string, string[]> = {
    '基本巡检': [
        'show version', 
        'show ip interface brief', 
        'show running-config | include hostname',
        'show inventory',
        'show interfaces status',
        'show cdp neighbors detail',
        'show log | include %'
    ]
};

export const categories = Object.keys(COMMAND_CATEGORIES);
