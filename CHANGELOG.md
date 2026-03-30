## v0.9.12.46 - Director Write Fixes + Exam Question Sets + Bridge/API Sync

### Fixed
- UI: Control Panel schreibt `academy.roster` und `academy.slotJournals` wieder ueber Director-APIs statt ueber einen defekten Direkt-Write auf den State
- DATA: `AcademyDataApi` liest MCQ-Pruefungsfragen wieder aus `questionSets`, passend zu `data/academy/exam-questions.json`
- BRIDGE: Academy-NPC-Resolution nutzt `getNpc()`/`getNPC()` robust und exponiert Actor-Lookup per Name
- COMMANDS: `bridgeActorLookup` und `bridgeRollTest` nutzen wieder die reale oeffentliche Bridge-API (`actorName`, `skillName`, `bridge.rollSkill(...)`)
- TEST: Regression fuer Exam-Question-Set-Aufloesung registriert
- DOKU: Release-, Status-, KI- und API-Dokumente auf den tatsaechlichen Runtime-Stand synchronisiert
- DOKU: Roadmap, UI-Guide, Guided-Manual-Harness, Manual-Release-Checkliste und Phase-4b-Uebersicht auf den aktuellen Runtime- und Manifest-Stand gezogen

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
- TEST: P3-TC-SOCIAL-01 Validation-Texte auf Ã¶ffentliche API umgestellt
- TEST: P3-TC-MOON-01 Validation-Texte ohne interne MOON_PHASES-Konstanten
- DIAG: core/diagnostics.js prÃ¼ft jetzt auf Versions-Drift zwischen gespeichertem coreState und Modulversion

## v0.9.12.41 - Doku-SSOT + Social Snippet Cleanup + KI Robustheit

### Fixed
- DOKU: README.md und docs/MODULE_STATUS.md auf 0.9.12.41 aktualisiert
- TEST: P3-TC-SOCIAL-01 Snippet 1 nutzt jetzt Ã¶ffentliche Bridge-API statt interne Symbole (attitudeToLevel/levelToAttitude/slugifyUuid)
- FIX: phase7/io/JanusKiIoService.importFromInbox() prÃ¼ft Dateiexistenz via listInboxFiles() vor fetch()

## v0.9.12.40 - Moon Hook-Centralization + Prereq-Gates + Version-Sync

### Fixed
- ARCH: bridge/dsa5/moon.js registriert updateWorldTime nicht mehr direkt; Delegation via janus.mjs â†’ engine.bridge.dsa5.moon.onWorldTimeUpdated()
- TEST: P1-TC-11 scannt bridge/dsa5/moon.js auf direkte Core-Hook-Registrierungen
- TEST: P3-TC-BUFF-01, FATE-01, SOCIAL-01, TRAD-01 mit Prereq-Gates (auto-SKIP bei fehlenden Weltdaten)
- FIX: bridge/dsa5/index.js ruft timedCond.applyTimedAcademyCondition() korrekt auf (war: applyAcademyCondition)
- FIX: phase7/io/JanusKiIoService.js ensureDataDirectory vor importFromInbox fetch
- FIX: ui/apps/ki-roundtrip/JanusKiRoundtripApp.js sichert Inbox-Verzeichnis vor FilePicker-Open
- RELEASE: Versionierung module.json/VERSION.json/package.json auf 0.9.12.40 synchronisiert

## v0.9.12.37 - Hotfix: state.loaded + LessonBuffManager Doppelregistrierung

- FIX (core/state.js): `JanusStateCore` hatte kein `.loaded`-Property.
  Guided-Harness prÃ¼fte `engine.core.state.loaded` â†’ `undefined` â†’ `false`.
  Jetzt: `get loaded()` true wenn `_ready && _state != null`.
  `get isLoaded()` als Alias.
- FIX (academy/phase4.js): `lessonBuffManager.register()` wurde manuell UND
  via `safeRegister()` aufgerufen â†’ Hook-Paar doppelt registriert, erstes Paar
  nicht mehr via unregister() erreichbar (Hook-Leak).
  Manuellen Aufruf entfernt.
