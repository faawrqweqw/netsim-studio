
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { Node, Connection, DeviceType } from '../types';
import { RouterIcon, L2SwitchIcon, L3SwitchIcon, PCIcon, FirewallIcon, APIcon, ACIcon, ServerIcon, TextBoxSolidIcon, RectangleIcon, CircleIcon, RotateIcon,PrintIcon,MonitorIcon } from './Icons';

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
}

const NodeComponent: React.FC<DraggableNodeProps> = memo(({ node, onMove, onNodeClick, onNodeUpdate, isSelected, isConnecting, allNodes, allConnections, canvasScale }) => {
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
        // 形状和文本节点不需要动态计算
        if (node.type === DeviceType.Rectangle || node.type === DeviceType.Circle || node.type === DeviceType.Text || node.type === DeviceType.Halo) return;
        
        const nodeConnections = allConnections.filter(c => c.from.nodeId === node.id || c.to.nodeId === node.id);
        
        // **安全边界**：确保名称与图标边缘有足够的间距
        const iconSafeZone = node.style.iconSize / 2;
        let dynamicPadding = 20; // 默认较小的间距 (e.g., L3Switch, APIcon)

        switch (node.type) {
            case DeviceType.Server:
                dynamicPadding = 50;
                break;
            case DeviceType.AC:
                dynamicPadding = 30;
                break;
            case DeviceType.AP:
                dynamicPadding = 30;
                break;
            case DeviceType.L3Switch:
                dynamicPadding = 30;
                break;
            case DeviceType.Firewall:
                // 服务器和防火墙是垂直长条形，名称放在左右时，需要更大垂直偏移。
                // 但由于你的定位逻辑是基于连接方向的，我们主要增加上下偏移量，
                // 确保名称不会被高大的图标遮挡。
                dynamicPadding = 70; 
                break;
            case DeviceType.Print:
                dynamicPadding = 35;
                break;
            case DeviceType.L2Switch:
                // 路由器和L2交换机是水平扁平形，名称放在上下时，需要较小偏移。
                // 名称放在左右时，可能需要更大的水平偏移。
                dynamicPadding = 16; 
                break;
            case DeviceType.PC:
                // PC图标形状复杂，可以给一个中等偏大的值。
                dynamicPadding = 30;
                break;
            // etc. 使用默认值 12
        }
        const offset = iconSafeZone + dynamicPadding; // 名称边界距离图标中心的距离

        // 默认样式：名称在图标下方
        let style: React.CSSProperties = {
            position: 'absolute',
            // 确保名称文本块的顶部在图标边界（iconSafeZone）+ 间距（padding）之外
            top: `${offset}px`, 
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center'
        };

        // 动态定位逻辑
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
                // 水平方向连接占主导
                if (avgDx > 0) { // 连接在右侧 -> 名称在左侧
                    style = { 
                        position: 'absolute',
                        top: '50%',
                        // 名称的右边界距离图标中心 offset 距离
                        right: `${offset}px`, 
                        transform: 'translateY(-50%)',
                        textAlign: 'right',
                    };
                } else { // 连接在左侧 -> 名称在右侧
                    style = { 
                        position: 'absolute',
                        top: '50%',
                        // 名称的左边界距离图标中心 offset 距离
                        left: `${offset}px`, 
                        transform: 'translateY(-50%)',
                        textAlign: 'left',
                    };
                }
            } else {
                // 垂直方向连接占主导
                if (avgDy > 0) { // 连接在下方 -> 名称在上方
                    style = { 
                        position: 'absolute',
                        // 名称的底边界距离图标中心 offset 距离
                        bottom: `${offset}px`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                    };
                } else { // 连接在上方 -> 名称在下方
                    style = { 
                        position: 'absolute',
                        // 名称的顶边界距离图标中心 offset 距离
                        top: `${offset}px`,
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
            case DeviceType.Server: return <ServerIcon {...props} />;
            case DeviceType.Firewall: return <FirewallIcon {...props} />;
            case DeviceType.AP: return <APIcon {...props} />;
            case DeviceType.AC: return <ACIcon {...props} />;
            case DeviceType.Monitor: return <MonitorIcon {...props} />;
            case DeviceType.Text: return <TextBoxSolidIcon {...props} />;
            case DeviceType.Rectangle: return <RectangleIcon {...props} />;
            case DeviceType.Circle: return <CircleIcon {...props} />;
            case DeviceType.Print: return <PrintIcon {...props} />;
            default: return null;
        }
    };
    
    const renderEditableText = (containerStyle: React.CSSProperties, backgroundClass: string = 'bg-transparent') => {
        const scaledFontSize = Math.max(10, 14 / canvasScale);
        if (isEditing) {
            return (
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    onBlur={handleTextBlur}
                    autoFocus
                    className={`absolute inset-0 w-full h-full text-center resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${backgroundClass}`}
                    style={{
                        ...containerStyle, 
                        fontSize: `${scaledFontSize}px`,
                        zIndex: 11 
                    }}
                />
            );
        }
        return (
            <div 
                className="flex items-center justify-center h-full w-full p-2 text-center break-words" 
                style={{
                    ...containerStyle,
                    fontSize: `${scaledFontSize}px`
                }}
            >
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
        const scaledBorderWidth = Math.max(0.5, 1 / canvasScale);
        const textStyle = { color: node.style.color };
        
        return (
            <div
                ref={nodeRef}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={handleNodeBodyClick}
                className={`absolute p-2 whitespace-pre-wrap rounded node-component-wrapper bg-slate-400/10 ${borderClass} ${isSelected ? 'outline-dashed outline-2 outline-blue-400 outline-offset-2' : ''}`}
                style={{ 
                    left: node.x, 
                    top: node.y, 
                    width: node.width, 
                    height: node.height, 
                    zIndex: 1,
                    borderWidth: `${scaledBorderWidth}px`
                }}
            >
                {renderEditableText(textStyle)}
                {isSelected && (
                     <div
                        className="absolute -right-1 -bottom-1 w-3 h-3 bg-blue-500 cursor-se-resize rounded-full border-2 border-white resize-handle"
                        style={{
                            width: `${Math.max(8, 12 / canvasScale)}px`,
                            height: `${Math.max(8, 12 / canvasScale)}px`,
                            borderWidth: `${Math.max(1, 2 / canvasScale)}px`
                        }}
                        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                    />
                )}
            </div>
        );
    }

    if (node.type === DeviceType.Circle) {
        const { x, y, radius = 80, style, text } = node;
        const scaledStrokeWidth = Math.max(1, 2 / canvasScale);
        const textStyle = { color: node.style.color };

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
                    <circle cx={radius} cy={radius} r={radius-1} fill={`${style.color}33`} stroke={style.color} strokeWidth={scaledStrokeWidth} />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4 text-center break-words" style={{color: node.style.color}}>
                    {renderEditableText(textStyle)}
                 </div>
                 {isSelected && (
                    <>
                        <div
                            className="absolute bg-blue-500/20 border-2 border-blue-500 rounded-full pointer-events-none"
                            style={{ 
                                inset: -8 / canvasScale, 
                                width: radius*2 + 16 / canvasScale, 
                                height: radius*2 + 16 / canvasScale, 
                                left: -8 / canvasScale, 
                                top: -8 / canvasScale,
                                borderWidth: `${Math.max(1, 2 / canvasScale)}px`
                            }}
                        />
                         <div
                            className="absolute bg-blue-500 cursor-se-resize rounded-full border-2 border-white resize-handle"
                            style={{ 
                                right: -8 / canvasScale, 
                                bottom: -8 / canvasScale, 
                                transform: 'translate(50%, 50%)',
                                width: `${Math.max(12, 16 / canvasScale)}px`,
                                height: `${Math.max(12, 16 / canvasScale)}px`,
                                borderWidth: `${Math.max(1, 2 / canvasScale)}px`
                            }}
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
        const scaledFontSize = Math.max(10, (node.style.iconSize / 3) / canvasScale);
        const scaledBorderWidth = Math.max(0.5, 1 / canvasScale);
        const textStyle = { color: node.style.color };

        return (
            <div
                ref={nodeRef}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={handleNodeBodyClick}
                className={`absolute p-2 cursor-pointer whitespace-pre-wrap rounded node-component-wrapper ${borderClass} ${isSelected ? 'outline-dashed outline-2 outline-blue-400 outline-offset-2' : ''}`}
                style={{ 
                    left: node.x, 
                    top: node.y, 
                    width: 150, 
                    minHeight: 40, 
                    height: 'auto', 
                    zIndex: 10,
                    borderWidth: `${scaledBorderWidth}px`,
                    fontSize: `${scaledFontSize}px`
                }}
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
                        <ellipse 
                            cx={rx} 
                            cy={ry} 
                            rx={rx - 1} 
                            ry={ry - 1} 
                            fill="none" 
                            stroke="#a7c7e7" 
                            strokeWidth={Math.max(1, 2 / canvasScale)} 
                        />
                        <path
                            d={`M ${starX - 4},${starY} l 4,-4 l 4,4 l -4,4 z`}
                            fill="#e299c8" 
                            stroke="white" 
                            strokeWidth={Math.max(0.5, 0.5 / canvasScale)}
                        />
                    </svg>
                </div>

                {isSelected && (
                    <>
                        <div 
                            className="absolute pointer-events-none" 
                            style={{ 
                                inset: -8 / canvasScale, 
                                border: `${Math.max(1, 2 / canvasScale)}px dashed #3b82f6` 
                            }} 
                        />
                        <div
                            className="absolute bg-blue-500 cursor-ew-resize rounded-full border-2 border-white resize-handle"
                            style={{ 
                                top: '50%', 
                                right: -6 / canvasScale, 
                                transform: 'translateY(-50%)',
                                width: `${Math.max(8, 12 / canvasScale)}px`,
                                height: `${Math.max(8, 12 / canvasScale)}px`,
                                borderWidth: `${Math.max(1, 2 / canvasScale)}px`
                            }}
                            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                        />
                        <div
                            className="absolute bg-blue-500 cursor-ns-resize rounded-full border-2 border-white resize-handle"
                            style={{ 
                                left: '50%', 
                                bottom: -6 / canvasScale, 
                                transform: 'translateX(-50%)',
                                width: `${Math.max(8, 12 / canvasScale)}px`,
                                height: `${Math.max(8, 12 / canvasScale)}px`,
                                borderWidth: `${Math.max(1, 2 / canvasScale)}px`
                            }}
                            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                        />
                        <div
                            className="absolute bg-green-500 hover:bg-green-600 cursor-pointer rounded-full border-2 border-white flex items-center justify-center text-white rotation-handle"
                            style={{
                                top: -12 / canvasScale,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: `${Math.max(16, 24 / canvasScale)}px`,
                                height: `${Math.max(16, 24 / canvasScale)}px`,
                                borderWidth: `${Math.max(1, 2 / canvasScale)}px`
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
            <p 
                className="font-medium whitespace-nowrap text-slate-800" 
                style={{
                    ...nameStyle,
                    fontSize: `${Math.max(10, 14 / canvasScale)}px`,
                    transform: `scale(${Math.max(0.6, 1 / canvasScale)})`,
                    transformOrigin: 'center bottom',
                    marginBottom: `${Math.max(2, 4 / canvasScale)}px`
                }}
            >
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
                            inset: -8 / canvasScale,
                            borderWidth: `${Math.max(1, 2 / canvasScale)}px`
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

const getSmartEdgePoint = (sourceNode: Node, targetNode: Node, offset?: { x: number; y: number }): { x: number; y: number } => {
    const sx = sourceNode.x + (offset?.x || 0);
    const sy = sourceNode.y + (offset?.y || 0);
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

        // 计算连接组和索引来确定正确的偏移量
        const connectionGroup = connections.filter(c => 
            (c.from.nodeId === conn.from.nodeId && c.to.nodeId === conn.to.nodeId) ||
            (c.from.nodeId === conn.to.nodeId && c.to.nodeId === conn.from.nodeId)
        );
        const connIndex = connectionGroup.findIndex(c => c.id === conn.id);
        const { fromOffset, toOffset } = getConnectionOffset(fromNode, toNode, connIndex, connectionGroup.length);
        
        // 创建带偏移的虚拟节点用于计算边缘点
        const fromNodeWithOffset = { ...fromNode, x: fromNode.x + fromOffset.x, y: fromNode.y + fromOffset.y };
        const toNodeWithOffset = { ...toNode, x: toNode.x + toOffset.x, y: toNode.y + toOffset.y };
        
        const fromPos = getSmartEdgePoint(fromNodeWithOffset, toNodeWithOffset);
        const toPos = getSmartEdgePoint(toNodeWithOffset, fromNodeWithOffset);
        
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

    const connectionGroups = connections.reduce((acc, conn) => {
        const key = [conn.from.nodeId, conn.to.nodeId].sort().join('-');
        if (!acc[key]) acc[key] = [];
        acc[key].push(conn);
        return acc;
    }, {} as Record<string, Connection[]>);

    // 计算连接线偏移量的函数
    const getConnectionOffset = (fromNode: Node, toNode: Node, index: number, total: number): { fromOffset: { x: number, y: number }, toOffset: { x: number, y: number } } => {
        if (total === 1) {
            return { fromOffset: { x: 0, y: 0 }, toOffset: { x: 0, y: 0 } };
        }

        // 计算两个节点之间的向量
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { fromOffset: { x: 0, y: 0 }, toOffset: { x: 0, y: 0 } };
        }

        // 归一化向量（连接线方向）
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;

        // 垂直于连接线的向量
        const perpX = -normalizedY;
        const perpY = normalizedX;

        // 计算偏移量 - 改进的算法
        const baseSpacing = 12; // 基础间距
        const dynamicSpacing = Math.min(baseSpacing, distance / 8); // 根据距离调整间距
        const spacing = Math.max(6, dynamicSpacing); // 最小间距为6
        
        // 计算偏移距离
        const offsetDistance = (index - (total - 1) / 2) * spacing;

        // 计算节点边缘的偏移，确保连接线从合适的位置出发
        const nodeRadius = fromNode.style.iconSize / 2;
        const edgeOffsetFactor = Math.min(0.8, (Math.abs(offsetDistance) / nodeRadius));
        
        // 从起始节点的偏移
        const fromOffset = {
            x: perpX * offsetDistance * 0.8,  // 在起始端稍微收敛
            y: perpY * offsetDistance * 0.8
        };

        // 到目标节点的偏移
        const toOffset = {
            x: perpX * offsetDistance * 0.8,  // 在结束端稍微收敛
            y: perpY * offsetDistance * 0.8
        };

        return { fromOffset, toOffset };
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

                        return group.map((conn, index) => {
                            const { fromOffset, toOffset } = getConnectionOffset(fromNode, toNode, index, group.length);
                            
                            // 创建带偏移的虚拟节点用于计算边缘点
                            const fromNodeWithOffset = { ...fromNode, x: fromNode.x + fromOffset.x, y: fromNode.y + fromOffset.y };
                            const toNodeWithOffset = { ...toNode, x: toNode.x + toOffset.x, y: toNode.y + toOffset.y };
                            
                            const fromPos = getSmartEdgePoint(fromNodeWithOffset, toNodeWithOffset);
                            const toPos = getSmartEdgePoint(toNodeWithOffset, fromNodeWithOffset);
                            let pathData: string;
                            let handlePositions: { x: number, y: number }[] = [];
                            let pathPoints = conn.path?.points || [];

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

                                const fullPath = [fromPos, ...pathPoints, toPos];
                                pathData = `M ${fullPath[0].x} ${fullPath[0].y}` + fullPath.slice(1).map(p => ` L ${p.x} ${p.y}`).join('');
                                handlePositions = pathPoints;
                            } else {
                                const fullPath = [fromPos, ...pathPoints, toPos];
                                pathData = `M ${fullPath[0].x} ${fullPath[0].y}` + fullPath.slice(1).map(p => ` L ${p.x} ${p.y}`).join('');
                                handlePositions = pathPoints;
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
                            
                            // 计算标签位置，考虑缩放和多条连接线的偏移
                            const labelFromPos = getPointOnLine(fromPos, toPos, 0.15);
                            const labelToPos = getPointOnLine(fromPos, toPos, 0.85);
                            
                            // 根据缩放计算标签尺寸
                            const scaledLabelWidth = Math.max(20, 28 / canvasScale);
                            const scaledLabelHeight = Math.max(16, 22 / canvasScale);
                            const scaledFontSize = Math.max(8, 11 / canvasScale);
                            const scaledBorderWidth = Math.max(0.5, 1 / canvasScale);
                            
                            // 为多条连接线的标签添加额外偏移以避免重叠
                            const labelOffset = group.length > 1 ? {
                                from: {
                                    x: fromOffset.x * 0.3,
                                    y: fromOffset.y * 0.3
                                },
                                to: {
                                    x: toOffset.x * 0.3,
                                    y: toOffset.y * 0.3
                                }
                            } : { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

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
                                            x={labelFromPos.x - scaledLabelWidth/2 + (conn.labelFromOffset?.x || 0) + labelOffset.from.x}
                                            y={labelFromPos.y - scaledLabelHeight/2 + (conn.labelFromOffset?.y || 0) + labelOffset.from.y}
                                            width={scaledLabelWidth} 
                                            height={scaledLabelHeight}
                                            className="connection-label cursor-move pointer-events-auto overflow-visible"
                                            onMouseDown={(e) => handleLabelMouseDown(e, conn.id, 'from')}
                                            onDoubleClick={(e) => { e.stopPropagation(); onPortLabelDoubleClick(conn.id, 'from'); }}
                                        >
                                            <div 
                                                title={fromPort?.name} 
                                                className="w-full h-full bg-white border border-slate-400 rounded-sm flex items-center justify-center text-black font-bold select-none shadow-sm"
                                                style={{ 
                                                    fontSize: `${scaledFontSize}px`,
                                                    borderWidth: `${scaledBorderWidth}px`,
                                                    minWidth: `${scaledLabelWidth}px`,
                                                    minHeight: `${scaledLabelHeight}px`
                                                }}
                                            > 
                                                {getPortNumber(fromPort?.name)} 
                                            </div>
                                        </foreignObject>
                                    )}
                                    
                                    {!isEditingTo && (
                                        <foreignObject
                                            x={labelToPos.x - scaledLabelWidth/2 + (conn.labelToOffset?.x || 0) + labelOffset.to.x}
                                            y={labelToPos.y - scaledLabelHeight/2 + (conn.labelToOffset?.y || 0) + labelOffset.to.y}
                                            width={scaledLabelWidth} 
                                            height={scaledLabelHeight}
                                            className="connection-label cursor-move pointer-events-auto overflow-visible"
                                            onMouseDown={(e) => handleLabelMouseDown(e, conn.id, 'to')}
                                            onDoubleClick={(e) => { e.stopPropagation(); onPortLabelDoubleClick(conn.id, 'to'); }}
                                        >
                                            <div 
                                                title={toPort?.name} 
                                                className="w-full h-full bg-white border border-slate-400 rounded-sm flex items-center justify-center text-black font-bold select-none shadow-sm"
                                                style={{ 
                                                    fontSize: `${scaledFontSize}px`,
                                                    borderWidth: `${scaledBorderWidth}px`,
                                                    minWidth: `${scaledLabelWidth}px`,
                                                    minHeight: `${scaledLabelHeight}px`
                                                }}
                                            > 
                                                {getPortNumber(toPort?.name)} 
                                            </div>
                                        </foreignObject>
                                    )}

                                    {(isEditingFrom || isEditingTo) && (
                                        <foreignObject
                                            x={(isEditingFrom ? labelFromPos.x : labelToPos.x) - (scaledLabelWidth * 1.8)/2 + (isEditingFrom ? (conn.labelFromOffset?.x || 0) + labelOffset.from.x : (conn.labelToOffset?.x || 0) + labelOffset.to.x)}
                                            y={(isEditingFrom ? labelFromPos.y : labelToPos.y) - (scaledLabelHeight * 1.2)/2 + (isEditingFrom ? (conn.labelFromOffset?.y || 0) + labelOffset.from.y : (conn.labelToOffset?.y || 0) + labelOffset.to.y)}
                                            width={scaledLabelWidth * 1.8} 
                                            height={scaledLabelHeight * 1.2}
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
                                                    className="bg-slate-900 text-white text-center w-full h-full border border-blue-500 rounded-sm outline-none"
                                                    style={{ 
                                                        fontSize: `${scaledFontSize}px`,
                                                        borderWidth: `${scaledBorderWidth}px`
                                                    }}
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
                    />
                ))}
            </div>
        </div>
    );
});

export default Canvas;
