import { moduleAssetPath } from '../core/common.js';
/**
 * @file academy/circle-assignment.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *   Automatische Zirkelzuweisung für Akademieschüler anhand DSA5-Akteurdaten.
 *
 *   Drei-Stufen-Logik (Priorität absteigend):
 *     1. Tradition-Match: actor.system.magic.tradition.magical → tradition-circle-map.json
 *     2. Merkmal-Match:   actor.system.magic.feature.magical   → tradition-circle-map.json
 *     3. Attribut-Score:  Dominante Eigenschaft → circles.json.attributes[]
 *
 * Architektur:
 *   - Liest Mapping aus data/academy/tradition-circle-map.json (data-driven).
 *   - Nutzt bridge.magicReader für Actor-Daten.
 *   - Keine direkten dsa5-Importe.
 *   - Schreibt Ergebnis als session-local AcademyDataApi-Override (kein persistenter State-Write).
 *
 * Verwendung:
 *   const assigner = new JanusCircleAssignment({ bridge, academyData, logger });
 *   const result = await assigner.assignStudentToCircle(actor, npcId);
 *   // result.circleId → 'salamander'
 *   // result.method   → 'tradition' | 'feature' | 'attribute_score' | 'manual'
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {Object} CircleAssignmentResult
 * @property {string|null}  circleId    - Zirkel-ID aus circles.json (oder null wenn unentschieden)
 * @property {string}       method      - 'tradition' | 'feature' | 'attribute_score' | 'manual' | 'none'
 * @property {number}       confidence  - 0.0–1.0 (1.0 = eindeutiger Treffer)
 * @property {string|null}  matchedOn   - Der Wert der den Treffer ausgelöst hat
 * @property {string|null}  npcId       - JANUS7-NPC-ID (falls übergeben)
 */

export class JanusCircleAssignment {
  /**
   * @param {object} deps
   * @param {object} deps.bridge           - DSA5SystemBridge
   * @param {object} deps.academyData      - AcademyDataApi
   * @param {Console} [deps.logger]
   */
  constructor({ bridge, academyData, logger } = {}) {
    if (!bridge) throw new Error(`${MODULE_ABBREV}: JanusCircleAssignment benötigt bridge`);
    if (!academyData) throw new Error(`${MODULE_ABBREV}: JanusCircleAssignment benötigt academyData`);

    this.bridge = bridge;
    this.data = academyData;
    this.logger = logger ?? console;

    /** @type {Array|null} Gecachtes Mapping aus tradition-circle-map.json */
    this._mappingCache = null;
    /** @type {Array<{name:string,id:number}>} */
    this._hookIds = [];
  }

  register() {
    if (this._hookIds.length) return;

    // Optional lifecycle integration: if lesson/exam flows emit a roster refresh hook,
    // CircleAssignment can react in the future. For now the service must be safely registerable
    // so Phase 4 is not torn down by a missing method.
    const hookId = Hooks.on('janus7AcademyRosterChanged', async ({ dryRun = false } = {}) => {
      try {
        await this.assignAllStudents({ dryRun });
      } catch (err) {
        this.logger?.warn?.(`${MODULE_ABBREV} | CircleAssign | janus7AcademyRosterChanged fehlgeschlagen`, { error: err?.message ?? err });
      }
    });

    this._hookIds = [{ name: 'janus7AcademyRosterChanged', id: hookId }];
    this.logger?.info?.(`${MODULE_ABBREV} | CircleAssign | Hook registriert`);
  }

  unregister() {
    for (const { name, id } of this._hookIds) Hooks.off(name, id);
    this._hookIds = [];
  }

  // ─── Öffentliche API ──────────────────────────────────────────────────────

