# Update 0.9.12.46

## Aenderungen in 0.9.12.46

- FIX: Control Panel routet People- und Slot-Journal-Mutationen wieder ueber Director-APIs statt ueber einen kaputten Direkt-Write auf den State.
- FIX: Exam-MCQ-Fragensaetze werden wieder aus der realen Datenstruktur `questionSets` geladen.
- FIX: DSA5-Bridge/System-Commands sind bei Actor-Lookup und Skill-Rolls wieder auf denselben Public-API-Vertrag ausgerichtet.
- DOKU: API-, KI-, Release-, Status-, Roadmap- und UI-Dokumente beschreiben jetzt die tatsaechlich vorhandenen Hooks, Parameter und bekannten offenen Punkte.

## Gesamtstatus (0.9.12.46)

| Phase | Status |
|-------|--------|
| P0 Leitbild | DONE |
| P1 Core & State | DONE |
| P2 Academy Data | DONE |
| P3 DSA5 Bridge | DONE (Moon/Fate/Advancement/TimedCond/PostRoll/Social/Tradition) |
| P4 Simulation | DONE |
| P5 Atmosphere | DONE |
| P6 UI / Shell | DONE, mit laufendem Shell-Cutover |
| P7 KI-Integration | DONE (Roundtrip, Preflight, Backup, Restore) |
| P8 Backlog | In Progress |

## Bekannte offene Punkte

- Weltabhaengigkeiten: Actor-UUID-Mappings fuer Academy-NPCs bleiben eine Welt-/Content-Aufgabe.
- UI-Cutover: Shell ist die bevorzugte Frontdoor; einige Legacy-Wrapper und Alias-Keys bleiben vorerst aus Kompatibilitaetsgruenden aktiv.
- Teststatus: Repo-Validatoren und Kataloge sind vorhanden; eine Live-Abnahme in Foundry bleibt weiterhin sinnvoll.
- P1-TC-05: Idempotent-Set-Optimierung ist weiterhin bewusst als SKIP markiert.

