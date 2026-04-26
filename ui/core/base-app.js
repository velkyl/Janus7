/**
 * @file ui/core/base-app.js
 * @module janus7
 * @phase 6
 *
 * JanusBaseApp — Render-stable ApplicationV2 base class for all JANUS7 UI applications.
 *
 * Responsibilities:
 *  - Foundry v13/v14 ApplicationV2 compatibility shims (element accessors, setPosition guard)
 *  - Post-render hook for stable DOM access via queueMicrotask
 *  - Viewport sanity clamping (_applyWindowSanity)
 *  - Centralised hook lifecycle (_registerHook / _unregisterHooks / close)
 *  - Error boundary rendering with accessible ARIA markup
 *  - Debounced auto-refresh via enableAutoRefresh
 */

import { MODULE_ID } from '../../core/common.js';
import { HOOKS } from '../../core/hooks/topics.js';

// ---------------------------------------------------------------------------
// Module-level polyfill — executed exactly once when the module loads.
// Prevents every JanusBaseApp subclass constructor from re-running the guard.
// ---------------------------------------------------------------------------

/**
 * Polyfill for foundry.utils.deepClone if absent (defensive guard for v13 edge cases).
 * @param {*} value
 * @returns {*}
 */
function _fallbackDeepClone(value) {
  if (value === undefined) return undefined;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch (_) { /* noop */ }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

(function _ensureFoundryDeepClone() {
  const utils = globalThis.foundry?.utils;
  if (!utils || typeof utils.deepClone === 'function') return;
  utils.deepClone = _fallbackDeepClone;
})();

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

export class JanusBaseApp extends foundry.applications.api.ApplicationV2 {

  constructor(options = {}) {
    super(options);
    // FIX P1-03: ensureFoundryDeepClone() removed from constructor — called at module level.
    this.engine = options.engine ?? null;

    /**
     * AbortController for ongoing render operations.
     * Subclasses may set this to a new AbortController before async work begins.
     * JanusBaseApp.close() calls _cleanupRenderAbort() to abort automatically.
     *
     * @type {AbortController|null}
     * @protected
     */
    this._renderAbort = null;

    /** @type {boolean} True until the first successful _onPostRender call. */
    this._isFirstRender = true;

    /** @type {ReturnType<typeof setTimeout>|null} */
    this._rerenderTimer = null;
  }

  // ---------------------------------------------------------------------------
  // DOM Element accessors (legacy/v13/v14 compatibility shims)
  // ---------------------------------------------------------------------------

  /**
   * Compatibility getter: normalises element access across legacy/jQuery and ApplicationV2 DOM handling.
   * @deprecated Will be removed after the legacy JANUS accessors are retired.
   * @returns {HTMLElement|null}
   */
  get element() {
    let raw = null;
    try { raw = super.element; } catch (_) { /* noop */ }
    raw ??= this._element ?? this._legacyElement ?? null;
    return raw ?? null;
  }

  /**
   * Unified DOM element accessor guaranteed to return a raw HTMLElement in ApplicationV2 flows.
   * @returns {HTMLElement|null}
   */
  /**
   * Unified accessor for the JANUS7 engine instance.
   * Checks the local property first, then the global game object.
   * @returns {any}
   */
  _getEngine() {
    return this.engine ?? globalThis.game?.janus7 ?? null;
  }

  /**
   * Unified logger accessor.
   * @returns {Console|object}
   */
  _getLogger() {
    return this._getEngine()?.core?.logger ?? console;
  }

  get domElement() {
    const raw = this.element ?? this._element ?? this._legacyElement ?? null;
    if (!raw) return null;
    return (raw instanceof HTMLElement) ? raw : raw[0] ?? null;
  }

  /**
   * Alias for domElement kept for call-site compatibility with older internal code.
   * @deprecated Prefer domElement.
   * @returns {HTMLElement|null}
   */
  get elementCompat() {
    return this.domElement;
  }

  // ---------------------------------------------------------------------------
  // Render lifecycle
  // ---------------------------------------------------------------------------

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    queueMicrotask(() => {
      if (!this.rendered || !this.domElement) return;
      this._onPostRender(context, options);
    });
  }

  /**
   * Called after the DOM is painted and stable.
   * Runs on every render; first-render guards are applied internally.
   * @param {object} context
   * @param {object} options
   * @protected
   */
  _onPostRender(_context, _options) {
    this._legacyElement = this.domElement;
    this._bindBaseUiActions();

    // Fix P1-02: Ensure background windows focus on first click so that buttons respond immediately.
    const el = this.domElement;
    el?.addEventListener('pointerdown', () => {
      if (this.rendered && !el?.classList.contains('active')) this.bringToFront?.();
    }, { capture: true, passive: true });

    // Enhance action system to support 'change' events (e.g. for selects)
    el?.addEventListener('change', (ev) => {
      const target = ev.target?.closest?.('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const handler = this.options.actions[action];
      if (handler) {
        if (typeof handler === 'string') {
          if (typeof this[handler] === 'function') this[handler](ev, target);
        } else if (typeof handler === 'function') {
          handler.call(this, ev, target);
        }
      }
    }, { capture: true });

    if (this._isFirstRender) {
      this._isFirstRender = false;
      this._updatePositionSafe();
      this._applyWindowSanity();

      // Registered exactly once per app lifecycle; cleaned up in close() via _unregisterHooks().
      this._registerHook(HOOKS.LIBRARY_INDEX_PROGRESS, (pct) => {
        if (!this.rendered || !this.domElement) return;
        const pEl = this.domElement.querySelector('.index-progress-text');
        if (pEl) pEl.innerText = `${pct}%`;
      });
    } else {
      this._applyWindowSanity();
    }
  }

  // ---------------------------------------------------------------------------
  // Position management
  // ---------------------------------------------------------------------------

  _updatePositionSafe() {
    const el = this.domElement;
    if (!el?.offsetWidth) return;
    try {
      this._computePosition();
    } catch (err) {
      this._getLogger().warn?.(`${MODULE_ID}: Position update failed`, err);
    }
  }

  /** Override in subclasses to apply custom initial positioning. */
  _computePosition() {}

  /**
   * Returns the application's default window rect, derived from DEFAULT_OPTIONS.position.
   * @returns {{ width: number, height: number, top: number, left: number }}
   */
  _getDefaultWindowRect() {
    const fallback = { width: 900, height: 680, top: 70, left: 90 };
    const defaults = this.constructor?.DEFAULT_OPTIONS?.position ?? this.options?.position ?? {};
    const num = (value, fb) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fb;
    };
    return {
      width:  num(defaults.width,  fallback.width),
      height: num(defaults.height, fallback.height),
      top:    num(defaults.top,    fallback.top),
      left:   num(defaults.left,   fallback.left),
    };
  }

  /**
   * Clamps the window position and size to the current viewport.
   * Called on every render cycle to recover off-screen windows.
   */
  _applyWindowSanity() {
    const el = this.domElement;
    if (!el?.isConnected) return;

    const viewportWidth  = Math.max(window?.innerWidth  ?? document?.documentElement?.clientWidth  ?? 0, 640);
    const viewportHeight = Math.max(window?.innerHeight ?? document?.documentElement?.clientHeight ?? 0, 480);
    const gutter    = 16;
    const topGutter = 32;

    const defaults = this._getDefaultWindowRect();
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const num   = (value, fallback) => { const p = Number(value); return Number.isFinite(p) ? p : fallback; };

    const rect    = el.getBoundingClientRect();
    const current = (this.position && typeof this.position === 'object') ? this.position : {};

    const maxWidth  = Math.max(320, viewportWidth  - (gutter * 2));
    const maxHeight = Math.max(240, viewportHeight - (gutter + topGutter));
    const minWidth  = Math.min(Math.max(Math.round(defaults.width  * 0.6), 420), maxWidth);
    const minHeight = Math.min(Math.max(Math.round(defaults.height * 0.6), 320), maxHeight);

    let width   = num(current.width  ?? rect.width,  defaults.width);
    let height  = num(current.height ?? rect.height, defaults.height);
    let left    = num(current.left   ?? rect.left,   defaults.left);
    let top     = num(current.top    ?? rect.top,    defaults.top);
    let changed = false;

    const saneWidth  = clamp(num(defaults.width,  width),  minWidth,  maxWidth);
    const saneHeight = clamp(num(defaults.height, height), minHeight, maxHeight);

    if (!Number.isFinite(width)  || width  < minWidth  || width  > maxWidth)  { width  = saneWidth;  changed = true; }
    if (!Number.isFinite(height) || height < minHeight || height > maxHeight) { height = saneHeight; changed = true; }

    const maxLeft = Math.max(gutter,    viewportWidth  - width  - gutter);
    const maxTop  = Math.max(topGutter, viewportHeight - height - gutter);

    const isOffscreen = (rect.right  < gutter)
      || (rect.bottom < topGutter)
      || (rect.left   > viewportWidth  - gutter)
      || (rect.top    > viewportHeight - gutter);

    if (isOffscreen || !Number.isFinite(left) || !Number.isFinite(top)) {
      left    = clamp(defaults.left, gutter,    maxLeft);
      top     = clamp(defaults.top,  topGutter, maxTop);
      changed = true;
    } else {
      const cl = clamp(left, gutter,    maxLeft);
      const ct = clamp(top,  topGutter, maxTop);
      if (cl !== left) { left = cl; changed = true; }
      if (ct !== top)  { top  = ct; changed = true; }
    }

    if (!changed) return;

    try {
      if (typeof this.setPosition === 'function') {
        this.setPosition({ left, top, width, height });
        return;
      }
    } catch (err) {
      this._getLogger().warn?.(`${MODULE_ID}: setPosition fallback engaged`, err);
    }

    try {
      el.style.left      = `${Math.round(left)}px`;
      el.style.top       = `${Math.round(top)}px`;
      el.style.width     = `${Math.round(width)}px`;
      el.style.height    = `${Math.round(height)}px`;
      el.style.minWidth  = `${Math.round(minWidth)}px`;
      el.style.minHeight = `${Math.round(minHeight)}px`;
      this.position = { ...(current ?? {}), left, top, width, height };
    } catch (err) {
      this._getLogger().warn?.(`${MODULE_ID}: Window sanity fallback failed`, err);
    }
  }

  /** @override */
  setPosition(position = {}) {
    const el = this.domElement;
    if (!el?.isConnected) {
      // Buffer position; _applyWindowSanity will reconcile on next render once element is connected.
      this.position = { ...(this.position ?? {}), ...(position ?? {}) };
      return this.position;
    }
    return super.setPosition(position);
  }

  // ---------------------------------------------------------------------------
  // Render options (ApplicationV2 migration layer)
  // ---------------------------------------------------------------------------

  /**
   * Strips legacy root-level window metadata and resolves window.title with fallbacks.
   *
   * FIX P1-01a: Removed dead migration of legacyIcon → window.icon.
   *   JANUS apps intentionally omit window icons; migrating then deleting was pure dead code.
   *
   * FIX P1-01b: window.controls is no longer deleted unconditionally when it is an Array.
   *   In Foundry v13 ApplicationV2, DEFAULT_OPTIONS.window.controls is a valid array of
   *   ApplicationHeaderControlsEntry objects. The previous code silently broke all subclass
   *   header buttons. Controls are now only removed if they were explicitly migrated from the
   *   legacy root-level options.controls property (not from DEFAULT_OPTIONS.window.controls).
   *
   * @override
   */
  _configureRenderOptions(options = {}) {
    options = super._configureRenderOptions?.(options ?? {}) ?? (options ?? {});
    options.tag ??= this.constructor?.DEFAULT_OPTIONS?.tag ?? 'section';
    options.window = (options.window && typeof options.window === 'object') ? { ...options.window } : {};

    // Snapshot window.controls BEFORE any legacy migration attempt.
    // If already populated (e.g. from DEFAULT_OPTIONS.window.controls), it must be preserved.
    const windowControlsPreExisting = options.window.controls ?? null;

    // Collect legacy root-level properties (v12-era) before stripping them.
    const legacyTitle    = options.title    ?? this.constructor?.DEFAULT_OPTIONS?.title    ?? this.options?.title;
    const legacyControls = options.controls ?? this.constructor?.DEFAULT_OPTIONS?.controls ?? this.options?.controls;

    // Resolve window.title with full fallback cascade.
    options.window.title = String(
      options.window.title
      ?? this.constructor?.DEFAULT_OPTIONS?.window?.title
      ?? this.options?.window?.title
      ?? legacyTitle
      ?? this.constructor?.name
      ?? 'JANUS7'
    );

    // Strip legacy root-level properties; they have been consumed above.
    // Foundry 13.351 shows fragile localise/alias resolution for root-level window metadata.
    delete options.title;
    delete options.icon;
    delete options.controls;

    // JANUS apps intentionally omit the window icon for a minimal titlebar aesthetic.
    delete options.window.icon;

    // Only remove window.controls if they came from the legacy root-level migration
    // (window scope was empty before this method ran, AND legacy controls existed at root level).
    // DEFAULT_OPTIONS.window.controls (pre-existing) is always preserved.
    if (windowControlsPreExisting == null && legacyControls != null && Array.isArray(options.window.controls)) {
      delete options.window.controls;
    }

    return options;
  }

  // ---------------------------------------------------------------------------
  // Engine & utility accessors
  // ---------------------------------------------------------------------------

  /** @returns {object|null} JANUS7 engine instance. */
  _getEngine() {
    return this.engine ?? game?.janus7 ?? null;
  }

  /**
   * Safe logger accessor. Falls back to console if engine is not yet initialised.
   * @returns {import('../../core/logger.js').JanusLogger|Console}
   */
  _getLogger() {
    return this._getEngine()?.core?.logger ?? console;
  }

  /**
   * Guard: returns true if the current user is a GM, otherwise shows a warning
   * notification, logs the attempt, and returns false.
   * Call at the top of any mutating action handler to enforce server-side intent.
   * Template-level `disabled` attributes are UI hints, not security barriers —
   * a player can invoke any action handler from the browser console.
   *
   * @param {string} [actionName='action'] Name used in the log entry.
   * @returns {boolean}
   */
  _requireGM(actionName = 'action') {
    if (game?.user?.isGM) return true;
    this._getLogger().warn?.(`[JANUS7][${this.constructor.name}] Non-GM attempted GM-only action: ${actionName}`);
    ui?.notifications?.warn?.('Diese Aktion ist nur für den Spielleiter verfügbar.');
    return false;
  }

  /** @returns {string} Installed module version or 'unknown'. */
  _getModuleVersion() {
    try {
      return game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // ---------------------------------------------------------------------------
  // i18n helpers
  // ---------------------------------------------------------------------------

  /**
   * Localises a key; returns fallback (or the key itself) when localisation is unavailable.
   * @param {string} key
   * @param {string} [fallback='']
   * @returns {string}
   */
  _t(key, fallback = '') {
    try {
      const localized = game?.i18n?.localize?.(key);
      if (!localized || localized === key) return fallback || key;
      return localized;
    } catch {
      return fallback || key;
    }
  }

  /**
   * Formats a localisation key with data substitution.
   * @param {string} key
   * @param {object} [data={}]
   * @param {string} [fallback='']
   * @returns {string}
   */
  _fmt(key, data = {}, fallback = '') {
    try {
      const formatted = game?.i18n?.format?.(key, data);
      if (!formatted || formatted === key) return fallback || key;
      return formatted;
    } catch {
      return fallback || key;
    }
  }

  // ---------------------------------------------------------------------------
  // Error handling & boundary
  // ---------------------------------------------------------------------------

  /**
   * Central render error handler. Records to engine diagnostics and returns an
   * accessible error boundary HTML string for inline display.
   * @param {Error} err
   * @param {string} [context='unknown']
   * @returns {string} HTML error boundary markup.
   */
  _handleRenderError(err, context = 'unknown') {
    this._getLogger().error?.(`${MODULE_ID}: Render error in ${context}`, err);
    this._trackLastError(err, context);
    try {
      const engine = this._getEngine();
      if (engine?.errors?.record) {
        engine.errors.record('phase6', `UI.${this.constructor.name}.${context}`, err);
      }
    } catch (_e) { /* engine error reporting must not crash the caller */ }
    return this._renderErrorBoundary(err, context);
  }

  /**
   * Stores the last UI error on the engine diagnostics object.
   * @param {Error} err
   * @param {string} context
   * @protected
   */
  _trackLastError(err, context) {
    try {
      const engine = this._getEngine();
      if (!engine?.diagnostics) return;
      engine.diagnostics.lastUiError = {
        timestamp: new Date().toISOString(),
        context,
        message:   err.message,
        stack:     err.stack,
      };
    } catch { /* noop */ }
  }

  /**
   * Returns an accessible ARIA error boundary HTML string.
   * @param {Error} err
   * @param {string} context
   * @returns {string}
   */
  _renderErrorBoundary(err, context) {
    const stack    = String(err?.stack || err?.message || err || 'Unknown error');
    const stackB64 = btoa(stack);
    const detailId = `j7-error-details-${Date.now().toString(36)}`;

    return `
      <section class="j7-error-boundary" role="alert" aria-live="assertive">
        <div class="j7-error-boundary__header">
          <h3 class="j7-error-boundary__title"><i class="fas fa-exclamation-triangle"></i> Rendering-Fehler</h3>
          <span class="j7-error-boundary__context">${this._escape(context)}</span>
        </div>
        <p class="j7-error-boundary__message">${this._escape(err?.message ?? String(err))}</p>
        <div class="j7-error-boundary__actions">
          <button class="j7-btn primary" type="button" data-action="retryRender">
            <i class="fas fa-rotate-right"></i> Erneut rendern
          </button>
          <button class="j7-btn" type="button" data-action="copyErrorStack" data-stack="${stackB64}">
            <i class="fas fa-clipboard"></i> Details kopieren
          </button>
          <button class="j7-btn" type="button" data-action="toggleErrorDetails"
                  aria-controls="${detailId}" aria-expanded="false">
            <i class="fas fa-code"></i> Technische Details
          </button>
        </div>
        <pre id="${detailId}" class="janus7-pre j7-error-boundary__details" hidden>${this._escape(stack)}</pre>
      </section>
    `;
  }

  /**
   * HTML-escapes a string for safe insertion into markup.
   * @param {string|*} s
   * @returns {string}
   */
  _escape(s) {
    return String(s)
      .replaceAll('&',  '&amp;')
      .replaceAll('<',  '&lt;')
      .replaceAll('>',  '&gt;')
      .replaceAll('"',  '&quot;')
      .replaceAll("'",  '&#39;');
  }

  // ---------------------------------------------------------------------------
  // Base UI action binding (error boundary interactions)
  // ---------------------------------------------------------------------------

  /**
   * Attaches delegated event listeners for base UI actions (error boundary buttons).
   * Uses a DOM flag to prevent duplicate binding across re-renders on the same element.
   * @protected
   */
  _bindBaseUiActions() {
    const el = this.domElement;
    if (!el || el._janusBaseActionsBound) return;
    el._janusBaseActionsBound = true;

    el.addEventListener('click', async (ev) => {
      const target = ev.target?.closest?.('[data-action]');
      if (!target) return;
      const action = target.dataset.action;

      if (action === 'copyErrorStack') {
        ev.preventDefault();
        const raw = target.dataset.stack ?? '';
        try {
          const stack = atob(raw);
          await navigator?.clipboard?.writeText?.(stack);
          ui?.notifications?.info?.('Fehlerdetails in die Zwischenablage kopiert.');
        } catch (err) {
          this._getLogger().warn?.(`${MODULE_ID}: copyErrorStack failed`, err);
          ui?.notifications?.warn?.('Fehlerdetails konnten nicht kopiert werden.');
        }
        return;
      }

      if (action === 'retryRender') {
        ev.preventDefault();
        try {
          await this.refresh?.(true);
        } catch (err) {
          this._getLogger().warn?.(`${MODULE_ID}: retryRender failed`, err);
        }
        return;
      }

      if (action === 'toggleErrorDetails') {
        ev.preventDefault();
        const detailsId = target.getAttribute('aria-controls');
        const details   = detailsId ? el.querySelector(`#${CSS.escape(detailsId)}`) : null;
        if (!details) return;
        const expanded = target.getAttribute('aria-expanded') === 'true';
        target.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        details.hidden = expanded;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render scheduling & refresh alias
  // ---------------------------------------------------------------------------

  /**
   * Schedules a debounced re-render. Prevents parallel timers for the same app instance.
   * Skips render if the element is no longer connected (e.g. app is closing).
   * @param {number} [delay=60] Delay in milliseconds.
   */
  _scheduleRerender(delay = 60) {
    if (this._rerenderTimer != null) return;
    this._rerenderTimer = setTimeout(() => {
      this._rerenderTimer = null;
      try {
        if (!this.rendered) return;
        const el = this.domElement;
        if (!el || !el.isConnected) return;
        const p = this.render({ force: true });
        p?.catch?.((err) => this._getLogger().error?.(`${MODULE_ID}: Rerender failed (async)`, err));
      } catch (err) {
        this._getLogger().error?.(`${MODULE_ID}: Rerender failed`, err);
      }
    }, delay);
  }

  /**
   * Compatibility alias for ApplicationV2.render() used across JANUS UI action handlers.
   * Historically many apps called `this.refresh()`; this keeps call-sites stable.
   * @param {boolean|object} [force=true]
   * @returns {Promise<JanusBaseApp>}
   */
  refresh(force = true) {
    const opts = (typeof force === 'object' && force !== null) ? force : { force: !!force };
    return this.render?.(opts);
  }

  // ---------------------------------------------------------------------------
  // Hook lifecycle management
  // ---------------------------------------------------------------------------

  /**
   * Registers a Foundry Hook and tracks it for automatic cleanup on close().
   * @param {string} hookName
   * @param {Function} fn
   * @returns {number} Foundry Hook ID.
   */
  _registerHook(hookName, fn) {
    this._janusHooks ??= [];
    const id = Hooks.on(hookName, fn);
    this._janusHooks.push({ hookName, id });
    return id;
  }

  /** Removes all hooks registered via _registerHook(). */
  _unregisterHooks() {
    if (!this._janusHooks?.length) return;
    for (const h of this._janusHooks) {
      try { Hooks.off(h.hookName, h.id); } catch (_) { /* noop */ }
    }
    this._janusHooks         = [];
    this._autoRefreshEnabled = false;
  }

  /**
   * Enables debounced auto-refresh when any of the supplied hooks fire.
   * Safe to call multiple times; duplicate registration is suppressed.
   * @param {string[]} hookNames
   * @param {number} [delayMs=150]
   */
  enableAutoRefresh(hookNames, delayMs = 150) {
    if (this._autoRefreshEnabled) return;
    const debounced = foundry.utils.debounce(() => {
      const el = this.domElement;
      if (!el || !el.isConnected) return;
      this.refresh?.();
    }, delayMs);
    for (const hookName of hookNames) {
      this._registerHook(hookName, () => debounced());
    }
    this._autoRefreshEnabled = true;
  }

  // ---------------------------------------------------------------------------
  // AbortController integration (for subclass use)
  // ---------------------------------------------------------------------------

  /**
   * Aborts any pending render operation tracked via this._renderAbort.
   * Subclasses should assign `this._renderAbort = new AbortController()` before
   * starting async render work; this base method cleans it up on close().
   * @protected
   */
  _cleanupRenderAbort() {
    try {
      this._renderAbort?.abort();
      this._renderAbort = null;
    } catch { /* noop */ }
  }

  // ---------------------------------------------------------------------------
  // Close / teardown
  // ---------------------------------------------------------------------------

  /** @override */
  async close(options = {}) {
    this._cleanupRenderAbort();
    if (this._rerenderTimer != null) {
      try { clearTimeout(this._rerenderTimer); } catch (_) { /* noop */ }
      this._rerenderTimer = null;
    }
    this._unregisterHooks();
    this._autoRefreshEnabled = false;
    // Clear singleton reference only if this instance IS the current singleton.
    if (this.constructor?._instance === this) this.constructor._instance = null;
    return super.close(options);
  }

}

export default JanusBaseApp;
