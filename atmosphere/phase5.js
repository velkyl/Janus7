/**
 * @file atmosphere/phase5.js
 * @module janus7
 * @phase 5
 *
 * Zweck:
 *  Registriert die Hybrid-/Atmosphere-Schicht (Foundry-Playlist MVP).
 *
 * Architektur:
 *  - Hängt sich an den Custom-Hook `janus7Ready`, der in core/index.js nach erfolgreichem
 *    `engine.ready()` gefeuert wird.
 *  - Keine UI-Seiteneffekte (UI kommt in Phase 6).
 *  - Graceful Degradation: Wenn Atmosphere deaktiviert ist, macht der Controller nichts.
 */

import { MODULE_ID } from '../core/common.js';
import { JanusAtmosphereController } from './controller.js';
import { FoundryPlaylistProvider } from './providers/foundry-playlist-provider.js';

const SOCKET_CHANNEL = `module.${MODULE_ID}`;

/**
 * Socket-Payloads für Atmosphere.
 * @typedef {object} AtmosphereSocketMessage
 * @property {'ATM_APPLY_MOOD'|'ATM_PLAY_PLAYLIST'|'ATM_STOP_ALL'|'ATM_SET_MASTER'} type
 * @property {object} payload
 * @property {string} [senderUserId]
 * @property {string} [senderUserName]
 */

Hooks.on('janus7Ready', (engine) => {
  try {
    const logger = engine?.core?.logger;
    const state = engine?.core?.state;

    if (!engine?.atmosphere) engine.atmosphere = {};

    const provider = new FoundryPlaylistProvider({ logger });
    const controller = new JanusAtmosphereController({
      engine,
      state,
      logger,
      provider,
      socketChannel: SOCKET_CHANNEL
    });

    engine.atmosphere.controller = controller;

    // Convenience API: game.janus7.atmosphere.*
    engine.atmosphere.init = (opts = {}) => controller.init(opts);
    engine.atmosphere.setMasterClient = (userId = null, opts = {}) => controller.setMasterClient(userId, opts);
    engine.atmosphere.applyMood = (moodId, opts = {}) => controller.applyMood(moodId, opts);
    engine.atmosphere.playPlaylist = (playlistRef, opts = {}) => controller.playPlaylist(playlistRef, opts);
    engine.atmosphere.stopAll = (opts = {}) => controller.stopAll(opts);
    engine.atmosphere.setAutoFromCalendar = (enabled, opts = {}) => controller.setAutoFromCalendar(enabled, opts);
    engine.atmosphere.setAutoFromEvents = (enabled, opts = {}) => controller.setAutoFromEvents(enabled, opts);
    engine.atmosphere.setAutoFromLocation = (enabled, opts = {}) => controller.setAutoFromLocation(enabled, opts);
    engine.atmosphere.setMasterVolume = (volume, opts = {}) => controller.setMasterVolume(volume, opts);
    engine.atmosphere.pause = (opts = {}) => controller.pause(opts);
    engine.atmosphere.resume = (opts = {}) => controller.resume(opts);

    engine.atmosphere.listMoods = () => controller.listMoods();
    engine.atmosphere.status = () => controller.status();
    engine.atmosphere.applyBestAutoMood = (opts = {}) => controller.applyBestAutoMood(opts);

    engine.atmosphere.preview = (moodId, opts = {}) => controller.preview(moodId, opts);

    // Socket wiring
    if (game?.socket) {
      game.socket.on(SOCKET_CHANNEL, (msg) => controller._onSocketMessage(msg));
      logger?.debug?.('Atmosphere Socket registriert', { channel: SOCKET_CHANNEL });
    } else {
      logger?.warn?.('Atmosphere: game.socket nicht verfügbar – Hybrid-Routing deaktiviert.');
    }


    // Calendar-Auto-Moods: reagiert nur auf dem Master-Client
    try {
      const HooksRef = globalThis.Hooks;
      HooksRef?.on?.('janus7DateChanged', async (payload) => {
        try {
          const st = controller.status();
          if (!st.enabled) return;
          if (!st.autoFromCalendar) return;
          if (!st.isMaster) return;

          const slot = payload?.current ?? payload?.slot ?? null;
          const mood = controller.resolveMoodForSlot(slot);
          if (!mood) return;

          if (st.activeMoodId === mood.id) return;
          await controller.applyMood(mood.id, { force: true, broadcast: false, reason: 'calendarAuto' });
        } catch (errInner) {
          logger?.error?.('Atmosphere Calendar-Auto Fehler', errInner);
        }
      });
    } catch (errHook) {
      logger?.warn?.('Atmosphere: janus7DateChanged Hook nicht registriert', errHook);
    }

    // Event->Mood Auto: janus7EventTriggered (Phase 4 Event-Runner)
    try {
      const HooksRef = globalThis.Hooks;
      const eventHandler = (payload) => controller.onEventTriggered(payload);
      const id = HooksRef?.on?.('janus7EventTriggered', eventHandler);
      if (id) engine._phase5HookIds = (engine._phase5HookIds || []).concat([{ name: 'janus7EventTriggered', id }]);
    } catch (errHook) {
      logger?.warn?.('Atmosphere: janus7EventTriggered Hook nicht registriert', errHook);
    }

    // Location->Mood Auto: janus7LocationChanged (Phase 5 LocationsEngine oder UI)
    try {
      const HooksRef = globalThis.Hooks;
      const locHandler = (payload) => controller.onLocationChanged(payload);
      const id = HooksRef?.on?.('janus7LocationChanged', locHandler);
      if (id) engine._phase5HookIds = (engine._phase5HookIds || []).concat([{ name: 'janus7LocationChanged', id }]);
    } catch (errHook) {
      logger?.warn?.('Atmosphere: janus7LocationChanged Hook nicht registriert', errHook);
    }

    // Auto-init (harmlos, no-op wenn disabled)
    controller.init().catch((err) => logger?.error?.('Atmosphere init() fehlgeschlagen', err));
  } catch (err) {
    (logger ?? console).error?.('[JANUS7] Phase 5 Registrierung fehlgeschlagen', err);
    // no hard fail: Phase 5 darf die Engine nicht blockieren
  }
});
