/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NetworkProvider, useNetwork } from './context/NetworkContext';
import { PeopleDirectory } from './components/PeopleDirectory';
import { NetworkGraph } from './components/NetworkGraph';
import { DataStudio } from './components/DataStudio';
import { AddNodeModal } from './components/AddNodeModal';
import { BottomSheet } from './components/BottomSheet';
import { GraphManager } from './components/GraphManager';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { AccountModal } from './components/AccountModal';
import { 
  Users, 
  Share2, 
  Database, 
  Sun, 
  Moon, 
  Zap, 
  Sparkles,
  Layers
} from 'lucide-react';

function MainAppShell() {
  const { 
    activeTab, 
    setActiveTab, 
    theme, 
    toggleTheme, 
    nodes, 
    links,
    planError,
    clearPlanError
  } = useNetwork();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-toss-bg text-toss-text dark:bg-zinc-950 dark:text-zinc-200 font-sans antialiased transition-colors duration-300 flex flex-col pb-20 sm:pb-0">
      
      {/* 1. Toss Style Premium Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#1A1A1C]/85 backdrop-blur-md border-b border-toss-border dark:border-zinc-800/80 px-8 py-4 flex items-center justify-between transition-colors duration-300">
        
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 bg-toss-blue rounded-lg flex items-center justify-center text-white shadow-xs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md sm:text-lg font-bold tracking-tight text-toss-text dark:text-zinc-100">
                Project Combination Engine
              </h1>
              <span className="bg-toss-bg dark:bg-indigo-950 px-1.5 py-0.5 rounded-sm text-[8px] font-mono font-black text-toss-blue uppercase tracking-widest leading-none">
                HR Core
              </span>
            </div>
            <p className="text-[10px] text-[#4E5968] dark:text-zinc-500 font-semibold mt-0.5">
              전략적 인적자원 네트워크 분석
            </p>
          </div>
        </div>

        {/* Right-side account controls */}
        <div className="flex items-center gap-5">
          
          {/* Active Network Selector Dropdown */}
          <GraphManager />

          {/* Active Counters Indicator Grid */}
          <div className="hidden md:flex items-center gap-3 bg-toss-bg dark:bg-zinc-850 px-3 py-1.5 rounded-xl border border-toss-border dark:border-zinc-800 text-[11px] font-bold text-toss-sub-text dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-toss-blue rounded-full animate-pulse"></span>
              <span>인물 <strong className="text-toss-text dark:text-zinc-200 font-mono font-bold">{nodes.length}</strong>명</span>
            </div>
            <div className="h-2.5 w-px bg-[#E5E8EB] dark:bg-zinc-700"></div>
            <div>
              <span>연결망 <strong className="text-toss-text dark:text-zinc-200 font-mono font-bold">{links.length}</strong>개</span>
            </div>
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-xl text-toss-sub-text dark:text-zinc-400 cursor-pointer transition-colors"
            title={theme === 'light' ? '다크 모드' : '라이트 모드'}
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>

          {/* Signed-in profile */}
          <button onClick={() => setIsAccountOpen(true)} className="flex items-center gap-3.5 border-l border-toss-border dark:border-zinc-800 pl-4.5 cursor-pointer text-left">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-toss-blue font-bold uppercase tracking-wider">{user?.plan || 'free'}</span>
              <span className="text-xs font-bold text-toss-text dark:text-zinc-200">{user?.name}님</span>
            </div>
            <div className="w-9 h-9 bg-toss-blue text-white rounded-full border border-white dark:border-zinc-800 shadow-sm flex items-center justify-center font-bold text-xs">
              {user?.name?.slice(0, 1) || '나'}
            </div>
          </button>
        </div>
      </header>

      {/* 2. Toss Floating Segmented Tab Switcher Panel */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-6 mb-2">
        <div className="flex items-center bg-[#E5E8EB]/70 dark:bg-zinc-900 border-none p-1 rounded-2xl max-w-md toss-shadow transition-colors duration-300">
          
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-white dark:bg-zinc-800 text-toss-blue shadow-sm'
                : 'text-toss-sub-text dark:text-zinc-550 hover:text-toss-text dark:hover:text-zinc-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>인재 풀</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'network'
                ? 'bg-white dark:bg-zinc-800 text-toss-blue shadow-sm'
                : 'text-toss-sub-text dark:text-zinc-550 hover:text-toss-text dark:hover:text-zinc-300'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>네트워크 맵</span>
          </button>

          <button
            onClick={() => setActiveTab('import-export')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'import-export'
                ? 'bg-white dark:bg-zinc-800 text-toss-blue shadow-sm'
                : 'text-toss-sub-text dark:text-zinc-550 hover:text-toss-text dark:hover:text-zinc-300'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>데이터 스튜디오</span>
          </button>

        </div>
      </div>

      {/* 3. Main Workspace Segment wrapper */}
      <main className="flex-grow px-6 py-4 w-full h-[calc(100vh-180px)] overflow-y-auto">
        {activeTab === 'directory' && (
          <PeopleDirectory onOpenAddModal={() => setIsAddModalOpen(true)} />
        )}
        {activeTab === 'network' && (
          <div className="w-full h-[580px]">
            <NetworkGraph />
          </div>
        )}
        {activeTab === 'import-export' && (
          <DataStudio />
        )}
      </main>

      {/* Modals & Overlay Layers */}
      <AddNodeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <BottomSheet />
      <AccountModal open={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      {planError && <div className="fixed inset-x-4 bottom-6 z-[90] mx-auto max-w-md bg-zinc-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4"><p className="text-xs font-semibold leading-relaxed">{planError}</p><button onClick={() => { clearPlanError(); setIsAccountOpen(true); }} className="shrink-0 px-3 py-2 bg-toss-blue rounded-xl text-xs font-bold cursor-pointer">요금제 보기</button></div>}
      
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-toss-bg dark:bg-zinc-950 flex items-center justify-center text-sm font-bold text-toss-muted">안전한 저장소를 여는 중...</div>;
  if (!user) return <AuthScreen />;
  return <NetworkProvider><MainAppShell /></NetworkProvider>;
}
