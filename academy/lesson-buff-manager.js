/**
 * @file academy/lesson-buff-manager.js
 * @module janus7
 * @phase 4
 *
 * Zweck:
 *   JanusLessonBuffManager: Verwaltet PostRoll-Lehrerbonus-ActiveEffects.
 *
 *   - Beim Start einer Lektion: Bonus auf alle Schüler-Actors anwenden
 *   - Beim Ende einer Lektion: Buffs entfernen (falls noch aktiv)
 *   - Lädt Bonus-Definitionen aus teacher-bonuses.json (SSOT)
 *   - Registriert sich auf Hooks 'janus7LessonStarted' / 'janus7LessonEnded'
 *
 * Architektur:
 *   - Thin Coordinator: bridge.postRollBuff → ActiveEffect, academyData → NPC/Lesson
 *   - Kein direkter dsa5-Zugriff
 *   - Graceful Degradation: fehlender Actor-UUID = Log-Warn, kein Throw
 *
 * Integration (in phase4.js):
 *   const lessonBuffManager = new JanusLessonBuffManager({ bridge, academyData, logger });
 *   lessonBuffManager.loadBonuses(teacherBonusesJson);
 *   lessonBuffManager.register();
 *   game.janus7.academy.lessonBuffManager = lessonBuffManager;
 *
 * Hook-Events:
 *   janus7LessonStarted: { lessonId, slotRef, participantActorIds, teacherNpcId?, subjectKey? }
 *   janus7LessonEnded:   { lessonId, participantActorIds, teacherNpcId? }
 */

import { MODULE_ABBREV } from '../core/common.js';

