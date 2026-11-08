#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PEDIU_PREVIEW_ENV_FILE:-$HOME/.config/pediu/sandbox-preview.env}"
PREVIEW_ROOT="${PREVIEW_ROOT:-$HOME/.cache/pediu/sandbox-preview}"
PREVIEW_PORT="${PREVIEW_PORT:-8081}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Arquivo de preview ausente: $ENV_FILE" >&2
  echo "Crie-o fora do Git com EXPO_PUBLIC_API_BASE_URL apontando para a API." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"
: "${EXPO_PUBLIC_API_BASE_URL:?EXPO_PUBLIC_API_BASE_URL não definido}"

cd "$ROOT_DIR"
rm -rf "$PREVIEW_ROOT"
mkdir -p "$PREVIEW_ROOT"

EXPO_USE_METRO_WORKSPACE_ROOT=1 npx expo export \
  --platform web \
  --output-dir "$PREVIEW_ROOT"

export PREVIEW_ROOT PREVIEW_PORT
exec node scripts/serve-sandbox-preview.mjs