- FIX (academy/lesson-buff-manager.js): Idempotenz-Guard ergÃ¤nzt:
  `if (this._hookIds?.length) return;` â€” verhindert Doppelregistrierung
  auch bei spÃ¤terem Aufruf.

## v0.9.12.37 - Hotfix: state.loaded fehlte

- FIX (core/state.js): `JanusStateCore` hatte kein `.loaded`-Property.
  Guided-Harness prÃ¼ft `engine.core.state.loaded` â†’ war immer `undefined` â†’ `false`.
  Jetzt: `get loaded()` gibt `true` wenn `_ready && _state != null`.
  `get isLoaded()` als Alias ergÃ¤nzt.

## v0.9.12.36 - Phase-4-IntegrationsvervollstÃ¤ndigung (alle 6 Befunde aus Audit v35)

- FIX (academy/phase4.js): `LessonBuffManager` lÃ¤dt jetzt `teacher-bonuses.json` via fetch
  und ruft `lessonBuffManager.register()` auf â€” bisher blieb `_bonuses` leer.
- FIX (bridge/dsa5/index.js): `this.postRollBuff = this.postRoll` Alias ergÃ¤nzt â€”
  `lesson-buff-manager.js` referenzierte `bridge.postRollBuff`, Bridge exponierte nur `postRoll`.
- FIX (academy/phase4.js): `JanusExamConditionHooks` importiert, instanziiert und via
  `register()` verdrahtet â€” der PrÃ¼fungsergebnisâ†’Timed-Condition-Workflow war nie aktiv.
- FIX (academy/exams.js): `recordExamResult()` emittiert jetzt `HOOKS.EXAM_RESULT_RECORDED`
  nach dem State-Write â€” LearningProgress und ExamConditionHooks hÃ¤ngen an diesem Hook.
- FIX (academy/phase4.js): `LearningProgress` lÃ¤dt `ap-awards.json` via fetch (analog
  zu `fateTracker`/`fate-scoring.json`) â€” lief bisher mit Defaultwerten.
- FIX (P3_TC_BUFF_01, P3_TC_TIMED_01): IrrefÃ¼hrende console.log-Texte entschÃ¤rft.

## v0.9.12.35 - Finaler Snippet-Fix (Audit v0.9.12.34)
- FIX (P3_TC_TIMED_01 snippet 7): fehlende `await` vor `bridge.getTimedConditions(actor)` â€”
  ohne await war `timed` ein Promise, `timed.map()` brach mit TypeError.
- FIX (P3_TC_TIMED_01 snippet 7): Titel von "EXAM_OUTCOME_CONDITIONS anzeigen" auf
  "Aktive Timed-Conditions des Actors anzeigen" â€” beschreibt tatsÃ¤chlichen Inhalt.

## v0.9.12.34 - Bridge-Wrapper-Vertragsfix + Snippet-Bereinigung

### Fixes (ChatGPT-Audit v0.9.12.33 â€” alle 6 Befunde bestÃ¤tigt)
- FIX (bridge/dsa5/index.js): `removeTeacherBuffs(actorRef)` â†’ `removeTeacherBuffs(actorRef, filter={})`:
  Sub-Bridge unterstÃ¼tzt Filter-Parameter (teacherNpcId, lessonId), Root-Wrapper hat ihn nicht
  durchgereicht â†’ zu breites Entfernen mÃ¶glich.
- FIX (bridge/dsa5/index.js): `applyTeacherBonusToMany()` war sync `...args` Pass-Through.
  Sub-Bridge `postRoll.applyToMany()` erwartet `Actor[]`, Tests Ã¼bergeben Refs/UUIDs.
  Jetzt: async, lÃ¶st jeden Ref via `resolver.require()` auf, loggt Fehler.
- FIX (bridge/dsa5/index.js): `applyTimedConditionToMany()` â€” gleiches Problem/gleicher Fix.
- FIX (core/test/tests/p3/P3_TC_TIMED_01 snippet 4): lokales `JANUS_DURATION`-Objekt
  fehlte `THREE_DAYS` in diesem Snippet (war nur in snippet 1 vorhanden).
