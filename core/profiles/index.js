/**
 * @file core/profiles/index.js
 * @module janus7
 * @phase 8
 *
 * Purpose:
 * Profile Registry for Multi-Setting support.
 * Manages specialized data for different academy locations.
 */

import { JanusConfig } from '../config.js';

/**
 * Canonical profile identifiers supported by the academy registry.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PROFILES = {
  PUNIN: 'punin',
  FESTUM: 'festum',
  LOWANGEN: 'lowangen',
  CUSTOM: 'custom'
};

/**
 * @typedef {Object} JanusAcademyProfile
 * @property {string} id
 * @property {string} name
 * @property {string} locationId
 * @property {Object} meta
 */

const PUNIN_PROFILE = {
  id: PROFILES.PUNIN,
  name: 'Akademie der Geistigen Kraft (Punin)',
  locationId: 'punin_akademie',
  meta: {
    region: 'Almadien',
    focus: 'Verständigung, Antimagie, Metamagie'
  }
};

const FESTUM_PROFILE = {
  id: PROFILES.FESTUM,
  name: 'Akademie von Licht und Dunkelheit (Festum)',
  locationId: 'festum_akademie',
  meta: {
    region: 'Bornland',
    focus: 'Elementarismus, Telekinese'
  }
};

const PROFILES_MAP = {
  [PROFILES.PUNIN]: PUNIN_PROFILE,
  [PROFILES.FESTUM]: FESTUM_PROFILE
};

/**
 * Resolves the active academy profile and exposes the supported profiles list.
 */
export class JanusProfileRegistry {
  /**
   * Returns the currently active profile based on JanusConfig.
   * @returns {JanusAcademyProfile}
   */
  static getActive() {
    const activeId = JanusConfig.get('activeProfile') || PROFILES.PUNIN;
    return PROFILES_MAP[activeId] || PUNIN_PROFILE;
  }

  /**
   * Returns all available profiles for UI choice.
   * @returns {JanusAcademyProfile[]}
   */
  static list() {
    return Object.values(PROFILES_MAP);
  }
}
