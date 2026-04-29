// v2 registry cache bypass
import { getPanel } from './panel-registry.js';
import { createJanusAlumniService, createJanusSessionPrepService } from '../../scripts/extensions/phase8-api.js';
import { buildLocationsView, buildPeopleView, buildKiContext, buildSyncView, buildSystemView } from './context-builders.js';
import { prepareDirectorRuntimeSummary, buildDirectorRunbookView, buildDirectorWorkflowView } from './director-context.js';
import JanusAssetResolver from '../../core/services/asset-resolver.js';
import { DSA5CalendarSync } from '../../bridge/dsa5/calendar-sync.js';
import { JanusProfileRegistry } from '../../core/profiles/index.js';
import { buildAppLauncherSections } from './app-launcher-context.js';
import { getModule } from './module-registry.js';

const VIEW_REGISTRY = new Map();
const VIEW_JSON_CACHE = new Map();

// --- Registry Core ---

export function registerView(definition = {}) {
  const id = String(definition.id ?? '').trim();
  if (!id) throw new Error('[JANUS7][Shell] View definition requires an id.');
  const normalized = {
    id,
    title: definition.title ?? id,
    icon: definition.icon ?? 'fas fa-circle-dot',
    description: definition.description ?? '',
    build: typeof definition.build === 'function' ? definition.build : (() => ({ cards: [] })),
    defaultModuleIds: Array.isArray(definition.defaultModuleIds) ? definition.defaultModuleIds : []
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

// --- Global Module Resolver ---

/**
 * Builds a specific module (card) by its global ID.
 * This is the core of the dynamic UI assignment.
 */
export async function buildGlobalModule(moduleId, engine, app) {
  const def = getModule(moduleId);
  if (!def) return null;

  // Fetch shared contexts
  const state = engine?.core?.state;
  const time = state?.get?.('time') ?? {};
  
  // Specific data resolution based on moduleId
  switch (moduleId) {
    // Director
    case 'time-control':
      return {
        ...def,
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
      };

    case 'runtime': {
      const workflow = engine?.core?.director?.workflow?.getRuntimeContext?.() ?? engine?.core?.director?.getWorkflowContext?.() ?? {};
      return {
        ...def,
        metrics: [
          { label: 'Director', value: engine?.core?.director ? 'Aktiv' : 'Fehlt' },
          { label: 'Modus', value: workflow?.mode ?? workflow?.state ?? '—' },
          { label: 'Runbook', value: workflow?.runbookId ?? '—' }
        ],
        actions: [
          { kind: 'openApp', appKey: 'shell', label: 'Shell', icon: 'fas fa-compass-drafting' },
          { kind: 'openApp', appKey: 'commandCenter', label: 'Power Tools', icon: 'fas fa-terminal' }
        ]
      };
    }

    case 'atmosphere': {
      const diagnostics = engine?.diagnostics?.snapshot?.() ?? {};
      const graph = diagnostics?.graph ?? {};
      return {
        ...def,
        metrics: [
          { label: 'Nodes', value: graph?.nodes ?? graph?.nodeCount ?? 0 },
          { label: 'Edges', value: graph?.edges ?? graph?.edgeCount ?? 0 },
          { label: 'Cache', value: graph?.cache?.size ?? 0 }
        ],
        actions: [
          { kind: 'openPanel', panelId: 'atmosphere', label: 'Atmosphäre', icon: 'fas fa-music' },
          { kind: 'openPanel', panelId: 'diagnostics', label: 'Diagnostik', icon: 'fas fa-heart-pulse' }
        ]
      };
    }

    case 'runbook': {
      const { directorRuntime } = app?._buildDirectorRuntimeContext?.() ?? {};
      const directorWorkflow = app?._buildDirectorWorkflowView(directorRuntime);
      const directorRunbook = buildDirectorRunbookView(directorRuntime, directorWorkflow);
      return { ...def, directorRunbook };
    }

    case 'workflow-events': {
      const { directorRuntime } = app?._buildDirectorRuntimeContext?.() ?? {};
      const directorWorkflow = app?._buildDirectorWorkflowView(directorRuntime);
      return { ...def, directorWorkflow };
    }

    case 'status-monitor':
      return { ...def }; // Static template-based

    case 'creatures':
      return { ...def }; // Static template-based
    
    case 'calendar-events':
      return { ...def }; // Static template-based

    // Academy
    case 'academy-profile': {
      const activeProfile = JanusProfileRegistry.getActive();
      let profileContract = null;
      try {
        profileContract = await loadModuleJson(`profiles/${activeProfile?.id ?? 'punin'}/profile-contract.json`);
      } catch (_err) {}
      return {
        ...def,
        metrics: [
          { label: 'Profil', value: activeProfile?.name ?? '?' },
          { label: 'Level', value: profileContract?.validatedLevel ?? profileContract?.targetLevel ?? '?' },
          { label: 'Rolle', value: profileContract?.referenceRole ?? '?' },
          { label: 'Region', value: activeProfile?.meta?.region ?? '?' }
        ],
        items: [
          { label: 'Fokus', value: activeProfile?.meta?.focus ?? '?' },
          { label: 'Datenwurzel', value: profileContract?.dataRoot ?? '?' }
        ],
        actions: [
          { kind: 'setView', viewId: 'sessionPrep', label: 'Session Prep', icon: 'fas fa-wand-magic-sparkles' }
        ]
      };
    }

    case 'academy-week': {
      const academy = engine?.academy?.data ?? null;
      const calendar = engine?.academy?.calendar ?? null;
      const dayEntries = calendar?.getCalendarEntriesForDay?.({
        year: time?.year, trimester: time?.trimester, week: time?.week, day: time?.dayName ?? time?.day
      }) ?? [];
      const sessions = academy?.getTeachingSessionsForSlot?.({
        year: time?.year, trimester: time?.trimester, week: time?.week, day: time?.dayName ?? time?.day, phase: time?.phase ?? time?.slotName
      }) ?? [];
      return {
        ...def,
        metrics: [
          { label: 'Eintraege heute', value: dayEntries.length },
          { label: 'Sessions jetzt', value: sessions.length },
          { label: 'Woche', value: time?.week ?? '?' }
        ],
        items: dayEntries.slice(0, 6).map(e => ({ label: e.phase ?? 'Slot', value: e.title ?? 'Eintrag' })),
        actions: [
          { kind: 'openApp', appKey: 'academyOverview', label: 'Overview', icon: 'fas fa-school' }
        ]
      };
    }

    case 'academy-data': {
      const academy = engine?.academy?.data ?? null;
      return {
        ...def,
        metrics: [
          { label: 'Lektionen', value: academy?.getLessons?.()?.length ?? 0 },
          { label: 'NPCs', value: academy?.getNpcs?.()?.length ?? 0 },
          { label: 'Orte', value: academy?.getLocations?.()?.length ?? 0 }
        ],
        actions: [
          { kind: 'openPanel', panelId: 'dataStudio', label: 'Data Studio', icon: 'fas fa-table' }
        ]
      };
    }

    // Schedule
    case 'slot-builder':
      return { ...def }; // Template-based

    case 'daily-plan':
      return {
        ...def,
        metrics: [{ label: 'Phase', value: time?.phase ?? '—' }],
        actions: [{ kind: 'openApp', appKey: 'academyOverview', label: 'Academy Overview', icon: 'fas fa-school' }]
      };

    // People
    case 'teachers':
    case 'students':
    case 'npcs': {
      const peopleView = buildPeopleView({ state: state?.get?.() ?? {}, actors: game?.actors });
      const role = moduleId === 'teachers' ? 'teachers' : (moduleId === 'students' ? 'students' : 'npcs');
      const label = moduleId === 'teachers' ? 'Lehrer' : (moduleId === 'students' ? 'Schüler' : 'NSC');
      return {
        ...def,
        role,
        items: peopleView[role].map(p => ({ label: p.name, value: label }))
      };
    }

    case 'companions':
      return {
        ...def,
        items: (app?.__renderCache?._persistent?.moduleContent?.companions ?? []).slice(0, 8).map(c => ({ label: c.name, uuid: c.uuid, img: c.img }))
      };

    case 'alumni':
      return { ...def, isWide: true };

    // Places
    case 'locations-list': {
      const { locations } = buildLocationsView({ state: state?.get?.() ?? {}, academyData: engine?.academy?.data });
      return {
        ...def,
        items: locations.map(l => ({ label: l.name, value: l.sceneName ?? '—', id: l.id, sceneId: l.sceneId, hasScene: l.hasScene }))
      };
    }

    case 'active-location': {
      const { locationView } = buildLocationsView({ state: state?.get?.() ?? {}, academyData: engine?.academy?.data });
      return {
        ...def,
        metrics: [
          { label: 'Ort', value: locationView.activeLocationName },
          { label: 'Stimmung', value: locationView.defaultMoodKey }
        ],
        actions: [{ kind: 'openPanel', panelId: 'atmosphere', label: 'Atmosphäre', icon: 'fas fa-music' }]
      };
    }

    // System
    case 'system-status': {
      const system = buildSystemView({ engine });
      return {
        ...def,
        metrics: [
          { label: 'Simulation', value: system.enableSimulation ? 'ON' : 'OFF' },
          { label: 'AI Ready', value: system.geminiReady ? 'YES' : 'NO' }
        ]
      };
    }

    case 'sync-monitor':
      return {
        ...def,
        items: [{ label: 'Bridge', value: 'OK' }, { label: 'Outbox', value: 'Clean' }],
        actions: [{ kind: 'openApp', appKey: 'dataStudio', label: 'Data Studio', icon: 'fas fa-database' }]
      };

    // Workbench Sections
    case 'section-academy':
    case 'section-livingWorld':
    case 'section-admin':
    case 'section-maintenance': {
      const category = moduleId.replace('section-', '');
      const sections = buildAppLauncherSections(app?._viewId, app);
      const section = sections.find(s => s.id === category);
      if (!section) return null;
      return {
        ...def,
        items: section.items.map(item => ({
          label: item.title, value: item.mode, key: item.key, icon: item.icon, description: item.description, isAvailable: item.isAvailable
        }))
      };
    }

    default:
      return def;
  }
}

// --- Legacy Helpers (for transition) ---

async function loadModuleJson(path) {
  const key = String(path ?? '').trim();
  if (!key) return null;
  if (VIEW_JSON_CACHE.has(key)) return VIEW_JSON_CACHE.get(key);
  const request = (async () => {
    const response = await fetch(JanusAssetResolver.data(key), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`);
    return response.json();
  })();
  VIEW_JSON_CACHE.set(key, request);
  try { return await request; } catch (err) { VIEW_JSON_CACHE.delete(key); throw err; }
}

// --- View Definitions with Defaults ---

registerView({
  id: 'director',
  title: 'Director',
  icon: 'fas fa-compass',
  description: 'Standardansicht für Leitung, Zeit und Runtime.',
  defaultModuleIds: ['time-control', 'runtime', 'atmosphere', 'runbook', 'workflow-events', 'status-monitor', 'creatures', 'calendar-events']
});

registerView({
  id: 'academy',
  title: 'Akademie',
  icon: 'fas fa-school',
  description: 'Setup-Ansicht für Stundenplan, Orte und Daten.',
  defaultModuleIds: ['academy-profile', 'academy-week', 'academy-data', 'academy-hooks']
});

registerView({
  id: 'schedule',
  title: 'Stundenplan',
  icon: 'fas fa-calendar-days',
  description: 'Slot-Builder und Kalenderverwaltung.',
  defaultModuleIds: ['slot-builder', 'daily-plan']
});

registerView({
  id: 'people',
  title: 'Akteure (NSCs)',
  icon: 'fas fa-users',
  description: 'Drag & Drop Roster für Lehrer, Schüler & NSCs.',
  defaultModuleIds: ['teachers', 'students', 'npcs', 'companions', 'alumni']
});

registerView({
  id: 'places',
  title: 'Ortschaften',
  icon: 'fas fa-map-location-dot',
  description: 'Szenen-Zuweisung & Locations.',
  defaultModuleIds: ['locations-list', 'active-location']
});

registerView({
  id: 'system',
  title: 'System & KI',
  icon: 'fas fa-microchip',
  description: 'Diagnostik, Sync-Engine und KI-Snapshotting.',
  defaultModuleIds: ['system-status', 'sync-monitor']
});

registerView({
  id: 'workbench',
  title: 'Workbench',
  icon: 'fas fa-th-large',
  description: 'Zentraler Hub für alle Apps und Werkzeuge.',
  defaultModuleIds: ['section-academy', 'section-livingWorld', 'section-admin', 'section-maintenance']
});

// Special views (not yet fully modularized or with custom logic)
registerView({ id: 'tools', title: 'Werkzeuge', icon: 'fas fa-screwdriver-wrench', build: (engine) => ({ cards: [] }) });
registerView({ id: 'chronicleBrowser', title: 'Bote-Chronik', icon: 'fas fa-newspaper', build: (engine, app) => ({ cards: [] }) });
registerView({ id: 'sessionPrep', title: 'Session Prep', icon: 'fas fa-wand-magic-sparkles', build: (engine) => ({ cards: [] }) });

export default {
  registerView,
  getView,
  getViews,
  buildGlobalModule
};
