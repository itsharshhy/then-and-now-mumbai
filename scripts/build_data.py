"""Build the cleaned price dataset for Then & Now Mumbai.

Reads hand-curated anchors from data/raw/, fills the gaps between anchor years
with log-linear interpolation, adjusts every price to 2026 rupees using India
CPI, and converts prices into "minutes of work" using Maharashtra per capita
income as a wage proxy.

Outputs, per city:
  public/data/series.json, mumbai_prices_1995_2026.csv  (Mumbai)
  public/data/series_delhi.json, delhi_prices_1995_2026.csv  (Delhi)

Run:  python3 scripts/build_data.py
"""

from __future__ import annotations

import csv
import json
import math
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data"
YEARS = list(range(1995, 2027))
BASE_YEAR = 2026
WORK_HOURS_PER_MONTH = 26 * 8  # six-day week, eight-hour day

# Building metadata lives here so the data and the story stay in one place.
ITEMS = {
    "chai": {
        "name": "Cutting chai",
        "unit": "per glass",
        "building": "chai",
        "place": "Chai tapri",
        "keeper": "Raju bhau",
    },
    "vadapav": {
        "name": "Vada pav",
        "unit": "per piece",
        "building": "vadapav",
        "place": "Vada pav stall",
        "keeper": "Sunita tai",
    },
    "train": {
        "name": "Local train ticket",
        "unit": "minimum 2nd class fare",
        "building": "station",
        "place": "Railway station",
        "keeper": "Booking clerk",
    },
    "auto": {
        "name": "Auto-rickshaw ride",
        "unit": "minimum fare, first 1.5 km",
        "building": "autostand",
        "place": "Auto stand",
        "keeper": "Pappu bhai",
    },
    "petrol": {
        "name": "Petrol",
        "unit": "per litre",
        "building": "autostand",
        "place": "Auto stand",
        "keeper": "Pappu bhai",
    },
    "onion": {
        "name": "Onion",
        "unit": "per kg",
        "building": "kirana",
        "place": "Kirana store",
        "keeper": "Mehta uncle",
    },
    "milk": {
        "name": "Packaged milk",
        "unit": "toned, per litre",
        "building": "kirana",
        "place": "Kirana store",
        "keeper": "Mehta uncle",
    },
}


DELHI_ITEMS = {
    "chai": {"name": "Chai", "unit": "per cup", "building": "chai", "place": "Chai stall", "keeper": "Sardar ji"},
    "samosa": {"name": "Samosa", "unit": "per piece", "building": "vadapav", "place": "Samosa stall", "keeper": "Bittu bhaiya"},
    "metro": {"name": "Delhi Metro ticket", "unit": "minimum fare", "building": "station", "place": "Metro station", "keeper": "Metro staff",
              "available_from": 2002},
    "auto": {"name": "Auto-rickshaw ride", "unit": "minimum fare, meter down", "building": "autostand", "place": "Auto stand", "keeper": "Ramesh ji"},
    "petrol": {"name": "Petrol", "unit": "per litre", "building": "autostand", "place": "Auto stand", "keeper": "Ramesh ji"},
    "onion": {"name": "Onion", "unit": "per kg", "building": "kirana", "place": "Kirana store", "keeper": "Gupta ji"},
    "milk": {"name": "Packaged milk", "unit": "toned, per litre", "building": "kirana", "place": "Kirana store", "keeper": "Gupta ji"},
}

CITIES = {
    "mumbai": {
        "title": "Then & Now Mumbai — street prices 1995-2026",
        "items": ITEMS,
        "anchors": RAW / "anchors.csv",
        "income": None,  # read from macro.csv (Maharashtra)
        "json": "series.json",
        "csv": "mumbai_prices_1995_2026.csv",
    },
    "delhi": {
        "title": "Then & Now Delhi — street prices 1995-2026",
        "items": DELHI_ITEMS,
        "anchors": RAW / "delhi" / "anchors.csv",
        "income": RAW / "delhi" / "income.csv",
        "json": "series_delhi.json",
        "csv": "delhi_prices_1995_2026.csv",
    },
}


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        rows = [line for line in f if not line.startswith("#")]
    return list(csv.DictReader(rows))


def interpolate(anchors: dict[int, float]) -> dict[int, float]:
    """Log-linear interpolation between anchor years; flat outside the range."""
    years = sorted(anchors)
    out = {}
    for y in YEARS:
        if y in anchors:
            out[y] = anchors[y]
        elif y < years[0]:
            out[y] = anchors[years[0]]
        elif y > years[-1]:
            out[y] = anchors[years[-1]]
        else:
            lo = max(a for a in years if a < y)
            hi = min(a for a in years if a > y)
            t = (y - lo) / (hi - lo)
            out[y] = math.exp(math.log(anchors[lo]) * (1 - t) + math.log(anchors[hi]) * t)
    return out


def build() -> None:
    for city, cfg in CITIES.items():
        build_city(city, cfg)


