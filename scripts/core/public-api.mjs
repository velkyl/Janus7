/**
 * @file scripts/core/public-api.mjs
 * @module janus7/public-api
 * @phase A2 — Single Re-Export Layer
 *
 * Architekturvertrag:
 * - DIESE Datei ist der einzige erlaubte Import-Pfad für scripts/integration/*,
 *   scripts/ui/* und scripts/extensions/* um auf core/ Symbole zuzugreifen.
 * - Keine direkte Nutzung von ../../core/* außerhalb von scripts/janus.mjs.
 * - Ergänzungen hier erfordern Code-Review + Eintrag in CHANGELOG.md
 */

// ── Konstanten & Identifikatoren ─────────────────────────────────────────────
export {
  MODULE_ID,
  MODULE_ABBREV,
  STATE_PATHS,
  AVENTURIAN_CALENDAR,
  moduleTemplatePath,
  moduleAssetPath
} from '../../core/common.js';

// ── Konfiguration & Settings (SSOT Gateway) ──────────────────────────────────
// REGEL: Kein Code außerhalb von core/config.js darf game.settings direkt nutzen.
export { JanusConfig } from '../../core/config.js';

// ── Hook-System ───────────────────────────────────────────────────────────────
export { HOOKS } from '../../core/hooks/topics.js';
export { emitHook } from '../../core/hooks/emitter.js';
export {
  registerRuntimeHook,
  registerEngineHook,
  cleanupEngineHookBucket
} from '../../core/hooks/runtime.js';

// ── Engine-Zugriff (read-only Referenz) ───────────────────────────────────────
export { getJanus7, getJanusCore } from '../../core/index.js';
