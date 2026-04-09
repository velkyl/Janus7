# JANUS7 Dokumentations-Update-Plan (Code-First)

**Datum:** 2026-04-09  
**Ziel:** Dokumentation konsequent auf den realen Runtime-Stand synchronisieren und Drift gegen Code minimieren.

---

## 1) Vorgehen (bewusst kritisch)

Dieser Plan basiert **nicht** auf Alt-Dokumenten als Wahrheitsquelle, sondern auf dem tatsächlich geladenen Modul:

1. `module.json` (Version, Kompatibilität, deklarierte Assets)
2. `scripts/janus.mjs` (Single Entry Point, Phasen-Orchestrierung)
3. `scripts/core/public-api.mjs` (erlaubte Import-/Core-Schnittstellen)
4. `ui/index.js` + `ui/app-manifest.js` (echte UI-Router/API und Reifegrade)
5. vorhandene Kerndokumente (`README.md`, `docs/INDEX.md`, `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, `docs/TECHNICAL_HANDBOOK.md`)

**Kritische Leitfrage:**
> „Was ist belegbar im Code vorhanden?“ statt „Was stand irgendwann in einem Konzeptpapier?“

---

## 2) Aktuelle Hauptbefunde

### A. Namespace-/API-Drift bleibt ein reales Risiko
- Runtime ist klar auf `game.janus7.*` ausgerichtet.
- In Alt-/Dev-Dokumenten existieren weiterhin Verweise auf `game.janus.*`.
- Risiko: falsche Makro-Beispiele, fehlerhafte Integrationen durch externe Nutzer.

### B. Dokumentationsbasis ist breit, aber nicht sauber geschichtet
- Viele Dateien in `docs/` mischen:
  - aktuelle Betriebsdoku,
  - historische Stände,
  - Entwurfs-/Auditmaterial.
- Ohne klare Markierung entsteht „Dokumentationsrauschen“.

### C. Release-nahe Konsistenzprüfungen fehlen als verbindliches Doku-Gate
- Versionen sind oft konsistent, aber nicht durchgehend automatisiert abgesichert.
- Beispielhafte Drift-Risiken (Dateien/Referenzen/Beispiele) sind ohne Gate leicht regressionsanfällig.

### D. Manifest-/Doku-Abgleich sollte Teil der Doku-Qualität sein
- Wenn deklarierte Ressourcen nicht vorhanden sind, untergräbt das Vertrauen in Betriebsdoku und Installationsanleitungen.

---

## 3) Priorisierter Umsetzungsplan

## Phase 1 — SSOT-Definition und Dokumentklassen (P0)

**Ziel:** Verbindlich festlegen, welche Dokumente „kanonisch“ sind.

### Maßnahmen
1. In `docs/INDEX.md` eine **Dokumentklassen-Sektion** ergänzen:
   - **Canonical (verbindlich für Betrieb/Entwicklung)**
   - **Operational (Runbooks/Guides)**
   - **Archive (historisch, nicht normativ)**
2. Jede Archivdatei mit einem kurzen Kopfmarker versehen: „Historisch / nicht SSOT“.
3. Ein einzelnes „Source of Truth“-Kapitel in `README.md` verankern (Version, APIs, UI-Einstieg, wichtigste Referenzen).

### Kritische Gegenfragen
- Sind wir bereit, alte Dokumente explizit abzuwerten, auch wenn sie viel Inhalt haben?
- Gibt es Stakeholder, die noch auf Archive-Dateien als „aktuell“ verlinken?

---

## Phase 2 — API-/Architektur-Doku strikt codebasiert nachziehen (P0)

**Ziel:** `ARCHITECTURE.md`, `API_REFERENCE.md`, `TECHNICAL_HANDBOOK.md` zu 100% gegen Runtime prüfen.

### Maßnahmen
1. API-Kapitel nur anhand real exponierter Surface beschreiben (`game.janus7.*`, Aliase klar als Compat markieren).
2. Architekturkapitel konkret an `scripts/janus.mjs` ausrichten:
   - Single Entry Point
   - Phase-Loader
   - optionale Kill-Switches
3. UI-Kapitel mit `ui/app-manifest.js` synchronisieren (Maturity, preferred vs compat keys).
4. Beispiele vereinheitlichen: keine veralteten Namespace- oder Alias-Beispiele in Primärdokumenten.

### Kritische Gegenfragen
- Dokumentieren wir „Soll-Verhalten“ oder das echte „Ist-Verhalten“?
- Welche Compat-Aliase wollen wir aktiv weiterempfehlen (falls überhaupt)?

---

## Phase 3 — Dokumentationshygiene in Dev-/Alt-Dokumenten (P1)

**Ziel:** Falsche Signale aus Neben-Dokumenten reduzieren.

### Maßnahmen
1. `docs/Dev/*` prüfen und mindestens einen klaren Header ergänzen:
   - „Experimentell / Entwurf / ggf. veraltet“.
2. Harte Fehlbeispiele (`game.janus.*`) markieren oder korrigieren.
3. In `docs/INDEX.md` explizit auf die kanonische API-Referenz verweisen, damit Suchtreffer nicht in Altmaterial enden.

### Kritische Gegenfragen
- Wollen wir Altmaterial aktiv bereinigen oder bewusst nur einfrieren?
- Wie viel Aufwand ist gerechtfertigt gegenüber Feature-Arbeit?

---

## Phase 4 — Qualitätssicherung automatisieren (P0)

**Ziel:** Doku-Drift künftig früh erkennen.

### Maßnahmen
1. Doku-Check-Skript erweitern/ergänzen mit:
   - Version-Sync (`module.json` vs Kern-Dokumente)
   - verbotene Patterns in Primärdoku (z. B. `game.janus.` ohne 7)
   - Referenz-Check wichtiger Pfade (z. B. deklarierte Templates vorhanden)
2. Diese Checks als festen Release-Schritt definieren.
3. Ergebnis im Release-Dokument verpflichtend protokollieren.

### Kritische Gegenfragen
- Ist der Check zu streng und erzeugt false positives?
- Wer besitzt den Prozess, wenn der Check rot ist kurz vor Release?

---

## Phase 5 — Redaktionsprozess und Verantwortlichkeiten (P1)

**Ziel:** Dokumentation als Produktteil etablieren, nicht als Nachtrag.

### Maßnahmen
1. Für jede Kern-Datei einen Owner benennen (Architektur, API, Betrieb, UI).
2. PR-Checkliste ergänzen:
   - „API/Namespace geändert?“
   - „UI-Key/Manifest geändert?“
   - „Docs angepasst und geprüft?“
3. Quartalsweise Doku-Review mit kurzer Drift-Liste.

### Kritische Gegenfragen
- Können wir Ownership real dauerhaft leisten?
- Welche Doku darf bewusst veralten (und wird als solche gekennzeichnet)?

---

## 4) Konkrete Deliverables (empfohlen)

1. `docs/INDEX.md` mit Dokumentklassen + SSOT-Definition.
2. Überarbeitete Kern-Dokumente:
   - `docs/API_REFERENCE.md`
   - `docs/ARCHITECTURE.md`
   - `docs/TECHNICAL_HANDBOOK.md`
3. `docs/README_DOCS_GOVERNANCE.md` (neu):
   - Pflegeprozess,
   - Freigabekriterien,
   - Owner-Matrix.
4. Technischer Check (`tools/validate-docs-consistency.mjs`, neu oder erweitert).

---

## 5) Abnahmekriterien

Der Plan gilt als erfolgreich umgesetzt, wenn:

1. **Keine primäre Doku** veraltete Kern-Namespaces empfiehlt.
2. Kern-Dokumente inhaltlich auf denselben Runtime-Stand referenzieren.
3. Für Release gibt es einen reproduzierbaren Doku-Check mit maschinenlesbarem Ergebnis.
4. Archive/Altmaterial ist als nicht-kanonisch erkennbar.

---

## 6) Risiken und bewusste Trade-offs

- **Risiko:** Hoher initialer Redaktionsaufwand.  
  **Trade-off:** Einmalige Schärfung senkt spätere Einarbeitungs- und Supportkosten.

- **Risiko:** Compat-Alias-Doku wirkt „unaufgeräumt“.  
  **Trade-off:** Klare Trennung „preferred vs compat“ verhindert Breaking Changes für bestehende Welten/Makros.

- **Risiko:** Automatisierte Checks blockieren kurzfristig Releases.  
  **Trade-off:** Frühe Drift-Erkennung ist günstiger als spätere Runtime-/Support-Fehler.

---

## 7) Empfehlung zur Umsetzung

**Reihenfolge:** Phase 1 -> Phase 2 -> Phase 4 -> Phase 3 -> Phase 5.

Begründung:
- Erst SSOT klären,
- dann Inhalte korrigieren,
- dann Drift technisch absichern,
- erst danach Altmaterial aufräumen und Governance finalisieren.
