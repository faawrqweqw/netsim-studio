
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, IPsecConfig, IPsecTransformSet, IKEKeychain, IKEProfile, IPsecPolicy, IKEKeychainPresharedKey, Vendor, AuthAlgorithm, EspEncryptionAlgorithm, PfsGroup } from '../../types';
import { SpinnerIcon } from '../Icons';

interface IPsecConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const Field = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (<div className={className}><label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>{children}</div>);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (<input {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (<select {...props} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />);

const Section = React.forwardRef<HTMLDivElement, { title: string; children: React.ReactNode; onAdd: () => void; addLabel: string }>(({ title, children, onAdd, addLabel }, ref) => (
    <div ref={ref} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
        <h5 className="font-semibold text-sm text-slate-300">{title}</h5>
        <div className="space-y-2">
            {children}
        </div>
        <button onClick={onAdd} className="w-full text-sm py-2 bg-blue-600 rounded mt-1 hover:bg-blue-700">{addLabel}</button>
    </div>
));

const IPsecConfig: React.FC<IPsecConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {
    const config = selectedNode.config.ipsec;
    const acls = selectedNode.config.acl.acls;

    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [scrollToSection, setScrollToSection] = useState<string | null>(null);

    const transformSetsRef = useRef<HTMLDivElement>(null);
    const ikeKeychainsRef = useRef<HTMLDivElement>(null);
    const ikeProfilesRef = useRef<HTMLDivElement>(null);
    const policiesRef = useRef<HTMLDivElement>(null);

    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
        transformSets: transformSetsRef,
        ikeKeychains: ikeKeychainsRef,
        ikeProfiles: ikeProfilesRef,
        policies: policiesRef,
    };
    
    useEffect(() => {
        if (!scrollToSection) return;
        const refToScroll = refs[scrollToSection];
        if (refToScroll?.current) {
            setTimeout(() => {
                refToScroll.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100); 
        }
        setScrollToSection(null);
    }, [scrollToSection]);

    const toggleItem = (id: string) => {
        setExpandedItems(prev => ({...prev, [id]: !prev[id]}));
    }

    const updateIpsec = useCallback((updates: Partial<IPsecConfig>) => {
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, ipsec: { ...config, ...updates } } });
    }, [selectedNode, config, onNodeUpdate]);

    const addTransformSet = () => {
        const newSet: IPsecTransformSet = { id: `ts-${Date.now()}`, name: `ts-${config.transformSets.length + 1}`, protocol: 'esp', encapsulationMode: 'tunnel', espEncryption: 'aes-cbc-128', espAuth: 'sha1' };
        updateIpsec({ transformSets: [...config.transformSets, newSet] });
        toggleItem(newSet.id);
        setScrollToSection('transformSets');
    };
    const updateTransformSet = (index: number, updates: Partial<IPsecTransformSet>) => {
        const newSets = [...config.transformSets];
        newSets[index] = { ...newSets[index], ...updates };
        updateIpsec({ transformSets: newSets });
    };
    const removeTransformSet = (index: number) => updateIpsec({ transformSets: config.transformSets.filter((_, i) => i !== index) });

    const addKeychain = () => {
        const newKeychain: IKEKeychain = { id: `kc-${Date.now()}`, name: `kc-${config.ikeKeychains.length + 1}`, preSharedKeys: [] };
        updateIpsec({ ikeKeychains: [...config.ikeKeychains, newKeychain] });
        toggleItem(newKeychain.id);
        setScrollToSection('ikeKeychains');
    };
    const updateKeychain = (index: number, updates: Partial<IKEKeychain>) => {
        const newKeychains = [...config.ikeKeychains];
        newKeychains[index] = { ...newKeychains[index], ...updates };
        updateIpsec({ ikeKeychains: newKeychains });
    };
    const removeKeychain = (index: number) => updateIpsec({ ikeKeychains: config.ikeKeychains.filter((_, i) => i !== index) });
    const addPresharedKey = (kcIndex: number) => {
        const keychains = [...config.ikeKeychains];
        keychains[kcIndex].preSharedKeys.push({id: `psk-${Date.now()}`, address: '0.0.0.0', mask: '0.0.0.0', key: 'secret-key'});
        updateIpsec({ ikeKeychains: keychains });
    };
    const updatePresharedKey = (kcIndex: number, pskIndex: number, updates: Partial<IKEKeychainPresharedKey>) => {
        const keychains = [...config.ikeKeychains];
        keychains[kcIndex].preSharedKeys[pskIndex] = {...keychains[kcIndex].preSharedKeys[pskIndex], ...updates};
        updateIpsec({ ikeKeychains: keychains });
    }
    const removePresharedKey = (kcIndex: number, pskIndex: number) => {
        const keychains = [...config.ikeKeychains];
        keychains[kcIndex].preSharedKeys = keychains[kcIndex].preSharedKeys.filter((_, i) => i !== pskIndex);
        updateIpsec({ ikeKeychains: keychains });
    }

    const addProfile = () => {
        const newProfile: IKEProfile = { id: `ikep-${Date.now()}`, name: `ikep-${config.ikeProfiles.length + 1}`, keychainId: '', matchRemoteAddress: '' };
        updateIpsec({ ikeProfiles: [...config.ikeProfiles, newProfile] });
        toggleItem(newProfile.id);
        setScrollToSection('ikeProfiles');
    };
    const updateProfile = (index: number, updates: Partial<IKEProfile>) => {
        const newProfiles = [...config.ikeProfiles];
        newProfiles[index] = { ...newProfiles[index], ...updates };
        updateIpsec({ ikeProfiles: newProfiles });
    };
    const removeProfile = (index: number) => updateIpsec({ ikeProfiles: config.ikeProfiles.filter((_, i) => i !== index) });

    const addPolicy = () => {
        const newPolicy: IPsecPolicy = { id: `pol-${Date.now()}`, name: `policy-${config.policies.length + 1}`, seqNumber: `${(config.policies.length + 1) * 10}`, mode: 'isakmp', aclId: '', transformSetIds: [], remoteAddress: '' };
        updateIpsec({ policies: [...config.policies, newPolicy] });
        toggleItem(newPolicy.id);
        setScrollToSection('policies');
    };
    const updatePolicy = (index: number, updates: Partial<IPsecPolicy>) => {
        const newPolicies = [...config.policies];
        const updatedPolicy = { ...newPolicies[index], ...updates };

        if (updates.mode === 'manual' && !updatedPolicy.manualSA) {
            updatedPolicy.manualSA = { esp: { inboundSpi: '12345', outboundSpi: '54321', inboundKey: '', outboundKey: '' } };
        }
        
        newPolicies[index] = updatedPolicy;
        updateIpsec({ policies: newPolicies });
    };
    const removePolicy = (index: number) => updateIpsec({ policies: config.policies.filter((_, i) => i !== index) });
    
    const vendor = selectedNode.vendor;
    const transformSetLabel = vendor === Vendor.Huawei ? "IPsec Proposals" : "Transform Sets";
    const addTransformSetLabel = vendor === Vendor.Huawei ? "Add IPsec Proposal" : "Add Transform Set";
    const ikeProfileLabel = vendor === Vendor.Huawei ? "IKE Peers" : "IKE Profiles";
    const addIkeProfileLabel = vendor === Vendor.Huawei ? "Add IKE Peer" : "Add IKE Profile";

    const getEspEncryptionOptions = (): EspEncryptionAlgorithm[] => {
        if (vendor === Vendor.Huawei) return ['des-cbc', '3des-cbc', 'aes-cbc-128', 'aes-cbc-192', 'aes-cbc-256', 'sm1', 'sm4', 'aes-128-gcm-128', 'aes-192-gcm-128', 'aes-256-gcm-128', 'aes-128-gmac', 'aes-192-gmac', 'aes-256-gmac'];
        return ['des-cbc', '3des-cbc', 'aes-cbc-128', 'aes-cbc-192', 'aes-cbc-256'];
    };
    const getAuthOptions = (): AuthAlgorithm[] => {
        if (vendor === Vendor.Huawei) return ['md5', 'sha1', 'sha2-256', 'sha2-384', 'sha2-512', 'sm3'];
        return ['md5', 'sha1'];
    };

    return (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-3 cursor-pointer bg-slate-900/50 hover:bg-slate-900/80" onClick={onToggle}>
                <div className="flex items-center gap-3"><span className={`transition-transform text-slate-300 ${isExpanded ? 'rotate-90' : ''}`}>▶</span><h3 className="font-bold text-base text-slate-200">IPsec VPN</h3></div>
                <button onClick={(e) => { e.stopPropagation(); onToggleFeature(); }} className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}>{config.enabled ? 'Enabled' : 'Disabled'}</button>
            </div>
            {isExpanded && config.enabled && (
                <div className="p-2 space-y-3 border-t border-slate-700">
                    <Section ref={transformSetsRef} title={transformSetLabel} onAdd={addTransformSet} addLabel={addTransformSetLabel}>
                        {config.transformSets.map((ts, index) => (
                           <div key={ts.id} className="bg-slate-800/50 p-2 rounded space-y-2 text-xs">
                               <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleItem(ts.id)}>
                                    <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 text-xs ${expandedItems[ts.id] ? 'rotate-90' : ''}`}>▶</span><Input value={ts.name} onChange={e => updateTransformSet(index, { name: e.target.value })} /></div>
                                    <button onClick={(e) => {e.stopPropagation(); removeTransformSet(index)}} className="px-2 py-1 bg-red-600 text-white rounded text-xs ml-2">X</button>
                                </div>
                               {expandedItems[ts.id] && <div className="pt-2 border-t border-slate-600/50 space-y-2">
                                   <Field label="Encapsulation"><Select value={ts.encapsulationMode} onChange={e => updateTransformSet(index, { encapsulationMode: e.target.value as any })}><option value="tunnel">Tunnel</option><option value="transport">Transport</option>{vendor === Vendor.Huawei && <option value="auto">Auto</option>}</Select></Field>
                                   <Field label="Protocol"><Select value={ts.protocol} onChange={e => updateTransformSet(index, { protocol: e.target.value as any })}><option value="esp">ESP</option><option value="ah">AH</option><option value="ah-esp">AH-ESP</option></Select></Field>
                                   {(ts.protocol === 'esp' || ts.protocol === 'ah-esp') && <>
                                       <Field label="ESP Encryption"><Select value={ts.espEncryption} onChange={e => updateTransformSet(index, { espEncryption: e.target.value as any })}>{getEspEncryptionOptions().map(o => <option key={o} value={o}>{o}</option>)}</Select></Field>
                                       <Field label="ESP Auth"><Select value={ts.espAuth} onChange={e => updateTransformSet(index, { espAuth: e.target.value as any })}>{getAuthOptions().map(o => <option key={o} value={o}>{o}</option>)}</Select></Field>
                                   </>}
                                    {(ts.protocol === 'ah' || ts.protocol === 'ah-esp') && <Field label="AH Auth"><Select value={ts.ahAuth} onChange={e => updateTransformSet(index, { ahAuth: e.target.value as any })}>{getAuthOptions().map(o => <option key={o} value={o}>{o}</option>)}</Select></Field>}
                               </div>}
                           </div>
                        ))}
                    </Section>

                    <Section ref={ikeKeychainsRef} title="IKE Keychains" onAdd={addKeychain} addLabel="Add IKE Keychain">
                         {config.ikeKeychains.map((kc, kcIndex) => (
                           <div key={kc.id} className="bg-slate-800/50 p-2 rounded space-y-2 text-xs">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleItem(kc.id)}>
                                    <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 text-xs ${expandedItems[kc.id] ? 'rotate-90' : ''}`}>▶</span><Input value={kc.name} onChange={e => updateKeychain(kcIndex, { name: e.target.value })} /></div>
                                    <button onClick={(e) => {e.stopPropagation(); removeKeychain(kcIndex)}} className="px-2 py-1 bg-red-600 text-white rounded text-xs ml-2">X</button>
                                </div>
                                {expandedItems[kc.id] && <div className="pt-2 border-t border-slate-600/50 space-y-2">
                                    {kc.preSharedKeys.map((psk, pskIndex) => (
                                        <div key={psk.id} className={`${vendor === Vendor.Huawei ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_1fr_1fr_auto]'} grid gap-2 items-end`}>
                                            {vendor !== Vendor.Huawei && <>
                                                <Field label="Remote Address"><Input placeholder="IP or 0.0.0.0" value={psk.address} onChange={e => updatePresharedKey(kcIndex, pskIndex, { address: e.target.value })} /></Field>
                                                <Field label="Mask"><Input placeholder="Mask or 0" value={psk.mask} onChange={e => updatePresharedKey(kcIndex, pskIndex, { mask: e.target.value })} /></Field>
                                            </>}
                                            <Field label="Key"><Input type="password" value={psk.key} onChange={e => updatePresharedKey(kcIndex, pskIndex, { key: e.target.value })} /></Field>
                                            <button onClick={() => removePresharedKey(kcIndex, pskIndex)} className="h-fit px-2 py-1 bg-red-600 text-white rounded text-xs">-</button>
                                        </div>
                                    ))}
                                    <button onClick={() => addPresharedKey(kcIndex)} className="w-full text-xs py-1 bg-green-600 rounded mt-1 text-white">+</button>
                                </div>}
                           </div>
                        ))}
                    </Section>

                    <Section ref={ikeProfilesRef} title={ikeProfileLabel} onAdd={addProfile} addLabel={addIkeProfileLabel}>
                       {config.ikeProfiles.map((p, index) => (
                           <div key={p.id} className="bg-slate-800/50 p-2 rounded space-y-2 text-xs">
                               <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleItem(p.id)}>
                                   <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 text-xs ${expandedItems[p.id] ? 'rotate-90' : ''}`}>▶</span><Input value={p.name} onChange={e => updateProfile(index, { name: e.target.value })} /></div>
                                   <button onClick={(e) => {e.stopPropagation(); removeProfile(index)}} className="px-2 py-1 bg-red-600 text-white rounded text-xs ml-2">X</button>
                               </div>
                               {expandedItems[p.id] && <div className="pt-2 border-t border-slate-600/50 space-y-2">
                                   <Field label="Keychain"><Select value={p.keychainId} onChange={e => updateProfile(index, { keychainId: e.target.value})}><option value="">-- Select Keychain --</option>{config.ikeKeychains.map(kc => <option key={kc.id} value={kc.id}>{kc.name}</option>)}</Select></Field>
                                   <Field label={vendor === Vendor.Huawei ? "Remote Address" : "Match Remote Address"}><Input placeholder={vendor === Vendor.Huawei ? "e.g., 2.2.3.1" : "e.g., 2.2.3.1 255.255.255.0"} value={p.matchRemoteAddress} onChange={e => updateProfile(index, {matchRemoteAddress: e.target.value})} /></Field>
                               </div>}
                           </div>
                        ))}
                    </Section>

                    <Section ref={policiesRef} title="IPsec Policies" onAdd={addPolicy} addLabel="Add IPsec Policy">
                        {config.policies.map((p, index) => {
                             const transformSet = config.transformSets.find(ts => p.transformSetIds.includes(ts.id));
                             const protocol = transformSet?.protocol || 'esp';
                            return (
                               <div key={p.id} className="bg-slate-800/50 p-2 rounded space-y-2 text-xs">
                                   <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleItem(p.id)}>
                                       <div className="flex items-center gap-2"><span className={`transition-transform text-slate-400 text-xs ${expandedItems[p.id] ? 'rotate-90' : ''}`}>▶</span><Input value={p.name} onChange={e => updatePolicy(index, { name: e.target.value })} /></div>
                                       <button onClick={(e) => {e.stopPropagation(); removePolicy(index)}} className="px-2 py-1 bg-red-600 text-white rounded text-xs ml-2">X</button>
                                   </div>
                                    {expandedItems[p.id] && <div className="pt-2 border-t border-slate-600/50 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Field label="Seq"><Input value={p.seqNumber} onChange={e => updatePolicy(index, { seqNumber: e.target.value })} /></Field>
                                            <Field label="Mode"><Select value={p.mode} onChange={e => updatePolicy(index, { mode: e.target.value as any})}><option value="isakmp">ISAKMP (IKE)</option><option value="manual">Manual</option></Select></Field>
                                        </div>
                                        <Field label="ACL"><Select value={p.aclId} onChange={e => updatePolicy(index, {aclId: e.target.value})}><option value="">-- Select ACL --</option>{acls.map(a => <option key={a.id} value={a.id}>{a.number} {a.name && `(${a.name})`}</option>)}</Select></Field>
                                        <Field label={transformSetLabel}><div className="grid grid-cols-2 gap-1 bg-slate-700 p-1 rounded">{config.transformSets.map(ts => (<label key={ts.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-600"><input type="checkbox" checked={p.transformSetIds.includes(ts.id)} onChange={e => { const newIds = e.target.checked ? [...p.transformSetIds, ts.id] : p.transformSetIds.filter(id => id !== ts.id); updatePolicy(index, {transformSetIds: newIds}); }} />{ts.name}</label>))}</div></Field>
                                        
                                        { (p.mode === 'manual' || vendor !== Vendor.Huawei) &&
                                            <Field label={p.mode === 'manual' && vendor === Vendor.Huawei ? "Tunnel Remote Address" : "Remote Address"}>
                                                <Input value={p.remoteAddress} onChange={e => updatePolicy(index, { remoteAddress: e.target.value })} />
                                                 {vendor === Vendor.Huawei && p.mode === 'isakmp' && <p className="text-xs text-yellow-400 mt-1">注意: 华为设备中, remote-address 在IKE Peer中配置。</p>}
                                            </Field>
                                        }

                                        {p.mode === 'isakmp' ? (
                                            <>
                                                <Field label="Local Address (Optional)"><Input value={p.localAddress || ''} onChange={e => updatePolicy(index, { localAddress: e.target.value })} /></Field>
                                                <Field label={ikeProfileLabel}><Select value={p.ikeProfileId} onChange={e => updatePolicy(index, {ikeProfileId: e.target.value})}><option value="">-- Select Profile/Peer --</option>{config.ikeProfiles.map(prof => <option key={prof.id} value={prof.id}>{prof.name}</option>)}</Select></Field>
                                            </>
                                        ) : p.mode === 'manual' && p.manualSA ? (
                                            <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                                {vendor === Vendor.Huawei && <Field label="Tunnel Local Address"><Input value={p.localAddress || ''} onChange={e => updatePolicy(index, { localAddress: e.target.value })} /></Field> }
                                                {(protocol === 'esp' || protocol === 'ah-esp') && p.manualSA.esp && (
                                                    <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                                                        <h6 className="text-xs font-semibold">ESP SA</h6>
                                                        <div className="grid grid-cols-2 gap-2"><Field label="Inbound SPI"><Input value={p.manualSA.esp.inboundSpi} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, esp: {...p.manualSA!.esp!, inboundSpi: e.target.value}}})} /></Field><Field label="Inbound Key"><Input type="password" value={p.manualSA.esp.inboundKey} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, esp: {...p.manualSA!.esp!, inboundKey: e.target.value}}})} /></Field></div>
                                                        <div className="grid grid-cols-2 gap-2"><Field label="Outbound SPI"><Input value={p.manualSA.esp.outboundSpi} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, esp: {...p.manualSA!.esp!, outboundSpi: e.target.value}}})} /></Field><Field label="Outbound Key"><Input type="password" value={p.manualSA.esp.outboundKey} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, esp: {...p.manualSA!.esp!, outboundKey: e.target.value}}})} /></Field></div>
                                                    </div>
                                                )}
                                                {(protocol === 'ah' || protocol === 'ah-esp') && p.manualSA.ah && (
                                                    <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                                                        <h6 className="text-xs font-semibold">AH SA</h6>
                                                        <div className="grid grid-cols-2 gap-2"><Field label="Inbound SPI"><Input value={p.manualSA.ah.inboundSpi} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, ah: {...p.manualSA!.ah!, inboundSpi: e.target.value}}})} /></Field><Field label="Inbound Key"><Input type="password" value={p.manualSA.ah.inboundKey} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, ah: {...p.manualSA!.ah!, inboundKey: e.target.value}}})} /></Field></div>
                                                        <div className="grid grid-cols-2 gap-2"><Field label="Outbound SPI"><Input value={p.manualSA.ah.outboundSpi} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, ah: {...p.manualSA!.ah!, outboundSpi: e.target.value}}})} /></Field><Field label="Outbound Key"><Input type="password" value={p.manualSA.ah.outboundKey} onChange={e => updatePolicy(index, { manualSA: {...p.manualSA!, ah: {...p.manualSA!.ah!, outboundKey: e.target.value}}})} /></Field></div>
                                                    </div>
                                                )}
                                            </div>
                                        ): null}
                                    </div>}
                               </div>
                            )
                        })}
                    </Section>

                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-48 min-h-[5rem] flex items-center justify-center">
                            {isGenerating ? (<div className="flex items-center text-slate-400"><SpinnerIcon className="w-4 h-4 mr-2" /><span>Generating...</span></div>) : (config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IPsecConfig;
