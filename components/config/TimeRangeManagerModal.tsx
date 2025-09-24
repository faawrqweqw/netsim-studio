
import React, { useState } from 'react';
import { Node, TimeRange, TimeRangeDaySelection } from '../../types';

const Field = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (<div className={className}><label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>{children}</div>);
const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (<input {...props} className={`w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`} />);

interface TimeRangeManagerModalProps {
    timeRanges: TimeRange[];
    selectedNode: Node;
    onNodeUpdate: (node: Node) => void;
    onClose: () => void;
}

const TimeRangeManagerModal: React.FC<TimeRangeManagerModalProps> = ({ timeRanges, selectedNode, onNodeUpdate, onClose }) => {
    const [editingRange, setEditingRange] = useState<TimeRange | null>(null);

    const handleSave = (rangeToSave: TimeRange) => {
        const existingIndex = timeRanges.findIndex(tr => tr.id === rangeToSave.id);
        let newTimeRanges;
        if (existingIndex > -1) {
            newTimeRanges = timeRanges.map((tr, index) => index === existingIndex ? rangeToSave : tr);
        } else {
            newTimeRanges = [...timeRanges, rangeToSave];
        }
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, timeRanges: newTimeRanges } });
        setEditingRange(null);
    };

    const handleDelete = (id: string) => {
        const newTimeRanges = timeRanges.filter(tr => tr.id !== id);
        onNodeUpdate({ ...selectedNode, config: { ...selectedNode.config, timeRanges: newTimeRanges } });
    };

    const handleAddNew = () => {
        setEditingRange({
            id: `tr-${Date.now()}`,
            name: `time-range-${timeRanges.length + 1}`,
            periodic: {
                enabled: true,
                startTime: '08:00',
                endTime: '17:00',
                days: { daily: true },
            },
            absolute: {
                enabled: false,
                fromTime: '',
                fromDate: '',
                toTime: '',
                toDate: '',
            },
        });
    };

    const DaySelector = ({ days, setDays }: { days: TimeRangeDaySelection, setDays: (days: TimeRangeDaySelection) => void }) => {
        const dayMap: { key: keyof TimeRangeDaySelection, label: string }[] = [
            { key: 'monday', label: '一' }, { key: 'tuesday', label: '二' }, { key: 'wednesday', label: '三' }, { key: 'thursday', label: '四' },
            { key: 'friday', label: '五' }, { key: 'saturday', label: '六' }, { key: 'sunday', label: '日' },
        ];
        
        const handlePresetClick = (preset: 'daily' | 'working' | 'off') => {
            if (preset === 'daily') setDays({ daily: true });
            else if (preset === 'working') setDays({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true });
            else if (preset === 'off') setDays({ saturday: true, sunday: true });
        };
        
        const isDaily = !!days.daily;
        const isWorking = !!(days.monday && days.tuesday && days.wednesday && days.thursday && days.friday && !days.saturday && !days.sunday);
        const isOff = !!(days.saturday && days.sunday && !days.monday && !days.tuesday && !days.wednesday && !days.thursday && !days.friday);

        return (
            <div className="space-y-3">
                 <div className="flex items-center gap-2">
                    <button onClick={() => handlePresetClick('daily')} className={`px-3 py-1 text-xs rounded-md ${isDaily ? 'bg-blue-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>每天</button>
                    <button onClick={() => handlePresetClick('working')} className={`px-3 py-1 text-xs rounded-md ${isWorking ? 'bg-blue-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>工作日</button>
                    <button onClick={() => handlePresetClick('off')} className={`px-3 py-1 text-xs rounded-md ${isOff ? 'bg-blue-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>休息日</button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-slate-600/50">
                    {dayMap.map(day => (
                        <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={!!days[day.key] || isDaily} disabled={isDaily} onChange={e => setDays({ ...days, daily: false, [day.key]: e.target.checked })} className="rounded disabled:opacity-50" />
                            {day.label}
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-600 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold p-4 border-b border-slate-700">时间段管理</h3>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {editingRange ? (
                        <div className="space-y-3 bg-slate-700/50 p-3 rounded">
                            <h4 className="text-base font-medium">{editingRange.id.startsWith('tr-') ? '添加新时间段' : '编辑时间段'}</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <Field label="名称"><Input value={editingRange.name} onChange={e => setEditingRange({ ...editingRange, name: e.target.value })} /></Field>
                                <Field label="开始时间 (HH:MM)"><Input type="time" value={editingRange.periodic.startTime} onChange={e => setEditingRange({ ...editingRange, periodic: { ...editingRange.periodic, startTime: e.target.value } })} /></Field>
                                <Field label="结束时间 (HH:MM)"><Input type="time" value={editingRange.periodic.endTime} onChange={e => setEditingRange({ ...editingRange, periodic: { ...editingRange.periodic, endTime: e.target.value } })} /></Field>
                            </div>
                            <Field label="生效日期"><DaySelector days={editingRange.periodic.days} setDays={(d) => setEditingRange({ ...editingRange, periodic: { ...editingRange.periodic, days: d } })} /></Field>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingRange(null)} className="px-3 py-1 bg-slate-600 rounded text-sm">取消</button>
                                <button onClick={() => handleSave(editingRange)} className="px-3 py-1 bg-blue-600 rounded text-sm">保存</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-end">
                            <button onClick={handleAddNew} className="px-3 py-1 bg-green-600 rounded text-sm">添加时间段</button>
                        </div>
                    )}
                    <div className="space-y-2">
                        {timeRanges.map(tr => (
                            <div key={tr.id} className="bg-slate-900/50 p-2 rounded flex justify-between items-center text-sm">
                                <div><span className="font-semibold text-slate-300">{tr.name}:</span> <span className="text-slate-400">{tr.periodic.startTime} - {tr.periodic.endTime} ({tr.periodic.days.daily ? '每天' : Object.entries(tr.periodic.days).filter(([_, v]) => v).map(([k]) => k.slice(0,3)).join(', ')})</span></div>
                                <div className="flex gap-3">
                                    <button onClick={() => setEditingRange(tr)} className="text-blue-400 hover:text-blue-300">编辑</button>
                                    <button onClick={() => handleDelete(tr.id)} className="text-red-400 hover:text-red-300">删除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md text-sm">关闭</button>
                </div>
            </div>
        </div>
    );
};

export default TimeRangeManagerModal;
