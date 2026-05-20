/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TalentNode } from '../types';
import { useNetwork } from '../context/NetworkContext';
import { ChevronRight, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PersonCardProps {
  node: TalentNode;
  getGroupBadgeColor: (group: string) => string;
}

export const PersonCard: React.FC<PersonCardProps> = ({ node, getGroupBadgeColor }) => {
  const { links, setSelectedNode, nodes } = useNetwork();
  const [isConnectionsExpanded, setIsConnectionsExpanded] = useState(false);

  // Connection count check
  const hasLinksCount = links.filter(l => {
    const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
    const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
    return s === node.id || t === node.id;
  }).length;

  // Find unique connections
  const connectedPeople = links
    .map(l => {
      const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
      if (s === node.id) return t;
      if (t === node.id) return s;
      return null;
    })
    .filter((id): id is string => id !== null && id !== node.id);

  const uniqueConnected = Array.from(new Set(connectedPeople));
  const visibleConnections = isConnectionsExpanded ? uniqueConnected : uniqueConnected.slice(0, 3);
  const shadowCount = uniqueConnected.length - 3;

  return (
    <div
      onClick={() => setSelectedNode(node)}
      className="group relative bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-toss-border dark:border-zinc-800/80 hover:border-toss-blue dark:hover:border-toss-blue hover:scale-[1.01] toss-shadow active:scale-[0.99] cursor-pointer flex flex-col justify-between transition-all duration-300 overflow-hidden"
    >
      {/* Colored Accent Strip */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 opacity-85"
        style={{ 
          backgroundColor: 
            node.group === 'Me' ? '#3182F6' : 
            node.group === 'Tech' ? '#FF9500' :
            node.group === 'Design' ? '#F43F5E' :
            node.group === 'Business' ? '#10B981' :
            node.group === 'Strategy' ? '#8B5CF6' : '#6B7280'
        }}
      />

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${getGroupBadgeColor(node.group)}`}>
            {node.group === 'Me' ? '나 (Me)' : node.group}
          </span>
          
          <span className="text-xs font-semibold text-toss-muted dark:text-zinc-500">
            연결 {hasLinksCount}개
          </span>
        </div>

        <h3 className="text-lg font-bold text-toss-text dark:text-zinc-100 group-hover:text-toss-blue transition-colors">
          {node.id}
        </h3>

        <p className="text-sm text-[#4E5968] dark:text-zinc-400 mt-2.5 leading-relaxed line-clamp-2 pr-2">
          {node.fact || '설정된 등록 사실 정보가 없습니다.'}
        </p>
      </div>

      <div>
        {/* Tags row & Detail indicator */}
        <div className="flex items-center justify-between border-t border-toss-border dark:border-zinc-800/60 pt-4">
          <div className="flex flex-wrap gap-1.5 max-w-[80%]">
            {node.fields.slice(0, 3).map((f) => (
              <span key={f} className="text-xs font-semibold px-2.5 py-1 bg-toss-bg dark:bg-zinc-800 text-toss-sub-text dark:text-zinc-400 rounded-lg">
                #{f}
              </span>
            ))}
            {node.fields.length > 3 && (
              <span className="text-xs text-toss-muted dark:text-zinc-500 font-bold">
                +{node.fields.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 text-toss-blue group-hover:translate-x-1.5 transition-transform duration-300">
            <span className="text-xs font-bold">분석</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Feature 1: Connection chips */}
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
          <div className="flex justify-between items-center select-none" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-toss-blue" />
              연결고리 ({uniqueConnected.length})
            </span>

            {uniqueConnected.length > 3 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConnectionsExpanded(!isConnectionsExpanded);
                }}
                className="text-[11px] font-bold text-toss-blue/80 dark:text-toss-blue/90 hover:text-toss-blue transition-colors cursor-pointer"
              >
                {isConnectionsExpanded ? "접기" : `+${shadowCount}명 더보기`}
              </button>
            )}
          </div>

          {uniqueConnected.length === 0 ? (
            <span className="text-2xs text-slate-350 dark:text-zinc-650 italic mt-1 pb-1">연결된 동료가 아직 없습니다</span>
          ) : (
            <motion.div 
              layout
              className="flex flex-wrap gap-1.5 mt-1.5"
            >
              <AnimatePresence initial={false}>
                {visibleConnections.map((name) => (
                  <motion.div
                    key={`conn-${name}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-805 text-slate-600 dark:text-zinc-300 border border-slate-100 dark:border-zinc-750 p-2.5 py-1.5 rounded-full text-xs font-semibold hover:border-toss-blue/30 dark:hover:border-toss-blue/30 transition-all cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetNode = nodes.find(n => n.id === name);
                      if (targetNode) {
                        setSelectedNode(targetNode);
                      }
                    }}
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-200 dark:bg-zinc-750 text-slate-600 dark:text-zinc-300 text-[10px] font-extrabold flex items-center justify-center">
                      {name[0]}
                    </span>
                    <span className="font-bold">{name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
