/**
 * @file ui/core/base-app.js
 * @module janus7
 * @phase 6
 * 
 * JanusBaseApp - Render-stabile ApplicationV2 Basisklasse
 */

import { MODULE_ID } from '../../core/common.js';

export class JanusBaseApp extends foundry.applications.api.ApplicationV2 {
  constructor(options = {}) {
    super(options);
    this.engine = options.engine ?? null;
    this._renderAbort = null;
    this._isFirstRender = true;
    this._rerenderTimer = null;
    this._baseActionsBound = false;
  }

  /**
   * Compat getter: some tests and legacy code still expect .element to be present.
   * For ApplicationV2 we normalize to the raw HTMLElement.
   */
  get element() {
    let raw = null;
    try { raw = super.element; } catch (_) { /* noop */ }
    raw ??= this._element ?? this._legacyElement ?? null;
    return raw ?? null;
  }

  /**
   * Unified DOM element accessor for ApplicationV2 compatibility.
   * In Foundry v13+ ApplicationV2, this.element is HTMLElement (not jQuery).
   * @returns {HTMLElement|null}
   */
  get domElement() {
    const raw = this.element ?? this._element ?? this._legacyElement ?? null;
    if (!raw) return null;
    return (raw instanceof HTMLElement) ? raw : raw[0];
  }

  get elementCompat() {
    return this.domElement;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    
    queueMicrotask(() => {
      if (!this.rendered || !this.domElement) return;
      this._onPostRender(context, options);
    });
  }

  _onPostRender(context, options) {
    this._legacyElement = this.domElement;
    this._bindBaseUiActions();
    if (this._isFirstRender && this.domElement?.offsetWidth) {
      this._updatePositionSafe();
      this._applyWindowSanity();

      // Hook for index progress UI updates (runs on every app derived from base)
      this._registerHook('janusLibraryProgress', (pct) => {
        if (!this.rendered || !this.domElement) return;
        const pEl = this.domElement.querySelector('.index-progress-text');
        if (pEl) pEl.innerText = `${pct}%`;
      });

      this._isFirstRender = false;
    } else {
      this._applyWindowSanity();
    }
  }

  _updatePositionSafe() {
    const el = this.domElement;
    if (!el?.offsetWidth) return;
    
    try {
      this._computePosition();
    } catch (err) {
      this._getLogger().warn?.(`${MODULE_ID}: Position update failed`, err);
    }
  }

  _computePosition() {
    // Override in subclasses
  }

  _getDefaultWindowRect() {
    const fallback = { width: 900, height: 680, top: 70, left: 90 };
    const defaults = this.constructor?.DEFAULT_OPTIONS?.position ?? this.options?.position ?? {};
    const num = (value, fb) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fb;
    };

