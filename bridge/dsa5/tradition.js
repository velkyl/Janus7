/**
 * @file bridge/dsa5/tradition.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   Liest die magische Tradition eines DSA5-Actors aus und mappt sie
 *   auf einen JANUS7-Zirkel (circleId).
 *
 * Datenquellen (Priorität absteigende):
 *   1. actor.system.magic.tradition.magical  (MagicTemplate StringField)
 *   2. actor.items → specialability mit category 'magical' oder 'magicalStyle'
 *      deren Name mit "Tradition" beginnt
 *   3. actor.system.magic.feature.magical    (Merkmal, Fallback-Hinweis)
 *
 * Mapping:
 *   DSA5-Traditions-String → circleId  via injizierte `mapping`-Tabelle
 *   (Standard-Mapping aus tradition-circle-map.json; überschreibbar per DI).
 *
 * Architektur:
 *   - Read-only. Keine Mutations.
 *   - Kein direkter Import von dsa5-Interna — nur actor.system.* und actor.items.
 *   - Defensive: immer null statt throw wenn Feld fehlt oder leer.
 */

import { DSA5ResolveError } from './errors.js';

// ─── Pfad-Konstanten (DSA5 DataModel, magic.js) ──────────────────────────────

/**
 * Kanonische Pfade für magic-Felder.
 * Quelle: modules/data/actor/templates/magic.js
 *
 * @type {Record<string, string>}
 */
