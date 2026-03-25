# JANUS7 ROADMAP – Konsolidiert & Aktualisiert

**Version:** 0.9.12.29  
**Status:** Phase 7 ✅ ABGESCHLOSSEN — Phase 8 ausstehend  
**Datum:** 2026-03-20

---

## ÜBERBLICK

JANUS7 ist ein **hybrides Betriebssystem** für DSA5-Magierakademie-Kampagnen in Foundry VTT.  
**Hybrid-First:** Optimiert für physischen Tisch mit Beamer als Second Screen.  
**Data-Driven:** JSON-basiert, Code/Content strikt getrennt.  
**KI-Ready:** Export/Import für LLM-Roundtrips (Phase 7).

---

## PHASEN-ÜBERSICHT

| Phase | Titel | Status | Umfang |
|-------|-------|--------|--------|
| **0** | Leitbild & Governance | ✅ DONE | Architektur-Prinzipien, NFRs |
| **1** | Core & Data Architecture | ✅ DONE | State, Config, Logger, IO, Validator |
| **2** | Static Academy Data | ✅ DONE | JSON-Daten (NPCs, Lessons, Calendar) |
| **3** | DSA5 System Bridge | ✅ DONE | Abstraktionsschicht zu dsa5-System |
| **4** | Academy Simulation | ✅ DONE | Kalender, Scoring, Lessons, Exams |
| **4b** | **Quest & Event System** | ✅ **DONE** | **Story-Quests, Events, Effects** |
| **5** | Hybrid & Atmosphere | ✅ DONE | Audio/Visual Controller |
| **6** | User Interfaces | ✅ DONE | ApplicationV2 UIs (10 Apps, 40+ Commands, 10 Tests) |
| **7** | KI-Integration | ✅ DONE | Export/Import, LLM-Roundtrips |
| **8** | Backlog | 📋 FUTURE | Multi-Setting, Deep-Automation |

---

## PHASE 0: LEITBILD & GOVERNANCE

**Status:** ✅ ABGESCHLOSSEN

### Ziele
- Projekt-Vision definieren (Magierakademie Punin als Referenz)
- Architektur-Prinzipien festlegen
- Versionierung & Deployment-Strategie
- Non-Functional Requirements (Performance, Security, Resilienz)

### Deliverables
- ✅ Architektur-Leitplanken (Hybrid-First, Data-Driven, SSOT, Modul-Agnostik, KI-Ready)
- ✅ SemVer-Strategie
- ✅ Foundry-Upgrade-Strategie (Test-World, vorsichtige max-Versionen)
- ✅ Deployment-Prozess (DEV → TEST → PROD mit Backups)
- ✅ Rechtlicher Rahmen (private Nutzung, keine DSA-IP-Weitergabe)

