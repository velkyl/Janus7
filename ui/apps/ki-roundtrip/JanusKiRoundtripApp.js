import { moduleTemplatePath } from '../../../core/common.js';
import { ensureDataDirectory, getFilePickerClass } from '../../../core/foundry-compat.js';
/**
 * @file ui/apps/ki-roundtrip/JanusKiRoundtripApp.js
 * @module janus7/ui
 * Provides a UI for exporting and importing KI bundles with patch semantics.
 * Similar to the AI roundtrip app, this interface exposes export/import
 * functionality via the engine.ki API. It renders patch diffs in preview
 * mode and records the import history. Only Game Masters can apply
 * patches; non-GMs may preview and export. See templates/apps/ki-roundtrip.hbs.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../../core/base-app.js';

/**
 * Resolve the JANUS7 engine from either the context (`this`) or the
 * global `game` object. This helper mirrors the behaviour used in
 * other JANUS7 apps so that action handlers work regardless of
 * invocation.
 *
 * @param {any} ctx
 * @returns {any}
 */
function resolveEngine(ctx) {
  if (ctx && typeof ctx._getEngine === 'function') return ctx._getEngine();
  return globalThis.game?.janus7 ?? null;
}

function collectSelectedDiffIds(inst) {
  const root = inst?.element ?? null;
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll('.import-toggle:checked'))
    .map((el) => String(el.dataset.id ?? '').trim())
    .filter(Boolean);
}


function collectSkillFallbacks(inst) {
  const root = inst?.element ?? null;
  if (!root?.querySelectorAll) return {};
  const entries = Array.from(root.querySelectorAll('.skill-fallback-dropdown'))
    .map((el) => [String(el.dataset.id ?? '').trim(), String(el.value ?? '').trim()])
    .filter(([id, value]) => id && value);
  return Object.fromEntries(entries);
}


function collectDowntimeSelection(inst) {
  const root = inst?.element ?? null;
  const checkbox = root?.querySelector?.('input[name="simulate-downtime"]');
  return Boolean(checkbox?.checked);
}

function deepClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value));
}

function setByPath(target, path, value) {
  if (!target || typeof target !== 'object' || !path) return;
  const parts = String(path).split('.').filter(Boolean);
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const raw = parts[i];
    const key = /^\d+$/.test(raw) ? Number(raw) : raw;
    if (cursor[key] == null || typeof cursor[key] !== 'object') {
      cursor[key] = /^\d+$/.test(parts[i + 1] ?? '') ? [] : {};
    }
    cursor = cursor[key];
  }
  const lastRaw = parts.at(-1);
  const lastKey = /^\d+$/.test(lastRaw) ? Number(lastRaw) : lastRaw;
  cursor[lastKey] = value;
}

function applySkillFallbacksToBundle(bundle, diffs, fallbackMap) {
  if (!bundle || typeof bundle !== 'object') return bundle;
  if (!fallbackMap || Object.keys(fallbackMap).length === 0) return bundle;
  const clone = deepClone(bundle);
  const diffMap = new Map((Array.isArray(diffs) ? diffs : []).map((diff) => [String(diff.id ?? ''), diff]));
  for (const [id, selectedSkill] of Object.entries(fallbackMap)) {
    const diff = diffMap.get(String(id));
    if (!diff?.changeKey && diff?.changeKey !== '') continue;
    const entry = clone?.changes?.[diff.changeKey]?.[diff.idx];
    if (!entry || !diff.invalidSkillFieldPath) continue;
    setByPath(entry, diff.invalidSkillFieldPath, selectedSkill);
  }
  return clone;
}

