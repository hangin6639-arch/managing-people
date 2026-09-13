var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var DATA_DIR = import_path.default.resolve(process.env.DATA_DIR || ".data");
var USERS_FILE = import_path.default.join(DATA_DIR, "users.json");
var COOKIE = "pce_session";
var SESSION_TTL = 1e3 * 60 * 60 * 24 * 14;
var sessions = /* @__PURE__ */ new Map();
var attempts = /* @__PURE__ */ new Map();
var limits = { free: { graphs: 2, peoplePerGraph: 25, aiPerMonth: 10 }, pro: { graphs: 100, peoplePerGraph: 1e3, aiPerMonth: 300 } };
var monthKey = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
var normalizeEmail = (value) => String(value || "").trim().toLowerCase();
var publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, plan: user.plan, limits: limits[user.plan], aiUsage: user.aiUsage.month === monthKey() ? user.aiUsage.count : 0 });
async function ensureStorage() {
  await import_promises.default.mkdir(import_path.default.join(DATA_DIR, "vaults"), { recursive: true });
  try {
    await import_promises.default.access(USERS_FILE);
  } catch {
    await import_promises.default.writeFile(USERS_FILE, "[]", { encoding: "utf8", mode: 384 });
  }
}
async function readUsers() {
  await ensureStorage();
  return JSON.parse(await import_promises.default.readFile(USERS_FILE, "utf8"));
}
async function writeUsers(users) {
  const temporary = `${USERS_FILE}.tmp`;
  await import_promises.default.writeFile(temporary, JSON.stringify(users, null, 2), { encoding: "utf8", mode: 384 });
  await import_promises.default.rename(temporary, USERS_FILE);
}
var scrypt = (password, salt) => new Promise((resolve, reject) => import_crypto.default.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key)));
async function passwordMatches(password, user) {
  const candidate = await scrypt(password, user.passwordSalt);
  const expected = Buffer.from(user.passwordHash, "hex");
  return candidate.length === expected.length && import_crypto.default.timingSafeEqual(candidate, expected);
}
function encryptionKey() {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("DATA_ENCRYPTION_KEY is required in production.");
  return import_crypto.default.createHash("sha256").update(secret || "pce-development-key-change-before-deploy").digest();
}
function encryptJson(value) {
  const iv = import_crypto.default.randomBytes(12);
  const cipher = import_crypto.default.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") });
}
function decryptJson(raw) {
  const payload = JSON.parse(raw);
  const decipher = import_crypto.default.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]).toString("utf8"));
}
function cookies(request) {
  return Object.fromEntries(String(request.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const i = part.indexOf("=");
    return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1))];
  }));
}
function setSession(response, userId) {
  const token = import_crypto.default.randomBytes(32).toString("base64url");
  sessions.set(import_crypto.default.createHash("sha256").update(token).digest("hex"), { userId, expiresAt: Date.now() + SESSION_TTL });
  response.cookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: SESSION_TTL, path: "/" });
}
function getSession(request) {
  const token = cookies(request)[COOKIE];
  if (!token) return null;
  const key = import_crypto.default.createHash("sha256").update(token).digest("hex");
  const session = sessions.get(key);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(key);
    return null;
  }
  return { key, ...session };
}
async function requireUser(request, response, next) {
  const session = getSession(request);
  if (!session) return response.status(401).json({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." });
  const user = (await readUsers()).find((item) => item.id === session.userId);
  if (!user) return response.status(401).json({ error: "\uC138\uC158\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." });
  request.user = user;
  next();
}
function validateGraphs(graphs, plan) {
  const planLimit = limits[plan];
  if (!Array.isArray(graphs)) return "\uC62C\uBC14\uB974\uC9C0 \uC54A\uC740 \uB124\uD2B8\uC6CC\uD06C \uB370\uC774\uD130\uC785\uB2C8\uB2E4.";
  if (graphs.length > planLimit.graphs) return `${plan === "free" ? "Free" : "Pro"} \uC694\uAE08\uC81C\uB294 \uB124\uD2B8\uC6CC\uD06C\uB97C \uCD5C\uB300 ${planLimit.graphs}\uAC1C\uAE4C\uC9C0 \uC800\uC7A5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`;
  if (graphs.some((graph) => !Array.isArray(graph.nodes) || graph.nodes.length > planLimit.peoplePerGraph)) return `\uB124\uD2B8\uC6CC\uD06C \uD558\uB098\uC5D0 \uC778\uBB3C\uC744 \uCD5C\uB300 ${planLimit.peoplePerGraph}\uBA85\uAE4C\uC9C0 \uC800\uC7A5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`;
  if (Buffer.byteLength(JSON.stringify(graphs), "utf8") > 5e6) return "\uC800\uC7A5 \uB370\uC774\uD130\uAC00 \uD5C8\uC6A9 \uD06C\uAE30\uB97C \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4.";
  return null;
}
function sameOrigin(request, response, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin && host && new URL(origin).host !== host) return response.status(403).json({ error: "\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uC694\uCCAD\uC785\uB2C8\uB2E4." });
  next();
}
async function startServer() {
  await ensureStorage();
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT || 3e3);
  app.disable("x-powered-by");
  app.use((_, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline'; connect-src 'self'");
    next();
  });
  app.use(import_express.default.json({ limit: "1mb" }));
  app.use(sameOrigin);
  app.post("/api/auth/register", async (request, response) => {
    const email = normalizeEmail(request.body.email);
    const name = String(request.body.name || "").trim().slice(0, 30);
    const password = String(request.body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 10) return response.status(400).json({ error: "\uC774\uB984, \uC62C\uBC14\uB978 \uC774\uBA54\uC77C, 10\uC790 \uC774\uC0C1\uC758 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." });
    const users = await readUsers();
    if (users.some((user2) => user2.email === email)) return response.status(409).json({ error: "\uC774\uBBF8 \uAC00\uC785\uB41C \uC774\uBA54\uC77C\uC785\uB2C8\uB2E4." });
    const salt = import_crypto.default.randomBytes(16).toString("hex");
    const passwordHash = (await scrypt(password, salt)).toString("hex");
    const user = { id: import_crypto.default.randomUUID(), email, name, passwordHash, passwordSalt: salt, plan: "free", createdAt: (/* @__PURE__ */ new Date()).toISOString(), aiUsage: { month: monthKey(), count: 0 } };
    users.push(user);
    await writeUsers(users);
    setSession(response, user.id);
    response.status(201).json(publicUser(user));
  });
  app.post("/api/auth/login", async (request, response) => {
    const key = request.ip || "unknown";
    const attempt = attempts.get(key);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= 8) return response.status(429).json({ error: "\uB85C\uADF8\uC778 \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694." });
    const user = (await readUsers()).find((item) => item.email === normalizeEmail(request.body.email));
    if (!user || !await passwordMatches(String(request.body.password || ""), user)) {
      attempts.set(key, { count: attempt?.resetAt && attempt.resetAt > Date.now() ? attempt.count + 1 : 1, resetAt: Date.now() + 15 * 60 * 1e3 });
      return response.status(401).json({ error: "\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694." });
    }
    attempts.delete(key);
    setSession(response, user.id);
    response.json(publicUser(user));
  });
  app.post("/api/auth/logout", (request, response) => {
    const session = getSession(request);
    if (session) sessions.delete(session.key);
    response.clearCookie(COOKIE, { path: "/" });
    response.status(204).end();
  });
  app.get("/api/auth/me", requireUser, (request, response) => response.json(publicUser(request.user)));
  app.get("/api/vault", requireUser, async (request, response) => {
    const user = request.user;
    try {
      response.json(decryptJson(await import_promises.default.readFile(import_path.default.join(DATA_DIR, "vaults", `${user.id}.vault`), "utf8")));
    } catch (error) {
      if (error.code === "ENOENT") response.json({ graphs: [], activeGraphId: "" });
      else response.status(500).json({ error: "\uC554\uD638\uD654 \uC800\uC7A5\uC18C\uB97C \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." });
    }
  });
  app.put("/api/vault", requireUser, async (request, response) => {
    const user = request.user;
    const error = validateGraphs(request.body.graphs, user.plan);
    if (error) return response.status(403).json({ error, code: "PLAN_LIMIT" });
    await import_promises.default.writeFile(import_path.default.join(DATA_DIR, "vaults", `${user.id}.vault`), encryptJson({ graphs: request.body.graphs, activeGraphId: request.body.activeGraphId }), { encoding: "utf8", mode: 384 });
    response.status(204).end();
  });
  app.delete("/api/account", requireUser, async (request, response) => {
    const user = request.user;
    await writeUsers((await readUsers()).filter((item) => item.id !== user.id));
    await import_promises.default.rm(import_path.default.join(DATA_DIR, "vaults", `${user.id}.vault`), { force: true });
    for (const [key, session] of sessions) if (session.userId === user.id) sessions.delete(key);
    response.clearCookie(COOKIE, { path: "/" });
    response.status(204).end();
  });
  app.get("/api/billing", requireUser, (_, response) => response.json({ free: { price: 0, ...limits.free }, pro: { price: 9900, ...limits.pro }, checkoutUrl: process.env.PRO_CHECKOUT_URL || null }));
  app.post("/api/billing/webhook", async (request, response) => {
    const configured = process.env.BILLING_WEBHOOK_SECRET || "";
    const provided = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const valid = configured.length > 0 && configured.length === provided.length && import_crypto.default.timingSafeEqual(Buffer.from(configured), Buffer.from(provided));
    if (!valid) return response.status(401).json({ error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uACB0\uC81C \uC6F9\uD6C5\uC785\uB2C8\uB2E4." });
    const email = normalizeEmail(request.body.email);
    const nextPlan = request.body.active === true ? "pro" : "free";
    const users = await readUsers();
    const user = users.find((item) => item.email === email);
    if (!user) return response.status(404).json({ error: "\uACB0\uC81C \uACC4\uC815\uACFC \uC77C\uCE58\uD558\uB294 \uC0AC\uC6A9\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." });
    user.plan = nextPlan;
    await writeUsers(users);
    response.json({ ok: true, plan: nextPlan });
  });
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new import_genai.GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "project-combination-engine" } } });
  app.post("/api/parse-text", requireUser, async (request, response) => {
    try {
      const user = request.user;
      const rawText = String(request.body.rawText || "").trim();
      if (!rawText) return response.status(400).json({ error: "\uBD84\uC11D\uD560 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." });
      if (rawText.length > 2e4) return response.status(413).json({ error: "\uD55C \uBC88\uC5D0 \uBD84\uC11D\uD560 \uC218 \uC788\uB294 \uAE00\uC790 \uC218\uB97C \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4." });
      if (!apiKey) return response.status(503).json({ error: "AI \uBD84\uC11D \uAE30\uB2A5\uC774 \uC544\uC9C1 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
      if (user.aiUsage.month !== monthKey()) user.aiUsage = { month: monthKey(), count: 0 };
      if (user.aiUsage.count >= limits[user.plan].aiPerMonth) return response.status(403).json({ error: "\uC774\uBC88 \uB2EC AI \uBD84\uC11D \uD55C\uB3C4\uB97C \uBAA8\uB450 \uC0AC\uC6A9\uD588\uC2B5\uB2C8\uB2E4.", code: "PLAN_LIMIT" });
      const generated = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || "gemini-3.5-flash", contents: rawText, config: { systemInstruction: "\uB108\uB294 \uC778\uC801\uC790\uC6D0 \uB370\uC774\uD130 \uBD84\uC11D AI\uB2E4. \uC785\uB825 \uC815\uBCF4\uB294 \uACB0\uACFC \uC0DD\uC131\uC5D0\uB9CC \uC0AC\uC6A9\uD558\uACE0 \uC5C6\uB294 \uAC1C\uC778\uC815\uBCF4\uB97C \uCD94\uCE21\uD558\uC9C0 \uC54A\uB294\uB2E4. \uAC04\uACB0\uD55C \uD55C\uAD6D\uC5B4\uB85C \uC9C0\uC815\uB41C JSON \uBC30\uC5F4\uB9CC \uC751\uB2F5\uD55C\uB2E4.", responseMimeType: "application/json", responseSchema: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.OBJECT, properties: { id: { type: import_genai.Type.STRING }, name: { type: import_genai.Type.STRING }, fields: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } }, stats: { type: import_genai.Type.OBJECT, properties: { execution: { type: import_genai.Type.INTEGER }, research: { type: import_genai.Type.INTEGER }, founder: { type: import_genai.Type.INTEGER }, international: { type: import_genai.Type.INTEGER } }, required: ["execution", "research", "founder", "international"] }, energy_cost: { type: import_genai.Type.STRING }, email: { type: import_genai.Type.STRING }, phone: { type: import_genai.Type.STRING }, fact: { type: import_genai.Type.STRING }, interpretation: { type: import_genai.Type.STRING }, strategic_fit: { type: import_genai.Type.STRING }, connections: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } } }, required: ["id", "name", "fields", "stats", "energy_cost", "email", "phone", "fact", "interpretation", "strategic_fit", "connections"] } } } });
      if (!generated.text) throw new Error("empty response");
      const users = await readUsers();
      const stored = users.find((item) => item.id === user.id);
      if (stored.aiUsage.month !== monthKey()) stored.aiUsage = { month: monthKey(), count: 0 };
      stored.aiUsage.count += 1;
      await writeUsers(users);
      response.json(JSON.parse(generated.text));
    } catch (error) {
      console.error("AI parser exception", error);
      response.status(500).json({ error: "AI \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_, response) => response.sendFile(import_path.default.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server ready on http://localhost:${PORT}`));
}
startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
/** @license SPDX-License-Identifier: Apache-2.0 */
//# sourceMappingURL=server.cjs.map
