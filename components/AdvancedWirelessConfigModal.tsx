import React, { useState, useCallback } from 'react';
import { Node, APGroup, APDevice, Vendor, RadioConfig, WirelessConfig, SecurityProfile, SSIDProfile, VAPProfile, ACConfig, VAPBinding } from '../types';
import BulkImportModal from './BulkImportModal';

interface AdvancedWirelessConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node;
  onNodeUpdate: (node: Node) => void;
}

type MenuSection = 'global' | 'security' | 'ssid' | 'vap' | 'apGroups' | 'apDevices';
type WirelessConfigListKey = 'securityProfiles' | 'ssidProfiles' | 'vapProfiles' | 'apGroups' | 'apDevices';
type ProfileListKey = 'securityProfiles' | 'ssidProfiles' | 'vapProfiles';

const AdvancedWirelessConfigModal: React.FC<AdvancedWirelessConfigModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeUpdate
}) => {
  const [activeSection, setActiveSection] = useState<MenuSection>('global');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const handleConfigUpdate = useCallback((updates: Partial<WirelessConfig>) => {
    onNodeUpdate({
      ...selectedNode,
      config: {
        ...selectedNode.config,
        wireless: {
          ...selectedNode.config.wireless,
          ...updates
        }
      }
    });
  }, [selectedNode, onNodeUpdate]);

  const updateList = <T,>(listName: WirelessConfigListKey, index: number, updates: Partial<T>) => {
    const list = (selectedNode.config.wireless[listName] as unknown as T[]).slice();
    list[index] = { ...list[index], ...updates };
    handleConfigUpdate({ [listName]: list } as Partial<WirelessConfig>);
  };
  
  const addToList = <T,>(listName: WirelessConfigListKey, newItem: T) => {
    const list = (selectedNode.config.wireless[listName] as unknown as T[]).slice();
    list.push(newItem);
    handleConfigUpdate({ [listName]: list } as Partial<WirelessConfig>);
    setSelectedItemIndex(list.length - 1);
  };
  
  const deleteFromList = (listName: WirelessConfigListKey, index: number) => {
    const list = (selectedNode.config.wireless[listName] as any[]).filter((_, i) => i !== index);
    handleConfigUpdate({ [listName]: list } as Partial<WirelessConfig>);
    setSelectedItemIndex(-1);
  };

  const handleBulkImport = useCallback((newDevices: APDevice[]) => {
    handleConfigUpdate({
      apDevices: [...selectedNode.config.wireless.apDevices, ...newDevices]
    });
    setIsBulkImportOpen(false);
  }, [selectedNode.config.wireless.apDevices, handleConfigUpdate]);


  if (!isOpen) return null;

  const renderGlobalConfig = () => {
    const config = selectedNode.config.wireless.acConfig;
    const updateACConfig = (updates: Partial<ACConfig>) => handleConfigUpdate({ acConfig: { ...config, ...updates }});
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">全局AC配置</h3>
        <div className="bg-slate-800/50 p-4 rounded-lg space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">AC源接口</label>
                <input type="text" value={config.acSourceInterface} onChange={(e) => updateACConfig({ acSourceInterface: e.target.value })} placeholder="例如: Vlanif100" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">国家码</label>
                <input type="text" value={config.countryCode} onChange={(e) => updateACConfig({ countryCode: e.target.value })} placeholder="例如: CN" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">AP认证模式</label>
                <select value={config.apAuthMode} onChange={(e) => updateACConfig({ apAuthMode: e.target.value as any })} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="mac">MAC地址认证</option>
                    <option value="sn">序列号认证</option>
                </select>
            </div>
        </div>
      </div>
    );
  };

  const renderProfileSection = <T extends { profileName: string }>(
    title: string,
    listName: ProfileListKey,
    newItem: T,
    renderForm: (item: T, index: number) => React.ReactNode
  ) => {
    const list = selectedNode.config.wireless[listName] as unknown as T[];
    return (
       <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={() => addToList(listName, newItem)} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            添加
          </button>
        </div>
        {list.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无配置</div>
        ) : (
          <div className="space-y-3">
            {list.map((item, index) => (
              <div key={index} className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border-2 ${selectedItemIndex === index ? 'border-blue-500' : 'border-transparent'}`} onClick={() => setSelectedItemIndex(selectedItemIndex === index ? -1 : index)}>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-white">{item.profileName}</h4>
                  <button onClick={(e) => { e.stopPropagation(); deleteFromList(listName, index); }} className="text-red-400 hover:text-red-300 text-sm">删除</button>
                </div>
                {selectedItemIndex === index && (
                  <div className="mt-4 space-y-3 border-t border-slate-600 pt-4" onClick={(e) => e.stopPropagation()}>
                    {renderForm(item, index)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAPGroupSection = () => {
    const list = selectedNode.config.wireless.apGroups;
    const newItem: APGroup = { 
        groupName: `ap-group-${list.length + 1}`, description: '', serviceTemplates: [], 
        radio2G: { enabled: true, channel: 'auto', power: 'auto' }, 
        radio5G: { enabled: true, channel: 'auto', power: 'auto' },
        vapBindings: [],
        vlanId: '', countryCode: ''
    };
    return (
       <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">AP组</h3>
          <button onClick={() => addToList('apGroups', newItem)} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            添加AP组
          </button>
        </div>
        {list.length === 0 ? <div className="text-center py-8 text-slate-400">暂无AP组</div> : (
          <div className="space-y-3">
            {list.map((group, index) => (
              <div key={index} className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border-2 ${selectedItemIndex === index ? 'border-blue-500' : 'border-transparent'}`} onClick={() => setSelectedItemIndex(selectedItemIndex === index ? -1 : index)}>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-white">{group.groupName}</h4>
                  <button onClick={(e) => { e.stopPropagation(); deleteFromList('apGroups', index); }} className="text-red-400 hover:text-red-300 text-sm">删除</button>
                </div>
                {selectedItemIndex === index && (
                  <div className="mt-4 space-y-3 border-t border-slate-600 pt-4" onClick={(e) => e.stopPropagation()}>
                    <div><label className="block text-sm font-medium text-slate-300 mb-1">组名称</label><input type="text" value={group.groupName} onChange={e => updateList('apGroups', index, { groupName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-sm font-medium text-slate-300 mb-1">描述</label><input type="text" value={group.description} onChange={e => updateList('apGroups', index, { description: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">VAP绑定</label>
                        <div className="space-y-2">
                            {(group.vapBindings || []).map((binding, bindingIndex) => (
                                <div key={bindingIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                    <select value={binding.vapProfileName} onChange={e => {
                                        const newBindings = [...(group.vapBindings || [])];
                                        newBindings[bindingIndex].vapProfileName = e.target.value;
                                        updateList('apGroups', index, { vapBindings: newBindings });
                                    }} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                        <option value="">选择VAP模板</option>
                                        {selectedNode.config.wireless.vapProfiles.map(p => <option key={p.profileName} value={p.profileName}>{p.profileName}</option>)}
                                    </select>
                                    <select value={binding.radio} onChange={e => {
                                        const newBindings = [...(group.vapBindings || [])];
                                        newBindings[bindingIndex].radio = e.target.value as any;
                                        updateList('apGroups', index, { vapBindings: newBindings });
                                    }} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
                                        <option value="0">Radio 0 (2.4G)</option>
                                        <option value="1">Radio 1 (5G)</option>
                                        <option value="all">All Radios</option>
                                    </select>
                                    <button onClick={() => {
                                        const newBindings = (group.vapBindings || []).filter((_, i) => i !== bindingIndex);
                                        updateList('apGroups', index, { vapBindings: newBindings });
                                    }} className="px-2 py-1 bg-red-600 text-white text-xs rounded">删除</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => {
                            const newBinding: VAPBinding = { vapProfileName: '', radio: 'all' };
                            const newBindings = [...(group.vapBindings || []), newBinding];
                            updateList('apGroups', index, { vapBindings: newBindings });
                        }} className="mt-2 px-2 py-1 bg-green-600 text-white text-xs rounded">
                            添加绑定
                        </button>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const renderAPDeviceSection = () => {
    const list = selectedNode.config.wireless.apDevices;
    const newItem = { apName: `AP-${list.length+1}`, model: '', serialNumber: '', macAddress: '', groupName: '' };
     return (
       <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">AP设备管理</h3>
           <div className="flex items-center gap-2">
            <button onClick={() => setIsBulkImportOpen(true)} className="px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm">批量导入</button>
            <button onClick={() => addToList('apDevices', newItem)} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">添加AP</button>
           </div>
        </div>
        {list.length === 0 ? <div className="text-center py-8 text-slate-400">暂无AP</div> : (
          <div className="space-y-3">
            {list.map((ap, index) => (
              <div key={index} className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border-2 ${selectedItemIndex === index ? 'border-blue-500' : 'border-transparent'}`} onClick={() => setSelectedItemIndex(selectedItemIndex === index ? -1 : index)}>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-white">{ap.apName}</h4>
                  <button onClick={(e) => { e.stopPropagation(); deleteFromList('apDevices', index); }} className="text-red-400 hover:text-red-300 text-sm">删除</button>
                </div>
                {selectedItemIndex === index && (
                    <div className="mt-4 space-y-3 border-t border-slate-600 pt-4" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">AP名称</label>
                            <input type="text" value={ap.apName} onChange={e => updateList('apDevices', index, { apName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        {selectedNode.vendor === Vendor.Huawei && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">序列号</label>
                                <input type="text" value={ap.serialNumber} onChange={e => updateList('apDevices', index, { serialNumber: e.target.value })} placeholder="AP的序列号" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">MAC地址</label>
                            <input type="text" value={ap.macAddress} onChange={e => updateList('apDevices', index, { macAddress: e.target.value })} placeholder="AP的MAC地址" className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">所属AP组</label>
                            <select value={ap.groupName} onChange={e => updateList('apDevices', index, { groupName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">不分配</option>
                                {selectedNode.config.wireless.apGroups.map(ag => <option key={ag.groupName} value={ag.groupName}>{ag.groupName}</option>)}
                            </select>
                        </div>
                    </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  const renderContent = () => {
    switch(activeSection) {
        case 'global': return renderGlobalConfig();
        case 'security': return renderProfileSection<SecurityProfile>(
            '安全模板', 'securityProfiles', 
            { profileName: `sec-profile-${selectedNode.config.wireless.securityProfiles.length+1}`, securityType: 'wpa2-psk', psk: '' },
            (item, index) => (
                <>
                    <div><label className="block text-sm">模板名称</label><input type="text" value={item.profileName} onChange={e => updateList('securityProfiles', index, { profileName: e.target.value })} className="w-full bg-slate-700 rounded p-1"/></div>
                    <div><label className="block text-sm">安全类型</label><select value={item.securityType} onChange={e => updateList('securityProfiles', index, {securityType: e.target.value as any})} className="w-full bg-slate-700 rounded p-1"><option value="wpa2-psk">WPA2-PSK</option></select></div>
                    <div><label className="block text-sm">PSK密钥</label><input type="password" value={item.psk} onChange={e => updateList('securityProfiles', index, { psk: e.target.value })} className="w-full bg-slate-700 rounded p-1" /></div>
                </>
            )
        );
        case 'ssid': return renderProfileSection<SSIDProfile>(
            'SSID模板', 'ssidProfiles',
            { profileName: `ssid-profile-${selectedNode.config.wireless.ssidProfiles.length+1}`, ssid: '' },
            (item, index) => (
                <>
                    <div><label className="block text-sm">模板名称</label><input type="text" value={item.profileName} onChange={e => updateList('ssidProfiles', index, { profileName: e.target.value })} className="w-full bg-slate-700 rounded p-1"/></div>
                    <div><label className="block text-sm">SSID</label><input type="text" value={item.ssid} onChange={e => updateList('ssidProfiles', index, { ssid: e.target.value })} className="w-full bg-slate-700 rounded p-1"/></div>
                </>
            )
        );
        case 'vap': return renderProfileSection<VAPProfile>(
            'VAP模板', 'vapProfiles',
            { profileName: `vap-profile-${selectedNode.config.wireless.vapProfiles.length+1}`, securityProfile: '', ssidProfile: '', vlanId: '', forwardMode: 'tunnel' },
            (item, index) => (
                <>
                    <div><label className="block text-sm">模板名称</label><input type="text" value={item.profileName} onChange={e => updateList('vapProfiles', index, { profileName: e.target.value })} className="w-full bg-slate-700 rounded p-1"/></div>
                    <div><label className="block text-sm">安全模板</label><select value={item.securityProfile} onChange={e => updateList('vapProfiles', index, { securityProfile: e.target.value })} className="w-full bg-slate-700 rounded p-1"><option value="">选择...</option>{selectedNode.config.wireless.securityProfiles.map(p => <option key={p.profileName} value={p.profileName}>{p.profileName}</option>)}</select></div>
                    <div><label className="block text-sm">SSID模板</label><select value={item.ssidProfile} onChange={e => updateList('vapProfiles', index, { ssidProfile: e.target.value })} className="w-full bg-slate-700 rounded p-1"><option value="">选择...</option>{selectedNode.config.wireless.ssidProfiles.map(p => <option key={p.profileName} value={p.profileName}>{p.profileName}</option>)}</select></div>
                    <div><label className="block text-sm">业务VLAN ID</label><input type="text" value={item.vlanId} onChange={e => updateList('vapProfiles', index, { vlanId: e.target.value })} className="w-full bg-slate-700 rounded p-1"/></div>
                    <div>
                        <label className="block text-sm">转发模式</label>
                        <select value={item.forwardMode || 'tunnel'} onChange={e => updateList('vapProfiles', index, { forwardMode: e.target.value as any })} className="w-full bg-slate-700 rounded p-1">
                            <option value="tunnel">隧道转发 (tunnel)</option>
                            <option value="direct-forward">直接转发 (direct-forward)</option>
                        </select>
                    </div>
                </>
            )
        );
        case 'apGroups': return renderAPGroupSection();
        case 'apDevices': return renderAPDeviceSection();
        default: return null;
    }
  };

  const menuItems = [
    { id: 'global', label: '全局配置' },
    { id: 'security', label: '安全模板' },
    { id: 'ssid', label: 'SSID模板' },
    { id: 'vap', label: 'VAP模板' },
    { id: 'apGroups', label: 'AP组' },
    { id: 'apDevices', label: 'AP设备' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">高级无线配置: {selectedNode.name} ({selectedNode.vendor})</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div className="flex-grow flex min-h-0">
          <aside className="w-56 p-4 border-r border-slate-700 flex-shrink-0">
            <nav className="space-y-2">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => { setActiveSection(item.id as MenuSection); setSelectedItemIndex(-1); }} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
          <main className="flex-grow p-6 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
       {isBulkImportOpen && 
        <BulkImportModal 
            onClose={() => setIsBulkImportOpen(false)} 
            onImport={handleBulkImport}
            vendor={selectedNode.vendor}
        />
       }
    </div>
  );
};

export default AdvancedWirelessConfigModal;