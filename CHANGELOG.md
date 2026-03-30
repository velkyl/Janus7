## v0.9.12.46 - Director Write Fixes + Exam Question Sets + Bridge/API Sync

### Fixed
- UI: Control Panel schreibt `academy.roster` und `academy.slotJournals` wieder ueber Director-APIs statt ueber einen defekten Direkt-Write auf den State
- DATA: `AcademyDataApi` liest MCQ-Pruefungsfragen wieder aus `questionSets`, passend zu `data/academy/exam-questions.json`
- BRIDGE: Academy-NPC-Resolution nutzt `getNpc()`/`getNPC()` robust und exponiert Actor-Lookup per Name
- COMMANDS: `bridgeActorLookup` und `bridgeRollTest` nutzen wieder die reale oeffentliche Bridge-API (`actorName`, `skillName`, `bridge.rollSkill(...)`)
- TEST: Regression fuer Exam-Question-Set-Aufloesung registriert
- DOKU: Release-, Status-, KI- und API-Dokumente auf den tatsaechlichen Runtime-Stand synchronisiert

## v0.9.12.43 - Version Sync + CI Repair + Hook Runtime Cleanup

### Fixed
- DOKU: Kern-Dokumente wieder auf die Runtime-SSOT aus `module.json` synchronisiert
- CI: GitHub-Workflow von kaputtem npm-Publish auf echte Repo-Validierung umgestellt
- ARCH: Runtime-Hook-Registrierung dedupliziert und Engine-Hook-Cleanup auf alle `_*HookIds` vereinheitlicht
- GC: mehrere Integrationen auf kanonische `HOOKS.*`-Topics umgestellt; tote/duplizierte Legacy-Schichten reduziert

## v0.9.12.42 - Test Cleanup + Diagnostics Drift-Check

### Fixed
- DOKU: docs/MODULE_STATUS.md auf 0.9.12.42 aktualisiert
- TEST: P3-TC-SOCIAL-01 Snippet 8 nutzt public Bridge-API statt DSA5_SOCIAL_LEVELS
- TEST: P3-TC-SOCIAL-01 Validation-Texte auf öffentliche API umgestellt
- TEST: P3-TC-MOON-01 Validation-Texte ohne interne MOON_PHASES-Konstanten
- DIAG: core/diagnostics.js prüft jetzt auf Versions-Drift zwischen gespeichertem coreState und Modulversion

## v0.9.12.41 - Doku-SSOT + Social Snippet Cleanup + KI Robustheit

### Fixed
- DOKU: README.md und docs/MODULE_STATUS.md auf 0.9.12.41 aktualisiert
- TEST: P3-TC-SOCIAL-01 Snippet 1 nutzt jetzt öffentliche Bridge-API statt interne Symbole (attitudeToLevel/levelToAttitude/slugifyUuid)
- FIX: phase7/io/JanusKiIoService.importFromInbox() prüft Dateiexistenz via listInboxFiles() vor fetch()

## v0.9.12.40 - Moon Hook-Centralization + Prereq-Gates + Version-Sync

### Fixed
- ARCH: bridge/dsa5/moon.js registriert updateWorldTime nicht mehr direkt; Delegation via janus.mjs → engine.bridge.dsa5.moon.onWorldTimeUpdated()
- TEST: P1-TC-11 scannt bridge/dsa5/moon.js auf direkte Core-Hook-Registrierungen
- TEST: P3-TC-BUFF-01, FATE-01, SOCIAL-01, TRAD-01 mit Prereq-Gates (auto-SKIP bei fehlenden Weltdaten)
- FIX: bridge/dsa5/index.js ruft timedCond.applyTimedAcademyCondition() korrekt auf (war: applyAcademyCondition)
- FIX: phase7/io/JanusKiIoService.js ensureDataDirectory vor importFromInbox fetch
- FIX: ui/apps/ki-roundtrip/JanusKiRoundtripApp.js sichert Inbox-Verzeichnis vor FilePicker-Open
- RELEASE: Versionierung module.json/VERSION.json/package.json auf 0.9.12.40 synchronisiert

