// v2 registry cache bypass
import { getPanel } from './panel-registry.js';
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
import JanusAssetResolver from '../../core/services/asset-resolver.js';
import { DSA5CalendarSync } from '../../bridge/dsa5/calendar-sync.js';
import { JanusProfileRegistry } from '../../core/profiles/index.js';

const VIEW_REGISTRY = new Map();
const VIEW_JSON_CACHE = new Map();

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
  try {
    return await request;
  } catch (err) {
    VIEW_JSON_CACHE.delete(key);
    throw err;
  }
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

async function buildAcademyView(engine) {
  const academy = engine?.academy?.data ?? engine?.academy?.dataApi ?? null;
  const calendar = engine?.academy?.calendar ?? null;
  const time = engine?.core?.state?.get?.('time') ?? {};
  const activeProfile = JanusProfileRegistry.getActive();
  let profileContract = null;
  try {
    profileContract = await loadModuleJson(`profiles/${activeProfile?.id ?? 'punin'}/profile-contract.json`);
  } catch (_err) {
    profileContract = null;
  }

  const dayEntries = calendar?.getCalendarEntriesForDay?.({
    year: time?.year,
    trimester: time?.trimester,
    week: time?.week,
    day: time?.dayName ?? time?.day
  }) ?? [];
  const lessons = academy?.getLessons?.() ?? [];
  const npcs = academy?.getNpcs?.() ?? [];
  const locations = academy?.getLocations?.() ?? [];
  const events = academy?.getEvents?.() ?? [];
  const questIndex = academy?.getQuestIndex?.() ?? [];
  const poolIndex = academy?.getPoolIndex?.() ?? [];
  const factions = academy?.getFactions?.() ?? [];
  const socialLinks = academy?.getSocialLinks?.() ?? [];
  const sessions = academy?.getTeachingSessionsForSlot?.({
    year: time?.year,
    trimester: time?.trimester,
    week: time?.week,
    day: time?.dayName ?? time?.day,
    phase: time?.phase ?? time?.slotName
  }) ?? [];
  const nextLessonHooks = lessons.slice(0, 4).map((entry) => ({
    label: entry?.name ?? entry?.title ?? entry?.id ?? 'Lektion',
    value: entry?.teacherNpcId ?? entry?.teacherNpcIds?.[0] ?? entry?.id ?? 'lesson'
  }));
  const nextQuestHooks = questIndex.slice(0, 4).map((entry) => ({
    label: entry?.title ?? entry?.questId ?? 'Quest',
    value: entry?.questId ?? entry?.status ?? 'quest'
  }));

  return {
    cards: [
      {
        title: 'Profil & Vertrag',
        icon: 'fas fa-school-flag',
        description: 'Aktives Akademieprofil, Vertragsstatus und Referenzrolle.',
        metrics: [
          { label: 'Profil', value: activeProfile?.name ?? '?' },
          { label: 'Level', value: profileContract?.validatedLevel ?? profileContract?.targetLevel ?? '?' },
          { label: 'Rolle', value: profileContract?.referenceRole ?? '?' },
          { label: 'Region', value: activeProfile?.meta?.region ?? '?' }
        ],
        items: [
          { label: 'Fokus', value: activeProfile?.meta?.focus ?? '?' },
          { label: 'Datenwurzel', value: profileContract?.dataRoot ?? '?' },
          { label: 'Ziel', value: profileContract?.targetLevel ?? '?' }
        ],
        actions: [
          { kind: 'setView', viewId: 'sessionPrep', label: 'Session Prep', icon: 'fas fa-wand-magic-sparkles' },
          { kind: 'setView', viewId: 'chronicleBrowser', label: 'Chronik', icon: 'fas fa-newspaper' }
        ]
      },
      {
        title: 'Akademie-Woche',
        icon: 'fas fa-calendar-days',
        description: 'Heutige Eintraege, aktuelle Lehrtermine und Raster-Einstieg.',
        metrics: [
          { label: 'Eintraege heute', value: dayEntries.length },
          { label: 'Sessions jetzt', value: sessions.length },
          { label: 'Woche', value: time?.week ?? '?' },
          { label: 'Trimester', value: time?.trimester ?? '?' }
        ],
        items: dayEntries.slice(0, 6).map((entry) => ({
          label: entry?.phase ?? entry?.slot ?? 'Slot',
          value: entry?.title ?? entry?.id ?? 'Eintrag'
        })),
        actions: [
          { kind: 'openApp', appKey: 'academyOverview', label: 'Overview oeffnen', icon: 'fas fa-school' },
          { kind: 'setView', viewId: 'sessionPrep', label: 'Prep oeffnen', icon: 'fas fa-list-check' }
        ]
      },
      {
        title: 'Akademie-Daten',
        icon: 'fas fa-book',
        description: 'Schnellzugriff auf Datendomaenen, Hooks und soziale Struktur.',
        metrics: [
          { label: 'Lektionen', value: lessons.length },
          { label: 'NPCs', value: npcs.length },
          { label: 'Orte', value: locations.length },
          { label: 'Events', value: events.length }
        ],
        items: [
          { label: 'Questpfade', value: questIndex.length },
          { label: 'Event-Pools', value: poolIndex.length },
          { label: 'Fraktionen', value: factions.length },
          { label: 'Social Links', value: socialLinks.length }
        ],
        actions: [
          { kind: 'openPanel', panelId: 'dataStudio', label: 'Data Studio', icon: 'fas fa-table' },
          { kind: 'openPanel', panelId: 'lessonLib', label: 'Lesson Library', icon: 'fas fa-book-open' }
        ]
      },
      {
        title: 'Naechste Hooks',
        icon: 'fas fa-people-group',
        description: 'Direkte Hook-Sicht fuer Unterricht, Quests und soziale Dynamik.',
        items: [...nextLessonHooks, ...nextQuestHooks].slice(0, 8),
        actions: [
          { kind: 'openPanel', panelId: 'social', label: 'Social', icon: 'fas fa-users' },
          { kind: 'openPanel', panelId: 'scoring', label: 'Scoring', icon: 'fas fa-trophy' },
          { kind: 'setView', viewId: 'chronicleBrowser', label: 'Bote-Chronik', icon: 'fas fa-newspaper' }
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

async function buildPeopleViewLocal(engine, _app) {
  const state = engine?.core?.state?.get?.() ?? {};
  const peopleView = buildPeopleView({ state, actors: game?.actors });
  const AlumniService = await getAlumniService();
  const alumniView = AlumniService
    ? await new AlumniService({ engine, logger: engine?.core?.logger ?? console }).getOverview()
    : { summary: { total: 0, mentors: 0, returned: 0, inactive: 0 }, alumni: [], candidates: [], recentChanges: [] };
  return { peopleView, alumniView };
}

function buildPlacesViewLocal(engine, _app) {
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

function pickBfDateFromState(state = {}) {
  const time = state?.time ?? {};
  const year = Number(time?.year ?? 0);
  const month = Number(time?.month ?? 1);
  const day = Number(time?.dayOfMonth ?? 1);
  if (!Number.isFinite(year) || year <= 0) return null;
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1;
  const safeDay = Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
  return `${year.toString().padStart(4, '0')}-${safeMonth.toString().padStart(2, '0')}-${safeDay.toString().padStart(2, '0')}`;
}

function countAnchors(entries = []) {
  return entries.filter((entry) => entry?.sourceType && entry.sourceType !== 'generated_daily_hook').length;
}

function uniqueSortedLocations(days = []) {
  const bucket = new Set();
  for (const day of days) {
    for (const entry of (day?.entries ?? [])) {
      const location = String(entry?.location ?? '').trim();
      if (location) bucket.add(location);
    }
  }
  return [...bucket].sort((a, b) => a.localeCompare(b, 'de'));
}

function uniqueSortedTags(days = [], hooks = []) {
  const bucket = new Set();
  for (const day of days) {
    for (const entry of (day?.entries ?? [])) {
      for (const tag of (entry?.tags ?? [])) {
        const normalized = String(tag ?? '').trim();
        if (normalized) bucket.add(normalized);
      }
    }
  }
  for (const hook of hooks) {
    for (const tag of (hook?.tags ?? [])) {
      const normalized = String(tag ?? '').trim();
      if (normalized) bucket.add(normalized);
    }
  }
  return [...bucket].sort((a, b) => a.localeCompare(b, 'de'));
}

function matchesSearch(value, searchTerms = []) {
  const haystack = String(value ?? '').toLowerCase();
  if (!searchTerms.length) return true;
  return searchTerms.every((term) => haystack.includes(term));
}

function stripHtml(value) {
  const source = String(value ?? '').trim();
  if (!source) return '';
  return source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildChronicleExportSeed({ focusDate, locationFilter, tagFilter, search, focusDay, monthlyAnchors, yearlyMasterHooks }) {
  const lines = [
    'JANUS7 Bote Chronicle Export',
    `Fokusdatum: ${focusDate ?? '—'}`,
    `Ortsfilter: ${locationFilter || 'alle Orte'}`,
    `Tag-Filter: ${tagFilter || 'alle Tags'}`,
    `Suche: ${search || 'keine'}`,
    '',
    'Fokus-Tag:',
  ];

  const dayEntries = Array.isArray(focusDay?.entries) ? focusDay.entries : [];
  if (dayEntries.length) {
    for (const entry of dayEntries.slice(0, 8)) {
      lines.push(`- ${entry.label} | ${entry.category} | ${entry.location}`);
      lines.push(`  ${entry.description}`);
    }
  } else {
    lines.push('- Keine passenden Tageseintraege.');
  }

  lines.push('', 'Monatsanker:');
  if (Array.isArray(monthlyAnchors) && monthlyAnchors.length) {
    for (const day of monthlyAnchors.slice(0, 6)) {
      lines.push(`- ${day.date}: ${day.anchorEntries.map((entry) => entry?.label ?? entry?.id).filter(Boolean).join(', ')}`);
    }
  } else {
    lines.push('- Keine passenden Monatsanker.');
  }

  lines.push('', 'Meisterinformationen im Jahr:');
  if (Array.isArray(yearlyMasterHooks) && yearlyMasterHooks.length) {
    for (const hook of yearlyMasterHooks.slice(0, 8)) {
      lines.push(`- ${hook.title} | ${hook.location}`);
      lines.push(`  ${hook.hook}`);
    }
  } else {
    lines.push('- Keine passenden Meisterinformationen.');
  }

  return {
    title: 'Bote Chronicle Seed',
    text: lines.join('\n'),
  };
}

async function buildChronicleBrowserView(engine, app) {
  const state = engine?.core?.state?.get?.() ?? {};
  const viewState = app?._getViewState?.('chronicleBrowser') ?? {};
  const bfDate = String(viewState?.focusDate ?? '').trim() || pickBfDateFromState(state) || '1025-01-01';
  const targetYear = Number(String(bfDate).slice(0, 4)) || 1025;
  const targetMonth = Number(String(bfDate).slice(5, 7)) || 1;
  const calendarJournalId = String(viewState?.calendarJournalId ?? '').trim();

  let dailyChronicle;
  let masterinfoHooks;
  let importedCalendarEntries = [];
  let importedCalendarJournal = null;
  try {
    [dailyChronicle, masterinfoHooks] = await Promise.all([
      loadModuleJson('events/bote_daily_chronicle.json'),
      loadModuleJson('events/bote_masterinfo_hooks.json'),
    ]);
    if (calendarJournalId && game?.system?.id === 'dsa5') {
      const calendarSync = new DSA5CalendarSync({ logger: console });
      const journal = game.journal?.get(calendarJournalId) ?? game.journal?.getName(calendarJournalId) ?? null;
      importedCalendarEntries = calendarSync.listCalendarEntries(calendarJournalId)
        .filter((entry) => entry?.visible !== false)
        .map((entry) => ({
          ...entry,
          label: entry?.title ?? entry?.id ?? '—',
          description: stripHtml(entry?.content) || 'Kalendereintrag aus DSA5.',
          sourceType: 'dsa5_calendar_import',
          tags: ['dsa5_calendar', 'journal_import'],
        }));
      importedCalendarJournal = journal ? { id: journal.id, name: journal.name ?? journal.id } : { id: calendarJournalId, name: calendarJournalId };
    }
  } catch (err) {
    return {
      unavailable: true,
      error: err?.message ?? String(err),
      focusDate: bfDate,
      summary: { dayCount: 0, baseEntriesPerDay: 0, curatedAnchorCount: 0, meisterinfoAnchorCount: 0 },
      focusDay: null,
      nearbyDays: [],
      monthlyAnchors: [],
      yearlyMasterHooks: [],
      importedCalendarJournal,
      importedCalendarSummary: { total: 0, focusDay: 0, month: 0 },
    };
  }

  const days = Array.isArray(dailyChronicle?.days) ? dailyChronicle.days : [];
  const search = String(viewState?.search ?? '').trim();
  const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const tagFilter = String(viewState?.tag ?? '').trim();
  const exactIndex = days.findIndex((day) => day?.date === bfDate);
  const yearFallbackIndex = days.findIndex((day) => Number(String(day?.date ?? '').slice(0, 4)) === targetYear);
  const baseIndex = exactIndex >= 0 ? exactIndex : (yearFallbackIndex >= 0 ? yearFallbackIndex : 0);
  const offset = Number(viewState?.offset ?? 0) || 0;
  const focusIndex = Math.min(Math.max(baseIndex + offset, 0), Math.max(days.length - 1, 0));
  const locationFilter = String(viewState?.location ?? '').trim();
  const focusDayRaw = days[focusIndex] ?? null;
  const _importedFocusEntries = importedCalendarEntries
    .filter((entry) => entry?.isoDate === (focusDayRaw?.date ?? bfDate))
    .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
    .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
    .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms))
    .map((entry) => ({
      label: entry?.label ?? entry?.id ?? 'â€”',
      location: entry?.location ?? 'â€”',
      category: 'DSA5-Kalender',
      sourceType: entry?.sourceType ?? 'dsa5_calendar_import',
      description: entry?.description ?? 'â€”',
      tags: Array.isArray(entry?.tags) ? entry.tags.join(', ') : 'â€”',
    }));
  const focusDay = focusDayRaw
    ? {
        date: focusDayRaw.date ?? '—',
        monthName: focusDayRaw.monthName ?? '—',
        entries: (focusDayRaw.entries ?? [])
          .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
          .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
          .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms))
          .map((entry) => ({
            label: entry?.label ?? entry?.id ?? '—',
            location: entry?.location ?? '—',
            category: entry?.category ?? '—',
            sourceType: entry?.sourceType ?? '—',
            description: entry?.description ?? '—',
            tags: Array.isArray(entry?.tags) ? entry.tags.join(', ') : '—',
          })),
      }
    : null;
  const nearbyDays = days.slice(Math.max(0, focusIndex - 2), focusIndex + 3).map((day) => ({
    date: day?.date ?? '—',
    monthName: day?.monthName ?? '—',
    entryCount: (day?.entries ?? [])
      .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
      .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
      .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms))
      .length,
    anchorCount: countAnchors((day?.entries ?? [])
      .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
      .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
      .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms))),
  }));
  const monthlyAnchors = days
    .filter((day) => Number(String(day?.date ?? '').slice(0, 4)) === targetYear && Number(String(day?.date ?? '').slice(5, 7)) === targetMonth)
    .map((day) => ({
      date: day?.date ?? '—',
      monthName: day?.monthName ?? '—',
      anchorEntries: (day?.entries ?? [])
        .filter((entry) => entry?.sourceType && entry.sourceType !== 'generated_daily_hook')
        .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter),
      anchorEntriesSearchFiltered: (day?.entries ?? [])
        .filter((entry) => entry?.sourceType && entry.sourceType !== 'generated_daily_hook')
        .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
        .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
        .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms)),
    }))
    .map((day) => ({ ...day, anchorEntries: day.anchorEntriesSearchFiltered }))
    .filter((day) => day.anchorEntries.length > 0)
    .slice(0, 12);
  const yearlyMasterHooks = (masterinfoHooks?.hooks ?? [])
    .filter((hook) => Number(hook?.bfYear ?? 0) === targetYear)
    .filter((hook) => !locationFilter || String(hook?.location ?? '').trim() === locationFilter)
    .filter((hook) => !tagFilter || (hook?.tags ?? []).includes(tagFilter))
    .filter((hook) => matchesSearch([hook?.title, hook?.location, hook?.issue, hook?.hook, ...(hook?.tags ?? [])].join(' '), searchTerms))
    .slice(0, 16)
    .map((hook) => ({
      title: hook?.title ?? hook?.id ?? '—',
      location: hook?.location ?? 'ohne feste Ortszuordnung',
      issue: hook?.issue ?? '—',
      tags: Array.isArray(hook?.tags) ? hook.tags.join(', ') : '—',
      hook: hook?.hook ?? '—',
      approximateDate: hook?.approximateDate ?? null,
    }));
  const availableLocations = uniqueSortedLocations(
    days.filter((day) => Number(String(day?.date ?? '').slice(0, 4)) === targetYear)
  ).slice(0, 24);
  const availableTags = uniqueSortedTags(
    days.filter((day) => Number(String(day?.date ?? '').slice(0, 4)) === targetYear),
    (masterinfoHooks?.hooks ?? []).filter((hook) => Number(hook?.bfYear ?? 0) === targetYear)
  ).slice(0, 24);
  const chronicleExportSeed = buildChronicleExportSeed({
    focusDate: focusDay?.date ?? bfDate,
    locationFilter,
    tagFilter,
    search,
    focusDay,
    monthlyAnchors,
    yearlyMasterHooks,
  });

  return {
    unavailable: false,
    focusDate: focusDay?.date ?? bfDate,
    locationFilter,
    tagFilter,
    search,
    summary: {
      dayCount: Number(dailyChronicle?.meta?.dayCount ?? 0),
      baseEntriesPerDay: Number(dailyChronicle?.meta?.baseEntriesPerDay ?? 0),
      curatedAnchorCount: Number(dailyChronicle?.meta?.curatedAnchorCount ?? 0),
      meisterinfoAnchorCount: Number(dailyChronicle?.meta?.meisterinfoAnchorCount ?? 0),
    },
    focusDay,
    nearbyDays,
    monthlyAnchors,
    yearlyMasterHooks,
    availableLocations,
    availableTags,
    chronicleExportSeed,
  };
}

