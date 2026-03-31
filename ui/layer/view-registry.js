// v2 registry cache bypass
import { getPanels, getPanel } from './panel-registry.js';
// FIX P2-08: JanusSessionPrepService wird lazy importiert um zu verhindern dass ein
// fehlender/kaputter Phase8-Import die gesamte Shell (view-registry.js) blockiert.
// Der Statische Top-Level-Import wurde daher entfernt und durch einen lazy-Import ersetzt.
// import { JanusSessionPrepService } from '../../phase8/session-prep/JanusSessionPrepService.js';
let _sessionPrepService = null;
async function getSessionPrepService() {
  if (_sessionPrepService) return _sessionPrepService;
  try {
    const m = await import('../../phase8/session-prep/JanusSessionPrepService.js');
    _sessionPrepService = m.JanusSessionPrepService;
  } catch (_err) {
    // Phase8 ist optional — Shell funktioniert ohne.
  }
  return _sessionPrepService;
}

let _alumniService = null;
async function getAlumniService() {
  if (_alumniService) return _alumniService;
  try {
    const m = await import('../../phase8/alumni/JanusAlumniService.js');
    _alumniService = m.JanusAlumniService;
  } catch (_err) {
    // Phase8 ist optional — Shell funktioniert ohne.
  }
  return _alumniService;
}
import { buildLocationsView, buildPeopleView, buildKiContext, buildSyncView, buildSystemView } from './context-builders.js';
import { prepareDirectorRuntimeSummary, buildDirectorRunbookView, buildDirectorWorkflowView } from './director-context.js';

const VIEW_REGISTRY = new Map();

export function registerView(definition = {}) {
  const id = String(definition.id ?? '').trim();
  if (!id) throw new Error('[JANUS7][Shell] View definition requires an id.');
  const normalized = {
    id,
    title: definition.title ?? id,
    icon: definition.icon ?? 'fas fa-circle-dot',
    description: definition.description ?? '',
    build: typeof definition.build === 'function' ? definition.build : (() => ({ cards: [] }))
  };
  VIEW_REGISTRY.set(id, normalized);
  return normalized;
}

export function getView(id) {
  return VIEW_REGISTRY.get(String(id)) ?? null;
}

export function getViews() {
  return [...VIEW_REGISTRY.values()];
}

function buildDirectorView(engine, app) {
  const state = engine?.core?.state;
  const time = state?.get?.('time') ?? {};
  const workflow = engine?.core?.director?.workflow?.getRuntimeContext?.() ?? engine?.core?.director?.getWorkflowContext?.() ?? {};
  const diagnostics = engine?.diagnostics?.snapshot?.() ?? {};
  const graph = diagnostics?.graph ?? {};
  const cache = graph?.cache ?? {};
  
  const { directorSummary, directorRuntime } = app?._buildDirectorRuntimeContext?.()
    ?? prepareDirectorRuntimeSummary({ engine, logger: engine?.core?.logger ?? console });
  const directorWorkflow = buildDirectorWorkflowView({
    directorWorkflow: app?._directorWorkflow ?? {},
    directorRuntime,
    engine,
    questCandidates: app?._getQuestActorCandidates?.() ?? []
  });
  const directorRunbook = buildDirectorRunbookView(directorRuntime, directorWorkflow);

  return {
    cards: [
      {
        title: 'Zeitkontrolle',
        icon: 'fas fa-clock',
        description: 'Direkte Zeitsteuerung über Director/Commands.',
        metrics: [
          { label: 'Tag', value: time?.dayName ?? time?.day ?? '—' },
          { label: 'Phase', value: time?.phase ?? time?.slotName ?? '—' },
          { label: 'Woche', value: time?.week ?? '—' },
          { label: 'Jahr', value: time?.year ?? '—' }
        ],
        actions: [
          { kind: 'command', command: 'advanceSlot', label: '+1 Slot', icon: 'fas fa-forward' },
          { kind: 'command', command: 'advancePhase', label: '+1 Phase', icon: 'fas fa-forward-step' },
          { kind: 'command', command: 'advanceDay', label: '+1 Tag', icon: 'fas fa-calendar-day' }
        ]
      },
      {
        title: 'Director Runtime',
        icon: 'fas fa-compass-drafting',
        description: 'Workflow, Runbook und Betriebsmodi.',
        metrics: [
          { label: 'Director', value: engine?.core?.director ? 'Aktiv' : 'Fehlt' },
          { label: 'Modus', value: workflow?.mode ?? workflow?.state ?? '—' },
          { label: 'Runbook', value: workflow?.runbookId ?? '—' }
        ],
        actions: [
          { kind: 'openApp', appKey: 'shell', label: 'Shell', icon: 'fas fa-compass-drafting' },
          { kind: 'openApp', appKey: 'commandCenter', label: 'Power Tools', icon: 'fas fa-terminal' }
        ]
      },
      {
        title: 'Atmosphäre & Graph',
        icon: 'fas fa-wave-square',
        description: 'Laufende Stimmungs- und Graph-Indikatoren.',
        metrics: [
          { label: 'Nodes', value: graph?.nodes ?? graph?.nodeCount ?? 0 },
          { label: 'Edges', value: graph?.edges ?? graph?.edgeCount ?? 0 },
          { label: 'Cache', value: cache?.size ?? 0 }
        ],
        actions: [
          { kind: 'openPanel', panelId: 'atmosphere', label: 'Atmosphäre', icon: 'fas fa-music' },
          { kind: 'openPanel', panelId: 'diagnostics', label: 'Diagnostik', icon: 'fas fa-heart-pulse' }
        ]
      }
    ],
    // The director.hbs template expects these props:
    directorSummary,
    directorRuntime,
    directorWorkflow,
    directorRunbook
  };
}

