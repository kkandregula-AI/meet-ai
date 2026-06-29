# MeetOS — Multi-user AI Meeting Intelligence

A single-file PWA for real-time, multi-participant meetings with **free on-device transcription**, live team chat, AI-extracted action items, and one-tap sharing to WhatsApp, Email, and Notion.

**Designed & Architected by Krishnamurthy Kandregula · Made by Claude**

---

## What it does

Participants each install the PWA on their own phone and join a room with a Room Code + PIN. Everyone's speech is transcribed **locally on their own device** (browser Web Speech API — zero cost, zero tokens) and merged into one shared transcript. When the moderator runs analysis, Claude reads the combined transcript and returns a summary, decisions, and action items with owners — which the moderator can then assign to participants.

---

## Architecture (the two-layer pattern)

| Layer | Engine | Cost | What it does |
|-------|--------|------|--------------|
| **Transcription** | Browser Web Speech API | Free | Live speech → text on each device. No tokens, no key needed for English. |
| **AI Intelligence** | Claude Haiku | Low (pay-per-use) | Quick Pulse (key points) and Deep Synthesis (summary, decisions, action items with confidence ratings). Runs only when the moderator taps the button. |

All MeetOS AI runs on **Claude Haiku** (`claude-haiku-4-5`) for low, predictable cost. The model allowlist and a server-side `max_tokens` cap are enforced in the proxy.

---

## How transcription + AI fit together

This is the key thing to understand:

- Each phone transcribes **only its own microphone** — there is no audio streaming between devices.
- But every phone pushes its transcript lines into **one shared Firebase node** (`rooms/{code}/transcript`).
- So every device — including the moderator's — sees the **complete, merged** transcript of everyone who is recording.
- When the moderator runs Deep Synthesis, the AI reads that full merged transcript, so minutes and action items cover the whole meeting.

**The one rule:** every participant must tap **Record** on their own phone, or their words are never captured. The app shows a red "recording now" dot per person and warns the moderator if they're the only one recording.

> This is intentionally **not** Zoom. Zoom streams everyone's audio through paid media servers. MeetOS keeps cost near zero by syncing only text. It's ideal for same-room meetings (each phone catches the nearby speaker) or as a companion running alongside a separate call.

---

## Files

- `index.html` — the entire app (single-file PWA: UI, Firebase realtime sync, speech recognition, chat, action items, AI layer, WebRTC video mesh, canvas icon, data-URI manifest)
- `api/claude.js` — Vercel serverless proxy (keeps the API key server-side, enforces the Haiku-only model allowlist and a token cap)
- `sw.js` — minimal app-shell service worker (network-first for HTML; never caches AI or Firebase traffic)

---

## Setup

### 1. Firebase (required for cross-device sync)

Without this, rooms only work on a single device (demo mode — the app shows a warning banner).

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create a project
2. Build → **Realtime Database** → Create → **Start in test mode**
3. Paste the config into `CONFIG.FIREBASE` in `index.html`
4. Suggested dev rules (tighten before production):
   ```json
   { "rules": { "rooms": { ".read": true, ".write": true } } }
   ```

> ⚠️ Test-mode rules are open to anyone with the URL and expire after 30 days. Lock them down and add Firebase Auth before any wider rollout.

### 2. Anthropic API key (for AI analysis)

You have two options — pick one:

**Option A — Server key (one key pays for everyone):**
1. In Vercel → Settings → Environment Variables, add `ANTHROPIC_API_KEY`
2. In `index.html` set `CONFIG.SERVER_HAS_KEY: true` and keep `CONFIG.PROXY_URL: "/api/claude"`
3. Moderators get AI with no setup.

**Option B — BYOK (each moderator brings their own key):**
1. Keep `CONFIG.SERVER_HAS_KEY: false`
2. Each moderator taps **⚙ Settings** and pastes their own key (`sk-ant-…`)
3. The key lives only in that device's localStorage and is sent via the `x-user-key` header; each moderator pays for their own tokens.

