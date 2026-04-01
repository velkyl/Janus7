import { JanusStateError, JanusValidationError } from './errors.js';
import { migrateStateSchema } from './state-schema.js';


function _pruneNullMapValues(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return map;
  return Object.fromEntries(Object.entries(map).filter(([, value]) => value !== null && value !== undefined));
}

function _looksLikeQuestState(entry) {
  return !!entry && typeof entry === 'object' && !Array.isArray(entry) && (
    Object.prototype.hasOwnProperty.call(entry, 'status')
    || Object.prototype.hasOwnProperty.call(entry, 'currentNodeId')
    || Object.prototype.hasOwnProperty.call(entry, 'startedAt')
  );
}

function _pruneQuestTestActors(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = {};
  for (const [actorId, questData] of Object.entries(value)) {
    if (/^Actor\.test_/i.test(String(actorId))) continue;
    if (questData && typeof questData === 'object' && !Array.isArray(questData)) {
      const values = Object.values(questData);
      const looksLikeQuestMap = values.every((entry) => _looksLikeQuestState(entry));
      if (looksLikeQuestMap) {
        const pruned = _pruneNullMapValues(questData);
        if (pruned && Object.keys(pruned).length) out[actorId] = pruned;
        continue;
      }
      for (const [nestedId, nestedQuestData] of Object.entries(questData)) {
        const flatActorId = `${actorId}.${nestedId}`;
        if (/^Actor\.test_/i.test(String(flatActorId))) continue;
        const pruned = _pruneNullMapValues(nestedQuestData);
        if (pruned && Object.keys(pruned).length) out[flatActorId] = pruned;
      }
      continue;
    }
    const pruned = _pruneNullMapValues(questData);
    if (pruned && Object.keys(pruned).length) out[actorId] = pruned;
  }
  return out;
}

function _normalizeScoreScalar(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const normalized = Number(value.score ?? value.value ?? value.points ?? 0);
    return Number.isFinite(normalized) ? normalized : 0;
  }
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function _normalizeScoringRoot(value) {
  const root = (value && typeof value === 'object' && !Array.isArray(value))
    ? foundry.utils.deepClone(value)
    : {};

  const normalizeMap = (map) => {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
    return Object.fromEntries(Object.entries(map).map(([id, score]) => [id, _normalizeScoreScalar(score)]));
  };

  const normalizeSnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
    const out = foundry.utils.deepClone(snapshot);
    if (Array.isArray(out.circles)) {
      out.circles = Object.fromEntries(out.circles.map((entry) => [String(entry?.circleId ?? ''), Number(entry?.score ?? 0)]).filter(([id]) => id));
    } else if (out.circles && typeof out.circles === 'object' && !Array.isArray(out.circles)) {
      const keys = Object.keys(out.circles);
      const looksIndexed = keys.every((key) => /^\d+$/.test(String(key)));
      if (looksIndexed) {
        out.circles = Object.fromEntries(Object.values(out.circles).map((entry) => [String(entry?.circleId ?? ''), Number(entry?.score ?? 0)]).filter(([id]) => id));
      } else {
        out.circles = normalizeMap(out.circles);
      }
    } else {
      out.circles = {};
    }
    out.topStudents = Array.isArray(out.topStudents) ? out.topStudents : [];
    return out;
  };

  root.circles = normalizeMap(root.circles);
  root.students = normalizeMap(root.students);
  root.lastAwarded = Array.isArray(root.lastAwarded) ? root.lastAwarded : [];
  root.dailySnapshots = Array.isArray(root.dailySnapshots) ? root.dailySnapshots.map(normalizeSnapshot).filter(Boolean) : [];
  return root;
}

function _unwrapStateEnvelope(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return candidate;
  if (candidate.campaign_state && typeof candidate.campaign_state === 'object' && !Array.isArray(candidate.campaign_state)) return candidate.campaign_state;
  if (candidate.snapshot && typeof candidate.snapshot === 'object' && !Array.isArray(candidate.snapshot)) return candidate.snapshot;
  if (candidate.state && typeof candidate.state === 'object' && !Array.isArray(candidate.state)) {
    const hasCoreShape = candidate.state.meta || candidate.state.time || candidate.state.academy || candidate.state.actors;
    if (hasCoreShape) return candidate.state;
  }
  return candidate;
}

