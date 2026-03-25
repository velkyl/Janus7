# JANUS7 Release Manual Tests

Version: **0.9.12.29**

Diese Tests prüfen kritische Systemflüsse, die nur teilweise automatisierbar sind.

---

# INT-TC-01

## Lektion starten → abschließen

### Schritte

1. Akademie öffnen
2. Lektion starten
3. Probe ausführen
4. Lektion abschließen

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
3. Import durchführen

### Erwartetes Ergebnis

- neue Lektion verfügbar
- Referenzen korrekt
- keine Validierungsfehler

Result:


PASS / FAIL


Notes:

---

# INT-TC-04

## Beamer + Control Panel Sync

### Schritte

1. Control Panel öffnen
2. Location wechseln

### Erwartetes Ergebnis

Beamer zeigt neue Location sofort.

Result:


PASS / FAIL


Notes:

---

# P3-TC-01

## DSA5 Roll API

### Schritte

1. Probe auslösen
2. Ergebnis prüfen

### Erwartetes Ergebnis

Roll-Result enthält:

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

1. Atmosphere DJ öffnen
2. Mood aktivieren

### Erwartetes Ergebnis

- passende Playlist startet
- Lautstärke korrekt

Result:


PASS / FAIL


Notes:

---

# P6 — Permissions

### Schritte

1. als Nicht-GM anmelden
2. Control Panel öffnen
3. GM-Aktionen versuchen

### Erwartetes Ergebnis

- Aktionen blockiert
- keine Exceptions

Result:


PASS / FAIL


Notes: