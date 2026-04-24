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

import { JanusBaseApp } from '../core/base-app.js';

/**
 * Settings Menu wrapper for the optional Devtools Test Harness.
 * Falls back gracefully if devtools bundle is not present.
 * @extends {JanusBaseApp}
 */
export class JanusSettingsTestHarnessApp extends JanusBaseApp {
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
   * @returns {Promise<JanusBaseApp>}
   */
  static async showSingleton() {
    try {
      const { JanusTestHarnessApp } = await import('../../devtools/test-harness/app.js');
      return JanusTestHarnessApp.showSingleton?.() ?? new JanusTestHarnessApp().render({ force: true });
    } catch {
      // Devtools-Bundle nicht vorhanden – Fallback-Fenster anzeigen
      const inst = new JanusSettingsTestHarnessApp();
      inst.render({ force: true });
      return inst;
    }
  }

  async _renderHTML(_context, _options) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:1.5rem;font-family:var(--font-primary,sans-serif)';

    const p1 = document.createElement('p');
    const s1 = document.createElement('strong');
    s1.textContent = 'JANUS7 Devtools Test Harness';
    p1.appendChild(s1);
    p1.append(' ist nicht installiert.');
    div.appendChild(p1);

    const p2 = document.createElement('p');
    p2.style.cssText = 'margin-top:.75rem;opacity:.75;font-size:.9em';
    p2.append('Das Devtools-Bundle (');
    const c1 = document.createElement('code');
    c1.textContent = 'devtools/test-harness/';
    p2.appendChild(c1);
    p2.append(') ist ein optionaler Entwickler-Artefakt und nicht im Produktions-Release enthalten.');
    p2.appendChild(document.createElement('br'));
    p2.appendChild(document.createElement('br'));
    p2.append('Nutze stattdessen: ');
    const c2 = document.createElement('code');
    c2.textContent = 'game.janus7.test.runner';
    p2.appendChild(c2);
    p2.append(' oder den integrierten Test-Katalog im ');
    const s2 = document.createElement('strong');
    s2.textContent = 'Command Center';
    p2.appendChild(s2);
    p2.append('.');
    div.appendChild(p2);

    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }
}

