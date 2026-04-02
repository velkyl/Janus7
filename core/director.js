import { STATE_PATHS } from './common.js';
import { emitHook, HOOKS } from './hooks/emitter.js';

/**
 * JANUS7 — Director (Phase 6 facade)
 *
 * Purpose:
 * - Provide a single, GM-gated orchestration API for UI and macros.
 * - Delegate to engines (calendar/scoring/social/atmosphere) and core IO.
 * - Perform persistence (`state.save`) in one place, so UI does not touch core/state.
 *
 * Notes:
 * - This module intentionally resolves the engine via `game.janus7` to avoid
 *   tight coupling (core/index sets `game.janus7 = engine` before `engine.init()`).
 */

export class JanusDirector {
  /**
   * @param {import('./types.js').JanusCore} core
   */
  constructor(core) {
    this.core = core;
    this.state = core.state;
    this.io = core.io;
    this.validator = core.validator;
    this.logger = core.logger?.child?.('director') ?? core.logger;

    // Domain facades (arrow fns keep `this` binding predictable in callbacks)
    this.time = {
      getRef: () => {
        const e = this._engine();
        const cal = e?.academy?.calendar ?? e?.calendar;
        if (cal?.getCurrentSlotRef) return cal.getCurrentSlotRef();
        // Fallback: derive from state (Phase 1)
        const t = this.state?.get?.('time') ?? {};
        return {
          year: t.year,
          trimester: t.trimester,
          week: t.week,
          dayIndex: t.dayIndex,
          slotIndex: t.slotIndex,
          day: t.day ?? t.dayName ?? null,
          phase: t.phase ?? t.slotName ?? null,
          dayName: t.dayName ?? null,
          slotName: t.slotName ?? null
        };
      },
      advanceSlot: (opts = {}) => this._advance('advanceSlot', opts),
      advanceDay: (opts = {}) => this._advance('advanceDay', opts),
      advancePhase: (opts = {}) => this._advance('advancePhase', opts),
      setSlot: (dayIndex, slotIndex, opts = {}) => this._setSlot(dayIndex, slotIndex, opts),
      reset: (opts = {}) => this.resetCalendar(opts),
      resetCalendar: (opts = {}) => this.resetCalendar(opts),
    };

    this.scoring = {
      addCirclePoints: (circleName, amount, reason, opts = {}) =>
        this._mutate(() => this._scoring().addCirclePoints(circleName, amount, reason), opts),
      addStudentPoints: (studentId, amount, reason, opts = {}) =>
        this._mutate(() => this._scoring().addStudentPoints(studentId, amount, reason), opts),
      ensureCircle: (circleId, initialScore = 0, opts = {}) =>
        this._mutate(() => this._scoring().ensureCircle(circleId, initialScore, { source: 'manual' }), opts),
      deleteCircle: (circleId, opts = {}) =>
        this._mutate(() => this._scoring().deleteCircle(circleId, { source: 'manual' }), opts),
    };

    this.social = {
      setAttitude: (fromId, toId, value, opts = {}) =>
        this._mutate(() => this._social().setAttitude(fromId, toId, value), opts),
      adjustAttitude: (fromId, toId, delta, opts = {}) =>
        this._mutate(() => this._social().adjustAttitude(fromId, toId, delta), opts),
    };

    this.atmosphere = {
      applyMood: (moodId, opts = {}) => this.applyMood(moodId, opts),
    };

    this.kernel = {
      getRuntimeSummary: (opts = {}) => this.getRuntimeSummary(opts),
      startDay: (opts = {}) => this.startDay(opts),
      runLesson: (opts = {}) => this.runLesson(opts),
      triggerEvent: (eventId, opts = {}) => this.triggerEvent(eventId, opts),
      evaluateSocialLinks: (opts = {}) => this.evaluateSocialLinks(opts),
      generateQuests: (opts = {}) => this.generateQuests(opts),
      acceptQuest: (questId, actorId, opts = {}) => this.acceptQuest(questId, actorId, opts),
      dequeueQueuedEvents: (opts = {}) => this.dequeueQueuedEvents(opts),
    };
  }