## v0.9.12.37 - Hotfix: state.loaded + LessonBuffManager Doppelregistrierung

- FIX (core/state.js): `JanusStateCore` hatte kein `.loaded`-Property.
  Guided-Harness prüfte `engine.core.state.loaded` → `undefined` → `false`.
  Jetzt: `get loaded()` true wenn `_ready && _state != null`.
  `get isLoaded()` als Alias.
- FIX (academy/phase4.js): `lessonBuffManager.register()` wurde manuell UND
  via `safeRegister()` aufgerufen → Hook-Paar doppelt registriert, erstes Paar
  nicht mehr via unregister() erreichbar (Hook-Leak).
  Manuellen Aufruf entfernt.
- FIX (academy/lesson-buff-manager.js): Idempotenz-Guard ergänzt:
  `if (this._hookIds?.length) return;` — verhindert Doppelregistrierung
  auch bei späterem Aufruf.

## v0.9.12.37 - Hotfix: state.loaded fehlte

- FIX (core/state.js): `JanusStateCore` hatte kein `.loaded`-Property.
  Guided-Harness prüft `engine.core.state.loaded` → war immer `undefined` → `false`.
  Jetzt: `get loaded()` gibt `true` wenn `_ready && _state != null`.
  `get isLoaded()` als Alias ergänzt.

## v0.9.12.36 - Phase-4-Integrationsvervollständigung (alle 6 Befunde aus Audit v35)

- FIX (academy/phase4.js): `LessonBuffManager` lädt jetzt `teacher-bonuses.json` via fetch
  und ruft `lessonBuffManager.register()` auf — bisher blieb `_bonuses` leer.
- FIX (bridge/dsa5/index.js): `this.postRollBuff = this.postRoll` Alias ergänzt —
  `lesson-buff-manager.js` referenzierte `bridge.postRollBuff`, Bridge exponierte nur `postRoll`.
- FIX (academy/phase4.js): `JanusExamConditionHooks` importiert, instanziiert und via
  `register()` verdrahtet — der Prüfungsergebnis→Timed-Condition-Workflow war nie aktiv.
- FIX (academy/exams.js): `recordExamResult()` emittiert jetzt `HOOKS.EXAM_RESULT_RECORDED`
  nach dem State-Write — LearningProgress und ExamConditionHooks hängen an diesem Hook.
- FIX (academy/phase4.js): `LearningProgress` lädt `ap-awards.json` via fetch (analog
  zu `fateTracker`/`fate-scoring.json`) — lief bisher mit Defaultwerten.
- FIX (P3_TC_BUFF_01, P3_TC_TIMED_01): Irreführende console.log-Texte entschärft.

## v0.9.12.35 - Finaler Snippet-Fix (Audit v0.9.12.34)
- FIX (P3_TC_TIMED_01 snippet 7): fehlende `await` vor `bridge.getTimedConditions(actor)` —
  ohne await war `timed` ein Promise, `timed.map()` brach mit TypeError.
- FIX (P3_TC_TIMED_01 snippet 7): Titel von "EXAM_OUTCOME_CONDITIONS anzeigen" auf
  "Aktive Timed-Conditions des Actors anzeigen" — beschreibt tatsächlichen Inhalt.

## v0.9.12.34 - Bridge-Wrapper-Vertragsfix + Snippet-Bereinigung

### Fixes (ChatGPT-Audit v0.9.12.33 — alle 6 Befunde bestätigt)
- FIX (bridge/dsa5/index.js): `removeTeacherBuffs(actorRef)` → `removeTeacherBuffs(actorRef, filter={})`:
  Sub-Bridge unterstützt Filter-Parameter (teacherNpcId, lessonId), Root-Wrapper hat ihn nicht
  durchgereicht → zu breites Entfernen möglich.
- FIX (bridge/dsa5/index.js): `applyTeacherBonusToMany()` war sync `...args` Pass-Through.
  Sub-Bridge `postRoll.applyToMany()` erwartet `Actor[]`, Tests übergeben Refs/UUIDs.
  Jetzt: async, löst jeden Ref via `resolver.require()` auf, loggt Fehler.
