# JANUS7 KI-Integration Guide

**Modul-Version:** 0.9.12.29  
**Phase:** 7 – KI-Roundtrip  
**Datum:** 2026-03-20

---

## Übersicht

Phase 7 implementiert den vollständigen Export/Import-Roundtrip zwischen JANUS7 und externen
LLMs (Claude, ChatGPT, Gemini). Der Kampagnenzustand wird als strukturiertes JSON-Bundle
exportiert, durch ein LLM verarbeitet und als Patch-Response zurückgespielt.

**API-Einstiegspunkt:**

```js
game.janus7.ki        // Phase-7-Namespace (SSOT)
game.janus7.ai        // Legacy-Alias → delegiert an .ki
```

---

## Workflow

```
GM: exportBundle(opts)
        ↓
  JANUS_EXPORT_V2 (JSON)
        ↓
  LLM-Verarbeitung (Claude / ChatGPT / Gemini)
        ↓
  JANUS_KI_RESPONSE_V1 (JSON-Patch)
        ↓
GM: preflightImport → previewImport → applyImport
        ↓
  State-Update (transaktional, Backup davor)
```

---

## 1. Export

### Methode

```js
const bundle = game.janus7.ki.exportBundle({ mode: 'lite' });
```

### Export-Modi

| Modus | Inhalt | Wann verwenden |
|-------|--------|----------------|
| `lite` | `campaign_state` + Zeitstempel-Meta | Schnelle Session-Briefings |
| `week` | + `academy` (Kalender, Lektionen, Events) | Wochenplanung, NPC-Verhalten |
| `full` | + `references` + `knowledge_links` + `art` | Tiefe Analyse, Langzeitplanung |

### In die Outbox schreiben

```js
await game.janus7.ki.exportToOutbox({ mode: 'week' });
// Schreibt in: worlds/<worldId>/janus7/io/outbox/
```

### Struktur des Exports (JANUS_EXPORT_V2)

```json
{
  "version": "JANUS_EXPORT_V2",
  "meta": {
    "version": "0.9.12.29",
    "schemaVersion": "2",
    "exportedAt": "2026-03-20T14:00:00Z",
    "world": "punin-akademie",
    "moduleVersion": "0.9.12.29",
    "stateVersion": "...",
    "exportMode": "week"
  },
  "campaign_state": { "time": {}, "meta": {}, "academy": {} },
  "academy":        { "calendar": {}, "lessons": {}, "events": {} },
  "references":     null,
  "knowledge_links": null,
  "art":            null
}
```

---

## 2. LLM-Verarbeitung

### Prompt-Templates laden

```js
const prompt = game.janus7.ki.prompts.claude({ instructions: 'Plane die nächste Semesterwoche.' });
const bundle  = game.janus7.ki.exportBundle({ mode: 'week' });

// → prompt + JSON.stringify(bundle) an das LLM übergeben
```

Verfügbare Templates: `prompts.claude()`, `prompts.chatgpt()`, `prompts.gemini()`

Die Templates sind in `phase7/ki/prompts.js` definiert. Sie instruieren das LLM,
ausschließlich `JANUS_KI_RESPONSE_V1`-konformes JSON zurückzugeben.

### Erwartetes LLM-Output-Format

Siehe [EXPORT_FORMAT_V2.md](./EXPORT_FORMAT_V2.md) für das vollständige Schema.
Kurzfassung:

```json
{
  "version": "JANUS_KI_RESPONSE_V1",
  "sourceExportMeta": { /* meta aus dem Export */ },
  "changes": {
    "calendarUpdates":   [],
    "lessonUpdates":     [],
    "eventUpdates":      [],
    "scoringAdjustments": [],
    "socialAdjustments": [],
    "journalEntries":    []
  },
  "notes": "Begründung der Änderungen"
}
```

**Kritisch:** IDs in Patch-Operationen müssen **verbatim** aus dem Export übernommen werden.
Abweichende IDs erzeugen verwaiste State-Einträge.

---

## 3. Import

### Preflight (Validierung ohne Preview)

```js
const result = await game.janus7.ki.preflightImport(responseJson, { mode: 'strict' });
// { valid: true, summary: [...] } oder wirft JanusKiResponseInvalidError
```

