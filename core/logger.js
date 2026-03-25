import { MODULE_ABBREV } from './common.js';

/**
 * Einfacher, aber strukturierter Logger für JANUS7.
 */
/**
 * JanusLogger
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
export class JanusLogger {
  static _history = [];
  static _historyLimit = 100;

  static _pushHistory(entry) {
    try {
      this._history.push(entry);
      if (this._history.length > this._historyLimit) this._history.splice(0, this._history.length - this._historyLimit);
    } catch (_err) { /* noop */ }
  }

  static getRecentEntries({ levels = ['warn', 'error', 'fatal'], limit = 20 } = {}) {
    const allowed = Array.isArray(levels) ? new Set(levels) : null;
    const filtered = this._history.filter((entry) => !allowed || allowed.has(entry?.level));
    return filtered.slice(-Math.max(1, Number(limit) || 20));
  }

  constructor(prefix = MODULE_ABBREV) {
    this.prefix = prefix;
    this.level = 'info';
    this._levels = ['debug', 'info', 'warn', 'error', 'fatal'];
  }

  setLevel(level) {
    if (!this._levels.includes(level)) return;
    this.level = level;
    this.info(`Log-Level auf "${level}" gesetzt.`);
  }

  _shouldLog(level) {
    const currentIndex = this._levels.indexOf(this.level);
    const levelIndex = this._levels.indexOf(level);
    if (currentIndex === -1 || levelIndex === -1) return true;
    return levelIndex >= currentIndex;
  }

  _fmt(level) {
    return `[${this.prefix}] [${level.toUpperCase()}]`;
  }

  _serializeArgs(args) {
    return args.map((arg) => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'string') return arg;
      try { return JSON.stringify(arg); } catch (_err) { return String(arg); }
    }).join(' ');
  }

  _record(level, args) {
    JanusLogger._pushHistory({
      timestamp: new Date().toISOString(),
      prefix: this.prefix,
      level,
      message: this._serializeArgs(args)
    });
  }

  debug(...args) {
    this._record('debug', args);
    if (!this._shouldLog('debug')) return;
    console.debug(this._fmt('debug'), ...args);
  }

  info(...args) {
    this._record('info', args);
    if (!this._shouldLog('info')) return;
    console.info(this._fmt('info'), ...args);
  }

  warn(...args) {
    this._record('warn', args);
    if (!this._shouldLog('warn')) return;
    console.warn(this._fmt('warn'), ...args);
  }

  error(...args) {
    this._record('error', args);
    if (!this._shouldLog('error')) return;
    console.error(this._fmt('error'), ...args);
  }

  fatal(...args) {
    this._record('fatal', args);
    if (!this._shouldLog('fatal')) return;
    console.error(this._fmt('fatal'), ...args);
  }
  /**
   * Create a child logger that inherits the current log-level.
   * Useful for scoping logs per subsystem (e.g. core.logger.child('AcademyDataApi')).
   */
  child(scope = '') {
    const suffix = String(scope || '').trim();
    const prefix = suffix ? `${this.prefix}:${suffix}` : this.prefix;
    const child = new JanusLogger(prefix);
    child.setLevel(this.level);
    return child;
  }

}
