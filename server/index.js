import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { stmt, ensureUserData } from "./db.js";

import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "prepforge_secret_change_in_prod";
const upload = multer({ dest: path.join(__dirname, "uploads") });

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── High-Speed Groq AI Engine (<1s response times) ───────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL   = process.env.GROQ_MODEL   || "openai/gpt-oss-120b";
const GROQ_MODELS  = [GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

function detectTechStack(resumeText = "", jdText = "", targetRole = "", branch = "") {
  const combined = `${targetRole} ${branch} ${resumeText} ${jdText}`.toLowerCase();
  const KNOWN_TECHS = [
    "Python", "Java", "C++", "C#", "Golang", "Go", "Rust", "TypeScript", "JavaScript", "PHP", "Ruby", "Swift", "Kotlin", "Scala", "Dart", "C",
    "React", "Next.js", "Vue", "Angular", "Svelte", "HTML5", "CSS3", "Tailwind CSS", "Redux", "Flutter", "React Native",
    "Node.js", "Express", "Django", "FastAPI", "Flask", "Spring Boot", "Spring", ".NET", "ASP.NET", "Laravel", "Ruby on Rails", "NestJS",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "SQLite", "Oracle", "DynamoDB", "Prisma",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Jenkins", "Ansible", "Nginx",
    "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "Data Science", "LLM", "NLP", "OpenCV",
    "Microservices", "System Design", "REST APIs", "GraphQL", "gRPC", "Apache Kafka", "RabbitMQ", "Distributed Systems", "WebSockets"
  ];
  const detected = [];
  for (const tech of KNOWN_TECHS) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9+#.-])${escaped}([^a-zA-Z0-9+#.-]|$)`, 'i');
    if (regex.test(combined)) detected.push(tech);
  }
  return detected;
}

async function askAI(prompt, maxTokens = 1800, jsonMode = false, systemContent = null, temp = 0.65) {
  if (!GROQ_API_KEY || !GROQ_API_KEY.startsWith("gsk_")) {
    return { ok: false, error: "GROQ_API_KEY not configured or invalid." };
  }

  const models = [...new Set(GROQ_MODELS)];
  let lastError = "Unknown error";
  const defaultSystem = jsonMode
    ? "You are an aptitude question generator. Output ONLY a valid JSON object. Never output markdown fences or reasoning text outside the JSON."
    : "You are an expert Principal Technical Interviewer and career mentor for PrepForge. Be strictly technical, precise, and never generate generic boilerplate.";

  for (const m of models) {
    try {
      const tokenCap = m.includes("qwen") ? Math.min(maxTokens, 850) : maxTokens;
      const body = {
        model: m,
        messages: [
          { role: "system", content: systemContent || defaultSystem },
          { role: "user", content: prompt }
        ],
        max_tokens: tokenCap,
        temperature: temp
      };
      if (jsonMode) body.response_format = { type: "json_object" };

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        signal: AbortSignal.timeout(18000),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        lastError = data?.error?.message || `HTTP ${res.status}`;
        console.warn(`[Groq] Model ${m} error:`, lastError);
        continue;
      }
      const choice = data?.choices?.[0]?.message;
      const text = (choice?.content && choice.content.trim()) ? choice.content : (choice?.reasoning || "");
      if (text) {
        return { ok: true, text, provider: "groq", model: m };
      }
    } catch (err) {
      lastError = err.message;
      console.warn(`[Groq] Request failed for ${m}:`, err.message);
    }
  }

  return { ok: false, error: `AI service temporarily unavailable (${lastError})` };
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated." });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid." });
  }
}

