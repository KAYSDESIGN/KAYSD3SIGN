#!/usr/bin/env python3
"""
Builds Packages/MotoForgeKit/Sources/MFCatalog/Resources/catalog.json from sourced data.

Every fact below was read on the cited page on VERIFIED_AT. Nothing is inferred:
 - compatibility only when the manufacturer/retailer page names the CB125R and covers 2021 (JC91 years);
 - homologation only when the page states it (and its conditions);
 - prices exactly as shown, with currency and tax note. Missing price -> no offer.

Visual data (views + masks) is read from the rendered assets folder (tools/bike3d output) so mask bounds
always match the images. Run:  python3 tools/catalog/build_catalog.py <assets_dir>
"""
import json, os, sys
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "Packages/MotoForgeKit/Sources/MFCatalog/Resources/catalog.json")
ASSETS = sys.argv[1] if len(sys.argv) > 1 else None
ACC_ASSETS = sys.argv[2] if len(sys.argv) > 2 else None
VERIFIED_AT = "2026-11-25T00:00:00Z"

def ver(source, url=None, notes=None):
    v = {"status": "verified", "source": source, "verifiedAt": VERIFIED_AT}
    if url: v["sourceURL"] = url
    if notes: v["notes"] = notes
    return v

HONDA_JP = "https://global.honda/jp/news/2021/2210319-cb125r.html"
HONDA_EU_2021 = "https://global.honda/newsroom/news/2020/2201111eng.html"
HONDA_EU_2024 = "https://hondanews.eu/eu/lv/motorcycles/media/pressreleases/472259/2024-honda-cb125r"
PADGETTS_21YM = "https://www.padgettsmotorcycles.com/honda/21ym-honda-cb125r/"

GEN = "honda.cb125r.jc91"
EU = f"{GEN}.eu"
JP = f"{GEN}.jp"

# ---------------------------------------------------------------- components (match tools/bike3d object slugs)
KINDS = {
    "tank": "tank", "tank-shrouds": "tankShrouds", "front-fender": "frontFender", "rear-fender": "rearFender",
    "tail-section": "tailSection", "front-wheel": "frontWheel", "rear-wheel": "rearWheel", "fork": "fork",
    "frame": "frame", "swingarm": "swingarm", "handlebar": "handlebar", "levers": "levers",
    "brake-calipers": "brakeCalipers", "seat": "seat", "engine-covers": "engineCovers", "protections": "protections",
}
NAMES = {
    "tank": "Réservoir", "tank-shrouds": "Écopes", "front-fender": "Garde-boue avant", "rear-fender": "Garde-boue arrière",
    "tail-section": "Coque arrière", "front-wheel": "Jante avant", "rear-wheel": "Jante arrière", "fork": "Fourche",
    "frame": "Cadre", "swingarm": "Bras oscillant", "handlebar": "Guidon", "levers": "Leviers",
    "brake-calipers": "Étriers de frein", "seat": "Selle", "engine-covers": "Caches moteur", "protections": "Sabot moteur",
}
components = [{"id": f"{GEN}.{slug}", "kind": {kind: {}}, "displayName": NAMES[slug], "supportedModes": ["paint", "wrap"]}
              for slug, kind in KINDS.items()]

# ---------------------------------------------------------------- views from rendered assets
ANGLES = ["front", "rear", "leftProfile", "rightProfile", "frontThreeQuarter", "rearThreeQuarter"]
views = []
if ASSETS:
    from PIL import Image
    import numpy as np
    for angle in ANGLES:
        base = os.path.join(ASSETS, f"cb125r_{angle}.png")
        if not os.path.exists(base):
            continue
        w, h = Image.open(base).size
        masks = []
        for slug in KINDS:
            p = os.path.join(ASSETS, f"mask_{angle}_{slug}.png")
            if not os.path.exists(p):
                continue
            a = np.asarray(Image.open(p).convert("L"), dtype=np.uint8)
            ys, xs = np.nonzero(a > 127)
            if len(xs) < 40:  # not visible from this angle
                continue
            area = len(xs)
            masks.append({
                "componentID": f"{GEN}.{slug}",
                "maskAsset": f"mask_{angle}_{slug}",
                "bounds": {"x": xs.min() / w, "y": ys.min() / h, "width": (xs.max() - xs.min() + 1) / w, "height": (ys.max() - ys.min() + 1) / h},
                "_area": area,
            })
        # masks never overlap (rendered with occlusion); smaller parts on top for hit-testing
        for z, m in enumerate(sorted(masks, key=lambda m: -m["_area"])):
            m["zIndex"] = z; del m["_area"]
        views.append({
            "id": f"{GEN}.view.{angle}", "angle": angle, "baseImageAsset": f"cb125r_{angle}",
            "pixelWidth": w, "pixelHeight": h, "masks": masks,
            "license": ver("Rendu 3D MOTOFORGE (tools/bike3d/cb125r_jc91.py), propriété du projet",
                           notes="Représentation 3D simplifiée construite aux cotes officielles Honda (empattement 1345 mm, "
                                 "longueur 2040 mm, pneus 110/70R17 et 150/60R17). Ce n'est pas une photographie."),
        })