def build_city(city: str, cfg: dict) -> None:
    sources_all = {r["source_id"]: r for r in read_csv(RAW / "sources.csv")}
    anchors_rows = read_csv(cfg["anchors"])
    macro_rows = read_csv(RAW / "macro.csv")
    # sources.csv is shared: each city gets the sources its prices use, plus the national ones (CPI)
    used_by = {c: {r["source_id"] for r in read_csv(k["anchors"]) if r["source_id"]} for c, k in CITIES.items()}
    others = set().union(*(u for c, u in used_by.items() if c != city))
    if city == "mumbai":
        sources = {k: v for k, v in sources_all.items() if k not in others or k in used_by[city]}
    else:
        sources = {k: v for k, v in sources_all.items() if k in used_by[city] or k == "wb_cpi"}

    # --- CPI index, 2026 = 100 ---------------------------------------------
    infl = {int(r["year"]): float(r["cpi_inflation_pct"]) for r in macro_rows}
    level = {YEARS[0]: 100.0}
    for y in YEARS[1:]:
        level[y] = level[y - 1] * (1 + infl[y] / 100)
    cpi = {y: level[y] / level[BASE_YEAR] * 100 for y in YEARS}

    # --- Income (wage proxy) -------------------------------------------------
    if cfg["income"]:
        inc_rows = read_csv(cfg["income"])
        inc_anchor = {int(r["year"]): float(r["per_capita_income"]) for r in inc_rows}
    else:
        inc_anchor = {int(r["year"]): float(r["per_capita_income"]) for r in macro_rows if r["per_capita_income"]}
    income = interpolate(inc_anchor)
    hourly = {y: income[y] / 12 / WORK_HOURS_PER_MONTH for y in YEARS}

    macro_out = []
    for r in macro_rows:
        y = int(r["year"])
        macro_out.append({
            "year": y,
            "inflation_pct": infl[y],
            "inflation_confidence": r["cpi_confidence"],
            "cpi_index": round(cpi[y], 2),
            "income_monthly": round(income[y] / 12),
            "income_confidence": "estimated" if y in inc_anchor else "interpolated",
            "hourly_wage": round(hourly[y], 2),
        })

    # --- Items -----------------------------------------------------------------
    items_out = []
    csv_rows = []
    for item_id, meta in cfg["items"].items():
        rows = [r for r in anchors_rows if r["item"] == item_id]
        anchors = {int(r["year"]): float(r["price"]) for r in rows}
        by_year = {int(r["year"]): r for r in rows}
        filled = interpolate(anchors)

        series = []
        for y in YEARS:
            price = filled[y]
            a = by_year.get(y)
            src = sources.get(a["source_id"]) if a and a["source_id"] else None
            point = {
                "year": y,
                "price": round(price, 2),
                "price_2026": round(price * 100 / cpi[y], 2),
                "minutes_of_work": round(price / hourly[y] * 60, 2),
                "kind": "anchor" if a else ("unavailable" if y < meta.get("available_from", 0) else "interpolated"),
                "confidence": a["confidence"] if a else ("unavailable" if y < meta.get("available_from", 0) else "interpolated"),
                "source_id": a["source_id"] if a and a["source_id"] else None,
                "note": (a["note"] or None) if a else None,
            }
            series.append(point)
            csv_rows.append({
                "year": y,
                "item": item_id,
                "item_name": meta["name"],
                "unit": meta["unit"],
                "price_nominal_inr": point["price"],
                "price_2026_inr": point["price_2026"],
                "minutes_of_work": point["minutes_of_work"],
                "point_type": point["kind"],
                "confidence": point["confidence"],
                "source_url": src["url"] if src else "",
                "note": point["note"] or "",
            })

        start = meta.get("available_from", YEARS[0])
        first, last = next(p for p in series if p["year"] >= start), series[-1]
        counts = {c: sum(1 for r in rows if r["confidence"] == c) for c in ("documented", "reported", "estimated")}
        items_out.append({
            "id": item_id,
            **meta,
            "series": series,
            "summary": {
                "nominal_multiple": round(last["price"] / first["price"], 2),
                "real_change_pct": round((last["price_2026"] / first["price_2026"] - 1) * 100, 1),
                "first_year": first["year"],
                "minutes_1995": first["minutes_of_work"],
                "minutes_2026": last["minutes_of_work"],
                "cagr_pct": round(((last["price"] / first["price"]) ** (1 / (YEARS[-1] - first["year"])) - 1) * 100, 2),
                "anchor_counts": counts,
            },
        })

    payload = {
        "meta": {
            "title": cfg["title"],
            "city": city,
            "generated": date.today().isoformat(),
            "years": YEARS,
            "base_year": BASE_YEAR,
            "work_hours_per_month": WORK_HOURS_PER_MONTH,
        },
        "sources": sources,
        "macro": macro_out,
        "items": items_out,
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / cfg["json"]).write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    with (OUT / cfg["csv"]).open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
        w.writeheader()
        w.writerows(csv_rows)

    print(f"{city}: wrote {len(items_out)} items x {len(YEARS)} years")
    for it in items_out:
        s = it["summary"]
        print(f"  {it['name']:<20} x{s['nominal_multiple']:>5}  real {s['real_change_pct']:>6}%  "
              f"work {s['minutes_1995']:.1f} -> {s['minutes_2026']:.1f} min  anchors {s['anchor_counts']}")


if __name__ == "__main__":
    build()
