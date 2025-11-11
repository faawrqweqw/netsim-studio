import React, { useState, useEffect, useMemo } from 'react';
import { Vendor } from '../types';
import { DownloadIcon, UploadIcon, TrashIcon } from './Icons';

interface CommandTemplate {
  name: string;
  vendor: string;
  deviceType: string;
  commands: CommandEntry[];
}

interface CommandEntry {
  id: string;
  name: string;
  cmd: string;
  parse?: string;
  category: string;
}

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<CommandTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommandTemplate | null>(null);
  const [filterVendor, setFilterVendor] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 加载本地存储的模板
  useEffect(() => {
    const stored = localStorage.getItem('inspection-templates');
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse templates:', e);
      }
    } else {
      // 加载默认模板
      loadDefaultTemplates();
    }
  }, []);

  // 保存模板到本地存储
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem('inspection-templates', JSON.stringify(templates));
    }
  }, [templates]);

  const loadDefaultTemplates = () => {
    const defaultTemplates: CommandTemplate[] = [
      {
        name: '华为防火墙基础巡检',
        vendor: 'Huawei',
        deviceType: 'Firewall',
        commands: [
          { id: '1', name: 'CPU使用率', cmd: 'display cpu-usage', parse: 'CPU utilization for five seconds: (\\d+)%', category: '性能监控' },
          { id: '2', name: '内存使用率', cmd: 'display memory', parse: 'Memory Using Rate : (\\d+)%', category: '性能监控' },
          { id: '3', name: '风扇状态', cmd: 'display fan', parse: '', category: '硬件状态' },
          { id: '4', name: '电源状态', cmd: 'display power', parse: '', category: '硬件状态' },
          { id: '5', name: '设备温度', cmd: 'display device temperature', parse: '', category: '硬件状态' },
        ]
      },
      {
        name: '华为交换机基础巡检',
        vendor: 'Huawei',
        deviceType: 'Switch',
        commands: [
          { id: '1', name: 'CPU使用率', cmd: 'display cpu-usage', parse: 'CPU utilization for five seconds: (\\d+)%', category: '性能监控' },
          { id: '2', name: '内存使用率', cmd: 'display memory', parse: 'Memory Using Rate : (\\d+)%', category: '性能监控' },
          { id: '3', name: '接口状态', cmd: 'display interface brief', parse: '', category: '接口监控' },
          { id: '4', name: 'MAC地址表', cmd: 'display mac-address', parse: '', category: '业务状态' },
          { id: '5', name: 'VLAN信息', cmd: 'display vlan', parse: '', category: '业务状态' },
        ]
      },
      {
        name: 'H3C交换机基础巡检',
        vendor: 'H3C',
        deviceType: 'Switch',
        commands: [
          { id: '1', name: 'CPU使用率', cmd: 'display cpu-usage', parse: 'CPU utilization for five seconds: (\\d+)%', category: '查看CPU使用率' },
          { id: '2', name: '内存使用率', cmd: 'display memory', parse: 'FreeRatio\\s+(\\d+\\.?\\d*)%', category: '查询内存使用率' },
          { id: '3', name: '系统版本', cmd: 'display version', parse: '', category: '查看系统版本' },
          { id: '4', name: '风扇状态', cmd: 'display fan', parse: '', category: '硬件状态' },
          { id: '5', name: '电源状态', cmd: 'display power', parse: '', category: '硬件状态' },
          { id: '6', name: '接口状态', cmd: 'display interface brief', parse: '', category: '接口监控' },
          { id: '7', name: 'MAC地址表', cmd: 'display mac-address', parse: '', category: '业务状态' },
        ]
      },
      {
        name: 'Cisco基础巡检',
        vendor: 'Cisco',
        deviceType: 'Switch',
        commands: [
          { id: '1', name: 'CPU使用率', cmd: 'show processes cpu', parse: 'CPU utilization.*five seconds: (\\d+)%', category: '性能监控' },
          { id: '2', name: '内存使用率', cmd: 'show memory summary', parse: 'Processor\\s+\\d+\\s+\\d+\\s+(\\d+)', category: '性能监控' },
          { id: '3', name: '版本信息', cmd: 'show version', parse: '', category: '设备信息' },
          { id: '4', name: '接口状态', cmd: 'show interface brief', parse: '', category: '接口监控' },
        ]
      }
    ];
    setTemplates(defaultTemplates);
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchVendor = filterVendor === 'all' || t.vendor === filterVendor;
      const matchSearch = !searchTerm || 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.deviceType.toLowerCase().includes(searchTerm.toLowerCase());
      return matchVendor && matchSearch;
    });
  }, [templates, filterVendor, searchTerm]);

  const handleCreateNew = () => {
    const newTemplate: CommandTemplate = {
      name: '新建模板',
      vendor: 'Huawei',
      deviceType: 'Switch',
      commands: []
    };
    setEditingTemplate(newTemplate);
    setIsEditing(true);
  };

  const handleEditTemplate = (template: CommandTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    const existingIndex = templates.findIndex(t => t.name === editingTemplate.name && t.vendor === editingTemplate.vendor);
    if (existingIndex >= 0) {
      const updated = [...templates];
      updated[existingIndex] = editingTemplate;
      setTemplates(updated);
    } else {
      setTemplates([...templates, editingTemplate]);
    }
    
    setIsEditing(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (template: CommandTemplate) => {
    if (confirm(`确定要删除模板 "${template.name}" 吗?`)) {
      setTemplates(templates.filter(t => !(t.name === template.name && t.vendor === template.vendor)));
      if (selectedTemplate?.name === template.name) {
        setSelectedTemplate(null);
      }
    }
  };

  const handleAddCommand = () => {
    if (!editingTemplate) return;
    const newCommand: CommandEntry = {
      id: Date.now().toString(),
      name: '新命令',
      cmd: '',
      parse: '',
      category: '未分类'
    };
    setEditingTemplate({
      ...editingTemplate,
      commands: [...editingTemplate.commands, newCommand]
    });
  };

  const handleUpdateCommand = (id: string, field: keyof CommandEntry, value: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      commands: editingTemplate.commands.map(cmd =>
        cmd.id === id ? { ...cmd, [field]: value } : cmd
      )
    });
  };

  const handleDeleteCommand = (id: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      commands: editingTemplate.commands.filter(cmd => cmd.id !== id)
    });
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.yaml,.yml';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            const content = event.target.result;
            let imported: any;
            
            if (file.name.endsWith('.json')) {
              imported = JSON.parse(content);
            } else {
              // 简单的YAML解析(实际项目中应使用js-yaml库)
              alert('YAML格式导入功能需要安装js-yaml库');
              return;
            }
            
            // 验证导入的数据
            if (Array.isArray(imported)) {
              setTemplates([...templates, ...imported]);
            } else if (imported.commands) {
              setTemplates([...templates, imported]);
            } else {
              alert('导入的文件格式不正确');
            }
          } catch (e) {
            alert('文件解析失败: ' + e);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportTemplate = (template: CommandTemplate) => {
    const dataStr = JSON.stringify(template, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${template.vendor}-${template.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAllTemplates = () => {
    const dataStr = JSON.stringify(templates, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-templates-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isEditing && editingTemplate) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">编辑模板</h3>
          <div className="flex gap-2">
            <button onClick={() => { setIsEditing(false); setEditingTemplate(null); }} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500">
              取消
            </button>
            <button onClick={handleSaveTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              保存
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">模板名称</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">厂商</label>
              <select
                value={editingTemplate.vendor}
                onChange={e => setEditingTemplate({ ...editingTemplate, vendor: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-md"
              >
                <option value="Huawei">Huawei</option>
                <option value="Cisco">Cisco</option>
                <option value="H3C">H3C</option>
                <option value="Ruijie">Ruijie</option>
                <option value="Sangfor">Sangfor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">设备类型</label>
              <input
                type="text"
                value={editingTemplate.deviceType}
                onChange={e => setEditingTemplate({ ...editingTemplate, deviceType: e.target.value })}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-md"
                placeholder="如: Switch, Router, Firewall"
              />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-white">命令列表</h4>
              <button onClick={handleAddCommand} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                + 添加命令
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {editingTemplate.commands.map((cmd) => (
                <div key={cmd.id} className="bg-slate-800/50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <input
                      type="text"
                      value={cmd.name}
                      onChange={e => handleUpdateCommand(cmd.id, 'name', e.target.value)}
                      placeholder="命令名称"
                      className="bg-slate-700 text-white px-2 py-1 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={cmd.category}
                      onChange={e => handleUpdateCommand(cmd.id, 'category', e.target.value)}
                      placeholder="分类"
                      className="bg-slate-700 text-white px-2 py-1 rounded text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={cmd.cmd}
                    onChange={e => handleUpdateCommand(cmd.id, 'cmd', e.target.value)}
                    placeholder="命令(如: display cpu-usage)"
                    className="w-full bg-slate-700 text-white px-2 py-1 rounded text-sm mb-2 font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cmd.parse || ''}
                      onChange={e => handleUpdateCommand(cmd.id, 'parse', e.target.value)}
                      placeholder="正则表达式(可选)"
                      className="flex-1 bg-slate-700 text-white px-2 py-1 rounded text-sm font-mono"
                    />
                    <button onClick={() => handleDeleteCommand(cmd.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {editingTemplate.commands.length === 0 && (
                <p className="text-center text-slate-500 py-8">暂无命令,点击上方按钮添加</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-800 rounded-lg space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">命令模板管理</h3>
        <div className="flex gap-2">
          <button onClick={handleImportTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
            <UploadIcon className="w-4 h-4" />
            导入模板
          </button>
          <button onClick={handleExportAllTemplates} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            导出全部
          </button>
          <button onClick={handleCreateNew} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            + 新建模板
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-md"
            />
          </div>
          <select
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value)}
            className="bg-slate-700 text-white px-3 py-2 rounded-md"
          >
            <option value="all">全部厂商</option>
            <option value="Huawei">Huawei</option>
            <option value="Cisco">Cisco</option>
            <option value="H3C">H3C</option>
            <option value="Ruijie">Ruijie</option>
            <option value="Sangfor">Sangfor</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, idx) => (
            <div key={idx} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-semibold text-white">{template.name}</h4>
                  <p className="text-sm text-slate-400">
                    {template.vendor} - {template.deviceType}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleExportTemplate(template)} className="p-1 text-blue-400 hover:text-blue-300" title="导出">
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteTemplate(template)} className="p-1 text-red-400 hover:text-red-300" title="删除">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-slate-300 mb-3">
                <p>命令数量: {template.commands.length}</p>
                <p>分类: {Array.from(new Set(template.commands.map(c => c.category))).join(', ')}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedTemplate(template)} className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  查看详情
                </button>
                <button onClick={() => handleEditTemplate(template)} className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                  编辑
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>暂无模板</p>
            <button onClick={handleCreateNew} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              创建第一个模板
            </button>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-semibold text-white">{selectedTemplate.name}</h3>
                <p className="text-slate-400">{selectedTemplate.vendor} - {selectedTemplate.deviceType}</p>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="text-slate-400 hover:text-white text-3xl">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <h4 className="text-lg font-semibold text-white mb-4">命令列表 ({selectedTemplate.commands.length})</h4>
              {Object.entries(
                selectedTemplate.commands.reduce((acc, cmd) => {
                  if (!acc[cmd.category]) acc[cmd.category] = [];
                  acc[cmd.category].push(cmd);
                  return acc;
                }, {} as Record<string, CommandEntry[]>)
              ).map(([category, cmds]) => (
                <div key={category} className="bg-slate-800/50 p-4 rounded-lg">
                  <h5 className="text-md font-semibold text-slate-300 mb-3">{category}</h5>
                  <div className="space-y-2">
                    {cmds.map(cmd => (
                      <div key={cmd.id} className="bg-slate-900/50 p-3 rounded">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-white">{cmd.name}</span>
                        </div>
                        <code className="text-sm text-cyan-400 block mb-1">{cmd.cmd}</code>
                        {cmd.parse && (
                          <div className="text-xs text-slate-400">
                            <span className="font-medium">正则: </span>
                            <code className="text-yellow-400">{cmd.parse}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
