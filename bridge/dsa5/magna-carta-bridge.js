/**
 * @file bridge/dsa5/magna-carta-bridge.js
 * @module janus7/bridge
 * @description Bridges Janus7 context (location, time, weather) to the Magna Carta module.
 */

import { HOOKS } from '../../core/hooks/emitter.js';
import { DSA5RegionalProvider } from './module-scanner.js';

export class MagnaCartaBridge {
  constructor({ engine, logger } = {}) {
    this.engine = engine;
    this.logger = logger ?? console;
    this._registered = false;
  }

  /**
   * Registers hooks to listen for Janus7 state changes and forward them to Magna Carta.
   */
  register() {
    if (this._registered) return;
    this._registered = true;

    // Listen for Janus7 Engine Readiness
    Hooks.on(HOOKS.ENGINE_READY, () => this._syncCurrentState());

    // Listen for Time changes
    Hooks.on(HOOKS.TIME_SLOT_CHANGED, () => this._syncCurrentState());
    Hooks.on(HOOKS.DATE_CHANGED, () => this._syncCurrentState());

    // Listen for Location changes
    Hooks.on(HOOKS.LOCATION_CHANGED, () => this._syncCurrentState());

    this.logger.info('[JANUS7][MagnaCarta] Bridge registered.');
  }

  /**
   * Pushes the current Janus7 context to Magna Carta via custom hooks or global flags.
   */
  _syncCurrentState() {
    const engine = this.engine || game.janus7;
    if (!engine) return;

    const state = engine.state?.getSnapshot?.() ?? {};
    const academyData = engine.academy?.data;
    
    // 1. Identify Location
    const activeLocationId = state.activeLocation;
    const locationData = activeLocationId ? academyData?.getLocation?.(activeLocationId) : null;
    
    // 2. Identify Time/Phase
    const timeRef = engine.calendar?.getCurrentSlotRef?.() ?? {};

    const context = {
      locationId: activeLocationId,
      locationName: locationData?.name ?? 'Unknown',
      region: this._detectRegion(activeLocationId, locationData),
      time: {
        day: timeRef.dayName,
        phase: timeRef.slotName, // e.g. "Morgens", "Mittag"
        isDay: !['Abends', 'Nachts'].includes(timeRef.slotName),
        isNight: timeRef.slotName === 'Nachts'
      },
      weather: state.currentWeather ?? 'clear',
      mood: locationData?.defaultMoodKey ?? 'neutral'
    };

    this.logger.debug('[JANUS7][MagnaCarta] Syncing context:', context);

    // Trigger the hook that Magna Carta (or other atmosphere modules) can listen to
    Hooks.callAll('janus7:atmosphere:sync', context);
    
    // Optional: If Magna Carta has a specific API, we could call it directly here
    if (globalThis.MagnaCarta) {
       // e.g. globalThis.MagnaCarta.applyContext(context);
    }
  }

  _detectRegion(locId, locData) {
    if (locData?.region) return locData.region;
    
    // Fallback: Check Module Scanner for regional modules
    const scanner = game.janus7?.bridge?.dsa5?.scanner;
    if (scanner) {
       const regionalProviders = scanner.getProvidersByType(DSA5RegionalProvider) || 
                                 Array.from(scanner.providers.values()).filter(p => typeof p.getRegionKey === 'function');
       // Simple heuristic: if we are in a place that matches a regional module name
       for (const p of regionalProviders) {
         const region = p.getRegionKey();
         if (locId?.toLowerCase().includes(region) || locData?.name?.toLowerCase().includes(region)) {
           return region;
         }
       }
    }
    
    return 'central';
  }
}
