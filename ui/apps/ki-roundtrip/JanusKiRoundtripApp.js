import { moduleTemplatePath } from '../../../core/common.js';
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
      exportMode: JanusKiRoundtripApp.onExportMode,
      exportJson: JanusKiRoundtripApp.onExportJson,
      exportFile: JanusKiRoundtripApp.onExportFile,
      preview: JanusKiRoundtripApp.onPreview,
      apply: JanusKiRoundtripApp.onApply,
      applySelected: JanusKiRoundtripApp.onApplySelected,
      toggleDiff: JanusKiRoundtripApp.onToggleDiff,
      selectAllDiffs: JanusKiRoundtripApp.onSelectAllDiffs,
      selectNoneDiffs: JanusKiRoundtripApp.onSelectNoneDiffs,
      loadFile: JanusKiRoundtripApp.onLoadFile,
      browseFile: JanusKiRoundtripApp.onBrowseFile
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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const engine = resolveEngine(this);
    const mode = this._exportMode;
    let json = '';
    try {
      const bundle = await (engine?.capabilities?.ki ?? engine?.ki)?.exportBundle?.({ mode }) ?? null;
      if (bundle) json = JSON.stringify(bundle, null, 2);
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] Failed to fetch export bundle', err);
    }
    let history = [];
    try {
      history = (engine?.capabilities?.ki ?? engine?.ki)?.getImportHistory?.() ?? [];
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] Failed to fetch import history', err);
    }
    context.json = json;
    context.history = history;
    context.isGM = game.user?.isGM ?? false;
    context.activeMode = mode;
    context.jsonSize = json ? json.length.toLocaleString('de-DE') : null;
    // Preview state (diffs + selection) lives on the instance; render uses it.
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
  static async onExportMode(event, target) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const mode = target?.dataset?.mode ?? 'lite';
    if (inst) inst._exportMode = mode;
    // Rebuild context and re-render (updates active-button highlight + textarea)
    await inst?.render({ force: true });
  }

  /**
   * Action: export the current KI bundle as JSON and populate the
   * textarea. Attempt to copy the result to the clipboard.
   *
   * @param {Event} event
   */
  static async onExportJson(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const engine = resolveEngine(inst);
    try {
      const mode = inst?._exportMode ?? 'lite';
      const bundle = await (engine?.capabilities?.ki ?? engine?.ki)?.exportBundle?.({ mode }) ?? null;
      const json = bundle ? JSON.stringify(bundle, null, 2) : '';
      const textarea = inst.element?.querySelector?.('textarea[name="ki-json"]');
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
  static async onExportFile(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const engine = resolveEngine(inst);
    try {
      const mode = inst?._exportMode ?? 'lite';
      const res = await (engine?.capabilities?.ki ?? engine?.ki)?.exportToOutbox?.({ mode }) ?? {};
      const filename = res.filename ?? null;
      const textarea = inst.element?.querySelector?.('textarea[name="ki-json"]');
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
  static async onPreview(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const engine = resolveEngine(inst);
    const textarea = inst.element?.querySelector?.('textarea[name="ki-json"]');
    let jsonText = textarea?.value ?? '';
    let bundle;
    try {
      bundle = JSON.parse(jsonText);
    } catch (_) {
      ui.notifications?.warn?.('JSON ist ungültig.');
      inst.__previewDiffs = [];
      inst.__previewWarning = 'Ungültiges JSON.';
      await inst?.render({ force: true });
      return;
    }
    try {
      const diffs = await (engine?.capabilities?.ki ?? engine?.ki)?.previewImport?.(bundle) ?? [];
      // Store preview source to detect later edits before applySelected
      inst.__previewSourceText = jsonText;
      // Staleness warning (soft, UI only)
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
      inst.__previewWarning = warning;
      inst.__downtimeMeta = {
        downtimeDetected: Boolean(diffs?.downtimeDetected),
        skippedDays: Number(diffs?.skippedDays ?? 0),
        firstSlot: diffs?.firstSlot ?? null,
        currentTime: diffs?.currentTime ?? null
      };

      // Normalise diffs for UI (keep original fields; add stable idx + selected)
      inst.__previewDiffs = Array.isArray(diffs)
        ? diffs.map((d, i) => ({ ...d, _uiIndex: i, selected: d?.missingReference ? false : (d?.selected ?? true) }))
        : [];
      await inst?.render({ force: true });
      ui.notifications?.info?.('Diff berechnet.');
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] preview failed', err);
      ui.notifications?.warn?.(err?.message ?? 'Preview fehlgeschlagen');
      inst.__previewDiffs = [];
      inst.__downtimeMeta = { downtimeDetected: false, skippedDays: 0 };
      inst.__previewWarning = err?.message ?? 'Preview fehlgeschlagen';
      await inst?.render({ force: true });
    }
  }

  /**
   * Action: apply the KI bundle described in the textarea. Only GMs
   * may apply patches. Upon success the history panel is refreshed.
   *
   * @param {Event} event
   */
  static async onApply(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const engine = resolveEngine(inst);
    const textarea = inst.element?.querySelector?.('textarea[name="ki-json"]');
    const diffBox = inst.element?.querySelector?.('.ki-diff');
    let bundle;
    try {
      bundle = JSON.parse(textarea?.value ?? '');
    } catch (_) {
      ui.notifications?.warn?.('JSON ist ungültig.');
      return;
    }
    try {
      const selectedIds = collectSelectedDiffIds(inst);
      if (Array.isArray(inst.__previewDiffs) && inst.__previewDiffs.length > 0 && selectedIds.length === 0) {
        ui.notifications?.info?.('Keine Import-Elemente ausgewählt.');
        return;
      }
      const skillFallbacks = collectSkillFallbacks(inst);
      const simulateDowntime = collectDowntimeSelection(inst);
      const preparedBundle = applySkillFallbacksToBundle(bundle, inst.__previewDiffs, skillFallbacks);
      const diffs = await (engine?.capabilities?.ki ?? engine?.ki)?.applyImport?.(preparedBundle, { selectedIds, simulateDowntime }) ?? [];
      if (Array.isArray(diffs) && diffs.length > 0) {
        ui.notifications?.info?.(`Import erfolgreich (${diffs.length} Änderungen)`);
      } else {
        ui.notifications?.info?.('Keine Änderungen angewendet');
      }
      // Refresh history and diff box (ApplicationV2: force context rebuild)
      if (diffBox) diffBox.textContent = '';
      await inst.render({ force: true });
    } catch (err) {
      this._getLogger().warn?.('[JANUS7][KI Roundtrip] apply failed', err);
      ui.notifications?.error?.(err?.message ?? 'Import fehlgeschlagen');
    }
  }

  /**
   * Toggle a single diff selection checkbox.
   */
  static async onToggleDiff(event, target) {
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const idx = Number(target?.dataset?.diffIdx ?? target?.dataset?.idx ?? NaN);
    if (!inst || !Number.isFinite(idx)) return;
    const diffs = Array.isArray(inst.__previewDiffs) ? inst.__previewDiffs : [];
    const hit = diffs.find((d) => d?._uiIndex === idx) ?? diffs[idx];
    if (hit) hit.selected = !!target?.checked;
    await inst.render({ force: true });
  }

  static async onSelectAllDiffs(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    if (!inst) return;
    const diffs = Array.isArray(inst.__previewDiffs) ? inst.__previewDiffs : [];
    for (const d of diffs) d.selected = true;
    await inst.render({ force: true });
  }

  static async onSelectNoneDiffs(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    if (!inst) return;
    const diffs = Array.isArray(inst.__previewDiffs) ? inst.__previewDiffs : [];
    for (const d of diffs) d.selected = false;
    await inst.render({ force: true });
  }

  /**
   * Apply only the selected diffs. This filters the KI response payload
   * by (changeKey, idx) metadata produced by previewImport.
   */
  static async onApplySelected(event) {
    return JanusKiRoundtripApp.onApply.call(this, event);
  }


  /**
   * Action: import from a named file in the outbox/inbox. The
   * filename is taken from the input field. After applying, the
   * history panel is refreshed.
   *
   * @param {Event} event
   */
  static async onLoadFile(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const engine = resolveEngine(inst);
    const input = inst.element?.querySelector?.('input[name="ki-file-name"]');
    const filename = input?.value?.trim?.();
    if (!filename) {
      ui.notifications?.warn?.('Dateiname fehlt.');
      return;
    }
    try {
      const diffs = await (engine?.capabilities?.ki ?? engine?.ki)?.importFromInbox?.(filename) ?? [];
      ui.notifications?.info?.(`Import aus Datei erfolgreich (${diffs.length} Änderungen)`);
      // Refresh UI (ApplicationV2: force context rebuild)
      await inst.render({ force: true });
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
  static async onBrowseFile(event) {
    event?.preventDefault?.();
    const inst = this instanceof JanusKiRoundtripApp ? this : (this._instance ?? null);
    const input = inst?.element?.querySelector?.('input[name="ki-file-name"]');

    const FP = foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    if (!FP || !globalThis.game?.world) {
      ui.notifications?.warn?.('FilePicker nicht verfügbar.');
      return;
    }

    const worldId = game.world?.id ?? game.world?.name ?? 'world';
    const dir = 'worlds/' + worldId + '/janus7/io/inbox';

    try {
      // Foundry FilePicker kennt keinen stabilen 'json' Type. Wir nutzen 'text'
      // und validieren die Endung selbst.
      // Ensure inbox directory exists before opening FilePicker
      const parts = dir.split('/').filter(Boolean);
      let acc = '';
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        try { await FP.createDirectory('data', acc, { notify: false }); } catch (_) {}
      }

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