function buildAcademyView(engine) {
  const academy = engine?.academy?.data ?? engine?.academy?.dataApi ?? null;
  const calendar = engine?.academy?.calendar ?? null;
  const time = engine?.core?.state?.get?.('time') ?? {};
  const dayEntries = calendar?.getCalendarEntriesForDay?.({
    year: time?.year,
    trimester: time?.trimester,
    week: time?.week,
    day: time?.dayName ?? time?.day
  }) ?? [];
  const lessons = academy?.listLessonIds?.(999) ?? [];
  const npcs = academy?.listNpcIds?.(999) ?? [];
  const locations = academy?.listLocationIds?.(999) ?? [];
  return {
    cards: [
      {
        title: 'Akademie-Woche',
        icon: 'fas fa-calendar-days',
        description: 'Heutige Einträge und Raster-Einstieg.',
        metrics: [
          { label: 'Einträge heute', value: dayEntries.length },
          { label: 'Woche', value: time?.week ?? '—' },
          { label: 'Trimester', value: time?.trimester ?? '—' }
        ],
        items: dayEntries.slice(0, 6).map((entry) => ({
          label: entry?.phase ?? entry?.slot ?? 'Slot',
          value: entry?.title ?? entry?.id ?? 'Eintrag'
        })),
        actions: [
          { kind: 'openApp', appKey: 'academyOverview', label: 'Overview öffnen', icon: 'fas fa-school' }
        ]
      },
      {
        title: 'Akademie-Daten',
        icon: 'fas fa-book',
        description: 'Schnellzugriff auf Datendomänen.',
        metrics: [
          { label: 'Lektionen', value: lessons.length },
          { label: 'NPCs', value: npcs.length },
          { label: 'Orte', value: locations.length }
        ],
        actions: [
          { kind: 'openPanel', panelId: 'dataStudio', label: 'Data Studio', icon: 'fas fa-table' },
          { kind: 'openPanel', panelId: 'lessonLib', label: 'Lesson Library', icon: 'fas fa-book-open' }
        ]
      },
      {
        title: 'Sozial & Wertung',
        icon: 'fas fa-people-group',
        description: 'Brücke zu Social und Scoring.',
        actions: [
          { kind: 'openPanel', panelId: 'social', label: 'Social', icon: 'fas fa-users' },
          { kind: 'openPanel', panelId: 'scoring', label: 'Scoring', icon: 'fas fa-trophy' }
        ]
      }
    ]
  };
}