- FIX (bridge/dsa5/index.js): `applyTimedConditionToMany()` — gleiches Problem/gleicher Fix.
- FIX (core/test/tests/p3/P3_TC_TIMED_01 snippet 4): lokales `JANUS_DURATION`-Objekt
  fehlte `THREE_DAYS` in diesem Snippet (war nur in snippet 1 vorhanden).
- FIX (core/test/tests/p3/P3_TC_TIMED_01 snippet 7): defektes `console.table`-Fragment
  durch lauffähigen Prüf-Snippet (`bridge.getTimedConditions(actor)`) ersetzt.
- FIX (academy/circle-assignment.js, P3_TRAD_TC_01): Irreführende Kommentare
  „Schreibt in State" korrigiert auf „session-local AcademyDataApi-Override".

## v0.9.12.33 - DataAPI-Aliases + Snippet-Konstanten (Audit v0.9.12.31)

### Befunde aus ChatGPT-Audit (basierend auf v0.9.12.31, überprüft gegen v0.9.12.32)
Befunde 1–5 aus dem Audit waren in v0.9.12.32 bereits gefixt.
4 neue echte Befunde identifiziert und gefixt:

- FIX (academy/data-api.js): `listNpcs()` und `listNPCs()` als Aliases auf
  `getNpcs()` ergänzt — werden in fate-tracker.js, roll-scoring-connector.js,
  diagnostics.js und social-sync.js als Fallback verwendet.
- FIX (core/test/tests/p3/P3_TC_TIMED_01): Lokale `JANUS_DURATION`-Konstante
  fehlte `THREE_DAYS` (259200), `TWO_DAYS` (172800) und `TWO_WEEKS` (1209600).
  Snippet crashte auf `JANUS_DURATION.THREE_DAYS === undefined`.
- FIX (core/test/tests/p3/P3_TC_FATE_01): `SCHIP_SOURCE` und `readGroupSchips`
  in Snippet als Inline-Konstante bzw. Lambda-Wrapper definiert.
- FIX (core/test/tests/p3/P3_TC_BUFF_01): `POST_ROLL_KEYS` und `POST_ROLL_SCOPES`
  als Inline-Konstanten im Snippet definiert (Werte aus postroll-buff.js).
- FIX (core/test/tests/p3/P3_TC_TIMED_01 snippet 7): `EXAM_OUTCOME_CONDITIONS`
  durch Fallback-Objekt ersetzt (interne Konstante, nicht browser-verfügbar).

## v0.9.12.32 - Rest-Sprint: Phase4-Init, Bridge-Aliase, Persistenz

### Fixes (aus ChatGPT-Audit v0.9.12.31, alle 5 Befunde bestätigt)
- FIX (academy/phase4.js): `JanusSocialSync` wurde vor `const bridge = engine?.bridge?.dsa5`
  instanziiert → TDZ-Fehler, socialSync nie initialisiert. Jetzt nach bridge-Deklaration
  und mit `safeRegister(socialSync, 'socialSync')`.
- FIX (bridge/dsa5/index.js): `suggestCircleForActor()` war sync, aber `resolveActor()`
  ist async → Promise statt Actor an tradition.suggestCircle(). Jetzt `async/await`.
- FIX (bridge/dsa5/index.js): 8 fehlende Root-Aliases ergänzt:
  `applyTeacherBonus`, `applyTeacherBonusToMany`, `getActiveTeacherBuffs`,
  `applyTimedConditionToMany`, `canUseFate`, `getPersonalSchips`, `setFatePoints`,
  `getNextNewMoon`.
- FIX (academy/phase4.js): `engine.academy.circleSync` liefert jetzt einen Adapter
  mit `syncAll({ dryRun, overwriteManual })` → delegiert auf `assignAllStudents()`.
- FIX (academy/data-api.js): `updateNpc()` und `setNpcField()` als Session-Override-
  Stubs implementiert (In-Memory für laufende Session; NPCs sind statische JSON-Daten,
  kein dauerhafter Write möglich ohne Datei-Änderung). `getNpc()` berücksichtigt Overrides.
