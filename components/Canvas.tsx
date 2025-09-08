import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { Node, Connection, DeviceType } from '../types';
import { RouterIcon, L2SwitchIcon, L3SwitchIcon, PCIcon, FirewallIcon, APIcon, ACIcon, TextBoxSolidIcon, RectangleIcon, CircleIcon, RotateIcon } from './Icons';

interface DraggableNodeProps {
    node: Node;
    onMove: (id: string, x: number, y: number) => void;
    onNodeClick: (node: Node, e: React.MouseEvent) => void;
    onNodeUpdate: (node: Node) => void;
    isSelected: boolean;
    isConnecting: boolean;
    allNodes: Node[];
    allConnections: Connection[];
}

const NodeComponent: React.FC<DraggableNodeProps> = memo(({ node, onMove, onNodeClick, onNodeUpdate, isSelected, isConnecting, allNodes, allConnections }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<false | 'se' | 'right' | 'bottom'>(false);
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(node.text || '');
    const nodeRef = useRef<HTMLDivElement>(null);
    const [nameStyle, setNameStyle] = useState<React.CSSProperties>({});


    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing || (e.target as HTMLElement).closest('.connection-label-input') || (e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('.orthogonal-handle')) return;
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
                        width: Math.max(20, (node.width || 0) + e.movementX),
                        height: Math.max(20, (node.height || 0) + e.movementY),
                    });
                } else if (node.type === DeviceType.Circle && isResizing === 'se') {
                    const delta = (e.movementX + e.movementY) / 2;
                     onNodeUpdate({
                        ...node,
                        radius: Math.max(20, (node.radius || 0) + delta),
                    });
                } else if (node.type === DeviceType.Halo) {
                    if (isResizing === 'right') {
                        onNodeUpdate({
                            ...node,
                            width: Math.max(40, (node.width || 0) + e.movementX * 2),
                        });
                    } else if (isResizing === 'bottom') {
                        onNodeUpdate({
                            ...node,
                            height: Math.max(20, (node.height || 0) + e.movementY * 2),
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
    }, [isDragging, isResizing, node, onMove, onNodeUpdate]);

    useEffect(() => {
        if (node.type === DeviceType.Rectangle || node.type === DeviceType.Circle || node.type === DeviceType.Text || node.type === DeviceType.Halo) return;
        const nodeConnections = allConnections.filter(c => c.from.nodeId === node.id || c.to.nodeId === node.id);
        const iconHalfSize = node.style.iconSize / 2;
        const padding = 15;

        let style: React.CSSProperties = {
            position: 'absolute',
            bottom: `${iconHalfSize + padding}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center'
        };

        if (nodeConnections.length > 0) {
            let avgDx = 0;
            let avgDy = 0;
            nodeConnections.forEach(conn => {
                const otherNodeId = conn.from.nodeId === node.id ? conn.to.nodeId : conn.from.nodeId;
                const otherNode = allNodes.find(n => n.id === otherNodeId);
                if (otherNode) {
                    avgDx += otherNode.x - node.x;
                    avgDy += otherNode.y - node.y;
                }
            });

            if (Math.abs(avgDx) > Math.abs(avgDy) * 1.5) {
                if (avgDx > 0) { // Connections on the right
                    style = { // Name on the left
                        position: 'absolute',
                        top: '50%',
                        right: `${iconHalfSize + padding}px`,
                        transform: 'translateY(-50%)',
                        textAlign: 'right',
                    };
                } else { // Connections on the left
                    style = { // Name on the right
                        position: 'absolute',
                        top: '50%',
                        left: `${iconHalfSize + padding}px`,
                        transform: 'translateY(-50%)',
                        textAlign: 'left',
                    };
                }
            } else {
                if (avgDy > 0) { // Connections on the bottom
                    style = { // Name on the top
                        position: 'absolute',
                        bottom: `${iconHalfSize + padding}px`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                    };
                } else { // Connections on the top
                    style = { // Name on the bottom
                        position: 'absolute',
                        top: `${iconHalfSize + padding}px`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                    };
                }
            }
        }

        setNameStyle(style);
    }, [node, allConnections, allNodes]);

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
            case DeviceType.Firewall: return <FirewallIcon {...props} />;
            case DeviceType.AP: return <APIcon {...props} />;
            case DeviceType.AC: return <ACIcon {...props} />;
            case DeviceType.Text: return <TextBoxSolidIcon {...props} />;
            case DeviceType.Rectangle: return <RectangleIcon {...props} />;
            case DeviceType.Circle: return <CircleIcon {...props} />;
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
    editingPortInfo, onPortLabelDoubleClick, onUpdatePortName
}, ref) => {
    const canvasInnerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => canvasInnerRef.current!);

    const [draggingLabel, setDraggingLabel] = useState<{ connId: string; end: 'from' | 'to'; initialOffset: { x: number; y: number; }; startMousePos: { x: number; y: number; };} | null>(null);
    const [draggingOrthogonalHandle, setDraggingOrthogonalHandle] = useState<{ connId: string; startX: number; startY: number; startRatio: number; fromPos: {x:number, y:number}; toPos: {x:number, y:number} } | null>(null);


    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingLabel) {
                const dx = e.clientX - draggingLabel.startMousePos.x;
                const dy = e.clientY - draggingLabel.startMousePos.y;
                const newOffset = { x: draggingLabel.initialOffset.x + dx, y: draggingLabel.initialOffset.y + dy };
                const conn = connections.find(c => c.id === draggingLabel.connId);
                if (conn) {
                    const field = draggingLabel.end === 'from' ? 'labelFromOffset' : 'labelToOffset';
                    updateConnection({ ...conn, [field]: newOffset });
                }
            } else if (draggingOrthogonalHandle) {
                const { connId, fromPos, toPos, startRatio } = draggingOrthogonalHandle;
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                let newRatio;
                if (Math.abs(dx) > Math.abs(dy)) { // Horizontal-first
                    const mouseDx = e.clientX - draggingOrthogonalHandle.startX;
                    newRatio = startRatio + mouseDx / dx;
                } else { // Vertical-first
                    const mouseDy = e.clientY - draggingOrthogonalHandle.startY;
                    newRatio = startRatio + mouseDy / dy;
                }
                newRatio = Math.max(0.05, Math.min(0.95, newRatio));
                const conn = connections.find(c => c.id === connId);
                if (conn) {
                    updateConnection({ ...conn, path: { ...conn.path, midPointRatio: newRatio } });
                }
            }
        };

        const handleMouseUp = () => {
            setDraggingLabel(null);
            setDraggingOrthogonalHandle(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingLabel, draggingOrthogonalHandle, connections, updateConnection]);

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

    const handleOrthogonalHandleMouseDown = (e: React.MouseEvent, conn: Connection, fromPos: {x:number, y:number}, toPos: {x:number, y:number}) => {
        e.stopPropagation();
        setDraggingOrthogonalHandle({
            connId: conn.id,
            startX: e.clientX,
            startY: e.clientY,
            startRatio: conn.path?.midPointRatio ?? 0.5,
            fromPos,
            toPos
        });
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            const item = JSON.parse(data);
            const canvasBounds = canvasInnerRef.current?.getBoundingClientRect();
            if (canvasBounds) {
                const x = e.clientX - canvasBounds.left;
                const y = e.clientY - canvasBounds.top;
                addNode(item, x, y);
            }
        } catch (error) {
            console.error("Failed to parse dropped data:", error);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const moveNode = (id: string, dx: number, dy: number) => setNodes(p => p.map(n => (n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n)));
    const updateNode = (updatedNode: Node) => setNodes(p => p.map(n => (n.id === updatedNode.id ? updatedNode : n)));

    const connectionGroups = connections.reduce((acc, conn) => {
        const key = [conn.from.nodeId, conn.to.nodeId].sort().join('-');
        if (!acc[key]) acc[key] = [];
        acc[key].push(conn);
        return acc;
    }, {} as Record<string, Connection[]>);

    return (
        <div
            ref={canvasInnerRef}
            className={`w-full h-full bg-slate-50 relative ${isConnecting ? 'cursor-crosshair' : 'cursor-default'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseDown={onCanvasMouseDown}
            style={{
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '2rem 2rem'
            }}
        >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                {Object.values(connectionGroups).map(group => {
                    const total = group.length;
                    const firstConn = group[0];
                    const fromNode = nodes.find(n => n.id === firstConn.from.nodeId);
                    const toNode = nodes.find(n => n.id === firstConn.to.nodeId);
                    if (!fromNode || !toNode) return null;

                    const fromPos = getSmartEdgePoint(fromNode, toNode);
                    const toPos = getSmartEdgePoint(toNode, fromNode);

                    const dx = toPos.x - fromPos.x;
                    const dy = toPos.y - fromPos.y;
                    const length = Math.sqrt(dx * dx + dy * dy) || 1;
                    const nx = -dy / length;
                    const ny = dx / length;
                    
                    if (total > 1) {
                         const busPath = `M ${fromPos.x},${fromPos.y} L ${toPos.x},${toPos.y}`;
                         const busWidth = (total - 1) * 24 + 16;
                         return (
                            <g key={`group-${firstConn.id}`}>
                                <path
                                    d={busPath}
                                    stroke="rgba(160, 174, 192, 0.7)" 
                                    strokeWidth={busWidth}
                                    fill="none"
                                    strokeLinecap="round"
                                />
                                {group.map((conn, index) => {
                                    const offset = (index - (total - 1) / 2) * 24; // Increased spacing to prevent label overlap
                                    const fromPosOffset = { x: fromPos.x + offset * nx, y: fromPos.y + offset * ny };
                                    const toPosOffset = { x: toPos.x + offset * nx, y: toPos.y + offset * ny };

                                    let pathData;
                                    let handlePos = {x:0, y:0};

                                    if (conn.style === 'orthogonal') {
                                        const ratio = conn.path?.midPointRatio ?? 0.5;
                                        const dxo = toPosOffset.x - fromPosOffset.x;
                                        const dyo = toPosOffset.y - fromPosOffset.y;
                                        if (Math.abs(dxo) > Math.abs(dyo)) { // Horizontal-first
                                            const midX = fromPosOffset.x + dxo * ratio;
                                            pathData = `M ${fromPosOffset.x},${fromPosOffset.y} H ${midX} V ${toPosOffset.y} H ${toPosOffset.x}`;
                                            handlePos = { x: midX, y: (fromPosOffset.y + toPosOffset.y) / 2 };
                                        } else { // Vertical-first
                                            const midY = fromPosOffset.y + dyo * ratio;
                                            pathData = `M ${fromPosOffset.x},${fromPosOffset.y} V ${midY} H ${toPosOffset.x} V ${toPosOffset.y}`;
                                            handlePos = { x: (fromPosOffset.x + toPosOffset.x) / 2, y: midY };
                                        }
                                    } else { // 'direct' or legacy 'curved'
                                        pathData = `M ${fromPosOffset.x},${fromPosOffset.y} L ${toPosOffset.x},${toPosOffset.y}`;
                                    }

                                    const fromPort = fromNode.ports.find(p => p.id === conn.from.portId);
                                    const toPort = toNode.ports.find(p => p.id === conn.to.portId);
                                    const isSelected = selectedConnectionId === conn.id;
                                    const isEditingFrom = editingPortInfo && editingPortInfo.connId === conn.id && editingPortInfo.end === 'from';
                                    const isEditingTo = editingPortInfo && editingPortInfo.connId === conn.id && editingPortInfo.end === 'to';

                                    const labelFromPos = getPointOnLine(fromPosOffset, toPosOffset, 0.1);
                                    const labelToPos = getPointOnLine(fromPosOffset, toPosOffset, 0.9);

                                    return (
                                        <g key={conn.id}>
                                            <path d={pathData} stroke={isSelected ? '#a855f7' : '#94a3b8'} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={conn.type === 'dashed' ? '8,6' : 'none'} style={{ pointerEvents: 'none' }} />
                                            <path d={pathData} stroke={isSelected ? '#a855f7' : 'black'} strokeWidth="2" fill="none" strokeDasharray={conn.type === 'dashed' ? '8,6' : 'none'} style={{ pointerEvents: 'none' }} />
                                            <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleConnectionClick(conn); }} />
                                            
                                            {!isEditingFrom && <foreignObject x={labelFromPos.x - 12 + (conn.labelFromOffset?.x || 0)} y={labelFromPos.y - 10 + (conn.labelFromOffset?.y || 0)} width="24" height="20" className="connection-label cursor-move pointer-events-auto overflow-visible" onMouseDown={(e) => handleLabelMouseDown(e, conn.id, 'from')} onDoubleClick={(e) => { e.stopPropagation(); onPortLabelDoubleClick(conn.id, 'from'); }}><div title={fromPort?.name} className="w-full h-full bg-white border border-slate-400 rounded-sm flex items-center justify-center text-black text-[10px] font-bold select-none" > {getPortNumber(fromPort?.name)} </div></foreignObject>}
                                            {!isEditingTo && <foreignObject x={labelToPos.x - 12 + (conn.labelToOffset?.x || 0)} y={labelToPos.y - 10 + (conn.labelToOffset?.y || 0)} width="24" height="20" className="connection-label cursor-move pointer-events-auto overflow-visible" onMouseDown={(e) => handleLabelMouseDown(e, conn.id, 'to')} onDoubleClick={(e) => { e.stopPropagation(); onPortLabelDoubleClick(conn.id, 'to'); }}><div title={toPort?.name} className="w-full h-full bg-white border border-slate-400 rounded-sm flex items-center justify-center text-black text-[10px] font-bold select-none" > {getPortNumber(toPort?.name)} </div></foreignObject>}
                                        </g>
                                    );
                                })}
                            </g>
                         )
                    }

                    // This part renders single connections
                    return group.map(conn => {
                        const fromPos = getSmartEdgePoint(fromNode, toNode);
                        const toPos = getSmartEdgePoint(toNode, fromNode);
                        const dx = toPos.x - fromPos.x;
                        const dy = toPos.y - fromPos.y;
                        let pathData;
                        let handlePos = {x:0, y:0};

                        if (conn.style === 'orthogonal') {
                            const ratio = conn.path?.midPointRatio ?? 0.5;
                            if (Math.abs(dx) > Math.abs(dy)) {
                                const midX = fromPos.x + dx * ratio;
                                pathData = `M ${fromPos.x},${fromPos.y} H ${midX} V ${toPos.y} H ${toPos.x}`;
                                handlePos = { x: midX, y: (fromPos.y + toPos.y) / 2 };
                            } else {
                                const midY = fromPos.y + dy * ratio;
                                pathData = `M ${fromPos.x},${fromPos.y} V ${midY} H ${toPos.x} V ${toPos.y}`;
                                handlePos = { x: (fromPos.x + toPos.x) / 2, y: midY };
                            }
                        } else { // 'direct' or legacy 'curved'
                            pathData = `M ${fromPos.x},${fromPos.y} L ${toPos.x},${toPos.y}`;
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
                        
                        const labelFromPos = getPointOnLine(fromPos, toPos, 0.1);
                        const labelToPos = getPointOnLine(fromPos, toPos, 0.9);

                        return (
                             <g key={conn.id}>
                                <path d={pathData} className={`transition-all ${isSelected ? 'stroke-purple-500' : 'stroke-black'}`} strokeWidth="3" fill="none" strokeDasharray={conn.type === 'dashed' ? '8,6' : 'none'} style={{ pointerEvents: 'none' }} />
                                <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleConnectionClick(conn); }} />
                                {isSelected && conn.style === 'orthogonal' && (
                                    <circle cx={handlePos.x} cy={handlePos.y} r="6" className="fill-blue-500 stroke-white stroke-2 cursor-move pointer-events-auto orthogonal-handle" onMouseDown={(e) => handleOrthogonalHandleMouseDown(e, conn, fromPos, toPos)} />
                                )}
                                
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
                {previewLine && ( <line x1={previewLine.x1} y1={previewLine.y1} x2={previewLine.x2} y2={previewLine.y2} stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" /> )}
                {selectionRect && ( <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} className="fill-blue-500/20 stroke-blue-600 stroke-1" /> )}
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
                />
            ))}
        </div>
    );
});

export default Canvas;