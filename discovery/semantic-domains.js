/**
 * @file discovery/semantic-domains.js
 * @module janus7/discovery
 *
 * Semantic domains used by the Content Discovery Bridge.
 *
 * Domains are intentionally simple strings so that an LLM can use them:
 * - "magic.spell"
 * - "magic.ritual"
 * - "item.weapon"
 * - "creature.demon" ...
 */

/**
 * @typedef {object} DomainSpec
 * @property {('Item'|'Actor'|'JournalEntry')} document
 * @property {string[]} [types] Foundry dsa5 item/actor types to filter (best-effort)
 * @property {string[]} [packs] Optional explicit pack ids (fallback: auto detect by document)
 */

/** @type {Record<string, DomainSpec>} */
export const SEMANTIC_DOMAINS = {
  'magic.spell': { document: 'Item', types: ['spell', 'Zauber', 'ritual', 'Ritual', 'ceremony', 'Liturgie'] },
  'magic.ritual': { document: 'Item', types: ['ritual', 'Ritual'] },
  'magic.liturgy': { document: 'Item', types: ['liturgy', 'Liturgie', 'ceremony'] },
  'item.weapon': { document: 'Item', types: ['weapon', 'Waffe'] },
  'item.armor': { document: 'Item', types: ['armor', 'Rüstung'] },
  'item.equipment': { document: 'Item', types: ['equipment', 'Ausrüstung'] },
  'creature.demon': { document: 'Actor', types: ['creature', 'npc', 'Dämon'] },
  'creature.monster': { document: 'Actor', types: ['creature', 'npc'] }
};

export default SEMANTIC_DOMAINS;
