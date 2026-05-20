/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TalentNode {
  id: string; // 이름 (Unique ID)
  group: string; // 소속 분류 (예: "Me" | "Tech" | "Business" | "Design" | "Strategy" | "External")
  fields: string[]; // 핵심 분야 / 키워드 태그 (최대 5개 추천)
  fact: string; // Fact (경험, 성과, 객관적 이력)
  interpretation: string; // Interpretation (강점, 핵심 가치, 성격적 특성)
  strategicFit: string; // Strategic Fit (우리 조직/네트워크와의 시너지 및 활용 전략)
  energyCost: number; // 에너지 비용 (1: 매우 낮음/가까움 ~ 5: 매우 높음/멂)
  email?: string; // 이메일 (선택)
  phone?: string; // 연락처 (선택)
  
  // 물리 시뮬레이션용 좌표 (선택)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface TalentLink {
  source: string; // 출발점 노드 ID (이름)
  target: string; // 도착점 노드 ID (이름)
  relationshipType: string; // 관계 유형 (예: "프로젝트 협업", "은사/제자", "파트너", "기술 멘토")
  strength: number; // 친밀도/연결도 (1: 일반 ~ 3: 매우 깊음)
}

export interface Graph {
  id: string;
  name: string;
  nodes: TalentNode[];
  links: TalentLink[];
}

export type ActiveTab = 'directory' | 'network' | 'import-export';
