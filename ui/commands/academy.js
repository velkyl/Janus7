/**
 * @file ui/commands/academy.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Academy commands for JANUS7 Shell / Power Tools.
 */

import { _checkPermission, _engine, _toInt, _wrap } from './_shared.js';
import { MODULE_ID } from '../../core/common.js';
import { JanusFolderService } from '../../core/folder-service.js';
import { JanusLocationsEngine } from '../../academy/locations-engine.js';

function _resolveLocationsEngine(engine) {
  return engine?.academy?.locations ?? new JanusLocationsEngine({
    academyData: engine?.academy?.data ?? null,
    state: engine?.core?.state ?? null,
    logger: engine?.core?.logger ?? console,
  });
}

async function _resolveSceneForLocation(location = {}) {
  const sceneUuid = String(location?.foundry?.sceneUuid ?? location?.sceneUuid ?? '').trim();
  if (sceneUuid) {
    try {
      const scene = await fromUuid(sceneUuid);
      if (scene) return scene;
    } catch {}
  }

  const sceneKey = String(location?.foundry?.sceneKey ?? location?.sceneKey ?? '').trim().toLowerCase();
  const locationName = String(location?.name ?? '').trim().toLowerCase();
  return game.scenes?.contents?.find((scene) => {
    const name = String(scene?.name ?? '').trim().toLowerCase();
    return (sceneKey && name === sceneKey) || (locationName && name === locationName);
  }) ?? null;
}

function _resolveLocationMoodId(location = {}, engine = null) {
  const explicit = String(location?.defaultMoodKey ?? location?.foundry?.defaultMoodKey ?? '').trim();
  if (explicit) return explicit;
  const controller = engine?.atmosphere?.controller ?? null;
  const mood = controller?.resolveMoodForLocation?.(location?.id ?? null) ?? null;
  return String(mood?.id ?? mood?.key ?? mood?.moodId ?? '').trim() || null;
}

