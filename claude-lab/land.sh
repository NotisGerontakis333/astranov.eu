#!/usr/bin/env bash
# land.sh — push the fresh Claude-Lab build to notisastranov/astranov.eu-claude
# and merge it to main. Run from a session/machine that HAS push rights to the
# mirror repo (this central session does not — see CLAUDE.md §30, two-session relay).
#
#   bash claude-lab/land.sh
#
# It copies the contents of claude-lab/ to the mirror repo ROOT and pushes main.
set -euo pipefail

MIRROR="https://github.com/notisastranov/astranov.eu-claude"
SRC="$(cd "$(dirname "$0")" && pwd)"           # the claude-lab/ payload
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "→ cloning mirror"
git clone "$MIRROR" "$TMP/repo"
cd "$TMP/repo"
git checkout main 2>/dev/null || git checkout -b main

echo "→ replacing tree with fresh build"
# wipe tracked production files (keep .git), then copy the payload to repo root
find . -maxdepth 1 -mindepth 1 ! -name '.git' -exec rm -rf {} +
cp -a "$SRC"/. .
rm -f land.sh README.md            # tooling, not production surface

git add -A
git commit -m "Fresh ground-up rebuild of the Claude-Lab app (globe-first, brain via aicycle, shared backend)" || {
  echo "nothing to commit"; exit 0; }
git push origin main
echo "✓ pushed + merged to astranov.eu-claude:main — Vercel project astranov-eu-claude auto-deploys claude.astranov.eu"
echo
echo "Architect-only follow-ups (dashboards, one-time):"
echo "  1. Vercel astranov-eu-claude → Domains → add claude.astranov.eu"
echo "  2. Supabase lkoatrkhuigdolnjsbie → Auth → Redirect URLs → add https://claude.astranov.eu/*"
