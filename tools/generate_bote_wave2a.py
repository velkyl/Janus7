import json
import re
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent.parent
BOTE_SOURCE_DIR = Path(r"D:\RPG Lokal\DSA Wissen\DSA - Aventurischer Bote")

MONTH_NAMES = {
    1: "Praios",
    2: "Rondra",
    3: "Efferd",
    4: "Travia",
    5: "Boron",
    6: "Hesinde",
    7: "Firun",
    8: "Tsa",
    9: "Phex",
    10: "Peraine",
    11: "Ingerimm",
    12: "Rahja",
}

MONTH_PATTERN = r"(?:Praios|Rondra|Efferd|Travia|Boron|Hesinde|Firun|Tsa|Phex|Peraine|Ingerimm|Rahja)"
TITLE_PATTERNS = [
    re.compile(r"Meisterinformationen?\s+zu\s+[»\"]\s*([^«\"\n]{4,140}?)\s*[«\"]", re.IGNORECASE),
    re.compile(r"Meisterinformationen?\s+zu\s+([^\.]{4,140}?)(?=Meisterinformationen?|$)", re.IGNORECASE),
]

KEYWORD_TAGS = {
    "drache": ["drache", "gefahr", "eskalation"],
    "wyrm": ["drache", "gefahr"],
    "krieg": ["krieg", "politik"],
    "ueberfall": ["ueberfall", "konflikt"],
    "ueberfa": ["ueberfall", "konflikt"],
    "raub": ["verbrechen", "konflikt"],
    "wiederaufbau": ["wiederaufbau", "region"],
    "raetsel": ["mysterium", "ermittlung"],
    "rätsel": ["mysterium", "ermittlung"],
    "verschwunden": ["ermittlung", "mysterium"],
    "meisterwerk": ["kunst", "ermittlung"],
    "fasar": ["fasar", "politik"],
    "nostr": ["grenze", "nostria_andergast"],
    "andergast": ["grenze", "nostria_andergast"],
    "ebelried": ["tobrien", "wiederaufbau"],
    "warunk": ["tobrien", "horror"],
    "thorwal": ["thorwal", "seefahrt"],
    "hochzeit": ["gesellschaft", "intrige"],
    "moor": ["wildnis", "horror"],
}

YEAR_TONES = [
    ((1025, 1027), "Berichte ueber Unsicherheit, Grenzlast und die Suche nach neuer Ordnung praegen die oeffentliche Stimmung."),
    ((1028, 1033), "Lokale Machthaber, Amtstraeger und Gelehrte nutzen jede Nachricht fuer eigene Deutungen und Vorteile."),
    ((1034, 1037), "Wiederaufbau, Verlustgeschichten und regionaler Druck verleihen selbst kleinen Meldungen besonderes Gewicht."),
    ((1038, 1043), "Handel, Patronage und gelehrte Konkurrenz beleben viele Regionen, ohne alte Spannungen wirklich aufzulosen."),
    ((1044, 1047), "Jungere Botenjahrgaenge verbinden Wiederaufbau, Sternenfall-Nachwirkungen und zugespitzte Lokalpolitik."),
]

SEASON_TONES = {
    (12, 1, 2): "Die Jahreszeit schaerft Sorge um Vorrate, Wege und Verlaesslichkeit von Zusagen.",
    (3, 4, 5): "Mit den ersten Reisen wachsen Chancen auf neue Buendnisse, aber auch auf offene Reibung.",
    (6, 7, 8): "Markte, Reisen und diplomatische Bewegung machen Geruechte besonders schnell wirksam.",
    (9, 10, 11): "Erntefragen, Abgaben und Wintervorbereitung verschieben den Blick auf Verantwortung und Schuld.",
}


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


def slugify(value: str) -> str:
    value = value.lower()
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def extract_pdf_text(path: Path, max_pages: int = 12) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages[:max_pages]:
        pages.append(page.extract_text() or "")
    return normalize_text(" ".join(pages))


def detect_bf_year(text: str) -> int | None:
    matches = re.findall(rf"{MONTH_PATTERN}\s+(\d{{4}})\s+BF", text, re.IGNORECASE)
    if not matches:
        return None
    counts = Counter(int(match) for match in matches)
    return counts.most_common(1)[0][0]


def extract_titles(text: str) -> list[str]:
    titles = []
    seen = set()
    for pattern in TITLE_PATTERNS:
        for match in pattern.findall(text):
            title = normalize_text(match)
            title = re.sub(r"^zu\s+", "", title, flags=re.IGNORECASE)
            title = re.sub(r"\s+Meisterinformationen?.*$", "", title, flags=re.IGNORECASE)
            if len(title) < 4 or title.lower() in seen:
                continue
            seen.add(title.lower())
            titles.append(title)
    return titles


