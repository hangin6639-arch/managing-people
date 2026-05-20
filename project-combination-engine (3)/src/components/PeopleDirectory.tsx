/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { TalentNode } from '../types';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Zap, 
  ChevronRight, 
  Tag, 
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { parseMarkdownToTalent, getMarkdownTemplate } from '../utils/parser';
import { PersonCard } from './PersonCard';

interface PeopleDirectoryProps {
  onOpenAddModal: () => void;
}

export const PeopleDirectory: React.FC<PeopleDirectoryProps> = ({ onOpenAddModal }) => {
  const { nodes, links, setSelectedNode, addNode } = useNetwork();
  
  const [search, setSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');

  // Filter out core "현지훈" from standard empty state triggers if user expects other people.
  // We'll show "현지훈 (나)" always in the list, but if he is the ONLY ONE, we show a gorgeous starter helper.
  const externalNodes = nodes.filter(n => n.id !== '현지훈');

  const handleImportSample = () => {
    // Generate template
    const template = getMarkdownTemplate(['현지훈']);
    const parsed = parseMarkdownToTalent(template);
    if (parsed.node.id) {
      addNode(parsed.node as TalentNode, parsed.connection);
    }
  };

  // Filter strategy
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.id.includes(search) || 
      node.fields.some(f => f.includes(search)) || 
      (node.fact || '').includes(search);
      
    const matchesGroup = selectedGroupFilter === 'All' || node.group === selectedGroupFilter;
    
    return matchesSearch && matchesGroup;
  });

  // Group style badges
  const getGroupBadgeColor = (group: string) => {
    switch(group) {
      case 'Me': return 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400';
      case 'Tech': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
      case 'Design': return 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400';
      case 'Business': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'Strategy': return 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full relative">
      
      {/* Search and Filters Header Menu */}
      <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 mb-6 toss-shadow border border-toss-border dark:border-zinc-800 transition-all duration-300">
        <div className="relative w-full">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-toss-muted dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 스킬 또는 연관 키워드를 검색해보세요"
            className="w-full bg-toss-bg dark:bg-zinc-850 rounded-2xl pl-11 pr-4 py-3 text-[13px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-toss-blue/20 text-toss-text dark:text-zinc-200 transition-all cursor-text placeholder-toss-muted"
          />
        </div>

        {/* Group Pill Sliders */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {['All', 'Me', 'Tech', 'Design', 'Business', 'Strategy', 'External'].map((group) => {
            const isSelected = selectedGroupFilter === group;
            const count = group === 'All' ? nodes.length : nodes.filter(n => n.group === group).length;
            
            return (
              <button
                key={`filter-${group}`}
                onClick={() => setSelectedGroupFilter(group)}
                className={`text-[12px] font-bold px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-toss-blue text-white shadow-lg shadow-toss-blue/15' 
                    : 'bg-toss-bg dark:bg-zinc-805 text-toss-sub-text dark:text-zinc-400 hover:bg-[#E5E8EB] dark:hover:bg-zinc-700/80'
                }`}
              >
                {group === 'All' ? '전체' : group === 'Me' ? '나 (Me)' : group}
                <span className={`text-[10px] font-mono font-bold ml-1.5 ${isSelected ? 'text-white/80' : 'text-slate-300 dark:text-zinc-650'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Directory Area */}
      {nodes.length <= 1 ? (
        
        // ------------------ EMPTY STATE (Toss Style) ------------------
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-white dark:bg-zinc-900 rounded-[32px] border border-toss-border dark:border-zinc-800/80 min-h-[380px] text-center toss-shadow transition-colors duration-300">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-toss-blue/20 dark:bg-toss-blue/10 rounded-full scale-135 blur-xl animate-pulse"></div>
            <div className="w-16 h-16 bg-[#F9FAFB] dark:bg-zinc-800 rounded-full flex items-center justify-center relative shadow-sm">
              <UserPlus className="w-8 h-8 text-toss-blue" />
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-toss-text dark:text-zinc-100 font-sans tracking-tight">
            아직 등록된 인물이 없어요
          </h3>
          <p className="text-sm text-toss-sub-text dark:text-zinc-400 max-w-sm mt-2 leading-relaxed">
            함께 프로젝트를 구성할<br />핵심 인재를 먼저 추가해보세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
            <button
              onClick={onOpenAddModal}
              className="px-6 py-3 bg-toss-blue text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-toss-blue/25 cursor-pointer"
            >
              인물 추가하기
            </button>

            <button
              onClick={handleImportSample}
              className="px-6 py-3 bg-toss-bg dark:bg-zinc-805 text-toss-blue rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer border border-toss-border dark:border-zinc-700"
            >
              디자인 가이드 샘플 추가
            </button>
          </div>
        </div>

      ) : (

        // ------------------ DIRECTORY LIST FEED ------------------
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNodes.map((node) => (
            <PersonCard
              key={`dir-node-${node.id}`}
              node={node}
              getGroupBadgeColor={getGroupBadgeColor}
            />
          ))}

          {filteredNodes.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-16 text-center text-toss-sub-text dark:text-zinc-500 font-semibold text-sm">
              검색 조건에 맞는 일치 인재가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) on bottom container corner */}
      <button
        onClick={onOpenAddModal}
        className="fixed bottom-10 right-10 w-16 h-16 bg-toss-blue text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 outline-none border-none cursor-pointer"
        title="새 인물 추가"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

    </div>
  );
};
