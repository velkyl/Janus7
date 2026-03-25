import { moduleAssetPath } from '../../core/common.js';
/**
 * @file bridge/dsa5/index.js
 * @module janus7
 * @phase 3
 *
 * Zweck:
 * DSA5-Bridge: stabile API für Actors/Items/Rolls/Wrapper, isoliert dsa5-Interna.
 *
 * Architektur:
 * - Diese Datei ist Teil von Phase 3 und darf nur Abhängigkeiten zu Phasen <= 3 haben.
 * - Öffentliche Funktionen/Exports sind JSDoc-dokumentiert, damit JANUS7 langfristig wartbar bleibt.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */

import { DSA5_SYSTEM_ID, MIN_DSA5_VERSION, MIN_FOUNDRY_CORE } from './constants.js';
import { DSA5NotAvailableError } from './errors.js';
import { DSA5Resolver } from './resolver.js';
import { DSA5RollApi } from './rolls.js';
import { DSA5ActorBridge } from './actors.js';
import { DSA5ItemBridge } from './items.js';
import { DSA5PacksIndex } from './packs.js';
import { runDsa5BridgeDiagnostics } from './diagnostics.js';
import { DSA5ConditionBridge, DSA5_CONDITION_IDS, JANUS_TO_DSA5_CONDITION_MAP } from './conditions.js';
import { DSA5AttributeReader } from './attributes.js';
import { DSA5CalendarSync } from './calendar-sync.js';
import { DSA5JournalBridge } from './journal.js';
import { DSA5HooksBridge } from './hooks-bridge.js';
import { DSA5DamageBridge } from './damage.js';
import { DSA5ItemFactoryBridge, itemTypeFromSystemSkillId, nameFromSystemSkillId } from './item-factory.js';
import { AcademyLibraryService } from './library-service.js';

// ─── Neue Sub-Bridges (Phase 3 Audit, Aufgaben 1-8) ──────────────────────────
import { DSA5GroupCheckBridge } from './group-check.js';
import { DSA5TraditionBridge, TRADITION_CIRCLE_MAP_DEFAULT } from './tradition.js';
import { DSA5TimedConditionBridge, JANUS_DURATION } from './timed-conditions.js';
import { DSA5PostRollBuffBridge } from './postroll-buff.js';
import { DSA5PersonaeSocialBridge } from './personae-social.js';
import { DSA5AdvancementBridge } from './advancement.js';
import { DSA5FateBridge, SCHIP_SOURCE, readGroupSchips } from './fate.js';
import { DSA5MoonBridge, MOON_PHASES, MOON_CYCLE_DAYS } from './moon.js';
import { emitHook, HOOKS } from '../../core/hooks/emitter.js';

// Re-export constants for consumers
export {
  DSA5_CONDITION_IDS, JANUS_TO_DSA5_CONDITION_MAP,
  SCHIP_SOURCE, MOON_PHASES, MOON_CYCLE_DAYS, JANUS_DURATION,
  TRADITION_CIRCLE_MAP_DEFAULT,
};

/**
 * Phase 3: DSA5 System Bridge – zentrale Fassade
 */
