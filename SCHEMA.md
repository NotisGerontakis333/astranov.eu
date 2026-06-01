# AstranoV — Database Schema & API Reference

**Canonical source of truth for all AI coders building on AstranoV.**
All lab subdomains (claude, grok, chatgpt, gemini, deepseek) share this
single Supabase project. Read this before you build anything.

Last updated: 2026-06-01

---

## Connection

```javascript
const SUPABASE_URL  = 'https://lkoatrkhuigdolnjsbie.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrb2F0cmtodWlnZG9sbmpzYmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODIwOTIsImV4cCI6MjA5NDQ1ODA5Mn0.qf6Kg93YLJ0coTdVQa4baU0ppOdFY5WkmVzMvEV6ejI';
```

```javascript
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzYTI0NjM1MC05MTAyLTQ1NjItOGI5Yi1kZTUxMWVlODA0MzQiLCJpZCI6NDMyMzAwLCJzdWIiOiJBc3RyYW5vdiIsImlzcyI6Imh0dHBzOi8vaW9uLmNlc2l1bS5jb20iLCJhdWQiOiJBTENJIiwiaWF0IjoxNzc4OTIwOTU3fQ.HPPdCQ7u_BWDoS7uK5uwqHHtmUivbU82u_bwHLhHkag';
```

---

## Tables (15)

### profiles

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| display_name | text | — | |
| phone | text | — | |
| username | text | — | UNIQUE WHERE NOT NULL |
| avatar_emoji | text | '👤' | |
| bio | text | '' | |
| is_owner | boolean | false | server-verified only, never trust client |
| is_vendor | boolean | false | |
| balance | numeric(12,2) | 0 | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS:** Users read own + all profiles readable. Users update own. Service role full.
**Trigger:** `on_auth_user_created` → `handle_new_user()` auto-creates profile on signup.

---

### vendors

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | text | gen_random_uuid()::text | PK |
| osm_id | text | — | UNIQUE WHERE NOT NULL |
| name | text | — | NOT NULL |
| emoji | text | '🎪' | |
| category | text | 'shop' | |
| country | text | — | |
| city | text | — | |
| lat | double precision | 0 | NOT NULL |
| lng | double precision | 0 | NOT NULL |
| address | jsonb | '{}' | |
| tags | jsonb | '{}' | |
| owner_id | uuid | — | FK → auth.users(id) |
| items | jsonb | '[]' | NOT NULL, menu/product list |
| reserve_balance | numeric(10,2) | 0 | |
| is_active | boolean | true | |
| delivery_enabled | boolean | true | |
| delivery_radius_km | float | 3 | |
| min_order_avc | float | 5 | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS:** Public read (active). Owner insert/update own. Service role full.
**Indexes:** osm_id (unique), lat/lng, category, owner_id, country/city.

---

### orders

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| short_id | text | 'ORD-' + random 6 chars | UNIQUE |
| vendor_id | text | — | |
| customer_id | uuid | — | FK → auth.users(id) |
| items | jsonb | '[]' | NOT NULL |
| calc | jsonb | '{}' | NOT NULL, price breakdown |
| status | text | 'pending' | NOT NULL (pending/accepted/preparing/in_transit/delivered/cancelled) |
| driver_name | text | — | |
| driver_emoji | text | '🚴' | |
| delivery_lat | double precision | — | |
| delivery_lng | double precision | — | |
| delivery_address | text | — | |
| notes | text | — | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS:** Customer read own. Anon insert + read all. Service role full.

---

### invoices

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | text | — | PK |
| order_id | text | — | |
| vendor_name | text | — | |
| buyer_id | uuid | — | FK → auth.users(id) |
| mark | text | — | UNIQUE NOT NULL, sequential invoice mark |
| mydata_mark | text | — | AADE myDATA mark when submitted |
| items | jsonb | '[]' | |
| subtotal | numeric(10,2) | — | |
| delivery_fee | numeric(10,2) | 0 | |
| platform_fee | numeric(10,2) | 0 | |
| vat_food | numeric(5,4) | 0.13 | 13% Greek VAT on food |
| vat_service | numeric(5,4) | 0.24 | 24% Greek VAT on services |
| total | numeric(10,2) | — | |
| currency | text | 'AVC' | 1 AVC = 1 EUR |
| issued_at | timestamptz | now() | |
| period_month | text | — | YYYY-MM for aggregation |
| status | text | 'issued' | issued/submitted/voided |

**RLS:** Users read own. Auth insert. Service role full.

---

### balance_ledger

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| user_id | uuid | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| balance | numeric(12,2) | 0 | |
| updated_at | timestamptz | now() | |

**RLS:** User read own. Service role full.

---