function buildScheduleView(engine, app) {
  const slotBuilderItems = app?._slotBuilder ?? [];
  return {
    slotBuilder: { items: slotBuilderItems }
  };
}

async function buildPeopleViewLocal(engine, app) {
  const state = engine?.core?.state?.get?.() ?? {};
  const peopleView = buildPeopleView({ state, actors: game?.actors });
  const AlumniService = await getAlumniService();
  const alumniView = AlumniService
    ? await new AlumniService({ engine, logger: engine?.core?.logger ?? console }).getOverview()
    : { summary: { total: 0, mentors: 0, returned: 0, inactive: 0 }, alumni: [], candidates: [], recentChanges: [] };
  return { peopleView, alumniView };
}

function buildPlacesViewLocal(engine, app) {
  const state = engine?.core?.state?.get?.() ?? {};
  const { locations, locationView } = buildLocationsView({ state, academyData: engine?.academy?.data });
  return { locations, locationView };
}

async function buildSystemViewLocal(engine, app) {
  const state = engine?.core?.state?.get?.() ?? {};
  const kiContext = await buildKiContext({ app, engine, isGM: game?.user?.isGM, phase7Enabled: true });
  const syncView = buildSyncView({ state });
  const system = buildSystemView({ engine });
  
  return {
    kiContext,
    syncView,
    system
  };
}

function buildPanelCards(engine, panelIds = []) {
  return panelIds
    .map((panelId) => {
      const panel = getPanel(panelId);
      if (!panel) return null;
      const detail = panel.build?.(engine) ?? {};
      return {
        panelId: panel.id,
        title: panel.title,
        icon: panel.icon,
        description: panel.summary ?? panel.description ?? '',
        metrics: detail.metrics ?? [],
        items: detail.items ?? [],
        actions: Array.isArray(panel.actions) ? panel.actions : []
      };
    })
    .filter(Boolean);
}

function buildToolsView(engine) {
  return {
    cardSections: [
      {
        id: 'operations',
        title: 'Operations Deck',
        description: 'Shell-native Zugriff auf die drei laufenden GM-Kernbereiche.',
        cards: buildPanelCards(engine, ['scoring', 'social', 'atmosphere'])
      },
      {
        id: 'workbench',
        title: 'Werkbank',
        description: 'Vorbereitung, Datenpflege und technische Systemarbeit.',
        cards: buildPanelCards(engine, ['sessionPrep', 'dataStudio', 'ki', 'sync', 'diagnostics', 'stateInspector', 'config', 'tests', 'backups'])
      }
    ]
  };
}

registerView({
  id: 'director',
  title: 'Director',
  icon: 'fas fa-compass',
  description: 'Standardansicht für Leitung, Zeit und Runtime.',
  build: buildDirectorView
});

registerView({
  id: 'academy',
  title: 'Akademie',
  icon: 'fas fa-school',
  description: 'Setup-Ansicht für Stundenplan, Orte und Daten.',
  build: buildAcademyView
});

registerView({
  id: 'schedule',
  title: 'Stundenplan',
  icon: 'fas fa-calendar-days',
  description: 'Slot-Builder und Kalenderverwaltung.',
  build: buildScheduleView
});

registerView({
  id: 'people',
  title: 'Akteure (NSCs)',
  icon: 'fas fa-users',
  description: 'Drag & Drop Roster für Lehrer, Schüler & NSCs.',
  build: buildPeopleViewLocal
});

registerView({
  id: 'places',
  title: 'Ortschaften',
  icon: 'fas fa-map-location-dot',
  description: 'Szenen-Zuweisung & Locations.',
  build: buildPlacesViewLocal
});

registerView({
  id: 'system',
  title: 'System & KI',
  icon: 'fas fa-microchip',
  description: 'Diagnostik, Sync-Engine und KI-Snapshotting.',
  build: buildSystemViewLocal
});

