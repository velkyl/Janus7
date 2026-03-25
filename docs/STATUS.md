# STATUS — v0.9.12.29

# JANUS7 Status

**Module Version (SSOT: module.json):** 0.9.12.29  
**Stand:** 2026-03-12  
**Foundry Zielplattform:** v13+ (ESM, ApplicationV2)

## Kurzlage
- **Produktiv nutzbar:** Core/State, AcademyDataApi, DSA5-Bridge, Kalender, Social, Scoring-Basis, Quest-Basis, Shell-Frontdoor, KI-Backup/Preview.
- **Teilweise umgesetzt:** Shell-Cutover der Alt-Apps, Panel-Migration, Data Studio, Session Prep, einige Editor-Flows.
- **Experimentell / intern:** einzelne Diagnose-/Debug-Apps, Legacy-Wrapper, Guided-Manual-Hilfsflüsse.

## Reifegrad
JANUS7 ist technisch stabil und für den Kampagnenbetrieb nutzbar. Die Welle-4-Härtung trennt jetzt die shipped Built-in-Tests sauber in Auto- und Manual-Buckets, ohne die vollständige Sichtbarkeit des Testbestands zu verlieren.

## Wichtige Änderungen in 0.9.12.29
- `core/test/register-builtins.js` exportiert nun getrennte Listen für `BUILTIN_AUTO_MODULES` und `BUILTIN_MANUAL_MODULES`.
- Der Built-in-Registrar lädt weiterhin beide Testklassen, protokolliert die Verteilung aber explizit und beseitigt damit das letzte offene Welle-4-Kriterium aus dem Korrekturplan.
- Offensichtlicher Versions-Drift in Kern-Dokumenten wurde auf 0.9.12.29 angehoben.

## Welle-Status
- **Welle 2:** abgeschlossen
- **Welle 3:** abgeschlossen
- **Welle 4:** Release-Hardening technisch abgeschlossen; Live-Abnahme in Foundry bleibt sinnvoll

## Prüfschritte nach dem Update
1. Foundry zeigt `0.9.12.29` als Modulversion.
2. Test-Registry lädt ohne Importfehler.
3. Test-UI weist Auto- und Manual-Bestand getrennt aus.
4. Shell und Kern-Apps öffnen stabil.
