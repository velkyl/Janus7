import { moduleAssetPath } from '../../../common.js';

function stripJsComments(source = '') {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export default {
  id: 'P1-TC-11',
  title: 'Architecture Contract: Foundry-Core-Hooks bleiben im Single Entry Point',
  phases: [1],
  kind: 'auto',
  expected: "Keine Core-Hook-Registrierung (updateWorldTime/getSceneControlButtons) außerhalb scripts/janus.mjs.",
  whereToFind: 'modules/Janus7/scripts/janus.mjs',
  async run(_ctx) {
    try {
      const [janusTxtRaw, phase4TxtRaw, questTxtRaw, moonTxtRaw] = await Promise.all([
        fetch(moduleAssetPath('scripts/janus.mjs')).then(r => r.text()),
        fetch(moduleAssetPath('academy/phase4.js')).then(r => r.text()),
        fetch(moduleAssetPath('scripts/integration/quest-system-integration.js')).then(r => r.text()),
        fetch(moduleAssetPath('bridge/dsa5/moon.js')).then(r => r.text())
      ]);
      const janusTxt = stripJsComments(janusTxtRaw);
      const phase4Txt = stripJsComments(phase4TxtRaw);
      const questTxt = stripJsComments(questTxtRaw);
      const moonTxt = stripJsComments(moonTxtRaw);

      const mustContain = [
        {
          label: 'getSceneControlButtons',
          needles: [
            "Hooks.on('getSceneControlButtons'",
            '_registerCoreHook(\'getSceneControlButtons\'',
            '_registerCoreHook("getSceneControlButtons"'
          ]
        },
        {
          label: 'updateWorldTime',
          needles: [
            "Hooks.on('updateWorldTime'",
            '_registerCoreHook(\'updateWorldTime\'',
            '_registerCoreHook("updateWorldTime"'
          ]
        }
      ];
      for (const entry of mustContain) {
        if (!entry.needles.some((needle) => janusTxt.includes(needle))) {
          return { ok: false, summary: `scripts/janus.mjs missing expected hook: Hooks.on('${entry.label}'` };
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
