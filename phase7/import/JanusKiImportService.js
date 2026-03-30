/**
 * @file phase7/import/JanusKiImportService.js
 * Handles validation, preview and application of KI response patches to
 * the JANUS7 state. A KI response differs from a snapshot bundle in
 * that it contains arrays of domain-specific update objects rather than
 * a complete snapshot. This service validates the response against
 * a JSON schema, summarises the proposed changes for preview, and
 * applies them transactionally to the state. A backup of the current
 * export is written before applying any changes, and operations are
 * gated to Game Master (GM) users when running in Foundry.
 */

import { JanusKiResponseInvalidError, JanusKiDiffConflictError, JanusKiPermissionError } from '../errors.js';
import { JanusKiExportService } from '../export/JanusKiExportService.js';
import { JanusKiDiffService } from '../diff/JanusKiDiffService.js';
import { emitHook, HOOKS } from '../../core/hooks/emitter.js';
import { moduleAssetPath } from '../../core/common.js';

/**
 * Service for importing KI responses (patches) into the JANUS7 state.
 * A KI response follows the JANUS_KI_RESPONSE_V1 format, providing
 * arrays of update objects keyed by domain (calendar, lessons, events,
 * scoring, social, journal). Each update object should be an object
 * describing new values or modifications. The importer validates
 * against the published schema, supports strict/lenient unknown key
 * handling, writes a backup prior to applying, logs history and
 * enforces a GM-only gate when run inside Foundry. See docs/KI_HANDOVER.md
 * for the intended structure and semantics.
 */
export class JanusKiImportService {
  /**
   * @param {Object} deps
   * @param {import('../../core/state.js').JanusStateCore} deps.state
   * @param {import('../../core/validator.js').JanusValidator} [deps.validator]
   * @param {import('../../core/logger.js').JanusLogger} [deps.logger]
   */
  constructor({ state, validator, logger, diffService } = {}) {
    this.state = state;
    this.validator = validator;
    this.logger = logger ?? console;
    this._exportService = new JanusKiExportService({ state, validator, logger });
    this.diffService = diffService ?? new JanusKiDiffService({ logger: this.logger, validator: this.validator });
    /** @type {any|null} */
    this._schema = null;
    /**
     * Internal history of KI import operations. Each entry records the
     * timestamp, an array summarising the number of updates by domain,
     * whether the changes were applied, the backup filename when
     * written, and an optional error message when aborted.
     *
     * @type {Array<{timestamp:string, applied:boolean, summary:any[], backup?:string, error?:string}>}
     */
    this._history = [];
    this._backupRetention = 5;
  }

  /**
   * Semantic validation beyond JSON schema. This is intentionally conservative:
   * - Rejects absolute/unsafe paths (must be relative to the domain prefix)
   * - Enforces allowed ops
   * - Enforces value presence for replace/append
   * - Performs best-effort keyed-id validation for common JANUS registries
   *
   * @param {any} response
   */
  _validateSemantics(response) {
    const changes = response?.changes ?? {};
    const allowedOps = new Set(['replace', 'append', 'delete']);
    const reject = (msg, details) => { throw new JanusKiResponseInvalidError(msg, details ? { details } : undefined); };

    // Optional version drift gate (only when source meta provides a version)
    try {
      const hinted = response?.sourceExportMeta?.moduleVersion ?? response?.sourceExportMeta?.version ?? null;
      if (hinted) {
        const current = (typeof game !== 'undefined' && game?.modules?.get)
          ? (game.modules.get('Janus7')?.version ?? null)
          : null;
        const stateV = this.state?.getPath?.('meta.version') ?? this.state?.getPath?.('meta.moduleVersion') ?? null;
        const effective = current ?? stateV ?? null;
        if (effective && hinted !== effective) {
          reject(`KI response passt nicht zur aktuellen Version (response=${hinted}, current=${effective}). Bitte neu exportieren.`);
        }
      }
    } catch (_) { /* never hard-crash semantic validation due to missing Foundry context */ }

    // Validate patch arrays
    const isUnsafe = (p) => {
      if (!p || typeof p !== 'string') return true;
      const s = p.trim();
      if (!s) return false; // empty path allowed (domain root)
      if (s.startsWith('academy.')) return true;
      if (s.startsWith('campaign_state.') || s.startsWith('meta.')) return true;
      if (s.includes('..')) return true;
      if (s.startsWith('/') || s.startsWith('\\')) return true;
      return false;
    };

    for (const [changeKey, arr] of Object.entries(changes)) {
      if (!Array.isArray(arr)) continue;

      // journal entries: must be non-empty objects (we don't enforce a specific field name)
      if (changeKey === 'journalEntries') {
        for (const entry of arr) {
          if (!entry || typeof entry !== 'object') reject('journalEntries muss Objekte enthalten.');
          if (Object.keys(entry).length === 0) reject('journalEntries Eintrag darf nicht leer sein.');
        }
        continue;
      }

      for (const patch of arr) {
        if (!patch || typeof patch !== 'object') reject(`${changeKey} enthält ungültige Patch-Objekte.`);
        const op = (patch.op ?? 'replace');
        if (!allowedOps.has(op)) reject(`Ungültige op: ${op}`);
        const path = (typeof patch.path === 'string') ? patch.path.trim() : '';
        if (isUnsafe(path)) reject(`Unsicherer/absoluter path: ${path}`);
        if ((op === 'replace' || op === 'append') && !('value' in patch)) {
          reject(`Patch benötigt 'value' für op=${op} (path=${path || '<root>'})`);
        }

        // Best-effort keyed-id validation stays non-fatal. Missing references are
        // surfaced in preview/apply via fuzzy matching instead of hard-rejecting.
      }
    }
  }