# ---------------------------------------------------------------- vehicle data
def colorway(id_, name, src, url, notes=None):
    return {"id": id_, "name": name, "manufacturerCodes": [], "componentMaterials": {}, "verification": ver(src, url, notes)}

eu_colorways = [
    colorway(f"{EU}.pearl-smoky-gray", "Pearl Smoky Gray", "Padgett's Motorcycles, concession Honda (21YM HONDA CB125R)", PADGETTS_21YM,
             "Teinte confirmée par Honda Japon (パールスモーキーグレー)."),
    colorway(f"{EU}.mat-gunpowder-black-metallic", "Mat Gunpowder Black Metallic", "Padgett's Motorcycles, concession Honda (21YM HONDA CB125R)", PADGETTS_21YM,
             "Teinte confirmée par Honda Japon (マットガンパウダーブラックメタリック)."),
    colorway(f"{EU}.candy-chromosphere-red", "Candy Chromosphere Red", "Padgett's Motorcycles, concession Honda (21YM HONDA CB125R)", PADGETTS_21YM,
             "Teinte confirmée par Honda Japon (キャンディークロモスフィアレッド)."),
    colorway(f"{EU}.mat-jeans-blue-metallic", "Mat Jeans Blue Metallic", "Padgett's Motorcycles, concession Honda (21YM HONDA CB125R)", PADGETTS_21YM),
]
jp_colorways = [
    colorway(f"{JP}.matte-gunpowder-black-metallic", "Matte Gunpowder Black Metallic (マットガンパウダーブラックメタリック)", "Honda Japon, communiqué du 19/03/2021", HONDA_JP),
    colorway(f"{JP}.pearl-smoky-grey", "Pearl Smoky Grey (パールスモーキーグレー)", "Honda Japon, communiqué du 19/03/2021", HONDA_JP),
    colorway(f"{JP}.candy-chromosphere-red", "Candy Chromosphere Red (キャンディークロモスフィアレッド)", "Honda Japon, communiqué du 19/03/2021", HONDA_JP),
]
variants = [
    {"id": EU, "generationID": GEN, "versionName": "Europe · 21YM–23YM (Euro 5, 11 kW)", "colorways": eu_colorways,
     "components": components, "views": views,
     "verification": ver("Honda Motor Europe, annonce de la gamme 2021 (11/11/2020)", HONDA_EU_2021,
                         "Nouveau moteur 4 soupapes 11 kW, fourche Showa SFF-BP 41 mm, disque flottant 296 mm, étrier radial 4 pistons, ABS IMU.")},
    {"id": JP, "generationID": GEN, "year": 2021, "versionName": "Japon · 8BJ-JC91", "colorways": jp_colorways,
     "components": components, "views": views,
     "verification": ver("Honda Japon, communiqué du 19/03/2021 (type 8BJ-JC91, moteur JC91E)", HONDA_JP,
                         "2040×820×1055 mm, empattement 1345 mm, selle 815 mm, 130 kg, 11 kW à 10 000 tr/min, 12 N·m à 8000 tr/min, réservoir 10 L.")},
]
generation = {"id": GEN, "modelID": "honda.cb125r", "code": "JC91", "firstYear": 2021, "lastYear": 2023,
              "verification": ver("Honda Japon (type 8BJ-JC91, 19/03/2021) et Honda Motor Europe (modèle 2021, 11/11/2020 ; 24YM, 21/03/2024)", HONDA_JP,
                                  "Le millésime 24YM (Euro 5+, écran TFT 5 pouces) est traité comme JC95 conformément au périmètre du projet ; "
                                  "certaines fiches japonaises conservent le type 8BJ-JC91 pour 2024.")}

