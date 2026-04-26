import { JanusBaseApp } from '../core/base-app.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusExternalBridgeApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    tag: 'form',
    id: 'janus-external-bridge-app',
    window: {
      title: 'JANUS7 | External Bridge',
      icon: 'fas fa-bridge',
      resizable: true
    },
    position: {
      width: 600,
      height: 'auto'
    },
    actions: {
      testSql: '_onTestSql',
      testPython: '_onTestPython'
    }
  };

  static PARTS = {
    form: {
      template: 'modules/Janus7/templates/external-bridge.hbs'
    }
  };

  constructor(options = {}) {
    super(options);
    this.results = { sql: null, python: null };
  }

  /** @override */
  _prepareContext(_options) {
    return {
      results: this.results,
      config: {
        dbPath: 'janus7/data/keeper.db',
        scriptPath: 'extensions/external-bridge/test.py'
      }
    };
  }

  async _onTestSql(event, target) {
    if (!this._requireGM('testSql')) return;
    const el = this.element;
    const db = el?.querySelector('[name="dbPath"]')?.value;
    const query = el?.querySelector('[name="sqlQuery"]')?.value;
    if (!db || !query) return;

    const ext = game?.janus7?.capabilities?.ext ?? game?.janus7?.ext ?? null;
    this.results.sql = 'Warte auf Antwort…';
    await this.render({ force: true });
    try {
      const res = await ext?.querySql?.(db, query);
      this.results.sql = JSON.stringify(res, null, 2);
    } catch (err) {
      this.results.sql = `Fehler: ${err.message}`;
    }
    await this.render({ force: true });
  }

  async _onTestPython(event, target) {
    if (!this._requireGM('testPython')) return;
    const el = this.element;
    const script = el?.querySelector('[name="scriptPath"]')?.value;
    const argsRaw = el?.querySelector('[name="pythonArgs"]')?.value;
    if (!script) return;

    const ext = game?.janus7?.capabilities?.ext ?? game?.janus7?.ext ?? null;
    let args;
    try {
      args = argsRaw ? JSON.parse(argsRaw) : {};
    } catch (_) {
      this.results.python = 'Fehler: Ungültiges JSON in Args.';
      await this.render({ force: true });
      return;
    }
    this.results.python = 'Warte auf Antwort…';
    await this.render({ force: true });
    try {
      const res = await ext?.runScript?.(script, args);
      this.results.python = JSON.stringify(res, null, 2);
    } catch (err) {
      this.results.python = `Fehler: ${err.message}`;
    }
    await this.render({ force: true });
  }
}