// ─── Score util ───────────────────────────────────────────────────────────────
function score(resumeText, jdText) {
  const A = new Set((resumeText || "").toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []);
  const B = (jdText || "").toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  const hits = [...new Set(B)].filter(x => A.has(x));
  return {
    score: Math.min(98, Math.max(20, Math.round(hits.length / Math.max(8, new Set(B).size) * 100))),
    hits
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, targetRole = "", branch = "" } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required." });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });

  const existing = stmt.getUserByEmail.get(email);
  if (existing) return res.status(409).json({ error: "Email already registered." });

  const hashed = await bcrypt.hash(password, 12);
  const result = stmt.createUser.run(name, email, hashed, targetRole, branch);
  ensureUserData(result.lastInsertRowid);

  const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: "7d" });
  const user = stmt.getUserById.get(result.lastInsertRowid);
  res.status(201).json({ token, user: safeUser(user) });
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });

  const user = stmt.getUserByEmail.get(email);
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser(user) });
});

// GET /api/auth/me
app.get("/api/auth/me", auth, (req, res) => {
  const user = stmt.getUserById.get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json(safeUser(user));
});

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE (combines resume + JD + profile + history)
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/state", auth, (req, res) => {
  const uid = req.user.id;
  ensureUserData(uid);
  const user = stmt.getUserById.get(uid);
  const resume = stmt.getResume.get(uid) || { text: "", file_name: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };
  const history = stmt.getHistory.all(uid).map(h => ({
    type: h.type, score: h.score, date: h.created_at,
    ...JSON.parse(h.meta || "{}")
  }));
  res.json({
    profile: safeUser(user),
    resume: { text: resume.text, fileName: resume.file_name },
    jd: { text: jdRow.text },
    history
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/profile", auth, (req, res) => {
  const uid = req.user.id;
  const { name, targetRole = "", branch = "" } = req.body;
  stmt.updateProfile.run(name, targetRole, branch, uid);
  res.json(safeUser(stmt.getUserById.get(uid)));
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESUME & JD
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/resume", auth, (req, res) => {
  const uid = req.user.id;
  ensureUserData(uid);
  stmt.updateResume.run(req.body.text || "", req.body.fileName || "", uid);
  res.json(stmt.getResume.get(uid));
});

app.post("/api/jd", auth, (req, res) => {
  const uid = req.user.id;
  ensureUserData(uid);
  stmt.updateJd.run(req.body.text || "", uid);
  res.json(stmt.getJd.get(uid));
});

