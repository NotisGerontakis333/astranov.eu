#!/usr/bin/env bash
# AstranoV — full recreation driver.
# Automates the mechanical steps from RECREATE.md. Read that file first;
# this script assumes the secrets/owner/seed are handled out-of-band (§1, §3h).
#
# Usage:
#   PROJECT_REF=lkoatrkhuigdolnjsbie ./recreate.sh <step|all>
# Steps: link  schema  buckets  functions  secrets  frontend  verify  all
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-lkoatrkhuigdolnjsbie}"
SUPABASE_URL="${SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
STEP="${1:-all}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ missing: $1"; exit 1; }; }

step_link() {
  need supabase
  supabase link --project-ref "$PROJECT_REF"
}

step_schema() {
  # Pull the LIVE schema (authoritative — migrations/ is partial history).
  need supabase
  mkdir -p "$ROOT/supabase"
  supabase db dump --linked --schema public  -f "$ROOT/supabase/schema.sql"
  supabase db dump --linked --schema storage -f "$ROOT/supabase/storage.sql"
  echo "→ wrote supabase/schema.sql + storage.sql"
  echo "  apply to a NEW project with:  psql \"\$DATABASE_URL\" -f supabase/schema.sql"
}

step_buckets() {
  need supabase
  supabase db query --linked <<'SQL'
insert into storage.buckets (id,name,public) values
  ('vendor-photos','vendor-photos',true),
  ('debug-pub','debug-pub',true)
on conflict (id) do update set public = excluded.public;
SQL
}

step_functions() {
  need supabase
  for fn in "$ROOT"/supabase/functions/*/; do
    name="$(basename "$fn")"
    echo "→ deploy $name"
    supabase functions deploy "$name" --project-ref "$PROJECT_REF"
  done
}

step_secrets() {
  need supabase
  : "${ANTHROPIC_API_KEY:?set provider secrets in your env first (see RECREATE.md §1)}"
  supabase secrets set --project-ref "$PROJECT_REF" \
    ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
    ANTHROPIC_PAID_API_KEY="${ANTHROPIC_PAID_API_KEY:-}" \
    ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-}" \
    OPENROUTER="${OPENROUTER:-}" OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}" \
    OPENROUTER_MODEL="${OPENROUTER_MODEL:-}" \
    GROQ_API_KEY="${GROQ_API_KEY:-}" GROQ_MODEL="${GROQ_MODEL:-}" \
    GEMINI_API_KEY="${GEMINI_API_KEY:-}" GEMINI_MODEL="${GEMINI_MODEL:-}" \
    OPENAI_API_KEY="${OPENAI_API_KEY:-}" CRAWL_SECRET="${CRAWL_SECRET:-}" \
    GITHUB_TOKEN="${GITHUB_TOKEN:-}" \
    GITHUB_REPO="${GITHUB_REPO:-notisastranov/astranov}" \
    GITHUB_BRANCH="${GITHUB_BRANCH:-main}" \
    STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" \
    STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
}

step_frontend() {
  # Deploy contract §4: the extracted <script> MUST parse before commit.
  need node
  awk '/<script>/{f=1;next} /<\/script>/{f=0} f' "$ROOT/index.html" > /tmp/astranov-script.js || true
  if [ -s /tmp/astranov-script.js ]; then
    node --check /tmp/astranov-script.js && echo "✓ inline <script> parses"
  fi
  echo "→ push main; Vercel auto-builds astranov.eu. Bump SHELL_CACHE in sw.js on shell changes."
}

step_verify() {
  : "${SUPABASE_ANON:?set SUPABASE_ANON to probe diag}"
  curl -s "${SUPABASE_URL}/functions/v1/diag" \
    -H "apikey: ${SUPABASE_ANON}" -H "Authorization: Bearer ${SUPABASE_ANON}" \
    -H 'Content-Type: application/json' -d '{}'
  echo
}

case "$STEP" in
  link)      step_link ;;
  schema)    step_schema ;;
  buckets)   step_buckets ;;
  functions) step_functions ;;
  secrets)   step_secrets ;;
  frontend)  step_frontend ;;
  verify)    step_verify ;;
  all)       step_link; step_schema; step_buckets; step_functions; step_secrets; step_frontend; step_verify ;;
  *) echo "unknown step: $STEP (link|schema|buckets|functions|secrets|frontend|verify|all)"; exit 1 ;;
esac
