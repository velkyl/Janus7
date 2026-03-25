# Guided Manual Harness

Stand: v0.9.12.25

## Ziel

Der Guided Manual Harness führt manuelle bzw. semi-automatische Tests durch einen standardisierten Ablauf:

1. Test auswählen
2. Vorbedingungen per Knopfdruck prüfen
3. Passende JANUS-UI öffnen
4. Geführte Schritte ausführen
5. Evidenz (Snapshots / Prüfwerte) sammeln
6. PASS / FAIL / SKIP mit Notiz speichern

## Einstieg

- Test Results → **Guided Tests öffnen**
- oder Konsole: `game.janus7.test.openGuidedManualTests()`

## Was der Harness automatisch kann

- GM-/Nicht-GM-Kontext prüfen
- State-Load prüfen
- passende JANUS-UI öffnen
- State-Pfade inspizieren
- Diagnostics-Snapshots erfassen
- aktive Quests zusammenfassen
- aktiven User / verbundene User anzeigen
- KI-Bundle-/Historien-Snapshots erfassen

## Was bewusst manuell bleibt

- echte Bedienung in DSA5 / Foundry
- sichtbare UI-Ergebnisse
- Audio-/Beamer-Wahrnehmung
- Multi-Client-Bestätigung
- finale PASS/FAIL-Entscheidung

## Gespeicherte Evidenz

Beim Ausführen von Checks und Guided Steps sammelt der Harness eine Evidenz-Spur pro Test. Diese Evidenz wird zusammen mit dem Manual-Result gespeichert und kann zur Review kopiert werden.

## Pilot-Tests mit erweitertem Guide

- INT-TC-01
- INT-TC-02
- INT-TC-03
- INT-TC-04
- P4-TC-05
- P4B-TC-04
- P6-TC-04
- P3-TC-01

Weitere Manual-Tests fallen automatisch auf den generischen Guided-Modus zurück.


## v0.9.12.29 Ergänzung
- Jeder geführte Test zeigt jetzt passende Konsolenbefehle als kopierbare Snippets.
- Relevante Apps werden testspezifisch geöffnet (z. B. KI Roundtrip, Command Center, Sync Panel, Scoring View).
- P3-GC-TC-01 kann die Gruppenprobe-Nachricht direkt aus dem Harness erzeugen.