### Dokumentation
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/ADR_ATMOSPHERE.md`

---

## PHASE 1: CORE & DATA ARCHITECTURE

**Status:** ✅ ABGESCHLOSSEN  
**Version:** 0.1.0

### Ziele
Technisches Fundament für alle höheren Phasen.

### Komponenten
- **JanusStateCore:** Zentraler State Manager (Snapshots, Transactions, Rollback)
- **JanusConfig:** World-spezifische Konfiguration (IDs, Mappings, Feature-Flags)
- **JanusLogger:** Strukturiertes Logging (debug/info/warn/error)
- **JanusDirector:** Foundry-Orchestrierung (Scenes, Journals, Playlists)
- **JanusIO:** File-basierte Ein/Ausgabe (Outbox/Inbox)
- **JanusValidator:** State- & Import-Validierung (JSON Schema)

### API
```javascript
game.janus7.core.state   // JanusStateCore
game.janus7.core.config  // JanusConfig
game.janus7.core.logger  // JanusLogger
game.janus7.core.director // JanusDirector
game.janus7.core.io      // JanusIO
game.janus7.core.validator // JanusValidator
```

### Dokumentation
- `docs/DATA_MODEL.md`
- `docs/DEVELOPMENT.md`
- `JANUS7_Phase1_Starter_Kit.docx`

---

## PHASE 2: STATIC ACADEMY DATA

**Status:** ✅ ABGESCHLOSSEN  
**Version:** 0.2.0

### Ziele
Strukturelle Definition der Spielwelt als reine Daten (getrennt von Code).

### Daten-Dateien (data/academy/)
- **calendar.json** (32 KB) - Akademie-Jahreskalender
- **lessons.json** (17 KB) - Unterrichtseinheiten
- **exams.json** (1 KB) - Prüfungen
- **npcs.json** (47 KB) - 19 NPCs (Lehrkräfte, Schüler, Personal)
- **subjects.json** (3 KB) - 6 Fächer (Magietheorie, Arithmetik, Kraftakt, etc.)
- **circles.json** (3.5 KB) - Häuser/Zirkel
- **locations.json** (71 KB) - Akademie-Orte
- **library.json** (20 KB) - Bibliothek
- **spell-curriculum.json** (88 KB) - Zauberlehrplan
- **alchemy-recipes.json** (37 KB) - 11 Alchemie-Rezepte
- **teaching-sessions.json** (22 KB) - 19 Stundenpläne

**Gesamt:** ~450 KB JSON-Daten

### API
```javascript
game.janus7.academy.data.getNPC('NPC_SIRDON_KOSMAAR')
game.janus7.academy.data.getLesson('LES_MAG_BASICS_01')
game.janus7.academy.data.getLocation('LOC_LIBRARY')
```

### Dokumentation
- `docs/DATA_HYGIENE.md`
- `docs/ACADEMY_DATA_GUIDE.md`

---

## PHASE 3: DSA5 SYSTEM BRIDGE

**Status:** ✅ ABGESCHLOSSEN (PRODUCTION-READY)  
**Version:** 0.3.9  
**Test-Status:** 12/12 PASS (100%)

### Ziele
Abstraktionsschicht zum DSA5-System. Kapselt Proben, Actor-Zugriffe, Item-Management.

### Komponenten
- **DSA5SystemBridge:** Facade Pattern (zentrale API)
- **DSA5Resolver:** Entity Resolution (Actor/Item/Spell)
- **DSA5RollApi:** Proben (Skill/Attribute/Spell Checks)
- **DSA5ActorBridge:** Actor Wrapper
- **DSA5ItemBridge:** Item Management
- **DSA5PacksIndex:** Compendium Access

### API
```javascript
// Roll API
const result = await game.janus7.dsa5.rollSkill(actor, 'Magiekunde', { modifier: -1 });

// Actor Resolution
const actor = await game.janus7.dsa5.resolveActor('NPC_KOSMAAR');

