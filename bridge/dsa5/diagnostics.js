import { DSA5_SYSTEM_ID, MIN_DSA5_VERSION } from './constants.js';

/**
 * Phase 3: DSA5 System Bridge – Diagnostics
 *
 * Liefert einfache Health-Checks für das DSA5-System, Compendia und die Bridge.
 */

/**
 * @typedef {object} Dsa5BridgeDiagnosticCheck
 * @property {string} id
 * @property {'ok'|'warn'|'fail'} status
 * @property {string} message
 * @property {object} [data]
 */

/**
 * @typedef {object} Dsa5BridgeDiagnosticReport
 * @property {boolean} ok
 * @property {Dsa5BridgeDiagnosticCheck[]} checks
 */

/**
 * Führt DSA5-spezifische Bridge-Diagnostics aus.
 *
 * @param {object} [params]
 * @param {import('./index.js').DSA5SystemBridge} [params.bridge]
 * @param {Console} [params.logger]
 * @returns {Promise<Dsa5BridgeDiagnosticReport>}
 */
/**
 * runDsa5BridgeDiagnostics
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export async function runDsa5BridgeDiagnostics({ bridge, logger = console } = {}) {
  /** @type {Dsa5BridgeDiagnosticCheck[]} */
  const checks = [];

  const push = (id, status, message, data = undefined) => {
    checks.push({ id, status, message, data });
  };

  const system =
    game?.systems?.get?.(DSA5_SYSTEM_ID) ||
    (game?.system?.id === DSA5_SYSTEM_ID ? game.system : null);

  if (!system) {
    push(
      'dsa5.system.present',
      'fail',
      'DSA5 System ist nicht geladen. JANUS7-Bridge steht nicht zur Verfügung.'
    );
  } else {
    push('dsa5.system.present', 'ok', 'DSA5 System ist geladen.', {
      id: system.id,
      title: system.title,
      version: system.version,
    });

    const version = system.version ?? system.data?.version;
    if (!version) {
      push(
        'dsa5.system.version',
        'warn',
        `DSA5 System-Version konnte nicht ermittelt werden (erwartet >= ${MIN_DSA5_VERSION}).`
      );
    } else {
      const ok = version >= MIN_DSA5_VERSION;
      push(
        'dsa5.system.version',
        ok ? 'ok' : 'warn',
        ok
          ? `DSA5 System-Version (${version}) ist kompatibel (>= ${MIN_DSA5_VERSION}).`
          : `DSA5 System-Version (${version}) liegt unter der empfohlenen Mindestversion (${MIN_DSA5_VERSION}).`,
        { version, min: MIN_DSA5_VERSION }
      );
    }
  }

  // Compendia
  let packsOk = false;
  if (!game?.packs) {
    push(
      'dsa5.packs.available',
      'warn',
      'Foundry game.packs ist nicht verfügbar (zu früher Hook?).'
    );
  } else {
    const dsa5Packs = Array.from(game.packs).filter(
      (p) => p.metadata?.system === DSA5_SYSTEM_ID || p.metadata?.systemId === DSA5_SYSTEM_ID
    );
    packsOk = dsa5Packs.length > 0;
    push(
      'dsa5.packs.present',
      packsOk ? 'ok' : 'warn',
      packsOk
        ? `Es wurden ${dsa5Packs.length} DSA5-Compendia gefunden.`
        : 'Es wurden keine DSA5-Compendia gefunden. Einige Funktionen der JANUS7-Bridge sind ggf. eingeschränkt.',
      { count: dsa5Packs.length }
    );
  }

  // Bridge-Objekt
  if (!bridge) {
    push(
      'janus7.bridge.present',
      'warn',
      'DSA5SystemBridge ist nicht initialisiert. (Engine.ready wurde evtl. noch nicht ausgeführt?)'
    );
  } else {
    const available = !!bridge.available;
    push(
      'janus7.bridge.available',
      available ? 'ok' : 'warn',
      available
        ? 'DSA5SystemBridge meldet sich als verfügbar.'
        : 'DSA5SystemBridge meldet sich als NICHT verfügbar.',
      { available }
    );

    // Optional: schneller Check des Pack-Indexers
    if (bridge.packs) {
      try {
        await bridge.packs.ensureIndex({ documentName: 'Item' });
        push(
          'janus7.bridge.packs.index',
          'ok',
          'DSA5PacksIndex konnte aufgebaut werden.'
        );
      } catch (err) {
        logger?.warn?.('runDsa5BridgeDiagnostics: Fehler beim Aufbau des Pack-Indexers.', err);
        push(
          'janus7.bridge.packs.index',
          'warn',
          'DSA5PacksIndex konnte nicht aufgebaut werden. Details siehe Konsole.',
          { error: err?.message ?? String(err) }
        );
      }
    }
  }

  const ok = checks.every((c) => c.status !== 'fail');
  const report = /** @type {Dsa5BridgeDiagnosticReport} */ ({
    ok,
    checks,
  });

  return report;
}