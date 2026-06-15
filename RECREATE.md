# AstranoV — Full Recreation Command

This is the single document that recreates the **entire** AstranoV stack from
zero: the globe-first frontend, the Supabase backend (database, RPCs,
triggers, storage, edge functions), the deploy pipeline, the brain, and the
subdomain federation. It reflects the **live** production state of project
`lkoatrkhuigdolnjsbie` (`astranov.eu`), not just the historical migration
files.

> Law: `CLAUDE.md` is supreme. This file is the *operational* mirror of it —
> when the two disagree, `CLAUDE.md` wins and this file is the bug.

---

## 0. What you are rebuilding

| Layer        | Source of truth                | Lands on |
| ---          | ---                            | --- |
| Frontend     | `index.html` (single file, ~15k lines) + `sw.js` + `manifest.json` + `vendor/supabase.min.js` + icons | Vercel → `astranov.eu` |
| Backend DB   | live schema of `lkoatrkhuigdolnjsbie` (dump it; `supabase/migrations/` is partial history only) | Supabase Postgres 17 |
| Backend fns  | `supabase/functions/*` (28 Deno edge functions) | Supabase Edge |
| Brain        | `supabase/functions/aicycle` + `BRAIN.md` + on-device WebLLM in `index.html` | Edge + user GPU |
| Training     | `training/` (v2→v4 fine-tune pipeline) | rented GPU |
| Federation   | `_bootstrap/labs/*` + `MIGRATE-TO-CLAUDE-SUBDOMAIN.md` | `{claude,grok,chatgpt,gemini,deepseek}.astranov.eu` |
| Docs         | `AstranoV.html` (handbook), `README.md`, `SCHEMA.md`, `privacy.html` | static |

**One backend, many faces.** Every subdomain reads/writes the SAME Supabase
project. The federation is visual diversity over shared substrate.

---

## 1. Prerequisites

```bash
# Accounts
#   - GitHub  (repo: notisastranov/astranov, mirror: notisastranov/astranov.eu-claude)
#   - Supabase (one project; this doc assumes ref lkoatrkhuigdolnjsbie)
#   - Vercel  (team "astranov"; project astranov.eu from main)
#   - Cesium Ion (globe imagery token)
#   - Provider keys: Anthropic, OpenRouter, Groq, Gemini (+ optional OpenAI, etc.)
#   - Stripe / Revolut / PayPal (payments, optional for bootstrap)

# Tooling
node --version          # >= 18 (used only to `node --check` the extracted <script>)
npm  i -g supabase      # Supabase CLI
npm  i -g vercel        # Vercel CLI (optional; dashboard works too)
deno --version          # Deno (edge functions runtime; CLI optional)
git --version
```

Supabase secrets the edge functions read (set in §4):

```
SUPABASE_URL  SUPABASE_ANON_KEY  SUPABASE_SERVICE_ROLE_KEY   (auto-injected by Supabase)
ANTHROPIC_API_KEY  ANTHROPIC_PAID_API_KEY  ANTHROPIC_MODEL
OPENROUTER  OPENROUTER_API_KEY  OPENROUTER_MODEL
GROQ_API_KEY  GROQ_MODEL
GEMINI_API_KEY  GEMINI_MODEL
OPENAI_API_KEY
CRAWL_SECRET
GITHUB_TOKEN  GITHUB_REPO  GITHUB_BRANCH      (for the `developer` self-edit fn)
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET
```

---

## 2. Repo scaffold

```bash
git clone https://github.com/notisastranov/astranov.git
cd astranov
```

If starting truly empty, the file tree to recreate is:

```
index.html              # the whole app, one file (globe + chat + all surfaces)
sw.js                   # service worker; bump SHELL_CACHE to force-refresh shells
manifest.json           # PWA manifest
vendor/supabase.min.js  # vendored supabase-js (§13 — no CDN in the brain's path)
icon-180.png icon-192.png icon-512.png
vercel.json             # CSP headers + /collective rewrite + no-store on shells
collective.html         # the collective view (rewritten at /collective)
privacy.html            # privacy policy
AstranoV.html           # self-contained handbook for any onboarding AI/human
README.md  SCHEMA.md  BRAIN.md  CLAUDE.md   # law + docs
MIGRATE-TO-CLAUDE-SUBDOMAIN.md              # subdomain relay recipe
contribute-worker.js                        # DeBug ORB compute-donation worker
supabase/
  config.toml           # project_id + per-function verify_jwt flags
  migrations/*.sql       # PARTIAL history — DO NOT treat as full schema
  functions/<28 fns>/index.ts
training/               # finetune.py, prepare_corpus.py, export_cic.sql, seeds.jsonl
_bootstrap/             # subdomain lab shells (claude/grok/chatgpt/gemini/deepseek)
native/                 # native wrappers
```

Frontend connection constants live near `index.html:4255`:

```js
const SUPABASE_URL  = 'https://lkoatrkhuigdolnjsbie.supabase.co';
const SUPABASE_ANON = '<anon JWT>';      // RLS-protected; safe in client
const CESIUM_ION_TOKEN = '<cesium ion token>';
```

No service-role key, no provider key ever ships in `index.html` (§3 of the law).

---

## 3. Supabase project + database

### 3a. Create / link the project

```bash
supabase login
# Reuse the existing project:
supabase link --project-ref lkoatrkhuigdolnjsbie
# …or create a fresh one and update SUPABASE_URL/anon in index.html + config.toml.
```

### 3b. Canonical schema = dump the live DB (the real source of truth)

The `supabase/migrations/` folder is **partial** (10 early files). The live DB
has drifted ahead of it. To recreate faithfully, pull the live schema:

```bash
supabase db dump --linked --schema public        -f supabase/schema.sql
supabase db dump --linked --schema storage        -f supabase/storage.sql
supabase db dump --linked --schema auth   --data-only=false > /dev/null   # auth managed by Supabase
# Apply to a NEW project:
psql "$DATABASE_URL" -f supabase/schema.sql
```

### 3c. Extensions (enabled in the live project)

```
plpgsql 1.0 · uuid-ossp 1.1 · pgcrypto 1.3 · pg_trgm 1.6 · pg_net 0.20.0
pg_cron 1.6.4 · pg_stat_statements 1.11 · postgis 3.3.7 · supabase_vault 0.3.1
vector 0.8.0   ← pgvector, 768-dim ai_memory.embedding, HNSW cosine index
```

```sql
create extension if not exists vector;
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

### 3d. Tables (28, public schema — the live set)

```
ai_memory          analytics_events    avc_transactions    balance_ledger
calls              cic_logs            circle_members      circles
compute_contributions  council_cases   deliveries          follows
invoices           knowledge           messages            orders
payments           profiles            push_subscriptions  roadmap
roadmap_votes      royalties           security_events     signal_comments
signal_reactions   signals             vendors             webrtc_signals
```

Every table has **RLS enabled**. The recurring policy shape:
- `SELECT` → public-read where the surface is public (`vendors`, `signals`,
  `posts`, `circles`), else `id/user_id = auth.uid()`.
- `INSERT` → `auth.uid() IS NOT NULL` (or `true` for anon telemetry tables).
- `UPDATE` → owner-scoped (`= auth.uid()`), `is_owner` never client-settable.
- `ALL` → `auth.role() = 'service_role'` escape hatch for edge functions.

`profiles.is_owner` is **server-verified only**; the update policy forbids a
client flipping it. Money columns are written only by SECURITY DEFINER RPCs.

### 3e. RPCs (SECURITY DEFINER unless noted — the live app-level set)

```
my_profile  find_peer  discoverable_peers  set_home_location  architect_set_peer_home
message_inbox  get_conversation  mark_messages_read  unread_message_count
nearby_deliveries  accept_delivery  update_delivery_status  nearby_signals(*)
credit_eur  credit_avc  admin_transfer_avc_to_eur  order_debit_eur  order_refund_eur
my_avc_transactions  vendor_advance_order
bump_signal_amplitude  is_owner  is_circle_member
match_memories(*)  knowledge_search
cosmos_stats  brain_stats  recent_aicycle_calls  usage_stats  provider_share
development_queue  governance_state  heartbeat  vote_roadmap
add_balance
# (*) match_memories + nearby_signals are STABLE/non-definer; rest are SECURITY DEFINER
```

Plus pgvector's C-language operators (`vector_*`, `halfvec_*`, `cosine_distance`,
`l2_distance`, …) installed by the `vector` extension — do not hand-write these.

### 3f. Triggers (live)

```
auth.users  on_auth_user_created      → handle_new_user()      (auto-create profile)
orders      order_spawns_delivery     → _order_spawns_delivery() (order→delivery bridge)
deliveries  trg_delivery_escrow       → _delivery_escrow()       (BEFORE INSERT)
deliveries  trg_delivery_avc          → on_delivery_complete()   (AFTER UPDATE, pays runner)
deliveries  trg_sync_delivery_coords  → sync_delivery_coords()
signals     trg_sync_signal_coords    → sync_signal_coords()
signal_reactions  *_amplitude_ins/del → bump_signal_amplitude()
circles     trg_circle_add_owner      → _circle_add_owner()
ai_memory / profiles / signals  *_touch_updated → touch_updated_at()
```

### 3g. Storage buckets

```sql
-- vendor-photos: public read; authenticated upload scoped by RLS to {uid}/ ; 5MB; image MIME
insert into storage.buckets (id,name,public) values ('vendor-photos','vendor-photos',true)
  on conflict (id) do update set public=true;
