import { emitHook, HOOKS } from '../../core/hooks/emitter.js';
/**
 * @file bridge/dsa5/fate.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   DSA5FateBridge: Liest und verwaltet Schicksalspunkte (Schips) von Actors.
 *   Erkennt Schips-Verbrauch über Foundry updateActor-Hook und feuert JANUS7-Hook.
 *
 * DSA5 Schips-Datenstruktur (aus status.js / faterolls.js):
 *
 *   Persönliche Schips (pro Actor):
 *     actor.system.status.fatePoints.value    = Aktuelle Schips (0-N)
 *     actor.system.status.fatePoints.max      = Maximum (aus prepareDerivedData)
 *     actor.system.status.fatePoints.current  = Basis-Schips (ohne Modifier)
 *     actor.system.status.fatePoints.modifier = Modifikator
 *
 *   Gruppen-Schips (World-Setting):
 *     game.settings.get('dsa5', 'groupschips')  → String "current/max", z.B. "3/5"
 *     game.settings.set('dsa5', 'groupschips', "2/5")  → GM-only Reduktion
 *
 *   Schips-Verbrauch im Würfelwurf:
 *     FateRolls.useFateOnRoll(actor, message, type, schipsource)
 *     → ruft intern #reduceSchips() auf
 *     → actor.update({'system.status.fatePoints.value': value - 1})  [personal]
 *     → game.settings.set('dsa5', 'groupschips', ...)                [group]
 *
 *   Erkennung: Kein dedizierter DSA5-Hook für Schips-Verbrauch.
 *   Erkennungsstrategie:
 *     - Personal: Foundry `updateActor` Hook → `system.status.fatePoints.value` sank
 *     - Group: `updateSetting` Hook → `dsa5.groupschips` current sank
 *
 *   Verfügbarkeits-Check (aus utility-dsa5.js):
 *     DSA5_Utility.fateAvailable(actor, isGroup)
 *       Personal: actor.system.status.fatePoints.value > 0
 *       Group:    game.settings.get('dsa5', 'groupschips').split('/')[0] > 0
 *
 * Architektur:
 *   - Kein direkter dsa5-Import.
 *   - Verwendet Foundry-Hooks und actor.update() für alle Mutations.
 *   - Feuert janus7SchipUsed wenn Schip-Verbrauch erkannt wird.
 *   - GM-only für Mutations (awardFatePoint, setFatePoints).
 */

// ─── Quell-Konstanten (aus FateRolls.SCHIP_SOURCES) ──────────────────────────

/** Schips-Quell-Konstanten. Spiegelt FateRolls.SCHIP_SOURCES exakt. */
export const SCHIP_SOURCE = Object.freeze({
  PERSONAL: 0,
  GROUP:    1,
});

// ─── Gruppenschips-Hilfe ─────────────────────────────────────────────────────

/**
 * Liest Gruppen-Schips aus dem DSA5-Setting.
 * @returns {{ value: number, max: number }}
 */
export function readGroupSchips() {
  try {
    const raw = game.settings.get('dsa5', 'groupschips') ?? '0/0';
    const [value, max] = raw.split('/').map(Number);
    return { value: value ?? 0, max: max ?? 0 };
  } catch {
    return { value: 0, max: 0 };
  }
}

/**
 * Schreibt Gruppen-Schips (GM-only).
 * @param {number} value  - Neuer aktueller Wert
 * @param {number} [max]  - Neues Maximum (optional, behält aktuellen Wert)
 * @returns {Promise<void>}
 */
