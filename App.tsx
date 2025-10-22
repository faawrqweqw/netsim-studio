

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
// FIX: Import AppState and Topology types for multi-topology management
import { Node, Connection, DeviceType, Vendor, Port, LinkConfig, ManagedDevice, AppState, Topology } from './types';
import { TOOLBAR_ITEMS, SHAPE_TOOLS, DEFAULT_NODE_CONFIG, DEFAULT_NODE_STYLE, generatePorts, DEFAULT_LINK_CONFIG } from './constants';
import { DownloadIcon, ImageIcon, TrashIcon, BroomIcon } from './components/Icons';
import ConfigPanel from './components/ConfigPanel';
import Canvas from './components/Canvas';
import PortSelectionMenu from './components/PortSelectionMenu';
import MainSidebar from './components/MainSidebar';
import OperationsDashboard from './components/OperationsDashboard';

type ActiveTool = 'select' | 'connect-solid' | 'connect-dashed';
export type AppView = 'topology' | 'operations';

const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
};

const Toolbar: React.FC<{
    activeTool: ActiveTool;
    onToolSelect: (tool: ActiveTool) => void;
}> = memo(({ activeTool, onToolSelect }) => {

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
                                            <div className="w-16 h-16 text-purple-400 flex items-center justify-center">{item.icon}</div>
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
                                        <div className="w-16 h-16 flex items-center justify-center">{item.icon}</div>
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
    const [view, setView] = useState<AppView>('topology');

    // FIX: Refactor state management to support multiple topologies.
    const [appState, setAppState] = useState<AppState>(() => {
        try {
            const savedData = localStorage.getItem('netsim-studio-app-state');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                // Basic validation
                if (parsed.activeTopologyId && parsed.topologies) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error("Failed to load state from localStorage:", error);
        }
        // Default state if nothing in localStorage or it's corrupt
        const defaultTopologyId = `topo-${Date.now()}`;
        return {
            activeTopologyId: defaultTopologyId,
            topologies: {
                [defaultTopologyId]: {
                    id: defaultTopologyId,
                    name: 'My First Topology',
                    nodes: [],
                    connections: [],
                    managedDevices: [],
                    canvasTranslate: { x: 0, y: 0 },
                    canvasScale: 1,
                }
            }
        };
    });

    const activeTopology = appState.topologies[appState.activeTopologyId] || {
        id: 'fallback', name: 'Fallback', nodes: [], connections: [], managedDevices: [], canvasTranslate: { x: 0, y: 0 }, canvasScale: 1
    };

    const { nodes, connections, managedDevices, canvasTranslate, canvasScale } = activeTopology;
    
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [multiSelectedNodeIds, setMultiSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [activeTool, setActiveTool] = useState<ActiveTool>('select');
    const [connectionStart, setConnectionStart] = useState<ConnectionStartState>(null);
    const [portMenuState, setPortMenuState] = useState<PortMenuState>(null);
    const [previewLine, setPreviewLine] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
    const [editingPortInfo, setEditingPortInfo] = useState<{ connId: string; end: 'from' | 'to' } | null>(null);
    
    const [isPanning, setIsPanning] = useState(false);
    const panStartPos = useRef({ x: 0, y: 0 });
    const panStartTranslate = useRef({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLDivElement>(null);
    const isSelectingRef = useRef(false);
    const selectionStartPos = useRef({ x: 0, y: 0 });
    const isInitialMount = useRef(true);

    // FIX: Helper to update the currently active topology state
    const updateActiveTopology = useCallback((updates: Partial<Topology> | ((prev: Topology) => Partial<Topology>)) => {
        setAppState(prev => {
            const currentTopology = prev.topologies[prev.activeTopologyId];
            const newUpdates = typeof updates === 'function' ? updates(currentTopology) : updates;

            // Deep clone nodes/connections to avoid mutation issues
            const clonedUpdates: Partial<Topology> = {};
            if (newUpdates.nodes) clonedUpdates.nodes = JSON.parse(JSON.stringify(newUpdates.nodes));
            if (newUpdates.connections) clonedUpdates.connections = JSON.parse(JSON.stringify(newUpdates.connections));
            if (newUpdates.managedDevices) clonedUpdates.managedDevices = JSON.parse(JSON.stringify(newUpdates.managedDevices));


            return {
                ...prev,
                topologies: {
                    ...prev.topologies,
                    [prev.activeTopologyId]: {
                        ...currentTopology,
                        ...newUpdates,
                        ...clonedUpdates // Overwrite with cloned data if present
                    }
                }
            };
        });
    }, []);


    // Debounced saving to localStorage
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const debounceSave = setTimeout(() => {
            try {
                // Remove runtime properties before saving
                const stateToSave = { ...appState };
                for (const topoId in stateToSave.topologies) {
                    const topology = stateToSave.topologies[topoId];
                    topology.nodes = topology.nodes.map(({ runtime, ...rest }) => rest);
                    topology.managedDevices = topology.managedDevices.map(({ runtime, ...rest }) => rest);
                }
                const dataToSave = JSON.stringify(stateToSave);
                localStorage.setItem('netsim-studio-app-state', dataToSave);
            } catch (error) {
                console.error("Failed to save state to localStorage:", error);
            }
        }, 500);

        return () => clearTimeout(debounceSave);
    }, [appState]);

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
            
        updateActiveTopology({
            nodes: updatedNodes,
            connections: connections.filter(c => !connectionsToDelete.has(c.id))
        });
        resetSelection();
    }, [nodes, connections, multiSelectedNodeIds, resetSelection, updateActiveTopology]);

    const handleDelete = useCallback(() => {
        if (multiSelectedNodeIds.size > 0) {
            deleteMultipleNodes();
        } else if (selectedNodeId) {
            const connectionsToRemove = connections.filter(c => c.from.nodeId === selectedNodeId || c.to.nodeId === selectedNodeId);
            const connectionsToDeleteIds = new Set(connectionsToRemove.map(c => c.id));

            const newNodes = nodes
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
                });

            updateActiveTopology({
                nodes: newNodes,
                connections: connections.filter(c => !connectionsToDeleteIds.has(c.id))
            });
            resetSelection();
        } else if (selectedConnectionId) {
            const connToDelete = connections.find(c => c.id === selectedConnectionId);
            if (!connToDelete) return;

            const newNodes = nodes.map(n => {
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
                });
            
            updateActiveTopology({
                nodes: newNodes,
                connections: connections.filter(c => c.id !== selectedConnectionId)
            });
            resetSelection();
        }
    }, [connections, selectedConnectionId, selectedNodeId, multiSelectedNodeIds.size, deleteMultipleNodes, resetSelection, nodes, updateActiveTopology]);

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
            const canvasBounds = canvasRef.current?.getBoundingClientRect();
            if (!canvasBounds) return;

            if (isPanning) {
                const dx = e.clientX - panStartPos.current.x;
                const dy = e.clientY - panStartPos.current.y;
                updateActiveTopology({
                    canvasTranslate: {
                        x: panStartTranslate.current.x + dx,
                        y: panStartTranslate.current.y + dy,
                    }
                });
                return;
            }
            
            if (connectionStart) {
                 const sourceNode = nodes.find(n => n.id === connectionStart.fromNodeId);
                 if (sourceNode) {
                    const clientX = e.clientX - canvasBounds.left;
                    const clientY = e.clientY - canvasBounds.top;
                    const endX = (clientX - canvasTranslate.x) / canvasScale;
                    const endY = (clientY - canvasTranslate.y) / canvasScale;

                    setPreviewLine({
                        x1: sourceNode.x,
                        y1: sourceNode.y,
                        x2: endX,
                        y2: endY,
                    });
                }
            } else if (isSelectingRef.current) {
                const currentRawX = e.clientX - canvasBounds.left;
                const currentRawY = e.clientY - canvasBounds.top;
                
                const currentX = (currentRawX - canvasTranslate.x) / canvasScale;
                const currentY = (currentRawY - canvasTranslate.y) / canvasScale;
                
                const startX = selectionStartPos.current.x;
                const startY = selectionStartPos.current.y;

                const x = Math.min(startX, currentX);
                const y = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);
                
                setSelectionRect({ x, y, width, height });
            }
        };

        const handleMouseUpCanvas = () => {
            if (isPanning) {
                setIsPanning(false);
                return;
            }

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
    }, [connectionStart, nodes, selectionRect, canvasTranslate, canvasScale, isPanning, updateActiveTopology]);
    
    const updateNode = useCallback((updatedNode: Node) => {
        updateActiveTopology(prev => ({
            nodes: prev.nodes.map((node) => (node.id === updatedNode.id ? updatedNode : node))
        }));
    }, [updateActiveTopology]);

    const updateConnection = useCallback((updatedConnection: Connection) => {
        updateActiveTopology(prev => ({
            connections: prev.connections.map(c => c.id === updatedConnection.id ? updatedConnection : c)
        }));
    }, [updateActiveTopology]);

    const addNode = useCallback((item: any, x: number, y: number) => {
        const { type, borderStyle, name: itemName } = item;

        const canvasBounds = canvasRef.current?.getBoundingClientRect();
        if (!canvasBounds) return;
        
        const logicalX = (x - canvasBounds.left - canvasTranslate.x) / canvasScale;
        const logicalY = (y - canvasBounds.top - canvasTranslate.y) / canvasScale;
        
        const nodeCount = nodes.filter(n => n.type === type).length + 1;
        const vendor = (type === DeviceType.PC || type === DeviceType.Text || type === DeviceType.Rectangle || type === DeviceType.Circle || type === DeviceType.Halo) ? Vendor.Generic : Vendor.Cisco;

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            vendor,
            name: `${itemName}${nodeCount}`,
            x: logicalX,
            y: logicalY,
            config: JSON.parse(JSON.stringify(DEFAULT_NODE_CONFIG)),
            style: JSON.parse(JSON.stringify(DEFAULT_NODE_STYLE)),
            ports: generatePorts(type, vendor),
            runtime: {},
            ...(type === DeviceType.Text && { text: 'Double click to edit', borderStyle: borderStyle || 'none' }),
            ...(type === DeviceType.Rectangle && { width: 200, height: 150, text: '', borderStyle: borderStyle || 'solid' }),
            ...(type === DeviceType.Circle && { radius: 80, text: '' }),
            ...(type === DeviceType.Halo && { width: 200, height: 80, text: '', rotation: 0 }),
        };
        updateActiveTopology(prev => ({ nodes: [...prev.nodes, newNode]}));
        resetSelection();
        setSelectedNodeId(newNode.id);
    }, [nodes, resetSelection, canvasTranslate, canvasScale, updateActiveTopology]);

    const addConnectionByPort = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string, type: 'solid' | 'dashed') => {
        const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newNodes = nodes.map(node => {
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
            });
        
        const newConnection: Connection = {
            id: connectionId,
            from: { nodeId: fromNodeId, portId: fromPortId },
            to: { nodeId: toNodeId, portId: toPortId },
            type: type,
            style: 'direct',
            labelFromOffset: { x: 0, y: 0 },
            labelToOffset: { x: 0, y: 0 },
            config: JSON.parse(JSON.stringify(DEFAULT_LINK_CONFIG)),
        };

        updateActiveTopology(prev => ({
            nodes: newNodes,
            connections: [...prev.connections, newConnection]
        }));
    }, [nodes, updateActiveTopology]);
    
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
            (e.target as HTMLElement).closest('.path-point-handle')) {
            return;
        }

        if (e.button === 1 || e.altKey) { 
            e.preventDefault();
            document.body.style.cursor = 'grabbing';
            setIsPanning(true);
            panStartPos.current = { x: e.clientX, y: e.clientY };
            panStartTranslate.current = canvasTranslate;
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
            selectionStartPos.current = { 
                x: (e.clientX - canvasBounds.left - canvasTranslate.x) / canvasScale, 
                y: (e.clientY - canvasBounds.top - canvasTranslate.y) / canvasScale 
            };
            setSelectionRect({ ...selectionStartPos.current, width: 0, height: 0 });
        }
    }, [activeTool, resetConnectionState, resetSelection, canvasTranslate, canvasScale]);

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

        const newNodes = nodes.map(node => {
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
        });
        updateActiveTopology({ nodes: newNodes });

        setEditingPortInfo(null);
    }, [connections, updateActiveTopology, nodes]);

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

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const scaleFactor = 1.1;
        const delta = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
        
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newScale = Math.max(0.2, Math.min(3, canvasScale * delta));

        const newTranslateX = canvasTranslate.x - (mouseX - canvasTranslate.x) * (newScale / canvasScale - 1);
        const newTranslateY = canvasTranslate.y - (mouseY - canvasTranslate.y) * (newScale / canvasScale - 1);

        updateActiveTopology({ canvasScale: newScale, canvasTranslate: { x: newTranslateX, y: newTranslateY }});
    }, [canvasScale, canvasTranslate, updateActiveTopology]);


    const handleClearCanvas = useCallback(() => {
        if (window.confirm('确定要清除整个画布吗？此操作无法撤销。')) {
            updateActiveTopology({
                nodes: [],
                connections: [],
                managedDevices: [],
                canvasTranslate: { x: 0, y: 0 },
                canvasScale: 1,
            });
            resetSelection();
            resetConnectionState();
        }
    }, [updateActiveTopology, resetSelection, resetConnectionState]);

    const handleNewTopology = useCallback(() => {
        setAppState(prev => {
            const newTopologyId = `topo-${Date.now()}`;
            const topoNumbers = Object.values(prev.topologies)
                .map(t => t.name.match(/^Topology (\d+)$/))
                .filter((m): m is RegExpMatchArray => m !== null)
                .map(match => parseInt(match[1], 10));
            const newNumber = topoNumbers.length > 0 ? Math.max(...topoNumbers) + 1 : Object.keys(prev.topologies).length + 1;
            const newTopologyName = `Topology ${newNumber}`;
    
            const newTopology: Topology = {
                id: newTopologyId,
                name: newTopologyName,
                nodes: [],
                connections: [],
                managedDevices: [],
                canvasTranslate: { x: 0, y: 0 },
                canvasScale: 1,
            };
    
            return {
                ...prev,
                activeTopologyId: newTopologyId, // Switch to the new topology
                topologies: {
                    ...prev.topologies,
                    [newTopologyId]: newTopology, // Add the new topology
                }
            };
        });
        resetSelection();
        resetConnectionState();
    }, [resetSelection, resetConnectionState]);

    const handleSwitchTopology = useCallback((id: string) => {
        setAppState(prev => ({ ...prev, activeTopologyId: id }));
        resetSelection();
        resetConnectionState();
    }, [resetSelection, resetConnectionState]);

    const handleRenameTopology = useCallback((id: string, newName: string) => {
        setAppState(prev => ({
            ...prev,
            topologies: {
                ...prev.topologies,
                [id]: { ...prev.topologies[id], name: newName }
            }
        }));
    }, []);
    
    const handleDeleteTopology = useCallback((id: string) => {
        if (Object.keys(appState.topologies).length <= 1) {
            alert("Cannot delete the last topology.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete the topology "${appState.topologies[id].name}"?`)) {
            setAppState(prev => {
                const newTopologies = { ...prev.topologies };
                delete newTopologies[id];
                const newActiveId = prev.activeTopologyId === id ? Object.keys(newTopologies)[0] : prev.activeTopologyId;
                return {
                    activeTopologyId: newActiveId,
                    topologies: newTopologies
                };
            });
        }
    }, [appState.topologies]);
    
    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
    const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;
    const isConnecting = activeTool.startsWith('connect');

    return (
        <div className="flex h-screen w-screen font-sans bg-slate-900">
            {/* FIX: Pass all required props to MainSidebar */}
            <MainSidebar 
                currentView={view} 
                onViewChange={setView} 
                onNewTopology={handleNewTopology}
                appState={appState}
                onSwitchTopology={handleSwitchTopology}
                onRenameTopology={handleRenameTopology}
                onDeleteTopology={handleDeleteTopology}
            />
            
            {view === 'topology' && (
                 <>
                    <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
                    <main 
                        className="flex-1 flex flex-col bg-slate-900 relative"
                        onWheel={handleWheel}
                    >
                        <div className="flex-1 relative overflow-hidden" style={{ cursor: isPanning ? 'grabbing' : 'default' }}>
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
                                setNodes={(updater) => updateActiveTopology(prev => ({ nodes: typeof updater === 'function' ? (updater as (p: Node[]) => Node[])(prev.nodes) : updater }))}
                                updateConnection={updateConnection}
                                handleNodeClick={handleNodeClick}
                                handleConnectionClick={handleConnectionClick}
                                onCanvasMouseDown={handleCanvasMouseDown}
                                isConnecting={isConnecting}
                                previewLine={previewLine}
                                editingPortInfo={editingPortInfo}
                                onPortLabelDoubleClick={handlePortLabelDoubleClick}
                                onUpdatePortName={handleUpdatePortName}
                                canvasTranslate={canvasTranslate}
                                canvasScale={canvasScale}
                            />
                            {portMenuState && (() => {
                                const node = nodes.find(n => n.id === portMenuState.nodeId);
                                if (!node) return null;
                                return (
                                    <PortSelectionMenu
                                        ports={node.ports}
                                        position={{ 
                                            x: portMenuState.x * canvasScale + canvasTranslate.x, 
                                            y: portMenuState.y * canvasScale + canvasTranslate.y 
                                        }}
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
                        <div className="absolute top-2 right-2 flex items-center gap-2 z-20 bg-slate-800/50 border border-slate-700 p-1 rounded-lg">
                            {SHAPE_TOOLS.map((item) => (
                                <div
                                    key={item.name}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item)}
                                    className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors cursor-grab"
                                    title={item.name}
                                >
                                    <div className="w-5 h-5 flex items-center justify-center text-white">{item.icon}</div>
                                </div>
                            ))}

                            <div className="w-px h-6 bg-slate-600 mx-1"></div>

                            <button onClick={handleClearCanvas} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors" title="清除画布"><BroomIcon className="w-5 h-5"/></button>
                            <button onClick={() => exportTo('json')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors" title="导出为 JSON"><DownloadIcon className="w-5 h-5"/></button>
                            <button onClick={() => exportTo('png')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-md transition-colors" title="导出为 PNG"><ImageIcon className="w-5 h-5"/></button>
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
                 </>
            )}

            {view === 'operations' && (
                <OperationsDashboard 
                    nodes={nodes} 
                    onNodeUpdate={updateNode} 
                    managedDevices={managedDevices}
                    onManagedDevicesUpdate={md => updateActiveTopology({ managedDevices: md })}
                />
            )}
        </div>
    );
};

export default App;