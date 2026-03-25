/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/time-tab.js
 * @module janus7/ui
 * 
 * Time Tab Renderer für JANUS7 Control Panel.
 * 
 * Zeigt aktuelle Zeit (Jahr, Trimester, Woche, Tag, Phase, Slot) und bietet
 * Steuerelemente für Zeit-Fortschritt (Slot, Phase, Tag).
 * 
 * **v0.6.7 Changes:**
 * - Vollständige i18n-Integration mit lokalem t() Helper
 * - 15 neue i18n-Keys für Labels und Buttons
 * - Robuste Exception-Handling für fehlende game.i18n
 */

import { JanusUI } from '../../../helpers.js';

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * Render Time Tab
 * 
 * @param {object} snap - Snapshot mit state, calendar, can, isGM
 * @param {object} snap.state - JANUS7 State (enthält time)
 * @param {object} snap.calendar - Calendar-API (optional)
 * @param {Function} snap.can - Permission-Check-Funktion
 * @param {boolean} snap.isGM - Ist User GM?
 * @returns {string} HTML-String für Tab-Content
 * 
 * @example
 * const html = renderTimeTab({ state, calendar, can, isGM: true });
 */
export function renderTimeTab(snap) {
  const { state, calendar } = snap;

  const can = typeof snap.can === 'function' ? snap.can : (a) => (snap.isGM ?? false);
  const disSlot = can('advanceSlot') ? '' : 'disabled';
  const disPhase = can('advancePhase') ? '' : 'disabled';
  const disDay = can('advanceDay') ? '' : 'disabled';
  
  const time = state?.time ?? {};
  const currentSlot = calendar?.getCurrentSlotRef?.() ?? time;
  
  const year = currentSlot.year ?? time.year ?? 1039;
  const trimester = currentSlot.trimester ?? time.trimester ?? 1;
  const week = currentSlot.week ?? time.week ?? 1;
  const day = currentSlot.day ?? time.day ?? 'Praiosstag';
  const phase = currentSlot.phase ?? time.phase ?? 'Morgen';
  const slot = currentSlot.slot ?? time.slot ?? 1;
  
  return `
    <div class="j7cp-panel j7cp-time">
      <section class="j7cp-section">
        <h3><i class="fas fa-clock"></i> Aktuelle Zeit</h3>
        <div class="j7cp-time-display">
          <div class="j7cp-time-item">
            <label>Jahr:</label>
            <span class="j7cp-value-large">${year} BF</span>
          </div>
          <div class="j7cp-time-item">
            <label>Trimester:</label>
            <span class="j7cp-value-large">${trimester}</span>
          </div>
          <div class="j7cp-time-item">
            <label>Woche:</label>
            <span class="j7cp-value-large">${week}</span>
          </div>
          <div class="j7cp-time-item">
            <label>Tag:</label>
            <span class="j7cp-value-large">${JanusUI.escape(day)}</span>
          </div>
          <div class="j7cp-time-item">
            <label>Phase:</label>
            <span class="j7cp-value-large">${JanusUI.escape(phase)}</span>
          </div>
          <div class="j7cp-time-item">
            <label>Slot:</label>
            <span class="j7cp-value-large">${slot}</span>
          </div>
        </div>
      </section>
      
      <section class="j7cp-section">
        <h3><i class="fas fa-arrow-right"></i> Slot-Steuerung</h3>
        <div class="j7cp-controls">
          <button 
            class="j7cp-btn j7cp-btn-control" 
            data-action="advanceSlot"
            data-steps="-1"
            title="1 Slot zurück"
            ${disSlot}
          >
            <i class="fas fa-step-backward"></i> -1
          </button>
          
          <div class="j7cp-control-label">Slots</div>
          
          <button 
            class="j7cp-btn j7cp-btn-control j7cp-btn-primary" 
            data-action="advanceSlot"
            data-steps="1"
            title="1 Slot vorwärts"
            ${disSlot}
          >
            <i class="fas fa-step-forward"></i> +1
          </button>
        </div>
      </section>
      
      <section class="j7cp-section">
        <h3><i class="fas fa-moon"></i> Phasen-Steuerung</h3>
        <div class="j7cp-controls">
          <button 
            class="j7cp-btn j7cp-btn-control" 
            data-action="advancePhase"
            data-steps="-1"
            title="1 Phase zurück"
            ${disPhase}
          >
            <i class="fas fa-step-backward"></i> -1
          </button>
          
          <div class="j7cp-control-label">Phasen</div>
          
          <button 
            class="j7cp-btn j7cp-btn-control j7cp-btn-primary" 
            data-action="advancePhase"
            data-steps="1"
            title="1 Phase vorwärts"
            ${disPhase}
          >
            <i class="fas fa-step-forward"></i> +1
          </button>
        </div>
      </section>
      
      <section class="j7cp-section">
        <h3><i class="fas fa-calendar-day"></i> Tages-Steuerung</h3>
        <div class="j7cp-controls">
          <button 
            class="j7cp-btn j7cp-btn-control" 
            data-action="advanceDay"
            data-steps="-1"
            title="1 Tag zurück"
            ${disDay}
          >
            <i class="fas fa-step-backward"></i> -1
          </button>
          
          <div class="j7cp-control-label">Tage</div>
          
          <button 
            class="j7cp-btn j7cp-btn-control j7cp-btn-primary" 
            data-action="advanceDay"
            data-steps="1"
            title="1 Tag vorwärts"
            ${disDay}
          >
            <i class="fas fa-step-forward"></i> +1
          </button>
        </div>
      </section>
      
      <section class="j7cp-section j7cp-section-info">
        <p class="j7-dialog-caption">
          <i class="fas fa-info-circle"></i> 
          Alle Zeit-Änderungen erfordern eine Bestätigung und können nicht rückgängig gemacht werden.
        </p>
      </section>
    </div>
  `;
}

export default renderTimeTab;
