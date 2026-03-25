/**
 * @file academy/social-sync.js
 * @module janus7
 * @phase 4
 *
 * JanusSocialSync: Synchronisiert PersonaeDramatis-Levels mit dem JANUS7-Social-Graph.
 *
 * Import (PersonaeDramatis → SocialEngine) = Baseline vor Session
 * Export (SocialEngine → PersonaeDramatis) = Ergebnis nach Session (optional, GM-only)
 */

import { MODULE_ABBREV } from '../core/common.js';
import { attitudeToLevel, levelToAttitude, deslugifyUuid } from '../bridge/dsa5/personae-social.js';

export class JanusSocialSync {
  constructor({ bridge, socialEngine, academyData, logger }) {
    if (!bridge) throw new Error(`${MODULE_ABBREV}: JanusSocialSync needs bridge`);
    if (!socialEngine) throw new Error(`${MODULE_ABBREV}: JanusSocialSync needs socialEngine`);
    this.bridge = bridge;
    this.socialEngine = socialEngine;
    this.academyData = academyData ?? null;
    this.logger = logger ?? console;
    this._uuidToNpcId = null;
    this._relationHookId = null;
  }

  async importFromPersonaeDramatis({ dryRun = false, overwriteManual = false, neutralThreshold = 0 } = {}) {
    this._uuidToNpcId = null;
    const contacts = this._readAllContacts();
    const details = [];
    let imported = 0;
    let skipped = 0;
    const unmapped = [];

    for (const contact of contacts) {
      const fromId = await this._resolveNpcId(contact.personaActorUuid);
      const toId = await this._resolveNpcId(contact.heroActorUuid);

      if (!fromId || !toId) {
        unmapped.push({ ...contact, reason: !fromId ? 'persona_not_mapped' : 'hero_not_mapped' });
        skipped++;
        continue;
      }

      if (Math.abs(contact.attitude) <= neutralThreshold && neutralThreshold > 0) {
        skipped++;
        continue;
      }

      const existingAttitude = this.socialEngine.getAttitude(fromId, toId);
      if (!overwriteManual && existingAttitude !== 0) {
        details.push({
          fromId,
          toId,
          level: contact.level,
          attitude: contact.attitude,
          previousAttitude: existingAttitude,
          outcome: 'skipped_existing',
          personaName: contact.personaName
        });
        skipped++;
        continue;
      }

      details.push({
        fromId,
        toId,
        level: contact.level,
        attitude: contact.attitude,
        previousAttitude: existingAttitude,
        outcome: dryRun ? 'dry_run' : 'imported',
        personaName: contact.personaName
      });

      if (!dryRun) {
        await this.socialEngine.setAttitude(fromId, toId, contact.attitude, {
          tags: ['personae_dramatis_baseline'],
          meta: {
            sourceLevel: contact.level,
            personaActorUuid: contact.personaActorUuid,
            heroActorUuid: contact.heroActorUuid,
            importedAt: Date.now(),
            pageId: contact.pageId,
            personaKey: contact.personaKey
          }
        });
      }
      imported++;
    }

    this.logger?.info?.(`${MODULE_ABBREV} | SocialSync | Import done`, { imported, skipped, unmapped: unmapped.length, dryRun });
    if (unmapped.length) this.logger?.warn?.(`${MODULE_ABBREV} | SocialSync | Unmapped`, { unmapped });

    return { imported, exported: 0, skipped, unmappedContacts: unmapped, details };
  }

