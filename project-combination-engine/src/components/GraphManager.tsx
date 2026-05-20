/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Settings2,
  FolderLock,
  Globe,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const GraphManager: React.FC = () => {
  const { 
    graphs, 
    activeGraphId, 
    setActiveGraphId, 
    addGraph, 
    deleteGraph, 
    updateGraphName 
  } = useNetwork();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');

  // Editing state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGraphId, setEditGraphId] = useState('');
  const [editGraphName, setEditGraphName] = useState('');

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeGraph = graphs.find(g => g.id === activeGraphId) || graphs[0] || { id: '', name: '기본 네트워크', nodes: [], links: [] };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGraphName.trim()) return;

    // Check duplicate name
    if (graphs.some(g => g.name.trim() === newGraphName.trim())) {
      alert('이미 존재하는 네트워크 이름입니다.');
      return;
    }

    const newId = addGraph(newGraphName.trim());
    setNewGraphName('');
    setShowCreateModal(false);
    setIsOpen(false);
  };

  const handleEditGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGraphName.trim()) return;

    if (graphs.some(g => g.id !== editGraphId && g.name.trim() === editGraphName.trim())) {
      alert('이미 존재하는 네트워크 이름입니다.');
      return;
    }

    updateGraphName(editGraphId, editGraphName.trim());
    setShowEditModal(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetId) return;
    deleteGraph(deleteTargetId);
    setShowDeleteModal(false);
    setIsOpen(false);
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2.5 bg-toss-bg hover:bg-[#E5E8EB]/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-toss-border dark:border-zinc-800 rounded-2xl cursor-pointer text-xs font-bold transition-all text-toss-text dark:text-zinc-150 shadow-2xs group"
      >
        <Network className="w-4 h-4 text-toss-blue transition-transform group-hover:scale-110" />
        <span className="max-w-[120px] truncate">
          활성 네트워크: <strong className="text-toss-blue font-extrabold">{activeGraph.name}</strong>
        </span>
        <span className="text-[10px] text-toss-muted dark:text-zinc-550 border-l border-toss-border dark:border-zinc-800 pl-2">
          {activeGraph.nodes.length}명
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-toss-blue transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2.5 w-76 bg-white dark:bg-zinc-900 border border-toss-border dark:border-zinc-800 rounded-[28px] shadow-2xl z-50 overflow-hidden p-3"
          >
            <div className="px-3.5 py-2 border-b border-toss-border dark:border-zinc-800 mb-1 select-none flex justify-between items-center text-toss-sub-text dark:text-zinc-400">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">나의 인적 네트워크 목록</span>
              <Settings2 className="w-3.5 h-3.5 text-slate-350" />
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-1 py-1 scrollbar-thin">
              {graphs.map((g) => {
                const isActive = g.id === activeGraphId;
                return (
                  <div
                    key={g.id}
                    className={`group/item flex items-center justify-between p-2.5 py-2.5 rounded-2xl transition-all ${
                      isActive 
                        ? 'bg-toss-blue/5 text-toss-blue dark:bg-toss-blue/10' 
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-toss-text dark:text-zinc-200'
                    }`}
                  >
                    {/* Item Text Trigger Switch */}
                    <div 
                      onClick={() => {
                        setActiveGraphId(g.id);
                        setIsOpen(false);
                      }}
                      className="flex-1 min-w-0 pr-2 cursor-pointer flex items-center gap-2"
                    >
                      {isActive ? (
                        <Check className="w-3.5 h-3.5 text-toss-blue flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      
                      <div className="truncate leading-tight">
                        <span className={`text-[12.5px] font-bold block truncate ${isActive ? 'text-toss-blue' : ''}`}>
                          {g.name}
                        </span>
                        <span className="text-[10px] text-toss-muted dark:text-zinc-500 font-semibold">
                          인원 {g.nodes.length}명 · 연결망 {g.links.length}개
                        </span>
                      </div>
                    </div>

                    {/* Inline Control Actions Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity">
                      {/* Edit graph button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditGraphId(g.id);
                          setEditGraphName(g.name);
                          setShowEditModal(true);
                        }}
                        className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-toss-blue hover:bg-slate-100 dark:hover:bg-zinc-750 transition-colors cursor-pointer"
                        title="이름 수정"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      {/* Delete graph button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(g.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                        title="네트워크 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Graph Row */}
            <div className="mt-1 border-t border-toss-border dark:border-zinc-800 pt-2 pb-1">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-toss-blue text-white hover:bg-blue-600 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>새 네트워크 만들기</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] border border-toss-border dark:border-zinc-800 max-w-sm w-full p-6 shadow-2xl relative"
            >
              <h3 className="text-base font-extrabold text-toss-text dark:text-zinc-100 mb-2">
                새 인적 네트워크 생성
              </h3>
              <p className="text-xs text-toss-sub-text dark:text-zinc-400 leading-relaxed mb-4">
                새 프로젝트 팀, 동아리, 연구실 등 구분하여 관리할 그룹명을 입력하세요. 고유 인재 구성 풀이 새롭게 할당됩니다.
              </p>

              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-400 block mb-1.5 uppercase font-sans">
                    네트워크 이름
                  </label>
                  <input
                    type="text"
                    required
                    value={newGraphName}
                    onChange={(e) => setNewGraphName(e.target.value)}
                    placeholder="예: 해커톤 준비 모임, 컴공 동창회, 연구실"
                    className="w-full bg-toss-bg dark:bg-zinc-800 border border-toss-border dark:border-zinc-750 px-4 py-3 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-toss-blue/35 text-slate-800 dark:text-zinc-200"
                    maxLength={24}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewGraphName('');
                    }}
                    className="px-4.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2.5 bg-toss-blue hover:bg-blue-600 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-toss-blue/20"
                  >
                    새 네트워크 생성
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT GROUP MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] border border-toss-border dark:border-zinc-800 max-w-sm w-full p-6 shadow-2xl relative"
            >
              <h3 className="text-base font-extrabold text-toss-text dark:text-zinc-100 mb-2">
                네트워크 이름 수정
              </h3>
              <p className="text-xs text-toss-sub-text dark:text-zinc-400 leading-relaxed mb-4">
                선택한 네트워크 이름의 한글명 또는 영문명을 수정합니다.
              </p>

              <form onSubmit={handleEditGroupSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black tracking-wider text-slate-400 block mb-1.5 uppercase font-sans">
                    변경할 이름
                  </label>
                  <input
                    type="text"
                    required
                    value={editGraphName}
                    onChange={(e) => setEditGraphName(e.target.value)}
                    placeholder="예: 해커톤 준비 모임"
                    className="w-full bg-toss-bg dark:bg-zinc-800 border border-toss-border dark:border-zinc-750 px-4 py-3 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-toss-blue/35 text-slate-800 dark:text-zinc-200"
                    maxLength={24}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditGraphName('');
                      setEditGraphId('');
                    }}
                    className="px-4.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4.5 py-2.5 bg-toss-blue hover:bg-blue-600 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-toss-blue/20"
                  >
                    수정 완료
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] border border-toss-border dark:border-zinc-800 max-w-sm w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-rose-500 mb-3">
                <Trash2 className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-base font-extrabold text-toss-text dark:text-zinc-100">
                  네트워크 전면 삭제 경고
                </h3>
              </div>

              <p className="text-xs text-[#4E5968] dark:text-zinc-400 leading-relaxed font-semibold mb-6">
                해당 네트워크를 삭제하면 그 안에 속해 있던 **모든 인물(동료) 목록과 관계 연결선 데이터가 완전히 영구 제거**됩니다.
                <br /><br />
                이 처리는 복구될 수 없습니다. 정말로 삭제 프로세스를 수행할까요?
              </p>

              <div className="flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTargetId('');
                  }}
                  className="px-4.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4.5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-500/25"
                >
                  위험 인지함, 삭제 진행
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
