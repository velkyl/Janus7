/**
 * Small context builder helpers for JanusControlPanelApp.
 * Welle 2 extraction step: low-risk pure data shaping helpers.
 */

export function buildLocationsView({ state = {}, academyData = null } = {}) {
  const locationsAll = academyData?.getLocations?.() ?? [];
  const locations = locationsAll.slice(0, 40).map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    zone: l.zone,
    city: l.city,
    defaultMoodKey: l.defaultMoodKey,
    foundry: l.foundry
  }));
  const activeLocationId = state?.academy?.currentLocationId ?? locations?.[0]?.id ?? '—';
  const activeLoc = locationsAll.find((l) => l.id === activeLocationId) ?? null;
  return {
    locations,
    locationView: {
      activeLocationId,
      activeLocationName: activeLoc?.name ?? activeLocationId,
      defaultMoodKey: activeLoc?.defaultMoodKey ?? activeLoc?.foundry?.defaultMoodKey ?? null,
      locations
    }
  };
}

export function buildPeopleView({ state = {}, actors = null } = {}) {
  const roster = state?.academy?.roster ?? { teachers: [], students: [], npcs: [] };
  const resolveName = (uuid) => {
    try {
      if (String(uuid).startsWith('Actor.')) {
        const id = String(uuid).split('.')[1];
        return actors?.get?.(id)?.name ?? uuid;
      }
      return uuid;
    } catch {
      return uuid;
    }
  };
  return {
    teachers: (roster.teachers ?? []).map((u) => ({ role: 'teacher', name: resolveName(u), uuid: u })),
    students: (roster.students ?? []).map((u) => ({ circle: 'student', name: resolveName(u), uuid: u })),
    npcs: (roster.npcs ?? []).map((u) => ({ type: 'npc', name: resolveName(u), uuid: u }))
  };
}

export async function buildKiContext({ app, engine, isGM = false, phase7Enabled = false } = {}) {
  let bundlePreview = '(Phase 7 nicht bereit oder deaktiviert)';
  let kiHistory = [];
  if (isGM && phase7Enabled) {
    try {
      const bundle = await (engine?.capabilities?.ki ?? engine?.ki)?.exportBundle?.() ?? null;
      if (bundle) bundlePreview = JSON.stringify(bundle, null, 2).slice(0, 2000);
    } catch (_) { /* non-blocking */ }
    try { kiHistory = (engine?.capabilities?.ki ?? engine?.ki)?.getImportHistory?.() ?? []; } catch (_) { /* noop */ }
  }
  return {
    items: (app?._kiContextItems ?? []).slice(0, 20),
    bundlePreview,
    history: kiHistory,
  };
}


export function buildSyncView({ state = {} } = {}) {
  const foundryLinks = state?.foundryLinks ?? {};
  const syncLinks = [];
  for (const [type, map] of Object.entries(foundryLinks)) {
    if (map && typeof map === 'object') {
      for (const [key, uuid] of Object.entries(map)) {
        syncLinks.push({ type, key, uuid: String(uuid).slice(0, 60) });
      }
    }
  }
  return { hasLinks: syncLinks.length > 0, links: syncLinks.slice(0, 30) };
}

export function buildAiPreviewContext({ engine = null, moduleVersion = 'unknown' } = {}) {
  const aiContext = engine?.getAiContext?.() ?? null;
  const aiPreview = {
    moduleId: aiContext?.moduleId ?? 'janus7',
    moduleVersion: aiContext?.moduleVersion ?? moduleVersion ?? '?',
    schemaVersion: aiContext?.schemaVersion ?? '(none)',
    date: new Date().toISOString()
  };
  const aiPreviewJson = (() => {
    try { return JSON.stringify(aiContext ?? aiPreview, null, 2).slice(0, 2000); }
    catch (_e) { return String(aiContext); }
  })();
  return { aiContext, aiPreview, aiPreviewJson };
}

export function buildSystemView({ engine = null, getSetting = null } = {}) {
  const getS = typeof getSetting === 'function' ? getSetting : (_key, fb = false) => fb;
  return {
    enableSimulation:  getS('enableSimulation', true),
    enableAtmosphere:  getS('enableAtmosphere', true),
    enableUI:          getS('enableUI', true),
    enableQuestSystem: getS('enableQuestSystem', true),
    simulationReady:   !!engine?.academy?.calendar,
    atmosphereReady:   !!engine?.atmosphere?.controller,
    uiReady:           !!engine?.ui,
    questReady:        !!engine?.academy?.quests,
  };
}
