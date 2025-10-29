import React, { useState } from 'react';
import { DHCPStaticBinding } from '../types';

interface DHCPBulkImportModalProps {
    onClose: () => void;
    onImport: (bindings: DHCPStaticBinding[]) => void;
}

const CSV_TEMPLATE = `IP地址,MAC地址
192.168.1.100,00-11-22-33-44-55
192.168.1.101,AA:BB:CC:DD:EE:FF
`;

const DHCPBulkImportModal: React.FC<DHCPBulkImportModalProps> = ({ onClose, onImport }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string>('');

    const expectedHeader = ['IP地址', 'MAC地址'];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 512 * 1024) {
                setError('文件大小不能超过512KB。');
                setSelectedFile(null);
            } else {
                setSelectedFile(file);
                setError('');
            }
        }
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'dhcp_static_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const isValidIp = (ip: string) => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
    const isValidMac = (mac: string) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac) || /^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$/.test(mac);


    const handleConfirm = () => {
        if (!selectedFile) {
            setError('请选择要导入的文件。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setError('无法读取文件内容。');
                return;
            }

            try {
                const lines = text.split('\n').map(l => l.trim()).filter(line => line !== '' && !line.startsWith('#'));
                const headerLine = lines.shift();
                if (!headerLine) {
                    throw new Error('CSV文件为空或格式不正确。');
                }
                const header = headerLine.split(',').map(h => h.trim());

                if (!header || header.length !== expectedHeader.length || !header.every((h, i) => h === expectedHeader[i])) {
                    setError('CSV文件头格式不正确，请下载模板文件并参照格式填写。');
                    return;
                }

                const newBindings: DHCPStaticBinding[] = lines.map((line, index) => {
                    const values = line.split(',').map(v => v.trim());
                    if (values.length !== 2) {
                        throw new Error(`第 ${index + 2} 行数据格式错误，应有2列数据。`);
                    }
                    const [ip, mac] = values;
                    if(!isValidIp(ip)) throw new Error(`第 ${index + 2} 行 IP地址格式错误: ${ip}`);
                    if(!isValidMac(mac)) throw new Error(`第 ${index + 2} 行 MAC地址格式错误: ${mac}`);

                    return { ipAddress: ip, macAddress: mac };
                });

                onImport(newBindings);
                onClose();
            } catch (err: any) {
                setError(`解析文件失败: ${err.message}`);
            }
        };

        reader.onerror = () => {
            setError('读取文件时发生错误。');
        };

        reader.readAsText(selectedFile);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center" onClick={onClose}>
            <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-blue-500 text-white rounded-t-lg">
                    <h2 className="text-lg font-bold">批量导入静态绑定</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 border rounded-md p-2 flex-grow">
                             <label htmlFor="file-upload-dhcp" className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">
                                选择文件
                             </label>
                             <input id="file-upload-dhcp" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                             <span className="text-sm text-gray-500 truncate">{selectedFile ? selectedFile.name : '未选择任何文件'}</span>
                        </div>
                        <button onClick={handleDownloadTemplate} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm whitespace-nowrap">
                            下载模板
                        </button>
                    </div>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>请使用CSV格式文件，文件大小不超过512KB。</li>
                        <li><span className="font-bold text-red-600">注意:</span> 请严格按照模板表头格式导入！</li>
                    </ul>
                    {error && <p className="text-sm text-red-500 bg-red-100 p-2 rounded">{error}</p>}
                </div>
                <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg space-x-2">
                    <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
                        取消
                    </button>
                    <button onClick={handleConfirm} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DHCPBulkImportModal;
