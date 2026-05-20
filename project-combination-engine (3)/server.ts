/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON request parser
  app.use(express.json());

  // Shared Gemini client on the server with recommended standard properties
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint to parse plain text / natural language with Gemini API
  app.post("/api/parse-text", async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: "분석할 자연어 설명 내용을 입력해주세요." });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY 환경 변수가 제공되지 않았습니다. Settings > Secrets 패널을 확인해보세요." 
        });
      }

      const systemInstruction = `너는 인적자원 데이터를 분석하는 AI야. 사용자의 입력글에서 인물들의 정보를 추출하여 다음 JSON 배열 형식으로만 응답해. 마크다운 코드블록(\`\`\`json) 없이 순수 JSON만 출력할 것.
응답 데이터 명세:
- "id": 이름 또는 유니크 식별자
- "name": 이름
- "fields": 해당 인물에 연관성 높은 최대 5개 관심 분야 및 키워드 태그 어레이
- "stats": 실행/분석/창업성향/글로벌 각각 1~100 점수 배정
- "energy_cost": "Low" / "Med" / "High" 중 하나 선택 (친밀 관계 분석 등 기준)
- "email": 텍스트 내 이메일 주소 기재 (없으면 "")
- "phone": 텍스트 내 연락처 기재 (없으면 "")
- "fact": 이력 성과/전공 등을 요약한 객관적 사실 요약 (대화 내용 및 한글 덤프 기반)
- "interpretation": 어조, 실행력, 평판 등을 조합한 성격 및 잠재력 정성 해석
- "strategic_fit": 우리 조직에서 어떤 역할/강점을 발휘할 것인지를 분석 요약
- "connections": 줄글 분석 중 서로 아는 사이라고 명시되어 있거나, 상호 유기적 연결 관계를 가진 타인의 이름(id) 목록.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `다음 줄글 덤프를 기반으로 인물 및 관계망 데이터를 완벽하고 객관적으로 분석하여 JSON 배열로 출력하라:\n\n"${rawText}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "인물의 유니크한 이름" },
                name: { type: Type.STRING, description: "인물의 이름" },
                fields: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "핵심 분야/이력/관심태그 키워드 목록 (최대 5개)"
                },
                stats: {
                  type: Type.OBJECT,
                  properties: {
                    execution: { type: Type.INTEGER, description: "행동 및 개발/실행력 (1~100)" },
                    research: { type: Type.INTEGER, description: "연구/이론 분석력 (1~100)" },
                    founder: { type: Type.INTEGER, description: "기획/비즈니스 창업주의 성향 (1~100)" },
                    international: { type: Type.INTEGER, description: "글로벌 비즈니스 및 외국어 역량 (1~100)" }
                  },
                  required: ["execution", "research", "founder", "international"]
                },
                energy_cost: {
                  type: Type.STRING,
                  description: "에너지 비용 (Low, Med, High 중 하나)"
                },
                email: { type: Type.STRING, description: "이메일 또는 빈 값" },
                phone: { type: Type.STRING, description: "전화번호 또는 빈 값" },
                fact: { type: Type.STRING, description: "경험/자격증/주요 이력 사실 관계 정리" },
                interpretation: { type: Type.STRING, description: "정성적 인재 성격 및 지향 해석" },
                strategic_fit: { type: Type.STRING, description: "어떤 프로젝트나 포지션에 적합한지 상세 요약" },
                connections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "이 인물과 아는 사이이거나 연관된 인물 이름(id) 목록"
                }
              },
              required: [
                "id", "name", "fields", "stats", "energy_cost",
                "email", "phone", "fact", "interpretation", "strategic_fit", "connections"
              ]
            }
          }
        }
      });

      const parsedText = response.text;
      if (!parsedText) {
        throw new Error("AI 응답을 구성할 수 없습니다. 다시 시도해 주세요.");
      }

      const parsedData = JSON.parse(parsedText);
      return res.json(parsedData);

    } catch (err: any) {
      console.error("AI Parser server exception:", err);
      return res.status(500).json({ 
        error: err.message || "자연어 분석 과정 중 알 수 없는 파서 오류가 발생했습니다." 
      });
    }
  });

  // Vite integrated middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Node Server booted up on http://localhost:${PORT}`);
  });
}

startServer();
