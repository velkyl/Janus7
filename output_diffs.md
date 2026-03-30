
### File: ui/apps/JanusAcademyDataStudioApp.js
```text
<<<<<<< SEARCH
  { id: 'spellCurriculum', label: 'Lehrpläne (Zauber)', icon: 'fa-diagram-project' },
=======
  { id: 'spellCurriculum', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.LehrpläneZauber"), icon: 'fa-diagram-project' },
>>>>>>> REPLACE

<<<<<<< SEARCH
  { id: 'spellsIndex', label: 'Zauberindex', icon: 'fa-wand-magic-sparkles' },
=======
  { id: 'spellsIndex', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Zauberindex"), icon: 'fa-wand-magic-sparkles' },
>>>>>>> REPLACE

<<<<<<< SEARCH
  { id: 'library-item', label: 'Bibliothek', icon: 'fa-book-open' },
=======
  { id: 'library-item', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Bibliothek"), icon: 'fa-book-open' },
>>>>>>> REPLACE

<<<<<<< SEARCH
  { id: 'npc', label: 'NSCs', icon: 'fa-users' },
=======
  { id: 'npc', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Nscs"), icon: 'fa-users' },
>>>>>>> REPLACE

<<<<<<< SEARCH
  { id: 'location', label: 'Orte', icon: 'fa-map-marker-alt' },
=======
  { id: 'location', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Orte"), icon: 'fa-map-marker-alt' },
>>>>>>> REPLACE

<<<<<<< SEARCH
  { id: 'event', label: 'Events', icon: 'fa-bolt' },
=======
  { id: 'event', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Events"), icon: 'fa-bolt' },
>>>>>>> REPLACE

<<<<<<< SEARCH
  { id: 'calendar', label: 'Kalender', icon: 'fa-calendar' },
=======
  { id: 'calendar', label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Kalender"), icon: 'fa-calendar' },
>>>>>>> REPLACE

<<<<<<< SEARCH
    label: 'Actor',
=======
    label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Actor"),
>>>>>>> REPLACE

<<<<<<< SEARCH
    label: 'Szene',
=======
    label: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Szene"),
>>>>>>> REPLACE

<<<<<<< SEARCH
    window: { title: 'JANUS7 — Academy Data Studio' },
=======
    window: { title: game.i18n.localize("JANUS7.UI.AcademyDataStudio.JanusAcademyDataStudio") },
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: idBase, name: 'Neue Lektion', subject: '', teacherNpcId: '', durationSlots: 1, summary: '' };
=======
        return { id: idBase, name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.NeueLektion"), subject: '', teacherNpcId: '', durationSlots: 1, summary: '' };
>>>>>>> REPLACE

<<<<<<< SEARCH
          name: 'Neuer NSC',
=======
          name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.NeuerNsc"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: idBase, name: 'Neuer Ort', type: '', zone: '', summary: '' };
=======
        return { id: idBase, name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.NeuerOrt"), type: '', zone: '', summary: '' };
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: idBase, name: 'Neues Event', type: '', summary: '' };
=======
        return { id: idBase, name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.NeuesEvent"), type: '', summary: '' };
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: idBase, title: 'Neues Bibliothekselement', type: '', summary: '', tags: [], knowledgeHooks: [] };
=======
        return { id: idBase, title: game.i18n.localize("JANUS7.UI.AcademyDataStudio.NeuesBibliothekselement"), type: '', summary: '', tags: [], knowledgeHooks: [] };
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: 'ACADEMY_SPELL_CURRICULUM', name: 'Zauber-Lehrplan', sections: [] };
=======
        return { id: 'ACADEMY_SPELL_CURRICULUM', name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.ZauberLehrplan"), sections: [] };
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: 'ACADEMY_SPELLS_INDEX', name: 'Zauberindex', entries: [] };
=======
        return { id: 'ACADEMY_SPELLS_INDEX', name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.Zauberindex"), entries: [] };
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: 'ACADEMY_CALENDAR', name: 'Kalender (Academy)', meta: { schemaVersion: '1.0' }, entries: [] };
=======
        return { id: 'ACADEMY_CALENDAR', name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.KalenderAcademy"), meta: { schemaVersion: '1.0' }, entries: [] };
>>>>>>> REPLACE

<<<<<<< SEARCH
        return { id: idBase, name: 'Neuer Datensatz' };
=======
        return { id: idBase, name: game.i18n.localize("JANUS7.UI.AcademyDataStudio.NeuerDatensatz") };
>>>>>>> REPLACE

```

### File: ui/apps/JanusAcademyOverviewApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Academy Overview',
=======
      title: game.i18n.localize("JANUS7.UI.AcademyOverview.JanusAcademyOverview"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusAtmosphereDJApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Atmosphere DJ',
=======
      title: game.i18n.localize("JANUS7.UI.AtmosphereDJ.JanusAtmosphereDj"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusCommandCenterApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 Command Center',
=======
      title: game.i18n.localize("JANUS7.UI.CommandCenter.JanusCommandCenter"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'saveState', label: 'Save State', icon: 'fa-save', available: !!JanusCommands.saveState },
=======
          { id: 'saveState', label: game.i18n.localize("JANUS7.UI.CommandCenter.SaveState"), icon: 'fa-save', available: !!JanusCommands.saveState },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'exportState', label: 'Export State', icon: 'fa-download', available: !!JanusCommands.exportState },
=======
          { id: 'exportState', label: game.i18n.localize("JANUS7.UI.CommandCenter.ExportState"), icon: 'fa-download', available: !!JanusCommands.exportState },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'exportState', label: 'Export State', icon: 'fa-download', available: !!JanusCommands.exportState },
=======
          { id: 'exportState', label: game.i18n.localize("JANUS7.UI.CommandCenter.ExportState"), icon: 'fa-download', available: !!JanusCommands.exportState },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'importState', label: 'Import State', icon: 'fa-upload', available: !!JanusCommands.importState }
=======
          { id: 'importState', label: game.i18n.localize("JANUS7.UI.CommandCenter.ImportState"), icon: 'fa-upload', available: !!JanusCommands.importState }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'importState', label: 'Import State', icon: 'fa-upload', available: !!JanusCommands.importState },
=======
          { id: 'importState', label: game.i18n.localize("JANUS7.UI.CommandCenter.ImportState"), icon: 'fa-upload', available: !!JanusCommands.importState },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'startQuest', label: 'Start Quest', icon: 'fa-play', available: !!JanusCommands.startQuest },
=======
          { id: 'startQuest', label: game.i18n.localize("JANUS7.UI.CommandCenter.StartQuest"), icon: 'fa-play', available: !!JanusCommands.startQuest },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'completeQuest', label: 'Complete Quest', icon: 'fa-check', available: !!JanusCommands.completeQuest },
=======
          { id: 'completeQuest', label: game.i18n.localize("JANUS7.UI.CommandCenter.CompleteQuest"), icon: 'fa-check', available: !!JanusCommands.completeQuest },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'listActiveQuests', label: 'List Active Quests', icon: 'fa-list', available: !!JanusCommands.listActiveQuests },
=======
          { id: 'listActiveQuests', label: game.i18n.localize("JANUS7.UI.CommandCenter.ListActiveQuests"), icon: 'fa-list', available: !!JanusCommands.listActiveQuests },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'exportQuests', label: 'Export Quests', icon: 'fa-download', available: !!JanusCommands.exportQuests },
=======
          { id: 'exportQuests', label: game.i18n.localize("JANUS7.UI.CommandCenter.ExportQuests"), icon: 'fa-download', available: !!JanusCommands.exportQuests },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'importQuests', label: 'Import Quests', icon: 'fa-upload', available: !!JanusCommands.importQuests }
=======
          { id: 'importQuests', label: game.i18n.localize("JANUS7.UI.CommandCenter.ImportQuests"), icon: 'fa-upload', available: !!JanusCommands.importQuests }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'advanceSlot', label: 'Advance Slot', icon: 'fa-forward', available: !!JanusCommands.advanceSlot },
=======
          { id: 'advanceSlot', label: game.i18n.localize("JANUS7.UI.CommandCenter.AdvanceSlot"), icon: 'fa-forward', available: !!JanusCommands.advanceSlot },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'advancePhase', label: 'Advance Phase', icon: 'fa-forward-step', available: !!JanusCommands.advancePhase },
=======
          { id: 'advancePhase', label: game.i18n.localize("JANUS7.UI.CommandCenter.AdvancePhase"), icon: 'fa-forward-step', available: !!JanusCommands.advancePhase },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'advanceDay', label: 'Advance Day', icon: 'fa-calendar-day', available: !!JanusCommands.advanceDay },
=======
          { id: 'advanceDay', label: game.i18n.localize("JANUS7.UI.CommandCenter.AdvanceDay"), icon: 'fa-calendar-day', available: !!JanusCommands.advanceDay },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'resetCalendar', label: 'Reset Calendar', icon: 'fa-undo', available: !!JanusCommands.resetCalendar },
=======
          { id: 'resetCalendar', label: game.i18n.localize("JANUS7.UI.CommandCenter.ResetCalendar"), icon: 'fa-undo', available: !!JanusCommands.resetCalendar },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'syncCalendar', label: 'Sync Calendar', icon: 'fa-sync', available: !!JanusCommands.syncCalendar }
=======
          { id: 'syncCalendar', label: game.i18n.localize("JANUS7.UI.CommandCenter.SyncCalendar"), icon: 'fa-sync', available: !!JanusCommands.syncCalendar }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'exportAcademy', label: 'Export Academy', icon: 'fa-school', available: !!JanusCommands.exportAcademy },
=======
          { id: 'exportAcademy', label: game.i18n.localize("JANUS7.UI.CommandCenter.ExportAcademy"), icon: 'fa-school', available: !!JanusCommands.exportAcademy },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'validateIO', label: 'Validate IO', icon: 'fa-check', available: !!JanusCommands.validateIO }
=======
          { id: 'validateIO', label: game.i18n.localize("JANUS7.UI.CommandCenter.ValidateIo"), icon: 'fa-check', available: !!JanusCommands.validateIO }
>>>>>>> REPLACE

<<<<<<< SEARCH
        label: 'Phase 7 · KI Roundtrip',
=======
        label: game.i18n.localize("JANUS7.UI.CommandCenter.PhaseKiRoundtrip"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openKiRoundtrip', label: 'Open KI Roundtrip', icon: 'fa-brain', available: phase7Enabled && !!JanusCommands.openKiRoundtrip },
=======
          { id: 'openKiRoundtrip', label: game.i18n.localize("JANUS7.UI.CommandCenter.OpenKiRoundtrip"), icon: 'fa-brain', available: phase7Enabled && !!JanusCommands.openKiRoundtrip },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openKiBackupManager', label: 'KI Backup Manager', icon: 'fa-life-ring', available: phase7Enabled && !!JanusCommands.openKiBackupManager }
=======
          { id: 'openKiBackupManager', label: game.i18n.localize("JANUS7.UI.CommandCenter.KiBackupManager"), icon: 'fa-life-ring', available: phase7Enabled && !!JanusCommands.openKiBackupManager }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openKiBackupManager',       label: 'KI Backup Manager',           icon: 'fa-life-ring', available: !!JanusCommands.openKiBackupManager },
=======
          { id: 'openKiBackupManager',       label: game.i18n.localize("JANUS7.UI.CommandCenter.KiBackupManager"),           icon: 'fa-life-ring', available: !!JanusCommands.openKiBackupManager },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'bridgeDiagnostics', label: 'Bridge Diagnostics', icon: 'fa-stethoscope', available: !!JanusCommands.bridgeDiagnostics },
=======
          { id: 'bridgeDiagnostics', label: game.i18n.localize("JANUS7.UI.CommandCenter.BridgeDiagnostics"), icon: 'fa-stethoscope', available: !!JanusCommands.bridgeDiagnostics },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'bridgeActorLookup', label: 'Actor Lookup', icon: 'fa-user', available: !!JanusCommands.bridgeActorLookup },
=======
          { id: 'bridgeActorLookup', label: game.i18n.localize("JANUS7.UI.CommandCenter.ActorLookup"), icon: 'fa-user', available: !!JanusCommands.bridgeActorLookup },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'bridgeRollTest', label: 'Roll Test', icon: 'fa-dice', available: !!JanusCommands.bridgeRollTest }
=======
          { id: 'bridgeRollTest', label: game.i18n.localize("JANUS7.UI.CommandCenter.RollTest"), icon: 'fa-dice', available: !!JanusCommands.bridgeRollTest }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'traceUIActions', label: 'Trace UI Actions', icon: 'fa-search', available: !!JanusCommands.traceUIActions },
=======
          { id: 'traceUIActions', label: game.i18n.localize("JANUS7.UI.CommandCenter.TraceUiActions"), icon: 'fa-search', available: !!JanusCommands.traceUIActions },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'viewActionLog', label: 'View Action Log', icon: 'fa-list', available: !!JanusCommands.viewActionLog }
=======
          { id: 'viewActionLog', label: game.i18n.localize("JANUS7.UI.CommandCenter.ViewActionLog"), icon: 'fa-list', available: !!JanusCommands.viewActionLog }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openTestHarness', label: 'Open Test Harness', icon: 'fa-vial', available: !!JanusCommands.openTestHarness },
=======
          { id: 'openTestHarness', label: game.i18n.localize("JANUS7.UI.CommandCenter.OpenTestHarness"), icon: 'fa-vial', available: !!JanusCommands.openTestHarness },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'runSmokeTests', label: 'Run Smoke Tests', icon: 'fa-flask', available: !!JanusCommands.runSmokeTests },
=======
          { id: 'runSmokeTests', label: game.i18n.localize("JANUS7.UI.CommandCenter.RunSmokeTests"), icon: 'fa-flask', available: !!JanusCommands.runSmokeTests },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'runFullCatalog', label: 'Run Full Catalog', icon: 'fa-list-check', available: !!JanusCommands.runFullCatalog }
=======
          { id: 'runFullCatalog', label: game.i18n.localize("JANUS7.UI.CommandCenter.RunFullCatalog"), icon: 'fa-list-check', available: !!JanusCommands.runFullCatalog }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'browseLessons', label: 'Browse Lessons', icon: 'fa-book', available: !!JanusCommands.browseLessons },
=======
          { id: 'browseLessons', label: game.i18n.localize("JANUS7.UI.CommandCenter.BrowseLessons"), icon: 'fa-book', available: !!JanusCommands.browseLessons },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'browseNPCs', label: 'Browse NPCs', icon: 'fa-users', available: !!JanusCommands.browseNPCs },
=======
          { id: 'browseNPCs', label: game.i18n.localize("JANUS7.UI.CommandCenter.BrowseNpcs"), icon: 'fa-users', available: !!JanusCommands.browseNPCs },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'browseLocations', label: 'Browse Locations', icon: 'fa-map-marker', available: !!JanusCommands.browseLocations },
=======
          { id: 'browseLocations', label: game.i18n.localize("JANUS7.UI.CommandCenter.BrowseLocations"), icon: 'fa-map-marker', available: !!JanusCommands.browseLocations },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'browseSpells', label: 'Browse Spells', icon: 'fa-wand-magic', available: !!JanusCommands.browseSpells }
=======
          { id: 'browseSpells', label: game.i18n.localize("JANUS7.UI.CommandCenter.BrowseSpells"), icon: 'fa-wand-magic', available: !!JanusCommands.browseSpells }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'applyMood', label: 'Apply Mood', icon: 'fa-music', available: !!JanusCommands.applyMood },
=======
          { id: 'applyMood', label: game.i18n.localize("JANUS7.UI.CommandCenter.ApplyMood"), icon: 'fa-music', available: !!JanusCommands.applyMood },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'stopAtmosphere', label: 'Stop Atmosphere', icon: 'fa-stop', available: !!JanusCommands.stopAtmosphere },
=======
          { id: 'stopAtmosphere', label: game.i18n.localize("JANUS7.UI.CommandCenter.StopAtmosphere"), icon: 'fa-stop', available: !!JanusCommands.stopAtmosphere },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'setAtmosphereVolume', label: 'Set Volume', icon: 'fa-volume-up', available: !!JanusCommands.setAtmosphereVolume }
=======
          { id: 'setAtmosphereVolume', label: game.i18n.localize("JANUS7.UI.CommandCenter.SetVolume"), icon: 'fa-volume-up', available: !!JanusCommands.setAtmosphereVolume }
>>>>>>> REPLACE

<<<<<<< SEARCH
        label: 'Tools & Konfiguration',
=======
        label: game.i18n.localize("JANUS7.UI.CommandCenter.ToolsKonfiguration"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openSyncPanel',   label: 'Welt-Synchronisation', icon: 'fa-sync-alt',    available: !!JanusCommands.openSyncPanel },
=======
          { id: 'openSyncPanel',   label: game.i18n.localize("JANUS7.UI.CommandCenter.WeltSynchronisation"), icon: 'fa-sync-alt',    available: !!JanusCommands.openSyncPanel },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openConfigPanel', label: 'Konfiguration',        icon: 'fa-sliders-h',   available: !!JanusCommands.openConfigPanel },
=======
          { id: 'openConfigPanel', label: game.i18n.localize("JANUS7.UI.CommandCenter.Konfiguration"),        icon: 'fa-sliders-h',   available: !!JanusCommands.openConfigPanel },
>>>>>>> REPLACE

<<<<<<< SEARCH
                    { id: 'seedImportAcademyToJournals', label: 'Seed-Import: Academy→Journals', icon: 'fa-seedling',    available: !!JanusCommands.seedImportAcademyToJournals },
=======
                    { id: 'seedImportAcademyToJournals', label: game.i18n.localize("JANUS7.UI.CommandCenter.SeedImportAcademyJournals"), icon: 'fa-seedling',    available: !!JanusCommands.seedImportAcademyToJournals },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openAcademyDataStudio',       label: 'Academy Data Studio',          icon: 'fa-pen-to-square', available: !!JanusCommands.openAcademyDataStudio },
=======
          { id: 'openAcademyDataStudio',       label: game.i18n.localize("JANUS7.UI.CommandCenter.AcademyDataStudio"),          icon: 'fa-pen-to-square', available: !!JanusCommands.openAcademyDataStudio },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openSessionPrepWizard',      label: 'Session Prep Wizard',         icon: 'fa-wand-sparkles', available: !!JanusCommands.openSessionPrepWizard },
=======
          { id: 'openSessionPrepWizard',      label: game.i18n.localize("JANUS7.UI.CommandCenter.SessionPrepWizard"),         icon: 'fa-wand-sparkles', available: !!JanusCommands.openSessionPrepWizard },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'openTestHarness',            label: 'Test-Ergebnisse',              icon: 'fa-vial',        available: !!JanusCommands.openTestHarness },
