// ui/layer/context-builders.js

export function buildLocationsView({ state, academyData }) {
  const activeLocId = state?.activeLocation ?? null;
  const locs = academyData?.listLocationIds?.(100) ?? [];
  const locations = locs.map(id => {
    const data = academyData?.getLocation?.(id);
    return { id, name: data?.name ?? id, type: data?.type ?? 'Ort' };
  });
  
  const activeLocData = activeLocId ? academyData?.getLocation?.(activeLocId) : null;
  
  return {
    locations,
    locationView: {
      activeLocationId: activeLocId,
      activeLocationName: activeLocData?.name ?? 'Kein aktiver Ort',
      defaultMoodKey: activeLocData?.defaultMoodKey ?? '—',
      locations
    }
  };
}

export function buildPeopleView({ state, actors }) {
  const academyActors = actors?.filter?.(a => a.hasPlayerOwner === false && a.type === 'npc') ?? [];
  return {
    teachers: academyActors.filter(a => a.system?.status?.faction === 'teacher').map(a => ({ name: a.name })),
    students: academyActors.filter(a => a.system?.status?.faction === 'student').map(a => ({ name: a.name })),
    npcs: academyActors.filter(a => !['teacher', 'student'].includes(a.system?.status?.faction)).map(a => ({ name: a.name }))
  };
}

export async function buildKiContext({ app, engine, isGM, phase7Enabled }) {
  return {
    items: app?._kiContextItems ?? [],
    enabled: !!phase7Enabled,
    isGM: !!isGM
  };
}

export function buildSyncView({ state }) {
  const linksObj = state?.links ?? {};
  const links = Object.keys(linksObj).map(key => ({ key, type: linksObj[key]?.type ?? 'link' }));
  return {
    hasLinks: links.length > 0,
    links
  };
}

export function buildSystemView({ engine }) {
  // FIX P1-05: game.settings.get() kann eine Exception werfen wenn das Setting
  // noch nicht registriert ist (z.B. bei frühem Render vor registerSettings()).
  const getSetting = (key, def = false) => {
    try { return !!game.settings.get('janus7', key); } catch { return def; }
  };
  return {
    enableSimulation: getSetting('enableSimulation'),
    enableAtmosphere: getSetting('enableAtmosphere'),
    enableUI: getSetting('enableUI'),
    enableQuestSystem: getSetting('enableQuestSystem'),
    enablePhase7: getSetting('enablePhase7'),
    enableGemini: getSetting('enableGemini'),
    geminiReady: !!game.janus7?.ki?.gemini?.apiKey
  };
}
