/** @license SPDX-License-Identifier: Apache-2.0 */
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
type Plan = "free" | "pro";
type StoredUser = { id: string; email: string; name: string; passwordHash: string; passwordSalt: string; plan: Plan; createdAt: string; aiUsage: { month: string; count: number } };
type Session = { userId: string; expiresAt: number };
const DATA_DIR = path.resolve(process.env.DATA_DIR || ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const COOKIE = "pce_session";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 14;
const sessions = new Map<string, Session>();
const attempts = new Map<string, { count: number; resetAt: number }>();
const limits = { free: { graphs: 2, peoplePerGraph: 25, aiPerMonth: 10 }, pro: { graphs: 100, peoplePerGraph: 1000, aiPerMonth: 300 } };
const monthKey = () => new Date().toISOString().slice(0, 7);
const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const publicUser = (user: StoredUser) => ({ id: user.id, email: user.email, name: user.name, plan: user.plan, limits: limits[user.plan], aiUsage: user.aiUsage.month === monthKey() ? user.aiUsage.count : 0 });

async function ensureStorage() {
  await fs.mkdir(path.join(DATA_DIR, "vaults"), { recursive: true });
  try { await fs.access(USERS_FILE); } catch { await fs.writeFile(USERS_FILE, "[]", { encoding: "utf8", mode: 0o600 }); }
}
async function readUsers(): Promise<StoredUser[]> { await ensureStorage(); return JSON.parse(await fs.readFile(USERS_FILE, "utf8")); }
async function writeUsers(users: StoredUser[]) { const temporary = `${USERS_FILE}.tmp`; await fs.writeFile(temporary, JSON.stringify(users, null, 2), { encoding: "utf8", mode: 0o600 }); await fs.rename(temporary, USERS_FILE); }
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key)));
async function passwordMatches(password: string, user: StoredUser) { const candidate = await scrypt(password, user.passwordSalt); const expected = Buffer.from(user.passwordHash, "hex"); return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected); }
function encryptionKey() { const secret = process.env.DATA_ENCRYPTION_KEY || process.env.SESSION_SECRET; if (!secret && process.env.NODE_ENV === "production") throw new Error("DATA_ENCRYPTION_KEY is required in production."); return crypto.createHash("sha256").update(secret || "pce-development-key-change-before-deploy").digest(); }
function encryptJson(value: unknown) { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv); const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]); return JSON.stringify({ v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") }); }
function decryptJson(raw: string) { const payload = JSON.parse(raw); const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(payload.iv, "base64")); decipher.setAuthTag(Buffer.from(payload.tag, "base64")); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8")); }
function cookies(request: Request) { return Object.fromEntries(String(request.headers.cookie || "").split(";").filter(Boolean).map(part => { const i = part.indexOf("="); return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1))]; })); }
function setSession(response: Response, userId: string) { const token = crypto.randomBytes(32).toString("base64url"); sessions.set(crypto.createHash("sha256").update(token).digest("hex"), { userId, expiresAt: Date.now() + SESSION_TTL }); response.cookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: SESSION_TTL, path: "/" }); }
function getSession(request: Request) { const token = cookies(request)[COOKIE]; if (!token) return null; const key = crypto.createHash("sha256").update(token).digest("hex"); const session = sessions.get(key); if (!session || session.expiresAt < Date.now()) { sessions.delete(key); return null; } return { key, ...session }; }
async function requireUser(request: Request, response: Response, next: NextFunction) { const session = getSession(request); if (!session) return response.status(401).json({ error: "로그인이 필요합니다." }); const user = (await readUsers()).find(item => item.id === session.userId); if (!user) return response.status(401).json({ error: "세션이 유효하지 않습니다." }); (request as any).user = user; next(); }
function validateGraphs(graphs: any, plan: Plan) { const planLimit = limits[plan]; if (!Array.isArray(graphs)) return "올바르지 않은 네트워크 데이터입니다."; if (graphs.length > planLimit.graphs) return `${plan === "free" ? "Free" : "Pro"} 요금제는 네트워크를 최대 ${planLimit.graphs}개까지 저장할 수 있습니다.`; if (graphs.some(graph => !Array.isArray(graph.nodes) || graph.nodes.length > planLimit.peoplePerGraph)) return `네트워크 하나에 인물을 최대 ${planLimit.peoplePerGraph}명까지 저장할 수 있습니다.`; if (Buffer.byteLength(JSON.stringify(graphs), "utf8") > 5_000_000) return "저장 데이터가 허용 크기를 초과했습니다."; return null; }
function sameOrigin(request: Request, response: Response, next: NextFunction) { if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next(); const origin = request.headers.origin; const host = request.headers.host; if (origin && host && new URL(origin).host !== host) return response.status(403).json({ error: "허용되지 않은 요청입니다." }); next(); }