export const DSA5_MAGIC_PATHS = Object.freeze({
  TRADITION_MAGICAL:  'magic.tradition.magical',    // z.B. "Gildenmagier", ""
  TRADITION_CLERICAL: 'magic.tradition.clerical',   // z.B. "Boron", ""
  FEATURE_MAGICAL:    'magic.feature.magical',      // z.B. "Feuer", ""
  FEATURE_CLERICAL:   'magic.feature.clerical',     // z.B. "Tod", ""
  GUIDEVALUE_MAGICAL: 'magic.guidevalue.magical',   // z.B. "kl", "-"
  GUIDEVALUE_CLERICAL:'magic.guidevalue.clerical',
  ENERGYFACTOR_MAGICAL:'magic.energyfactor.magical',
  HAPPY_TALENTS:      'magic.happyTalents.value',   // z.B. "Magiekunde,Alchemie"
  IS_MAGE:            'isMage',                     // bool, prepareDerivedData
  IS_PRIEST:          'isPriest',                   // bool, prepareDerivedData
});

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/**
 * Normalisiert einen Tradition-String für Vergleiche.
 * - Lowercase
 * - Leerzeichen komprimiert
 * - Sonderzeichen entfernt (Klammern bleiben für "Tradition (Gildenmagier)")
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeTradition(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class DSA5TraditionReader {
  /**
   * @param {object} deps
   * @param {Record<string, string[]>} [deps.mapping]
   *   circleId → string[] (Tradition-Strings die zu diesem Zirkel mappen).
   *   Standard wird aus DEFAULT_TRADITION_CIRCLE_MAP verwendet.
   *   Kann von außen überschrieben werden (DI / JSON-Reload).
   * @param {Console} [deps.logger]
   */
  constructor({ mapping = null, logger = null } = {}) {
    this.logger = logger ?? console;

    // Internes Format: normalizedTraditionString → circleId
    this._lookupTable = this._buildLookupTable(mapping ?? DEFAULT_TRADITION_CIRCLE_MAP);
  }

  // ─── Öffentliche API ───────────────────────────────────────────────────────

  /**
   * Liest die magische Tradition eines Actors aus.
   *
   * @param {Actor} actor  - Foundry Actor-Dokument
   * @returns {TraditionData}  - Niemals null/undefined, fehlende Felder als null.
   *
   * @typedef {Object} TraditionData
   * @property {string|null} traditionString   - Roher Wert aus magic.tradition.magical
   * @property {string|null} traditionItem     - Name des Tradition-Items (falls vorhanden)
   * @property {string|null} feature           - Merkmal (magic.feature.magical)
   * @property {string|null} guidevalue        - Leiteigenschaft-Kürzel ('kl', 'mu', ...)
   * @property {boolean}     isMage            - true wenn Actor Zauber/magische SFs hat
   * @property {boolean}     isPriest          - true wenn Actor Liturgien hat
   * @property {string[]}    happyTalents      - Begabungstalente-Liste
   * @property {string|null} resolvedCircleId  - Zirkel-ID aus Mapping (kann null sein)
   */
  readTradition(actor) {
    if (!actor?.system) {
      return this._emptyTraditionData();
    }

    const sys = actor.system;
    const { getProperty } = foundry.utils;

    // ── Quelle 1: system.magic.tradition.magical ─────────────────────────────
    const traditionString = getProperty(sys, DSA5_MAGIC_PATHS.TRADITION_MAGICAL) ?? null;

    // ── Quelle 2: Tradition-Item (specialability mit category magical) ────────
    const traditionItem = this._findTraditionItem(actor);

    // ── Weitere Magic-Felder ──────────────────────────────────────────────────
    const feature        = getProperty(sys, DSA5_MAGIC_PATHS.FEATURE_MAGICAL) ?? null;
    const guidevalue     = getProperty(sys, DSA5_MAGIC_PATHS.GUIDEVALUE_MAGICAL) ?? null;
    const isMage         = Boolean(getProperty(sys, DSA5_MAGIC_PATHS.IS_MAGE));
    const isPriest       = Boolean(getProperty(sys, DSA5_MAGIC_PATHS.IS_PRIEST));
    const happyRaw       = getProperty(sys, DSA5_MAGIC_PATHS.HAPPY_TALENTS) ?? '';
    const happyTalents   = happyRaw
      ? String(happyRaw).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // ── Zirkel-Mapping ────────────────────────────────────────────────────────
    // Priorität: traditionItem.name > traditionString > feature
    const resolvedCircleId = this._resolveCircle(
      traditionItem?.name ?? traditionString,
      feature
    );

    return {
      traditionString: traditionString || null,
      traditionItem: traditionItem?.name ?? null,
      feature: feature || null,
      guidevalue: (guidevalue && guidevalue !== '-') ? guidevalue : null,
      isMage,
      isPriest,
      happyTalents,
      resolvedCircleId,
    };
  }

  /**
   * Liefert nur die circleId für einen Actor (Convenience-Wrapper).
   *
   * @param {Actor} actor
   * @returns {string|null}
   */
  suggestCircle(actor) {
    return this.readTradition(actor).resolvedCircleId;
  }

  /**
   * Aktualisiert das Mapping zur Laufzeit (z.B. nach JSON-Reload).
   *
   * @param {Record<string, string[]>} newMapping  - circleId → tradition strings[]
   */
  updateMapping(newMapping) {
    this._lookupTable = this._buildLookupTable(newMapping);
    this.logger?.info?.('JANUS7 | TraditionReader | Mapping aktualisiert', {
      entries: Object.keys(newMapping).length,
    });
  }

  /**
   * Gibt das aktuelle Mapping zurück (für UI-Anzeige / Debug).
   * @returns {Map<string, string>}  normalizedString → circleId
   */
  getMapping() {
    return new Map(this._lookupTable);
  }

  // ─── Private Hilfsmethoden ──────────────────────────────────────────────────

  /**
   * Sucht ein Tradition-Item im Actor.
   * DSA5: Specialabilities mit category 'magical' oder 'magicalStyle'
   * und Name der mit "Tradition" beginnt.
   *
   * @param {Actor} actor
   * @returns {{ name: string, category: string }|null}
   * @private
   */
  _findTraditionItem(actor) {
    try {
      const TRADITION_CATEGORIES = new Set(['magical', 'magicalStyle']);

      for (const item of (actor.items ?? [])) {
        if (item.type !== 'specialability') continue;
        const cat = item.system?.category?.value;
        if (!TRADITION_CATEGORIES.has(cat)) continue;

        const name = item.name ?? '';
        // DSA5-Konvention: Tradition-Items heißen "Tradition (Gildenmagier)" etc.
        // Direkt-Matches (z.B. "Elfische Tradition") ebenfalls berücksichtigt.
        if (
          normalizeTradition(name).startsWith('tradition') ||
          this._lookupTable.has(normalizeTradition(name))
        ) {
          return { name, category: cat };
        }
      }
    } catch (err) {
      this.logger?.warn?.('JANUS7 | TraditionReader | _findTraditionItem fehlgeschlagen', {
        actor: actor?.name,
        error: err?.message,
      });
    }
    return null;
  }

  /**
   * Mappt einen Traditions-String und optional das Merkmal auf eine circleId.
   *
   * @param {string|null} traditionString
   * @param {string|null} feature
   * @returns {string|null}
   * @private
   */
  _resolveCircle(traditionString, feature = null) {
    if (traditionString) {
      // Direkter Match
      const norm = normalizeTradition(traditionString);
      if (this._lookupTable.has(norm)) {
        return this._lookupTable.get(norm);
      }

      // Enthält-Match: "Tradition (Gildenmagier)" → lookup "gildenmagier"
      for (const [key, circleId] of this._lookupTable.entries()) {
        if (norm.includes(key)) {
          return circleId;
        }
      }
    }

    // Fallback: Merkmal (feature) probieren
    if (feature) {
      const normFeature = normalizeTradition(feature);
      if (this._lookupTable.has(normFeature)) {
        return this._lookupTable.get(normFeature);
      }
    }

    return null;
  }

  /**
   * Baut die interne Lookup-Tabelle aus dem circleId→strings[] Format auf.
   *
   * @param {Record<string, string[]>} mapping
   * @returns {Map<string, string>}
   * @private
   */
  _buildLookupTable(mapping) {
    const table = new Map();
    for (const [circleId, traditions] of Object.entries(mapping)) {
      for (const t of traditions) {
        table.set(normalizeTradition(t), circleId);
      }
    }
    return table;
  }

  /** @private */
  _emptyTraditionData() {
    return {
      traditionString: null,
      traditionItem: null,
      feature: null,
      guidevalue: null,
      isMage: false,
      isPriest: false,
      happyTalents: [],
      resolvedCircleId: null,
    };
  }
}