export const academyCommands = {

  // =========================================================================
  // SPRINT 2 COMMANDS - Data Catalog
  // =========================================================================

  /**
   * Browse lessons
   */
  async browseLessons(dataset = {}) {
    if (!_checkPermission('browseLessons')) return { success: false, cancelled: true };
    
    const engine = _engine();
    const limit = _toInt(dataset.limit, 50);
    
    return await _wrap('browseLessons', async () => {
      const lessons = engine.academy.data.listLessonIds(limit);
      console.table(lessons);
      ui.notifications.info(`Lessons: ${lessons.length}`);
      return { lessons };
    });
  },

  /**
   * Browse NPCs
   */
  async browseNPCs(dataset = {}) {
    if (!_checkPermission('browseNPCs')) return { success: false, cancelled: true };
    
    const engine = _engine();
    
    return await _wrap('browseNPCs', async () => {
      const npcs = await engine.academy.data.loadNpcs();
      const filtered = dataset.filter 
        ? npcs.filter(npc => npc.name.includes(dataset.filter))
        : npcs;
      console.table(filtered.map(n => ({ id: n.id, name: n.name, role: n.role })));
      ui.notifications.info(`NPCs: ${filtered.length}`);
      return { npcs: filtered };
    });
  },

  /**
   * Browse locations
   */
  async browseLocations(dataset = {}) {
    if (!_checkPermission('browseLocations')) return { success: false, cancelled: true };
    
    const engine = _engine();
    
    return await _wrap('browseLocations', async () => {
      const locations = await engine.academy.data.loadLocations();
      const filtered = dataset.type
        ? locations.filter(loc => loc.type === dataset.type)
        : locations;
      console.table(filtered.map(l => ({ id: l.id, name: l.name, type: l.type })));
      ui.notifications.info(`Locations: ${filtered.length}`);
      return { locations: filtered };
    });
  },

  async activateLocationScene(dataset = {}) {
    if (!_checkPermission('activateLocationScene')) return { success: false, cancelled: true };

    const engine = _engine();
    const locationId = String(dataset.locationId ?? dataset.datasetLocationId ?? '').trim();
    if (!locationId) return { success: false, cancelled: true, error: 'locationId fehlt' };

    return await _wrap('activateLocationScene', async () => {
      const academyData = engine?.academy?.data ?? null;
      const location = academyData?.getLocation?.(locationId) ?? null;
      if (!location) throw new Error(`Ort nicht gefunden: ${locationId}`);

      const locationsEngine = _resolveLocationsEngine(engine);
      await locationsEngine.setCurrentLocation?.(locationId, { broadcast: true });

      const scene = await _resolveSceneForLocation(location);
      if (!scene) throw new Error(`Keine Foundry-Szene für ${location.name ?? locationId} gefunden`);

      try { await scene.activate?.(); } catch {}
      try { await scene.view?.(); } catch {}
      ui.notifications.info(`Ort aktiviert: ${location.name ?? locationId}`);
      return { locationId, sceneId: scene.id ?? null };
    });
  },

  async applyLocationMood(dataset = {}) {
    if (!_checkPermission('applyLocationMood')) return { success: false, cancelled: true };

    const engine = _engine();
    const locationId = String(dataset.locationId ?? dataset.datasetLocationId ?? '').trim();
    if (!locationId) return { success: false, cancelled: true, error: 'locationId fehlt' };

    return await _wrap('applyLocationMood', async () => {
      const academyData = engine?.academy?.data ?? null;
      const location = academyData?.getLocation?.(locationId) ?? null;
      if (!location) throw new Error(`Ort nicht gefunden: ${locationId}`);

      const locationsEngine = _resolveLocationsEngine(engine);
      await locationsEngine.setCurrentLocation?.(locationId, { broadcast: true });

      const moodId = _resolveLocationMoodId(location, engine);
      if (!moodId) throw new Error(`Kein Mood-Key für ${location.name ?? locationId} hinterlegt`);

      const ok = await engine?.atmosphere?.applyMood?.(moodId, { broadcast: true, force: true, reason: 'ui-location' });
      if (!ok) throw new Error('Atmosphere.applyMood fehlgeschlagen');

      ui.notifications.info(`Mood gesetzt: ${location.name ?? locationId}`);
      return { locationId, moodId };
    });
  },

  /**
   * Browse spells
   */
  async browseSpells(dataset = {}) {
    if (!_checkPermission('browseSpells')) return { success: false, cancelled: true };
    
    const engine = _engine();
    
    return await _wrap('browseSpells', async () => {
      const spellIndex = await engine.academy.data.loadSpellIndex();
      const filtered = dataset.school
        ? spellIndex.filter(s => s.school === dataset.school)
        : spellIndex;
      console.table(filtered.map(s => ({ id: s.id, name: s.name, school: s.school })));
      ui.notifications.info(`Spells: ${filtered.length}`);
      return { spells: filtered };
    });
  },


  // =========================================================================
  // DATA STUDIO (World-managed Academy Data)
  // =========================================================================

  /**
   * Seed-import canonical academy JSON datasets into Foundry JournalEntries (flags-based SSOT).
   * Default mode: merge (idempotent, does not overwrite existing records).
   *
   * @param {{ mode?: 'merge'|'overwrite' }} dataset
   */
  async seedImportAcademyToJournals(dataset = {}) {
    if (!_checkPermission('seedImportAcademyToJournals')) return { success: false, cancelled: true };
    if (!game.user?.isGM) {
      ui.notifications.warn('Nur GM darf Seed-Import ausführen.');
      return { success: false, error: 'GM only' };
    }

    const mode = (String(dataset.mode ?? '').toLowerCase() === 'overwrite') ? 'overwrite' : 'merge';

    return await _wrap('seedImportAcademyToJournals', async () => {
      const { seedImportAcademyToJournals } = await import('../../academy/world-seed.js');
      const report = await seedImportAcademyToJournals({ mode });

      // Folder hygiene: enforce stable structure after creation (best-effort)
      try { await academyCommands.organizeJanusFolders({}); } catch { /* ignore */ }

      // Reset AcademyDataApi cache so the engine sees overrides immediately
      try { game?.janus7?.academy?.data?.constructor?.resetCache?.(); } catch {}
      try { await game?.janus7?.academy?.data?.init?.(); } catch {}

      ui.notifications.info(`Seed Import done: created=${report.created} updated=${report.updated} skipped=${report.skipped}`);
      return { report };
    });
  },

  /**
   * Open Academy Data Studio (edit world-managed academy records).
   */
  async openAcademyDataStudio(_dataset = {}) {
    if (!_checkPermission('openAcademyDataStudio')) return { success: false, cancelled: true };
    if (!game.user?.isGM) {
      ui.notifications.warn('Nur GM darf den Data Studio öffnen.');
      return { success: false, error: 'GM only' };
    }

    return await _wrap('openAcademyDataStudio', async () => {
      const e = _engine();
      e?.ui?.open?.('academyDataStudio');
      return { opened: true };
    });
  },

  // =========================================================================
  // SPRINT 2 COMMANDS - Test Center
  // =========================================================================

  /**
   * Run smoke tests only
   */

  // =========================================================================
  // FOLDER HYGIENE (JANUS-managed docs)
  // =========================================================================

  /**
   * Create (if missing) and enforce a stable JANUS folder structure.
   * Moves all JANUS-managed JournalEntries/Items into their mapped folders.
   *
   * @param {{ dryRun?: boolean }} dataset
   */
  async organizeJanusFolders(dataset = {}) {
    if (!_checkPermission('organizeJanusFolders')) return { success: false, cancelled: true };
    if (!game.user.isGM) {
      ui.notifications.warn('Nur GM darf Ordner anlegen/verschieben.');
      return { success: false, error: 'GM only' };
    }

    const dryRun = !!dataset.dryRun;
    const folderSvc = new JanusFolderService({ logger: _engine()?.core?.logger ?? console });

    return await _wrap('organizeJanusFolders', async () => {
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const report = {
        dryRun,
        ensured: 0,
        moved: { journals: 0, items: 0, actors: 0, scenes: 0, playlists: 0 },
        skipped: { journals: 0, items: 0, actors: 0, scenes: 0, playlists: 0 },
        errors: [],
        durationMs: 0
      };

      // Pre-create common paths.
      const warmups = [
        { docType: 'JournalEntry', kind: 'lesson' },
        { docType: 'JournalEntry', kind: 'library' },
        { docType: 'JournalEntry', kind: 'curriculum' },
        { docType: 'JournalEntry', kind: 'spell' },
        { docType: 'Item', kind: 'alchemy' },
        { docType: 'Actor', kind: 'npc' },
        { docType: 'Scene', kind: 'location' },
        { docType: 'Playlist', kind: 'music' },
      ];
      for (const w of warmups) {
        try {
          if (dryRun) continue;
          const r = await folderSvc.ensureFor(w);
          if (r.folderId) report.ensured += 1;
        } catch (e) {
          report.errors.push(String(e?.message ?? e));
        }
      }

      // Journals
      const journals = game.journal?.contents ?? [];
      const journalUpdates = [];
      for (const j of journals) {
        const flags = j.flags?.[MODULE_ID] ?? null;
        // Backwards compatible: treat any JANUS-tagged doc as managed.
        const isManaged = !!(flags?.managed || flags?.janusId);
        if (!isManaged) { report.skipped.journals += 1; continue; }

        const kind = flags.kind
          ?? (flags.dataType === 'lesson' ? 'lesson'
            : flags.dataType === 'library-item' ? 'library'
              : 'misc');

        const target = folderSvc.resolve({ docType: 'JournalEntry', kind });
        if (!target) { report.skipped.journals += 1; continue; }

        try {
          const folderId = dryRun
            ? (j.folder?.id ?? null)
            : (await folderSvc.ensurePath({ type: target.type, path: target.path, key: target.key })).folderId;
          if (j.folder?.id === folderId) { report.skipped.journals += 1; continue; }
          if (!dryRun) {
            journalUpdates.push({ _id: j.id, folder: folderId, flags: { [MODULE_ID]: { ...flags, folderKey: target.key } } });
          }
          report.moved.journals += 1;
        } catch (e) {
          report.errors.push(`Journal "${j.name}": ${String(e?.message ?? e)}`);
        }
      }
      if (journalUpdates.length > 0) {
        try { await JournalEntry.updateDocuments(journalUpdates); }
        catch (e) { report.errors.push(`Journal bulk update failed: ${String(e?.message ?? e)}`); }
      }

      // Items
      const items = game.items?.contents ?? [];
      const itemUpdates = [];
      for (const it of items) {
        const flags = it.flags?.[MODULE_ID] ?? null;
        const isManaged = !!(flags?.managed || flags?.janusId);
        if (!isManaged) { report.skipped.items += 1; continue; }

        const kind = flags.kind
          ?? (flags.dataType === 'alchemy-recipe' ? 'alchemy' : 'misc');
        const target = folderSvc.resolve({ docType: 'Item', kind });
        if (!target) { report.skipped.items += 1; continue; }

        try {
          const folderId = dryRun
            ? (it.folder?.id ?? null)
            : (await folderSvc.ensurePath({ type: target.type, path: target.path, key: target.key })).folderId;
          if (it.folder?.id === folderId) { report.skipped.items += 1; continue; }
          if (!dryRun) {
            itemUpdates.push({ _id: it.id, folder: folderId, flags: { [MODULE_ID]: { ...flags, folderKey: target.key } } });
          }
          report.moved.items += 1;
        } catch (e) {
          report.errors.push(`Item "${it.name}": ${String(e?.message ?? e)}`);
        }
      }
      if (itemUpdates.length > 0) {
        try { await Item.updateDocuments(itemUpdates); }
        catch (e) { report.errors.push(`Item bulk update failed: ${String(e?.message ?? e)}`); }
      }

      // Actors
      const actors = game.actors?.contents ?? [];
      const actorUpdates = [];
      for (const a of actors) {
        const flags = a.flags?.[MODULE_ID] ?? null;
        const isManaged = !!(flags?.managed || flags?.janusId);
        if (!isManaged) { report.skipped.actors += 1; continue; }

        const kind = flags.kind ?? 'npc';
        const target = folderSvc.resolve({ docType: 'Actor', kind });
        if (!target) { report.skipped.actors += 1; continue; }

        try {
          const folderId = dryRun
            ? (a.folder?.id ?? null)
            : (await folderSvc.ensurePath({ type: target.type, path: target.path, key: target.key })).folderId;
          if (a.folder?.id === folderId) { report.skipped.actors += 1; continue; }
          if (!dryRun) {
            actorUpdates.push({ _id: a.id, folder: folderId, flags: { [MODULE_ID]: { ...flags, folderKey: target.key } } });
          }
          report.moved.actors += 1;
        } catch (e) {
          report.errors.push(`Actor "${a.name}": ${String(e?.message ?? e)}`);
        }
      }
      if (actorUpdates.length > 0) {
        try { await Actor.updateDocuments(actorUpdates); }
        catch (e) { report.errors.push(`Actor bulk update failed: ${String(e?.message ?? e)}`); }
      }

      // Scenes
      const scenes = game.scenes?.contents ?? [];
      const sceneUpdates = [];
      for (const s of scenes) {
        const flags = s.flags?.[MODULE_ID] ?? null;
        const isManaged = !!(flags?.managed || flags?.janusId);
        if (!isManaged) { report.skipped.scenes += 1; continue; }

        const kind = flags.kind ?? 'location';
        const target = folderSvc.resolve({ docType: 'Scene', kind });
        if (!target) { report.skipped.scenes += 1; continue; }

        try {
          const folderId = dryRun
            ? (s.folder?.id ?? null)
            : (await folderSvc.ensurePath({ type: target.type, path: target.path, key: target.key })).folderId;
          if (s.folder?.id === folderId) { report.skipped.scenes += 1; continue; }
          if (!dryRun) {
            sceneUpdates.push({ _id: s.id, folder: folderId, flags: { [MODULE_ID]: { ...flags, folderKey: target.key } } });
          }
          report.moved.scenes += 1;
        } catch (e) {
          report.errors.push(`Scene "${s.name}": ${String(e?.message ?? e)}`);
        }
      }
      if (sceneUpdates.length > 0) {
        try { await Scene.updateDocuments(sceneUpdates); }
        catch (e) { report.errors.push(`Scene bulk update failed: ${String(e?.message ?? e)}`); }
      }

      // Playlists
      const playlists = game.playlists?.contents ?? [];
      const playlistUpdates = [];
      for (const p of playlists) {
        const flags = p.flags?.[MODULE_ID] ?? null;
        const isManaged = !!(flags?.managed || flags?.janusId);
        if (!isManaged) { report.skipped.playlists += 1; continue; }

        const kind = flags.kind ?? 'music';
        const target = folderSvc.resolve({ docType: 'Playlist', kind });
        if (!target) { report.skipped.playlists += 1; continue; }

        try {
          const folderId = dryRun
            ? (p.folder?.id ?? null)
            : (await folderSvc.ensurePath({ type: target.type, path: target.path, key: target.key })).folderId;
          if (p.folder?.id === folderId) { report.skipped.playlists += 1; continue; }
          if (!dryRun) {
            playlistUpdates.push({ _id: p.id, folder: folderId, flags: { [MODULE_ID]: { ...flags, folderKey: target.key } } });
          }
          report.moved.playlists += 1;
        } catch (e) {
          report.errors.push(`Playlist "${p.name}": ${String(e?.message ?? e)}`);
        }
      }
      if (playlistUpdates.length > 0) {
        try { await Playlist.updateDocuments(playlistUpdates); }
        catch (e) { report.errors.push(`Playlist bulk update failed: ${String(e?.message ?? e)}`); }
      }

      const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      report.durationMs = Math.round(t1 - t0);

      console.table([
        { key: 'ensuredFolders', value: report.ensured },
        { key: 'movedJournals', value: report.moved.journals },
        { key: 'movedItems', value: report.moved.items },
        { key: 'movedActors', value: report.moved.actors ?? 0 },
        { key: 'movedScenes', value: report.moved.scenes ?? 0 },
        { key: 'movedPlaylists', value: report.moved.playlists ?? 0 },
        { key: 'errors', value: report.errors.length },
        { key: 'durationMs', value: report.durationMs },
      ]);
      ui.notifications.info(`JANUS7 Ordnerstruktur: moved journals=${report.moved.journals}, items=${report.moved.items}, actors=${report.moved.actors ?? 0}, scenes=${report.moved.scenes ?? 0}, playlists=${report.moved.playlists ?? 0}${dryRun ? ' (dryRun)' : ''} in ${report.durationMs}ms`);

      return report;
    });
  },
};