# ---------------------------------------------------------------- accessories
def offer(merchant, url, amount, currency, tax_note, source):
    return {"merchantName": merchant, "url": url, "price": {"amount": amount, "currency": currency}, "taxNote": tax_note,
            "verification": ver(source, url)}

def compat(source, url, notes=None, adapters=()):
    return [{"vehicleVariantIDs": [EU], "requiredAdapters": list(adapters), "notes": notes, "verification": ver(source, url)}]

def homolog(status, source, url, conditions=(), numbers=()):
    return [{"countryCode": "FR", "vehicleVariantID": EU, "status": status, "approvalNumbers": list(numbers),
             "conditions": list(conditions), "verification": ver(source, url)}]

accessories = []
def add(id_, category, name, manufacturer, mfr_url, description, materials, variants_, src, src_url):
    accessories.append({"id": id_, "category": category, "commercialName": name, "manufacturer": manufacturer,
                        "manufacturerURL": mfr_url, "description": description, "materials": materials, "photos": [],
                        "variants": [dict(v, accessoryID=id_) for v in variants_], "verification": ver(src, src_url)})

def var(id_, ref, colorway, compat_, homolog_=(), offers=()):
    return {"id": id_, "reference": ref, "colorway": colorway, "compatibilities": compat_, "homologations": list(homolog_),
            "offers": list(offers), "visualAssets": []}

# MIVV (mivv.com, prices excl. VAT as listed by the manufacturer)
def mivv_url(code): return f"https://mivv.com/en/exhaust/{code.lower().replace('.', '-')}-honda-cb-125-r-2021/"
MIVV_SRC = "MIVV, fiche produit officielle"
gp_cond = ["Homologation valable uniquement avec le catalyseur MIVV ACC.073.A1 (vendu séparément).",
           "Euro 5 uniquement : incompatible avec les véhicules Euro 5+ à sonde lambda post-catalyseur.",
           "dB-killer amovible requis pour la conformité."]
gp_variants = []
for code, finish, price in (("H.077.L2P", "Carbone (corps central), finition brillante", 536), ("H.077.L6P", "Titane (corps central), finition perlée", 536),
                            ("H.077.LXBP", "Inox noir « Black Moon »", 477)):
    u = mivv_url(code)
    gp_variants.append(var(f"mivv.gp-pro.cb125r21.{code.lower()}", code, finish,
                           compat(MIVV_SRC, u, "HONDA CB 125 R 2021 > 2024"),
                           homolog("approvedWithConditions", MIVV_SRC, u, gp_cond),
                           [offer("MIVV (prix catalogue)", u, price, "EUR", "HT", MIVV_SRC)]))
add("mivv.gp-pro.cb125r21", "exhausts", "Échappement GP PRO", "MIVV", "https://mivv.com/en/",
    "Silencieux GP PRO pour CB 125 R 2021 > 2024. Fabricant : +1,8 ch et +0,9 N·m au banc, -1 kg (4,00 → 3,00 kg).",
    ["Carbone", "Titane", "Inox"], gp_variants, MIVV_SRC, mivv_url("H.077.L2P"))

mk3_variants = []
for code, finish, price in (("H.078.SM3B", "Inox 304 noir « Black Moon »", 343), ("H.078.SM3X", "Inox 304 brossé", 322)):
    u = mivv_url(code)
    mk3_variants.append(var(f"mivv.mk3.cb125r21.{code.lower()}", code, finish, compat(MIVV_SRC, u, "HONDA CB 125 R 2021 > 2024"),
                            homolog("notApproved", MIVV_SRC, u),
                            [offer("MIVV (prix catalogue)", u, price, "EUR", "HT", MIVV_SRC)]))
add("mivv.mk3.cb125r21", "exhausts", "Échappement MK3", "MIVV", "https://mivv.com/en/",
    "Silencieux MK3 « racing » pour CB 125 R 2021 > 2024. Non homologué pour un usage routier selon le fabricant. -2 kg (4,00 → 2,00 kg).",
    ["Inox 304"], mk3_variants, MIVV_SRC, mivv_url("H.078.SM3B"))

u = mivv_url("H.077.L2P")
add("mivv.catalyst.acc073a1", "exhausts", "Catalyseur pour GP PRO", "MIVV", "https://mivv.com/en/",
    "Catalyseur nécessaire à l'homologation des silencieux GP PRO sur CB 125 R 2021 > 2024 (listé comme accessoire sur les fiches GP PRO).",
    [], [var("mivv.catalyst.acc073a1.std", "ACC.073.A1", "Standard", compat(MIVV_SRC, u, "Accessoire listé pour HONDA CB 125 R 2021 > 2024"),
             offers=[offer("MIVV (prix catalogue)", u, 130, "EUR", "HT", MIVV_SRC)])], MIVV_SRC, u)

