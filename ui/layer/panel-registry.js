/**
 * JANUS7 UI Layer - Panel Registry
 * Additive registry for the modular shell layer.
 * Panels are metadata-driven so future extensions only register here.
 */

const PANEL_REGISTRY = new Map();

export function registerPanel(definition = {}) {
  const id = String(definition.id ?? '').trim();
  if (!id) throw new Error('[JANUS7][Shell] Panel definition requires an id.');
  const normalized = {
    id,
    title: definition.title ?? id,
    icon: definition.icon ?? 'fas fa-circle-dot',
    group: definition.group ?? 'tools',
    quick: definition.quick === true,
    appKey: definition.appKey ?? null,
    description: definition.description ?? '',
    summary: definition.summary ?? '',
    actions: Array.isArray(definition.actions) ? definition.actions : [],
    build: typeof definition.build === 'function' ? definition.build : (() => ({}))
  };
  PANEL_REGISTRY.set(id, normalized);
  return normalized;
}

export function getPanel(id) {
  return PANEL_REGISTRY.get(String(id)) ?? null;
}

export function getPanels() {
  return [...PANEL_REGISTRY.values()];
}

export function getQuickPanels() {
  return getPanels().filter((panel) => panel.quick);
}

export function getToolPanels() {
  return getPanels().filter((panel) => panel.group === 'tools' || panel.group === 'director' || panel.group === 'academy');
}

export function getPanelOptions() {
  return getPanels().map((panel) => ({ id: panel.id, title: panel.title, icon: panel.icon }));
}

function buildScoringPanel(engine) {
  const scoring = engine?.core?.state?.get?.('academy.scoring') ?? engine?.core?.state?.get?.('scoring') ?? {};
  const circles = Array.isArray(scoring?.circles)
    ? scoring.circles
    : (scoring?.circles && typeof scoring.circles === 'object')
      ? Object.entries(scoring.circles).map(([id, value]) => ({
          id,
          score: typeof value === 'object' && value !== null ? Number(value.score ?? 0) : Number(value ?? 0),
          name: typeof value === 'object' && value !== null ? (value.name ?? id) : id
        }))
      : Array.isArray(scoring?.houses) ? scoring.houses : [];
  const top = [...circles].sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0))[0] ?? null;
  return {
    metrics: [
      { label: 'Zirkel/Häuser', value: circles.length || 0 },
      { label: 'Führend', value: top?.name ?? top?.id ?? '—' },
      { label: 'Punkte', value: Number(top?.score ?? 0) }
    ],
    items: circles.slice(0, 6).map((c) => ({
      label: c?.name ?? c?.id ?? 'Unbenannt',
      value: Number(c?.score ?? 0)
    }))
  };
}

function buildSocialPanel(engine) {
  const graph = engine?.academy?.social?.graph ?? engine?.academy?.socialGraph ?? null;
  const links = Array.isArray(graph?.edges) ? graph.edges : Array.isArray(graph?.relations) ? graph.relations : [];
  return {
    metrics: [
      { label: 'Beziehungen', value: links.length || 0 },
      { label: 'Status', value: engine?.academy?.social ? 'Aktiv' : 'Fehlt' }
    ],
    items: links.slice(0, 6).map((edge) => ({
      label: `${edge?.from ?? edge?.source ?? '?'} -> ${edge?.to ?? edge?.target ?? '?'}`,
      value: edge?.attitude ?? edge?.weight ?? '—'
    }))
  };
}

function buildAtmospherePanel(engine) {
  const atmo = engine?.atmosphere ?? {};
  const lastMood = atmo?.lastMood ?? atmo?.currentMood ?? atmo?.controller?.lastMood ?? null;
  return {
    metrics: [
      { label: 'Atmosphäre', value: atmo ? 'Aktiv' : 'Fehlt' },
      { label: 'Mood', value: lastMood?.title ?? lastMood?.id ?? '—' },
      { label: 'Auto', value: atmo?.auto === false ? 'Aus' : 'An' }
    ],
    items: [
      { label: 'Overlay', value: atmo?.overlayEnabled ? 'An' : 'Aus' },
      { label: 'Provider', value: atmo?.provider?.id ?? atmo?.providerId ?? '—' }
    ]
  };
}

