import React, { useState, useEffect, useMemo } from 'react';
import { Vendor } from '../../types';
import { VENDOR_LOGOS } from '../../constants';
import { findCommand } from '../../services/cli/commandService';

interface CommandHelperViewProps {
    vendor: Vendor;
}

const CommandHelperView: React.FC<CommandHelperViewProps> = ({ vendor: initialVendor }) => {
    const [command, setCommand] = useState('');
    const [result, setResult] = useState<{ explanation: string; convertedCommand: string } | null>(null);
    
    const vendorOptions = useMemo(() => [Vendor.Cisco, Vendor.Huawei, Vendor.H3C], []);

    const [sourceVendor, setSourceVendor] = useState<Vendor>(initialVendor);
    const [targetVendor, setTargetVendor] = useState<Vendor>(() => 
        vendorOptions.find(v => v !== initialVendor) || Vendor.Cisco
    );

    // Effect to update vendors when the selected node (initialVendor) changes
    useEffect(() => {
        setSourceVendor(initialVendor);
        if (initialVendor === targetVendor) {
            setTargetVendor(vendorOptions.find(v => v !== initialVendor) || vendorOptions[0]);
        }
    }, [initialVendor, vendorOptions]);

    const handleSourceVendorChange = (newSource: Vendor) => {
        setSourceVendor(newSource);
        if (newSource === targetVendor) {
            setTargetVendor(vendorOptions.find(v => v !== newSource) || vendorOptions[0]);
        }
    };

    const handleTargetVendorChange = (newTarget: Vendor) => {
        setTargetVendor(newTarget);
    };
    
    const handleQuery = () => {
        if (!command) {
            setResult(null);
            return;
        }
        const { explanation, convertedCommand } = findCommand(sourceVendor, targetVendor, command);
        setResult({ explanation, convertedCommand });
    };

    return (
        <div className="h-full flex flex-col text-sm">
            <h4 className="font-semibold mb-2 text-slate-300">Command Helper</h4>
            <p className="text-xs text-slate-400 mb-4">
                Enter a command for a source vendor and select a target vendor to see the equivalent command and explanation.
            </p>

            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-3">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Source Vendor</label>
                    <select
                        value={sourceVendor}
                        onChange={(e) => handleSourceVendorChange(e.target.value as Vendor)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {vendorOptions.map(v => <option key={v} value={v}>{VENDOR_LOGOS[v]}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Target Vendor</label>
                    <select
                        value={targetVendor}
                        onChange={(e) => handleTargetVendorChange(e.target.value as Vendor)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {vendorOptions.filter(v => v !== sourceVendor).map(v => <option key={v} value={v}>{VENDOR_LOGOS[v]}</option>)}
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleQuery}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-500"
                        disabled={!command}
                    >
                        Convert
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Source Command</label>
                <textarea
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="e.g., vlan 10&#10;interface vlanif 10"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    rows={4}
                />
            </div>

            {result ? (
                <div className="flex-1 min-h-0 flex flex-col gap-4">
                    <div className="flex-1 min-h-0 bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                        <h5 className="font-semibold text-slate-300 mb-2">Explanation</h5>
                        <div className="flex-1 overflow-y-auto bg-slate-800 p-3 rounded-md">
                            <p className="text-slate-400 whitespace-pre-wrap">{result.explanation}</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col">
                        <h5 className="font-semibold text-slate-300 mb-2">Converted Command</h5>
                        <div className="flex-1 overflow-y-auto bg-slate-800 p-3 rounded-md">
                             <p className="font-mono text-cyan-400 whitespace-pre-wrap">
                                {result.convertedCommand}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-700">
                    <p className="text-slate-500">Enter a command to see the conversion.</p>
                </div>
            )}
        </div>
    );
};

export default CommandHelperView;