// Item Management
await game.janus7.dsa5.ensureSpellOnActor(actor, 'Attributo');
```

### Test-Coverage
- ✅ P3-TC-01: Pack Resolution
- ✅ P3-TC-02: Roll Simulation
- ✅ P3-TC-03: Actor Resolution
- ✅ P3-TC-12: **Typed Error Handling (6/6 Sub-Tests)**

### Dokumentation
- `docs/DSA5_BRIDGE_README.md`
- `docs/DSA5_BRIDGE_API.md`
- `docs/DSA5_BRIDGE_USAGE_GUIDE.md`
- `docs/DSA5_BRIDGE_TROUBLESHOOTING.md`
- `docs/DSA5_BRIDGE_ARCHITECTURE.md`
- `docs/PHASE3_PRODUCTION_CERTIFICATE.md`

---

## PHASE 4: ACADEMY SIMULATION

**Status:** ✅ ABGESCHLOSSEN  
**Version:** 0.4.9

### Ziele
Die Simulationslogik der Akademie: Kalender-Fortschritt, Scoring, Lessons, Exams, Social, Events.

### Komponenten

#### 4.1 Kalender-Engine
```javascript
game.janus7.academy.calendar.advancePhase({ steps: 1 })
game.janus7.academy.calendar.getCurrentSlotRef()
// SlotRef: { year, trimester, week, day, phase }
```

#### 4.2 Scoring-Engine
```javascript
game.janus7.academy.scoring.addCirclePoints('salamander', 10, 'Testpunkte')
game.janus7.academy.scoring.getLeaderboard({ type: 'circle' })
```

#### 4.3 Lessons-Engine
- Unterrichtssessions
- Outcomes & Auto-Scoring
- Tracking

#### 4.4 Exams-Engine
- Prüfungen mit Roll-API-Integration
- Grading-Schemas (konfigurierbar)
- Auswertungen

#### 4.5 Social-Engine
- Beziehungs-Graph (Sympathien, Rivalitäten)
- Reputation-System

#### 4.6 Events-Engine (Basic)
- Spezialereignisse
- Kalender-Integration
- Basic Auto-Trigger

### Hooks
```javascript
'janus7DateChanged'
'janus7ScoreChanged'
'janus7LessonCompleted'
'janus7ExamCompleted'
```

### Dokumentation
- `docs/PHASE4_OVERVIEW.md`
- `docs/PHASE4_SIMULATION_ENGINE.md`

---

## PHASE 4b: QUEST & EVENT SYSTEM ⭐ NEU

**Status:** ✅ ABGESCHLOSSEN  
**Version:** 0.9.12.29  
**Integration:** Phase 4 Extended

### Ziele
Story-getriebenes Quest-System mit node-basierter Progression und dynamischen Events.

### Warum Phase 4b?
Das Quest & Event System wurde nach der ursprünglichen Roadmap entwickelt, erweitert aber organisch die Academy Simulation (Phase 4). Es nutzt dieselben Engines (Kalender, Scoring, Social) und integriert sich nahtlos.

### Komponenten

#### 4b.1 Quest Engine (`academy/quests/quest-engine.js`)
**Node-basierte Quest-Progression:**
- **Event Nodes:** Trigger spezifische Events
- **Check Nodes:** Verzweigungen (success/failure)
- **Effect Nodes:** State-Änderungen anwenden

**API:**
```javascript
// Quest starten
await game.janus7.academy.quests.startQuest('Q_DEMO_LIBRARY', { 
  actorId: 'Actor.xyz123' 
});

// Zu Node fortschreiten
await game.janus7.academy.quests.progressToNode('Q_DEMO', 'QN_NEXT', { 
  actorId: 'Actor.xyz' 
});

// Quest abschließen
await game.janus7.academy.quests.completeQuest('Q_DEMO', { 
  actorId: 'Actor.xyz' 
});
```

**Features:**
- ✅ Failforward-Mechanik (Requirements nicht erfüllt → alternativer Pfad)
- ✅ Condition-basierte Gates
- ✅ State-Tracking (History, Status)
- ✅ Hooks: `janus7QuestStarted`, `janus7QuestNodeChanged`, `janus7QuestCompleted`

#### 4b.2 Event Engine (`academy/events/event-engine.js`)
**Dynamische Events mit Options:**

**Pool-basiertes Spawning:**
```javascript
// Random Event aus Pool spawnen
const event = await game.janus7.academy.events.spawnFromPool('exploration', {
  actorId: 'Actor.xyz123'
});
```

**Event Presentation:**
```javascript
// Event mit verfügbaren Optionen anzeigen
const presentation = await game.janus7.academy.events.presentEvent('E_LIBRARY_DISCOVER', {
  actorId: 'Actor.xyz123'
});
// presentation: { event, options: [...] }
```

**Option Selection:**
```javascript
// Option auswählen und Effekte anwenden
const result = await game.janus7.academy.events.selectOption('OPT_INVESTIGATE', {
  actorId: 'Actor.xyz123'
});
// result: { success: true, effects: {...}, nextNodeId: 'QN_NEXT' }
```

**Features:**
- ✅ Condition-basierte Optionen (nur verfügbare werden angezeigt)
- ✅ Check-Integration (DSA5-Proben in Events)
- ✅ Effect-Application via Effect Adapter
- ✅ State-Recording (eventStates)
- ✅ Hooks: `janus7EventShown`, `janus7EventOptionSelected`

#### 4b.3 Condition Evaluator (`academy/conditions/condition-evaluator.js`)
**Expression-basiertes Condition-System:**

**Logical Expressions:**
```javascript
await evaluator.evaluate('playerState.skills.lore >= 2', { actorId });
// Evaluiert: true/false
```

**DSA5 Checks:**
```javascript
await evaluator.evaluate('CHECK(Magiekunde, 15)', { actorId });
// Führt DSA5-Probe aus via Bridge (Phase 3)
```

**Features:**
- ✅ Parser für Logical Expressions (AND, OR, Comparisons)
- ✅ DSA5 Check-Integration
- ✅ Context-Provider (Player State + Calendar)
- ✅ Talent-Mapping (Magiekunde → skill_magicallore)

#### 4b.4 Effect Adapter (`academy/effects/effect-adapter.js`)
**State-Manipulation via Effects:**

**Effect Definition (JSON):**
```json
{
  "effectId": "stress_plus1",
  "expr": "stress:+1",
  "description": "Erhöht Stress um 1"
}
```

**API:**
```javascript
await game.janus7.academy.effects.applyEffects(
  ['stress_plus1', 'energy_minus2'],
  { actorId: 'Actor.xyz', source: 'event', reason: 'Bibliothek durchsucht' }
);
```

**Features:**
- ✅ Expression-Parser (key:op:value)
- ✅ Operators: `+`, `-`, `=`
- ✅ Transaction-basiert (via State Core)
- ✅ Result-Tracking (from, to values)

#### 4b.5 Content Registry (`academy/content/content-registry.js`)
**Zentrale Content-Verwaltung:**

**Indices:**
- Quests (by questId)
- Quest Nodes (by nodeId)
- Events (by eventId)
- Options (by optionId, by parent)
- Effects (by effectId)
- Pools (by poolId)

**Validation:**
```javascript
const report = registry.validate();
// report: { errors: [...], warnings: [...] }
```

### Daten-Struktur (data/)

**Quests:**
```
data/quests/
├── quest-index.json         # Quest-Übersicht
└── Q_DEMO_LIBRARY.json      # Quest-Definition (nodes)
```

**Events:**
```
data/events/
├── event-index.json         # Event-Übersicht
├── pool-index.json          # Pool-Definitionen
├── options.json             # Event-Optionen
└── pools/
    ├── exploration.json     # Events für Exploration
    ├── social_minor.json    # Kleine soziale Events
    └── uncategorized.json   # Sonstige