/**
 * DSA5SystemBridge
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class DSA5SystemBridge {
  /**
   * @param {object} deps
   * @param {Console} [deps.logger]
   * @param {import('../../academy/data-api.js').AcademyDataApi} [deps.academy]
   */
  constructor({ logger, academy } = {}) {
    this.logger = logger ?? console;
    this.academy = academy ?? null;

    this.resolver = new DSA5Resolver({ logger: this.logger });
    this.rolls = new DSA5RollApi({ resolver: this.resolver, logger: this.logger });
    this.actors = new DSA5ActorBridge({
      resolver: this.resolver,
      academy: this.academy,
      logger: this.logger,
    });
    this.packs = new DSA5PacksIndex({ logger: this.logger });
    this.items = new DSA5ItemBridge({ resolver: this.resolver, packs: this.packs, logger: this.logger });

    // ─── Neue Sub-Bridges (v2) ─────────────────────────────────────────────
    this.conditions   = new DSA5ConditionBridge({ resolver: this.resolver, logger: this.logger });
    this.attributes   = new DSA5AttributeReader({ logger: this.logger });
    this.calendarSync = new DSA5CalendarSync({ logger: this.logger });
    this.journal      = new DSA5JournalBridge({ logger: this.logger });
    this.damage       = new DSA5DamageBridge({ logger: this.logger });
    this.itemFactory  = new DSA5ItemFactoryBridge({ packs: this.packs, logger: this.logger });
    this.library      = new AcademyLibraryService({ logger: this.logger, systemId: DSA5_SYSTEM_ID });

    // ─── Neue Sub-Bridges v3 (Audit Aufgaben 1-8) ─────────────────────────────
    this.groupCheck   = new DSA5GroupCheckBridge({ logger: this.logger });
    this.tradition    = new DSA5TraditionBridge({ logger: this.logger });
    this.timedCond    = new DSA5TimedConditionBridge({ logger: this.logger });
    this.postRoll     = new DSA5PostRollBuffBridge({ logger: this.logger });
    this.postRollBuff = this.postRoll; // compat alias for lesson-buff-manager.js
    this.personae     = new DSA5PersonaeSocialBridge({ logger: this.logger });
    this.personaeDramatis = this.personae;
    this.personaeSocial = this.personae;
    this.advancement  = new DSA5AdvancementBridge({ logger: this.logger });
    this.fate         = new DSA5FateBridge({ logger: this.logger });
    this.moon         = new DSA5MoonBridge({ logger: this.logger });

    /**
     * Hooks-Bridge: lazy — erst bei init() aktiviert.
     * @type {DSA5HooksBridge}
     */
    this.hooks = new DSA5HooksBridge({
      logger: this.logger,
      // onRollCompleted: hooks-bridge feuert HOOKS.ROLL_COMPLETED bereits via emitHook().
      // Kein zweiter Emit hier — Doppel-Trigger vermeiden.
    });

    /** @type {object|null} */
    this.capabilities = null;

    // Bind alle öffentlichen Methoden an diese Instanz.
    // Ohne Binding ginge beim Destructuring der Kontext verloren, was
    // `this.assertAvailable()` und andere Zugriffe bricht. Durch das
    // Binding wird `this` innerhalb der Methoden korrekt gesetzt, auch
    // wenn die Funktion separat aufgerufen wird (z.B. via `const { rollSkill } = dsa5`).
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const fn = this[key];
      if (typeof fn === 'function') {
        this[key] = fn.bind(this);
      }
    }
  }

  /**
   * Initialisiert die DSA5 Bridge (aktuell No-Op).
   * @returns {Promise<void>}
   */
  async init() {
    // Capability-Erkennung: dsa5 ist ein bewegliches Ziel.
    // Wir loggen und exponieren minimal, was verfügbar ist, damit Tests und UI robust entscheiden können.
    try {
      const sys = this.system;
      const sysVersion = String(sys?.version ?? game?.system?.version ?? 'unknown');

      // Foundry v13+: game.release.generation ist die robuste "Hauptversion".
      const coreGen = Number(game?.release?.generation ?? NaN);
      const coreVersion = String(game?.version ?? game?.release?.version ?? 'unknown');

      // Helpers: Versionsvergleich ohne harte Abhängigkeit
      const isNewer = (a, b) => {
        try {
          return foundry?.utils?.isNewerVersion?.(a, b) ?? false;
        } catch {
          return false;
        }
      };

      const actorProto = globalThis?.Actor?.prototype ?? {};
      const hasSetupSkill = typeof actorProto.setupSkill === 'function';
      const hasBasicTest = typeof actorProto.basicTest === 'function';
      const hasSetupCharacteristic = typeof actorProto.setupCharacteristic === 'function';
      const hasSetupSpell = typeof actorProto.setupSpell === 'function';
      const hasSetupWeapon = typeof actorProto.setupWeapon === 'function';

      // dsa5-spezifische Konfig (best effort)
      const hasConfigDSA5 = Boolean(globalThis?.CONFIG?.DSA5);
      const hasI18nDSA5 = Boolean(globalThis?.game?.i18n);

      const caps = {
        systemId: this.systemId,
        systemAvailable: this.available,
        systemVersion: sysVersion,
        coreGeneration: Number.isFinite(coreGen) ? coreGen : null,
        coreVersion,
        meetsMinFoundry: Number.isFinite(coreGen) ? coreGen >= MIN_FOUNDRY_CORE : null,
        meetsMinDsa5: sysVersion !== 'unknown' ? isNewer(sysVersion, MIN_DSA5_VERSION) || sysVersion === MIN_DSA5_VERSION : null,

        // Actor-Roll APIs
        hasSetupSkill,
        hasBasicTest,
        hasSetupCharacteristic,
        hasSetupSpell,
        hasSetupWeapon,

        // Foundry-Dice RNG Hook (für deterministische Tests)
        hasDiceRandomUniform: typeof CONFIG?.Dice?.randomUniform === 'function',

        // Weitere Signale
        hasConfigDSA5,
        hasI18n: hasI18nDSA5,

        // Neue Sub-Bridge-Capabilities (v2)
        hasAddCondition:       typeof actorProto.addCondition    === 'function',
        hasRemoveCondition:    typeof actorProto.removeCondition === 'function',
        hasApplyDamage:        typeof actorProto.applyDamage     === 'function',
        hasApplyRegeneration:  typeof actorProto.applyRegeneration === 'function',
        hasApplyMana:          typeof actorProto.applyMana       === 'function',
        hasDSA5Payment:        Boolean(game?.dsa5?.apps?.DSA5Payment),
        hasDSA5Calendar:       Boolean(game?.dsa5?.apps?.WorldCalendar),
        hasItemFactory:        Boolean(game?.dsa5?.entities?.ItemFactory),
        hasItemFactoryBridge:  true, // DSA5ItemFactoryBridge immer vorhanden (inkl. Compendium-Fallback)

        // Sub-Bridge-Capabilities v3 (Audit 1-8)
        hasGroupCheck:         Boolean(game?.dsa5?.apps?.RequestRoll),
        hasFatePoints:         typeof actorProto.useFateOnRoll === 'function',
        hasMoonPhase:          Boolean(game?.time?.calendar?.timeToComponents),
        hasTimedConditions:    typeof actorProto.addTimedCondition === 'function',
        hasAdvancement:        Boolean(globalThis?.CONFIG?.DSA5?.advancementCosts),
      };

      this.capabilities = caps;
      this.logger?.info?.('[JANUS7][DSA5] capabilities', caps);

      // ─── Hooks-Bridge aktivieren ──────────────────────────────────────
      this.hooks.register();

      // ─── Sub-Bridges v3: Hooks registrieren ──────────────────────────
      this.fate.register();
      this.moon.register();
      this.moon.loadModifiers(moduleAssetPath('data/academy/moon-modifiers.json'))
        .catch(e => this.logger?.warn?.('[JANUS7][Moon] Modifikatoren konnten nicht geladen werden', e));

      this.logger?.info?.('[JANUS7][DSA5] Bridge v3 initialisiert (groupCheck, tradition, timedCond, postRoll, personae, advancement, fate, moon).');
    } catch (e) {
      this.capabilities = { systemId: this.systemId, error: String(e?.message ?? e) };
      this.logger?.warn?.('[JANUS7][DSA5] capabilities detection failed', e);
    }
  }

  /**
   * Prüft, ob eine Capability aktiv ist.
   * @param {keyof NonNullable<DSA5SystemBridge['capabilities']>} key
   */
  hasCapability(key) {
    return Boolean(this.capabilities && this.capabilities[key]);
  }

  /**
   * Harte Guard-Funktion, um saubere Fehlermeldungen zu erzeugen, bevor wir in dsa5 hineinlaufen.
   * @param {string[]} keys
   * @param {string} [context]
   */
  assertCapabilities(keys, context = 'unknown') {
    this.assertAvailable();
    const caps = this.capabilities ?? {};
    const missing = (keys ?? []).filter((k) => !caps[k]);
    if (missing.length) {
      throw new DSA5NotAvailableError(`DSA5 capability missing: ${missing.join(', ')}`, {
        systemId: DSA5_SYSTEM_ID,
        context,
        missing,
        capabilities: caps,
      });
    }
  }

  get systemId() {
    return DSA5_SYSTEM_ID;
  }

  get system() {
    const specific = game?.systems?.get?.(DSA5_SYSTEM_ID);
    if (specific) return specific;
    if (game?.system?.id === DSA5_SYSTEM_ID) return game.system;
    return null;
  }

  get available() {
    return Boolean(this.system);
  }

  assertAvailable() {
    if (!this.available) {
      throw new DSA5NotAvailableError('DSA5 System ist nicht verfügbar.', {
        systemId: DSA5_SYSTEM_ID,
      });
    }
  }

  async resolveActor(ref) {
    this.assertAvailable();
    return this.resolver.resolveActor(ref);
  }

  async resolveItem(ref, opts) {
    this.assertAvailable();
    return this.resolver.resolveItem(ref, opts);
  }

  clearCaches() {
    this.resolver?.clearCaches?.();
    this.packs?.clear?.();
  }

  async requestSkillCheck(args) {
    this.assertAvailable();
    // Preflight: saubere Fehlermeldung, bevor dsa5 intern crasht
    this.assertCapabilities(['hasSetupSkill', 'hasBasicTest'], 'requestSkillCheck');
    return this.rolls.requestSkillCheck(args);
  }

  /**
   * Kompatibilitäts-/Convenience-API für den Testkatalog:
   * rollSkill(actor, "Magiekunde", { modifier: -1 })
   *
   * @param {Actor|string} actorRef
   * @param {string|Item} skillRef Name, UUID oder Item
   * @param {import('./rolls.js').RollOptions} [options]
   */
  async rollSkill(actorRef, skillRef, options = {}) {
    this.assertAvailable();

    // 1) Skill ist bereits ein Item/UUID? -> direkt
    if (typeof skillRef === 'object' && skillRef?.documentName === 'Item') {
      return this.rolls.requestSkillCheck({ actorRef, skillRef, options });
    }
    if (typeof skillRef === 'string' && (skillRef.startsWith('Item.') || skillRef.startsWith('Compendium.'))) {
      return this.rolls.requestSkillCheck({ actorRef, skillRef, options });
    }

    // 2) Name -> versuche embedded Item auf Actor
    const actor = await this.resolver.require('Actor', actorRef);
    const name = String(skillRef ?? '').trim();
    const embedded = actor?.items?.find?.((i) => {
      const t = String(i.type ?? '').toLowerCase();
      if (t !== 'skill' && t !== 'talent') return false;
      return String(i.name ?? '').toLowerCase() === name.toLowerCase();
    });
    if (embedded) {
      return this.rolls.requestSkillCheck({ actorRef: actor, skillRef: embedded, options });
    }

    // 3) Name -> Compendium Index (erstes Match)
    try {
      await this.packs.ensureIndex({ documentName: 'Item' });
      const hit = await this.packs.findByName(name, { type: 'skill' });
      if (hit?.uuid) {
        return this.rolls.requestSkillCheck({ actorRef: actor, skillRef: hit.uuid, options });
      }
    } catch (_e) {
      // ignore
    }

    // 4) letzter Versuch: dsa5 kann setupSkill auch mit Namen akzeptieren
    return this.rolls.requestSkillCheck({ actorRef: actor, skillRef: name, options });
  }

  /**
   * Liefert einen Wrapper für einen Actor.
   * @param {Actor|string} actorRef
   */
  async wrapActor(actorRef) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.actors.wrapActor(actor);
  }

  /**
   * Liefert alle Zauber-Items eines Actors.
   * @param {Actor|string} actorRef
   * @returns {Promise<Item[]>}
   */
  async getActorSpells(actorRef, options = {}) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    const { source = 'items', learnedOnly = false } = options;
    // Phase-3 Vertrag: stabil, dedupliziert, sortiert.
    let items = [];
    let actorSpells = [];

    if (actor?.items) {
      actorSpells = Array.from(actor.items.values()).filter((i) => String(i?.type ?? '').toLowerCase() === 'spell');
    }

    if (source === 'items' || source === 'both') {
      items.push(...actorSpells);
    }

    // Compendium-Quelle: learned spells aus Pack-Index auflösen (abhängig von dsa5-Struktur)
    if (source === 'compendium' || source === 'both') {
      if (this.packs) {
        await this.packs.ensureIndex({ documentName: 'Item' });
        for (const embeddedSpell of actorSpells) {
          try {
            const hit = await this.packs.findByName(embeddedSpell.name, { type: 'spell' });
            if (hit?.uuid) {
              const compendiumItem = await this.resolver.resolveItem(hit.uuid);
              if (compendiumItem) {
                items.push(compendiumItem);
              }
            }
          } catch (e) {
            this.logger?.warn?.('[JANUS7][DSA5][getActorSpells] packs lookup failed', { spellName: embeddedSpell.name, error: e });
          }
        }
      }
    }
    // Filter
    items = items.filter((i) => String(i?.type ?? '').toLowerCase() === 'spell');
    if (learnedOnly) {
      // Best-effort: falls dsa5 ein Flag/Attribut markiert. Wenn nicht vorhanden -> keine zusätzliche Filterung.
      items = items.filter((i) => {
        const sys = i?.system ?? {};
        const learned = sys.learned ?? sys.isLearned ?? sys.talentValue != null;
        return learned !== false;
      });
    }
    // Dedupe + Sort
    const seen = new Set();
    const out = [];
    for (const it of items) {
      const key = it?.uuid ?? it?.id ?? `${it?.type}:${it?.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    out.sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'de'));
    return out;
  }

  async requestAttributeCheck(args) {
    this.assertAvailable();
    this.assertCapabilities(['hasSetupCharacteristic', 'hasBasicTest'], 'requestAttributeCheck');
    return this.rolls.requestAttributeCheck(args);
  }

  async requestSpellCast(args) {
    this.assertAvailable();
    this.assertCapabilities(['hasSetupSpell', 'hasBasicTest'], 'requestSpellCast');
    return this.rolls.requestSpellCast(args);
  }

  async requestAttack(args) {
    this.assertAvailable();
    this.assertCapabilities(['hasSetupWeapon', 'hasBasicTest'], 'requestAttack');
    return this.rolls.requestAttack(args);
  }

  async resolveAcademyNpcActor(npcId) {
    this.assertAvailable();
    return this.actors.resolveFromAcademyNpcId(npcId);
  }

  async ensureSpellOnActor(params) {
    this.assertAvailable();
    return this.items.ensureSpellOnActor(params);
  }

  async runDiagnostics() {
    return runDsa5BridgeDiagnostics({ bridge: this, logger: this.logger });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Conditions API (Phase 3, v2)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fügt eine DSA5-Condition zu einem Actor hinzu.
   * @param {Actor} actor
   * @param {string} conditionId  - aus DSA5_CONDITION_IDS
   * @param {number} [value=1]
   * @returns {Promise<void>}
   */
  async addCondition(actor, conditionId, value = 1) {
    this.assertAvailable();
    return this.conditions.addCondition(actor, conditionId, value);
  }

  /**
   * Entfernt eine DSA5-Condition.
   */
  async removeCondition(actor, conditionId, value = 1) {
    this.assertAvailable();
    return this.conditions.removeCondition(actor, conditionId, value);
  }

  /**
   * Wendet einen JANUS7-Akademiezustand als DSA5-Condition an.
   * @param {Actor} actor
   * @param {string} janusCondition  - 'stress' | 'tired' | 'exam_panic' | 'overworked' | 'sick' | 'injured' | 'magic_shock' | 'detention'
   */
  async applyAcademyCondition(actor, janusCondition, valueOverride) {
    this.assertAvailable();
    return this.conditions.applyAcademyCondition(actor, janusCondition, valueOverride);
  }

  /**
   * Liefert Akademiezustand-Snapshot eines Actors (alle JANUS7-States).
   */
  getAcademyConditionSnapshot(actor) {
    return this.conditions.getAcademyConditionSnapshot(actor);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Attribute API (Phase 3, v2)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Liefert alle 8 DSA5-Eigenschaften eines Actors.
   * @param {Actor} actor
   * @returns {{ mu, kl, in, ch, ff, ge, ko, kk }}
   */
  getCharacteristics(actor) {
    return this.attributes.getCharacteristics(actor);
  }

  /**
   * Liefert LeP/AsP/KaP-Vitalwerte.
   */
  getVitals(actor) {
    return this.attributes.getVitals(actor);
  }

  /**
   * Liefert Talentwert (FW) eines Skills/Zaubers per Name.
   */
  getSkillValue(actor, skillName) {
    return this.attributes.getSkillValue(actor, skillName);
  }

  /**
   * Vollständiger Attribut-Snapshot für KI-Export/Scoring.
   */
  getActorSnapshot(actor) {
    return this.attributes.getFullSnapshot(actor);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Damage/Regeneration API (Phase 3, v2)
  // ═══════════════════════════════════════════════════════════════════════════

  async applyDamage(actor, amount, opts = {}) {
    this.assertAvailable();
    return this.damage.applyDamage(actor, amount, opts);
  }

  async applyRegeneration(actor, lep = 0, asp = 0, kap = 0) {
    this.assertAvailable();
    return this.damage.applyRegeneration(actor, lep, asp, kap);
  }

  async applyMana(actor, amount, type = 'astralenergy') {
    this.assertAvailable();
    return this.damage.applyMana(actor, amount, type);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Calendar API (Phase 3, v2)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Konvertiert JANUS7-Zeit in ein DSA5-Bosphoran-Datum.
   */
  janusTimeToDSA5Date(janusTime) {
    return this.calendarSync.janusTimeToDSA5Date(janusTime);
  }

  /**
   * Schreibt JANUS7-Zeit in Foundry worldTime (GM-only).
   */
  async syncCalendarToFoundry(janusTime) {
    return this.calendarSync.pushToFoundryTime(janusTime);
  }

  /**
   * Formatiert DSA5-Datum als String: "15. Praios 1042 BF"
   */
  formatDSA5Date(dsa5Date) {
    return this.calendarSync.formatDSA5Date(dsa5Date);
  }

  /**
   * Fügt einen Akademie-Event zur dsacalendar-JournalPage hinzu.
   */
  async addCalendarEvent(opts) {
    return this.calendarSync.addCalendarEvent(opts);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Journal/Personae/AP API (Phase 3, v2)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fügt einen AP-Tracker-Eintrag ein (Akademie-Lernfortschritt).
   */
  async addApEntry(journalRef, opts) {
    return this.journal.addApEntry(journalRef, opts);
  }

  /**
   * Synchronisiert Akademie-NPCs mit dsapersonaedramatis-Page.
   */
  async syncNpcsToPersonae(journalRef, npcs) {
    return this.journal.syncNpcsToPersonae(journalRef, npcs);
  }

  /**
   * DSA5Payment: Geld abbuchen/gutschreiben.
   */
  async handlePayment(actor, moneyString, direction = 'pay') {
    return this.journal.handlePayment(actor, moneyString, direction);
  }

  /**
   * Prüft ob Actor genug Geld hat.
   */
  async canPay(actor, moneyString) {
    return this.journal.canPay(actor, moneyString);
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // ItemFactory API (Phase 3, v2 — Lehrplan-Items)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Prüft ob ein Actor ein Item für eine systemSkillId hat.
   * @param {Actor} actor
   * @param {string} systemSkillId  - z.B. 'TALENT_MAGIEKUNDE', 'SPELL_CORPOFRIGO'
   * @returns {Item|null}
   */
  findLessonItemOnActor(actor, systemSkillId) {
    return this.itemFactory.findItemOnActor(actor, systemSkillId);
  }

  /**
   * Prüft welche Items einer Lektions-Mechanik auf dem Actor fehlen.
   * @param {Actor} actor
   * @param {object[]} mechanics - lesson.mechanics.skills Array
   * @returns {{ missing: string[], present: string[] }}
   */
  checkLessonItems(actor, mechanics) {
    return this.itemFactory.checkLessonItems(actor, mechanics);
  }

  /**
   * Stellt sicher, dass ein Actor ein Item für eine systemSkillId hat.
   * Erstellt das Item bei Bedarf via ItemFactory oder Compendium-Import (GM-only).
   * @param {Actor} actor
   * @param {string} systemSkillId
   * @returns {Promise<{ item: Item|null, created: boolean, skipped: boolean }>}
   */
  async ensureItemOnActor(actor, systemSkillId) {
    return this.itemFactory.ensureItemOnActor(actor, systemSkillId);
  }

  /**
   * Stellt alle Lehrplan-Items einer Lektion auf einem Actor sicher.
   * @param {Actor} actor
   * @param {object} lessonDef - Lesson-Objekt aus lessons.json
   * @returns {Promise<{ ensured: string[], failed: string[] }>}
   */
  async ensureLessonItemsOnActor(actor, lessonDef) {
    return this.itemFactory.ensureLessonItemsOnActor(actor, lessonDef);
  }

  /**
   * Hilfsfunktion: Lesbaren Namen aus systemSkillId ableiten.
   * @param {string} systemSkillId
   * @returns {string}
   */
  nameFromSystemSkillId(systemSkillId) {
    return nameFromSystemSkillId(systemSkillId);
  }

  /**
   * Hilfsfunktion: DSA5 Item-Typ aus systemSkillId ableiten.
   * @param {string} systemSkillId
   * @returns {string|null}  null für ATTRIBUTE_*
   */
  itemTypeFromSystemSkillId(systemSkillId) {
    return itemTypeFromSystemSkillId(systemSkillId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Library API (Phase 3, v2 — Kompendien-Suche)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Liefert alle aktiven DSA5 Item-Packs (ohne Vollladung).
   * Respektiert DSA5 libraryModulsFilter.
   * @param {object} [opts]
   * @returns {CompendiumCollection[]}
   */
  listLibraryPacks(opts) {
    return this.library.listPacks(opts);
  }

  /**
   * Baut den cross-pack Index auf (nur Indizes, keine Dokumente).
   * @param {object} [opts]
   */
  async buildLibraryIndex(opts) {
    const res = await this.library.buildIndex(opts);
    try { emitHook(HOOKS.DSA5_INDEX_UPDATED, { source: 'DSA5SystemBridge.buildLibraryIndex', opts: opts ?? null, stats: this.library.stats?.() ?? null }); } catch (_) {}
    return res;
  }

  /**
   * Force-Rebuild des Library-Index (nach Modul-Aktivierung).
   * @param {object} [opts]
   */
  async refreshLibraryIndex(opts) {
    const res = await this.library.refresh(opts);
    try { emitHook(HOOKS.DSA5_INDEX_UPDATED, { source: 'DSA5SystemBridge.refreshLibraryIndex', opts: opts ?? null, stats: this.library.stats?.() ?? null }); } catch (_) {}
    return res;
  }

  /**
   * Cross-Pack Suche. Rein auf Indizes — keine Vollladung.
   * @param {{ q?: string, types?: string[], packs?: string[], limit?: number }} opts
   * @returns {Promise<import('./library-service.js').LibraryEntry[]>}
   */
  async searchLibrary(opts) {
    return this.library.search(opts);
  }

  /**
   * Exakter Name-Lookup im Library-Index.
   * @param {string} name
   * @param {string} [type]
   * @returns {Promise<import('./library-service.js').LibraryEntry|null>}
   */
  async findLibraryItem(name, type) {
    return this.library.findByName(name, type);
  }

  /**
   * Lazy Materialisierung: lädt genau 1 Dokument per UUID.
   * Nur aufrufen wenn wirklich nötig.
   * @param {string} uuid
   * @returns {Promise<Document|null>}
   */
  async resolveLibraryItem(uuid) {
    return this.library.resolve(uuid);
  }

  /**
   * Liefert leichte Snapshot-Einträge aus dem DSA5-Library-Index.
   * Geeignet für Graph-/Search-Read-Models ohne Dokument-Materialisierung.
   * @param {object} [opts]
   * @returns {Promise<import('./library-service.js').LibraryEntry[]>}
   */
  async getLibraryEntries(opts) {
    return this.library.entries(opts);
  }

  /**
   * Library-Statistiken: Anzahl Packs, Einträge, Alter des Index.
   * @returns {import('./library-service.js').LibraryStats}
   */
  getLibraryStats() {
    return this.library.stats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Group Check API (Aufgabe 1)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fordert eine Gruppenprobe über den DSA5-Chat an.
   * @param {string} skillName     - Lokalisierter Talentname (z.B. 'Körperbeherrschung')
   * @param {number} [modifier=0]  - Erschwernis/Erleichterung
   * @param {object} [opts]        - { title, rollMode }
   */
  async requestGroupCheck(skillName, modifier = 0, opts = {}) {
    this.assertAvailable();
    return this.groupCheck.requestGroupCheck(skillName, modifier, opts);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tradition → Zirkel API (Aufgabe 2)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Liest die Magietradition eines Actors und gibt den zugehörigen JANUS7-Zirkel zurück.
   * @param {Actor|string} actorRef
   * @returns {Promise<string|null>}  - circleId oder null
   */
  async getCircleFromTradition(actorRef) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    // tradition.suggestCircle() gibt circleId zurück (readTradition().resolvedCircleId)
    return this.tradition.suggestCircle(actor) ?? null;
  }

  /**
   * Synchronisiert Tradition → Zirkel für alle Studenten via CircleAssignment.
   * @param {Array} students - Array von NPC-Objekten mit foundryUuid
   * @returns {Promise<Array>}
   */
  async syncTraditionCircles(students) {
    this.assertAvailable();
    const results = [];
    for (const s of (students ?? [])) {
      try {
        const actorRef = s?.foundry?.actorUuid ?? s?.foundryUuid ?? s?.actorRef;
        if (!actorRef) { results.push({ npcId: s?.id, circleId: null, method: 'no_actor' }); continue; }
        const actor = await this.resolver.require('Actor', actorRef).catch(() => null);
        if (!actor) { results.push({ npcId: s?.id, circleId: null, method: 'no_actor' }); continue; }
        const circleId = this.tradition.suggestCircle(actor) ?? null;
        results.push({ npcId: s?.id, circleId, method: 'tradition' });
      } catch (err) {
        results.push({ npcId: s?.id, circleId: null, method: 'error', error: err?.message });
      }
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Timed Conditions API (Aufgabe 3)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fügt einem Actor eine zeitbegrenzte Condition hinzu.
   * @param {Actor|string} actorRef
   * @param {string}       conditionId - DSA5 Condition-ID (z.B. 'feared', 'stunned')
   * @param {object}       [opts]      - { value, seconds, description }
   * @returns {Promise<ActiveEffect[]>}
   */
  async addTimedCondition(actorRef, conditionId, opts = {}) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.timedCond.addTimedCondition(actor, conditionId, opts);
  }

  /**
   * Wendet eine vorkonfigurierte Akademie-Condition an (aus conditions-map).
   * @param {Actor|string} actorRef
   * @param {string}       academyConditionId - z.B. 'exam_panic', 'stress', 'magic_shock'
   * @param {object}       [opts]
   */
  async applyTimedAcademyCondition(actorRef, academyConditionId, opts = {}) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    if (typeof this.timedCond?.applyTimedAcademyCondition !== 'function') {
      throw new Error('TimedCondition service contract broken: applyTimedAcademyCondition missing');
    }
    return this.timedCond.applyTimedAcademyCondition(actor, academyConditionId, opts);
  }

  /**
   * Gibt alle aktiven timed Conditions eines Actors zurück.
   * @param {Actor|string} actorRef
   * @returns {Promise<object[]>}
   */
  async getTimedConditions(actorRef) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.timedCond.getTimedConditions(actor);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PostRoll Buff API (Aufgabe 4)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gibt einen Lehrenden-Buff (ActiveEffect) auf einen Studenten-Actor.
   * @param {Actor|string} actorRef
   * @param {string}       teacherId  - Lehrer-NPC-ID aus teacher-bonuses.json
   * @param {string}       subject    - Fach-ID
   * @param {object}       [opts]
   */
  async applyTeacherBuff(actorRef, teacherId, subject, opts = {}) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.postRoll.applyTeacherBuff(actor, teacherId, subject, opts);
  }

  /**
   * Entfernt alle JANUS7-Lehrerboni von einem Actor.
   * @param {Actor|string} actorRef
   */
  async removeTeacherBuffs(actorRef, filter = {}) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.postRoll.removeTeacherBuffs(actor, filter);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PersonaeDramatis Social Sync API (Aufgabe 5)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Synchronisiert JANUS7-Sozialwert → PersonaeDramatis-Journal.
   * @param {string} npcId
   * @param {string} targetNpcId
   * @param {number} attitudeValue  - JANUS7-Wert (0-100)
   */
  async syncSocialContact(npcId, targetNpcId, attitudeValue) {
    this.assertAvailable();
    return this.personae.syncSocialContact(npcId, targetNpcId, attitudeValue);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Advancement / AP Bridge API (Aufgabe 6)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gibt den AP-Status (total/spent/free) eines Actors zurück.
   * @param {Actor|string} actorRef
   * @returns {Promise<{total: number, spent: number, free: number}>}
   */
  async getXpStatus(actorRef) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.advancement.getXpStatus(actor);
  }

  /**
   * Vergibt AP an einen Actor. GM-only.
   * @param {Actor|string} actorRef
   * @param {number}       amount
   * @param {string}       [reason]
   */
  async awardXp(actorRef, amount, reason = '') {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.advancement.awardXp(actor, amount, reason);
  }

  /**
   * Steigert ein Talent/Zauber um 1 Stufe (AP werden abgezogen). GM-only.
   * @param {Actor|string} actorRef
   * @param {Item|string}  itemRef   - Talent- oder Zauber-Item
   */
  async advanceItem(actorRef, itemRef) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    const item  = typeof itemRef === 'string'
      ? actor.items.get(itemRef) ?? actor.items.getName(itemRef)
      : itemRef;
    return this.advancement.advanceItem(actor, item);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Fate / Schips API (Aufgabe 7)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gibt vollständigen Schips-Status zurück (persönlich + Gruppe).
   * @param {Actor|string} [actorRef]
   * @returns {Promise<{personal: object, group: object}>}
   */
  async getFateStatus(actorRef) {
    this.assertAvailable();
    const actor = actorRef ? await this.resolver.require('Actor', actorRef) : null;
    return this.fate.getFateStatus(actor);
  }

  /**
   * Gibt Gruppen-Schips zurück.
   * @returns {{ value: number, max: number, available: boolean }}
   */
  getGroupSchips() {
    this.assertAvailable();
    return this.fate.getGroupSchips();
  }

  /**
   * Vergibt einen persönlichen Schicksalspunkt. GM-only.
   * @param {Actor|string} actorRef
   * @param {number}       [amount=1]
   */
  async awardFatePoint(actorRef, amount = 1) {
    this.assertAvailable();
    const actor = await this.resolver.require('Actor', actorRef);
    return this.fate.awardFatePoint(actor, amount);
  }

  /**
   * Vergibt Gruppen-Schips. GM-only.
   * @param {number} [amount=1]
   */
  async awardGroupFatePoints(amount = 1) {
    this.assertAvailable();
    return this.fate.awardGroupFatePoints(amount);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Moon / Mondphasen API (Aufgabe 8)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gibt die aktuelle Mada-Mondphase zurück.
   * @returns {import('./moon.js').MoonStatus|null}
   */
  getCurrentMoonStatus() {
    this.assertAvailable();
    return this.moon.getCurrentMoonStatus();
  }

  /**
   * Lesbare Mondphasen-Bezeichnung, z.B. 'Rad (Vollmond)'.
   * @returns {string}
   */
  getMoonPhaseName() {
    this.assertAvailable();
    return this.moon.getMoonPhaseName();
  }

  /**
   * Mondphasenwechsel der nächsten N Tage.
   * @param {number} [count=4]
   * @returns {import('./moon.js').UpcomingPhase[]}
   */
  getUpcomingMoonPhases(count = 4) {
    this.assertAvailable();
    return this.moon.getUpcomingPhases(count);
  }

  /**
   * Mondphasen-FP/QS/Scoring-Modifikator für einen Lektionstyp.
   * @param {string} lessonType
   * @returns {import('./moon.js').MoonModifier}
   */
  getMoonLessonModifier(lessonType) {
    this.assertAvailable();
    return this.moon.getLessonModifier(lessonType);
  }

  /**
   * Mondphasen-AsP-Regenerationsbonus.
   * @param {boolean} [isDarkMage=false]
   * @returns {{ aspBonus: number, description: string }}
   */
  getMoonAstralModifier(isDarkMage = false) {
    this.assertAvailable();
    return this.moon.getAstralEnergyModifier(isDarkMage);
  }

  /**
   * Vollständige Mondzusammenfassung (Control Panel / Beamer).
   * @param {string} [lessonType]
   * @returns {import('./moon.js').MoonSummary|null}
   */
  getMoonSummary(lessonType = null) {
    this.assertAvailable();
    return this.moon.getMoonSummary(lessonType);
  }

  /**
   * Tage bis zum nächsten Vollmond.
   * @returns {{ inDays: number }|null}
   */
  getNextFullMoon() {
    this.assertAvailable();
    return this.moon.getNextFullMoon();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Root-Facade Compatibility Aliases (v0.9.12.30)
  // These delegate to the appropriate sub-service so that guided tests and
  // console snippets can use the flat game.janus7.bridge.dsa5.* surface.
  // ─────────────────────────────────────────────────────────────────────────

  /** @see groupCheck.showGroupCheckMessage */
  async showGroupCheckMessage(opts = {}) {
    this.assertAvailable();
    return this.groupCheck.showGroupCheckMessage(opts);
  }

  /** @see groupCheck.conductGroupExam */
  async conductGroupExam(opts = {}) {
    this.assertAvailable();
    return this.groupCheck.conductGroupExam(opts);
  }

  /** @see tradition.readTradition */
  readTradition(actorRef) {
    this.assertAvailable();
    return this.tradition.readTradition(actorRef);
  }

  /**
   * Gibt den empfohlenen Zirkel für einen Actor zurück.
   * @see tradition.suggestCircle
   */
  async suggestCircleForActor(actorRef) {
    this.assertAvailable();
    const actor = await this.resolveActor(actorRef);
    return this.tradition.suggestCircle(actor);
  }

  /** @see tradition.updateMapping */
  updateTraditionMapping(newMapping) {
    this.assertAvailable();
    return this.tradition.updateMapping(newMapping);
  }

  /** @see advancement.getAdvanceCost */
  getAdvanceCost(item) {
    this.assertAvailable();
    return this.advancement.getAdvanceCost(item);
  }

  /** @see advancement.canAffordAdvancement */
  canAffordAdvancement(actorRef, itemRef) {
    this.assertAvailable();
    return this.advancement.canAffordAdvancement(actorRef, itemRef);
  }

  /** @see advancement.advanceLessonSkills */
  async advanceLessonSkills(actorRef, lessonDef, opts = {}) {
    this.assertAvailable();
    return this.advancement.advanceLessonSkills(actorRef, lessonDef, opts);
  }


  // ─── Personae-Social Root-Aliases (v0.9.12.31) ─────────────────────────
  // Tests und Console-Snippets nutzen bridge.readAllPersonaeContacts() etc.
  // Delegiert an bridge.personaeSocial (= bridge.personae).

  /**
   * Alle PersonaeDramatis-Kontakte einer Journal-Page.
   * @param {string|JournalEntry} journalRef
   * @returns {object[]}
   */
  readAllPersonaeContacts(journalRef) {
    this.assertAvailable();
    const page = this.personaeSocial.findPage(journalRef);
    if (!page) return [];
    return this.personaeSocial.readAllContacts(page);
  }

  /**
   * Findet den PersonaKey eines Actors in einer Journal-Page.
   * @param {string|JournalEntry} journalRef
   * @param {string} actorUuid
   * @returns {string|null}
   */
  findPersonaKeyForActor(journalRef, actorUuid) {
    this.assertAvailable();
    const page = this.personaeSocial.findPage(journalRef);
    if (!page) return null;
    return this.personaeSocial.findPersonaKeyForActor(page, actorUuid);
  }

  /**
   * Setzt socialContact.level für einen Persona-Kontakt.
   * @param {string|JournalEntry} journalRef
   * @param {string} personaKey
   * @param {string} targetActorUuid
   * @param {number} level
   * @returns {Promise<boolean>}
   */
  async setPersonaSocialLevel(journalRef, personaKey, targetActorUuid, level) {
    this.assertAvailable();
    const page = this.personaeSocial.findPage(journalRef);
    if (!page) return false;
    return this.personaeSocial.setContactLevel(page, personaKey, targetActorUuid, level);
  }


  // ─── PostRoll/Fate/Moon/Timed Root-Aliases (v0.9.12.32) ─────────────────
  /** @see postRoll.applyTeacherBonus */
  applyTeacherBonus(...args) { this.assertAvailable(); return this.postRoll.applyTeacherBonus(...args); }
  /** @see postRoll.applyToMany — maps applyTeacherBonusToMany */
  async applyTeacherBonusToMany(actorRefs, bonusDef, opts = {}) {
    this.assertAvailable();
    const actors = [];
    for (const ref of actorRefs ?? []) {
      try { actors.push(await this.resolver.require('Actor', ref)); }
      catch (err) { this.logger?.warn?.('[JANUS7][DSA5] applyTeacherBonusToMany: Actor nicht aufgelöst', { ref, error: err?.message }); }
    }
    return this.postRoll.applyToMany(actors, bonusDef, opts);
  }
  /** @see postRoll.getActiveTeacherBuffs */
  getActiveTeacherBuffs(...args) { this.assertAvailable(); return this.postRoll.getActiveTeacherBuffs(...args); }
  /** @see timedCond.applyToMany — maps applyTimedConditionToMany */
  async applyTimedConditionToMany(actorRefs, janusCondition, opts = {}) {
    this.assertAvailable();
    const actors = [];
    for (const ref of actorRefs ?? []) {
      try { actors.push(await this.resolver.require('Actor', ref)); }
      catch (err) { this.logger?.warn?.('[JANUS7][DSA5] applyTimedConditionToMany: Actor nicht aufgelöst', { ref, error: err?.message }); }
    }
    return this.timedCond.applyToMany(actors, janusCondition, opts);
  }
  /** @see fate.canUseFate */
  canUseFate(...args) { this.assertAvailable(); return this.fate.canUseFate(...args); }
  /** @see fate.getPersonalSchips */
  getPersonalSchips(...args) { this.assertAvailable(); return this.fate.getPersonalSchips(...args); }
  /** @see fate.setFatePoints */
  async setFatePoints(...args) { this.assertAvailable(); return this.fate.setFatePoints(...args); }
  /** @see moon.getNextNewMoon */
  getNextNewMoon(...args) { this.assertAvailable(); return this.moon.getNextNewMoon(...args); }

}