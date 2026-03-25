/**
 * @file ui/apps/JanusSettingsTestHarnessApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Settings-Menu-Wrapper für das optionale Devtools Test Harness.
 * Das Devtools-Modul (devtools/test-harness/) ist ein optionaler
 * Build-Artefakt und nicht im Produktions-Bundle enthalten.
 *
 * Der Import ist deshalb dynamisch und fail-safe:
 * Fehlt das Devtools-Modul, rendert diese Klasse eine Fallback-Meldung
 * statt einen SyntaxError/ReferenceError zu werfen.
 *
 * @see scripts/integration/phase6-ui-integration.js (registerMenu)
 */

const { ApplicationV2 } = foundry.applications.api;

/**
 * Settings Menu wrapper for the optional Devtools Test Harness.
 * Falls back gracefully if devtools bundle is not present.
 * @extends {ApplicationV2}
 */
export class JanusSettingsTestHarnessApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'janus7-settings-test-harness',
    window: { title: 'JANUS7 – Test Harness' },
    position: { width: 800, height: 600 }
  };

  _configureRenderOptions(options = {}) {
    options = super._configureRenderOptions?.(options ?? {}) ?? (options ?? {});
    options.tag ??= 'section';
    options.window = (options.window && typeof options.window === 'object') ? { ...options.window } : {};
    options.window.title = String(options.window.title ?? this.constructor?.DEFAULT_OPTIONS?.window?.title ?? 'JANUS7 – Test Harness');
    delete options.window.icon;
    if (Array.isArray(options.window.controls)) delete options.window.controls;
    return options;
  }

  /**
   * Öffnet das Devtools-Harness wenn verfügbar, zeigt sonst einen Hinweis.
   * @returns {Promise<ApplicationV2>}
   */
  static async showSingleton() {
    try {
      const { JanusTestHarnessApp } = await import('../../devtools/test-harness/app.js');
      return JanusTestHarnessApp.showSingleton?.() ?? new JanusTestHarnessApp().render(true);
    } catch {
      // Devtools-Bundle nicht vorhanden – Fallback-Fenster anzeigen
      const inst = new JanusSettingsTestHarnessApp();
      inst.render(true);
      return inst;
    }
  }

  async _renderHTML(_context, _options) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:1.5rem;font-family:var(--font-primary,sans-serif)';
    div.innerHTML = `
      <p><strong>JANUS7 Devtools Test Harness</strong> ist nicht installiert.</p>
      <p style="margin-top:.75rem;opacity:.75;font-size:.9em">
        Das Devtools-Bundle (<code>devtools/test-harness/</code>) ist ein optionaler
        Entwickler-Artefakt und nicht im Produktions-Release enthalten.<br><br>
        Nutze stattdessen: <code>game.janus7.test.runner</code> oder
        den integrierten Test-Katalog im <strong>Command Center</strong>.
      </p>`;
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }
}
