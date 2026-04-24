/**
 * @file discovery/semantic-domains.js
 * @module janus7/discovery
 *
 * Semantic domains used by the Content Discovery Bridge.
 */

/**
 * @typedef {object} DomainSpec
 * @property {('Item'|'Actor'|'JournalEntry'|'Scene')} document
 * @property {string[]} [types] Foundry dsa5 item/actor types to filter (best-effort)
 * @property {string[]} [packs] Optional explicit pack ids (fallback: auto detect by document)
 */

/** @type {Record<string, DomainSpec>} */
export const SEMANTIC_DOMAINS = {
  // Magic & Divine
  'magic.spell': { document: 'Item', types: ['spell', 'Zauber', 'ritual', 'Ritual'] },
  'magic.liturgy': { document: 'Item', types: ['liturgy', 'Liturgie', 'ceremony', 'Zeremonie'] },
  
  // Combat & Gear
  'item.weapon': { document: 'Item', types: ['meleeweapon', 'rangeweapon', 'Waffe'] },
  'item.armor': { document: 'Item', types: ['armor', 'Rüstung'] },
  'item.equipment': { document: 'Item', types: ['equipment', 'Ausrüstung', 'consumable'] },
  
  // Character Traits
  'trait.special_ability': { document: 'Item', types: ['specialability', 'Sonderfertigkeit'] },
  'trait.advantage': { document: 'Item', types: ['advantage', 'Vorteil', 'disadvantage', 'Nachteil'] },
  
  // Alchemy & Herbs
  'item.herb': { document: 'Item', types: ['plant', 'Pflanze'] },
  
  // Bestiary & NPCs
  'creature.beast': { document: 'Actor', types: ['creature', 'animal', 'Tier', 'Monster'] },
  'creature.demon': { document: 'Actor', types: ['creature', 'Dämon', 'daemon'] },
  'creature.npc': { document: 'Actor', types: ['npc'] },

  // World Content
  'journal.lore': { document: 'JournalEntry' },
  'scene.location': { document: 'Scene' }
};

export default SEMANTIC_DOMAINS;