app.post("/api/upload", auth, upload.single("resume"), (req, res) => {
  const uid = req.user.id;
  ensureUserData(uid);
  const text = req.body.text || "";
  const fileName = req.file?.originalname || "resume";
  stmt.updateResume.run(text, fileName, uid);
  res.json(stmt.getResume.get(uid));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYZE
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/analyze", auth, async (req, res) => {
  const uid = req.user.id;
  const resume = stmt.getResume.get(uid) || { text: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };
  const r = score(resume.text, jdRow.text);
  // Ask AI for real gap analysis
  const gapPrompt = `You are an expert career coach. Analyze this candidate's resume vs job description and identify exactly 3 skill/knowledge gaps.
Resume keywords: ${r.hits.join(", ") || "(none)"}
JD text (first 500 chars): ${(jdRow.text || "").slice(0, 500)}
Return ONLY a JSON array of 3 gap strings, no markdown. Example: ["Gap 1","Gap 2","Gap 3"]`;
  let gaps = ["System design depth", "Testing coverage", "Cloud/infrastructure experience"];
  try {
    const gapResult = await askAI(gapPrompt, 200);
    if (gapResult.ok) {
      const parsed = JSON.parse(gapResult.text.replace(/```json|```/g, "").trim());
      if (Array.isArray(parsed)) gaps = parsed.slice(0, 3);
    }
  } catch { }
  const result = { ...r, gaps, strengths: r.hits.slice(0, 8), timestamp: new Date().toISOString() };
  stmt.addHistory.run(uid, req.body.type || "readiness", result.score, JSON.stringify({ gaps }));
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-GENERATED QUESTION PACKS (personalized per user)
// ═══════════════════════════════════════════════════════════════════════════════
// DETECTED TECH STACK
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/tech-stack", auth, (req, res) => {
  const uid = req.user.id;
  const user = stmt.getUserById.get(uid);
  const resume = stmt.getResume.get(uid) || { text: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };
  const detected = detectTechStack(resume.text, jdRow.text, user?.target_role, user?.branch);
  res.json({ detected, targetRole: user?.target_role || "" });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI-GENERATED QUESTION PACKS (technology-specialized)
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/questions/generate", auth, async (req, res) => {
  const uid = req.user.id;
  const user = stmt.getUserById.get(uid);
  const resume = stmt.getResume.get(uid) || { text: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };
  const kind = req.body.kind || "Technical Q&A";
  const count = Math.min(parseInt(req.body.count) || 8, 15);

  const detectedStack = detectTechStack(resume.text, jdRow.text, user?.target_role, user?.branch);
  const selectedTech = (req.body.technology && req.body.technology !== "All Technologies" && req.body.technology !== "Auto-detect from CV")
    ? req.body.technology
    : (detectedStack.slice(0, 5).join(", ") || user?.target_role || "Software Engineering");

  const techMandate = `
TARGET TECHNOLOGY FOCUS: ${selectedTech}
CANDIDATE DETECTED STACK: ${detectedStack.join(", ") || "General"}
TARGET ROLE: ${user?.target_role || "Engineer"} (${user?.branch || "CS/IT"})

STRICT SPECIALIZATION RULES:
1. Every question MUST be written specifically for ${selectedTech}. Do NOT generate generic web development questions unless ${selectedTech} is explicitly web.
2. For Java: focus on JVM memory/GC, multithreading, Spring Boot internals, Hibernate performance.
3. For Python: focus on GIL, memory model, async/await asyncio, framework internals (Django/FastAPI).
4. For C/C++: focus on pointers, memory layouts, RAII, vtables, cache misses, move semantics.
5. For React: focus on Fiber reconciliation, state machines, render bottlenecks, concurrent features.
6. For Cloud/DevOps: focus on Kubernetes controllers, Terraform state locking, Docker layer caching.
7. For ML/Data: focus on model architectures, loss functions, GPU memory optimization, embeddings.
8. Ask probing, production-grade questions testing real-world architectural trade-offs.`;

  const kindPrompts = {
    "Project Deep-Dive": `Generate ${count} deep technical interview questions specifically investigating the implementation details, architectural trade-offs, scalability bottlenecks, and failure modes of projects using ${selectedTech} in the candidate's resume.`,
    "Technical Q&A": `Generate ${count} advanced, framework-specific technical interview questions directly testing deep knowledge of ${selectedTech}. Mix architectural internals, edge cases, and real production debugging.`,
    "HR / Soft Skills": `Generate ${count} behavioral and leadership interview questions tailored for a ${user?.target_role || "Software Engineer"} working with ${selectedTech} teams (handling technical disagreements, delivery pressure, code review conflicts, system outages).`,
    "JD Predictor": `Analyze the target job description and generate the ${count} most probable technical interview questions specifically grilling the candidate on ${selectedTech} as required by this company.`
  };

  const prompt = `${kindPrompts[kind] || `Generate ${count} deep technical questions for ${selectedTech}`}

${techMandate}

Candidate Resume:
${(resume.text || "").slice(0, 3200)}

Target JD:
${(jdRow.text || "").slice(0, 1600)}

Return ONLY a JSON array of ${count} question strings. No markdown, no numbering, just the array.
Example: ["In ${selectedTech}, how does... ?","What happens internally when... ?"]`;

  const result = await askAI(prompt, 1800, false, null, 0.7);
  if (!result.ok) return res.status(503).json({ error: result.error });

  try {
    const clean = result.text.replace(/```json|```/g, "").trim();
    const qs = JSON.parse(clean);
    if (!Array.isArray(qs)) throw new Error("Not an array");
    res.json(qs);
  } catch {
    const lines = result.text.split("\n")
      .map(l => l.replace(/^[\d\-•*.]+\s*/, "").trim())
      .filter(l => l.length > 10 && l.includes(" "));
    res.json(lines.slice(0, count));
  }
});

