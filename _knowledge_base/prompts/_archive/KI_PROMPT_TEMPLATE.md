# JANUS7 KI Roundtrip — Prompt Template

---

## SYSTEM PROMPT (einmalig, vor dem ersten Export)

```
Du bist ein Spielleiter-Assistent für eine DSA5-Magierakademie-Kampagne.
Du arbeitest mit dem JANUS7-Modul für Foundry VTT zusammen und bekommst
strukturierte Kampagnendaten (JANUS_EXPORT_V2). Deine Aufgabe ist es,
auf Basis dieser Daten narrative und mechanische Vorschläge zu machen
und diese als importierbares JSON-Patch zurückzugeben.

Wichtige Regeln:
1. Du darfst KEINE IDs erfinden. Verwende ausschließlich IDs aus den
   bereitgestellten Daten (academy.npcs[].id, academy.lessons[].id,
   academy.locations[].id, foundryLinks.npcs Keys).
2. Deine Antwort ist IMMER ein JSON-Objekt im Format JANUS_KI_RESPONSE_V1.
2a. In changes.*[].path verwendest du IMMER relative Pfade (ohne academy.* Prefix).
   Kein Markdown, keine Erklärungen davor oder danach — nur das JSON.
3. Wenn du Erklärungen geben möchtest, schreibe sie in das "notes"-Feld
   des JSON-Objekts.
4. Sei sparsam mit Änderungen. Lieber wenige, präzise Patches als viele
   unsichere Anpassungen.
```

---

## USER PROMPT — Abenteuer-Elemente generieren

Ersetze `[DEIN_EXPORT_JSON]` mit dem kopierten Inhalt aus dem KI Roundtrip Fenster (Modus: **full**).

```
Hier ist der aktuelle Kampagnenstand meiner DSA5-Magierakademie:

[DEIN_EXPORT_JSON]

---

Meine Anfrage:
Erstelle auf Basis des aktuellen Standes (Zeitpunkt: Praiosstag, Mittagessen,
Trimester 1, Woche 1) konkrete Abenteuerelemente für die nächste Spielsitzung.

Ich möchte folgendes:
1. Ein kurzes Akademie-Ereignis (Event) das in den nächsten Tagen stattfindet
   und mindestens einen NPC aus academy.npcs involviert.
2. Einen Eintrag im Akademie-Tagebuch (journalEntries) der das Ereignis
   für die Charaktere sichtbar macht (ca. 2-3 Sätze, DSA5-Tonalität).
3. Eine soziale Konsequenz: Anpassung eines Beziehungswerts zwischen
   einem NPC und dem Schüler [[STUDENT_ID]] (+/- Wert mit Begründung).

Gib ausschließlich ein valides JANUS_KI_RESPONSE_V1 JSON zurück.
```

---

## ERWARTETES ANTWORT-FORMAT

Das JSON das die KI zurückgeben soll — zum Einfügen in das Import-Textarea:

```json
{
  "version": "JANUS_KI_RESPONSE_V1",
  "sourceExportMeta": {
    "version": "0.9.9.20",
    "exportedAt": "2026-03-05T19:14:00.907Z"
  },
  "changes": {
    "calendarUpdates": [
      {
        "path": "ereignis_praiosstag_w1",
        "op": "replace",
        "value": {
          "id": "EVT_BIBLIOTHEK_UNFALL",
          "title": "Vorfall in der Bibliothek",
          "day": "Praiosstag",
          "npcInvolved": "NPC_QUETZEL_HALMSTAEDT"
        }
      }
    ],
    "socialAdjustments": [
      {
        "path": "relationships.NPC_SIRDON_KOSMAAR.[[STUDENT_ID]].value",
        "op": "replace",
        "value": 42
      }
    ],
    "journalEntries": [
      {
        "text": "Während des Mittagessens war im Westflügel ein dumpfer Aufprall zu hören...",
        "timestamp": "1039-T1-W1-D0",
        "author": "Akademie-Chronik"
      }
    ]
  },
  "notes": "Sirdon Kosmaars Wohlwollen steigt leicht da der Schüler heute aufmerksam war. Der Bibliotheksvorfall gibt Anlass für eine Folge-Interaktion mit Quetzel Halmstädt."
}
```

---

## ERLAUBTE CHANGE-DOMAINS

| Domain | State-Pfad | Verwendung |
|---|---|---|
| `calendarUpdates` | `academy.calendar.*` | Events, Marker, Zeiteinträge |
| `scoringAdjustments` | `academy.scoring.*` | Punkte, Wertungen |
| `socialAdjustments` | `academy.social.relationships.*` | NPC↔Schüler Beziehungswerte |
| `journalEntries` | `academy.journalEntries[]` | Narrative Einträge (append) |
| `lessonUpdates` | `academy.lessons.*` | Unterrichtsergebnisse |
| `eventUpdates` | `academy.events.*` | Event-Status |

---

## VALIDIERUNG VOR DEM IMPORT

Pflicht-Check bevor du auf "Apply Import" klickst:

1. `version` ist exakt `"JANUS_KI_RESPONSE_V1"` ✓
2. `sourceExportMeta` enthält mindestens `version` und `exportedAt` ✓
3. Alle IDs in `value`-Objekten kommen aus dem Export ✓
4. Keine Keys außerhalb der 6 erlaubten Domains in `changes` ✓
5. Jedes Patch-Objekt hat `path` und `op` ✓

Zuerst **"Preview Diff"** klicken — erst wenn die Änderungen sinnvoll aussehen **"Apply Import"**.

---

## VARIANTEN — Anfragen-Beispiele

**Soziale Dynamik:**
> Analysiere die sozialen Beziehungen und schlage vor, welche NPC-Schüler-Beziehung
> sich diese Woche verändert haben könnte. Begründe es narrativ.

**Scoring:**
> Vergib Punkte für Zirkel "kirsche" (+3) wegen einer guten Prüfungsleistung
> und erstelle einen Tagebucheintrag dazu.

**Atmosphäre-Ereignis:**
> Erstelle ein ungewöhnliches Akademie-Ereignis das zu Trimester 1, Woche 2 passt
> und mindestens zwei Locations aus academy.locations involviert.

**NPC-Interaktion:**
> Irian Damartian (NPC_IRIAN_DAMARTIAN) hat etwas Verdächtiges in der
> Verbotenen Sektion getan. Erstelle den Eintrag und passe seine soziale
> Beziehung zu einem Lehrer entsprechend an.
