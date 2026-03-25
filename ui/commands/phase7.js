/**
 * @file ui/commands/phase7.js
 * @module janus7/ui/commands
 * @phase 7
 *
 * Phase-7 commands for JANUS7 Command Center.
 * Goal: reachability without console.
 */

import { _checkPermission, _engine, _wrap } from './_shared.js';
import { JanusConfig } from '../../core/config.js';

function _ensurePhase7Enabled() {
  if (JanusConfig.get('enablePhase7') === false) {
    ui.notifications?.warn?.('Phase 7 ist deaktiviert (Setting: enablePhase7).');
    return false;
  }
  return true;
}

export const phase7Commands = {
  async openAiRoundtrip(_dataset = {}) {
    if (!_checkPermission('openAiRoundtrip')) return { success: false, cancelled: true };
    if (!_ensurePhase7Enabled()) return { success: false };

    const engine = _engine();
    return await _wrap('openAiRoundtrip', async () => {
      ui.notifications?.info?.('AI Roundtrip ist deprecated → öffne KI Roundtrip.');
      await engine?.ui?.open?.('kiRoundtrip');
      return true;
    });
  },

  async openKiRoundtrip(_dataset = {}) {
    if (!_checkPermission('openKiRoundtrip')) return { success: false, cancelled: true };
    if (!_ensurePhase7Enabled()) return { success: false };

    const engine = _engine();
    return await _wrap('openKiRoundtrip', async () => {
      await engine?.ui?.open?.('kiRoundtrip');
      return true;
    });
  }
};

export default phase7Commands;