If neither is configured, the app now **prompts clearly**: a tappable "🔑 AI needs a key" banner appears on the Intelligence tab, and tapping Analyse opens Settings with the key field highlighted.

> Get a key at [console.anthropic.com](https://console.anthropic.com) → API Keys.

### 3. Deploy

```bash
vercel --prod
```

That's it. HTTPS is automatic (required for microphone access).

---

## Using a meeting

1. **Create a room** → you become moderator → an invite card appears with the Code + PIN and **WhatsApp / Share / Copy** buttons
2. Participants **Join a room** with the Code + PIN from their own phones
3. Everyone taps **Record** on their own device — the button reads **"Record"** when idle, **"Stop recording"** when live
4. Watch the participant strip: a **red dot** shows who's actively recording
5. Coordinate silently in the **Chat** tab while someone speaks
6. Tap **End meeting** (clearly labelled red button) to open the wrap-up
7. Tap **Analyse meeting** → Claude Haiku extracts decisions and action items
8. Tap any action item's **👤 chip** to assign it to a participant (syncs to everyone with a chat notification)
9. Export: **⬇ Transcript** (saves a Markdown file — desktop downloads, iPhone opens the share sheet so you choose Save to Files), **📄 PDF** (branded minutes), or **Share** to WhatsApp / Email / Notion

---

## Honesty layer

The Deep Synthesis prompt instructs the model to:

- never invent owners or deadlines — ambiguous ownership becomes `owner: "unassigned"` with `confidence: "low"` and a rationale
- return empty sections rather than padding thin transcripts
- report only decisions actually supported by the transcript

AI-extracted action items flow into the shared list with their confidence colour (teal / amber / red), where the moderator allocates them.

---

## Language support

- Meetings start in **English** (no key needed for the transcript).
- To speak another language and have it translated live into the English transcript, the moderator must first add an API key (translation runs on Haiku).
- Supported speech languages include English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Urdu, plus French, Spanish, German, Arabic, Chinese, Japanese — subject to the browser's speech engine.

---

## Presence, avatars & video

- **Participants strip** under the header shows everyone live — photo if added, initials otherwise; the moderator gets a violet ring; a red pulsing dot marks whoever is recording.
- **Photo in audio mode**: optional, picked in the lobby, centre-cropped to a small JPEG and synced via the participant record.
- **🎥 Video (opt-in)**: WebRTC mesh with Firebase as the signaling channel (offer/answer/ICE under `rooms/{code}/signals`). Google STUN only — add a TURN server to `ICE` in `index.html` for strict corporate NATs. Mesh topology: keep to ~4 participants.

---

## Known iOS notes

- Web Speech API support on iOS Safari is **partial**; **Android Chrome** is the most reliable for participants who need their own transcription. The Record button degrades gracefully with a message, and other participants' transcripts still sync.
- Transcript download on iOS uses the native share sheet (Save to Files) instead of a silent `data:` download.
- A wake lock keeps the screen on while recording so the mic isn't suspended.
- The mic auto-restarts with capped backoff if the speech service drops, instead of failing permanently.
- Manifest + icon use data URIs (no blob URLs) to avoid iOS CSP issues; the canvas icon avoids `ctx.roundRect()` (arcTo-based helper instead).

---

## Troubleshooting

**"We can't see each other" / room title shows "Local room":**
That device is in demo mode — `CONFIG.FIREBASE` still has placeholder values, so there's no realtime sync. Fix: create a Firebase project → Realtime Database → paste the real config into `CONFIG.FIREBASE` → redeploy.

**"Only the moderator's words are in the transcript":**
The other participants haven't tapped **Record** on their phones. Each device captures only its own mic. Watch for the moderator's amber warning: "⚠️ Only you are recording."

**"Analyse meeting does nothing":**
No API key is configured. Tap the "🔑 AI needs a key" banner on the Intelligence tab, or open ⚙ Settings and add your Anthropic key (or set a server key per Option A above).
