# 🧩 Project Combination Engine

> **전략적 인적자원 네트워크 분석 플랫폼** — 인재를 발굴하고, 관계망을 시각화하며, 최적의 팀 조합을 설계합니다.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square)

---

## 📖 개요

Project Combination Engine은 인재 네트워크를 체계적으로 관리하고 시각화하는 HR 분석 도구입니다. 개인별 역량 데이터를 등록하고, 구성원 간 관계망을 그래프로 탐색하며, AI 기반 자동 파싱으로 빠르게 인재 풀을 구축할 수 있습니다.

- **Toss 디자인 시스템** 기반의 깔끔한 UI/UX
- **다크 모드** 완전 지원
- **멀티 그래프** 워크스페이스로 프로젝트별 네트워크 분리 관리
- **localStorage** 기반 로컬 영속성 (별도 백엔드 불필요)

---

## ✨ 주요 기능

### 👥 인재 풀 (People Directory)
- 이름, 스킬, 키워드로 실시간 검색
- 그룹(Me / Tech / Design / Business / Strategy / External) 필터링
- 각 인물의 연결 관계 칩(chip)을 카드에서 바로 확인
- 카드 클릭 시 상세 분석 BottomSheet 열기

### 🌐 네트워크 맵 (Network Graph)
- 커스텀 물리 시뮬레이션(force-directed) 기반 관계망 시각화
- 드래그, 줌 인/아웃, 패닝 지원
- 노드 클릭으로 인물 상세 정보 열기
- 코어 노드("나")는 중앙에 고정되는 중력 앵커 역할

### 📊 역량 레이더 차트 (Radar Chart)
- 선택된 인물의 5가지 역량 지표 자동 산출
  - 전문성 (Expertise) — 등록된 스킬 분야 수
  - 시너지 (Synergy) — 연결 관계 수
  - 실행력 (Execution) — 이력(Fact) 정보 밀도
  - 전략 부합 (Strategic Fit) — 전략 임무 기술 깊이
  - 에너지 효율 (Efficiency) — 에너지 비용의 역수
- 인터랙티브 SVG, 툴팁 및 레전드 포함

### ➕ 인물 추가 (Add Node Modal)
두 가지 입력 방식 지원:

| 방식 | 설명 |
|------|------|
| **마크다운/YAML 파싱** | 텍스트를 붙여 넣으면 자동으로 필드 파싱 |
| **AI 자동 분석** | 자유형식 텍스트를 AI가 구조화된 인물 데이터로 변환 |
| **수동 입력** | 폼 기반 직접 입력 |

### ✏️ 인물 편집 (Bottom Sheet)
- 그룹, 스킬, 이력, 강점 해석, 전략 임무, 에너지 비용 수정
- 연락처(이메일, 전화번호) 저장
- 연결 관계 추가 및 삭제
- 인물 삭제 (코어 노드 "나"는 보호)

### 🗂️ 데이터 스튜디오 (Data Studio)
- 전체 네트워크 데이터를 마크다운 파일로 내보내기
- 마크다운/YAML 형식 일괄 가져오기
- 관계선 수동 생성 및 삭제
- 네트워크 초기화

### 🗃️ 멀티 그래프 관리 (Graph Manager)
- 복수의 독립 네트워크 워크스페이스 생성 (예: 학교, 해커톤, 사내)
- 워크스페이스 이름 변경 및 삭제
- 전환 즉시 해당 그래프의 노드·링크로 전환

---

## 🗂️ 프로젝트 구조

```
src/
├── components/
│   ├── AddNodeModal.tsx     # 인물 추가 모달 (마크다운/AI/수동)
│   ├── BottomSheet.tsx      # 인물 상세 패널 (편집/삭제/연결 관리)
│   ├── DataStudio.tsx       # 데이터 가져오기/내보내기
│   ├── GraphManager.tsx     # 멀티 그래프 워크스페이스 드롭다운
│   ├── NetworkGraph.tsx     # 커스텀 force-directed 그래프 시각화
│   ├── PeopleDirectory.tsx  # 인재 목록 및 검색/필터
│   ├── PersonCard.tsx       # 개인 카드 컴포넌트
│   └── RadarChart.tsx       # SVG 레이더 차트
├── context/
│   └── NetworkContext.tsx   # 전역 상태 관리 (노드, 링크, 그래프)
├── types/                   # TypeScript 타입 정의
├── utils/
│   └── parser.ts            # 마크다운/YAML 파싱 유틸리티
├── App.tsx                  # 앱 루트, 탭 라우팅, 헤더
└── main.tsx                 # React 진입점
```

---

## 🚀 시작하기

### 요구 사항

- Node.js 18+
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-repo/project-combination-engine.git
cd project-combination-engine

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

브라우저에서 `http://localhost:5173`을 열어 확인합니다.

### 빌드

```bash
npm run build
```

---

## 📝 인물 데이터 형식

인물을 마크다운/YAML 혼합 형식으로 입력하거나 가져올 수 있습니다.

```markdown
---
name: 홍길동
group: Tech
fields: 풀스택 개발, iOS, 클라우드 아키텍처
energy: 2
email: gildong@example.com
connection: 현지훈 (프로젝트 협업, 3)
---

# Fact (사실 및 이력)
• 5년 경력의 풀스택 엔지니어
• AWS Solutions Architect 자격 보유

# Interpretation (강점 해석)
• 기술적 문제를 빠르게 해결하는 실행가

# Strategic Fit (전략 임무)
• 백엔드 인프라 구축 및 MVP 초기 개발에 최적
```

### 그룹(Group) 분류

| 값 | 의미 | 색상 |
|----|------|------|
| `Me` | 나 (코어 노드) | 파란색 |
| `Tech` | 기술/개발 | 주황색 |
| `Design` | 디자인 | 분홍색 |
| `Business` | 비즈니스/기획 | 초록색 |
| `Strategy` | 전략/컨설팅 | 보라색 |
| `External` | 외부 협력자 | 회색 |

### 에너지 비용(Energy Cost)

1~5 척도로, 해당 인물과의 협업에 드는 비용/부담을 나타냅니다. 값이 낮을수록 에너지 효율 지표가 높게 반영됩니다.

---

## 🛠️ 기술 스택

| 분야 | 기술 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 스타일링 | Tailwind CSS (Toss 디자인 토큰) |
| 애니메이션 | Motion (Framer Motion) |
| 그래프 시각화 | 커스텀 Canvas/SVG + 물리 시뮬레이션 |
| 아이콘 | Lucide React |
| 상태 관리 | React Context API |
| 영속성 | localStorage |
| AI 파싱 | Anthropic Claude API |
| 빌드 도구 | Vite |

---

## 📄 라이선스

이 프로젝트는 [Apache License 2.0](LICENSE) 하에 배포됩니다.
