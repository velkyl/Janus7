# JANUS7 KI-Integration Guide

**Modul-Version:** 0.9.12.44  
**Phase:** 7 - KI-Roundtrip  
**Datum:** 2026-03-25

---

## Uebersicht

Phase 7 implementiert den Export/Import-Roundtrip zwischen JANUS7 und externen LLMs.
Der Kampagnenzustand wird als strukturiertes JSON-Bundle exportiert, ausserhalb von Foundry verarbeitet
und als Patch-Response wieder ueber Preview/Apply zurueckgefuehrt.

**API-Einstiegspunkte:**

```js
game.janus7.ki        // kanonischer Namespace
game.janus7.ai        // Legacy-Alias -> delegiert an .ki
```

---

## Workflow

```text
GM: exportBundle(opts)
        -> JANUS_EXPORT_V2
        -> LLM-Verarbeitung
        -> JANUS_KI_RESPONSE_V1
        -> preflightImport -> previewImport -> applyImport
        -> transaktionales State-Update (mit Backup davor)
```

---

## Export

```js
const bundle = game.janus7.ki.exportBundle({ mode: 'lite' });
```

### Export-Modi

| Modus | Inhalt | Wann verwenden |
|-------|--------|----------------|
| `lite` | `campaign_state` + Meta | kurze Briefings |
| `week` | + `academy` | Wochenplanung, Slot-/Lehrkontext |
| `full` | + `references`, `knowledge_links`, `art` | tiefere Analyse und Langzeitplanung |

### Outbox / Download

```js
await game.janus7.ki.exportToOutbox({ mode: 'week' });
await game.janus7.ki.exportToOutbox({ mode: 'week', storage: 'world' });
```

Standard ist Browser-Download via `saveDataToFile`. Mit `storage: 'world'` wird in `worlds/<worldId>/janus7/io/outbox/` geschrieben.

### Export-Struktur (Kurzfassung)

```json
{
  "version": "JANUS_EXPORT_V2",
  "meta": {
    "version": "0.9.12.44",
    "schemaVersion": "2",
    "exportedAt": "2026-03-25T14:00:00Z",
    "world": "punin-akademie",
    "moduleVersion": "0.9.12.44",
    "stateVersion": "...",
    "exportMode": "week"
  },
  "campaign_state": {},
  "academy": {},
  "references": null,
  "knowledge_links": null,
  "art": null
}
```

---

## LLM-Verarbeitung

```js
const prompt = game.janus7.ki.prompts.chatgpt({ instructions: 'Plane die naechste Semesterwoche.' });
const bundle = game.janus7.ki.exportBundle({ mode: 'week' });
```

Verfuegbar sind `prompts.chatgpt()`, `prompts.claude()` und `prompts.gemini()`.
Die Templates instruieren das LLM, ausschliesslich `JANUS_KI_RESPONSE_V1`-konformes JSON zurueckzugeben.

**Wichtig:** IDs in Patch-Operationen muessen unveraendert aus dem Export uebernommen werden.

---

## Import

### Preflight

```js
const result = await game.janus7.ki.preflightImport(responseJson, { mode: 'strict' });
```

Prueft Version, Schema und semantische Regeln, ohne einen Diff oder State-Write auszufuehren.

### Preview

```js
const preview = await game.janus7.ki.previewImport(responseJson, { mode: 'strict' });
```

Liefert Change-Objekte fuer Review und selektive Uebernahme.

### Apply

```js
await game.janus7.ki.applyImport(responseJson);
await game.janus7.ki.applyImport(responseJson, { selectedIds: ['calendarUpdates::0::time.week'] });
```

`applyImport()` ist **GM-only** und erzeugt vor dem Schreiben automatisch ein Backup.

### Inbox-Import

```js
await game.janus7.ki.importFromInbox('ki_response.json', { mode: 'strict' });
```

`importFromInbox()` arbeitet auf World-Storage. Wenn eine Dateiliste verfuegbar ist, wird die Inbox vor dem Fetch vorgeprueft.

### Modi

| Modus | Verhalten |
|-------|-----------|
| `strict` | unbekannte Felder -> Fehler |
| `lenient` | unbekannte Felder -> ignoriert |

---

## KI Roundtrip App (UI)

Oeffnen ueber:
- Shell / Tool-Links
- Command Center
- Konsole: `game.janus7.ui.open('kiRoundtrip')`

Workflow in der UI:
1. Export-Modus waehlen -> **Exportieren**
2. Bundle ans LLM geben, Response zurueck in die Textarea
3. **Preview** -> Diff-Liste mit Checkboxen
4. **Apply Selected** oder **Apply All**

Wenn die Textarea seit dem letzten Preview veraendert wurde, blockiert Apply und verlangt einen neuen Preview-Durchlauf.

---

## Backup & Recovery

Backups liegen unter `worlds/<worldId>/janus7/io/backups/`.
Rotation: letzte **5** Backups.

```js
const backups = await game.janus7.ki.listBackups();
console.table(backups);
await game.janus7.ki.restoreBackup(backups[0].fileRef, { validate: false });
```

`restoreBackup()` ist **GM-only** und ersetzt den gesamten `campaign_state`.

---

## Import-History

```js
const history = game.janus7.ki.getImportHistory();
```

Rueckgabe: Array mit Eintraegen wie `{ timestamp, applied, summary, backup, error }`.

---

## Hooks

| Hook | Zeitpunkt | Payload |
|------|-----------|---------|
| `janus7.ki.exported` (Legacy-Alias: `janus7KiExported`) | nach erfolgreichem Export | `{ mode, meta, bundleVersion }` |
| `janus7.ki.import.applied` (Legacy-Alias: `janus7KiImportApplied`) | nach erfolgreichem Apply | `{ timestamp, summary, backupFile, backupPath }` |

Preview und Preflight liefern ihre Ergebnisse aktuell ueber Rueckgabewerte der API; dafuer wird kein eigener kanonischer Hook emittiert.

---

## Sicherheitshinweise

- Alle Imports werden vor Preview/Apply gegen das JSON-Schema validiert.
- Patch-Pfade werden auf unsichere Segmente geprueft.
- Erlaubte Operationen bleiben auf den Importvertrag begrenzt.
- Jeder Apply-Lauf ist transaktional.
- Das LLM hat keinen direkten Foundry-Zugriff; Aenderungen laufen durch Preflight, Diff/Import-Service und transaktionale State-Schreibpfade.

---

## Verwandte Dokumente

- `docs/EXPORT_FORMAT_V2.md`
- `docs/KI_PROMPT_TEMPLATE.md`
- `docs/KI_HANDOVER.md`
- `docs/KI_STABILITY.md`
