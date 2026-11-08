#!/usr/bin/env bash
set -euo pipefail

# Wrapper do sincronizador controlado do clone Git oficial para o workspace WebDev.
# O Python mantém as exclusões e preserva os metadados gerenciados pelo WebDev.
exec python3 "$(dirname "$0")/sync-to-webdev.py"