### posts

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | text | — | PK |
| channel | text | — | NOT NULL (global/local/private) |
| author | text | — | |
| url | text | — | |
| mode | text | — | video/image |
| lat | double precision | — | |
| lng | double precision | — | |
| text | text | — | |
| created_at | timestamptz | now() | |

**RLS:** Public read. Auth insert. Service role full.

---

### circles

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | text | — | PK |
| name | text | — | NOT NULL |
| scope | text | — | |
| type | text | 'public' | public/private |
| owner_id | uuid | — | FK → auth.users(id) |
| created_at | timestamptz | now() | |

**RLS:** Public read. Auth insert. Service role full.

---

### circle_messages

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| circle_id | text | — | NOT NULL |
| author | text | — | |
| text | text | — | NOT NULL |
| ts | bigint | epoch_ms | NOT NULL |
| created_at | timestamptz | now() | |

**RLS:** Public read. Auth insert. Service role full.

---

### ai_memory

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| user_id | uuid | — | FK → auth.users(id) |
| profile_id | uuid | — | FK, used by match_memories() |
| role | text | — | NOT NULL (system/user/assistant) |
| content | text | — | NOT NULL |
| context | jsonb | '{}' | |
| source | text | — | creator-dialogue/user-taught/creator-seed/creator-distilled |
| is_private | boolean | false | NOT NULL — private entries NEVER sent to AI |
| importance | real | 1.0 | |
| embedding | vector(768) | — | Gemini gemini-embedding-001 |
| distilled | boolean | false | marks consumed by brain distill |
| created_at | timestamptz | now() | |

**RLS:** Users read/insert/update own. Service role full.
**Index:** HNSW on embedding (vector_cosine_ops) for semantic search.

---

### ai_feedback

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| user_id | uuid | — | FK → auth.users(id) |
| kind | text | — | NOT NULL (suggestion/bug/praise/request) |
| text | text | — | NOT NULL |
| context | jsonb | '{}' | |
| status | text | 'open' | open/reviewing/applied/rejected |
| created_at | timestamptz | now() | |

**RLS:** Anyone insert. Users read own. Service role full.

---

### ai_proposals

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| prompt | text | — | NOT NULL |
| summary | text | — | |
| diff_preview | text | — | |
| status | text | 'pending' | pending/approved/rejected/applied |
| approved_by | uuid | — | FK → auth.users(id) |
| commit_sha | text | — | |
| created_at | timestamptz | now() | |
| decided_at | timestamptz | — | |

**RLS:** Owner-only read/update. Service role full.

---

### cic_queue

Collective Intelligence Cycle — human-answerable question queue.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| user_id | uuid | — | FK → auth.users(id) |
| question | text | — | NOT NULL |
| context | jsonb | '{}' | |
| reason | text | — | |
| status | text | 'open' | open/answered/dismissed |
| answered_by | uuid | — | FK → auth.users(id) |
| answer | text | — | |
| for_owner | boolean | false | true = architect-only |
| created_at | timestamptz | now() | |
| answered_at | timestamptz | — | |

**RLS:** Auth insert. Auth read open non-owner questions. Authors read own. Collective answers open. Service role full.

---

### krypteia_log

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| ts | bigint | — | NOT NULL |
| type | text | — | NOT NULL (self_check/develop/inspect/export) |
| data | jsonb | '{}' | NOT NULL |
| created_at | timestamptz | now() | |

**RLS:** Service role full. Anon insert.

---

### analytics_events

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| type | text | — | NOT NULL |
| data | jsonb | '{}' | NOT NULL |
| ts | bigint | — | NOT NULL |
| session_id | text | — | |
| created_at | timestamptz | now() | |

**RLS:** Service role full. Anon insert. Anon read debug_* types.

---

### webrtc_signals

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | bigserial | auto | PK |
| room | text | — | NOT NULL |
| from_peer | text | — | NOT NULL |
| to_peer | text | — | |
| type | text | — | NOT NULL |
| payload | jsonb | '{}' | NOT NULL |
| created_at | timestamptz | now() | |

**RLS:** Anon insert/read. Service role full.

---

## RPCs

| Function | Signature | What it does |
|----------|-----------|--------------|
| `add_balance` | `(uid uuid, delta numeric) → void` | Upserts balance_ledger for user |
| `handle_new_user` | `() → trigger` | Auto-creates profile row on auth.users INSERT |
| `match_memories` | `(query_embedding vector(768), match_count int DEFAULT 12, profile_ids uuid[] DEFAULT '{}') → table` | Semantic search: returns content, similarity, source, profile_id, is_owner via HNSW cosine |

---

## Storage

| Bucket | Public | Notes |
|--------|--------|-------|
| `debug-pub` | yes | Anon read/write/update. Debug screenshots and logs. |

---

## Edge Functions

Base URL: `https://lkoatrkhuigdolnjsbie.supabase.co/functions/v1/`

