/**
 * @file academy/locations-engine.js
 * @module janus7
 * @phase 5
 *
 * Zweck:
 *  Minimaler Locations-Controller für Hybrid/Atmosphere-Bindings.
 *
 * Architektur:
 *  - SSOT: speichert nur `academy.currentLocationId` im JanusStateCore.
 *  - Entkoppelt: feuert Hook `janus7LocationChanged` für optionale Konsumenten (Atmosphere, UI, Chat, ...).
 *  - Keine UI-Abhängigkeiten.
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

export class JanusLocationsEngine {
  /**
   * @param {object} params
   * @param {import('./data-api.js').AcademyDataApi} params.academyData
   * @param {import('../core/state-core.js').JanusStateCore} params.state
   * @param {import('../core/logger.js').JanusLogger} params.logger
   */
  constructor({ academyData, state, logger }) {
    this.academyData = academyData;
    this.state = state;
    this.logger = logger;
  }

  /**
   * @returns {string|null}
   */
  _normalizeLocationId(locationId) {
    if (locationId == null) return null;
    const raw = String(locationId).trim();
    if (!raw) return null;
    const knownIds = new Set((this.listLocations() ?? []).map((loc) => loc?.id).filter(Boolean));
    if (knownIds.has(raw)) return raw;
    if (/^loc_/i.test(raw) && !/^LOC_/.test(raw)) return null;
    return knownIds.size ? null : raw;
  }

  getCurrentLocationId() {
    try {
      const raw = this.state?.get?.('academy.currentLocationId') ?? null;
      return this._normalizeLocationId(raw);
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | getCurrentLocationId() fehlgeschlagen`, { error: err });
      return null;
    }
  }

  /**
   * @returns {any|null}
   */
  getCurrentLocation() {
    const id = this.getCurrentLocationId();
    if (!id) return null;
    return this.academyData?.getLocation?.(id) ?? null;
  }

  /**
   * Setzt den aktuellen Ort (SSOT) und feuert Hook `janus7LocationChanged`.
   *
   * @param {string|null} locationId
   * @param {object} [opts]
   * @param {boolean} [opts.broadcast=false] Wenn true, sendet zusätzlich `janus7LocationChanged` an alle Clients (Hooks sind lokal).
   */
  async setCurrentLocation(locationId, opts = {}) {
    const { broadcast = false } = opts;

    try {
      const normalizedLocationId = this._normalizeLocationId(locationId);
      await this.state.transaction(async (s) => {
        s.set('academy.currentLocationId', normalizedLocationId ?? null);
      });
      await this.state.save();

      const payload = {
        locationId: normalizedLocationId ?? null,
        location: normalizedLocationId ? (this.academyData?.getLocation?.(normalizedLocationId) ?? null) : null
      };

      emitHook(HOOKS.LOCATION_CHANGED, payload);

      if (broadcast && globalThis.game?.socket) {
        // Broadcast über JANUS7-Socket (Phase5 Atmosphere nutzt denselben Kanal und kann darauf reagieren)
        globalThis.game.socket.emit(`module.janus7`, { type: 'JANUS7_LOCATION_CHANGED', payload });
      }

      this.logger?.info?.(`${MODULE_ABBREV} | Location gesetzt`, payload);
      return true;
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | setCurrentLocation() fehlgeschlagen`, { locationId, error: err });
      return false;
    }
  }

  /**
   * @returns {any[]}
   */
  listLocations() {
    try {
      return this.academyData?.listLocations?.() ?? [];
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | listLocations() fehlgeschlagen`, { error: err });
      return [];
    }
  }
}

export default JanusLocationsEngine;
