# JANUS7 Export-Format V2

**Schema-Version:** 2  
**Modul-Version:** 0.9.12.46
**Datum:** 2026-03-25

---

## Ãœberblick

Phase 7 verwendet zwei Formate fÃ¼r den KI-Roundtrip:

| Format | Richtung | Identifier |
|--------|----------|------------|
| **JANUS_EXPORT_V2** | JANUS7 â†’ LLM | Export-Bundle |
| **JANUS_KI_RESPONSE_V1** | LLM â†’ JANUS7 | Patch-Response |

Schemata liegen unter `phase7/contract/`.

---

## JANUS_EXPORT_V2 â€“ Export-Bundle

### Pflichtfelder

```json
{
  "version": "JANUS_EXPORT_V2",
  "meta": {
    "version":       "string (Modul-Version)",
    "schemaVersion": "string",
    "exportedAt":    "ISO-8601-Timestamp | null",
    "world":         "string (Foundry-World-ID) | null",
    "moduleVersion": "string",
    "stateVersion":  "string | null",
    "exportMode":    "lite | week | full | null"
  },
  "campaign_state": {
    "time": { "year": 1039, "trimester": 1, "week": 1, "dayIndex": 0, "slotIndex": 0 },
    "meta": { "version": "...", "lastSaved": "..." }
  }
}
```

### Optionale Felder (je nach exportMode)

| Feld | Modus | Inhalt |
|------|-------|--------|
| `academy` | `week`, `full` | Kalender, Lektionen, Events, Scoring, Social |
| `references` | `full` | NPC-Index, Orte, Kompetenzen |
| `knowledge_links` | `full` | VerknÃ¼pfte Wissens-Graphen |
| `art` | `full` | Bild-/Asset-Referenzen |

### academy-Teilbaum (Beispiel)

```json
"academy": {
  "calendar": {
    "currentWeek": 12,
    "currentTrimester": 2,
    "schedule": { "monday": [...], "tuesday": [...] }
  },
  "lessons": {
    "lesson_alchemy_01": {
      "id": "lesson_alchemy_01",
      "title": "Grundlagen der Alchemie",
      "teacher": "npc_braxan",
      "circle": "kreis_a",
      "status": "active"
    }
  },
  "events": {
    "event_prÃ¼fung_01": { "id": "event_prÃ¼fung_01", "type": "exam", "week": 14 }
  },
  "scoring": { "kreis_a": 78, "kreis_b": 65 },
  "social": { "npc_braxan__player_mira": { "value": 2, "label": "respektvoll" } }
}
```

---

## JANUS_KI_RESPONSE_V1 â€“ Patch-Response

Das LLM gibt ausschlieÃŸlich dieses Format zurÃ¼ck. Keine Prosa, kein Markdown-Wrapper.

### Vollstruktur

```json
{
  "version": "JANUS_KI_RESPONSE_V1",
  "sourceExportMeta": { /* meta-Block des Exports 1:1 kopieren */ },
  "changes": {
    "calendarUpdates":    [],
    "lessonUpdates":      [],
    "eventUpdates":       [],
    "scoringAdjustments": [],
    "socialAdjustments":  [],
    "journalEntries":     []
  },
  "notes": "string | null"
}
```

### Patch-Objekt-Struktur

Alle Arrays in `changes` enthalten Patch-Objekte der Form:

```json
{
  "path": "dot.delimited.path",
  "op":   "replace | append | delete",
  "value": "<neuer Wert, bei delete weggelassen>"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `path` | string | âœ… | Relativer Pfad im DomÃ¤nenbaum (kein `..`, kein `/`) |
| `op` | `replace`\|`append`\|`delete` | âœ… | Patch-Operation |
| `value` | any | bei `replace`/`append` | Neuer Wert |

### Erlaubte Pfad-PrÃ¤fixe je DomÃ¤ne

| Change-Array | Pfad-Wurzel |
|---|---|
| `calendarUpdates` | `academy.calendar.*` |
| `lessonUpdates` | `academy.lessons.*` |
| `eventUpdates` | `academy.events.*` |
| `scoringAdjustments` | `academy.scoring.*` |
| `socialAdjustments` | `academy.social.*` |
| `journalEntries` | direkt als Objekt (kein path nÃ¶tig) |

### Beispiel â€“ eine Lektion updaten

```json
{
  "version": "JANUS_KI_RESPONSE_V1",
  "sourceExportMeta": { "exportedAt": "2026-03-25T14:00:00Z", "world": "punin-akademie", "moduleVersion": "0.9.12.46" },
  "changes": {
    "calendarUpdates": [],
    "lessonUpdates": [
      {
        "path": "lesson_alchemy_01.status",
        "op": "replace",
        "value": "completed"
      },
      {
        "path": "lesson_alchemy_01.notes",
        "op": "replace",
        "value": "SchÃ¼ler haben Destillationsgrundlagen gemeistert."
      }
    ],
    "eventUpdates": [],
    "scoringAdjustments": [
      {
        "path": "kreis_a",
        "op": "replace",
        "value": 82
      }
    ],
    "socialAdjustments": [],
    "journalEntries": [
      {
        "week": 12,
        "entry": "Kreis A schlieÃŸt Alchemie-Grundkurs ab. Braxan zufrieden."
      }
    ]
  },
  "notes": "Lektion abgeschlossen, Scoring angepasst, Journaleintrag hinzugefÃ¼gt."
}
```

---

## Validierungsregeln

Der Importer prÃ¼ft in dieser Reihenfolge:

1. **Schema-Check** â€“ Response entspricht `phase7/contract/JanusKiResponse.schema.json`
2. **Version-Check** â€“ `version === 'JANUS_KI_RESPONSE_V1'`
3. **Semantik-Check** â€“ Pfade relativ, keine `..`, erlaubte Ops
4. **Stale-Check** (optional) â€“ `sourceExportMeta.exportedAt` nicht Ã¤lter als konfigurierter Schwellwert
5. **Transaktionaler Apply** â€“ Schreiben in State; Rollback bei Fehler

---

## ID-KritikalitÃ¤t

**IDs mÃ¼ssen verbatim aus dem Export Ã¼bernommen werden.**

Das LLM darf keine IDs erfinden oder umbenennen. Falsche IDs erzeugen verwaiste
State-EintrÃ¤ge, die weder Fehler werfen noch sichtbar sind â€“ ein stiller Datenverlust.

Korrekt:
```json
{ "path": "lesson_alchemy_01.status", "op": "replace", "value": "completed" }
```

Falsch:
```json
{ "path": "alchemy_lesson_1.status", "op": "replace", "value": "completed" }
```

---

## Schema-Dateien

| Datei | Beschreibung |
|-------|-------------|
| `phase7/contract/JanusAiBundle.schema.json` | Export-Bundle (JANUS_EXPORT_V2) |
| `phase7/contract/JanusKiBundle.schema.json` | Export-Bundle (KI-Variante) |
| `phase7/contract/JanusKiResponse.schema.json` | Import-Response (JANUS_KI_RESPONSE_V1) |

---

## Verwandte Dokumente

- [KI_INTEGRATION_GUIDE.md](./KI_INTEGRATION_GUIDE.md) â€“ VollstÃ¤ndiger Workflow
- [KI_PROMPT_TEMPLATE.md](./KI_PROMPT_TEMPLATE.md) â€“ Copy-Paste fÃ¼r LLM-Sitzungen

