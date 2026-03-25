/**
 * P7_TC_A3 — Foundry-conform Export
 *
 * Ensures Phase 7 IO uses foundry.utils.saveDataToFile (download) as the
 * default export path (no Node fs in browser context).
 */

export default {
  id: 'P7-TC-A3',
  title: 'Phase 7 export uses foundry.utils.saveDataToFile by default',
  phases: [7],
  kind: 'automated',
  expected: 'engine.ai.exportToOutbox and engine.ki.exportToOutbox call saveDataToFile and return a filename',
  async run({ ctx }) {
    const engine = ctx?.engine;
    if (!engine?.ai?.exportToOutbox || !engine?.ki?.exportToOutbox) {
      return { ok: false, summary: 'Phase 7 IO APIs missing' };
    }

    const saveFn = foundry?.utils?.saveDataToFile;
    if (typeof saveFn !== 'function') {
      return { ok: false, summary: 'foundry.utils.saveDataToFile missing' };
    }

    let calls = [];
    try {
      globalThis.__JANUS_SAVE_DATA_TO_FILE__ = (data, mime, filename) => {
        calls.push({ data, mime, filename });
      };

      const ki = await engine.ki.exportToOutbox({ mode: 'lite' });
      const ai = await engine.ai.exportToOutbox({});

      if (!ki?.filename || !ai?.filename) {
        return { ok: false, summary: 'Expected filenames for download exports' };
      }
      if (calls.length < 2) {
        return { ok: false, summary: `Expected >=2 saveDataToFile calls, got ${calls.length}` };
      }
      const hasJsonMime = calls.every((c) => c.mime === 'application/json');
      if (!hasJsonMime) {
        return { ok: false, summary: 'saveDataToFile mime type not application/json' };
      }
      return { ok: true, summary: 'OK' };
    } finally {
      delete globalThis.__JANUS_SAVE_DATA_TO_FILE__;
    }
  }
};
