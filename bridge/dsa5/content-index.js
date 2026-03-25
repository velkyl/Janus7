/**
 * janus7/bridge/dsa5/content-index.js
 * * MOCK Content Index für Phase 6.5 (Content Bridge)
 * Dient als Platzhalter, solange der Python-Indexer noch nicht lief.
 * Verhindert Abstürze, wenn die UI nach Zaubern oder Items sucht.
 */

export const ContentIndex = {
    "spells": [
        { "id": "spell_odem", "name": "Odem Arcanum", "type": "spell", "compendium": "dsa5.spells" },
        { "id": "spell_analys", "name": "Analys Arkanstruktur", "type": "spell", "compendium": "dsa5.spells" },
        { "id": "spell_flimflam", "name": "Flim Flam Funkel", "type": "spell", "compendium": "dsa5.spells" },
        { "id": "spell_ignifaxius", "name": "Ignifaxius Flammenstrahl", "type": "spell", "compendium": "dsa5.spells" },
        { "id": "spell_gardianum", "name": "Gardianum Zauberschild", "type": "spell", "compendium": "dsa5.spells" }
    ],
    "items": [
        { "id": "item_healing_potion", "name": "Heiltrank", "type": "consumable", "compendium": "dsa5.equipment" },
        { "id": "item_staff", "name": "Magierstab", "type": "weapon", "compendium": "dsa5.equipment" }
    ],
    "npcs": [],
    "locations": []
};

export default ContentIndex;