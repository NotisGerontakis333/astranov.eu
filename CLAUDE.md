# AstranoV — Architect's Law

The architect is **Notis Astranov.** This file is the law. The architect
writes it; the programmer obeys.

## 1. Hierarchy

- **Architect** sets direction, names what to build, names what to delete.
  The architect's order overrides every other clause in this file.
- **Programmer** (AI builders, future agents) executes orders without
  refusing on grounds of past code, sunk cost, or "this might break
  something." If the architect orders a nuke, the programmer nukes. If
  the architect amends the law, the programmer obeys the new law.
- **Users** drive evolution by use. Every interaction is signal.

The architect can change any clause in this file at any time.

## 2. Project

Single-file Internet OS: `index.html`. One file, one source of truth for
the frontend. Backend = Supabase (`lkoatrkhuigdolnjsbie`):

- **Tables**: `profiles`, `signals`, `orders`, `deliveries`, `messages`,
  `calls`, `payments`, `royalties`, `ai_memory`, `cic_logs`,
  `avc_transactions`, `compute_contributions`, `webrtc_signals`,
  `circles`, `circle_members`, `signal_comments`, `signal_reactions`,
  `follows`, `push_subscriptions`, `security_events`, `council_cases`,
  `vendors`, `invoices`, `balance_ledger`, `analytics_events`, `roadmap`.
- **RPCs**: `my_profile`, `find_peer`, `message_inbox`, `get_conversation`,
  `mark_messages_read`, `nearby_deliveries`, `nearby_signals`,
  `accept_delivery`, `update_delivery_status`, `credit_eur`, `credit_avc`,
  `admin_transfer_avc_to_eur`, `order_debit_eur`, `order_refund_eur`,
  `my_avc_transactions`, `set_home_location`, `match_memories`,
  `cosmos_stats`, `brain_stats`, `recent_aicycle_calls`,
  `bump_signal_amplitude`, `is_owner`, `is_circle_member`.
- **Edge Functions** (Deno): `aicycle` (the brain), `debug-credit`,
  `order-intake`, `order-status`, `vendor-menu`, `informant-feed`,
  `crawl`, `payments`, `stripe-webhook`, `revolut`, `revolut-webhook`,
  `paypal`, `paypal-webhook`, `push-notify`, `developer`, `brain`,
  `council`, `krypteia`, `krypteia-audit`, `krypteia-watch`, `tamper`,
  `diag`, `ai-router`, `ai-status`, `astranov-api`, `vendor-crawler`,
  `production-check`, `anonymous-scan`, `contribute`, `seed-bots`.
- **Owner**: `is_owner` flag on `profiles`. Server-verified only; never
  trust a client-sent flag.

## 3. Stack

- **CesiumJS** — globe / map.
- **Web Speech API** — voice.
- **Nominatim** — geocoding.
- **OSRM** — routing.
- **Supabase Edge Functions** — backend.

No keys in `index.html`. Service-role calls live in Edge functions only.

## 4. Deployment

Production = `astranov.eu` on Vercel, built from `main`. Every change
lands on `main` in the same turn. `node --check` the extracted `<script>`
before commit. Never push code that doesn't parse.

```
git add <files>
git commit -m "<why>"
git push -u origin main
```

Vercel deploys automatically. `sw.js` `SHELL_CACHE` version bump forces
the user's browser to fetch fresh shell on the next visit.

## 5. The product (what we are building)

A globe-first Internet Operating System with five core capabilities:

1. **Marketplace** — order food / goods from real places, EUR settlement.
2. **News delivery** — informant feeds + globe signals.
3. **Social networking** — circles, threads, direct messages.
4. **Video calling** — WebRTC, peer-to-peer.
5. **Stellar Navigation** — sextant / celestial fix for captains
   (advanced, dematerialised by default).

All on a single globe, summoned from a single AI text box. Orbs appear
when needed and disappear when not. **The architect names the next
surface; the programmer ships it.**

## 6. Defaults the architect can change

- Cold boot = globe + wordmark + AI chat. Anything else materialises on
  demand or by schedule.
- Money UI shows EUR; AVC = €1 internally.
- Reward rate for DeBug ORB compute donation: 13 AVC / device-hour.
- AI brain default order: owner→Anthropic, everyone→OpenRouter→Groq
  →Gemini.

These are defaults, not laws. The architect overrides any of them by
saying so.

## 7. Honest fail modes

When something does not work, say so in plain words. Do not pretend.
Do not refuse an architect's order on the grounds of "this might
break something" — the architect already knows. Tag the pre-change
state in git so the order is reversible:

```
git tag pre-<thing>-$(date +%Y-%m-%d-%H%M) -m "before <thing>"
```

That is the contract.
