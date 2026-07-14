# Stadium Monitor — Volunteer AI Co-Pilot

**FIFA World Cup 2026 · Smart Stadiums & Tournament Operations Challenge**

Built for volunteers managing stadium operations during match day. AI-assisted tools backed by deterministic algorithms, served by Express.js with vanilla JavaScript (no build step).

---

## What's New

### ✨ Recent Improvements

- **🤖 AI Cascade Fallback System** - 3-tier reliability: primary AI → secondary AI → smart fallback (never fails)
- **🧠 Smart Fallback Responses** - Works intelligently even without AI using venue graph and live data
- **📊 Historical Trending** - Time-series tracking with predictive analytics
- **🔍 AI Audit Trail** - Complete explainability with confidence scores
- **🔒 Security Hardened** - Prompt injection protection, error sanitization
- **🐳 Production Ready** - Docker + Vercel deployment, all tests passing

---

## Problem

On match day, volunteers lack visibility into gate congestion, can't give directions across unfamiliar stadiums, face language barriers, and have no training for incident classification.

Stadium Monitor provides four AI-assisted capabilities:

| Feature | Deterministic Core | What AI Does |
|---------|-------------------|--------------|
| **Crowd Management** | Threshold classification of live gate occupancy | Explains why gates are congested and drafts recommendations |
| **Wayfinding** | Dijkstra's algorithm computes shortest routes | Phrases directions naturally in fan's language |
| **Multilingual Assistance** | — | Translates messages and infers tone/urgency |
| **Incident Triage** | Dijkstra finds nearest responder post | Infers severity and drafts dispatch instructions |

---

## Features

### 1. Crowd Management
Real-time gate capacity monitoring with AI-generated recommendations. When gates cross 85% capacity, AI explains the situation based on live data.

