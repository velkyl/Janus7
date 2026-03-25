/**
 * @file ui/commands/ki.js
 * @module janus7/ui/commands
 * @phase 7
 *
 * Phase-7-KI-Commands für die Chat-CLI.
 * Alle Aufrufe gehen über `engine.capabilities.ki.*` (stabiler Vertragspunkt).
 * GM-only für Mutations (Export/Import). Lesezugriff für alle.
 *
 * Chat-CLI Beispiele:
 *   /janus ki.export
 *   /janus ki.exportOutbox
 *   /janus ki.history
 */

import { _checkPermission, _engine, _wrap } from './_shared.js';

function _caps() {
  const caps = _engine()?.capabilities;
  if (!caps?.ki) throw new Error('capabilities.ki nicht verfügbar (Phase 7 geladen?)');
  return caps.ki;
}

export const kiCommands = {
  /**
   * Exportiert ein KI-Bundle und zeigt Summary in der Konsole.
   * dataset.mode: 'full' | 'delta' | 'social'  (default: 'full')
   */
  'ki.export': (dataset = {}) => _wrap('ki.export', async () => {
    if (!_checkPermission('ki.export')) return { success: false, cancelled: true };
    const mode = String(dataset.mode ?? 'full');
    const bundle = await _caps().exportBundle({ mode });
    if (!bundle) throw new Error('Export fehlgeschlagen (kein Bundle zurückgegeben).');
    (_engine()?.core?.logger ?? console).info?.('[JANUS7][ki.export]', {
      version: bundle.version ?? bundle.exportVersion ?? '?',
      mode,
      keys: Object.keys(bundle),
    });
    ui.notifications?.info?.(`JANUS7 KI-Export abgeschlossen (mode=${mode}). Details in Konsole.`);
    return { success: true, mode, bundleKeys: Object.keys(bundle) };
  }),

  /**
   * Exportiert und schreibt in die Outbox-Datei.
   */
  'ki.exportOutbox': (dataset = {}) => _wrap('ki.exportOutbox', async () => {
    if (!_checkPermission('ki.exportOutbox')) return { success: false, cancelled: true };
    const result = await _caps().exportToOutbox({ mode: dataset.mode ?? 'full' });
    const filename = result?.filename ?? result?.file ?? '(unknown)';
    ui.notifications?.info?.(`JANUS7 KI-Export → Outbox: ${filename}`);
    return { success: true, filename };
  }),

  /**
   * Zeigt Import-Historie.
   */
  'ki.history': (_dataset = {}) => _wrap('ki.history', () => {
    const history = _caps().getImportHistory();
    if (!history.length) {
      ui.notifications?.info?.('JANUS7: Keine KI-Import-Historie vorhanden.');
      return Promise.resolve({ count: 0, history: [] });
    }
    const lines = history.slice(-10).map((h, i) =>
      `#${i + 1} ${h.timestamp ? new Date(h.timestamp).toLocaleString('de-DE') : '?'} — ${h.summary ?? h.mode ?? '?'}`
    ).join('\n');
    (_engine()?.core?.logger ?? console).info?.(`[JANUS7][ki.history]\n${lines}`);
    ui.notifications?.info?.(`JANUS7: ${history.length} Import(s). Details in Konsole.`);
    return Promise.resolve({ count: history.length, history });
  }),
};

export default kiCommands;
