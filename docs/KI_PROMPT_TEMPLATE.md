# JANUS7 KI-Prompt-Vorlagen

**Modul-Version:** 0.9.12.46
**Datum:** 2026-03-30

Copy-Paste-Vorlagen fuer KI-Roundtrip-Sitzungen. Exportiere zuerst das Bundle, ersetze dann `<BUNDLE_HIER_EINFUEGEN>` und `<AUFGABE>` in der passenden Vorlage.

---

## Export vorbereiten (Foundry-Console)

```js
// Bundle in Zwischenablage laden (Lite / Week / Full)
const bundle = game.janus7.ki.exportBundle({ mode: 'week' });
console.log(JSON.stringify(bundle));

// Alternativ: direkt in Outbox schreiben
await game.janus7.ki.exportToOutbox({ mode: 'week' });
```

---

## Vorlage: Claude

```
Als KI-Orchestrator fuer die JANUS7-Kampagne analysierst du den gegebenen exportBundle und schlaegst Aenderungen als strukturiertes JSON vor.

Aufgabe: <AUFGABE>

Regeln:
- Antworte ausschliesslich mit einem validen JSON-Objekt im Format JANUS_KI_RESPONSE_V1.
- Kein Markdown, kein Prosatext, keine Codebloecke - nur das JSON-Objekt.
- Kopiere das meta-Feld des Bundles unveraendert in sourceExportMeta.
- Verwende IDs exakt so, wie sie im Bundle stehen. Keine eigenen IDs erfinden.
- Erlaubte ops: replace, append, delete.
- Lasse Arrays leer, wenn du keine Aenderungen fuer diese Domaene hast.
- Werte in scoringAdjustments muessen plain numbers sein, keine Objekte wie {score: 15}.

Format:
{
  "version": "JANUS_KI_RESPONSE_V1",
  "sourceExportMeta": { /* aus bundle.meta kopieren */ },
  "changes": {
    "calendarUpdates": [],
    "lessonUpdates": [],
    "eventUpdates": [],
    "scoringAdjustments": [],
    "socialAdjustments": [],
    "journalEntries": [],
    "questUpdates": []
  },
  "notes": "Kurze Begruendung"
}

exportBundle:
<BUNDLE_HIER_EINFUEGEN>
```

---

## Vorlage: ChatGPT

```
You are an AI assistant for the JANUS7 tabletop campaign. You will receive an exportBundle containing the current campaign state.

Task: <AUFGABE>

Rules:
- Respond only with a JSON object conforming exactly to JANUS_KI_RESPONSE_V1.
- No markdown, no prose, no code fences - pure JSON only.
- Populate sourceExportMeta with the meta section from the exportBundle verbatim.
- Use IDs exactly as they appear in the exportBundle. Never invent new IDs.
- For quests, provide questId, actorId and the new nodeId string in questUpdates.
- Allowed ops: replace, append, delete.
- Leave arrays empty if you propose no changes for that domain.
- scoringAdjustments values must be plain numbers, never objects.

exportBundle:
<BUNDLE_HIER_EINFUEGEN>
```

---

## Vorlage: Gemini

```
Given the following exportBundle, produce a JANUS_KI_RESPONSE_V1 JSON response.

Task: <AUFGABE>

Constraints:
- Output must be valid JSON and nothing else. No markdown, no explanations outside the notes field.
- Use exportBundle.meta verbatim for sourceExportMeta.
- IDs must be copied exactly from the bundle. Do not fabricate IDs.
- Allowed ops: replace, append, delete.
- Omit empty arrays or leave them as [].
- scoringAdjustments values must be plain numbers.

exportBundle:
<BUNDLE_HIER_EINFUEGEN>
```

---

## Typische Aufgaben (Platzhalter-Beispiele)

| Szenario | `<AUFGABE>` |
|----------|-------------|
| Wochenplanung | `Plane Semesterwoche 13 inhaltlich aus. Weise Lektionen zu, passe den Kalender an.` |
| NPC-Verhalten | `Entwickle das Sozialverhalten von npc_braxan basierend auf den letzten Scoring-Aenderungen.` |
| Event einfuegen | `Fuege eine unangekuendigte Pruefung in Woche 14 fuer Kreis A ein.` |
| Journal | `Schreibe einen Abschlussbericht fuer Trimester 1 als Journaleintrag.` |
| Scoring | `Berechne Scoring-Anpassungen fuer alle Kreise nach dem Pruefungsergebnis in week 12.` |

---

## Response importieren (Foundry-Console)

```js
// Response als String einfuegen:
const response = JSON.parse(`<RESPONSE_HIER>`);

// Validieren (kein Apply)
const preflight = await game.janus7.ki.preflightImport(response, { mode: 'strict' });
console.log(preflight);

// Vorschau (Diff-Liste)
const preview = await game.janus7.ki.previewImport(response, { mode: 'strict' });
console.table(preview);

// Alle Aenderungen anwenden
await game.janus7.ki.applyImport(response);

// Nur ausgewaehlte IDs anwenden
await game.janus7.ki.applyImport(response, {
  selectedIds: ['lessonUpdates::0::lesson_alchemy_01.status']
});
```

Bevorzugte UI fuer den Workflow: `game.janus7.ui.open('kiRoundtrip')`.

---

## Fehlerbehandlung

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `JanusKiResponseInvalidError` | Schema-Verletzung in der Response | LLM erneut mit korrigierter Anweisung beauftragen |
| `JanusKiPermissionError` | Apply durch Nicht-GM | Als GM einloggen |
| `JanusKiDiffConflictError` | Apply ohne aktuellen Preview | `previewImport` erneut ausfuehren |
| Verwaiste State-Eintraege | LLM hat IDs erfunden | Export erneut pruefen, IDs korrigieren, Import wiederholen |

---

## Verwandte Dokumente

- [KI_INTEGRATION_GUIDE.md](./KI_INTEGRATION_GUIDE.md) - Vollstaendiger Workflow
- [EXPORT_FORMAT_V2.md](./EXPORT_FORMAT_V2.md) - Schema-Referenz
- [KI_HANDOVER.md](./KI_HANDOVER.md) - Architektur-Briefing fuer KI-Assistenten

