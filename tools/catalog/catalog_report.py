#!/usr/bin/env python3
"""Writes docs/CATALOG.md from catalog.json (human review of every sourced fact)."""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
c = json.load(open(os.path.join(ROOT, "Packages/MotoForgeKit/Sources/MFCatalog/Resources/catalog.json")))
HS = {"approved": "Homologué", "approvedWithConditions": "Homologué sous conditions", "notApproved": "Non homologué", "notVerified": "Non vérifié"}
L = ["# Catalogue vérifié — Honda CB125R JC91", "",
     f"Révision {c['revision']} · générée le {c['generatedAt'][:10]} · toutes les données vérifiées le 25/11/2026.", "",
     "## Véhicule", ""]
for g in c["generations"]:
    L.append(f"- **{g['code']}** : {g['firstYear']}–{g['lastYear']}. Source : [{g['verification']['source']}]({g['verification'].get('sourceURL','')}). {g['verification'].get('notes','')}")
for v in c["variants"]:
    L.append(f"- **{v['versionName']}** — coloris : " + ", ".join(cw["name"] for cw in v["colorways"]) +
             f". Source : [{v['verification']['source']}]({v['verification'].get('sourceURL','')})")
L += ["", "## Références", "", "| # | Fabricant | Produit | Référence | Compatibilité (texte source) | Homologation (FR) | Prix | Source |", "|---|---|---|---|---|---|---|---|"]
n = 0
for a in c["accessories"]:
    for v in a["variants"]:
        n += 1
        comp = v["compatibilities"][0]
        h = v["homologations"][0] if v["homologations"] else None
        hs = HS[h["status"]] + (" — " + "; ".join(h["conditions"]) if h and h["conditions"] else "") if h else "Non vérifié"
        o = v["offers"][0] if v["offers"] else None
        price = f"{o['price']['amount']} {o['price']['currency']} ({o.get('taxNote') or ''}, {o['merchantName']})" if o else "non publié"
        src = comp["verification"]
        L.append(f"| {n} | {a['manufacturer']} | {a['commercialName']} | `{v['reference']}` | {comp.get('notes') or ''} | {hs} | {price} | [{src['source']}]({src.get('sourceURL','')}) |")
L += ["", "## Limites connues", "",
      "- Puig et R&G Racing bloquent la lecture automatisée de leurs fiches : leurs références sont sourcées via des revendeurs (prix revendeur, devise d'origine).",
      "- GIVI ne publie aucun prix : les références GIVI n'ont pas d'offre.",
      "- Aucune photo de produit n'est copiée (droits) : l'app montre la pièce en représentation 3D sur la moto quand elle existe, sinon renvoie au site du fabricant.",
      "- Les compatibilités sont rattachées à la version Europe (21YM–23YM)."]
open(os.path.join(ROOT, "docs/CATALOG.md"), "w").write("\n".join(L) + "\n")
print(n, "references")
