# STATUS - v0.9.12.46

# JANUS7 Status

**Module Version (SSOT: module.json):** 0.9.12.46
**Stand:** 2026-03-30
**Foundry Zielplattform:** v13+ (ESM, ApplicationV2)

## Kurzlage
- **Produktiv nutzbar:** Core/State, AcademyDataApi, DSA5-Bridge, Kalender, Social, Scoring-Basis, Quest-Basis, Shell-Frontdoor, KI-Backup/Preview.
- **Teilweise umgesetzt:** Shell-Cutover der Alt-Apps, Panel-Migration, Data Studio, Session Prep, einzelne Editor-Flows.
- **Experimentell / intern:** Diagnose-/Debug-Apps, Guided-Manual-Hilfsfluesse, einzelne Legacy-Wrapper.

## Reifegrad
JANUS7 ist technisch stabil und fuer den Kampagnenbetrieb nutzbar. Die aktuelle Haertung repariert echte Runtime-Drift in UI-, Bridge- und Datenpfaden statt nur Dokumentationstexte nachzuziehen.

## Wichtige Aenderungen in 0.9.12.46
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

