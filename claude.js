// MeetOS — Vercel serverless proxy for the Anthropic API
// Keeps ANTHROPIC_API_KEY server-side. Set it in Vercel → Project → Settings → Environment Variables.

const ALLOWED_MODELS = new Set([
  "claude-fable-5",              // Tier 2 — Deep Synthesis / cross-meeting memory
  "claude-haiku-4-5-20251001",   // Tier 1 — Quick Pulse
]);

const MAX_TOKENS_CAP = 4000;     // hard server-side cost ceiling

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-key");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const apiKey = req.headers["x-user-key"] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key: set ANTHROPIC_API_KEY or send x-user-key (BYOK)" });

  const body = req.body || {};
  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: "Model not allowed: " + body.model });
  }
  body.max_tokens = Math.min(body.max_tokens || 1000, MAX_TOKENS_CAP);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Upstream error: " + err.message });
  }
}