async function startServer() {
  await ensureStorage();
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  app.disable("x-powered-by");
  app.use((_, response, next) => { response.setHeader("X-Content-Type-Options", "nosniff"); response.setHeader("Referrer-Policy", "no-referrer"); response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()"); response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline'; connect-src 'self'"); next(); });
  app.use(express.json({ limit: "1mb" }));
  app.use(sameOrigin);

  app.post("/api/auth/register", async (request, response) => {
    const email = normalizeEmail(request.body.email); const name = String(request.body.name || "").trim().slice(0, 30); const password = String(request.body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 10) return response.status(400).json({ error: "이름, 올바른 이메일, 10자 이상의 비밀번호를 입력해주세요." });
    const users = await readUsers(); if (users.some(user => user.email === email)) return response.status(409).json({ error: "이미 가입된 이메일입니다." });
    const salt = crypto.randomBytes(16).toString("hex"); const passwordHash = (await scrypt(password, salt)).toString("hex");
    const user: StoredUser = { id: crypto.randomUUID(), email, name, passwordHash, passwordSalt: salt, plan: "free", createdAt: new Date().toISOString(), aiUsage: { month: monthKey(), count: 0 } };
    users.push(user); await writeUsers(users); setSession(response, user.id); response.status(201).json(publicUser(user));
  });
  app.post("/api/auth/login", async (request, response) => {
    const key = request.ip || "unknown"; const attempt = attempts.get(key); if (attempt && attempt.resetAt > Date.now() && attempt.count >= 8) return response.status(429).json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." });
    const user = (await readUsers()).find(item => item.email === normalizeEmail(request.body.email));
    if (!user || !(await passwordMatches(String(request.body.password || ""), user))) { attempts.set(key, { count: attempt?.resetAt && attempt.resetAt > Date.now() ? attempt.count + 1 : 1, resetAt: Date.now() + 15 * 60 * 1000 }); return response.status(401).json({ error: "이메일 또는 비밀번호를 확인해주세요." }); }
    attempts.delete(key); setSession(response, user.id); response.json(publicUser(user));
  });
  app.post("/api/auth/logout", (request, response) => { const session = getSession(request); if (session) sessions.delete(session.key); response.clearCookie(COOKIE, { path: "/" }); response.status(204).end(); });
  app.get("/api/auth/me", requireUser, (request, response) => response.json(publicUser((request as any).user)));

  app.get("/api/vault", requireUser, async (request, response) => { const user = (request as any).user as StoredUser; try { response.json(decryptJson(await fs.readFile(path.join(DATA_DIR, "vaults", `${user.id}.vault`), "utf8"))); } catch (error: any) { if (error.code === "ENOENT") response.json({ graphs: [], activeGraphId: "" }); else response.status(500).json({ error: "암호화 저장소를 읽지 못했습니다." }); } });
  app.put("/api/vault", requireUser, async (request, response) => { const user = (request as any).user as StoredUser; const error = validateGraphs(request.body.graphs, user.plan); if (error) return response.status(403).json({ error, code: "PLAN_LIMIT" }); await fs.writeFile(path.join(DATA_DIR, "vaults", `${user.id}.vault`), encryptJson({ graphs: request.body.graphs, activeGraphId: request.body.activeGraphId }), { encoding: "utf8", mode: 0o600 }); response.status(204).end(); });
  app.delete("/api/account", requireUser, async (request, response) => { const user = (request as any).user as StoredUser; await writeUsers((await readUsers()).filter(item => item.id !== user.id)); await fs.rm(path.join(DATA_DIR, "vaults", `${user.id}.vault`), { force: true }); for (const [key, session] of sessions) if (session.userId === user.id) sessions.delete(key); response.clearCookie(COOKIE, { path: "/" }); response.status(204).end(); });
  app.get("/api/billing", requireUser, (_, response) => response.json({ free: { price: 0, ...limits.free }, pro: { price: 9900, ...limits.pro }, checkoutUrl: process.env.PRO_CHECKOUT_URL || null }));
  app.post("/api/billing/webhook", async (request, response) => {
    const configured = process.env.BILLING_WEBHOOK_SECRET || "";
    const provided = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const valid = configured.length > 0 && configured.length === provided.length && crypto.timingSafeEqual(Buffer.from(configured), Buffer.from(provided));
    if (!valid) return response.status(401).json({ error: "유효하지 않은 결제 웹훅입니다." });
    const email = normalizeEmail(request.body.email); const nextPlan: Plan = request.body.active === true ? "pro" : "free";
    const users = await readUsers(); const user = users.find(item => item.email === email);
    if (!user) return response.status(404).json({ error: "결제 계정과 일치하는 사용자가 없습니다." });
    user.plan = nextPlan; await writeUsers(users); response.json({ ok: true, plan: nextPlan });
  });

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "project-combination-engine" } } });
  app.post("/api/parse-text", requireUser, async (request, response) => {
    try {
      const user = (request as any).user as StoredUser; const rawText = String(request.body.rawText || "").trim();
      if (!rawText) return response.status(400).json({ error: "분석할 내용을 입력해주세요." }); if (rawText.length > 20_000) return response.status(413).json({ error: "한 번에 분석할 수 있는 글자 수를 초과했습니다." }); if (!apiKey) return response.status(503).json({ error: "AI 분석 기능이 아직 설정되지 않았습니다." });
      if (user.aiUsage.month !== monthKey()) user.aiUsage = { month: monthKey(), count: 0 }; if (user.aiUsage.count >= limits[user.plan].aiPerMonth) return response.status(403).json({ error: "이번 달 AI 분석 한도를 모두 사용했습니다.", code: "PLAN_LIMIT" });
      const generated = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || "gemini-3.5-flash", contents: rawText, config: { systemInstruction: "너는 인적자원 데이터 분석 AI다. 입력 정보는 결과 생성에만 사용하고 없는 개인정보를 추측하지 않는다. 간결한 한국어로 지정된 JSON 배열만 응답한다.", responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, fields: { type: Type.ARRAY, items: { type: Type.STRING } }, stats: { type: Type.OBJECT, properties: { execution: { type: Type.INTEGER }, research: { type: Type.INTEGER }, founder: { type: Type.INTEGER }, international: { type: Type.INTEGER } }, required: ["execution", "research", "founder", "international"] }, energy_cost: { type: Type.STRING }, email: { type: Type.STRING }, phone: { type: Type.STRING }, fact: { type: Type.STRING }, interpretation: { type: Type.STRING }, strategic_fit: { type: Type.STRING }, connections: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["id", "name", "fields", "stats", "energy_cost", "email", "phone", "fact", "interpretation", "strategic_fit", "connections"] } } } });
      if (!generated.text) throw new Error("empty response"); const users = await readUsers(); const stored = users.find(item => item.id === user.id)!; if (stored.aiUsage.month !== monthKey()) stored.aiUsage = { month: monthKey(), count: 0 }; stored.aiUsage.count += 1; await writeUsers(users); response.json(JSON.parse(generated.text));
    } catch (error) { console.error("AI parser exception", error); response.status(500).json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }); }
  });

  if (process.env.NODE_ENV !== "production") { const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" }); app.use(vite.middlewares); }
  else { const distPath = path.join(process.cwd(), "dist"); app.use(express.static(distPath)); app.get("*", (_, response) => response.sendFile(path.join(distPath, "index.html"))); }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server ready on http://localhost:${PORT}`));
}
startServer().catch(error => { console.error(error); process.exit(1); });