  // Aliases expected by tests / legacy command contract
  /**
   * Setzt die soziale Einstellung zwischen zwei Akteuren direkt auf einen Zielwert.
   * Alias für den Legacy-/Test-Vertrag der Social-API.
   *
   * @param {string} fromId Ursprung der Beziehung.
   * @param {string} toId Ziel der Beziehung.
   * @param {number} value Absoluter Beziehungswert bzw. Attitude-Zielwert.
   * @param {Object} [opts={}] Steueroptionen für Persistenz und Hook-Verhalten.
   * @returns {Promise<any>} Ergebnis der delegierten Social-Mutation.
   */
  async setRelation(fromId, toId, value, opts = {}) {
    return this.social.setAttitude(fromId, toId, value, opts);
  }

  /**
   * Verschiebt die soziale Einstellung zwischen zwei Akteuren relativ um ein Delta.
   * Alias für den Legacy-/Test-Vertrag der Social-API.
   *
   * @param {string} fromId Ursprung der Beziehung.
   * @param {string} toId Ziel der Beziehung.
   * @param {number} delta Relative Änderung des Beziehungswerts.
   * @param {Object} [opts={}] Steueroptionen für Persistenz und Hook-Verhalten.
   * @returns {Promise<any>} Ergebnis der delegierten Social-Mutation.
   */
  async adjustRelation(fromId, toId, delta, opts = {}) {
    return this.social.adjustAttitude(fromId, toId, delta, opts);
  }

  /**
   * Setzt die globale Atmosphären-Lautstärke des angebundenen Atmosphere-Subsystems.
   *
   * @param {number} volume Ziel-Lautstärke als normalisierter Skalar.
   * @param {Object} [opts={}] Zusätzliche Optionen, die an das Atmosphere-Subsystem durchgereicht werden.
   * @returns {Promise<boolean|any>} `false`, wenn kein Atmosphere-Controller verfügbar ist, sonst das Ergebnis der Engine.
   */
  async setMasterVolume(volume, opts = {}) {
    const engine = this._engine();
    if (!engine?.atmosphere?.setMasterVolume) return false;
    return engine.atmosphere.setMasterVolume(volume, opts);
  }

  // ---------------------------------------------------------------------------
  // State (Phase 1/6)
  // ---------------------------------------------------------------------------

  /**
   * Reads a value from the campaign state.
   *
   * @param {string} path
   * @param {unknown} [fallback]
   * @returns {unknown}
   */
  get(path, fallback = undefined) {
    return this.state.get(path, fallback);
  }

  /**
   * @param {string} path
   * @param {unknown} value
   * @param {{ save?: boolean, force?: boolean }} [opts]
   * @returns {Promise<void>}
   */
  async set(path, value, opts = {}) {
    this._assertGM();
    this.state.set(path, value);
    if (opts.save ?? true) await this.saveState(opts);
  }

  /**
   * Execute an arbitrary mutation function and optionally persist.
   *
   * @param {(helpers: { get: typeof this.get, set: (path: string, value: unknown) => unknown }) => unknown|Promise<unknown>} fn
   * @param {{ save?: boolean, force?: boolean }} [opts]
   * @returns {Promise<unknown>}
   */
  async batch(fn, opts = {}) {
    this._assertGM();
    const noSaveSet = (path, value) => {
      this.state.set(path, value);
      return value;
    };
    const res = await fn({ get: this.get.bind(this), set: noSaveSet });
    if (opts.save ?? true) await this.saveState(opts);
    return res;
  }

  /**
   * Exports a portable state snapshot.
   *
   * @returns {unknown}
   */
  exportState() {
    this._assertGM();
    return this.io.exportState();
  }

