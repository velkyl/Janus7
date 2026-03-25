import { STATE_PATHS } from '../core/common.js';
/**
 * @file academy/social.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *  JanusSocialEngine: MVP für soziale Beziehungen (Sympathien, Rivalitäten).
 *
 * Architektur:
 *  - Persistiert ausschließlich unter `academy.social` im JanusStateCore.
 *  - Nutzt AcademyDataApi nur für optionale Lookups (NPC/Schüler-Metadaten).
 *  - Kein direkter Zugriff auf DSA5-Systemobjekte.
 */

import { MODULE_ABBREV } from '../core/common.js';
import { emitHook, HOOKS } from '../core/hooks/emitter.js';

/**
 * @typedef {import('../core/state.js').JanusStateCore} JanusStateCore
 * @typedef {import('./data-api.js').AcademyDataApi} AcademyDataApi
 * @typedef {import('../core/logger.js').JanusLogger} JanusLogger
 */

/**
 * @typedef {Object} Relationship
 * @property {number} value        - numerischer Wert (z. B. -100 bis +100)
 * @property {string[]} [tags]     - optionale Tags (z. B. 'rivalry', 'crush')
 * @property {string|null} [updatedAt] - ISO Datum/Zeit der letzten Änderung
 * @property {any} [meta]          - beliebige Zusatzdaten
 */