  _isBlockedPathSegment(segment) {
    return ['__proto__', 'prototype', 'constructor'].includes(String(segment ?? '').trim());
  }

  _sanitizeRelativePath(path) {
    const source = String(path ?? '').trim();
    if (!source) return '';
    const parts = source.split('.').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length > 50) throw new JanusKiResponseInvalidError(`Pfad zu tief verschachtelt (max. 50 Segmente): ${source}`);
    for (const part of parts) {
      if (part.length > 64) throw new JanusKiResponseInvalidError(`Pfadsegment zu lang (max. 64 Zeichen): ${part}`);
      if (this._isBlockedPathSegment(part)) {
        throw new JanusKiResponseInvalidError(`Blockiertes Pfadsegment: ${part}`);
      }
      if (!/^[A-Za-z0-9_\-]+$/.test(part)) {
        throw new JanusKiResponseInvalidError(`Ungueltiges Pfadsegment: ${part}`);
      }
    }
    return parts.join('.');
  }

  _sanitizeFullPath(path) {
    const source = String(path ?? '').trim();
    if (!source) throw new JanusKiResponseInvalidError('Leerer Full-Path ist ungueltig');
    const parts = source.split('.').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) throw new JanusKiResponseInvalidError('Leerer Full-Path ist ungueltig');
    if (parts.length > 50) throw new JanusKiResponseInvalidError(`Pfad zu tief verschachtelt (max. 50 Segmente): ${source}`);
    for (const part of parts) {
      if (part.length > 64) throw new JanusKiResponseInvalidError(`Pfadsegment zu lang (max. 64 Zeichen): ${part}`);
      if (this._isBlockedPathSegment(part)) {
        throw new JanusKiResponseInvalidError(`Blockiertes Pfadsegment: ${part}`);
      }
    }
    return parts.join('.');
  }

  _looksLikeKeyedId(v) {
    return typeof v === 'string' && /^(NPC|LOC|LES|SCN|JRN)_[A-Z0-9_\-]+$/.test(v);
  }

  _isKnownKeyedId(id) {
    try {
      const buckets = [
        'foundryLinks.npcs',
        'foundryLinks.locations',
        'foundryLinks.scenes',
        'foundryLinks.journals',
        'actors.npcs',
        'actors.locations'
      ];
      for (const b of buckets) {
        const obj = this.state?.getPath?.(b);
        if (obj && typeof obj === 'object' && id in obj) return true;
      }
      // Also check academy snapshots when present (arrays of objects with id)
      const academy = this.state?.getPath?.('academy') ?? null;
      if (academy && typeof academy === 'object') {
        for (const k of ['npcs', 'locations', 'lessons', 'events']) {
          const arr = academy[k];
          if (Array.isArray(arr) && arr.some((x) => x && typeof x === 'object' && x.id === id)) return true;
        }
      }
    } catch (_) { /* ignore */ }
    return false;
  }




  _dayOrder() {
    return game?.janus7?.calendar?.config?.dayOrder
      ?? game?.janus7?.academy?.calendar?.config?.dayOrder
      ?? game?.janus7?.simulation?.calendar?.config?.dayOrder
      ?? ['Praiosstag', 'Rondra', 'Efferdstag', 'Traviatag', 'Boronstag', 'Hesindetag', 'Firunstag'];
  }

  _calendarConfig() {
    const calendar = game?.janus7?.academy?.calendar ?? game?.janus7?.simulation?.calendar ?? game?.janus7?.calendar ?? null;
    return calendar?.config ?? { weeksPerTrimester: 12, trimestersPerYear: 3, dayOrder: this._dayOrder() };
  }

  _resolveCurrentCampaignTime() {
    try {
      if (typeof game !== 'undefined' && game?.settings?.get) {
        const explicit = game.settings.get('janus7', 'campaignTime');
        if (explicit && typeof explicit === 'object') return explicit;
      }
    } catch (_) { /* ignore missing setting */ }
    return this.state?.get?.('time') ?? this.state?.getPath?.('time') ?? null;
  }

  _slotToDayNumber(slotLike) {
    if (!slotLike || typeof slotLike !== 'object') return null;
    const cfg = this._calendarConfig();
    const dayOrder = cfg.dayOrder ?? this._dayOrder();
    const weeksPerTrimester = Number(cfg.weeksPerTrimester ?? 12) || 12;
    const trimestersPerYear = Number(cfg.trimestersPerYear ?? 3) || 3;
    const year = Number(slotLike.year ?? slotLike.time?.year ?? slotLike.meta?.year);
    const trimester = Number(slotLike.trimester ?? slotLike.time?.trimester ?? slotLike.meta?.trimester ?? 1);
    const week = Number(slotLike.week ?? slotLike.time?.week ?? slotLike.meta?.week ?? 1);
    let dayIndex = Number(slotLike.dayIndex ?? slotLike.time?.dayIndex ?? slotLike.meta?.dayIndex);
    if (!Number.isFinite(dayIndex)) {
      const dayName = String(slotLike.day ?? slotLike.dayName ?? slotLike.time?.day ?? slotLike.time?.dayName ?? '').trim();
      const derived = dayOrder.indexOf(dayName);
      dayIndex = derived >= 0 ? derived : 0;
    }
    if (!Number.isFinite(year) || !Number.isFinite(trimester) || !Number.isFinite(week)) return null;
    return (((year * trimestersPerYear) + Math.max(0, trimester - 1)) * weeksPerTrimester + Math.max(0, week - 1)) * dayOrder.length + Math.max(0, dayIndex);
  }

  _findFirstSlotCandidate(value) {
    if (!value) return null;
    if (Array.isArray(value)) {
      for (const entry of value) {
        const hit = this._findFirstSlotCandidate(entry);
        if (hit) return hit;
      }
      return null;
    }
    if (typeof value !== 'object') return null;

    const hasSlotShape = (obj) => {
      if (!obj || typeof obj !== 'object') return false;
      return (obj.year != null && obj.week != null && (obj.dayIndex != null || obj.day != null || obj.dayName != null))
        || (obj.time && typeof obj.time === 'object' && obj.time.year != null && obj.time.week != null && (obj.time.dayIndex != null || obj.time.day != null || obj.time.dayName != null));
    };

    if (hasSlotShape(value)) return value;

    for (const key of ['firstSlot', 'firstSlotRef', 'slot', 'slotRef', 'startSlot', 'start', 'time']) {
      if (value[key]) {
        const hit = this._findFirstSlotCandidate(value[key]);
        if (hit) return hit;
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (['changes', 'sourceExportMeta', 'notes'].includes(key)) continue;
      const hit = this._findFirstSlotCandidate(child);
      if (hit) return hit;
    }
    return null;
  }

  _detectDowntime(response) {
    const currentTime = this._resolveCurrentCampaignTime();
    const firstSlot = this._findFirstSlotCandidate(response?.firstSlot ?? response?.sourceExportMeta ?? response?.changes ?? response);
    const currentDayNumber = this._slotToDayNumber(currentTime);
    const firstDayNumber = this._slotToDayNumber(firstSlot);
    if (!Number.isFinite(currentDayNumber) || !Number.isFinite(firstDayNumber)) {
      return { downtimeDetected: false, skippedDays: 0, currentTime, firstSlot };
    }
    const skippedDays = firstDayNumber - currentDayNumber;
    return {
      downtimeDetected: skippedDays > 1,
      skippedDays: skippedDays > 1 ? skippedDays : 0,
      currentTime,
      firstSlot
    };
  }
  _filterResponseBySelectedIds(response, selectedIds = []) {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return response;
    const keep = new Set(selectedIds.map((x) => String(x)));
    const clone = globalThis.foundry?.utils?.deepClone
      ? globalThis.foundry.utils.deepClone(response)
      : JSON.parse(JSON.stringify(response ?? {}));
    const changes = clone?.changes ?? {};
    for (const [changeKey, arr] of Object.entries(changes)) {
      if (!Array.isArray(arr)) continue;
      changes[changeKey] = arr.filter((entry, idx) => {
        const path = entry?.path ?? '';
        const id = JanusKiDiffService.buildChangeId(changeKey, idx, path);
        return keep.has(id);
      });
      if (changes[changeKey].length === 0) delete changes[changeKey];
    }
    return clone;
  }

  /**
   * Return a shallow copy of the history of KI imports. See the
   * constructor for details on the recorded fields.
   *
   * @returns {Array<{timestamp:string, applied:boolean, summary:any[], backup?:string, error?:string}>}
   */
  getHistory() {
    return this._history.map((entry) => ({ ...entry }));
  }


  _getFilePicker() {
    return foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker ?? null;
  }

  _backupDir() {
    const worldId = globalThis.game?.world?.id ?? globalThis.game?.world?.name ?? null;
    if (!worldId) return null;
    return `worlds/${worldId}/janus7/io/backups`;
  }

  _hasWorldBackupSupport() {
    return Boolean(this._backupDir() && this._getFilePicker() && typeof File !== 'undefined');
  }

  _isMissingDirectoryError(err) {
    const msg = String(err?.message ?? err ?? '').toLowerCase();
    return msg.includes('does not exist') || msg.includes('not accessible') || msg.includes('enoent');
  }

  async _ensureDataDirectory(dir) {
    const FP = this._getFilePicker();
    if (!FP || !dir || typeof FP.createDirectory !== 'function') return false;
    const raw = String(dir).split('/').filter(Boolean);
    if (!raw.length) return false;

    let acc = '';
    for (const part of raw) {
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

  _extractBackupName(fileRef) {
    const ref = String(fileRef ?? '').trim();
    if (!ref) return '';
    const parts = ref.split('/');
    return parts[parts.length - 1] ?? ref;
  }

  _backupTimestamp(fileRef) {
    const name = this._extractBackupName(fileRef);
    const m = name.match(/ki_backup_(\d+)\.json$/);
    if (m) return Number(m[1]);
    return 0;
  }

  async _deleteBackup(fileRef) {
    const FP = this._getFilePicker();
    if (!FP || !fileRef || typeof FP.delete !== 'function') return false;
    try {
      await FP.delete('data', fileRef);
      return true;
    } catch (err) {
      this.logger?.debug?.('[KI Import] Backup delete skipped', err?.message ?? err);
      return false;
    }
  }

  async _rotateBackups(dir) {
    const FP = this._getFilePicker();
    if (!FP || !dir || typeof FP.browse !== 'function') return [];
    try {
      await this._ensureDataDirectory(dir);
      const res = await FP.browse('data', dir, { notify: false });
      const files = Array.isArray(res?.files) ? [...res.files] : [];
      files.sort((a, b) => this._backupTimestamp(b) - this._backupTimestamp(a));
      const keep = files.slice(0, this._backupRetention);
      const drop = files.slice(this._backupRetention);
      for (const fileRef of drop) {
        await this._deleteBackup(fileRef);
      }
      return keep;
    } catch (err) {
      if (!this._isMissingDirectoryError(err)) {
        this.logger?.debug?.('[KI Import] Backup rotation skipped', err?.message ?? err);
      }
      return [];
    }
  }

  async listBackups() {
    const FP = this._getFilePicker();
    const dir = this._backupDir();
    if (!FP || !dir || typeof FP.browse !== 'function') return [];
    try {
      await this._ensureDataDirectory(dir);
      const res = await FP.browse('data', dir, { notify: false });
      const files = Array.isArray(res?.files) ? [...res.files] : [];
      files.sort((a, b) => this._backupTimestamp(b) - this._backupTimestamp(a));
      return files.map((fileRef) => ({
        name: this._extractBackupName(fileRef),
        fileRef,
        timestamp: this._backupTimestamp(fileRef) || null
      }));
    } catch (err) {
      if (!this._isMissingDirectoryError(err)) {
        this.logger?.warn?.('[KI Import] listBackups failed', err);
      }
      return [];
    }
  }

  async _readBackupBundle(fileRef) {
    const ref = String(fileRef ?? '').trim();
    if (!ref) throw new Error('Backup reference missing');
    let raw;
    try {
      const res = await fetch(ref);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.text();
    } catch (err) {
      throw new Error(`Backup konnte nicht gelesen werden: ${err?.message || err}`);
    }

    try {
      return JSON.parse(raw);
    } catch (_) {
      throw new Error('Backup ist kein valides JSON');
    }
  }

  async restoreBackup(fileRef, { validate = false, save = true } = {}) {
    const timestamp = new Date().toISOString();
    const hasFoundryGame = (typeof game !== 'undefined') && game?.user;
    if (hasFoundryGame && !game.user?.isGM) {
      const error = new JanusKiPermissionError('Only GMs may restore KI backups', { userId: game.user?.id });
      this._history.push({ timestamp, applied: false, diffs: [], backup: this._extractBackupName(fileRef), backupPath: String(fileRef ?? ''), error: error.message, operation: 'restore' });
      throw error;
    }

    const bundle = await this._readBackupBundle(fileRef);
    const snapshot = bundle?.campaign_state ?? bundle?.snapshot ?? null;
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Backup enthält keinen campaign_state Snapshot');
    }

    if (validate && this.validator?.validateState) {
      const res = this.validator.validateState(snapshot);
      if (!res?.valid) {
        throw new JanusKiResponseInvalidError('Backup-Validierung fehlgeschlagen', { errors: Array.isArray(res?.errors) ? res.errors : [] });
      }
    }

    await this.state.transaction(async (s) => {
      s.replace(snapshot);
    });
    if (save) await this.state.save({ force: true });

    const backupName = this._extractBackupName(fileRef);
    this._history.push({ timestamp, applied: true, diffs: [], backup: backupName, backupPath: String(fileRef ?? ''), operation: 'restore' });
    return { restored: true, backup: backupName, backupPath: String(fileRef ?? '') };
  }

  /**
   * Attempt to write a backup of the current state to the world's backup directory.
   * Returns the written filename or null when the environment does not support world backups.
   * Rotation keeps only the newest five backup files.
   *
   * @param {any} bundle The export bundle to serialise
   * @returns {Promise<string|null>}
   */
  async _writeBackup(bundle) {
    try {
      const json = JSON.stringify(bundle, null, 2);
      const filename = `ki_backup_${Date.now()}.json`;
      const FP = this._getFilePicker();
      const dir = this._backupDir();
      const hasFoundry = Boolean(dir && FP && typeof File !== 'undefined');
      if (!hasFoundry) {
        this.logger?.debug?.('[KI Import] Backup skipped: FilePicker/File unavailable');
        return null;
      }

      try {
        await this._ensureDataDirectory(dir);
      } catch (_) {
        // upload will decide whether this is fatal
      }

      try {
        const file = new File([json], filename, { type: 'application/json' });
        await FP.upload('data', dir, file, { notify: false });
        await this._rotateBackups(dir);
        return filename;
      } catch (uploadErr) {
        this.logger?.warn?.('[KI Import] Backup upload failed', uploadErr);
        return null;
      }
    } catch (err) {
      this.logger?.warn?.('[KI Import] Failed to write backup', err);
      return null;
    }
  }

  /**
   * Load and cache the KI response schema. Uses fetch to retrieve the
   * schema file from the module directory. Returns null if fetching
   * fails. The schema is only loaded once per instance.
   *
   * @returns {Promise<any|null>}
   */

  /**
   * Validates a KI response without mutating state.
   * Returns a stable report object for tests/UI instead of throwing.
   * @param {any} response
   * @param {{mode?: 'strict'|'lenient'}} [opts]
   * @returns {Promise<{ok:boolean, errors:string[], summary:any[]}>}
   */
  async preflightImport(response, { mode = 'strict' } = {}) {
    try {
      const summary = await this.previewImport(response, { mode });
      return {
        ok: true,
        errors: [],
        summary: Array.isArray(summary) ? summary : []
      };
    } catch (err) {
      const errors = [];
      const detailedErrors = Array.isArray(err?.errors) && err.errors.length
        ? err.errors
        : (Array.isArray(err?.details?.errors) && err.details.errors.length ? err.details.errors : []);
      if (detailedErrors.length) {
        for (const entry of detailedErrors) {
          if (!entry) continue;
          if (typeof entry === 'string') errors.push(entry);
          else errors.push(entry.message ?? entry.instancePath ?? JSON.stringify(entry));
        }
      }
      if (!errors.length) errors.push(err?.message ?? String(err));
      return {
        ok: false,
        errors: this._normalizePreflightErrors(errors),
        summary: []
      };
    }
  }

  async _loadSchema() {

    if (this._schema) return this._schema;
    try {
      const url = moduleAssetPath('phase7/contract/JanusKiResponse.schema.json');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._schema = await res.json();
    } catch (err) {
      this.logger?.warn?.('[KI Import] Could not load KI response schema', err);
      this._schema = null;
    }
    return this._schema;
  }

  /**
   * Validate and summarise an incoming KI response without mutating state.
   * Returns an array of summary objects keyed by the update category and
   * containing the number of proposed updates. Throws
   * JanusKiResponseInvalidError when the response fails validation.
   *
   * @param {any} response The KI response to validate
   * @param {Object} [opts]
   * @param {('strict'|'lenient')} [opts.mode='strict'] Unknown-key handling (unused for now)
   * @returns {Promise<Array<{type:string,count:number}>>}
   */
  async previewImport(response, { mode = 'strict' } = {}) {
    // Basic shape and version check
    if (!response || typeof response !== 'object') {
      throw new JanusKiResponseInvalidError('Response must be an object');
    }
    if (response.version !== 'JANUS_KI_RESPONSE_V1') {
      // UX hardening: users often paste a JANUS export/backup into the roundtrip preview.
      // Do not hard-crash the preview in that case; return a small, explicit summary instead.
      const looksLikeStateEnvelope = !!(response?.campaign_state || response?.snapshot || response?.state || response?.meta?.schemaVersion);
      if (response.version === 'JANUS_EXPORT_V2' || looksLikeStateEnvelope) {
        return [{
          type: 'state-export',
          changeKey: 'stateEnvelope',
          idx: 0,
          id: 'state-export-preview',
          op: 'inspect',
          path: 'campaign_state',
          before: null,
          after: null,
          value: {
            note: 'Dies ist ein JANUS Export/Backup, keine KI-Antwort. Nutze Import/Restore statt Preview.',
            version: response.version ?? null
          },
          selected: false
        }];
      }
      throw new JanusKiResponseInvalidError(`Unsupported KI response version: ${response.version}`);
    }
    // Validate against the published schema when available
    const schema = await this._loadSchema();
    if (schema && this.validator?.validateSchema) {
      const res = this.validator.validateSchema(response, schema, 'KI response');
      if (!res?.valid) {
        const errs = Array.isArray(res?.errors) ? res.errors : [];
        throw new JanusKiResponseInvalidError('KI response validation failed', { errors: errs });
      }
    }
    // Semantic validation (beyond JSON schema)
    this._validateSemantics(response);

    const normalised = this.diffService.normalizeResponseReferences(response, { state: this.state, schema });
    const annotations = normalised?.annotations ?? {};
    response = normalised?.response ?? response;
    const downtimeMeta = this._detectDowntime(response);
    this._lastPreviewMeta = downtimeMeta;

    // Build a detailed summary of proposed patch operations. Each entry in
    // changes arrays may specify a path, op and value. The summary
    // includes the domain (type), the operation, the full path in the
    // state tree, and the before/after values. Unknown change keys are
    // ignored in lenient mode; in strict mode unknown keys are rejected
    // by the JSON schema.
    const changes = response.changes ?? {};
    const summary = [];
    // Mapping of change keys to base path prefixes and human-readable types
    const domainMap = {
      calendarUpdates: { prefix: 'academy.calendar', type: 'calendar' },
      lessonUpdates: { prefix: 'academy.lessons', type: 'lessons' },
      eventUpdates: { prefix: 'academy.events', type: 'events' },
      scoringAdjustments: { prefix: 'academy.scoring', type: 'scoring' },
      socialAdjustments: { prefix: 'academy.social', type: 'social' },
      journalEntries: { prefix: 'academy.journalEntries', type: 'journal' }
    };
    for (const [changeKey, arr] of Object.entries(changes)) {
      const mapping = domainMap[changeKey];
      if (!mapping || !Array.isArray(arr)) continue;
      const { prefix, type } = mapping;
      // For journal entries we don't have path/op; treat each entry as an append
      if (changeKey === 'journalEntries') {
        const before = this.state.getPath(prefix);
        const after = (Array.isArray(before) ? before : []).concat(arr);
        for (let idx = 0; idx < arr.length; idx++) {
          const id = JanusKiDiffService.buildChangeId(changeKey, idx, '');
          summary.push({ type, changeKey, idx, id, op: 'append', path: prefix, before, after, value: arr[idx], ...(annotations[id] ?? {}) });
        }
        continue;
      }
      // Process patch objects
      for (let idx = 0; idx < arr.length; idx++) {
        const patch = arr[idx];
        if (!patch || typeof patch !== 'object') continue;
        const path = typeof patch.path === 'string' ? patch.path.trim() : '';
        const op = patch.op ?? 'replace';
        const value = patch.value;
        const fullPath = path ? `${prefix}.${path}` : prefix;
        let before;
        try {
          before = this.state.getPath(fullPath);
        } catch (_) {
          before = undefined;
        }
        let after;
        switch (op) {
          case 'replace':
          case 'update':
            after = value;
            break;
          case 'append': {
            const current = before;
            if (Array.isArray(current)) {
              after = current.concat([value]);
            } else if (current === undefined || current === null) {
              after = [value];
            } else {
              after = [current, value];
            }
            break;
          }
          case 'delete':
            after = undefined;
            break;
          default:
            after = value;
        }
        const id = JanusKiDiffService.buildChangeId(changeKey, idx, path);
        summary.push({ type, changeKey, idx, id, op, path: fullPath, before, after, value, ...(annotations[id] ?? {}) });
      }
    }
    summary.downtimeDetected = Boolean(downtimeMeta?.downtimeDetected);
    summary.skippedDays = Number(downtimeMeta?.skippedDays ?? 0);
    summary.firstSlot = downtimeMeta?.firstSlot ?? null;
    summary.currentTime = downtimeMeta?.currentTime ?? null;
    return summary;
  }


  _escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('\"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  _normaliseWhisperRecipients(recipients = []) {
    return recipients.map((entry) => entry?.id ?? entry).filter(Boolean);
  }

  _collectTrackingEntry(target, kind, patch, fullPath, before, after) {
    const rawPath = String(patch?.path ?? '').trim();
    const lowerPath = rawPath.toLowerCase();
    const lowerFull = String(fullPath ?? '').toLowerCase();
    const value = patch?.value;

    if (kind === 'house') {
      if (lowerPath.includes('house_points_delta') && value && typeof value === 'object') {
        for (const [house, delta] of Object.entries(value)) {
          target.push({ house, delta, path: rawPath || fullPath, before: undefined, after: undefined });
        }
        return;
      }
      if (lowerFull.includes('academy.scoring.circles.')) {
        const house = (fullPath.split('.').pop() ?? rawPath) || 'unbekannt';
        const numericBefore = Number.isFinite(Number(before)) ? Number(before) : null;
        const numericAfter = Number.isFinite(Number(after)) ? Number(after) : null;
        const delta = (numericBefore !== null && numericAfter !== null) ? numericAfter - numericBefore : value;
        target.push({ house, delta, path: rawPath || fullPath, before, after });
        return;
      }
      if (lowerPath.includes('house_points') || lowerPath.includes('circles')) {
        target.push({ house: rawPath || fullPath, delta: value, path: rawPath || fullPath, before, after });
      }
      return;
    }

    if (kind === 'relation') {
      if (lowerPath.includes('relation_updates') && value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) target.push(item);
        } else {
          for (const [relationKey, relationValue] of Object.entries(value)) {
            target.push({ key: relationKey, value: relationValue, path: rawPath || fullPath });
          }
        }
        return;
      }
      target.push({ path: rawPath || fullPath, before, after, value });
    }
  }

  _normalizePreflightErrors(errors = []) {
    const normalized = [];
    for (const rawEntry of errors) {
      const message = String(rawEntry ?? '').trim();
      if (!message) continue;

      if (/root\.changes\.journalEntries\[\d+\].*(darf nicht null sein|muss ein Objekt sein)/i.test(message)) {
        normalized.push('journalEntries muss Objekte enthalten.');
        continue;
      }
      if (/root\.changes\.calendarUpdates\[\d+\].*(darf nicht null sein|muss ein Objekt sein)/i.test(message)) {
        normalized.push('calendarUpdates enthält ungültige Patch-Objekte.');
        continue;
      }

      normalized.push(message);
    }

    return [...new Set(normalized)];
  }

  async _renderImportSummaryChat({ housePointChanges = [], relationChanges = [] } = {}) {
    try {
      if (typeof ChatMessage === 'undefined' || typeof game === 'undefined' || !game?.user?.isGM) return;
      const whisper = this._normaliseWhisperRecipients(ChatMessage.getWhisperRecipients('GM') ?? []);
      const houseItems = housePointChanges.length
        ? housePointChanges.map((entry) => {
            const label = this._escapeHtml(entry.house ?? entry.path ?? 'Haus');
            const delta = entry.delta;
            const deltaText = Number.isFinite(Number(delta)) ? `${Number(delta) >= 0 ? '+' : ''}${Number(delta)}` : this._escapeHtml(JSON.stringify(delta ?? entry.after ?? '')); 
            return `<li><strong>${label}</strong>: ${deltaText}</li>`;
          }).join('')
        : '<li>Keine Hauspunkte geändert.</li>';
      const relationItems = relationChanges.length
        ? relationChanges.map((entry) => {
            const label = this._escapeHtml(entry.key ?? entry.path ?? 'Beziehung');
            const value = entry.after ?? entry.value ?? entry.delta ?? '';
            const valueText = typeof value === 'object' ? this._escapeHtml(JSON.stringify(value)) : this._escapeHtml(String(value));
            return `<li><strong>${label}</strong>: ${valueText}</li>`;
          }).join('')
        : '<li>Keine Beziehungen geändert.</li>';
      const content = `
        <section class="janus-import-summary">
          <h3>JANUS Import abgeschlossen</h3>
          <div><strong>Hauspunkte</strong><ul>${houseItems}</ul></div>
          <div><strong>Beziehungen</strong><ul>${relationItems}</ul></div>
        </section>`;
      await ChatMessage.create({
        content,
        whisper
      });
    } catch (err) {
      this.logger?.warn?.('[KI Import] GM summary chat failed', err);
    }
  }

  /**
   * Apply a KI response patch to the state. This method validates the
   * response, writes a backup of the current export, and then applies
   * each update object within a transaction. Unknown keys in update
   * objects are applied verbatim by setting nested state paths. On
   * success the method returns the summary array produced by
   * previewImport. On failure a JanusKiDiffConflictError is thrown
   * after the state is rolled back. Only GM users may perform the
   * import when running inside Foundry.
   *
   * @param {any} response The KI response to apply
   * @param {Object} [opts]
   * @param {('strict'|'lenient')} [opts.mode='strict'] Unknown-key handling (unused)
   * @returns {Promise<Array<{type:string,count:number}>>}
   */
  async applyImport(response, { mode = 'strict', selectedIds = null, simulateDowntime = false } = {}) {
    const timestamp = new Date().toISOString();
    let summary;
    let workingResponse = response;
    try {
      summary = await this.previewImport(response, { mode });
      workingResponse = Array.isArray(selectedIds) && selectedIds.length > 0
        ? this._filterResponseBySelectedIds(response, selectedIds)
        : response;
      if (Array.isArray(selectedIds) && selectedIds.length > 0) {
        const keep = new Set(selectedIds.map((x) => String(x)));
        summary = summary.filter((item) => keep.has(String(item.id)));
      }
      const downtimeMeta = this._detectDowntime(workingResponse);
      this._lastPreviewMeta = downtimeMeta;
      summary.downtimeDetected = Boolean(downtimeMeta?.downtimeDetected);
      summary.skippedDays = Number(downtimeMeta?.skippedDays ?? 0);
    } catch (err) {
      // Record aborted import in history
      this._history.push({ timestamp, applied: false, diffs: [], error: err?.message || String(err), operation: 'preview' });
      throw err;
    }
    // Check GM permission when running in Foundry (enforced server-side, not UI-only)
    const hasFoundryGame = (typeof game !== 'undefined') && game?.user;
    if (hasFoundryGame && !game.user?.isGM) {
      const error = new JanusKiPermissionError('Only GMs may import KI responses', { userId: game.user?.id });
      this._history.push({ timestamp, applied: false, diffs: summary, error: error.message, operation: 'apply' });
      throw error;
    }

    // Build backup of current state using Ki exporter
    let backupFile = null;
    let backupPath = null;
    try {
      const bundle = this._exportService.exportBundle({ mode: 'lite' });
      backupFile = await this._writeBackup(bundle);
      if (backupFile) backupPath = `${this._backupDir()}/${backupFile}`;
      if (this._hasWorldBackupSupport() && !backupFile) {
        throw new Error('KI backup could not be created; import aborted.');
      }
    } catch (err) {
      this.logger?.warn?.('[KI Import] Failed to create backup', err);
      this._history.push({ timestamp, applied: false, diffs: summary, backup: backupFile, backupPath, error: err?.message || String(err), operation: 'backup' });
      throw err;
    }
    const housePointChanges = [];
    const relationChanges = [];
    const downtimeMeta = this._lastPreviewMeta ?? this._detectDowntime(workingResponse);

    // Apply updates inside a transaction
    try {
      if (simulateDowntime && downtimeMeta?.downtimeDetected) {
        const calendarEngine = game?.janus7?.academy?.calendar ?? game?.janus7?.simulation?.calendar ?? game?.janus7?.calendar ?? null;
        if (typeof calendarEngine?.simulateDowntime === 'function') {
          const downtimeResult = await calendarEngine.simulateDowntime(downtimeMeta.skippedDays);
          for (const entry of downtimeResult?.circleDeltas ?? []) {
            housePointChanges.push({
              house: entry.house,
              delta: entry.delta,
              path: 'downtime.simulateDowntime',
              before: undefined,
              after: undefined
            });
          }
        }
      }
      await this.state.transaction(() => {
        const changes = workingResponse.changes ?? {};
        // Domain mapping to prefixes
        const domainMap = {
          calendarUpdates: 'academy.calendar',
          lessonUpdates: 'academy.lessons',
          eventUpdates: 'academy.events',
          scoringAdjustments: 'academy.scoring',
          socialAdjustments: 'academy.social'
        };
        for (const [changeKey, arr] of Object.entries(changes)) {
          if (!Array.isArray(arr)) continue;
          // Journal entries are appended wholesale
          if (changeKey === 'journalEntries') {
            const existing = Array.isArray(this.state.getPath('academy.journalEntries'))
              ? this.state.getPath('academy.journalEntries')
              : [];
            const newEntries = existing.concat(arr);
            this.state.set('academy.journalEntries', newEntries);
            continue;
          }
          const prefix = domainMap[changeKey];
          if (!prefix) continue;
          for (const patch of arr) {
            if (!patch || typeof patch !== 'object') continue;
            const p = this._sanitizeRelativePath(typeof patch.path === 'string' ? patch.path.trim() : '');
            const op = patch.op ?? 'replace';

            // v0.9.12.28: Normalize scoring values — LLMs sometimes write {score:N} objects
            // instead of the canonical numeric value that scoring.js expects.
            let val = patch.value;
            if (changeKey === 'scoringAdjustments' && val && typeof val === 'object' && !Array.isArray(val)) {
              const numeric = Number(val.score ?? val.value ?? val.points ?? NaN);
              if (Number.isFinite(numeric)) {
                val = numeric;
                this.logger?.debug?.('[JANUS7][KI Import] scoringAdjustments: Objekt-Wert normalisiert zu Zahl', { path: p, original: patch.value, normalized: val });
              }
            }

            const fullPath = this._sanitizeFullPath(p ? `${prefix}.${p}` : prefix);
            let beforeValue;
            try { beforeValue = this.state.getPath(fullPath); } catch (_) { beforeValue = undefined; }
            let afterValue = val;
            switch (op) {
              case 'replace':
                this.state.set(fullPath, val);
                afterValue = val;
                break;
              case 'append': {
                const current = this.state.getPath(fullPath);
                let newArr;
                if (Array.isArray(current)) {
                  newArr = current.concat([val]);
                } else if (current === undefined || current === null) {
                  newArr = [val];
                } else {
                  newArr = [current, val];
                }
                this.state.set(fullPath, newArr);
                afterValue = newArr;
                break;
              }
              case 'delete': {
                afterValue = undefined;
                this.state.unset?.(fullPath);
                break;
              }
              default:
                // Unsupported op; treat as replace
                this.state.set(fullPath, val);
                afterValue = val;
            }

            if (changeKey === 'scoringAdjustments') {
              this._collectTrackingEntry(housePointChanges, 'house', patch, fullPath, beforeValue, afterValue);
            }
            if (changeKey === 'socialAdjustments') {
              this._collectTrackingEntry(relationChanges, 'relation', patch, fullPath, beforeValue, afterValue);
            }
          }
        }
      }, { expectedErrors: ['TEST_IMPORT_ROLLBACK'] });
      await this.state.save({ force: true });
      await this._renderImportSummaryChat({ housePointChanges, relationChanges });
      // Record success in history. Use 'diffs' property for symmetry with AI importer.
      this._history.push({ timestamp, applied: true, diffs: summary, backup: backupFile, backupPath, operation: 'apply' });
      emitHook(HOOKS.KI_IMPORT_APPLIED, { timestamp, summary, backupFile, backupPath });
      return summary;
    } catch (err) {
      // On any error, record failure and propagate a conflict error
      this._history.push({ timestamp, applied: false, diffs: summary, backup: backupFile, backupPath, error: err?.message || String(err), operation: 'apply' });
      throw new JanusKiDiffConflictError('KI import failed during apply', { conflicts: [] });
    }
  }
}