- FIX (core/test/tests/p3/P3_TC_TIMED_01 snippet 7): defektes `console.table`-Fragment
  durch lauffÃ¤higen PrÃ¼f-Snippet (`bridge.getTimedConditions(actor)`) ersetzt.
- FIX (academy/circle-assignment.js, P3_TRAD_TC_01): IrrefÃ¼hrende Kommentare
  â€žSchreibt in State" korrigiert auf â€žsession-local AcademyDataApi-Override".

## v0.9.12.33 - DataAPI-Aliases + Snippet-Konstanten (Audit v0.9.12.31)

### Befunde aus ChatGPT-Audit (basierend auf v0.9.12.31, Ã¼berprÃ¼ft gegen v0.9.12.32)
Befunde 1â€“5 aus dem Audit waren in v0.9.12.32 bereits gefixt.
4 neue echte Befunde identifiziert und gefixt:

- FIX (academy/data-api.js): `listNpcs()` und `listNPCs()` als Aliases auf
  `getNpcs()` ergÃ¤nzt â€” werden in fate-tracker.js, roll-scoring-connector.js,
  diagnostics.js und social-sync.js als Fallback verwendet.
- FIX (core/test/tests/p3/P3_TC_TIMED_01): Lokale `JANUS_DURATION`-Konstante
  fehlte `THREE_DAYS` (259200), `TWO_DAYS` (172800) und `TWO_WEEKS` (1209600).
  Snippet crashte auf `JANUS_DURATION.THREE_DAYS === undefined`.
- FIX (core/test/tests/p3/P3_TC_FATE_01): `SCHIP_SOURCE` und `readGroupSchips`
  in Snippet als Inline-Konstante bzw. Lambda-Wrapper definiert.
- FIX (core/test/tests/p3/P3_TC_BUFF_01): `POST_ROLL_KEYS` und `POST_ROLL_SCOPES`
  als Inline-Konstanten im Snippet definiert (Werte aus postroll-buff.js).
- FIX (core/test/tests/p3/P3_TC_TIMED_01 snippet 7): `EXAM_OUTCOME_CONDITIONS`
  durch Fallback-Objekt ersetzt (interne Konstante, nicht browser-verfÃ¼gbar).

## v0.9.12.32 - Rest-Sprint: Phase4-Init, Bridge-Aliase, Persistenz

### Fixes (aus ChatGPT-Audit v0.9.12.31, alle 5 Befunde bestÃ¤tigt)
- FIX (academy/phase4.js): `JanusSocialSync` wurde vor `const bridge = engine?.bridge?.dsa5`
  instanziiert â†’ TDZ-Fehler, socialSync nie initialisiert. Jetzt nach bridge-Deklaration
  und mit `safeRegister(socialSync, 'socialSync')`.
- FIX (bridge/dsa5/index.js): `suggestCircleForActor()` war sync, aber `resolveActor()`
  ist async â†’ Promise statt Actor an tradition.suggestCircle(). Jetzt `async/await`.
- FIX (bridge/dsa5/index.js): 8 fehlende Root-Aliases ergÃ¤nzt:
  `applyTeacherBonus`, `applyTeacherBonusToMany`, `getActiveTeacherBuffs`,
  `applyTimedConditionToMany`, `canUseFate`, `getPersonalSchips`, `setFatePoints`,
  `getNextNewMoon`.
- FIX (academy/phase4.js): `engine.academy.circleSync` liefert jetzt einen Adapter
  mit `syncAll({ dryRun, overwriteManual })` â†’ delegiert auf `assignAllStudents()`.
- FIX (academy/data-api.js): `updateNpc()` und `setNpcField()` als Session-Override-
  Stubs implementiert (In-Memory fÃ¼r laufende Session; NPCs sind statische JSON-Daten,
  kein dauerhafter Write mÃ¶glich ohne Datei-Ã„nderung). `getNpc()` berÃ¼cksichtigt Overrides.
