# JANUS7 UI-App-Katalog

| App | Reifegrad | Typ | Shell/Registry | Kurzbewertung |
|---|---|---|---|---|
| JanusShellApp | produktiv | View + Navigation | Shell-Primärapp | bevorzugte Hauptoberfläche |
| JanusScoringViewApp | produktiv | Edit | Registry, perspektivisch Panel | robust für operative Arbeit |
| JanusAcademyOverviewApp | produktiv | View | Registry | stabiler Überblick |
| JanusLessonLibraryApp | teilproduktiv | View/Arbeitsoberfläche | Registry / Shell-nahe | nutzbar, aber nicht voll migriert |
| JanusSocialViewApp | teilproduktiv | Edit | Registry | funktional, aber UX noch uneinheitlich |
| JanusAtmosphereDJApp | teilproduktiv | Edit | Registry | spezialisiertes GM-Werkzeug |
| JanusAcademyDataStudioApp | teilproduktiv | Edit/Admin | Registry | mächtig, aber datengetrieben und nicht idiotensicher |
| JanusKiRoundtripApp | produktiv | Admin/Edit | Registry | produktiver GM-Workflow mit Preview/Apply |
| JanusKiBackupManagerApp | produktiv | Admin | Registry | Backup/Restore-Management |
| sessionPrepWizard (`JanusShellApp`) | compat/shell-view | Workflow/View | Shell-Alias | Session Prep laeuft als Shell-View statt als eigene Ziel-App |
| JanusConfigPanelApp | teilproduktiv | Admin/Edit | Registry | Konfigurationsoberfläche, noch Legacy-nah |
| JanusSyncPanelApp | teilproduktiv | Admin/View | Registry | Diagnose und Verknüpfungen |
| JanusCommandCenterApp | intern/debug | Admin/Debug | Registry | Power-Tools fuer Diagnose; bleibt erreichbar, aber nicht mehr prominent in der Shell-Side-Nav |
| JanusTestResultApp | intern/test/debug | Debug | Registry | Testlauf und Ergebnisanzeige |
| JanusGuidedManualTestApp | intern/test/debug | Debug | Registry | geführte manuelle Tests |
| JanusStateInspectorApp | intern/debug | View-only | Registry | read-only Diagnose |
| JanusSettingsTestHarnessApp | intern/test/debug | Debug | best-effort | nur für Test-/Settings-Spezialfälle |
| JanusLessonItemSheet | experimentell/bridge | Edit | Dokument-/Sheet-Kontext | hängt vom Item-/Lesson-Modell ab |
| controlPanel (`JanusShellApp`) | compat/shell-alias | View/Admin | Registry-Alias | historischer Einstieg, routed kanonisch auf die Shell |
