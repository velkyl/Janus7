/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/status-tab.js
 * Status Tab Renderer für JANUS7 Control Panel
 */

import { JanusUI } from '../../../helpers.js';

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * Render Status Tab
 * @param {object} snap - Snapshot mit engine, state, calendar, etc.
 * @returns {string} HTML
 */
export function renderStatusTab(snap) {
  const { state, calendar, atmosphere } = snap;

  const t = (key, fallback) => {
    try {
      const v = game?.i18n?.localize?.(key);
      return (v && v !== key) ? v : fallback;
    } catch {
      return fallback;
    }
  };

  const can = typeof snap.can === 'function' ? snap.can : (a) => (snap.isGM ?? false);
  const disAdvance = can('advanceSlot') ? '' : 'disabled';
  const disSave = can('saveState') ? '' : 'disabled';
  const disBeamer = can('toggleBeamer') ? '' : 'disabled';
  
  // Current Time
  const time = state?.time ?? {};
  const timeStr = JanusUI.formatSlot({
    year: time.year,
    trimester: time.trimester,
    week: time.week,
    day: time.day,
    phase: time.phase
  });
  
  // State Meta
  const meta = state?.meta ?? {};
  const updatedAt = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('de-DE') : 'Nie';
  
  // Atmosphere Status
  const atmoEnabled = state?.features?.atmosphere?.enabled ?? false;
  const atmoMaster = atmosphere?.masterUserId;
  const masterUser = atmoMaster ? game.users.get(atmoMaster) : null;
  
  // Beamer Status
  const beamerMode = state?.display?.beamerMode ?? false;

  // i18n badge strings
  const atmoBadgeText = atmoEnabled
    ? `<i class="fas fa-check"></i> ${t('JANUS7.UI.Status.Active','Aktiv')}`
    : `<i class="fas fa-times"></i> ${t('JANUS7.UI.Status.Inactive','Inaktiv')}`;

  const beamerBadgeText = beamerMode
    ? `<i class="fas fa-check"></i> ${t('JANUS7.UI.Status.On','An')}`
    : `<i class="fas fa-times"></i> ${t('JANUS7.UI.Status.Off','Aus')}`;
  
  return `
    <div class="j7cp-panel j7cp-status">
      <section class="j7cp-section">
        <h3><i class="fas fa-clock"></i> ${t('JANUS7.UI.Status.CurrentTime','Aktuelle Zeit')}</h3>
        <div class="j7cp-info-grid">
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Status.Timestamp','Zeitpunkt')}</label>
            <span class="j7cp-value">${JanusUI.escape(timeStr)}</span>
          </div>
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Status.LastUpdate','Letztes Update')}</label>
            <span class="j7cp-value">${JanusUI.escape(updatedAt)}</span>
          </div>
        </div>
      </section>
      
      <section class="j7cp-section">
        <h3><i class="fas fa-cogs"></i> ${t('JANUS7.UI.Status.SystemStatus','System-Status')}</h3>
        <div class="j7cp-info-grid">
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Status.StateLoaded','State geladen')}</label>
            <span class="j7cp-badge j7cp-badge-success">
              <i class="fas fa-check"></i> ${t('JANUS7.UI.Status.Yes','Ja')}
            </span>
          </div>
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Status.Atmosphere','Atmosphäre')}</label>
            <span class="j7cp-badge ${atmoEnabled ? 'j7cp-badge-success' : 'j7cp-badge-inactive'}">
              ${atmoBadgeText}
            </span>
          </div>
          <div class="j7cp-info-item">
            <label>${t('JANUS7.UI.Status.BeamerMode','Beamer-Modus')}</label>
            <span class="j7cp-badge ${beamerMode ? 'j7cp-badge-success' : 'j7cp-badge-inactive'}">
              ${beamerBadgeText}
            </span>
          </div>
          ${masterUser ? `
            <div class="j7cp-info-item">
              <label>${t('JANUS7.UI.Status.AtmoMaster','Atmosphäre Master')}</label>
              <span class="j7cp-value">
                ${JanusUI.getUserAvatar(masterUser)}
                ${JanusUI.escape(masterUser.name)}
              </span>
            </div>
          ` : ''}
        </div>
      </section>
      
      <section class="j7cp-section">
        <h3><i class="fas fa-bolt"></i> ${t('JANUS7.UI.Status.QuickActions','Quick Actions')}</h3>
        <div class="j7cp-actions">
          <button 
            class="j7cp-btn j7cp-btn-primary" 
            data-action="advanceSlot"
            data-steps="1"
            title="${t('JANUS7.UI.Status.NextSlotTitle','Nächster Slot (mit Bestätigung)')}"
            ${disAdvance}
          >
            <i class="fas fa-forward"></i> ${t('JANUS7.UI.Status.NextSlot','+1 Slot')}
          </button>
          
          <button 
            class="j7cp-btn j7cp-btn-secondary" 
            data-action="saveState"
            title="${t('JANUS7.UI.Status.SaveTitle','State sofort speichern')}"
            ${disSave}
          >
            <i class="fas fa-save"></i> ${t('JANUS7.UI.Status.Save','State speichern')}
          </button>
          
          <button 
            class="j7cp-btn j7cp-btn-secondary" 
            data-action="toggleBeamer"
            title="${t('JANUS7.UI.Status.BeamerTitle','Beamer-Modus umschalten')}"
            ${disBeamer}
          >
            <i class="fas fa-desktop"></i> ${t('JANUS7.UI.Status.BeamerLabel','Beamer')} ${beamerMode ? t('JANUS7.UI.Status.Off','Aus') : t('JANUS7.UI.Status.On','An')}
          </button>
        </div>
      </section>
    </div>
  `;
}

export default renderStatusTab;
