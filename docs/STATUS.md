# STATUS - v0.9.12.46

# JANUS7 Status

**Module Version (SSOT: module.json):** 0.9.12.46
**Stand:** 2026-04-21
**Foundry Zielplattform:** v13+ (ESM, ApplicationV2)

## Kurzlage
- **Produktiv nutzbar:** Core/State, AcademyDataApi, DSA5-Bridge, Kalender, Social, Scoring-Basis, Quest-Basis, Shell-Frontdoor, KI-Backup/Preview.
- **Teilweise umgesetzt:** Panel-Migration, Data Studio, Session Prep, einzelne Editor-Flows.
- **Experimentell / intern:** Diagnose-/Debug-Apps, Guided-Manual-Hilfsfluesse, einzelne Legacy-Wrapper.

## Reifegrad
JANUS7 ist technisch stabil und fuer den Kampagnenbetrieb nutzbar. Die aktuelle Haertung repariert echte Runtime-Drift in UI-, Bridge- und Datenpfaden statt nur Dokumentationstexte nachzuziehen.

## Wichtige Aenderungen in 0.9.12.46 (2026-04-21 Nachtrag)
- Shell-Cutover abgeschlossen: `controlPanel`, `lessons`, `aiRoundtrip` als `preferred: false`-Compat-Eintraege aus `app-manifest.js` entfernt; `APP_LAUNCHER_EXCLUDE` in `JanusShellApp` bereinigt.
- `CANONICAL_UI_KEYS`, `apps`-Registry-Compat-Keys und `openControlPanel()` bleiben erhalten (werden von Makros, Tests und Scene-Controls aktiv genutzt).
- Zwei neue Querschnittsdateien (`core/foundry-compat.js`, `scripts/extensions/phase8-api.js`) sind produktiv und von mehreren Modulen referenziert.

## Wichtige Aenderungen in 0.9.12.46 (Original)
- Control Panel schreibt `academy.roster` und `academy.slotJournals` wieder ueber Director-APIs statt ueber einen defekten Direkt-Write auf den State.
- `AcademyDataApi` liest Exam-MCQ-Daten wieder aus dem realen `questionSets`-Root der shipped `exam-questions.json`.
- DSA5-Bridge und System-Commands nutzen wieder konsistente Actor-/Skill-Pfade (`getNpc()`, `getActorByName()`, `bridge.rollSkill(...)`).
- API-, KI-, Release-, Status- und Roadmap-Dokumente wurden auf den tatsaechlichen Runtime-Stand gezogen.

## Welle-Status
- **Welle 2:** abgeschlossen
- **Welle 3:** abgeschlossen
- **Welle 4:** Release-Hardening technisch abgeschlossen; Live-Abnahme in Foundry bleibt sinnvoll

## Pruefschritte nach dem Update
1. Foundry zeigt `0.9.12.46` als Modulversion.
2. Shell und Kern-Apps oeffnen stabil.
3. Test-Registry laedt ohne Importfehler.
4. Exam-/MCQ-Workflows finden ihre Fragekataloge wieder.

