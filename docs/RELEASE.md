# JANUS7 Release-Übersicht

Aktuelle Version: **0.9.12.43** (2026-03-25)

## Was ist neu in 0.9.12.43?
- Versions- und Kern-Dokumente wieder auf die Runtime-SSOT synchronisiert
- GitHub-CI auf Repo-Validierung statt kaputtem npm-Publish umgestellt
- Hook-Registrierung dedupliziert und Cleanup über alle registrierten Hook-Buckets vereinheitlicht
- mehrere Integrationen von Legacy-Alias-Hooks auf kanonische `HOOKS.*`-Topics migriert

## Release-Fokus
Dieser Stand ist ein **Konsistenz- und Härtungsrelease**, kein großer Architekturumbau. Ziel war, Doku, CI, Lifecycle-Hooks und Altlasten wieder näher an die Architekturverträge heranzuziehen.

## Offene Risiken
- Die Academy-Referenzprüfung meldet derzeit 34 Warnungen gegen Legacy-/Alias-Referenzen in den Inhaltsdaten. Diese werden bewusst sichtbar gemacht und nicht stillschweigend umgeschrieben.
- Der UI-Cutover zur Shell ist weit fortgeschritten, aber einzelne Legacy-Wrapper bleiben vorerst aus Kompatibilitätsgründen aktiv.
- Die statischen Validatoren sind grün; eine vollständige Live-Abnahme in deiner Foundry-Welt bleibt weiterhin der letzte Schritt.