export class JanusSocialEngine {
  /**
   * @param {Object} deps
   * @param {JanusStateCore} deps.state
   * @param {AcademyDataApi} [deps.academyData]
   * @param {JanusLogger} [deps.logger]
   */
  constructor({ state, academyData, logger }) {
    if (!state) {
      throw new Error(`${MODULE_ABBREV}: JanusSocialEngine benötigt einen JanusStateCore (deps.state).`);
    }

    /** @type {JanusStateCore} */
    this.state = state;
    /** @type {AcademyDataApi|null} */
    this.academyData = academyData ?? null;
    /** @type {JanusLogger|Console} */
    this.logger = logger ?? console;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Liefert die Relationship-Struktur zwischen zwei Akteuren.
   * @param {string} fromId
   * @param {string} toId
   * @returns {Relationship|null}
   */
  getRelationship(fromId, toId) {
    if (!fromId || !toId) return null;
    const social = this.state.get(STATE_PATHS.ACADEMY_SOCIAL) ?? {};
    const rels = social.relationships ?? {};
    const rel = rels[fromId]?.[toId] ?? null;
    if (!rel) return null;
    return {
      value: Number(rel.value ?? 0),
      tags: Array.isArray(rel.tags) ? [...rel.tags] : [],
      updatedAt: rel.updatedAt ?? null,
      meta: rel.meta ?? null
    };
  }

  /**
   * Liefert die „Attitüde“ von fromId gegenüber toId (Standard 0).
   * @param {string} fromId
   * @param {string} toId
   * @returns {number}
   */
  getAttitude(fromId, toId) {
    const rel = this.getRelationship(fromId, toId);
    return rel ? rel.value : 0;
  }

  /**
   * Liefert alle ausgehenden Beziehungen eines Akteurs.
   * @param {string} fromId
   * @returns {{ fromId: string, toId: string, value: number, tags: string[], updatedAt: string|null, meta: any }[]}
   */
  listRelationshipsFrom(fromId) {
    if (!fromId) return [];
    const social = this.state.get(STATE_PATHS.ACADEMY_SOCIAL) ?? {};
    const rels = social.relationships ?? {};
    const bucket = rels[fromId] ?? {};
    const result = [];
    for (const [toId, rel] of Object.entries(bucket)) {
      result.push({
        fromId,
        toId,
        value: Number(rel.value ?? 0),
        tags: Array.isArray(rel.tags) ? [...rel.tags] : [],
        updatedAt: rel.updatedAt ?? null,
        meta: rel.meta ?? null,
      });
    }
    return result;
  }

  /**
   * Liefert alle eingehenden Beziehungen zu einem Akteur.
   * @param {string} toId
   * @returns {{ fromId: string, toId: string, value: number, tags: string[], updatedAt: string|null, meta: any }[]}
   */
  listRelationshipsTo(toId) {
    if (!toId) return [];
    const social = this.state.get(STATE_PATHS.ACADEMY_SOCIAL) ?? {};
    const rels = social.relationships ?? {};
    const result = [];
    for (const [fromId, bucket] of Object.entries(rels)) {
      const rel = bucket?.[toId];
      if (!rel) continue;
      result.push({
        fromId,
        toId,
        value: Number(rel.value ?? 0),
        tags: Array.isArray(rel.tags) ? [...rel.tags] : [],
        updatedAt: rel.updatedAt ?? null,
        meta: rel.meta ?? null,
      });
    }
    return result;
  }

  /**
   * Liefert alle bekannten Beziehungen (gerichteter Graph).
   * @returns {{ fromId: string, toId: string, value: number, tags: string[], updatedAt: string|null, meta: any }[]}
   */
  listAllRelationships() {
    const social = this.state.get(STATE_PATHS.ACADEMY_SOCIAL) ?? {};
    const rels = social.relationships ?? {};
    const result = [];
    for (const [fromId, bucket] of Object.entries(rels)) {
      for (const [toId, rel] of Object.entries(bucket ?? {})) {
        result.push({
          fromId,
          toId,
          value: Number(rel.value ?? 0),
          tags: Array.isArray(rel.tags) ? [...rel.tags] : [],
          updatedAt: rel.updatedAt ?? null,
          meta: rel.meta ?? null,
        });
      }
    }
    return result;
  }


  /**
   * Setzt den Attitüde-Wert absolut.
   *
   * @param {string} fromId
   * @param {string} toId
   * @param {number} value
   * @param {Object} [options]
   * @param {string[]} [options.tags]
   * @param {any} [options.meta]
   */
  async setAttitude(fromId, toId, value, options = {}) {
    const v = this._clampAttitude(Number(value ?? 0));
    if (!Number.isFinite(v)) {
      throw new Error('JanusSocialEngine.setAttitude: value muss eine Zahl sein.');
    }
    await this._updateRelationship(fromId, toId, () => ({
      value: v,
      tags: options.tags ?? undefined,
      meta: options.meta ?? undefined
    }));
    return v;
  }

  /**
   * Addiert einen Delta-Wert auf die Relationship.
   *
   * @param {string} fromId
   * @param {string} toId
   * @param {number} delta
   * @param {Object} [options]
   * @param {string[]} [options.tags]
   * @param {any} [options.meta]
   * @returns {Promise<number>} Neuer Wert.
   */
  async adjustAttitude(fromId, toId, delta, options = {}) {
    const d = Number(delta ?? 0);
    if (!Number.isFinite(d) || d === 0) {
      return this.getAttitude(fromId, toId);
    }

    let newValue = 0;

    await this._updateRelationship(fromId, toId, (existing) => {
      const prev = Number(existing?.value ?? 0);
      newValue = this._clampAttitude(prev + d);
      return {
        value: newValue,
        tags: options.tags ?? existing?.tags,
        meta: options.meta ?? existing?.meta
      };
    });

    return newValue;
  }

  // ---------------------------------------------------------------------------
  // Intern
  // ---------------------------------------------------------------------------

  /**
   * Shared Helper für set/adjust-Operationen.
   * @private
   */
  async _updateRelationship(fromId, toId, mutator) {
    if (!fromId || !toId) {
      throw new Error('JanusSocialEngine._updateRelationship: fromId und toId sind erforderlich.');
    }

    const now = new Date().toISOString();
    let previousValue = 0;
    let newValue = 0;

    await this.state.transaction((state) => {
      const academy = state.get(STATE_PATHS.ACADEMY) ?? {};
      const social = academy.social ?? {};
      const rels = social.relationships ?? {};

      const existing = rels[fromId]?.[toId] ?? null;
      previousValue = Number(existing?.value ?? 0);

      const next = {
        ...(existing ?? {}),
        ...(mutator(existing) ?? {})
      };
      next.updatedAt = now;
      newValue = this._clampAttitude(Number(next.value ?? 0));
      next.value = newValue;

      if (!rels[fromId]) rels[fromId] = {};
      rels[fromId][toId] = next;

      social.relationships = rels;
      academy.social = social;
      state.set(STATE_PATHS.ACADEMY, academy);
    });

    this.logger?.debug?.(`${MODULE_ABBREV} | Relationship updated`, { fromId, toId });

    // Emit hook so UI (SocialView) and external consumers can react
    try {
      const delta = newValue - previousValue;
      emitHook(HOOKS.RELATION_CHANGED, {
        fromId,
        toId,
        value: newValue,
        previousValue,
        delta,
        updatedAt: now
      });
    } catch (err) {
      this.logger?.warn?.(`${MODULE_ABBREV} | janus7RelationChanged hook error`, err);
    }
  }

  /**
   * Relationship values are conceptually bounded.
   * We clamp to [-100..100] to prevent runaway numbers.
   * @param {number} v
   * @returns {number}
   */
  _clampAttitude(v) {
    if (!Number.isFinite(v)) return v;
    if (v > 100) return 100;
    if (v < -100) return -100;
    return v;
  }

  /**
   * Tägliches Abklingen von Extremwerten.
   * Relationships außerhalb des neutralen Bands [-threshold..+threshold]
   * werden um `rate` in Richtung 0 geschoben.
   *
   * Motivation:
   * - Verhindert Einfrieren von Sozialwerten durch fehlende Interaktion.
   * - Simuliert realistisches Abklingen von emotionalen Extremzuständen.
   * - Rate und Threshold sind bewusst konservativ (kein harter Reset).
   *
   * @param {object} [opts]
   * @param {number} [opts.rate=1]       - Betrag des täglichen Abklingens (>0, ganzzahlig empfohlen)
   * @param {number} [opts.threshold=10] - Außerhalb dieses Bands wird gecapped
   * @param {string} [opts.reason='daily-decay'] - Grund für das Hook-Payload
   * @returns {Promise<{changed: number, skipped: number}>}
   */
  async applyDailyDecay({ rate = 1, threshold = 10, reason = 'daily-decay' } = {}) {
    const socialState = this.state.getPath?.(STATE_PATHS.ACADEMY_SOCIAL) ?? this.state.get?.(STATE_PATHS.ACADEMY_SOCIAL) ?? {};
    if (!socialState || typeof socialState !== 'object') {
      return { changed: 0, skipped: 0 };
    }

    let changed = 0;
    let skipped = 0;

    for (const [fromId, targets] of Object.entries(socialState)) {
      if (!targets || typeof targets !== 'object') continue;
      for (const [toId, rel] of Object.entries(targets)) {
        const v = Number(rel?.value ?? 0);
        if (!Number.isFinite(v) || Math.abs(v) <= threshold) {
          skipped++;
          continue;
        }
        // Abklingen: in Richtung 0, nie über 0 hinaus
        const delta = v > 0 ? -Math.min(rate, v) : Math.min(rate, -v);
        if (delta === 0) { skipped++; continue; }

        try {
          await this.adjustAttitude(fromId, toId, delta, { meta: { reason } });
          changed++;
        } catch (err) {
          this.logger?.warn?.(`[JANUS7][Social] applyDailyDecay failed for ${fromId}→${toId}`, err);
          skipped++;
        }
      }
    }

    this.logger?.debug?.(`[JANUS7][Social] applyDailyDecay: ${changed} adjusted, ${skipped} skipped (threshold=${threshold}, rate=${rate})`);
    return { changed, skipped };
  }
}

export default JanusSocialEngine;