def infer_location(title: str, locations: list[str]) -> str | None:
    lower = title.lower()
    for location in sorted(locations, key=len, reverse=True):
        if location.lower() in lower:
            return location
    return None


def infer_tags(title: str) -> list[str]:
    lower = title.lower()
    tags = []
    for keyword, values in KEYWORD_TAGS.items():
        if keyword in lower:
            tags.extend(values)
    return sorted(set(tags)) or ["quest_hook", "bote"]


def infer_issue_date(path: Path, bf_year: int | None) -> str | None:
    if bf_year is None:
        return None
    match = re.search(r"\[(\d{4})-(\d{2})-(\d{2})\]", path.name)
    if not match:
        return None
    return f"{bf_year:04d}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"


def build_hook_text(title: str, location: str | None, tags: list[str]) -> str:
    place = location or "die betroffene Region"
    if "drache" in tags:
        return f"Die Meisterinformation zu »{title}« deutet auf eine zuspitzende Bedrohung hin, die {place} mit Eskalation, Prestigeverlust oder offenem Handlungsbedarf konfrontiert."
    if "wiederaufbau" in tags:
        return f"Die Meisterinformation zu »{title}« beschreibt {place} als Schauplatz fragilen Wiederaufbaus, in dem kleine Stoerungen sofort politische und menschliche Folgen ausloesen."
    if "ermittlung" in tags or "mysterium" in tags:
        return f"Die Meisterinformation zu »{title}« markiert ein Ermittlungsfenster in {place}: Hinweise sind greifbar, doch Interessenlagen und verdeckte Akteure erschweren schnelle Aufklaerung."
    if "grenze" in tags or "krieg" in tags or "konflikt" in tags:
        return f"Die Meisterinformation zu »{title}« setzt {place} unter Konfliktdruck. Geruechte, Vergeltungswille und unklare Taeterschaft liefern direkt spielbare Eskalationspunkte."
    return f"Die Meisterinformation zu »{title}« liefert einen offenen Abenteueraufhaenger fuer {place}, der sich als Auftrag, Investigation oder regionale Nebenlinie in JANUS7 verdichten laesst."


def year_tone(year: int) -> str:
    for (start, end), text in YEAR_TONES:
        if start <= year <= end:
            return text
    return YEAR_TONES[-1][1]


def season_tone(month: int) -> str:
    for months, text in SEASON_TONES.items():
        if month in months:
            return text
    return ""


def select(items: list[dict], index: int) -> dict:
    return items[index % len(items)]


def build_masterinfo_hooks() -> dict:
    cities = load_json(ROOT / "data/world_lore/cities.json")
    regions = load_json(ROOT / "data/world_lore/regions.json")
    locations = [row["name"] for row in cities.get("cities", [])] + [row["name"] for row in regions.get("regions", [])]

    hooks = []
    files = sorted(BOTE_SOURCE_DIR.glob("*.pdf"))
    source_count = 0
    for path in files:
        if "meisterinformationen" not in path.name.lower():
            continue
        source_count += 1
        text = extract_pdf_text(path)
        titles = extract_titles(text)
        bf_year = detect_bf_year(text)
        date_hints = re.findall(rf"{MONTH_PATTERN}\s+\d{{4}}\s+BF", text, re.IGNORECASE)
        for position, title in enumerate(titles, start=1):
            location = infer_location(title, locations)
            tags = infer_tags(title)
            hooks.append(
                {
                    "id": f"meisterinfo_{slugify(path.stem)}_{position:02d}",
                    "issue": path.stem,
                    "sourceFile": str(path),
                    "bfYear": bf_year,
                    "approximateDate": infer_issue_date(path, bf_year),
                    "dateHints": sorted(set(date_hints[:6])),
                    "title": title,
                    "location": location,
                    "tags": tags,
                    "hook": build_hook_text(title, location, tags),
                }
            )

    hooks.sort(key=lambda entry: (entry.get("bfYear") or 0, entry.get("approximateDate") or "", entry["title"]))
    return {
        "meta": {
            "moduleVersion": "0.9.12.46",
            "generatedAt": "2026-04-09T00:00:00.000Z",
            "sourceDirectory": str(BOTE_SOURCE_DIR),
            "sourceFileCount": source_count,
            "hookCount": len(hooks),
            "note": "ApproximateDate ist nur gesetzt, wenn Dateiname und BF-Jahr eine belastbare Monats-/Tageszuordnung erlauben.",
        },
        "hooks": hooks,
    }


