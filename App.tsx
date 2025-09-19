import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Node, Connection, DeviceType, Vendor, Port, LinkConfig } from './types';
import { TOOLBAR_ITEMS, DEFAULT_NODE_CONFIG, DEFAULT_NODE_STYLE, generatePorts, DEFAULT_LINK_CONFIG } from './constants';
import { DownloadIcon, ImageIcon, TrashIcon, BroomIcon } from './components/Icons';
import ConfigPanel from './components/ConfigPanel';
import Canvas from './components/Canvas';
import PortSelectionMenu from './components/PortSelectionMenu';

type ActiveTool = 'select' | 'connect-solid' | 'connect-dashed';

const Toolbar: React.FC<{
    activeTool: ActiveTool;
    onToolSelect: (tool: ActiveTool) => void;
}> = memo(({ activeTool, onToolSelect }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: any) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
    };

    return (
        <div className="w-72 bg-slate-800 p-2 flex flex-col gap-2 border-r border-slate-700">
            <h2 className="text-xl font-bold text-white px-2 pt-2">NetSim Studio</h2>
            <div className="flex-1 overflow-y-auto space-y-4 mt-4">
                {TOOLBAR_ITEMS.map((section) => (
                    <div key={section.title} className="flex flex-col">
                        <h3 className="text-sm font-semibold mb-2 text-slate-400 px-2">{section.title}</h3>
                        <div className={`grid ${section.items.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 px-2`}>
                            {section.items.map((item) => {
                                const baseClasses = "bg-slate-900/50 p-3 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-slate-700/80 transition-colors h-28 border-2";
                                const toolBaseClasses = `${baseClasses} cursor-pointer`;
                                const draggableBaseClasses = `${baseClasses} cursor-grab`;

                                if (item.tool === 'connect') {
                                    const toolName = `connect-${item.connectionType}` as ActiveTool;
                                    const isActive = activeTool === toolName;
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => onToolSelect(toolName)}
                                            className={`${toolBaseClasses} ${item.color} ${isActive ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
                                        >
                                            <div className="w-10 h-10 text-purple-400 flex items-center justify-center">{item.icon}</div>
                                            <span className="text-xs text-center">{item.name}</span>
                                        </button>
                                    );
                                }
                                return (
                                    <div
                                        key={item.name}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        className={`${draggableBaseClasses} ${item.color}`}
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center">{item.icon}</div>
                                        <span className="text-xs text-center">{item.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

type ConnectionStartState = {
    fromNodeId: string;
    fromPortId: string;
} | null;

type PortMenuState = {
    nodeId: string;
    x: number;
    y: number;
} | null;


const App: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>(() => {
        try {
            const savedData = localStorage.getItem('netsim-studio-data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData.nodes)) {
                    return parsedData.nodes;
                }
            }
        } catch (error) {
            console.error("Failed to load nodes from localStorage:", error);
        }
        return [];
    });
    const [connections, setConnections] = useState<Connection[]>(() => {
        try {
            const savedData = localStorage.getItem('netsim-studio-data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData.connections)) {
                    return parsedData.connections;
                }
            }
        } catch (error) {
            console.error("Failed to load connections from localStorage:", error);
        }
        return [];
    });
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [multiSelectedNodeIds, setMultiSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [activeTool, setActiveTool] = useState<ActiveTool>('select');
    const [connectionStart, setConnectionStart] = useState<ConnectionStartState>(null);
    const [portMenuState, setPortMenuState] = useState<PortMenuState>(null);
    const [previewLine, setPreviewLine] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
    const [editingPortInfo, setEditingPortInfo] = useState<{ connId: string; end: 'from' | 'to' } | null>(null);
    
    const canvasRef = useRef<HTMLDivElement>(null);
    const isSelectingRef = useRef(false);
    const selectionStartPos = useRef({ x: 0, y: 0 });
    const isInitialMount = useRef(true);

    // Debounced saving to localStorage
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const debounceSave = setTimeout(() => {
            try {
                const dataToSave = JSON.stringify({ nodes, connections });
                localStorage.setItem('netsim-studio-data', dataToSave);
            } catch (error) {
                console.error("Failed to save state to localStorage:", error);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(debounceSave);
    }, [nodes, connections]);

    const resetSelection = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        setMultiSelectedNodeIds(new Set());
    }, []);

    const resetConnectionState = useCallback(() => {
        setActiveTool('select');
        setConnectionStart(null);
        setPreviewLine(null);
        setPortMenuState(null);
    }, []);

    const deleteMultipleNodes = useCallback(() => {
        const idsToDelete = new Set(multiSelectedNodeIds);
        if (idsToDelete.size === 0) return;

        const affectedConnections = connections.filter(c => idsToDelete.has(c.from.nodeId) || idsToDelete.has(c.to.nodeId));
        const connectionsToDelete = new Set(affectedConnections.map(c => c.id));
        
        const portsToFreeByNodeId: Record<string, Set<string>> = {};
        affectedConnections.forEach(conn => {
            const { from, to } = conn;
            if (!idsToDelete.has(from.nodeId)) {
                if (!portsToFreeByNodeId[from.nodeId]) portsToFreeByNodeId[from.nodeId] = new Set();
                portsToFreeByNodeId[from.nodeId].add(from.portId);
            }
            if (!idsToDelete.has(to.nodeId)) {
                if (!portsToFreeByNodeId[to.nodeId]) portsToFreeByNodeId[to.nodeId] = new Set();
                portsToFreeByNodeId[to.nodeId].add(to.portId);
            }
        });

        const updatedNodes = nodes
            .filter(node => !idsToDelete.has(node.id))
            .map(node => {
                const portsToFree = portsToFreeByNodeId[node.id];
                if (!portsToFree) return node;

                const newPorts: Port[] = node.ports.map(port =>
                    portsToFree.has(port.id)
                        ? { ...port, status: 'available' as const, connectedTo: undefined }
                        : port
                );
                return { ...node, ports: newPorts };
            });
            
        setNodes(updatedNodes);
        setConnections(prev => prev.filter(c => !connectionsToDelete.has(c.id)));
        resetSelection();
    }, [nodes, connections, multiSelectedNodeIds, resetSelection]);

    const handleDelete = useCallback(() => {
        if (multiSelectedNodeIds.size > 0) {
            deleteMultipleNodes();
        } else if (selectedNodeId) {
            const connectionsToRemove = connections.filter(c => c.from.nodeId === selectedNodeId || c.to.nodeId === selectedNodeId);
            const connectionsToDeleteIds = new Set(connectionsToRemove.map(c => c.id));

            setNodes(prevNodes =>
                prevNodes
                    .filter(n => n.id !== selectedNodeId)
                    .map(n => {
                        const portsToFreeOnNode = connectionsToRemove
                            .map(c => {
                                if (c.from.nodeId === n.id) return c.from.portId;
                                if (c.to.nodeId === n.id) return c.to.portId;
                                return null;
                            })
                            .filter((p): p is string => p !== null);

                        if (portsToFreeOnNode.length === 0) return n;

                        const portIdsToFreeSet = new Set(portsToFreeOnNode);

                        const newPorts: Port[] = n.ports.map(p =>
                            portIdsToFreeSet.has(p.id) ? { ...p, status: 'available' as const, connectedTo: undefined } : p
                        );
                        return { ...n, ports: newPorts };
                    })
            );
            setConnections(prev => prev.filter(c => !connectionsToDeleteIds.has(c.id)));
            resetSelection();
        } else if (selectedConnectionId) {
            const connToDelete = connections.find(c => c.id === selectedConnectionId);
            if (!connToDelete) return;

            setNodes(prevNodes =>
                prevNodes.map(n => {
                    if (n.id === connToDelete.from.nodeId) {
                        const newPorts: Port[] = n.ports.map(p =>
                            p.id === connToDelete.from.portId ? { ...p, status: 'available' as const, connectedTo: undefined } : p
                        );
                        return { ...n, ports: newPorts };
                    }
                    if (n.id === connToDelete.to.nodeId) {
                        const newPorts: Port[] = n.ports.map(p =>
                            p.id === connToDelete.to.portId ? { ...p, status: 'available' as const, connectedTo: undefined } : p
                        );
                        return { ...n, ports: newPorts };
                    }
                    return n;
                })
            );
            setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
            resetSelection();
        }
    }, [connections, selectedConnectionId, selectedNodeId, multiSelectedNodeIds.size, deleteMultipleNodes, resetSelection]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                resetConnectionState();
                resetSelection();
                setEditingPortInfo(null);
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
                handleDelete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleDelete, resetConnectionState, resetSelection]);
    
    useEffect(() => {
        const handleMouseMoveCanvas = (e: MouseEvent) => {
            if (connectionStart && canvasRef.current) {
                const canvasBounds = canvasRef.current.getBoundingClientRect();
                const sourceNode = nodes.find(n => n.id === connectionStart.fromNodeId);
                 if (sourceNode) {
                    setPreviewLine({
                        x1: sourceNode.x,
                        y1: sourceNode.y,
                        x2: e.clientX - canvasBounds.left,
                        y2: e.clientY - canvasBounds.top,
                    });
                }
            } else if (isSelectingRef.current && canvasRef.current) {
                const canvasBounds = canvasRef.current.getBoundingClientRect();
                const currentX = e.clientX - canvasBounds.left;
                const currentY = e.clientY - canvasBounds.top;
                const x = Math.min(selectionStartPos.current.x, currentX);
                const y = Math.min(selectionStartPos.current.y, currentY);
                const width = Math.abs(currentX - selectionStartPos.current.x);
                const height = Math.abs(currentY - selectionStartPos.current.y);
                setSelectionRect({ x, y, width, height });
            }
        };

        const handleMouseUpCanvas = () => {
            if (isSelectingRef.current && selectionRect) {
                const selectedIds = new Set<string>();
                nodes.forEach(node => {
                    const nodeRect = { x: node.x - node.style.iconSize / 2, y: node.y - node.style.iconSize / 2, width: node.style.iconSize, height: node.style.iconSize };
                    if (selectionRect.x < nodeRect.x + nodeRect.width && selectionRect.x + selectionRect.width > nodeRect.x && selectionRect.y < nodeRect.y + nodeRect.height && selectionRect.y + selectionRect.height > nodeRect.y) {
                        selectedIds.add(node.id);
                    }
                });
                setMultiSelectedNodeIds(selectedIds);
                if (selectedIds.size > 0) {
                    setSelectedNodeId(null);
                    setSelectedConnectionId(null);
                }
            }
            isSelectingRef.current = false;
            setSelectionRect(null);
        };
        
        window.addEventListener('mousemove', handleMouseMoveCanvas);
        window.addEventListener('mouseup', handleMouseUpCanvas);
        return () => {
            window.removeEventListener('mousemove', handleMouseMoveCanvas);
            window.removeEventListener('mouseup', handleMouseUpCanvas);
        };
    }, [connectionStart, nodes, selectionRect]);
    
    const updateNode = useCallback((updatedNode: Node) => {
        setNodes((prevNodes) => prevNodes.map((node) => (node.id === updatedNode.id ? updatedNode : node)));
    }, []);

    const updateConnection = useCallback((updatedConnection: Connection) => {
        setConnections(prev => prev.map(c => c.id === updatedConnection.id ? updatedConnection : c));
    }, []);

    const addNode = useCallback((item: any, x: number, y: number) => {
        const { type, borderStyle, name: itemName } = item;
        const nodeCount = nodes.filter(n => n.type === type).length + 1;
        const vendor = (type === DeviceType.PC || type === DeviceType.Text || type === DeviceType.Rectangle || type === DeviceType.Circle || type === DeviceType.Halo) ? Vendor.Generic : Vendor.Cisco;

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            vendor,
            name: `${itemName}${nodeCount}`,
            x,
            y,
            config: JSON.parse(JSON.stringify(DEFAULT_NODE_CONFIG)),
            style: JSON.parse(JSON.stringify(DEFAULT_NODE_STYLE)),
            ports: generatePorts(type, vendor),
            ...(type === DeviceType.Text && { text: 'Double click to edit', borderStyle: borderStyle || 'none' }),
            ...(type === DeviceType.Rectangle && { width: 200, height: 150, text: '', borderStyle: borderStyle || 'solid' }),
            ...(type === DeviceType.Circle && { radius: 80, text: '' }),
            ...(type === DeviceType.Halo && { width: 200, height: 80, text: '', rotation: 0 }),
        };
        setNodes((prev) => [...prev, newNode]);
        resetSelection();
        setSelectedNodeId(newNode.id);
    }, [nodes, resetSelection]);

    const addConnectionByPort = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string, type: 'solid' | 'dashed') => {
        const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        setNodes(currentNodes =>
            currentNodes.map(node => {
                if (node.id === fromNodeId) {
                    const newPorts: Port[] = node.ports.map(port =>
                        port.id === fromPortId
                            ? { ...port, status: 'connected' as const, connectedTo: { nodeId: toNodeId, portId: toPortId } }
                            : port
                    );
                    return { ...node, ports: newPorts };
                } else if (node.id === toNodeId) {
                    const newPorts: Port[] = node.ports.map(port =>
                        port.id === toPortId
                            ? { ...port, status: 'connected' as const, connectedTo: { nodeId: fromNodeId, portId: fromPortId } }
                            : port
                    );
                    return { ...node, ports: newPorts };
                }
                return node;
            })
        );

        setConnections(prev => [...prev, {
            id: connectionId,
            from: { nodeId: fromNodeId, portId: fromPortId },
            to: { nodeId: toNodeId, portId: toPortId },
            type: type,
            style: 'direct',
            labelFromOffset: { x: 0, y: 0 },
            labelToOffset: { x: 0, y: 0 },
            config: JSON.parse(JSON.stringify(DEFAULT_LINK_CONFIG)),
        }]);
    }, []);
    
    const handlePortSelect = useCallback((nodeId: string, port: Port) => {
        if (!connectionStart) { // This is the first port selection in a connection attempt
            const sourceNode = nodes.find(n => n.id === nodeId);
            if (sourceNode) {
                setConnectionStart({ fromNodeId: nodeId, fromPortId: port.id });
                setPreviewLine({ x1: sourceNode.x, y1: sourceNode.y, x2: sourceNode.x, y2: sourceNode.y });
            }
        } else { // This is the second port selection
            if (nodeId === connectionStart.fromNodeId) {
                console.warn("Cannot connect a node to itself.");
                return;
            }
            const type = activeTool === 'connect-solid' ? 'solid' : 'dashed';
            addConnectionByPort(connectionStart.fromNodeId, connectionStart.fromPortId, nodeId, port.id, type);
            resetConnectionState();
        }
        setPortMenuState(null);
    }, [connectionStart, nodes, addConnectionByPort, resetConnectionState, activeTool]);

    const handleNodeClick = useCallback((node: Node, e: React.MouseEvent) => {
        e.stopPropagation();
        setPortMenuState(null);

        if (activeTool.startsWith('connect')) {
            const menuX = node.x + (node.style.iconSize / 2) + 10;
            const menuY = node.y - (node.style.iconSize / 2);
            setPortMenuState({ nodeId: node.id, x: menuX, y: menuY });
        } else {
            resetSelection();
            setSelectedNodeId(node.id);
        }
    }, [activeTool, resetSelection]);

    const handleConnectionClick = useCallback((connection: Connection) => {
        resetSelection();
        setSelectedConnectionId(connection.id);
    }, [resetSelection]);
    
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.node-component-wrapper') || 
            (e.target as HTMLElement).closest('.connection-label') ||
            (e.target as HTMLElement).closest('.orthogonal-handle')) {
            return;
        }
        resetSelection();
        setEditingPortInfo(null);
        if (activeTool !== 'select') {
            resetConnectionState();
        }

        const canvasBounds = canvasRef.current?.getBoundingClientRect();
        if (canvasBounds) {
            isSelectingRef.current = true;
            selectionStartPos.current = { x: e.clientX - canvasBounds.left, y: e.clientY - canvasBounds.top };
            setSelectionRect({ ...selectionStartPos.current, width: 0, height: 0 });
        }
    }, [activeTool, resetConnectionState, resetSelection]);

    const handleToolSelect = useCallback((tool: ActiveTool) => {
        if (activeTool === tool) {
            setActiveTool('select');
            setConnectionStart(null);
            setPreviewLine(null);
        } else {
            setActiveTool(tool);
            resetSelection();
            setConnectionStart(null);
        }
    },[activeTool, resetSelection]);

    const handlePortLabelDoubleClick = useCallback((connId: string, end: 'from' | 'to') => {
        setEditingPortInfo({ connId, end });
    }, []);

    const handleUpdatePortName = useCallback((connId: string, end: 'from' | 'to', newPortName: string) => {
        const conn = connections.find(c => c.id === connId);
        if (!conn) {
            setEditingPortInfo(null);
            return;
        }

        const target = end === 'from' ? conn.from : conn.to;
        const { nodeId, portId } = target;

        setNodes(prevNodes => prevNodes.map(node => {
            if (node.id === nodeId) {
                const newPorts = node.ports.map(port => {
                    if (port.id === portId) {
                        return { ...port, name: newPortName };
                    }
                    return port;
                });
                return { ...node, ports: newPorts };
            }
            return node;
        }));

        setEditingPortInfo(null);
    }, [connections]);

    const exportTo = (format: 'json' | 'png') => {
        if (format === 'json') {
            const data = JSON.stringify({ nodes, connections }, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'topology.json';
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'png' && canvasRef.current) {
            // @ts-ignore
            html2canvas(canvasRef.current, { backgroundColor: '#f1f5f9' }).then(canvas => {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = 'topology.png';
                a.click();
            });
        }
    };

    const clearCanvas = () => {
        if (window.confirm('确定要清除整个画布吗？此操作无法撤销。')) {
            setNodes([]);
            setConnections([]);
            localStorage.removeItem('netsim-studio-data');
            resetSelection();
            resetConnectionState();
        }
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
    const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;
    const isConnecting = activeTool.startsWith('connect');

    return (
        <div className="flex h-screen w-screen font-sans">
            <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
            <main className="flex-1 flex flex-col bg-slate-900 relative">
                <div className="flex-1 relative overflow-hidden">
                    <Canvas
                        ref={canvasRef}
                        nodes={nodes}
                        connections={connections}
                        allNodes={nodes}
                        allConnections={connections}
                        selectedNodeId={selectedNodeId}
                        selectedConnectionId={selectedConnectionId}
                        multiSelectedNodeIds={multiSelectedNodeIds}
                        selectionRect={selectionRect}
                        addNode={addNode}
                        setNodes={setNodes}
                        updateConnection={updateConnection}
                        handleNodeClick={handleNodeClick}
                        handleConnectionClick={handleConnectionClick}
                        onCanvasMouseDown={handleCanvasMouseDown}
                        isConnecting={isConnecting}
                        previewLine={previewLine}
                        editingPortInfo={editingPortInfo}
                        onPortLabelDoubleClick={handlePortLabelDoubleClick}
                        onUpdatePortName={handleUpdatePortName}
                    />
                     {portMenuState && (() => {
                        const node = nodes.find(n => n.id === portMenuState.nodeId);
                        if (!node) return null;
                        return (
                            <PortSelectionMenu
                                ports={node.ports}
                                position={{ x: portMenuState.x, y: portMenuState.y }}
                                onSelectPort={(port) => handlePortSelect(node.id, port)}
                                onClose={() => setPortMenuState(null)}
                            />
                        );
                    })()}
                </div>

                <div className="absolute top-2 right-[calc(24rem+0.5rem)] flex items-center gap-2 z-20">
                    {(selectedNodeId || selectedConnectionId || multiSelectedNodeIds.size > 0) && (
                        <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors flex items-center gap-2">
                            <TrashIcon className="w-5 h-5" />
                            {multiSelectedNodeIds.size > 0 ? `Delete ${multiSelectedNodeIds.size} Items` : (selectedNode ? `Delete ${selectedNode.name}`: 'Delete Connection')}
                        </button>
                    )}
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
                     <button onClick={clearCanvas} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors" title="Clear Canvas"><BroomIcon className="w-5 h-5"/></button>
                     <button onClick={() => exportTo('json')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors" title="Export as JSON"><DownloadIcon className="w-5 h-5"/></button>
                     <button onClick={() => exportTo('png')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors" title="Export as PNG"><ImageIcon className="w-5 h-5"/></button>
                </div>
            </main>
            <ConfigPanel 
                selectedNode={selectedNode}
                selectedConnection={selectedConnection}
                nodes={nodes}
                connections={connections} 
                onNodeUpdate={updateNode} 
                onConnectionUpdate={updateConnection}
            />
        </div>
    );
};

export default App;
