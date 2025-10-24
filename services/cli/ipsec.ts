
import { Node, IPsecConfig, Vendor, DeviceType, IKEKeychain, IPsecPolicy } from '../../types';

const generateH3cIpsecCli = (config: Node['config']): string => {
    const { ipsec: ipsecConfig, acl: aclConfig } = config;
    let cli = '';

    // 1. Transform Sets
    ipsecConfig.transformSets.forEach(ts => {
        if (!ts.name) return;
        cli += `ipsec transform-set ${ts.name}\n`;
        if (ts.protocol) cli += ` protocol ${ts.protocol}\n`;
        if (ts.encapsulationMode && ts.encapsulationMode !== 'auto') cli += ` encapsulation-mode ${ts.encapsulationMode}\n`;
        if (ts.espEncryption) cli += ` esp encryption-algorithm ${ts.espEncryption}\n`;
        if (ts.espAuth) cli += ` esp authentication-algorithm ${ts.espAuth}\n`;
        if (ts.ahAuth) cli += ` ah authentication-algorithm ${ts.ahAuth}\n`;
        cli += 'quit\n\n';
    });

    // 2. IKE Keychains
    ipsecConfig.ikeKeychains.forEach(kc => {
        if (!kc.name) return;
        cli += `ike keychain ${kc.name}\n`;
        kc.preSharedKeys.forEach(psk => {
            if (psk.address && psk.key) {
                 cli += ` pre-shared-key address ${psk.address} ${psk.mask || '0'} key simple ${psk.key}\n`;
            }
        });
        cli += 'quit\n\n';
    });

    // 3. IKE Profiles
    ipsecConfig.ikeProfiles.forEach(prof => {
        if (!prof.name) return;
        cli += `ike profile ${prof.name}\n`;
        const keychain = ipsecConfig.ikeKeychains.find(k => k.id === prof.keychainId);
        if (keychain) cli += ` keychain ${keychain.name}\n`;
        if (prof.localIdentity) cli += ` local-identity ${prof.localIdentity}\n`;
        if (prof.matchRemoteAddress) cli += ` match remote identity address ${prof.matchRemoteAddress}\n`;
        cli += 'quit\n\n';
    });
    
    // 4. IPsec Policies
    ipsecConfig.policies.forEach(p => {
        if (!p.name || !p.seqNumber) return;
        cli += `ipsec policy ${p.name} ${p.seqNumber} ${p.mode}\n`;
        const acl = aclConfig.acls.find(a => a.id === p.aclId);
        if (acl) cli += ` security acl ${acl.number}\n`;
        
        p.transformSetIds.forEach(tsId => {
            const ts = ipsecConfig.transformSets.find(t => t.id === tsId);
            if (ts) cli += ` transform-set ${ts.name}\n`;
        });
        
        if (p.remoteAddress) cli += ` remote-address ${p.remoteAddress}\n`;
        if (p.localAddress) cli += ` local-address ${p.localAddress}\n`;
        
        if (p.mode === 'isakmp' && p.ikeProfileId) {
            const profile = ipsecConfig.ikeProfiles.find(ip => ip.id === p.ikeProfileId);
            if (profile) cli += ` ike-profile ${profile.name}\n`;
        }
        
        if (p.mode === 'manual' && p.manualSA) {
            const transformSet = ipsecConfig.transformSets.find(ts => p.transformSetIds.includes(ts.id));
            const protocol = transformSet?.protocol || 'esp';

            if ((protocol === 'esp' || protocol === 'ah-esp') && p.manualSA.esp) {
                cli += ` sa spi inbound esp ${p.manualSA.esp.inboundSpi}\n`;
                cli += ` sa string-key inbound esp simple ${p.manualSA.esp.inboundKey}\n`;
                cli += ` sa spi outbound esp ${p.manualSA.esp.outboundSpi}\n`;
                cli += ` sa string-key outbound esp simple ${p.manualSA.esp.outboundKey}\n`;
            }
            if ((protocol === 'ah' || protocol === 'ah-esp') && p.manualSA.ah) {
                cli += ` sa spi inbound ah ${p.manualSA.ah.inboundSpi}\n`;
                cli += ` sa string-key inbound ah simple ${p.manualSA.ah.inboundKey}\n`;
                cli += ` sa spi outbound ah ${p.manualSA.ah.outboundSpi}\n`;
                cli += ` sa string-key outbound ah simple ${p.manualSA.ah.outboundKey}\n`;
            }
        }
        cli += 'quit\n\n';
    });

    return cli.trim();
};