  /**
   * Ermittelt den passenden Zirkel für einen Actor.
   * Schreibt das Ergebnis NICHT in den State — nur Analyse.
   *
   * @param {Actor} actor
   * @param {string} [npcId]  - Optional: JANUS7-NPC-ID für Logging
   * @returns {Promise<CircleAssignmentResult>}
   *
   * @example
   * const result = await assigner.suggestCircle(actor, 'NPC_IRIAN_DAMARTIAN');
   * console.log(result.circleId, result.method, result.confidence);
   */
  async suggestCircle(actor, npcId = null) {
    const log = this.logger;

    // ── 1. Magieprofil lesen (via bridge.tradition.readTradition) ──────────
    // getMagicProfile() existiert nicht — stattdessen readTradition() nutzen,
    // das dieselben Felder (tradition, feature, guidevalue) liefert.
    let profile;
    try {
      const tradData = this.bridge?.tradition?.readTradition?.(actor);
      if (!tradData) throw new Error('tradition service not available');
      profile = {
        tradition: tradData.traditionString ?? null,
        feature:   tradData.feature ?? null,
        guidevalue: tradData.guidevalue ?? null,
        isMage:    tradData.isMage ?? false,
      };
    } catch (err) {
      log.warn?.(`${MODULE_ABBREV} | CircleAssign | Magieprofil lesen fehlgeschlagen`, { npcId, error: err?.message });
      return { circleId: null, method: 'none', confidence: 0, matchedOn: null, npcId };
    }

    const mapping = await this._loadMapping();
    if (!mapping.length) {
      log.warn?.(`${MODULE_ABBREV} | CircleAssign | Mapping leer`);
      return { circleId: null, method: 'none', confidence: 0, matchedOn: null, npcId };
    }

    // ── Stufe 1: Tradition-Match ─────────────────────────────────────────
    if (profile.tradition) {
      const norm = this._normalize(profile.tradition);
      for (const entry of mapping) {
        if (entry.traditions?.some((t) => this._normalize(t) === norm)) {
          log.info?.(`${MODULE_ABBREV} | CircleAssign | Tradition-Match`, {
            npcId, circleId: entry.circleId, tradition: profile.tradition,
          });
          return {
            circleId: entry.circleId,
            method: 'tradition',
            confidence: 1.0,
            matchedOn: profile.tradition,
            npcId,
          };
        }
      }
    }

    // ── Stufe 2: Merkmal-Match ───────────────────────────────────────────
    if (profile.feature) {
      const norm = this._normalize(profile.feature);
      for (const entry of mapping) {
        if (entry.features?.some((f) => this._normalize(f) === norm)) {
          log.info?.(`${MODULE_ABBREV} | CircleAssign | Feature-Match`, {
            npcId, circleId: entry.circleId, feature: profile.feature,
          });
          return {
            circleId: entry.circleId,
            method: 'feature',
            confidence: 0.85,
            matchedOn: profile.feature,
            npcId,
          };
        }
      }
    }

    // ── Stufe 3: Attribut-Scoring ────────────────────────────────────────
    const attrResult = await this._assignByAttributes(actor, npcId);
    if (attrResult.circleId) return attrResult;

    // ── Kein Treffer ─────────────────────────────────────────────────────
    log.info?.(`${MODULE_ABBREV} | CircleAssign | Kein Treffer`, { npcId, profile });
    return { circleId: null, method: 'none', confidence: 0, matchedOn: null, npcId };
  }

