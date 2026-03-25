/**
 * @file bridge/dsa5/timed-conditions.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   Kapselt actor.addTimedCondition() für zeitlich begrenzte Akademie-Zustände.
 *   Exam-Stress der nach 1 Tag abklingt, Übermüdung nach Nachtschlaf, etc.
 *
 * DSA5-API (aus actor-dsa5.js):
 *   actor.addTimedCondition(effectId, value, absolute, auto, options)
 *   - options wird via mergeObject() in den Effect gemergt
 *   - duration.seconds + duration.startTime → Foundry-Standard-Ablaufzeit
 *   - Nur wenn options nicht leer: Effect-Objekt wird vollständig aufgebaut
 *
 * Foundry ActiveEffect Duration-Schema:
 *   duration.startTime   : number  — game.time.worldTime beim Erstellen
 *   duration.seconds     : number  — Ablaufzeit in Sekunden
 *   duration.rounds      : number  — Ablaufzeit in Kampfrunden (alternativ)
 *
 * Architektur:
 *   - Ergänzung zu DSA5ConditionBridge (conditions.js), kein Ersatz.
 *   - Kein direkter Import von dsa5-Interna, nur actor.addTimedCondition().
 *   - Defensive: fällt auf actor.addCondition() zurück wenn keine duration gegeben.
 */

import { DSA5_CONDITION_IDS } from './conditions.js';

// ─── Zeitkonstanten (Sekunden) ────────────────────────────────────────────────
// Basiert auf DSA5-Kalender: hoursPerDay:24, minutesPerHour:60, secondsPerMinute:60

/**
 * Hilfskonstanten für Akademie-Zeiträume in Sekunden.
 * Verwendung: JANUS_DURATION.DAYS(2) → 172800s
 *
 * @type {object}
 */
export const JANUS_DURATION = Object.freeze({
  /** @param {number} h Stunden */
  HOURS:   (h) => h * 3600,
  /** @param {number} d Tage */
  DAYS:    (d) => d * 86400,
  /** @param {number} w Wochen */
  WEEKS:   (w) => w * 7 * 86400,

  // Vorberechnete Standardwerte
  ONE_HOUR:    3600,
  TWO_HOURS:   7200,
  HALF_DAY:    43200,
  ONE_DAY:     86400,
  TWO_DAYS:    172800,
  THREE_DAYS:  259200,
  ONE_WEEK:    604800,
  TWO_WEEKS:   1209600,
});

// ─── Timed-Condition-Map ──────────────────────────────────────────────────────

/**
 * Erweiterte Mapping-Tabelle: JANUS7-Akademiezustand → DSA5 Condition + Ablaufzeit.
 *
 * Format:
 *   conditionId   : DSA5-Condition-ID
 *   defaultValue  : Condition-Stufe (1–4)
 *   defaultSeconds: Standard-Ablaufzeit in Sekunden (überschreibbar per opts)
 *   description   : Anzeigename im Foundry-Effect-Panel
 *
 * Tuning-Hinweise:
 *   - exam_panic ist bewusst kurz (1 Tag): tritt auf und klingt nach Prüfungstag ab
 *   - tired hat 1 Tag: 1 Nacht schlafen reicht zum Regenerieren
 *   - magic_shock ist kurz (2h): intensiv, aber schnell vorbei
 *   - sick/injured sind lang: simuliert echte Genesungszeit
 *
 * @type {Record<string, {conditionId:string, defaultValue:number, defaultSeconds:number, description:string}>}
 */
