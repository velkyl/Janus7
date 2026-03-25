# JANUS7 KI-HANDOVER

**Modul-Version:** 0.9.12.29  
**Foundry:** v13+  
**Datum:** 2026-03-08

Zweck: Kurzbriefing für KI-Assistenz (Architektur, SSOT, Qualitäts-Gates). Kein Roman.

---

## 1) SSOT & Versionierung

- **Runtime/Build-Version:** `game.modules.get("Janus7").version` (SSOT: `module.json`)
- **State-Version:** `state.meta.version` (unter welcher Version der State zuletzt gespeichert wurde)
- Dokumentation: Einstieg über `docs/INDEX.md` (Altstände liegen unter `docs/_archive/ (nur im Repo; im Release-ZIP nicht enthalten)`).

---

## 2) Architekturvertrag (kurz)

- Foundry v13+, ESM, ApplicationV2.
- Phase-Isolation: Core/Engine ohne UI-Coupling.
- Core-Hooks zentral (keine Wildwuchs-Registrierung).

---

## 3) Tests / Qualitäts-Gates

- Testkatalog: `data/tests/test-catalog.json`
- Erwartung: Smoke/Quick läuft ohne Fail vor weiteren Changes.
- Architektur-/Version-Drift gilt als P1 (mindestens).

---

## 4) Aktueller Fokus

- Doku konsolidiert (dieser Stand).  
- Scoring: Zirkel/Häuser anlegen per UI (DialogV2) gefixt in 0.9.9.21; danach reines Docs-Fixpack 0.9.9.43.

---

## 5) Prompt-Template

Siehe `docs/KI_PROMPT_TEMPLATE.md` (copy/paste für neue Chats).


---

## 6) KI-Roundtrip UI (Foundry)

App: **JANUS7 · KI Roundtrip**

Workflow:
1. Export (Lite/Week/Full) → Textarea/Outbox.
2. KI liefert **JANUS_KI_RESPONSE_V1**.
3. In der App: **Preview** → Diff-Liste.
4. Diffs selektiv übernehmen: Checkboxen → **Apply Selected** (oder **Apply All**).

Wichtig:
- Apply ist **GM-only** (Preview darf jeder).
- Wenn Textarea seit Preview geändert wurde: Apply Selected wird blockiert (neu previewen).


## 7) Backup / Recovery (manuell)

- Jeder `applyImport()`-Lauf erzeugt vor dem Schreiben ein Backup unter `worlds/<world>/janus7/io/backups/`.
- Rotation: letzte **5** Backups bleiben erhalten.
- Manuelle Recovery über Console/Makro:

```js
const backups = await game.janus7.capabilities.ki.listBackups();
console.log(backups);
await game.janus7.capabilities.ki.restoreBackup(backups[0]?.fileRef, { validate: false });
```

Hinweis: Restore ist **GM-only** und ersetzt den kompletten `campaign_state`.
