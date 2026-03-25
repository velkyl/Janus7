/**
 * @file atmosphere/controller.js
 * @module janus7
 * @phase 5
 *
 * AtmosphereController:
 * - Hybrid-first: Audio läuft nur auf einem Master-Client.
 * - Foundry-Playlist Provider: play/stop Playlists + best-effort Volume/Fade.
 * - Data-driven: Moods kommen aus JSON (data/academy/atmosphere/moods.json).
 * - Bindings:
 *   - Calendar Slot-Phase -> Mood (autoFromCalendar)
 *   - EventTriggered -> Mood (autoFromEvents)
 *   - LocationChanged -> Mood (autoFromLocation)
 */

import { MODULE_ID, MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {object} AtmosphereMoodBinding
 * @property {string|string[]} [phase] Slot-Phase(n), z.B. "Morgen" oder ["Morgen","Vormittag"]
 * @property {string} [eventId] Event-ID (aus events.json / SlotResolver)
 * @property {string|string[]} [eventTag] Event-Tag(s)
 * @property {string} [locationId] Location-ID (aus locations.json)
 */

/**
 * @typedef {object} AtmosphereMood
 * @property {string} id
 * @property {string} [name]
 * @property {string} [playlistRef] UUID | id | Name
 * @property {number} [volume] 0..1 (Mood-spezifisch, wird mit masterVolume multipliziert)
 * @property {{fadeInMs?:number, fadeOutMs?:number}} [transition]
 * @property {AtmosphereMoodBinding} [binding]
 * @property {string[]} [tags]
 */

/**
 * @typedef {object} AtmosphereProvider
 * @property {(playlistRef:string, opts?:object)=>Promise<boolean>} playPlaylist
 * @property {(playlistRef:string, opts?:object)=>Promise<boolean>} stopPlaylist
 * @property {(opts?:object)=>Promise<boolean>} stopAll
 */

/**
 * @typedef {object} JanusAtmosphereControllerParams
 * @property {object} engine
 * @property {object} state JanusStateCore
 * @property {object} logger JanusLogger
 * @property {AtmosphereProvider} provider
 * @property {string} socketChannel
 */


/** @private */
const ATM_SOURCE_PRIORITY = Object.freeze({
  manual: 100,
  event: 90,
  location: 50,
  calendar: 10,
  none: 0,
});

/**
 * @private
 * @param {string|null|undefined} source
 * @returns {number}
 */
function _prio(source) {
  return ATM_SOURCE_PRIORITY[source ?? 'none'] ?? 0;
}

export class JanusAtmosphereController {
  /**
   * @param {JanusAtmosphereControllerParams} params
   */
  constructor({ engine, state, logger, provider, socketChannel }) {
    this.engine = engine;
    this.state = state;
    this.logger = logger;
    this.provider = provider;
    this.socketChannel = socketChannel;

    /** @type {Map<string, AtmosphereMood>} */
    this._moods = new Map();

    /** @private */
    this._overrideTimer = null;
    /** @private */
    this._lastTickAt = 0;
  }

  // -------------------------
  // Public API
  // -------------------------

  /**
   * Destroys the controller: stops the watchdog timer and cleans up internal state.
   * Called during engine shutdown / module reload.
   */
  destroy() {
    this._stopOverrideWatchdog();
    this.logger?.debug?.('Atmosphere: Controller destroyed');
  }

  /**
   * Initialisiert Moods + setzt optional den Master-Client (falls leer).
   */
  async init() {
    if (!this._isEnabled()) return false;

    await this._loadMoods();

    // Auto-assign Master (wenn keiner gesetzt und ich GM bin)
    const master = this._getMasterClientUserId();
    if (!master && game?.user?.isGM) {
      await this.setMasterClient(game.user.id, { broadcast: true });
    }
    await this._startOverrideWatchdog();
    return true;
  }

  /**
   * @param {string|null} userId
   * @param {{broadcast?:boolean}} [opts]
   */
  async setMasterClient(userId = null, opts = {}) {
    if (!game?.user?.isGM) {
      this.logger?.warn?.(`${MODULE_ABBREV} | setMasterClient: nur GM`);
      return false;
    }

    await this.state.transaction(async (s) => {
      s.set('atmosphere.masterClientUserId', userId ?? null);
    });
    // User-facing actions should persist even when autoSave is disabled.
    // This prevents the UI from looking "dead" (changes apply in-memory but vanish on reload).
    await this.state.save({ force: true });

    // Master geändert: Watchdog neu bewerten
    await this._startOverrideWatchdog();

    if (opts.broadcast) {
      this._emitSocket({ type: 'ATM_SET_MASTER', payload: { userId: userId ?? null } });
    }
    return true;
  }

  /**
   * Aktiviert/deaktiviert Calendar-Auto.
   * @param {boolean} enabled
   * @param {{broadcast?:boolean}} [opts]
   */
  async setAutoFromCalendar(enabled, opts = {}) {
    return this._setAutoFlag('atmosphere.autoFromCalendar', !!enabled, opts);
  }

  /**
   * Aktiviert/deaktiviert Event-Auto.
   * @param {boolean} enabled
   * @param {{broadcast?:boolean}} [opts]
   */
  async setAutoFromEvents(enabled, opts = {}) {
    return this._setAutoFlag('atmosphere.autoFromEvents', !!enabled, opts);
  }

  /**
   * Aktiviert/deaktiviert Location-Auto.
   * @param {boolean} enabled
   * @param {{broadcast?:boolean}} [opts]
   */
  async setAutoFromLocation(enabled, opts = {}) {
    return this._setAutoFlag('atmosphere.autoFromLocation', !!enabled, opts);
  }

  /**
   * Setzt die globale Atmosphere-Lautstärke (Multiplier).
   * @param {number} volume 0..1
   * @param {{broadcast?:boolean}} [opts]
   */
  async setMasterVolume(volume, opts = {}) {
    if (!this._isEnabled()) return false;

    const v = Math.max(0, Math.min(1, Number(volume)));
    await this.state.transaction(async (s) => {
      s.set('atmosphere.masterVolume', v);
    });
    // Persist even if global autoSave is disabled (UI action).
    await this.state.save({ force: true });

    if (opts.broadcast) this._emitSocket({ type: 'ATM_SET_MASTER_VOLUME', payload: { volume: v } });

    // Wenn Master und gerade Playlist läuft: runtime update best-effort (re-apply active mood)
    if (this._isMasterClient()) {
      const activeMoodId = this.state.get?.('atmosphere.activeMoodId') ?? null;
      if (activeMoodId) await this.applyMood(activeMoodId, { broadcast: false, force: true });
    }

    return true;
  }

  /**
   * Listet verfügbare Moods.
   * @returns {AtmosphereMood[]}
   */
  listMoods() {
    return Array.from(this._moods.values());
  }

  /**
   * Status-Snapshot (für Debug/Makros).
   * @returns {object}
   */
  status() {
    // Vereinheitlichter Diagnose-Snapshot.
    return {
      // Flag, ob Atmosphere grundsätzlich aktiv ist
      enabled: this._isEnabled(),
      // Ob dieser Client aktuell Master ist
      isMasterClient: this._isMasterClient(),
      // Der UserId des Master-Clients
      masterClientUserId: this._getMasterClientUserId(),
      // Aktive Mood und Playlist
      activeMoodId: this.state.get?.('atmosphere.activeMoodId') ?? null,
      activePlaylistRef: this.state.get?.('atmosphere.activePlaylistRef') ?? null,
      // Quelle der aktuell laufenden Atmosphere (manual/event/location/calendar)
      activeSource: this.state.get?.('atmosphere.activeSource') ?? null,
      // Zeitstempel der letzten Mood-Anwendung bzw. Änderung
      lastAppliedAt: this.state.get?.('atmosphere.lastAppliedAt') ?? null,
      lastChangeAt: this.state.get?.('atmosphere.lastChangeAt') ?? null,
      // Globale Lautstärke (0..1)
      masterVolume: this.state.get?.('atmosphere.masterVolume') ?? 1.0,
      // Auto-Flags
      autoFromCalendar: !!(this.state.get?.('atmosphere.autoFromCalendar')),
      autoFromEvents: !!(this.state.get?.('atmosphere.autoFromEvents')),
      autoFromLocation: !!(this.state.get?.('atmosphere.autoFromLocation')),
      // Paused-Snapshot
      paused: this.state.get?.('atmosphere.paused') ?? { isPaused: false },
      // Aktive Overrides (Event > Location > Calendar)
      overrideMoodId: this.state.get?.('atmosphere.overrideMoodId') ?? null,
      overrideUntil: this.state.get?.('atmosphere.overrideUntil') ?? null,
      overrideSource: this.state.get?.('atmosphere.overrideSource') ?? null,
      // Anti-Flapping Timings
      cooldownMs: this.state.get?.('atmosphere.cooldownMs') ?? 0,
      minDurationMs: this.state.get?.('atmosphere.minDurationMs') ?? 0,
    };
  }

  /**
   * Wendet Mood an (hybrid: broadcast -> Master führt lokal aus).
   * @param {string} moodId
   * @param {{broadcast?:boolean, force?:boolean}} [opts]
   */
  async applyMood(moodId, opts = {}) {
    if (!this._isEnabled()) return false;

    const mood = this._moods.get(moodId);
    if (!mood) {
      this.logger?.warn?.('Atmosphere: Mood nicht gefunden', { moodId });
      return false;
    }

    const broadcast = opts.broadcast ?? true;

    if (broadcast && !this._isMasterClient()) {
      // Request an Master
      this._emitSocket({ type: 'ATM_APPLY_MOOD', payload: { moodId } });
      return true;
    }

    if (!this._isMasterClient()) return false;

    await this._applyMoodLocal(mood, { force: !!opts.force });
    return true;
  }

  /**
   * Spielt Playlist direkt (hybrid: broadcast -> Master).
   * @param {string} playlistRef
   * @param {{broadcast?:boolean, volume?:number, fadeInMs?:number}} [opts]
   */
  async playPlaylist(playlistRef, opts = {}) {
    if (!this._isEnabled()) return false;
    const broadcast = opts.broadcast ?? true;

    if (broadcast && !this._isMasterClient()) {
      this._emitSocket({ type: 'ATM_PLAY_PLAYLIST', payload: { playlistRef, opts: this._sanitizeOpts(opts) } });
      return true;
    }
    if (!this._isMasterClient()) return false;

    return this.provider.playPlaylist(playlistRef, this._sanitizeOpts(opts));
  }

  /**
   * Stoppt Atmosphere komplett (hybrid: broadcast -> Master).
   * @param {{broadcast?:boolean, fadeOutMs?:number, rememberForResume?:boolean}} [opts]
   */
  async stopAll(opts = {}) {
    if (!this._isEnabled()) return false;
    const broadcast = opts.broadcast ?? true;

    if (broadcast && !this._isMasterClient()) {
      this._emitSocket({ type: 'ATM_STOP_ALL', payload: { opts: this._sanitizeOpts(opts) } });
      return true;
    }
    if (!this._isMasterClient()) return false;

    const remember = opts.rememberForResume ?? false;
    if (remember) await this._snapshotPausedState();

    await this.provider.stopAll({ fadeOutMs: opts.fadeOutMs ?? 0 });

    const now = Date.now();

    await this.state.transaction(async (s) => {
      s.set('atmosphere.activeMoodId', null);
      s.set('atmosphere.activePlaylistRef', null);
      s.set('atmosphere.lastAppliedAt', now);
        s.set('atmosphere.lastChangeAt', now);
        s.set('atmosphere.activeSource', opts.source ?? 'manual');
    });
    await this.state.save({ force: true });

    return true;
  }

  /**
   * Pausiert Atmosphere (merkt sich aktuelle Playlist/Mood für Resume).
   * @param {{broadcast?:boolean, fadeOutMs?:number}} [opts]
   */
  async pause(opts = {}) {
    if (!this._isEnabled()) return false;
    const broadcast = opts.broadcast ?? true;

    if (broadcast && !this._isMasterClient()) {
      this._emitSocket({ type: 'ATM_PAUSE', payload: { opts: this._sanitizeOpts(opts) } });
      return true;
    }
    if (!this._isMasterClient()) return false;

    await this._snapshotPausedState();
    await this.provider.stopAll({ fadeOutMs: opts.fadeOutMs ?? 0 });
    // define current timestamp once; previously `now` was undefined here
    const now = Date.now();
    await this.state.transaction(async (s) => {
      s.set('atmosphere.activeMoodId', null);
      s.set('atmosphere.activePlaylistRef', null);
      s.set('atmosphere.lastAppliedAt', now);
      s.set('atmosphere.lastChangeAt', now);
      s.set('atmosphere.activeSource', opts.source ?? 'manual');
    });
    await this.state.save({ force: true });

    return true;
  }

  /**
   * Resumiert Atmosphere (best-effort).
   * @param {{broadcast?:boolean, fadeInMs?:number}} [opts]
   */
  async resume(opts = {}) {
    if (!this._isEnabled()) return false;
    const broadcast = opts.broadcast ?? true;

    if (broadcast && !this._isMasterClient()) {
      this._emitSocket({ type: 'ATM_RESUME', payload: { opts: this._sanitizeOpts(opts) } });
      return true;
    }
    if (!this._isMasterClient()) return false;

    const paused = this.state.get?.('atmosphere.paused') ?? null;
    if (!paused?.isPaused || (!paused?.moodId && !paused?.playlistRef)) {
      this.logger?.warn?.('Atmosphere.resume: Kein paused Snapshot vorhanden');
      return false;
    }

    // Priorität: moodId (damit Volume/Transition korrekt), sonst playlistRef
    if (paused.moodId && this._moods.has(paused.moodId)) {
      await this.applyMood(paused.moodId, { broadcast: false, force: true });
    } else if (paused.playlistRef) {
      await this.playPlaylist(paused.playlistRef, { broadcast: false, fadeInMs: opts.fadeInMs ?? 0 });
    }

    await this.state.transaction(async (s) => {
      s.set('atmosphere.paused', { isPaused: false, moodId: null, playlistRef: null });
    });
    await this.state.save({ force: true });

    return true;
  }

  /**
   * Preview ist lokal (ohne State), aber nur auf Master sinnvoll.
   * @param {string} moodId
   */
  async preview(moodId) {
    if (!this._isEnabled()) return false;
    const mood = this._moods.get(moodId);
    if (!mood) return false;

    if (!this._isMasterClient()) {
      this.logger?.warn?.('Atmosphere.preview: nur auf Master-Client sinnvoll.');
      return false;
    }

    const vol = this._effectiveVolume(mood);
    return this.provider.playPlaylist(mood.playlistRef, { volume: vol, fadeInMs: mood?.transition?.fadeInMs ?? 0 });
  }

  // -------------------------
  // Socket / Hooks
  // -------------------------

  /**
   * Startet/aktualisiert den Override-Watchdog (Master-Client).
   * Prüft periodisch, ob ein Event-Override abgelaufen ist und fällt dann zurück auf Auto-Mood.
   * @internal
   */
  async _startOverrideWatchdog() {
    try {
      // nur Master braucht den Watchdog
      if (!this._isEnabled() || !this._isMasterClient()) {
        this._stopOverrideWatchdog();
        return;
      }

      // bereits aktiv -> nichts ändern
      if (this._overrideTimer) return;

      const intervalMs = 10_000;
      this._overrideTimer = setInterval(async () => {
        try {
          if (!this._isEnabled() || !this._isMasterClient()) {
            this._stopOverrideWatchdog();
            return;
          }
          const overrideMoodId = this.state.get?.('atmosphere.overrideMoodId') ?? null;
          const overrideUntil = this.state.get?.('atmosphere.overrideUntil') ?? null;
          if (!overrideMoodId || !overrideUntil) return;
          if (Date.now() < overrideUntil) return;

          // Override abgelaufen: zurück auf best-auto-mood und Override-Felder leeren
          await this.state.transaction(async (s) => {
            s.set('atmosphere.overrideMoodId', null);
            s.set('atmosphere.overrideUntil', null);
            s.set('atmosphere.overrideSource', null);
          });
          await this.state.save({ force: true });
          await this.applyBestAutoMood({ reason: 'override-expired' });
        } catch (err) {
          this.logger?.warn?.('Atmosphere: Override-Watchdog Fehler', { error: err });
        }
      }, intervalMs);
      this.logger?.debug?.('Atmosphere: Override-Watchdog gestartet', { intervalMs });
    } catch (err) {
      this.logger?.warn?.('Atmosphere: Override-Watchdog konnte nicht gestartet werden', { error: err });
    }
  }

  /** @internal */
  _stopOverrideWatchdog() {
    try {
      if (this._overrideTimer) {
        clearInterval(this._overrideTimer);
        this._overrideTimer = null;
        this.logger?.debug?.('Atmosphere: Override-Watchdog gestoppt');
      }
    } catch {
      // noop
    }
  }

  /**
   * Validiert eingehende Socket-Messages (Best-Effort; Socket ist in Foundry grundsätzlich nicht vertrauenswürdig).
   * @param {any} msg
   * @returns {{ok:boolean, user?:any, reason?:string}}
   * @internal
   */
  _validateSocketMessage(msg) {
    if (!msg || typeof msg !== 'object') return { ok: false, reason: 'msg-not-object' };
    if (typeof msg.type !== 'string' || !msg.type) return { ok: false, reason: 'missing-type' };
    const senderUserId = msg.senderUserId ?? null;
    const user = senderUserId ? game?.users?.get?.(senderUserId) : null;
    if (!user) return { ok: false, reason: 'unknown-sender' };

    // GM-only Commands (alles was Zustand ändert / Master setzt)
    const gmOnly = new Set(['ATM_SET_MASTER', 'ATM_SET_AUTO', 'ATM_APPLY_MOOD', 'ATM_STOP_ALL', 'ATM_PAUSE', 'ATM_RESUME', 'ATM_SET_MASTER_VOLUME']);
    if (gmOnly.has(msg.type) && !user.isGM) return { ok: false, user, reason: 'gm-only' };

    // Einfaches Timestamp-Sanity-Check (gegen Replay-Spam; kein Security-Guarantee)
    const sentAt = Number(msg.sentAt ?? 0) || 0;
    if (sentAt && Math.abs(Date.now() - sentAt) > 5 * 60 * 1000) {
      return { ok: false, user, reason: 'stale-message' };
    }
    return { ok: true, user };
  }

  /**
   * Socket-Handler (wird in phase5.js registriert).
   * @param {any} msg
   * @internal
   */
  async _onSocketMessage(msg) {
    try {
      const v = this._validateSocketMessage(msg);
      if (!v.ok) {
        this.logger?.debug?.('Atmosphere: Socket-Message verworfen', { type: msg?.type, reason: v.reason, senderUserId: msg?.senderUserId });
        return;
      }

      // Location-Broadcast aus LocationsEngine
      if (msg.type === 'JANUS7_LOCATION_CHANGED') {
        const payload = msg.payload ?? {};
        emitHook(HOOKS.LOCATION_CHANGED, payload);
        return;
      }

      switch (msg.type) {
        case 'ATM_SET_MASTER': {
          // Master-Wechsel wird durch World-State gepflegt; refresh.
          try { await this.state.load(); } catch {}
          break;
        }
        case 'ATM_SET_AUTO': {
          try { await this.state.load(); } catch {}
          break;
        }
        case 'ATM_SET_MASTER_VOLUME': {
          // Master-Volume geändert: reload aktuellen State
          try { await this.state.load(); } catch {}
          break;
        }
        case 'ATM_APPLY_MOOD': {
          if (!this._isMasterClient()) return;
          const mood = this._moods.get(msg.payload?.moodId);
          if (!mood) return;
          await this._applyMoodLocal(mood, { force: true, source: 'manual', reason: 'manual-apply' });
          break;
        }
        case 'ATM_PLAY_PLAYLIST': {
          if (!this._isMasterClient()) return;
          const ref = msg.payload?.playlistRef;
          if (!ref) return;
          await this.provider.playPlaylist(ref, msg.payload?.opts ?? {});
          break;
        }
        case 'ATM_STOP_ALL': {
          if (!this._isMasterClient()) return;
          await this.stopAll({ broadcast: false, ...(msg.payload?.opts ?? {}) });
          break;
        }
        case 'ATM_PAUSE': {
          if (!this._isMasterClient()) return;
          await this.pause({ broadcast: false, ...(msg.payload?.opts ?? {}) });
          break;
        }
        case 'ATM_RESUME': {
          if (!this._isMasterClient()) return;
          await this.resume({ broadcast: false, ...(msg.payload?.opts ?? {}) });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      this.logger?.error?.('Atmosphere Socket-Handler Fehler', err);
    }
  }


  // Die status()-Methode ist weiter oben definiert und aggregiert alle relevanten Felder.

  /**
   * Evaluierung der Auto-Quellen nach Priorität (Event > Location > Calendar).
   * Respektiert zeitbasierte Event-Overrides.
   *
   * @param {{reason?:string}} [opts]
   */
  async applyBestAutoMood(opts = {}) {
    if (!this._isEnabled() || !this._isMasterClient()) return false;

    // 1) Aktiver Override?
    const overrideMoodId = this.state.get?.('atmosphere.overrideMoodId') ?? null;
    const overrideUntil = this.state.get?.('atmosphere.overrideUntil') ?? null;
    if (overrideMoodId && overrideUntil && Date.now() < overrideUntil) {
      const mood = this._moods.get(overrideMoodId) ?? null;
      if (mood) {
        await this._applyMoodLocal(mood, { source: 'event', force: false, reason: opts.reason ?? 'override-active' });
        return true;
      }
    }

    // 2) Location
    if (this.state.get?.('atmosphere.autoFromLocation')) {
      const locId = this.state.get?.('academy.currentLocationId') ?? null;
      const mood = locId ? this.resolveMoodForLocation(locId) : null;
      if (mood) {
        await this._applyMoodLocal(mood, { source: 'location', reason: opts.reason ?? 'auto-location' });
        return true;
      }
    }

    // 3) Calendar Slot Phase
    if (this.state.get?.('atmosphere.autoFromCalendar')) {
      const slotRef = this.engine?.academy?.calendar?.getCurrentSlot?.() ?? null;
      const mood = slotRef ? this.resolveMoodForSlot(slotRef) : null;
      if (mood) {
        await this._applyMoodLocal(mood, { source: 'calendar', reason: opts.reason ?? 'auto-calendar' });
        return true;
      }
    }

    return false;
  }

  /**
   * Wird von phase5.js aufgerufen, wenn der Kalender-Slot sich ändert.
   * @param {any} slotRef
   */
  async onCalendarSlotChanged(slotRef) {
    if (!this._isEnabled() || !this._isMasterClient()) return;
    if (!this.state.get?.('atmosphere.autoFromCalendar')) return;

    const mood = this.resolveMoodForSlot(slotRef);
    if (!mood) return;
    await this._applyMoodLocal(mood, { source: 'calendar', reason: 'calendar-change' });
  }

  /**
   * Wird von phase5.js aufgerufen, wenn ein Event getriggert wird.
   * @param {any} payload
   */
  async onEventTriggered(payload) {
    if (!this._isEnabled() || !this._isMasterClient()) return;
    if (!this.state.get?.('atmosphere.autoFromEvents')) return;

    const ev = payload?.event ?? payload;
    const mood = this.resolveMoodForEvent(ev);
    if (!mood) return;

    // Event-Overrides: temporär über Location/Calendar legen
    const now = Date.now();
    const defaultMs = this.state.get?.('atmosphere.eventOverrideMs') ?? 10 * 60 * 1000; // 10min
    const overrideMs = ev?.overrideMs ?? mood?.binding?.overrideMs ?? defaultMs;
    const until = now + Math.max(0, Number(overrideMs) || 0);

    await this.state.transaction(async (s) => {
      s.set('atmosphere.overrideMoodId', mood.id);
      s.set('atmosphere.overrideUntil', until);
      s.set('atmosphere.overrideSource', 'event');
    });
    await this.state.save({ force: true });

    await this._applyMoodLocal(mood, { source: 'event', force: true, reason: 'event-trigger' });
  }

  /**
   * Wird von phase5.js aufgerufen, wenn sich der Ort ändert.
   * @param {any} payload
   */
  async onLocationChanged(payload) {
    if (!this._isEnabled() || !this._isMasterClient()) return;
    if (!this.state.get?.('atmosphere.autoFromLocation')) return;

    const locationId = payload?.locationId ?? payload?.id ?? null;
    const mood = this.resolveMoodForLocation(locationId);
    if (!mood) return;
    await this._applyMoodLocal(mood, { source: 'location', reason: 'location-change' });
  }

  // -------------------------
  // Resolution helpers
  // -------------------------

  /**
   * @param {any} slotRef
   * @returns {AtmosphereMood|null}
   */
  resolveMoodForSlot(slotRef) {
    const slot = (this.engine?.academy?.slotResolver?.resolveSlot?.(slotRef)) ?? slotRef ?? null;
    const phase = slot?.phase ?? slot?.name ?? null;
    if (!phase) return null;

    for (const mood of this._moods.values()) {
      const bind = mood?.binding;
      if (!bind?.phase) continue;
      const phases = Array.isArray(bind.phase) ? bind.phase : [bind.phase];
      if (phases.some((p) => String(p).toLowerCase() === String(phase).toLowerCase())) return mood;
    }
    return null;
  }

  /**
   * @param {any} ev
   * @returns {AtmosphereMood|null}
   */
  resolveMoodForEvent(ev) {
    if (!ev) return null;
    const eventId = ev?.id ?? ev?._id ?? null;
    const tags = Array.isArray(ev?.tags) ? ev.tags : (Array.isArray(ev?.flags?.janus7?.tags) ? ev.flags.janus7.tags : []);

    for (const mood of this._moods.values()) {
      const bind = mood?.binding;
      if (!bind) continue;

      if (bind.eventId && eventId && String(bind.eventId) === String(eventId)) return mood;

      if (bind.eventTag) {
        const wanted = Array.isArray(bind.eventTag) ? bind.eventTag : [bind.eventTag];
        const wantedLower = wanted.map((t) => String(t).toLowerCase());
        const tagLower = tags.map((t) => String(t).toLowerCase());
        if (wantedLower.some((t) => tagLower.includes(t))) return mood;
      }
    }
    return null;
  }

  /**
   * @param {string|null} locationId
   * @returns {AtmosphereMood|null}
   */
  resolveMoodForLocation(locationId) {
    if (!locationId) return null;
    for (const mood of this._moods.values()) {
      const bind = mood?.binding;
      if (bind?.locationId && String(bind.locationId) === String(locationId)) return mood;
    }
    return null;
  }

  // -------------------------
  // internals
  // -------------------------

  _isEnabled() {
    try {
      return !!game?.settings?.get?.(MODULE_ID, 'state')?.features?.atmosphere?.enabled
        || !!this.state?.get?.('features.atmosphere.enabled');
    } catch {
      return false;
    }
  }

  _getMasterClientUserId() {
    try {
      return this.state?.get?.('atmosphere.masterClientUserId') ?? null;
    } catch {
      return null;
    }
  }

  _isMasterClient() {
    const master = this._getMasterClientUserId();
    return !!master && (master === game?.user?.id);
  }

  async _setAutoFlag(path, enabled, opts = {}) {
    if (!game?.user?.isGM) {
      this.logger?.warn?.(`${MODULE_ABBREV} | setAutoFlag: nur GM`);
      return false;
    }

    await this.state.transaction(async (s) => {
      s.set(path, !!enabled);
    });
    await this.state.save({ force: true });

    if (opts.broadcast) this._emitSocket({ type: 'ATM_SET_AUTO', payload: { path, enabled: !!enabled } });
    return true;
  }

  _sanitizeOpts(opts = {}) {
    const out = {};
    for (const k of ['volume', 'fadeInMs', 'fadeOutMs', 'rememberForResume']) {
      if (opts[k] != null) out[k] = opts[k];
    }
    return out;
  }

  _emitSocket(msg) {
    try {
      if (!game?.socket) return;
      const enriched = {
        ...msg,
        senderUserId: game?.user?.id ?? null,
        sentAt: Date.now()
      };
      game.socket.emit(this.socketChannel, enriched);
    } catch (err) {
      this.logger?.warn?.('Atmosphere: socket emit fehlgeschlagen', { error: err });
    }
  }

  _effectiveVolume(mood) {
    const mv = Math.max(0, Math.min(1, Number(this.state.get?.('atmosphere.masterVolume') ?? 1.0)));
    const v = typeof mood?.volume === 'number' ? mood.volume : 1.0;
    return Math.max(0, Math.min(1, Number(v) * mv));
  }

  async _snapshotPausedState() {
    const activeMoodId = this.state.get?.('atmosphere.activeMoodId') ?? null;
    const activePlaylistRef = this.state.get?.('atmosphere.activePlaylistRef') ?? null;

    await this.state.transaction(async (s) => {
      s.set('atmosphere.paused', {
        isPaused: true,
        moodId: activeMoodId,
        playlistRef: activePlaylistRef
      });
    });
    await this.state.save({ force: true });
  }

  /**
   * @param {AtmosphereMood} mood
   * @param {{force?:boolean}} [opts]
   */
  async _applyMoodLocal(mood, opts = {}) {
    const now = Date.now();
    // Special: Mood ohne playlistRef => Stop All ("silence" / no-op)
    if (!mood?.playlistRef) {
      await this.provider.stopAll({ fadeOutMs: mood?.transition?.fadeOutMs ?? 0 });
      await this.state.transaction(async (s) => {
        s.set('atmosphere.activeMoodId', mood.id);
        s.set('atmosphere.activePlaylistRef', null);
        s.set('atmosphere.lastAppliedAt', now);
        s.set('atmosphere.lastChangeAt', now);
        s.set('atmosphere.activeSource', opts.source ?? 'manual');
      });
      await this.state.save({ force: true });
      this.logger?.info?.('Atmosphere: Mood angewendet (StopAll)', { moodId: mood.id });

      // Emit public hook for UI and external consumers
      try {
        emitHook(HOOKS.ATMOSPHERE_CHANGED, {
          moodId: mood.id,
          playlistRef: null,
          source: opts.source ?? 'manual',
          volume: 0,
          reason: opts.reason ?? 'stopAll'
        });
      } catch (err) {
        this.logger?.warn?.('Atmosphere: janus7AtmosphereChanged hook error', err);
      }
      return;
    }

    const currentMoodId = this.state.get?.('atmosphere.activeMoodId') ?? null;

    // Cooldown / Mindestdauer (verhindert Mood-Flapping)
    const lastChangeAt = this.state.get?.('atmosphere.lastChangeAt') ?? 0;
    const activeSource = this.state.get?.('atmosphere.activeSource') ?? null;
    const cooldownMs = Number(this.state.get?.('atmosphere.cooldownMs') ?? 0) || 0;
    const minDurationMs = Number(this.state.get?.('atmosphere.minDurationMs') ?? 0) || 0;

    const newSource = opts.source ?? 'manual';

    // Wenn identisch, raus
    if (!opts.force && currentMoodId === mood.id) return;

    // Cooldown gilt nur, wenn Quelle nicht höher priorisiert ist
    if (!opts.force && cooldownMs > 0 && now - lastChangeAt < cooldownMs && _prio(newSource) <= _prio(activeSource)) {
      this.logger?.debug?.(`${MODULE_ABBREV} | Atmosphere: cooldown active`, { cooldownMs, since: now - lastChangeAt, newSource, activeSource });
      return;
    }

    // Mindestdauer: Mood nicht zu früh wechseln, außer höhere Priorität
    if (!opts.force && minDurationMs > 0 && currentMoodId && now - lastChangeAt < minDurationMs && _prio(newSource) <= _prio(activeSource)) {
      this.logger?.debug?.(`${MODULE_ABBREV} | Atmosphere: minDuration active`, { minDurationMs, since: now - lastChangeAt, newSource, activeSource });
      return;
    }
    const currentPlaylistRef = this.state.get?.('atmosphere.activePlaylistRef') ?? null;

    // Transition: fade out current, then play new with fade in
    const fadeOutMs = mood?.transition?.fadeOutMs ?? 0;
    const fadeInMs = mood?.transition?.fadeInMs ?? 0;

    try {
      if (currentPlaylistRef && currentPlaylistRef !== mood.playlistRef) {
        await this.provider.stopPlaylist(currentPlaylistRef, { fadeOutMs });
      }
    } catch (errStop) {
      this.logger?.warn?.('Atmosphere: stop previous playlist fehlgeschlagen', { error: errStop });
    }

    const vol = this._effectiveVolume(mood);

    const ok = await this.provider.playPlaylist(mood.playlistRef, { volume: vol, fadeInMs });
    if (!ok) return;

    await this.state.transaction(async (s) => {
      s.set('atmosphere.activeMoodId', mood.id);
      s.set('atmosphere.activePlaylistRef', mood.playlistRef);
      s.set('atmosphere.lastAppliedAt', now);
        s.set('atmosphere.lastChangeAt', now);
        s.set('atmosphere.activeSource', opts.source ?? 'manual');

      // clear paused snapshot on explicit apply
      s.set('atmosphere.paused', { isPaused: false, moodId: null, playlistRef: null });
    });
    await this.state.save({ force: true });

    this.logger?.info?.('Atmosphere: Mood angewendet', { moodId: mood.id, playlistRef: mood.playlistRef, volume: vol });

    // Emit public hook for UI (DJ-Tab) and KI-Adapter (Phase 7 prep)
    try {
      emitHook(HOOKS.ATMOSPHERE_CHANGED, {
        moodId: mood.id,
        playlistRef: mood.playlistRef,
        source: opts.source ?? 'manual',
        volume: vol,
        reason: opts.reason ?? 'applyMood'
      });
    } catch (err) {
      this.logger?.warn?.('Atmosphere: janus7AtmosphereChanged hook error', err);
    }
  }

  async _loadMoods() {
    this._moods.clear();
    try {
      const res = await fetch(`modules/${MODULE_ID}/data/academy/atmosphere/moods.json`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.moods;
      if (!Array.isArray(list)) {
        this.logger?.warn?.('Atmosphere: moods.json hat unerwartetes Format.');
        return;
      }
      for (const mood of list) {
        if (!mood?.id) continue;
        this._moods.set(mood.id, mood);
      }

      // Welle 3 Hardening:
      // Der State verwendet historisch "neutral" als Default-Mood. Wenn die JSON-Datei
      // nur "silence" enthält, registrieren wir neutral als Alias, damit DJ-Tab,
      // Restore-Pfade und Autoplay nicht warnen/spammen.
      if (!this._moods.has('neutral')) {
        const silence = this._moods.get('silence');
        if (silence) {
          this._moods.set('neutral', { ...silence, id: 'neutral', name: silence.name ?? 'Neutral' });
        } else {
          this._moods.set('neutral', {
            id: 'neutral',
            name: 'Neutral',
            playlistRef: '',
            transition: { fadeOutMs: 800 },
            tags: ['neutral', 'default'],
          });
        }
      }
    } catch (err) {
      this.logger?.error?.('Atmosphere: moods.json konnte nicht geladen werden', err);
    }
  }
}

export default JanusAtmosphereController;
