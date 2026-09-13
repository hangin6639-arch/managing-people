/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { RadarChart } from './RadarChart';
import { 
  X, 
  Trash2, 
  Mail, 
  Phone, 
  BrainCircuit, 
  CheckCircle, 
  Heart,
  Edit2,
  Check,
  Zap,
  HelpCircle,
  Settings,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BottomSheet: React.FC = () => {
  const { 
    selectedNode, 
    setSelectedNode, 
    updateNode, 
    deleteNode, 
    links,
    nodes,
    addLink,
    deleteLink,
    theme,
    coreNodeId
  } = useNetwork();

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingConnections, setIsEditingConnections] = useState(false);
  const [isConnectionsExpanded, setIsConnectionsExpanded] = useState(false);
  
  // Edited values state
  const [editedGroup, setEditedGroup] = useState('');
  const [editedFields, setEditedFields] = useState('');
  const [editedFact, setEditedFact] = useState('');
  const [editedInterpretation, setEditedInterpretation] = useState('');
  const [editedStrategicFit, setEditedStrategicFit] = useState('');
  const [editedEnergyCost, setEditedEnergyCost] = useState(3);
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');

  // Sync edits if selected node changes
  useEffect(() => {
    if (selectedNode) {
      setIsEditing(false);
      setEditedGroup(selectedNode.group);
      setEditedFields(selectedNode.fields.join(', '));
      setEditedFact(selectedNode.fact || '');
      setEditedInterpretation(selectedNode.interpretation || '');
      setEditedStrategicFit(selectedNode.strategicFit || '');
      setEditedEnergyCost(selectedNode.energyCost || 3);
      setEditedEmail(selectedNode.email || '');
      setEditedPhone(selectedNode.phone || '');
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const handleSave = () => {
    const fieldsArr = editedFields
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);
      
    updateNode(selectedNode.id, {
      group: editedGroup,
      fields: fieldsArr,
      fact: editedFact,
      interpretation: editedInterpretation,
      strategicFit: editedStrategicFit,
      energyCost: editedEnergyCost,
      email: editedEmail,
      phone: editedPhone
    });
    
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedNode.id === coreNodeId) {
      alert('내 프로필은 네트워크에서 삭제할 수 없어요.');
      return;
    }
    if (window.confirm(`정말 ${selectedNode.id}님을 네트워크에서 도출하시겠습니까? 관련 연결선도 모두 삭제됩니다.`)) {
      deleteNode(selectedNode.id);
    }
  };

  // Group styles
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      
      {/* Backdrop shadow overlay with fade animate */}
      <div 
        className="absolute inset-0 bg-black/45 backdrop-blur-3xs"
        onClick={() => setSelectedNode(null)}
      />

      {/* Bottom Sheet sliding panel */}
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-t-[32px] modal-shadow max-h-[88vh] overflow-y-auto z-10 flex flex-col focus:outline-hidden transition-colors duration-300 pointer-events-auto border-t border-toss-border dark:border-zinc-800"
      >
        {/* Dynamic Drag/Close Bar Accent */}
        <div className="w-full py-4 flex flex-col items-center justify-center cursor-pointer opacity-80 hover:opacity-100" onClick={() => setSelectedNode(null)}>
          <div className="w-12 h-1.5 bg-[#E5E8EB] dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Content Panel */}
        <div className="px-6 pb-12 overflow-y-auto">
          
          {/* Header row with Name, Tag, Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-toss-border dark:border-zinc-805 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getGroupBadgeColor(editedGroup || selectedNode.group)}`}>
                  {(editedGroup || selectedNode.group) === 'Me' ? '나 (Me)' : (editedGroup || selectedNode.group)}
                </span>
                
                {/* Energy Cost Pill */}
                <div className="flex items-center gap-1 bg-toss-bg dark:bg-zinc-800/60 px-2.5 py-1 rounded-lg font-bold text-[11px] text-toss-sub-text dark:text-zinc-400">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>에너지 비용 : <strong className="text-toss-text dark:text-zinc-200">{isEditing ? editedEnergyCost : selectedNode.energyCost}</strong></span>
                </div>
              </div>
              
              <h2 className="text-2xl font-black text-toss-text dark:text-zinc-100 mt-2 font-sans tracking-tight">
                {selectedNode.id}
              </h2>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-toss-blue hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-lg shadow-toss-blue/25 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>저장하기</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 bg-toss-bg dark:bg-zinc-800 hover:bg-[#E5E8EB] text-toss-sub-text dark:text-zinc-300 rounded-xl text-[13px] font-bold transition-all cursor-pointer border border-toss-border dark:border-zinc-700"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-toss-bg dark:bg-zinc-800 hover:bg-[#E5E8EB] text-toss-text dark:text-zinc-200 rounded-xl text-[13px] font-bold transition-all cursor-pointer border border-toss-border dark:border-zinc-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-toss-blue" />
                    <span>정보 수정</span>
                  </button>
                  
                  {selectedNode.id !== coreNodeId && (
                    <button
                      onClick={handleDelete}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-[#2C191D] rounded-xl transition-colors cursor-pointer"
                      title="네트워크에서 제외"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-2.5 text-toss-muted hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Core Body Container (Grid layout splitting analysis and competence radar chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side: Detailed descriptions / fields form */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {isEditing ? (
                // ------------------ EDIT FORM FIELDS ------------------
                <div className="space-y-4 bg-slate-50 dark:bg-zinc-800/40 p-5 rounded-3xl border border-slate-100 dark:border-zinc-850">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        소속 그룹
                      </label>
                      <select
                        value={editedGroup}
                        onChange={(e) => setEditedGroup(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100"
                      >
                        {['Tech', 'Design', 'Business', 'Strategy', 'External'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        에너지 비용 (1~5)
                      </label>
                      <select
                        value={editedEnergyCost}
                        onChange={(e) => setEditedEnergyCost(Number(e.target.value))}
                        className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100 animate-none"
                      >
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>Level {v} {v <= 2 ? '(낮음 - 강력대응)' : v >= 4 ? '(높음 - 협상필요)' : '(보통)'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      핵심 태그 (분야별 쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={editedFields}
                      onChange={(e) => setEditedFields(e.target.value)}
                      placeholder="UI디자인, 제품개발, 기획, 금융"
                      className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        이메일 주소
                      </label>
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        placeholder="hr@toss.im"
                        className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        연락처
                      </label>
                      <input
                        type="text"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Fact (경험 및 성과, 이력)
                    </label>
                    <textarea
                      value={editedFact}
                      onChange={(e) => setEditedFact(e.target.value)}
                      rows={3}
                      className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Interpretation (인재 성격 및 핵심 강점 해석)
                    </label>
                    <textarea
                      value={editedInterpretation}
                      onChange={(e) => setEditedInterpretation(e.target.value)}
                      rows={3}
                      className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Strategic Fit (우리 조직 리소스 전략 배정)
                    </label>
                    <textarea
                      value={editedStrategicFit}
                      onChange={(e) => setEditedStrategicFit(e.target.value)}
                      rows={3}
                      className="w-full bg-white dark:bg-zinc-800 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-zinc-100 font-mono"
                    />
                  </div>
                </div>
              ) : (
                // ------------------ STATIC VIEW DETAILS ------------------
                <>
                  {/* Fields list */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.fields.map((field) => (
                      <span 
                        key={field} 
                        className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl flex items-center gap-1 cursor-default"
                      >
                        <span className="text-blue-500 font-mono">#</span>
                        {field}
                      </span>
                    ))}
                    {selectedNode.fields.length === 0 && (
                      <span className="text-2xs text-slate-350 dark:text-zinc-650 italic">지정된 태그가 없습니다</span>
                    )}
                  </div>

                  {/* Contact details Card */}
                  {(selectedNode.email || selectedNode.phone) && (
                    <div className="flex flex-wrap gap-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100/50 dark:border-zinc-800/40">
                      {selectedNode.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          <span>{selectedNode.email}</span>
                        </div>
                      )}
                      {selectedNode.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                          <span>{selectedNode.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fact Block Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 p-6 rounded-3xl shadow-3xs">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-200 mb-3.5">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                      <h4 className="text-sm font-bold tracking-tight">Fact (객관적 이력 및 사실)</h4>
                    </div>
                    <p className="text-[13px] text-slate-600 dark:text-zinc-350 leading-relaxed whitespace-pre-line font-medium max-w-prose">
                      {selectedNode.fact || '등록된 사실 정보가 존재하지 않습니다.'}
                    </p>
                  </div>

                  {/* Interpretation Block Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 p-6 rounded-3xl shadow-3xs">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-200 mb-3.5">
                      <BrainCircuit className="w-4.5 h-4.5 text-violet-500" />
                      <h4 className="text-sm font-bold tracking-tight">Interpretation (정성적 성향 및 해석)</h4>
                    </div>
                    <p className="text-[13px] text-slate-600 dark:text-zinc-350 leading-relaxed whitespace-pre-line font-medium max-w-prose">
                      {selectedNode.interpretation || '분석된 정성 정보가 정의되지 않았습니다.'}
                    </p>
                  </div>

                  {/* Strategic Fit Block Card */}
                  <div className="bg-white dark:bg-zinc-900 border-none bg-blue-50/40 dark:bg-indigo-950/20 p-6 rounded-3xl">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100 mb-3.5">
                      <Heart className="w-4.5 h-4.5 text-blue-500" />
                      <h4 className="text-sm font-bold tracking-tight text-blue-600 dark:text-blue-400">Strategic Fit (전략 임무 및 시너지 방안)</h4>
                    </div>
                    <p className="text-[13px] text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-medium max-w-prose">
                      {selectedNode.strategicFit || '배정된 전략적 적합 방향이 비어 있습니다.'}
                    </p>
                  </div>

                  {/* Feature 1 & 2: Connections display & Editing section inside the BottomSheet */}
                  {(() => {
                    const connectedPeople = links
                      .map(l => {
                        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
                        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
                        if (s === selectedNode.id) return t;
                        if (t === selectedNode.id) return s;
                        return null;
                      })
                      .filter((id): id is string => id !== null && id !== selectedNode.id);

                    const uniqueConnected = Array.from(new Set(connectedPeople));
                    const visibleConnections = isConnectionsExpanded ? uniqueConnected : uniqueConnected.slice(0, 3);
                    const shadowCount = uniqueConnected.length - 3;

                    // Exclude self and currently connected peers
                    const availableToConnect = nodes.filter(
                      n => n.id !== selectedNode.id && !uniqueConnected.includes(n.id)
                    );

                    return (
                      <div className="bg-white dark:bg-zinc-900 border border-slate-150/60 dark:border-zinc-850 p-6 rounded-3xl shadow-3xs mt-2">
                        <div className="flex items-center justify-between mb-4 select-none">
                          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                            <Link2 className="w-4.5 h-4.5 text-toss-blue" />
                            <h4 className="text-sm font-black tracking-tight font-sans">연결된 사람들 (Connections)</h4>
                            <span className="text-[11px] bg-slate-100 dark:bg-zinc-805 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                              {uniqueConnected.length}명
                            </span>
                          </div>

                          {/* Connection Edit Mode Gear Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setIsEditingConnections(!isEditingConnections)}
                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                              isEditingConnections 
                                ? 'bg-toss-blue/10 text-toss-blue dark:bg-toss-blue/20' 
                                : 'hover:bg-slate-50 dark:hover:bg-zinc-805 text-slate-400 dark:text-zinc-500'
                            }`}
                            title="연결고리 편집"
                          >
                            <Settings className={`w-4 h-4 ${isEditingConnections ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                          </button>
                        </div>

                        {isEditingConnections ? (
                          // ================= FEATURE 2: CONNECTION EDIT MODE =================
                          <div className="space-y-4">
                            <div className="p-3 bg-blue-50/50 dark:bg-indigo-950/10 rounded-2xl border border-blue-100/20 text-2xs text-blue-600 dark:text-blue-400 leading-relaxed font-sans">
                              ⚡️ 기 협력된 연결 관계를 끊으려면 ✕를 클릭하세요. 신규 관계를 맺으려면 아래 인재 드롭다운 풀에서 선택하세요.
                            </div>

                            {/* Connected list with instant deletes */}
                            <div className="flex flex-wrap gap-1.5">
                              {uniqueConnected.map((name) => (
                                <div
                                  key={`edit-conn-${name}`}
                                  className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-805 text-slate-650 dark:text-zinc-300 border border-slate-150/80 dark:border-zinc-750 p-2.5 py-1.5 rounded-full text-xs font-bold"
                                >
                                  <span className="w-4.5 h-4.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-[10px] font-extrabold flex items-center justify-center">
                                    {name[0]}
                                  </span>
                                  <span>{name}</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteLink(selectedNode.id, name)}
                                    className="w-4 h-4 ml-1 rounded-full bg-slate-200 hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white dark:hover:text-white transition-all flex items-center justify-center text-[10px] font-black cursor-pointer text-slate-400 dark:text-zinc-400"
                                    title="연결 끊기"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              {uniqueConnected.length === 0 && (
                                <span className="text-xs text-slate-400 dark:text-zinc-550 italic">현재 연결망이 완전히 비어 있습니다.</span>
                              )}
                            </div>

                            {/* Dropdown element to instantly add a connection */}
                            <div className="pt-3.5 border-t border-dashed border-slate-100 dark:border-zinc-800">
                              {availableToConnect.length === 0 ? (
                                <span className="text-2xs text-slate-400 dark:text-zinc-500 italic pb-1 block">더 이상 추가 연결할 피어가 존재하지 않습니다.</span>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                  <span className="text-2xs font-extrabold text-slate-450 dark:text-zinc-500 uppercase tracking-widest font-sans">+ 새 연결 추가:</span>
                                  <div className="relative w-full sm:w-auto min-w-[200px]">
                                    <select
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                          addLink({
                                            source: selectedNode.id,
                                            target: val,
                                            relationshipType: '프로젝트 협업',
                                            strength: 2
                                          });
                                          e.target.value = ''; // Reset select state
                                        }
                                      }}
                                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-[12.5px] text-slate-700 dark:text-zinc-200 font-bold focus:outline-none focus:ring-1 focus:ring-toss-blue/35 transition-all"
                                      defaultValue=""
                                    >
                                      <option value="" disabled>인재 풀에서 추가 선택...</option>
                                      {availableToConnect.map(p => (
                                        <option key={p.id} value={p.id}>{p.id} ({p.group})</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // ================= FEATURE 1: VIEW CONNECTIONS =================
                          <div className="space-y-3">
                            {uniqueConnected.length === 0 ? (
                              <span className="text-xs text-slate-400 dark:text-zinc-450 italic">연결된 동료가 아직 존재하지 않습니다.</span>
                            ) : (
                              <>
                                <motion.div 
                                  layout
                                  className="flex flex-wrap gap-1.5"
                                >
                                  <AnimatePresence initial={false}>
                                    {visibleConnections.map((name) => (
                                      <motion.div
                                        key={`view-sheet-conn-${name}`}
                                        initial={{ opacity: 0, scale: 0.92 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.92 }}
                                        transition={{ duration: 0.18 }}
                                        onClick={() => {
                                          const targetNode = nodes.find(n => n.id === name);
                                          if (targetNode) setSelectedNode(targetNode);
                                        }}
                                        className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-805 text-slate-655 dark:text-zinc-300 border border-slate-100 dark:border-zinc-750 p-2.5 py-1.5 rounded-full text-xs font-semibold hover:border-toss-blue/30 dark:hover:border-toss-blue/30 transition-all cursor-pointer"
                                      >
                                        <span className="w-4.5 h-4.5 rounded-full bg-slate-200 dark:bg-zinc-750 text-slate-600 dark:text-zinc-300 text-[10px] font-extrabold flex items-center justify-center">
                                          {name[0]}
                                        </span>
                                        <span className="font-bold">{name}</span>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </motion.div>

                                {uniqueConnected.length > 3 && (
                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setIsConnectionsExpanded(!isConnectionsExpanded)}
                                      className="text-xs font-bold text-toss-blue hover:text-blue-600 transition-colors cursor-pointer"
                                    >
                                      {isConnectionsExpanded ? "간략히 보기" : `+${shadowCount}명 더보기`}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Right side: SVG Radar competency Chart */}
            <div className="lg:col-span-5 flex flex-col justify-start">
              <RadarChart node={selectedNode} links={links} />
              
              {/* Additional Context help box */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 text-3xs text-slate-400 dark:text-zinc-500 leading-loose">
                <span className="font-bold text-slate-600 dark:text-zinc-400">💡 콤비네이션 팁:</span> '에너지 비용'이 낮을수록(1, 2) 협상 필요 및 조정 제반 비용이 적어 가동성이 높고, 풍부한 'Fact 이력'과 '동료 결합링크 수'가 늘어날 수록 실행력과 시너지 스코어가 상승합니다.
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};