function buildQuestPanel(engine) {
  const quests = engine?.academy?.quests;
  const state = engine?.core?.state?.get?.('questStates') ?? engine?.core?.state?.get?.('academy.quests') ?? {};
  const active = [];
  for (const [actorId, questMap] of Object.entries(state ?? {})) {
    if (!questMap || typeof questMap !== 'object') continue;
    for (const [questId, q] of Object.entries(questMap)) {
      if (q?.status === 'active') active.push({ actorId, questId, state: q });
    }
  }
  return {
    metrics: [
      { label: 'Quest Engine', value: quests ? 'Aktiv' : 'Fehlt' },
      { label: 'Aktiv', value: active.length || 0 }
    ],
    items: active.slice(0, 8).map((entry) => ({ label: entry.questId, value: entry.actorId }))
  };
}

function buildStatePanel(engine) {
  const time = engine?.core?.state?.get?.('time') ?? {};
  const diagnostics = engine?.diagnostics?.snapshot?.() ?? engine?.diagnostics?.buildSnapshot?.() ?? {};
  return {
    metrics: [
      { label: 'Tag', value: time?.dayName ?? time?.day ?? '—' },
      { label: 'Phase', value: time?.phase ?? time?.slotName ?? '—' },
      { label: 'Dirty', value: diagnostics?.stateStatus ?? diagnostics?.dirty ?? '—' }
    ],
    items: [
      { label: 'Version', value: game?.modules?.get?.('Janus7')?.version ?? '—' },
      { label: 'Welt', value: game?.world?.title ?? game?.world?.id ?? '—' }
    ]
  };
}

function buildDiagnosticsPanel(engine) {
  const snapshot = engine?.diagnostics?.snapshot?.() ?? {};
  const graph = snapshot?.graph ?? engine?.graph?.diagnostics?.() ?? {};
  const cache = graph?.cache ?? {};
  return {
    metrics: [
      { label: 'Nodes', value: graph?.nodes ?? graph?.nodeCount ?? 0 },
      { label: 'Edges', value: graph?.edges ?? graph?.edgeCount ?? 0 },
      { label: 'Cache', value: cache?.size ?? 0 }
    ],
    items: [
      { label: 'Hits', value: cache?.hits ?? 0 },
      { label: 'Misses', value: cache?.misses ?? 0 },
      { label: 'Invalidations', value: cache?.invalidations ?? 0 }
    ]
  };
}

function buildDataStudioPanel(engine) {
  const academy = engine?.academy?.data ?? engine?.academy?.dataApi ?? null;
  const lessons = academy?.listLessonIds?.(999) ?? [];
  const npcs = academy?.listNpcIds?.(999) ?? [];
  const locations = academy?.listLocationIds?.(999) ?? [];
  return {
    metrics: [
      { label: 'Lektionen', value: lessons.length },
      { label: 'NPCs', value: npcs.length },
      { label: 'Orte', value: locations.length }
    ],
    items: [
      { label: 'Akademie-Daten', value: academy ? 'Geladen' : 'Fehlt' }
    ]
  };
}

function buildLessonLibraryPanel(engine) {
  const academy = engine?.academy?.data ?? engine?.academy?.dataApi ?? null;
  const ids = academy?.listLessonIds?.(999) ?? [];
  return {
    metrics: [
      { label: 'Lektionen', value: ids.length },
      { label: 'Bibliothek', value: academy ? 'Verfügbar' : 'Fehlt' }
    ],
    items: ids.slice(0, 8).map((id) => ({ label: id, value: academy?.getLesson?.(id)?.title ?? 'Lektion' }))
  };
}

