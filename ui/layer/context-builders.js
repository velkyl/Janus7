// ui/layer/context-builders.js

import { JanusConfig } from '../../core/config.js';

export function buildLocationsView({ state, academyData }) {
  const activeLocId = state?.activeLocation ?? null;
  const locs = academyData?.listLocationIds?.(100) ?? [];
  const locations = locs.map(id => {
    const data = academyData?.getLocation?.(id);
    const sceneId = data?.foundrySceneId ?? data?.sceneId ?? null;
    const scene = sceneId ? (game.scenes.get(sceneId) || game.scenes.getName(sceneId)) : null;
    return { 
      id, 
      name: data?.name ?? id, 
      type: data?.type ?? 'Ort',
      sceneId: scene?.id ?? null,
      sceneName: scene?.name ?? null,
      hasScene: !!scene
    };
  });
  
  const activeLocData = activeLocId ? academyData?.getLocation?.(activeLocId) : null;
  const activeSceneId = activeLocData?.foundrySceneId ?? activeLocData?.sceneId ?? null;
  const activeScene = activeSceneId ? (game.scenes.get(activeSceneId) || game.scenes.getName(activeSceneId)) : null;
  
  return {
    locations,
    locationView: {
      activeLocationId: activeLocId,
      activeLocationName: activeLocData?.name ?? 'Kein aktiver Ort',
      activeSceneId: activeScene?.id ?? null,
      activeSceneName: activeScene?.name ?? null,
      hasActiveScene: !!activeScene,
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
  const getSetting = (key, def = false) => {
    try { return !!JanusConfig.get(key); } catch { return def; }
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