function _sanitizeStateCandidate(candidate, { applySchemaHealing = true } = {}) {
  if (!candidate || typeof candidate !== 'object') return candidate;
  const clone = foundry.utils.deepClone(_unwrapStateEnvelope(candidate));

  // Remove test-only payloads from real exports/imports.
  // Runtime service containers like `simulation` do not belong into the
  // persisted core state and would fail schema validation on roundtrips.
  delete clone.simulation;
  delete clone.test;
  delete clone._testMarker;
  delete clone.__tests;
  delete clone.__testHarness;
  for (const key of Object.keys(clone)) {
    if (/^(?:_+test|__test)/i.test(String(key))) delete clone[key];
  }
  if (clone?.academy && typeof clone.academy === 'object') {
    delete clone.academy._testMarker;
    for (const key of Object.keys(clone.academy)) {
      if (/^(?:_+test|__test)/i.test(String(key))) delete clone.academy[key];
    }
  }

  if (applySchemaHealing) {
    // Healing is allowed for exports and lenient recovery imports, but strict
    // validation must see the caller payload before missing required roots are
    // silently repaired.
    const mig = migrateStateSchema(clone);
    if (mig?.state) {
      // Continue with healed state (note: migrateStateSchema is in-place)
    }
  }

  const academyQuestRoot = (clone?.academy?.quests && typeof clone.academy.quests === 'object')
    ? _pruneQuestTestActors(clone.academy.quests)
    : null;
  const rootQuestStates = (clone?.questStates && typeof clone.questStates === 'object')
    ? _pruneQuestTestActors(clone.questStates)
    : null;
  clone.questStates = foundry.utils.deepClone(rootQuestStates ?? academyQuestRoot ?? {});
  if (clone?.academy && Object.prototype.hasOwnProperty.call(clone.academy, 'quests')) delete clone.academy.quests;

  const academyScoring = (clone?.academy?.scoring && typeof clone.academy.scoring === 'object' && !Array.isArray(clone.academy.scoring))
    ? foundry.utils.deepClone(clone.academy.scoring)
    : null;
  const rootScoring = (clone?.scoring && typeof clone.scoring === 'object' && !Array.isArray(clone.scoring))
    ? foundry.utils.deepClone(clone.scoring)
    : null;
  clone.academy ??= {};
  const normalizedScoring = _normalizeScoringRoot(academyScoring ?? rootScoring ?? { circles: {} });
  clone.academy.scoring = normalizedScoring;
  // Root-level scoring stays as legacy compatibility alias because parts of the
  // state schema and several roundtrip tests still expect it to exist.
  clone.scoring = foundry.utils.deepClone(normalizedScoring);

  const foundryLinks = clone?.foundryLinks;
  if (foundryLinks && typeof foundryLinks === 'object') {
    for (const key of ['npcs', 'pcs', 'locations', 'scenes', 'playlists', 'items', 'journals', 'rollTables', 'macros']) {
      if (foundryLinks[key] && typeof foundryLinks[key] === 'object') {
        foundryLinks[key] = _pruneNullMapValues(foundryLinks[key]);
      }
    }
  }

  const actors = clone?.actors;
  if (actors && typeof actors === 'object') {
    for (const key of ['pcs', 'npcs']) {
      if (actors[key] && typeof actors[key] === 'object') {
        actors[key] = _pruneNullMapValues(actors[key]);
      }
    }
  }

  return clone;
}


/**
 * Import/Export-Layer für JANUS7.
 */
