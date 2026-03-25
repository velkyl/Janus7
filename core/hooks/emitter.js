/**
 * @file core/hooks/emitter.js
 * @module janus7
 * @phase 1
 *
 * Zweck:
 * Zentraler Hook-Emitter für JANUS7.
 * Feuert immer: kanonischen neuen Hook (Punktnotation) + alle registrierten Legacy-Aliase.
 *
 * Architektur:
 * - Anti-Corruption-Layer: einzige Emissionsstelle für JANUS-Hooks.
 * - Keine Business-Logik. Nur Routing und Metadaten-Anreicherung.
 * - Reentrancy-Schutz: ein laufender Emit blockiert keine weiteren Emits,
 *   aber verhindert, dass derselbe kanonische Hook sich selbst rekursiv triggert.
 * - Logger ist optional; wird injiziert, um keine Phase-1-Zirkelabhängigkeit zu erzwingen.
 *
 * Verwendung:
 * ```js
 * import { emitHook } from './core/hooks/emitter.js';
 * import { HOOKS } from './core/hooks/topics.js';
 *
 * emitHook(HOOKS.STATE_CHANGED, { path, oldValue, newValue, state });
 * ```
 */

import { HOOKS, HOOK_ALIASES } from './topics.js';

// ── Reentrancy-Schutz ─────────────────────────────────────────────────────────
// Verhindert, dass ein Hook durch seinen eigenen Alias sich selbst rekursiv
// erneut via emitHook aufruft (würde theoretisch passieren wenn ein Listener
// direkt auf den kanonischen Hook emitHook() aufruft).
const _inFlight = new Set();

/**
 * Optionaler Logger-Slot. Wird durch initHookEmitter() gesetzt.
 * @type {{ debug?: Function, warn?: Function }|null}
 */
let _logger = null;

/**
 * Injiziert einen Logger in den Emitter.
 * Muss nach JanusLogger-Init aufgerufen werden, bevor der erste Hook feuert.
 *
 * @param {{ debug?: Function, warn?: Function }} logger
 */
export function initHookEmitter(logger) {
  _logger = logger ?? null;
}

/**
 * Emittiert einen JANUS7-Hook kanonisch und alle zugehörigen Legacy-Aliase.
 *
 * Payload wird mit `_meta`-Feld angereichert (nicht-destruktiv, nur wenn kein
 * Nicht-Objekt-Payload übergeben wird).
 *
 * @param {string} topic  - Kanonischer Hook-Name (aus HOOKS-Konstanten).
 * @param {any}    payload - Hook-Payload (Objekt bevorzugt).
 * @returns {void}
 */
export function emitHook(topic, payload) {
  // Reentrancy-Guard: gleicher kanonischer Hook ist bereits in Bearbeitung
  if (_inFlight.has(topic)) {
    _logger?.warn?.(`[JANUS7][HookEmitter] Reentrancy verhindert für Hook: ${topic}`);
    return;
  }

  _inFlight.add(topic);
  try {
    // Payload mit Metadaten anreichern (nur bei Objekten, nicht bei primitiven Werten)
    const enriched = (payload !== null && typeof payload === 'object' && !Array.isArray(payload))
      ? { ...payload, _meta: { topic, emittedAt: Date.now() } }
      : payload;

    // 1. Kanonischen Hook feuern
    _logger?.debug?.(`[JANUS7][HookEmitter] emit: ${topic}`);
    Hooks.callAll(topic, enriched);

    // 2. Legacy-Aliase feuern (mit originalem Payload ohne _meta für Rückwärtskompatibilität)
    const aliases = HOOK_ALIASES[topic];
    if (aliases?.length) {
      for (const alias of aliases) {
        // Aliase erhalten den originalen payload (ohne _meta) – Listener-Kompatibilität
        Hooks.callAll(alias, payload);
      }
    }
  } finally {
    _inFlight.delete(topic);
  }
}

/**
 * Gibt alle bekannten kanonischen Hook-Namen zurück (für Introspection/Doku).
 * @returns {string[]}
 */
export function listTopics() {
  return Object.values(HOOKS);
}

/**
 * Exportiert HOOKS-Konstanten re-exportiert für Consumer,
 * die nur emitter.js importieren wollen.
 */
export { HOOKS };