app.get("/api/questions/:kind", (req, res) => res.json([]));

// ═══════════════════════════════════════════════════════════════════════════════
// ATS SCORER (AI-enhanced)
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/ats", auth, async (req, res) => {
  const uid = req.user.id;
  const resume = stmt.getResume.get(uid) || { text: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };
  const r = score(resume.text, jdRow.text);

  // Rule-based checks
  const checks = [
    ["Keyword match with JD", r.score > 55],
    ["Action verbs used", /built|created|developed|implemented|designed|led|managed|achieved|delivered/i.test(resume.text)],
    ["Quantified achievements", /\d+%|\d+x|\d+ users|\d+k|\d+m|\d+ hours|\d+ team/i.test(resume.text)],
    ["Appropriate length", resume.text.length < 9000 && resume.text.length > 300],
    ["Technical skills listed", /javascript|python|react|node|sql|java|go|rust|c\+\+|typescript/i.test(resume.text)],
    ["Project descriptions present", /project|built|developed|implemented|architected/i.test(resume.text)],
  ];
  const total = Math.round(checks.filter(c => c[1]).length / checks.length * 100);

  // Ask AI for 3 AI improvement tips
  let tips = [];
  try {
    const tipPrompt = `You are an ATS expert. Given this resume snippet, give exactly 3 concise, actionable improvement tips to improve ATS score.
Resume (first 600 chars): ${resume.text.slice(0, 600)}
JD keywords found: ${r.hits.slice(0, 10).join(", ")}
Return ONLY a JSON array of 3 short tip strings. No markdown.`;
    const tipResult = await askAI(tipPrompt, 400);
    if (tipResult.ok) {
      const parsed = JSON.parse(tipResult.text.replace(/```json|```/g, "").trim());
      if (Array.isArray(parsed)) tips = parsed.slice(0, 3);
    }
  } catch { }

  res.json({ score: total, checks, keywords: r.hits, tips });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI APTITUDE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/aptitude/generate", auth, async (req, res) => {
  const uid = req.user.id;
  const user = stmt.getUserById.get(uid);
  const topic = req.body.topic || "Mixed (Quantitative, Logical, Verbal)";
  const diff = req.body.difficulty || "Medium";
  const count = Math.min(parseInt(req.body.count) || 6, 10);

  const prompt = `Generate exactly ${count} multiple-choice questions for:
Topic: ${topic}
Difficulty: ${diff}
Target role: ${user?.target_role || "Software Developer"}
Candidate branch: ${user?.branch || "Engineering"}

Output MUST be a valid JSON object with a single "questions" array:
{
  "questions": [
    {
      "q": "Question text?",
      "opts": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "ans": 0,
      "explanation": "Concise solution under 30 words."
    }
  ]
}
Requirements:
- Exactly 4 options in opts (do not prefix with A, B, C, D).
- "ans" MUST be an integer: 0, 1, 2, or 3. Never letters.
- "explanation": Maximum 30 words.`;

  const result = await askAI(prompt, 2500, true);
  if (!result.ok) {
    console.warn("[Aptitude] AI error, serving curated set:", result.error);
    return res.json(getCuratedAptitude(topic, count, diff));
  }

  try {
    let clean = result.text.replace(/```json|```/gi, "").trim();
    clean = clean.replace(/"ans"\s*:\s*([A-Da-d])\b/g, (m, letter) => `"ans": ${letter.toUpperCase().charCodeAt(0) - 65}`);
    
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const firstB = clean.indexOf("{");
      const lastB  = clean.lastIndexOf("}");
      if (firstB !== -1 && lastB > firstB) {
        try { parsed = JSON.parse(clean.slice(firstB, lastB + 1)); } catch {}
      }
    }

    let list = Array.isArray(parsed) ? parsed : (parsed?.questions || parsed?.data || []);

    if (Array.isArray(list) && list.length > 0) {
      const valid = list.map(q => {
        let ans = q.ans;
        if (typeof ans === "string") {
          const ch = ans.trim().toUpperCase()[0];
          if (ch >= "A" && ch <= "D") ans = ch.charCodeAt(0) - 65;
          else ans = parseInt(ans, 10);
        }
        if (typeof ans !== "number" || isNaN(ans) || ans < 0 || ans > 3) ans = 0;
        const opts = Array.isArray(q.opts) ? q.opts.map(o => String(o).replace(/^[A-Da-d][\).\s]+/, "").trim()) : [];
        return {
          q: String(q.q || "").trim(),
          opts,
          ans,
          explanation: String(q.explanation || "Correct answer based on standard principles.").trim()
        };
      }).filter(q => q.q && q.opts.length === 4);

      if (valid.length) return res.json(valid);
    }

    throw new Error("No valid questions parsed from AI output");
  } catch (err) {
    console.warn("[Aptitude] Parse recovery failed (" + err.message + "), raw: " + (result.text || "").slice(0, 150) + "..., using curated set");
    res.json(getCuratedAptitude(topic, count, diff));
  }
});

