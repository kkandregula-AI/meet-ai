# MeetOS — Fable 5 Deep Synthesis Edition

Multi-user AI meeting intelligence PWA with 3-tier AI routing.

Designed & Architected by Krishnamurthy Kandregula · Made by Claude

## Architecture (the Tranzit pattern)

|Tier|Engine          |Cost              |What it does                                         |
|----|----------------|------------------|-----------------------------------------------------|
|0   |Web Speech API  |Free              |Live transcription — zero tokens                     |
|1   |claude-haiku-4-5|Cheap             |Quick Pulse: 3–5 key-point chips on demand           |
|2   |claude-fable-5  |Premium, on-demand|Deep Synthesis + cross-meeting memory, moderator-only|

Fable 5 fires only when the moderator presses the button, with a live token
estimate shown first and a server-side max_tokens cap in the proxy.

## Files

- `index.html` — the entire app (single-file PWA: UI, Firebase realtime,
  speech, chat, action items, AI layer, canvas icon, data-URI manifest)
- `api/claude.js` — Vercel serverless proxy (keeps the API key server-side,
  enforces a model allowlist and token cap)
- `sw.js` — minimal app-shell service worker (never caches AI/Firebase traffic)

## Setup

1. **Firebase**: create a project → Realtime Database → paste the config into
   `CONFIG.FIREBASE` in index.html. Suggested dev rules (tighten for prod):
   
   ```json
   { "rules": { "rooms": { ".read": true, ".write": true } } }
   ```
1. **Anthropic key**: in Vercel → Settings → Environment Variables, add
   `ANTHROPIC_API_KEY`. Leave `CONFIG.PROXY_URL = "/api/claude"`.
   (Prototyping only: set `PROXY_URL` to `""` and paste a key into
   `ANTHROPIC_API_KEY` in CONFIG — uses the
   `anthropic-dangerous-direct-browser-access` header; never ship this.)
1. **Deploy**: `vercel --prod` from this folder. Done.

## Honesty layer

The Deep Synthesis prompt instructs Fable 5 to:

- never invent owners or deadlines — ambiguous ownership becomes
  `owner: "unassigned"` with `confidence: "low"` and a rationale
- return empty sections rather than padding thin transcripts
- report only decisions actually supported by the transcript

AI-extracted action items are pushed into the shared list tagged `◈ Fable 5`
with their confidence colour (teal/amber/red).

## Known iOS notes

- Web Speech API support on iOS Safari is partial; the Record button degrades
  gracefully with a message. Other participants’ transcripts still sync.
- Manifest + icon use data URIs (no blob URLs) to avoid iOS CSP issues.
- Canvas icon avoids `ctx.roundRect()` (arcTo-based helper instead).

## Runtime AI settings (BYOK + Tier 2 choice)

Tap **⚙ AI settings** (lobby or room header):

- **Bring Your Own Key** — paste an Anthropic API key; it lives only in that
  device’s localStorage. The proxy receives it via the `x-user-key` header and
  uses it instead of the server key, so each user pays for their own tokens.
  Leave blank to use the server’s `ANTHROPIC_API_KEY`.
- **Tier 2 engine picker** — Deep Synthesis and Cross-Meeting Memory can run on
  **Fable 5** (deepest reasoning) or **Haiku saver** (same JSON output at a
  fraction of the cost). Tier badges, button labels, token estimate and the
  synthesis stamp all reflect the live choice, and each saved synthesis records
  which model produced it.