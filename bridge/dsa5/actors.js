import { DSA5NotAvailableError, DSA5ResolveError } from './errors.js';
import { DSA5_SYSTEM_ID } from './constants.js';
import { JanusActorWrapper } from './wrapper.js';

/**
 * Phase 3: DSA5 System Bridge – Actor-Hilfen
 *
 * Kapselt Actor-Lookups, insbesondere für Akademie-NPCs.
 */

/**
 * @typedef {object} AcademyNpcFoundryInfo
 * @property {string|null} actorKey
 * @property {string|null} actorUuid
 */

/**
 * @typedef {object} AcademyNpc
 * @property {string} id
 * @property {string} name
 * @property {AcademyNpcFoundryInfo} foundry
 */

/**
 * @typedef {import('../../academy/data-api.js').AcademyDataApi} AcademyDataApi
 */

/**
 * DSA5ActorBridge
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
export class DSA5ActorBridge {
  /**
   * @param {object} deps
   * @param {import('./resolver.js').DSA5Resolver} deps.resolver
   * @param {AcademyDataApi} [deps.academy]
   * @param {Console} [deps.logger]
   */
  constructor({ resolver, academy, logger } = {}) {
    if (!resolver) {
      throw new Error('DSA5ActorBridge benötigt einen Resolver.');
    }
    this.resolver = resolver;
    this.academy = academy ?? null;
    this.logger = logger ?? console;

    // Bind öffentliche Methoden an diese Instanz, damit `this` bei destrukturiertem Aufruf erhalten bleibt.
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const fn = this[key];
      if (typeof fn === 'function') this[key] = fn.bind(this);
    }
  }

  /**
   * DSA5-System vorhanden?
   * @returns {boolean}
   */
  get available() {
    const sys = game?.systems?.get?.(DSA5_SYSTEM_ID);
    if (sys) return true;
    return game?.system?.id === DSA5_SYSTEM_ID;
  }

  /**
   * Wirft eine Exception, falls das DSA5 System nicht bereit steht.
   */
  assertAvailable() {
    if (!this.available) {
      throw new DSA5NotAvailableError('DSA5 System ist nicht verfügbar.', {
        systemId: DSA5_SYSTEM_ID,
      });
    }
  }

  /**
   * Liefert einen Actor für eine Akademie-NPC-ID.
   *
   * - nutzt AcademyDataApi.getNPC(id)
   * - bevorzugt actorUuid (fromUuid)
   * - Fallback: actorKey → Suche in Welt-Actors
   *
   * @param {string} npcId
   * @returns {Promise<Actor|null>}
   */
  async resolveFromAcademyNpcId(npcId) {
    this.assertAvailable();

    if (!this.academy || typeof this.academy.getNPC !== 'function') {
      this.logger?.warn?.('DSA5ActorBridge: AcademyDataApi nicht konfiguriert.');
      throw new DSA5ResolveError('Akademie-Daten stehen nicht zur Verfügung.', { npcId });
    }

    const npc = this.academy.getNPC(npcId);
    if (!npc) {
      throw new DSA5ResolveError('Akademie-NPC wurde nicht gefunden.', { npcId });
    }

    return this.resolveFromNpc(npc);
  }

  /**
   * Löst einen Actor aus einer NPC-Definition auf.
   *
   * @param {AcademyNpc} npc
   * @returns {Promise<Actor|null>}
   */
  async resolveFromNpc(npc) {
    this.assertAvailable();

    const foundry = npc?.foundry ?? {};
    const { actorUuid, actorKey } = foundry;

    // 1) UUID bevorzugen (robust, unabhängig von Welt-Namen)
    if (actorUuid) {
      try {
        const doc = await fromUuid(actorUuid);
        if (doc instanceof Actor) return doc;
        this.logger?.warn?.('DSA5ActorBridge: UUID liefert kein Actor-Dokument.', {
          npcId: npc.id,
          actorUuid,
        });
      } catch (err) {
        this.logger?.warn?.('DSA5ActorBridge: Fehler beim Auflösen der Actor-UUID.', {
          npcId: npc.id,
          actorUuid,
          err,
        });
      }
    }

    // 2) Fallback: ActorKey über Welt-Actors (ID oder Name)
    if (actorKey) {
      const direct = game.actors?.get(actorKey);
      if (direct) return direct;

      const byName = game.actors?.getName?.(actorKey);
      if (byName) return byName;

      // defensiver Fallback: Case-insensitive-Suche
      const keyLower = String(actorKey).toLowerCase();
      const fuzzy =
        game.actors &&
        Array.from(game.actors.values()).find((a) => a.name?.toLowerCase() === keyLower);
      if (fuzzy) return fuzzy;
    }

    // 3) Fallback: janus7-Flag-Mapping (robust bei Umbenennungen)
    //    -> Wenn genau ein Actor die Flag janus7.npcId == npc.id trägt, nehmen wir den.
    const actors = game.actors ? Array.from(game.actors.values()) : [];
    const flagged = actors.filter((a) => {
      try {
        return a.getFlag?.('janus7', 'npcId') === npc.id;
      } catch (_e) {
        return false;
      }
    });
    if (flagged.length === 1) return flagged[0];

    // 4) Fallback: Normalisierte Namenssuche (Case/Whitespace/Underscore tolerant)
    //    Anti-Pattern: "fuzzy contains" -> zu viele False Positives.
    const norm = (s) =>
      String(s ?? '')
        .normalize('NFKC')
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('de-DE');

    // WICHTIG: Viele Academy-NPCs verwenden einen slug-artigen actorKey (z.B. "npc_felenius").
    // Damit finden wir reale Actors ("Jirdan Felenius") nicht per Namensvergleich.
    // -> Für die normalisierte Namenssuche hat der Klarname Priorität.
    const wanted = norm(npc?.name || actorKey);
    if (wanted) {
      const matches = actors.filter((a) => norm(a.name) === wanted);
      if (matches.length === 1) {
        // Self-heal: Flag setzen, damit wir künftig nicht mehr suchen müssen.
        try {
          await matches[0].setFlag?.('janus7', 'npcId', npc.id);
        } catch (_e) {
          // Kein Drama: fehlende Rechte oder read-only.
        }
        return matches[0];
      }
    }

    this.logger?.warn?.('DSA5ActorBridge: Konnte NPC nicht auf Actor abbilden.', {
      npcId: npc.id,
      foundry,
    });

    return null;
  }

  /**
   * Liefert einen dünnen Wrapper um einen Actor.
   * Der Wrapper kapselt Zugriffe auf DSA5 intern.
   *
   * @param {Actor} actor
   * @returns {JanusActorWrapper}
   */
  wrapActor(actor) {
    if (!actor) throw new DSA5ResolveError('Actor ist erforderlich', { actor });
    return new JanusActorWrapper(actor);
  }
}