const generateHuaweiIpsecCli = (config: Node['config']): string => {
    const { ipsec: ipsecConfig, acl: aclConfig } = config;
    let cli = '';

    // 1. IPsec Proposals
    ipsecConfig.transformSets.forEach(ts => {
        if (!ts.name) return;
        cli += `ipsec proposal ${ts.name}\n`;
        if (ts.protocol) cli += ` transform ${ts.protocol}\n`;
        if (ts.encapsulationMode && ts.encapsulationMode !== 'auto') cli += ` encapsulation-mode ${ts.encapsulationMode}\n`;
        if ((ts.protocol === 'esp' || ts.protocol === 'ah-esp') && ts.espEncryption) cli += ` esp encryption-algorithm ${ts.espEncryption}\n`;
        if ((ts.protocol === 'esp' || ts.protocol === 'ah-esp') && ts.espAuth) cli += ` esp authentication-algorithm ${ts.espAuth}\n`;
        if ((ts.protocol === 'ah' || ts.protocol === 'ah-esp') && ts.ahAuth) cli += ` ah authentication-algorithm ${ts.ahAuth}\n`;
        cli += 'quit\n\n';
    });

    // 2. IKE Keychain
    ipsecConfig.ikeKeychains.forEach(kc => {
        if (!kc.name) return;
        cli += `ike keychain ${kc.name}\n`;
        // Huawei keychains do not bind to an address within the keychain config
        kc.preSharedKeys.forEach(psk => {
            if (psk.key) {
                // Correct Huawei command for a simple key.
                cli += ` pre-shared-key key simple ${psk.key}\n`;
            }
        });
        cli += 'quit\n\n';
    });

    // 3. IKE Peers
    ipsecConfig.ikeProfiles.forEach(prof => {
        if (!prof.name) return;
        cli += `ike peer ${prof.name}\n`;
        const keychain = ipsecConfig.ikeKeychains.find(k => k.id === prof.keychainId);
        if (keychain) cli += ` pre-shared-key keychain ${keychain.name}\n`;
        if (prof.matchRemoteAddress) {
            // Safer parsing for address
            const remoteAddress = prof.matchRemoteAddress.split(' ')[0];
            cli += ` remote-address ${remoteAddress}\n`;
        }
        if(prof.localIdentity) cli += ` local-id-type ${prof.localIdentity.split(' ')[0]} ${prof.localIdentity.split(' ')[1]}\n`; // Assuming type value format
        cli += 'quit\n\n';
    });

    // 4. IPsec Policies
    ipsecConfig.policies.forEach(p => {
        if (!p.name || !p.seqNumber) return;
        cli += `ipsec policy ${p.name} ${p.seqNumber} ${p.mode}\n`;
        
        const acl = aclConfig.acls.find(a => a.id === p.aclId);
        if (acl) cli += ` security acl ${acl.number}\n`;

        p.transformSetIds.forEach(tsId => {
            const ts = ipsecConfig.transformSets.find(t => t.id === tsId);
            if (ts) cli += ` proposal ${ts.name}\n`;
        });

        if (p.mode === 'isakmp') {
            const profile = ipsecConfig.ikeProfiles.find(ip => ip.id === p.ikeProfileId);
            if (profile) cli += ` ike-peer ${profile.name}\n`;
             if (p.localAddress) cli += ` tunnel local ${p.localAddress}\n`;
        }

        if (p.mode === 'manual') {
            if (p.localAddress) cli += ` tunnel local ${p.localAddress}\n`;
            if (p.remoteAddress) cli += ` tunnel remote ${p.remoteAddress}\n`;
            
            const transformSet = ipsecConfig.transformSets.find(ts => p.transformSetIds.includes(ts.id));
            const protocol = transformSet?.protocol || 'esp';

            if ((protocol === 'esp' || protocol === 'ah-esp') && p.manualSA?.esp) {
                cli += ` sa spi inbound esp ${p.manualSA.esp.inboundSpi}\n`;
                cli += ` sa string-key inbound esp ${p.manualSA.esp.inboundKey}\n`;
                cli += ` sa spi outbound esp ${p.manualSA.esp.outboundSpi}\n`;
                cli += ` sa string-key outbound esp ${p.manualSA.esp.outboundKey}\n`;
            }
            if ((protocol === 'ah' || protocol === 'ah-esp') && p.manualSA?.ah) {
                cli += ` sa spi inbound ah ${p.manualSA.ah.inboundSpi}\n`;
                cli += ` sa string-key inbound ah ${p.manualSA.ah.inboundKey}\n`;
                cli += ` sa spi outbound ah ${p.manualSA.ah.outboundSpi}\n`;
                cli += ` sa string-key outbound ah ${p.manualSA.ah.outboundKey}\n`;
            }
        }
        cli += 'quit\n\n';
    });

    return cli.trim();
};


export const generateIpsecCli = (vendor: Vendor, deviceType: DeviceType, config: Node['config']): { cli: string; explanation: string } => {
    const { ipsec: ipsecConfig } = config;
    if (!ipsecConfig.enabled) {
        return { cli: '', explanation: 'IPsec is disabled.' };
    }
    
    const vendorLower = vendor.toLowerCase();
    let cli = '';
    let explanation = '';

    if (vendorLower === 'huawei') {
        cli = generateHuaweiIpsecCli(config);
        explanation = 'Huawei IPsec configuration generated.';
    } else if (vendorLower === 'h3c') {
        cli = generateH3cIpsecCli(config);
        explanation = 'H3C IPsec configuration generated.';
    } else {
        return { cli: `# IPsec for ${vendor} is not yet supported.`, explanation: 'Not supported' };
    }
    
    return { cli, explanation };
};