- FIX (core/test/tests/p3/): `Testmagier`-Fallback in allen verbleibenden P3-Tests
  (FATE, BUFF, TIMED, TRAD, ADV) — 23 Stellen gesamt.

## v0.9.12.31 - Runtime-Defekte-Sprint (10 bestätigte Befunde)

### Kritische Fixes (aus verifiziertem ChatGPT-Audit)
- FIX (bridge/dsa5/index.js): `getCircleFromTradition()` rief `tradition.getCircleForActor()`
  auf — existiert nicht. Jetzt: `tradition.suggestCircle(actor)`.
- FIX (bridge/dsa5/index.js): `syncTraditionCircles()` rief `tradition.syncAllStudents()`
  auf — existiert nicht. Jetzt: eigene Loop mit `tradition.suggestCircle()` pro Eintrag.
- FIX (academy/circle-assignment.js): `suggestCircle()` rief `bridge.getMagicProfile()`
  auf — existiert nicht. Jetzt: `bridge.tradition.readTradition()` liefert dieselben
  Felder (traditionString, feature, guidevalue).
- FIX (academy/data-api.js): `listExamsByLesson()`, `getQuestionSetForExam()`,
  `isMultipleChoiceExam()` ergänzt — alle drei wurden von `academy/exams.js` gerufen.
- FIX (bridge/dsa5/index.js): Root-Aliases `readAllPersonaeContacts()`,
  `findPersonaKeyForActor()`, `setPersonaSocialLevel()` ergänzt (P3_TC_SOCIAL_01).
- FIX (core/test/tests/p3/P3_TC_SOCIAL_01): 2 nicht-lauffähige import-Snippets
  durch Runtime-Calls ersetzt.
- FIX (core/test/tests/p3/P3_TRAD_TC_01): Shape-Drift behoben — Test erwartete
  `outcome/assignedCircle/traditionString`, Code liefert `circleId/method/confidence`.
  Import-Snippet durch `game.janus7.academy.circleSync.assignAllStudents()` ersetzt.

### Zusätzliche Stabilisierungen (aus eigenem Audit)
- FIX (academy/scoring.js): `_ensureScoringRoot` dirty-writeback unterdrückt
  wenn bereits innerhalb einer State-Transaktion — verhindert Hook-Feuersalven
  bei reinen Leseaufrufen.
- FIX (academy/data-api.js): `listStudents/Teachers/Staff` mit try/catch gegen
  uninitialisierten DataAPI-Cache abgesichert (gibt [] statt Exception).

## v0.9.12.30 - Runtime-Facade-Konsolidierung

### Fixes (Korrekturplan-Sprint — Runtime-Kante zuerst)
- FIX (bridge/dsa5/index.js): 8 Root-Facade-Aliases ergänzt, damit Guided-Tests und
  Console-Snippets `game.janus7.bridge.dsa5.*` direkt nutzen können:
  `showGroupCheckMessage`, `conductGroupExam`, `readTradition`,
  `suggestCircleForActor`, `updateTraditionMapping`, `getAdvanceCost`,
  `canAffordAdvancement`, `advanceLessonSkills` — delegieren jeweils an den
  zuständigen Sub-Service (groupCheck/tradition/advancement).
- FIX (academy/phase4.js): `JanusSocialSync` aus `social-sync.js` wird nach
  `social` initialisiert und als `engine.academy.socialSync` registriert.
  `engine.academy.circleSync` als Compat-Alias auf `circleAssignment` gesetzt.
- FIX (academy/data-api.js): Convenience-Methoden ergänzt:
  `listStudents()`, `listTeachers()`, `listStaff()`, `listCircles()` —
  filtern `getNpcs()` nach role-Feld, kein Architekturbruch.
- FIX (core/test/tests/p3/): `game.actors.getName('Testmagier')` durch
  robuste Auflösung ersetzt (Fallback auf ersten character/Actor in der Welt).
  Import-Statement-Snippet in P3_TC_ADV_01 durch Runtime-Call ersetzt.

