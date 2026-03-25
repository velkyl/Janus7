/**
 * Phase 3: DSA5 System Bridge – Konstanten & Defaults
 * @module janus7/bridge/dsa5/constants
 */

export const DSA5_SYSTEM_ID = 'dsa5';

/** Minimal unterstützte Foundry Core-Version (informativ, keine harte Sperre) */
export const MIN_FOUNDRY_CORE = 13;

/** Minimal unterstützte DSA5 System-Version (informativ). */
export const MIN_DSA5_VERSION = '7.0.0';

/**
 * Unterstützte DSA5 Item-Typen (Subclasses laut dsa5 ItemFactory).
 * Diese Liste wird primär für Typ-Guards/Fehlermeldungen verwendet.
 */
export const DSA5_ITEM_TYPES = [
  'ritual',
  'spell',
  'liturgy',
  'ceremony',
  'trait',
  'disease',
  'poison',
  'money',
  'rangeweapon',
  'meleeweapon',
  'combatskill',
  'skill',
  'application',
  'consumable'
];


/**
 * KI-/LLM-Fehler auf kanonische DSA5-Talentnamen abbilden.
 * Keys are matched case-insensitive via lower-case normalization.
 */
export const DSA5_SKILL_ALIASES = {
  wahrnehmung: 'Sinnesschärfe',
  heilkunde: 'Heilkunde Wunden',
  klettern: 'Körperbeherrschung',
  psychologie: 'Menschenkenntnis',
  athletik: 'Körperbeherrschung',
  diplomatie: 'Überreden'
};

/**
 * Gängige DSA5-Grundtalente für UI-Fallbacks und konservative Validierung.
 */
export const DSA5_COMMON_SKILLS = [
  'Sinnesschärfe',
  'Willenskraft',
  'Körperbeherrschung',
  'Überreden',
  'Menschenkenntnis',
  'Magiekunde',
  'Geschichtswissen',
  'Recherchieren',
  'Heilkunde Wunden',
  'Selbstbeherrschung'
];