```

**Effects:**
```
data/effects/
├── effect-index.json        # Effect-Übersicht
├── stress_plus1.json
├── energy_minus2.json
└── rel_mentor_plus2.json
```

### Integration mit Phase 4
- ✅ Nutzt **Calendar Engine** (Zeit-Conditions)
- ✅ Nutzt **Scoring Engine** (Quest-Rewards)
- ✅ Nutzt **Social Engine** (Event-Beziehungs-Effekte)
- ✅ Nutzt **State Core** (Transactions, Persistence)

### Integration mit Phase 3
- ✅ DSA5 Checks via **DSA5 Bridge**
- ✅ Talent-Mapping konsistent mit Bridge

### Architektur-Compliance
- ✅ **Hybrid-First:** Keine UI in Engine-Code
- ✅ **Data-Driven:** JSON-basiert, Zero Hardcode
- ✅ **SSOT:** State Core als zentrale Wahrheit
- ✅ **Modul-Agnostik:** DSA5 Bridge als Abstraktionsschicht
- ✅ **KI-Ready:** JSON-Export-Ready

### Test-Coverage
⚠️ Noch keine dedizierten Quest-System-Tests im Katalog.

**Empfehlung für Phase 7:**
- TC-QS-01: Quest Start/Complete
- TC-QS-02: Node Transitions (success/failforward)
- TC-QS-03: Event Presentation + Option Selection
- TC-QS-04: Effect Application
- TC-QS-05: Condition Evaluation (Logical + DSA5 Checks)

### Dokumentation
- `docs/QUEST_SYSTEM.md` ⭐ NEU
- `docs/PHASE4B_OVERVIEW.md` ⭐ NEU

---

## PHASE 5: HYBRID & ATMOSPHERE

**Status:** ✅ ABGESCHLOSSEN  
**Version:** 0.5.2  
**Test-Status:** 7/7 PASS (100%)

### Ziele
Steuerung von Audio/Visual für Beamer (Second Screen).

### Komponenten
- **JanusAtmosphereController:** Master-Client, Mood-Management
- **Mood-System:** JSON-definierte Moods (Playlists + Scenes)
- **Anti-Flapping Logic:** Debounce für Mood-Switches
- **Watchdog Timer:** Auto-Stop für Playlists

### API
```javascript
game.janus7.atmosphere.applyMood('academy_day')
game.janus7.atmosphere.setMasterClient(userId)
game.janus7.atmosphere.listMoods()
```

### Test-Coverage
- ✅ P5-TC-01: Enable Atmosphere
- ✅ P5-TC-02: Set Master = Self
- ✅ P5-TC-03: List Moods
- ✅ P5-TC-04: Apply Mood (manual)
- ✅ P5-TC-05: Apply Mood via Calendar-Hook
- ✅ P5-TC-06: Anti-Flapping (Debounce)
- ✅ P5-TC-07: Watchdog Auto-Stop

### Dokumentation
- `docs/PHASE5_ATMOSPHERE.md`
- `docs/PHASE5_TEST_REPORT.md`
- `docs/ADR_ATMOSPHERE.md`

---

## PHASE 6: USER INTERFACES

**Status:** ⚠️ IN PROGRESS  
**Version:** 0.9.12.29

### Ziele
ApplicationV2-basierte UIs für GM und Spieler.

### Geplante UIs
- **Control Panel** (GM) - Zentrale Steuerung
- **Academy Overview** - Dashboard
- **Calendar View** - Stundenplan-Ansicht
- **Leaderboard** - Hauscup/Zirkelpunkte
- **Quest Journal** - Quest-Fortschritt (⚠️ Basic Version vorhanden)
- **Event Popup** - Event-Präsentation (⚠️ Basic Version vorhanden)
- **State Inspector** (Debug) - State-Visualisierung

### Aktueller Stand
- ⚠️ Quest Journal (Basic): `ui/quest-journal.js`
- ⚠️ Event Popup (Basic): `ui/event-popup.js`
- ⚠️ Dev Panel (Debug): `ui/dev-panel.js`

### Geplante Erweiterungen
- ApplicationV2 Migration (aktuell teilweise FormApplication)
- Handlebars-Templates unter `templates/apps/`
- Styling via `styles/janus.css`
- Responsive Design (Beamer + Desktop)

### Dokumentation
- `docs/PHASE6_UI_GUIDE.md` ⚠️ TODO

---

## PHASE 7: KI-INTEGRATION

**Status:** ✅ ABGESCHLOSSEN  
**Version:** 0.9.12.29  

### Ziele
Export/Import-Logik für LLM-Roundtrips (Claude, ChatGPT, Gemini).

### Geplante Komponenten
- **JanusKIExporter:** State + Academy Data → JSON/ZIP
- **JanusKIImporter:** KI-JSON → Validierung → State-Updates
- **JanusKIPrompts:** Prompt-Templates für LLMs
- **JanusKIDiff:** Lesbare Change-Diffs

### Export-Format
**JANUS_EXPORT_V2:**
```json
{
  "version": "JANUS_EXPORT_V2",
  "meta": { "exportedAt": "...", "world": "...", "janusVersion": "..." },
  "campaign_state": { /* JanusStateSnapshot */ },
  "academy": { 
    "calendar": {...}, 
    "lessons": {...},
    "quests": {...},
    "events": {...}
  },
  "references": { "npcs": {...}, "locations": {...} }
}
```

### Import-Format
**JANUS_KI_RESPONSE_V1:**
```json
{
  "version": "JANUS_KI_RESPONSE_V1",
  "sourceExportMeta": {...},
  "changes": {
    "calendarUpdates": [...],
    "lessonUpdates": [...],
    "eventUpdates": [...],
    "scoringAdjustments": [...],
    "journalEntries": [...]
  },
  "notes": "KI-Begründung für Änderungen"
}
```

### Workflow
1. GM: Export via `game.janus7.ki.exporter.exportAll()`
2. Extern: LLM-Processing (ChatGPT, Claude, etc.)
3. GM: Import via `game.janus7.ki.importer.importFile('ki_response.json')`
4. System: Validierung → Diff-Preview → Apply

### Sicherheit
- ✅ Validator prüft alle Imports (Phase 1)
- ✅ Dry-Run vor tatsächlichem Apply
- ✅ State-Backup vor jedem Import
- ✅ Rollback-Mechanismus

### Dokumentation
- `docs/KI_INTEGRATION_GUIDE.md` ⚠️ TODO
- `docs/EXPORT_FORMAT_V2.md` ⚠️ TODO

---

## PHASE 8: BACKLOG

**Status:** 📋 FUTURE

### Geplante Features
- **Multi-Setting Support:** Akademie-Templates (Punin, Gareth, Khunchom)
- **Deep-Automation:** Auto-Lessons, Auto-Exams, Auto-Events
- **Advanced Social:** Komplexe Beziehungs-Graphen, Fraktionen
- **Consequence Engine:** Langzeit-Auswirkungen von Entscheidungen
- **Mobile Companion App:** React Native App für Spieler
- **VTT-Unabhängigkeit:** Standalone-Server (Node.js) für Non-Foundry Nutzung

---

## ROADMAP-TIMELINE

```
Phase 0-3: ✅ ABGESCHLOSSEN (Foundation)
├─ 0.1.0: Core Architecture
├─ 0.2.0: Academy Data
└─ 0.3.9: DSA5 Bridge (Production-Ready)

