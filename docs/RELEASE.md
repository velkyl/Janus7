# JANUS7 Release-Uebersicht

Aktuelle Version: **0.9.12.44** (2026-03-25)

## Was ist neu in 0.9.12.44?
- Control-Panel-Dropflows schreiben Roster- und Slot-Journal-Aenderungen wieder ueber Director-APIs.
- Exam-MCQ-Fragen werden wieder passend zur shipped Datenform `questionSets` aufgeloest.
- DSA5-Bridge und System-Commands sind bei Actor-Lookup und Skill-Rolls wieder konsistent verdrahtet.
- API-, KI-, Release- und Status-Dokumente wurden auf die reale Runtime-SSOT gezogen.

## Release-Fokus
Dieser Stand ist ein gezieltes Stabilitaets- und Drift-Release. Er repariert echte Runtime-Kanten, reduziert Architekturverletzungen im UI-Layer und entfernt falsche IST-Aussagen aus der Dokumentation.

## Offene Risiken
- Die mitgelieferten Academy-Daten bestanden im Repo eine manuelle Referenz-Integritaetspruefung; Welt-Overrides koennen trotzdem neue Drift einbringen.
- Der UI-Cutover zur Shell ist weit fortgeschritten, aber einzelne Legacy-Wrapper und Alias-Keys bleiben vorerst aus Kompatibilitaetsgruenden aktiv.
- Repo-Validatoren und Testkataloge decken viel Drift ab; eine vollstaendige Live-Abnahme in der Zielwelt bleibt trotzdem der letzte Schritt.
