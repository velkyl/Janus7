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
    const app = this; // In ApplicationV2 actions, 'this' is the app instance
    const db = app.element.querySelector('[name="dbPath"]').value;
    const query = app.element.querySelector('[name="sqlQuery"]').value;
    
    try {
      app.results.sql = "Warte auf Antwort...";
      app.render();
      const res = await game.janus7.capabilities.ext.querySql(db, query);
      app.results.sql = JSON.stringify(res, null, 2);
    } catch (err) {
      app.results.sql = `Fehler: ${err.message}`;
    }
    app.render();
  }

  async _onTestPython(event, target) {
    const app = this;
    const script = app.element.querySelector('[name="scriptPath"]').value;
    const argsRaw = app.element.querySelector('[name="pythonArgs"]').value;
    
    try {
      const args = argsRaw ? JSON.parse(argsRaw) : {};
      app.results.python = "Warte auf Antwort...";
      app.render();
      const res = await game.janus7.capabilities.ext.runScript(script, args);
      app.results.python = JSON.stringify(res, null, 2);
    } catch (err) {
      app.results.python = `Fehler: ${err.message}`;
    }
    app.render();
  }
}