### 2. Navigation & Wayfinding
Computes shortest walking routes (Dijkstra's algorithm), then AI phrases directions in 8 languages. Supports step-free-only mode.

### 3. Multilingual Assistance
Free-text translation with tone detection — understands context beyond keywords.

### 4. Incident Triage & Escalation
Report back on rate limits (50 requests/day)

**Tier 2: Secondary AI** (`tencent/hy3:free`)
- Backup free model  
- Activates if primary fails

**Tier 3: Smart Fallback** (No AI required)
- Use data
  - **Medical post locations:** Uses pathfinding
  - **Accessibility:** Provides step-free routes
- Returns `"source": "fallback"` in responses

**Example:**

```json
{
  "reply": "All gates (A-F) currently report OK status with occupancy under 70%. No congestion at this time.",
  "confidence": "high",
  "source": "fallback"
}
```

**Benefits:**
- ✅ Never fails (works when OpenRouter free tier exhausted)
- ✅ Accurate responses (uses real venue data)
- ✅ Cost-effective (maximizes free tier)
- ✅ Transparent (`source` field shows which tier answered)

---

## Architecture

```
server/
  index.js              Entry point
  app.js                Express app factory
  config.js             Environment config
  data/
    demo-stadium.json   Venue graph (nodes + edges)
  middleware/           Security, rate limiting, validation
  routes/               HTTP handlers
  services/             Business logic + AI provider
    aiProvider.js       AI cascade fallback system
    pathfinding.js      Dijkstra's algorithm
    crowd.js            Occupancy + AI explanations
    wayfinding.js       Route computation + AI phrasing
    incidentTriage.js   Nearest responder + AI severity
    copilotChat.js      Smart fallback responses
  utils/                Helpers

public/                 Vanilla JS frontend (no build)
  index.html  css/  js/

tests/                  Unit + integration tests
e2e/                    Playwright + axe-core accessibility
```

### Design Principles

**AI as phrasing layer:** Routing (Dijkstra), crowd classification, and facility matching are deterministic. AI only turns computed facts into natural language.

**AI key never leaves server:** Read via `config.js`, used only in `aiProvider.js`. Never appears in responses or client code.

**AI failures fail closed:** Every AI route has try/catch with generic fallback. No stack traces leaked.

**No build step:** Vanilla JS, plain fetch(). Runs with `npm install` only.

---

## API Reference

All AI endpoints are rate-limited (15 req/min per IP by default).

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/health` | Liveness + AI provider status |
| **Crowd** |
| GET | `/api/crowd/status` | Live gate occupancy |
| POST | `/api/crowd/explain` | AI reasoning for gate status |
| **Historical** |
| GET | `/api/history/:venueId/gates` | Gates history |
| GET | `/api/history/:venueId/gates/:gateId/trend` | Trend analysis **Audit** |
| GET | `/api/audit/log` | Recent AI decisions |
| GET | `/api/audit/stats` | Audit statistics |
| **Operations** |
| POST | `/api/wayfinding` | Shortest route + directions |
| POST | `/api/incident/triage` | Nearest post + severity |
| POST | `/api/translate` | Translation + tone |

---

## Setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env    # Optional: set AI provider
npm start               # http://localhost:3000
```

App works fully **without API keys** — uses smart fallback responses.

---

## Configuration

Environment variables (`.env`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENROUTER_API_KEY` | — | Optional. Enables cascade fallback |
| `AI_PROVIDER` | `fallback` | `openrouter`, `openai`, `gemini`, `anthropic`, `fallback` |
| `RATE_LIMIT_PER_MINUTE` | 15 | Per-IP rate limit |
| `PORT` | 3000 | Server port |
| `NODE_ENV` | `development` | Set `production` for deploy |

**Recommended Setup:**

```bash
# OpenRouter with 3-tier cascade (best for free tier)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here

# Or pure fallback (no AI, smart responses only)
AI_PROVIDER=fallback
```

**Note:** Cascade order is hardcoded in `server/services/aiProvider.js`.

---

## Testing

```bash
npm test              # Unit + integration
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run test:e2e      # Playwright + axe-core accessibility
```

---

## Deployment

### Docker

```bash
docker-compose up --build
```

### Vercel (Serverless)

```bash
vercel --prod
```

**Vercel Environment Variables:**
- `AI_PROVIDER=openrouter`
- `OPENROUTER_API_KEY=your-key`
- `NODE_ENV=production`

**Configuration:**
- Entry point: `api/index.js`
- Max duration: 60s (prevents 504 timeouts)
- Memory: 1024MB

See `vercel.json` for full config.

### Railway / Render

1. Push to GitHub
2. Connect repo
3. Platform auto-detects `npm start`
4. Set environment variables
5. Deploy

---

## Troubleshooting

### Vercel 504 Timeout

**Symptom:** Chat returns 504 Gateway Timeout

**Solution:** Already configured in `vercel.json`:
- `maxDuration: 60s`
- `max_tokens: 500` (faster responses)
- 30s request timeout

Redeploy: `vercel --prod`

### Rate Limit (429)

**Symptom:** After ~15 requests, get 429

**Solution:** Update `RATE_LIMIT_PER_MINUTE=50` in Vercel dashboard, redeploy.

### Smart Fallback Activated

**Symptom:** Responses show `"source": "fallback"`

**Causes:**
1. OpenRouter free tier exhausted (50/day limit)
2. Both cascade models failed
3. AI returned empty response

**Solutions:**
- Add $10 to OpenRouter (unlocks 1000/day)
- Use different provider (`AI_PROVIDER=openai/gemini/anthropic`)
- Continue with smart fallback (works for common questions)

---

## Security

- **Secrets:** AI key server-side only, never in responses/logs/client
- **Rate Limiting:** Per-IP on all AI routes + in-process throttle
- **Headers:** Helmet with strict CSP, X-Frame-Options: DENY
- **Validation:** Zod schemas on all POST bodies, generic 422 on errors
- **Error Handling:** AI failures caught, generic 502 returned

---

## Accessibility

- Zero-violation axe-core scans in CI
- Keyboard-only operability
- aria-live regions on AI output
- Color-independent status signaling
- High-contrast and large text modes

---

## What's GenAI vs Rule-Based

| Capability | Rule-Based | GenAI |
|------------|------------|-------|
| Gate occupancy % and status | ✅ | |
| Shortest route | ✅ (Dijkstra) | |
| Nearest responder post | ✅ (Dijkstra) | |
| Smart fallback (no AI) | ✅ | |
| "Why is this gate a problem" | | ✅ |
| Natural directions in fan's language | | ✅ |
| Tone/urgency inference | | ✅ |
| Incident severity from context | | ✅ |

---

## Project Stats

- **Source code:** 460KB (under 5MB)
- **Tests:** 50+ passing
- **Coverage:** ~91% lines
- **Accessibility:** Zero axe-core violations

---

## License

MIT License — see LICENSE file.

**Built with:** Node.js 20+, Express, Zod, Helmet, Playwright

**Challenge:** FIFA World Cup 2026 Smart Stadiums & Tournament Operations  
**Focus:** Volunteers managing match-day operations  
**AI Usage:** Genuine reasoning layer over deterministic algorithmic core