# LeoVince
LV_URL = "https://www.leovince.com/en-hr/product/14391ek-lv-one-evo-carbon-fiber-honda-cb-125-r-neo-sports-cafe-2021-2023"
add("leovince.lv-one-evo.cb125r21", "exhausts", "LV ONE EVO Carbon", "LeoVince", "https://www.leovince.com/",
    "Silencieux carbone pré-imprégné, embout carbone. 3,74 kg. Produit indiqué comme arrêté par le fabricant (plus vendu sur sa boutique).",
    ["Carbone"], [var("leovince.lv-one-evo.cb125r21.14391ek", "14391EK", "Carbone mat",
                      compat("LeoVince, fiche produit officielle", LV_URL, "HONDA CB 125 R Neo Sports Café 2021 - 2023"),
                      homolog("approvedWithConditions", "LeoVince, fiche produit officielle", LV_URL,
                              ["Homologué ECE/UE (bruit ECE-R92, émissions 134/2014) pour les seuls types listés dans l'ePass du fabricant."]))],
    "LeoVince, fiche produit officielle", LV_URL)

# Arrow (retailer data; manufacturer site requires interaction)
EP_URL = "https://www.easyparts.com/Exhaust-ARROW-X-Kone-Nichrom-C-Honda-CB-125i-R-E5-2021-p33832547"
EP_SRC = "EasyParts (revendeur), fiche produit Arrow"
add("arrow.x-kone.cb125r21", "exhausts", "Silencieux X-Kone Nichrom", "Arrow", "https://www.arrow.it/",
    "Silencieux X-Kone, corps Nichrom satiné, embout carbone, Ø 45 mm, environ 2,2 kg. Version Euro 5 « Honda Type JC91 Vers. 1 ».",
    ["Nichrom", "Carbone"], [var("arrow.x-kone.cb125r21.51519xkiw", "51519XKIW", "Nichrom / embout carbone",
                                 compat(EP_SRC, EP_URL, "Honda CB 125i R H2O 4T E5 2021-2024"),
                                 homolog("approvedWithConditions", EP_SRC, EP_URL, ["Homologation CE uniquement avec le catalyseur Arrow 11030KZ."]),
                                 [offer("EasyParts", EP_URL, 450.18, "EUR", "Prix revendeur, TVA à confirmer sur le site", EP_SRC)])],
    EP_SRC, EP_URL)
add("arrow.catalyst.cb125r21", "exhausts", "Catalyseur pour X-Kone", "Arrow", "https://www.arrow.it/",
    "Catalyseur requis pour l'homologation CE du silencieux X-Kone 51519XKIW.",
    [], [var("arrow.catalyst.cb125r21.11030kz", "11030KZ", "Standard", compat(EP_SRC, EP_URL, "Produit recommandé avec 51519XKIW pour CB 125i R E5 2021-2024"),
             offers=[offer("EasyParts", EP_URL, 125.62, "EUR", "Prix revendeur", EP_SRC)])], EP_SRC, EP_URL)

# Puig (retailer pages; puig product pages refuse automated access)
AC_URL = "https://acmotos.com/en/puig-r19-frame-sliders-9654n-honda-cb125r-neo-sports-cafe"
add("puig.r19.cb125r", "frameProtection", "Tampons de protection R19", "Puig", "https://puigusa.com/en/bikes/honda/cb125r-neo-sports-cafe/2021",
    "Tampons de cadre R19, embouts caoutchouc gris par défaut (autres couleurs d'embouts proposées par le revendeur).",
    ["Aluminium", "Nylon"], [var("puig.r19.cb125r.9654n", "9654N", "Noir",
                                 compat("ACMOTOS (revendeur), fiche Puig 9654N", AC_URL, "HONDA CB125R Neo Sports Cafe 2018-2026"),
                                 offers=[offer("ACMOTOS", AC_URL, 121.99, "EUR", "TTC (TVA 21 %), prix hors promotion", "ACMOTOS (revendeur)")])],
    "ACMOTOS (revendeur)", AC_URL)
