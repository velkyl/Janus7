# JANUS7 Release-Übersicht

Aktuelle Version: **0.9.12.29** (2026-03-11)

## Was ist neu in 0.9.12.29?
- Doku- und Versionskonsolidierung
- neue Academy-Schemas und Academy-Validator
- Referenzintegritätsprüfung mit praktischeren Fehltexten
- KI-Preflight/Restore-Härtung
- neue Status- und Handbuch-Dokumente

## Release-Fokus
Dieser Stand ist ein **Konsistenz- und Härtungsrelease**, kein großer Architekturumbau. Ziel war, Doku, Code, Daten und Tests näher zusammenzuziehen, ohne die bestehende Architektur wild umzubauen.

## Offene Risiken
- Die Academy-Referenzprüfung meldet derzeit 34 Warnungen gegen Legacy-/Alias-Referenzen in den Inhaltsdaten. Diese werden bewusst sichtbar gemacht und nicht stillschweigend umgeschrieben.
- Der UI-Cutover zur Shell ist weit fortgeschritten, aber einzelne Legacy-Wrapper bleiben vorerst aus Kompatibilitätsgründen aktiv.
- Die statischen Validatoren sind grün; eine vollständige Live-Abnahme in deiner Foundry-Welt bleibt weiterhin der letzte Schritt.
