/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { TalentNode, TalentLink } from '../types';
import { parseMarkdownToTalent, getMarkdownTemplate } from '../utils/parser';
import { 
  X, 
  Sparkles, 
  HelpCircle, 
  Plus, 
  Link2, 
  FileText, 
  Settings,
  ChevronDown,
  Check,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = 'manual-markdown' | 'ai';
type FormTab = 'raw' | 'manual';

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose }) => {
  const { nodes, addNode, addLink, graphs, activeGraphId, coreNodeId } = useNetwork();
  
  const [targetGraphId, setTargetGraphId] = useState(activeGraphId);
  const [mainTab, setMainTab] = useState<MainTab>('manual-markdown');
  const [activeFormTab, setActiveFormTab] = useState<FormTab>('raw');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Synchronize targetGraphId with activeGraphId when modal is opened
  useEffect(() => {
    if (isOpen) {
      setTargetGraphId(activeGraphId);
    }
  }, [isOpen, activeGraphId]);

  // AI Automatic text parsing states
  const [aiInputText, setAiInputText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);
  const [aiConsent, setAiConsent] = useState(false);

  // Raw data state
  const [rawText, setRawText] = useState('');

  // Manual form state
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Tech');
  const [fieldsText, setFieldsText] = useState('');
  const [fact, setFact] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [strategicFit, setStrategicFit] = useState('');
  const [energyCost, setEnergyCost] = useState(3);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // New Link setting state
  const [selectedTargetId, setSelectedTargetId] = useState(coreNodeId);
  const [relationshipType, setRelationshipType] = useState('프로젝트 협업');
  const [relationStrength, setRelationStrength] = useState(2);

  useEffect(() => { if (isOpen) setSelectedTargetId(coreNodeId); }, [isOpen, coreNodeId]);

  if (!isOpen) return null;

  // Handle Raw Paste Parsing & apply to inputs
  const handleApplyRawParse = () => {
    if (!rawText.trim()) {
      setErrorMsg('분석할 마크다운 혹은 YAML 텍스트를 입력해주세요.');
      return;
    }

    const { node, connection } = parseMarkdownToTalent(rawText);
    
    if (!node.id) {
      setErrorMsg('텍스트 내에서 이름(ID)을 추출해내지 못했어요. "이름: 홍길동" 또는 YAML 형식 "name: 홍길동"이 들어있는지 확인해주세요.');
      return;
    }

    // Check duplicate in selected graph
    const targetGraphNodes = (graphs.find(g => g.id === targetGraphId) || { nodes: [] }).nodes;
    if (targetGraphNodes.some(n => n.id.trim() === (node.id || '').trim())) {
      setErrorMsg(`"${node.id}"님은 이미 이 네트워크 맵에 등록되어 있습니다.`);
      return;
    }

    // Populate manual fields
    setName(node.id);
    if (node.group) setGroup(node.group);
    if (node.fields) setFieldsText(node.fields.join(', '));
    if (node.fact) setFact(node.fact);
    if (node.interpretation) setInterpretation(node.interpretation);
    if (node.strategicFit) setStrategicFit(node.strategicFit);
    if (node.energyCost !== undefined) setEnergyCost(node.energyCost);
    if (node.email) setEmail(node.email);
    if (node.phone) setPhone(node.phone);

    if (connection) {
      setSelectedTargetId(connection.targetId);
      setRelationshipType(connection.relationshipType);
      setRelationStrength(connection.strength);
    }

    setActiveFormTab('manual');
    setErrorMsg('');
  };

  const copyTemplateToClipboard = () => {
    const nodeNames = nodes.map(n => n.id);
    const text = getMarkdownTemplate(nodeNames);
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('이름을 입력해주세요.');
      return;
    }

    const targetGraphNodes = (graphs.find(g => g.id === targetGraphId) || { nodes: [] }).nodes;
    if (targetGraphNodes.some(n => n.id.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg('해당 네트워크에 이미 존재하는 인물입니다. 동명이인인 경우 이름 뒷자리에 직급/분야를 부여해보세요 (예: 김동현_파트너).');
      return;
    }

    const fieldsArray = fieldsText
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    const newNode: TalentNode = {
      id: cleanName,
      group,
      fields: fieldsArray,
      fact: fact.trim(),
      interpretation: interpretation.trim(),
      strategicFit: strategicFit.trim(),
      energyCost,
      email: email.trim(),
      phone: phone.trim()
    };

    // Connection configuration
    const connection = selectedTargetId 
      ? {
          targetId: selectedTargetId,
          relationshipType: relationshipType.trim() || '동료',
          strength: relationStrength
        }
      : undefined;

    const success = addNode(newNode, connection, targetGraphId);
    
    if (success) {
      // Clear all state
      setName('');
      setFieldsText('');
      setFact('');
      setInterpretation('');
      setStrategicFit('');
      setEnergyCost(3);
      setEmail('');
      setPhone('');
      setRawText('');
      onClose();
    } else {
      setErrorMsg('노드 등록 중 예상하지 못한 중복이 발생했습니다.');
    }
  };

  const parseTextWithAI = async () => {
    if (!aiInputText.trim()) {
      setErrorMsg('분석할 인력 및 관계 설명 글을 작성해 주세요.');
      return;
    }
    if (!aiConsent) {
      setErrorMsg('AI 처리 안내를 확인하고 동의해주세요.');
      return;
    }
    setErrorMsg('');
    setIsAILoading(true);
    setAiResults(null);

    try {
      const response = await fetch('/api/parse-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rawText: aiInputText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI 분석 전송 중 장애가 일어났습니다.');
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('AI 분석 결과가 예기치 않게 올바른 형식(배열)이 아닙니다.');
      }
      setAiResults(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'AI 분석 파싱 도중 예상치 못한 서버 오류가 발생했습니다.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAIConfirmRegister = () => {
    if (!aiResults || aiResults.length === 0) return;

    let addedCount = 0;
    const duplicateNames: string[] = [];

    // Map AI groups to proper categories
    const mapGroup = (g: string): string => {
      const lower = (g || '').trim().toLowerCase();
      if (lower.includes('tech') || lower.includes('기술') || lower.includes('개발') || lower.includes('컴공') || lower.includes('엔지')) return 'Tech';
      if (lower.includes('design') || lower.includes('디자인') || lower.includes('설계') || lower.includes('미술')) return 'Design';
      if (lower.includes('business') || lower.includes('비즈니스') || lower.includes('사업') || lower.includes('영업')) return 'Business';
      if (lower.includes('strategy') || lower.includes('전략') || lower.includes('기획')) return 'Strategy';
      if (lower.includes('me') || lower.includes('나')) return 'Me';
      return 'External';
    };

    const mapEnergyCost = (cost: string): number => {
      const lower = (cost || '').trim().toLowerCase();
      if (lower === 'low' || lower.includes('낮음') || lower.includes('1') || lower.includes('2')) return 1;
      if (lower === 'high' || lower.includes('높음') || lower.includes('5') || lower.includes('4')) return 5;
      return 3;
    };

    // 1. Add all nodes first
    const targetGraphNodes = (graphs.find(g => g.id === targetGraphId) || { nodes: [] }).nodes;

    aiResults.forEach((item: any) => {
      const cleanId = (item.id || item.name || '').trim();
      if (!cleanId) return;

      const nodeToAdd: TalentNode = {
        id: cleanId,
        group: mapGroup(item.group || ''),
        fields: item.fields || [],
        fact: item.fact || '',
        interpretation: item.interpretation || '',
        strategicFit: item.strategic_fit || '',
        energyCost: mapEnergyCost(item.energy_cost || ''),
        email: item.email || '',
        phone: item.phone || '',
      };

      const success = addNode(nodeToAdd, undefined, targetGraphId);
      if (success) {
        addedCount++;
      } else {
        duplicateNames.push(cleanId);
      }
    });

    // 2. Add all links between AI nodes and existing nodes
    aiResults.forEach((item: any) => {
      const cleanId = (item.id || item.name || '').trim();
      if (!cleanId) return;

      if (item.connections && Array.isArray(item.connections)) {
        item.connections.forEach((targetName: string) => {
          const cleanTarget = (targetName || '').trim();
          if (!cleanTarget || cleanTarget === cleanId) return;

          // Check if both nodes exist in nodes (already updated by addNode above) or are part of parsed results
          const allNodeNames = [
            ...targetGraphNodes.map(n => n.id.trim().toLowerCase()), 
            ...aiResults.map(x => (x.id || x.name || '').trim().toLowerCase())
          ];

          if (allNodeNames.includes(cleanTarget.toLowerCase())) {
            addLink({
              source: cleanId,
              target: cleanTarget,
              relationshipType: 'AI 연계망',
              strength: 2
            }, targetGraphId);
          }
        });
      }
    });

    if (duplicateNames.length > 0) {
      alert(`AI 자동 파싱 성공: 새로운 인물 ${addedCount}명이 등록되었습니다.\n(중복 제외 인물: ${duplicateNames.join(', ')})`);
    } else {
      alert(`AI 자동 파싱 성공: 총 ${addedCount}명의 인재가 완벽히 등록되었습니다.`);
    }

    // Reset AI states
    setAiInputText('');
    setAiResults(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with animate fade */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-3xs"
        onClick={onClose}
      />

      {/* Modal Dialog container */}
      <div
        className="relative bg-white dark:bg-[#1C1C1E] rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col modal-shadow border border-toss-border dark:border-zinc-800 z-10 transition-colors duration-300"
      >
        {/* Header Tab Panel */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-toss-border dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-[17px] font-black text-toss-text dark:text-zinc-100 font-sans tracking-tight">
              새 인적 자원 등록
            </h3>
            
            {/* Main Tabs selector - Toss style */}
            <div className="flex items-center bg-toss-bg dark:bg-zinc-800/80 p-0.5 rounded-lg border border-toss-border dark:border-zinc-750">
              <button
                type="button"
                onClick={() => { setMainTab('manual-markdown'); setErrorMsg(''); }}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  mainTab === 'manual-markdown' 
                    ? 'bg-white dark:bg-zinc-700 text-toss-blue shadow-2xs font-extrabold' 
                    : 'text-toss-muted dark:text-zinc-550'
                }`}
              >
                수동/마크다운 입력
              </button>
              <button
                type="button"
                onClick={() => { setMainTab('ai'); setErrorMsg(''); }}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  mainTab === 'ai' 
                    ? 'bg-white dark:bg-zinc-700 text-toss-blue shadow-2xs font-extrabold' 
                    : 'text-toss-muted dark:text-zinc-550'
                }`}
              >
                <Sparkles className="w-3 h-3 text-toss-blue" />
                <span>AI 자동 입력</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-lg text-toss-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body content */}
        <div className="flex-grow overflow-y-auto px-6 py-5">
          
          {/* Target Network (Context) Selector Card */}
          <div className="mb-5 p-4 bg-slate-50 dark:bg-zinc-900 border border-toss-border dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-toss-blue animate-pulse"></span>
              <span className="text-[12px] font-bold text-toss-text dark:text-zinc-150">어느 네트워크에 등록할까요?</span>
            </div>
            
            <select
              value={targetGraphId}
              onChange={(e) => setTargetGraphId(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-toss-border dark:border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-bold text-toss-blue focus:outline-none cursor-pointer"
            >
              {graphs.map(g => (
                <option key={`modal-graph-opt-${g.id}`} value={g.id}>
                  {g.name} (현재 {g.nodes.length}명)
                </option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 text-xs font-semibold rounded-2xl border border-rose-100/70 dark:border-rose-900/30 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          {mainTab === 'manual-markdown' ? (
            <div className="space-y-4">
              {/* Nested Sub-tab selector - Toss style */}
              <div className="flex items-center bg-toss-bg dark:bg-zinc-800/80 p-0.5 rounded-lg border border-toss-border dark:border-zinc-750 max-w-[240px] mb-3 select-none">
                <button
                  type="button"
                  onClick={() => { setActiveFormTab('raw'); setErrorMsg(''); }}
                  className={`flex-1 text-center py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                    activeFormTab === 'raw' 
                      ? 'bg-white dark:bg-zinc-700 text-toss-blue shadow-3xs font-extrabold' 
                      : 'text-toss-muted dark:text-zinc-500 font-medium'
                  }`}
                >
                  마크다운 붙여넣기
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveFormTab('manual'); setErrorMsg(''); }}
                  className={`flex-1 text-center py-1.5 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                    activeFormTab === 'manual' 
                      ? 'bg-white dark:bg-zinc-700 text-toss-blue shadow-3xs font-extrabold' 
                      : 'text-toss-muted dark:text-zinc-500 font-medium'
                  }`}
                >
                  수동 폼 직접 기재
                </button>
              </div>

              {activeFormTab === 'raw' ? (
            // ------------------ TAB A: RAW TEXT PASTE ------------------
            <div className="space-y-4">
              <div className="flex items-center justify-between text-2xs text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                <span>Markdown & YAML 소스 붙여넣기</span>
                
                <button
                  type="button"
                  onClick={copyTemplateToClipboard}
                  className="text-[10px] text-toss-blue bg-toss-blue/10 dark:bg-indigo-950/35 px-2.5 py-1 rounded-md border border-toss-blue/15 hover:bg-toss-blue/20 transition-all font-sans font-bold cursor-pointer"
                >
                  {copiedSuccess ? '복사 성공!' : '가이드 탬플릿 복사'}
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`이곳에 마크다운 이력을 붙여넣거나 수정을 시작해보세요.\n\n[템플릿 예시]\n---\nname: 김동현\ngroup: Design\nfields: UI디자인, 인터랙션\n---\n# Fact\n- 토스 3년 리드 UI디자이너...`}
                rows={9}
                className="w-full bg-toss-bg dark:bg-zinc-900 rounded-2xl px-4 py-3.5 text-[12.5px] border-0 focus:outline-none focus:ring-2 focus:ring-toss-blue/20 font-mono text-toss-text dark:text-zinc-200 leading-relaxed"
              />

              <div className="p-4 bg-toss-bg dark:bg-zinc-900/80 rounded-2xl border border-toss-border dark:border-zinc-800 text-3xs text-toss-sub-text dark:text-zinc-500 leading-relaxed">
                <span className="font-bold text-toss-text dark:text-zinc-400">💡 마크다운 연동의 장점:</span> YAML 파트에서는 이름, 그룹(Me/Tech/Design/Business/Strategy/External), 태그(콤마 구분), 커넥션 파트너가 즉시 결합 분석되어 폼 입력 시간을 단축시킵니다.
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-toss-border dark:border-zinc-800 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-toss-sub-text dark:text-zinc-400/80 text-[13px] font-bold hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleApplyRawParse}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-toss-blue hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-lg shadow-toss-blue/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>형식 분석하여 폼 채우기</span>
                </button>
              </div>
            </div>
          ) : (
            // ------------------ TAB B: MANUAL FORM ENTRY ------------------
            <form onSubmit={handleManualSubmit} className="space-y-4">
              
              {/* Row 1: Name and Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 김동현"
                    className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    분류 그룹
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200 cursor-pointer"
                  >
                    {['Tech', 'Design', 'Business', 'Strategy', 'External'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Fields and Energy Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    핵심 태그들 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={fieldsText}
                    onChange={(e) => setFieldsText(e.target.value)}
                    placeholder="UI디자인, 모션그래픽, 피그마"
                    className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    에너지 비용 (1 = 밀착협력, 5 = 자원멂)
                  </label>
                  <select
                    value={energyCost}
                    onChange={(e) => setEnergyCost(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map(v => (
                      <option key={v} value={v}>Level {v} {v <= 2 ? '(낮음 - 가까움)' : v >= 4 ? '(높음 - 원자재)' : '(보통)'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contacts info optionally */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    연락처 이메일 (선택)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@toss.im"
                    className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                    전화번호 (선택)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              {/* Descriptions block */}
              <div>
                <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Fact (핵심 성과, 수행 이력)
                </label>
                <textarea
                  value={fact}
                  onChange={(e) => setFact(e.target.value)}
                  placeholder="• 어떤 구체적인 핵심 이력을 보유했는지 서술해주세요."
                  rows={2.5}
                  className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200 font-sans"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Interpretation (정성적 인재 인성/강점 특징)
                </label>
                <textarea
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  placeholder="• 이력 너머의 어떠한 특별한 강점과 비즈니스 스타일을 보유했는지 기재하세요."
                  rows={2.5}
                  className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200 font-sans"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wider">
                  Strategic Fit (우리 조직 대입 방안 및 시너지)
                </label>
                <textarea
                  value={strategicFit}
                  onChange={(e) => setStrategicFit(e.target.value)}
                  placeholder="• 프로젝트 콤비네이션 엔진 내부에서 어떤 조직 결합 강점을 창출할 것인지 기재하세요."
                  rows={2.5}
                  className="w-full bg-slate-50 dark:bg-zinc-900/60 rounded-xl px-3 py-2 text-[13px] border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-zinc-200 font-sans"
                />
              </div>

              {/* Edge Connection sub-form */}
              <div className="bg-blue-50/30 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-2xl p-4.5 mt-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Link2 className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span className="text-[12px] font-bold text-slate-700 dark:text-zinc-300">
                    첫 네트워크 연결 설정
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 mb-1">
                      연결 대상 피어
                    </label>
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-[11px] border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 cursor-pointer"
                    >
                      {((graphs.find(g => g.id === targetGraphId) || { nodes: [] }).nodes).map(n => (
                        <option key={`target-opt-${n.id}`} value={n.id}>{n.id}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 mb-1">
                      관계 기여 유형
                    </label>
                    <input
                      type="text"
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      placeholder="예: 프로젝트 협업"
                      className="w-full bg-white dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-[11px] border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 mb-1">
                      친밀 결합 강도
                    </label>
                    <select
                      value={relationStrength}
                      onChange={(e) => setRelationStrength(Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-[11px] border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 cursor-pointer"
                    >
                      <option value="1">Level 1 (일회성 기여)</option>
                      <option value="2">Level 2 (지속 파트너)</option>
                      <option value="3">Level 3 (동반 성장코어)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form submit/cancel rows */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-toss-border dark:border-zinc-800 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-toss-sub-text dark:text-zinc-400 text-[13px] font-bold hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-toss-blue hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-lg shadow-toss-blue/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>네트워크 등록 완료</span>
                </button>
              </div>

            </form>
          )}
            </div>
          ) : (
            // ================== MAIN TAB 2: AI AUTOMATIC TEXT PARSER ==================
            <div className="space-y-4 font-sans text-toss-text dark:text-zinc-200">
              {!aiResults ? (
                // State: Text Input Mode
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-toss-bg dark:bg-zinc-900 border border-toss-border dark:border-zinc-800 leading-relaxed">
                    <h4 className="text-[12.5px] font-black text-toss-text dark:text-zinc-100 flex items-center gap-1.5 mb-1.5 select-none">
                      <Sparkles className="w-4 h-4 text-toss-blue animate-pulse stroke-[2.5]" />
                      자연어 설명문 하나로 인재 및 연계 링크 일괄 추천 추가
                    </h4>
                    <p className="text-[11.5px] text-toss-sub-text dark:text-zinc-400 leading-relaxed font-sans">
                      이력서 줄글, 회의록 메모, 팀 빌딩 일지 등 자유롭게 작성하세요. AI가 한 줄 요약, 그룹 분류는 물론, 인물 간의 <strong>상호 연결 링크(connections)</strong>까지 정석 분석해 실시간 지도로 변환해 줍니다.
                    </p>
                  </div>

                  <textarea
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder={`[자연어 입력 작성 예시]\n배소혜는 부산대 석사이고 우주관광에 관심이 많아. 실행력이 높고 나(${coreNodeId})와 해커톤을 같이 했어. 연락처는 당사자가 제공에 동의한 경우에만 입력해.`}
                    rows={8}
                    className="w-full bg-toss-bg dark:bg-zinc-900 rounded-2xl px-4 py-3.5 text-[12.5px] border border-toss-border dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-toss-blue/20 text-toss-text dark:text-zinc-200 leading-relaxed placeholder-slate-400 dark:placeholder-zinc-650"
                  />

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300 cursor-pointer">
                    <input type="checkbox" checked={aiConsent} onChange={e => setAiConsent(e.target.checked)} className="mt-0.5" />
                    <span>입력 내용이 AI 분석 제공자에게 일시 전송됩니다. 당사자의 동의를 받은 정보만 입력하고 주민번호·계좌·건강정보 등 민감정보는 제거했습니다.</span>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-toss-border dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isAILoading || !aiConsent}
                      className="px-5 py-2.5 text-toss-sub-text dark:text-zinc-400/80 text-[13px] font-bold hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                    >
                      닫기
                    </button>
                    <button
                      type="button"
                      disabled={isAILoading}
                      onClick={parseTextWithAI}
                      className="flex items-center gap-2 px-6 py-2.5 bg-toss-blue hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 disabled:opacity-55 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-toss-blue/20 transition-all cursor-pointer"
                    >
                      {isAILoading ? (
                        <>
                          <Loader2 className="w-4 h-4 text-white animate-spin stroke-[2.5]" />
                          <span>AI 입체망 추출 분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          <span>AI로 자동 변환하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // State: Human-in-The-Loop Draft Cards Review Screen
                <div className="space-y-4 font-sans text-toss-text dark:text-zinc-200">
                  <div className="flex items-center justify-between border-b border-toss-border dark:border-zinc-800 pb-2.5 select-none">
                    <span className="text-[12.5px] font-extrabold text-toss-text dark:text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      추출 결과 검토 ({aiResults.length}명 대기)
                    </span>
                    <span className="text-[10px] text-toss-muted dark:text-zinc-550">내용 보정 후 등록 가능합니다.</span>
                  </div>

                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                    {aiResults.map((item, index) => (
                      <div 
                        key={`ai-node-review-${item.id}-${index}`}
                        className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4.5 border border-toss-border dark:border-zinc-800 space-y-3.5"
                      >
                        {/* Summary Header Block */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-black text-toss-text dark:text-zinc-100">
                              {item.name || item.id}
                            </span>
                            <span className="text-[9.5px] font-black px-2 py-0.5 bg-toss-blue/10 text-toss-blue rounded-md">
                              {item.group || 'External'}
                            </span>
                            <span className="text-[9.5px] font-semibold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-toss-sub-text dark:text-zinc-300 rounded-md">
                              에너지 Level: {item.energy_cost || 3}
                            </span>
                          </div>

                          <div className="text-[11px] text-toss-muted dark:text-zinc-500 flex flex-wrap gap-2">
                            {item.email && <span>{item.email}</span>}
                            {item.phone && <span>{item.phone}</span>}
                          </div>
                        </div>

                        {/* Fields List */}
                        {item.fields && Array.isArray(item.fields) && item.fields.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.fields.map((f: string) => (
                              <span key={f} className="text-[10px] font-bold bg-white dark:bg-zinc-800 text-toss-text dark:text-zinc-300 border border-toss-border dark:border-zinc-750 px-2 py-0.5 rounded-full">
                                #{f}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats progress layout */}
                        {item.stats && (
                          <div className="grid grid-cols-2 gap-3 bg-white dark:bg-zinc-950/30 p-3 rounded-xl border border-toss-border dark:border-zinc-800/80">
                            <div>
                              <div className="flex justify-between text-[9px] text-toss-muted font-bold mb-1">
                                <span>실행 구현력</span>
                                <span className="text-toss-blue font-extrabold">{item.stats.execution}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-toss-blue rounded-full" style={{ width: `${item.stats.execution}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[9px] text-toss-muted font-bold mb-1">
                                <span>연구 분석력</span>
                                <span className="text-amber-500 font-extrabold">{item.stats.research}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.stats.research}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[9px] text-toss-muted font-bold mb-1">
                                <span>창업 신성향</span>
                                <span className="text-rose-500 font-extrabold">{item.stats.founder}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.stats.founder}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[9px] text-toss-muted font-bold mb-1">
                                <span>글로벌 감각</span>
                                <span className="text-purple-500 font-extrabold">{item.stats.international}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.stats.international}%` }} />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Qualitative Information Cards */}
                        <div className="text-[11.5px] text-toss-text dark:text-zinc-300 grid grid-cols-1 gap-2 pt-2.5 border-t border-dashed border-toss-border dark:border-zinc-800 font-sans">
                          {item.fact && (
                            <div>
                              <span className="text-[9.5px] font-bold text-toss-muted block tracking-wider uppercase">FACT (핵심 이력)</span>
                              <p className="mt-0.5 text-toss-text dark:text-zinc-200 leading-relaxed font-sans">{item.fact}</p>
                            </div>
                          )}
                          {item.interpretation && (
                            <div>
                              <span className="text-[9.5px] font-bold text-toss-muted block tracking-wider uppercase">INTERPRETATION (강점 진단)</span>
                              <p className="mt-0.5 text-toss-sub-text dark:text-zinc-300 leading-relaxed font-sans">{item.interpretation}</p>
                            </div>
                          )}
                          {item.strategic_fit && (
                            <div>
                              <span className="text-[9.5px] font-bold text-toss-muted block tracking-wider uppercase">STRATEGIC FIT (조직 강결합 방안)</span>
                              <p className="mt-0.5 text-toss-sub-text dark:text-zinc-300 leading-relaxed font-sans">{item.strategic_fit}</p>
                            </div>
                          )}
                        </div>

                        {/* Relations Mapping alerts */}
                        {item.connections && Array.isArray(item.connections) && item.connections.length > 0 && (
                          <div className="pt-2 bg-blue-50/40 dark:bg-indigo-950/20 px-3 py-2 rounded-xl flex items-center gap-1.5 flex-wrap border border-blue-100/30 dark:border-indigo-900/10">
                            <span className="text-[9.5px] text-toss-blue dark:text-blue-400 font-bold flex items-center gap-0.5">
                              <Link2 className="w-3.5 h-3.5" />
                              <span>연결망 감지 완료:</span>
                            </span>
                            {item.connections.map((cName: string) => (
                              <span key={cName} className="text-[9px] font-black bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-350 border border-toss-border dark:border-zinc-700 px-1.5 py-0.5 rounded-md">
                                @{cName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Review bottom actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-toss-border dark:border-zinc-800 mt-4">
                    <button
                      type="button"
                      onClick={() => setAiResults(null)}
                      className="px-5 py-2.5 text-toss-sub-text dark:text-zinc-400 text-[13px] font-bold hover:bg-toss-bg dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                    >
                      수정 및 다시 적기
                    </button>
                    <button
                      type="button"
                      onClick={handleAIConfirmRegister}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-toss-blue hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-lg shadow-toss-blue/20 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-white stroke-[2.5]" />
                      <span>이대로 네트워크 등록 완료</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