DD_URL = "https://driftndrive.com.au/products/9653n"
add("puig.license-support.cb125r", "licensePlateHolders", "Support de plaque", "Puig", "https://puigusa.com/en/bikes/honda/cb125r-neo-sports-cafe/2021",
    "Support de plaque court conçu pour conserver les clignotants et l'éclairage de plaque d'origine.",
    [], [var("puig.license-support.cb125r.9653n", "9653N", "Noir",
             compat("DriftnDrive (revendeur), fiche Puig 9653N", DD_URL, "HONDA CB125R NEO SPORTS CAFE (2018-2026)"),
             offers=[offer("DriftnDrive", DD_URL, 199.95, "AUD", "TTC", "DriftnDrive (revendeur)")])],
    "DriftnDrive (revendeur)", DD_URL)

# R&G Racing (sportsbikeshop.co.uk; rg-racing.com refuses automated access)
SBS_RAD = "https://www.sportsbikeshop.co.uk/motorcycle_parts/content_prod/729335"
SBS_CP = "https://www.sportsbikeshop.co.uk/motorcycle_parts/content_prod/676789"
add("rg.radiator-guard.cb125r", "engineProtection", "Grille de radiateur", "R&G Racing", "https://www.rg-racing.com/browsebike/Honda/CB125R/2021",
    "Grille de protection de radiateur spécifique CB125R.",
    ["Aluminium"], [var(f"rg.radiator-guard.cb125r.{c.lower()}", f"RAD0235 ({c})", c,
                        compat("Sportsbikeshop (revendeur), fiche R&G RAD0235", SBS_RAD, "Honda CB125R ('18-22)"),
                        offers=[offer("Sportsbikeshop", SBS_RAD, 59.99, "GBP", "TTC (PVC 70,99 £)", "Sportsbikeshop (revendeur)")])
                    for c in ("Black", "Titanium")],
    "Sportsbikeshop (revendeur)", SBS_RAD)
add("rg.aero-crash-protectors.cb125r21", "frameProtection", "Tampons Aero", "R&G Racing", "https://www.rg-racing.com/browsebike/Honda/CB125R/2021",
    "Tampons de protection style Aero, montage sur le cadre, aucune modification requise selon le revendeur.",
    [], [var("rg.aero-crash-protectors.cb125r21.cp0522bl", "CP0522BL", "Noir",
             compat("Sportsbikeshop (revendeur), fiche R&G CP0522BL", SBS_CP, "Honda CB125R ('21-22)"),
             offers=[offer("Sportsbikeshop", SBS_CP, 74.36, "GBP", "TTC (PVC 88,00 £)", "Sportsbikeshop (revendeur)")])],
    "Sportsbikeshop (revendeur)", SBS_CP)

# GIVI (official compatibility finder "HONDA > cb 125 r (21 > 26)"; Givi publishes no prices)
GIVI_BIKE = "https://www.givi.it/per-la-tua-moto/bike/honda/cb-125-r-21--26"
def givi_url(cat, slug): return f"https://www.givi.it/per-la-tua-moto/product/honda/cb-125-r-21--26/{cat}/{slug}"
GIVI_SRC = "GIVI, configurateur officiel « HONDA > cb 125 r (21 > 26) »"
def givi(code, slug, cat, name, category, desc, colour, adapters=(), url=None):
    u = url or givi_url(cat, slug)
    add(f"givi.{slug}", category, name, "GIVI", GIVI_BIKE, desc, [],
        [var(f"givi.{slug}.std", code, colour, compat(GIVI_SRC, u, "HONDA > cb 125 r (21 > 26)", adapters))], GIVI_SRC, u)

givi("SR1169", "sr1169", "optionals", "Support arrière MONOLOCK", "other",
     "Fixation arrière spécifique pour top case MONOLOCK (platine fournie avec le top case).", "Noir")
givi("TN1199", "tn1199", "optionals", "Pare-carters tubulaire", "engineProtection",
     "Pare-carters tubulaire spécifique noir, slider intégré, tube Ø 25 mm. Montage conseillé par un professionnel.", "Noir")
givi("A1164", "a1164", "screen", "Saute-vent fumé", "windscreens", "Saute-vent fumé 21 × 28 cm avec kit de fixation.", "Fumé",
     url=GIVI_BIKE)
givi("S312", "s312-led-projectors", "engine", "Projecteurs LED S312", "lighting",
     "Paire de projecteurs LED 25 W (6000 lm), corps aluminium peint noir, à raccorder sous clé par un professionnel.", "Noir", ["TN1199"])
