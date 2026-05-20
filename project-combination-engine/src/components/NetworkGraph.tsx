/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { TalentNode, TalentLink } from '../types';
import { 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Info,
  ChevronUp,
  User,
  Zap,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NetworkGraph: React.FC = () => {
  const { 
    nodes: globalNodes, 
    links: globalLinks, 
    selectedNode, 
    setSelectedNode,
    theme 
  } = useNetwork();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 450 });
  
  // Simulation nodes state
  type SimNode = TalentNode & {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isDragging?: boolean;
    isFixed?: boolean;
  };
  
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Update canvas dimensions dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(320, width),
          height: Math.max(380, height || 450)
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Sync global nodes & links to simulation nodes, maintaining pre-existing coords
  useEffect(() => {
    const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
    
    setSimNodes((prevSimNodes) => {
      return globalNodes.map((gNode) => {
        const existing = prevSimNodes.find(p => p.id === gNode.id);
        
        // "Me" (현지훈) is locked at the center to act as the gravitational anchor
        const isCoreMe = gNode.id === '현지훈';
        
        if (existing) {
          return {
            ...gNode,
            x: isCoreMe ? center.x : existing.x,
            y: isCoreMe ? center.y : existing.y,
            vx: isCoreMe ? 0 : existing.vx,
            vy: isCoreMe ? 0 : existing.vy,
            isFixed: isCoreMe
          };
        } else {
          // New node entry: place near center with slight randomized radius
          const angle = Math.random() * Math.PI * 2;
          const radius = isCoreMe ? 0 : 120 + Math.random() * 50;
          return {
            ...gNode,
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            isFixed: isCoreMe
          };
        }
      });
    });
  }, [globalNodes, dimensions.width, dimensions.height]);

  // Main custom spring physics simulation loop (runs at 60 FPS while active)
  useEffect(() => {
    let animationId: number;
    const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
    
    const tick = () => {
      setSimNodes((currNodes) => {
        if (currNodes.length === 0) return currNodes;
        
        // Deep copy of simulation states to apply calculations
        const next = currNodes.map(n => ({ ...n }));
        
        // Resolve Edge/Connections (Hooke's Spring Law)
        globalLinks.forEach((link) => {
          const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          
          const sNode = next.find(n => n.id === sId);
          const tNode = next.find(n => n.id === tId);
          
          if (sNode && tNode) {
            const dx = tNode.x - sNode.x;
            const dy = tNode.y - sNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Resting distance is shorter/tighter for high-strength (intimate) relations
            const restDist = link.strength === 3 ? 140 : link.strength === 2 ? 185 : 240;
            // Shorter resting distance for "Me" to keep first circle tight
            const k = 0.012; // Spring stiffness
            const force = (dist - restDist) * k;
            
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (!sNode.isFixed && !sNode.isDragging) {
              sNode.vx += fx;
              sNode.vy += fy;
            }
            if (!tNode.isFixed && !tNode.isDragging) {
              tNode.vx -= fx;
              tNode.vy -= fy;
            }
          }
        });
        
        // Resolve Peer Repulsion (Coulomb Anti-Overlap Law - adjusted to avoid overlaps)
        for (let i = 0; i < next.length; i++) {
          const n1 = next[i];
          for (let j = i + 1; j < next.length; j++) {
            const n2 = next[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const minDist = 160; // larger spacing radius
            if (dist < minDist) {
              // Inverse distance repulsion
              const strength = 260; // stronger repulsion
              const repulse = (minDist - dist) / dist * strength * 0.09;
              const fx = (dx / dist) * repulse;
              const fy = (dy / dist) * repulse;
              
              if (!n1.isFixed && !n1.isDragging) {
                n1.vx -= fx;
                n1.vy -= fy;
              }
              if (!n2.isFixed && !n2.isDragging) {
                n2.vx += fx;
                n2.vy += fy;
              }
            }
          }
        }
        
        // Resolve Center Gravity Pull & boundaries
        next.forEach((n) => {
          if (n.isFixed) {
            // Keep central "Me" strictly locked at the current coordinates center
            n.x = center.x;
            n.y = center.y;
            n.vx = 0;
            n.vy = 0;
            return;
          }
          
          // Gentle center force to avoid rogue nodes drifting off-screen
          const g = 0.005;
          n.vx += (center.x - n.x) * g;
          n.vy += (center.y - n.y) * g;
          
          // Apply friction damping (0.84 helps nodes settle to a firm rest quickly)
          n.vx *= 0.84;
          n.vy *= 0.84;
          
          // Update locations
          if (!n.isDragging) {
            n.x += n.vx;
            n.y += n.vy;
          }
        });
        
        return next;
      });
      
      animationId = requestAnimationFrame(tick);
    };
    
    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [globalLinks, dimensions, draggedNodeId]);

  // Group colors map (Toss modern soft pastel tones)
  const getGroupStyles = (group: string) => {
    switch(group) {
      case 'Me':
        return {
          fill: '#3182F6', // Toss Blue
          text: '#3182F6',
          bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          border: 'border-blue-500',
          badge: 'bg-blue-500 text-white'
        };
      case 'Tech':
        return {
          fill: '#FF9500', // Toss Orange
          text: '#D87D00',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-500',
          badge: 'bg-amber-500 text-white'
        };
      case 'Design':
        return {
          fill: '#F43F5E', // Rose Pink
          text: '#E11D48',
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          border: 'border-rose-500',
          badge: 'bg-rose-500 text-white'
        };
      case 'Business':
        return {
          fill: '#10B981', // Emerald
          text: '#059669',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-500',
          badge: 'bg-emerald-500 text-white'
        };
      case 'Strategy':
        return {
          fill: '#8B5CF6', // Purple
          text: '#7C3AED',
          bg: 'bg-violet-50 dark:bg-violet-950/30',
          border: 'border-violet-500',
          badge: 'bg-violet-500 text-white'
        };
      default: // External / Other
        return {
          fill: '#6B7280', // Gray
          text: '#4B5563',
          bg: 'bg-slate-100 dark:bg-zinc-800',
          border: 'border-slate-500',
          badge: 'bg-slate-500 text-white'
        };
    }
  };

  // Node visual sizing based on coordination "Energy Cost": lower energy cost means higher accessibility & larger nodes!
  const getNodeRadius = (node: TalentNode) => {
    if (node.id === '현지훈') return 28; // Centered Core
    // Cost 1 -> radius 21, Cost 5 -> radius 16
    const base = 22;
    const diff = (5 - node.energyCost) * 1.5;
    return base + diff;
  };

  // Drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (nodeId === '현지훈') return; // Cannot drag centered core
    
    setDraggedNodeId(nodeId);
    setSimNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return { ...n, isDragging: true };
      }
      return n;
    }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      // Node Dragging
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Map screen coordinates relative to dynamic zoom level and offset
      const mouseX = (e.clientX - rect.left - panOffset.x) / zoom;
      const mouseY = (e.clientY - rect.top - panOffset.y) / zoom;
      
      setSimNodes(prev => prev.map(n => {
        if (n.id === draggedNodeId) {
          return { ...n, x: mouseX, y: mouseY, vx: 0, vy: 0 };
        }
        return n;
      }));
    } else if (isPanning) {
      // View Canvas Panning
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset({ x: dx, y: dy });
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      setSimNodes(prev => prev.map(n => {
        if (n.id === draggedNodeId) {
          return { ...n, isDragging: false };
        }
        return n;
      }));
      setDraggedNodeId(null);
    }
    setIsPanning(false);
  };

  // Canvas Panning Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If we click the empty canvas, start panning
    setIsPanning(true);
    panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const resetZoomAndPan = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div 
      className="relative flex flex-col w-full h-full rounded-[32px] overflow-hidden transition-all duration-300 shadow-sm p-4"
      style={{
        backgroundColor: theme === 'dark' ? '#18181b' : '#F0F2F5',
        border: theme === 'dark' ? '1px solid #27272a' : '1px solid #E5E8EB'
      }}
    >
      {/* 3. Main Live SVG Canvas Container - Rounded white card inside background */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        className={`w-full h-full flex-grow relative rounded-[24px] overflow-hidden shadow-xs border ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundColor: theme === 'dark' ? '#18181b' : '#FFFFFF',
          borderColor: theme === 'dark' ? '#27272a' : '#E5E8EB'
        }}
      >
        {/* 1. Controller Bar in Graph View */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-2xl shadow-xs pointer-events-auto border border-slate-100 dark:border-zinc-800">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300">
              {simNodes.length <= 1 
                ? "인재들을 등록하고 피어를 무한 연결하세요" 
                : "노드를 드래그하여 고정하거나 탐색하세요"}
            </span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <button 
              onClick={() => setZoom(z => Math.min(2.0, z + 0.15))}
              className="p-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 active:bg-slate-100 rounded-xl shadow-xs border border-slate-100 dark:border-zinc-800 text-slate-50 relative group transition-colors"
              title="확대"
            >
              <ZoomIn className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
            </button>
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
              className="p-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 active:bg-slate-100 rounded-xl shadow-xs border border-slate-100 dark:border-zinc-800 text-slate-50 relative group transition-colors"
              title="축소"
            >
              <ZoomOut className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
            </button>
            <button 
              onClick={resetZoomAndPan}
              className="p-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 active:bg-slate-100 rounded-xl shadow-xs border border-slate-100 dark:border-zinc-800 text-slate-50 relative group transition-colors"
              title="화면 맞춤"
            >
              <Maximize2 className="w-4 h-4 text-slate-600 dark:text-zinc-350" />
            </button>
          </div>
        </div>

        {/* 2. Group Legends indicator */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex flex-wrap gap-2 pointer-events-none max-w-[70%]">
          {['Me', 'Tech', 'Design', 'Business', 'Strategy'].map((grp) => {
            const style = getGroupStyles(grp);
            const count = simNodes.filter(n => n.group === grp).length;
            if (count === 0 && grp !== 'Me') return null; // hide irrelevant clusters
            
            return (
              <div 
                key={`legend-key-${grp}`}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md rounded-lg shadow-2xs border border-slate-50 dark:border-zinc-850"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.fill }}></div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                  {grp === 'Me' ? '나 (현지훈)' : grp}
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-300 dark:text-zinc-650">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        <svg 
          width={dimensions.width} 
          height={dimensions.height}
          className="w-full h-full overflow-hidden"
        >
          <defs>
            {/* Arrow Marker */}
            <marker
              id="arrow-head"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#D1D5DB" className="dark:fill-zinc-700" />
            </marker>

            {/* Glowing active node ring */}
            <filter id="active-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Me pulse wave linear gradients */}
            <radialGradient id="me-pulse-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3182F6" stopOpacity="0.25" />
              <stop offset="65%" stopColor="#3182F6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3182F6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            
            {/* 1. Core 'Me' Ambient Pulse Ripple Rings */}
            {simNodes.filter(n => n.id === '현지훈').map((me) => (
              <g key="me-rippler" className="pointer-events-none">
                <circle
                  cx={me.x}
                  cy={me.y}
                  r="58"
                  fill="url(#me-pulse-gradient)"
                  className="animate-pulse origin-center"
                  style={{ animationDuration: '3.5s' }}
                />
                <circle
                  cx={me.x}
                  cy={me.y}
                  r="42"
                  fill="none"
                  stroke="#3182F6"
                  strokeWidth="0.5"
                  strokeDasharray="2,3"
                  className="opacity-45 animate-spin origin-center"
                  style={{ animationDuration: '28s' }}
                />
              </g>
            ))}

            {/* 2. Draw Connection Lines (Edges) - Removed text labels completely to avoid clutter */}
            {globalLinks.map((link, idx) => {
              const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
              const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
              
              const sNode = simNodes.find(n => n.id === sId);
              const tNode = simNodes.find(n => n.id === tId);

              if (!sNode || !tNode) return null;
              
              return (
                <g key={`edge-${idx}-${sId}-${tId}`}>
                  <line
                    x1={sNode.x}
                    y1={sNode.y}
                    x2={tNode.x}
                    y2={tNode.y}
                    stroke={theme === 'dark' ? '#4B5563' : '#BDC4C9'}
                    className="transition-all duration-300 opacity-90"
                    strokeWidth={link.strength === 3 ? "2.5" : link.strength === 2 ? "1.5" : "1"}
                    strokeDasharray={link.strength === 1 ? "4,4" : "none"}
                  />
                </g>
              );
            })}

            {/* 3. Draw Talent Nodes */}
            {simNodes.map((node) => {
              const r = getNodeRadius(node);
              const style = getGroupStyles(node.group);
              const isSelected = selectedNode && selectedNode.id === node.id;
              
              return (
                <g 
                  key={`node-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-transform duration-100 ease-out"
                >
                  {/* Anchor Highlight Border if selected */}
                  {isSelected && (
                    <circle
                      r={r + 6}
                      fill="none"
                      stroke={style.fill}
                      strokeWidth="2.5"
                      strokeDasharray="4,2"
                      className="animate-spin origin-center opacity-70"
                      style={{ animationDuration: '6s' }}
                      filter="url(#active-glow)"
                    />
                  )}

                  {/* Core Interactive Node circle */}
                  <circle
                    r={r}
                    fill={theme === 'dark' ? '#27272a' : '#FFFFFF'}
                    className="stroke-slate-100/80 dark:stroke-zinc-800 transition-colors duration-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
                    strokeWidth={isSelected ? "3" : "2"}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Open bottom sheet
                      setSelectedNode(node);
                    }}
                    style={{
                      cursor: node.id === '현지훈' ? 'pointer' : (node.isDragging ? 'grabbing' : 'grab')
                    }}
                  />

                  {/* Inner Group Indicator Ring */}
                  <circle
                    r={r - 4.5}
                    fill="none"
                    stroke={style.fill}
                    strokeWidth="3.5"
                    className="opacity-90 pointer-events-none"
                  />

                  {/* Visual Node Label Text */}
                  <text
                    y="4"
                    textAnchor="middle"
                    fill={theme === 'dark' ? '#f4f4f5' : '#000000'}
                    className="text-[11px] font-bold select-none pointer-events-none"
                  >
                    {node.id}
                  </text>

                  {/* Tiny accessibility badge indicating energy cost level */}
                  {node.id !== '현지훈' && (
                    <g transform={`translate(${r - 3}, ${-r + 3})`} className="pointer-events-none">
                      <circle
                        r="6.5"
                        fill={node.energyCost >= 4 ? '#EF4444' : node.energyCost >= 3 ? '#EAB308' : '#10B981'}
                        className="stroke-white dark:stroke-zinc-900"
                        strokeWidth="1.5"
                      />
                      <text
                        textAnchor="middle"
                        y="2.5"
                        className="text-[7px] font-mono font-black fill-white select-none"
                      >
                        {node.energyCost}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* 4. Overlay Empty Graph State Hint (when only '현지훈' is present) */}
        {simNodes.length <= 1 && (
          <div className="absolute inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-3xs flex items-center justify-center p-6 text-center pointer-events-none">
            <div className="max-w-xs bg-white/95 dark:bg-zinc-800/95 p-4 rounded-3xl shadow-lg border border-slate-50 dark:border-zinc-850 transform translate-y-16 pointer-events-auto">
              <Zap className="w-5 h-5 text-blue-500 mx-auto mb-2 animate-bounce" />
              <h5 className="text-[12px] font-bold text-slate-800 dark:text-zinc-200">
                1인 네트워크 상태예요
              </h5>
              <p className="text-[11px] text-slate-400 dark:text-zinc-400 mt-1 leading-relaxed">
                우측 하단의 <span className="font-semibold text-blue-500 font-mono">+</span> 버튼을 눌러 피어를 추가하고 '현지훈'님과의 기여/협업 관계망을 입체화해보세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
