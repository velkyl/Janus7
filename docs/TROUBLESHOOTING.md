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

### 5) KI-Roundtrip: Ergebnis wird nach Button-Klick nicht angezeigt
Symptom: „Warte auf Antwort…" oder SQL/Python-Ergebnis erscheint nie im ExternalBridge-Fenster.  
Fix: War ein `render()` ohne `{force:true}` — behoben in 0.9.12.47. Falls das Problem
nach dem Update erneut auftritt, prüfen ob eine Subklasse `render()` ohne Force aufruft.

### 6) Downtime-Warnung erscheint nicht im KI-Roundtrip-Preview
Symptom: Nach Preview werden `downtimeDetected`-Infos nicht angezeigt, obwohl ein
Zeitsprung stattgefunden hat.  
Ursache: `previewImport` gibt ein Wrapper-Objekt zurück (`{ diffs, downtimeDetected, ... }`),
nicht ein reines Array. Der Code las Metadaten fälschlicherweise aus dem Array.  
Fix: Behoben in 0.9.12.47. Falls die Service-Implementierung das Rückgabeformat ändert,
muss `_onPreview` in `JanusKiRoundtripApp` angepasst werden.

### 7) Non-GM kann mutierende Actions ausführen
Symptom: Spieler kann `apply`, `exportFile`, `testSql` etc. über die Konsole aufrufen.  
Fix: Alle kritischen Handler nutzen seit 0.9.12.47 `_requireGM()`. Bei fehlenden Guards
in neuen Handlern: Guard als erste Zeile ergänzen (siehe `docs/SECURITY.md`).

## Debug
- `game.janus7.core.diagnostics.run()` (falls vorhanden)
- Browser-Konsole (F12) für DIAG-Logs
- Security-Test: `Object.values(ui.windows).find(w => w.id === 'janus-ki-roundtrip')?._requireGM?.('test')`
  → als Nicht-GM muss `false` zurückgegeben werden
