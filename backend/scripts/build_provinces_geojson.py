"""Bangun GeoJSON batas provinsi Indonesia untuk peta Leaflet di beranda.

Sumber: OpenStreetMap (relasi boundary=administrative, admin_level=4, 38 provinsi),
lisensi ODbL 1.0, atribusi "© kontributor OpenStreetMap". Batas provinsi OSM mencakup
wilayah laut, sehingga dipotong dengan daratan Natural Earth 10m (domain publik,
naturalearthdata.com) agar yang tampil adalah pulau. Hasil turunan berlisensi ODbL.

Pakai (butuh `shapely`, hanya untuk alat ini; tidak dipakai server):
    python scripts/build_provinces_geojson.py --land ne_10m_land.geojson [--cache DIR]

`ne_10m_land.geojson`: https://github.com/nvkelso/natural-earth-vector (geojson/).

Keluaran: frontend/public/geo/indonesia-provinces.geojson
Properti fitur: code (mis. "JB" dari ISO 3166-2 "ID-JB"), name, osm_id.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import LineString, MultiPolygon, Polygon, box, mapping, shape
from shapely.ops import linemerge, polygonize, unary_union
from shapely.prepared import prep

OVERPASS = "https://overpass-api.de/api/interpreter"
USER_AGENT = "rupaloka-build/0.1"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend" / "public" / "geo" / "indonesia-provinces.geojson"


def overpass(query: str) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(OVERPASS, data=data, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as err:  # noqa: BLE001 - server sibuk: coba lagi
            wait = 10 * (attempt + 1)
            print(f"  gagal ({err}); coba lagi dalam {wait} dtk", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("Overpass tidak merespons")


def list_provinces() -> list[dict]:
    q = (
        '[out:json][timeout:90];area["ISO3166-1"="ID"][admin_level=2]->.id;'
        'rel(area.id)["admin_level"="4"]["boundary"="administrative"];out tags;'
    )
    return overpass(q)["elements"]


def relation_geometry(rel: dict) -> MultiPolygon:
    outer: list[LineString] = []
    inner: list[LineString] = []
    for m in rel.get("members", []):
        if m.get("type") != "way" or "geometry" not in m:
            continue
        line = LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
        (inner if m.get("role") == "inner" else outer).append(line)
    outers = unary_union(list(polygonize(linemerge(outer))))
    if inner:
        holes = unary_union(list(polygonize(linemerge(inner))))
        outers = outers.difference(holes)
    if isinstance(outers, Polygon):
        return MultiPolygon([outers])
    return MultiPolygon([g for g in getattr(outers, "geoms", []) if isinstance(g, Polygon)])


def round_coords(obj: object, nd: int) -> object:
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(v, nd) for v in obj]
        return [round_coords(v, nd) for v in obj]
    return obj


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--land", type=Path, required=True, help="Natural Earth ne_10m_land.geojson")
    ap.add_argument("--cache", type=Path, help="folder cache respons Overpass")
    ap.add_argument("--tolerance", type=float, default=0.01, help="derajat (~1 km)")
    ap.add_argument("--min-area", type=float, default=0.0004, help="buang pulau < ini (derajat²)")
    args = ap.parse_args()

    # Daratan di sekitar Indonesia saja (mempercepat pemotongan).
    area = box(94.0, -12.0, 142.0, 7.0)
    land_fc = json.loads(args.land.read_text(encoding="utf-8"))
    land_shapes = [shape(f["geometry"]) for f in land_fc["features"]]
    land = unary_union([g.intersection(area) for g in land_shapes if g.intersects(area)])
    land_prep = prep(land)

    listing = args.cache / "_provinces.json" if args.cache else None
    if listing and listing.exists():
        provinces = json.loads(listing.read_text(encoding="utf-8"))["elements"]
    else:
        provinces = list_provinces()
        if listing:
            listing.parent.mkdir(parents=True, exist_ok=True)
            listing.write_text(json.dumps({"elements": provinces}), encoding="utf-8")
    print(f"{len(provinces)} provinsi")
    features = []
    for p in sorted(provinces, key=lambda e: e["tags"].get("ISO3166-2", "")):
        rid = p["id"]
        iso = p["tags"].get("ISO3166-2", "")
        cache = args.cache / f"{rid}.json" if args.cache else None
        if cache and cache.exists():
            rel_json = json.loads(cache.read_text(encoding="utf-8"))
        else:
            rel_json = overpass(f"[out:json][timeout:170];rel({rid});out geom;")
            if cache:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_text(json.dumps(rel_json), encoding="utf-8")
            time.sleep(2)  # sopan terhadap server publik
        geom = relation_geometry(rel_json["elements"][0])
        if land_prep.intersects(geom):
            geom = geom.intersection(land)
        geom = geom.simplify(args.tolerance, preserve_topology=True)
        pieces = getattr(geom, "geoms", [geom])
        polys = [g for g in pieces if isinstance(g, Polygon) and not g.is_empty]
        parts = [g for g in polys if g.area >= args.min_area]
        if not parts:  # provinsi kecil: simpan bagian terbesar
            parts = [max(polys, key=lambda g: g.area)]
        geom = MultiPolygon(parts)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "code": iso.removeprefix("ID-"),
                    "name": p["tags"]["name"],
                    "osm_id": rid,
                },
                "geometry": round_coords(mapping(geom), 3),
            }
        )
        print(f"  {iso} {p['tags']['name']}: {len(parts)} poligon")

    fc = {
        "type": "FeatureCollection",
        "attribution": "© kontributor OpenStreetMap, ODbL 1.0 (openstreetmap.org/copyright)",
        "features": features,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fc, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"Ditulis: {OUT} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
