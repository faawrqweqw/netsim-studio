import React, { useState } from 'react';
import { APDevice, Vendor } from '../types';

interface BulkImportModalProps {
    onClose: () => void;
    onImport: (devices: APDevice[]) => void;
    vendor: Vendor;
}

const H3C_CSV_TEMPLATE = `#apmgr.list
#此文件头在导入时需要保留，不能随意修改
#本文件用于导入时必须以csv格式保存，不能修改文件名以及文件格式
AP名称,AP型号,序列号,AP组,描述
AP-Example-1,WA6320-HCL,21023578881SHJ900001,default-group,1F-MeetingRoom
AP-Example-2,WA6628,21023578881SHJ900002,default-group,2F-Office
`;

const ADVANCED_CSV_TEMPLATE = `#apmgr.list
#此文件头在导入时需要保留，不能随意修改
#本文件用于导入时必须以csv格式保存，不能修改文件名以及文件格式
AP名称,AP MAC地址,AP SN,AP组
AP-5,0005-e04c-0001,apsn61780601,group1
AP-6,0003-e05c-0002,apsn16507802,group2
`;

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImport, vendor }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string>('');

    const isAdvanced = vendor === Vendor.Huawei || vendor === Vendor.Cisco;
    const templateContent = isAdvanced ? ADVANCED_CSV_TEMPLATE : H3C_CSV_TEMPLATE;
    const expectedHeader = isAdvanced
        ? ['AP名称', 'AP MAC地址', 'AP SN', 'AP组']
        : ['AP名称', 'AP型号', '序列号', 'AP组', '描述'];

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
        const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'ap_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                const lines = text.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
                const headerLine = lines.shift();
                if (!headerLine) {
                    throw new Error('CSV文件为空或格式不正确。');
                }
                const header = headerLine.trim().split(',');

                if (!header || header.length !== expectedHeader.length || !header.every((h, i) => h.trim() === expectedHeader[i])) {
                    setError('CSV文件头格式不正确，请下载模板文件并参照格式填写。');
                    return;
                }

                const newDevices: APDevice[] = lines.map((line, index) => {
                    const values = line.trim().split(',');
                    if (values.length !== expectedHeader.length) {
                        throw new Error(`第 ${index + 2} 行数据格式错误，应有${expectedHeader.length}列数据。`);
                    }
                    if (isAdvanced) {
                        return {
                            apName: values[0].trim(),
                            macAddress: values[1].trim(),
                            serialNumber: values[2].trim(),
                            groupName: values[3].trim(),
                            model: '',
                            description: '',
                        };
                    } else {
                        return {
                            apName: values[0].trim(),
                            model: values[1].trim(),
                            serialNumber: values[2].trim(),
                            groupName: values[3].trim(),
                            description: values[4].trim(),
                            macAddress: '',
                        };
                    }
                });

                onImport(newDevices);
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white text-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-blue-500 text-white rounded-t-lg">
                    <h2 className="text-lg font-bold">批量导入AP</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 border rounded-md p-2 flex-grow">
                             <label htmlFor="file-upload" className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md text-sm">
                                选择文件
                             </label>
                             <input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                             <span className="text-sm text-gray-500 truncate">{selectedFile ? selectedFile.name : '未选择任何文件'}</span>
                        </div>
                        <button onClick={handleDownloadTemplate} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm whitespace-nowrap">
                            下载CSV文件模板
                        </button>
                    </div>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>批量导入.csv文件大小不能超过512KB。</li>
                        <li><span className="font-bold text-red-600">注意:</span> 批量导入过程中，请不要关闭或刷新页面！</li>
                        <li><span className="font-bold text-red-600">注意:</span> 请严格按照模板表头格式导入，否则可能导入失败！</li>
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

export default BulkImportModal;