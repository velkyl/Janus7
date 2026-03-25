# Phase 6 — UI Guide

**Status:** ✅ Abgeschlossen
**Version:** 0.9.12.29+
**Framework:** Foundry VTT ApplicationV2 (v13+)

---

## Architektur

```
ui/
├── index.js                ← JanusUI (Router/Registry)
├── app-manifest.js         ← App-Status-Metadaten
├── apps/                   ← Alle ApplicationV2-Apps
├── commands/               ← Chat-/Konsolen-Befehle
├── layer/                  ← Action-Router, Panel-Registry, View-Registry
├── core/
│   └── base-app.js         ← Basis-Klasse für alle Apps
└── permissions.js          ← GM-Gate-Utilities
```

---

## Einstiegspunkt: JANUS Shell

Die **JanusShellApp** ist der primäre UI-Einstiegspunkt für GMs. Sie enthält drei Views:

| View | Beschreibung |
|---|---|
| `director` | Tages-Steuerung, Event-Queue, Quest-Vorschläge |
| `academy` | Kalender-Übersicht, Scoring, Lektionen |
| `tools` | Debug, Tests, State Inspector |

```javascript
// Shell öffnen
game.janus7.ui.open('shell');
// oder:
game.janus7.ui.openShell();
```

---

## Alle Apps (JanusUI.apps)

| Key | Klasse | Reifegrad | Modus |
|---|---|---|---|
| `shell` | `JanusShellApp` | produktiv | view+navigation |
| `academyOverview` | `JanusAcademyOverviewApp` | produktiv | view |
| `scoringView` | `JanusScoringViewApp` | produktiv | edit |
| `kiRoundtrip` | `JanusKiRoundtripApp` | produktiv | admin/edit |
| `kiBackupManager` | `JanusKiBackupManagerApp` | produktiv | admin |
| `lessonLibrary` | `JanusLessonLibraryApp` | teilproduktiv | view/workflow |
| `socialView` | `JanusSocialViewApp` | teilproduktiv | edit |
| `atmosphereDJ` | `JanusAtmosphereDJApp` | teilproduktiv | edit |
| `academyDataStudio` | `JanusAcademyDataStudioApp` | teilproduktiv | edit/admin |
| `sessionPrepWizard` | `JanusSessionPrepWizardApp` | teilproduktiv | admin |
| `configPanel` | `JanusConfigPanelApp` | teilproduktiv | admin/edit |
| `syncPanel` | `JanusSyncPanelApp` | teilproduktiv | view/admin |
| `commandCenter` | `JanusCommandCenterApp` | intern/legacy | admin/debug |
| `testResults` | `JanusTestResultApp` | intern/debug | debug |
| `guidedManualTests` | `JanusGuidedManualTestApp` | intern/debug | debug |
| `stateInspector` | `JanusStateInspectorApp` | intern/debug | view-only |

---

## Apps öffnen

```javascript
// Standardweg: Key → open()
game.janus7.ui.open('scoringView');
game.janus7.ui.open('kiRoundtrip');
game.janus7.ui.open('atmosphereDJ');

// Via Director-Shortcuts
game.janus7.director.openControlPanel(); // → Shell
game.janus7.director.openSyncPanel();
game.janus7.director.openConfigPanel();
game.janus7.director.openAtmosphereDJ();

// Via Scene Controls (linke Seitenleiste)
// JANUS7-Icon → Öffnet Shell
```

---

## Befehlszeile (JANUS CLI)

Alle Befehle sind im Chat verfügbar (Prefix `/janus`):

```
/janus help                      Liste aller Befehle
/janus time                      Aktuelle Kalenderposition
/janus time.advance              Tag voranschreiten
/janus academy.status            Akademie-Zusammenfassung
/janus scoring.leaderboard       Zirkelpunkte-Rangliste
/janus quest.list                Aktive Quests
/janus ki.export                 State exportieren
/janus test.run                  Alle Tests ausführen
```

Verfügbare Befehlsgruppen (`ui/commands/`):

| Datei | Befehle |
|---|---|
| `academy.js` | calendar, lessons, scoring, social |
| `atmosphere.js` | enable, disable, mood |
| `ki.js` | export, preview, apply |
| `lesson.js` | show, context |
| `quest.js` | list, start, progress |
| `state.js` | get, set, reset |
| `system.js` | status, health, diagnostics |
| `time.js` | current, advance, reset |

---

## Neue App erstellen (Vorlage)

```javascript
// ui/apps/MeineApp.js
import { foundry } from '../../core/common.js';

export class MeineApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'janus7-meine-app',
    position: { width: 600, height: 400 },
    window: { title: 'Meine App', icon: 'fas fa-star' }
  };

  static PARTS = {
    main: { template: 'modules/Janus7/templates/apps/meine-app.hbs' }
  };

  async _prepareContext(opts = {}) {
    const state = game.janus7.core.state;
    return {
      currentSlot: game.janus7.director.time.getRef(),
      someData: state.get('academy.someKey')
    };
  }

  static showSingleton(opts = {}) {
    const existing = Object.values(ui.windows)
      .find(w => w instanceof MeineApp);
    if (existing) { existing.render({ force: true }); return existing; }
    return new MeineApp(opts);
  }
}
```

App in `ui/index.js` und `ui/app-manifest.js` registrieren.

---

## GM-Gate

Alle schreibenden UI-Aktionen sind hinter einem GM-Gate:

```javascript
// ui/permissions.js
import { assertGM } from '../ui/permissions.js';

async _onClickSave(event) {
  assertGM(); // Wirft Error wenn nicht GM
  await game.janus7.director.set('some.path', newValue);
}
```

**Regel:** Die UI darf `core.state` **niemals direkt** mutieren. Alle Mutations laufen über `game.janus7.director`.

---

## Handlebars-Templates

Templates liegen unter `templates/apps/`. Jede App hat eine `.hbs`-Datei.

```handlebars
{{! templates/apps/meine-app.hbs }}
<section class="janus7-app meine-app">
  <header>
    <h2>{{localize "JANUS7.MeineApp.Title"}}</h2>
  </header>
  <div class="content">
    {{#if someData}}
      <p>{{someData}}</p>
    {{else}}
      <p class="hint">{{localize "JANUS7.Common.NoData"}}</p>
    {{/if}}
  </div>
</section>
```

---

## Lokalisierung

Alle UI-Texte kommen aus `lang/de.json` / `lang/en.json`:

```json
{
  "JANUS7.MeineApp.Title": "Meine App"
}
```

```javascript
game.i18n.localize('JANUS7.MeineApp.Title');
// Im Template: {{localize "JANUS7.MeineApp.Title"}}
```

---

## Verwandte Dokumente

- [TECHNICAL_HANDBOOK.md](./TECHNICAL_HANDBOOK.md) — App-Typen und Datenflusss
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Phase-Isolation-Regeln
- [API_REFERENCE.md](./API_REFERENCE.md) — game.janus7 Public API
