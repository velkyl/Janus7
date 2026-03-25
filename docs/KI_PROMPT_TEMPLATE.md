# JANUS7 KI-Prompt-Vorlagen

**Modul-Version:** 0.9.12.29  
**Datum:** 2026-03-20

Copy-Paste-Vorlagen für KI-Roundtrip-Sitzungen. Exportiere zuerst das Bundle,
ersetze dann `<BUNDLE_HIER_EINFÜGEN>` und `<AUFGABE>` in der passenden Vorlage.

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
Als KI-Orchestrator für die JANUS7-Kampagne analysierst du den gegebenen exportBundle
und schlägst Änderungen als strukturiertes JSON vor.

Aufgabe: <AUFGABE>

Regeln:
- Antworte ausschließlich mit einem validen JSON-Objekt im Format JANUS_KI_RESPONSE_V1.
- Kein Markdown, kein Prosatext, keine Codeblöcke – nur das JSON-Objekt.
- Kopiere das meta-Feld des Bundles unverändert in sourceExportMeta.
- Verwende IDs exakt so, wie sie im Bundle stehen. Keine eigenen IDs erfinden.
- Erlaubte ops: replace, append, delete.
- Lasse Arrays leer, wenn du keine Änderungen für diese Domäne hast.

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
    "journalEntries": []
  },
  "notes": "Kurze Begründung"
}

exportBundle:
<BUNDLE_HIER_EINFÜGEN>
```

---

## Vorlage: ChatGPT

```
You are an AI assistant for the JANUS7 tabletop campaign. You will receive an exportBundle
containing the current campaign state.

Task: <AUFGABE>

Rules:
- Respond only with a JSON object conforming exactly to JANUS_KI_RESPONSE_V1.
- No markdown, no prose, no code fences – pure JSON only.
- Populate sourceExportMeta with the meta section from the exportBundle verbatim.
- Use IDs exactly as they appear in the exportBundle. Never invent new IDs.
- Allowed ops: replace, append, delete.
- Leave arrays empty if you propose no changes for that domain.

exportBundle:
<BUNDLE_HIER_EINFÜGEN>
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

exportBundle:
<BUNDLE_HIER_EINFÜGEN>
```

---

## Typische Aufgaben (Platzhalter-Beispiele)

| Szenario | `<AUFGABE>` |
|----------|-------------|
| Wochenplanung | `Plane Semesterwoche 13 inhaltlich aus. Weise Lektionen zu, passe den Kalender an.` |
| NPC-Verhalten | `Entwickle das Sozialverhalten von npc_braxan basierend auf den letzten Scoring-Änderungen.` |
| Event einfügen | `Füge eine unangekündigte Prüfung in Woche 14 für Kreis A ein.` |
| Journal | `Schreibe einen Abschlussbericht für Trimester 1 als Journaleintrag.` |
| Scoring | `Berechne Scoring-Anpassungen für alle Kreise nach dem Prüfungsergebnis in week 12.` |

---

## Response importieren (Foundry-Console)

```js
// Response als String einfügen:
const response = JSON.parse(`<RESPONSE_HIER>`);

// Validieren (kein Apply)
const preflight = await game.janus7.ki.preflightImport(response);
console.log(preflight);

// Vorschau (Diff-Liste)
const preview = await game.janus7.ki.previewImport(response);
console.table(preview);

// Alle Änderungen anwenden
await game.janus7.ki.applyImport(response);

// Nur ausgewählte IDs anwenden
await game.janus7.ki.applyImport(response, {
  selectedIds: ['lessonUpdates::0::lesson_alchemy_01.status']
});
```

Alternativ: KI-Roundtrip-UI im Command Center öffnen.

---

## Fehlerbehandlung

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `JanusKiResponseInvalidError` | Schema-Verletzung in der Response | LLM erneut mit korrigierter Anweisung beauftragen |
| `JanusKiPermissionError` | Apply durch Nicht-GM | Als GM einloggen |
| `JanusKiDiffConflictError` | Apply ohne aktuellen Preview | `previewImport` erneut ausführen |
| Verwaiste State-Einträge | LLM hat IDs erfunden | Export erneut prüfen, IDs korrigieren, Import wiederholen |

---

## Verwandte Dokumente

- [KI_INTEGRATION_GUIDE.md](./KI_INTEGRATION_GUIDE.md) – Vollständiger Workflow
- [EXPORT_FORMAT_V2.md](./EXPORT_FORMAT_V2.md) – Schema-Referenz
- [KI_HANDOVER.md](./KI_HANDOVER.md) – Architektur-Briefing für KI-Assistenten