  /**
   * Validate a snapshot. If none supplied, validate the current state.
   * Returns a validation result compatible with UI rendering.
   *
   * @param {unknown} [snapshot]
   * @param {Record<string, unknown>} [opts]
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateState(snapshot = null, opts = {}) {
    const snap = snapshot ?? this.io.exportState();
    return this.validator.validateState(snap, opts);
  }

  /**
   * Import a snapshot into live state.
   *
   * @param {any} snapshot
   * @param {{validate?: boolean, mode?: 'strict'|'lenient', save?: boolean, force?: boolean}} opts
   */
  async importState(snapshot, opts = {}) {
    this._assertGM();

    // io.importState doesn't exist – correct method is importStateFromObject.
    // lenient mode = validate:false so old/partial snapshots can be imported.
    const lenient = (opts.mode ?? 'lenient') === 'lenient';
    const validate = opts.validate ?? !lenient;
    const res = await this.io.importStateFromObject(snapshot, {
      validate,
      save: opts.save ?? true,
      silentValidation: !validate,
    });

    return res;
  }

  /**
   * Persist current state to storage.
   *
   * Anti-pattern: UI calling `core.state.save()` directly (trips write-guard).
   *
   * @param {{ force?: boolean }} [opts]
   * @returns {Promise<unknown>}
   */
  async saveState(opts = {}) {
    this._assertGM();
    return this.state.save({ force: !!opts.force });
  }

  /**
   * Fügt einen Actor dedupliziert in academy.roster.<role> ein.
   *
   * @param {'teachers'|'students'|'npcs'} role
   * @param {string} actorUuid
   * @param {Object} [opts={}]
   * @returns {Promise<{role:string, actorUuid:string, added:boolean, count:number}>}
   */
  async addActorToRoster(role, actorUuid, opts = {}) {
    this._assertGM();
    const normalizedRole = String(role ?? '').trim();
    const normalizedActorUuid = String(actorUuid ?? '').trim();
    if (!['teachers', 'students', 'npcs'].includes(normalizedRole)) {
      throw new Error(`Ungültige roster-Rolle: ${normalizedRole || '<leer>'}`);
    }
    if (!normalizedActorUuid) {
      throw new Error('actorUuid ist erforderlich.');
    }

    return this.batch(({ get, set }) => {
      const roster = foundry.utils.deepClone(get(STATE_PATHS.ACADEMY_ROSTER) ?? {});
      roster.teachers = Array.isArray(roster.teachers) ? roster.teachers : [];
      roster.students = Array.isArray(roster.students) ? roster.students : [];
      roster.npcs = Array.isArray(roster.npcs) ? roster.npcs : [];

      const bucket = roster[normalizedRole];
      const added = !bucket.includes(normalizedActorUuid);
      if (added) bucket.push(normalizedActorUuid);
      set(STATE_PATHS.ACADEMY_ROSTER, roster);
      return {
        role: normalizedRole,
        actorUuid: normalizedActorUuid,
        added,
        count: bucket.length,
      };
    }, opts);
  }

  /**
   * Registriert ein Slot-Journal im Kampagnenstate.
   *
   * @param {string} slotKey
   * @param {{journalUuid:string, items?:any[], createdAt?:string}} entry
   * @param {Object} [opts={}]
   * @returns {Promise<{slotKey:string, entry:object}>}
   */
  async registerSlotJournal(slotKey, entry = {}, opts = {}) {
    this._assertGM();
    const normalizedSlotKey = String(slotKey ?? '').trim();
    if (!normalizedSlotKey) {
      throw new Error('slotKey ist erforderlich.');
    }

    const journalUuid = String(entry?.journalUuid ?? '').trim();
    if (!journalUuid) {
      throw new Error('entry.journalUuid ist erforderlich.');
    }

    const normalizedEntry = {
      journalUuid,
      items: Array.isArray(entry?.items) ? foundry.utils.deepClone(entry.items) : [],
      createdAt: String(entry?.createdAt ?? new Date().toISOString()),
    };

    return this.batch(({ get, set }) => {
      const slotJournals = foundry.utils.deepClone(get(STATE_PATHS.ACADEMY_SLOT_JOURNALS) ?? {});
      slotJournals[normalizedSlotKey] = normalizedEntry;
      set(STATE_PATHS.ACADEMY_SLOT_JOURNALS, slotJournals);
      return { slotKey: normalizedSlotKey, entry: normalizedEntry };
    }, opts);
  }