export async function writeGroupSchips(value, max) {
  if (!game.user?.isGM) throw new Error('JANUS7 FateBridge: GM-Rechte erforderlich');
  const current = readGroupSchips();
  const newMax   = max ?? current.max;
  const newValue = Math.max(0, Math.min(newMax, value));
  await game.settings.set('dsa5', 'groupschips', `${newValue}/${newMax}`);
}

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class DSA5FateBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger    = logger ?? console;
    this._hookId   = null;  // updateActor
    this._settingHookId = null; // updateSetting (group schips)

    // Snapshot der letzten bekannten Schips-Werte (für Delta-Erkennung)
    // actorId → fatePoints.value
    this._lastPersonalSchips = new Map();
    // letzte Gruppen-Schips für Delta-Erkennung
    this._lastGroupSchips = null;
  }

  // ─── Lesen ─────────────────────────────────────────────────────────────────

  /**
   * Gibt den vollständigen Schips-Status zurück (persönlich + Gruppe).
   *
   * @param {Actor} [actor]  - Actor für persönliche Schips (optional)
   * @returns {FateStatus}
   *
   * @typedef {Object} FateStatus
   * @property {{ value: number, max: number, available: boolean }} personal
   * @property {{ value: number, max: number, available: boolean }} group
   *
   * @example
   * const status = bridge.fate.getFateStatus(actor);
   * // → { personal: {value: 2, max: 3, available: true}, group: {value: 1, max: 5, available: true} }
   */
  getFateStatus(actor) {
    const personal = actor ? this.getPersonalSchips(actor) : { value: 0, max: 0, available: false };
    const group    = this.getGroupSchips();
    return { personal, group };
  }

  /**
   * Persönliche Schips eines Actors.
   * @param {Actor} actor
   * @returns {{ value: number, max: number, available: boolean }}
   */
  getPersonalSchips(actor) {
    const fp = this._getActorFatePoints(actor);
    if (!fp) return { value: 0, max: 0, available: false };
    const value = Number(fp.value ?? 0);
    const max   = Number(fp.max ?? fp.current ?? 3);
    return { value, max, available: value > 0 };
  }

  /**
   * Gruppen-Schips (World-Setting).
   * @returns {{ value: number, max: number, available: boolean }}
   */
  getGroupSchips() {
    const { value, max } = readGroupSchips();
    return { value, max, available: value > 0 };
  }

  /**
   * Prüft ob ein Actor Schips einsetzen kann.
   *
   * @param {Actor} actor
   * @param {'personal'|'group'} [source='personal']
   * @returns {boolean}
   *
   * @example
   * if (bridge.fate.canUseFate(actor)) {
   *   console.log('Schip verfügbar!');
   * }
   */
  canUseFate(actor, source = 'personal') {
    if (source === 'group') return this.getGroupSchips().available;
    return this.getPersonalSchips(actor).available;
  }

  // ─── Schreiben (GM-only) ───────────────────────────────────────────────────

  /**
   * Vergibt persönliche Schips an einen Actor.
   * Erhöht `system.status.fatePoints.value` um `amount`, Cap bei `.max`.
   *
   * @param {Actor} actor
   * @param {number} [amount=1]
   * @returns {Promise<{ previous: number, next: number }>}
   *
   * @example
   * // GM belohnt Studenten nach herausragender Prüfungsleistung
   * await bridge.fate.awardFatePoint(actor);
   */
  async awardFatePoint(actor, amount = 1) {
    if (!game.user?.isGM) throw new Error('JANUS7 FateBridge: GM-Rechte erforderlich');
    const fp  = this._getActorFatePoints(actor, { required: true, context: 'FateBridge.awardFatePoint' });
    const max = Number(fp.max ?? fp.current ?? 3);
    const prev = Number(fp.value ?? 0);
    const next = Math.min(max, prev + Math.max(0, Math.round(amount)));

    await actor.update({ 'system.status.fatePoints.value': next });
    this.logger?.info?.(
      `JANUS7 | Fate | ${amount} Schip(s) vergeben → ${actor.name} (${prev}→${next})`
    );
    return { previous: prev, next };
  }

  /**
   * Setzt persönliche Schips auf einen bestimmten Wert.
   * @param {Actor} actor
   * @param {number} value  - Neuer Wert (0-max)
   * @returns {Promise<{ previous: number, next: number }>}
   */
  async setFatePoints(actor, value) {
    if (!game.user?.isGM) throw new Error('JANUS7 FateBridge: GM-Rechte erforderlich');
    const fp   = this._getActorFatePoints(actor, { required: true, context: 'FateBridge.setFatePoints' });
    const max  = Number(fp.max ?? fp.current ?? 3);
    const prev = Number(fp.value ?? 0);
    const next = Math.max(0, Math.min(max, Math.round(value)));

    await actor.update({ 'system.status.fatePoints.value': next });
    return { previous: prev, next };
  }

  /**
   * Vergibt Gruppen-Schips (GM-only).
   * @param {number} amount
   * @returns {Promise<{ previous: number, next: number }>}
   */
  async awardGroupFatePoints(amount = 1) {
    const prev = readGroupSchips().value;
    await writeGroupSchips(prev + amount);
    const next = readGroupSchips().value;
    this.logger?.info?.(`JANUS7 | Fate | Gruppen-Schips vergeben: ${prev}→${next}`);
    return { previous: prev, next };
  }

  // ─── Hook-Registrierung ────────────────────────────────────────────────────

  /**
   * Registriert die Erkennungs-Hooks für Schips-Verbrauch.
   * Feuert `janus7SchipUsed` wenn ein Schip eingesetzt wird.
   *
   * @param {object} [opts]
   * @param {string[]} [opts.trackedActorIds]  - Nur diese Actor-IDs überwachen (leer = alle)
   */
  register({ trackedActorIds = [] } = {}) {
    if (this._hookId != null) return;  // Idempotenz: bereits registriert
    this._trackedActorIds = new Set(trackedActorIds);

    // Snapshot initial befüllen
    game.actors?.forEach((actor) => {
      if (actor.system?.status?.fatePoints != null) {
        this._lastPersonalSchips.set(actor.id, Number(actor.system.status.fatePoints.value ?? 0));
      }
    });
    this._lastGroupSchips = readGroupSchips().value;

    // Persönliche Schips: updateActor-Hook
    this._hookId = Hooks.on('updateActor', (actor, changes) => {
      this._onActorUpdate(actor, changes);
    });

    // Gruppen-Schips: updateSetting-Hook
    this._settingHookId = Hooks.on('updateSetting', (setting) => {
      if (setting.key === 'dsa5.groupschips') {
        this._onGroupSchipsUpdate(setting.value);
      }
    });

    this.logger?.info?.('JANUS7 | FateBridge | Hooks registriert');
  }

  unregister() {
    if (this._hookId        != null) { Hooks.off('updateActor',   this._hookId);        this._hookId = null; }
    if (this._settingHookId != null) { Hooks.off('updateSetting', this._settingHookId); this._settingHookId = null; }
    this._lastPersonalSchips.clear();
    this._lastGroupSchips = null;
  }

  // ─── Hook-Handler ─────────────────────────────────────────────────────────

  /**
   * updateActor → persönliche Schips gesunken?
   * @private
   */
  _onActorUpdate(actor, changes) {
    const newValue = foundry.utils.getProperty(changes, 'system.status.fatePoints.value');
    if (newValue == null) return;

    // Tracking-Filter
    if (this._trackedActorIds?.size > 0 && !this._trackedActorIds.has(actor.id)) return;

    const fp = this._getActorFatePoints(actor);
    if (!fp) return;
    const oldValue = this._lastPersonalSchips.get(actor.id) ?? Number(fp.value ?? 0);
    const numNew   = Number(newValue);

    // Schip wurde verbraucht (Wert sank)
    if (numNew < oldValue) {
      const used = oldValue - numNew;
      this.logger?.debug?.(`JANUS7 | Fate | ${actor.name}: -${used} Schip(s) (${oldValue}→${numNew})`);

      try {
        emitHook(HOOKS.SCHIP_USED, {
          actorId:   actor.id,
          actorUuid: actor.uuid,
          actorName: actor.name,
          source:    SCHIP_SOURCE.PERSONAL,
          used,
          previous:  oldValue,
          next:      numNew,
          remaining: numNew,
          worldTime: game.time?.worldTime ?? 0,
        });
      } catch (err) {
        this.logger?.warn?.('JANUS7 | Fate | janus7SchipUsed-Hook fehlgeschlagen', err);
      }
    }

    // Snapshot aktualisieren (auch bei Erhöhung, z.B. GM-Award)
    this._lastPersonalSchips.set(actor.id, numNew);
  }

  /**
   * updateSetting → Gruppen-Schips gesunken?
   * @private
   */
  _onGroupSchipsUpdate(rawValue) {
    try {
      const [current] = String(rawValue ?? '0/0').split('/').map(Number);
      const prev = this._lastGroupSchips ?? current;

      if (current < prev) {
        const used = prev - current;
        this.logger?.debug?.(`JANUS7 | Fate | Gruppen-Schips: -${used} (${prev}→${current})`);
        emitHook(HOOKS.SCHIP_USED, {
          actorId:   null,
          actorUuid: null,
          actorName: null,
          source:    SCHIP_SOURCE.GROUP,
          used,
          previous:  prev,
          next:      current,
          remaining: current,
          worldTime: game.time?.worldTime ?? 0,
        });
      }

      this._lastGroupSchips = current;
    } catch (err) {
      this.logger?.warn?.('JANUS7 | Fate | updateSetting-Handler fehlgeschlagen', err);
    }
  }

  /**
   * Gibt alle aktuellen Schips-Snapshots zurück (diagnostisch).
   * @returns {Map<string, number>}
   */
  getSnapshot() {
    return new Map(this._lastPersonalSchips);
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  /**
   * Extrahiert den fatePoints-Datenblock eines Actors.
   * @private
   * @param {Actor} actor
   * @param {{required?: boolean, context?: string}} [opts]
   * @returns {object|null}
   */
  _getActorFatePoints(actor, { required = false, context = '' } = {}) {
    const fp = actor?.system?.status?.fatePoints;
    if (!fp && required) {
      const msg = `[JANUS7][FateBridge] ${context}: Actor ${actor?.name ?? '<unbekannt>'} hat keine fatePoints Daten (DSA5 Datendrift?)`;
      this.logger?.warn?.(msg);
      throw new Error(msg);
    }
    return fp ?? null;
  }
}