export const JANUS_TIMED_CONDITION_MAP = Object.freeze({

  /** Prüfungspanik — tritt vor/während Prüfung auf, klingt nach 1 Tag ab */
  exam_panic: {
    conditionId:    DSA5_CONDITION_IDS.FEARED,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.ONE_DAY,
    description:    'Akademie: Prüfungspanik',
  },

  /** Lernstress — anhaltend, braucht Wochenende zur Regeneration */
  stress: {
    conditionId:    DSA5_CONDITION_IDS.INPAIN,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.ONE_WEEK,
    description:    'Akademie: Lernstress',
  },

  /** Übermüdung durch Nachtaktivitäten — 1 Nacht Schlaf reicht */
  tired: {
    conditionId:    DSA5_CONDITION_IDS.INPAIN,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.ONE_DAY,
    description:    'Akademie: Übermüdung',
  },

  /** Überarbeitung — braucht 3 Tage Erholung */
  overworked: {
    conditionId:    DSA5_CONDITION_IDS.ENCUMBERED,
    defaultValue:   2,
    defaultSeconds: JANUS_DURATION.THREE_DAYS,
    description:    'Akademie: Überarbeitung',
  },

  /** Magieschock nach missglücktem Zauber — 2 Stunden, dann vorbei */
  magic_shock: {
    conditionId:    DSA5_CONDITION_IDS.STUNNED,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.TWO_HOURS,
    description:    'Akademie: Magieschock',
  },

  /** Krank — 2 Wochen Genesungszeit */
  sick: {
    conditionId:    DSA5_CONDITION_IDS.SICK,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.TWO_WEEKS,
    description:    'Akademie: Erkrankt',
  },

  /** Verletzt (Übungsunfall) — 1 Woche */
  injured: {
    conditionId:    DSA5_CONDITION_IDS.INPAIN,
    defaultValue:   2,
    defaultSeconds: JANUS_DURATION.ONE_WEEK,
    description:    'Akademie: Verletzt',
  },

  /** Strafaufgabe / Nachsitzen — 7 Tage */
  detention: {
    conditionId:    DSA5_CONDITION_IDS.ENCUMBERED,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.ONE_WEEK,
    description:    'Akademie: Strafaufgabe',
  },

  /** Konzentrationsmangel nach misslungener Prüfung — 1 Tag */
  post_exam_fatigue: {
    conditionId:    DSA5_CONDITION_IDS.STUNNED,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.ONE_DAY,
    description:    'Akademie: Prüfungserschöpfung',
  },

  /** Entzückung nach großem Erfolg — Kontrollverlust, 2 Stunden */
  euphoria: {
    conditionId:    DSA5_CONDITION_IDS.RAPTURED,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.TWO_HOURS,
    description:    'Akademie: Euphorie (Erfolgsrausch)',
  },

  /** Soziale Isolation nach Schikanierung — 3 Tage */
  withdrawn: {
    conditionId:    DSA5_CONDITION_IDS.CONFUSED,
    defaultValue:   1,
    defaultSeconds: JANUS_DURATION.THREE_DAYS,
    description:    'Akademie: Soziale Isolation',
  },
});

// ─── Hauptklasse ─────────────────────────────────────────────────────────────

export class DSA5TimedConditionBridge {
  /**
   * @param {object} deps
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── Öffentliche API ───────────────────────────────────────────────────────

  /**
   * Fügt eine zeitlich begrenzte DSA5-Condition hinzu.
   * Nutzt actor.addTimedCondition() — Effect läuft nach `seconds` Spielzeit ab.
   *
   * @param {Actor}  actor
   * @param {string} conditionId   - aus DSA5_CONDITION_IDS
   * @param {object} opts
   * @param {number} [opts.value=1]           - Condition-Stufe
   * @param {number} [opts.seconds]           - Ablaufzeit in Sekunden
   * @param {number} [opts.rounds]            - Ablaufzeit in Kampfrunden (alternativ)
   * @param {string} [opts.description]       - Anzeigename im Effect-Panel
   * @param {boolean}[opts.absolute=false]    - Absoluter Wert statt Addition
   * @returns {Promise<ActiveEffect|null>}
   *
   * @example
   * // Prüfungspanik für 1 Tag
   * await timedConditions.addTimedCondition(actor, 'feared', {
   *   value: 1,
   *   seconds: JANUS_DURATION.ONE_DAY,
   *   description: 'Prüfungspanik'
   * });
   *
   * @example
   * // Magieschock für 2 Stunden
   * await timedConditions.addTimedCondition(actor, 'stunned', {
   *   value: 1,
   *   seconds: JANUS_DURATION.TWO_HOURS,
   * });
   */
  async addTimedCondition(actor, conditionId, {
    value    = 1,
    seconds  = null,
    rounds   = null,
    description = null,
    absolute = false,
  } = {}) {
    this._assertActor(actor, conditionId);

    // Wenn keine Zeitangabe: Fallback auf permanente Condition
    if (!seconds && !rounds) {
      this.logger?.warn?.(
        `JANUS7 | TimedCondition | Keine duration für ${conditionId} — verwende permanente Condition`
      );
      return actor.addCondition(conditionId, value, absolute, false);
    }

    // duration-Objekt für Foundry ActiveEffect
    const duration = {
      startTime: game.time.worldTime,
      ...(seconds ? { seconds } : {}),
      ...(rounds  ? { rounds  } : {}),
    };

    // options-Objekt wird via mergeObject in den Effect gemergт (DSA5 API)
    const options = {
      duration,
      ...(description ? {
        name: description,
        'flags.dsa5.description': description,
      } : {}),
    };

    this.logger?.debug?.('JANUS7 | TimedCondition | addTimedCondition', {
      actor: actor.name,
      conditionId,
      value,
      seconds,
      worldTime: game.time.worldTime,
    });

    try {
      const result = await actor.addTimedCondition(conditionId, value, absolute, false, options);
      this.logger?.info?.(
        `JANUS7 | TimedCondition | +${conditionId}(${value}) für ${this._formatDuration(seconds, rounds)} → ${actor.name}`
      );
      return result;
    } catch (err) {
      this.logger?.error?.('JANUS7 | TimedCondition | addTimedCondition fehlgeschlagen', {
        conditionId, actor: actor.name, error: err?.message,
      });
      throw err;
    }
  }