  /**
   * Ermittelt Zirkel UND schreibt Ergebnis in npcs.json über AcademyDataApi.
   * Nur wenn confidence > minConfidence (default 0.5).
   *
   * @param {Actor} actor
   * @param {string} npcId          - JANUS7-NPC-ID (Pflicht fürs Speichern)
   * @param {object} [opts]
   * @param {number} [opts.minConfidence=0.5]  - Minimale Konfidenz zum Speichern
   * @param {boolean}[opts.overwrite=false]    - Vorhandene Zuweisung überschreiben?
   * @returns {Promise<CircleAssignmentResult & { saved: boolean }>}
   *
   * @example
   * const res = await assigner.assignStudentToCircle(actor, 'NPC_IRIAN_DAMARTIAN');
   * // res.circleId → 'staves'
   * // res.saved    → true  (session-local Override in AcademyDataApi._npcOverrides)
   */
  async assignStudentToCircle(actor, npcId, { minConfidence = 0.5, overwrite = false } = {}) {
    const suggestion = await this.suggestCircle(actor, npcId);

    let saved = false;

    if (suggestion.circleId && suggestion.confidence >= minConfidence) {
      try {
        // Prüfen ob bereits zugewiesen
        const npc = this.data.getNpc?.(npcId);
        const alreadyAssigned = npc?.house || npc?.circle;

        if (!alreadyAssigned || overwrite) {
          // AcademyDataApi.updateNpc (falls vorhanden) oder direkt im State
          if (typeof this.data.updateNpc === 'function') {
            await this.data.updateNpc(npcId, { house: suggestion.circleId });
            saved = true;
          } else if (typeof this.data.setNpcField === 'function') {
            await this.data.setNpcField(npcId, 'house', suggestion.circleId);
            saved = true;
          } else {
            this.logger?.warn?.(`${MODULE_ABBREV} | CircleAssign | AcademyDataApi hat keine updateNpc-Methode`);
          }

          if (saved) {
            this.logger?.info?.(`${MODULE_ABBREV} | CircleAssign | Zuweisung gespeichert`, {
              npcId,
              circleId: suggestion.circleId,
              method: suggestion.method,
            });
            emitHook(HOOKS.CIRCLE_ASSIGNED, { npcId, ...suggestion });
          }
        } else {
          this.logger?.info?.(`${MODULE_ABBREV} | CircleAssign | Bereits zugewiesen, übersprungen`, {
            npcId, existing: alreadyAssigned,
          });
        }
      } catch (err) {
        this.logger?.error?.(`${MODULE_ABBREV} | CircleAssign | Speichern fehlgeschlagen`, {
          npcId, error: err?.message,
        });
      }
    }

    return { ...suggestion, saved };
  }

  /**
   * Batch-Zuweisung: alle Schüler mit verknüpftem Foundry-Actor.
   * Gibt pro Schüler ein Ergebnis zurück.
   *
   * @param {object} [opts]
   * @param {boolean} [opts.overwrite=false]
   * @param {number}  [opts.minConfidence=0.5]
   * @param {boolean} [opts.dryRun=false]  - Nur Vorschau, kein Speichern
   * @returns {Promise<Array<CircleAssignmentResult & { npcId: string, actorName: string, saved: boolean }>>}
   *
   * @example
   * const results = await assigner.assignAllStudents({ dryRun: true });
   * // Zeigt Vorschau ohne Änderungen zu speichern
   */
  async assignAllStudents({ overwrite = false, minConfidence = 0.5, dryRun = false } = {}) {
    const students = this.data.listStudents?.() ?? this.data.listNpcs?.({ role: 'student' }) ?? [];
    const results = [];

    for (const student of students) {
      const npcId = student?.id;
      const actorUuid = student?.foundry?.actorUuid ?? student?.foundryUuid;

      if (!npcId || !actorUuid) {
        results.push({
          npcId,
          actorName: student?.name ?? '?',
          circleId: null,
          method: 'no_actor',
          confidence: 0,
          matchedOn: null,
          saved: false,
          _reason: 'Kein Foundry-UUID verknüpft',
        });
        continue;
      }

      let actor;
      try {
        actor = await fromUuid(actorUuid);
      } catch {
        actor = game.actors?.get(actorUuid);
      }

      if (!actor) {
        results.push({
          npcId,
          actorName: student?.name ?? '?',
          circleId: null,
          method: 'actor_not_found',
          confidence: 0,
          matchedOn: null,
          saved: false,
          _reason: `Actor ${actorUuid} nicht gefunden`,
        });
        continue;
      }

      let result;
      if (dryRun) {
        result = await this.suggestCircle(actor, npcId);
        result = { ...result, saved: false };
      } else {
        result = await this.assignStudentToCircle(actor, npcId, { overwrite, minConfidence });
      }

      results.push({ ...result, actorName: actor.name });
    }

    this.logger?.info?.(`${MODULE_ABBREV} | CircleAssign | Batch abgeschlossen`, {
      total: results.length,
      assigned: results.filter((r) => r.circleId).length,
      saved: results.filter((r) => r.saved).length,
      noActor: results.filter((r) => r.method === 'no_actor').length,
    });

    return results;
  }

