export const JANUS_UI_APP_STATUS = Object.freeze({
  shell: { className: 'JanusShellApp', maturity: 'produktiv', mode: 'view+navigation', shell: true, editable: false, admin: false },
  academyOverview: { className: 'JanusAcademyOverviewApp', maturity: 'produktiv', mode: 'view', shell: false, editable: false, admin: false },
  scoringView: { className: 'JanusScoringViewApp', maturity: 'produktiv', mode: 'edit', shell: false, editable: true, admin: false },
  lessonLibrary: { className: 'JanusLessonLibraryApp', maturity: 'teilproduktiv', mode: 'view/workflow', shell: false, editable: true, admin: false },
  socialView: { className: 'JanusSocialViewApp', maturity: 'teilproduktiv', mode: 'edit', shell: false, editable: true, admin: false },
  atmosphereDJ: { className: 'JanusAtmosphereDJApp', maturity: 'teilproduktiv', mode: 'edit', shell: false, editable: true, admin: true },
  academyDataStudio: { className: 'JanusAcademyDataStudioApp', maturity: 'teilproduktiv', mode: 'edit/admin', shell: false, editable: true, admin: true },
  kiRoundtrip: { className: 'JanusKiRoundtripApp', maturity: 'produktiv', mode: 'admin/edit', shell: false, editable: true, admin: true },
  kiBackupManager: { className: 'JanusKiBackupManagerApp', maturity: 'produktiv', mode: 'admin', shell: false, editable: false, admin: true },
  sessionPrepWizard: { className: 'JanusShellApp', maturity: 'compat/shell-view', mode: 'workflow/view', shell: true, editable: false, admin: true, aliasOf: 'shell', viewId: 'sessionPrep', preferred: true },
  configPanel: { className: 'JanusConfigPanelApp', maturity: 'teilproduktiv', mode: 'admin/edit', shell: false, editable: true, admin: true },
  syncPanel: { className: 'JanusSyncPanelApp', maturity: 'teilproduktiv', mode: 'view/admin', shell: false, editable: false, admin: true },
  commandCenter: { className: 'JanusCommandCenterApp', maturity: 'intern/debug', mode: 'admin/debug', shell: false, editable: true, admin: true, preferred: false },
  testResults: { className: 'JanusTestResultApp', maturity: 'intern/test/debug', mode: 'debug', shell: false, editable: false, admin: true },
  reportCard: { className: 'JanusReportCardApp', maturity: 'teilproduktiv', mode: 'view/workflow', shell: true, editable: false, admin: true, aliasOf: 'shell', viewId: 'reportCards' },
  alumni: { className: 'JanusAlumniApp', maturity: 'teilproduktiv', mode: 'edit/workflow', shell: true, editable: true, admin: true, aliasOf: 'shell', viewId: 'alumni' },
  guidedManualTests: { className: 'JanusGuidedManualTestApp', maturity: 'intern/test/debug', mode: 'debug', shell: false, editable: false, admin: true },
  stateInspector: { className: 'JanusStateInspectorApp', maturity: 'intern/debug', mode: 'view-only', shell: false, editable: false, admin: true },
  controlPanel: { className: 'JanusShellApp', maturity: 'compat/shell-alias', mode: 'view/admin', shell: true, editable: false, admin: true, aliasOf: 'shell', preferred: false },
  settingsTestHarness: { className: 'JanusSettingsTestHarnessApp', maturity: 'intern/test/debug', mode: 'debug', shell: false, editable: false, admin: true },
  lessons: { className: 'JanusLessonLibraryApp', maturity: 'compat/alias', mode: 'view/workflow', shell: false, editable: true, admin: false, aliasOf: 'lessonLibrary', preferred: false },
  aiRoundtrip: { className: 'JanusKiRoundtripApp', maturity: 'compat/alias', mode: 'admin/edit', shell: false, editable: true, admin: true, aliasOf: 'kiRoundtrip', preferred: false }
});

export function listJanusUiAppStatus() {
  return Object.entries(JANUS_UI_APP_STATUS).map(([key, meta]) => ({ key, ...meta }));
}
