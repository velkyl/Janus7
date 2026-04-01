/**
 * @file P8_TC_01__folder_service_profile_aware.test.js
 * @phase 8
 *
 * Test: JanusFolderService dynamic profile awareness (Punin / Festum).
 * Verifies that the folder structure adapts to the active academy setting.
 */

export default {
  id: 'P8_TC_01',
  title: 'FolderService Profile Awareness (Punin/Festum)',
  group: 'p8',
  phase: 8,

  async run({ engine }) {
    const { JanusFolderService } = await import('../../../folder-service.js');
    const { JanusConfig } = await import('../../../config.js');
    
    const svc = new JanusFolderService({ logger: console });
    const spec = { docType: 'JournalEntry', kind: 'lesson' };

    // 1. Check Punin (Default)
    await JanusConfig.set('activeProfile', 'punin');
    const resPunin = svc.resolve(spec);
    
    if (!resPunin.path.includes('JANUS7 (Akademie der Geistigen Kraft (Punin))')) {
      return { ok: false, summary: `Expected 'JANUS7 (Akademie der Geistigen Kraft (Punin))' in path, got: ${JSON.stringify(resPunin.path)}` };
    }
    if (!resPunin.key.endsWith('.punin')) {
      return { ok: false, summary: `Expected cache key to end with .punin, got ${resPunin.key}` };
    }

    // 2. Check Festum
    await JanusConfig.set('activeProfile', 'festum');
    const resFestum = svc.resolve(spec);

    if (!resFestum.path.includes('JANUS7 (Akademie von Licht und Dunkelheit (Festum))')) {
      return { ok: false, summary: `Expected 'JANUS7 (Akademie von Licht und Dunkelheit (Festum))' in path, got: ${JSON.stringify(resFestum.path)}` };
    }
    if (!resFestum.key.endsWith('.festum')) {
      return { ok: false, summary: `Expected cache key to end with .festum, got ${resFestum.key}` };
    }

    // 3. Compare
    if (resPunin.key === resFestum.key) {
      return { ok: false, summary: 'Cache keys must be unique per profile to prevent overlap!' };
    }

    return { ok: true, summary: 'FolderService adapts correctly to active profile (Punin <-> Festum).' };
  }
};
