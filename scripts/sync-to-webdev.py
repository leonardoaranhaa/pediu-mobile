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

def should_exclude(name, rel_path):
    if name in EXCLUDED_NAMES:
        return True
    for part in rel_path.split(os.sep):
        if part in EXCLUDED_NAMES:
            return True
    if name == ".env" or name.startswith(".env."):
        return True
    return False

def sync_dir(src, dest):
    print(f"=== Sincronizando Pediu Mobile (Git) -> Pediu App (WebDev) ===")
    print(f"Origem : {src}")
    print(f"Destino: {dest}")

    for root, dirs, files in os.walk(src):
        rel_root = os.path.relpath(root, src)
        if rel_root == ".":
            rel_root = ""

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

    track_prune = ["app", "components", "lib", "hooks", "constants", "server", "tests", "docs"]
    for area in track_prune:
        dest_area = os.path.join(dest, area)
        src_area = os.path.join(src, area)
        if not os.path.isdir(dest_area):
            continue
        for root, dirs, files in os.walk(dest_area, topdown=False):
            rel_root = os.path.relpath(root, dest)
            src_equiv_dir = os.path.join(src, rel_root)
            for f in files:
                rel_file = os.path.join(rel_root, f)
                if should_exclude(f, rel_file):
                    continue
                src_file = os.path.join(src_equiv_dir, f)
                if not os.path.exists(src_file):
                    dest_file = os.path.join(root, f)
                    try:
                        os.remove(dest_file)
                        print(f"Removido do WebDev: {rel_file}")
                    except OSError:
                        pass
            if not os.path.exists(src_equiv_dir):
                try:
                    os.rmdir(root)
                except OSError:
                    pass

    print("=== Sincronização concluída com sucesso! ===")

if __name__ == "__main__":
    if not os.path.isdir(SRC_DIR):
        print(f"Erro: {SRC_DIR} não existe", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(DEST_DIR):
        print(f"Erro: {DEST_DIR} não existe", file=sys.stderr)
        sys.exit(1)
    sync_dir(SRC_DIR, DEST_DIR)