def build_daily_entry(entry_date: date, category_id: str, primary_location: dict, secondary_location: dict, academy: dict, ordinal: int) -> dict:
    season = season_tone(entry_date.month)
    tone = year_tone(entry_date.year)
    month_name = MONTH_NAMES[entry_date.month]

    if category_id == "politics":
        label = f"Depesche aus {primary_location['name']}"
        description = (
            f"In {primary_location['name']} zwingt eine neue Depesche Amtstraeger, Tempel und lokale Interessenvertreter zu einer frischen Positionierung. "
            f"{tone} {season}"
        )
        tags = ["politik", slugify(primary_location["name"]), "daily_hook"]
        location = primary_location["name"]
    elif category_id == "local":
        label = f"Stadtgespraech in {secondary_location['name']}"
        description = (
            f"In {secondary_location['name']} verbreitet sich ein alltaeglich wirkender Vorfall schneller als jede amtliche Richtigstellung. "
            f"Der Monat {month_name} macht Markt, Reisewege und Nachbarschaften besonders anfaellig fuer Geruechte. {season}"
        )
        tags = ["alltag", slugify(secondary_location["name"]), "daily_hook"]
        location = secondary_location["name"]
    else:
        label = f"Akademische Unruhe in {academy['name']}"
        description = (
            f"Aus {academy['name']} dringt ein Hinweis auf Forschungsdruck, Materialbedarf oder diskret gefuehrte Lehrstreitigkeiten. "
            f"{tone} Das schafft einen direkten Ansatz fuer Questen, Auftraege oder Konsequenzen im Stadtraum von {primary_location['name']}."
        )
        tags = ["magie", slugify(academy["name"]), "daily_hook"]
        location = primary_location["name"]

    return {
        "id": f"daily_{entry_date.isoformat()}_{category_id}_{ordinal:02d}",
        "category": category_id,
        "label": label,
        "description": description,
        "location": location,
        "sourceType": "generated_daily_hook",
        "tags": tags,
    }


def build_daily_chronicle(masterinfo_hooks: dict) -> dict:
    chronicle = load_json(ROOT / "data/events/bote_chronicle.json")
    cities = load_json(ROOT / "data/world_lore/cities.json").get("cities", [])
    academies = [row for row in load_json(ROOT / "data/world_lore/academies.json").get("academies", []) if row.get("profileId") or row.get("cityId")]

    anchors_by_date = {}
    for entry in chronicle.get("chronicle", []):
        anchors_by_date.setdefault(entry["date"], []).append(
            {
                "id": entry["id"],
                "category": "anchor",
                "label": entry["label"],
                "description": entry["description"],
                "location": entry.get("location"),
                "sourceType": "curated_anchor",
                "tags": entry.get("tags", []),
            }
        )

    for hook in masterinfo_hooks.get("hooks", []):
        approx = hook.get("approximateDate")
        if not approx:
            continue
        anchors_by_date.setdefault(approx, []).append(
            {
                "id": hook["id"],
                "category": "meisterinfo",
                "label": hook["title"],
                "description": hook["hook"],
                "location": hook.get("location"),
                "sourceType": "meisterinfo_inferred_date",
                "tags": hook.get("tags", []),
            }
        )

    start = date(1025, 1, 1)
    end = date(1047, 12, 31)
    days = []
    current = start
    ordinal = 0
    while current <= end:
        primary_location = select(cities, ordinal)
        secondary_location = select(cities, ordinal + current.month + current.day)
        academy = select(academies, ordinal + current.day)
        entries = [
            build_daily_entry(current, "politics", primary_location, secondary_location, academy, 1),
            build_daily_entry(current, "local", primary_location, secondary_location, academy, 2),
            build_daily_entry(current, "arcane", primary_location, secondary_location, academy, 3),
        ]
        entries.extend(anchors_by_date.get(current.isoformat(), []))
        days.append(
            {
                "date": current.isoformat(),
                "monthName": MONTH_NAMES[current.month],
                "entries": entries,
            }
        )
        ordinal += 1
        current += timedelta(days=1)

    return {
        "meta": {
            "moduleVersion": "0.9.12.46",
            "generatedAt": "2026-04-09T00:00:00.000Z",
            "coverage": {"from": start.isoformat(), "to": end.isoformat()},
            "baseEntriesPerDay": 3,
            "dayCount": len(days),
            "curatedAnchorCount": len(chronicle.get("chronicle", [])),
            "meisterinfoAnchorCount": len([hook for hook in masterinfo_hooks.get("hooks", []) if hook.get("approximateDate")]),
            "note": "Jeder Tag enthaelt drei spielbare Basiseintraege; kanonischere Anker aus bote_chronicle und datierbaren Meisterinformationen werden zusaetzlich eingestreut.",
        },
        "days": days,
    }