export class JanusKiRoundtripApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: 'janus-ki-roundtrip',
    classes: ['janus7-app', 'janus7-ki-roundtrip'],
    position: { width: 700, height: 620 },
    window: {
      title: 'JANUS7 · KI Roundtrip',
      resizable: true
    },
    actions: {
      exportMode: '_onExportMode',
      exportJson: '_onExportJson',
      exportFile: '_onExportFile',
      preview: '_onPreview',
      apply: '_onApply',
      applySelected: '_onApplySelected',
      toggleDiff: '_onToggleDiff',
      selectAllDiffs: '_onSelectAllDiffs',
      selectNoneDiffs: '_onSelectNoneDiffs',
      loadFile: '_onLoadFile',
      browseFile: '_onBrowseFile'
    }
  };

  /**
   * Template definitions for this app. Use a single main part
   * referencing the Handlebars template. See `templates/apps/ki-roundtrip.hbs`.
   */
  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/ki-roundtrip.hbs') }
  };

  /**
   * Prepare the Handlebars context. Exports the current KI bundle
   * as pretty-printed JSON and retrieves the import history. The
   * `isGM` flag indicates whether the current user can apply patches.
   *
   * @param {Object} options
   */
  /** @returns {'lite'|'week'|'full'} */
  get _exportMode() { return this.__exportMode ?? 'lite'; }
  set _exportMode(v) { this.__exportMode = ['lite','week','full'].includes(v) ? v : 'lite'; }

  /**
   * Pre-render hook (async — may await freely, runs before the render lock).
   * Fetches the KI export bundle and caches it on the instance so that
   * _prepareContext() can read it synchronously without awaiting.
   *
   * @param {Object} _force
   * @param {Object} _options
   */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const mode = this._exportMode;
    // Skip expensive exportBundle() when only diff-selection state changed.
    // Cache is invalidated when the export mode changes or cache is cold.
    if (this.__exportCache !== undefined && this.__lastFetchedMode === mode) return;
    const ki = (resolveEngine(this)?.capabilities?.ki ?? resolveEngine(this)?.ki);
    try {
      const bundle = await ki?.exportBundle?.({ mode }) ?? null;
      this.__exportCache = bundle ? JSON.stringify(bundle, null, 2) : '';
      this.__historyCache = ki?.getImportHistory?.() ?? [];
      this.__lastFetchedMode = mode;
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] _preRender: Failed to fetch export data', err);
      this.__exportCache ??= '';
      this.__historyCache ??= [];
    }
  }

  /**
   * Prepare the Handlebars context. Reads from the cache populated by
   * _preRender() — no async KI calls here (ApplicationV2 render-lock safe).
   *
   * @param {Object} options
   */
  _prepareContext(options) {
    const context = super._prepareContext(options) || {};
    // Read from pre-render cache (populated in async _preRender)
    const json = this.__exportCache ?? '';
    const history = this.__historyCache ?? [];

    context.bundleJsonRaw = json;
    context.history = history;
    context.isGM = game.user?.isGM ?? false;
    context.activeMode = this._exportMode;
    context.jsonSize = json ? json.length.toLocaleString('de-DE') : null;

    // Preview state (diffs + selection) lives on the instance
    const diffs = Array.isArray(this.__previewDiffs) ? this.__previewDiffs : [];
    context.diffs = diffs;
    context.diffCount = diffs.length;
    context.diffSelectedCount = diffs.filter((d) => d?.selected).length;
    context.previewWarning = this.__previewWarning ?? null;
    context.downtimeDetected = Boolean(this.__downtimeMeta?.downtimeDetected);
    context.downtimeDays = Number(this.__downtimeMeta?.skippedDays ?? 0);
    context.simulateDowntimeDefault = context.downtimeDetected;

    return context;
  }

  /**
   * Action: select export mode (lite / week / full) and refresh textarea.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  async _onExportMode(event, target) {
    event?.preventDefault?.();
    const mode = target?.dataset?.mode ?? 'lite';
    this._exportMode = mode;
    // Invalidate cache so _preRender re-fetches the bundle for the new mode.
    this.__lastFetchedMode = null;
    await this.render({ force: true });
  }

  /**
   * Action: export the current KI bundle as JSON and populate the
   * textarea. Attempt to copy the result to the clipboard.
   *
   * @param {Event} event
   */
  async _onExportJson(event) {
    event?.preventDefault?.();
    const engine = resolveEngine(this);
    try {
      const mode = this._exportMode ?? 'lite';
      const bundle = await (engine?.capabilities?.ki ?? engine?.ki)?.exportBundle?.({ mode }) ?? null;
      const json = bundle ? JSON.stringify(bundle, null, 2) : '';
      const textarea = this.element?.querySelector?.('textarea[name="ki-json"]');
      if (textarea) textarea.value = json;
      try {
        await navigator.clipboard.writeText(json);
        ui.notifications?.info?.('KI-JSON kopiert.');
      } catch (_) {
        ui.notifications?.info?.('KI-JSON aktualisiert.');
      }
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] exportJson failed', err);
      ui.notifications?.warn?.('Export JSON fehlgeschlagen (siehe Konsole).');
    }
  }

  /**
   * Action: export the current KI bundle to a file in the outbox.
   * Returns the JSON so the textarea can be updated. Shows a
   * notification with the filename if written.
   *
   * @param {Event} event
   */
  async _onExportFile(event) {
    if (!this._requireGM('exportFile')) return;
    event?.preventDefault?.();
    const engine = resolveEngine(this);
    try {
      const mode = this._exportMode ?? 'lite';
      const res = await (engine?.capabilities?.ki ?? engine?.ki)?.exportToOutbox?.({ mode }) ?? {};
      const filename = res.filename ?? null;
      const textarea = this.element?.querySelector?.('textarea[name="ki-json"]');
      if (textarea && typeof res.json === 'string') textarea.value = res.json;
      if (filename) {
        ui.notifications?.info?.(`KI-Export gespeichert als ${filename}`);
      } else {
        ui.notifications?.info?.('KI-Export erstellt (Dateisystem nicht verfügbar)');
      }
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] exportFile failed', err);
      ui.notifications?.warn?.('Export-Datei fehlgeschlagen (siehe Konsole).');
    }
  }

  /**
   * Action: preview the diff for the JSON content in the textarea. If
   * the JSON is invalid, the diff box displays an error. Otherwise the
   * diff operations are listed one per line showing operation and path.
   *
   * @param {Event} event
   */
  async _onPreview(event) {
    event?.preventDefault?.();
    const engine = resolveEngine(this);
    const textarea = this.element?.querySelector?.('textarea[name="ki-json"]');
    let jsonText = textarea?.value ?? '';
    let bundle;
    try {
      bundle = JSON.parse(jsonText);
    } catch (_) {
      ui.notifications?.warn?.('JSON ist ungültig.');
      this.__previewDiffs = [];
      this.__previewWarning = 'Ungültiges JSON.';
      await this.render({ force: true });
      return;
    }
    try {
      const raw = await (engine?.capabilities?.ki ?? engine?.ki)?.previewImport?.(bundle) ?? [];
      // previewImport may return a plain array OR a result-object { diffs, downtimeDetected, ... }
      const diffsArray = Array.isArray(raw) ? raw : (Array.isArray(raw?.diffs) ? raw.diffs : []);
      const meta = Array.isArray(raw) ? {} : (raw ?? {});
      this.__previewSourceText = jsonText;
      let warning = null;
      try {
        const exportedAt = bundle?.sourceExportMeta?.exportedAt ?? null;
        if (exportedAt) {
          const ageMs = Date.now() - Date.parse(exportedAt);
          if (Number.isFinite(ageMs) && ageMs > 1000 * 60 * 60 * 24 * 7) {
            warning = `Hinweis: sourceExportMeta.exportedAt ist älter als 7 Tage (${exportedAt}). Re-export empfohlen.`;
          }
        }
      } catch (_) { /* ignore */ }
      this.__previewWarning = warning;
      this.__downtimeMeta = {
        downtimeDetected: Boolean(meta.downtimeDetected),
        skippedDays: Number(meta.skippedDays ?? 0),
        firstSlot: meta.firstSlot ?? null,
        currentTime: meta.currentTime ?? null
      };

      this.__previewDiffs = diffsArray
        .map((d, i) => ({ ...d, _uiIndex: i, selected: d?.missingReference ? false : (d?.selected ?? true) }));
      await this.render({ force: true });
      ui.notifications?.info?.('Diff berechnet.');
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] preview failed', err);
      ui.notifications?.warn?.(err?.message ?? 'Preview fehlgeschlagen');
      this.__previewDiffs = [];
      this.__downtimeMeta = { downtimeDetected: false, skippedDays: 0 };
      this.__previewWarning = err?.message ?? 'Preview fehlgeschlagen';
      await this.render({ force: true });
    }
  }

  /**
   * Action: apply the KI bundle described in the textarea. Only GMs
   * may apply patches. Upon success the history panel is refreshed.
   *
   * @param {Event} event
   */
  async _onApply(event) {
    if (!this._requireGM('apply')) return;
    event?.preventDefault?.();
    const engine = resolveEngine(this);
    const textarea = this.element?.querySelector?.('textarea[name="ki-json"]');
    const diffBox = this.element?.querySelector?.('.ki-diff');
    let bundle;
    try {
      bundle = JSON.parse(textarea?.value ?? '');
    } catch (_) {
      ui.notifications?.warn?.('JSON ist ungültig.');
      return;
    }
    try {
      const selectedIds = collectSelectedDiffIds(this);
      if (Array.isArray(this.__previewDiffs) && this.__previewDiffs.length > 0 && selectedIds.length === 0) {
        ui.notifications?.info?.('Keine Import-Elemente ausgewählt.');
        return;
      }
      const skillFallbacks = collectSkillFallbacks(this);
      const simulateDowntime = collectDowntimeSelection(this);
      const preparedBundle = applySkillFallbacksToBundle(bundle, this.__previewDiffs, skillFallbacks);
      const diffs = await (engine?.capabilities?.ki ?? engine?.ki)?.applyImport?.(preparedBundle, { selectedIds, simulateDowntime }) ?? [];
      if (Array.isArray(diffs) && diffs.length > 0) {
        ui.notifications?.info?.(`Import erfolgreich (${diffs.length} Änderungen)`);
      } else {
        ui.notifications?.info?.('Keine Änderungen angewendet');
      }
      if (diffBox) diffBox.textContent = '';
      // Invalidate cache: imported state is now different from the cached bundle.
      this.__lastFetchedMode = null;
      await this.render({ force: true });
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] apply failed', err);
      ui.notifications?.error?.(err?.message ?? 'Import fehlgeschlagen');
    }
  }

  /**
   * Toggle a single diff selection checkbox.
   * DOM-patch only: the checkbox state is already correct (user just clicked it);
   * we only need to update the in-memory flag and the counter display.
   */
  _onToggleDiff(_event, target) {
    const idx = Number(target?.dataset?.diffIdx ?? target?.dataset?.idx ?? NaN);
    if (!Number.isFinite(idx)) return;
    const diffs = Array.isArray(this.__previewDiffs) ? this.__previewDiffs : [];
    const hit = diffs.find((d) => d?._uiIndex === idx) ?? diffs[idx];
    if (hit) hit.selected = !!target?.checked;
    this._patchDiffCounters();
  }

  _onSelectAllDiffs(event) {
    event?.preventDefault?.();
    const diffs = Array.isArray(this.__previewDiffs) ? this.__previewDiffs : [];
    for (const d of diffs) d.selected = true;
    this._patchDiffSelection(true);
  }

  _onSelectNoneDiffs(event) {
    event?.preventDefault?.();
    const diffs = Array.isArray(this.__previewDiffs) ? this.__previewDiffs : [];
    for (const d of diffs) d.selected = false;
    this._patchDiffSelection(false);
  }

  /**
   * Patches the "Diffs / Ausgewählt" counter spans in-place without a full re-render.
   * @protected
   */
  _patchDiffCounters() {
    const el = this.element;
    if (!el) return;
    const diffs = Array.isArray(this.__previewDiffs) ? this.__previewDiffs : [];
    const spans = el.querySelectorAll('.j7-diff-meta strong');
    if (spans[0]) spans[0].textContent = String(diffs.length);
    if (spans[1]) spans[1].textContent = String(diffs.filter((d) => d?.selected).length);
  }

  /**
   * Sets all `.import-toggle` checkboxes to the given state and patches the counters.
   * @param {boolean} selected
   * @protected
   */
  _patchDiffSelection(selected) {
    const el = this.element;
    if (!el) return;
    el.querySelectorAll('.import-toggle').forEach((cb) => { cb.checked = selected; });
    this._patchDiffCounters();
  }

  /**
   * Apply only the selected diffs. This filters the KI response payload
   * by (changeKey, idx) metadata produced by previewImport.
   */
  async _onApplySelected(event) {
    return this._onApply(event);
  }

  async _onLoadFile(event) {
    if (!this._requireGM('loadFile')) return;
    event?.preventDefault?.();
    const engine = resolveEngine(this);
    const input = this.element?.querySelector?.('input[name="ki-file-name"]');
    const filename = input?.value?.trim?.();
    if (!filename) {
      ui.notifications?.warn?.('Dateiname fehlt.');
      return;
    }
    try {
      const diffs = await (engine?.capabilities?.ki ?? engine?.ki)?.importFromInbox?.(filename) ?? [];
      ui.notifications?.info?.(`Import aus Datei erfolgreich (${diffs.length} Änderungen)`);
      await this.render({ force: true });
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] import file failed', err);
      ui.notifications?.error?.(err?.message ?? 'Import aus Datei fehlgeschlagen');
    }
  }

  /**
   * Action: open a FilePicker to select a KI response JSON from the world inbox.
   * This is the recommended workflow (no manual filename typing).
   *
   * @param {Event} event
   */
  async _onBrowseFile(event) {
    event?.preventDefault?.();
    const input = this.element?.querySelector?.('input[name="ki-file-name"]');

    const FP = getFilePickerClass()?.implementation ?? getFilePickerClass();
    if (!FP || !globalThis.game?.world) {
      ui.notifications?.warn?.('FilePicker nicht verfügbar.');
      return;
    }

    const worldId = game.world?.id ?? game.world?.name ?? 'world';
    const dir = 'worlds/' + worldId + '/janus7/io/inbox';

    try {
      await ensureDataDirectory(dir);

      const picker = new FP({
        type: 'text',
        source: 'data',
        current: dir,
        callback: (path) => {
          if (!path?.toLowerCase?.().endsWith?.('.json')) {
            ui.notifications?.warn?.('Bitte eine .json Datei wählen.');
            return;
          }
          if (input) input.value = path;
        }
      });
      picker.render({ force: true });
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] browseFile failed', err);
      ui.notifications?.warn?.('Browse fehlgeschlagen (siehe Konsole).');
    }
  }

}


