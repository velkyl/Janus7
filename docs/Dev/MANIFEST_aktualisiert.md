# JANUS / DSA5 Arbeitsmanifest

**Stand:** 2026-03-12  
**Bezugsmodul:** `JANUS7_v0_9_12_3_full.zip`  
**Modulversion:** `0.9.12.3`  
**Zweck:** Überblick über die aktuell vorliegenden Wissensdateien, Projektartefakte und das analysierte JANUS7-Modul.

---

## 1. Snapshot

### Lokale Wissens- und Projektartefakte
- **15 Markdown-Wissensdateien** für Akademie, Lore, Unterricht, Regie und Foundry-Templates
- **2 Word-Dokumente** zur Roadmap und UI-Entwicklung
- **1 Modularchiv** (`JANUS7_v0_9_12_3_full.zip`)
- **3 DSA5-Referenzarchive** (`dsa5-core.zip`, `dsa5-library.zip`, `dsa5-soms.zip`)

### JANUS7-Modul-Snapshot
- **Version:** `0.9.12.3`
- **Foundry-Kompatibilität:** `13` bis `13.351`
- **DSA5-Beziehung:** System `dsa5`, Minimum `7.0.0`
- **Socket-Support:** `true`
- **ESM-Entry:** `scripts/janus.mjs`
- **Dateien gesamt im Modul:** **568**

### Modulstruktur nach Hauptbereichen
| Bereich | Dateien | Bewertung |
|---|---:|---|
| `core/` | 171 | stark ausgebaut, klarer technischer Kern |
| `data/` | 102 | SSOT-lastig, relevante Datenbasis |
| `ui/` | 49 | Shell-/App-Layer vorhanden |
| `scripts/` | 39 | Integrationen, Loader, Brücken |
| `docs/` | 34 | ungewöhnlich umfangreich, aber nützlich |
| `academy/` | 28 | Domänenlogik vorhanden |
| `bridge/` | 28 | DSA5-Anbindung tragfähig |
| `phase7/` | 11 | KI-Roundtrip vorhanden |

---

## 2. Wissensdateien im Arbeitsordner

### A. Akademie-Kernwissen
| Datei | Zeilen | Nutzen | Priorität |
|---|---:|---|---|
| `ZAUBER_LEHRPLAN.md` | 617 | Lehrplan, Ausbildungsphasen, Fächerlogik | Hoch |
| `DIRECTOR.md` | 654 | Regie- und Szenenführung | Hoch |
| `LESSON_GENERATOR.md` | 727 | Generatorlogik für Unterricht | Hoch |
| `FOUNDRY_TEMPLATES.md` | 746 | Zielstrukturen für Foundry-Exports | Hoch |
| `SCHEDULE.md` | 306 | Stunden- und Zeitslotlogik | Hoch |

### B. Akademie-Datenbanken / operative Referenzen
| Datei | Zeilen | Nutzen | Priorität |
|---|---:|---|---|
| `ORTSDATENBANK_AKADEMIE_PUNIN_V1.md` | 1776 | wichtigste Ortsreferenz der Akademie | Sehr hoch |
| `NPC_PROFILE_WELTENWISSEN_LEHRER.md` | 606 | Lehrer-/Wissensprofil | Hoch |
| `NPC_PROFILES.md` | 37 | kompakter NPC-Überblick, aber deutlich knapper als altes Manifest behauptet | Mittel |
| `BIBLIOTHEK_KATALOG.md` | 416 | Bibliotheks- und Recherchebasis | Mittel |
| `ALCHIMIE_REZEPTE.md` | 400 | Rezepte und Alchimie-Inhalte | Mittel |

### C. Lore / Unterrichtshintergrund
| Datei | Zeilen | Nutzen | Priorität |
|---|---:|---|---|
| `DAEMONOLOGIE_UNTERRICHT.md` | 409 | plot- und unterrichtsrelevant | Hoch |
| `ELEMENTAR_VERWANDLUNG.md` | 385 | Elementar-/Transmagie | Mittel |
| `KOSMOLOGIE_SPHAEREN.md` | 318 | Sphären- und Kosmologiewissen | Mittel |
| `GEOGRAPHIE_AVENTURIEN.md` | 271 | Reise-/Regionswissen | Mittel |
| `GESCHICHTE_AVENTURIENS.md` | 330 | Historie und Unterrichtsbezug | Mittel |

---

## 3. Projekt- und Architekturartefakte

| Datei | Typ | Zweck |
|---|---|---|
| `JANUS7_Roadmap_Vollständig_Konsolidiert.docx` | DOCX | strategische Gesamtplanung |
| `JANUS7_UI_Developer_Handbook.docx` | DOCX | UI-/Entwicklerleitfaden |
| `MANIFEST.md` | Markdown | altes Manifest, fachlich nützlich aber veraltet |
| `JANUS7_v0_9_12_3_full.zip` | ZIP | analysierter Modulstand |