/**
 * JanusIO
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
export class JanusIO {
  /**
   * @param {Object} deps
   * @param {import('./state.js').JanusStateCore} deps.state
   * @param {import('./validator.js').JanusValidator} deps.validator
   * @param {import('./logger.js').JanusLogger} deps.logger
   */
  constructor({ state, validator, logger } = {}) {
    this.state = state;
    this.validator = validator;
    this.logger = logger ?? console;
  }

  /**
   * Exportiert den aktuellen Kampagnenzustand als bereinigte Deep-Copy.
   *
   * @returns {object}
   *   Vollständiger JANUS7-State ohne Testartefakte und mit normalisierten
   *   Legacy-Aliasen für Quest- und Scoring-Daten.
   */
  exportState() {
    const current = this.state?.get();
    return _sanitizeStateCandidate(current);
  }

  /**
   * Serialisiert den aktuellen State als JSON-String.
   *
   * @param {boolean} [pretty=true]
   *   Formatiert die Ausgabe mit Einrückungen, wenn `true`.
   * @returns {string}
   *   JSON-Repräsentation des aktuellen JANUS7-States.
   */
  exportStateAsJSON(pretty = true) {
    const data = this.exportState();
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Importiert einen vollständigen State aus einem JavaScript-Objekt.
   *
   * Der Import läuft transaktional: Erst wird das Eingabeobjekt bereinigt und
   * optional validiert, danach wird der State atomar ersetzt. Bei Fehlern wird
   * kein partieller Schreibvorgang in den World-State übernommen.
   *
   * @param {any} obj
   *   Potenzieller JANUS7-State oder ein State-Envelope mit `campaign_state`,
   *   `snapshot` oder `state`.
   * @param {Object} [options]
   * @param {boolean} [options.save=true]
   *   Erzwingt nach erfolgreichem Import ein persistentes Save.
   * @param {boolean} [options.validate=true]
   *   Prüft das bereinigte Objekt gegen das registrierte State-Schema.
   * @param {boolean} [options.silentValidation=false]
   *   Unterdrückt Validator-Warnungen im Logger.
   * @returns {Promise<boolean>}
   *   `true`, wenn der Import erfolgreich abgeschlossen wurde.
   * @throws {JanusStateError}
   *   Wenn kein gültiges Objekt/JSON vorliegt oder der Aufrufer kein GM ist.
   * @throws {JanusValidationError}
   *   Wenn die Validierung des Eingabezustands scheitert.
   */
  async importStateFromObject(obj, { save = true, validate = true, silentValidation = false } = {}) {
    if (!obj || typeof obj !== 'object') {
      throw new JanusStateError('Ungültiges State-Objekt beim Import.', { obj });
    }

    // Security baseline (Phase-7 Readiness): keine State-Writes ohne GM.
    // Hinweis: Tests laufen typischerweise als GM. Multi-User-Security bleibt ggf. MANUAL.
    if (game?.user && !game.user.isGM) {
      throw new JanusStateError('State-Import ist nur für GM erlaubt.', { userId: game.user.id });
    }

    const validator = this.validator;

    // 1) Sanitize known JANUS-internal test artifacts before validation.
    // Unknown user payload must still fail validation, but leaked test markers like root.test
    // or academy._testMarker should never break a legitimate roundtrip.
    const sanitizedInput = _sanitizeStateCandidate(obj, { applySchemaHealing: !validate });

    // 2) Validate sanitized input. Unknown keys & wrong types must still be rejected.
    if (validate && validator?.validateState) {
      const res = validator.validateState(sanitizedInput);
      if (!res?.valid) {
        if (!silentValidation) this.logger?.warn?.('State-Import: Validierung fehlgeschlagen (raw).', res?.errors);
        throw new JanusValidationError('State-Import Validierung fehlgeschlagen.', {
          errors: res?.errors ?? [],
          sample: sanitizedInput
        });
      }
    }

    // 3) Clone input (never mutate caller).
    let candidate = sanitizedInput;

    // 4) Optional migration/normalization only when validate=false (legacy / recovery imports).
    if (!validate && typeof this.state?.migrateState === 'function') {
      try {
        const migrated = this.state.migrateState(candidate);
        candidate = migrated?.state ?? candidate;
      } catch (err) {
        this.logger?.warn?.('State-Import: Migration fehlgeschlagen (validate=false).', err);
      }
    }

    // 5) Transaction + replace (atomic). No partial mutations.
    await this.state.transaction(async (s) => {
      s.replace(candidate);
    });

    if (save) await this.state.save({ force: true });
    return true;
  }

  /**
   * Importiert einen State aus einem JSON-String.
   *
   * @param {string} json
   *   Serialisierter JANUS7-State.
   * @param {Object} [options]
   * @param {boolean} [options.save=true]
   * @param {boolean} [options.validate=true]
   * @param {boolean} [options.silentValidation=false]
   * @returns {Promise<boolean>}
   *   `true`, wenn Parse- und Importvorgang erfolgreich waren.
   * @throws {JanusStateError}
   *   Wenn der String kein gültiges JSON enthält.
   * @throws {JanusValidationError}
   *   Wenn der geparste State die Schemavalidierung nicht besteht.
   */
  async importStateFromJSON(json, { save = true, validate = true, silentValidation = false } = {}) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      throw new JanusStateError('Ungültiges JSON beim State-Import.', { err });
    }

    return this.importStateFromObject(parsed, { save, validate, silentValidation });
  }
}