  /**
   * Setzt actor-gebundene Quest- und Event-Debug-States zurueck.
   *
   * Hinweis:
   * Actor-UUIDs enthalten Punkte und duerfen daher nicht als verschachtelte
   * State-Pfade missverstanden werden. Die Mutation arbeitet bewusst auf den
   * Root-Maps und ersetzt nur den konkreten Actor-Key.
   *
   * @param {string} actorId
   * @param {Object} [opts={}]
   * @returns {Promise<{actorId:string, hadQuestState:boolean, hadEventState:boolean}>}
   */
  async resetActorQuestEventState(actorId, opts = {}) {
    this._assertGM();
    const normalizedActorId = String(actorId ?? '').trim();
    if (!normalizedActorId) {
      throw new Error('actorId ist erforderlich.');
    }

    return this.batch(({ get, set }) => {
      const questStates = foundry.utils.deepClone(get('questStates') ?? {});
      const eventStates = foundry.utils.deepClone(get('eventStates') ?? {});
      const hadQuestState = Object.prototype.hasOwnProperty.call(questStates, normalizedActorId);
      const hadEventState = Object.prototype.hasOwnProperty.call(eventStates, normalizedActorId);

      questStates[normalizedActorId] = {};
      eventStates[normalizedActorId] = {};

      set('questStates', questStates);
      set('eventStates', eventStates);

      return {
        actorId: normalizedActorId,
        hadQuestState,
        hadEventState,
      };
    }, opts);
  }

  // ---------------------------------------------------------------------------
  // Time (Calendar)
  // ---------------------------------------------------------------------------

  /**
   * Setzt den Akademiekalender auf den definierten Startzustand zurück.
   *
   * @param {Object} [opts={}] Optionen für Persistenz und Kalender-Reset.
   * @returns {Promise<object|undefined>} Aktuelle Slot-Referenz nach dem Reset.
   */
  async resetCalendar(opts = {}) {
    this._assertGM();
    await this._engine().calendar?.resetToStart?.();
    if (opts.save ?? true) await this.saveState(opts);
    // FIX P0-04: calendar kann null sein wenn Phase 4 nicht bereit ist.
    return this._engine().calendar?.getCurrentSlotRef?.() ?? null;
  }

  /**
   * Interner Kalender-Helfer für Vor-/Weiter-Schaltoperationen.
   *
   * @private
   * @param {string} fnName Name der aufzurufenden Kalender-Methode.
   * @param {Object} [opts={}] Optionen für Kalender und Persistenz.
   * @returns {Promise<object|undefined>} Aktuelle Slot-Referenz nach der Mutation.
   */
  async _advance(fnName, opts = {}) {
    this._assertGM();
    const cal = this._engine().calendar;
    if (typeof cal?.[fnName] !== 'function') throw new Error(`Calendar missing ${fnName}()`);
    await cal[fnName](opts);
    if (opts.save ?? true) await this.saveState(opts);
    return cal.getCurrentSlotRef();
  }

