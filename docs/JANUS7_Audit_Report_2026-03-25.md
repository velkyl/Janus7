# JANUS7 Architektur- und Qualitätsaudit (2026-03-25)

## 1) Executive Summary

**Gesamtzustand:** **solide bis gut**, mit klar erkennbarer produktiver Basis, aber mit **Dokumentations-Drift** und einigen **technischen Bruchkanten** zwischen Spezifikation und Ist-Stand.

- Die Roadmap dokumentiert Phase 0–7 überwiegend als abgeschlossen; der Code bestätigt eine breite Implementierung über Core, Academy, Bridge, UI, KI und Graph-Integration.
- Die Architektur ist modular (Single-Entry-Point in `scripts/janus.mjs`, klare Core-/Academy-/Bridge-Layer); ein statischer Import-Zykluscheck ergab keine Circular Dependencies.
- Kritische Risiken liegen weniger in der Grundarchitektur, sondern in:
  1) **fehlenden/verschobenen Vertragsdokumenten** (die drei angeforderten `.docx` liegen im Repo nicht vor),
  2) **inkonsistenten Roadmap-Aussagen und fehlenden referenzierten Dokus**,
  3) **einzelnen API-/State-Pattern-Verletzungen** (direkte State-Mutationen aus UI, ungesicherte Actor-Zugriffe in Fate-Bridge),
  4) **Content-Tiefe** (Kalenderdatenbasis aktuell minimal mit 1 Entry und starker Fallback-Logik im Code).

---

## 2) Fortschrittsbericht (Soll/Ist laut Leitplan)

### 2.1 Vertragslage (SOLL-Dokumente)

Die explizit angeforderten Dateien
- `JANUS7_Entwicklungsleitplan.docx`
- `JANUS7_Roadmap_Vollständig_Konsolidiert.docx`
- `JANUS7_Entwickler_Dokumentation.docx`

sind in der bereitgestellten Codebase **nicht vorhanden** (Dateisystemprüfung). Als nächstliegende Vertragsquellen wurden verwendet:
- `docs/ROADMAP.md` (Konsolidierte Phasen- und Deliverable-Sicht),
- `docs/ARCHITECTURE.md` (Architekturregeln + Anti-Patterns),
- `docs/STATUS.md` (Projektstatus).

### 2.2 Implementierungsgrad je Phase

Auf Basis Roadmap + Code-Struktur ist der Projektfortschritt **weit fortgeschritten**:

- **Phase 1 (Core):** vorhanden (`core/state.js`, `core/config.js`, `core/io.js`, `core/validator.js`, `core/director.js`).
- **Phase 2 (Academy Data):** vorhanden (`academy/data-api*.js`, umfangreiche `data/academy/*.json`).
- **Phase 3 (DSA5 Bridge):** vorhanden (`bridge/dsa5/*.js`, Library/Resolver/Rolls/etc.).
- **Phase 4/4b (Simulation, Quests, Events):** vorhanden (`academy/calendar.js`, `academy/lessons.js`, `academy/events.js`, Quest/Event-Daten unter `data/quests` und `data/events`).
- **Phase 5 (Atmosphere):** vorhanden (`atmosphere/phase5.js`, `atmosphere/controller.js`).
- **Phase 6 (UI):** vorhanden (mehrere ApplicationV2-Apps unter `ui/apps`, Templates unter `templates/apps`).
- **Phase 7 (KI):** vorhanden (`phase7/export`, `phase7/import`, `phase7/diff`, Verträge unter `phase7/contract`).
- **Phase 8:** als Zukunft/Backlog dokumentiert.

### 2.3 Offene Baustellen / Platzhalter / fehlende Artefakte

1. **Roadmap-intern widersprüchlich:** Phase 7 wird oben als abgeschlossen geführt, in der Timeline aber als „geplant“ markiert.  
2. **Referenzierte Doku-Dateien fehlen:** In `docs/ROADMAP.md` genannte Dateien (u. a. DSA5-Bridge-Detaildokus, Phase-4b-Overview, PHASE6_UI_GUIDE) existieren im Repo nicht.  
3. **TODO-Markierungen in der Roadmap:** einzelne Doku-Artefakte sind explizit als TODO markiert.  
4. **Kalender-Content ist sehr dünn:** `data/academy/calendar.json` enthält aktuell nur 1 Entry, wodurch die Simulation stark auf Fallback-/virtuelle Slotlogik angewiesen ist.

---

## 3) Daten- & Content-Konsistenz (Academy/Jahresdateien)

### 3.1 Dateistruktur & Verfügbarkeit

- Der im Auftrag genannte Pfad `/data/academy/source-md/` ist im Repo **nicht vorhanden**.
- Primärdaten liegen konsistent unter `data/academy/*.json`.

### 3.2 Schema- und Referenzkonsistenz

Durchlauf der bereitgestellten Validatoren:
- `node tools/validate-academy-data.mjs` → **OK** (Schemas + Referenzen ohne Fehler, nur mögliche nicht-strikte Warnungen).
- `node tools/validate-json.mjs` → **OK**.

Damit ist die maschinelle Integrität der vorhandenen JSON-Daten aktuell gut.

### 3.3 Logische Auffälligkeiten

