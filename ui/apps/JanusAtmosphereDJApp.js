import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusAtmosphereDJApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Atmosphere DJ: Mood-Auswahl, Master-Volume, Auto-Flags, Master-Client-Auswahl.
 * Alle Aktionen gehen über den JanusAtmosphereController (kein direktes State-Mutieren).
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';

/**
 * JanusAtmosphereDJApp
 * MVP: Mood-Auswahl, Auto-Toggles, Master-Volume.
 */
export class JanusAtmosphereDJApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-atmosphere-dj',
    classes: ['janus7-app', 'janus7-atmo-dj'],
    position: { width: 980, height: 720 },
    window: {
      title: 'JANUS7 · Atmosphere DJ',
      resizable: true,
    },
    actions: {
      refresh: JanusAtmosphereDJApp.onRefresh,
      applyMood: JanusAtmosphereDJApp.onApplyMood,
      stopAll: JanusAtmosphereDJApp.onStopAll,
      setVolume: JanusAtmosphereDJApp.onSetVolume,
      toggleAutoCalendar: JanusAtmosphereDJApp.onToggleAutoCalendar,
      toggleAutoEvents: JanusAtmosphereDJApp.onToggleAutoEvents,
      toggleAutoLocation: JanusAtmosphereDJApp.onToggleAutoLocation,
      setMasterClient: JanusAtmosphereDJApp.onSetMasterClient
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/atmosphere-dj.hbs') }
  };

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['janus7AtmosphereChanged', 'janus7StateChanged']);

    const root = this.domElement;
    if (!root) return;

    // Use unified event delegation rather than individual manual bindings
    // Note: buttons usually get caught by ApplicationV2 ACTIONS if data-action exists.
    // However, for inputs/changes, we capture them via a single listener to align with AppV2
    // and keep it clean without relying on querySelector for single items.
    root.addEventListener('change', (ev) => {
      const target = ev.target;
      if (target?.name === 'masterClientUserId') this.constructor.onSetMasterClient.call(this, ev, target);
      if (target?.name === 'autoCalendar') this.constructor.onToggleAutoCalendar.call(this, ev, target);
      if (target?.name === 'autoEvents') this.constructor.onToggleAutoEvents.call(this, ev, target);
      if (target?.name === 'autoLocation') this.constructor.onToggleAutoLocation.call(this, ev, target);
    });

    root.addEventListener('input', (ev) => {
      if (ev.target?.name === 'volume') this.constructor.onSetVolume.call(this, ev, ev.target);
    });
  }


  static async onRefresh(){ this.refresh(); }

  static async onApplyMood(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return ui.notifications.warn('Nur GM darf Atmosphere steuern.');
    const moodId = target?.dataset?.moodId;
    if (!moodId) return;
    try {
      await game.janus7?.atmosphere?.controller?.applyMood?.(moodId, { broadcast: true, force: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 | applyMood failed', err);
      ui.notifications.error(err.message);
    }
  }

  static async onStopAll(event, _target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    try {
      await game.janus7?.atmosphere?.controller?.stopAll?.({ broadcast: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 | stopAll failed', err);
      ui.notifications.error(err.message);
    }
  }

  static async onSetVolume(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;

    const value = Number(target?.value ?? target?.dataset?.value ?? 50);
    const vol = Math.max(0, Math.min(1, value / 100));
    try {
      await game.janus7?.atmosphere?.controller?.setMasterVolume?.(vol, { broadcast: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 | setMasterVolume failed', err);
      ui.notifications.error(err.message);
    }
  }

  static async onToggleAutoCalendar(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    const enabled = target?.checked ?? (target?.dataset?.enabled === 'true');
    try {
      await game.janus7?.atmosphere?.controller?.setAutoFromCalendar?.(!!enabled, { broadcast: true });
    } catch (err) { ui.notifications.error(err.message); }
  }

  static async onToggleAutoEvents(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    const enabled = target?.checked ?? (target?.dataset?.enabled === 'true');
    try {
      await game.janus7?.atmosphere?.controller?.setAutoFromEvents?.(!!enabled, { broadcast: true });
    } catch (err) { ui.notifications.error(err.message); }
  }

  static async onToggleAutoLocation(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    const enabled = target?.checked ?? (target?.dataset?.enabled === 'true');
    try {
      await game.janus7?.atmosphere?.controller?.setAutoFromLocation?.(!!enabled, { broadcast: true });
    } catch (err) { ui.notifications.error(err.message); }
  }

  static async onSetMasterClient(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return;
    const userId = target?.value ?? null;
    try {
      await game.janus7?.atmosphere?.controller?.setMasterClient?.(userId, { broadcast: true });
    } catch (err) { ui.notifications.error(err.message); }
  }

  async _prepareContext(_options) {
    const engine = game.janus7;
    const controller = engine?.atmosphere?.controller;

    if (!engine || !controller) return { notReady: true };

    const moods = controller.listMoods?.() ?? [];
    const status = controller.status?.() ?? {};
    const users = (game.users?.contents ?? []).map(u => ({ id: u.id, name: u.name }));

    const volPct = Math.round(((status.masterVolume ?? status.volume ?? 0.5) * 100));

    const activeMoodId = status.currentMoodId ?? status.activeMood ?? null;

    return {
      notReady: false,
      isGM: game.user?.isGM ?? false,
      activeMoodId,

      moods: moods.map(m => {
        const moodId = m.id ?? m.moodId ?? m.key ?? 'mood';
        return {
          id: moodId,
          name: m.name ?? m.label ?? m.id ?? 'Mood',
          description: m.description ?? '',
          isActive: moodId === activeMoodId
        };
      }),
      status,
      users,
      volPct,
      masterClientUserId: status.masterClientUserId ?? null
    };
  }
}