  /**
   * Setzt Kalenderposition explizit auf Tag- und Slot-Index.
   *
   * @private
   * @param {number} dayIndex Ziel-Tag im internen Kalenderindex.
   * @param {number} slotIndex Ziel-Slot innerhalb des Tages.
   * @param {Object} [opts={}] Optionen für Kalender und Persistenz.
   * @returns {Promise<object|undefined>} Aktuelle Slot-Referenz nach der Mutation.
   */
  async _setSlot(dayIndex, slotIndex, opts = {}) {
    this._assertGM();
    const cal = this._engine().calendar;
    await cal.setSlot(dayIndex, slotIndex, opts);
    if (opts.save ?? true) await this.saveState(opts);
    return cal.getCurrentSlotRef();
  }

  // ---------------------------------------------------------------------------
  // Atmosphere
  // ---------------------------------------------------------------------------

  /**
   * Aktiviert einen Atmosphären-Mood über den Atmosphere-Controller.
   *
   * @param {string} moodId ID des Ziel-Moods.
   * @param {Object} [opts={}] Optionen für Persistenz und Engine-Verhalten.
   * @returns {Promise<void>}
   */
  async applyMood(moodId, opts = {}) {
    this._assertGM();
    // FIX P0-05: atmosphere kann null sein wenn Phase 5 (Atmosphere) nicht geladen ist.
    const atmo = this._engine()?.atmosphere;
    if (!atmo?.applyMood) {
      (this._engine()?.core?.logger ?? console).warn?.('[JANUS7][Director] atmosphere.applyMood() nicht verfügbar (Phase 5 bereit?)');
      return;
    }
    await atmo.applyMood(moodId);
    if (opts.save ?? true) await this.saveState(opts);
  }

  // ---------------------------------------------------------------------------
  // Director Kernel (Welle 1.1)
  // ---------------------------------------------------------------------------

  /** Liefert eine kompakte Laufzeit-Zusammenfassung für Director/UI/Debug. */
  getDirectorSummary(opts = {}) {
    return this.getRuntimeSummary(opts);
  }

  /** Legacy-/Convenience-Alias für Makros und Tests. */
  async startDirectorDay(opts = {}) {
    return this.startDay(opts);
  }

  /**
   * Liefert einen kompakten Überblick über den aktuellen Director-Laufzeitkontext.
   * Keine Mutation, GM-Gate nicht nötig.
   */
  getRuntimeSummary({ actorId = 'party' } = {}) {
    const engine = this._engine();
    const slot = this.time.getRef();
    const lessonsEngine = engine?.academy?.lessons ?? null;
    const eventsEngine = engine?.academy?.events ?? null;
    const questEngine = engine?.academy?.quests ?? null;
    const lessons = lessonsEngine?.getLessonsForCurrentSlot?.() ?? [];
    const events = eventsEngine?.listEventsForCurrentSlot?.() ?? [];
    const rawQueuedEvents = this.state.get('academy.runtimeQueuedEvents');
    const queuedEventCount = Array.isArray(rawQueuedEvents) ? rawQueuedEvents.length : 0;
    const queuedEvents = queuedEventCount > 0
      ? foundry.utils.deepClone(rawQueuedEvents.slice(0, 10))
      : [];
    const activeQuests = questEngine?.listQuests?.({ actorId, status: 'active' })
      ?? questEngine?.listQuests?.({ status: 'active' })
      ?? [];
    const graphSummary = engine?.graph?.diagnostics?.run?.({ mode: 'basic' })?.summary ?? null;

    return {
      slot,
      lessons,
      lessonCount: lessons.length,
      currentLessonId: lessons?.[0]?.lesson?.id ?? lessons?.[0]?.id ?? lessons?.[0]?.calendarEntry?.lessonId ?? null,
      events,
      eventCount: events.length,
      queuedEvents,
      queuedEventCount,
      activeQuests: activeQuests.slice(0, 10),
      activeQuestCount: activeQuests.length,
      graph: graphSummary,
    };
  }