---

## 4. Modulbewertung: JANUS7 v0.9.12.3

### Positiv
- Versionsangaben in `module.json`, `package.json`, `VERSION.json` und `README.md` sind **konsistent auf 0.9.12.3**.
- Das Modul ist **klar geschichtet**: Core, Academy, Bridge, UI, Daten, KI-Roundtrip.
- `socket: true` ist gesetzt, also kein alter Multi-Client-Fehler mehr an dieser Stelle.
- Die Doku ist umfangreich vorhanden, inklusive Status-, Handbuch- und UI-Katalogdateien.
- Phase-7-Bestandteile für KI-Export/Import/Diff sind sauber als eigene Bereiche abgetrennt.

### Auffälligkeiten
- Der Stand ist **breit**, aber nicht vollständig konsolidiert. Man sieht alte Release-Artefakte, Bridge-Dateien, Reexports und Legacy-Reste. Das ist nicht katastrophal, aber klassischer Projektwuchs. Menschen bauen eben gern erst ein Schloss und sortieren später die Kabel.
- Das ursprüngliche `MANIFEST.md` bildet **weder die realen Zeilenzahlen noch den heutigen Dateibestand** korrekt ab.
- Das alte Manifest erwähnt nur 13 Inhaltsdateien, obwohl der Arbeitsordner inzwischen zusätzliche relevante Dateien enthält, insbesondere `NPC_PROFILE_WELTENWISSEN_LEHRER.md`, `ORTSDATENBANK_AKADEMIE_PUNIN_V1.md`, Roadmap- und UI-Handbuch.
- `NPC_PROFILES.md` ist heute sehr kurz. Das alte Manifest beschreibt eine große NPC-Sammeldatei, die in dieser Form im aktuellen Ordner **nicht mehr** vorliegt.

### Gesamturteil
**Architektonisch tragfähig, dokumentationsseitig teilweise nachgezogen, Manifest klar veraltet.**  
Das Modul selbst wirkt auf diesem Stand deutlich moderner und konsistenter als das alte Wissens-Manifest.

---

## 5. Empfohlene Nutzungskombinationen

### Minimal für Unterrichts- und Kampagnenbetrieb
1. `ZAUBER_LEHRPLAN.md`
2. `DIRECTOR.md`
3. `LESSON_GENERATOR.md`
4. `FOUNDRY_TEMPLATES.md`
5. `ORTSDATENBANK_AKADEMIE_PUNIN_V1.md`

### Standard für JANUS-Arbeit
Minimal-Setup plus:
6. `SCHEDULE.md`
7. `NPC_PROFILE_WELTENWISSEN_LEHRER.md`
8. `DAEMONOLOGIE_UNTERRICHT.md`
9. `BIBLIOTHEK_KATALOG.md`
10. `JANUS7_Roadmap_Vollständig_Konsolidiert.docx`

### Vollständiges Arbeitsset
Alle obigen Dateien plus Modularchiv `JANUS7_v0_9_12_3_full.zip` und die DSA5-Referenzarchive.

---

## 6. Konkrete Drift-Korrekturen gegenüber dem alten Manifest

| Thema | Alter Stand | Neuer Stand |
|---|---|---|
| Dateianzahl | 13 Content-Dateien | 15 Wissensdateien + Projektartefakte + Modularchiv |
| NPC-Datei | als große Masterdatei beschrieben | aktuelle Datei ist kompakt; Lehrer-/Ortswissen liegt in separaten Dateien |
| Zeilenzahlen | mehrfach veraltet | auf aktuelle Dateien neu erfasst |
| Projektbezug | kein Bezug auf aktuelles Modul | Bezug auf JANUS7 `0.9.12.3` ergänzt |
| Projektartefakte | kaum sichtbar | Roadmap, UI-Handbuch, Modularchiv explizit aufgenommen |

---

## 7. Empfehlung für die weitere Pflege

1. Dieses Manifest als neue Arbeitsgrundlage verwenden.
2. Das alte `MANIFEST.md` ersetzen oder archivieren.
3. Künftig bei jedem größeren ZIP-Stand mindestens diese Punkte nachziehen:
   - Modulversion
   - Dateibestand
   - Zeilenzahlen / Umfang der Wissensdateien
   - neue Kernartefakte (Roadmap, Handbücher, Schemas, Datenbanken)

---

**Status:** Dieses Manifest ersetzt inhaltlich den früheren Überblick und ist auf den aktuell vorliegenden Stand von Ordner + Modul gezogen.