  async exportToPersonaeDramatis({ dryRun = false, onlyBaseline = true } = {}) {
    if (!game.user?.isGM) return { imported: 0, exported: 0, skipped: 0, unmappedContacts: [], details: [] };

    const personae = this._getPersonaeBridge();
    const pages = personae?.findAllPages?.() ?? [];
    if (!pages.length) {
      this.logger?.warn?.(`${MODULE_ABBREV} | SocialSync | Keine dsapersonaedramatis-Pages gefunden.`);
      return { imported: 0, exported: 0, skipped: 0, unmappedContacts: [], details: [] };
    }

    const allRels = this.socialEngine.listAllRelationships();
    const details = [];
    let exported = 0;
    let skipped = 0;

    for (const rel of allRels) {
      if (onlyBaseline && !rel.tags?.includes('personae_dramatis_baseline')) {
        skipped++;
        continue;
      }

      const personaActorUuid = await this._resolveActorUuidForNpcId(rel.fromId);
      const heroActorUuid = await this._resolveActorUuidForNpcId(rel.toId);
      const location = this._findPersonaLocation(pages, personaActorUuid);

      if (!personaActorUuid || !heroActorUuid || !location) {
        skipped++;
        continue;
      }

      const level = attitudeToLevel(rel.value);
      details.push({
        fromId: rel.fromId,
        toId: rel.toId,
        attitude: rel.value,
        level,
        outcome: dryRun ? 'dry_run' : 'exported',
        personaKey: location.personaKey,
        pageId: location.page?.id ?? null
      });

      if (!dryRun) {
        await personae.setContactLevel(location.page, location.personaKey, heroActorUuid, level);
      }
      exported++;
    }

    this.logger?.info?.(`${MODULE_ABBREV} | SocialSync | Export done`, { exported, skipped, dryRun });
    return { imported: 0, exported, skipped, unmappedContacts: [], details };
  }

  async importSingleContact(personaActorUuid, heroActorUuid) {
    const personae = this._getPersonaeBridge();
    const pages = personae?.findAllPages?.() ?? [];
    const location = this._findPersonaLocation(pages, personaActorUuid);
    if (!location) return { outcome: 'not_found' };

    const contacts = personae.readPersonaContacts(location.page, location.personaKey);
    const contact = contacts.find((c) => c.actorUuid === heroActorUuid);
    if (!contact) return { outcome: 'not_found' };

    const fromId = await this._resolveNpcId(personaActorUuid);
    const toId = await this._resolveNpcId(heroActorUuid);
    const attitude = levelToAttitude(contact.level);
    if (!fromId || !toId) {
      return { fromId, toId, level: contact.level, attitude, outcome: 'unmapped' };
    }

    await this.socialEngine.setAttitude(fromId, toId, attitude, {
      tags: ['personae_dramatis_baseline'],
      meta: { sourceLevel: contact.level, importedAt: Date.now() }
    });
    return { fromId, toId, level: contact.level, attitude, outcome: 'imported' };
  }

  async pushAll({ dryRun = false, onlyBaseline = true } = {}) {
    const res = await this.exportToPersonaeDramatis({ dryRun, onlyBaseline });
    return { ...res, pushed: res.exported };
  }

  async pullAll({ overwrite = false, dryRun = false, neutralThreshold = 0 } = {}) {
    return this.importFromPersonaeDramatis({ dryRun, overwriteManual: overwrite, neutralThreshold });
  }

  async pushOne(fromId, toId, { dryRun = false } = {}) {
    const rel = this.socialEngine.getRelationship?.(fromId, toId);
    if (!rel) return { outcome: 'not_found', fromId, toId };
    const temp = {
      listAllRelationships: () => [{ fromId, toId, value: rel.value, tags: rel.tags ?? [], meta: rel.meta ?? null }]
    };
    const original = this.socialEngine;
    this.socialEngine = temp;
    try {
      const res = await this.exportToPersonaeDramatis({ dryRun, onlyBaseline: false });
      return res.details?.[0] ?? { outcome: res.exported ? 'exported' : 'skipped', fromId, toId };
    } finally {
      this.socialEngine = original;
    }
  }

  register() {
    if (this._relationHookId != null) return this._relationHookId;
    this._relationHookId = Hooks.on('janus7.social.relation.changed', async ({ fromId, toId } = {}) => {
      try {
        if (!fromId || !toId) return;
        await this.pushOne(fromId, toId, { dryRun: false });
      } catch (err) {
        this.logger?.warn?.(`${MODULE_ABBREV} | SocialSync | reactive push failed`, { message: err?.message });
      }
    });
    return this._relationHookId;
  }