const PANEL_DEFINITIONS = [
  {
    id: 'scoring',
    title: 'Scoring',
    icon: 'fas fa-trophy',
    group: 'director',
    quick: true,
    appKey: 'scoringView',
    description: 'Hauspunkte, Zirkel und Wertungsüberblick.',
    summary: 'Zentraler Zugriff auf Scoring und Ranglisten.',
    actions: [
      { kind: 'openApp', appKey: 'scoringView', label: 'Scoring öffnen', icon: 'fas fa-trophy' }
    ],
    build: buildScoringPanel
  },
  {
    id: 'social',
    title: 'Social',
    icon: 'fas fa-users',
    group: 'director',
    quick: true,
    appKey: 'socialView',
    description: 'Beziehungen, Attitudes und Dramatis-Personae-Kontext.',
    summary: 'Schneller Zugriff auf soziale Verflechtungen.',
    actions: [
      { kind: 'openApp', appKey: 'socialView', label: 'Social View öffnen', icon: 'fas fa-users' }
    ],
    build: buildSocialPanel
  },
  {
    id: 'atmosphere',
    title: 'Atmosphäre',
    icon: 'fas fa-music',
    group: 'director',
    quick: true,
    appKey: 'atmosphereDJ',
    description: 'Mood, Audio und Beamer-nahe Stimmungssteuerung.',
    summary: 'Aktive Atmosphären und schnelle DJ-Controls.',
    actions: [
      { kind: 'openApp', appKey: 'atmosphereDJ', label: 'Atmosphäre öffnen', icon: 'fas fa-music' },
      { kind: 'command', command: 'copyDiagnostics', label: 'Diagnose kopieren', icon: 'fas fa-clipboard' }
    ],
    build: buildAtmospherePanel
  },
  {
    id: 'quests',
    title: 'Quests',
    icon: 'fas fa-scroll',
    group: 'director',
    quick: true,
    appKey: null,
    description: 'Quest- und Event-bezogene Werkzeuge.',
    summary: 'Quest-Journal, Start/Abschluss und Statusprüfung.',
    actions: [
      { kind: 'command', command: 'listActiveQuests', label: 'Aktive Quests prüfen', icon: 'fas fa-list' },
      { kind: 'panelAction', action: 'openQuestJournal', label: 'Quest-Journal öffnen', icon: 'fas fa-book-open' }
    ],
    build: buildQuestPanel
  },
  {
    id: 'ki',
    title: 'KI Roundtrip',
    icon: 'fas fa-brain',
    group: 'tools',
    quick: true,
    appKey: 'kiRoundtrip',
    description: 'KI-Export, Diff, Preview und Import.',
    summary: 'Bridge zur Phase-7-KI-Pipeline.',
    actions: [
      { kind: 'openApp', appKey: 'kiRoundtrip', label: 'KI-Roundtrip öffnen', icon: 'fas fa-robot' },
      { kind: 'openApp', appKey: 'kiBackupManager', label: 'Backups öffnen', icon: 'fas fa-life-ring' }
    ],
    build: () => ({})
  },
  {
    id: 'sync',
    title: 'Sync',
    icon: 'fas fa-link',
    group: 'tools',
    quick: true,
    appKey: 'syncPanel',
    description: 'Sync, Import, Export und State-Übertragung.',
    summary: 'Datenflüsse und World-Sync.',
    actions: [
      { kind: 'openApp', appKey: 'syncPanel', label: 'Sync-Panel öffnen', icon: 'fas fa-link' },
      { kind: 'command', command: 'saveState', label: 'State speichern', icon: 'fas fa-save' }
    ],
    build: () => ({})
  },
  {
    id: 'stateInspector',
    title: 'State Inspector',
    icon: 'fas fa-database',
    group: 'tools',
    appKey: 'stateInspector',
    description: 'State-Inspektion und Debug-Einsicht.',
    summary: 'Lesender Blick auf den aktuellen Kampagnenzustand.',
    actions: [
      { kind: 'openApp', appKey: 'stateInspector', label: 'State Inspector öffnen', icon: 'fas fa-database' },
      { kind: 'command', command: 'exportState', label: 'State exportieren', icon: 'fas fa-download' }
    ],
    build: buildStatePanel
  },
  {
    id: 'config',
    title: 'Konfiguration',
    icon: 'fas fa-sliders',
    group: 'tools',
    appKey: 'configPanel',
    description: 'Konfigurationsoberflächen und Mapping.',
    summary: 'Szenen, UUIDs und Betriebsparameter.',
    actions: [
      { kind: 'openApp', appKey: 'configPanel', label: 'Konfiguration öffnen', icon: 'fas fa-cog' }
    ],
    build: () => ({})
  },
  {
    id: 'diagnostics',
    title: 'Diagnostik',
    icon: 'fas fa-stethoscope',
    group: 'tools',
    appKey: 'commandCenter',
    description: 'Graph, Cache, Fehler und Betriebszustand.',
    summary: 'Operative Systemdiagnose innerhalb des UI-Layers.',
    actions: [
      { kind: 'openApp', appKey: 'commandCenter', label: 'Command Center öffnen', icon: 'fas fa-terminal' },
      { kind: 'panelAction', action: 'graphInvalidate', label: 'Graph-Cache leeren', icon: 'fas fa-broom' },
      { kind: 'panelAction', action: 'graphRebuild', label: 'Graph neu aufbauen', icon: 'fas fa-project-diagram' }
    ],
    build: buildDiagnosticsPanel
  },
  {
    id: 'sessionPrep',
    title: 'Session Prep',
    icon: 'fas fa-wand-magic-sparkles',
    group: 'tools',
    appKey: 'sessionPrepWizard',
    description: 'Vorbereitung der nächsten Session.',
    summary: 'Brücke zum Session-Prep-Wizard.',
    actions: [
      { kind: 'setView', viewId: 'sessionPrep', label: 'Prep Wizard öffnen', icon: 'fas fa-wand-magic-sparkles' }
    ],
    build: () => ({})
  },
  {
    id: 'tests',
    title: 'Tests',
    icon: 'fas fa-flask-vial',
    group: 'tools',
    appKey: 'testResults',
    description: 'Runner, Results und Guided Tests.',
    summary: 'Schneller Einstieg in QA-Artefakte.',
    actions: [
      { kind: 'openApp', appKey: 'testResults', label: 'Test Results öffnen', icon: 'fas fa-flask' },
      { kind: 'openApp', appKey: 'guidedManualTests', label: 'Guided Tests öffnen', icon: 'fas fa-person-chalkboard' }
    ],
    build: () => ({})
  },
  {
    id: 'backups',
    title: 'Backups',
    icon: 'fas fa-life-ring',
    group: 'tools',
    appKey: 'kiBackupManager',
    description: 'KI-Backups und Wiederherstellung.',
    summary: 'Sicherung der Phase-7-Artefakte.',
    actions: [
      { kind: 'openApp', appKey: 'kiBackupManager', label: 'Backup Manager öffnen', icon: 'fas fa-life-ring' }
    ],
    build: () => ({})
  },
  {
    id: 'dataStudio',
    title: 'Data Studio',
    icon: 'fas fa-table',
    group: 'academy',
    appKey: 'academyDataStudio',
    description: 'Bearbeitung und Einsicht der Akademiedaten.',
    summary: 'Modulares Datenstudio für Lektionen, NPCs und Orte.',
    actions: [
      { kind: 'openApp', appKey: 'academyDataStudio', label: 'Data Studio öffnen', icon: 'fas fa-table' }
    ],
    build: buildDataStudioPanel
  },
  {
    id: 'lessonLib',
    title: 'Lesson Library',
    icon: 'fas fa-book-open',
    group: 'academy',
    appKey: 'lessonLibrary',
    description: 'Bibliothek aller Lektionen und Unterrichtsbausteine.',
    summary: 'Schneller Einstieg in die Lesson Library.',
    actions: [
      { kind: 'openApp', appKey: 'lessonLibrary', label: 'Lesson Library öffnen', icon: 'fas fa-book' }
    ],
    build: buildLessonLibraryPanel
  },
  {
    id: 'academyOverview',
    title: 'Academy Overview',
    icon: 'fas fa-calendar-alt',
    group: 'academy',
    appKey: 'academyOverview',
    description: 'Stundenplan, Wochenraster und Akademie-Overview.',
    summary: 'Operative Akademieansicht.',
    actions: [
      { kind: 'openApp', appKey: 'academyOverview', label: 'Overview öffnen', icon: 'fas fa-school' }
    ],
    build: () => ({})
  }
];

for (const def of PANEL_DEFINITIONS) registerPanel(def);

export default {
  registerPanel,
  getPanel,
  getPanels,
  getQuickPanels,
  getToolPanels,
  getPanelOptions
};
