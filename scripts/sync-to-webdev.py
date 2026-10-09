#!/usr/bin/env python3
import os
import shutil
import sys

SRC_DIR = "/home/ubuntu/pediu-mobile"
DEST_DIR = "/home/ubuntu/pediu-app"

EXCLUDED_NAMES = {
    ".git",
    "node_modules",
    "android",
    "dist",
    ".expo",
    ".project-config.json",
    ".manus-logs",
    ".config",
}

EXCLUDED_SUFFIXES = (
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
)

def should_exclude(name, rel_path):
    if name in EXCLUDED_NAMES:
        return True
    for part in rel_path.split(os.sep):
        if part in EXCLUDED_NAMES:
            return True
    if any(name.endswith(suffix) for suffix in EXCLUDED_SUFFIXES):
        return True
    return False

def sync_dir(src, dest):
    print(f"=== Sincronizando Pediu Mobile (Git) -> Pediu App (WebDev) ===")
    print(f"Origem : {src}")
    print(f"Destino: {dest}")

    # Coleta arquivos e pastas de origem
    for root, dirs, files in os.walk(src):
        rel_root = os.path.relpath(root, src)
        if rel_root == ".":
            rel_root = ""

        # Filtra diretórios
        dirs[:] = [d for d in dirs if not should_exclude(d, os.path.join(rel_root, d))]

        dest_root = os.path.join(dest, rel_root)
        os.makedirs(dest_root, exist_ok=True)

        for f in files:
            rel_file = os.path.join(rel_root, f) if rel_root else f
            if should_exclude(f, rel_file):
                continue
            src_file = os.path.join(root, f)
            dest_file = os.path.join(dest_root, f)
            shutil.copy2(src_file, dest_file)

    print("=== Sincronização concluída com sucesso! ===")

if __name__ == "__main__":
    if not os.path.isdir(SRC_DIR):
        print(f"Erro: {SRC_DIR} não existe", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(DEST_DIR):
        print(f"Erro: {DEST_DIR} não existe", file=sys.stderr)
        sys.exit(1)
    sync_dir(SRC_DIR, DEST_DIR)
