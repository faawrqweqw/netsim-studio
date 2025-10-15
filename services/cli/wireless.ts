import { WirelessConfig, WirelessServiceTemplate, APDevice, APGroup, SecurityProfile, SSIDProfile, VAPProfile } from '../../types';

const generateH3cWirelessCli = (config: WirelessConfig): string => {
    let cli = '';
    
    // 1. Service Templates
    config.serviceTemplates.forEach((st: WirelessServiceTemplate) => {
        cli += `wlan service-template "${st.templateName}"\n`;
        cli += ` ssid "${st.ssid}"\n`;
        if (st.ssidHide) cli += ' beacon ssid-hide\n';
        if (st.description) cli += ` description "${st.description}"\n`;
        if (st.defaultVlan) cli += ` vlan ${st.defaultVlan}\n`;
        if (st.maxClients) cli += ` client max-count ${st.maxClients}\n`;

        if (st.authMode === 'static-psk') {
            cli += ' akm mode psk\n';
            if (st.pskPassword) {
                const pskType = st.pskType === 'rawkey' ? 'raw-key' : 'pass-phrase';
                cli += ` preshared-key ${pskType} simple ${st.pskPassword}\n`;
            }
            if (st.securityMode === 'wpa') {
                cli += ' security-ie wpa\n cipher-suite tkip\n';
            } else if (st.securityMode === 'wpa2') {
                cli += ' security-ie rsn\n cipher-suite ccmp\n';
            } else if (st.securityMode === 'wpa-wpa2') {
                cli += ' security-ie wpa\n security-ie rsn\n cipher-suite tkip\n cipher-suite ccmp\n';
            }
        } else if (st.authMode === 'static-wep') {
            cli += ` wep key ${st.wepKeyId || '1'} ${st.wepKeyType || 'passphrase'} simple ${st.wepPassword || ''}\n`;
        }
        
        if (st.enabled) cli += ' service-template enable\n';
        cli += 'quit\n\n';
    });

    // 2. Define Manual APs
    config.apDevices.forEach((ap: APDevice) => {
        if (ap.serialNumber && ap.apName) {
            cli += `wlan ap "${ap.apName}" model "${ap.model || 'WA6320-HCL'}"\n`;
            cli += ` serial-id ${ap.serialNumber}\n`;
            if (ap.description) cli += ` description "${ap.description}"\n`;
            cli += 'quit\n\n';
        }
    });

    // 3. Configure AP Groups
    config.apGroups.forEach((ag: APGroup) => {
        cli += `wlan ap-group "${ag.groupName}"\n`;
        if (ag.description) cli += ` description "${ag.description}"\n`;
        
        // Associate APs with the group
        const apsInGroup = config.apDevices.filter(ap => ap.groupName === ag.groupName && ap.apName);
        if (apsInGroup.length > 0) {
            apsInGroup.forEach(ap => {
                cli += ` ap "${ap.apName}"\n`;
            });
        }
        // 在循环结束后添加 quit 命令
        cli += "quit\n";
        cli += `wlan ap-group "${ag.groupName}"\n`;
        const apModelsInGroup = [...new Set(config.apDevices.filter(ap => ap.groupName === ag.groupName && ap.model).map(ap => ap.model))];

        apModelsInGroup.forEach(model => {
            cli += ` ap-model "${model}"\n`;
            // Radio 1 (5G)
            if (ag.radio5G?.enabled) {
                cli += '  radio 1\n';
                cli += `   channel ${ag.radio5G.channel}\n`;
                cli += `   max-power ${ag.radio5G.power}\n`;
                ag.serviceTemplates.forEach(stName => {
                    const st = config.serviceTemplates.find(s => s.templateName === stName);
                    if(st) cli += `   service-template "${stName}" vlan ${st.defaultVlan}\n`;
                });
                cli += '   radio enable\n  quit\n';
            }
            // Radio 2 (2.4G)
            if (ag.radio2G?.enabled) {
                cli += '  radio 2\n';
                cli += `   channel ${ag.radio2G.channel}\n`;
                cli += `   max-power ${ag.radio2G.power}\n`;
                ag.serviceTemplates.forEach(stName => {
                    const st = config.serviceTemplates.find(s => s.templateName === stName);
                    if(st) cli += `   service-template "${stName}" vlan ${st.defaultVlan}\n`;
                });
                cli += '   radio enable\n  quit\n';
            }
            cli += ' quit\n';
        });
        cli += 'quit\n\n';
    });

    return cli.trim();
};

const generateHuaweiWirelessCli = (config: WirelessConfig): string => {
    let cli = 'wlan\n';
    // 1. Global AC Config
    if (config.acConfig.acSourceInterface) {
        cli += ` ac-source interface ${config.acConfig.acSourceInterface}\n`;
    }
    if (config.acConfig.countryCode) {
        cli += ` country-code ${config.acConfig.countryCode}\n`;
    }
    if (config.acConfig.apAuthMode) {
        cli += ` ap auth-mode ${config.acConfig.apAuthMode}-auth\n`;
    }

    // 2. Security Profiles
    config.securityProfiles.forEach((sp: SecurityProfile) => {
        cli += `security-profile name "${sp.profileName}"\n`;
        if (sp.securityType === 'wpa2-psk') {
            cli += ` security wpa2 psk pass-phrase ${sp.psk} aes\n`;
        }
        cli += 'quit\n';
    });

    // 3. SSID Profiles
    config.ssidProfiles.forEach((sp: SSIDProfile) => {
        cli += `ssid-profile name "${sp.profileName}"\n`;
        cli += ` ssid "${sp.ssid}"\n`;
        cli += 'quit\n';
    });

    // 4. VAP Profiles
    config.vapProfiles.forEach((vp: VAPProfile) => {
        cli += `vap-profile name "${vp.profileName}"\n`;
        if (vp.securityProfile) cli += ` security-profile "${vp.securityProfile}"\n`;
        if (vp.ssidProfile) cli += ` ssid-profile "${vp.ssidProfile}"\n`;
        if (vp.vlanId) cli += ` service-vlan vlan-id ${vp.vlanId}\n`;
        if (vp.forwardMode) cli += ` forward-mode ${vp.forwardMode}\n`;
        cli += 'quit\n';
    });

    // 5. AP Groups
    config.apGroups.forEach((ag: APGroup) => {
        cli += `ap-group name "${ag.groupName}"\n`;
        if (ag.description) cli += ` description "${ag.description}"\n`;
        
        (ag.vapBindings || []).forEach(binding => {
            cli += ` vap-profile "${binding.vapProfileName}" wlan 1 radio ${binding.radio}\n`;
        });

        cli += 'quit\n';
    });

    // 6. AP Devices
    config.apDevices.forEach((ap: APDevice) => {
        cli += `ap-auth-mac ${ap.macAddress}\n`;
        cli += ` ap-mac ${ap.macAddress} ap-name "${ap.apName}"\n`;
        if(ap.groupName) cli += ` ap-mac ${ap.macAddress} ap-group "${ap.groupName}"\n`;
    });

    cli += 'return\n';
    return cli.trim();
};

export const generateWirelessCli = (vendor: string, config: WirelessConfig): { cli: string; explanation: string } => {
    let cli = '';
    if (vendor.toLowerCase() === 'h3c') {
        cli = generateH3cWirelessCli(config);
    } else if (vendor.toLowerCase() === 'huawei') {
        cli = generateHuaweiWirelessCli(config);
    } else {
        cli = '# Wireless configuration for this vendor is not yet supported.';
    }
    return { cli, explanation: "Wireless configuration generated locally." };
}