All functions accept `Authorization: Bearer <jwt>` + `apikey: <anon_key>` headers.
All return JSON with CORS `Access-Control-Allow-Origin: *`.

### ai-router
**POST** — The Astranov AI chat router.

```json
// Request
{ "text": "...", "level": "global|national|personal", "country": "...", "city": "...", "vendor": "...", "preferred_provider": "astranov|claude|groq|gemini|openai-mini" }

// Response
{ "text": "...", "action": {...}|null, "owner": false, "provider": "astranov", "via": "claude|groq|gemini|openai-mini" }
```
Auth optional (JWT identifies user for memory). Provider chain: owner → Claude Opus → Groq → Gemini → OpenAI mini.
Reads/writes: `profiles`, `ai_memory`.

### brain
**POST** — Owner-only. Memory distillation + training export.

```json
{ "mode": "stats|distill|export" }
```
Auth: JWT required, owner-only (403 otherwise).
Reads/writes: `profiles`, `ai_memory`, `cic_logs`.

### astranov-api
**POST** — General API multiplexer.

| path | What | Auth |
|------|------|------|
| `/balance/recharge` | `{ "amount": 10 }` → adds AVC balance | JWT required |
| `/auth/owner-check` | `{ "user_id": "..." }` → `{ "authorized": bool }` | none |
| `/invoices/mydata` | AADE invoice submission (stub) | none |
| `/ai/krypteia/develop` | `{ "prompt": "...", "current_html": "..." }` → self-evolution | none |

### council
**POST** — Council of Thirteen. Owner-only.
```json
{ "mode": "list|convene", "title": "...", "description": "..." }
```
Reads/writes: `profiles`, `council_cases`.

### order-intake
**POST** — Creates order, assigns driver, broadcasts to vendor Realtime channel.
```json
{ "vendor_id": "...", "items": [...], "calc": {...}, "delivery_lat": 0, "delivery_lng": 0, "delivery_address": "..." }
```
Auth optional. Writes: `vendors` (upsert), `orders`.

### order-status
**POST** — Updates order status, broadcasts via Realtime.
```json
{ "order_id": "uuid", "status": "pending|accepted|preparing|in_transit|delivered|cancelled" }
```
Writes: `orders`.

### vendor-crawler
**POST** — Discovers POIs from OpenStreetMap Overpass API, upserts into vendors.
```json
{ "lat": 0, "lng": 0, "radius": 2000 }
```
No auth. Writes: `vendors`.

### vendor-menu
**POST** — AI-generates plausible menu for a vendor, caches in vendors.items.
```json
{ "vendor_id": "...", "vendor": { "name": "...", "category": "...", "tags": {...} } }
```
No auth. Reads/writes: `vendors`.

### payments
**POST** — Creates Stripe Checkout session.
```json
{ "mode": "payment|subscription", "amount_cents": 500, "currency": "eur", "item_name": "..." }
```
Returns `{ "url": "https://checkout.stripe.com/..." }`. Auth optional.

### stripe-webhook
**POST** — Stripe webhook handler. Verifies signature, records payment, credits AVC, computes 3% royalty.
Called by Stripe, not by client. Writes: `payments`, `royalties`. Calls RPC `credit_avc()`.

### informant-feed
**POST** — RSS news feed aggregator with geo-tagging.
```json
{ "informants": [{ "id": "...", "category": "news|jobs|commerce|social|dating|real_estate|classifieds" }] }
```
No auth. No DB access (pure RSS aggregation with in-memory cache).

### push-notify
**POST** — Web Push notifications via VAPID.
```json
{ "recipient_id": "uuid", "payload": { "type": "call|message|delivery", "title": "...", "body": "..." } }
```
Reads: `push_subscriptions`.

### anonymous-scan
**POST** — Privacy/anonymity scanner. Analyzes browser fingerprint.
```json
{ "fingerprint": {...} }
```
No auth. No DB access.

### krypteia-audit
**POST** — Owner-only. Static security audit of live astranov.eu bundle.
```json
{ "mode": "scan" }
```

### krypteia-watch
**POST** — Owner-only. IP-defense scanner — searches GitHub for code theft.
```json
{ "mode": "scan|list" }
```

### paypal / paypal-webhook / revolut
Stub files only — actual source deployed via MCP, not in repo.

---

## Auth Pattern

Owner-gated functions all use:
1. Extract JWT from `Authorization: Bearer <token>`
2. `supabase.auth.getUser(token)` → user ID
3. Query `profiles.is_owner` for that user
4. Return 403 if not owner

## Security Rules
- No API keys in frontend code (anon key is fine — it's publishable)
- Owner identity verified server-side only
- Never trust client-sent `owner` flag
- All tables have RLS enabled
- Service role key is backend-only (Edge Functions)
