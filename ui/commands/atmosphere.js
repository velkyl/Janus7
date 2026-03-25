/**
 * @file ui/commands/atmosphere.js
 * @module janus7/ui/commands
 * @phase 6
 *
 * Atmosphere commands for JANUS7 Command Center.
 */

import { _checkPermission, _engine, _toNum, _wrap } from './_shared.js';
import { JanusUI } from '../helpers.js';

export const atmosphereCommands = {

  // -------------------------------------------------------------------------
  // ATMOSPHERE
  // -------------------------------------------------------------------------

  async setAtmosphereEnabled(dataset = {}) {
    if (!_checkPermission('setAtmosphereEnabled')) return { success: false, cancelled: true };

    const engine = _engine();
    const enabled = !!(dataset.enabled === true || dataset.enabled === 'true');

    return await _wrap('setAtmosphereEnabled', async () => {
      const st = engine?.core?.state;
      if (!st?.transaction) throw new Error('State.transaction nicht verfügbar');
      await st.transaction((s) => {
        s.set?.('features.atmosphere.enabled', enabled);
      });
      await st.save({ force: true });

      // optional init
      if (enabled) {
        await engine?.atmosphere?.init?.().catch(() => {});
      }
      return { enabled };
    });
  },

  async setAtmosphereMaster(dataset = {}) {
    if (!_checkPermission('setAtmosphereMaster')) return { success: false, cancelled: true };

    const engine = _engine();
    const userId = dataset.userId || dataset.userIdSelect || null;
    return await _wrap('setAtmosphereMaster', async () => {
      const ok = await engine?.atmosphere?.setMasterClient?.(userId || null, { broadcast: true });
      if (!ok) throw new Error('Atmosphere.setMasterClient fehlgeschlagen');
      return { userId: userId || null };
    });
  },

  async setAtmosphereVolume(dataset = {}) {
    if (!_checkPermission('setAtmosphereVolume')) return { success: false, cancelled: true };

    const engine = _engine();
    const volume = _toNum(dataset.volume, 0.7);
    return await _wrap('setAtmosphereVolume', async () => {
      const ok = await engine?.atmosphere?.setMasterVolume?.(volume, { broadcast: true });
      if (!ok) throw new Error('Atmosphere.setMasterVolume fehlgeschlagen');
      return { volume };
    });
  },

  async applyMood(dataset = {}) {
    if (!_checkPermission('applyMood')) return { success: false, cancelled: true };

    const engine = _engine();
    const moodId = dataset.moodId || null;
    if (!moodId) return { cancelled: true };
    return await _wrap('applyMood', async () => {
      const ok = await engine?.atmosphere?.applyMood?.(moodId, { broadcast: true, force: true, reason: 'ui' });
      if (!ok) throw new Error('Atmosphere.applyMood fehlgeschlagen');
      return { moodId };
    });
  },

  async stopAtmosphere(_dataset = {}) {
    if (!_checkPermission('stopAtmosphere')) return { success: false, cancelled: true };

    const engine = _engine();
    return await _wrap('stopAtmosphere', async () => {
      const ok = await engine?.atmosphere?.stopAll?.({ broadcast: true });
      if (!ok) throw new Error('Atmosphere.stopAll fehlgeschlagen');
      return true;
    });
  },

  async setAtmosphereAuto(dataset = {}) {
    if (!_checkPermission('setAtmosphereAuto')) return { success: false, cancelled: true };

    const engine = _engine();
    const type = String(dataset.type || '');
    const enabled = !!(dataset.enabled === true || dataset.enabled === 'true');

    return await _wrap('setAtmosphereAuto', async () => {
      const atm = engine?.atmosphere;
      if (!atm) throw new Error('Atmosphere API nicht verfügbar');

      let ok = false;
      if (type === 'calendar') ok = await atm.setAutoFromCalendar?.(enabled, { broadcast: true });
      else if (type === 'events') ok = await atm.setAutoFromEvents?.(enabled, { broadcast: true });
      else if (type === 'location') ok = await atm.setAutoFromLocation?.(enabled, { broadcast: true });
      else throw new Error(`Unbekannter Auto-Typ: ${type}`);

      if (!ok) throw new Error('Atmosphere auto flag konnte nicht gesetzt werden');
      return { type, enabled };
    });
  },

  // -------------------------------------------------------------------------
  // DEBUG
  // -------------------------------------------------------------------------,

  /** Toggle beamer mode */
  async toggleBeamer(_dataset = {}) {
    if (!_checkPermission('toggleBeamer')) return { success: false, cancelled: true };

    const engine = _engine();
    return await _wrap('toggleBeamer', async () => {
      const st = engine?.core?.state;
      if (!st?.transaction) throw new Error('State.transaction nicht verfügbar');

      await st.transaction((s) => {
        const cur = !!s.get?.('display.beamerMode');
        s.set?.('display.beamerMode', !cur);
      });
      await st.save({ force: true });
      return { beamerMode: !!st.get?.('display.beamerMode') };
    });
  },

  // -------------------------------------------------------------------------
  // ATMOSPHERE
  // -------------------------------------------------------------------------,
};
