import React from 'react';

interface CommandsViewProps {
    cliCommands: string;
}

const CommandsView: React.FC<CommandsViewProps> = ({ cliCommands }) => {
    return (
        <div className="h-full flex flex-col">
            <h4 className="font-semibold mb-2 text-slate-300">设备配置命令</h4>
            <div className="flex-1 min-h-0">
                <pre className="text-xs bg-slate-900 rounded p-3 overflow-y-auto whitespace-pre-wrap h-full border border-slate-600">
                    {cliCommands || <span className="text-slate-500">启用并配置功能后，这里将显示生成的CLI命令。</span>}
                </pre>
            </div>
        </div>
    );
};

export default CommandsView;