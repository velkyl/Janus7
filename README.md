# JANUS7 (Foundry VTT Modul)

**Version:** 0.9.12.43  
**Foundry:** v13+  
**Systemfokus:** DSA5-Zauberakademie-OS mit Shell-UI, Director-Workflow, Akademiedaten, Simulation, KI-Roundtrip und Test-Harness.

JANUS7 ist ein mehrschichtiges Foundry-Modul für eine langfristige Zauberakademie-Kampagne. Der aktuelle Stand ist **produktiv nutzbar**, aber nicht jede Oberfläche ist gleich reif. Die Shell ist die bevorzugte Hauptoberfläche, ältere Einzel-Apps bleiben teils als Bridge erhalten.

## Status (0.9.12.43)
- **Produktiv nutzbar:** Core/State, AcademyDataApi, DSA5-Bridge (inkl. Moon/Fate/Advancement/TimedCond), Kalender/Scoring/Social/Quest-Basis, Shell-Frontdoor, KI-Backup/Preview.
- **Teilweise umgesetzt:** Shell-Cutover der Alt-Apps, einige Panel-Migrationen, Data Studio/Session Prep als arbeitsfähige Werkzeuge.
- **Experimentell / intern:** einzelne Debug-/Test-Apps, manuelle Testpfade, Legacy-Wrapper, einige Import-/Restore-Kantenfälle.

## Schnellstart
1. ZIP nach `FoundryVTT/Data/modules/Janus7/` entpacken.
2. Foundry neu laden und **JANUS7** aktivieren.
3. Shell öffnen:
   - Scene Controls / JANUS-Button oder
   - Konsole: `game.janus7.ui.openShell()`
4. Erstprüfung:
   - `game.janus7.commands.runHealthCheck()`
   - Test-Harness für Smoke-/Binding-Lauf

## Bevorzugte Oberflächen
- **JANUS Shell**: Hauptoberfläche für Director, Academy, Tools
- **Scoring View**: operativ nutzbar, perspektivisch als Shell-Panel
- **Academy Overview**: stabiler Überblick, perspektivisch Shell-Panel
- **KI Roundtrip / Backup Manager**: GM-Werkzeuge für Export, Preview, Apply, Restore
- **Command Center / Test Results**: Admin- und Debug-orientiert

## Architektur in Kurzform
- `core/` – Boot, State, Validator, Folder-/Diagnostics-/Sync-Services
- `academy/` – Akademiedaten, Unterricht, Scoring, Social, Quests, Progression
- `bridge/`, `bridges/` – DSA5- und Foundry-spezifische Integrationen
- `phase7/` – KI-Export, Diff, Import, Backup/Restore
- `ui/` – Shell, Apps, Commands, Layer/Registry
- `data/academy/` – SSOT-Daten inklusive Schemas
- `core/test/` – Test-Harness, Binding- und Regressions-Tests

## Dokumentation
- `docs/INDEX.md` – zentraler Einstieg
- `docs/STATUS.md` – Kurzstatus und Reifegrad
- `docs/MODULE_STATUS.md` – produktiv / teilweise / experimentell
- `docs/TECHNICAL_HANDBOOK.md` – Modulstart, UI, Datenfluss, KI, Diagnose
- `docs/UI_APP_CATALOG.md` – App-Klassifikation und Reifegrad
- `docs/INSTALLATION.md`, `docs/TROUBLESHOOTING.md`, `docs/KI_STABILITY.md`

## Hinweise
- **SSOT für die Runtime-Version ist `module.json`.**
- **Nicht jede App ist Edit-fähig.** Die Klassifikation steht im UI-App-Katalog.
- **Referenzfehler in Academy-Daten werden jetzt explizit diagnostiziert.** Sie werden konservativ geloggt, statt still durchzurutschen.