export class JanusLessonBuffManager {
  /**
   * @param {object} deps
   * @param {import('../bridge/dsa5/index.js').DSA5SystemBridge} deps.bridge
   * @param {import('./data-api.js').AcademyDataApi} [deps.academyData]
   * @param {Console} [deps.logger]
   */
  constructor({ bridge, academyData, logger }) {
    if (!bridge) throw new Error(`${MODULE_ABBREV}: JanusLessonBuffManager benötigt bridge`);

    this.bridge      = bridge;
    this.academyData = academyData ?? null;
    this.logger      = logger ?? console;
    this.enabled     = true;
    this._hookIds    = [];

    /** @type {Record<string, object>} teacherNpcId → teacher bonus definition */
    this._bonuses    = {};
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  /**
   * Lädt Bonus-Definitionen aus teacher-bonuses.json.
   * Muss vor register() aufgerufen werden.
   *
   * @param {object} bonusData  - Geparster Inhalt von teacher-bonuses.json
   */
  loadBonuses(bonusData) {
    this._bonuses = bonusData?.teachers ?? {};
    const count   = Object.keys(this._bonuses).length;
    this.logger?.info?.(`${MODULE_ABBREV} | LessonBuffManager | ${count} Lehrer-Bonusdefinitionen geladen`);
  }

  /**
   * Hooks registrieren.
   */
  register() {
    if (this._hookIds?.length) {
      this.logger?.debug?.(`${MODULE_ABBREV} | LessonBuffManager | Hooks bereits registriert – skip`);
      return;
    }
    const startId = Hooks.on('janus7LessonStarted', (data) => {
      if (!this.enabled) return;
      this._onLessonStarted(data).catch((err) =>
        this.logger?.error?.(`${MODULE_ABBREV} | LessonBuffManager | janus7LessonStarted fehlgeschlagen`, err)
      );
    });

    const endId = Hooks.on('janus7LessonEnded', (data) => {
      if (!this.enabled) return;
      this._onLessonEnded(data).catch((err) =>
        this.logger?.error?.(`${MODULE_ABBREV} | LessonBuffManager | janus7LessonEnded fehlgeschlagen`, err)
      );
    });

    this._hookIds = [
      { name: 'janus7LessonStarted', id: startId },
      { name: 'janus7LessonEnded',   id: endId   },
    ];

    this.logger?.info?.(`${MODULE_ABBREV} | LessonBuffManager | Hooks registriert`);
  }

  unregister() {
    for (const { name, id } of this._hookIds) Hooks.off(name, id);
    this._hookIds = [];
  }

  // ─── Direkte API (ohne Hooks) ──────────────────────────────────────────────

  /**
   * Wendet Lehrerbonus für eine Lektion auf gegebene Actors an.
   * Kann direkt aufgerufen werden (ohne Hook).
   *
   * @param {object} opts
   * @param {string}   opts.lessonId
   * @param {string}   [opts.teacherNpcId]      - Optional: überschreibt lesson.teacherNpcId
   * @param {string}   [opts.subjectKey]        - Optional: überschreibt lesson.subject
   * @param {string[]} opts.participantActorIds - Actor-UUIDs oder IDs
   * @param {number}   [opts.durationSlots]     - Überschreibt lesson.durationSlots
   * @returns {Promise<{applied: number, skipped: number}>}
   *
   * @example
   * await lessonBuffManager.applyForLesson({
   *   lessonId: 'LES_Y1_T1_ARKAN_01',
   *   participantActorIds: students.map(s => s.foundry.actorUuid).filter(Boolean),
   * });
   */
  async applyForLesson({ lessonId, teacherNpcId, subjectKey, participantActorIds, durationSlots }) {
    const lesson = this.academyData?.getLesson?.(lessonId) ?? null;

    const effectiveTeacherNpcId = teacherNpcId ?? lesson?.teacherNpcId ?? null;
    const effectiveSubject      = subjectKey   ?? lesson?.subject      ?? null;
    const effectiveDuration     = durationSlots ?? lesson?.durationSlots ?? 1;

    if (!effectiveTeacherNpcId) {
      this.logger?.debug?.(
        `${MODULE_ABBREV} | LessonBuffManager | Kein Lehrer für Lektion ${lessonId} — kein Bonus`
      );
      return { applied: 0, skipped: participantActorIds.length };
    }

    const bonusDef = this._resolveBonusDef(effectiveTeacherNpcId, effectiveSubject, lessonId);

    if (!bonusDef) {
      this.logger?.debug?.(
        `${MODULE_ABBREV} | LessonBuffManager | Kein Bonus für ${effectiveTeacherNpcId}/${effectiveSubject}`
      );
      return { applied: 0, skipped: participantActorIds.length };
    }

    // Actors auflösen
    const actors = await this._resolveActors(participantActorIds);

    if (!actors.length) {
      return { applied: 0, skipped: participantActorIds.length };
    }

    const results = await this.bridge.postRollBuff.applyToMany(actors, bonusDef, {
      durationSlots: effectiveDuration,
    });

    const applied  = results.filter((r) => r.success).length;
    const skipped  = results.filter((r) => !r.success).length;

    this.logger?.info?.(`${MODULE_ABBREV} | LessonBuffManager | Buff angewendet`, {
      lessonId,
      teacher: effectiveTeacherNpcId,
      applied,
      skipped,
    });

    return { applied, skipped };
  }

  /**
   * Entfernt Lehrerbonus nach Ende einer Lektion.
   *
   * @param {object} opts
   * @param {string}   [opts.lessonId]
   * @param {string}   [opts.teacherNpcId]
   * @param {string[]} opts.participantActorIds
   * @returns {Promise<number>} Gesamtanzahl entfernter Effects
   */
  async removeForLesson({ lessonId, teacherNpcId, participantActorIds }) {
    const actors = await this._resolveActors(participantActorIds);
    let total = 0;

    for (const actor of actors) {
      const removed = await this.bridge.postRollBuff.removeTeacherBuffs(actor, {
        teacherNpcId,
        lessonId,
      });
      total += removed;
    }

    this.logger?.info?.(`${MODULE_ABBREV} | LessonBuffManager | ${total} Buffs entfernt`, {
      lessonId,
    });

    return total;
  }

  // ─── Hook-Handler ──────────────────────────────────────────────────────────

  /** @private */
  async _onLessonStarted({ lessonId, participantActorIds = [], teacherNpcId, subjectKey, durationSlots }) {
    await this.applyForLesson({ lessonId, teacherNpcId, subjectKey, participantActorIds, durationSlots });
  }

  /** @private */
  async _onLessonEnded({ lessonId, participantActorIds = [], teacherNpcId }) {
    // Explizites Entfernen ist optional (Effect läuft mit duration.seconds selbst ab).
    // Hier nur wenn vorzeitiges Ende gewünscht.
    await this.removeForLesson({ lessonId, teacherNpcId, participantActorIds });
  }

  // ─── Privat ────────────────────────────────────────────────────────────────

  /**
   * Löst Bonus-Definition auf: erst Lektion-spezifisch, dann Subject-generisch.
   * @private
   */
  _resolveBonusDef(teacherNpcId, subjectKey, lessonId) {
    const teacherBonuses = this._bonuses[teacherNpcId];
    if (!teacherBonuses?.bonusBySubject) return null;

    // Priorität: subjectKey direkt, dann Fallback auf 'default'
    const raw = subjectKey
      ? (teacherBonuses.bonusBySubject[subjectKey] ?? teacherBonuses.bonusBySubject['default'] ?? null)
      : (teacherBonuses.bonusBySubject['default'] ?? null);

    if (!raw) return null;

    // lessonId in den Bonus eintragen (für Tracking/Cleanup)
    return { ...raw, teacherNpcId, lessonId: lessonId ?? null };
  }

  /**
   * Löst Actor-Refs auf (UUID oder ID).
   * @private
   */
  async _resolveActors(actorRefs) {
    const actors = [];
    for (const ref of actorRefs) {
      try {
        const actor = await this.bridge.resolver?.resolve?.('Actor', ref)
          ?? (ref.startsWith('Actor.') ? await fromUuid(ref) : game.actors.get(ref));
        if (actor) actors.push(actor);
      } catch {
        this.logger?.debug?.(`${MODULE_ABBREV} | LessonBuffManager | Actor nicht gefunden: ${ref}`);
      }
    }
    return actors;
  }
}
