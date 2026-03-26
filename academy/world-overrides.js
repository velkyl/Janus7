/**
 * @file academy/world-overrides.js
 * @module janus7/academy
 * @phase 2
 *
 * World Overrides for academy datasets.
 *
 * Purpose:
 * - Allow Foundry-managed edits (via JANUS7 Seed Import + Data Studio)
 *   to override shipped JSON baseline.
 * - SSOT remains structured JSON stored in document flags.
 * - Journal text is only a view; never parsed.
 */

import { MODULE_ID } from '../core/common.js';

/**
 * Collect world-provided academy records.
 *
 * We store full record JSON in managed document flags:
 * - `JournalEntry.flags[MODULE_ID].data`
 * - `Item.flags[MODULE_ID].data`
 * The importer/editor marks docs with:
 * - managed: true
 * - dataType: e.g. 'lesson' | 'npc' | 'location' | 'event' | ...
 * - janusId: record id
 */
export function collectAcademyWorldOverrides() {
  const out = {
    // canonical (validated)
    lessons: [],
    npcs: [],
    locations: [],
    events: [],
    calendar: null,

    // optional datasets
    spellCurriculum: null,
    spellsIndex: null,
    libraryItems: [],
    library: null,
  };

  const applyDoc = (doc) => {
    const f = doc?.flags?.[MODULE_ID] ?? null;
    if (!f?.managed) return;
    const dt = String(f.dataType ?? '').trim();
    const data = f.data ?? null;
    if (!data || typeof data !== 'object') return;

    if (dt === 'lesson') out.lessons.push(data);
    else if (dt === 'npc') out.npcs.push(data);
    else if (dt === 'location') out.locations.push(data);
    else if (dt === 'event') out.events.push(data);
    else if (dt === 'calendar') out.calendar = data;

    else if (dt === 'spellCurriculum') out.spellCurriculum = data;
    else if (dt === 'spellsIndex') out.spellsIndex = data;
    else if (dt === 'library-item') out.libraryItems.push(data);
    else if (dt === 'library') out.library = data;
  };

  try {
    const journals = globalThis.game?.journal?.contents ?? [];
    for (const j of journals) {
      applyDoc(j);
    }

    const items = globalThis.game?.items?.contents ?? [];
    for (const item of items) {
      applyDoc(item);
    }
  } catch {
    // best-effort: overrides are optional
  }

  return out;
}

