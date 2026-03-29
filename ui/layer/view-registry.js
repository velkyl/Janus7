import { getPanels } from './panel-registry.js';
import { JanusSessionPrepService } from '../../phase8/session-prep/JanusSessionPrepService.js';

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

function buildDirectorView(engine) {
  const state = engine?.core?.state;
  const time = state?.get?.('time') ?? {};
  const workflow = engine?.core?.director?.workflow?.getRuntimeContext?.() ?? engine?.core?.director?.getWorkflowContext?.() ?? {};
  const diagnostics = engine?.diagnostics?.snapshot?.() ?? {};
  const graph = diagnostics?.graph ?? {};
  const cache = graph?.cache ?? {};
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
          { kind: 'openApp', appKey: 'controlPanel', label: 'Control Panel', icon: 'fas fa-compass-drafting' },
          { kind: 'openApp', appKey: 'commandCenter', label: 'Command Center', icon: 'fas fa-terminal' }
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
    ]
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

function buildToolsView(_engine) {
  const toolPanels = getPanels().filter((panel) => ['tools', 'academy', 'director'].includes(panel.group));
  return {
    tiles: toolPanels.map((panel) => ({
      id: panel.id,
      title: panel.title,
      icon: panel.icon,
      description: panel.description,
      actionKind: 'openPanel'
    }))
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
  id: 'tools',
  title: 'Werkzeuge',
  icon: 'fas fa-screwdriver-wrench',
  description: 'Werkzeuge, Panels und technische Subsysteme.',
  build: buildToolsView
});

async function buildSessionPrepView(engine) {
  if (!engine) return { notReady: true };
  const service = new JanusSessionPrepService({ engine, logger: engine?.core?.logger ?? console });
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
    upcoming: report.upcoming ?? [],
    quests: report.quests ?? { total: 0, items: [] },
    activeLocation: report.activeLocation ?? null,
    diagnostics: report.diagnostics ?? { health: 'unknown', warnings: [] },
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