- **Kalender-Tiefe unzureichend:** Trotz valider Struktur hat `calendar.json` nur einen Eintrag, was funktional möglich ist, aber in der Praxis ein Risiko für inhaltliche Vollständigkeit darstellt.
- Die Lessons-/Calendar-Verknüpfung wird robust mit Fallbacks behandelt (z. B. virtuelle Tages-Slots und Phase-Mapping), was Stabilität erhöht, aber Datenlücken kaschieren kann.

**Bewertung:** Kein akuter Parser-/Schemafehler, aber **Content-Reifegrad** (vor allem Kalenderabdeckung) sollte erhöht werden.

---

## 4) Architektur-Probleme (Schnittstellen/API-Kommunikation)

### 4.1 Positiv

- **Single Entry Point** (`scripts/janus.mjs`) ist sauber etabliert; Hook-Registrierung zentralisiert.
- **Modularität und Layering** sind grundsätzlich eingehalten (Core/Academy/Bridge/UI getrennt).
- **Import-Syntax**: `validate-imports` läuft sauber.
- **Circular Dependencies**: statische Analyse ergab keine Zyklen.

### 4.2 Probleme / Risiken

1. **State-Pattern-Verletzung aus UI:**
   - `scripts/ui/dev-panel.js` mutiert `game.janus7.core.state` direkt statt über eine höhere API/Capability-Schicht.
   - Zusätzlich wird `state.set(path, value, actorId)` mit einem dritten Parameter aufgerufen, den `core/state.js` nicht akzeptiert (stiller semantischer Fehler, möglicherweise „falsche Sicherheit“ im Tooling).

2. **Architektur-Namespace-Drift:**
   - In der Codebase ist `game.janus7` der zentrale Namespace; falls externe Spezifikation auf `game.janus.api.*` basiert, besteht Integrationsdrift und potenzielle Missverständnisse bei Erweiterungen.

3. **Direkte `game.settings.set` außerhalb State-Kern:**
   - Teilweise berechtigt (z. B. DSA5-spezifische Settings), aber es unterläuft im weiteren Sinn das strikt formulierte „Single Source of Truth“-Narrativ, wenn nicht klar dokumentiert abgegrenzt.

---

## 5) Kritische Bugs & Code Smells (mit Fundstellen und Refactoring-Vorschlag)

### Bug 1 — Ungesicherter Actor-Zugriff in Fate-Bridge (Null/Undefined-Risiko)

- **Datei:** `bridge/dsa5/fate.js`
- **Stellen:** `awardFatePoint` und `setFatePoints` greifen auf `actor.system.status.fatePoints` zu, ohne Actor-/Pfad-Guards.
- **Risiko:** Laufzeitfehler bei fehlendem Actor, unvollständigen Mock-Actors oder DSA5-Datenabweichungen.
- **Vorschlag:**
  - Guard-Kette einführen (`if (!actor?.system?.status?.fatePoints) throw ...`).
  - Typed Error + `ui.notifications.warn/error` im aufrufenden Kontext.

### Bug 2 — Falsche Nutzung der State-API im Dev Panel

- **Datei:** `scripts/ui/dev-panel.js`
- **Stellen:** direkte Transaction + `state.set('questStates', {}, actorId)` / `state.set('eventStates', {}, actorId)`.
- **Risiko:**
  - API-Missbrauch (3. Parameter wird ignoriert),
  - inkonsistente semantische Erwartungen,
  - Architekturbruch (UI schreibt direkt in Core-State).
- **Vorschlag:**
  - Einführung einer dedizierten Capability/API-Methode für actor-bezogenen Reset (z. B. `game.janus7.capabilities.state.resetActorProgress(actorId)`).
  - UI ruft nur diese Methode auf; Core kapselt Pfadbildung und Save.

### Smell 3 — Dokumentations-Drift / Vertragsdrift

- **Datei:** `docs/ROADMAP.md`, `docs/STATUS.md`, `module.json`
- **Befund:**
  - Phase-Status nicht konsistent (Phase 7 teils „done“, teils „planned“).
  - Versionsangaben driften (`STATUS.md` vs `module.json`).
  - Mehrere referenzierte Doku-Dateien fehlen.
- **Risiko:** Falsche Release-/Abnahmeentscheidungen, Onboarding-Reibung, unklare Verantwortlichkeiten.
- **Vorschlag:**
  - „Docs as Code“-Gate in CI (Link-Check + Version-Consistency-Check gegen `module.json`).
  - Klare SSOT-Dokumenthierarchie festlegen.

### Smell 4 — Datenreife: Minimaler Kalenderbestand

- **Datei:** `data/academy/calendar.json`, Nutzung in `academy/calendar.js` und `academy/lessons.js`
- **Befund:** Ein einziger Kalender-Entry + umfangreiche Fallbacklogik.
- **Risiko:** Tests können grün sein, während Kampagnenrealität unzureichend abgebildet ist.
- **Vorschlag:**
  - Mindestabdeckung definieren (z. B. 1 Trimester vollständig).
  - Content-Completeness-Validator ergänzen (nicht nur Schema/Referenzen, sondern Dichte-/Coverage-Metriken).

---

## Abschlussbewertung

JANUS7 ist architektonisch bereits auf einem hohen Niveau (modular, testbar, phase-driven). Der größte Hebel liegt jetzt in **Qualitätssicherung um die Spezifikation herum**: fehlende Vertragsdokumente nachziehen, Dokumentationskonsistenz härten, API-Disziplin im UI durchsetzen und Content-Coverage (Kalender) ausbauen.