Phase 4-5: ✅ ABGESCHLOSSEN (Simulation)
├─ 0.4.9: Academy Simulation (Calendar, Scoring, Lessons, Exams, Social)
├─ 0.4.10: Quest & Event System (jetzt Phase 4b)
└─ 0.5.2: Atmosphere (Audio/Visual)

Phase 6: ✅ DONE (User Interfaces)
└─ 0.9.1: 10 ApplicationV2 Apps, 40+ Commands, 10 P16-Tests, Architecture A1–A3 konform

Phase 7: ❌ GEPLANT (KI-Integration)
└─ 0.7.0: Export/Import, LLM-Roundtrips

Phase 8: 📋 FUTURE (Backlog)
└─ 0.8.0+: Multi-Setting, Deep-Automation, etc.
```

---

## ARCHITEKTUR-PRINZIPIEN

### 1. Hybrid-First
- Beamer als Second Screen (Master-Client)
- Keine VTT-Spielersicht-Fokus
- Audio/Visual zentral gesteuert

### 2. Data-Driven
- JSON statt Hardcode
- Strikte Code/Content-Trennung
- Schema-Validierung (JSON Schema)

### 3. Single Source of Truth (SSOT)
- `JanusStateCore` (Phase 1) als zentrale Wahrheit
- Keine dezentralen Flags (außer Foundry-System-Flags)
- Transaktionale State-Änderungen

### 4. Modul-Agnostik
- DSA5-Referenzen (UUIDs), keine Duplikation
- Abstraktionsschicht (DSA5 Bridge) für System-Zugriffe
- Keine direkte Nutzung von `game.dsa5.*` außerhalb Bridge

### 5. KI-Ready
- Export/Import-Schnittstellen (Phase 7)
- JSON-basiert, LLM-optimiert
- Validierung + Rollback

### 6. Phase Isolation
- Keine Cross-Phase-Dependencies (außer dokumentiert)
- Jede Phase nutzt nur niedrigere Phasen
- Dependency Injection für Testbarkeit

---

## DEPENDENCIES

```
Phase 0 (Leitbild)
  └─ (keine)