=======
          { id: 'openTestHarness',            label: game.i18n.localize("JANUS7.UI.CommandCenter.TestErgebnisse"),              icon: 'fa-vial',        available: !!JanusCommands.openTestHarness },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'resetWorld', label: 'Reset World State', icon: 'fa-trash', available: !!JanusCommands.resetWorld },
=======
          { id: 'resetWorld', label: game.i18n.localize("JANUS7.UI.CommandCenter.ResetWorldState"), icon: 'fa-trash', available: !!JanusCommands.resetWorld },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'createBackup', label: 'Create Backup', icon: 'fa-save', available: !!JanusCommands.createBackup },
=======
          { id: 'createBackup', label: game.i18n.localize("JANUS7.UI.CommandCenter.CreateBackup"), icon: 'fa-save', available: !!JanusCommands.createBackup },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { id: 'restoreBackup', label: 'Restore Backup', icon: 'fa-undo', available: !!JanusCommands.restoreBackup }
=======
          { id: 'restoreBackup', label: game.i18n.localize("JANUS7.UI.CommandCenter.RestoreBackup"), icon: 'fa-undo', available: !!JanusCommands.restoreBackup }
>>>>>>> REPLACE

```

### File: ui/apps/JanusConfigPanelApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Konfiguration',
=======
      title: game.i18n.localize("JANUS7.UI.ConfigPanel.JanusKonfiguration"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusEnrollmentApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Immatrikulations-Scanner (NSC Generator)',
=======
      title: game.i18n.localize("JANUS7.UI.Enrollment.JanusImmatrikulationsScannerNsc"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusGuidedManualTestApp.js
```text
<<<<<<< SEARCH
    case 'PASS': return { label: 'PASS', css: 'pass', icon: '✅' };
=======
    case 'PASS': return { label: game.i18n.localize("JANUS7.UI.GuidedManualTest.Pass"), css: 'pass', icon: '✅' };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'FAIL': return { label: 'FAIL', css: 'fail', icon: '❌' };
=======
    case 'FAIL': return { label: game.i18n.localize("JANUS7.UI.GuidedManualTest.Fail"), css: 'fail', icon: '❌' };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'SKIP': return { label: 'SKIP', css: 'skip', icon: '⏭️' };
=======
    case 'SKIP': return { label: game.i18n.localize("JANUS7.UI.GuidedManualTest.Skip"), css: 'skip', icon: '⏭️' };
>>>>>>> REPLACE

<<<<<<< SEARCH
      title: 'JANUS7 · Guided Manual Tests',
