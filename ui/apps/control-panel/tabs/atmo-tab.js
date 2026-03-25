/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/atmo-tab.js
 * @module janus7/ui
 * 
 * Atmosphere Tab Renderer für JANUS7 Control Panel.
 * 
 * Zeigt Atmosphäre-Status (aktiviert, Master-Client, Lautstärke) und bietet
 * Steuerelemente für Mood-Anwendung und Auto-Flags.
 * 
 * **v0.6.7 Changes:**
 * - Vollständige i18n-Integration mit lokalem t() Helper
 * - 12 neue i18n-Keys für Labels und Buttons
 * - Badge-Formatierung mit i18n
 */

import { JanusUI } from '../../../helpers.js';

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * Render Atmosphere Tab
 * 
 * @param {object} snap - Snapshot mit state, atmosphere, can, isGM
 * @param {object} snap.state - JANUS7 State (enthält features.atmosphere)
 * @param {object} snap.atmosphere - Atmosphere-API (moods, masterClient)
 * @param {Function} snap.can - Permission-Check-Funktion
 * @param {boolean} snap.isGM - Ist User GM?
 * @returns {string} HTML-String für Tab-Content
 * 
 * @example
 * const html = renderAtmoTab({ state, atmosphere, can, isGM: true });
 */
export function renderAtmoTab(snap) {
  const { state, atmosphere } = snap;

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
  const disAtmo = can('setAtmosphereEnabled') ? '' : 'disabled';
  const disMood = can('applyMood') ? '' : 'disabled';
  const disVolume = can('setAtmosphereVolume') ? '' : 'disabled';

  const atmoEnabled = state?.features?.atmosphere?.enabled ?? false;
  const masterUserId = atmosphere?.masterClientUserId ?? null;
  const masterUser = masterUserId ? game.users?.get(masterUserId) : null;
  const volume = state?.features?.atmosphere?.volume ?? 0.7;
  
  const currentMood = atmosphere?.currentMood ?? null;
  const moods = atmosphere?.availableMoods ?? [];

  const atmoBadgeText = atmoEnabled
    ? `<i class="fas fa-check"></i> ${t('JANUS7.UI.Status.Active','Aktiv')}`
    : `<i class="fas fa-times"></i> ${t('JANUS7.UI.Status.Inactive','Inaktiv')}`;

  return `
    <div class="j7cp-panel j7cp-atmo">
      <section class="j7cp-section">
        <h3><i class="fas fa-music"></i> ${t('JANUS7.UI.Atmo.Title','Atmosphäre')}</h3>
        <div class="j7cp-info-grid">
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Atmo.Enabled','Atmosphäre aktiv')}</label>
            <span class="j7cp-badge ${atmoEnabled ? 'j7cp-badge-success' : 'j7cp-badge-inactive'}">
              ${atmoBadgeText}
            </span>
          </div>
          ${masterUser ? `
            <div class="j7cp-info-item">
              <label>${t('JANUS7.UI.Atmo.Master','Master-Client')}</label>
              <span class="j7cp-value">
                ${JanusUI.getUserAvatar(masterUser)}
                ${JanusUI.escape(masterUser.name)}
              </span>
            </div>
          ` : ''}
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Atmo.Volume','Master-Lautstärke')}</label>
            <span class="j7cp-value">${Math.round(volume * 100)}%</span>
          </div>
        </div>
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-palette"></i> ${t('JANUS7.UI.Atmo.Mood','Mood')}</h3>
        <div class="j7cp-atmo-controls">
          <select id="j7cp-mood-select" ${disMood}>
            <option value="">-- ${t('JANUS7.UI.Atmo.Mood','Mood')} --</option>
            ${moods.map(m => `
              <option value="${m.id}" ${currentMood === m.id ? 'selected' : ''}>
                ${JanusUI.escape(m.name || m.id)}
              </option>
            `).join('')}
          </select>
          <button 
            data-action="applyMood"
            data-mood-id-select="#j7cp-mood-select"
            ${disMood}
          >
            <i class="fas fa-play"></i>
            ${t('JANUS7.UI.Atmo.ApplyMood','Mood anwenden')}
          </button>
          <button 
            data-action="stopAtmosphere"
            ${disMood}
          >
            <i class="fas fa-stop"></i>
            ${t('JANUS7.UI.Atmo.Stop','Stop')}
          </button>
        </div>
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-magic"></i> ${t('JANUS7.UI.Atmo.AutoTitle','Auto')}</h3>
        <div class="j7cp-atmo-auto">
          <label>
            <input 
              type="checkbox" 
              data-action="setAtmosphereAuto"
              data-type="calendar"
              ${state?.features?.atmosphere?.autoFromCalendar ? 'checked' : ''}
              ${disAtmo}
            />
            ${t('JANUS7.UI.Atmo.AutoDay','Auto (Tageszeit)')}
          </label>
          <label>
            <input 
              type="checkbox" 
              data-action="setAtmosphereAuto"
              data-type="location"
              ${state?.features?.atmosphere?.autoFromLocation ? 'checked' : ''}
              ${disAtmo}
            />
            ${t('JANUS7.UI.Atmo.AutoLocation','Auto (Location)')}
          </label>
        </div>
      </section>
    </div>
  `;
}

export default renderAtmoTab;