Phase 1 (Core)
  └─ Foundry VTT v13+

Phase 2 (Academy Data)
  └─ Phase 1 (State, Logger)

Phase 3 (DSA5 Bridge)
  ├─ Phase 1 (State, Logger, Validator)
  └─ DSA5 System v7.0+

Phase 4 (Simulation)
  ├─ Phase 1 (State, Logger, Config)
  ├─ Phase 2 (Academy Data)
  └─ Phase 3 (DSA5 Bridge)

Phase 4b (Quest & Event)
  ├─ Phase 1 (State, Logger)
  ├─ Phase 2 (Academy Data)
  ├─ Phase 3 (DSA5 Bridge)
  └─ Phase 4 (Calendar, Scoring, Social)

Phase 5 (Atmosphere)
  ├─ Phase 1 (State, Config, Logger)
  └─ Phase 4 (Calendar für Auto-Moods)

Phase 6 (UI)
  ├─ Phase 1 (State, Config)
  ├─ Phase 4 (Simulation Engines)
  └─ Phase 4b (Quest & Event Engines)

Phase 7 (KI)
  ├─ Phase 1 (State, IO, Validator)
  ├─ Phase 2 (Academy Data)
  └─ Phase 4/4b (Simulation & Quest Data)

Phase 8 (Backlog)
  └─ Alle vorherigen Phasen