// ─── Standard-Mapping ────────────────────────────────────────────────────────
//
// Format:  circleId → string[]
//
// Die Strings werden normalisiert verglichen (lowercase, NFD, trim).
// DSA5-Traditionen aus: Regelwerk S.249ff., Aventurisches Kompendium.
//
// ERWEITERBAR: Neue Einträge in tradition-circle-map.json pflegen und
// per DSA5TraditionReader.updateMapping() zur Laufzeit nachladen.

/**
 * @type {Record<string, string[]>}
 */
export const DEFAULT_TRADITION_CIRCLE_MAP = {
  // ─── Zirkel des Salamanders (Feuer) ─────────────────────────────────────
  // Feurige, impulsive Magier. Eher Kampf- und Transformationsmagie.
  salamander: [
    // Gildenmagier ist die Haupttradition einer Akademie → feurige Abteilung
    'Gildenmagier',
    'Tradition (Gildenmagier)',
    // Kriegerische / feurige Traditionen
    'Scharlatan',
    'Tradition (Scharlatan)',
    'Hexe',
    'Tradition (Hexe)',
    // Feuer-Merkmal als direktes Mapping
    'Feuer',
    'fire',
  ],

  // ─── Zirkel der Stäbe (Luft) ─────────────────────────────────────────────
  // Analytisch, wissbegierig. Theorie, Erkenntnis, Kommunikationsmagie.
  staves: [
    'Elfen',
    'Tradition (Elfen)',
    'Elfische Tradition',
    // Kristall- und Erkenntnismagie
    'Kristallomant',
    'Tradition (Kristallomant)',
    // Luft-Merkmal
    'Luft',
    'air',
    // Erkenntnismagie
    'Geode',
    'Tradition (Geode)',
  ],

  // ─── Zirkel der Schwerter (Wasser) ───────────────────────────────────────
  // Diszipliniert, gerecht. Heilung, Naturmagie, Anpassung.
  swords: [
    'Druide',
    'Tradition (Druide)',
    'Druidische Tradition',
    // Heilungsaffine Traditionen
    'Animist',
    'Tradition (Animist)',
    // Wasser-Merkmal
    'Wasser',
    'water',
    // Naturnahe Traditionen
    'Meistertalentierte',
    'Tradition (Meistertalentierte)',
  ],

  // ─── Zirkel der Sicheln (Erde) ───────────────────────────────────────────
  // Geerdet, ausdauernd. Beschwörung, Objektmagie, Alchemie.
  sickles: [
    'Zauberbarde',
    'Tradition (Zauberbarde)',
    'Zaubertänzer',
    'Tradition (Zaubertänzer)',
    // Alchemie / Objektmagie
    'Alchemist',
    'Tradition (Alchemist)',
    // Erd-Merkmal
    'Erde',
    'earth',
    // Schelmenhafte / bodenständige Traditionen
    'Schelm',
    'Tradition (Schelm)',
    // Zwerg / Runen (falls im Setting vorhanden)
    'Runenzauberer',
    'Tradition (Runenzauberer)',
  ],
};


// Back-compat aliases for bridge/dsa5/index.js and older consumers
export { DSA5TraditionReader as DSA5TraditionBridge };
export const TRADITION_CIRCLE_MAP_DEFAULT = DEFAULT_TRADITION_CIRCLE_MAP;
