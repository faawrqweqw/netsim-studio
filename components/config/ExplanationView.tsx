import React from 'react';

interface ExplanationViewProps {
    explanation: string;
}

const ExplanationView: React.FC<ExplanationViewProps> = ({ explanation }) => {
    return (
        <div className="h-full flex flex-col">
            <h4 className="font-semibold mb-2 text-slate-300">配置说明</h4>
            <div className="flex-1 min-h-0">
                <div className="text-xs bg-slate-900 rounded p-3 overflow-y-auto h-full border border-slate-600">
                    <pre className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                        {explanation || <span className="text-slate-500">启用并配置功能后，这里将显示详细的中文配置说明。</span>}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default ExplanationView;