  // ─── Interne Methoden ──────────────────────────────────────────────────────

  /**
   * Stufe 3: Attribut-Score-Matching.
   * Berechnet für jeden Zirkel einen Score basierend auf den Circles.attributes[].
   * Der Zirkel mit dem höchsten Wert der dominanten Eigenschaften gewinnt.
   *
   * @private
   */
  async _assignByAttributes(actor, npcId) {
    try {
      const chars = this.bridge.getCharacteristics(actor);
      if (!chars) return { circleId: null, method: 'attribute_score', confidence: 0, matchedOn: null, npcId };

      const circles = this.data.listCircles?.() ?? [];
      if (!circles.length) return { circleId: null, method: 'none', confidence: 0, matchedOn: null, npcId };

      // Score = Summe der Eigenschaften die im Zirkel gelistet sind
      // chars hat z.B. { MU: { advances: 3, modifier: 0, ... } }
      const scores = circles.map((circle) => {
        const attrs = circle.attributes ?? [];
        const score = attrs.reduce((sum, attr) => {
          const attrLower = attr.toLowerCase();
          const val = chars[attrLower]?.advances ?? chars[attrLower] ?? 0;
          return sum + (Number.isFinite(Number(val)) ? Number(val) : 0);
        }, 0);
        return { circleId: circle.id, score, attrCount: attrs.length };
      });

      scores.sort((a, b) => b.score - a.score);
      const best = scores[0];
      const secondBest = scores[1];

      if (!best || best.score === 0) {
        return { circleId: null, method: 'attribute_score', confidence: 0, matchedOn: null, npcId };
      }

      // Konfidenz: wie dominant ist der Gewinner?
      const margin = secondBest ? (best.score - secondBest.score) : best.score;
      const confidence = Math.min(0.7, 0.3 + (margin / Math.max(best.score, 1)) * 0.4);

      this.logger?.info?.(`${MODULE_ABBREV} | CircleAssign | Attribut-Score`, {
        npcId,
        circleId: best.circleId,
        scores: scores.map((s) => `${s.circleId}:${s.score}`).join(', '),
        confidence: confidence.toFixed(2),
      });

      return {
        circleId: best.circleId,
        method: 'attribute_score',
        confidence,
        matchedOn: `score:${best.score}`,
        npcId,
      };
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | CircleAssign | Attribut-Score fehlgeschlagen`, { error: err?.message });
      return { circleId: null, method: 'none', confidence: 0, matchedOn: null, npcId };
    }
  }

  /**
   * Lädt das Tradition-Circle-Mapping aus der JSON-Datei (gecacht).
   * @returns {Promise<Array>}
   * @private
   */
  async _loadMapping() {
    if (this._mappingCache) return this._mappingCache;

    try {
      // Weg 1: über AcademyDataApi (bevorzugt, SSOT)
      if (typeof this.data.getTraditionCircleMap === 'function') {
        this._mappingCache = await this.data.getTraditionCircleMap();
        return this._mappingCache;
      }

      // Weg 2: direkter fetch der JSON-Datei
      const resp = await fetch(moduleAssetPath('data/academy/tradition-circle-map.json'));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      this._mappingCache = json.circles ?? [];
      return this._mappingCache;
    } catch (err) {
      this.logger?.error?.(`${MODULE_ABBREV} | CircleAssign | Mapping-Datei nicht ladbar`, { error: err?.message });
      return [];
    }
  }

  /**
   * Normalisiert einen String für case-insensitiven Vergleich.
   * @param {string} s
   * @returns {string}
   * @private
   */
  _normalize(s) {
    return String(s ?? '').toLowerCase().trim()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }
}