=======
      title: game.i18n.localize("JANUS7.UI.GuidedManualTest.JanusGuidedManualTests"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusKiBackupManagerApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · KI Backup Manager',
=======
      title: game.i18n.localize("JANUS7.UI.KiBackupManager.JanusKiBackupManager"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          window: { title: 'KI-Backup wiederherstellen' },
=======
          window: { title: game.i18n.localize("JANUS7.UI.KiBackupManager.KiBackupWiederherstellen") },
>>>>>>> REPLACE

<<<<<<< SEARCH
          yes: { label: 'Wiederherstellen' },
=======
          yes: { label: game.i18n.localize("JANUS7.UI.KiBackupManager.Wiederherstellen") },
>>>>>>> REPLACE

<<<<<<< SEARCH
          no: { label: 'Abbrechen' },
=======
          no: { label: game.i18n.localize("JANUS7.UI.KiBackupManager.Abbrechen") },
>>>>>>> REPLACE

```

### File: ui/apps/JanusLessonLibraryApp.js
```text
<<<<<<< SEARCH
    window: { title: 'JANUS7 - Lesson Library', icon: 'fas fa-book-open', resizable: true },
=======
    window: { title: game.i18n.localize("JANUS7.UI.LessonLibrary.JanusLessonLibrary"), icon: 'fas fa-book-open', resizable: true },
>>>>>>> REPLACE

```

### File: ui/apps/JanusLibraryBrowserApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Director Library Spotlight',
=======
      title: game.i18n.localize("JANUS7.UI.LibraryBrowser.JanusDirectorLibrarySpotlight"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusQuartermasterApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Akademie-Quartiermeister',
=======
      title: game.i18n.localize("JANUS7.UI.Quartermaster.JanusAkademieQuartiermeister"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusScoringViewApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 — Scoring',
=======
      title: game.i18n.localize("JANUS7.UI.ScoringView.JanusScoring"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          label: 'Anlegen',
=======
          label: game.i18n.localize("JANUS7.UI.ScoringView.Anlegen"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      const res = await Dialog.prompt({ title: 'JANUS7 — Zirkel/Haus anlegen', content, label: 'Anlegen' }).catch(() => null);
=======
      const res = await Dialog.prompt({ title: 'JANUS7 — Zirkel/Haus anlegen', content, label: game.i18n.localize("JANUS7.UI.ScoringView.Anlegen") }).catch(() => null);
>>>>>>> REPLACE

<<<<<<< SEARCH
          yes: { label: 'Löschen', icon: 'fas fa-trash' },
=======
          yes: { label: game.i18n.localize("JANUS7.UI.ScoringView.Löschen"), icon: 'fas fa-trash' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          no:  { label: 'Abbrechen' },
=======
          no:  { label: game.i18n.localize("JANUS7.UI.ScoringView.Abbrechen") },
>>>>>>> REPLACE

```

### File: ui/apps/JanusSettingsTestHarnessApp.js
```text
<<<<<<< SEARCH
    window: { title: 'JANUS7 – Test Harness' },
=======
    window: { title: game.i18n.localize("JANUS7.UI.SettingsTestHarness.JanusTestHarness") },
>>>>>>> REPLACE

```

### File: ui/apps/JanusShellApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Zauberakademie OS (Director Shell)',
=======
      title: game.i18n.localize("JANUS7.UI.Shell.JanusZauberakademieOsDirector"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { value: 'npcs',      label: 'NPCs (Actor)' },
=======
      { value: 'npcs',      label: game.i18n.localize("JANUS7.UI.Shell.NpcsActor") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { value: 'pcs',       label: 'PCs (Actor)' },
=======
      { value: 'pcs',       label: game.i18n.localize("JANUS7.UI.Shell.PcsActor") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { value: 'scenes',    label: 'Szenen (Scene)' },
=======
      { value: 'scenes',    label: game.i18n.localize("JANUS7.UI.Shell.SzenenScene") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { value: 'playlists', label: 'Playlists (Playlist)' },
=======
      { value: 'playlists', label: game.i18n.localize("JANUS7.UI.Shell.PlaylistsPlaylist") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { value: 'journals',  label: 'Journals (JournalEntry)' },
=======
      { value: 'journals',  label: game.i18n.localize("JANUS7.UI.Shell.JournalsJournalentry") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { value: 'items',     label: 'Items (Item)' },
=======
      { value: 'items',     label: game.i18n.localize("JANUS7.UI.Shell.ItemsItem") },
>>>>>>> REPLACE

<<<<<<< SEARCH
    const res = await D2.prompt({ window: { title: 'JANUS7 — Drag&Drop Link' }, content, ok: { label: 'Link setzen' }, rejectClose: false, modal: true }).catch(() => null);
=======
    const res = await D2.prompt({ window: { title: game.i18n.localize("JANUS7.UI.Shell.JanusDragDropLink") }, content, ok: { label: 'Link setzen' }, rejectClose: false, modal: true }).catch(() => null);
>>>>>>> REPLACE

<<<<<<< SEARCH
    const res = await D2.prompt({ window: { title: game.i18n.localize("JANUS7.UI.Shell.JanusDragDropLink") }, content, ok: { label: 'Link setzen' }, rejectClose: false, modal: true }).catch(() => null);
=======
    const res = await D2.prompt({ window: { title: game.i18n.localize("JANUS7.UI.Shell.JanusDragDropLink") }, content, ok: { label: game.i18n.localize("JANUS7.UI.Shell.LinkSetzen") }, rejectClose: false, modal: true }).catch(() => null);
>>>>>>> REPLACE

<<<<<<< SEARCH
    const je = await JournalEntry.create({ name: `Stunde — ${slotKey}`, pages: [{ name: 'Inhalt', type: 'text', text: { content, format: 1 } }] });
=======
    const je = await JournalEntry.create({ name: `Stunde — ${slotKey}`, pages: [{ name: game.i18n.localize("JANUS7.UI.Shell.Inhalt"), type: 'text', text: { content, format: 1 } }] });
>>>>>>> REPLACE

```

### File: ui/apps/JanusSocialViewApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Social',
=======
      title: game.i18n.localize("JANUS7.UI.SocialView.JanusSocial"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusStateInspectorApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · State Inspector (Read-Only)',
=======
      title: game.i18n.localize("JANUS7.UI.StateInspector.JanusStateInspectorRead"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusStudentArchiveApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Akademie-Archiv (Lore & Wiki)',
=======
      title: game.i18n.localize("JANUS7.UI.StudentArchive.JanusAkademieArchivLore"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusSyncPanelApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · Welt-Synchronisation',
=======
      title: game.i18n.localize("JANUS7.UI.SyncPanel.JanusWeltSynchronisation"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        { key: 'npcs',      label: 'NSCs',            icon: 'fa-user-friends' },
=======
        { key: 'npcs',      label: game.i18n.localize("JANUS7.UI.SyncPanel.Nscs"),            icon: 'fa-user-friends' },
>>>>>>> REPLACE

<<<<<<< SEARCH
        { key: 'playlists', label: 'Playlisten',       icon: 'fa-music' },
=======
        { key: 'playlists', label: game.i18n.localize("JANUS7.UI.SyncPanel.Playlisten"),       icon: 'fa-music' },
>>>>>>> REPLACE

<<<<<<< SEARCH
        { key: 'library',   label: 'Bibliothek',       icon: 'fa-book' },
=======
        { key: 'library',   label: game.i18n.localize("JANUS7.UI.SyncPanel.Bibliothek"),       icon: 'fa-book' },
>>>>>>> REPLACE

<<<<<<< SEARCH
        { key: 'alchemy',   label: 'Alchemie',         icon: 'fa-flask' },
=======
        { key: 'alchemy',   label: game.i18n.localize("JANUS7.UI.SyncPanel.Alchemie"),         icon: 'fa-flask' },
>>>>>>> REPLACE

<<<<<<< SEARCH
        { key: 'spells',    label: 'Zauber (Lookup)',   icon: 'fa-hat-wizard' },
=======
        { key: 'spells',    label: game.i18n.localize("JANUS7.UI.SyncPanel.ZauberLookup"),   icon: 'fa-hat-wizard' },
>>>>>>> REPLACE

<<<<<<< SEARCH
        { key: 'lessons',   label: 'Lektionen',        icon: 'fa-chalkboard-teacher' },
=======
        { key: 'lessons',   label: game.i18n.localize("JANUS7.UI.SyncPanel.Lektionen"),        icon: 'fa-chalkboard-teacher' },
>>>>>>> REPLACE

<<<<<<< SEARCH
        label: 'Verknüpfen',
=======
        label: game.i18n.localize("JANUS7.UI.SyncPanel.Verknüpfen"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      no:  { label: 'Abbrechen' },
=======
      no:  { label: game.i18n.localize("JANUS7.UI.SyncPanel.Abbrechen") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      no:  { label: 'Abbrechen' },
=======
      no:  { label: game.i18n.localize("JANUS7.UI.SyncPanel.Abbrechen") },
>>>>>>> REPLACE

<<<<<<< SEARCH
      title:   'Verknüpfung aufheben',
=======
      title: game.i18n.localize("JANUS7.UI.SyncPanel.VerknüpfungAufheben"),
>>>>>>> REPLACE

```

### File: ui/apps/JanusTestResultApp.js
```text
<<<<<<< SEARCH
    case 'PASS': return { icon: '✅', css: 'pass', label: 'PASS' };
=======
    case 'PASS': return { icon: '✅', css: 'pass', label: game.i18n.localize("JANUS7.UI.TestResult.Pass") };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'FAIL': return { icon: '❌', css: 'fail', label: 'FAIL' };
=======
    case 'FAIL': return { icon: '❌', css: 'fail', label: game.i18n.localize("JANUS7.UI.TestResult.Fail") };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'ERROR': return { icon: '⛔', css: 'error', label: 'ERROR' };
=======
    case 'ERROR': return { icon: '⛔', css: 'error', label: game.i18n.localize("JANUS7.UI.TestResult.Error") };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'SKIP': return { icon: '⏭️', css: 'skip', label: 'SKIP' };
=======
    case 'SKIP': return { icon: '⏭️', css: 'skip', label: game.i18n.localize("JANUS7.UI.TestResult.Skip") };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'MANUAL': return { icon: '🧭', css: 'manual', label: 'MANUAL' };
=======
    case 'MANUAL': return { icon: '🧭', css: 'manual', label: game.i18n.localize("JANUS7.UI.TestResult.Manual") };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'CATALOG': return { icon: '🗂️', css: 'catalog', label: 'CATALOG' };
=======
    case 'CATALOG': return { icon: '🗂️', css: 'catalog', label: game.i18n.localize("JANUS7.UI.TestResult.Catalog") };
>>>>>>> REPLACE

<<<<<<< SEARCH
    case 'IMPORT_FAILED': return { icon: '📦', css: 'import-failed', label: 'IMPORT_FAILED' };
=======
    case 'IMPORT_FAILED': return { icon: '📦', css: 'import-failed', label: game.i18n.localize("JANUS7.UI.TestResult.ImportFailed") };
>>>>>>> REPLACE

<<<<<<< SEARCH
      title: 'JANUS7 · Test Results',
=======
      title: game.i18n.localize("JANUS7.UI.TestResult.JanusTestResults"),
>>>>>>> REPLACE

<<<<<<< SEARCH
    const phaseOptions = [{ value: 'all', label: 'Alle', selected: this._filters.phase === 'all' }, ...availablePhases.map((value) => ({ value, label: value, selected: this._filters.phase === value }))];
=======
    const phaseOptions = [{ value: 'all', label: game.i18n.localize("JANUS7.UI.TestResult.Alle"), selected: this._filters.phase === 'all' }, ...availablePhases.map((value) => ({ value, label: value, selected: this._filters.phase === value }))];
>>>>>>> REPLACE

<<<<<<< SEARCH
    const suiteOptions = [{ value: 'all', label: 'Alle', selected: this._filters.suiteClass === 'all' }, ...availableSuites.map((value) => ({ value, label: value, selected: this._filters.suiteClass === value }))];
=======
    const suiteOptions = [{ value: 'all', label: game.i18n.localize("JANUS7.UI.TestResult.Alle"), selected: this._filters.suiteClass === 'all' }, ...availableSuites.map((value) => ({ value, label: value, selected: this._filters.suiteClass === value }))];
>>>>>>> REPLACE

<<<<<<< SEARCH
    const statusOptions = [{ value: 'all', label: 'Alle', selected: this._filters.status === 'all' }, ...availableStatuses.map((value) => ({ value, label: value, selected: this._filters.status === value }))];
=======
    const statusOptions = [{ value: 'all', label: game.i18n.localize("JANUS7.UI.TestResult.Alle"), selected: this._filters.status === 'all' }, ...availableStatuses.map((value) => ({ value, label: value, selected: this._filters.status === value }))];
>>>>>>> REPLACE

```

### File: ui/apps/ki-roundtrip/JanusKiRoundtripApp.js
```text
<<<<<<< SEARCH
      title: 'JANUS7 · KI Roundtrip',
=======
      title: game.i18n.localize("JANUS7.UI.KiRoundtrip.JanusKiRoundtrip"),
>>>>>>> REPLACE

```

### File: ui/commands/quest.js
```text
<<<<<<< SEARCH
      title: 'Start Quest',
=======
      title: game.i18n.localize("JANUS7.UI.Quest.StartQuest"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      label: 'Quest ID',
=======
      label: game.i18n.localize("JANUS7.UI.Quest.QuestId"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      label: 'Quest ID'
=======
      label: game.i18n.localize("JANUS7.UI.Quest.QuestId")
>>>>>>> REPLACE

<<<<<<< SEARCH
      title: 'Complete Quest',
=======
      title: game.i18n.localize("JANUS7.UI.Quest.CompleteQuest"),
>>>>>>> REPLACE

<<<<<<< SEARCH
    const eventId = dataset.eventId || await JanusUI.prompt({ title: 'Event Popup', label: 'Event ID' });
=======
    const eventId = dataset.eventId || await JanusUI.prompt({ title: game.i18n.localize("JANUS7.UI.Quest.EventPopup"), label: 'Event ID' });
>>>>>>> REPLACE

<<<<<<< SEARCH
    const eventId = dataset.eventId || await JanusUI.prompt({ title: game.i18n.localize("JANUS7.UI.Quest.EventPopup"), label: 'Event ID' });
=======
    const eventId = dataset.eventId || await JanusUI.prompt({ title: game.i18n.localize("JANUS7.UI.Quest.EventPopup"), label: game.i18n.localize("JANUS7.UI.Quest.EventId") });
>>>>>>> REPLACE

```

### File: ui/commands/state.js
```text
<<<<<<< SEARCH
          title: 'JANUS7 – State importieren',
=======
          title: game.i18n.localize("JANUS7.UI.State.JanusStateImportieren"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          label: 'State-JSON',
=======
          label: game.i18n.localize("JANUS7.UI.State.StateJson"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          title: 'JANUS7 – Academy Export',
=======
          title: game.i18n.localize("JANUS7.UI.State.JanusAcademyExport"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          label: 'Schließen',
=======
          label: game.i18n.localize("JANUS7.UI.State.Schließen"),
>>>>>>> REPLACE

```

### File: ui/commands/system.js
```text
<<<<<<< SEARCH
      title: 'Actor Lookup',
=======
      title: game.i18n.localize("JANUS7.UI.System.ActorLookup"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      label: 'Actor Name'
=======
      label: game.i18n.localize("JANUS7.UI.System.ActorName")
>>>>>>> REPLACE

<<<<<<< SEARCH
          window: { title: 'JANUS7 – World State zurücksetzen' },
=======
          window: { title: game.i18n.localize("JANUS7.UI.System.JanusWorldStateZurücksetzen") },
>>>>>>> REPLACE

<<<<<<< SEARCH
          yes: { label: 'Zurücksetzen', icon: 'fas fa-trash' },
=======
          yes: { label: game.i18n.localize("JANUS7.UI.System.Zurücksetzen"), icon: 'fas fa-trash' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          no: { label: 'Abbrechen' },
=======
          no: { label: game.i18n.localize("JANUS7.UI.System.Abbrechen") },
>>>>>>> REPLACE

<<<<<<< SEARCH
          title: 'JANUS7 – State Backup',
=======
          title: game.i18n.localize("JANUS7.UI.System.JanusStateBackup"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'JANUS7 – State Restore',
=======
        title: game.i18n.localize("JANUS7.UI.System.JanusStateRestore"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        label: 'State-JSON einfügen',
=======
        label: game.i18n.localize("JANUS7.UI.System.StateJsonEinfügen"),
>>>>>>> REPLACE

```

### File: ui/helpers.js
```text
<<<<<<< SEARCH
          { action: 'no', label: 'Nein', default: false }
=======
          { action: 'no', label: game.i18n.localize("JANUS7.UI.Helpers.Nein"), default: false }
>>>>>>> REPLACE

```

### File: ui/layer/bridge.js
```text
<<<<<<< SEARCH
        name: 'openJanusShell',
=======
        name: game.i18n.localize("JANUS7.UI.Bridge.Openjanusshell"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'JANUS Shell öffnen',
=======
        title: game.i18n.localize("JANUS7.UI.Bridge.JanusShellÖffnen"),
>>>>>>> REPLACE

```

### File: ui/layer/director-context.js
```text
<<<<<<< SEARCH
    return { label: 'Quest-Vorschlag prÃ¼fen', reason: 'Es liegen neue Quest-VorschlÃ¤ge vor.', action: 'directorAcceptQuestSuggestion' };
=======
    return { label: game.i18n.localize("JANUS7.UI.Directorcontext.QuestVorschlagPrFen"), reason: 'Es liegen neue Quest-VorschlÃ¤ge vor.', action: 'directorAcceptQuestSuggestion' };
>>>>>>> REPLACE

<<<<<<< SEARCH
    return { label: 'Queue verarbeiten', reason: 'Es warten geplante Ereignisse auf AusfÃ¼hrung.', action: 'directorProcessQueue' };
=======
    return { label: game.i18n.localize("JANUS7.UI.Directorcontext.QueueVerarbeiten"), reason: 'Es warten geplante Ereignisse auf AusfÃ¼hrung.', action: 'directorProcessQueue' };
>>>>>>> REPLACE

<<<<<<< SEARCH
    return { label: 'Social-Auswertung prÃ¼fen', reason: 'Neue Social-Fortschritte wurden erzeugt.', action: 'directorEvaluateSocial' };
=======
    return { label: game.i18n.localize("JANUS7.UI.Directorcontext.SocialAuswertungPrFen"), reason: 'Neue Social-Fortschritte wurden erzeugt.', action: 'directorEvaluateSocial' };
>>>>>>> REPLACE

<<<<<<< SEARCH
    return { label: 'Unterricht ausfÃ¼hren', reason: 'Im aktuellen Slot ist Unterricht hinterlegt.', action: 'directorRunLesson' };
=======
    return { label: game.i18n.localize("JANUS7.UI.Directorcontext.UnterrichtAusfHren"), reason: 'Im aktuellen Slot ist Unterricht hinterlegt.', action: 'directorRunLesson' };
>>>>>>> REPLACE

<<<<<<< SEARCH
  return { label: 'Tageslauf fortsetzen', reason: 'Keine offenen PrioritÃ¤ten erkannt.', action: 'directorRunbookNext' };
=======
  return { label: game.i18n.localize("JANUS7.UI.Directorcontext.TageslaufFortsetzen"), reason: 'Keine offenen PrioritÃ¤ten erkannt.', action: 'directorRunbookNext' };
>>>>>>> REPLACE

<<<<<<< SEARCH
    { id: 'queue', label: 'Queue', value: Number(directorRuntime?.queuedEventCount ?? 0) },
=======
    { id: 'queue', label: game.i18n.localize("JANUS7.UI.Directorcontext.Queue"), value: Number(directorRuntime?.queuedEventCount ?? 0) },
>>>>>>> REPLACE

<<<<<<< SEARCH
    { id: 'lessons', label: 'Lessons', value: Number(directorRuntime?.lessonCount ?? 0) },
=======
    { id: 'lessons', label: game.i18n.localize("JANUS7.UI.Directorcontext.Lessons"), value: Number(directorRuntime?.lessonCount ?? 0) },
>>>>>>> REPLACE

<<<<<<< SEARCH
    { id: 'quests', label: 'Quests', value: Number(directorRuntime?.activeQuestCount ?? 0) }
=======
    { id: 'quests', label: game.i18n.localize("JANUS7.UI.Directorcontext.Quests"), value: Number(directorRuntime?.activeQuestCount ?? 0) }
>>>>>>> REPLACE

```

### File: ui/layer/panel-registry.js
```text
<<<<<<< SEARCH
      { label: 'Führend', value: top?.name ?? top?.id ?? '—' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Führend"), value: top?.name ?? top?.id ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Punkte', value: Number(top?.score ?? 0) }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Punkte"), value: Number(top?.score ?? 0) }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Beziehungen', value: links.length || 0 },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Beziehungen"), value: links.length || 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Status', value: engine?.academy?.social ? 'Aktiv' : 'Fehlt' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Status"), value: engine?.academy?.social ? 'Aktiv' : 'Fehlt' }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Atmosphäre', value: atmo ? 'Aktiv' : 'Fehlt' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Atmosphäre"), value: atmo ? 'Aktiv' : 'Fehlt' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Mood', value: lastMood?.title ?? lastMood?.id ?? '—' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Mood"), value: lastMood?.title ?? lastMood?.id ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Auto', value: atmo?.auto === false ? 'Aus' : 'An' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Auto"), value: atmo?.auto === false ? 'Aus' : 'An' }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Overlay', value: atmo?.overlayEnabled ? 'An' : 'Aus' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Overlay"), value: atmo?.overlayEnabled ? 'An' : 'Aus' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Provider', value: atmo?.provider?.id ?? atmo?.providerId ?? '—' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Provider"), value: atmo?.provider?.id ?? atmo?.providerId ?? '—' }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Quest Engine', value: quests ? 'Aktiv' : 'Fehlt' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.QuestEngine"), value: quests ? 'Aktiv' : 'Fehlt' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Aktiv', value: active.length || 0 }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Aktiv"), value: active.length || 0 }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Tag', value: time?.dayName ?? time?.day ?? '—' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Tag"), value: time?.dayName ?? time?.day ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Phase', value: time?.phase ?? time?.slotName ?? '—' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Phase"), value: time?.phase ?? time?.slotName ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Dirty', value: diagnostics?.stateStatus ?? diagnostics?.dirty ?? '—' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Dirty"), value: diagnostics?.stateStatus ?? diagnostics?.dirty ?? '—' }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Version', value: game?.modules?.get?.('Janus7')?.version ?? '—' },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Version"), value: game?.modules?.get?.('Janus7')?.version ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Welt', value: game?.world?.title ?? game?.world?.id ?? '—' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Welt"), value: game?.world?.title ?? game?.world?.id ?? '—' }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Nodes', value: graph?.nodes ?? graph?.nodeCount ?? 0 },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Nodes"), value: graph?.nodes ?? graph?.nodeCount ?? 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Edges', value: graph?.edges ?? graph?.edgeCount ?? 0 },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Edges"), value: graph?.edges ?? graph?.edgeCount ?? 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Cache', value: cache?.size ?? 0 }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Cache"), value: cache?.size ?? 0 }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Hits', value: cache?.hits ?? 0 },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Hits"), value: cache?.hits ?? 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Misses', value: cache?.misses ?? 0 },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Misses"), value: cache?.misses ?? 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Invalidations', value: cache?.invalidations ?? 0 }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Invalidations"), value: cache?.invalidations ?? 0 }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Lektionen', value: lessons.length },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Lektionen"), value: lessons.length },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Lektionen', value: ids.length },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Lektionen"), value: ids.length },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'NPCs', value: npcs.length },
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Npcs"), value: npcs.length },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Orte', value: locations.length }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Orte"), value: locations.length }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Akademie-Daten', value: academy ? 'Geladen' : 'Fehlt' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.AkademieDaten"), value: academy ? 'Geladen' : 'Fehlt' }
>>>>>>> REPLACE

<<<<<<< SEARCH
      { label: 'Bibliothek', value: academy ? 'Verfügbar' : 'Fehlt' }
=======
      { label: game.i18n.localize("JANUS7.UI.Panelregistry.Bibliothek"), value: academy ? 'Verfügbar' : 'Fehlt' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Scoring',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Scoring"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'scoringView', label: 'Scoring öffnen', icon: 'fas fa-trophy' }
=======
      { kind: 'openApp', appKey: 'scoringView', label: game.i18n.localize("JANUS7.UI.Panelregistry.ScoringÖffnen"), icon: 'fas fa-trophy' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Social',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Social"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'socialView', label: 'Social View öffnen', icon: 'fas fa-users' }
=======
      { kind: 'openApp', appKey: 'socialView', label: game.i18n.localize("JANUS7.UI.Panelregistry.SocialViewÖffnen"), icon: 'fas fa-users' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Atmosphäre',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Atmosphäre"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'atmosphereDJ', label: 'Atmosphäre öffnen', icon: 'fas fa-music' },
=======
      { kind: 'openApp', appKey: 'atmosphereDJ', label: game.i18n.localize("JANUS7.UI.Panelregistry.AtmosphäreÖffnen"), icon: 'fas fa-music' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'command', command: 'copyDiagnostics', label: 'Diagnose kopieren', icon: 'fas fa-clipboard' }
=======
      { kind: 'command', command: 'copyDiagnostics', label: game.i18n.localize("JANUS7.UI.Panelregistry.DiagnoseKopieren"), icon: 'fas fa-clipboard' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Quests',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Quests"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'command', command: 'listActiveQuests', label: 'Aktive Quests prüfen', icon: 'fas fa-list' },
=======
      { kind: 'command', command: 'listActiveQuests', label: game.i18n.localize("JANUS7.UI.Panelregistry.AktiveQuestsPrüfen"), icon: 'fas fa-list' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'panelAction', action: 'openQuestJournal', label: 'Quest-Journal öffnen', icon: 'fas fa-book-open' }
=======
      { kind: 'panelAction', action: 'openQuestJournal', label: game.i18n.localize("JANUS7.UI.Panelregistry.QuestJournalÖffnen"), icon: 'fas fa-book-open' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'KI Roundtrip',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.KiRoundtrip"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'kiRoundtrip', label: 'KI-Roundtrip öffnen', icon: 'fas fa-robot' },
=======
      { kind: 'openApp', appKey: 'kiRoundtrip', label: game.i18n.localize("JANUS7.UI.Panelregistry.KiRoundtripÖffnen"), icon: 'fas fa-robot' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'kiBackupManager', label: 'Backups öffnen', icon: 'fas fa-life-ring' }
=======
      { kind: 'openApp', appKey: 'kiBackupManager', label: game.i18n.localize("JANUS7.UI.Panelregistry.BackupsÖffnen"), icon: 'fas fa-life-ring' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Sync',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Sync"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'syncPanel', label: 'Sync-Panel öffnen', icon: 'fas fa-link' },
=======
      { kind: 'openApp', appKey: 'syncPanel', label: game.i18n.localize("JANUS7.UI.Panelregistry.SyncPanelÖffnen"), icon: 'fas fa-link' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'command', command: 'saveState', label: 'State speichern', icon: 'fas fa-save' }
=======
      { kind: 'command', command: 'saveState', label: game.i18n.localize("JANUS7.UI.Panelregistry.StateSpeichern"), icon: 'fas fa-save' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'State Inspector',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.StateInspector"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'stateInspector', label: 'State Inspector öffnen', icon: 'fas fa-database' },
=======
      { kind: 'openApp', appKey: 'stateInspector', label: game.i18n.localize("JANUS7.UI.Panelregistry.StateInspectorÖffnen"), icon: 'fas fa-database' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'command', command: 'exportState', label: 'State exportieren', icon: 'fas fa-download' }
=======
      { kind: 'command', command: 'exportState', label: game.i18n.localize("JANUS7.UI.Panelregistry.StateExportieren"), icon: 'fas fa-download' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Konfiguration',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Konfiguration"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'configPanel', label: 'Konfiguration öffnen', icon: 'fas fa-cog' }
=======
      { kind: 'openApp', appKey: 'configPanel', label: game.i18n.localize("JANUS7.UI.Panelregistry.KonfigurationÖffnen"), icon: 'fas fa-cog' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Diagnostik',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Diagnostik"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'commandCenter', label: 'Command Center öffnen', icon: 'fas fa-terminal' },
=======
      { kind: 'openApp', appKey: 'commandCenter', label: game.i18n.localize("JANUS7.UI.Panelregistry.CommandCenterÖffnen"), icon: 'fas fa-terminal' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'panelAction', action: 'graphInvalidate', label: 'Graph-Cache leeren', icon: 'fas fa-broom' },
=======
      { kind: 'panelAction', action: 'graphInvalidate', label: game.i18n.localize("JANUS7.UI.Panelregistry.GraphCacheLeeren"), icon: 'fas fa-broom' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'panelAction', action: 'graphRebuild', label: 'Graph neu aufbauen', icon: 'fas fa-project-diagram' }
=======
      { kind: 'panelAction', action: 'graphRebuild', label: game.i18n.localize("JANUS7.UI.Panelregistry.GraphNeuAufbauen"), icon: 'fas fa-project-diagram' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Session Prep',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.SessionPrep"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'setView', viewId: 'sessionPrep', label: 'Prep Wizard öffnen', icon: 'fas fa-wand-magic-sparkles' }
=======
      { kind: 'setView', viewId: 'sessionPrep', label: game.i18n.localize("JANUS7.UI.Panelregistry.PrepWizardÖffnen"), icon: 'fas fa-wand-magic-sparkles' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Tests',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Tests"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'testResults', label: 'Test Results öffnen', icon: 'fas fa-flask' },
=======
      { kind: 'openApp', appKey: 'testResults', label: game.i18n.localize("JANUS7.UI.Panelregistry.TestResultsÖffnen"), icon: 'fas fa-flask' },
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'guidedManualTests', label: 'Guided Tests öffnen', icon: 'fas fa-person-chalkboard' }
=======
      { kind: 'openApp', appKey: 'guidedManualTests', label: game.i18n.localize("JANUS7.UI.Panelregistry.GuidedTestsÖffnen"), icon: 'fas fa-person-chalkboard' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Backups',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.Backups"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'kiBackupManager', label: 'Backup Manager öffnen', icon: 'fas fa-life-ring' }
=======
      { kind: 'openApp', appKey: 'kiBackupManager', label: game.i18n.localize("JANUS7.UI.Panelregistry.BackupManagerÖffnen"), icon: 'fas fa-life-ring' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Data Studio',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.DataStudio"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'academyDataStudio', label: 'Data Studio öffnen', icon: 'fas fa-table' }
=======
      { kind: 'openApp', appKey: 'academyDataStudio', label: game.i18n.localize("JANUS7.UI.Panelregistry.DataStudioÖffnen"), icon: 'fas fa-table' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Director Spotlight',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.DirectorSpotlight"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'libraryBrowser', label: 'Spotlight öffnen', icon: 'fas fa-search' }
=======
      { kind: 'openApp', appKey: 'libraryBrowser', label: game.i18n.localize("JANUS7.UI.Panelregistry.SpotlightÖffnen"), icon: 'fas fa-search' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Immatrikulation (NSC Kloner)',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.ImmatrikulationNscKloner"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'enrollmentScanner', label: 'Scanner starten', icon: 'fas fa-user-plus' }
=======
      { kind: 'openApp', appKey: 'enrollmentScanner', label: game.i18n.localize("JANUS7.UI.Panelregistry.ScannerStarten"), icon: 'fas fa-user-plus' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Akademie-Quartiermeister',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.AkademieQuartiermeister"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'quartermaster', label: 'Zum Händler gehen', icon: 'fas fa-coins' }
=======
      { kind: 'openApp', appKey: 'quartermaster', label: game.i18n.localize("JANUS7.UI.Panelregistry.ZumHändlerGehen"), icon: 'fas fa-coins' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Akademie-Archiv',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.AkademieArchiv"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'studentArchive', label: 'Archiv durchsuchen', icon: 'fas fa-book-reader' }
=======
      { kind: 'openApp', appKey: 'studentArchive', label: game.i18n.localize("JANUS7.UI.Panelregistry.ArchivDurchsuchen"), icon: 'fas fa-book-reader' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Lesson Library',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.LessonLibrary"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'lessonLibrary', label: 'Lesson Library öffnen', icon: 'fas fa-book' }
=======
      { kind: 'openApp', appKey: 'lessonLibrary', label: game.i18n.localize("JANUS7.UI.Panelregistry.LessonLibraryÖffnen"), icon: 'fas fa-book' }
>>>>>>> REPLACE

<<<<<<< SEARCH
    title: 'Academy Overview',
=======
    title: game.i18n.localize("JANUS7.UI.Panelregistry.AcademyOverview"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      { kind: 'openApp', appKey: 'academyOverview', label: 'Overview öffnen', icon: 'fas fa-school' }
=======
      { kind: 'openApp', appKey: 'academyOverview', label: game.i18n.localize("JANUS7.UI.Panelregistry.OverviewÖffnen"), icon: 'fas fa-school' }
>>>>>>> REPLACE

```

### File: ui/layer/view-registry.js
```text
<<<<<<< SEARCH
        title: 'Zeitkontrolle',
=======
        title: game.i18n.localize("JANUS7.UI.Viewregistry.Zeitkontrolle"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Tag', value: time?.dayName ?? time?.day ?? '—' },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Tag"), value: time?.dayName ?? time?.day ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Phase', value: time?.phase ?? time?.slotName ?? '—' },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Phase"), value: time?.phase ?? time?.slotName ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Woche', value: time?.week ?? '—' },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Woche"), value: time?.week ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Woche', value: time?.week ?? '—' },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Woche"), value: time?.week ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Jahr', value: time?.year ?? '—' }
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Jahr"), value: time?.year ?? '—' }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'command', command: 'advanceSlot', label: '+1 Slot', icon: 'fas fa-forward' },
=======
          { kind: 'command', command: 'advanceSlot', label: game.i18n.localize("JANUS7.UI.Viewregistry.Slot"), icon: 'fas fa-forward' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'command', command: 'advancePhase', label: '+1 Phase', icon: 'fas fa-forward-step' },
=======
          { kind: 'command', command: 'advancePhase', label: game.i18n.localize("JANUS7.UI.Viewregistry.Phase2"), icon: 'fas fa-forward-step' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'command', command: 'advanceDay', label: '+1 Tag', icon: 'fas fa-calendar-day' }
=======
          { kind: 'command', command: 'advanceDay', label: game.i18n.localize("JANUS7.UI.Viewregistry.Tag2"), icon: 'fas fa-calendar-day' }
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Director Runtime',
=======
        title: game.i18n.localize("JANUS7.UI.Viewregistry.DirectorRuntime"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Director', value: engine?.core?.director ? 'Aktiv' : 'Fehlt' },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Director"), value: engine?.core?.director ? 'Aktiv' : 'Fehlt' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Modus', value: workflow?.mode ?? workflow?.state ?? '—' },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Modus"), value: workflow?.mode ?? workflow?.state ?? '—' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Runbook', value: workflow?.runbookId ?? '—' }
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Runbook"), value: workflow?.runbookId ?? '—' }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openApp', appKey: 'controlPanel', label: 'Control Panel', icon: 'fas fa-compass-drafting' },
=======
          { kind: 'openApp', appKey: 'controlPanel', label: game.i18n.localize("JANUS7.UI.Viewregistry.ControlPanel"), icon: 'fas fa-compass-drafting' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openApp', appKey: 'commandCenter', label: 'Command Center', icon: 'fas fa-terminal' }
=======
          { kind: 'openApp', appKey: 'commandCenter', label: game.i18n.localize("JANUS7.UI.Viewregistry.CommandCenter"), icon: 'fas fa-terminal' }
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Atmosphäre & Graph',
=======
        title: game.i18n.localize("JANUS7.UI.Viewregistry.AtmosphäreGraph"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Nodes', value: graph?.nodes ?? graph?.nodeCount ?? 0 },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Nodes"), value: graph?.nodes ?? graph?.nodeCount ?? 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Edges', value: graph?.edges ?? graph?.edgeCount ?? 0 },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Edges"), value: graph?.edges ?? graph?.edgeCount ?? 0 },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Cache', value: cache?.size ?? 0 }
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Cache"), value: cache?.size ?? 0 }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openPanel', panelId: 'atmosphere', label: 'Atmosphäre', icon: 'fas fa-music' },
=======
          { kind: 'openPanel', panelId: 'atmosphere', label: game.i18n.localize("JANUS7.UI.Viewregistry.Atmosphäre"), icon: 'fas fa-music' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openPanel', panelId: 'diagnostics', label: 'Diagnostik', icon: 'fas fa-heart-pulse' }
=======
          { kind: 'openPanel', panelId: 'diagnostics', label: game.i18n.localize("JANUS7.UI.Viewregistry.Diagnostik"), icon: 'fas fa-heart-pulse' }
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Akademie-Woche',
=======
        title: game.i18n.localize("JANUS7.UI.Viewregistry.AkademieWoche"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Einträge heute', value: dayEntries.length },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.EinträgeHeute"), value: dayEntries.length },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Trimester', value: time?.trimester ?? '—' }
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Trimester"), value: time?.trimester ?? '—' }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openApp', appKey: 'academyOverview', label: 'Overview öffnen', icon: 'fas fa-school' }
=======
          { kind: 'openApp', appKey: 'academyOverview', label: game.i18n.localize("JANUS7.UI.Viewregistry.OverviewÖffnen"), icon: 'fas fa-school' }
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Akademie-Daten',
=======
        title: game.i18n.localize("JANUS7.UI.Viewregistry.AkademieDaten"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Lektionen', value: lessons.length },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Lektionen"), value: lessons.length },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'NPCs', value: npcs.length },
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Npcs"), value: npcs.length },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { label: 'Orte', value: locations.length }
=======
          { label: game.i18n.localize("JANUS7.UI.Viewregistry.Orte"), value: locations.length }
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openPanel', panelId: 'dataStudio', label: 'Data Studio', icon: 'fas fa-table' },
=======
          { kind: 'openPanel', panelId: 'dataStudio', label: game.i18n.localize("JANUS7.UI.Viewregistry.DataStudio"), icon: 'fas fa-table' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openPanel', panelId: 'lessonLib', label: 'Lesson Library', icon: 'fas fa-book-open' }
=======
          { kind: 'openPanel', panelId: 'lessonLib', label: game.i18n.localize("JANUS7.UI.Viewregistry.LessonLibrary"), icon: 'fas fa-book-open' }
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Sozial & Wertung',
=======
        title: game.i18n.localize("JANUS7.UI.Viewregistry.SozialWertung"),
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openPanel', panelId: 'social', label: 'Social', icon: 'fas fa-users' },
=======
          { kind: 'openPanel', panelId: 'social', label: game.i18n.localize("JANUS7.UI.Viewregistry.Social"), icon: 'fas fa-users' },
>>>>>>> REPLACE

<<<<<<< SEARCH
          { kind: 'openPanel', panelId: 'scoring', label: 'Scoring', icon: 'fas fa-trophy' }
=======
          { kind: 'openPanel', panelId: 'scoring', label: game.i18n.localize("JANUS7.UI.Viewregistry.Scoring"), icon: 'fas fa-trophy' }
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Director',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.Director"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Akademie',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.Akademie"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Stundenplan',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.Stundenplan"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Akteure (NSCs)',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.AkteureNscs"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Ortschaften',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.Ortschaften"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'System & KI',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.SystemKi"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Werkzeuge',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.Werkzeuge"),
>>>>>>> REPLACE

<<<<<<< SEARCH
  title: 'Session Prep',
=======
  title: game.i18n.localize("JANUS7.UI.Viewregistry.SessionPrep"),
>>>>>>> REPLACE

```

### File: phase8/on-the-fly/JanusContentSuggestionService.js
```text
<<<<<<< SEARCH
      title: 'Szenenaufhänger',
=======
      title: game.i18n.localize("JANUS7.Phase8.ContentSuggestionService.Szenenaufhänger"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Quest-Fortsetzung',
=======
        title: game.i18n.localize("JANUS7.Phase8.ContentSuggestionService.QuestFortsetzung"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Event-Variante',
=======
        title: game.i18n.localize("JANUS7.Phase8.ContentSuggestionService.EventVariante"),
>>>>>>> REPLACE

```

### File: phase8/session-prep/JanusSessionPrepService.js
```text
<<<<<<< SEARCH
        title: 'Aktuellen Slot vorbereiten',
=======
        title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.AktuellenSlotVorbereiten"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Leerlauf-Slot dramaturgisch füllen',
=======
        title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.LeerlaufSlotDramaturgischFüllen"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Prüfung in Reichweite',
=======
        title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.PrüfungInReichweite"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Offene Quests reviewen',
=======
        title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.OffeneQuestsReviewen"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Atmosphäre vorziehen',
=======
        title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.AtmosphäreVorziehen"),
>>>>>>> REPLACE

<<<<<<< SEARCH
        title: 'Technische Warnungen prüfen',
=======
        title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.TechnischeWarnungenPrüfen"),
>>>>>>> REPLACE

<<<<<<< SEARCH
      title: 'Nächste 2–3 Slots scannen',
=======
      title: game.i18n.localize("JANUS7.Phase8.SessionPrepService.NächsteSlotsScannen"),
>>>>>>> REPLACE

```

### File: templates/apps/academy-overview.hbs
```text
<<<<<<< SEARCH
      <h3><i class="fas fa-spinner fa-spin"></i> Kalender nicht bereit</h3>
=======
      <h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Academyoverview.KalenderNichtBereit"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>Phase-4 Simulation oder AcademyData ist noch nicht initialisiert.</p>
=======
      <p>{{localize "JANUS7.UI.Academyoverview.PhaseSimulationOderAcademydata"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="gotoToday"><i class="fas fa-crosshairs"></i> Heute</button>
=======
      <button type="button" class="janus-btn" data-action="gotoToday"><i class="fas fa-crosshairs"></i> {{localize "JANUS7.UI.Academyoverview.Heute"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="openLessonLibrary"><i class="fas fa-book-open"></i> Lesson Library</button>
=======
      <button type="button" class="janus-btn" data-action="openLessonLibrary"><i class="fas fa-book-open"></i> {{localize "JANUS7.UI.Academyoverview.LessonLibrary"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Academyoverview.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-th"></i> Wochenplan</h3>
=======
      <h3><i class="fas fa-th"></i> {{localize "JANUS7.UI.Academyoverview.Wochenplan"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <th>Phase</th>
=======
              <th>{{localize "JANUS7.UI.Academyoverview.Phase"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div><strong>Phase</strong></div><div>{{selected.slotRef.phase}}</div>
=======
          <div><strong>{{localize "JANUS7.UI.Academyoverview.Phase"}}</strong></div><div>{{selected.slotRef.phase}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-info-circle"></i> Slot-Details</h3>
=======
      <h3><i class="fas fa-info-circle"></i> {{localize "JANUS7.UI.Academyoverview.SlotDetails"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div><strong>Tag</strong></div><div>{{selected.slotRef.day}}</div>
=======
          <div><strong>{{localize "JANUS7.UI.Academyoverview.Tag"}}</strong></div><div>{{selected.slotRef.day}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div><strong>Woche</strong></div><div>{{selected.slotRef.week}}</div>
=======
          <div><strong>{{localize "JANUS7.UI.Academyoverview.Woche"}}</strong></div><div>{{selected.slotRef.week}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="janus7-muted">Eintrag</div>
=======
          <div class="janus7-muted">{{localize "JANUS7.UI.Academyoverview.Eintrag"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="janus7-muted">Kein Eintrag in diesem Slot.</p>
=======
          <p class="janus7-muted">{{localize "JANUS7.UI.Academyoverview.KeinEintragInDiesem"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p class="janus7-muted">Wähle einen Slot im Wochenplan.</p>
=======
        <p class="janus7-muted">{{localize "JANUS7.UI.Academyoverview.WähleEinenSlotIm"}}</p>
>>>>>>> REPLACE

```

### File: templates/apps/atmosphere-dj.hbs
```text
<<<<<<< SEARCH
      <h3><i class="fas fa-spinner fa-spin"></i> Atmosphere nicht bereit</h3>
=======
      <h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Atmospheredj.AtmosphereNichtBereit"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>Phase-5 Atmosphere ist nicht initialisiert oder deaktiviert.</p>
=======
      <p>{{localize "JANUS7.UI.Atmospheredj.PhaseAtmosphereIstNicht"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h2 class="janus7-title"><i class="fas fa-music"></i> Atmosphere DJ</h2>
=======
      <h2 class="janus7-title"><i class="fas fa-music"></i> {{localize "JANUS7.UI.Atmospheredj.AtmosphereDj"}}</h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="stopAll"><i class="fas fa-stop"></i> Stop All</button>
=======
      <button type="button" class="janus-btn" data-action="stopAll"><i class="fas fa-stop"></i> {{localize "JANUS7.UI.Atmospheredj.StopAll"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Atmospheredj.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-sliders-h"></i> Steuerung</h3>
=======
        <h3><i class="fas fa-sliders-h"></i> {{localize "JANUS7.UI.Atmospheredj.Steuerung"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="kpi__label">Aktiver Mood</div>
=======
        <div class="kpi__label">{{localize "JANUS7.UI.Atmospheredj.AktiverMood"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="kpi__label">Master Client</div>
=======
        <div class="kpi__label">{{localize "JANUS7.UI.Atmospheredj.MasterClient"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <label>Master Client</label>
=======
        <label>{{localize "JANUS7.UI.Atmospheredj.MasterClient"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="kpi__label">Auto-Quellen</div>
=======
        <div class="kpi__label">{{localize "JANUS7.UI.Atmospheredj.AutoQuellen"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="" {{#unless masterClientUserId}}selected{{/unless}}>(auto)</option>
=======
          <option value="" {{#unless masterClientUserId}}selected{{/unless}}>{{localize "JANUS7.UI.Atmospheredj.Auto"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <label>Auto</label>
=======
        <label>{{localize "JANUS7.UI.Atmospheredj.Auto2"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <label><input name="autoCalendar" type="checkbox" {{#if status.autoFromCalendar}}checked{{/if}}/> Kalender</label>
=======
          <label><input name="autoCalendar" type="checkbox" {{#if status.autoFromCalendar}}checked{{/if}}/> {{localize "JANUS7.UI.Atmospheredj.Kalender"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <label><input name="autoEvents" type="checkbox" {{#if status.autoFromEvents}}checked{{/if}}/> Events</label>
=======
          <label><input name="autoEvents" type="checkbox" {{#if status.autoFromEvents}}checked{{/if}}/> {{localize "JANUS7.UI.Atmospheredj.Events"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <label><input name="autoLocation" type="checkbox" {{#if status.autoFromLocation}}checked{{/if}}/> Ort</label>
=======
          <label><input name="autoLocation" type="checkbox" {{#if status.autoFromLocation}}checked{{/if}}/> {{localize "JANUS7.UI.Atmospheredj.Ort"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-th-large"></i> Moods</h3>
=======
        <h3><i class="fas fa-th-large"></i> {{localize "JANUS7.UI.Atmospheredj.Moods"}}</h3>
>>>>>>> REPLACE

```

### File: templates/apps/command-center.hbs
```text
<<<<<<< SEARCH
      <span class="janus7-title">Command Center</span>
=======
      <span class="janus7-title">{{localize "JANUS7.UI.Commandcenter.CommandCenter"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span>Suche</span>
=======
        <span>{{localize "JANUS7.UI.Commandcenter.Suche"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <kbd>Ctrl+K</kbd>
=======
        <kbd>{{localize "JANUS7.UI.Commandcenter.CtrlK"}}</kbd>
>>>>>>> REPLACE

<<<<<<< SEARCH
    JANUS7 v{{systemVersion}} &middot; <kbd>Ctrl+K</kbd> Spotlight
=======
    JANUS7 v{{systemVersion}} &middot; <kbd>{{localize "JANUS7.UI.Commandcenter.CtrlK"}}</kbd> Spotlight
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="j7-btn j7-btn-ghost" data-action="openSpotlight" title="Spotlight Search (Ctrl+K)">
=======
      <button type="button" class="j7-btn j7-btn-ghost" data-action="openSpotlight" title="{{localize "JANUS7.UI.Commandcenter.SpotlightSearchCtrlK"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="j7-beamer-toggle" data-action="toggleBeamerMode" title="Beamer-Modus">
=======
      <button type="button" class="j7-beamer-toggle" data-action="toggleBeamerMode" title="{{localize "JANUS7.UI.Commandcenter.BeamerModus"}}">
>>>>>>> REPLACE

```

### File: templates/apps/config-panel.hbs
```text
<<<<<<< SEARCH
      <h3><i class="fas fa-lock"></i> Kein Zugriff</h3>
=======
      <h3><i class="fas fa-lock"></i> {{localize "JANUS7.UI.Configpanel.KeinZugriff"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>Nur der GM kann die Konfiguration bearbeiten.</p>
=======
      <p>{{localize "JANUS7.UI.Configpanel.NurDerGmKann"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-spinner fa-spin"></i> Engine nicht bereit</h3>
=======
      <h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Configpanel.EngineNichtBereit"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>JANUS7 Core ist noch nicht initialisiert.</p>
=======
      <p>{{localize "JANUS7.UI.Configpanel.JanusCoreIstNoch"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3 class="janus7-title"><i class="fas fa-map-marked-alt"></i> Scene-Mappings</h3>
=======
      <h3 class="janus7-title"><i class="fas fa-map-marked-alt"></i> {{localize "JANUS7.UI.Configpanel.SceneMappings"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span class="janus7-muted">Weist logische Keys (z.B. "beamer", "mainHall") einer Foundry-Szene zu.</span>
=======
      <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.WeistLogischeKeysZ"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="">— Szene wählen —</option>
=======
          <option value="">{{localize "JANUS7.UI.Configpanel.SzeneWählen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p class="janus7-muted janus7-empty">Noch keine Mappings – "+ Zeile" klicken.</p>
=======
      <p class="janus7-muted janus7-empty">{{localize "JANUS7.UI.Configpanel.NochKeineMappingsZeile"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3 class="janus7-title"><i class="fas fa-toggle-on"></i> Feature-Flags</h3>
=======
      <h3 class="janus7-title"><i class="fas fa-toggle-on"></i> {{localize "JANUS7.UI.Configpanel.FeatureFlags"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span class="janus7-muted">Optionale Subsysteme aktivieren/deaktivieren. Wirkt ohne Reload.</span>
=======
      <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.OptionaleSubsystemeAktivierenDeaktivieren"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span class="janus7-muted">Mood-Switching, Auto-Playlists</span>
=======
        <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.MoodSwitchingAutoPlaylists"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span class="janus7-muted">Mood automatisch nach Kalender/Szene wechseln</span>
=======
        <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.MoodAutomatischNachKalender"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span class="janus7-muted">Dedizierte Ansicht für Projektion</span>
=======
        <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.DedizierteAnsichtFürProjektion"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span class="janus7-muted">Kalender, Lektionen, Scoring, Social aktiv</span>
=======
        <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.KalenderLektionenScoringSocial"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3 class="janus7-title"><i class="fas fa-power-off"></i> Subsystem-Kill-Switches</h3>
=======
      <h3 class="janus7-title"><i class="fas fa-power-off"></i> {{localize "JANUS7.UI.Configpanel.SubsystemKillSwitches"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span class="janus7-muted">Bearbeitung über <em>Einstellungen → Module → JANUS7</em></span>
=======
      <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.BearbeitungÜber"}} <em>Einstellungen → Module → JANUS7</em></span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.BearbeitungÜber"}} <em>Einstellungen → Module → JANUS7</em></span>
=======
      <span class="janus7-muted">{{localize "JANUS7.UI.Configpanel.BearbeitungÜber"}} <em>{{localize "JANUS7.UI.Configpanel.EinstellungenModuleJanus"}}</em></span>
>>>>>>> REPLACE

<<<<<<< SEARCH
                title="Mapping entfernen">
=======
                title="{{localize "JANUS7.UI.Configpanel.MappingEntfernen"}}">
>>>>>>> REPLACE

```

### File: templates/apps/enrollment-scanner.hbs
```text
<<<<<<< SEARCH
        <option value="npc" {{#if (eq typeFilter "npc")}}selected{{/if}}>NSC (Meisterpersonen)</option>
=======
        <option value="npc" {{#if (eq typeFilter "npc")}}selected{{/if}}>{{localize "JANUS7.UI.Enrollmentscanner.NscMeisterpersonen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <option value="character" {{#if (eq typeFilter "character")}}selected{{/if}}>Archetypen (Charaktere)</option>
=======
        <option value="character" {{#if (eq typeFilter "character")}}selected{{/if}}>{{localize "JANUS7.UI.Enrollmentscanner.ArchetypenCharaktere"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <option value="creature" {{#if (eq typeFilter "creature")}}selected{{/if}}>Kreaturen</option>
=======
        <option value="creature" {{#if (eq typeFilter "creature")}}selected{{/if}}>{{localize "JANUS7.UI.Enrollmentscanner.Kreaturen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <option value="all" {{#if (eq typeFilter "all")}}selected{{/if}}>Alle Akteure</option>
=======
        <option value="all" {{#if (eq typeFilter "all")}}selected{{/if}}>{{localize "JANUS7.UI.Enrollmentscanner.AlleAkteure"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
                  <i class="fas fa-random"></i> Klon-Name: <b>{{suggestedName}}</b>
=======
                  <i class="fas fa-random"></i> {{localize "JANUS7.UI.Enrollmentscanner.KlonName"}} <b>{{suggestedName}}</b>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p>Keine passende Akte für "<strong>{{query}}</strong>" im Archiv gefunden.</p>
=======
        <p>{{localize "JANUS7.UI.Enrollmentscanner.KeinePassendeAkteFür"}}<strong>{{query}}</strong>" im Archiv gefunden.</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p>{{localize "JANUS7.UI.Enrollmentscanner.KeinePassendeAkteFür"}}<strong>{{query}}</strong>" im Archiv gefunden.</p>
=======
        <p>{{localize "JANUS7.UI.Enrollmentscanner.KeinePassendeAkteFür"}}<strong>{{query}}</strong>{{localize "JANUS7.UI.Enrollmentscanner.ImArchivGefunden"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn" data-action="openSheet" data-uuid="{{uuid}}" title="Akte ansehen" style="flex: 1; border: none; background: transparent; padding: 0.5rem; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1);">
=======
              <button type="button" class="janus-btn" data-action="openSheet" data-uuid="{{uuid}}" title="{{localize "JANUS7.UI.Enrollmentscanner.AkteAnsehen"}}" style="flex: 1; border: none; background: transparent; padding: 0.5rem; cursor: pointer; border-right: 1px solid rgba(0,0,0,0.1);">
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--primary" data-action="importNpc" data-uuid="{{uuid}}" title="Als neuen NSC kopieren" style="flex: 3; border: none; background: var(--color-primary); color: white; padding: 0.5rem; cursor: pointer; font-weight: bold;">
=======
              <button type="button" class="janus-btn janus-btn--primary" data-action="importNpc" data-uuid="{{uuid}}" title="{{localize "JANUS7.UI.Enrollmentscanner.AlsNeuenNscKopieren"}}" style="flex: 3; border: none; background: var(--color-primary); color: white; padding: 0.5rem; cursor: pointer; font-weight: bold;">
>>>>>>> REPLACE

```

### File: templates/apps/guided-manual-tests.hbs
```text
<<<<<<< SEARCH
      <div class="kpi pass"><div class="kpi__label">PASS</div><div class="kpi__value">{{counts.pass}}</div></div>
=======
      <div class="kpi pass"><div class="kpi__label">{{localize "JANUS7.UI.Guidedmanualtests.Pass"}}</div><div class="kpi__value">{{counts.pass}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="kpi fail"><div class="kpi__label">FAIL</div><div class="kpi__value">{{counts.fail}}</div></div>
=======
      <div class="kpi fail"><div class="kpi__label">{{localize "JANUS7.UI.Guidedmanualtests.Fail"}}</div><div class="kpi__value">{{counts.fail}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="kpi neutral"><div class="kpi__label">SKIP</div><div class="kpi__value">{{counts.skip}}</div></div>
=======
      <div class="kpi neutral"><div class="kpi__label">{{localize "JANUS7.UI.Guidedmanualtests.Skip"}}</div><div class="kpi__value">{{counts.skip}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="j7-btn primary" data-action="markPass"><i class="fas fa-check"></i> PASS</button>
=======
              <button type="button" class="j7-btn primary" data-action="markPass"><i class="fas fa-check"></i> {{localize "JANUS7.UI.Guidedmanualtests.Pass"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="j7-btn danger" data-action="markFail"><i class="fas fa-xmark"></i> FAIL</button>
=======
              <button type="button" class="j7-btn danger" data-action="markFail"><i class="fas fa-xmark"></i> {{localize "JANUS7.UI.Guidedmanualtests.Fail"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="j7-btn" data-action="markSkip"><i class="fas fa-forward"></i> SKIP</button>
=======
              <button type="button" class="j7-btn" data-action="markSkip"><i class="fas fa-forward"></i> {{localize "JANUS7.UI.Guidedmanualtests.Skip"}}</button>
>>>>>>> REPLACE

```

### File: templates/apps/ki-backup-manager.hbs
```text
<<<<<<< SEARCH
      <h2 class="janus7-title"><i class="fas fa-life-ring"></i> KI Backup Manager</h2>
=======
      <h2 class="janus7-title"><i class="fas fa-life-ring"></i> {{localize "JANUS7.UI.Kibackupmanager.KiBackupManager"}}</h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Kibackupmanager.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn janus-btn--highlight" data-action="openKiRoundtrip"><i class="fas fa-brain"></i> KI Roundtrip</button>
=======
      <button type="button" class="janus-btn janus-btn--highlight" data-action="openKiRoundtrip"><i class="fas fa-brain"></i> {{localize "JANUS7.UI.Kibackupmanager.KiRoundtrip"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="j7-backdrop j7-warn-banner"><i class="fas fa-exclamation-triangle"></i> Nur der GM kann Backups verwalten.</div>
=======
    <div class="j7-backdrop j7-warn-banner"><i class="fas fa-exclamation-triangle"></i> {{localize "JANUS7.UI.Kibackupmanager.NurDerGmKann"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <h3><i class="fas fa-database"></i> Verfügbare Backups</h3>
=======
    <h3><i class="fas fa-database"></i> {{localize "JANUS7.UI.Kibackupmanager.VerfügbareBackups"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn small" data-action="copyRef" data-file-ref="{{item.fileRef}}"><i class="fas fa-copy"></i> Ref</button>
=======
              <button type="button" class="janus-btn small" data-action="copyRef" data-file-ref="{{item.fileRef}}"><i class="fas fa-copy"></i> {{localize "JANUS7.UI.Kibackupmanager.Ref"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn small" data-action="restoreBackup" data-file-ref="{{item.fileRef}}"><i class="fas fa-rotate-left"></i> Restore</button>
=======
              <button type="button" class="janus-btn small" data-action="restoreBackup" data-file-ref="{{item.fileRef}}"><i class="fas fa-rotate-left"></i> {{localize "JANUS7.UI.Kibackupmanager.Restore"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p class="j7-text-dim">Noch keine Backups vorhanden. Der Ordner wird jetzt automatisch vorbereitet; das erste echte Backup entsteht beim nächsten KI-Import.</p>
=======
      <p class="j7-text-dim">{{localize "JANUS7.UI.Kibackupmanager.NochKeineBackupsVorhanden"}}</p>
>>>>>>> REPLACE

```

### File: templates/apps/ki-roundtrip.hbs
```text
<<<<<<< SEARCH
      <label><strong>KI Bundle Export</strong></label>
=======
      <label><strong>{{localize "JANUS7.UI.Kiroundtrip.KiBundleExport"}}</strong></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label><strong>Diff Preview</strong></label>
=======
      <label><strong>{{localize "JANUS7.UI.Kiroundtrip.DiffPreview"}}</strong></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span>Diffs: <strong>{{diffCount}}</strong></span>
=======
        <span>{{localize "JANUS7.UI.Kiroundtrip.Diffs"}} <strong>{{diffCount}}</strong></span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <span>Ausgewählt: <strong>{{diffSelectedCount}}</strong></span>
=======
        <span>{{localize "JANUS7.UI.Kiroundtrip.Ausgewählt"}} <strong>{{diffSelectedCount}}</strong></span>
>>>>>>> REPLACE

<<<<<<< SEARCH
                  {{#if this.autoCorrected}}<em class="j7-auto-corrected"> · autoCorrected</em>{{/if}}
=======
                  {{#if this.autoCorrected}}<em class="j7-auto-corrected"> {{localize "JANUS7.UI.Kiroundtrip.Autocorrected"}}</em>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
                  {{#if this.missingReference}}<em class="j7-diff-missing"> · missingReference</em>{{/if}}
=======
                  {{#if this.missingReference}}<em class="j7-diff-missing"> {{localize "JANUS7.UI.Kiroundtrip.Missingreference"}}</em>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
                  {{#if this.invalidSkill}}<em class="j7-diff-invalid"> · invalidSkill</em>{{/if}}
=======
                  {{#if this.invalidSkill}}<em class="j7-diff-invalid"> {{localize "JANUS7.UI.Kiroundtrip.Invalidskill"}}</em>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
                  <span>KI-Talent: <strong>{{this.invalidSkillValue}}</strong></span>
=======
                  <span>{{localize "JANUS7.UI.Kiroundtrip.KiTalent"}} <strong>{{this.invalidSkillValue}}</strong></span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-field-hint j7-empty-hint">Keine Änderungen (oder noch kein Preview).</div>
=======
          <div class="j7-field-hint j7-empty-hint">{{localize "JANUS7.UI.Kiroundtrip.KeineÄnderungenOderNoch"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label><strong>Import from Inbox</strong></label>
=======
      <label><strong>{{localize "JANUS7.UI.Kiroundtrip.ImportFromInbox"}}</strong></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" data-action="loadFile" class="janus7-btn">Load</button>
=======
      <button type="button" data-action="loadFile" class="janus7-btn">{{localize "JANUS7.UI.Kiroundtrip.Load"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" data-action="browseFile" class="janus7-btn">Browse…</button>
=======
      <button type="button" data-action="browseFile" class="janus7-btn">{{localize "JANUS7.UI.Kiroundtrip.Browse"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label><strong>Import History</strong></label>
=======
      <label><strong>{{localize "JANUS7.UI.Kiroundtrip.ImportHistory"}}</strong></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          title="Nur State-Kern: Zeit, Scoring, Atmosphäre, Foundry-Links">
=======
          title="{{localize "JANUS7.UI.Kiroundtrip.NurStateKernZeit"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
          title="+ Akademie-Daten: Lektionen, NPCs, Kalender-Woche">
=======
          title="{{localize "JANUS7.UI.Kiroundtrip.AkademieDatenLektionenNpcs"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
          title="Vollständig: + Referenzen, Knowledge-Links, Art-Assets">
=======
          title="{{localize "JANUS7.UI.Kiroundtrip.VollständigReferenzenKnowledgeLinks"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" data-action="exportJson" class="janus7-btn" title="In Textarea laden + Clipboard">
=======
        <button type="button" data-action="exportJson" class="janus7-btn" title="{{localize "JANUS7.UI.Kiroundtrip.InTextareaLadenClipboard"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" data-action="exportFile" class="janus7-btn" title="Als Datei herunterladen">
=======
        <button type="button" data-action="exportFile" class="janus7-btn" title="{{localize "JANUS7.UI.Kiroundtrip.AlsDateiHerunterladen"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" data-action="selectAllDiffs" class="janus7-btn" title="Alle Diffs auswählen">
=======
        <button type="button" data-action="selectAllDiffs" class="janus7-btn" title="{{localize "JANUS7.UI.Kiroundtrip.AlleDiffsAuswählen"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" data-action="selectNoneDiffs" class="janus7-btn" title="Alle Diffs abwählen">
=======
        <button type="button" data-action="selectNoneDiffs" class="janus7-btn" title="{{localize "JANUS7.UI.Kiroundtrip.AlleDiffsAbwählen"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" data-action="applySelected" class="janus7-btn" {{#unless isGM}}disabled{{/unless}} title="Nur markierte Elemente anwenden">
=======
        <button type="button" data-action="applySelected" class="janus7-btn" {{#unless isGM}}disabled{{/unless}} title="{{localize "JANUS7.UI.Kiroundtrip.NurMarkierteElementeAnwenden"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" data-action="apply" class="janus7-btn" {{#unless isGM}}disabled{{/unless}} title="Markierte Elemente importieren">
=======
        <button type="button" data-action="apply" class="janus7-btn" {{#unless isGM}}disabled{{/unless}} title="{{localize "JANUS7.UI.Kiroundtrip.MarkierteElementeImportieren"}}">
>>>>>>> REPLACE

```

### File: templates/apps/lesson-library.hbs
```text
<<<<<<< SEARCH
      <span class="janus7-title">Lesson Library</span>
=======
      <span class="janus7-title">{{localize "JANUS7.UI.Lessonlibrary.LessonLibrary"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Lessonlibrary.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="migrate"><i class="fas fa-file-import"></i> Sync JSON → Items</button>
=======
      <button type="button" class="janus-btn" data-action="migrate"><i class="fas fa-file-import"></i> {{localize "JANUS7.UI.Lessonlibrary.SyncJsonItems"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn janus-btn--primary" data-action="createLesson"><i class="fas fa-plus"></i> Neue Lesson</button>
=======
      <button type="button" class="janus-btn janus-btn--primary" data-action="createLesson"><i class="fas fa-plus"></i> {{localize "JANUS7.UI.Lessonlibrary.NeueLesson"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Name</th>
=======
            <th>{{localize "JANUS7.UI.Lessonlibrary.Name"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Fach</th>
=======
            <th>{{localize "JANUS7.UI.Lessonlibrary.Fach"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Teacher</th>
=======
            <th>{{localize "JANUS7.UI.Lessonlibrary.Teacher"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Jahr</th>
=======
            <th>{{localize "JANUS7.UI.Lessonlibrary.Jahr"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Dauer</th>
=======
            <th>{{localize "JANUS7.UI.Lessonlibrary.Dauer"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Lesson ID</th>
=======
            <th>{{localize "JANUS7.UI.Lessonlibrary.LessonId"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
                <td><button type="button" class="janus-btn" data-action="openLesson" data-uuid="{{this.uuid}}"><i class="fas fa-pen"></i> Öffnen</button></td>
=======
                <td><button type="button" class="janus-btn" data-action="openLesson" data-uuid="{{this.uuid}}"><i class="fas fa-pen"></i> {{localize "JANUS7.UI.Lessonlibrary.Öffnen"}}</button></td>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <tr><td colspan="7" class="janus7-muted">Noch keine Lesson-Dokumente vorhanden.</td></tr>
=======
            <tr><td colspan="7" class="janus7-muted">{{localize "JANUS7.UI.Lessonlibrary.NochKeineLessonDokumente"}}</td></tr>
>>>>>>> REPLACE

```

### File: templates/apps/library-browser.hbs
```text
<<<<<<< SEARCH
    <h2>Director's Spotlight <small>(DSA5 Bibliothek)</small></h2>
=======
    <h2>{{localize "JANUS7.UI.Librarybrowser.DirectorSSpotlight"}} <small>(DSA5 Bibliothek)</small></h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <h2>{{localize "JANUS7.UI.Librarybrowser.DirectorSSpotlight"}} <small>(DSA5 Bibliothek)</small></h2>
=======
    <h2>{{localize "JANUS7.UI.Librarybrowser.DirectorSSpotlight"}} <small>{{localize "JANUS7.UI.Librarybrowser.DsaBibliothek"}}</small></h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <option value="" {{#if (eq typeFilter "")}}selected{{/if}}>Alle Kategorien</option>
=======
        <option value="" {{#if (eq typeFilter "")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.AlleKategorien"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="npc" {{#if (eq typeFilter "npc")}}selected{{/if}}>Nichtspieler-Charaktere (NPCs)</option>
=======
          <option value="npc" {{#if (eq typeFilter "npc")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.NichtspielerCharaktereNpcs"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="character" {{#if (eq typeFilter "character")}}selected{{/if}}>Archetypen (Charaktere)</option>
=======
          <option value="character" {{#if (eq typeFilter "character")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.ArchetypenCharaktere"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="spell" {{#if (eq typeFilter "spell")}}selected{{/if}}>Zauber</option>
=======
          <option value="spell" {{#if (eq typeFilter "spell")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Zauber"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="liturgy" {{#if (eq typeFilter "liturgy")}}selected{{/if}}>Liturgien</option>
=======
          <option value="liturgy" {{#if (eq typeFilter "liturgy")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Liturgien"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="trait" {{#if (eq typeFilter "trait")}}selected{{/if}}>Besonderheiten (Traits)</option>
=======
          <option value="trait" {{#if (eq typeFilter "trait")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.BesonderheitenTraits"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="equipment" {{#if (eq typeFilter "equipment")}}selected{{/if}}>Ausrüstung</option>
=======
          <option value="equipment" {{#if (eq typeFilter "equipment")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Ausrüstung"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="meleeweapon" {{#if (eq typeFilter "meleeweapon")}}selected{{/if}}>Nahkampfwaffen</option>
=======
          <option value="meleeweapon" {{#if (eq typeFilter "meleeweapon")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Nahkampfwaffen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="rangeweapon" {{#if (eq typeFilter "rangeweapon")}}selected{{/if}}>Fernkampfwaffen</option>
=======
          <option value="rangeweapon" {{#if (eq typeFilter "rangeweapon")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Fernkampfwaffen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="armor" {{#if (eq typeFilter "armor")}}selected{{/if}}>Rüstungen</option>
=======
          <option value="armor" {{#if (eq typeFilter "armor")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Rüstungen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <option value="rolltable" {{#if (eq typeFilter "rolltable")}}selected{{/if}}>Zufallstabellen</option>
=======
          <option value="rolltable" {{#if (eq typeFilter "rolltable")}}selected{{/if}}>{{localize "JANUS7.UI.Librarybrowser.Zufallstabellen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
        Durchsuche <strong>{{stats.entries}}</strong> Einträge in <strong>{{stats.packs}}</strong> Modulen.
=======
        Durchsuche <strong>{{stats.entries}}</strong> {{localize "JANUS7.UI.Librarybrowser.EinträgeIn"}} <strong>{{stats.packs}}</strong> Modulen.
>>>>>>> REPLACE

<<<<<<< SEARCH
        <a href="#" data-action="refreshIndex" title="Index neu aufbauen"><i class="fas fa-sync"></i> Refresh</a>
=======
        <a href="#" data-action="refreshIndex" title="Index neu aufbauen"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Librarybrowser.Refresh"}}</a>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p>Keine Ergebnisse gefunden für "<strong>{{query}}</strong>".</p>
=======
        <p>{{localize "JANUS7.UI.Librarybrowser.KeineErgebnisseGefundenFür"}}<strong>{{query}}</strong>".</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <a href="#" data-action="refreshIndex" title="Index neu aufbauen"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Librarybrowser.Refresh"}}</a>
=======
        <a href="#" data-action="refreshIndex" title="{{localize "JANUS7.UI.Librarybrowser.IndexNeuAufbauen"}}"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Librarybrowser.Refresh"}}</a>
>>>>>>> REPLACE

<<<<<<< SEARCH
                <button type="button" class="janus-btn janus-btn--small janus-btn--primary" data-action="executeAction" data-uuid="{{uuid}}" title="Ausführen" style="background: var(--color-primary); color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer;">
=======
                <button type="button" class="janus-btn janus-btn--small janus-btn--primary" data-action="executeAction" data-uuid="{{uuid}}" title="{{localize "JANUS7.UI.Librarybrowser.Ausführen"}}" style="background: var(--color-primary); color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer;">
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--small" data-action="openSheet" data-uuid="{{uuid}}" title="Ansehen">
=======
              <button type="button" class="janus-btn janus-btn--small" data-action="openSheet" data-uuid="{{uuid}}" title="{{localize "JANUS7.UI.Librarybrowser.Ansehen"}}">
>>>>>>> REPLACE

```

### File: templates/apps/quartermaster.hbs
```text
<<<<<<< SEARCH
      <div style="font-size: 0.8em; color: var(--color-text-dark-secondary); text-transform: uppercase;">Aktiver Einkäufer</div>
=======
      <div style="font-size: 0.8em; color: var(--color-text-dark-secondary); text-transform: uppercase;">{{localize "JANUS7.UI.Quartermaster.AktiverEinkäufer"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <option value="meleeweapon" {{#if (eq typeFilter "meleeweapon")}}selected{{/if}}>Nahkampfwaffen</option>
=======
      <option value="meleeweapon" {{#if (eq typeFilter "meleeweapon")}}selected{{/if}}>{{localize "JANUS7.UI.Quartermaster.Nahkampfwaffen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <option value="rangeweapon" {{#if (eq typeFilter "rangeweapon")}}selected{{/if}}>Fernkampfwaffen</option>
=======
      <option value="rangeweapon" {{#if (eq typeFilter "rangeweapon")}}selected{{/if}}>{{localize "JANUS7.UI.Quartermaster.Fernkampfwaffen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <option value="armor" {{#if (eq typeFilter "armor")}}selected{{/if}}>Rüstungen</option>
=======
      <option value="armor" {{#if (eq typeFilter "armor")}}selected{{/if}}>{{localize "JANUS7.UI.Quartermaster.Rüstungen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <option value="consumable" {{#if (eq typeFilter "consumable")}}selected{{/if}}>Alchemie (Tränke/Salben)</option>
=======
      <option value="consumable" {{#if (eq typeFilter "consumable")}}selected{{/if}}>{{localize "JANUS7.UI.Quartermaster.AlchemieTränkeSalben"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <option value="plant" {{#if (eq typeFilter "plant")}}selected{{/if}}>Herbarium (Pflanzen)</option>
=======
      <option value="plant" {{#if (eq typeFilter "plant")}}selected{{/if}}>{{localize "JANUS7.UI.Quartermaster.HerbariumPflanzen"}}</option>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th style="padding: 0.5rem;">Gegenstand</th>
=======
            <th style="padding: 0.5rem;">{{localize "JANUS7.UI.Quartermaster.Gegenstand"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th style="padding: 0.5rem; text-align: center;">Typ</th>
=======
            <th style="padding: 0.5rem; text-align: center;">{{localize "JANUS7.UI.Quartermaster.Typ"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th style="padding: 0.5rem; text-align: right;">Vorgeschlagener Preis</th>
=======
            <th style="padding: 0.5rem; text-align: right;">{{localize "JANUS7.UI.Quartermaster.VorgeschlagenerPreis"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th style="padding: 0.5rem; width: 120px;">Aktion</th>
=======
            <th style="padding: 0.5rem; width: 120px;">{{localize "JANUS7.UI.Quartermaster.Aktion"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p>Der Quartiermeister hat "<strong>{{query}}</strong>" aktuell nicht auf Lager.</p>
=======
        <p>{{localize "JANUS7.UI.Quartermaster.DerQuartiermeisterHat"}}<strong>{{query}}</strong>" aktuell nicht auf Lager.</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p>{{localize "JANUS7.UI.Quartermaster.DerQuartiermeisterHat"}}<strong>{{query}}</strong>" aktuell nicht auf Lager.</p>
=======
        <p>{{localize "JANUS7.UI.Quartermaster.DerQuartiermeisterHat"}}<strong>{{query}}</strong>{{localize "JANUS7.UI.Quartermaster.AktuellNichtAufLager"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
                  <button type="button" class="janus-btn janus-btn--small" data-action="openSheet" data-uuid="{{uuid}}" title="Sheet öffnen">
=======
                  <button type="button" class="janus-btn janus-btn--small" data-action="openSheet" data-uuid="{{uuid}}" title="{{localize "JANUS7.UI.Quartermaster.SheetÖffnen"}}">
>>>>>>> REPLACE

```

### File: templates/apps/scoring-view.hbs
```text
<<<<<<< SEARCH
      <h3><i class="fas fa-spinner fa-spin"></i> Scoring nicht bereit</h3>
=======
      <h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Scoringview.ScoringNichtBereit"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h2 class="janus7-title"><i class="fas fa-star"></i> Scoring</h2>
=======
      <h2 class="janus7-title"><i class="fas fa-star"></i> {{localize "JANUS7.UI.Scoringview.Scoring"}}</h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Scoringview.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <thead><tr><th>Name</th><th class="num">Punkte</th><th class="j7-th-icon"></th></tr></thead>
=======
          <thead><tr><th>{{localize "JANUS7.UI.Scoringview.Name"}}</th><th class="num">Punkte</th><th class="j7-th-icon"></th></tr></thead>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <thead><tr><th>{{localize "JANUS7.UI.Scoringview.Name"}}</th><th class="num">Punkte</th><th class="j7-th-icon"></th></tr></thead>
=======
          <thead><tr><th>{{localize "JANUS7.UI.Scoringview.Name"}}</th><th class="num">{{localize "JANUS7.UI.Scoringview.Punkte"}}</th><th class="j7-th-icon"></th></tr></thead>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h4>Manuell vergeben</h4>
=======
          <h4>{{localize "JANUS7.UI.Scoringview.ManuellVergeben"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <label>Zirkel</label>
=======
            <label>{{localize "JANUS7.UI.Scoringview.Zirkel"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <label>Amount</label>
=======
            <label>{{localize "JANUS7.UI.Scoringview.Amount"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <label>Amount</label>
=======
            <label>{{localize "JANUS7.UI.Scoringview.Amount"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <label>Grund</label>
=======
          <label>{{localize "JANUS7.UI.Scoringview.Grund"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <label>Grund</label>
=======
          <label>{{localize "JANUS7.UI.Scoringview.Grund"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <thead><tr><th>Schueler</th><th class="num">Score</th></tr></thead>
=======
          <thead><tr><th>{{localize "JANUS7.UI.Scoringview.Schueler"}}</th><th class="num">Score</th></tr></thead>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <thead><tr><th>{{localize "JANUS7.UI.Scoringview.Schueler"}}</th><th class="num">Score</th></tr></thead>
=======
          <thead><tr><th>{{localize "JANUS7.UI.Scoringview.Schueler"}}</th><th class="num">{{localize "JANUS7.UI.Scoringview.Score"}}</th></tr></thead>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-history"></i> Letzte Vergaben</h3>
=======
      <h3><i class="fas fa-history"></i> {{localize "JANUS7.UI.Scoringview.LetzteVergaben"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-empty-state">Noch keine Vergaben protokolliert.</div>
=======
          <div class="j7-empty-state">{{localize "JANUS7.UI.Scoringview.NochKeineVergabenProtokolliert"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <th>Datum</th>
=======
            <th>{{localize "JANUS7.UI.Scoringview.Datum"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <th class="num j7-th-dim">Pts</th>
=======
              <th class="num j7-th-dim">{{localize "JANUS7.UI.Scoringview.Pts"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <th class="num j7-th-dim">Delta</th>
=======
              <th class="num j7-th-dim">{{localize "JANUS7.UI.Scoringview.Delta"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
                  <button type="button" class="janus-btn" data-action="deleteCircle" data-circle-id="{{id}}" title="L&ouml;schen">
=======
                  <button type="button" class="janus-btn" data-action="deleteCircle" data-circle-id="{{id}}" title="{{localize "JANUS7.UI.Scoringview.LOumlSchen"}}">
>>>>>>> REPLACE

```

### File: templates/apps/social-view.hbs
```text
<<<<<<< SEARCH
      <h3><i class="fas fa-spinner fa-spin"></i> Social nicht bereit</h3>
=======
      <h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Socialview.SocialNichtBereit"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>Phase-4 Simulation ist noch nicht initialisiert.</p>
=======
      <p>{{localize "JANUS7.UI.Socialview.PhaseSimulationIstNoch"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h2 class="janus7-title"><i class="fas fa-comments"></i> Social</h2>
=======
      <h2 class="janus7-title"><i class="fas fa-comments"></i> {{localize "JANUS7.UI.Socialview.Social"}}</h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Socialview.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-exchange-alt"></i> Beziehung</h3>
=======
        <h3><i class="fas fa-exchange-alt"></i> {{localize "JANUS7.UI.Socialview.Beziehung"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p class="j7-card-head__hint">Attitude zwischen Akteuren lesen und direkt anpassen.</p>
=======
        <p class="j7-card-head__hint">{{localize "JANUS7.UI.Socialview.AttitudeZwischenAkteurenLesen"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <label>Von (NPC/SC)</label>
=======
        <label>{{localize "JANUS7.UI.Socialview.VonNpcSc"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <label>Zu (NPC/SC)</label>
=======
        <label>{{localize "JANUS7.UI.Socialview.ZuNpcSc"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="kpi__label">Attitude</div>
=======
        <div class="kpi__label">{{localize "JANUS7.UI.Socialview.Attitude"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="kpi__label">Anpassen</div>
=======
        <div class="kpi__label">{{localize "JANUS7.UI.Socialview.Anpassen"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-list"></i> Ausgehende Beziehungen</h3>
=======
        <h3><i class="fas fa-list"></i> {{localize "JANUS7.UI.Socialview.AusgehendeBeziehungen"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <thead><tr><th>Zu</th><th class="num">Wert</th></tr></thead>
=======
        <thead><tr><th>Zu</th><th class="num">{{localize "JANUS7.UI.Socialview.Wert"}}</th></tr></thead>
>>>>>>> REPLACE

```

### File: templates/apps/state-inspector.hbs
```text
<<<<<<< SEARCH
      <h3><i class="fas fa-spinner fa-spin"></i> State nicht bereit</h3>
=======
      <h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Stateinspector.StateNichtBereit"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>JANUS7 Core ist noch nicht initialisiert.</p>
=======
      <p>{{localize "JANUS7.UI.Stateinspector.JanusCoreIstNoch"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h2 class="janus7-title"><i class="fas fa-code"></i> State Inspector</h2>
=======
      <h2 class="janus7-title"><i class="fas fa-code"></i> {{localize "JANUS7.UI.Stateinspector.StateInspector"}}</h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span class="janus7-muted">Read-only Snapshot</span>
=======
      <span class="janus7-muted">{{localize "JANUS7.UI.Stateinspector.ReadOnlySnapshot"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="copy"><i class="fas fa-copy"></i> Copy</button>
=======
      <button type="button" class="janus-btn" data-action="copy"><i class="fas fa-copy"></i> {{localize "JANUS7.UI.Stateinspector.Copy"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="refresh"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Stateinspector.Refresh"}}</button>
>>>>>>> REPLACE

```

### File: templates/apps/student-archive.hbs
```text
<<<<<<< SEARCH
        <p>In den Archiven wurde nichts zu "<strong>{{query}}</strong>" gefunden.</p>
=======
        <p>{{localize "JANUS7.UI.Studentarchive.InDenArchivenWurde"}}<strong>{{query}}</strong>" gefunden.</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p>{{localize "JANUS7.UI.Studentarchive.InDenArchivenWurde"}}<strong>{{query}}</strong>" gefunden.</p>
=======
        <p>{{localize "JANUS7.UI.Studentarchive.InDenArchivenWurde"}}<strong>{{query}}</strong>{{localize "JANUS7.UI.Studentarchive.Gefunden"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
              data-action="openSheet" data-uuid="{{uuid}}" title="Klicken zum Lesen">
=======
              data-action="openSheet" data-uuid="{{uuid}}" title="{{localize "JANUS7.UI.Studentarchive.KlickenZumLesen"}}">
>>>>>>> REPLACE

```

### File: templates/apps/sync-panel.hbs
```text
<<<<<<< SEARCH
    <div class="janus7-loading"><h3><i class="fas fa-lock"></i> Nur GM</h3></div>
=======
    <div class="janus7-loading"><h3><i class="fas fa-lock"></i> {{localize "JANUS7.UI.Syncpanel.NurGm"}}</h3></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="janus7-loading"><h3><i class="fas fa-spinner fa-spin"></i> Engine nicht bereit</h3></div>
=======
    <div class="janus7-loading"><h3><i class="fas fa-spinner fa-spin"></i> {{localize "JANUS7.UI.Syncpanel.EngineNichtBereit"}}</h3></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <th>JANUS7-ID</th>
=======
          <th>{{localize "JANUS7.UI.Syncpanel.JanusId"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <th>Name</th>
=======
          <th>{{localize "JANUS7.UI.Syncpanel.Name"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <th>Foundry-Name</th>
=======
          <th>{{localize "JANUS7.UI.Syncpanel.FoundryName"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <th>Status</th>
=======
          <th>{{localize "JANUS7.UI.Syncpanel.Status"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <th class="j7-th-actions">Aktionen</th>
=======
          <th class="j7-th-actions">{{localize "JANUS7.UI.Syncpanel.Aktionen"}}</th>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <span class="janus7-badge janus7-badge--warn">Name-Match</span>
=======
              <span class="janus7-badge janus7-badge--warn">{{localize "JANUS7.UI.Syncpanel.NameMatch"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <span class="janus7-badge janus7-badge--off" title="{{this.hint}}">Defekt</span>
=======
              <span class="janus7-badge janus7-badge--off" title="{{this.hint}}">{{localize "JANUS7.UI.Syncpanel.Defekt"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <span class="janus7-badge janus7-badge--off">Fehlt</span>
=======
              <span class="janus7-badge janus7-badge--off">{{localize "JANUS7.UI.Syncpanel.Fehlt"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
              title="Drag auf Canvas/Sidebar"
=======
              title="{{localize "JANUS7.UI.Syncpanel.DragAufCanvasSidebar"}}"
>>>>>>> REPLACE

<<<<<<< SEARCH
              <i class="fas fa-check-circle janus7-ok" title="Verknüpft"></i>
=======
              <i class="fas fa-check-circle janus7-ok" title="{{localize "JANUS7.UI.Syncpanel.Verknüpft"}}"></i>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <i class="fas fa-exclamation-circle janus7-warn" title="Per Name gefunden – UUID fehlt noch"></i>
=======
              <i class="fas fa-exclamation-circle janus7-warn" title="{{localize "JANUS7.UI.Syncpanel.PerNameGefundenUuid"}}"></i>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <i class="fas fa-unlink janus7-broken" title="UUID defekt – Entität gelöscht?"></i>
=======
              <i class="fas fa-unlink janus7-broken" title="{{localize "JANUS7.UI.Syncpanel.UuidDefektEntitätGelöscht"}}"></i>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <i class="fas fa-book-open janus7-compendium" title="In Bibliothek gefunden – noch nicht importiert"></i>
=======
              <i class="fas fa-book-open janus7-compendium" title="{{localize "JANUS7.UI.Syncpanel.InBibliothekGefundenNoch"}}"></i>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <i class="fas fa-times-circle janus7-error" title="Nicht in Foundry vorhanden"></i>
=======
              <i class="fas fa-times-circle janus7-error" title="{{localize "JANUS7.UI.Syncpanel.NichtInFoundryVorhanden"}}"></i>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--icon" data-action="openEntity" title="In Foundry öffnen">
=======
              <button type="button" class="janus-btn janus-btn--icon" data-action="openEntity" title="{{localize "JANUS7.UI.Syncpanel.InFoundryÖffnen"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--icon janus-btn--danger" data-action="unlinkEntity" title="Verknüpfung aufheben">
=======
              <button type="button" class="janus-btn janus-btn--icon janus-btn--danger" data-action="unlinkEntity" title="{{localize "JANUS7.UI.Syncpanel.VerknüpfungAufheben"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--primary" data-action="linkExisting" title="UUID speichern">
=======
              <button type="button" class="janus-btn janus-btn--primary" data-action="linkExisting" title="{{localize "JANUS7.UI.Syncpanel.UuidSpeichern"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--secondary" data-action="linkExisting" title="Anderes Dokument verknüpfen">
=======
              <button type="button" class="janus-btn janus-btn--secondary" data-action="linkExisting" title="{{localize "JANUS7.UI.Syncpanel.AnderesDokumentVerknüpfen"}}">
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="janus-btn janus-btn--secondary" data-action="linkExisting" title="Vorhandene Entität suchen">
=======
              <button type="button" class="janus-btn janus-btn--secondary" data-action="linkExisting" title="{{localize "JANUS7.UI.Syncpanel.VorhandeneEntitätSuchen"}}">
>>>>>>> REPLACE

```

### File: templates/apps/test-results.hbs
```text
<<<<<<< SEARCH
      <p>Tests werden ausgeführt…</p>
=======
      <p>{{localize "JANUS7.UI.Testresults.TestsWerdenAusgeführt"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi total"><div class="kpi__label">Gesamt</div><div class="kpi__value">{{summary.total}}</div></div>
=======
    <div class="kpi total"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Gesamt"}}</div><div class="kpi__value">{{summary.total}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi active"><div class="kpi__label">Auto aktiv</div><div class="kpi__value">{{summary.autoActive}}</div></div>
=======
    <div class="kpi active"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.AutoAktiv"}}</div><div class="kpi__value">{{summary.autoActive}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi pass"><div class="kpi__label">PASS</div><div class="kpi__value">{{summary.pass}}</div></div>
=======
    <div class="kpi pass"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Pass"}}</div><div class="kpi__value">{{summary.pass}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi fail"><div class="kpi__label">FAIL</div><div class="kpi__value">{{summary.fail}}</div></div>
=======
    <div class="kpi fail"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Fail"}}</div><div class="kpi__value">{{summary.fail}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi error"><div class="kpi__label">ERROR</div><div class="kpi__value">{{summary.error}}</div></div>
=======
    <div class="kpi error"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Error"}}</div><div class="kpi__value">{{summary.error}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi warn"><div class="kpi__label">Importfehler</div><div class="kpi__value">{{summary.importFailed}}</div></div>
=======
    <div class="kpi warn"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Importfehler"}}</div><div class="kpi__value">{{summary.importFailed}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi neutral"><div class="kpi__label">Manuell</div><div class="kpi__value">{{summary.manual}}</div></div>
=======
    <div class="kpi neutral"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Manuell"}}</div><div class="kpi__value">{{summary.manual}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="kpi neutral"><div class="kpi__label">Katalog</div><div class="kpi__value">{{summary.catalogOnly}}</div></div>
=======
    <div class="kpi neutral"><div class="kpi__label">{{localize "JANUS7.UI.Testresults.Katalog"}}</div><div class="kpi__value">{{summary.catalogOnly}}</div></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="j7-btn primary" data-action="rerun"><i class="fas fa-redo"></i> Erneut ausführen</button>
=======
      <button type="button" class="j7-btn primary" data-action="rerun"><i class="fas fa-redo"></i> {{localize "JANUS7.UI.Testresults.ErneutAusführen"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="j7-btn" data-action="openGuidedManual"><i class="fas fa-route"></i> Guided Manual</button>
=======
      <button type="button" class="j7-btn" data-action="openGuidedManual"><i class="fas fa-route"></i> {{localize "JANUS7.UI.Testresults.GuidedManual"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="j7-btn" data-action="copyReport"><i class="fas fa-clipboard"></i> Report kopieren</button>
=======
      <button type="button" class="j7-btn" data-action="copyReport"><i class="fas fa-clipboard"></i> {{localize "JANUS7.UI.Testresults.ReportKopieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="j7-btn" data-action="copyBugReport"><i class="fas fa-bug"></i> Bug Report kopieren</button>
=======
      <button type="button" class="j7-btn" data-action="copyBugReport"><i class="fas fa-bug"></i> {{localize "JANUS7.UI.Testresults.BugReportKopieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span><strong>Version:</strong> {{summary.version}}</span>
=======
      <span><strong>{{localize "JANUS7.UI.Testresults.Version"}}</strong> {{summary.version}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <span><strong>Sichtbar:</strong> {{visibleCount}}</span>
=======
      <span><strong>{{localize "JANUS7.UI.Testresults.Sichtbar"}}</strong> {{visibleCount}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      {{#if generatedAt}}<span><strong>Zuletzt:</strong> {{generatedAt}}</span>{{/if}}
=======
      {{#if generatedAt}}<span><strong>{{localize "JANUS7.UI.Testresults.Zuletzt"}}</strong> {{generatedAt}}</span>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
    <button type="button" class="j7-btn" data-action="applyFilters"><i class="fas fa-filter"></i> Anwenden</button>
=======
    <button type="button" class="j7-btn" data-action="applyFilters"><i class="fas fa-filter"></i> {{localize "JANUS7.UI.Testresults.Anwenden"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <button type="button" class="j7-btn" data-action="resetFilters"><i class="fas fa-eraser"></i> Reset</button>
=======
    <button type="button" class="j7-btn" data-action="resetFilters"><i class="fas fa-eraser"></i> {{localize "JANUS7.UI.Testresults.Reset"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
              {{#if sourceFile}}<div class="j7-test-detail">Quelle: <code>{{sourceFile}}</code></div>{{/if}}
=======
              {{#if sourceFile}}<div class="j7-test-detail">{{localize "JANUS7.UI.Testresults.Quelle"}} <code>{{sourceFile}}</code></div>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>Keine Testergebnisse vorhanden.</p>
=======
      <p>{{localize "JANUS7.UI.Testresults.KeineTestergebnisseVorhanden"}}</p>
>>>>>>> REPLACE

```

### File: templates/items/lesson-sheet.hbs
```text
<<<<<<< SEARCH
        <label>Lesson ID <input type="text" name="system.lessonId" value="{{system.lessonId}}"/></label>
=======
        <label>{{localize "JANUS7.UI.Lessonsheet.LessonId"}} <input type="text" name="system.lessonId" value="{{system.lessonId}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <label>Fach <input type="text" name="system.subject" value="{{system.subject}}"/></label>
=======
        <label>{{localize "JANUS7.UI.Lessonsheet.Fach"}} <input type="text" name="system.subject" value="{{system.subject}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <label>Dauer (Slots) <input type="number" min="1" name="system.durationSlots" value="{{system.durationSlots}}"/></label>
=======
        <label>{{localize "JANUS7.UI.Lessonsheet.DauerSlots"}} <input type="number" min="1" name="system.durationSlots" value="{{system.durationSlots}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Lehrer NPC ID <input type="text" name="system.teacherNpcId" value="{{system.teacherNpcId}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.LehrerNpcId"}} <input type="text" name="system.teacherNpcId" value="{{system.teacherNpcId}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Lehrer UUID <input type="text" name="system.teacherUuid" value="{{system.teacherUuid}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.LehrerUuid"}} <input type="text" name="system.teacherUuid" value="{{system.teacherUuid}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Ort ID <input type="text" name="system.locationId" value="{{system.locationId}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.OrtId"}} <input type="text" name="system.locationId" value="{{system.locationId}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Ort UUID <input type="text" name="system.locationUuid" value="{{system.locationUuid}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.OrtUuid"}} <input type="text" name="system.locationUuid" value="{{system.locationUuid}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Jahr Min <input type="number" name="system.yearMin" value="{{system.yearMin}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.JahrMin"}} <input type="number" name="system.yearMin" value="{{system.yearMin}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Jahr Max <input type="number" name="system.yearMax" value="{{system.yearMax}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.JahrMax"}} <input type="number" name="system.yearMax" value="{{system.yearMax}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Schwierigkeit <input type="text" name="system.difficulty" value="{{system.difficulty}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.Schwierigkeit"}} <input type="text" name="system.difficulty" value="{{system.difficulty}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <label>Tags (CSV) <input type="text" name="system.tags" value="{{system.tags}}"/></label>
=======
      <label>{{localize "JANUS7.UI.Lessonsheet.TagsCsv"}} <input type="text" name="system.tags" value="{{system.tags}}"/></label>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <label>Zusammenfassung</label>
=======
    <label>{{localize "JANUS7.UI.Lessonsheet.Zusammenfassung"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <label>Mechanics (JSON)</label>
=======
    <label>{{localize "JANUS7.UI.Lessonsheet.MechanicsJson"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <label>Scoring Impact (JSON)</label>
=======
    <label>{{localize "JANUS7.UI.Lessonsheet.ScoringImpactJson"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <label>References (JSON)</label>
=======
    <label>{{localize "JANUS7.UI.Lessonsheet.ReferencesJson"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <label>Source Snapshot (JSON)</label>
=======
    <label>{{localize "JANUS7.UI.Lessonsheet.SourceSnapshotJson"}}</label>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <img class="profile" src="{{img}}" data-edit="img" title="Bild" height="72" width="72"/>
=======
    <img class="profile" src="{{img}}" data-edit="img" title="{{localize "JANUS7.UI.Lessonsheet.Bild"}}" height="72" width="72"/>
>>>>>>> REPLACE

```

### File: templates/quest-system/dev-panel.hbs
```text
<<<<<<< SEARCH
          <span class="status-ok"><i class="fas fa-check-circle"></i> Content</span>
=======
          <span class="status-ok"><i class="fas fa-check-circle"></i> {{localize "JANUS7.UI.Devpanel.Content"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <span class="status-error"><i class="fas fa-times-circle"></i> Content</span>
=======
          <span class="status-error"><i class="fas fa-times-circle"></i> {{localize "JANUS7.UI.Devpanel.Content"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <span class="status-ok"><i class="fas fa-check-circle"></i> Quests</span>
=======
          <span class="status-ok"><i class="fas fa-check-circle"></i> {{localize "JANUS7.UI.Devpanel.Quests"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <span class="status-error"><i class="fas fa-times-circle"></i> Quests</span>
=======
          <span class="status-error"><i class="fas fa-times-circle"></i> {{localize "JANUS7.UI.Devpanel.Quests"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-star"></i> Event Spawning</h3>
=======
        <h3><i class="fas fa-star"></i> {{localize "JANUS7.UI.Devpanel.EventSpawning"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-book"></i> Quest Starting</h3>
=======
        <h3><i class="fas fa-book"></i> {{localize "JANUS7.UI.Devpanel.QuestStarting"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-bolt"></i> Effect Application</h3>
=======
        <h3><i class="fas fa-bolt"></i> {{localize "JANUS7.UI.Devpanel.EffectApplication"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-database"></i> State Inspector</h3>
=======
        <h3><i class="fas fa-database"></i> {{localize "JANUS7.UI.Devpanel.StateInspector"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h4>Player State</h4>
=======
            <h4>{{localize "JANUS7.UI.Devpanel.PlayerState"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h4>Quest States</h4>
=======
            <h4>{{localize "JANUS7.UI.Devpanel.QuestStates"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h4>Event States</h4>
=======
            <h4>{{localize "JANUS7.UI.Devpanel.EventStates"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p>Kein Character gefunden</p>
=======
      <p>{{localize "JANUS7.UI.Devpanel.KeinCharacterGefunden"}}</p>
>>>>>>> REPLACE

```

### File: templates/quest-system/event-popup.hbs
```text
<<<<<<< SEARCH
    <button type="button" class="janus-btn" data-action="refreshPopup"><i class="fas fa-sync"></i> Refresh</button>
=======
    <button type="button" class="janus-btn" data-action="refreshPopup"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Eventpopup.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h3>Optionen</h3>
=======
            <h3>{{localize "JANUS7.UI.Eventpopup.Optionen"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <p><i class="fas fa-info-circle"></i> Keine Optionen verfügbar</p>
=======
            <p><i class="fas fa-info-circle"></i> {{localize "JANUS7.UI.Eventpopup.KeineOptionenVerfügbar"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <button type="button" data-action="close">Schließen</button>
=======
            <button type="button" data-action="close">{{localize "JANUS7.UI.Eventpopup.Schließen"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-bookmark"></i> Aktive Quests</h3>
=======
        <h3><i class="fas fa-bookmark"></i> {{localize "JANUS7.UI.Eventpopup.AktiveQuests"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="event-side-empty">Keine aktiven Quests für diesen Akteur.</p>
=======
          <p class="event-side-empty">{{localize "JANUS7.UI.Eventpopup.KeineAktivenQuestsFür"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <h3><i class="fas fa-comments"></i> Ungelesene Gerüchte</h3>
=======
        <h3><i class="fas fa-comments"></i> {{localize "JANUS7.UI.Eventpopup.UngeleseneGerüchte"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="event-side-empty">Keine neuen Gerüchte.</p>
=======
          <p class="event-side-empty">{{localize "JANUS7.UI.Eventpopup.KeineNeuenGerüchte"}}</p>
>>>>>>> REPLACE

```

### File: templates/quest-system/quest-journal-header.hbs
```text
<<<<<<< SEARCH
    <h2><i class="fas fa-book-open"></i> Quest Journal</h2>
=======
    <h2><i class="fas fa-book-open"></i> {{localize "JANUS7.UI.Questjournalheader.QuestJournal"}}</h2>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <button type="button" class="janus-btn" data-action="refreshJournal"><i class="fas fa-sync"></i> Refresh</button>
=======
    <button type="button" class="janus-btn" data-action="refreshJournal"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.Questjournalheader.Refresh"}}</button>
>>>>>>> REPLACE

```

### File: templates/quest-system/quest-journal.hbs
```text
<<<<<<< SEARCH
      <div class="summary-card"><span class="summary-value">{{summaryCards.activeQuests}}</span><span class="summary-label">Aktive Quests</span></div>
=======
      <div class="summary-card"><span class="summary-value">{{summaryCards.activeQuests}}</span><span class="summary-label">{{localize "JANUS7.UI.Questjournal.AktiveQuests"}}</span></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="summary-card"><span class="summary-value">{{summaryCards.availableQuests}}</span><span class="summary-label">Verfügbar</span></div>
=======
      <div class="summary-card"><span class="summary-value">{{summaryCards.availableQuests}}</span><span class="summary-label">{{localize "JANUS7.UI.Questjournal.Verfügbar"}}</span></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="summary-card"><span class="summary-value">{{summaryCards.completedQuests}}</span><span class="summary-label">Abgeschlossen</span></div>
=======
      <div class="summary-card"><span class="summary-value">{{summaryCards.completedQuests}}</span><span class="summary-label">{{localize "JANUS7.UI.Questjournal.Abgeschlossen"}}</span></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="summary-card"><span class="summary-value">{{summaryCards.unheardRumors}}</span><span class="summary-label">Neue Gerüchte</span></div>
=======
      <div class="summary-card"><span class="summary-value">{{summaryCards.unheardRumors}}</span><span class="summary-label">{{localize "JANUS7.UI.Questjournal.NeueGerüchte"}}</span></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="summary-card"><span class="summary-value">{{summaryCards.factions}}</span><span class="summary-label">Fraktionen</span></div>
=======
      <div class="summary-card"><span class="summary-value">{{summaryCards.factions}}</span><span class="summary-label">{{localize "JANUS7.UI.Questjournal.Fraktionen"}}</span></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <div class="summary-card"><span class="summary-value">{{summaryCards.currentLocationId}}</span><span class="summary-label">Aktueller Ort</span></div>
=======
      <div class="summary-card"><span class="summary-value">{{summaryCards.currentLocationId}}</span><span class="summary-label">{{localize "JANUS7.UI.Questjournal.AktuellerOrt"}}</span></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h3><i class="fas fa-play-circle"></i> Aktive Quests</h3>
=======
            <h3><i class="fas fa-play-circle"></i> {{localize "JANUS7.UI.Questjournal.AktiveQuests"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h3><i class="fas fa-scroll"></i> Verfügbare Quests</h3>
=======
            <h3><i class="fas fa-scroll"></i> {{localize "JANUS7.UI.Questjournal.VerfügbareQuests"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
                    <button type="button" data-action="startQuest" data-quest-id="{{questId}}" data-actor-id="{{../actorId}}"><i class="fas fa-play"></i> Starten</button>
=======
                    <button type="button" data-action="startQuest" data-quest-id="{{questId}}" data-actor-id="{{../actorId}}"><i class="fas fa-play"></i> {{localize "JANUS7.UI.Questjournal.Starten"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <h3><i class="fas fa-trophy"></i> Abgeschlossene Quests</h3>
=======
            <h3><i class="fas fa-trophy"></i> {{localize "JANUS7.UI.Questjournal.AbgeschlosseneQuests"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
                    <span><i class="fas fa-check-circle"></i> Abgeschlossen</span>
=======
                    <span><i class="fas fa-check-circle"></i> {{localize "JANUS7.UI.Questjournal.Abgeschlossen"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-comments"></i> Gerüchtebrett</h3>
=======
          <h3><i class="fas fa-comments"></i> {{localize "JANUS7.UI.Questjournal.Gerüchtebrett"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <div class="empty-state small"><p>Keine Gerüchte vorhanden.</p></div>
=======
            <div class="empty-state small"><p>{{localize "JANUS7.UI.Questjournal.KeineGerüchteVorhanden"}}</p></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <div class="empty-state small"><p>Keine Fraktionen geladen.</p></div>
=======
            <div class="empty-state small"><p>{{localize "JANUS7.UI.Questjournal.KeineFraktionenGeladen"}}</p></div>
>>>>>>> REPLACE

```

### File: templates/shell/janus-shell.hbs
```text
<<<<<<< SEARCH
      <div class="j7-shell__brand-title">JANUS7</div>
=======
      <div class="j7-shell__brand-title">{{localize "JANUS7.UI.Janusshell.Janus"}}</div>
>>>>>>> REPLACE

```

### File: templates/shell/views/director.hbs
```text
<<<<<<< SEARCH
          <h3><i class="fas fa-route j7-shell__card-icon" aria-hidden="true"></i><span>Runbook</span></h3>
=======
          <h3><i class="fas fa-route j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.Director.Runbook"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <p><strong>Nächste Aktion:</strong> {{directorRunbook.suggestedAction.label}}</p>
=======
            <p><strong>{{localize "JANUS7.UI.Director.NächsteAktion"}}</strong> {{directorRunbook.suggestedAction.label}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="j7-shell__btn" data-action="directorRunbookNext"><i class="fas fa-play"></i> Fortsetzen</button>
=======
              <button type="button" class="j7-shell__btn" data-action="directorRunbookNext"><i class="fas fa-play"></i> {{localize "JANUS7.UI.Director.Fortsetzen"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <button type="button" class="j7-shell__btn" data-action="{{directorRunbook.suggestedAction.action}}"><i class="fas fa-bolt"></i> Ausführen</button>
=======
              <button type="button" class="j7-shell__btn" data-action="{{directorRunbook.suggestedAction.action}}"><i class="fas fa-bolt"></i> {{localize "JANUS7.UI.Director.Ausführen"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="muted">Aktuell keine Runbook Empfehlung.</p>
=======
          <p class="muted">{{localize "JANUS7.UI.Director.AktuellKeineRunbookEmpfehlung"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <span>Mood Suggestion</span>
=======
            <span>{{localize "JANUS7.UI.Director.MoodSuggestion"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <button type="button" class="j7-shell__btn" data-action="startDirectorDay"><i class="fas fa-sun"></i> Tagesstart</button>
=======
          <button type="button" class="j7-shell__btn" data-action="startDirectorDay"><i class="fas fa-sun"></i> {{localize "JANUS7.UI.Director.Tagesstart"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <button type="button" class="j7-shell__btn" data-action="directorProcessQueue"><i class="fas fa-list-check"></i> Queue Run</button>
=======
          <button type="button" class="j7-shell__btn" data-action="directorProcessQueue"><i class="fas fa-list-check"></i> {{localize "JANUS7.UI.Director.QueueRun"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <button type="button" class="j7-shell__btn" data-action="directorRunLesson"><i class="fas fa-chalkboard-teacher"></i> Lesson Run</button>
=======
          <button type="button" class="j7-shell__btn" data-action="directorRunLesson"><i class="fas fa-chalkboard-teacher"></i> {{localize "JANUS7.UI.Director.LessonRun"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <button type="button" class="j7-shell__btn" data-action="directorApplyMood"><i class="fas fa-music"></i> Mood Apply</button>
=======
          <button type="button" class="j7-shell__btn" data-action="directorApplyMood"><i class="fas fa-music"></i> {{localize "JANUS7.UI.Director.MoodApply"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-clipboard-list j7-shell__card-icon" aria-hidden="true"></i><span>Letzte Ereignisse</span></h3>
=======
          <h3><i class="fas fa-clipboard-list j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.Director.LetzteEreignisse"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p>Aus dem Workflow Runbook</p>
=======
          <p>{{localize "JANUS7.UI.Director.AusDemWorkflowRunbook"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <li><span class="tag">SOCIAL</span> <strong>{{label}}</strong> (Rank {{rank}})</li>
=======
              <li><span class="tag">{{localize "JANUS7.UI.Director.Social"}}</span> <strong>{{label}}</strong> (Rank {{rank}})</li>
>>>>>>> REPLACE

<<<<<<< SEARCH
           <p class="muted">Keine neuen Social Fortschritte in dieser Sitzung.</p>
=======
           <p class="muted">{{localize "JANUS7.UI.Director.KeineNeuenSocialFortschritte"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
             <p><strong>Neue Quest:</strong> {{directorWorkflow.startedQuest.title}} gestartet (#{{directorWorkflow.startedQuest.actorLabel}})</p>
=======
             <p><strong>{{localize "JANUS7.UI.Director.NeueQuest"}}</strong> {{directorWorkflow.startedQuest.title}} gestartet (#{{directorWorkflow.startedQuest.actorLabel}})</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
           <button type="button" class="j7-shell__btn" data-action="directorGenerateQuests"><i class="fas fa-magic"></i> Quests generieren</button>
=======
           <button type="button" class="j7-shell__btn" data-action="directorGenerateQuests"><i class="fas fa-magic"></i> {{localize "JANUS7.UI.Director.QuestsGenerieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
           <button type="button" class="j7-shell__btn" data-action="directorEvaluateSocial"><i class="fas fa-users-gear"></i> Social Checks</button>
=======
           <button type="button" class="j7-shell__btn" data-action="directorEvaluateSocial"><i class="fas fa-users-gear"></i> {{localize "JANUS7.UI.Director.SocialChecks"}}</button>
>>>>>>> REPLACE

```

### File: templates/shell/views/people.hbs
```text
<<<<<<< SEARCH
          <h3><i class="fas fa-chalkboard-teacher j7-shell__card-icon" aria-hidden="true"></i><span>Lehrkräfte</span></h3>
=======
          <h3><i class="fas fa-chalkboard-teacher j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.People.Lehrkräfte"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-dropzone__label"><i class="fas fa-user-plus"></i> Actors hier ablegen</div>
=======
          <div class="j7-dropzone__label"><i class="fas fa-user-plus"></i> {{localize "JANUS7.UI.People.ActorsHierAblegen"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-dropzone__label"><i class="fas fa-user-plus"></i> Actors hier ablegen</div>
=======
          <div class="j7-dropzone__label"><i class="fas fa-user-plus"></i> {{localize "JANUS7.UI.People.ActorsHierAblegen"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-dropzone__label"><i class="fas fa-user-plus"></i> Actors hier ablegen</div>
=======
          <div class="j7-dropzone__label"><i class="fas fa-user-plus"></i> {{localize "JANUS7.UI.People.ActorsHierAblegen"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="muted">Keine Lehrkräfte zugeordnet.</p>
=======
          <p class="muted">{{localize "JANUS7.UI.People.KeineLehrkräfteZugeordnet"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-user-graduate j7-shell__card-icon" aria-hidden="true"></i><span>Schüler</span></h3>
=======
          <h3><i class="fas fa-user-graduate j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.People.Schüler"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="muted">Keine Schüler zugeordnet.</p>
=======
          <p class="muted">{{localize "JANUS7.UI.People.KeineSchülerZugeordnet"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-users j7-shell__card-icon" aria-hidden="true"></i><span>Weitere NPCs</span></h3>
=======
          <h3><i class="fas fa-users j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.People.WeitereNpcs"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <li><span class="tag">NPC</span> <strong>{{name}}</strong></li>
=======
              <li><span class="tag">{{localize "JANUS7.UI.People.Npc"}}</span> <strong>{{name}}</strong></li>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="muted">Keine NPCs zugeordnet.</p>
=======
          <p class="muted">{{localize "JANUS7.UI.People.KeineNpcsZugeordnet"}}</p>
>>>>>>> REPLACE

```

### File: templates/shell/views/places.hbs
```text
<<<<<<< SEARCH
          <h3><i class="fas fa-map-marker-alt j7-shell__card-icon" aria-hidden="true"></i><span>Aktiver Ort</span></h3>
=======
          <h3><i class="fas fa-map-marker-alt j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.Places.AktiverOrt"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p>Hier legst du Szenen ab um sie zu verknüpfen</p>
=======
          <p>{{localize "JANUS7.UI.Places.HierLegstDuSzenen"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="j7-shell__metric"><span>Name</span><strong>{{locationView.activeLocationName}}</strong></div>
=======
        <div class="j7-shell__metric"><span>{{localize "JANUS7.UI.Places.Name"}}</span><strong>{{locationView.activeLocationName}}</strong></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="j7-shell__metric"><span>Mood</span><strong>{{locationView.defaultMoodKey}}</strong></div>
=======
        <div class="j7-shell__metric"><span>{{localize "JANUS7.UI.Places.Mood"}}</span><strong>{{locationView.defaultMoodKey}}</strong></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-dropzone__label"><i class="fas fa-link"></i> Scene/Playlist/Journal hier ablegen</div>
=======
          <div class="j7-dropzone__label"><i class="fas fa-link"></i> {{localize "JANUS7.UI.Places.ScenePlaylistJournalHier"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-command="activateLocationScene" data-dataset-location-id="{{locationView.activeLocationId}}"><i class="fas fa-map"></i> Scene aktivieren</button>
=======
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-command="activateLocationScene" data-dataset-location-id="{{locationView.activeLocationId}}"><i class="fas fa-map"></i> {{localize "JANUS7.UI.Places.SceneAktivieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-command="applyLocationMood" data-dataset-location-id="{{locationView.activeLocationId}}"><i class="fas fa-music"></i> Mood setzen</button>
=======
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-command="applyLocationMood" data-dataset-location-id="{{locationView.activeLocationId}}"><i class="fas fa-music"></i> {{localize "JANUS7.UI.Places.MoodSetzen"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-layer-group j7-shell__card-icon" aria-hidden="true"></i><span>Alle Orte</span></h3>
=======
          <h3><i class="fas fa-layer-group j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.Places.AlleOrte"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
              <li><span class="tag">LOC</span> <strong>{{name}}</strong> <span class="muted j7-ml-sm">{{type}}</span></li>
=======
              <li><span class="tag">{{localize "JANUS7.UI.Places.Loc"}}</span> <strong>{{name}}</strong> <span class="muted j7-ml-sm">{{type}}</span></li>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="muted">Keine Orte in den Akademie-Daten gefunden.</p>
=======
          <p class="muted">{{localize "JANUS7.UI.Places.KeineOrteInDen"}}</p>
>>>>>>> REPLACE

```

### File: templates/shell/views/schedule.hbs
```text
<<<<<<< SEARCH
          <h3><i class="fas fa-calendar-plus j7-shell__card-icon" aria-hidden="true"></i><span>Slot-Builder</span></h3>
=======
          <h3><i class="fas fa-calendar-plus j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.Schedule.SlotBuilder"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p>Actors, Orten, Journals oder Items hier ablegen und danach "Stunde generieren" drücken.</p>
=======
          <p>{{localize "JANUS7.UI.Schedule.ActorsOrtenJournalsOder"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <p class="muted j7-dropzone__hint">Noch keine Bausteine — Elemente aus der Seitenleiste hierher ziehen.</p>
=======
            <p class="muted j7-dropzone__hint">{{localize "JANUS7.UI.Schedule.NochKeineBausteineElemente"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="generateSlotJournal"><i class="fas fa-file-alt"></i> Stunde generieren</button>
=======
        <button type="button" class="j7-shell__btn" data-action="generateSlotJournal"><i class="fas fa-file-alt"></i> {{localize "JANUS7.UI.Schedule.StundeGenerieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="clearSlotBuilder">   <i class="fas fa-trash"></i> Leeren</button>
=======
        <button type="button" class="j7-shell__btn" data-action="clearSlotBuilder">   <i class="fas fa-trash"></i> {{localize "JANUS7.UI.Schedule.Leeren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-calendar-days j7-shell__card-icon" aria-hidden="true"></i><span>Heutiger Plan</span></h3>
=======
          <h3><i class="fas fa-calendar-days j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.Schedule.HeutigerPlan"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p>Akademie-Tagesansicht</p>
=======
          <p>{{localize "JANUS7.UI.Schedule.AkademieTagesansicht"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p class="muted">Der vollumfängliche Stundenplan ist Teil des Academy-Dashboards.</p>
=======
        <p class="muted">{{localize "JANUS7.UI.Schedule.DerVollumfänglicheStundenplanIst"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-app-key="academyOverview"><i class="fas fa-calendar-alt"></i> Academy Overview öffnen</button>
=======
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-app-key="academyOverview"><i class="fas fa-calendar-alt"></i> {{localize "JANUS7.UI.Schedule.AcademyOverviewÖffnen"}}</button>
>>>>>>> REPLACE

```

### File: templates/shell/views/sessionPrep.hbs
```text
<<<<<<< SEARCH
      <span class="janus7-title">Session Prep Wizard</span>
=======
      <span class="janus7-title">{{localize "JANUS7.UI.SessionPrep.SessionPrepWizard"}}</span>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="executeShellAction" data-view-id="sessionPrep" title="Report neu generieren"><i class="fas fa-sync"></i> Refresh</button>
=======
      <button type="button" class="janus-btn" data-action="executeShellAction" data-view-id="sessionPrep" title="Report neu generieren"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.SessionPrep.Refresh"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="academyOverview"><i class="fas fa-calendar-week"></i> Übersicht</button>
=======
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="academyOverview"><i class="fas fa-calendar-week"></i> {{localize "JANUS7.UI.SessionPrep.Übersicht"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="atmosphereDJ"><i class="fas fa-music"></i> Atmosphäre</button>
=======
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="atmosphereDJ"><i class="fas fa-music"></i> {{localize "JANUS7.UI.SessionPrep.Atmosphäre"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="academyDataStudio"><i class="fas fa-edit"></i> Data Studio</button>
=======
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="academyDataStudio"><i class="fas fa-edit"></i> {{localize "JANUS7.UI.SessionPrep.DataStudio"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="kiBackupManager"><i class="fas fa-life-ring"></i> Backups</button>
=======
      <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="kiBackupManager"><i class="fas fa-life-ring"></i> {{localize "JANUS7.UI.SessionPrep.Backups"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <div class="j7-backdrop j7-warn-banner"><i class="fas fa-exclamation-triangle"></i> Nur der GM kann den Session Prep Wizard sinnvoll nutzen.</div>
=======
    <div class="j7-backdrop j7-warn-banner"><i class="fas fa-exclamation-triangle"></i> {{localize "JANUS7.UI.SessionPrep.NurDerGmKann"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-clock"></i> Aktueller Stand</h3>
=======
      <h3><i class="fas fa-clock"></i> {{localize "JANUS7.UI.SessionPrep.AktuellerStand"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h4><i class="fas fa-map-marker-alt"></i> Aktiver Ort</h4>
=======
      <h4><i class="fas fa-map-marker-alt"></i> {{localize "JANUS7.UI.SessionPrep.AktiverOrt"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <p class="j7-text-dim">Kein aktiver Ort gesetzt.</p>
=======
        <p class="j7-text-dim">{{localize "JANUS7.UI.SessionPrep.KeinAktiverOrtGesetzt"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h4><i class="fas fa-stethoscope"></i> Technik</h4>
=======
      <h4><i class="fas fa-stethoscope"></i> {{localize "JANUS7.UI.SessionPrep.Technik"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-list-check"></i> Priorisierte To-dos</h3>
=======
      <h3><i class="fas fa-list-check"></i> {{localize "JANUS7.UI.SessionPrep.PriorisierteToDos"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-hourglass-half"></i> Nächste Slots</h3>
=======
      <h3><i class="fas fa-hourglass-half"></i> {{localize "JANUS7.UI.SessionPrep.NächsteSlots"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
    <h3><i class="fas fa-feather-pointed"></i> On-the-fly Content Seeds</h3>
=======
    <h3><i class="fas fa-feather-pointed"></i> {{localize "JANUS7.UI.SessionPrep.OnTheFlyContent"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <button type="button" class="janus-btn small" data-action="copySeed"><i class="fas fa-copy"></i> Kopieren</button>
=======
            <button type="button" class="janus-btn small" data-action="copySeed"><i class="fas fa-copy"></i> {{localize "JANUS7.UI.SessionPrep.Kopieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-book"></i> Aktueller Slot</h3>
=======
      <h3><i class="fas fa-book"></i> {{localize "JANUS7.UI.SessionPrep.AktuellerSlot"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h4>Lessons</h4>
=======
      <h4>{{localize "JANUS7.UI.SessionPrep.Lessons"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
        {{else}}<li class="j7-text-dim">Keine Lektionen</li>{{/if}}
=======
        {{else}}<li class="j7-text-dim">{{localize "JANUS7.UI.SessionPrep.KeineLektionen"}}</li>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h4>Exams</h4>
=======
      <h4>{{localize "JANUS7.UI.SessionPrep.Exams"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
        {{else}}<li class="j7-text-dim">Keine Prüfungen</li>{{/if}}
=======
        {{else}}<li class="j7-text-dim">{{localize "JANUS7.UI.SessionPrep.KeinePrüfungen"}}</li>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h4>Events</h4>
=======
      <h4>{{localize "JANUS7.UI.SessionPrep.Events"}}</h4>
>>>>>>> REPLACE

<<<<<<< SEARCH
        {{else}}<li class="j7-text-dim">Keine Events</li>{{/if}}
=======
        {{else}}<li class="j7-text-dim">{{localize "JANUS7.UI.SessionPrep.KeineEvents"}}</li>{{/if}}
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-scroll"></i> Offene Quests</h3>
=======
      <h3><i class="fas fa-scroll"></i> {{localize "JANUS7.UI.SessionPrep.OffeneQuests"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <p><strong>{{view.quests.total}}</strong> aktive Quest(s)</p>
=======
      <p><strong>{{view.quests.total}}</strong> {{localize "JANUS7.UI.SessionPrep.AktiveQuestS"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <li class="j7-text-dim">Keine aktiven Quests.</li>
=======
          <li class="j7-text-dim">{{localize "JANUS7.UI.SessionPrep.KeineAktivenQuests"}}</li>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <h3><i class="fas fa-triangle-exclamation"></i> Diagnostics</h3>
=======
      <h3><i class="fas fa-triangle-exclamation"></i> {{localize "JANUS7.UI.SessionPrep.Diagnostics"}}</h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <li class="j7-text-dim">Keine aktuellen Warnungen.</li>
=======
          <li class="j7-text-dim">{{localize "JANUS7.UI.SessionPrep.KeineAktuellenWarnungen"}}</li>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="commandCenter"><i class="fas fa-terminal"></i> Power Tools</button>
=======
        <button type="button" class="janus-btn" data-action="executeShellAction" data-app-key="commandCenter"><i class="fas fa-terminal"></i> {{localize "JANUS7.UI.SessionPrep.PowerTools"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
      <button type="button" class="janus-btn" data-action="executeShellAction" data-view-id="sessionPrep" title="Report neu generieren"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.SessionPrep.Refresh"}}</button>
=======
      <button type="button" class="janus-btn" data-action="executeShellAction" data-view-id="sessionPrep" title="{{localize "JANUS7.UI.SessionPrep.ReportNeuGenerieren"}}"><i class="fas fa-sync"></i> {{localize "JANUS7.UI.SessionPrep.Refresh"}}</button>
>>>>>>> REPLACE

```

### File: templates/shell/views/system.hbs
```text
<<<<<<< SEARCH
          <h3><i class="fas fa-brain j7-shell__card-icon" aria-hidden="true"></i><span>KI-Kontext (Phase 7)</span></h3>
=======
          <h3><i class="fas fa-brain j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.System.KiKontextPhase"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p>Actors, Items, Scenes hierher ziehen für den nächsten Export.</p>
=======
          <p>{{localize "JANUS7.UI.System.ActorsItemsScenesHierher"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <div class="j7-dropzone__label"><i class="fas fa-plus-circle"></i> Drop-Zone: KI-Kontext</div>
=======
          <div class="j7-dropzone__label"><i class="fas fa-plus-circle"></i> {{localize "JANUS7.UI.System.DropZoneKiKontext"}}</div>
>>>>>>> REPLACE

<<<<<<< SEARCH
            <p class="muted j7-dropzone__hint">Elemente aus der Seitenleiste hierher ziehen.</p>
=======
            <p class="muted j7-dropzone__hint">{{localize "JANUS7.UI.System.ElementeAusDerSeitenleiste"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="kiExportClipboard"><i class="fas fa-clipboard"></i> KI Bundle kopieren</button>
=======
        <button type="button" class="j7-shell__btn" data-action="kiExportClipboard"><i class="fas fa-clipboard"></i> {{localize "JANUS7.UI.System.KiBundleKopieren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="kiClearContext"><i class="fas fa-trash"></i> Kontext leeren</button>
=======
        <button type="button" class="j7-shell__btn" data-action="kiClearContext"><i class="fas fa-trash"></i> {{localize "JANUS7.UI.System.KontextLeeren"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-microchip j7-shell__card-icon" aria-hidden="true"></i><span>Kill Switches</span></h3>
=======
          <h3><i class="fas fa-microchip j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.System.KillSwitches"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p>Aktuelle Modul-Stati.</p>
=======
          <p>{{localize "JANUS7.UI.System.AktuelleModulStati"}}</p>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="j7-shell__metric"><span>Simulation</span><strong>{{#if system.enableSimulation}}✅{{else}}❌{{/if}}</strong></div>
=======
        <div class="j7-shell__metric"><span>{{localize "JANUS7.UI.System.Simulation"}}</span><strong>{{#if system.enableSimulation}}✅{{else}}❌{{/if}}</strong></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="j7-shell__metric"><span>Atmosphere</span><strong>{{#if system.enableAtmosphere}}✅{{else}}❌{{/if}}</strong></div>
=======
        <div class="j7-shell__metric"><span>{{localize "JANUS7.UI.System.Atmosphere"}}</span><strong>{{#if system.enableAtmosphere}}✅{{else}}❌{{/if}}</strong></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <div class="j7-shell__metric"><span>Quest Engine</span><strong>{{#if system.enableQuestSystem}}✅{{else}}❌{{/if}}</strong></div>
=======
        <div class="j7-shell__metric"><span>{{localize "JANUS7.UI.System.QuestEngine"}}</span><strong>{{#if system.enableQuestSystem}}✅{{else}}❌{{/if}}</strong></div>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-app-key="stateInspector"><i class="fas fa-database"></i> State Inspector</button>
=======
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-app-key="stateInspector"><i class="fas fa-database"></i> {{localize "JANUS7.UI.System.StateInspector"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-app-key="commandCenter"><i class="fas fa-terminal"></i> Command Center</button>
=======
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-app-key="commandCenter"><i class="fas fa-terminal"></i> {{localize "JANUS7.UI.System.CommandCenter"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-panel-id="diagnostics"><i class="fas fa-bug"></i> Diagnostics Panel</button>
=======
        <button type="button" class="j7-shell__btn" data-action="executeShellAction" data-panel-id="diagnostics"><i class="fas fa-bug"></i> {{localize "JANUS7.UI.System.DiagnosticsPanel"}}</button>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <h3><i class="fas fa-link j7-shell__card-icon" aria-hidden="true"></i><span>Foundry-Links (Sync)</span></h3>
=======
          <h3><i class="fas fa-link j7-shell__card-icon" aria-hidden="true"></i><span>{{localize "JANUS7.UI.System.FoundryLinksSync"}}</span></h3>
>>>>>>> REPLACE

<<<<<<< SEARCH
          <p class="muted">Noch keine persistenten Links im State.</p>
=======
          <p class="muted">{{localize "JANUS7.UI.System.NochKeinePersistentenLinks"}}</p>
>>>>>>> REPLACE

```
