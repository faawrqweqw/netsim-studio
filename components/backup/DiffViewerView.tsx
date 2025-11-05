import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 使用相对路径，支持部署到服务器
const API_BASE_URL = '/api';

interface Backup {
  id: string;
  filename: string;
  filepath: string;
  timestamp: string;
  size: number;
}

interface DiffChange {
  added?: boolean;
  removed?: boolean;
  value: string;
}

interface DiffResult {
  patch: string;
  htmlDiff: string;
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
  changes: DiffChange[];
}

interface DiffViewerViewProps {
  backup1: Backup | null;
  backup2: Backup | null;
  onClear: () => void;
}

const DiffViewerView: React.FC<DiffViewerViewProps> = ({ backup1, backup2, onClear }) => {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oldFileContent, setOldFileContent] = useState<string>('');
  const [newFileContent, setNewFileContent] = useState<string>('');

  useEffect(() => {
    if (backup1 && backup2) {
      loadDiff();
    }
  }, [backup1, backup2]);

  // 渲染带高亮的文件内容
  const renderFileWithHighlights = (content: string, type: 'old' | 'new') => {
    if (!content || !diff) {
      return <pre className="text-slate-400 m-0">{content}</pre>;
    }

    const lines = content.split('\n');
    const highlightedLines: { line: string; type: 'added' | 'removed' | 'unchanged' }[] = [];

    // 构建差异行映射
    const diffMap = new Map<number, 'added' | 'removed'>();
    let lineNum = 0;

    diff.changes.forEach(change => {
      const changeLines = change.value.split('\n');
      changeLines.forEach((line, idx) => {
        // 跳过空的最后一行
        if (idx === changeLines.length - 1 && line === '') return;

        if (type === 'old' && change.removed) {
          diffMap.set(lineNum, 'removed');
        } else if (type === 'new' && change.added) {
          diffMap.set(lineNum, 'added');
        }
        lineNum++;
      });
    });

    // 为每一行添加高亮
    return lines.map((line, index) => {
      const lineType = diffMap.get(index);
      
      if (lineType === 'added') {
        return (
          <div key={index} className="flex bg-green-900/30 border-l-4 border-green-500 px-2 py-1">
            <span className="text-slate-500 min-w-[40px] mr-4 select-none">{index + 1}</span>
            <pre className="text-green-200 whitespace-pre-wrap break-all flex-1 m-0">{line || ' '}</pre>
          </div>
        );
      } else if (lineType === 'removed') {
        return (
          <div key={index} className="flex bg-red-900/30 border-l-4 border-red-500 px-2 py-1">
            <span className="text-slate-500 min-w-[40px] mr-4 select-none">{index + 1}</span>
            <pre className="text-red-200 whitespace-pre-wrap break-all flex-1 m-0">{line || ' '}</pre>
          </div>
        );
      } else {
        return (
          <div key={index} className="flex hover:bg-slate-800/50 px-2 py-1">
            <span className="text-slate-500 min-w-[40px] mr-4 select-none">{index + 1}</span>
            <pre className="text-slate-300 whitespace-pre-wrap break-all flex-1 m-0">{line || ' '}</pre>
          </div>
        );
      }
    });
  };

  const loadDiff = async () => {
    if (!backup1 || !backup2) return;

    setLoading(true);
    setError(null);

    try {
      // 加载差异数据
      const response = await axios.post(`${API_BASE_URL}/diff/backups`, {
        oldFilepath: backup1.filepath,
        newFilepath: backup2.filepath
      });
      setDiff(response.data.diff);

      // 加载完整文件内容
      const [oldContent, newContent] = await Promise.all([
        axios.get(`${API_BASE_URL}/backups/content`, {
          params: { filepath: backup1.filepath }
        }),
        axios.get(`${API_BASE_URL}/backups/content`, {
          params: { filepath: backup2.filepath }
        })
      ]);

      setOldFileContent(oldContent.data.content || '');
      setNewFileContent(newContent.data.content || '');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!backup1 || !backup2) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold text-white mb-6">配置差异对比</h2>
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">请先从备份历史中选择两个备份进行对比</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">配置差异对比</h2>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
        >
          返回
        </button>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">旧版本</h3>
            <p className="text-sm text-slate-300">{backup1.filename}</p>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(backup1.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="text-center text-4xl text-blue-500">→</div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">新版本</h3>
            <p className="text-sm text-slate-300">{backup2.filename}</p>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(backup2.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">正在分析差异...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-md mb-6">
          <strong>错误:</strong> {error}
        </div>
      )}

      {diff && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg text-center">
              <div className="text-sm text-slate-400 mb-1">新增行</div>
              <div className="text-3xl font-bold text-green-400">{diff.stats.added}</div>
            </div>
            <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg text-center">
              <div className="text-sm text-slate-400 mb-1">删除行</div>
              <div className="text-3xl font-bold text-red-400">{diff.stats.removed}</div>
            </div>
            <div className="bg-slate-700 border border-slate-600 p-4 rounded-lg text-center">
              <div className="text-sm text-slate-400 mb-1">未变化</div>
              <div className="text-3xl font-bold text-slate-300">{diff.stats.unchanged}</div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">变更详情</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 旧版本文件 */}
              <div className="bg-slate-900 rounded-lg">
                <div className="bg-slate-700 px-4 py-2 font-semibold text-white border-b border-slate-600">
                  旧版本
                </div>
                <div className="p-4 max-h-[600px] overflow-auto font-mono text-xs">
                  {renderFileWithHighlights(oldFileContent, 'old')}
                </div>
              </div>

              {/* 新版本文件 */}
              <div className="bg-slate-900 rounded-lg">
                <div className="bg-slate-700 px-4 py-2 font-semibold text-white border-b border-slate-600">
                  新版本
                </div>
                <div className="p-4 max-h-[600px] overflow-auto font-mono text-xs">
                  {renderFileWithHighlights(newFileContent, 'new')}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiffViewerView;