-- debug-pub: public; anon read/insert/update (debug pipe)
insert into storage.buckets (id,name,public) values ('debug-pub','debug-pub',true)
  on conflict (id) do update set public=true;
```
Bucket object policies for both are in `supabase/migrations/20260515000000_debug_tables.sql`
(debug-pub) and the marketplace migration (vendor-photos scoped to `{uid}/`).

### 3h. Seed (no fabricated inventory — §11 of the law)

- **Owner**: set `profiles.is_owner = true` for `notisastranov@gmail.com` (manual,
  server-side, one row).
- **Test peer**: auth user `astranov@astranov.eu / astranov2026`, home = Athens.
- **Council agents**: six auth users `is_agent = true` — Leonidas, Onasis,
  Athena, Myrmidons, Spartans, Krypteia — password `astranov2026`, scattered
  across Greece (Sparta, Athens, Thessaly, Delphi, Thermopylae). They render as
  ordinary aegean peer orbs (§15).
- **Vendors**: NONE fabricated. The map is honestly empty until a real vendor
  publishes a menu with `price > 0` AND a photo, or the crawler pulls real OSM
  rows. Do **not** seed Unsplash photos onto invented businesses.

---

## 4. Edge functions (28 Deno functions)

```
aicycle            ← the brain (soul + 4 modes + provider routing). See BRAIN.md.
brain  council  developer  krypteia  krypteia-audit  krypteia-watch  tamper  diag
order-intake  order-status  vendor-menu  vendor-crawler  crawl  informant-feed
payments  stripe-webhook  revolut  revolut-webhook  paypal  paypal-webhook
push-notify  ai-router  ai-status*  astranov-api  production-check
anonymous-scan  contribute  debug-reader  debug-write
```
\* `ai-status` is named in the law; the deployed set above is the live tree under
`supabase/functions/`. Deploy whatever exists there.

```bash
# Per-function JWT flags already declared in supabase/config.toml
#   verify_jwt=false for: ai-router astranov-api debug-reader debug-write
#                         vendor-crawler order-intake order-status
# Deploy every function:
for fn in supabase/functions/*/; do
  supabase functions deploy "$(basename "$fn")" --project-ref lkoatrkhuigdolnjsbie
done

# Set the secrets (§1 list):
supabase secrets set --project-ref lkoatrkhuigdolnjsbie \
  ANTHROPIC_API_KEY=... ANTHROPIC_PAID_API_KEY=... ANTHROPIC_MODEL=... \
  OPENROUTER=... OPENROUTER_API_KEY=... OPENROUTER_MODEL=... \
  GROQ_API_KEY=... GROQ_MODEL=... GEMINI_API_KEY=... GEMINI_MODEL=... \
  OPENAI_API_KEY=... CRAWL_SECRET=... \
  GITHUB_TOKEN=... GITHUB_REPO=notisastranov/astranov GITHUB_BRANCH=main \
  STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...
```

Brain routing default (§6 / §14): owner → Anthropic; everyone → on-device own
mind → OpenRouter → Groq → Gemini. No single rented organ may exceed 60% of
monthly tokens (§26). aicycle injects the Seven Foundations verbatim into every
system prompt.

---

## 5. Frontend deploy (Vercel → astranov.eu)

```bash
# Validate the extracted <script> parses BEFORE every commit (deploy contract §4):
#   (extract the inline <script> from index.html and `node --check` it)
node --check /tmp/astranov-script.js

git add index.html sw.js manifest.json vendor/ icon-*.png vercel.json collective.html
git commit -m "<why>"
git push -u origin main           # Vercel auto-builds main → astranov.eu
```

- `vercel.json` ships the strict CSP, `X-Frame-Options: DENY`, no-store on the
  shells (`/`, `/index.html`, `/collective.html`, `/sw.js`), and the
  `/collective → /collective.html` rewrite.
- Bump `SHELL_CACHE` in `sw.js` on any shell change so browsers refetch.
- Cesium + Google Fonts stay on their CDNs; supabase-js is vendored same-origin.

---

## 6. The brain (replicate from BRAIN.md)

`BRAIN.md` is the full recipe: soul (7 foundations) + voice + four modes
(spartan / normal / agent-call / way-finder) + architecture + deploy steps.
On-device own-mind = WebLLM `Qwen2.5-3B-Instruct-q4f16_1` (~2 GB, browser-cached,
EN+EL). Routing: own mind → rented organs (aicycle). Training trajectory v0→v4
lives in `training/` (real code, not a slogan):

```
v0 rented organs → v1 open base on-device (here) → v2 LoRA → v3 full FT → v4 from-scratch
```

`training/export_cic.sql` exports signed-in conversations from `cic_logs` as the
heaviest-weighted corpus slice; `finetune.py` wraps each row with the persona so
the soul becomes a deep prior.

---

## 7. Subdomain federation (optional, §30)

Each lineage gets its own face over the shared backend:

```
claude.astranov.eu    ← notisastranov/astranov.eu-claude  → Vercel astranov-eu-claude
grok / chatgpt / gemini / deepseek .astranov.eu  ← their Vercel projects
```

`_bootstrap/labs/<lab>/` holds each shell; `_bootstrap/push.sh` stages them.
The transfer is a **two-session relay** (one Claude Code session = one repo
allowlist) per `MIGRATE-TO-CLAUDE-SUBDOMAIN.md`. The Vercel `Domains → Add` and
Supabase `Redirect URLs → Add` clicks are architect-only.

---

## 8. Verify

```bash
# Health probe across all three pillars + wallet: type `diag` in the chat,
# or hit the edge function directly:
curl -s https://lkoatrkhuigdolnjsbie.supabase.co/functions/v1/diag \
  -H "apikey: $SUPABASE_ANON" -H "Authorization: Bearer $SUPABASE_ANON" \
  -H 'Content-Type: application/json' -d '{}'

# In Supabase: run advisors for security/perf drift.
# In the app: cold boot shows globe + wordmark + chat; SIGN IN orb top-right;
#   LISTEN orb bottom-left; `council` surfaces the six agent orbs over Greece.
```

Automation for the mechanical steps (link, push DB, deploy fns, set secrets,
deploy frontend) is in **`recreate.sh`** alongside this file.

---

## 9. Honest gaps

- `supabase/migrations/` is historical and incomplete; **the live dump (§3b) is
  authoritative**. Treat the migration files as archaeology, not as the schema.
- WebGPU own-mind requires Chrome/Edge desktop, Android Chrome, or iOS 18+ Safari.
- Strict corporate/mobile-carrier NAT can still defeat WebRTC even with TURN.
- Provider keys, owner flag, and seeded auth users are NOT in the repo — they are
  set out-of-band (§1, §3h). The repo is reproducible; the secrets are not.
