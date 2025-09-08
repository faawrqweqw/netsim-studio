import React, { useState, useCallback } from 'react';
import { Node, APGroup, APDevice, WirelessServiceTemplate, Vendor, RadioConfig } from '../types';
import BulkImportModal from './BulkImportModal';

interface WirelessConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node;
  onNodeUpdate: (node: Node) => void;
}

type MenuSection = 'apGroups' | 'serviceTemplates' | 'apDevices';

const WirelessConfigModal: React.FC<WirelessConfigModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeUpdate
}) => {
  const [activeSection, setActiveSection] = useState<MenuSection>('serviceTemplates');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [confirmPasswords, setConfirmPasswords] = useState<Record<number, string>>({});

  const handleConfigUpdate = useCallback((updates: Partial<Node['config']['wireless']>) => {
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

  const addAPGroup = useCallback(() => {
    const newGroup: APGroup = {
      groupName: `ap-group-${selectedNode.config.wireless.apGroups.length + 1}`,
      description: '',
      radio2G: { enabled: false, channel: 'auto', power: '20' },
      radio5G: { enabled: false, channel: 'auto', power: '20' },
      serviceTemplates: [],
      vlanId: '1',
      countryCode: 'CN'
    };

    handleConfigUpdate({
      apGroups: [...selectedNode.config.wireless.apGroups, newGroup]
    });
    setSelectedItemIndex(selectedNode.config.wireless.apGroups.length);
  }, [selectedNode.config.wireless.apGroups, handleConfigUpdate]);

  const updateAPGroup = useCallback((index: number, updates: Partial<APGroup>) => {
    const updatedGroups = [...selectedNode.config.wireless.apGroups];
    updatedGroups[index] = { ...updatedGroups[index], ...updates };
    handleConfigUpdate({ apGroups: updatedGroups });
  }, [selectedNode.config.wireless.apGroups, handleConfigUpdate]);

  const deleteAPGroup = useCallback((index: number) => {
    const updatedGroups = selectedNode.config.wireless.apGroups.filter((_, i) => i !== index);
    handleConfigUpdate({ apGroups: updatedGroups });
    setSelectedItemIndex(-1);
  }, [selectedNode.config.wireless.apGroups, handleConfigUpdate]);

  const addServiceTemplate = useCallback(() => {
    const newTemplate: WirelessServiceTemplate = {
      templateName: `service-template-${selectedNode.config.wireless.serviceTemplates.length + 1}`,
      ssid: `SSID-${selectedNode.config.wireless.serviceTemplates.length + 1}`,
      description: '',
      defaultVlan: '1',
      ssidHide: false,
      forwardType: 'centralized',
      maxClients: '64',
      authMode: 'static-psk',
      authLocation: 'local-ac',
      securityMode: 'wpa-wpa2',
      pskPassword: '',
      pskType: 'passphrase',
      wepKeyId: '1',
      wepKeyType: 'passphrase',
      wepEncryption: 'wep40',
      wepPassword: '',
      enabled: false
    };

    handleConfigUpdate({
      serviceTemplates: [...selectedNode.config.wireless.serviceTemplates, newTemplate]
    });
    setSelectedItemIndex(selectedNode.config.wireless.serviceTemplates.length);
  }, [selectedNode.config.wireless.serviceTemplates, handleConfigUpdate]);

  const updateServiceTemplate = useCallback((index: number, updates: Partial<WirelessServiceTemplate>) => {
    const updatedTemplates = [...selectedNode.config.wireless.serviceTemplates];
    updatedTemplates[index] = { ...updatedTemplates[index], ...updates };
    handleConfigUpdate({ serviceTemplates: updatedTemplates });
  }, [selectedNode.config.wireless.serviceTemplates, handleConfigUpdate]);

  const deleteServiceTemplate = useCallback((index: number) => {
    const updatedTemplates = selectedNode.config.wireless.serviceTemplates.filter((_, i) => i !== index);
    handleConfigUpdate({ serviceTemplates: updatedTemplates });
    setSelectedItemIndex(-1);
  }, [selectedNode.config.wireless.serviceTemplates, handleConfigUpdate]);

  const addAPDevice = useCallback(() => {
    const newDevice: APDevice = {
      apName: `AP-${selectedNode.config.wireless.apDevices.length + 1}`,
      model: '',
      serialNumber: '',
      macAddress: '',
      groupName: '',
      description: '',
    };

    handleConfigUpdate({
      apDevices: [...selectedNode.config.wireless.apDevices, newDevice]
    });
    setSelectedItemIndex(selectedNode.config.wireless.apDevices.length);
  }, [selectedNode.config.wireless.apDevices, handleConfigUpdate]);

  const updateAPDevice = useCallback((index: number, updates: Partial<APDevice>) => {
    const updatedDevices = [...selectedNode.config.wireless.apDevices];
    updatedDevices[index] = { ...updatedDevices[index], ...updates };
    handleConfigUpdate({ apDevices: updatedDevices });
  }, [selectedNode.config.wireless.apDevices, handleConfigUpdate]);

  const deleteAPDevice = useCallback((index: number) => {
    const updatedDevices = selectedNode.config.wireless.apDevices.filter((_, i) => i !== index);
    handleConfigUpdate({ apDevices: updatedDevices });
    setSelectedItemIndex(-1);
  }, [selectedNode.config.wireless.apDevices, handleConfigUpdate]);

  const handleBulkImport = useCallback((newDevices: APDevice[]) => {
    handleConfigUpdate({
      apDevices: [...selectedNode.config.wireless.apDevices, ...newDevices]
    });
    setIsBulkImportOpen(false);
  }, [selectedNode.config.wireless.apDevices, handleConfigUpdate]);

  if (!isOpen) return null;


  const renderAPGroups = () => {

    const renderRadioConfig = (
      groupIndex: number,
      band: '2G' | '5G',
      radioConfig: RadioConfig
    ) => {
      const radioKey = band === '2G' ? 'radio2G' : 'radio5G';
      const radioNumber = band === '2G' ? 2 : 1;
      const bandLabel = band === '2G' ? '2.4G' : '5G';

      const updateRadio = (updates: Partial<RadioConfig>) => {
        const group = selectedNode.config.wireless.apGroups[groupIndex];
        const newRadioConfig = { ...group[radioKey], ...updates };
        updateAPGroup(groupIndex, { [radioKey]: newRadioConfig });
      };

      return (
        <div className="border-t border-slate-700 pt-3 mt-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={radioConfig.enabled}
              onChange={(e) => updateRadio({ enabled: e.target.checked })}
              className="form-checkbox h-5 w-5 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-300">{bandLabel}射频 (Radio {radioNumber})</span>
          </label>
          {radioConfig.enabled && (
            <div className="grid grid-cols-2 gap-4 pl-8 mt-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">信道</label>
                <input
                  type="text"
                  value={radioConfig.channel}
                  onChange={(e) => updateRadio({ channel: e.target.value })}
                  placeholder="auto 或具体信道号"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">发射功率</label>
                <input
                  type="text"
                  value={radioConfig.power}
                  onChange={(e) => updateRadio({ power: e.target.value })}
                  placeholder="20 或具体数值"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">AP组配置</h3>
          <button
            onClick={addAPGroup}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            添加AP组
          </button>
        </div>

        {selectedNode.config.wireless.apGroups.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            暂无AP组配置，点击"添加AP组"开始配置
          </div>
        ) : (
          <div className="space-y-3">
            {selectedNode.config.wireless.apGroups.map((group, index) => (
              <div
                key={index}
                className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border-2 ${selectedItemIndex === index ? 'border-blue-500' : 'border-transparent'
                  }`}
                onClick={() => setSelectedItemIndex(selectedItemIndex === index ? -1 : index)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-white">{group.groupName}</h4>
                    <p className="text-sm text-slate-400">{group.description || '无描述'}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAPGroup(index);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>

                {selectedItemIndex === index && (
                  <div
                    className="mt-4 space-y-3 border-t border-slate-600 pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">组名称</label>
                        <input
                          type="text"
                          value={group.groupName}
                          onChange={(e) => updateAPGroup(index, { groupName: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">区域码</label>
                        <input
                          type="text"
                          value={group.countryCode}
                          onChange={(e) => updateAPGroup(index, { countryCode: e.target.value })}
                          placeholder="例如: CN, US"
                          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">描述</label>
                      <input
                        type="text"
                        value={group.description}
                        onChange={(e) => updateAPGroup(index, { description: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">无线服务模板</label>
                        <select
                          value={group.serviceTemplates[0] || ''}
                          onChange={(e) => updateAPGroup(index, { serviceTemplates: [e.target.value] })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择</option>
                          {selectedNode.config.wireless.serviceTemplates.map(template => (
                            <option key={template.templateName} value={template.templateName}>
                              {template.templateName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">VLAN ID</label>
                        <input
                          type="text"
                          value={group.vlanId}
                          onChange={(e) => updateAPGroup(index, { vlanId: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {renderRadioConfig(index, '5G', group.radio5G)}
                    {renderRadioConfig(index, '2G', group.radio2G)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const renderServiceTemplates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">无线服务模板</h3>
        <button
          onClick={addServiceTemplate}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          添加服务模板
        </button>
      </div>

      {selectedNode.config.wireless.serviceTemplates.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          暂无服务模板，点击"添加服务模板"开始配置
        </div>
      ) : (
        <div className="space-y-3">
          {selectedNode.config.wireless.serviceTemplates.map((template, index) => (
            <div
              key={index}
              className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border-2 ${selectedItemIndex === index ? 'border-blue-500' : 'border-transparent'
                }`}
              onClick={() => setSelectedItemIndex(selectedItemIndex === index ? -1 : index)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-white">{template.templateName}</h4>
                  <p className="text-sm text-slate-400">
                    SSID: {template.ssid} | VLAN: {template.defaultVlan} | 认证: {template.authMode === 'static-psk' ? 'PSK' : 'WEP'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${template.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                    {template.enabled ? '启用' : '禁用'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteServiceTemplate(index);
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>

              {selectedItemIndex === index && (
                <div
                  className="mt-4 space-y-4 border-t border-slate-600 pt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">模板名称</label>
                      <input
                        type="text"
                        value={template.templateName}
                        onChange={(e) => updateServiceTemplate(index, { templateName: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">SSID</label>
                      <input
                        type="text"
                        value={template.ssid}
                        onChange={(e) => updateServiceTemplate(index, { ssid: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">描述</label>
                    <input
                      type="text"
                      value={template.description}
                      onChange={(e) => updateServiceTemplate(index, { description: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">默认VLAN</label>
                      <input
                        type="text"
                        value={template.defaultVlan}
                        onChange={(e) => updateServiceTemplate(index, { defaultVlan: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">转发模式</label>
                      <select
                        value={template.forwardType}
                        onChange={(e) => updateServiceTemplate(index, { forwardType: e.target.value as any })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="centralized">集中转发</option>
                        <option value="local">本地转发</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">最大客户端</label>
                      <input
                        type="text"
                        value={template.maxClients}
                        onChange={(e) => updateServiceTemplate(index, { maxClients: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">认证模式</label>
                      <select
                        value={template.authMode}
                        onChange={(e) => updateServiceTemplate(index, { authMode: e.target.value as any })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="static-psk">静态PSK认证</option>
                        <option value="static-wep">静态WEP密钥</option>
                      </select>
                    </div>
                  </div>

                  {template.authMode === 'static-psk' && (
                    <div className="space-y-4">
                      {/* Security Mode */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">安全模式</label>
                        <div className="flex items-center space-x-6">
                          {(['wpa', 'wpa2', 'wpa-wpa2'] as const).map(mode => {
                            const labels = { 'wpa': 'WPA', 'wpa2': 'WPA2', 'wpa-wpa2': 'WPA 或 WPA2' };
                            return (
                              <label key={mode} className="flex items-center space-x-2 cursor-pointer text-slate-300">
                                <input
                                  type="radio"
                                  name={`security-mode-${index}`}
                                  value={mode}
                                  checked={template.securityMode === mode}
                                  onChange={(e) => updateServiceTemplate(index, { securityMode: e.target.value as any })}
                                  className="form-radio h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500"
                                />
                                <span>{labels[mode]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Encryption Suite */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">加密套件</label>
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2 text-slate-400">
                            <input type="radio" checked={template.securityMode === 'wpa'} disabled className="form-radio h-4 w-4" /><span>TKIP</span>
                          </label>
                          <label className="flex items-center space-x-2 text-slate-400">
                            <input type="radio" checked={template.securityMode === 'wpa2'} disabled className="form-radio h-4 w-4" /><span>CCMP</span>
                          </label>
                          <label className="flex items-center space-x-2 text-slate-400">
                            <input type="radio" checked={template.securityMode === 'wpa-wpa2'} disabled className="form-radio h-4 w-4" /><span>TKIP 或 CCMP</span>
                          </label>
                          <label className="flex items-center space-x-2 text-slate-500">
                            <input type="radio" disabled className="form-radio h-4 w-4" /><span>GCMP</span>
                          </label>
                        </div>
                      </div>

                      {/* Static PSK Key */}
                      <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
                        <h5 className="text-base font-medium text-slate-200">静态PSK密钥</h5>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">密钥类型</label>
                          <div className="flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                              <input
                                type="radio"
                                name={`psk-type-${index}`}
                                value="passphrase"
                                checked={template.pskType === 'passphrase'}
                                onChange={(e) => updateServiceTemplate(index, { pskType: e.target.value as any })}
                                className="form-radio h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500"
                              />
                              <span>Passphrase</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                              <input
                                type="radio"
                                name={`psk-type-${index}`}
                                value="rawkey"
                                checked={template.pskType === 'rawkey'}
                                onChange={(e) => updateServiceTemplate(index, { pskType: e.target.value as any })}
                                className="form-radio h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500"
                              />
                              <span>Rawkey</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">密钥</label>
                          <input
                            type="password"
                            value={template.pskPassword}
                            onChange={(e) => updateServiceTemplate(index, { pskPassword: e.target.value })}
                            placeholder="(8-63个字符的字符串)"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">确认密钥</label>
                          <input
                            type="password"
                            value={confirmPasswords[index] || ''}
                            onChange={(e) => setConfirmPasswords(prev => ({ ...prev, [index]: e.target.value }))}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                           {template.pskPassword !== confirmPasswords[index] && confirmPasswords[index] && (
                                <p className="text-xs text-red-400 mt-1">两次输入的密钥不匹配。</p>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {template.authMode === 'static-wep' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">WEP密钥ID</label>
                          <select
                            value={template.wepKeyId}
                            onChange={(e) => updateServiceTemplate(index, { wepKeyId: e.target.value })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">WEP密钥类型</label>
                          <select
                            value={template.wepKeyType}
                            onChange={(e) => updateServiceTemplate(index, { wepKeyType: e.target.value as any })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="passphrase">密码</option>
                            <option value="hex">十六进制</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">WEP加密</label>
                          <select
                            value={template.wepEncryption}
                            onChange={(e) => updateServiceTemplate(index, { wepEncryption: e.target.value as any })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="wep40">WEP40</option>
                            <option value="wep104">WEP104</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">WEP密码</label>
                        <input
                          type="password"
                          value={template.wepPassword}
                          onChange={(e) => updateServiceTemplate(index, { wepPassword: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`ssidHide-${index}`}
                        checked={template.ssidHide}
                        onChange={(e) => updateServiceTemplate(index, { ssidHide: e.target.checked })}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`ssidHide-${index}`} className="text-sm text-slate-300">隐藏SSID</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`serviceEnabled-${index}`}
                        checked={template.enabled}
                        onChange={(e) => updateServiceTemplate(index, { enabled: e.target.checked })}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`serviceEnabled-${index}`} className="text-sm text-slate-300">启用服务</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAPDevices = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">AP设备管理</h3>
        <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
            >
              批量导入AP
            </button>
            <button
              onClick={addAPDevice}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              添加AP设备
            </button>
        </div>
      </div>

      {selectedNode.config.wireless.apDevices.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          暂无AP设备，点击"添加AP设备"开始手动添加
        </div>
      ) : (
        <div className="space-y-3">
          {selectedNode.config.wireless.apDevices.map((device, index) => (
            <div
              key={index}
              className={`bg-slate-800/50 rounded-lg p-4 cursor-pointer border-2 ${selectedItemIndex === index ? 'border-blue-500' : 'border-transparent'
                }`}
              onClick={() => setSelectedItemIndex(selectedItemIndex === index ? -1 : index)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-white">{device.apName}</h4>
                  <p className="text-sm text-slate-400">
                    S/N: {device.serialNumber || '未知'} | 组: {device.groupName || '未分配'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAPDevice(index);
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  删除
                </button>
              </div>

              {selectedItemIndex === index && (
                <div
                  className="mt-4 space-y-3 border-t border-slate-600 pt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">AP名称</label>
                      <input
                        type="text"
                        value={device.apName}
                        onChange={(e) => updateAPDevice(index, { apName: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">型号</label>
                      <input
                        type="text"
                        value={device.model}
                        onChange={(e) => updateAPDevice(index, { model: e.target.value })}
                        placeholder="例如: AP4050DN"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">序列号</label>
                      <input
                        type="text"
                        value={device.serialNumber}
                        onChange={(e) => updateAPDevice(index, { serialNumber: e.target.value })}
                        placeholder="例如: 21023578881SHJ900001"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">所属AP组</label>
                      <select
                        value={device.groupName}
                        onChange={(e) => updateAPDevice(index, { groupName: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择</option>
                        {selectedNode.config.wireless.apGroups.map(group => (
                          <option key={group.groupName} value={group.groupName}>
                            {group.groupName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">描述</label>
                      <input
                        type="text"
                        value={device.description || ''}
                        onChange={(e) => updateAPDevice(index, { description: e.target.value })}
                        placeholder="例如: 1F-MeetingRoom"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );


  const renderContent = () => {
    switch (activeSection) {
      case 'apGroups':
        return renderAPGroups();
      case 'serviceTemplates':
        return renderServiceTemplates();
      case 'apDevices':
        return renderAPDevices();
      default:
        return null;
    }
  };

  const menuItems = [
    { id: 'serviceTemplates', label: '服务模板' },
    { id: 'apGroups', label: 'AP组' },
    { id: 'apDevices', label: 'AP设备' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">无线配置: {selectedNode.name}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-grow flex min-h-0">
          {/* Sidebar */}
          <aside className="w-56 p-4 border-r border-slate-700 flex-shrink-0">
            <nav className="space-y-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id as MenuSection);
                    setSelectedItemIndex(-1); // Reset selection when changing section
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-grow p-6 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
      {isBulkImportOpen && (
        <BulkImportModal
            onClose={() => setIsBulkImportOpen(false)}
            onImport={handleBulkImport}
            vendor={selectedNode.vendor}
        />
      )}
    </div>
  );
};

export default WirelessConfigModal;