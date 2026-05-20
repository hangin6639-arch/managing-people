/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TalentNode } from '../types';

interface ParsedResult {
  node: Partial<TalentNode>;
  connection?: {
    targetId: string;
    relationshipType: string;
    strength: number;
  };
}

/**
 * Parses markdown text (optionally containing YAML front-matter) and extracts TalentNode fields.
 */
export function parseMarkdownToTalent(text: string): ParsedResult {
  const result: Partial<TalentNode> = {
    id: '',
    group: 'Tech', // 기본값
    fields: [],
    fact: '',
    interpretation: '',
    strategicFit: '',
    energyCost: 3, // 기본값 중간
    email: '',
    phone: '',
  };

  let connection: { targetId: string; relationshipType: string; strength: number } | undefined = undefined;

  if (!text || text.trim() === '') {
    return { node: result };
  }

  // 1. YAML front-matter parsing (if matches --- ... ---)
  const yamlMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  let cleanText = text;
  
  if (yamlMatch) {
    const yamlContent = yamlMatch[1];
    cleanText = text.substring(yamlMatch[0].length); // YAML 제외한 나머지 부분
    
    // Simple YAML line reader
    const lines = yamlContent.split('\n');
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();
        
        if (key === 'name' || key === 'id' || key === '이름') {
          result.id = val.replace(/['"]/g, '');
        } else if (key === 'group' || key === '소속' || key === '분류') {
          result.group = val.replace(/['"]/g, '');
        } else if (key === 'fields' || key === '분야' || key === '키워드' || key === '태그') {
          // split commas, remove brackets
          const cleanVal = val.replace(/[\[\]'"]/g, '');
          result.fields = cleanVal.split(',').map(s => s.trim()).filter(Boolean);
        } else if (key === 'energy' || key === 'energycost' || key === '에너지' || key === '비용') {
          const num = parseInt(val, 10);
          if (!isNaN(num)) result.energyCost = Math.max(1, Math.min(5, num));
        } else if (key === 'email' || key === '이메일') {
          result.email = val.replace(/['"]/g, '');
        } else if (key === 'phone' || key === '연락처' || key === '전화번호') {
          result.phone = val.replace(/['"]/g, '');
        } else if (key === 'connection' || key === '연결' || key === '관계') {
          // Format could be: "이름 (관계타입, 친밀도)" or just "이름"
          // e.g. "현지훈 (동료, 3)"
          const connVal = val.replace(/['"]/g, '');
          const connMatch = connVal.match(/^([^\s(]+)\s*(?:\(([^,)]+)(?:\s*,\s*(\d+))?\))?/);
          if (connMatch) {
            connection = {
              targetId: connMatch[1].trim(),
              relationshipType: connMatch[2] ? connMatch[2].trim() : '이웃',
              strength: connMatch[3] ? parseInt(connMatch[3], 10) : 2
            };
          }
        }
      }
    });
  }

  // 2. Headings and line-by-line parsing for regular markdown fields
  // Split cleanText into headings/sections
  const lines = cleanText.split('\n');
  let currentHeader = '';
  let contentBuffer: string[] = [];

  const flushBuffer = () => {
    if (!currentHeader) return;
    const sectionContent = contentBuffer.join('\n').trim();
    if (!sectionContent) return;

    const normalizedHeader = currentHeader.toLowerCase().replace(/\s+/g, '');
    
    if (normalizedHeader.includes('fact') || normalizedHeader.includes('사실') || normalizedHeader.includes('이력') || normalizedHeader.includes('경험')) {
      result.fact = sectionContent;
    } else if (normalizedHeader.includes('interpretation') || normalizedHeader.includes('해석') || normalizedHeader.includes('강점') || normalizedHeader.includes('특성')) {
      result.interpretation = sectionContent;
    } else if (normalizedHeader.includes('strategicfit') || normalizedHeader.includes('전략적적합도') || normalizedHeader.includes('조직전략') || normalizedHeader.includes('시너지')) {
      result.strategicFit = sectionContent;
    } else if (!result.id && (normalizedHeader.includes('이름') || normalizedHeader.includes('name'))) {
      result.id = sectionContent;
    } else if (result.fields.length === 0 && (normalizedHeader.includes('분야') || normalizedHeader.includes('fields') || normalizedHeader.includes('태그') || normalizedHeader.includes('특기'))) {
      result.fields = sectionContent.split(/[,\n]/).map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
    }
    contentBuffer = [];
  };

  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Heading match like # 이름 or ## 사실
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushBuffer();
      currentHeader = headingMatch[2].trim();
    } else {
      // Also look for simple patterns like "**이름:** 홍길동" or "강점: 핵심 개발"
      const inlineMatch = trimmedLine.match(/^\*?\*?(이름|Name|소속|Group|태그|Fields|핵심분야|에너지비용|에너지|Energy|연결|관계|이메일|Email|연락처|Phone)\*?\*?\s*:\s*(.+)$/i);
      if (inlineMatch) {
        const key = inlineMatch[1].toLowerCase();
        const val = inlineMatch[2].trim();
        
        if (key === '이름' || key === 'name') {
          if (!result.id) result.id = val;
        } else if (key === '소속' || key === 'group') {
          result.group = val;
        } else if (key === '태그' || key === 'fields' || key === '핵심분야') {
          if (result.fields.length === 0) {
            result.fields = val.split(',').map(s => s.trim()).filter(Boolean);
          }
        } else if (key === '에너지' || key === '에너지비용' || key === 'energy') {
          const num = parseInt(val, 10);
          if (!isNaN(num)) result.energyCost = Math.max(1, Math.min(5, num));
        } else if (key === '이메일' || key === 'email') {
          result.email = val;
        } else if (key === '연락처' || key === 'phone') {
          result.phone = val;
        } else if (key === '관계' || key === '연결') {
          if (!connection) {
            const connMatch = val.match(/^([^\s(]+)\s*(?:\(([^,)]+)(?:\s*,\s*(\d+))?\))?/);
            if (connMatch) {
              connection = {
                targetId: connMatch[1].trim(),
                relationshipType: connMatch[2] ? connMatch[2].trim() : '이웃',
                strength: connMatch[3] ? parseInt(connMatch[3], 10) : 2
              };
            }
          }
        }
      } else {
        contentBuffer.push(line);
      }
    }
  });

  // Flush remaining buffer
  flushBuffer();

  // Clean values
  if (result.id) {
    result.id = result.id.replace(/^[-\s*+]+/, '').trim();
  }

  return { node: result, connection };
}

/**
 * Returns a template markdown text that the user can copy & paste.
 */
export function getMarkdownTemplate(targetList: string[] = ['현지훈']): string {
  const targetName = targetList.includes('현지훈') ? '현지훈' : (targetList[0] || '현지훈');
  return `---
name: 김동현
group: Design
fields: UI디자인, 인터랙션, 토스스타일, 피그마
energy: 2
email: dh.kim@toss.im
phone: 010-1234-5678
connection: ${targetName} (UX협업, 3)
---

# Fact (사실 및 이력)
- 토스에서 3년간 코어 금융 UI/UX 디자인 리드 담당.
- 둥글고 부드러운 버튼 셰이프와 햅틱 인터랙션을 설계함.
- 연간 20개 이상의 대형 컴포넌트 라이브러리 고도화 달성.

# Interpretation (해석 및 인재 특징)
- 극도의 세밀함이 돋보이는 디테일 오리엔티드 스타일.
- 사용자의 맥락에 맞추어 버튼 위치 하나까지 검증하는 꼼꼼함.
- 어려운 기능 요소를 단순하고 직관적으로 녹여내는 능력이 강함.

# Strategic Fit (전략적 적합도)
- 프로젝트 콤비네이션 엔진의 프론트엔드 모션 개발 파트 및 디자인 시스템 가이드라인 수립에 즉시 투입 가능한 S급 파트너.
- 현지훈(나)의 전략 기획 능력과 아주 뛰어난 시각적 보완 관계를 형성할 수 있음.
`;
}