  /**
   * Startet einen Akademietag kontrolliert: optional Tageswechsel, Rücksetzung auf Slot 0
   * und anschließende Orchestrierung von Queue/Social/Quest/Lesson.
   */
  async startDay({
    actorId = 'party',
    advanceDay = false,
    days = 1,
    triggerQueuedEvents = true,
    evaluateSocial = true,
    generateQuests = true,
    runLesson = false,
    save = true,
  } = {}) {
    this._assertGM();
    const calendar = this._engine().calendar ?? this._engine().academy?.calendar;
    if (!calendar) throw new Error('JANUS7: Calendar engine nicht verfügbar.');

    if (advanceDay) await calendar.advanceDay({ days });

    const current = calendar.getCurrentSlotRef?.() ?? this.time.getRef();
    if (Number.isFinite(current?.dayIndex) && Number.isFinite(current?.slotIndex) && current.slotIndex !== 0) {
      await calendar.setSlot(current.dayIndex, 0, { save: false });
    }

    const result = {
      slot: calendar.getCurrentSlotRef?.() ?? this.time.getRef(),
      queued: null,
      social: null,
      quests: null,
      lesson: null,
    };

    if (triggerQueuedEvents) {
      result.queued = await this.dequeueQueuedEvents({ actorId, present: true, save: false });
    }
    if (evaluateSocial) {
      result.social = await this.evaluateSocialLinks({ actorId, save: false });
    }
    if (generateQuests) {
      result.quests = await this.generateQuests({ actorId });
    }
    if (runLesson) {
      result.lesson = await this.runLesson({ actorId, save: false });
    }

    if (save) await this.saveState();
    return result;
  }

  /** Emittiert lesson.started für die erste Lesson im aktuellen Slot. */
  async runLesson({ actorId = 'party', save = false } = {}) {
    this._assertGM();
    const engine = this._engine();
    const lessonsEngine = engine?.academy?.lessons ?? null;
    if (!lessonsEngine?.getLessonsForCurrentSlot) {
      return { ok: false, reason: 'lessons-engine-unavailable' };
    }

    const matches = lessonsEngine.getLessonsForCurrentSlot() ?? [];
    const match = matches.find((entry) => entry?.lesson || entry?.calendarEntry?.lessonId) ?? matches[0] ?? null;
    if (!match) {
      return { ok: false, reason: 'no-lesson-for-current-slot', slot: this.time.getRef() };
    }

    const lessonId = match?.lesson?.id ?? match?.id ?? match?.calendarEntry?.lessonId ?? null;
    const context = lessonId && typeof lessonsEngine.getLessonContext === 'function'
      ? lessonsEngine.getLessonContext(lessonId)
      : { lesson: match?.lesson ?? null, teacher: null, location: null };

    const payload = {
      actorId,
      slot: this.time.getRef(),
      lessonId,
      lesson: context?.lesson ?? match?.lesson ?? null,
      teacher: context?.teacher ?? null,
      location: context?.location ?? null,
      calendarEntry: match?.calendarEntry ?? null,
    };

    emitHook(HOOKS.LESSON_STARTED, payload);
    if (save) await this.saveState();
    return { ok: true, ...payload };
  }

  /** Präsentiert ein Event über die registrierte Event-Engine. */
  async triggerEvent(eventId, { actorId = 'party', save = false } = {}) {
    this._assertGM();
    const eventsEngine = this._engine()?.academy?.events ?? null;
    if (!eventsEngine?.presentEvent) {
      return { ok: false, reason: 'events-engine-unavailable', eventId };
    }
    const presentation = await eventsEngine.presentEvent(eventId, { actorId });
    if (save) await this.saveState();
    return { ok: true, eventId, actorId, ...presentation };
  }

