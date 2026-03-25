/**
 * @file bridges/foundry/SceneRegionsBridge.mjs
 * @module janus7
 * @phase services
 *
 * Zweck:
 * Verbindet Foundry v13 Scene Regions mit JANUS7-Location-State.
 *
 * Architektur:
 * - Lauscht auf Foundry-Hooks `tokenEnterRegion` / `tokenExitRegion`.
 * - Liest `region.flags.janus7.locationId` (SSOT: per Region in Foundry gesetzt).
 * - Delegiert auf `engine.academy.locations.setCurrentLocation()`.
 * - Feuert `janus7.location.changed` via emitHook (→ Legacy alias `janus7LocationChanged`).
 * - Kein direktes state.set — LocationsEngine ist der Owner.
 *
 * Foundry v13 Region-Hook-Signaturen:
 *   tokenEnterRegion(token, region)
 *   tokenExitRegion(token, region)
 *   tokenAnimateRegion(token, region)
 *
 * Flags-Schema (auf RegionDocument setzen):
 *   region.setFlag('janus7', 'locationId', 'LOC_GROSSE_AULA')
 *
 * Alternativ: Region-Name = Location-ID (Fallback wenn kein Flag gesetzt).
 *
 * Registrierung:
 *   Wird in scripts/janus.mjs unter dem 'ready'-Hook instanziiert und
 *   per register() aktiviert. Kein Autostart.
 */

import { emitHook, HOOKS } from '../../core/hooks/emitter.js';

export class SceneRegionsBridge {
  /**
   * @param {object} engine - game.janus7
   */
  constructor(engine) {
    /** @private */
    this._engine = engine;
    /** @private Registrierte Foundry-Hook-IDs für sauberes unregister() */
    this._hookIds = [];
    /** @private Letzter gesetzter Location-ID (Debounce: verhindert Doppel-Trigger) */
    this._lastLocationId = null;
  }

  /**
   * Aktiviert die Region-Listener.
   * Idempotent: Mehrfachaufruf registriert nicht doppelt.
   */
  register() {
    if (this._hookIds.length > 0) return; // bereits registriert

    const enterId = Hooks.on('tokenEnterRegion', this._onEnter.bind(this));
    const exitId  = Hooks.on('tokenExitRegion',  this._onExit.bind(this));

    this._hookIds = [enterId, exitId];

    const log = this._engine?.core?.logger;
    log?.info?.('[JANUS7][SceneRegionsBridge] Registriert (tokenEnterRegion / tokenExitRegion)');
  }

  /**
   * Deaktiviert die Region-Listener (z.B. beim Modul-Unload).
   */
  unregister() {
    for (const id of this._hookIds) {
      Hooks.off('tokenEnterRegion', id);
      Hooks.off('tokenExitRegion',  id);
    }
    this._hookIds = [];
    this._lastLocationId = null;
  }

  // ── Private Handler ──────────────────────────────────────────────────────

  /**
   * Token betritt eine Region.
   * Setzt die JANUS7-Location wenn die Region ein `janus7.locationId`-Flag trägt.
   *
   * @param {TokenDocument} token
   * @param {RegionDocument} region
   */
  async _onEnter(token, region) {
    if (!game.user.isGM) return; // Nur GM mutiert Welt-State

    const locationId = this._resolveLocationId(region);
    if (!locationId) return;

    // Debounce: gleiche Location nicht doppelt setzen
    if (locationId === this._lastLocationId) return;
    this._lastLocationId = locationId;

    const log = this._engine?.core?.logger;
    log?.debug?.('[JANUS7][SceneRegionsBridge] Token betritt Region', {
      token:      token?.name ?? token?.id,
      region:     region?.name ?? region?.id,
      locationId,
    });

    try {
      const locations = this._engine?.academy?.locations;
      if (locations?.setCurrentLocation) {
        await locations.setCurrentLocation(locationId);
      } else {
        // Fallback: direkte State-Mutation wenn LocationsEngine nicht geladen
        this._engine?.core?.state?.set?.('academy.currentLocationId', locationId);
        await this._engine?.core?.state?.save?.();
        const loc = this._engine?.academy?.data?.getLocation?.(locationId) ?? null;
        emitHook(HOOKS.LOCATION_CHANGED, { locationId, location: loc, source: 'region' });
      }
      log?.info?.('[JANUS7][SceneRegionsBridge] Location gesetzt', { locationId, region: region?.name });
    } catch (err) {
      log?.error?.('[JANUS7][SceneRegionsBridge] _onEnter fehlgeschlagen', { locationId, error: err });
    }
  }