def update_tables(masterinfo_hooks: dict) -> dict:
    tables = load_json(ROOT / "data/tables.json")
    all_tables = [table for table in tables.get("tables", []) if table.get("id") not in {"bote_meisterinfo_hooks", "bote_daily_pressure"}]

    hook_entries = [
        f"{hook['title']} ({hook.get('bfYear') or 'unbekannt'} BF)"
        for hook in masterinfo_hooks.get("hooks", [])[:24]
    ]
    pressure_entries = [
        "Eine Schlagzeile bestaetigt nichts, veraendert aber sofort das Verhalten lokaler Machttraeger.",
        "Mehrere Wahrheiten konkurrieren gleichzeitig um denselben Vorfall.",
        "Ein Meisterinformationssplitter wirkt wie Hintergrund, ist aber in Wirklichkeit ein Queststarter.",
        "Ein Geruecht wird erst gefaehrlich, als eine offizielle Stelle darauf reagieren muss.",
        "Eine lokale Bagatelle erhaelt ploetzlich ueberregionale Bedeutung.",
        "Eine verspätete Nachricht loest heute Folgen aus, obwohl das eigentliche Ereignis schon Wochen zurueckliegt.",
    ]
    all_tables.append({"id": "bote_meisterinfo_hooks", "name": "Aventurischer Bote - Meisterinformationen", "entries": hook_entries})
    all_tables.append({"id": "bote_daily_pressure", "name": "Aventurischer Bote - Drucklagen", "entries": pressure_entries})
    tables["tables"] = all_tables
    tables.setdefault("meta", {})["description"] = "Aggregierte Zufallstabellen fuer Spielleitung, Weltwissen und Akademiealltag in JANUS7."
    return tables


def build_text_summary(masterinfo_hooks: dict, daily_chronicle: dict) -> str:
    hooks = masterinfo_hooks.get("hooks", [])
    dated_hooks = [hook for hook in hooks if hook.get("approximateDate")]
    sample_lines = [
        f"- {hook['title']} | {hook.get('bfYear') or 'unbekannt'} BF | {hook.get('location') or 'ohne feste Ortszuordnung'}"
        for hook in hooks[:12]
    ]
    return "\n".join(
        [
            "Aventurischer Bote - Welle 2A",
            "",
            f"Quelle: {BOTE_SOURCE_DIR}",
            f"Extrahierte Meisterinformations-Hooks: {len(hooks)}",
            f"Datierbare Hooks mit eingestreuter Tageszuordnung: {len(dated_hooks)}",
            f"Taegliche Chronikabdeckung: {daily_chronicle['meta']['coverage']['from']} bis {daily_chronicle['meta']['coverage']['to']}",
            f"Tage im Kalender: {daily_chronicle['meta']['dayCount']}",
            f"Basiseintraege pro Tag: {daily_chronicle['meta']['baseEntriesPerDay']}",
            "",
            "Beispielhafte Meisterinformations-Hooks:",
            *(sample_lines or ["- Keine Hooks extrahiert."]),
            "",
            "Verwendung in JANUS7:",
            "- bote_masterinfo_hooks.json fuer source-nahe Quest- und Regionalhaken",
            "- bote_daily_chronicle.json fuer mehrfache Tageseintraege ueber den kompletten BF-Zeitraum",
            "- tables.json fuer Foundry-taugliche Zufallstabellen auf Basis der verdichteten Bote-Lage",
        ]
    )


def main() -> None:
    masterinfo_hooks = build_masterinfo_hooks()
    daily_chronicle = build_daily_chronicle(masterinfo_hooks)
    tables = update_tables(masterinfo_hooks)

    write_json(ROOT / "data/events/bote_masterinfo_hooks.json", masterinfo_hooks)
    write_json(ROOT / "data/events/bote_daily_chronicle.json", daily_chronicle)
    write_json(ROOT / "data/tables.json", tables)
    write_text(ROOT / "data/world_lore/entries/events/aventurischer_bote_wave2a.txt", build_text_summary(masterinfo_hooks, daily_chronicle))

    print(
        "generated bote wave 2a datasets:",
        f"{masterinfo_hooks['meta']['hookCount']} hooks,",
        f"{daily_chronicle['meta']['dayCount']} days",
    )


if __name__ == "__main__":
    main()
