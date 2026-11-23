#!/usr/bin/env python3
"""Prépare un Worker Cloudflare qui embarque la version web exportée (dist web -> dossier du Worker).
Les fichiers sont copiés sous des noms neutres (blobs/fN.txt|bin) car wrangler gère mal les crochets
des routes dynamiques ([id]). Usage : build-worker.py <dossier export web> <dossier Worker> <nom du Worker>"""
import json, os, shutil, sys

src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
TEXT = {".html", ".js", ".css", ".json", ".svg"}
SKIP = {"_headers", "_redirects"}  # gérés par worker.js
shutil.rmtree(out, ignore_errors=True)
os.makedirs(os.path.join(out, "blobs"))
files = sorted(os.path.join(r, f) for r, _, fs in os.walk(src) for f in fs if f not in SKIP)
imports, entries = [], []
for i, p in enumerate(files):
    blob = f"blobs/f{i}." + ("txt" if os.path.splitext(p)[1] in TEXT else "bin")
    shutil.copyfile(p, os.path.join(out, blob))
    imports.append(f'import f{i} from "./{blob}";')
    entries.append(f"  {json.dumps('/' + os.path.relpath(p, src))}: f{i},")
with open(os.path.join(out, "manifest.js"), "w") as fh:
    fh.write("\n".join(imports) + "\nexport default {\n" + "\n".join(entries) + "\n};\n")
shutil.copyfile(os.path.join(os.path.dirname(__file__), "worker.js"), os.path.join(out, "worker.js"))
with open(os.path.join(out, "wrangler.jsonc"), "w") as fh:
    json.dump({"name": name, "main": "worker.js", "compatibility_date": "2026-11-01", "workers_dev": True, "preview_urls": False}, fh, indent=2)
print(f"{len(files)} fichiers -> {out}")
