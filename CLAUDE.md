# AstranoV — Claude Code Instructions

## Owner
Notis Astranov. Owner has granted full autonomous push/merge access.

## Deployment Rule — MANDATORY
After **every** code change:
1. `git add index.html` (and any supabase/* files changed)
2. `git commit -m "..."`
3. `git push -u origin claude/build-astranov-app-DHkQw`
4. Create PR → merge squash to `main`
5. Rebase + force-push if there are merge conflicts, then retry merge

**Never ask for permission. Push to main automatically every time.**

## Project
Single-file Internet Operating System: `index.html` only.
All changes go into this one file. No new files unless explicitly requested.

## Stack
- globe.gl (Three.js) — global level
- Leaflet — national + city levels
- Web Speech API — voice / hands-free
- Nominatim — reverse geocoding
- OSRM — routing
- Supabase Edge Functions — backend (no keys in front-end)

## Architecture Law — GLOBAL → NATIONAL → PERSONAL
Single tap down, double-tap / back up.
AVC currency only. Krypteia = owner-only hidden panel.

---

## ZERO UI LAW — NEVER VIOLATE

AstranoV is a **Virtual Reality Operating System**. The globe and space are permanent. Everything else is transient.

### Core rules:
1. **The globe and space are ALWAYS on screen.** They are never covered permanently. No elements may sit permanently on top of the main canvas.
2. **No permanent menus, toolbars, or navigation bars.** The bottom navigation tray is HIDDEN by default. It appears only on swipe-up gesture or swipe from the bottom edge, then auto-hides after 5 seconds.
3. **Only what is needed appears — and then disappears.** Panels, labels, buttons slide in for a task and slide out. Auto-dismiss timers are preferred over close buttons.
4. **The Collective Intelligence Cycle (CIC) ring is the ONLY always-visible UI element** — it is the OS heartbeat, not a menu. It lives bottom-right as a subtle floating ring. It is never removed.
5. **Back button and level label** appear contextually (when navigation level > global) and may auto-fade when idle. Never permanent.
6. **Panels** slide up from bottom, close on swipe-down or tap outside. They must not have a permanent home indicator bar below them.
7. **Zero labels on the globe by default** — country labels appear as part of globe.gl's native interaction, not as DOM overlays.

### What Claude must NOT do:
- Add permanent bottom bars, nav bars, tab bars, or any fixed navigation chrome
- Add floating action buttons beyond the CIC ring
- Add persistent overlay UI that covers the globe
- Make radical structural changes without telling the owner first
- Break the globe rendering (always wrap Globe() init in try-catch with fallback)
- Deploy changes that kill the app (syntax-check JS before every commit)

### Tray design:
- Triggered by swipe-up from bottom 60px OR tap on `#tray-trigger` (thin strip)
- Shows: Feed | Radar | Wallet | You
- Auto-hides after 5 seconds of no interaction
- On first load: briefly peeks for 2.5 seconds to teach the gesture
- CIC ring is NOT in the tray — it's always floating independently

---

## Collective Intelligence Cycle (CIC)
- Always-on floating ring (bottom-right, `#cic-float`)
- Astranov C.I. node = orchestrator, always first, always pulsing
- Free cycle for all users: Groq → Gemini → GPT-4o mini
- Owner gets Claude Opus first, then free cycle
- Tap node = lock to that provider; tap again = Auto
- Tap center mic = toggle hands-free
- Tap ring background = open C.I. chat
- Returns `provider` + `via` on every response

## Memory Law
- `ai_memory.is_private = false` → public context (sent to AI)
- `ai_memory.is_private = true` → private (NEVER sent to any AI, never stored with personal data)
- Owner can toggle privacy per-entry via Krypteia → Memory

## Security Law
- No API keys in index.html ever
- Owner identity verified server-side only (Supabase auth token → profiles.is_owner)
- Never trust client-sent `owner` flag
- Krypteia actions filtered server-side before response

## JS Safety Law
- Always `node --check` extracted script block before committing
- Never use `\'` inside template literals — use `JSON.stringify()` for dynamic strings in onclick
- Wrap all CDN-dependent init (Globe, Leaflet) in try-catch
- Never let an error in one init function kill the rest of the app