TOPCASES = [
    ("B45+", "b45", "Top case B45+ (45 L)", "Noir, inserts gris", "45 L, deux casques intégraux"),
    ("B39NT TECH", "b39nt-tech", "Top case B39NT TECH (39 L)", "Noir, catadioptres argent", "39 L"),
    ("B47 BLADE", "b47-blade", "Top case B47 BLADE (47 L)", "Noir, catadioptres rouges", "47 L"),
    ("B47 BLADE TECH", "b47-blade-tech", "Top case B47 BLADE TECH (47 L)", "Noir, catadioptres fumés", "47 L"),
    ("E46 RIVIERA TECH", "e46-riviera-tech", "Top case E46 RIVIERA TECH (46 L)", "Noir", "46 L, deux casques intégraux"),
    ("E455 SIMPLY IV", "e455-simply-iv", "Top case E455 SIMPLY IV (45 L)", "Noir, catadioptres rouges", "45 L, charge max 3 kg"),
    ("B37 BLADE", "b37-blade", "Top case B37 BLADE (37 L)", "Noir, catadioptres rouges", "37 L"),
    ("C30", "c30", "Top case C30 (30 L)", "Noir, catadioptres rouges", "30 L"),
    ("ALP44A2 ALPINA", "alp44a2-alpina", "Top case ALP44A2 ALPINA (44 L)", "Aluminium naturel", "44 L, aluminium 1,2 mm"),
    ("B39N", "b39n", "Top case B39N", "Noir", "MONOLOCK"),
    ("E340 VISION", "e340-vision", "Top case E340 VISION", "Noir", "MONOLOCK"),
    ("B38 BERNINA", "b38-bernina", "Top case B38 BERNINA", "Noir", "MONOLOCK"),
]
for code, slug, name, colour, desc in TOPCASES:
    listed_only = code in ("B39N", "E340 VISION", "B38 BERNINA")
    givi(code, slug, "topcase", name, "other", f"Top case MONOLOCK, {desc}. Platine et kit universel inclus. Nécessite le support SR1169.",
         colour, ["SR1169"], url=GIVI_BIKE if listed_only else None)

# ---------------------------------------------------------------- accessory visuals (tools/bike3d --accessory)
ACC_VISUALS = {  # render id -> (catalog variant ids, hidden components, extra erase part)
    "givi-b45-sr1169": (["givi.b45.std"], [], None),
    "givi-a1164": (["givi.a1164.std"], [], None),
    "rg-radiator-guard": (["rg.radiator-guard.cb125r.black"], [], None),
    "puig-9653n": (["puig.license-support.cb125r.9653n"], ["rear-fender"], None),
    "givi-tn1199": (["givi.tn1199.std"], [], None),
    "rg-aero-cp0522": (["rg.aero-crash-protectors.cb125r21.cp0522bl"], [], None),
    "mivv-gp-pro": (["mivv.gp-pro.cb125r21.h.077.l2p"], [], "muffler"),
}
if ACC_ASSETS:
    index = {v["id"]: v for a in accessories for v in a["variants"]}
    for render, (variant_ids, hides, erase) in ACC_VISUALS.items():
        assets = []
        for angle in ANGLES:
            if not os.path.exists(os.path.join(ACC_ASSETS, f"acc_{render}_{angle}.png")):
                continue
            assets.append({
                "angle": angle, "assetName": f"acc_{render}_{angle}",
                "assetAnchor": {"x": 0.5, "y": 0.5},
                "placement": {"position": {"x": 0.5, "y": 0.5}, "scale": 1, "rotationDegrees": 0},
                "hidesComponents": [f"{GEN}.{h}" for h in hides],
                "eraseMaskAssets": [f"mask_{angle}_{erase}"] if erase else [],
                "zIndex": 100, "occludedBy": [],
            })
        for vid in variant_ids:
            index[vid]["visualAssets"] = assets

snapshot = {
    "schemaVersion": 1, "revision": 2, "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "brands": [{"id": "honda", "name": "Honda"}],
    "models": [{"id": "honda.cb125r", "brandID": "honda", "name": "CB125R"}],
    "generations": [generation], "variants": variants, "accessories": accessories, "referenceColors": [],
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(snapshot, f, ensure_ascii=False, indent=1)
refs = sum(len(a["variants"]) for a in accessories)
print(f"wrote {OUT}: {len(accessories)} products, {refs} references, {len(views)} views, "
      f"{sum(len(v['masks']) for v in views)} masks")
