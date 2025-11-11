import React, { useCallback } from 'react';
import { Node, SSHUser, Vendor } from '../../types';
import { SpinnerIcon } from '../Icons';

interface SSHConfigProps {
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleFeature: () => void;
    isGenerating: boolean;
}

const SSHConfig: React.FC<SSHConfigProps> = ({ selectedNode, onNodeUpdate, isExpanded, onToggle, onToggleFeature, isGenerating }) => {

    const validatePassword = (password: string): string | undefined => {
        if (!password) return undefined;
        if (password.length < 10) return '密码必须至少10个字符。';
        if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(password)) return '密码必须包含字母和数字。';
        return undefined;
    };

    const updateSSHConfig = useCallback((updates: Partial<Node['config']['ssh']>) => {
        onNodeUpdate({
            ...selectedNode,
            config: {
                ...selectedNode.config,
                ssh: { ...selectedNode.config.ssh, ...updates },
            },
        });
    }, [selectedNode, onNodeUpdate]);

    const addUser = useCallback(() => {
        const newUser: SSHUser = {
            id: `ssh-user-${Date.now()}`,
            username: `user${selectedNode.config.ssh.users.length + 1}`,
            password: '',
            authType: 'password',
            passwordError: undefined,
        };
        updateSSHConfig({ users: [...selectedNode.config.ssh.users, newUser] });
    }, [selectedNode.config.ssh.users, updateSSHConfig]);

    const updateUser = useCallback((index: number, updates: Partial<SSHUser>) => {
        const newUsers = [...selectedNode.config.ssh.users];
        const updatedUser = { ...newUsers[index], ...updates };

        if ('password' in updates) {
            updatedUser.passwordError = validatePassword(updates.password || '');
        }

        newUsers[index] = updatedUser;
        updateSSHConfig({ users: newUsers });
    }, [selectedNode.config.ssh.users, updateSSHConfig]);

    const removeUser = useCallback((index: number) => {
        updateSSHConfig({ users: selectedNode.config.ssh.users.filter((_, i) => i !== index) });
    }, [selectedNode.config.ssh.users, updateSSHConfig]);

    const config = selectedNode.config.ssh;

    return (
        <div className="bg-slate-700/50 rounded-lg">
            <div
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-slate-600/50 rounded-t-lg"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className={`transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <h4 className="font-semibold">SSH Server</h4>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFeature(); }}
                    className={`px-2 py-1 text-xs rounded-full ${config.enabled ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                    {config.enabled ? 'Enabled' : 'Disabled'}
                </button>
            </div>
            {isExpanded && config.enabled && (
                <div className="border-t border-slate-600 p-3 space-y-4">
                    {/* Public Key and Domain Name */}
                    <div className="grid grid-cols-2 gap-3">
                        {selectedNode.vendor === Vendor.Cisco && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Public Key Type</label>
                                <select
                                    value={config.publicKeyType}
                                    onChange={(e) => updateSSHConfig({ publicKeyType: e.target.value as 'rsa' | 'dsa' })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                >
                                    <option value="rsa">RSA</option>
                                    <option value="dsa">DSA</option>
                                </select>
                            </div>
                        )}
                        {selectedNode.vendor === Vendor.Cisco && (
                             <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">IP Domain Name</label>
                                <input type="text" value={config.domainName} onChange={(e) => updateSSHConfig({ domainName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                            </div>
                        )}
                         {selectedNode.vendor === Vendor.Huawei && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">SSH Source Interface (Optional)</label>
                                <input 
                                    type="text" 
                                    value={config.sourceInterface || ''} 
                                    onChange={(e) => updateSSHConfig({ sourceInterface: e.target.value })} 
                                    placeholder="e.g., Vlanif10" 
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" 
                                />
                            </div>
                        )}
                    </div>

                    {/* VTY Line Configuration */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">VTY Lines</label>
                            <input type="text" value={config.vtyLines} onChange={(e) => updateSSHConfig({ vtyLines: e.target.value })} placeholder="0 4" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Auth Mode</label>
                            <select
                                value={config.authenticationMode}
                                onChange={(e) => updateSSHConfig({ authenticationMode: e.target.value as any })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                            >
                                <option value="scheme">Scheme / Local</option>
                                <option value="password">Password</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Protocol In</label>
                            <select
                                value={config.protocolInbound}
                                onChange={(e) => updateSSHConfig({ protocolInbound: e.target.value as any })}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                            >
                                <option value="ssh">SSH</option>
                                <option value="telnet">Telnet</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                    </div>

                    {/* SSH Users */}
                    <div className="pt-3 border-t border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-slate-300">SSH Users</label>
                            <button onClick={addUser} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded">
                                Add User
                            </button>
                        </div>
                        {config.users.map((user, index) => (
                            <div key={user.id} className="bg-slate-800/50 p-2 rounded mb-2">
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                                        <input
                                            type="text"
                                            value={user.username}
                                            onChange={(e) => updateUser(index, { username: e.target.value })}
                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={user.password}
                                            onChange={(e) => updateUser(index, { password: e.target.value })}
                                            className={`w-full bg-slate-700 border rounded px-2 py-1 text-white text-xs ${user.passwordError ? 'border-red-500' : 'border-slate-600'}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeUser(index)}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                    >
                                        Remove
                                    </button>
                                </div>
                                {user.passwordError && <p className="text-xs text-red-400 mt-1 pl-1">{user.passwordError}</p>}
                            </div>
                        ))}
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold mb-1 text-slate-300">CLI Commands</h5>
                        <pre className="text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 min-h-[5rem] flex items-center justify-center">
                            {isGenerating ? (
                                <div className="flex items-center text-slate-400">
                                    <SpinnerIcon className="w-4 h-4 mr-2" />
                                    <span>Generating...</span>
                                </div>
                            ) : (
                                config.cli || <span className="text-slate-500">配置完成后将显示CLI命令</span>
                            )}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SSHConfig;