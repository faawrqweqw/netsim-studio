
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { Node, Connection, DeviceType } from '../types';
import { RouterIcon, L2SwitchIcon, L3SwitchIcon, PCIcon, FirewallIcon, APIcon, ACIcon, ServerIcon, TextBoxSolidIcon, RectangleIcon, CircleIcon, RotateIcon,PrintIcon,MonitorIcon,SignalTowerIcon,CloudIcon } from './Icons';
import { computeLabelRects } from '../utils/labelPlacer';

interface DraggableNodeProps {
    node: Node;
    onMove: (id: string, dx: number, dy: number) => void;
    onNodeClick: (node: Node, e: React.MouseEvent) => void;
    onNodeUpdate: (node: Node) => void;
    isSelected: boolean;
    isConnecting: boolean;
    allNodes: Node[];
    allConnections: Connection[];
    canvasScale: number;
    nameRect?: { x: number; y: number; w: number; h: number };
}

const NodeComponent: React.FC<DraggableNodeProps> = memo(({ node, onMove, onNodeClick, onNodeUpdate, isSelected, isConnecting, allNodes, allConnections, canvasScale, nameRect }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<false | 'se' | 'right' | 'bottom'>(false);
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(node.text || '');
    const nodeRef = useRef<HTMLDivElement>(null);
    const [nameStyle, setNameStyle] = useState<React.CSSProperties>({});


    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing || (e.target as HTMLElement).closest('.connection-label-input') || (e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('.path-point-handle')) return;
        if (isConnecting || (e.target as HTMLElement).closest('.connection-label')) {
            return;
        }
        setIsDragging(true);
    };

    const handleDoubleClick = () => {
        if (node.type === DeviceType.Text || node.type === DeviceType.Rectangle || node.type === DeviceType.Circle) {
            setIsEditing(true);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                onMove(node.id, e.movementX, e.movementY);
            }
            if (isResizing) {
                if (node.type === DeviceType.Rectangle && isResizing === 'se') {
                    onNodeUpdate({
                        ...node,
                        width: Math.max(20, (node.width || 0) + e.movementX / canvasScale),
                        height: Math.max(20, (node.height || 0) + e.movementY / canvasScale),
                    });
                } else if (node.type === DeviceType.Circle && isResizing === 'se') {
                    const delta = (e.movementX + e.movementY) / (2 * canvasScale);
                     onNodeUpdate({
                        ...node,
                        radius: Math.max(20, (node.radius || 0) + delta),
                    });
                } else if (node.type === DeviceType.Halo) {
                    if (isResizing === 'right') {
                        onNodeUpdate({
                            ...node,
                            width: Math.max(40, (node.width || 0) + (e.movementX * 2) / canvasScale),
                        });
                    } else if (isResizing === 'bottom') {
                        onNodeUpdate({
                            ...node,
                            height: Math.max(20, (node.height || 0) + (e.movementY * 2) / canvasScale),
                        });
                    }
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, node, onMove, onNodeUpdate, canvasScale]);

    useEffect(() => {
        // Shapes and text do not use auto name placement
        if (node.type === DeviceType.Rectangle || node.type === DeviceType.Circle || node.type === DeviceType.Text || node.type === DeviceType.Halo) return;

        const iconSize = node.style.iconSize;
        const topLeftX = node.x - iconSize / 2;
        const topLeftY = node.y - iconSize / 2;

        if (nameRect) {
            // Convert world coords to wrapper-local absolute offsets
            const style: React.CSSProperties = {
                position: 'absolute',
                left: `${nameRect.x - topLeftX}px`,
                top: `${nameRect.y - topLeftY}px`,
                width: `${nameRect.w}px`,
                height: `${nameRect.h}px`,
                lineHeight: `${nameRect.h}px`,
                textAlign: 'center',
                transform: 'none',
            };
            setNameStyle(style);
        } else {
            const defaultOffset = iconSize / 2 + 8;
            const style: React.CSSProperties = {
                position: 'absolute',
                left: '50%',
                top: `${defaultOffset}px`,
                transform: 'translateX(-50%)',
                textAlign: 'center',
            };
            setNameStyle(style);
        }
    }, [node, nameRect]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value);

    const handleTextBlur = () => {
        onNodeUpdate({ ...node, text });
        setIsEditing(false);
    };

    const handleNodeBodyClick = (e: React.MouseEvent) => {
        onNodeClick(node, e);
    };

    const handleResizeMouseDown = (e: React.MouseEvent, handle: 'se' | 'right' | 'bottom') => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(false);
        setIsResizing(handle);
    };

    const getIcon = () => {
        const props = { className: `w-full h-full text-slate-800`, style: { color: node.style.color } };
        switch (node.type) {
            case DeviceType.Router: return <RouterIcon {...props} />;
            case DeviceType.L3Switch: return <L3SwitchIcon {...props} />;
            case DeviceType.L2Switch: return <L2SwitchIcon {...props} />;
            case DeviceType.PC: return <PCIcon {...props} />;
            case DeviceType.Server: return <ServerIcon {...props} />;
            case DeviceType.Firewall: return <FirewallIcon {...props} />;
            case DeviceType.AP: return <APIcon {...props} />;
            case DeviceType.AC: return <ACIcon {...props} />;
            case DeviceType.Monitor: return <MonitorIcon {...props} />;
            case DeviceType.Text: return <TextBoxSolidIcon {...props} />;
            case DeviceType.Rectangle: return <RectangleIcon {...props} />;
            case DeviceType.Circle: return <CircleIcon {...props} />;
            case DeviceType.Print: return <PrintIcon {...props} />;
            case DeviceType.SignalTower: return <SignalTowerIcon {...props} />;
            case DeviceType.Cloud: return <CloudIcon {...props} />;
            default: return null;
        }
    };
    
    const renderEditableText = (containerStyle: React.CSSProperties, backgroundClass: string = 'bg-transparent') => {
        if (isEditing) {
            return (
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    onBlur={handleTextBlur}
                    autoFocus
                    className={`absolute inset-0 w-full h-full text-center resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${backgroundClass}`}
                    style={{...containerStyle, zIndex: 11 }}
                />
            );
        }
        return (
            <div className="flex items-center justify-center h-full w-full p-2 text-center break-words" style={containerStyle}>
                {node.text}
            </div>
        );
    }
    
    if (node.type === DeviceType.Rectangle) {
        const borderClass = {
            solid: 'border border-solid border-slate-600',
            dashed: 'border border-dashed border-slate-600',
            none: 'border border-transparent'
        }[node.borderStyle || 'none'];
        const textStyle = { color: node.style.color, fontSize: '14px' };
        
        return (
            <div
                ref={nodeRef}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={handleNodeBodyClick}
                className={`absolute p-2 whitespace-pre-wrap rounded node-component-wrapper bg-slate-400/10 ${borderClass} ${isSelected ? 'outline-dashed outline-2 outline-blue-400 outline-offset-2' : ''}`}
                style={{ left: node.x, top: node.y, width: node.width, height: node.height, zIndex: 1 }}
            >
                {renderEditableText(textStyle)}
                {isSelected && (
                     <div
                        className="absolute -right-1 -bottom-1 w-3 h-3 bg-blue-500 cursor-se-resize rounded-full border-2 border-white resize-handle"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                    />
                )}
            </div>
        );
    }

    if (node.type === DeviceType.Circle) {
        const { x, y, radius = 80, style, text } = node;
        const textStyle = { color: node.style.color, fontSize: '14px' };

        return (
             <div
                ref={nodeRef}
                className="absolute node-component-wrapper"
                style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 1, width: radius * 2, height: radius * 2 }}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={handleNodeBodyClick}
            >
                 <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius*2} ${radius*2}`} className={`${isConnecting ? 'cursor-crosshair' : 'cursor-pointer'}`}>
                    <circle cx={radius} cy={radius} r={radius-1} fill={`${style.color}33`} stroke={style.color} strokeWidth="2" />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 text-center break-words" style={{color: node.style.color}}>
                    {renderEditableText(textStyle)}
                 </div>
                 {isSelected && (
                    <>
                        <div
                            className="absolute bg-blue-500/20 border-2 border-blue-500 rounded-full pointer-events-none"
                            style={{ inset: -8, width: radius*2+16, height: radius*2+16, left: -8, top: -8 }}
                        />
                         <div
                            className="absolute w-4 h-4 bg-blue-500 cursor-se-resize rounded-full border-2 border-white resize-handle"
                            style={{ right: -8, bottom: -8, transform: 'translate(50%, 50%)' }}
                            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                        />
                    </>
                )}
            </div>
        )
    }

    if (node.type === DeviceType.Text) {
        const borderClass = {
            solid: 'border border-solid border-slate-400',
            dashed: 'border border-dashed border-slate-400',
            none: 'border border-transparent'
        }[node.borderStyle || 'none'];
        const textStyle = { color: node.style.color, fontSize: `${node.style.iconSize / 3}px` };

        return (
            <div
                ref={nodeRef}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={handleNodeBodyClick}
                className={`absolute p-2 cursor-pointer whitespace-pre-wrap rounded node-component-wrapper ${borderClass} ${isSelected ? 'outline-dashed outline-2 outline-blue-400 outline-offset-2' : ''}`}
                style={{ left: node.x, top: node.y, width: 150, minHeight: 40, height: 'auto', zIndex: 10 }}
            >
                {renderEditableText(textStyle, 'bg-white/80 text-black')}
            </div>
        )
    }

    if (node.type === DeviceType.Halo) {
        const { x, y, width = 200, height = 80, rotation = 0 } = node;
        const [starAngle, setStarAngle] = useState(0);

        useEffect(() => {
            let frameId: number;
            const animate = () => {
                setStarAngle(prev => (prev + 0.005) % (2 * Math.PI));
                frameId = requestAnimationFrame(animate);
            };
            frameId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(frameId);
        }, []);

        const rx = width / 2;
        const ry = height / 2;
        const starX = rx + Math.cos(starAngle) * rx;
        const starY = ry + Math.sin(starAngle) * ry;

        const handleRotateClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            const newRotation = rotation === 0 ? 90 : 0;
            onNodeUpdate({
                ...node,
                rotation: newRotation,
                // Swap width and height to keep resize handles intuitive
                width: height,
                height: width,
            });
        };

        return (
            <div
                ref={nodeRef}
                onMouseDown={handleMouseDown}
                onClick={handleNodeBodyClick}
                className="absolute node-component-wrapper"
                style={{
                    left: x, top: y,
                    width: width, height: height,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1, // Keep it in the background
                }}
            >
                <div
                    className="w-full h-full"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                    }}
                >
                    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none">
                        <ellipse cx={rx} cy={ry} rx={rx - 1} ry={ry - 1} fill="none" stroke="#a7c7e7" strokeWidth="2" />
                        <path
                            d={`M ${starX - 4},${starY} l 4,-4 l 4,4 l -4,4 z`}
                            fill="#e299c8" stroke="white" strokeWidth="0.5"
                        />
                    </svg>
                </div>

                {isSelected && (
                    <>
                        <div className="absolute pointer-events-none" style={{ inset: -8, border: '2px dashed #3b82f6' }} />
                        <div
                            className="absolute w-3 h-3 bg-blue-500 cursor-ew-resize rounded-full border-2 border-white resize-handle"
                            style={{ top: '50%', right: -6, transform: 'translateY(-50%)' }}
                            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                        />
                        <div
                            className="absolute w-3 h-3 bg-blue-500 cursor-ns-resize rounded-full border-2 border-white resize-handle"
                            style={{ left: '50%', bottom: -6, transform: 'translateX(-50%)' }}
                            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                        />
                        <div
                            className="absolute w-6 h-6 bg-green-500 hover:bg-green-600 cursor-pointer rounded-full border-2 border-white flex items-center justify-center text-white rotation-handle"
                            style={{
                                top: -12,
                                left: '50%',
                                transform: 'translateX(-50%)',
                            }}
                            onClick={handleRotateClick}
                            title="Rotate Halo"
                        >
                            <RotateIcon className="w-4 h-4" />
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div
            ref={nodeRef}
            className={`absolute group z-10 node-component-wrapper`}
            style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 10
            }}
        >
            <p className="font-medium whitespace-nowrap text-slate-800" style={nameStyle}>
                {node.name}
            </p>
            <div
                onMouseDown={handleMouseDown}
                onClick={handleNodeBodyClick}
                onDoubleClick={handleDoubleClick}
                className="relative"
                style={{
                    width: node.style.iconSize,
                    height: node.style.iconSize,
                }}
            >
                {isSelected && (
                    <div
                        className="absolute bg-red-500/20 border-2 border-red-500 rounded-xl pointer-events-none"
                        style={{
                            inset: -8,
                        }}
                    />
                )}
                <div
                    className={`w-full h-full relative transition-all duration-200 ${isConnecting ? 'cursor-crosshair' : 'cursor-pointer'}`}
                >
                    {getIcon()}
                </div>
            </div>
        </div>
    );
});


interface CanvasProps {
    nodes: Node[];
    connections: Connection[];
    allNodes: Node[];
    allConnections: Connection[];
    selectedNodeId: string | null;
    selectedConnectionId: string | null;
    multiSelectedNodeIds: Set<string>;
    selectionRect: { x: number; y: number; width: number; height: number } | null;
    addNode: (item: any, x: number, y: number) => void;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    updateConnection: (connection: Connection) => void;
    handleNodeClick: (node: Node, e: React.MouseEvent) => void;
    handleConnectionClick: (connection: Connection) => void;
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    isConnecting: boolean;
    previewLine: { x1: number, y1: number, x2: number, y2: number } | null;
    editingPortInfo: { connId: string; end: 'from' | 'to' } | null;
    onPortLabelDoubleClick: (connId: string, end: 'from' | 'to') => void;
    onUpdatePortName: (connId: string, end: 'from' | 'to', newPortName: string) => void;
    canvasTranslate: { x: number; y: number };
    canvasScale: number;
}

const getPointOnLine = (p0: { x: number, y: number }, p1: { x: number, y: number }, t: number) => {
    const x = p0.x + t * (p1.x - p0.x);
    const y = p0.y + t * (p1.y - p0.y);
    return { x, y };
};

const getPortNumber = (portName: string | undefined): string => {
    if (!portName) return '?';
    if (portName.endsWith('/')) return '?';
    const match = portName.match(/(\d+)(?!.*\d)/);
    return match ? match[0] : '?';
};

const getSmartEdgePoint = (sourceNode: Node, targetNode: Node): { x: number; y: number } => {
    const sx = sourceNode.x;
    const sy = sourceNode.y;
    const tx = targetNode.x;
    const ty = targetNode.y;
    const { iconSize } = sourceNode.style;
    const halfWidth = iconSize / 2;
    const halfHeight = iconSize / 2;

    const dx = tx - sx;
    const dy = ty - sy;

    if (dx === 0 && dy === 0) return { x: sx, y: sy };

    const tan_theta = Math.abs(dy / dx);
    const tan_alpha = halfHeight / halfWidth;

    let x, y;

    if (tan_theta < tan_alpha) {
        x = sx + halfWidth * Math.sign(dx);
        y = sy + halfWidth * Math.abs(dy / dx) * Math.sign(dy);
    } else {
        y = sy + halfHeight * Math.sign(dy);
        x = sx + halfHeight * Math.abs(dx / dy) * Math.sign(dx);
    }
    return { x, y };
};

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(({
    nodes, connections, selectedNodeId, selectedConnectionId, multiSelectedNodeIds, selectionRect,
    addNode, setNodes, updateConnection, handleNodeClick,
    handleConnectionClick, onCanvasMouseDown,
    isConnecting, previewLine, allNodes, allConnections,
    editingPortInfo, onPortLabelDoubleClick, onUpdatePortName,
    canvasTranslate, canvasScale
}, ref) => {
    const canvasInnerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => canvasInnerRef.current!);

    const [draggingLabel, setDraggingLabel] = useState<{ connId: string; end: 'from' | 'to'; initialOffset: { x: number; y: number; }; startMousePos: { x: number; y: number; };} | null>(null);
    const [draggingPathPoint, setDraggingPathPoint] = useState<{ connId: string; pointIndex: number; } | null>(null);

    // Name label rectangles computed globally in world coordinates
    const [nameRects, setNameRects] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingLabel) {
                const dx = (e.clientX - draggingLabel.startMousePos.x) / canvasScale;
                const dy = (e.clientY - draggingLabel.startMousePos.y) / canvasScale;
                const newOffset = { x: draggingLabel.initialOffset.x + dx, y: draggingLabel.initialOffset.y + dy };
                const conn = connections.find(c => c.id === draggingLabel.connId);
                if (conn) {
                    const field = draggingLabel.end === 'from' ? 'labelFromOffset' : 'labelToOffset';
                    updateConnection({ ...conn, [field]: newOffset });
                }
            } else if (draggingPathPoint) {
                const conn = connections.find(c => c.id === draggingPathPoint.connId);
                if (conn && conn.path?.points) {
                    const newPoints = conn.path.points.map((p, i) => {
                        if (i === draggingPathPoint.pointIndex) {
                            return { 
                                x: p.x + e.movementX / canvasScale, 
                                y: p.y + e.movementY / canvasScale 
                            };
                        }
                        return p;
                    });
                    updateConnection({ ...conn, path: { ...conn.path, points: newPoints } });
                }
            }
        };

        const handleMouseUp = () => {
            setDraggingLabel(null);
            setDraggingPathPoint(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingLabel, draggingPathPoint, connections, updateConnection, canvasScale]);

    const handleLabelMouseDown = (e: React.MouseEvent, connId: string, end: 'from' | 'to') => {
        e.stopPropagation();
        const conn = connections.find(c => c.id === connId);
        if (!conn) return;

        setDraggingLabel({
            connId, end,
            initialOffset: (end === 'from' ? conn.labelFromOffset : conn.labelToOffset) || { x: 0, y: 0 },
            startMousePos: { x: e.clientX, y: e.clientY },
        });
    };
    
    const handlePathPointMouseDown = (e: React.MouseEvent, connId: string, pointIndex: number) => {
        e.stopPropagation();
        setDraggingPathPoint({ connId, pointIndex });
    };

    const handlePathPointDoubleClick = (e: React.MouseEvent, connId: string, pointIndex: number) => {
        e.stopPropagation();
        const conn = connections.find(c => c.id === connId);
        if (conn && conn.path?.points) {
            const newPoints = conn.path.points.filter((_, i) => i !== pointIndex);
            updateConnection({ ...conn, path: { ...conn.path, points: newPoints } });
        }
    };
    
    const handleConnectionDoubleClick = (e: React.MouseEvent, conn: Connection) => {
        e.stopPropagation();
        const fromNode = nodes.find(n => n.id === conn.from.nodeId);
        const toNode = nodes.find(n => n.id === conn.to.nodeId);
        if (!fromNode || !toNode) return;

        const fromPos = getSmartEdgePoint(fromNode, toNode);
        const toPos = getSmartEdgePoint(toNode, fromNode);
        
        let pathPoints = conn.path?.points || [];
        
        // Handle migration from old orthogonal style
        if (conn.style === 'orthogonal' && pathPoints.length === 0) {
            const ratio = (conn.path as any)?.midPointRatio ?? 0.5;
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                const midX = fromPos.x + dx * ratio;
                pathPoints = [{ x: midX, y: fromPos.y }, { x: midX, y: toPos.y }];
            } else {
                const midY = fromPos.y + dy * ratio;
                pathPoints = [{ x: fromPos.x, y: midY }, { x: toPos.x, y: midY }];
            }
        }
        
        const fullPath = [fromPos, ...pathPoints, toPos];

        const canvasBounds = canvasInnerRef.current?.getBoundingClientRect();
        if (!canvasBounds) return;

        const clientX = e.clientX - canvasBounds.left;
        const clientY = e.clientY - canvasBounds.top;
        const clickX = (clientX - canvasTranslate.x) / canvasScale;
        const clickY = (clientY - canvasTranslate.y) / canvasScale;

        let closestSegmentIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < fullPath.length - 1; i++) {
            const p1 = fullPath[i];
            const p2 = fullPath[i+1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dist = Math.hypot(clickX - midX, clickY - midY);

            if (dist < minDistance) {
                minDistance = dist;
                closestSegmentIndex = i;
            }
        }

        if (closestSegmentIndex !== -1 && minDistance < 30 / canvasScale) {
            const newPoint = { x: clickX, y: clickY };
            const newPoints = [...pathPoints];
            newPoints.splice(closestSegmentIndex, 0, newPoint);
            updateConnection({ ...conn, path: { ...conn.path, points: newPoints } });
        }
    };


    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            const item = JSON.parse(data);
            addNode(item, e.clientX, e.clientY);
        } catch (error) {
            console.error("Failed to parse dropped data:", error);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const moveNode = (id: string, dx: number, dy: number) => {
        setNodes(p => p.map(n => (n.id === id ? { 
            ...n, 
            x: n.x + dx / canvasScale,
            y: n.y + dy / canvasScale
        } : n)));
    };
    const updateNode = (updatedNode: Node) => setNodes(p => p.map(n => (n.id === updatedNode.id ? updatedNode : n)));

    // Throttled computation of name label rectangles
    useEffect(() => {
        const el = canvasInnerRef.current;
        if (!el) return;
        const bounds = el.getBoundingClientRect();
        // Convert viewport (screen) rect to world coordinates
        const viewportWorld = {
            x: (-canvasTranslate.x) / canvasScale,
            y: (-canvasTranslate.y) / canvasScale,
            w: bounds.width / canvasScale,
            h: bounds.height / canvasScale,
        };
        // text measurer
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontPx = 14; // Keep consistent with UI
        const measure = (text: string) => {
            if (!ctx) return { w: Math.max(20, text.length * (fontPx * 0.6) + 8), h: fontPx + 6 };
            ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
            const m = ctx.measureText(text || ' ');
            return { w: Math.max(20, Math.ceil(m.width) + 8), h: fontPx + 6 };
        };

        let raf = 0;
        const run = () => {
            const rects = computeLabelRects(nodes, connections, { x: viewportWorld.x, y: viewportWorld.y, w: viewportWorld.w, h: viewportWorld.h }, measure, {
                maxSteps: 8,
                stepGap: 10,
                baseGap: 8,
            });
            setNameRects(rects);
        };
        // Throttle with rAF
        raf = requestAnimationFrame(run);
        return () => cancelAnimationFrame(raf);
    }, [nodes, connections, canvasScale, canvasTranslate]);

    const connectionGroups = connections.reduce((acc, conn) => {
        const key = [conn.from.nodeId, conn.to.nodeId].sort().join('-');
        if (!acc[key]) acc[key] = [];
        acc[key].push(conn);
        return acc;
    }, {} as Record<string, Connection[]>);

    const getOffsetPath = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }, pathPoints: { x: number; y: number }[], offset: number, offsetIndex: number, totalCount: number) => {
        if (totalCount <= 1 || offset === 0) {
            return [fromPos, ...pathPoints, toPos];
        }

        // Calculate perpendicular offset direction
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance === 0) return [fromPos, ...pathPoints, toPos];

        // Perpendicular unit vector (rotated 90 degrees)
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Calculate offset amount (distribute evenly around the center line)
        const offsetAmount = offset * (offsetIndex - (totalCount - 1) / 2);

        // Apply offset to all points
        const offsetFrom = { x: fromPos.x + perpX * offsetAmount, y: fromPos.y + perpY * offsetAmount };
        const offsetTo = { x: toPos.x + perpX * offsetAmount, y: toPos.y + perpY * offsetAmount };
        const offsetPoints = pathPoints.map(p => ({
            x: p.x + perpX * offsetAmount,
            y: p.y + perpY * offsetAmount
        }));

        return [offsetFrom, ...offsetPoints, offsetTo];
    };

    return (
        <div
            ref={canvasInnerRef}
            className={`w-full h-full bg-slate-50 relative overflow-hidden ${isConnecting ? 'cursor-crosshair' : 'cursor-default'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseDown={onCanvasMouseDown}
            style={{
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: `${2 * canvasScale}rem ${2 * canvasScale}rem`,
                userSelect: draggingLabel || draggingPathPoint ? 'none' : 'auto'
            }}
        >
            <div
                style={{
                    transform: `translate(${canvasTranslate.x}px, ${canvasTranslate.y}px) scale(${canvasScale})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%',
                }}
            >
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    {Object.values(connectionGroups).map((group: Connection[]) => {
                        const firstConn = group[0];
                        const fromNode = nodes.find(n => n.id === firstConn.from.nodeId);
                        const toNode = nodes.find(n => n.id === firstConn.to.nodeId);
                        if (!fromNode || !toNode) return null;

                        return group.map((conn, connIndex) => {
                            const fromPos = getSmartEdgePoint(fromNode, toNode);
                            const toPos = getSmartEdgePoint(toNode, fromNode);
                            
                            let pathData: string;
                            let handlePositions: { x: number, y: number }[] = [];
                            let pathPoints = conn.path?.points || [];
                            const offsetAmount = 20; // Pixel offset between parallel lines

                            if (conn.style === 'orthogonal') {
                                if (pathPoints.length === 0 && (conn.path as any)?.midPointRatio) {
                                    const ratio = (conn.path as any).midPointRatio;
                                    const dx = toPos.x - fromPos.x;
                                    const dy = toPos.y - fromPos.y;
                                    if (Math.abs(dx) > Math.abs(dy)) {
                                        const midX = fromPos.x + dx * ratio;
                                        pathPoints = [{ x: midX, y: fromPos.y }, { x: midX, y: toPos.y }];
                                    } else {
                                        const midY = fromPos.y + dy * ratio;
                                        pathPoints = [{ x: fromPos.x, y: midY }, { x: toPos.x, y: midY }];
                                    }
                                }

                                const fullPath = getOffsetPath(fromPos, toPos, pathPoints, offsetAmount, connIndex, group.length);
                                pathData = `M ${fullPath[0].x} ${fullPath[0].y}` + fullPath.slice(1).map(p => ` L ${p.x} ${p.y}`).join('');
                                handlePositions = fullPath.slice(1, -1);
                            } else {
                                const fullPath = getOffsetPath(fromPos, toPos, pathPoints, offsetAmount, connIndex, group.length);
                                pathData = `M ${fullPath[0].x} ${fullPath[0].y}` + fullPath.slice(1).map(p => ` L ${p.x} ${p.y}`).join('');
                                handlePositions = fullPath.slice(1, -1);
                            }
                            
                            const fromPort = fromNode.ports.find(p => p.id === conn.from.portId);
                            const toPort = toNode.ports.find(p => p.id === conn.to.portId);
                            const isSelected = selectedConnectionId === conn.id;
                            const isEditingFrom = editingPortInfo && editingPortInfo.connId === conn.id && editingPortInfo.end === 'from';
                            const isEditingTo = editingPortInfo && editingPortInfo.connId === conn.id && editingPortInfo.end === 'to';
                            
                            const handlePortUpdate = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
                                if ('key' in e && e.key !== 'Enter') return;
                                const portNumber = (e.target as HTMLInputElement).value.trim();

                                const currentPort = isEditingFrom ? fromPort : toPort;
                                if (currentPort && portNumber) {
                                    let newPortName: string;
                                    if (currentPort.name.endsWith('/')) {
                                        newPortName = currentPort.name + portNumber;
                                    } else {
                                        const lastSlashIndex = currentPort.name.lastIndexOf('/');
                                        if (lastSlashIndex !== -1) {
                                            newPortName = currentPort.name.substring(0, lastSlashIndex + 1) + portNumber;
                                        } else {
                                            newPortName = currentPort.name.replace(/\d+$/, '') + portNumber;
                                        }
                                    }
                                    onUpdatePortName(conn.id, isEditingFrom ? 'from' : 'to', newPortName);
                                }
                            };
                            
                            // Apply offset to label positions for parallel connections
                            const dx = toPos.x - fromPos.x;
                            const dy = toPos.y - fromPos.y;
                            const distance = Math.hypot(dx, dy);
                            let labelOffsetX = 0, labelOffsetY = 0;
                            
                            if (distance > 0 && group.length > 1) {
                                const offsetAmount = 20;
                                const perpX = -dy / distance;
                                const perpY = dx / distance;
                                const offsetDist = offsetAmount * (connIndex - (group.length - 1) / 2);
                                labelOffsetX = perpX * offsetDist;
                                labelOffsetY = perpY * offsetDist;
                            }
                            
                            const labelFromPos = {
                                x: getPointOnLine(fromPos, toPos, 0.1).x + labelOffsetX,
                                y: getPointOnLine(fromPos, toPos, 0.1).y + labelOffsetY
                            };
                            const labelToPos = {
                                x: getPointOnLine(fromPos, toPos, 0.9).x + labelOffsetX,
                                y: getPointOnLine(fromPos, toPos, 0.9).y + labelOffsetY
                            };

                            return (
                                <g key={conn.id}>
                                    <path d={pathData} className={`transition-all ${isSelected ? 'stroke-purple-500' : 'stroke-black'}`} strokeWidth={`${3 / canvasScale}`} fill="none" strokeDasharray={conn.type === 'dashed' ? `${8 / canvasScale},${6 / canvasScale}` : 'none'} style={{ pointerEvents: 'none' }} />
                                    <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleConnectionClick(conn); }} onDoubleClick={(e) => handleConnectionDoubleClick(e, conn)} />
                                    {isSelected && handlePositions.map((pos, pointIndex) => (
                                        <circle
                                            key={`handle-${conn.id}-${pointIndex}`}
                                            cx={pos.x} cy={pos.y} r={`${6 / canvasScale}`}
                                            className="fill-blue-500 stroke-white cursor-move pointer-events-auto path-point-handle"
                                            strokeWidth={`${2 / canvasScale}`}
                                            onMouseDown={(e) => handlePathPointMouseDown(e, conn.id, pointIndex)}
                                            onDoubleClick={(e) => handlePathPointDoubleClick(e, conn.id, pointIndex)}
                                        />
                                    ))}
                                    
                                    {!isEditingFrom && (
                                        <foreignObject
                                            x={labelFromPos.x - 12 + (conn.labelFromOffset?.x || 0)}
                                            y={labelFromPos.y - 10 + (conn.labelFromOffset?.y || 0)}
                                            width="24" height="20"
                                            className="connection-label cursor-move pointer-events-auto overflow-visible"
                                            onMouseDown={(e) => handleLabelMouseDown(e, conn.id, 'from')}
                                            onDoubleClick={(e) => { e.stopPropagation(); onPortLabelDoubleClick(conn.id, 'from'); }}
                                        >
                                            <div title={fromPort?.name} className="w-full h-full bg-white border border-slate-400 rounded-sm flex items-center justify-center text-black text-[10px] font-bold select-none" > {getPortNumber(fromPort?.name)} </div>
                                        </foreignObject>
                                    )}
                                    
                                    {!isEditingTo && (
                                        <foreignObject
                                            x={labelToPos.x - 12 + (conn.labelToOffset?.x || 0)}
                                            y={labelToPos.y - 10 + (conn.labelToOffset?.y || 0)}
                                            width="24" height="20"
                                            className="connection-label cursor-move pointer-events-auto overflow-visible"
                                            onMouseDown={(e) => handleLabelMouseDown(e, conn.id, 'to')}
                                            onDoubleClick={(e) => { e.stopPropagation(); onPortLabelDoubleClick(conn.id, 'to'); }}
                                        >
                                            <div title={toPort?.name} className="w-full h-full bg-white border border-slate-400 rounded-sm flex items-center justify-center text-black text-[10px] font-bold select-none" > {getPortNumber(toPort?.name)} </div>
                                        </foreignObject>
                                    )}

                                    {(isEditingFrom || isEditingTo) && (
                                        <foreignObject
                                            x={(isEditingFrom ? labelFromPos.x : labelToPos.x) - 45 + (isEditingFrom ? (conn.labelFromOffset?.x || 0) : (conn.labelToOffset?.x || 0))}
                                            y={(isEditingFrom ? labelFromPos.y : labelToPos.y) - 12 + (isEditingFrom ? (conn.labelFromOffset?.y || 0) : (conn.labelToOffset?.y || 0))}
                                            width="90" height="24"
                                            className="pointer-events-auto overflow-visible"
                                        >
                                            <div className="w-full h-full p-1 flex items-center justify-center connection-label-input">
                                                <input
                                                    key={conn.id + (isEditingFrom ? 'from' : 'to')}
                                                    type="text"
                                                    defaultValue={(() => {
                                                        const portName = isEditingFrom ? fromPort?.name : toPort?.name;
                                                        if (!portName) return '';
                                                        if (portName.endsWith('/')) return '';
                                                        const match = portName.match(/(\d+)(?!.*\d)/);
                                                        return match ? match[0] : '';
                                                    })()}
                                                    placeholder="端口号"
                                                    className="bg-slate-900 text-white text-xs text-center w-full h-full border border-blue-500 rounded-sm outline-none"
                                                    autoFocus
                                                    onBlur={handlePortUpdate}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handlePortUpdate(e);
                                                        }
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </div>
                                        </foreignObject>
                                    )}
                                </g>
                            );
                        });
                    })}
                    {previewLine && ( <line x1={previewLine.x1} y1={previewLine.y1} x2={previewLine.x2} y2={previewLine.y2} stroke="#22c55e" strokeWidth={`${2 / canvasScale}`} strokeDasharray={`${4 / canvasScale} ${4 / canvasScale}`} /> )}
                    {selectionRect && ( <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} className="fill-blue-500/20 stroke-blue-600" strokeWidth={`${1 / canvasScale}`} /> )}
                </svg>

                {nodes.map(node => (
                    <NodeComponent
                        key={node.id}
                        node={node}
                        onMove={moveNode}
                        onNodeClick={handleNodeClick}
                        onNodeUpdate={updateNode}
                        isSelected={node.id === selectedNodeId || multiSelectedNodeIds.has(node.id)}
                        isConnecting={isConnecting}
                        allNodes={allNodes}
                        allConnections={allConnections}
                        canvasScale={canvasScale}
                        nameRect={nameRects[node.id]}
                    />
                ))}
            </div>
        </div>
    );
});

export default Canvas;
