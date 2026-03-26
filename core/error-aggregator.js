/**
 * @file core/error-aggregator.js
 * @module janus7
 * @phase 1
 *
 * JanusErrorAggregator
 *
 * Zweck:
 *   Zentrales Fehler-Tracking für die JANUS7 Engine.
 *   Sammelt Fehler aus allen Subsystemen (Integrationen, Hooks, Services)
 *   und macht sie über ein einheitliches Interface zugänglich.
 *
 *   Ohne dieses Modul: Fehler werden lokal geloggt, aber nie aggregiert –
 *   bei 5 silent-failing Integrationen gibt es keine Übersicht.
 *
 * Verwendung:
 *   engine.errors.record('phase4', 'LessonBuffManager', err);
 *   engine.errors.getAll();       // alle Fehler
 *   engine.errors.getSummary();   // kompakte Übersicht (für Diagnostics-UI)
 *   engine.errors.hasErrors();    // schneller Guard
 *
 * Architektur:
 *   - Keine UI-Seiteneffekte
 *   - Keine Foundry-Abhängigkeiten
 *   - Singleton über Engine-Instanz (engine.errors)
 */

const MAX_ERRORS = 200; // Schutz vor Memory-Overflow bei Loops

/**
 * @typedef {object} JanusErrorRecord
 * @property {string}  phase      Phase/Subsystem (z.B. 'phase4', 'bridge.dsa5', 'academy')
 * @property {string}  context    Kontext innerhalb der Phase (z.B. 'LessonBuffManager.init')
 * @property {string}  message    Fehlermeldung
 * @property {string}  [stack]    Stack-Trace (nur bei Error-Objekten)
 * @property {number}  timestamp  Unix-Timestamp (ms)
 * @property {'error'|'warn'} severity
 */

export class JanusErrorAggregator {
  constructor() {
    /** @type {JanusErrorRecord[]} */
    this._records = [];
  }

  // ─── Aufzeichnung ─────────────────────────────────────────────────────────

  /**
   * Zeichnet einen Fehler auf.
   *
   * @param {string} phase     Phase/Subsystem (z.B. 'phase4', 'bridge.dsa5')
   * @param {string} context   Kontext (z.B. 'LessonBuffManager.init', 'CompendiumLibrary.buildIndex')
   * @param {Error|any} err    Der aufgetretene Fehler
   * @param {'error'|'warn'} [severity='error']
   */
  record(phase, context, err, severity = 'error') {
    if (this._records.length >= MAX_ERRORS) {
      // Ring-Buffer: ältesten Eintrag entfernen
      this._records.shift();
    }
    this._records.push({
      phase: String(phase ?? 'unknown'),
      context: String(context ?? 'unknown'),
      message: String(err?.message ?? err ?? 'Unbekannter Fehler'),
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: Date.now(),
      severity,
    });
  }

  /**
   * Zeichnet eine Warnung auf (severity='warn').
   * @param {string} phase
   * @param {string} context
   * @param {Error|any} err
   */
  warn(phase, context, err) {
    this.record(phase, context, err, 'warn');
  }

  // ─── Abfrage ──────────────────────────────────────────────────────────────

  /**
   * Gibt alle aufgezeichneten Fehler zurück.
   * @param {{ severity?: 'error'|'warn', phase?: string }} [filter]
   * @returns {JanusErrorRecord[]}
   */
  getAll({ severity, phase } = {}) {
    return this._records.filter(r => {
      if (severity && r.severity !== severity) return false;
      if (phase && r.phase !== phase) return false;
      return true;
    });
  }

  /** @returns {boolean} */
  hasErrors() {
    return this._records.some(r => r.severity === 'error');
  }

  /** @returns {boolean} */
  hasWarnings() {
    return this._records.some(r => r.severity === 'warn');
  }

  /** @returns {number} */
  get errorCount() {
    return this._records.filter(r => r.severity === 'error').length;
  }

  /** @returns {number} */
  get warnCount() {
    return this._records.filter(r => r.severity === 'warn').length;
  }

  /**
   * Kompakte Übersicht für Diagnostics-UI / Health-Dashboard.
   * @returns {{ totalErrors: number, totalWarnings: number, byPhase: Record<string, {errors: number, warnings: number}>, latest: JanusErrorRecord[] }}
   */
  getSummary() {
    const byPhase = {};
    for (const r of this._records) {
      if (!byPhase[r.phase]) byPhase[r.phase] = { errors: 0, warnings: 0 };
      if (r.severity === 'error') byPhase[r.phase].errors++;
      else byPhase[r.phase].warnings++;
    }
    return {
      totalErrors: this.errorCount,
      totalWarnings: this.warnCount,
      byPhase,
      latest: this._records.slice(-10),
    };
  }

  /**
   * Löscht alle aufgezeichneten Fehler (z.B. nach Recovery).
   */
  clear() {
    this._records = [];
  }
}
