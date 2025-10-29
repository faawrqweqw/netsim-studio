import React, { useState, useRef, useLayoutEffect } from 'react';
import { Port } from '../types';

const groupPorts = (ports: Port[]): Record<string, Port[]> => {
  const groups: Record<string, Port[]> = {};
  if (!ports) return groups;
  ports.forEach((port, index) => {
    const groupIndex = Math.floor(index / 10);
    const start = groupIndex * 10 + 1;
    const end = Math.min(start + 9, ports.length);
    const groupName = `Interface ${start}~${end}`;
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(port);
  });
  return groups;
};

interface PortSelectionMenuProps {
  ports: Port[];
  position: { x: number; y: number };
  onSelectPort: (port: Port) => void;
  onClose: () => void;
}

// Subcomponent for each expandable group item to handle viewport-aware positioning
const PortGroupListItem: React.FC<{
  groupName: string;
  portList: Port[];
  onSelectPort: (port: Port) => void;
}> = ({ groupName, portList, onSelectPort }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({});
  const itemRef = useRef<HTMLLIElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isHovered && itemRef.current && submenuRef.current) {
      const itemRect = itemRef.current.getBoundingClientRect();
      const submenuHeight = submenuRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;

      let newTop = 0;
      
      // Check if submenu overflows the bottom of the viewport
      if (itemRect.top + submenuHeight > viewportHeight) {
        // Reposition it by aligning the bottom of the submenu with the bottom of the list item
        newTop = -(submenuHeight - itemRect.height);
      }
      
      // Additionally, ensure it doesn't overflow the top of the viewport
      if (itemRect.top + newTop < 0) {
        // Align the top of the submenu with the top of the viewport
        newTop = -itemRect.top;
      }

      setSubmenuStyle({ top: `${newTop}px` });
    }
  }, [isHovered]);

  return (
    <li
      ref={itemRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative px-3 py-1.5 hover:bg-slate-700 cursor-default flex justify-between items-center"
    >
      <span>{groupName}</span>
      <span className="text-slate-400 text-xs ml-4">▶</span>
      <div
        ref={submenuRef}
        className="absolute left-full ml-px bg-slate-800 border border-slate-600 rounded-md shadow-2xl w-64 z-10"
        style={{
          ...submenuStyle,
          display: isHovered ? 'block' : 'none',
        }}
      >
        <ul className="py-1">
          {portList.map(port => (
            <li
              key={port.id}
              onClick={(e) => {
                e.stopPropagation();
                if (port.status === 'available') {
                  onSelectPort(port);
                }
              }}
              className={`px-3 py-1.5 flex items-center gap-2 ${
                port.status === 'available' ? 'hover:bg-blue-600 cursor-pointer' : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${port.status === 'available' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="font-mono">{port.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
};


const PortSelectionMenu: React.FC<PortSelectionMenuProps> = ({ ports, position, onSelectPort, onClose }) => {
  const groupedPorts = groupPorts(ports);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute bg-slate-800 border border-slate-600 rounded-md shadow-2xl z-50 text-white text-sm"
      style={{ left: position.x, top: position.y }}
    >
      <ul className="py-1">
        {Object.entries(groupedPorts).map(([groupName, portList]) => (
          <PortGroupListItem
            key={groupName}
            groupName={groupName}
            portList={portList}
            onSelectPort={onSelectPort}
          />
        ))}
      </ul>
    </div>
  );
};

export default PortSelectionMenu;