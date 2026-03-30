# Guided Manual Harness

Stand: v0.9.12.46
Letzte Doku-Synchronisation: 2026-03-30

## Ziel

Der Guided Manual Harness fuehrt manuelle bzw. semi-automatische Tests durch einen standardisierten Ablauf:

1. Test auswaehlen
2. Vorbedingungen per Knopfdruck pruefen
3. Passende JANUS-UI oeffnen
4. Gefuehrte Schritte ausfuehren
5. Evidenz (Snapshots / Pruefwerte) sammeln
6. PASS / FAIL / SKIP mit Notiz speichern

## Einstieg

- Test Results -> **Guided Tests oeffnen**
- oder Konsole: `game.janus7.test.openGuidedManualTests()`

## Was der Harness automatisch kann

- GM-/Nicht-GM-Kontext pruefen
- State-Load pruefen
- passende JANUS-UI oeffnen
- State-Pfade inspizieren
- Diagnostics-Snapshots erfassen
- aktive Quests zusammenfassen
- aktiven User / verbundene User anzeigen
- KI-Bundle-/Historien-Snapshots erfassen
- testspezifische Konsolen-Snippets anzeigen

## Was bewusst manuell bleibt

- echte Bedienung in DSA5 / Foundry
- sichtbare UI-Ergebnisse
- Audio-/Beamer-Wahrnehmung
- Multi-Client-Bestaetigung
- finale PASS/FAIL-Entscheidung

## Gespeicherte Evidenz

Beim Ausfuehren von Checks und Guided Steps sammelt der Harness eine Evidenz-Spur pro Test. Diese Evidenz wird zusammen mit dem Manual-Result gespeichert und kann fuer Review oder Release-Abnahme kopiert werden.

## Pilot-Tests mit erweitertem Guide

- INT-TC-01
- INT-TC-02
- INT-TC-03
- INT-TC-04
- P4-TC-05
- P4B-TC-04
- P6-TC-04
- P3-TC-01
- P3-GC-TC-01

Weitere Manual-Tests fallen automatisch auf den generischen Guided-Modus zurueck.

## Hinweise zum aktuellen Stand

- Relevante Apps werden testspezifisch geoeffnet, statt nur die Shell als generischen Einstieg zu nutzen.
- Die angezeigten Snippets sollen die oeffentliche Runtime-API spiegeln, nicht interne Imports.
- Der Harness ist ein Test-/Debug-Werkzeug und kein produktiver Endnutzer-Workflow.