// Curated aptitude bank categorized by difficulty to guarantee 100% uptime for students
function getCuratedAptitude(topic, count = 6, difficulty = "Medium") {
  const diff = (difficulty || "Medium").toLowerCase();
  
  const hardQuestions = [
    {
      q: "A bag contains 5 red, 4 blue, and 3 green marbles. If 3 marbles are drawn at random without replacement, what is the probability that all three are of different colors?",
      opts: ["3/11", "6/55", "1/4", "9/22"],
      ans: 0,
      explanation: "Total ways = 12C3 = 220. Favorable ways = 5 * 4 * 3 = 60. Probability = 60/220 = 3/11."
    },
    {
      q: "Pipe A can fill a tank in 12 hours, Pipe B in 15 hours. Pipe C can empty it in 20 hours. If Pipe A is opened at 7 AM, B at 8 AM, and C at 9 AM, at what time will the tank be full?",
      opts: ["1:00 PM", "2:00 PM", "12:30 PM", "3:15 PM"],
      ans: 0,
      explanation: "Work done by A (2h) + B (1h) before 9 AM: 2/12 + 1/15 = 1/6 + 1/15 = 7/30. Remaining = 23/30. Combined net rate = 1/12 + 1/15 - 1/20 = 6/60 = 1/10 per hour. Time needed = (23/30)/(1/10) = 23/3 = 7h 40m. 9:00 AM + 4h = 1:00 PM."
    },
    {
      q: "Six friends A, B, C, D, E, F sit in a circle facing inward. A is opposite D. B is second to the right of D. C is adjacent to neither A nor D. Who is sitting immediately to the left of A?",
      opts: ["F", "E", "C", "B"],
      ans: 0,
      explanation: "With A at pos 1, D is pos 4. D faces inward, so second right is pos 2 (B). C cannot be at 2, 6, 3, 5 next to A or D, leaving position assignments where F must sit immediately to the left of A."
    },
    {
      q: "If 2^(x+y) = 64 and 3^(x-y) = 27, what is the value of x^2 - y^2?",
      opts: ["18", "12", "24", "15"],
      ans: 0,
      explanation: "x + y = 6 (since 2^6 = 64) and x - y = 3 (since 3^3 = 27). Therefore, x^2 - y^2 = (x + y)(x - y) = 6 * 3 = 18."
    },
    {
      q: "In an algorithm test, an operation takes T(n) = 2*T(n/2) + O(n). By Master Theorem, what is its asymptotic time complexity?",
      opts: ["O(n log n)", "O(n^2)", "O(log n)", "O(n)"],
      ans: 0,
      explanation: "Here a = 2, b = 2, f(n) = n. log_b(a) = log_2(2) = 1. Since f(n) = Theta(n^(log_b a)), case 2 applies giving T(n) = O(n log n)."
    },
    {
      q: "A car travels the first half of a distance at speed V1 and the second half at speed V2. If V1 = 60 km/h and average speed is 48 km/h, what is V2?",
      opts: ["40 km/h", "45 km/h", "36 km/h", "50 km/h"],
      ans: 0,
      explanation: "Average speed for equal distances = 2*V1*V2 / (V1 + V2). 48 = 120*V2 / (60 + V2) => 48(60 + V2) = 120*V2 => 2880 = 72*V2 => V2 = 40 km/h."
    }
  ];

  const mediumQuestions = [
    {
      q: "A train running at 72 km/h crosses a platform 200 meters long in 25 seconds. What is the length of the train?",
      opts: ["300 meters", "250 meters", "200 meters", "350 meters"],
      ans: 0,
      explanation: "Speed = 72 * (5/18) = 20 m/s. Total distance in 25s = 20 * 25 = 500m. Length of train = 500 - 200 = 300 meters."
    },
    {
      q: "A sum of money doubles itself in 5 years at simple interest. In how many years will it become 4 times of itself?",
      opts: ["15 years", "20 years", "10 years", "25 years"],
      ans: 0,
      explanation: "SI for 5 years = P (since amount = 2P). To become 4P, interest needed = 3P. Time needed = 3 * 5 = 15 years."
    },
    {
      q: "If 12 men or 18 women can do a piece of work in 14 days, in how many days can 8 men and 16 women finish the work?",
      opts: ["9 days", "10 days", "12 days", "8 days"],
      ans: 0,
      explanation: "12 Men = 18 Women => 1 Man = 1.5 Women. 8 Men + 16 Women = 12 + 16 = 28 Women. 18 Women * 14 days = 28 Women * D days => D = (18*14)/28 = 9 days."
    },
    {
      q: "Find the missing number in the series: 3, 7, 15, 31, 63, ?",
      opts: ["127", "125", "129", "121"],
      ans: 0,
      explanation: "Pattern: each term is (previous * 2) + 1. 63 * 2 + 1 = 127."
    },
    {
      q: "In a certain code, COMPUTER is written as RFUVQNPC. How is MEDICINE written in that code?",
      opts: ["EOJDEJFM", "EOJDJEFM", "MFEDJJOE", "MFEJDJOE"],
      ans: 1,
      explanation: "The first and last letters are swapped, and middle letters are shifted by +1 in reverse order."
    }
  ];

  const pool = diff === "hard" ? hardQuestions : mediumQuestions;
  return pool.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE / AI INTERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/voice/interview", auth, async (req, res) => {
  const uid = req.user.id;
  const user = stmt.getUserById.get(uid);
  const resume = stmt.getResume.get(uid) || { text: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };
  const mode = req.body.mode || "HR";
  const answer = (req.body.answer || "").trim();
  const previous = Array.isArray(req.body.history) ? req.body.history.slice(-8) : [];

  const prompt = `You are PrepForge, an expert ${mode} interviewer for a top technology company.

Candidate profile:
Name: ${user?.name || "Candidate"}
Target role: ${user?.target_role || "Software Developer"}
Branch: ${user?.branch || "IT"}

Resume:
${(resume.text || "").slice(0, 800) || "(not provided)"}

Job description:
${(jdRow.text || "").slice(0, 500) || "(not provided)"}

Interview history (last 8 turns):
${JSON.stringify(previous)}

Candidate's latest answer:
${answer || "(Candidate is starting the interview. Greet them warmly and ask an opening question.)"}

Your goals:
1. Evaluate the candidate's answer for technical accuracy, clarity, structure (e.g. STAR method), and depth.
2. Give a score from 0 to 100 (0 if starting).
3. Provide 1-2 concrete strengths and 1-2 constructive improvements.
4. Ask exactly ONE natural, engaging follow-up interview question.

Return ONLY a valid raw JSON object (no markdown, no backticks):
{
  "score": 82,
  "feedback": "Strong answer explaining the core concept clearly.",
  "strengths": ["Structured thoughts", "Relevant technical terms"],
  "improvements": ["Add metrics or quantify impact"],
  "nextQuestion": "How would you handle caching or performance bottlenecks in that system?"
}`;

  const result = await askAI(prompt, 1200);
  if (!result.ok) {
    console.warn("[Voice Interview] AI error:", result.error);
    return res.json({
      score: 75,
      feedback: "Good response. Your answer demonstrated fundamental understanding.",
      strengths: ["Clear communication", "Direct answer"],
      improvements: ["Provide deeper real-world examples"],
      nextQuestion: mode === "Technical"
        ? "Could you walk me through how you optimize database queries or manage API latency?"
        : "Tell me about a time you had to deal with ambiguous requirements or a tight deadline."
    });
  }

  try {
    const clean = result.text.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean);
    stmt.addHistory.run(uid, `Voice ${mode}`, parsed.score || 70, JSON.stringify({ question: parsed.nextQuestion }));
    res.json(parsed);
  } catch {
    res.json({
      score: 78,
      feedback: result.text.slice(0, 160) || "Answer recorded.",
      strengths: ["Relevant context"],
      improvements: ["Structure with STAR method"],
      nextQuestion: mode === "Technical"
        ? "What design patterns have you used in your projects?"
        : "What are your greatest professional strengths and an area you are actively improving?"
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI GENERATE (feature pages)
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/ai/generate", auth, async (req, res) => {
  const uid = req.user.id;
  const user = stmt.getUserById.get(uid);
  const resume = stmt.getResume.get(uid) || { text: "" };
  const jdRow = stmt.getJd.get(uid) || { text: "" };

  const detectedStack = detectTechStack(resume.text, jdRow.text, user?.target_role, user?.branch);
  const selectedTech = (req.body.technology && req.body.technology !== "All Technologies" && req.body.technology !== "Auto-detect from CV")
    ? req.body.technology
    : (detectedStack.slice(0, 6).join(", ") || user?.target_role || "Software Engineering");

  const systemContent = `You are a Principal Software Architect and Lead Technical Interviewer at top-tier tech companies.
CRITICAL MANDATE:
1. Every answer, note, or code snippet MUST be deeply technical and 100% specific to the candidate's exact technologies: ${selectedTech}.
2. NEVER produce generic, one-size-fits-all output. If the technology is Java, talk about JVM/Spring/GC. If Python, talk about GIL/AsyncIO/Framework internals. If C++, talk about memory/RAII/templates. If React, talk about Fiber/reconciliation/hooks.
3. Include real code examples, edge cases, failure scenarios, and architectural trade-offs.`;

  const prompt = `Candidate: ${user?.name || "Candidate"} — ${user?.target_role || "Developer"} (${user?.branch || "IT"})
Target Technology Focus: ${selectedTech}
Detected Full Stack: ${detectedStack.join(", ") || "General Engineering"}

Candidate Resume:
${resume.text || "(none)"}

Target Job Description:
${jdRow.text || "(none)"}

Task Requested: ${req.body.prompt || "Generate useful interview preparation content."}

Formatting: Return concise, practical, highly specialized content formatted with markdown headings (##, ###), bullet points, and code blocks where appropriate.`;

  const result = await askAI(prompt, 2600, false, systemContent, 0.65);
  if (!result.ok) return res.status(503).json(result);
  res.json({ text: result.text, detectedTechs: detectedStack });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/api/history", auth, (req, res) => {
  const rows = stmt.getHistory.all(req.user.id);
  res.json(rows.map(h => ({
    id: h.id, type: h.type, score: h.score, date: h.created_at,
    ...JSON.parse(h.meta || "{}")
  })));
});

app.post("/api/attempt", auth, (req, res) => {
  const { type, score: s, ...meta } = req.body;
  stmt.addHistory.run(req.user.id, type || "attempt", s || null, JSON.stringify(meta));
  res.json({ ok: true });
});

// ─── Production Static Serving ────────────────────────────────────────────────
const clientDist = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
      if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) res.setHeader("Content-Type", "application/javascript");
    }
  }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`✅  PrepForge API running on http://localhost:${PORT} [Groq Engine Ready]`)
);

