// ui/layer/app-launcher-context.js

export const APP_LAUNCHER_EXCLUDE = new Set(['shell', 'sessionPrepWizard', 'commandCenter', 'settingsTestHarness']);

export const APP_NAV_META = Object.freeze({
  academyOverview: { title: 'Academy Overview', icon: 'fas fa-school', description: 'Kalender, Wochenraster und Akademie-Überblick.', category: 'academy' },
  scoringView: { title: 'Scoring View', icon: 'fas fa-trophy', description: 'Zirkelpunkte, Wertungen und Ranglisten.', category: 'academy' },
  lessonLibrary: { title: 'Lesson Library', icon: 'fas fa-book-open', description: 'Lektionskatalog und Arbeitsbibliothek.', category: 'academy' },
  socialView: { title: 'Social View', icon: 'fas fa-users', description: 'Beziehungen, Spannungen und Sozialgraph.', category: 'livingWorld' },
  atmosphereDJ: { title: 'Atmosphäre DJ', icon: 'fas fa-music', description: 'Mood-, Audio- und Overlay-Steuerung.', category: 'livingWorld' },
  academyDataStudio: { title: 'Academy Data Studio', icon: 'fas fa-table', description: 'Direkter Datenzugriff für Inhalte und Kataloge.', category: 'admin' },
  kiRoundtrip: { title: 'KI Roundtrip', icon: 'fas fa-brain', description: 'Export, Preview und kontrollierter Import.', category: 'admin' },
  kiBackupManager: { title: 'KI Backups', icon: 'fas fa-life-ring', description: 'Backup- und Restore-Werkzeuge für KI-Artefakte.', category: 'maintenance' },
  configPanel: { title: 'Config Panel', icon: 'fas fa-sliders', description: 'Modulweite Konfiguration und Kill-Switches.', category: 'maintenance' },
  syncPanel: { title: 'Sync Panel', icon: 'fas fa-link', description: 'UUID-Verknüpfungen, Diagnose und Sync-Audits.', category: 'maintenance' },
  libraryBrowser: { title: 'Library Browser', icon: 'fas fa-folder-open', description: 'Bibliotheks- und Sammlungsnavigation.', category: 'academy' },
  studentArchive: { title: 'Student Archive', icon: 'fas fa-user-graduate', description: 'Archivierte Schüler und Verlaufsdaten.', category: 'livingWorld' },
  enrollmentScanner: { title: 'Enrollment Scanner', icon: 'fas fa-id-card', description: 'Import- und Einschreibungsprüfung.', category: 'admin' },
  quartermaster: { title: 'Quartermaster', icon: 'fas fa-box-open', description: 'Inventar- und Versorgungswerkzeuge.', category: 'admin' },
  stateInspector: { title: 'State Inspector', icon: 'fas fa-database', description: 'Read-only Sicht auf den Runtime-State.', category: 'maintenance' },
  commandCenter: { title: 'Command Center', icon: 'fas fa-terminal', description: 'Legacy Power Tools für Debug und Spezialpfade.', category: 'maintenance' },
  testResults: { title: 'Test Results', icon: 'fas fa-clipboard-check', description: 'Testergebnisse und Ausführungsberichte.', category: 'maintenance' },
  guidedManualTests: { title: 'Guided Manual Tests', icon: 'fas fa-vial', description: 'Geführte manuelle Prüfschritte.', category: 'maintenance' },
  settingsTestHarness: { title: 'Settings Harness', icon: 'fas fa-flask', description: 'Spezialwerkzeug für Settings-Tests.', category: 'maintenance' },
  thesisManager: { title: 'Thesis Manager', icon: 'fas fa-microscope', description: 'Recherche-Fortschritt und Quellen-Management.', category: 'admin' },
  laborInterface: { title: 'Labor Interface', icon: 'fas fa-vials', description: 'Alchimie-Lager und Brau-Workflow.', category: 'admin' },
  doomMonitor: { title: 'Doom Monitor', icon: 'fas fa-skull', description: 'Überwachung des Risikos dunkler Magie.', category: 'maintenance' }
});

export function classifyAppNavGroup(meta = {}, navMeta = {}) {
  return navMeta.category ?? 'admin';
}

export function listJanusUiAppStatus() {
  const registry = game?.janus7?.ui?.apps ?? {};
  return Object.keys(registry).map(key => {
    const appClass = registry[key];
    return {
      key,
      className: appClass?.name ?? key,
      mode: 'JANUS7_NATIVE',
      maturity: 'stable'
    };
  });
}

export function buildAppLauncherSections(currentViewId = 'director', app = null) {
  const appRegistry = game?.janus7?.ui?.apps ?? {};
  const query = (app?._searchQuery || '').toLowerCase();
  
  const groups = new Map([
    ['academy', { id: 'academy', title: '🎓 Academy', items: [] }],
    ['livingWorld', { id: 'livingWorld', title: '🌍 Living World', items: [] }],
    ['admin', { id: 'admin', title: '🏛️ Administration', items: [] }],
    ['maintenance', { id: 'maintenance', title: '⚙️ System & Wartung', items: [] }]
  ]);

  for (const meta of listJanusUiAppStatus()) {
    if (!meta?.key || APP_LAUNCHER_EXCLUDE.has(meta.key)) continue;
    const navMeta = APP_NAV_META[meta.key] ?? {};
    
    const matches = !query || 
                    navMeta.title?.toLowerCase().includes(query) || 
                    navMeta.description?.toLowerCase().includes(query) ||
                    meta.key.toLowerCase().includes(query);

    if (matches) {
      const groupKey = classifyAppNavGroup(meta, navMeta);
      groups.get(groupKey)?.items.push({
        key: meta.key,
        icon: navMeta.icon ?? 'fas fa-window-maximize',
        title: navMeta.title ?? meta.className ?? meta.key,
        description: navMeta.description ?? meta.mode ?? '',
        maturity: meta.maturity ?? 'unbekannt',
        mode: meta.mode ?? 'n/a',
        isAvailable: !!appRegistry?.[meta.key],
        isActive: meta.key === 'sessionPrepWizard' ? (currentViewId === 'sessionPrep') : false
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    }))
    .filter((group) => group.items.length > 0);
}
