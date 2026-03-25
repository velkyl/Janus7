# TROUBLESHOOTING – JANUS7

## Typische Probleme

### 1) DSA5 nicht aktiv
Symptom: Bridge-Tests schlagen fehl oder werden geskippt.  
Fix: Stelle sicher, dass die Welt das System `dsa5` nutzt und aktiv geladen ist.

### 2) UI-Dialoge beim Würfeln
Symptom: Foundry fordert Würfel-Dialoge an.  
Fix: In JANUS7 werden Rolls als “silent” ausgeführt. Prüfe:
- dsa5-Version / Settings
- ob andere Module Rolls intercepten (z.B. Hausregel-Module)

### 3) Fixture Actor fehlt
Symptom: Tests SKIPpen (Actor nicht gefunden).  
Fix: Im Runner die Actor-Namen anpassen oder Actor anlegen.

### 4) CORS / 404 bei JSON
Symptom: lessons.json lädt nicht (extern).  
Fix: JANUS7 erwartet lokale Modulpfade, keine externen example.com URLs.

## Debug
- `game.janus7.core.diagnostics.run()` (falls vorhanden)
- Browser-Konsole (F12) für DIAG-Logs
