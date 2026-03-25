# JANUS7 — Installation (Foundry v13+)

**Modul-Version:** 0.9.12.43 (SSOT: `module.json`)  
**Zielgruppe:** GM/SL für DSA5-Welten mit JANUS7 als aktivem Kampagnenmodul.

## Voraussetzungen
- Foundry VTT v13+
- DSA5-System aktiv
- GM-Rechte für Erststart, Datenimporte und KI-Anwendung

## Installation
1. ZIP nach `<FoundryData>/Data/modules/Janus7/` entpacken.
2. Prüfen, dass `module.json` direkt im Ordner `janus7/` liegt.
3. Foundry starten, Modul aktivieren, **Ctrl+F5** für sauberen Reload.
4. Shell öffnen oder `game.janus7.ui.openShell()` ausführen.

## Erststart-Prüfung
- `game.janus7` existiert
- `game.janus7.ui.openShell()` öffnet die Shell
- `game.janus7.commands.runHealthCheck()` liefert OK
- Test-Harness kann ohne Importfehler geladen werden

## Empfohlene Reihenfolge nach dem Update
1. Modul aktivieren / Reload
2. Shell öffnen
3. Health Check
4. Academy-Daten/Seed-Import nur bei Bedarf
5. KI-Workflow erst nach erfolgreicher Preview verwenden

## Wichtige Begriffe
- **Modul-Version:** Build-/Runtime-Version aus `module.json`
- **State-Version:** Version im gespeicherten JANUS-State
- **AcademyDataApi:** liefert die statischen und World-überlagerten Akademiedaten

## Typische Fehlerquellen
- Browser-Cache nach Modulwechsel nicht geleert
- Welt nutzt alte Makros/Launcher statt Shell-Frontdoor
- KI-Import ohne Preview oder ohne Backup
- Legacy-Dokumentation als aktuelle Anleitung missverstanden