    return {
      width: num(defaults.width, fallback.width),
      height: num(defaults.height, fallback.height),
      top: num(defaults.top, fallback.top),
      left: num(defaults.left, fallback.left)
    };
  }

  _applyWindowSanity() {
    const el = this.domElement;
    if (!el?.isConnected) return;

    const viewportWidth = Math.max(window?.innerWidth ?? document?.documentElement?.clientWidth ?? 0, 640);
    const viewportHeight = Math.max(window?.innerHeight ?? document?.documentElement?.clientHeight ?? 0, 480);
    const gutter = 16;
    const topGutter = 32;

    const defaults = this._getDefaultWindowRect();
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const num = (value, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const rect = el.getBoundingClientRect();
    const current = (this.position && typeof this.position === 'object') ? this.position : {};

    const maxWidth = Math.max(320, viewportWidth - (gutter * 2));
    const maxHeight = Math.max(240, viewportHeight - (gutter + topGutter));
    const minWidth = Math.min(Math.max(Math.round(defaults.width * 0.6), 420), maxWidth);
    const minHeight = Math.min(Math.max(Math.round(defaults.height * 0.6), 320), maxHeight);

    let width = num(current.width ?? rect.width, defaults.width);
    let height = num(current.height ?? rect.height, defaults.height);
    let left = num(current.left ?? rect.left, defaults.left);
    let top = num(current.top ?? rect.top, defaults.top);
    let changed = false;

    const saneWidth = clamp(num(defaults.width, width), minWidth, maxWidth);
    const saneHeight = clamp(num(defaults.height, height), minHeight, maxHeight);

    if (!Number.isFinite(width) || width < minWidth || width > maxWidth) {
      width = saneWidth;
      changed = true;
    }
    if (!Number.isFinite(height) || height < minHeight || height > maxHeight) {
      height = saneHeight;
      changed = true;
    }

    const maxLeft = Math.max(gutter, viewportWidth - width - gutter);
    const maxTop = Math.max(topGutter, viewportHeight - height - gutter);

    const isOffscreen = (rect.right < gutter)
      || (rect.bottom < topGutter)
      || (rect.left > viewportWidth - gutter)
      || (rect.top > viewportHeight - gutter);

    if (isOffscreen || !Number.isFinite(left) || !Number.isFinite(top)) {
      left = clamp(defaults.left, gutter, maxLeft);
      top = clamp(defaults.top, topGutter, maxTop);
      changed = true;
    } else {
      const clampedLeft = clamp(left, gutter, maxLeft);
      const clampedTop = clamp(top, topGutter, maxTop);
      if (clampedLeft !== left) {
        left = clampedLeft;
        changed = true;
      }
      if (clampedTop !== top) {
        top = clampedTop;
        changed = true;
      }
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
      el.style.left = `${Math.round(left)}px`;
      el.style.top = `${Math.round(top)}px`;
      el.style.width = `${Math.round(width)}px`;
      el.style.height = `${Math.round(height)}px`;
      el.style.minWidth = `${Math.round(minWidth)}px`;
      el.style.minHeight = `${Math.round(minHeight)}px`;
      this.position = { ...(current ?? {}), left, top, width, height };
    } catch (err) {
      this._getLogger().warn?.(`${MODULE_ID}: Window sanity fallback failed`, err);
    }
  }

  // NOTE: removed duplicate close method (cleanup will be handled in the override below)

  _cleanupRenderAbort() {
    try {
      this._renderAbort?.abort();
      this._renderAbort = null;
    } catch {}
  }

  _configureRenderOptions(options = {}) {
    options = super._configureRenderOptions?.(options ?? {}) ?? (options ?? {});
    options.tag ??= this.constructor?.DEFAULT_OPTIONS?.tag ?? 'section';
    options.window = (options.window && typeof options.window === 'object') ? { ...options.window } : {};

    const legacyTitle = options.title ?? this.constructor?.DEFAULT_OPTIONS?.title ?? this.options?.title;
    const legacyIcon = options.icon ?? this.constructor?.DEFAULT_OPTIONS?.icon ?? this.options?.icon;
    const legacyControls = options.controls ?? this.constructor?.DEFAULT_OPTIONS?.controls ?? this.options?.controls;

    const fallbackTitle = String(
      options.window.title
      ?? this.constructor?.DEFAULT_OPTIONS?.window?.title
      ?? this.options?.window?.title
      ?? legacyTitle
      ?? this.constructor?.name
      ?? 'JANUS7'
    );

    options.window.title = fallbackTitle;

    // Foundry 13.351 shows fragile behavior around alias/localize resolution for custom
    // window metadata. Keep JANUS apps intentionally minimal at the window layer and
    // aggressively migrate any legacy root-level metadata away from ApplicationV2.
    delete options.title;
    delete options.icon;
    delete options.controls;
    if (legacyIcon != null && options.window.icon == null) options.window.icon = legacyIcon;
    if (legacyControls != null && options.window.controls == null) options.window.controls = legacyControls;
    delete options.window.icon;
    if (Array.isArray(options.window.controls)) delete options.window.controls;
    return options;
  }

  _getEngine() {
    return this.engine ?? game?.janus7 ?? null;
  }

  /**
   * Safe logger accessor. Falls back to console if engine is not yet available.
   * @returns {import('../../core/logger.js').JanusLogger|Console}
   */
  _getLogger() {
    return this._getEngine()?.core?.logger ?? console;
  }

  _getModuleVersion() {
    try {
      return game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }


  _t(key, fallback = '') {
    try {
      const localized = game?.i18n?.localize?.(key);
      if (!localized || localized === key) return fallback || key;
      return localized;
    } catch {
      return fallback || key;
    }
  }

  _fmt(key, data = {}, fallback = '') {
    try {
      const formatted = game?.i18n?.format?.(key, data);
      if (!formatted || formatted === key) return fallback || key;
      return formatted;
    } catch {
      return fallback || key;
    }
  }

  _handleRenderError(err, context = 'unknown') {
    const logger = this._getLogger();
    logger.error?.(`${MODULE_ID}: Render error in ${context}`, err);
    this._trackLastError(err, context);
    
    // Zentrales Error-Tracking für die gesamte Engine
    try {
      const engine = this._getEngine();
      if (engine?.errors?.record) {
        engine.errors.record('phase6', `UI.${this.constructor.name}.${context}`, err);
      }
    } catch (_e) { /* engine error reporting must not crash the caller */ }

    return this._renderErrorBoundary(err, context);
  }

  _trackLastError(err, context) {
    try {
      const engine = this._getEngine();
      if (!engine?.diagnostics) return;
      
      engine.diagnostics.lastUiError = {
        timestamp: new Date().toISOString(),
        context,
        message: err.message,
        stack: err.stack
      };
    } catch {}
  }

  _renderErrorBoundary(err, context) {
    const stack = String(err?.stack || err?.message || err || 'Unknown error');
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
          <button class="j7-btn" type="button" data-action="toggleErrorDetails" aria-controls="${detailId}" aria-expanded="false">
            <i class="fas fa-code"></i> Technische Details
          </button>
        </div>
        <pre id="${detailId}" class="janus7-pre j7-error-boundary__details" hidden>${this._escape(stack)}</pre>
      </section>
    `;
  }

  _escape(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }


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
      }
      if (action === 'retryRender') {
        ev.preventDefault();
        try {
          await this.refresh?.(true);
        } catch (err) {
          this._getLogger().warn?.(`${MODULE_ID}: retryRender failed`, err);
        }
      }
      if (action === 'toggleErrorDetails') {
        ev.preventDefault();
        const detailsId = target.getAttribute('aria-controls');
        const details = detailsId ? el.querySelector(`#${CSS.escape(detailsId)}`) : null;
        if (!details) return;
        const expanded = target.getAttribute('aria-expanded') === 'true';
        target.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        details.hidden = expanded;
      }
    });
  }

  _scheduleRerender(delay = 60) {
    if (this._rerenderTimer != null) return;
    
    this._rerenderTimer = setTimeout(() => {
      this._rerenderTimer = null;
      try {
        // ApplicationV2.render() returns a Promise; errors thrown during async layout
        // (e.g. setPosition/_updatePosition) will otherwise bypass this try/catch.
        // Also: if the app is not currently rendered, re-rendering is pointless and can
        // trigger Foundry's internal offsetWidth null bug under heavy hook activity.
        if (!this.rendered) return;
        // Guard against Foundry calling ApplicationV2._updatePosition while element is null
        // (can happen if hooks schedule rerenders while the app is closing / detaching).
        const el = this.domElement;
        if (!el || !el.isConnected) return;
        // FIX P3-01: ApplicationV2.render() erwartet ein Options-Objekt, nicht einen boolean.
        const p = this.render({ force: true });
        if (p?.catch) p.catch((err) => this._getLogger().error?.(`${MODULE_ID}: Rerender failed (async)`, err));
      } catch (err) {
        this._getLogger().error?.(`${MODULE_ID}: Rerender failed`, err);
      }
    }, delay);
  }

  /**
   * Compatibility alias used across JANUS UI actions.
   *
   * Historically many apps call `this.refresh()` from action handlers.
   * Foundry v13's ApplicationV2 provides `render()` instead.
   * We keep `refresh()` as a stable alias to avoid scattering UI fixes.
   */
  refresh(force = true) {
    // FIX P3-01: render() auf ApplicationV2 erwartet ein Options-Objekt.
    // 'force' als boolean wird in { force: boolean } gewrapped.
    const opts = (typeof force === 'object' && force !== null) ? force : { force: !!force };
    return this.render?.(opts);
  }
  // ---------------------------------------------------------------------------
  // Phase 6: Reactive UI helpers (Hook-driven refresh)
  // ---------------------------------------------------------------------------

  /**
   * Register and track a Foundry Hook so it can be cleaned up automatically.
   * @param {string} hookName
   * @param {Function} fn
   */
  _registerHook(hookName, fn) {
    this._janusHooks ??= [];
    const id = Hooks.on(hookName, fn);
    this._janusHooks.push({ hookName, id });
    return id;
  }

  /** Remove all hooks registered via _registerHook. */
  _unregisterHooks() {
    if (!this._janusHooks?.length) return;
    for (const h of this._janusHooks) {
      try { Hooks.off(h.hookName, h.id); } catch (_) { /* noop */ }
    }
    this._janusHooks = [];
    // also reset auto-refresh flag so that enableAutoRefresh can re-register hooks on next render
    this._autoRefreshEnabled = false;
  }

  /**
   * Enable automatic (debounced) refresh when any of the given hooks fires.
   * @param {string[]} hookNames
   * @param {number} [delayMs=150]
   */
  enableAutoRefresh(hookNames, delayMs = 150) {
    // Prevent duplicate registration if auto-refresh is already enabled
    if (this._autoRefreshEnabled) return;
    const debounced = foundry.utils.debounce(() => {
      // Avoid rendering when app is closing / element detached
      const el = this.domElement;
      if (!el || !el.isConnected) return;
      this.refresh?.();
    }, delayMs);

    for (const hookName of hookNames) {
      this._registerHook(hookName, () => debounced());
    }
    this._autoRefreshEnabled = true;
  }

  /** @override */
  setPosition(position = {}) {
    const el = this.domElement;
    if (!el?.isConnected) {
      this.position = { ...(this.position ?? {}), ...(position ?? {}) };
      return this.position;
    }
    return super.setPosition(position);
  }

  /** @override */
  async close(options = {}) {
    // Consolidated cleanup: abort ongoing render, unregister hooks and reset flags
    this._cleanupRenderAbort();
    this._unregisterHooks();
    // allow auto refresh registration again next time this is opened
    this._autoRefreshEnabled = false;
    if (this.constructor?._instance === this) this.constructor._instance = null;
    return super.close(options);
  }

}

export default JanusBaseApp;
