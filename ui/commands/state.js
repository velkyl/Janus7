/**
 * @file ui/commands/state.js
 * @module janus7/ui/commands
 * @phase 6
 */

import { _checkPermission, _engine, _log, _toInt, _wrap } from './_shared.js';
import { JanusUI } from '../helpers.js';

export const stateCommands = {
  /** Persist current state */
  async saveState() {
    return _wrap('state.saveState', async () => {
      if (!_checkPermission('state.save')) return { success: false, cancelled: true };
      const engine = _engine();
      const director = engine?.core?.director;
      if (!director?.saveState) throw new Error('Director.saveState nicht verfügbar');
      await director.saveState({ force: true });
      return { ok: true, saved: true };
    });
  },

  /** Export current state as JSON string */
  async exportState({ pretty = 1 } = {}) {
    return _wrap('state.exportState', async () => {
      if (!_checkPermission('state.export')) return { success: false, cancelled: true };
      const engine = _engine();
      const director = engine?.core?.director;
      if (!director?.exportState) throw new Error('Director.exportState nicht verfügbar');

      const snapshot = director.exportState();
      const indent = _toInt(pretty, 1, 0, 4);
      const json = JSON.stringify(snapshot, null, indent ? indent : 0);

      // Clipboard helper: keep in UI space, but data is created via director.
      let clipboardSuccess = false;
      if (game?.clipboard?.copyPlainText) {
        await game.clipboard.copyPlainText(json);
        clipboardSuccess = true;
      }
      
      // User notification
      const sizeKB = (json.length / 1024).toFixed(1);
      if (clipboardSuccess) {
        ui?.notifications?.info?.(`State exported (${sizeKB} KB) to clipboard`);
      } else {
        ui?.notifications?.warn?.(`State exported (${sizeKB} KB) but clipboard copy failed`);
      }

      return { ok: true, bytes: json.length, copiedToClipboard: clipboardSuccess };
    });
  },

  /** Import state from a JSON string */
  async importState({ json = '', validate = true } = {}) {
    return _wrap('state.importState', async () => {
      if (!_checkPermission('state.import')) return { success: false, cancelled: true };
      const engine = _engine();
      const director = engine?.core?.director;
      if (!director?.importState) throw new Error('Director.importState nicht verfügbar');

      let source = String(json ?? '').trim();
      if (!source) {
        source = await JanusUI.promptTextarea({
          title: 'JANUS7 – State importieren',
          label: 'State-JSON',
          placeholder: '{"meta":{"version":"0.9.0",...}}',
          okLabel: 'Importieren',
          cancelLabel: 'Abbrechen',
          rows: 18
        }) ?? '';
      }

      const trimmed = String(source ?? '').trim();
      if (!trimmed) return { ok: false, cancelled: true };

      let data;
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        throw new Error(`Ungültiges JSON: ${e?.message ?? e}`);
      }

      const res = await director.importState(data, { validate: !!validate, force: true });
      return { ok: true, imported: true, validation: res?.validation ?? null };
    });
  },

  /** Validate current state */
  async validateState() {
    return _wrap('state.validateState', async () => {
      if (!_checkPermission('state.validate')) return { success: false, cancelled: true };
      const engine = _engine();
      const director = engine?.core?.director;
      if (!director?.validateState) throw new Error('Director.validateState nicht verfügbar');

      const snapshot = director.exportState();
      const result = director.validateState(snapshot);
      return { ok: true, result };
    });
  },
  /**
   * Export academy static data (lesson catalog, NPCs, locations, etc.)
   */
  async exportAcademy(dataset = {}) {
    if (!_checkPermission('exportAcademy')) return { success: false, cancelled: true };

    return await _wrap('state.exportAcademy', async () => {
      const engine = game?.janus7;
      const academyData = engine?.academy?.data;
      if (!academyData) throw new Error('Academy data nicht verfügbar');

      const snapshot = {
        exportedAt: new Date().toISOString(),
        moduleVersion: game?.modules?.get?.('janus7')?.version ?? 'unknown',
        lessons: academyData.listLessonIds?.(999)?.map?.((id) => academyData.getLesson?.(id)).filter(Boolean) ?? [],
        npcs:    academyData.listNpcIds?.(999)?.map?.((id) => academyData.getNpc?.(id)).filter(Boolean) ?? [],
        locations: academyData.listLocationIds?.(999)?.map?.((id) => academyData.getLocation?.(id)).filter(Boolean) ?? [],
        curriculum: academyData.getSpellCurriculum?.() ?? null,
        alchemyRecipes: academyData.getAlchemyRecipes?.() ?? null,
      };

      const text = JSON.stringify(snapshot, null, 2);
      const ok = await (globalThis.JanusUI?.copyToClipboard?.(text) ?? navigator.clipboard?.writeText?.(text).then(() => true).catch(() => false));
      if (ok) {
        ui.notifications.info('JANUS7: Academy-Daten in Zwischenablage kopiert.');
      } else {
        await Dialog.prompt({
          title: 'JANUS7 – Academy Export',
          content: `<textarea style="width:100%;height:300px;font-family:monospace;font-size:11px">${text}</textarea>`,
          label: 'Schließen',
        });
      }
      return { success: true, lessonCount: snapshot.lessons.length, npcCount: snapshot.npcs.length };
    });
  },

  /**
   * Validate current IO round-trip (export → parse → validate)
   */
  async validateIO(dataset = {}) {
    if (!_checkPermission('validateIO')) return { success: false, cancelled: true };

    return await _wrap('state.validateIO', async () => {
      const engine = game?.janus7;
      const director = engine?.core?.director ?? engine?.director;
      if (!director) throw new Error('Director nicht verfügbar');

      // 1. Export
      const snapshot = director.exportState();
      if (!snapshot) throw new Error('exportState() lieferte kein Ergebnis');

      // 2. Re-serialize and parse (JSON round-trip)
      let reparsed;
      try {
        reparsed = JSON.parse(JSON.stringify(snapshot));
      } catch (e) {
        throw new Error('JSON Serialisierung fehlgeschlagen: ' + e.message);
      }

      // 3. Validate
      const validator = engine?.core?.validator;
      if (!validator?.validateState) throw new Error('Validator nicht verfügbar');

      const result = validator.validateState(reparsed);
      const valid = result?.valid ?? false;
      const errors = result?.errors ?? [];

      if (valid) {
        ui.notifications.info('JANUS7 IO Validation: OK ✓ (kein Fehler)');
      } else {
        ui.notifications.warn(`JANUS7 IO Validation: ${errors.length} Fehler gefunden`);
        _log().warn?.('[JANUS7] IO Validation Errors:', errors);
      }

      return { valid, errors, snapshotKeys: Object.keys(reparsed) };
    });
  },


};