  unregister() {
    if (this._relationHookId == null) return;
    try { Hooks.off('janus7.social.relation.changed', this._relationHookId); } catch (_) {}
    this._relationHookId = null;
  }

  _getPersonaeBridge() {
    const bridge = this.bridge?.personae ?? this.bridge?.personaeDramatis ?? this.bridge?.personaeSocial ?? null;
    if (!bridge) {
      throw new Error(`${MODULE_ABBREV}: SocialSync needs DSA5 personae bridge`);
    }
    return bridge;
  }

  _readAllContacts() {
    const personae = this._getPersonaeBridge();
    const pages = personae?.findAllPages?.() ?? [];
    const contacts = [];

    for (const page of pages) {
      const personaMap = page?.system?.personae ?? {};
      const allContacts = personae.readAllContacts(page);
      for (const [personaKey, bucket] of Object.entries(allContacts ?? {})) {
        const personaEntry = personaMap?.[personaKey] ?? {};
        const personaActorUuid = personaEntry?.actor_uuid ?? null;
        const personaName = personaEntry?.name ?? personaEntry?.label ?? personaKey;
        for (const [slug, data] of Object.entries(bucket ?? {})) {
          const level = Number(data?.level ?? 5);
          contacts.push({
            pageId: page?.id ?? null,
            personaKey,
            personaName,
            personaActorUuid,
            heroActorUuid: deslugifyUuid(slug),
            level,
            attitude: levelToAttitude(level)
          });
        }
      }
    }

    return contacts;
  }

  _findPersonaLocation(pages, personaActorUuid) {
    if (!personaActorUuid) return null;
    const personae = this._getPersonaeBridge();
    for (const page of pages ?? []) {
      const personaKey = personae.findPersonaKeyForActor(page, personaActorUuid);
      if (personaKey) return { page, personaKey };
    }
    return null;
  }

  async _resolveNpcId(actorUuid) {
    if (!actorUuid) return null;
    const cache = await this._ensureUuidCache();
    if (cache.has(actorUuid)) return cache.get(actorUuid);

    try {
      const actor = await fromUuid(actorUuid);
      if (!actor?.name) return null;
      const nameNorm = actor.name.toLowerCase().trim();
      for (const npc of this._getAllNpcs()) {
        if ((npc.name ?? '').toLowerCase().trim() === nameNorm) {
          cache.set(actorUuid, npc.id);
          return npc.id;
        }
      }
    } catch {
      /* ignore missing actor */
    }
    return null;
  }

  async _resolveActorUuidForNpcId(npcId) {
    if (!npcId) return null;

    for (const npc of this._getAllNpcs()) {
      if (npc?.id !== npcId) continue;
      const uuid = npc?.foundry?.actorUuid ?? npc?.foundryUuid ?? null;
      if (uuid) return uuid;
    }

    const state = this.socialEngine?.state;
    const rawRef = state?.getPath?.(`foundryLinks.npcs.${npcId}`) ?? state?.getPath?.(`actors.npcs.${npcId}`) ?? null;
    if (typeof rawRef === 'string' && rawRef) {
      if (rawRef.startsWith('Actor.')) {
        const actorId = rawRef.split('.').at(-1);
        return game?.actors?.get?.(actorId)?.uuid ?? rawRef;
      }
      const actor = game?.actors?.get?.(rawRef) ?? game?.actors?.getName?.(rawRef);
      if (actor?.uuid) return actor.uuid;
    }

    return null;
  }

  async _ensureUuidCache() {
    if (this._uuidToNpcId) return this._uuidToNpcId;
    this._uuidToNpcId = new Map();
    for (const npc of this._getAllNpcs()) {
      const uuid = npc?.foundry?.actorUuid ?? npc?.foundryUuid ?? null;
      if (uuid) this._uuidToNpcId.set(uuid, npc.id);
    }
    return this._uuidToNpcId;
  }

  _getAllNpcs() {
    try {
      return this.academyData?.listNpcs?.() ?? this.academyData?.getNpcs?.() ?? this.academyData?.listStudents?.() ?? [];
    } catch {
      return [];
    }
  }
}