  /**
   * Token verlässt eine Region.
   * Setzt Location auf null wenn kein anderer Location-Token mehr aktiv ist.
   *
   * @param {TokenDocument} token
   * @param {RegionDocument} region
   */
  async _onExit(token, region) {
    if (!game.user.isGM) return;

    const locationId = this._resolveLocationId(region);
    if (!locationId) return;

    // Nur resetten wenn das die aktuell gesetzte Location war
    const current = this._engine?.academy?.locations?.getCurrentLocationId?.()
      ?? this._engine?.core?.state?.get?.('academy.currentLocationId');
    if (current !== locationId) return;

    const log = this._engine?.core?.logger;
    log?.debug?.('[JANUS7][SceneRegionsBridge] Token verlässt Region', {
      token:      token?.name ?? token?.id,
      region:     region?.name ?? region?.id,
      locationId,
    });

    // Nur zurücksetzen wenn noch kein anderer Token in einer Location-Region ist
    const activeTokenInOtherRegion = this._findActiveLocationToken(token, locationId);
    if (activeTokenInOtherRegion) return;

    this._lastLocationId = null;

    try {
      const locations = this._engine?.academy?.locations;
      if (locations?.setCurrentLocation) {
        await locations.setCurrentLocation(null);
      } else {
        this._engine?.core?.state?.set?.('academy.currentLocationId', null);
        await this._engine?.core?.state?.save?.();
        emitHook(HOOKS.LOCATION_CHANGED, { locationId: null, location: null, source: 'region' });
      }
    } catch (err) {
      log?.error?.('[JANUS7][SceneRegionsBridge] _onExit fehlgeschlagen', { locationId, error: err });
    }
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * Liest die JANUS7-LocationId aus einem RegionDocument.
   *
   * Priorität:
   * 1. `region.flags.janus7.locationId`
   * 2. Region-Name === Location-ID (Konvention)
   * 3. `region.name` mapped via AcademyData sceneKey-Reverse-Lookup
   *
   * @param {RegionDocument} region
   * @returns {string|null}
   */
  _resolveLocationId(region) {
    if (!region) return null;

    // 1. Explizites Flag (bevorzugt)
    const flagId = region.getFlag?.('janus7', 'locationId');
    if (flagId && typeof flagId === 'string') return flagId;

    const academyData = this._engine?.academy?.data;

    // 2. Region-Name === Location-ID
    const name = region.name ?? '';
    if (name.startsWith('LOC_')) return name;

    // 3. Reverse-Lookup: sceneKey aus Region-Name / Region-System-Feld
    const sceneKey = region.getFlag?.('janus7', 'sceneKey') ?? name;
    if (sceneKey && academyData?.listLocations) {
      const allLocs = academyData.listLocations();
      const match = allLocs.find((l) => l?.foundry?.sceneKey === sceneKey);
      if (match?.id) return match.id;
    }

    return null;
  }

  /**
   * Prüft ob noch ein anderer sichtbarer Token (PC/NNPC) in einer Location-Region ist.
   * Vereinfachte Heuristik: prüft nur ob `_lastLocationId` bereits aufgegeben wurde.
   *
   * @param {TokenDocument} exitingToken
   * @param {string} exitingLocationId
   * @returns {boolean}
   * @private
   */
  _findActiveLocationToken(exitingToken, exitingLocationId) {
    // Ohne canvas.tokens können wir nicht zuverlässig prüfen
    if (!globalThis.canvas?.tokens?.placeables) return false;

    const allTokens = canvas.tokens.placeables.filter(
      (t) => t.document !== exitingToken && t.actor?.type === 'character'
    );

    for (const t of allTokens) {
      // Prüfe ob Token in einer Region mit derselben locationId sitzt
      for (const region of (canvas.regions?.placeables ?? [])) {
        if (region.document.bounds?.contains?.(t.center)) {
          const lid = this._resolveLocationId(region.document);
          if (lid === exitingLocationId) return true;
        }
      }
    }
    return false;
  }
}

export default SceneRegionsBridge;
