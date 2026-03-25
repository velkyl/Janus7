/**
 * @file bridge/dsa5/journal.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Integration mit DSA5 JournalEntryPage-DataModels:
 *   - dsapersonaedramatis  → Akademie-NPC-Übersicht (Schüler, Lehrer, Fraktionen)
 *   - dsaaptracker         → AP-Tracking für Akademie-Fortschritt
 *   - dsamoneytracker      → Schulgeld / Lehrervergütung
 *   - dsacalendar          → Akademie-Events (getrennte API in calendar-sync.js)
 *
 * Architektur:
 * - Kein direkter Import von dsa5-Interna.
 * - Nutzt JournalEntry + JournalEntryPage Foundry-Document-API.
 * - Erfordert GM-Rechte für Mutationen.
 */

/**
 * DSA5JournalBridge
 *
 * @description
 * Öffentliche API von JANUS7.
 * Liest und schreibt DSA5 JournalPage DataModels.
 *
 * @remarks
 * - Mutations sind GM-only
 * - Lesen ist read-only und sicher für alle User
 */
export class DSA5JournalBridge {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── Hilfsfunktion: Seite suchen ─────────────────────────────────────────

  /**
   * Findet eine JournalEntryPage nach Journal-ID/Name + Page-Typ.
   *
   * @param {string} journalRef  - Journal-ID oder Name
   * @param {string} pageType    - 'dsapersonaedramatis' | 'dsaaptracker' | 'dsamoneytracker' | 'dsacalendar'
   * @returns {JournalEntryPage|null}
   */
  findPage(journalRef, pageType) {
    const journal = game.journal?.get(journalRef) ?? game.journal?.getName(journalRef);
    if (!journal) return null;
    return journal.pages?.find((p) => p.type === pageType) ?? null;
  }

  // ─── Personae Dramatis ───────────────────────────────────────────────────

  /**
   * Liest alle Personae aus einer dsapersonaedramatis-Page.
   *
   * @param {string} journalRef
   * @returns {Record<string, object>}  — Key → Persona-Objekt
   */
  getPersonae(journalRef) {
    const page = this.findPage(journalRef, 'dsapersonaedramatis');
    return page?.system?.personae ?? {};
  }

