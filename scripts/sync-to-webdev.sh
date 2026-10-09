#!/usr/bin/env bash
set -euo pipefail

# Sincronizador controlado do clone Git oficial (/home/ubuntu/pediu-mobile)
# para o projeto Mobile WebDev persistente da Manus (/home/ubuntu/pediu-app)

SRC_DIR="/home/ubuntu/pediu-mobile"
DEST_DIR="/home/ubuntu/pediu-app"

if [ ! -d "$SRC_DIR" ]; then
  echo "Erro: Diretório de origem $SRC_DIR não encontrado." >&2
  exit 1
fi

if [ ! -d "$DEST_DIR" ]; then
  echo "Erro: Diretório de destino WebDev $DEST_DIR não encontrado." >&2
  exit 1
fi

echo "=== Sincronizando Pediu Mobile (Git) -> Pediu App (WebDev) ==="
echo "Origem : $SRC_DIR"
echo "Destino: $DEST_DIR"

# Sincroniza arquivos de código, testes, migrations e assets, preservando:
# - .git do WebDev
# - .project-config.json
# - .manus-logs
# - node_modules
# Exclui do clone Git:
# - .git
# - node_modules
# - android/ (gerado localmente)
# - dist/
# - .env* (segredos locais do sandbox)
# - caches

rsync -av --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='android' \
  --exclude='dist' \
  --exclude='.expo' \
  --exclude='.project-config.json' \
  --exclude='.manus-logs' \
  --exclude='.config' \
  --exclude='*.env*' \
  "$SRC_DIR/" "$DEST_DIR/"

echo "=== Sincronização de arquivos concluída ==="