async function buildChronicleBrowserViewV2(_engine, app) {
  const base = await buildChronicleBrowserView(_engine, app);
  const viewState = app?._getViewState?.('chronicleBrowser') ?? {};
  const calendarJournalId = String(viewState?.calendarJournalId ?? '').trim();
  if (!calendarJournalId || game?.system?.id !== 'dsa5') {
    return {
      ...base,
      importedCalendarJournal: null,
      importedCalendarSummary: { total: 0, focusDay: 0, month: 0 },
    };
  }

  const calendarSync = new DSA5CalendarSync({ logger: console });
  const journal = game.journal?.get(calendarJournalId) ?? game.journal?.getName(calendarJournalId) ?? null;
  const importedCalendarEntries = calendarSync.listCalendarEntries(calendarJournalId)
    .filter((entry) => entry?.visible !== false)
    .map((entry) => ({
      ...entry,
      label: entry?.title ?? entry?.id ?? '—',
      description: stripHtml(entry?.content) || 'Kalendereintrag aus DSA5.',
      sourceType: 'dsa5_calendar_import',
      tags: ['dsa5_calendar', 'journal_import'],
    }));

  const focusDate = String(base?.focusDate ?? '').trim();
  const locationFilter = String(base?.locationFilter ?? '').trim();
  const tagFilter = String(base?.tagFilter ?? '').trim();
  const search = String(base?.search ?? '').trim();
  const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const targetYear = Number(String(focusDate).slice(0, 4)) || 0;
  const targetMonth = Number(String(focusDate).slice(5, 7)) || 0;

  const importedFocusEntries = importedCalendarEntries
    .filter((entry) => entry?.isoDate === focusDate)
    .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
    .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
    .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms))
    .map((entry) => ({
      label: entry?.label ?? entry?.id ?? '—',
      location: entry?.location ?? '—',
      category: 'DSA5-Kalender',
      sourceType: entry?.sourceType ?? 'dsa5_calendar_import',
      description: entry?.description ?? '—',
      tags: Array.isArray(entry?.tags) ? entry.tags.join(', ') : '—',
    }));

  const importedMonthlyAnchorMap = new Map();
  for (const entry of importedCalendarEntries) {
    if (!entry?.isoDate) continue;
    if (Number(String(entry.isoDate).slice(0, 4)) !== targetYear) continue;
    if (Number(String(entry.isoDate).slice(5, 7)) !== targetMonth) continue;
    if (locationFilter && String(entry?.location ?? '').trim() !== locationFilter) continue;
    if (tagFilter && !(entry?.tags ?? []).includes(tagFilter)) continue;
    if (!matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms)) continue;
    const list = importedMonthlyAnchorMap.get(entry.isoDate) ?? [];
    list.push({
      label: entry?.label ?? entry?.id ?? '—',
      location: entry?.location ?? '—',
      sourceType: entry?.sourceType ?? 'dsa5_calendar_import',
    });
    importedMonthlyAnchorMap.set(entry.isoDate, list);
  }

  const mergedFocusDay = base?.focusDay
    ? { ...base.focusDay, entries: [...(base.focusDay.entries ?? []), ...importedFocusEntries] }
    : (importedFocusEntries.length ? { date: focusDate || '—', monthName: 'DSA5', entries: importedFocusEntries } : null);

  const mergedNearbyDays = (base?.nearbyDays ?? []).map((day) => {
    const importedCount = importedCalendarEntries
      .filter((entry) => entry?.isoDate === day?.date)
      .filter((entry) => !locationFilter || String(entry?.location ?? '').trim() === locationFilter)
      .filter((entry) => !tagFilter || (entry?.tags ?? []).includes(tagFilter))
      .filter((entry) => matchesSearch([entry?.label, entry?.description, entry?.location, ...(entry?.tags ?? [])].join(' '), searchTerms))
      .length;
    return {
      ...day,
      entryCount: Number(day?.entryCount ?? 0) + importedCount,
      anchorCount: Number(day?.anchorCount ?? 0) + importedCount,
    };
  });

  const mergedMonthlyAnchors = [...(base?.monthlyAnchors ?? [])];
  for (const [date, importedEntries] of importedMonthlyAnchorMap.entries()) {
    const existingDay = mergedMonthlyAnchors.find((day) => day?.date === date);
    if (existingDay) existingDay.anchorEntries = [...(existingDay.anchorEntries ?? []), ...importedEntries];
    else mergedMonthlyAnchors.push({ date, monthName: 'DSA5', anchorEntries: importedEntries });
  }
  mergedMonthlyAnchors.sort((a, b) => String(a?.date ?? '').localeCompare(String(b?.date ?? ''), 'de'));

  const mergedAvailableLocations = [...(base?.availableLocations ?? [])];
  for (const entry of importedCalendarEntries.filter((entry) => Number(String(entry?.isoDate ?? '').slice(0, 4)) === targetYear)) {
    const location = String(entry?.location ?? '').trim();
    if (location && !mergedAvailableLocations.includes(location)) mergedAvailableLocations.push(location);
  }
  mergedAvailableLocations.sort((a, b) => a.localeCompare(b, 'de'));

  const mergedAvailableTags = [...new Set([...(base?.availableTags ?? []), 'dsa5_calendar', 'journal_import'])]
    .sort((a, b) => a.localeCompare(b, 'de'))
    .slice(0, 24);

  const importedCalendarSummary = {
    total: importedCalendarEntries.length,
    focusDay: importedFocusEntries.length,
    month: [...importedMonthlyAnchorMap.values()].reduce((sum, entries) => sum + entries.length, 0),
  };

  return {
    ...base,
    focusDay: mergedFocusDay,
    nearbyDays: mergedNearbyDays,
    monthlyAnchors: mergedMonthlyAnchors,
    availableLocations: mergedAvailableLocations,
    availableTags: mergedAvailableTags,
    chronicleExportSeed: buildChronicleExportSeed({
      focusDate: mergedFocusDay?.date ?? base?.focusDate,
      locationFilter,
      tagFilter,
      search,
      focusDay: mergedFocusDay,
      monthlyAnchors: mergedMonthlyAnchors,
      yearlyMasterHooks: base?.yearlyMasterHooks ?? [],
    }),
    importedCalendarJournal: journal ? { id: journal.id, name: journal.name ?? journal.id } : { id: calendarJournalId, name: calendarJournalId },
    importedCalendarSummary,
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

registerView({
  id: 'director_ai',
  title: 'KI-Regisseur',
  icon: 'fas fa-hat-wizard',
  description: 'Echtzeit-KI-Unterst\u00fctzung f\u00fcr Konsequenzen und Atmosph\u00e4re.',
  build: (_engine) => ({})
});

registerView({
  id: 'chronicleBrowser',
  title: 'Bote-Chronik',
  icon: 'fas fa-newspaper',
  description: 'GM-Browser fuer taegliche Bote-Lage, Chronikanker und Meisterinformationen.',
  build: buildChronicleBrowserViewV2
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
      academyActionHooks: null,
      academyOverview: null,
      academySeed: null,
      socialStoryHookQueue: { items: [], summary: { recentChanges: [] } },
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
    academyActionHooks: report.academyActionHooks ?? null,
    academyOverview: report.academyOverview ?? null,
    academySeed: report.academySeed ?? null,
    socialStoryHookQueue: report.socialStoryHookQueue ?? { items: [], summary: { recentChanges: [] } },
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