### Nicht umgesetzt (Falsch-Positive aus externem Audit)
- P3-Tests haben keine `import`-Statements in consoleCommand-Blöcken (0 Treffer)
- Doku-Drift, .orig, ki.history, GroupExamMixin: bereits in v0.9.12.29 gefixt

## v0.9.12.29 - Harness-Fix, GroupExam-Verdrahtung, DSA5-Compat

### Fixes (aus ChatGPT-Audit + Fact-Check)
- FIX (core/test/guided/guided-harness.js): `game.janus7.ki.history` →
  `game.janus7.ki.getImportHistory()` — bisheriger Console-Snippet verwies auf
  nicht-existente Property statt korrekte API-Methode.
- FIX (academy/phase4.js): `GroupExamMixin` aus `group-exam.js` wird jetzt nach
  `JanusExamsEngine`-Instanziierung via `Object.assign` eingehängt. Damit ist
  `game.janus7.academy.exams.triggerGroupExam()` tatsächlich verfügbar.
- FIX (module.json): DSA5-Kompatibilität auf `verified: "7.5.0"` angehoben
  (Welt läuft auf 7.5.0, Modul deklarierte noch 7.0.0).
- FIX (ui/apps/control-panel/): `JanusControlPanelApp.js.orig` aus Release entfernt.
- FIX (docs): 15 Markdown-Dateien von 0.9.12.23/26/27 auf 0.9.12.29 angehoben
  (README, INSTALLATION, USER_MANUAL, KI_HANDOVER, STATUS, RELEASE u.a.).

## v0.9.12.28 - Scoring Persistenz-Fix & KI-Import-Härtung

### Kritischer Bugfix (aus Welt-Analyse 2026-03-20)
Analyse von 107 KI-Backup-Paaren zeigte: Jeder Import schrieb `circleA: {score:10}`
in den State, aber beim nächsten Reload war wieder `salamander: 5` da — der Import
hatte keine bleibende Wirkung. Drei unabhängige Ursachen, alle drei gefixt:

- FIX (academy/scoring.js): `_ensureScoringRoot` schreibt normalisierten State jetzt
  via `state.set()` zurück wenn Objekt-Werte (`{score:N}`) gefunden werden (dirty-Flag).
  Bisher wurden Objekt-Werte im Memory konvertiert aber nie persistiert.
- FIX (phase7/import/JanusKiImportService.js): `scoringAdjustments`-Patches werden
  vor dem State-Write normalisiert: `{score:N}` → `N`. Kanonisches Format ist Zahl.
- FIX (phase7/ki/prompts.js): Alle drei Prompt-Templates (ChatGPT, Claude, Gemini)
  enthalten jetzt explizite ID-Regeln und Wert-Regeln. LLM darf keine IDs erfinden
  und muss Scoring-Werte als plain number liefern.

## v0.9.12.27 - Phase 7 Completion & Audit Fixes
- FIX: Alle 26 HBS-Templates in `module.json` unter `templates` registriert (Foundry v13 Preload-Stabilität)
- DOCS: `docs/KI_INTEGRATION_GUIDE.md` erstellt — vollständiger Phase-7-Workflow, API-Referenz, Sicherheitshinweise
- DOCS: `docs/EXPORT_FORMAT_V2.md` erstellt — Schema-Referenz JANUS_EXPORT_V2 + JANUS_KI_RESPONSE_V1
- DOCS: `docs/KI_PROMPT_TEMPLATE.md` erstellt — Copy-Paste-Vorlagen für Claude, ChatGPT, Gemini
- ROADMAP: Phase 7 Status auf ✅ ABGESCHLOSSEN angehoben

## v0.9.12.26 - Guided Manual Harness Console Commands
- Guided Manual Harness opens more specific target UIs instead of defaulting to the shell/control panel.
- Every guided manual test now exposes copyable console commands/snippets directly in the test UI.
- Added a semi-automatic Group Check step that can spawn the DSA5 group-check chat message from the harness.

## v0.9.12.25 - Guided Manual Harness