- FIX (core/test/tests/p3/): `Testmagier`-Fallback in allen verbleibenden P3-Tests
  (FATE, BUFF, TIMED, TRAD, ADV) â€” 23 Stellen gesamt.

## v0.9.12.31 - Runtime-Defekte-Sprint (10 bestÃ¤tigte Befunde)

### Kritische Fixes (aus verifiziertem ChatGPT-Audit)
- FIX (bridge/dsa5/index.js): `getCircleFromTradition()` rief `tradition.getCircleForActor()`
  auf â€” existiert nicht. Jetzt: `tradition.suggestCircle(actor)`.
- FIX (bridge/dsa5/index.js): `syncTraditionCircles()` rief `tradition.syncAllStudents()`
  auf â€” existiert nicht. Jetzt: eigene Loop mit `tradition.suggestCircle()` pro Eintrag.
- FIX (academy/circle-assignment.js): `suggestCircle()` rief `bridge.getMagicProfile()`
  auf â€” existiert nicht. Jetzt: `bridge.tradition.readTradition()` liefert dieselben
  Felder (traditionString, feature, guidevalue).
- FIX (academy/data-api.js): `listExamsByLesson()`, `getQuestionSetForExam()`,
  `isMultipleChoiceExam()` ergÃ¤nzt â€” alle drei wurden von `academy/exams.js` gerufen.
- FIX (bridge/dsa5/index.js): Root-Aliases `readAllPersonaeContacts()`,
  `findPersonaKeyForActor()`, `setPersonaSocialLevel()` ergÃ¤nzt (P3_TC_SOCIAL_01).
- FIX (core/test/tests/p3/P3_TC_SOCIAL_01): 2 nicht-lauffÃ¤hige import-Snippets
  durch Runtime-Calls ersetzt.
- FIX (core/test/tests/p3/P3_TRAD_TC_01): Shape-Drift behoben â€” Test erwartete
  `outcome/assignedCircle/traditionString`, Code liefert `circleId/method/confidence`.
  Import-Snippet durch `game.janus7.academy.circleSync.assignAllStudents()` ersetzt.

### ZusÃ¤tzliche Stabilisierungen (aus eigenem Audit)
- FIX (academy/scoring.js): `_ensureScoringRoot` dirty-writeback unterdrÃ¼ckt
  wenn bereits innerhalb einer State-Transaktion â€” verhindert Hook-Feuersalven
  bei reinen Leseaufrufen.
- FIX (academy/data-api.js): `listStudents/Teachers/Staff` mit try/catch gegen
  uninitialisierten DataAPI-Cache abgesichert (gibt [] statt Exception).

## v0.9.12.30 - Runtime-Facade-Konsolidierung

### Fixes (Korrekturplan-Sprint â€” Runtime-Kante zuerst)
- FIX (bridge/dsa5/index.js): 8 Root-Facade-Aliases ergÃ¤nzt, damit Guided-Tests und
  Console-Snippets `game.janus7.bridge.dsa5.*` direkt nutzen kÃ¶nnen:
  `showGroupCheckMessage`, `conductGroupExam`, `readTradition`,
  `suggestCircleForActor`, `updateTraditionMapping`, `getAdvanceCost`,
  `canAffordAdvancement`, `advanceLessonSkills` â€” delegieren jeweils an den
  zustÃ¤ndigen Sub-Service (groupCheck/tradition/advancement).
- FIX (academy/phase4.js): `JanusSocialSync` aus `social-sync.js` wird nach
  `social` initialisiert und als `engine.academy.socialSync` registriert.
  `engine.academy.circleSync` als Compat-Alias auf `circleAssignment` gesetzt.
- FIX (academy/data-api.js): Convenience-Methoden ergÃ¤nzt:
  `listStudents()`, `listTeachers()`, `listStaff()`, `listCircles()` â€”
  filtern `getNpcs()` nach role-Feld, kein Architekturbruch.
