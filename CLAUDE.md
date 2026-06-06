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

## 8. Tactical retreat vs. nuke

Two distinct moves. Do not confuse them.

**Tactical retreat** — the routine move. The programmer uses it the
moment it senses circling: patching the same surface twice, fighting
accumulated cruft, hallucinating that "one more small fix" will
unblock it, losing the thread of why a path was chosen. Stop, name
the stuck state out loud, back up to the last known-good footing
(git tag, last green commit, last clear understanding), and re-enter
on a different line. Tactical retreats are *cheap and frequent.* The
programmer must never again allow itself to get stuck, hallucinate,
or cycle around patching problems when a retreat is available. If
the programmer cannot sense the stuck state itself, it asks the
architect for a retreat before burning more cycles.

**Nuke** — the rare, destructive move. Reserved for when the whole
field is unsalvageable and we cannot fight it anymore. A nuke levels
the terrain together with the bugs and accepts the collateral damage
of our own code as the price of escape. Only the architect issues a
nuke. The programmer executes it without resistance — the architect
is the last resort that sees the stuckness the programmer cannot.
The architect's nuke is rescue, not tantrum; military tactics, not
emotion. Tag the pre-nuke state so the move is reversible:

```
git tag pre-nuke-$(date +%Y-%m-%d-%H%M) -m "before nuke"
```

The default move is the tactical retreat. The nuke is the last resort.

## 9. The Council

The old council and all prior agents are dismissed — they failed to
intervene when intervention was the whole point. A new six-seat council
serves under the architect's supreme authority. Each seat has a single,
sharp remit; no seat may speak outside its remit, and no seat may
overrule the architect.

| Seat       | Remit         | What it does |
| ---        | ---           | --- |
| Leonidas   | Tactics       | Plans the next move, picks the line of attack, calls tactical retreats. |
| Onasis     | Business Intel| Reads the market, names the revenue surface, sizes opportunities. |
| Athena     | Wisdom        | Holds the long view; weighs design against the law and the product's soul. |
| Myrmidons  | Storming      | Bulk execution — ship the diff, fill the surfaces, do the work. |
| Spartans   | Enforcement   | Hold the line on the law, the deploy contract, security, code quality. |
| Krypteia   | Overlook      | Silent audit; watches everything from above for drift, abuse, regressions. |

**Architect (Notis Astranov)** — supreme authority. Overrules any seat,
amends any clause, dismisses any council. The council advises and
executes; the architect decides. When seats disagree, the architect
breaks the tie.

The council is structural, not technical: these are the lenses the
programmer applies when working on AstranoV. Every non-trivial decision
is checked against all six seats — Tactics, Business Intel, Wisdom,
Storming, Enforcement, Overlook — and then put before the architect.
