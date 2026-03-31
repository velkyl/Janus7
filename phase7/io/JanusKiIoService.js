/**
 * @file phase7/io/JanusKiIoService.js
 * Provides convenience methods for reading and writing KI response and
 * export bundles to files. This mirrors the AI IO service but uses
 * the KI exporter and importer. When Node's fs API is available the
 * service writes JSON files into the module's outbox directory; in
 * browser contexts it returns the JSON string instead. Importing
 * reads from the outbox and applies via the import service. Use this
 * service to implement file-based roundtrips for KI patches.
 */

import { JanusKiExportService } from '../export/JanusKiExportService.js';
import { JanusKiImportService } from '../import/JanusKiImportService.js';

export class JanusKiIoService {
  /**
   * @param {Object} deps
   * @param {import('../../core/state.js').JanusStateCore} deps.state
   * @param {import('../../core/validator.js').JanusValidator} [deps.validator]
   * @param {import('../../core/logger.js').JanusLogger} [deps.logger]
   */
  constructor({ state, validator, logger, academyData, engine } = {}) {
    this.state = state;
    this.validator = validator;
    this.logger = logger ?? console;
    this.exporter = new JanusKiExportService({ state, validator, logger, academyData, engine });
    this.importer = new JanusKiImportService({ state, validator, logger });
  }

  _worldIoDir(kind = 'outbox') {
    const worldId = globalThis.game?.world?.id ?? globalThis.game?.world?.name ?? null;
    if (!worldId) return null;
    return `worlds/${worldId}/janus7/io/${kind}`;
  }

  async _ensureDataDirectory(dir) {
    const FP = foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    if (!FP || !dir || typeof FP.createDirectory !== 'function') return false;
    const parts = String(dir).split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      try {
        await FP.createDirectory('data', acc, { notify: false });
      } catch (err) {
        const msg = String(err?.message ?? err ?? '').toLowerCase();
        if (msg.includes('already exists')) continue;
      }
    }
    return true;
  }

  _saveDataToFile(data, mime, filename) {
    const injected = globalThis.__JANUS_SAVE_DATA_TO_FILE__;
    const saveFn = (typeof injected === 'function') ? injected : foundry?.utils?.saveDataToFile;
    if (typeof saveFn !== 'function') throw new Error('saveDataToFile unavailable');
    saveFn(data, mime, filename);
    return filename;
  }

  async _uploadJsonToWorld(dir, filename, json) {
    // Foundry v13+: FilePicker namespaced. Global removed in v15.
    const FP = foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    if (!FP || typeof File === 'undefined') return null;
    // Ensure target directory exists.
    try { await this._ensureDataDirectory(dir); } catch (err) {
      /* best effort */
      this.logger?.debug?.('[KiIoService] _ensureDataDirectory nicht verfügbar (non-fatal)', { err: err?.message });
    }
    const file = new File([json], filename, { type: 'application/json' });
    await FP.upload('data', dir, file, { notify: false });
    return filename;
  }

  async listInboxFiles() {
    const FP = foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    const dir = this._worldIoDir('inbox');
    if (!dir || !FP) return [];
    try {
      const res = await FP.browse('data', dir);
      return Array.isArray(res?.files) ? res.files : [];
    } catch (_) { return []; }
  }

  async listOutboxFiles() {
    const FP = foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    const dir = this._worldIoDir('outbox');
    if (!dir || !FP) return [];
    try {
      const res = await FP.browse('data', dir);
      return Array.isArray(res?.files) ? res.files : [];
    } catch (_) { return []; }
  }


  /**
   * Export a KI bundle and write it to the module's outbox as JSON.
   * The optional mode selects how much of the academy state is
   * included. When fs is unavailable the filename will be null and the
   * JSON string is returned instead.
   *
   * @param {Object} [opts]
   * @param {string} [opts.mode='lite'] Export mode controlling depth
   * @returns {Promise<{bundle:any, filename:string|null, json:string}>}
   */
  async exportToOutbox({ mode = 'lite', storage = 'download' } = {}) {
    const bundle = this.exporter.exportBundle({ mode });
    const json = JSON.stringify(bundle, null, 2);
    const filename = `ki_export_${Date.now()}.json`;

    // Default: Foundry-safe download (browser context).
    try {
      if (storage !== 'world' && typeof foundry?.utils?.saveDataToFile === 'function') {
        this._saveDataToFile(json, 'application/json', filename);
        return { bundle, filename, json };
      }
    } catch (err) {
      this.logger?.warn?.('[KI IO] saveDataToFile failed', err);
    }

    // Optional: world storage via FilePicker (feature-gated).
    try {
      const dir = this._worldIoDir('outbox');
      if (storage === 'world' && dir) {
        const written = await this._uploadJsonToWorld(dir, filename, json);
        return { bundle, filename: written, json };
      }
    } catch (err) {
      this.logger?.warn?.('[KI IO] exportToOutbox world upload failed', err);
    }

    return { bundle, filename: null, json };
  }
  /**
   * Import a KI response from a JSON file in the module's outbox. Reads
   * the file, parses the JSON and applies it via the import service.
   * When fs is unavailable an error is thrown.
   *
   * @param {string} filename The filename relative to the outbox directory
   * @param {Object} [opts]
   * @param {('strict'|'lenient')} [opts.mode='strict'] Unknown-key handling
   * @returns {Promise<any[]>}
   */
  async importFromInbox(fileRef, { mode = 'strict', storage = 'world' } = {}) {
    const dir = this._worldIoDir('inbox');
    if (storage !== 'world') {
      throw new Error('Import storage not supported');
    }
    if (!dir) throw new Error('World context unavailable for import');

    const ref = (typeof fileRef === 'string' ? fileRef.trim() : '');
    if (!ref) throw new Error('File reference missing');

    // Security: sanitize filename against path traversal/injection
    const basename = ref.split(/[\/\\]/).pop();
    if (!basename || !/^[A-Za-z0-9_\-\.]+$/.test(basename) || basename.includes('..')) {
      throw new Error(`Ungueltiger Dateiname: ${ref}`);
    }

    const url = (ref.startsWith('http') || ref.startsWith('data:'))
      ? ref
      : `${dir}/${basename}`;

    // Pre-check: verify file exists in inbox before fetch (avoids misleading 404)
    if (!ref.startsWith('http') && !ref.startsWith('data:')) {
      try {
        const files = await this.listInboxFiles();
        const basename = ref.split('/').pop();
        const exists = files.some(f => f === url || f.endsWith('/' + basename) || f === ref);
        if (!exists && files.length > 0) {
          throw new Error(`File not found in inbox: ${basename}. Available: ${files.map(f => f.split('/').pop()).join(', ')}`);
        }
      } catch (err) {
        if (err.message?.includes('File not found')) throw err;
        // browse failed (dir empty or not accessible) — proceed to fetch
      }
    }

    let raw;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.text();
    } catch (err) {
      throw new Error(`Failed to read KI file: ${err?.message || err}`);
    }

    let response;
    try {
      response = JSON.parse(raw);
    } catch (_) {
      throw new Error('Invalid JSON in KI file');
    }
    return await this.importer.applyImport(response, { mode });
  }

}
