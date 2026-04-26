# JANUS7 Release 0.9.12.47 — UI Security & Stability Patch

**Stand:** 2026-04-26  
**Betroffene Dateien:**
- `ui/apps/JanusExternalBridgeApp.js`
- `ui/apps/JanusReportCardApp.js`
- `ui/apps/ki-roundtrip/JanusKiRoundtripApp.js`
- `ui/core/base-app.js`

---

## Korrigiert

### BUG-01 · `JanusExternalBridgeApp` — `render()` ohne `force:true` (HOCH)
`this.render()` ist in ApplicationV2 ein No-Op, wenn die App bereits geöffnet ist.
Die Status-Anzeige „Warte auf Antwort…" sowie das Ergebnis wurden nie gerendert.  
**Fix:** Alle `this.render()` auf `await this.render({ force: true })` umgestellt.

### BUG-02 · `JanusExternalBridgeApp` — fehlende Optional-Chaining bei Service-Zugriff (HOCH)
Direktzugriff `game.janus7.capabilities.ext.querySql(...)` warf einen unkontrollierten
`TypeError`, wenn die Engine nicht geladen oder das Feature-Flag deaktiviert war.  
**Fix:** `game?.janus7?.capabilities?.ext ?? game?.janus7?.ext` mit optionalem Chaining.

### BUG-03 · `_preRender`-Signatur falsch (KiRoundtripApp & ReportCardApp) (MITTEL)
In Foundry v13 ApplicationV2 lautet die Signatur `_preRender(context, options)`.
Beide Apps deklarierten nur einen Parameter; `super._preRender()` bekam dadurch
`context` als `options` übergeben.  
**Fix:** Beide Apps korrigiert auf `_preRender(context, options)` bzw. `_preRender(_context, _options)`.

### BUG-04 · `KiRoundtripApp._onPreview` — Diffs-Typ-Ambiguität (MITTEL)
`previewImport()` kann ein Array **oder** ein Objekt `{ diffs, downtimeDetected, skippedDays }`
zurückgeben. Der Code las `diffs?.downtimeDetected` direkt — bei einem Array immer `undefined`.
Die Downtime-Warnung im Template war dadurch permanent unsichtbar.  
**Fix:** Explizite Typ-Verzweigung: `Array.isArray(raw) ? raw : raw?.diffs ?? []` für den
Diff-Array, separate Extraktion der Metadaten aus dem Wrapper-Objekt.

---

## Verbessert

### PERF-01 · `KiRoundtripApp` — Bundle-Fetch-Cache-Guard
`_preRender` rief `ki.exportBundle()` bei **jedem** Render auf, auch beim Checkbox-Toggle.
Neu: Cache wird nur invalidiert wenn der Export-Modus wechselt, nach `applyImport` oder
beim ersten Render (`__lastFetchedMode`-Guard).

### PERF-02 · `KiRoundtripApp` — DOM-Patch statt Full-Rerender bei Diff-Selektion
`_onToggleDiff`, `_onSelectAllDiffs`, `_onSelectNoneDiffs` lösten einen kompletten
Handlebars-Rerender inkl. async Bundle-Fetch aus.  
**Fix:** Neue Methoden `_patchDiffCounters()` und `_patchDiffSelection(boolean)` patchen
nur die betroffenen DOM-Nodes (Counter-Spans + Checkboxen) direkt, ohne `render()`.

| Aktion | Vorher | Nachher |
|---|---|---|
| Checkbox-Toggle | Full-Rerender + `exportBundle()` | DOM-Patch (2 Text-Nodes) |
| Alle/Keine | Full-Rerender + `exportBundle()` | DOM-Patch (n Checkboxes + 2 Counters) |
| Mode-Wechsel | Full-Rerender + `exportBundle()` | Full-Rerender + `exportBundle()` ✓ |

---

## Gehärtet (Security)

### SEC-01 · `JanusBaseApp._requireGM()` — universeller Zugriffsschutz
Template-`disabled`-Attribute sind UI-Hints, keine Sicherheitsbarrieren.
Ein nicht-GM kann jeden Action-Handler über die Browser-Konsole aufrufen.

Neue Methode in `JanusBaseApp`:
```js
_requireGM(actionName = 'action') → boolean
```
Gibt `true` zurück wenn der aktuelle User GM ist; andernfalls Notification + Log-Eintrag + `false`.

**Geschützte Actions:**

| App | Action | Risiko |
|---|---|---|
| `ExternalBridgeApp` | `testSql` | SQL-Execution |
| `ExternalBridgeApp` | `testPython` | Remote Code Execution |
| `KiRoundtripApp` | `apply` / `applySelected` | State-Mutation |
| `KiRoundtripApp` | `exportFile` | Server-Datei-Schreibzugriff |
| `KiRoundtripApp` | `loadFile` | Import-Trigger |
| `ReportCardApp` | `exportPdf` | Datei-Export |
| `ReportCardApp` | `writeJournals` | Journal-Mutation |

Bewusst **nicht** beschränkt (read-only): `exportJson`, `preview`, `exportMode`,
`toggleDiff`, `selectAll/None`, `browseFile`.

---

## Offene Risiken
- `previewImport` API-Rückgabetyp ist noch nicht durch ein Schema fixiert.
  Der neue Dispatch-Code in `_onPreview` ist defensiv, aber das Service-Interface
  sollte mittel- bis langfristig vereinheitlicht werden.
- `JanusExternalBridgeApp` führt SQL direkt aus; eine Query-Whitelist oder
  parameterisierte Zugriffe würden das Risiko weiter reduzieren.

## Nächste Welle
- SQL-Query-Whitelist / Parameterisierung in `ExternalBridgeApp`
- `previewImport` Service-Interface auf festes Return-Schema normieren
- Quench-Integrationstests für Security-Guards ergänzen
