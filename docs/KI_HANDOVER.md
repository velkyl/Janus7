# JANUS7 KI-HANDOVER

**Modul-Version:** 0.9.12.44  
**Foundry:** v13+  
**Datum:** 2026-03-25

Zweck: Kurzbriefing fuer KI-Assistenz (Architektur, SSOT, Qualitaets-Gates). Kein Roman.

---

## 1) SSOT & Versionierung

- **Runtime/Build-Version:** `game.modules.get("Janus7").version` (SSOT: `module.json`)
- **State-Version:** `state.meta.version` (Version, unter der der State zuletzt gespeichert wurde)
- Dokumentation: Einstieg ueber `docs/INDEX.md`

---

## 2) Architekturvertrag (kurz)

- Foundry v13+, ESM, ApplicationV2.
- Phase-Isolation: Core/Engine ohne UI-Coupling.
- State-Mutationen ueber Director/Core-APIs statt ueber UI-Direktwrites.
- DSA5-spezifische Logik bleibt hinter `bridge/dsa5/`.

---

## 3) Tests / Qualitaets-Gates

- Testkatalog: `data/tests/test-catalog.json`
- Erwartung: Smoke/Quick laeuft ohne Fail vor weiteren Changes.
- Architektur-, API- oder Versions-Drift gilt mindestens als P1.

---

## 4) Aktueller Fokus

- Runtime-/Doku-Drift reduziert: Control Panel mutiert `academy.roster` und `academy.slotJournals` wieder ueber Director-APIs.
- Exam-MCQ-Lookups lesen die shipped `exam-questions.json` wieder ueber den realen Root `questionSets`.
- DSA5-Bridge und Command-Layer nutzen wieder konsistente Actor-/Skill-Parameter und Actor-Name-Lookups.

---

## 5) Prompt-Template

Siehe `docs/KI_PROMPT_TEMPLATE.md`.

---

## 6) KI-Roundtrip UI (Foundry)

App: **JANUS7 - KI Roundtrip**

Workflow:
1. Export (Lite/Week/Full) -> Textarea/Outbox.
2. KI liefert `JANUS_KI_RESPONSE_V1`.
3. In der App: **Preview** -> Diff-Liste.
4. Diffs selektiv uebernehmen: Checkboxen -> **Apply Selected** oder **Apply All**.

Wichtig:
- Apply ist **GM-only** (Preview darf jeder).
- Wenn die Textarea seit Preview geaendert wurde, wird ein neuer Preview-Durchlauf verlangt.

---

## 7) Backup / Recovery (manuell)

- Jeder `applyImport()`-Lauf erzeugt vor dem Schreiben ein Backup unter `worlds/<world>/janus7/io/backups/`.
- Rotation: die letzten **5** Backups bleiben erhalten.
- Manuelle Recovery ueber Konsole/Makro:

```js
const backups = await game.janus7.ki.listBackups();
console.log(backups);
await game.janus7.ki.restoreBackup(backups[0]?.fileRef, { validate: false });
```

Hinweis: Restore ist **GM-only** und ersetzt den kompletten `campaign_state`.
