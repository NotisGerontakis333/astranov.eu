# Claude-Lab — fresh ground-up build (mirror payload)

This directory is a **complete, from-scratch rewrite** of the AstranoV app for
`claude.astranov.eu` (repo `notisastranov/astranov.eu-claude`). It is NOT a copy
of the 15k-line apex `index.html` — it is a lean, independent single-file build
that shares the **same Supabase backend** (`lkoatrkhuigdolnjsbie`), per §30.

## Why it lives in the central repo

A single Claude Code session is bound to one GitHub repo by its allowlist
(`CLAUDE.md §30`). This session is scoped to `notisastranov/astranov` only —
it physically cannot push or merge to the mirror repo (verified: git proxy
"repository not authorized", GitHub MCP "access denied"). So the fresh build is
staged here and lands on the mirror via `land.sh` from a mirror-scoped session.

## What's in the build (`index.html`, one file)

- **Globe-first cold boot** — Cesium + Esri World Imagery (real satellite §10),
  Google-Maps gesture grammar re-asserted, wordmark + chat only.
- **The brain** — every prompt goes to the `aicycle` edge function (§14, no
  silent fallback): thinking stub, provider/model/latency badge, error + Retry.
- **Auth** — SIGN IN orb, email/password, architect magic link, test creds.
  Shared accounts across the whole federation.
- **Marketplace** — food keywords query real `vendors` near GPS, filtered to the
  §11 rule (priced + photographed items only); honest empty-state otherwise; hex
  pins on the globe. **No fabricated inventory.**
- **Voice** — LISTEN orb, EN/EL auto-toggle SpeechRecognition (§22).
- **Selene aesthetic** (§28) — full palette, Quicksand wordmark, bottom drawers
  with drag-to-dismiss + orb-push, draggable orbs (tap ≠ drag).
- **PWA** — `manifest.json` + network-first `sw.js` (`astranov-claude-shell-v1`).

Honest gaps (v1): video calling, Agora, wallet top-up, stellar navigation, and
on-device WebLLM own-mind are not yet wired — the brain runs through `aicycle`.
This is a real foundation to grow from, not a stub.

## Land it on the mirror

From a session/machine with push rights to `astranov.eu-claude`:

```bash
bash claude-lab/land.sh
```

Then the two architect-only dashboard steps (Vercel domain + Supabase redirect
URL) from `MIGRATE-TO-CLAUDE-SUBDOMAIN.md §Architect-only`.
