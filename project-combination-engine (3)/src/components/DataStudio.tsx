/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { parseMarkdownToTalent } from '../utils/parser';
import { TalentNode, TalentLink } from '../types';
import { 
  FileCode, 
  Copy, 
  Upload, 
  Database, 
  Info,
  Check,
  Link,
  Plus,
  Trash2,
  ListRestart
} from 'lucide-react';

export const DataStudio: React.FC = () => {
  const { 
    nodes, 
    links, 
    addNode, 
    addLink, 
    deleteLink, 
    resetAll,
    theme 
  } = useNetwork();

  const [pasteText, setPasteText] = useState('');
  const [copied, setCopied] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Relation builder states
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relType, setRelType] = useState('프로젝트 지원');
  const [strength, setStrength] = useState(2);

  // Compile database to single Markdown file
  const compileDatabaseToMarkdown = (): string => {
    let result = `# 전략적 인적자원 네트워크 데이터베이스 (Project Combination Engine)\n`;
    result += `> 생성 시간: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

    nodes.forEach(node => {
      result += `--- \n`;
      result += `name: ${node.id}\n`;
      result += `group: ${node.group}\n`;
      result += `fields: ${node.fields.join(', ')}\n`;
      result += `energy: ${node.energyCost}\n`;
      if (node.email) result += `email: ${node.email}\n`;
      if (node.phone) result += `phone: ${node.phone}\n`;
      
      // find connections
      const nodeConns = links.filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return s === node.id;
      });

      if (nodeConns.length > 0) {
        const connsStr = nodeConns.map(l => {
          const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
          return `${t} (${l.relationshipType}, ${l.strength})`;
        }).join(', ');
        result += `connection: ${connsStr}\n`;
      }

      result += `---\r\n\r\n`;

      result += `# Fact (사실 및 이력)\n${node.fact || '- 등록된 이력이 존재하지 않습니다.'}\n\n`;
      result += `# Interpretation (강점 해석)\n${node.interpretation || '- 분석된 정보가 기술되지 않았습니다.'}\n\n`;
      result += `# Strategic Fit (전략 임무)\n${node.strategicFit || '- 부합 정보가 할당되지 않았습니다.'}\n\n\n`;
    });

    return result;
  };

  const handleCopyAll = () => {
    const text = compileDatabaseToMarkdown();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Perform bulk import
  const handleBulkImport = () => {
    setErrorMsg('');
    setSuccessCount(null);

    if (!pasteText.trim()) {
      setErrorMsg('가져올 마크다운 텍스트를 붙여넣어주세요.');
      return;
    }

    // Split pasteText by "---" boundaries
    // Every block has structured nodes
    const blocks = pasteText.split(/---\r?\n/);
    let added = 0;
    let duplicates = 0;

    // A stack of node strings
    const nodeContents: string[] = [];
    
    // Simple block reconstruction
    let buffer: string[] = [];
    const lines = pasteText.split('\n');
    let inFence = false;
    let yamlSec = '';
    
    // We can parse line-by-line using a simpler splitter: looking for standard markdown headings or YAML lines.
    // However, we already have `parseMarkdownToTalent` which handles individual nodes. Let's slice the text.
    // Let's identify YAML blocks.
    const delimiter = '---';
    const rawBlocks = pasteText.split(delimiter);
    
    // Each pair (idx 1, 3, 5) holds a yaml segment, and the subsequent holds the heading content.
    // Let's reconstruct them back to standalone markdown strings
    const documents: string[] = [];
    for (let i = 1; i < rawBlocks.length; i += 2) {
      if (rawBlocks[i] && rawBlocks[i+1]) {
        const doc = `---\n${rawBlocks[i]}\n---\n${rawBlocks[i+1]}`;
        documents.push(doc);
      }
    }

    if (documents.length === 0) {
      // Try parsing the entire block as a single document
      const parsed = parseMarkdownToTalent(pasteText);
      if (parsed.node.id) {
        const success = addNode(parsed.node as TalentNode, parsed.connection);
        if (success) added++;
        else duplicates++;
      } else {
        setErrorMsg('마크다운 펜스(---) 형식 또는 올바른 문법을 찾지 못했습니다. 상단 복사 가이드를 참고하세요.');
        return;
      }
    } else {
      documents.forEach(doc => {
        const parsed = parseMarkdownToTalent(doc);
        if (parsed.node.id) {
          const success = addNode(parsed.node as TalentNode, parsed.connection);
          if (success) {
            added++;
          } else {
            duplicates++;
          }
        }
      });
    }

    setSuccessCount(added);
    setPasteText('');
    
    if (duplicates > 0) {
      setErrorMsg(`성공적으로 ${added}명을 병합 도입했습니다. (이미 등록된 ${duplicates}명은 자동 중복 제외 처리되었습니다)`);
    } else if (added > 0) {
      setErrorMsg(`성공적으로 ${added}명을 네트워크 엔진에 등록했습니다!`);
    }
  };

  // Add explicit edge between two existing nodes
  const handleConnectPeers = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId) {
      alert('두 명의 피어를 올바르게 골라주세요.');
      return;
    }
    if (sourceId === targetId) {
      alert('동일인 자아간에는 직접적인 루프 링크를 생성할 수 없어요.');
      return;
    }

    const link: TalentLink = {
      source: sourceId,
      target: targetId,
      relationshipType: relType.trim() || '협업',
      strength
    };

    addLink(link);
    alert(`성공! "${sourceId}"님과 "${targetId}"님 전직군 연결을 수립했습니다.`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Overview Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 border border-toss-border dark:border-zinc-800 toss-shadow">
        <div className="flex items-center gap-3 mb-2.5">
          <Database className="w-5.5 h-5.5 text-toss-blue" />
          <h3 className="text-md font-bold text-toss-text dark:text-zinc-100">
            데이터 허브 (Data Hub)
          </h3>
        </div>
        <p className="text-xs text-[#4E5968] dark:text-zinc-400 leading-relaxed font-semibold">
          마크다운(Markdown) 데이터베이스 추출 전송과 대량 복원 머징을 원클릭으로 가동합니다. 백업한 파일을 복사해 두면 다른 브라우저에서도 당신의 네트워크 자산이 완벽히 동기화됩니다.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-4 border-t border-toss-border dark:border-zinc-800 pt-4">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-5 py-3 bg-toss-blue hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-lg shadow-toss-blue/20 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>전체 자원 백업마크다운 복사</span>
          </button>

          <button
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-1.5 px-5 py-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100/80 text-rose-500 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-100 dark:border-rose-950/30"
          >
            <ListRestart className="w-4 h-4" />
            <span>네트워크 전체 초기화</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left pane: Bulk Paste tool */}
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 border border-toss-border dark:border-zinc-805 toss-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4.5 h-4.5 text-toss-blue" />
              <h4 className="text-sm font-bold text-toss-text dark:text-zinc-200">
                대량 원시 데이터 가져오기 (Merge & Restore)
              </h4>
            </div>

            <p className="text-xs text-[#4E5968] dark:text-zinc-500 mb-3.5 leading-relaxed font-medium">
              기존 백업했던 원시 마크다운 블록을 그대로 붙여놓고 가져오기를 누르시면 중복된 인물을 우회하며 네트워크 맵에 병합 통합됩니다.
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="# 여기에 백업 텍스트를 투입하세요..."
              rows={8}
              className="w-full bg-toss-bg dark:bg-zinc-800 rounded-2xl px-3 py-2.5 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-toss-blue/20 font-mono text-toss-text dark:text-zinc-300 leading-relaxed"
            />
          </div>

          <div className="mt-4">
            <button
              onClick={handleBulkImport}
              className="w-full py-3 bg-toss-blue hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-toss-blue/15"
            >
              백업 데이터 병합 완료
            </button>
          </div>
        </div>

        {/* Right pane: Edge Connect Tool */}
        <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 border border-toss-border dark:border-zinc-805 toss-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link className="w-4.5 h-4.5 text-toss-blue animate-pulse" />
              <h4 className="text-sm font-bold text-toss-text dark:text-zinc-200">
                상호 피어 직속 관계망 구성설정
              </h4>
            </div>

            <p className="text-xs text-[#4E5968] dark:text-zinc-500 mb-4 leading-relaxed font-medium">
              인물 단독 추가 이후 다자 중계 간에 협력 라인을 새롭게 수립하거나 조율하고 싶을 때 직접 연결할 수 있습니다.
            </p>

            <form onSubmit={handleConnectPeers} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-toss-muted mb-1.5">
                    출발 인재
                  </label>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    required
                    className="w-full bg-toss-bg dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs text-toss-text dark:text-zinc-200 cursor-pointer border-0 focus:ring-2 focus:ring-toss-blue/20"
                  >
                    <option value="">-- 고르기 --</option>
                    {nodes.map(n => (
                      <option key={`src-opt-${n.id}`} value={n.id}>{n.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-toss-muted mb-1.5">
                    대상 인재
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    required
                    className="w-full bg-toss-bg dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs text-toss-text dark:text-zinc-200 cursor-pointer border-0 focus:ring-2 focus:ring-toss-blue/20"
                  >
                    <option value="">-- 고르기 --</option>
                    {nodes.map(n => (
                      <option key={`tgt-opt-${n.id}`} value={n.id}>{n.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-toss-muted mb-1.5">
                    관계 명칭
                  </label>
                  <input
                    type="text"
                    value={relType}
                    onChange={(e) => setRelType(e.target.value)}
                    placeholder="예: 프로젝트 파트너"
                    className="w-full bg-toss-bg dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-toss-text dark:text-zinc-200 border-0 focus:ring-2 focus:ring-toss-blue/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-toss-muted mb-1.5">
                    친밀 결합 강도
                  </label>
                  <select
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-full bg-toss-bg dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs text-toss-text dark:text-zinc-200 cursor-pointer border-0 focus:ring-2 focus:ring-toss-blue/20"
                  >
                    <option value="1">Level 1 (단기 협업)</option>
                    <option value="2">Level 2 (공동 창작자)</option>
                    <option value="3">Level 3 (팀 시너지 코어)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-toss-bg dark:bg-zinc-800 hover:bg-[#E5E8EB] dark:hover:bg-zinc-750 text-toss-blue rounded-xl text-xs font-bold transition-all cursor-pointer border border-toss-border dark:border-zinc-700"
                >
                  관계 링크 개설
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* Database Visual Code Area */}
      <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 border border-toss-border dark:border-zinc-805 toss-shadow">
        <h4 className="text-sm font-bold text-toss-text dark:text-zinc-200 mb-3 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-toss-muted" />
          <span>현재 네트워크 데이터 마크다운 뷰어 (자동 갱신)</span>
        </h4>
        <pre className="w-full bg-toss-bg dark:bg-zinc-950 p-4 rounded-2xl text-[11px] font-mono text-[#4E5968] dark:text-zinc-400 overflow-x-auto max-h-72 leading-relaxed whitespace-pre font-semibold border border-toss-border dark:border-zinc-900">
          {compileDatabaseToMarkdown()}
        </pre>
      </div>

      {/* Modern custom modal for confirmation */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[28px] max-w-sm w-full p-6 border border-toss-border dark:border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3 text-rose-500">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-md font-extrabold text-toss-text dark:text-zinc-100">
                정말로 전체 초기화할까요?
              </h3>
            </div>
            
            <p className="text-xs text-[#4E5968] dark:text-zinc-400 leading-relaxed font-semibold mb-6">
              현재까지 구성된 모든 인물(동료) 리스트와 연결선 정보가 완전히 비워지게 됩니다. 이 동작은 복구할 수 없습니다. 정말 전체 초기화 작업을 수행할까요?
            </p>

            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-4.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  setShowConfirmReset(false);
                }}
                className="px-4.5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-500/25"
              >
                초기화 완료하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
