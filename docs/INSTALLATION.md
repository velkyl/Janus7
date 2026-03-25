# JANUS7 - Installation (Foundry v13+)

**Modul-Version:** 0.9.12.44 (SSOT: `module.json`)
**Zielgruppe:** GM/SL fuer DSA5-Welten mit JANUS7 als aktivem Kampagnenmodul.

## Voraussetzungen
- Foundry VTT v13+
- DSA5-System aktiv
- GM-Rechte fuer Erststart, Datenimporte und KI-Anwendung

## Installation
1. ZIP nach `<FoundryData>/Data/modules/Janus7/` entpacken.
2. Pruefen, dass `module.json` direkt im Ordner `Janus7/` liegt.
3. Foundry starten, Modul aktivieren und einen sauberen Browser-Reload ausfuehren.
4. Shell oeffnen oder `game.janus7.ui.openShell()` ausfuehren.

## Erststart-Pruefung
- `game.janus7` existiert.
- `game.janus7.ui.openShell()` oeffnet die Shell.
- `game.janus7.commands.runHealthCheck()` liefert einen Report.
- Test-Harness beziehungsweise Test Results laden ohne Importfehler.

## Empfohlene Reihenfolge nach dem Update
1. Modul aktivieren / Reload
2. Shell oeffnen
3. Health Check
4. Kern-Apps antesten (`academyOverview`, `scoringView`, `syncPanel` nach Bedarf)
5. KI-Workflow nur nach Preview und Backup nutzen

## Wichtige Begriffe
- **Modul-Version:** Build-/Runtime-Version aus `module.json`
- **State-Version:** Version im gespeicherten JANUS-State
- **AcademyDataApi:** liefert statische und weltseitig ueberlagerte Akademiedaten

## Typische Fehlerquellen
- Browser-Cache nach Modulwechsel nicht geleert
- Welt nutzt alte Makros/Launcher statt Shell-Frontdoor
- KI-Import ohne Preview oder ohne Backup
- Actor-UUID-Mappings fuer Academy-NPCs fehlen in der Welt
