/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/debug-tab.js
 * @module janus7/ui
 * 
 * Debug Tab Renderer für JANUS7 Control Panel.
 * 
 * Zeigt System-Status (Core Ready, Version, Last Update) und bietet
 * Debug-Tools (Diagnose kopieren, State exportieren, Test Harness).
 * 
 * **v0.6.7 Changes:**
 * - Vollständige i18n-Integration mit lokalem t() Helper
 * - 8 neue i18n-Keys für Labels und Buttons
 * - Info-Grid mit i18n
 */

import { JanusUI } from '../../../helpers.js';
import { JanusConfig } from '../../../../core/config.js';

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * Render Debug Tab
 * 
 * @param {object} snap - Snapshot mit state, can, isGM
 * @param {object} snap.state - JANUS7 State (enthält meta)
 * @param {Function} snap.can - Permission-Check-Funktion
 * @param {boolean} snap.isGM - Ist User GM?
 * @returns {string} HTML-String für Tab-Content
 * 
 * @example
 * const html = renderDebugTab({ state, can, isGM: true });
 */
export function renderDebugTab(snap) {
  const { state } = snap;

  // i18n Helper (local)
  const t = (key, fallback) => {
    try {
      const v = game?.i18n?.localize?.(key);
      return (v && v !== key) ? v : fallback;
    } catch {
      return fallback;
    }
  };

  const can = typeof snap.can === 'function' ? snap.can : (a) => (snap.isGM ?? false);
  const disCopy = can('copyDiagnostics') ? '' : 'disabled';
  const disExport = can('exportState') ? '' : 'disabled';
  const disHarness = can('openTestHarness') ? '' : 'disabled';

  const version = game?.modules?.get?.('janus7')?.version ?? 'unknown';
  const stateLoaded = !!state;
  const meta = state?.meta ?? {};

  let hc = false;
  try { hc = !!JanusConfig.getUIPreference('uiHighContrast', false); } catch {}

  return `
    <div class="j7cp-panel j7cp-debug">
      <section class="j7cp-section">
        <h3><i class="fas fa-bug"></i> ${t('JANUS7.UI.Debug.Title','Debug & Diagnose')}</h3>
        <div class="j7cp-info-grid">
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Status.Core','Core')}</label>
            <span class="j7cp-badge ${stateLoaded ? 'j7cp-badge-success' : 'j7cp-badge-inactive'}">
              ${stateLoaded 
                ? `<i class="fas fa-check"></i> ${t('JANUS7.UI.Status.Ready','Ready')}`
                : `<i class="fas fa-times"></i> ${t('JANUS7.UI.Status.NotReady','Nicht bereit')}`
              }
            </span>
          </div>
          <div class="j7cp-info-item">
            <label>Version</label>
            <span class="j7cp-value">${JanusUI.escape(version)}</span>
          </div>
          ${meta.lastUpdate ? `
            <div class="j7cp-info-item">
              <label>${t('JANUS7.UI.Status.LastUpdate','Letztes Update')}</label>
              <span class="j7cp-value">${JanusUI.escape(meta.lastUpdate)}</span>
            </div>
          ` : ''}
        </div>
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-tools"></i> ${t('JANUS7.UI.Debug.Title','Debug-Tools')}</h3>
        <div class="j7cp-actions">
          <button 
            data-action="copyDiagnostics"
            ${disCopy}
            title="${t('JANUS7.UI.Debug.CopyDiagnostics','System-Infos in Zwischenablage kopieren')}"
          >
            <i class="fas fa-clipboard"></i>
            ${t('JANUS7.UI.Debug.CopyDiagnostics','Diagnose kopieren')}
          </button>
          <button 
            data-action="exportState"
            ${disExport}
            title="${t('JANUS7.UI.Debug.ExportState','State als JSON exportieren')}"
          >
            <i class="fas fa-download"></i>
            ${t('JANUS7.UI.Debug.ExportState','State exportieren')}
          </button>
          <button 
            data-action="openTestHarness"
            ${disHarness}
            title="${t('JANUS7.UI.Debug.OpenHarness','Test-Harness öffnen')}"
          >
            <i class="fas fa-vial"></i>
            ${t('JANUS7.UI.Debug.OpenHarness','Test Harness')}
          </button>
        </div>
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-universal-access"></i> ${t('JANUS7.UI.Theme.Title','Darstellung')}</h3>
        <div class="j7cp-info-list">
          <div class="j7cp-info-row">
            <span class="j7cp-label">${t('JANUS7.UI.Theme.HighContrast','High Contrast')}</span>
            <button data-action="toggleHighContrast" title="${t('JANUS7.UI.Theme.HighContrastHint','Kontrast für bessere Lesbarkeit erhöhen')}">
              <i class="fas ${hc ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
              ${hc ? t('JANUS7.UI.On','An') : t('JANUS7.UI.Off','Aus')}
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}

export default renderDebugTab;
