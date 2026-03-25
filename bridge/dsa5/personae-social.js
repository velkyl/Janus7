/**
 * @file bridge/dsa5/personae-social.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   Liest und schreibt socialContact.level in DSA5 PersonaeDramatis JournalPages.
 *
 * DSA5 PersonaeDramatis Datenstruktur (aus dsapersonaedramatis.js):
 *   page.system.personae[personaKey].socialContact[slugifiedActorUuid].level
 *
 *   - personaKey        : beliebiger String-Key des Persona-Eintrags
 *   - slugifiedActorUuid: actorUuid.replaceAll('.', '_')
 *   - level             : Number 1-9 (aus SOCIAL_CONTACT_LEVELS)
 *
 * Skala 1-9:
 *   1 = Unstillbarer Hass
 *   2 = Erklärter Feind
 *   3 = Abneigung
 *   4 = Leichte Abneigung
 *   5 = Neutral
 *   6 = Sympathie / Freundschaft
 *   7 = Großes Vertrauen
 *   8 = Enge Loyalität / Liebe
 *   9 = Tiefe Liebe / Opferbereitschaft
 *
 * Architektur:
 *   - Kein direkter dsa5-Import; nur JournalEntry/JournalEntryPage-API.
 *   - GM-only für Mutationen.
 *   - Kein eigener State — delegiert an Foundry-Persistence.
 */

// ─── Skala-Definitionen ───────────────────────────────────────────────────────

/**
 * DSA5 SOCIAL_CONTACT_LEVELS → Label-Map.
 * @type {Record<number, string>}
 */
export const DSA5_SOCIAL_LEVELS = Object.freeze({
  1: 'Unstillbarer Hass',
  2: 'Erklärter Feind',
  3: 'Abneigung',
  4: 'Leichte Abneigung',
  5: 'Neutral',
  6: 'Sympathie / Freundschaft',
  7: 'Großes Vertrauen',
  8: 'Enge Loyalität / Liebe',
  9: 'Tiefe Liebe / Opferbereitschaft',
});

/** Minimaler/maximaler gültiger Level-Wert */
export const SOCIAL_LEVEL_MIN = 1;
export const SOCIAL_LEVEL_MAX = 9;

// ─── Konvertierungs-Hilfsfunktionen ──────────────────────────────────────────

/**
 * Konvertiert JANUS7 attitude (-100..100) → DSA5 level (1-9).
 *
 * Mapping:
 *   -100..-67  → 1 (Unstillbarer Hass)
 *   -66..-34   → 2 (Erklärter Feind)
 *   -33..-12   → 3 (Abneigung)
 *   -11..-1    → 4 (Leichte Abneigung)
 *     0        → 5 (Neutral)
 *    1..25     → 6 (Sympathie)
 *   26..50     → 7 (Großes Vertrauen)
 *   51..75     → 8 (Loyalität / Liebe)
 *   76..100    → 9 (Tiefe Liebe)
 *
 * @param {number} attitude  - JANUS7 Attitüde -100..100
 * @returns {number}         - DSA5 Level 1-9
 */
export function attitudeToLevel(attitude) {
  const v = Math.max(-100, Math.min(100, Number(attitude) || 0));
  if (v <= -67) return 1;
  if (v <= -34) return 2;
  if (v <= -12) return 3;
  if (v <=  -1) return 4;
  if (v ===  0) return 5;
  if (v <=  25) return 6;
  if (v <=  50) return 7;
  if (v <=  75) return 8;
  return 9;
}

/**
 * Konvertiert DSA5 level (1-9) → JANUS7 attitude Mittelwert.
 *
 * @param {number} level  - DSA5 Level 1-9
 * @returns {number}      - JANUS7 Attitüde (Repräsentativwert)
 */
export function levelToAttitude(level) {
  const map = { 1: -83, 2: -50, 3: -22, 4: -6, 5: 0, 6: 13, 7: 38, 8: 63, 9: 88 };
  return map[Math.max(1, Math.min(9, Number(level) || 5))] ?? 0;
}

