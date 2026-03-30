# JANUS7 Release Manual Tests

Version: **0.9.12.46**
Letzte Doku-Synchronisation: 2026-03-30

Diese Tests pruefen kritische Systemfluesse, die nur teilweise automatisierbar sind. Fuer die gefuehrte Variante ist nach Moeglichkeit der Guided Manual Harness zu verwenden; diese Datei bleibt die kompakte Release-Checkliste.

---

# INT-TC-01

## Lektion starten -> abschliessen

### Schritte

1. Academy Overview oder Shell oeffnen
2. Lektion starten
3. Probe ausfuehren
4. Lektion abschliessen

### Erwartetes Ergebnis

- Score wird aktualisiert
- State wird gespeichert
- UI zeigt korrekten Status

Result:

PASS / FAIL

Notes:

---

# INT-TC-02

## KI Roundtrip

### Schritte

1. State exportieren
2. JSON editieren
3. `previewImport` ausfuehren
4. Import durchfuehren

### Erwartetes Ergebnis

- neue Lektion verfuegbar
- Referenzen korrekt
- keine Validierungsfehler
- Preview und Apply zeigen konsistente Diffs

Result:

PASS / FAIL

Notes:

---

# INT-TC-04

## Beamer + Control Panel Sync

### Schritte

1. Shell oder Legacy-Einstieg oeffnen
2. Location wechseln

### Erwartetes Ergebnis

- Beamer zeigt neue Location sofort
- es gibt keine JS-Exception im Wechselpfad

Result:

PASS / FAIL

Notes:

---

# P3-TC-01

## DSA5 Roll API

### Schritte

1. Probe ausloesen
2. Ergebnis pruefen

### Erwartetes Ergebnis

Roll-Result enthaelt:

- success
- quality
- roll data

Result:

PASS / FAIL

Notes:

---

# P5-TC-02

## Atmosphere Mood

### Schritte

1. Atmosphere DJ oeffnen
2. Mood aktivieren

### Erwartetes Ergebnis

- passende Playlist startet
- Lautstaerke korrekt

Result:

PASS / FAIL

Notes:

---

# P6 - Permissions

### Schritte

1. als Nicht-GM anmelden
2. Shell oder relevante Teil-App oeffnen
3. GM-Aktionen versuchen

### Erwartetes Ergebnis

- Aktionen blockiert
- keine Exceptions

Result:

PASS / FAIL

Notes:

