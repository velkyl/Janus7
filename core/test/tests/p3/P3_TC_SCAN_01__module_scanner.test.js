/**
 * @file core/test/tests/p3/P3_TC_SCAN_01__module_scanner.test.js
 * @module janus7/test
 * @phase 3
 */

export default {
  id: 'P3-TC-SCAN-01',
  phase: 3,
  title: 'DSA5 Module Scanner: Erkennung und Provider-Zuweisung',
  prio: 'P2',
  kind: 'auto',

  expected: 'Der ModuleScanner erkennt aktive dsa5-Module und initialisiert die korrekten Content-Provider.',

  async run() {
    const bridge = game.janus7?.bridge?.dsa5;
    if (!bridge?.scanner) {
      throw new Error('DSA5ModuleScanner nicht in der Bridge gefunden.');
    }

    const scanner = bridge.scanner;
    
    // 1. Scan ausführen
    scanner.scan();
    
    const modules = scanner.modules;
    const providers = scanner.providers;

    if (!(modules instanceof Map)) throw new Error('scanner.modules ist keine Map');
    if (!(providers instanceof Map)) throw new Error('scanner.providers ist keine Map');

    const moduleCount = modules.size;
    const providerCount = providers.size;

    console.log(`[P3-TC-SCAN-01] Module erkannt: ${moduleCount}, Provider initialisiert: ${providerCount}`);

    // Wir prüfen die Zuweisung (Best-Effort je nach installierten Modulen)
    for (const [id, info] of modules) {
      const p = scanner.getProvider(id);
      if (id.includes('armory') || id.includes('armor')) {
        if (!p || p.constructor.name !== 'DSA5ArmoryProvider') {
          throw new Error(`Modul ${id} sollte einen DSA5ArmoryProvider haben.`);
        }
      }
      if (id.includes('herbarium')) {
        if (!p || p.constructor.name !== 'DSA5HerbariumProvider') {
          throw new Error(`Modul ${id} sollte einen DSA5HerbariumProvider haben.`);
        }
      }
      if (id.includes('bestiary') || id.includes('pandaemonium')) {
        if (!p || p.constructor.name !== 'DSA5BestiaryProvider') {
          throw new Error(`Modul ${id} sollte einen DSA5BestiaryProvider haben.`);
        }
      }
    }

    return { 
      ok: true, 
      summary: `Scanner validiert. Erkannte Module: ${moduleCount}, Aktive Provider: ${providerCount}` 
    };
  }
};
