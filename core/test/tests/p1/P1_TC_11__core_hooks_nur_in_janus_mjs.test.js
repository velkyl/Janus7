import { moduleAssetPath } from '../../../common.js';
export default {
  id: 'P1-TC-11',
  title: 'Architecture Contract: Foundry-Core-Hooks bleiben im Single Entry Point',
  phases: [1],
  kind: 'auto',
  expected: "Keine Core-Hook-Registrierung (updateWorldTime/getSceneControlButtons) außerhalb scripts/janus.mjs.",
  whereToFind: 'modules/janus7/scripts/janus.mjs',
  async run(_ctx) {
    try {
      const [janusTxt, phase4Txt, questTxt, moonTxt] = await Promise.all([
        fetch(moduleAssetPath('scripts/janus.mjs')).then(r => r.text()),
        fetch(moduleAssetPath('academy/phase4.js')).then(r => r.text()),
        fetch(moduleAssetPath('scripts/integration/quest-system-integration.js')).then(r => r.text()),
        fetch(moduleAssetPath('bridge/dsa5/moon.js')).then(r => r.text())
      ]);

      const mustContain = [
        "Hooks.on('getSceneControlButtons'",
        "Hooks.on('updateWorldTime'"
      ];
      for (const needle of mustContain) {
        if (!janusTxt.includes(needle)) {
          return { ok: false, summary: `scripts/janus.mjs missing expected hook: ${needle}` };
        }
      }

      if (phase4Txt.includes("Hooks.on('updateWorldTime'")) {
        return { ok: false, summary: 'academy/phase4.js still registers updateWorldTime (core hook leak)' };
      }
      if (questTxt.includes("Hooks.on('getSceneControlButtons'")) {
        return { ok: false, summary: 'quest-system-integration.js still registers getSceneControlButtons (core hook leak)' };
      }
      if (moonTxt.includes("Hooks.on('updateWorldTime'")) {
        return { ok: false, summary: 'bridge/dsa5/moon.js still registers updateWorldTime directly (core hook leak)' };
      }

      return { ok: true, summary: 'Core hooks are centralized (checked: updateWorldTime/getSceneControlButtons + moon.js)' };
    } catch (err) {
      return { ok: false, summary: `Test failed: ${err?.message ?? err}` };
    }
  }
};