registerView({
  id: 'tools',
  title: 'Werkzeuge',
  icon: 'fas fa-screwdriver-wrench',
  description: 'Werkzeuge, Panels und technische Subsysteme.',
  build: buildToolsView
});

async function buildSessionPrepView(engine) {
  if (!engine) return { notReady: true };
  const SessionPrepService = await getSessionPrepService();
  if (typeof SessionPrepService !== 'function') {
    return {
      isGM: !!game?.user?.isGM,
      generatedAt: new Date().toISOString(),
      slotRef: {},
      suggestions: [],
      currentLessons: [],
      currentExams: [],
      currentEvents: [],
      currentCast: [],
      upcoming: [],
      sceneChecklist: [],
      prepAgenda: [],
      chroniclePreview: [],
      chronicleSeed: null,
      gradeOverview: { schemeId: null, schemeName: '—', items: [], summary: { total: 0, excellent: 0, passed: 0, failed: 0 } },
      gradeLedger: { periodLabel: 'Jahr — · Trimester —', items: [], summary: { actorCount: 0, currentTrimesterTagged: 0 } },
      trimesterGrades: { schemeId: null, schemeName: '—', periodLabel: 'Jahr — · Trimester —', items: [], summary: { actorCount: 0, criticalCount: 0, provisionalCount: 0 } },
      reportCardDrafts: [],
      reportCardExportBundle: null,
      reportCardJournalBundle: null,
      gradeExportSeeds: [],
      quests: { total: 0, items: [] },
      activeLocation: null,
      diagnostics: { health: 'unknown', warnings: [] },
      suggestedMoods: [],
      contentSeeds: [],
      unavailable: true
    };
  }
  const service = new SessionPrepService({ engine, logger: engine?.core?.logger ?? console });
  const report = await service.buildReport({ horizonSlots: 3 });
  
  const current = report.currentSlot ?? {};
  return {
    isGM: !!game?.user?.isGM,
    generatedAt: report.generatedAt ?? new Date().toISOString(),
    slotRef: report.slotRef ?? {},
    suggestions: report.suggestions ?? [],
    currentLessons: current.lessons ?? [],
    currentExams: current.exams ?? [],
    currentEvents: current.events ?? [],
    currentCast: report.currentCast ?? [],
    upcoming: report.upcoming ?? [],
    sceneChecklist: report.sceneChecklist ?? [],
    prepAgenda: report.prepAgenda ?? [],
    chroniclePreview: report.chroniclePreview ?? [],
    chronicleSeed: report.chronicleSeed ?? null,
    gradeOverview: report.gradeOverview ?? { schemeId: null, schemeName: '—', items: [], summary: { total: 0, excellent: 0, passed: 0, failed: 0 } },
    gradeLedger: report.gradeLedger ?? { periodLabel: 'Jahr — · Trimester —', items: [], summary: { actorCount: 0, currentTrimesterTagged: 0 } },
    trimesterGrades: report.trimesterGrades ?? { schemeId: null, schemeName: '—', periodLabel: 'Jahr — · Trimester —', items: [], summary: { actorCount: 0, criticalCount: 0, provisionalCount: 0 } },
    reportCardDrafts: report.reportCardDrafts ?? [],
    reportCardExportBundle: report.reportCardExportBundle ?? null,
    reportCardJournalBundle: report.reportCardJournalBundle ?? null,
    gradeExportSeeds: report.gradeExportSeeds ?? [],
    quests: report.quests ?? { total: 0, items: [] },
    activeLocation: report.activeLocation ?? null,
    diagnostics: report.diagnostics ?? { health: 'unknown', warnings: [] },
    suggestedMoods: report.suggestedMoods ?? [],
    contentSeeds: report.contentSeeds ?? [],
  };
}

registerView({
  id: 'sessionPrep',
  title: 'Session Prep',
  icon: 'fas fa-wand-magic-sparkles',
  description: 'Vorbereitung und Planung der nächsten Session.',
  build: buildSessionPrepView
});

export default {
  registerView,
  getView,
  getViews
};
