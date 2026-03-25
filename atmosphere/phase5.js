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
import { HOOKS } from '../core/hooks/topics.js';
import { cleanupEngineHookBucket, registerEngineHook, registerRuntimeHook } from '../core/hooks/runtime.js';
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

registerRuntimeHook('janus7:ready:atmosphere-phase5', HOOKS.ENGINE_READY, (engine) => {
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

    cleanupEngineHookBucket(engine, '_atmosphereHookIds');

    // Calendar-Auto-Moods: reagiert nur auf dem Master-Client
    try {
      registerEngineHook(engine, '_atmosphereHookIds', HOOKS.DATE_CHANGED, async (payload) => {
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
      logger?.warn?.('Atmosphere: janus7.date.changed Hook nicht registriert', errHook);
    }

    // Event->Mood Auto: canonical event hook from the event engine.
    try {
      registerEngineHook(engine, '_atmosphereHookIds', HOOKS.EVENT_SHOWN, (payload) => controller.onEventTriggered(payload));
    } catch (errHook) {
      logger?.warn?.('Atmosphere: janus7.event.shown Hook nicht registriert', errHook);
    }

    // Location->Mood Auto: canonical location change hook.
    try {
      registerEngineHook(engine, '_atmosphereHookIds', HOOKS.LOCATION_CHANGED, (payload) => controller.onLocationChanged(payload));
    } catch (errHook) {
      logger?.warn?.('Atmosphere: janus7.location.changed Hook nicht registriert', errHook);
    }

    // Auto-init (harmlos, no-op wenn disabled)
    controller.init().catch((err) => logger?.error?.('Atmosphere init() fehlgeschlagen', err));
  } catch (err) {
    (engine?.core?.logger ?? console).error?.('[JANUS7] Phase 5 Registrierung fehlgeschlagen', err);
    // no hard fail: Phase 5 darf die Engine nicht blockieren
  }
});