  /** Zieht Runtime-Events aus der Queue und präsentiert sie optional. */
  async dequeueQueuedEvents({ actorId = 'party', limit = 3, present = true, save = true } = {}) {
    this._assertGM();
    const rawQueue = this.state.get('academy.runtimeQueuedEvents');
    if (!Array.isArray(rawQueue) || !rawQueue.length) return { processed: [], remainingCount: 0 };

    const capped = Math.max(0, Number(limit ?? 0) || 0);
    const pickedCount = capped > 0 ? capped : rawQueue.length;
    const picked = foundry.utils.deepClone(rawQueue.slice(0, pickedCount));
    const remaining = rawQueue.slice(pickedCount);
    await this.state.transaction(async (tx) => {
      tx.set('academy.runtimeQueuedEvents', remaining);
    });

    const processed = [];
    for (const entry of picked) {
      if (present && entry?.eventId) {
        try {
          const presentation = await this.triggerEvent(entry.eventId, { actorId, save: false });
          processed.push({ ...entry, presentation });
        } catch (err) {
          processed.push({ ...entry, error: err?.message ?? String(err) });
        }
      } else {
        processed.push(entry);
      }
    }

    if (save) await this.saveState();
    return { processed, remainingCount: remaining.length };
  }

  /** Führt Social-Link-Progression einmal explizit aus. */
  async evaluateSocialLinks({ actorId = 'party', save = true } = {}) {
    this._assertGM();
    const socialProgression = this._engine()?.academy?.progression?.socialEngine ?? null;
    if (!socialProgression?.evaluateForActor) {
      return { available: false, advanced: [] };
    }
    const result = await socialProgression.evaluateForActor(actorId);
    if (save) await this.saveState();
    return { available: true, ...(result ?? { advanced: [] }) };
  }

  /**
   * Erzeugt Quest-Vorschläge aus dem Graph-Kontext des aktuellen Slots.
   * NOTE (P2-02): Diese Methode ist überwiegend lesend — kein _assertGM() notwendig.
   * graph.build() kann jedoch den Graph-Cache aktualisieren (Schreibseiteneffekt).
   * graph.isDirty() kann das dirty-Flag zurücksetzen (Seiteneffekt), daher
   * sollte die Methode nur aus GM-Kontext aufgerufen werden (UI-Layer garantiert dies).
   */
  async generateQuests({ actorId = 'party', limit = 5, context = {} } = {}) {
    const engine = this._engine();
    const graph = engine?.graph ?? null;
    if (!graph?.build || !graph?.query?.suggestQuests) {
      return { available: false, suggestions: [], context: null };
    }

    if (graph.isDirty?.() || !graph.getGraph?.()) await graph.build({ force: false });

    const currentLessons = engine?.academy?.lessons?.getLessonsForCurrentSlot?.() ?? [];
    const currentLessonId = currentLessons?.[0]?.lesson?.id ?? currentLessons?.[0]?.id ?? currentLessons?.[0]?.calendarEntry?.lessonId ?? null;
    const activeLocationId = context.locationId
      ?? this.state.get('academy.currentLocationId')
      ?? currentLessons?.[0]?.lesson?.locationId
      ?? null;

    const graphContext = {
      lessonId: context.lessonId ?? currentLessonId,
      locationId: activeLocationId,
      npcIds: Array.isArray(context.npcIds) ? context.npcIds : [],
      threadIds: Array.isArray(context.threadIds) ? context.threadIds : [],
      questIds: Array.isArray(context.questIds) ? context.questIds : [],
    };

    const activeQuestIds = new Set((engine?.academy?.quests?.listQuests?.({ actorId, status: 'active' }) ?? []).map((q) => q?.questId).filter(Boolean));
    const suggestions = (graph.query.suggestQuests(graphContext) ?? [])
      .filter((entry) => !activeQuestIds.has(entry?.quest?.id))
      .slice(0, Math.max(0, Number(limit ?? 5) || 5));

    return {
      available: true,
      context: graphContext,
      suggestions,
    };
  }