### Preview (Diff-Vorschau)

```js
const preview = await game.janus7.ki.previewImport(responseJson, { mode: 'strict' });
// Array von Change-Objekten mit id, domain, op, path, value, status
```

### Apply (Schreiben in den State)

```js
// Alle Änderungen anwenden:
await game.janus7.ki.applyImport(responseJson);

// Nur ausgewählte IDs:
await game.janus7.ki.applyImport(responseJson, { selectedIds: ['calendarUpdates::0::time.week'] });
```

`applyImport` ist **GM-only**. Bei Ausführung durch Nicht-GM wird `JanusKiPermissionError` geworfen.

Vor jedem Apply wird automatisch ein State-Backup angelegt.

### Import-Modi

| Modus | Verhalten bei unbekannten Keys |
|-------|-------------------------------|
| `strict` | Unbekannte Felder → Fehler |
| `lenient` | Unbekannte Felder → ignoriert |

---

## 4. KI Roundtrip App (UI)

Öffnen über:
- Command Center → „KI Roundtrip"
- Console: `game.janus7.ui.open('kiRoundtrip')`

**Workflow in der UI:**

1. Export-Modus wählen → **Exportieren** → Bundle erscheint in der Textarea
2. Bundle an LLM geben, Response hineinkopieren
3. **Preview** → Diff-Liste mit Checkboxen
4. Änderungen selektiv oder gesamt übernehmen → **Apply Selected / Apply All**

Wenn die Textarea seit dem letzten Preview verändert wurde, blockiert Apply und fordert
einen neuen Preview-Durchlauf.

---

## 5. Backup & Recovery

Backups liegen unter: `worlds/<worldId>/janus7/io/backups/`  
Rotation: die letzten **5** Backups werden behalten.

```js
// Backups auflisten
const backups = await game.janus7.ki.listBackups();
console.table(backups);

// Backup wiederherstellen
await game.janus7.ki.restoreBackup(backups[0].fileRef, { validate: false });
```

`restoreBackup` ist **GM-only** und ersetzt den gesamten `campaign_state`.

---

## 6. Import-History

```js
const history = game.janus7.ki.getImportHistory();
// Array: [{ timestamp, applied, summary, backup, error }]
```

---

## 7. Hooks

| Hook | Zeitpunkt | Payload |
|------|-----------|---------|
| `janus7KiExportCreated` | Nach erfolgreichem Export | `{ bundle, mode }` |
| `janus7KiImportPreviewed` | Nach Preview-Durchlauf | `{ summary }` |
| `janus7KiImportApplied` | Nach erfolgreichem Apply | `{ summary, backup }` |
| `janus7KiImportFailed` | Bei Fehler in Apply | `{ error }` |

---

## 8. Fehlertypen

| Klasse | Wann |
|--------|------|
| `JanusKiBundleInvalidError` | Export-Bundle entspricht nicht JANUS_EXPORT_V2 |
| `JanusKiResponseInvalidError` | Response entspricht nicht JANUS_KI_RESPONSE_V1 |
| `JanusKiDiffConflictError` | Apply ohne vorigen Preview versucht |
| `JanusKiPermissionError` | Nicht-GM versucht Apply/Restore |

---

## 9. Sicherheitshinweise

- Alle Imports werden vor dem Apply gegen das JSON-Schema validiert.
- Pfade in Patch-Operationen werden auf relative Pfade ohne `..` geprüft.
- Erlaubte Operationen: `replace`, `append`, `delete`.
- Jeder Apply-Lauf ist transaktional (Rollback bei Fehler).
- Das LLM hat keinen direkten Foundry-Zugriff – alle Änderungen laufen durch den Director.

---

## Verwandte Dokumente

- [EXPORT_FORMAT_V2.md](./EXPORT_FORMAT_V2.md) – Schema-Referenz für Export und Response
- [KI_PROMPT_TEMPLATE.md](./KI_PROMPT_TEMPLATE.md) – Copy-Paste-Vorlagen für LLM-Sitzungen
- [KI_HANDOVER.md](./KI_HANDOVER.md) – Briefing für KI-Assistenten (Architektur-Überblick)