  /**
   * Wendet einen JANUS7-Akademiezustand als zeitlich begrenzte DSA5-Condition an.
   * Nutzt JANUS_TIMED_CONDITION_MAP für Default-Dauer und Condition-ID.
   *
   * @param {Actor}  actor
   * @param {string} janusCondition   - z.B. 'exam_panic', 'tired', 'magic_shock'
   * @param {object} [opts]
   * @param {number} [opts.valueOverride]    - Überschreibt defaultValue
   * @param {number} [opts.secondsOverride]  - Überschreibt defaultSeconds
   * @param {string} [opts.descriptionOverride]
   * @returns {Promise<ActiveEffect|null>}
   *
   * @example
   * // Prüfungspanik (Default: 1 Tag)
   * await timedConditions.applyTimedAcademyCondition(actor, 'exam_panic');
   *
   * @example
   * // Exam-Stress mit angepasster Dauer (3 Tage statt 7)
   * await timedConditions.applyTimedAcademyCondition(actor, 'stress', {
   *   secondsOverride: JANUS_DURATION.THREE_DAYS,
   * });
   */
  async applyTimedAcademyCondition(actor, janusCondition, opts = {}) {
    const mapping = JANUS_TIMED_CONDITION_MAP[janusCondition];

    if (!mapping) {
      this.logger?.warn?.(
        `JANUS7 | TimedCondition | Unbekannter Akademiezustand: "${janusCondition}"`
      );
      return null;
    }

    return this.addTimedCondition(actor, mapping.conditionId, {
      value:       opts.valueOverride   ?? mapping.defaultValue,
      seconds:     opts.secondsOverride ?? mapping.defaultSeconds,
      description: opts.descriptionOverride ?? mapping.description,
    });
  }

  /**
   * Wendet zeitlich begrenzte Conditions für mehrere Actors gleichzeitig an.
   * Nützlich nach einer Prüfung für die gesamte Klasse.
   *
   * @param {Actor[]} actors
   * @param {string}  janusCondition
   * @param {object}  [opts]
   * @returns {Promise<Array<{actor: string, success: boolean, error?: string}>>}
   *
   * @example
   * // Nach misslungener Klassenprüfung: alle Schüler bekommen post_exam_fatigue
   * const actorList = students.map(s => game.actors.get(s.foundryId));
   * await timedConditions.applyToMany(actorList, 'post_exam_fatigue');
   */
  async applyToMany(actors, janusCondition, opts = {}) {
    const results = [];

    for (const actor of actors) {
      try {
        await this.applyTimedAcademyCondition(actor, janusCondition, opts);
        results.push({ actor: actor.name, success: true });
      } catch (err) {
        results.push({ actor: actor.name, success: false, error: err?.message });
        this.logger?.warn?.(
          `JANUS7 | TimedCondition | applyToMany: ${actor.name} fehlgeschlagen`,
          { error: err?.message }
        );
      }
    }

    const failed = results.filter((r) => !r.success).length;
    this.logger?.info?.(`JANUS7 | TimedCondition | applyToMany abgeschlossen`, {
      total: results.length,
      failed,
      janusCondition,
    });

    return results;
  }

  /**
   * Liest aktive zeitlich begrenzte Conditions eines Actors.
   * Gibt nur Effects zurück die eine duration.seconds haben (= timed).
   *
   * @param {Actor} actor
   * @returns {{ conditionId: string, name: string, remainingSeconds: number|null, expired: boolean }[]}
   */
  getTimedConditions(actor) {
    if (!actor?.effects) return [];

    const now = game.time.worldTime;
    const results = [];

    for (const effect of actor.effects) {
      const seconds = effect.duration?.seconds;
      const startTime = effect.duration?.startTime;
      if (!seconds) continue; // nicht timed

      const endTime = (startTime ?? 0) + seconds;
      const remaining = endTime - now;

      results.push({
        conditionId:      effect.statuses?.first?.() ?? null,
        name:             effect.name,
        remainingSeconds: remaining,
        expired:          remaining <= 0,
        endTime,
      });
    }

    return results;
  }

  // ─── Privat ───────────────────────────────────────────────────────────────

  /** @private */
  _assertActor(actor, conditionId) {
    if (!actor?.addTimedCondition || !actor?.addCondition) {
      throw new Error(
        `JANUS7 TimedCondition: Actor "${actor?.name}" hat keine addTimedCondition-API (${conditionId})`
      );
    }
  }

  /**
   * Lesbare Formatierung für Logs.
   * @private
   */
  _formatDuration(seconds, rounds) {
    if (seconds) {
      if (seconds >= JANUS_DURATION.ONE_DAY) {
        return `${(seconds / JANUS_DURATION.ONE_DAY).toFixed(1)} Tage`;
      }
      if (seconds >= 3600) {
        return `${(seconds / 3600).toFixed(1)} Stunden`;
      }
      return `${seconds}s`;
    }
    if (rounds) return `${rounds} Runden`;
    return 'unbegrenzt';
  }
}