  /**
   * Accepts a quest suggestion through the Director so UI layers do not mutate quest state directly.
   */
  async acceptQuest(questId, actorId = 'party', opts = {}) {
    this._assertGM();
    const normalizedQuestId = String(questId ?? '').trim();
    const normalizedActorId = String(actorId ?? 'party').trim() || 'party';
    if (!normalizedQuestId) {
      return { ok: false, reason: 'missing-quest-id', questId: normalizedQuestId, actorId: normalizedActorId };
    }
    const questCaps = this._engine()?.capabilities?.quests ?? this._engine()?.academy?.quests ?? null;
    if (!questCaps?.startQuest) {
      return { ok: false, reason: 'quests-capability-unavailable', questId: normalizedQuestId, actorId: normalizedActorId };
    }
    const quest = await questCaps.startQuest(normalizedQuestId, { actorId: normalizedActorId, ...opts });
    if (opts.save ?? true) await this.saveState(opts);
    return {
      ok: true,
      questId: normalizedQuestId,
      actorId: normalizedActorId,
      quest,
      title: quest?.title ?? quest?.name ?? normalizedQuestId,
    };
  }

  // ---------------------------------------------------------------------------
  // UI-Shortcuts — Direktzugriff auf häufig benötigte Panels
  // ---------------------------------------------------------------------------

  /**
   * Öffnet das Control Panel.
   * @returns {ApplicationV2|null}
   */
  openControlPanel() {
    return this._engine()?.ui?.open?.('controlPanel') ?? null;
  }

  /**
   * Öffnet das Sync-Panel (Welt-Synchronisation NSC/Szenen/Playlists).
   * @returns {ApplicationV2|null}
   */
  openSyncPanel() {
    return this._engine()?.ui?.open?.('syncPanel') ?? null;
  }

  /**
   * Öffnet das Config-Panel (Einstellungen & Feature-Flags).
   * @returns {ApplicationV2|null}
   */
  openConfigPanel() {
    return this._engine()?.ui?.open?.('configPanel') ?? null;
  }

  /**
   * Öffnet das Atmosphere-DJ-Panel.
   * @returns {ApplicationV2|null}
   */
  openAtmosphereDJ() {
    return this._engine()?.ui?.open?.('atmosphereDJ') ?? null;
  }

  /**
   * Öffnet das Test-Ergebnisfenster und führt alle Tests aus.
   * @returns {Promise<void>}
   */
  async openTestResults() {
    const engine = this._engine();
    if (engine?.test?.openResults) return engine.test.openResults();
    return engine?.ui?.open?.('testResults') ?? null;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  _assertGM() {
    // For now we gate mutations to GM. Read operations are open.
    if (game?.user && !game.user.isGM) {
      throw new Error('JANUS7: Diese Aktion ist nur für Spielleiter (GM) erlaubt.');
    }
  }

  _engine() {
    const eng = game?.janus7;
    if (!eng) throw new Error('JANUS7 engine not initialized');
    return eng;
  }

  _scoring() {
    const e = this._engine();
    const scoring = e?.simulation?.scoring ?? e?.academy?.scoring;
    if (!scoring) throw new Error('JANUS7: Scoring engine nicht verfügbar (Phase 4 noch nicht bereit).');
    return scoring;
  }

  _social() {
    const e = this._engine();
    const social = e?.simulation?.social ?? e?.academy?.social;
    if (!social) throw new Error('JANUS7: Social engine nicht verfügbar (Phase 4 noch nicht bereit).');
    return social;
  }

  async _mutate(fn, opts = {}) {
    this._assertGM();
    const res = await fn();
    if (opts.save ?? true) await this.saveState(opts);
    return res;
  }

  /**
   * Wird vom Engine-Ready-Zyklus aufgerufen (core/index.js Zeile 376).
   * FIX P2-06: Stub-Implementierung, damit der opionale Guard nicht immer ein No-Op ist.
   * Kann überschrieben werden um künftige Director-Ready-Logik zu implementieren.
   */
  async onReady() {
    // Reserved for future Director ready-phase initialization.
    return true;
  }
}