- FIX (core/test/tests/p3/): `game.actors.getName('Testmagier')` durch
  robuste AuflÃ¶sung ersetzt (Fallback auf ersten character/Actor in der Welt).
  Import-Statement-Snippet in P3_TC_ADV_01 durch Runtime-Call ersetzt.

### Nicht umgesetzt (Falsch-Positive aus externem Audit)
- P3-Tests haben keine `import`-Statements in consoleCommand-BlÃ¶cken (0 Treffer)
- Doku-Drift, .orig, ki.history, GroupExamMixin: bereits in v0.9.12.29 gefixt

## v0.9.12.29 - Harness-Fix, GroupExam-Verdrahtung, DSA5-Compat

### Fixes (aus ChatGPT-Audit + Fact-Check)
- FIX (core/test/guided/guided-harness.js): `game.janus7.ki.history` â†’
  `game.janus7.ki.getImportHistory()` â€” bisheriger Console-Snippet verwies auf
  nicht-existente Property statt korrekte API-Methode.
- FIX (academy/phase4.js): `GroupExamMixin` aus `group-exam.js` wird jetzt nach
  `JanusExamsEngine`-Instanziierung via `Object.assign` eingehÃ¤ngt. Damit ist
  `game.janus7.academy.exams.triggerGroupExam()` tatsÃ¤chlich verfÃ¼gbar.
- FIX (module.json): DSA5-KompatibilitÃ¤t auf `verified: "7.5.0"` angehoben
  (Welt lÃ¤uft auf 7.5.0, Modul deklarierte noch 7.0.0).
- FIX (ui/apps/control-panel/): `JanusControlPanelApp.js.orig` aus Release entfernt.
- FIX (docs): 15 Markdown-Dateien von 0.9.12.23/26/27 auf 0.9.12.29 angehoben
  (README, INSTALLATION, USER_MANUAL, KI_HANDOVER, STATUS, RELEASE u.a.).

## v0.9.12.28 - Scoring Persistenz-Fix & KI-Import-HÃ¤rtung

### Kritischer Bugfix (aus Welt-Analyse 2026-03-20)
Analyse von 107 KI-Backup-Paaren zeigte: Jeder Import schrieb `circleA: {score:10}`
in den State, aber beim nÃ¤chsten Reload war wieder `salamander: 5` da â€” der Import
hatte keine bleibende Wirkung. Drei unabhÃ¤ngige Ursachen, alle drei gefixt:

- FIX (academy/scoring.js): `_ensureScoringRoot` schreibt normalisierten State jetzt
  via `state.set()` zurÃ¼ck wenn Objekt-Werte (`{score:N}`) gefunden werden (dirty-Flag).
  Bisher wurden Objekt-Werte im Memory konvertiert aber nie persistiert.
- FIX (phase7/import/JanusKiImportService.js): `scoringAdjustments`-Patches werden
  vor dem State-Write normalisiert: `{score:N}` â†’ `N`. Kanonisches Format ist Zahl.
- FIX (phase7/ki/prompts.js): Alle drei Prompt-Templates (ChatGPT, Claude, Gemini)
  enthalten jetzt explizite ID-Regeln und Wert-Regeln. LLM darf keine IDs erfinden
  und muss Scoring-Werte als plain number liefern.

## v0.9.12.27 - Phase 7 Completion & Audit Fixes
- FIX: Alle 26 HBS-Templates in `module.json` unter `templates` registriert (Foundry v13 Preload-StabilitÃ¤t)
- DOCS: `docs/KI_INTEGRATION_GUIDE.md` erstellt â€” vollstÃ¤ndiger Phase-7-Workflow, API-Referenz, Sicherheitshinweise
- DOCS: `docs/EXPORT_FORMAT_V2.md` erstellt â€” Schema-Referenz JANUS_EXPORT_V2 + JANUS_KI_RESPONSE_V1
- DOCS: `docs/KI_PROMPT_TEMPLATE.md` erstellt â€” Copy-Paste-Vorlagen fÃ¼r Claude, ChatGPT, Gemini
- ROADMAP: Phase 7 Status auf âœ… ABGESCHLOSSEN angehoben

