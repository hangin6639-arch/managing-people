/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TalentNode, TalentLink } from '../types';

interface RadarChartProps {
  node: TalentNode;
  links: TalentLink[];
}

export const RadarChart: React.FC<RadarChartProps> = ({ node, links }) => {
  // Count connections
  const connectionCount = links.filter(l => {
    const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
    return s === node.id || t === node.id;
  }).length;

  // Let's deterministically compute 5 metrics (1 to 5 scale) from the node's properties
  // 1. 전문 분야 다양성 (Expertise field breadth)
  const expertise = Math.min(5, Math.max(1, node.fields.length));
  
  // 2. 관계 밀집성 (Synergy / connection count)
  const synergy = Math.min(5, Math.max(1, 1 + connectionCount));
  
  // 3. 실행 밀도 (Execution - determined by length of Fact section)
  const execution = Math.min(5, Math.max(1.5, Math.min(5, Math.ceil((node.fact || '').length / 35))));
  
  // 4. 전략적 정합 (Strategic Fit depth - determined by strategicFit section)
  const strategicFitNum = Math.min(5, Math.max(1.5, Math.min(5, Math.ceil((node.strategicFit || '').length / 40))));
  
  // 5. 비용 효율성 (Energy Cost efficiency: 6 - energyCost, so cost 1 -> value 5, cost 5 -> value 1)
  const efficiency = Math.max(1, Math.min(5, 6 - node.energyCost));

  // Radar Axes configuration
  const axes = [
    { name: '전문성 (Expertise)', value: expertise },
    { name: '시너지 (Synergy)', value: synergy },
    { name: '실행력 (Execution)', value: execution },
    { name: '전략 부합 (Strategic Fit)', value: strategicFitNum },
    { name: '에너지 효율 (Efficiency)', value: efficiency }
  ];

  const size = 260;
  const center = size / 2;
  const maxRadius = 75;
  const totalSides = axes.length;

  // Calculate coordinates for value points and background grids
  const getCoordinates = (index: number, val: number, maxVal = 5) => {
    const angle = (index * 2 * Math.PI) / totalSides - Math.PI / 2; // Start from top
    const r = (val / maxVal) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate grid levels (1: 20%, 2: 40%, 3: 60%, 4: 80%, 5: 100%)
  const gridLevels = [1, 2, 3, 4, 5];

  // Build the polygon path for the actual talent scores
  const scorePoints = axes.map((axis, i) => getCoordinates(i, axis.value));
  const scorePath = scorePoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900 rounded-3xl transition-colors duration-300">
      <div className="w-full text-center mb-1">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
          역량 균형 시뮬레이션
        </h4>
        <p className="text-2xs text-slate-400 dark:text-zinc-500">
          이력 깊이, 연결 강도 및 에너지 효율 반영
        </p>
      </div>

      <div className="relative w-[260px] h-[260px]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            {/* Glossy blue glow filter */}
            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Radar fill gradient */}
            <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3182F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00c6ff" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. Background Grid Concentric Pentagons */}
          {gridLevels.map((lvl) => {
            const gridPts = axes.map((_, i) => getCoordinates(i, lvl));
            const gridPath = gridPts.map(p => `${p.x},${p.y}`).join(' ');
            return (
              <polygon
                key={`grid-${lvl}`}
                points={gridPath}
                fill="none"
                className="stroke-slate-200 dark:stroke-zinc-800"
                strokeWidth="0.75"
                strokeDasharray={lvl < 5 ? "1,2" : "none"}
              />
            );
          })}

          {/* 2. Grid Concentric Level labels (1 to 5) in light gray */}
          {gridLevels.map((lvl) => {
            const pt = getCoordinates(0, lvl); // label along the top axis
            return (
              <text
                key={`grid-lbl-${lvl}`}
                x={pt.x + 4}
                y={pt.y + 3}
                className="text-[9px] fill-slate-300 dark:fill-zinc-600 font-mono"
              >
                {lvl}
              </text>
            );
          })}

          {/* 3. Radial axes lines from center */}
          {axes.map((_, i) => {
            const endPt = getCoordinates(i, 5);
            return (
              <line
                key={`axis-line-${i}`}
                x1={center}
                y1={center}
                x2={endPt.x}
                y2={endPt.y}
                className="stroke-slate-200 dark:stroke-zinc-800"
                strokeWidth="1"
              />
            );
          })}

          {/* 4. Filled Value Polygon with Glow and Premium Stroke */}
          <polygon
            points={scorePath}
            fill="url(#radar-gradient)"
            stroke="#3182F6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#radar-glow)"
            className="transition-all duration-500 ease-out"
          />

          {/* 5. Draw interactive dots on value vertices */}
          {scorePoints.map((pt, i) => (
            <g key={`val-dot-${i}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#FFFFFF"
                className="stroke-toss-blue filter drop-shadow-sm cursor-help"
                stroke="#3182F6"
                strokeWidth="2"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="2"
                fill="#3182F6"
              />
            </g>
          ))}

          {/* 6. Dynamic Typography Text Anchor Labels */}
          {axes.map((axis, i) => {
            const labelPt = getCoordinates(i, 5.8); // push outward slightly
            let textAnchor = 'middle';
            let dy = '0.35em';
            
            // Adjust alignments depending on node angle positions
            const cosVal = Math.cos((i * 2 * Math.PI) / totalSides - Math.PI / 2);
            if (cosVal > 0.1) textAnchor = 'start';
            else if (cosVal < -0.1) textAnchor = 'end';
            
            const sinVal = Math.sin((i * 2 * Math.PI) / totalSides - Math.PI / 2);
            if (sinVal > 0.8) dy = '0.85em';
            if (sinVal < -0.8) dy = '-0.3em';

            return (
              <g key={`label-${i}`} className="cursor-default">
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  dy={dy}
                  textAnchor={textAnchor}
                  className="text-[10px] font-semibold fill-slate-700 dark:fill-zinc-300 transition-colors duration-300"
                >
                  {axis.name.split(' ')[0]}
                </text>
                <text
                  x={labelPt.x}
                  y={labelPt.y + 11}
                  dy={dy}
                  textAnchor={textAnchor}
                  className="text-[9px] font-mono font-medium fill-indigo-500 dark:fill-sky-400"
                >
                  Lv.{axis.value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full max-w-[210px] bg-white dark:bg-zinc-800 p-2.5 rounded-2xl shadow-2xs mt-1">
        {axes.map((axis, idx) => (
          <div key={`legend-${idx}`} className="flex items-center justify-between text-3xs font-medium text-slate-500 dark:text-zinc-400">
            <span>{axis.name.split(' ')[0]}</span>
            <span className="font-mono text-slate-800 dark:text-zinc-200">★ {axis.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
