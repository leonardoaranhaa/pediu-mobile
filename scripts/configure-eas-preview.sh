#!/usr/bin/env bash
set -euo pipefail

ENV_DIR="${PEDIU_EAS_ENV_DIR:-$HOME/.config/pediu}"
ENV_FILE="${PEDIU_EAS_ENV_FILE:-$ENV_DIR/eas-preview.env}"
mkdir -p "$ENV_DIR"
umask 077

echo "Configuração segura do preview EAS Pediu"
echo "O token será solicitado sem aparecer na tela."
printf 'EXPO_TOKEN: '
IFS= read -r -s expo_token
echo
if [[ -z "$expo_token" ]]; then
  echo "EXPO_TOKEN não pode ficar vazio." >&2
  exit 2
fi

read -r -p "URL HTTPS pública estável da API preview: " api_url
read -r -p "EXPO_PUBLIC_APP_ID [pediu-preview]: " app_id
app_id="${app_id:-pediu-preview}"
read -r -p "EAS project ID (opcional; Enter para descobrir depois): " eas_project_id
read -r -p "OAuth portal público (opcional): " oauth_portal_url
read -r -p "OAuth server público (opcional): " oauth_server_url

if [[ "$api_url" != https://* ]]; then
  echo "A API preview precisa usar HTTPS." >&2
  exit 2
fi
case "$api_url" in
  https://localhost*|https://127.0.0.1*|https://0.0.0.0*|https://*.manus.computer)
    echo "Não use localhost nem URL temporária da sandbox como API do APK/iOS." >&2
    exit 2
    ;;
esac

cat > "$ENV_FILE" <<EOF
# Arquivo local protegido; não versionar.
EXPO_TOKEN=$expo_token
EXPO_PUBLIC_API_BASE_URL=$api_url
EXPO_PUBLIC_APP_ID=$app_id
EAS_PROJECT_ID=$eas_project_id
EXPO_PUBLIC_OAUTH_PORTAL_URL=$oauth_portal_url
EXPO_PUBLIC_OAUTH_SERVER_URL=$oauth_server_url
EOF
chmod 600 "$ENV_FILE"
chmod 700 "$ENV_DIR"
printf 'Ambiente salvo em %s com permissões restritas.\n' "$ENV_FILE"
printf 'Próximo passo: source %s\n' "$HOME/.config/pediu/load-eas-preview-env.sh"