```

---

## NÄCHSTE SCHRITTE (Phase 7 Vorbereitung)

### Vor Phase 7:
1. ✅ **Quest System formalisieren** (Phase 4b in Roadmap)
2. ✅ **Code-Cleanup** (JSDoc, Redundanzen eliminieren)
3. ✅ **Roadmap aktualisieren** (dieses Dokument)
4. ⚠️ **Test-Suite erweitern** (Quest System Tests)
5. ⚠️ **UI vervollständigen** (Phase 6 Basic UIs)

### Phase 7 Start:
1. ❌ Export-Format finalisieren (JANUS_EXPORT_V2)
2. ❌ Import-Format finalisieren (JANUS_KI_RESPONSE_V1)
3. ❌ JanusKIExporter implementieren
4. ❌ JanusKIImporter implementieren
5. ❌ Prompt-Templates erstellen (für Claude, ChatGPT, Gemini)
6. ❌ Validierungs-Pipeline (Dry-Run, Diff-Preview)
7. ❌ Integration-Tests (Roundtrip-Tests)

---

## RELEASE-HISTORIE

| Version | Datum | Phase | Highlights |
|---------|-------|-------|------------|
| 0.1.0 | 2025-11-XX | 1 | Core Architecture |
| 0.2.0 | 2025-12-XX | 2 | Academy Data (NPCs, Lessons) |
| 0.3.9 | 2025-12-14 | 3 | DSA5 Bridge (Production) |
| 0.4.9 | 2025-12-19 | 4 | Simulation (Calendar, Scoring, Lessons, Exams) |
| 0.5.2 | 2025-12-XX | 5 | Atmosphere (Moods, Master-Client) |
| **0.6.0** | **2026-02-04** | **4b+6** | **Quest System, Event System, Basic UIs** |
| 0.7.0 | 2026-XX-XX | 7 | KI-Integration (geplant) |

---

## DOKUMENTATION-INDEX

### Core Docs
- `README.md` - Projektübersicht
- `CHANGELOG.md` - Versionshistorie
- `INSTALLATION.md` - Setup-Anleitung

### Architektur
- `docs/ARCHITECTURE.md` - Schichtenmodell
- `docs/DATA_MODEL.md` - State + Academy Data
- `docs/ADR_ATMOSPHERE.md` - Architecture Decision Records

### Entwicklung
- `docs/DEVELOPMENT.md` - Coding Standards, JSDoc
- `docs/TESTING.md` - Testkatalog, Runner
- `docs/API_REFERENCE.md` - Public APIs

### Phasen-Spezifisch
- `docs/PHASE3_PRODUCTION_CERTIFICATE.md` - DSA5 Bridge Sign-Off
- `docs/PHASE4_OVERVIEW.md` - Simulation Engine Übersicht
- `docs/PHASE4B_OVERVIEW.md` ⭐ NEU - Quest & Event System
- `docs/PHASE5_ATMOSPHERE.md` - Atmosphere System
- `docs/QUEST_SYSTEM.md` ⭐ NEU - Quest System Details

### DSA5 Bridge
- `docs/DSA5_BRIDGE_README.md`
- `docs/DSA5_BRIDGE_API.md`
- `docs/DSA5_BRIDGE_USAGE_GUIDE.md`
- `docs/DSA5_BRIDGE_TROUBLESHOOTING.md`
- `docs/DSA5_BRIDGE_ARCHITECTURE.md`

### Support
- `docs/TROUBLESHOOTING.md` - Fehlerbilder
- `docs/SECURITY.md` - Sicherheitsregeln
- `docs/RELEASE.md` - Release-Checkliste

---

## TEAM & KONTAKT

**Lead Architect & Developer:** Thomas (Wirtschaftsinformatiker, Projektmanager)  
**Projekt:** JANUS7 - Hybrides Betriebssystem für DSA5-Magierakademien  
**Lizenz:** Privat (keine Weitergabe von DSA-IP)

---

**Ende der Roadmap**