- TEST-HARNESS: Guided Manual Tests prüfen jetzt Vorbedingungen per Knopfdruck und führen durch klickbare Schrittaktionen.
- TEST-HARNESS: Das Harness kann relevante UIs öffnen, State-/Diagnostics-/Quest-/User-Snapshots erfassen und als Evidenz speichern.
- I18N/UI: Guided-Manual-Oberfläche erweitert, lokalisiert und für semi-automatische Abnahmen ausgebaut.

## v0.9.12.24 - i18n Completion Pass

- ergänzt fehlende i18n-Keys in `lang/de.json` und `lang/en.json` für Command Center, Guided Manual, Sidebar, Status-Aktionen und Settings
- vervollständigt Lokalisierung für Control-Panel-Statusleiste, Session-Prep-Wizard, Diagnostik-Hinweise und Zeitbestätigungsdialog
- ergänzt fehlende Setting-Namen/-Hints für Kalender-/Cron-Synchronisation

## v0.9.12.23 - Welle 4 Release Hardening

- TESTS: `core/test/register-builtins.js` trennt shipped Built-ins jetzt explizit in `BUILTIN_AUTO_MODULES` und `BUILTIN_MANUAL_MODULES`.
- TESTS: Der Default-Export registriert beide Buckets weiterhin vollständig, protokolliert aber die reale Auto-/Manual-Verteilung getrennt.
- DOKU: offensichtlichen Versions-Drift in README, Installation, KI-/User-Handbuch, Index, Release und Manual-Test-Checkliste auf den neuen Stand angehoben.

## v0.9.12.22 - Welle 3 UI + IO Hardening

- Fix: `core/io.js` exportiert wieder einen validen Root-`scoring`-Alias, damit Export→Import-Roundtrips nicht an der State-Validierung scheitern.
- Fix: `AcademyDataApi` Instanz-Wrapper für Progression/Stats ergänzt (`getSocialLinks`, `getMilestones`, `getCollections`, `getSchoolStatsConfig`, `getResourcesConfig`, `buildAcademyStatsSummary`), damit P4B-Progressionstests wieder auf der öffentlichen API laufen können.
- UI: Inline-Styles aus Control-Panel-/Scoring-Dialogen und Legacy-Tab-Renderern entfernt; dynamische Farben/Breiten laufen jetzt über CSS-Klassen und Datenattribute.
- Doku: `core/io.js` JSDoc für die öffentliche Import-/Export-API vervollständigt.

## v0.9.12.21 - Hotfix Validator Bootstrap

- Fix: `core/validator.js` bootstrap order repaired.
- Root cause: `SCORING_ROOT_SCHEMA` was referenced before initialization, which blocked JANUS7 startup during module load.
- No functional feature changes beyond startup recovery.

## v0.9.12.20 - Welle 2 Data API Split

- Welle 2.2 abgeschlossen: `academy/data-api.js` in Fassade + Helper-Module zerlegt und auf deutlich unter 700 Zeilen reduziert.
- Weltbezogene Schreib-/Override-Logik nach `academy/world-editor.js` verschoben; direkte Imports von `world-seed.js` und `world-overrides.js` aus `academy/data-api.js` entfernt.
- Bootstrap/Loader, Reader-Helper, Store/Cache und statische Content-Registry in eigene Module ausgelagert, ohne öffentliche API von `AcademyDataApi` zu brechen.

## v0.9.12.19 - Welle 3 Stability Closure
- fixed scoring schema drift by normalizing circle/student values to numeric SSOT
- fixed daily scoring snapshots to persist as circleId->score maps instead of indexed arrays
- hardened state migration and IO sanitizing for legacy scoring objects and malformed snapshots
- fixed atmosphere default mood handling by registering a canonical neutral mood and a silence fallback alias
- reduced validator false positives by allowing legacy score objects during transition

## v0.9.12.18 - Welle 3 State Consolidation
- quest SSOT consolidated to root-level questStates
- scoring SSOT consolidated to academy.scoring
- legacy state paths kept readable/writable via alias normalization
- state persistence/export cleaned from duplicate quest/scoring branches