// ─── Slugify-Hilfe ────────────────────────────────────────────────────────────

/**
 * Wandelt Actor-UUID in PersonaeDramatis-Key um.
 * DSA5-Konvention: Punkte werden durch Unterstriche ersetzt.
 *
 * @param {string} actorUuid  - z.B. 'Actor.abc123def456'
 * @returns {string}          - z.B. 'Actor_abc123def456'
 */
export function slugifyUuid(actorUuid) {
  return String(actorUuid ?? '').replaceAll('.', '_');
}

/**
 * Umkehrung: slugifiedUuid → originale UUID.
 * @param {string} slug
 * @returns {string}
 */
export function deslugifyUuid(slug) {
  // Format: 'Actor_abc' → 'Actor.abc', 'Scene_abc_Token_xyz' → 'Scene.abc.Token.xyz'
  // Heuristik: erster '_' ist der Typ-Separator, alle weiteren Unterstriche in IDs bleiben
  // Foundry-UUIDs: 'Actor.ID', 'JournalEntry.ID.JournalEntryPage.ID', etc.
  // Da Foundry-IDs keine Punkte enthalten, können wir pauschal alle _ → . konvertieren
  return String(slug ?? '').replaceAll('_', '.');
}

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class DSA5PersonaeSocialBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── Lesen ─────────────────────────────────────────────────────────────────

  /**
   * Liest alle socialContact-Einträge einer PersonaeDramatis-Page.
   *
   * @param {JournalEntryPage} page
   * @returns {PersonaContactMap}
   *
   * @typedef {Record<string, Record<string, {level: number}>>}  PersonaContactMap
   *   personaKey → slugifiedActorUuid → { level }
   */
  readAllContacts(page) {
    const personae = page?.system?.personae ?? {};
    const result = {};
    for (const [pKey, entry] of Object.entries(personae)) {
      const contacts = entry?.socialContact ?? {};
      if (Object.keys(contacts).length) result[pKey] = contacts;
    }
    return result;
  }

  /**
   * Liest den socialContact.level einer Persona für einen bestimmten Charakter.
   *
   * @param {JournalEntryPage} page
   * @param {string} personaKey
   * @param {string} targetActorUuid  - UUID des Charakters (wird slugifiziert)
   * @returns {number|null}  - Level 1-9 oder null wenn nicht vorhanden
   */
  readContactLevel(page, personaKey, targetActorUuid) {
    const slug = slugifyUuid(targetActorUuid);
    const level = page?.system?.personae?.[personaKey]?.socialContact?.[slug]?.level;
    return (level != null && Number.isFinite(Number(level))) ? Number(level) : null;
  }

  /**
   * Liest alle socialContacts einer einzelnen Persona.
   *
   * @param {JournalEntryPage} page
   * @param {string} personaKey
   * @returns {{ actorUuid: string, slug: string, level: number }[]}
   */
  readPersonaContacts(page, personaKey) {
    const contacts = page?.system?.personae?.[personaKey]?.socialContact ?? {};
    return Object.entries(contacts).map(([slug, data]) => ({
      actorUuid: deslugifyUuid(slug),
      slug,
      level: Number(data?.level ?? 5),
    }));
  }

  /**
   * Findet den Persona-Key für einen Actor (sucht nach actor_uuid).
   *
   * @param {JournalEntryPage} page
   * @param {string} actorUuid
   * @returns {string|null}  - personaKey oder null
   */
  findPersonaKeyForActor(page, actorUuid) {
    const personae = page?.system?.personae ?? {};
    for (const [key, entry] of Object.entries(personae)) {
      if (entry?.actor_uuid === actorUuid) return key;
    }
    return null;
  }

  // ─── Schreiben ─────────────────────────────────────────────────────────────

  /**
   * Setzt den socialContact.level einer Persona für einen Charakter.
   * GM-only.
   *
   * @param {JournalEntryPage} page
   * @param {string}  personaKey
   * @param {string}  targetActorUuid
   * @param {number}  level  - 1-9
   * @returns {Promise<void>}
   *
   * @example
   * const page = journal.pages.find(p => p.type === 'dsapersonaedramatis');
   * await personaeSocial.setContactLevel(page, 'NPC_IRIAN', 'Actor.abc123', 6);
   */
  async setContactLevel(page, personaKey, targetActorUuid, level) {
    if (!game.user?.isGM) {
      this.logger?.warn?.('JANUS7 | PersonaeSocial | setContactLevel: GM-Rechte erforderlich');
      return;
    }

    const clampedLevel = Math.max(SOCIAL_LEVEL_MIN, Math.min(SOCIAL_LEVEL_MAX, Math.round(Number(level))));
    const slug = slugifyUuid(targetActorUuid);

    this.logger?.debug?.('JANUS7 | PersonaeSocial | setContactLevel', {
      personaKey,
      targetUuid: targetActorUuid,
      slug,
      level: clampedLevel,
    });

    try {
      // Foundry-Update: merge in den bestehenden socialContact-Eintrag
      await page.update({
        [`system.personae.${personaKey}.socialContact.${slug}.level`]: clampedLevel,
      });
    } catch (err) {
      this.logger?.error?.('JANUS7 | PersonaeSocial | setContactLevel fehlgeschlagen', {
        personaKey, slug, level: clampedLevel, error: err?.message,
      });
      throw err;
    }
  }

  /**
   * Batch-Update: Setzt mehrere socialContact-Levels in einem Foundry-Update.
   * Effizienter als einzelne setContactLevel-Aufrufe.
   *
   * @param {JournalEntryPage} page
   * @param {Array<{personaKey: string, targetActorUuid: string, level: number}>} updates
   * @returns {Promise<number>}  - Anzahl gesetzter Einträge
   */
  async batchSetContactLevels(page, updates) {
    if (!game.user?.isGM) {
      this.logger?.warn?.('JANUS7 | PersonaeSocial | batchSetContactLevels: GM-Rechte erforderlich');
      return 0;
    }

    if (!updates?.length) return 0;

    // Alle Updates in ein einziges Foundry-Update-Objekt packen
    const updateData = {};
    for (const { personaKey, targetActorUuid, level } of updates) {
      const clampedLevel = Math.max(SOCIAL_LEVEL_MIN, Math.min(SOCIAL_LEVEL_MAX, Math.round(Number(level))));
      const slug = slugifyUuid(targetActorUuid);
      updateData[`system.personae.${personaKey}.socialContact.${slug}.level`] = clampedLevel;
    }

    try {
      await page.update(updateData);
      this.logger?.info?.(`JANUS7 | PersonaeSocial | ${updates.length} Kontakte aktualisiert`);
      return updates.length;
    } catch (err) {
      this.logger?.error?.('JANUS7 | PersonaeSocial | batchSetContactLevels fehlgeschlagen', {
        count: updates.length, error: err?.message,
      });
      throw err;
    }
  }

  // ─── Page-Finder ───────────────────────────────────────────────────────────

  /**
   * Sucht die PersonaeDramatis-Page in einem Journal.
   *
   * @param {string} journalRef  - Journal-ID oder Name
   * @returns {JournalEntryPage|null}
   */
  findPage(journalRef) {
    const journal = typeof journalRef === 'string'
      ? (game.journal?.get(journalRef) ?? game.journal?.getName(journalRef))
      : journalRef; // direktes JournalEntry-Objekt erlaubt
    return journal?.pages?.find((p) => p.type === 'dsapersonaedramatis') ?? null;
  }

  /**
   * Sucht alle PersonaeDramatis-Pages in allen Journals.
   * @returns {JournalEntryPage[]}
   */
  findAllPages() {
    return game.journal?.contents
      .flatMap((j) => j.pages?.contents ?? [])
      .filter((p) => p.type === 'dsapersonaedramatis') ?? [];
  }
}
