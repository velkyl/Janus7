# JANUS7 — AI Developer Codex & Coding Guidelines

Dieses Dokument bündelt das gesammelte Systemwissen über das **JANUS7** Foundry VTT Modul. Es dient als "System-Prompt" und Regelwerk, um bei zukünftigen Programmieraufgaben Architekturbrüche zu verhindern.

## 1. Das Phasen-Modell (0 bis 8)
JANUS7 ist strikt in 9 Phasen unterteilt. **Die wichtigste Regel:** Eine Phase `N` darf nur Phasen `< N` importieren. Zirkuläre Abhängigkeiten ("Cross-Phase Dependencies") sind verboten.

- **Phase 1 (Core):** State-Manager (`JanusStateCore`), Settings, Logger. *Darf keine Foundry-Hooks registrieren!*
- **Phase 2 (Academy Data):** JSON-Rohdaten (SSOT) und die `AcademyDataApi` inkl. Caching.
- **Phase 3 (DSA5 Bridge):** **WICHTIG!** Niemals direkt auf Foundry `actor.system` zugreifen! Alles was mit Proben, Items, Actor-Auflösung zu tun hat, passiert exklusiv über die `DSA5SystemBridge` (`game.janus7.bridge.dsa5` bzw. `game.janus7.dsa5`).
- **Phase 4 (Simulation/Runtime):** Kalender, Unterricht (Lessons), Prüfungen (Exams), Scoring, Social Engine. (Hier liegt die "Living World" Logik).
- **Phase 4b (Quest & Event):** Story-System. Nutzt Nodes, Fail-Forward Mechaniken und den `Condition Evaluator` (welcher Strings wie `CHECK(Magiekunde, 15)` auswertet).
- **Phase 5 (Atmosphere):** Audio/Playlists. (Kann per Kill-Switch deaktiviert werden).
- **Phase 6 (UI):** Foundry V13 `ApplicationV2`. Beinhaltet die `JanusShellApp`. **Regel:** UI enthält **niemals** Business-Logik, sondern ruft immer API-Methoden aus Phase 1-4 auf.
- **Phase 7 (KI-Roundtrip):** Exportiert State/Data nach JSON und importiert KI-Antworten mit transaktionalen Rollbacks.

## 2. Der einzige Entry-Point
- `scripts/janus.mjs` ist die **einzige** Datei, in der Kern-Hooks (`Hooks.once('init')`, `Hooks.once('ready')`) gegen Foundry registriert werden.
- Alle anderen Phasen-Integrationen exportieren Setup-Routinen, die von `janus.mjs` aufgerufen werden. Das verhindert Race-Conditions.

## 3. Datenhaltung & State Manipulation (SSOT)
- **State Changes:** Alle persistenten Änderungen *müssen* über den `JanusStateCore` (bspw. `state.set()` oder `state.transaction()`) laufen.
- **Achtung Direkt-Writes:** Niemals den State direkt ohne API mutieren. Im UI (Phase 6) werden stattdessen Methoden aus dem `Director` (`game.janus7.core.director`) genutzt.
- **JSON-Files:** Sind die statische Wahrheitsquelle (Spieldaten) und liegen in `data/academy/`. Sie werden beim Hot-Reload dynamisch neu gecached.

## 4. UI-Entwicklung (ApplicationV2)
- Alte `FormApplication` Dialoge sind stark veraltet (Legacy).
- Neue Fenster erben von `ApplicationV2` (bzw. HandlebarsApplication).
- Views rendern via Handlebars (`templates/`) und werden über den zentralen UI-Router geladen (`game.janus7.ui.open('viewName')`).

## 5. Error Handling & Diagnostics
- Keine "Silent Fails". Bei Problemen den Logger (`engine.core.logger.warn()`) verwenden.
- System-kritische Fehler ans Diagnostics-System melden (`_recordIssue`), damit der Command `runHealthCheck()` sie erfasst.

## 6. Anti-Patterns (Absolut verboten)
❌ `actor.system.skills.magiekunde` (Direktzugriff bricht bei DSA-Updates → Nutze Bridge!)
❌ Fehlende Daten mit `0` statt `null` repräsentieren (Semantik-Fehler).
❌ UI-Dialoge oder Prompts tief im Backend-Code (Phase 1-4b) erzwingen. Phase 4 signalisiert per Hook, Phase 6 (UI) öffnet den Dialog.

---

> **Anweisung (Self-Prompt):**
> Lies diesen Codex, bevor du neuen Code für JANUS7 formulierst. Fokussiere dich auf Daten-Kapselung (Bridge), strikte Phase-Trennung und transaktionales State-Management.