  /**
   * Fügt eine Persona zu einer dsapersonaedramatis-Page hinzu.
   * Verknüpft automatisch mit dem Foundry-Actor über UUID, wenn angegeben.
   *
   * @param {string} journalRef
   * @param {object} personaData
   * @param {string} personaData.name
   * @param {string} [personaData.actorUuid]  - UUID des verknüpften Actors
   * @param {string} [personaData.notes]      - HTML-Notizen
   * @param {string} [personaData.description]
   * @param {boolean} [personaData.visible=false]
   * @param {number} [personaData.type=0]     - 0=Person, 1=Kreatur
   * @returns {Promise<string|null>}  — Neuer Persona-Key oder null bei Fehler
   */
  async addPersona(journalRef, personaData) {
    if (!game.user?.isGM) return null;
    const page = this.findPage(journalRef, 'dsapersonaedramatis');
    if (!page) {
      this.logger?.warn?.(`[Journal] dsapersonaedramatis-Page nicht gefunden: ${journalRef}`);
      return null;
    }

    const key = `janus_persona_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const existing = page.system?.personae ?? {};

    const newPersona = {
      name:         personaData.name ?? 'Unbekannt',
      type:         personaData.type ?? 0,
      notes:        personaData.notes ?? '',
      description:  personaData.description ?? '',
      actor_uuid:   personaData.actorUuid ?? '',
      visible:      personaData.visible ?? false,
      showSpecies:  true,
      showCulture:  true,
      showProfession: true,
    };

    try {
      await page.update({ 'system.personae': { ...existing, [key]: newPersona } });
      this.logger?.info?.(`[Journal] Persona hinzugefügt: ${personaData.name} → ${journalRef}`);
      return key;
    } catch (err) {
      this.logger?.warn?.('[Journal] addPersona fehlgeschlagen', { err });
      return null;
    }
  }

  /**
   * Synchronisiert Akademie-NPCs mit einer Personae-Page.
   * Bestehende Einträge bleiben erhalten (no-op wenn UUID bereits verknüpft).
   *
   * @param {string} journalRef
   * @param {{ id: string, name: string, actor?: Actor }[]} npcs
   * @returns {Promise<number>}  — Anzahl neu hinzugefügter Personae
   */
  async syncNpcsToPersonae(journalRef, npcs) {
    if (!game.user?.isGM) return 0;
    const existing = this.getPersonae(journalRef);
    const existingUuids = new Set(
      Object.values(existing).map((p) => p.actor_uuid).filter(Boolean)
    );

    let added = 0;
    for (const npc of npcs) {
      if (npc.actor?.uuid && existingUuids.has(npc.actor.uuid)) continue;
      const result = await this.addPersona(journalRef, {
        name:      npc.name ?? npc.id,
        actorUuid: npc.actor?.uuid,
        notes:     `JANUS7 NPC: ${npc.id}`,
      });
      if (result) added++;
    }

    return added;
  }

  // ─── AP-Tracker ──────────────────────────────────────────────────────────

  /**
   * Liest alle AP-Tracker-Einträge.
   *
   * @param {string} journalRef
   * @returns {Record<string, object>}
   */
  getApEntries(journalRef) {
    const page = this.findPage(journalRef, 'dsaaptracker');
    return page?.system?.entries ?? {};
  }

  /**
   * Fügt einen AP-Tracker-Eintrag hinzu (für Akademiefortschritt).
   *
   * @param {string} journalRef
   * @param {object} opts
   * @param {string} opts.type        - Eintrag-Typ (z.B. 'lesson', 'exam', 'reward')
   * @param {string} opts.itemName    - Name des Talentes/Spells/Kurses
   * @param {string} [opts.itemType]  - DSA5 Item-Typ ('skill', 'spell', ...)
   * @param {number} opts.cost        - AP-Kosten
   * @param {number} opts.previous    - Wert vorher
   * @param {number} opts.next        - Wert nachher
   * @param {string} [opts.itemUuid]  - UUID des zugehörigen Items (optional)
   * @returns {Promise<string|null>}  — Eintrag-Key oder null
   */
  async addApEntry(journalRef, { type, itemName, itemType = '', cost, previous, next, itemUuid = '' }) {
    if (!game.user?.isGM) return null;
    const page = this.findPage(journalRef, 'dsaaptracker');
    if (!page) {
      this.logger?.warn?.(`[Journal] dsaaptracker-Page nicht gefunden: ${journalRef}`);
      return null;
    }

    const key      = `janus_ap_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const existing = page.system?.entries ?? {};

    const entry = {
      created:  Date.now(),
      type:     type ?? 'lesson',
      itemUuid,
      itemType,
      itemName: itemName ?? '—',
      attr:     '',
      state:    0,
      previous: previous ?? 0,
      next:     next ?? 0,
      cost:     cost ?? 0,
      total:    '',
    };

    try {
      await page.update({ 'system.entries': { ...existing, [key]: entry } });
      this.logger?.debug?.(`[Journal] AP-Eintrag: ${itemName} (${cost} AP)`);
      return key;
    } catch (err) {
      this.logger?.warn?.('[Journal] addApEntry fehlgeschlagen', { err });
      return null;
    }
  }

  // ─── Money Tracker ───────────────────────────────────────────────────────

  /**
   * Liest Geld-Tracker-Einträge.
   *
   * @param {string} journalRef
   * @returns {Record<string, object>}
   */
  getMoneyEntries(journalRef) {
    const page = this.findPage(journalRef, 'dsamoneytracker');
    return page?.system?.entries ?? {};
  }

  /**
   * Direktzahlung über DSA5Payment (benötigt ausgewählten Token/Actor).
   * Delegiert an game.dsa5.apps.DSA5Payment.
   *
   * @param {Actor} actor
   * @param {string} moneyString  - DSA5 Money-String, z.B. '10 S' (10 Silbertaler)
   * @param {'pay'|'receive'} direction
   * @returns {Promise<boolean>}
   */
  async handlePayment(actor, moneyString, direction = 'pay') {
    if (!game.user?.isGM) return false;
    try {
      const Payment = game.dsa5?.apps?.DSA5Payment;
      if (!Payment) {
        this.logger?.warn?.('[Journal] DSA5Payment nicht verfügbar.');
        return false;
      }
      if (direction === 'pay') {
        await Payment.payMoney(actor, moneyString, false, true);
      } else {
        await Payment.getMoney(actor, moneyString, false, true);
      }
      return true;
    } catch (err) {
      this.logger?.warn?.('[Journal] handlePayment fehlgeschlagen', { err });
      return false;
    }
  }

  /**
   * Prüft ob ein Actor genug Geld hat.
   *
   * @param {Actor} actor
   * @param {string} moneyString
   * @returns {Promise<boolean>}
   */
  async canPay(actor, moneyString) {
    try {
      const Payment = game.dsa5?.apps?.DSA5Payment;
      if (!Payment) return false;
      return Payment.canPay(actor, moneyString, true);
    } catch (_e) {
      return false;
    }
  }
}