## v0.9.12.26 - Guided Manual Harness Console Commands
- Guided Manual Harness opens more specific target UIs instead of defaulting to the shell/control panel.
- Every guided manual test now exposes copyable console commands/snippets directly in the test UI.
- Added a semi-automatic Group Check step that can spawn the DSA5 group-check chat message from the harness.

## v0.9.12.25 - Guided Manual Harness

- TEST-HARNESS: Guided Manual Tests prÃ¼fen jetzt Vorbedingungen per Knopfdruck und fÃ¼hren durch klickbare Schrittaktionen.
- TEST-HARNESS: Das Harness kann relevante UIs Ã¶ffnen, State-/Diagnostics-/Quest-/User-Snapshots erfassen und als Evidenz speichern.
- I18N/UI: Guided-Manual-OberflÃ¤che erweitert, lokalisiert und fÃ¼r semi-automatische Abnahmen ausgebaut.

## v0.9.12.24 - i18n Completion Pass

- ergÃ¤nzt fehlende i18n-Keys in `lang/de.json` und `lang/en.json` fÃ¼r Command Center, Guided Manual, Sidebar, Status-Aktionen und Settings
- vervollstÃ¤ndigt Lokalisierung fÃ¼r Control-Panel-Statusleiste, Session-Prep-Wizard, Diagnostik-Hinweise und ZeitbestÃ¤tigungsdialog
- ergÃ¤nzt fehlende Setting-Namen/-Hints fÃ¼r Kalender-/Cron-Synchronisation

## v0.9.12.23 - Welle 4 Release Hardening

- TESTS: `core/test/register-builtins.js` trennt shipped Built-ins jetzt explizit in `BUILTIN_AUTO_MODULES` und `BUILTIN_MANUAL_MODULES`.
- TESTS: Der Default-Export registriert beide Buckets weiterhin vollstÃ¤ndig, protokolliert aber die reale Auto-/Manual-Verteilung getrennt.
- DOKU: offensichtlichen Versions-Drift in README, Installation, KI-/User-Handbuch, Index, Release und Manual-Test-Checkliste auf den neuen Stand angehoben.

## v0.9.12.22 - Welle 3 UI + IO Hardening

- Fix: `core/io.js` exportiert wieder einen validen Root-`scoring`-Alias, damit Exportâ†’Import-Roundtrips nicht an der State-Validierung scheitern.
- Fix: `AcademyDataApi` Instanz-Wrapper fÃ¼r Progression/Stats ergÃ¤nzt (`getSocialLinks`, `getMilestones`, `getCollections`, `getSchoolStatsConfig`, `getResourcesConfig`, `buildAcademyStatsSummary`), damit P4B-Progressionstests wieder auf der Ã¶ffentlichen API laufen kÃ¶nnen.
- UI: Inline-Styles aus Control-Panel-/Scoring-Dialogen und Legacy-Tab-Renderern entfernt; dynamische Farben/Breiten laufen jetzt Ã¼ber CSS-Klassen und Datenattribute.
- Doku: `core/io.js` JSDoc fÃ¼r die Ã¶ffentliche Import-/Export-API vervollstÃ¤ndigt.

## v0.9.12.21 - Hotfix Validator Bootstrap

- Fix: `core/validator.js` bootstrap order repaired.
- Root cause: `SCORING_ROOT_SCHEMA` was referenced before initialization, which blocked JANUS7 startup during module load.
- No functional feature changes beyond startup recovery.

## v0.9.12.20 - Welle 2 Data API Split

- Welle 2.2 abgeschlossen: `academy/data-api.js` in Fassade + Helper-Module zerlegt und auf deutlich unter 700 Zeilen reduziert.
- Weltbezogene Schreib-/Override-Logik nach `academy/world-editor.js` verschoben; direkte Imports von `world-seed.js` und `world-overrides.js` aus `academy/data-api.js` entfernt.
- Bootstrap/Loader, Reader-Helper, Store/Cache und statische Content-Registry in eigene Module ausgelagert, ohne Ã¶ffentliche API von `AcademyDataApi` zu brechen.

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

