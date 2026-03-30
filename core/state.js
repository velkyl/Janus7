/**
 * @file core/state.js
 * @module janus7
 * @phase 1
 *
 * Zweck:
 * State-Engine: versionierter, persistenter Zustand mit Transaktionen und Rollback.
 *
 * Architektur:
 * - Diese Datei ist Teil von Phase 1 und darf nur AbhÃ¤ngigkeiten zu Phasen <= 1 haben.
 * - Ã–ffentliche Funktionen/Exports sind JSDoc-dokumentiert, damit JANUS7 langfristig wartbar bleibt.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */

import { MODULE_ID } from './common.js';
import { JanusConfig } from './config.js';
import { JANUS_SCHEMA_VERSION, getModuleVersion } from './version.js';
import { emitHook, HOOKS } from './hooks/emitter.js';


// Foundry API drift: some versions expose `unsetProperty`, others `deleteProperty`.
// Keep one shared helper at module scope so migrations can use it before local blocks execute.
const UNSET_PATH = foundry?.utils?.unsetProperty
  ?? foundry?.utils?.deleteProperty
  ?? ((obj, path) => {
    if (!obj || typeof path !== 'string' || !path.length) return false;
    const parts = path.split('.');
    const last = parts.pop();
    let cur = obj;
    for (const k of parts) {
      if (!cur || typeof cur !== 'object') return false;
      cur = cur[k];
    }
    if (!cur || typeof cur !== 'object') return false;
    if (!(last in cur)) return false;
    delete cur[last];
    return true;
  });

// â”€â”€â”€ Legacy-Path-Alias Sunset-Konfiguration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Format: [legacyPath, canonicalPath]
// Read/Write auf den legacyPath wird auf den canonicalPath umgeleitet (mit Warning).
//
// WICHTIG: Die Map-Richtung ist [LEGACY â†’ CANONICAL]:
//   'academy.quests'  â†’ 'questStates'  (questStates ist der SSOT-Root per v0.9.12+)
//   'scoring'         â†’ 'academy.scoring' (academy.scoring ist der kanonische Pfad)
//
// Sunset-Plan: Aliase bleiben bis v1.0 aktiv, danach entfernen.
//
const LEGACY_PATH_ALIASES = Object.freeze([
  ['academy.quests', 'questStates'],
  ['scoring', 'academy.scoring'],
]);

// Intern: Set der bereits gewarnten Paths (pro Session, verhindert Spam)
const _warnedLegacyPaths = new Set();

function normalizeStatePathAlias(path, { warnLogger } = {}) {
  const source = String(path ?? '').trim();
  if (!source) return source;
  for (const [legacyPrefix, canonicalPrefix] of LEGACY_PATH_ALIASES) {
    if (source === legacyPrefix || source.startsWith(legacyPrefix + '.')) {
      const canonical = source === legacyPrefix
        ? canonicalPrefix
        : canonicalPrefix + source.slice(legacyPrefix.length);

      // Sunset-Warning: einmalig pro Legacy-Path pro Session
      if (!_warnedLegacyPaths.has(source)) {
        _warnedLegacyPaths.add(source);
        const msg = `[JANUS7] State: Veralteter Pfad "${source}" â†’ nutze stattdessen "${canonical}". `
          + `Dieser Alias wird in v1.0 entfernt.`;
        if (warnLogger?.warn) {
          warnLogger.warn(msg);
        } else {
          console.warn(msg);
        }
      }

      return canonical;
    }
  }
  return source;
}

function deepEqualJson(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_err) {
    return false;
  }
}

function isPlainMap(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Default-World-State fÃ¼r JANUS7.
 * Wird bei der ersten Initialisierung in game.settings geschrieben.
 */
const DEFAULT_STATE = {
  meta: {
    version: getModuleVersion(),
    schemaVersion: JANUS_SCHEMA_VERSION,
    createdAt: null,
    updatedAt: null,
  },
  // Feature Flags (Phase 5+)
  features: {
    atmosphere: {
      enabled: false
    }
  },

  // Atmosphere Runtime (Phase 5)
  atmosphere: {
    masterClientUserId: null,

    // Aktiver Zustand
    activeMoodId: null,
    activePlaylistRef: null,

    // Auto-Bindings
    autoFromCalendar: false,
    autoFromEvents: false,
    autoFromLocation: false,

    // LautstÃ¤rke
    masterVolume: 1.0,

    // Pause/Resume Snapshot (flÃ¼chtig, aber im SSOT gehalten fÃ¼r Hybrid)
    paused: {
      isPaused: false,
      moodId: null,
      playlistRef: null
    },

    lastAppliedAt: null,

    // Anti-Flapping
    activeSource: null,
    lastChangeAt: null,
    cooldownMs: 5000,
    minDurationMs: 30000,

    // TemporÃ¤re Overrides (Event > Location > Calendar)
    overrideMoodId: null,
    overrideUntil: null,
    overrideSource: null,
    eventOverrideMs: 600000
  },
  // Zeitmodell â€“ Phase 3 nutzt noch eine vereinfachte Struktur.
  time: {
    year: 1039,
    month: 1,
    day: 1,
    hour: 8,
    trimester: 1,
    // Phase 6+ (Akademie-Zeit, slot-zentriert)
    // Hinweis: Diese Felder koexistieren mit dem legacy (month/day/hour) Zeitmodell.
    // - week/dayIndex/slotIndex sind SSOT fuer Akademie-Workflow.
    // - dayName/slotName sind abgeleitete, aber persistierte Bequemlichkeitsfelder
    //   (damit UI/Logs ohne Resolver etwas anzeigen koennen).
    week: 1,
    dayIndex: 0,
    slotIndex: 0,
    // Legacy-kompatible Alias-Felder (werden durch CalendarEngine synchron gehalten)
    dayName: "Praiosstag",
    slotName: "Morgens",
    // Optional: fuer Debug/Guardrails
    totalDaysPassed: 0,
    isHoliday: false,
  },
  academy: {
    currentLocationId: null,
    runtimeQueuedEvents: [],
    scoring: {
      circles: {},
    },
    examResults: {
      // [actorUuid]: {
      //   [examId]: {
      //     status: "not-taken" | "failed" | "passed" | "excellent",
      //     bestScore: 0,
      //     maxScore: 0,
      //     attempts: [ ... ]
      //   }
      // }
    },
  },
  actors: {
    pcs: {},
    npcs: {},
  },
  // Persistente Foundry-Links (UUIDs) pro JANUS-Key.
  // Zweck: deterministisches Linking (Drag&Drop / Sync) ohne fragile Name-Matches.
  // Hinweis: actors.pcs/npcs bleiben als Legacy-/Convenience-Maps erhalten.
  foundryLinks: {
    npcs: {},
    pcs: {},
    locations: {},
    scenes: {},
    playlists: {},
    items: {},
    journals: {},
    rollTables: {},
    macros: {},
  },
  display: {
    beamerMode: false,
  },
};

/**
 * Zentraler World-State von JANUS7.
 * LÃ¤dt und speichert den Zustand Ã¼ber game.settings,
 * bietet Transaction-Support mit Rollback und path-basierten Zugriff.
 */
/**
 * JanusStateCore
 *
 * @description
 * Ã–ffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen OberflÃ¤che
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna auÃŸerhalb definierter APIs
 * - Ã„nderungen hier erfordern Anpassungen im Testkatalog
 */
export class JanusStateCore {
  /** @type {Promise<void>} Privat fÃ¼r Transaktions-Queueing */
  #lock = Promise.resolve();

  /**
   * @param {Object} deps
   * @param {import('./logger.js').JanusLogger} deps.logger
   */
  constructor({ logger } = {}) {
    this._ready = false;
    /** @type {any} */
    this._state = null;
    this._dirty = false;
    this.logger = logger ?? console;
    // Testkatalog Phase 1 erwartet explizit: game.settings.get('janus7','coreState')
    // Wir halten zusÃ¤tzlich einen Legacy-Key 'state' fÃ¼r Migration Ã¤lterer Worlds.
    this.settingsKey = 'coreState';
    this.legacySettingsKey = 'state';
  }

  /**
   * Registrierung des World-Settings in Foundry.
   */
  static registerSetting() {
    // PrimÃ¤r-Key (Testkatalog): coreState
    game.settings.register(MODULE_ID, 'coreState', {
      name: 'JANUS7.State.Name',
      hint: 'JANUS7.State.Hint',
      scope: 'world',
      config: false,
      type: Object,
      default: DEFAULT_STATE
    });

    // Legacy-Key fÃ¼r bestehende Worlds (Migration aus JANUS7 <= 0.3.6.1)
    // Registrierung nur, wenn noch nicht vorhanden.
    try {
      if (!game.settings.settings.has(`${MODULE_ID}.state`)) {
        game.settings.register(MODULE_ID, 'state', {
          name: 'JANUS7.State.Legacy.Name',
          hint: 'JANUS7.State.Legacy.Hint',
          scope: 'world',
          config: false,
          type: Object,
          default: null
        });
      }
    } catch (_e) {
      // defensiv â€“ in sehr frÃ¼hen init-Phasen kann settings Map anders aussehen
    }
  }

  /**
   * Initialisiert den State (laden oder Default anlegen).
   * @returns {Promise<void>}
   */
  async init() {
    if (this._ready && this._state) return;
    await this.load();
    this._ready = true;
  }

  /** True sobald load() abgeschlossen und _state gesetzt ist. */
  get loaded() { return this._ready === true && this._state != null; }
  /** Alias fÃ¼r RÃ¼ckwÃ¤rtskompatibilitÃ¤t. */
  get isLoaded() { return this.loaded; }

/**
 * Migriert/normalisiert den geladenen State auf das erwartete Schema.
 * - ErgÃ¤nzt fehlende Felder non-destructive (Ã¼berschreibt keine vorhandenen Werte)
 * - Markiert den State als dirty, wenn Ã„nderungen vorgenommen wurden
 * @param {any} [stateObj] Optional: ein State-Objekt; default ist der interne State.
 * @returns {{changed: boolean, state: any}}
 */
// NOTE (P3-05): migrateState() mutiert das Ã¼bergebene Objekt direkt (in-place).
// Nie einen gemeinsamen Referenz-Clone Ã¼bergeben, wenn das Original unberÃ¼hrt bleiben soll.
migrateState(stateObj = this._state) {
  if (!stateObj) return { changed: false, state: stateObj };
  let changed = false;

  // Strip legacy/transport wrappers that must never live inside the canonical state.
  for (const k of ['version', 'state', 'ui', 'changed', 'simulation']) {
    if (Object.prototype.hasOwnProperty.call(stateObj, k)) {
      delete stateObj[k];
      changed = true;
    }
  }

  // Drop test-only branches if they leaked into the persisted world state.
  for (const key of Object.keys(stateObj)) {
    if (key === 'test' || /^(?:_+test|__test)/i.test(String(key))) {
      delete stateObj[key];
      changed = true;
    }
  }
  if (stateObj?.academy && typeof stateObj.academy === 'object') {
    for (const key of Object.keys(stateObj.academy)) {
      if (key === '_testMarker' || /^(?:_+test|__test)/i.test(String(key))) {
        delete stateObj.academy[key];
        changed = true;
      }
    }
  }
  const normalizeQuestRoot = (value) => {
    if (!isPlainMap(value)) return {};
    const normalizedQuests = {};
    for (const [actorId, questMap] of Object.entries(value)) {
      if (isPlainMap(questMap)) {
        const values = Object.values(questMap);
        const looksLikeQuestMap = values.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) && (
          Object.prototype.hasOwnProperty.call(entry, 'status')
          || Object.prototype.hasOwnProperty.call(entry, 'currentNodeId')
          || Object.prototype.hasOwnProperty.call(entry, 'startedAt')
        ));
        if (looksLikeQuestMap) {
          normalizedQuests[actorId] = questMap;
          continue;
        }
        for (const [nestedId, nestedQuestMap] of Object.entries(questMap)) {
          const flatActorId = `${actorId}.${nestedId}`;
          if (isPlainMap(nestedQuestMap)) {
            normalizedQuests[flatActorId] = nestedQuestMap;
            changed = true;
          }
        }
        continue;
      }
      normalizedQuests[actorId] = questMap;
    }
    return normalizedQuests;
  };

  const normalizeScoringMap = (value) => {
    if (!isPlainMap(value)) return {};
    const out = {};
    for (const [entityId, scoreValue] of Object.entries(value)) {
      if (scoreValue && typeof scoreValue === 'object' && !Array.isArray(scoreValue)) {
        const normalized = Number(scoreValue.score ?? scoreValue.value ?? scoreValue.points ?? 0);
        out[entityId] = Number.isFinite(normalized) ? normalized : 0;
      } else {
        const normalized = Number(scoreValue ?? 0);
        out[entityId] = Number.isFinite(normalized) ? normalized : 0;
      }
    }
    return out;
  };

  const normalizeDailySnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
    const out = foundry.utils.deepClone(snapshot);
    const rawCircles = out.circles;
    if (Array.isArray(rawCircles)) {
      out.circles = Object.fromEntries(rawCircles.map((entry) => [String(entry?.circleId ?? ''), Number(entry?.score ?? 0)]).filter(([id]) => id));
      changed = true;
    } else if (isPlainMap(rawCircles)) {
      const keys = Object.keys(rawCircles);
      const looksIndexed = keys.every((key) => /^\d+$/.test(String(key)));
      if (looksIndexed) {
        const entries = Object.values(rawCircles);
        out.circles = Object.fromEntries(entries.map((entry) => [String(entry?.circleId ?? ''), Number(entry?.score ?? 0)]).filter(([id]) => id));
        changed = true;
      } else {
        out.circles = normalizeScoringMap(rawCircles);
      }
    } else {
      out.circles = {};
    }
    out.topStudents = Array.isArray(out.topStudents) ? out.topStudents : [];
    return out;
  };

  const normalizeScoringRoot = (value) => {
    const root = isPlainMap(value) ? foundry.utils.deepClone(value) : {};
    root.circles = normalizeScoringMap(root.circles);
    root.students = normalizeScoringMap(root.students);
    root.lastAwarded = Array.isArray(root.lastAwarded) ? root.lastAwarded : [];
    root.dailySnapshots = Array.isArray(root.dailySnapshots)
      ? root.dailySnapshots.map(normalizeDailySnapshot).filter(Boolean)
      : [];
    return root;
  };

  const academyQuestRoot = normalizeQuestRoot(stateObj?.academy?.quests);
  const rootQuestStates = normalizeQuestRoot(stateObj?.questStates);
  const canonicalQuestStates = Object.keys(rootQuestStates).length
    ? foundry.utils.deepClone(rootQuestStates)
    : foundry.utils.deepClone(academyQuestRoot);

  stateObj.questStates = canonicalQuestStates;
  if (stateObj?.academy && Object.prototype.hasOwnProperty.call(stateObj.academy, 'quests')) {
    delete stateObj.academy.quests;
    changed = true;
  }
  if (!deepEqualJson(rootQuestStates, canonicalQuestStates) || !deepEqualJson(academyQuestRoot, canonicalQuestStates)) {
    changed = true;
  }

  // Friendly importer, strict validator:
  // - Import may provide partial state (or nulls)
  // - Validator requires certain root/meta fields
  const nowIso = () => new Date().toISOString();
  const canonicalizeLocationId = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    // Legacy/test placeholders were stored as lower-case loc_* ids (e.g. loc_base).
    // Canonical JANUS academy location ids use the LOC_* namespace.
    if (/^loc_/i.test(raw) && !/^LOC_/.test(raw)) return null;
    return raw;
  };
  const moduleVersion = () => {
    return getModuleVersion();
  };

  // Ensure path exists; treat null/undefined as missing.
  const ensure = (path, value) => {
    const canonicalPath = normalizeStatePathAlias(path);
    const cur = foundry.utils.getProperty(stateObj, canonicalPath);
    if (cur === undefined || cur === null) {
      foundry.utils.setProperty(stateObj, canonicalPath, foundry.utils.deepClone(value));
      changed = true;
    }
  };

    // Root required fields
  ensure('meta', {});
  ensure('meta.version', moduleVersion());
  ensure('meta.schemaVersion', JANUS_SCHEMA_VERSION);
  ensure('meta.createdAt', nowIso());
  ensure('meta.updatedAt', nowIso());

  // If the state came from an older module version, align meta.version on load.
  // Non-destructive: keep the previous value for traceability.
  const currentMetaVersion = String(foundry.utils.getProperty(stateObj, 'meta.version') ?? '').trim();
  const modVersion = String(moduleVersion() ?? '').trim();
  if (currentMetaVersion && modVersion && currentMetaVersion !== modVersion) {
    foundry.utils.setProperty(stateObj, 'meta.prevVersion', currentMetaVersion);
    foundry.utils.setProperty(stateObj, 'meta.version', modVersion);
    foundry.utils.setProperty(stateObj, 'meta.updatedAt', nowIso());
    changed = true;
  }

    // Time is required and must not be null
  ensure('time', {});
    // Keep year sane (validator requires >= 1000)
    const year = Number(foundry.utils.getProperty(stateObj, 'time.year'));
    if (!Number.isFinite(year) || year < 1000) {
      foundry.utils.setProperty(stateObj, 'time.year', 1039);
      changed = true;
    }

    // Required Phase-2+ blocks
    // `currentLocationId` is optional (and should be omitted when unknown).
    ensure('academy', { examResults: {}, scoring: { circles: {} } });
    ensure('academy.examResults', {});
    ensure('academy.scoring', { circles: {} });
    ensure('academy.scoring.circles', {});

    const legacyRootScoring = isPlainMap(stateObj?.scoring) ? normalizeScoringRoot(stateObj.scoring) : null;
    const academyScoring = isPlainMap(foundry.utils.getProperty(stateObj, 'academy.scoring'))
      ? normalizeScoringRoot(foundry.utils.getProperty(stateObj, 'academy.scoring'))
      : {};
    const canonicalScoring = Object.keys(academyScoring).length ? academyScoring : (legacyRootScoring ?? normalizeScoringRoot({}));
    foundry.utils.setProperty(stateObj, 'academy.scoring', canonicalScoring);
    if (Object.prototype.hasOwnProperty.call(stateObj, 'scoring')) {
      delete stateObj.scoring;
      changed = true;
    }
    if (!deepEqualJson(legacyRootScoring, canonicalScoring)) changed = true;

    // Legacy location aliases â†’ canonical academy.currentLocationId
    const currentLocationRaw = foundry.utils.getProperty(stateObj, 'academy.currentLocationId');
    const legacyActiveLocation = foundry.utils.getProperty(stateObj, 'academy.activeLocationId');
    const legacyCalendarLocation = foundry.utils.getProperty(stateObj, 'academy.calendar.activeLocationId');
    const migratedLocationId = canonicalizeLocationId(currentLocationRaw)
      ?? canonicalizeLocationId(legacyActiveLocation)
      ?? canonicalizeLocationId(legacyCalendarLocation);

    if (migratedLocationId) {
      if (currentLocationRaw !== migratedLocationId) {
        foundry.utils.setProperty(stateObj, 'academy.currentLocationId', migratedLocationId);
        changed = true;
      }
    } else if (currentLocationRaw !== undefined) {
      UNSET_PATH(stateObj, 'academy.currentLocationId');
      changed = true;
    }

    if (legacyActiveLocation !== undefined) {
      UNSET_PATH(stateObj, 'academy.activeLocationId');
      changed = true;
    }
    if (legacyCalendarLocation !== undefined) {
      UNSET_PATH(stateObj, 'academy.calendar.activeLocationId');
      changed = true;
    }

    ensure('actors', { pcs: {}, npcs: {} });
    ensure('actors.pcs', {});
    ensure('actors.npcs', {});

    // Phase 6+ / Sync: persistente UUID-Links pro Janus-Key
    ensure('foundryLinks', {
      npcs: {}, pcs: {}, locations: {}, scenes: {}, playlists: {},
      items: {}, journals: {}, rollTables: {}, macros: {}
    });
    ensure('foundryLinks.npcs', {});
    ensure('foundryLinks.pcs', {});
    ensure('foundryLinks.locations', {});
    ensure('foundryLinks.scenes', {});
    ensure('foundryLinks.playlists', {});
    ensure('foundryLinks.items', {});
    ensure('foundryLinks.journals', {});
    ensure('foundryLinks.rollTables', {});
    ensure('foundryLinks.macros', {});

    // Atmosphere: keep `mood` for legacy UI and `activeMoodId` for newer code.
    // `overrideUntil` should be omitted when not set.
    ensure('atmosphere', { mood: 'neutral', activeMoodId: 'neutral' });
    ensure('atmosphere.mood', 'neutral');
    ensure('atmosphere.activeMoodId', 'neutral');

    ensure('features', { atmosphere: { enabled: true } });
    ensure('features.atmosphere', { enabled: true });
    ensure('features.atmosphere.enabled', true);
  // Some older imports used time = null; ensure above fixes that.
  const tri = foundry.utils.getProperty(stateObj, 'time.trimester');
  if (tri === undefined || tri === null) {
    foundry.utils.setProperty(stateObj, 'time.trimester', 1);
    changed = true;
  }

  // Phase 6+ Akademie-Zeitmodell (non-destructive)
  ensure('time.week', 1);
  ensure('time.dayIndex', 0);
  ensure('time.slotIndex', 0);
  ensure('time.totalDaysPassed', 0);
  ensure('time.isHoliday', false);

  // Legacy-Aliases fuer bestehende Engines (Calendar/SlotResolver)
  // day/phase sind Strings (aventurische Tagesnamen / Slotlabel)
  ensure('time.day', 'Praiosstag');
  ensure('time.phase', 'Morgens');
  // Derived display fields: omit when unknown to avoid null-type churn.
  // (Older saves might contain explicit nulls; we normalize those below.)

  ensure('display', { beamerMode: false });
  const bm = foundry.utils.getProperty(stateObj, 'display.beamerMode');
  if (bm === undefined || bm === null) {
    foundry.utils.setProperty(stateObj, 'display.beamerMode', false);
    changed = true;
  }

  // --- normalization: remove explicit nulls for optional fields -------------
  // This keeps exports clean and reduces null-handling in downstream code.
  const nullPathCleanup = [
    'academy.currentLocationId',
    'time.dayName',
    'time.slotName',
    'atmosphere.overrideUntil'
  ];

  for (const p of nullPathCleanup) {
    if (foundry.utils.getProperty(stateObj, p) === null) {
      UNSET_PATH(stateObj, p);
      changed = true;
    }
  }

  if (changed) this._dirty = true;
  return { changed, state: stateObj };
}

  /**
   * LÃ¤dt den State aus game.settings oder legt einen neuen an.
   * Speichert nur dann zurÃ¼ck, wenn es sich um eine Neuinitialisierung handelt.
   * @returns {Promise<void>}
   */
  async load() {
    if (this._ready && this._state) return;

    // --- Pre-Load-Backup (flÃ¼chtig im Client) ---
    try {
      const storedSetting = game.settings.get(MODULE_ID, this.settingsKey);
      if (storedSetting) {
        const backupKey = `janus7.state.backup.${game.world.id}`;
        localStorage.setItem(backupKey, JSON.stringify({
          ts: new Date().toISOString(),
          version: getModuleVersion(),
          data: storedSetting
        }));
      }
    } catch (_err) { /* no-op: backup should not block boot */ }

    // 1) PrimÃ¤r-State (coreState)
    // FIX P0-01: game.settings.get() ist SYNCHRON â€” kein await verwenden.
    let stored = game.settings.get(MODULE_ID, this.settingsKey);
    let loadedFromLegacy = false;
    // 2) Migration: falls coreState leer ist, versuche Legacy-Key 'state'
    if (!stored) {
      try {
        const legacy = game.settings.get(MODULE_ID, this.legacySettingsKey);
        if (legacy) {
          stored = legacy;
          loadedFromLegacy = true;
          this._legacySyncPending = true;
          this.logger?.info?.('JanusStateCore: Legacy-State gefunden (state) â€“ migriere nach coreState.');
          this._dirty = true;
        }
      } catch (_e) {
        // ignore
      }
    }
    let isNew = false;

    if (!stored) {
      // Neuer State aus Default
      this._state = foundry.utils.deepClone(DEFAULT_STATE);
      if (!this._state.meta) this._state.meta = {};
      const now = new Date().toISOString();
      this._state.meta.createdAt = now;
      this._state.meta.updatedAt = now;

// --- Schema-Migration (non-destructive) ---
// ErgÃ¤nzt fehlende Felder, damit spÃ¤tere Phasen (Scoring/Display/Trimester) nicht blockieren.

      this._dirty = true;
      isNew = true;
      if (this.logger?.info) {
        this.logger.info('JanusStateCore: Neuer State initialisiert.');
      }
    } else {
      this._state = stored;
      this._dirty = false;
      if (this.logger?.info) {
        this.logger.info('JanusStateCore: Bestehender State geladen.');
      }
    }

    // Schema-Migration fÃ¼r neue *und* bestehende States
    // WICHTIG: migrateState() markiert nur "changed". Ohne _dirty bleibt die Migration unsaved
    // und meta.version driftet weiter (z.B. bleibt auf 0.9.9.6 obwohl Modul hÃ¶her ist).
    const mig = this.migrateState();
    if (mig?.changed) {
      this._dirty = true;
      this._state = mig.state ?? this._state;
    }

    // Meta-Timestamps sicherstellen (Migration Ã¤lterer States)
    if (!this._state.meta) this._state.meta = {};
    if (typeof this._state.meta.createdAt !== 'string') {
      this._state.meta.createdAt = new Date().toISOString();
      this._dirty = true;
    }
    if (typeof this._state.meta.updatedAt !== 'string') {
      this._state.meta.updatedAt = this._state.meta.createdAt;
      this._dirty = true;
    }

    // Speichern:
    // - wenn neu ODER Migration aus Legacy-Key ODER Schema-Migration dirty gesetzt hat
    // Boot darf nicht komplett scheitern, nur weil der persistente Write im Ready-Fenster
    // zickt. In diesem Fall behalten wir den geladenen In-Memory-State und loggen sauber.
    if (isNew || this._dirty) {
      try {
        await this.save({ force: true });
      } catch (err) {
        this.logger?.warn?.('JanusStateCore.load(): Persistenz beim Boot fehlgeschlagen â€“ arbeite mit In-Memory-State weiter.', {
          message: err?.message ?? String(err),
          stack: err?.stack ?? null,
          force: true,
          dirty: this._dirty
        });
      }
    }

    // Canonical hook â€” routed through central emitter (also fires legacy alias)
    emitHook(HOOKS.STATE_LOADED, { state: this._state, isNew });
  }

  /**
   * Gibt den kompletten State zurÃ¼ck.
   * ACHTUNG: Nur read-only verwenden oder explizit clonen.
   */

  /**
   * Get the current JANUS7 state (snapshot) or a nested property via dot-notation path.
   *
   * Notes:
   * - Always returns a snapshot (deep clone) for objects to preserve SSOT integrity.
   * - If a path is provided and does not exist, returns undefined.
   *
   * @param {string} [path=""] Dot-notation path (e.g. "time.day")
   * @returns {*}
   */
  get(path = "") {
    const canonicalPath = normalizeStatePathAlias(path, { warnLogger: this.logger });
    const value = canonicalPath ? foundry.utils.getProperty(this._state, canonicalPath) : this._state;
    if (value && typeof value === "object") return foundry.utils.deepClone(value);
    return value;
  }

  /**
   * Backwards-compat alias used by older UI commands/tests.
   * Returns a full deep-cloned state snapshot.
   */
  snapshot() {
    return this.get("");
  }

  /**
   * Liefert einen Wert per Pfad, z. B. "time.day".
   * @param {string} path
   */
  getPath(path) {
    const canonicalPath = normalizeStatePathAlias(path, { warnLogger: this.logger });
    if (!canonicalPath) return this._state;
    return foundry.utils.getProperty(this._state, canonicalPath);
  }

  /**
   * Setzt einen Wert per Pfad und feuert ein Change-Event.
   * @param {string} path
   * @param {any} value
   * @returns {any} Neuer Wert
   */
  set(path, value) {
    const canonicalPath = normalizeStatePathAlias(path, { warnLogger: this.logger });
    const oldValue = this.getPath(canonicalPath);
    if (deepEqualJson(oldValue, value)) {
      return this.getPath(canonicalPath);
    }
    foundry.utils.setProperty(this._state, canonicalPath, value);
    this._touchMeta();

    // Canonical hook â€” routed through central emitter (also fires legacy alias)
    emitHook(HOOKS.STATE_CHANGED, {
      path: canonicalPath,
      oldValue,
      newValue: this.getPath(canonicalPath),
      state: this._state
    });
    this._emitCampaignStateUpdated({ source: 'set', path: canonicalPath, oldValue, newValue: this.getPath(canonicalPath) });

    return this.getPath(canonicalPath);
  }

  /**
   * Entfernt einen Pfad aus dem State und emittiert die ueblichen Hooks.
   * Blockiert kritische Segmente gegen Prototype-Pollution.
   * @param {string} path
   * @returns {boolean}
   */
  unset(path) {
    const source = normalizeStatePathAlias(path, { warnLogger: this.logger });
    if (!source) return false;
    const parts = source.split('.').filter(Boolean);
    if (!parts.length) return false;
    if (parts.some((p) => ['__proto__', 'prototype', 'constructor'].includes(p))) {
      throw new Error(`JanusStateCore.unset(): Unsicherer Pfad: ${source}`);
    }
    const oldValue = this.getPath(source);
    const _unset = UNSET_PATH ?? ((obj, pathStr) => {
        if (!obj || typeof pathStr !== 'string' || !pathStr.length) return false;
        const segs = pathStr.split('.');
        const last = segs.pop();
        let cur = obj;
        for (const seg of segs) {
          if (!cur || typeof cur !== 'object') return false;
          cur = cur[seg];
        }
        if (!cur || typeof cur !== 'object' || !(last in cur)) return false;
        delete cur[last];
        return true;
      });
    const changed = Boolean(_unset(this._state, source));
    if (!changed) return false;
    this._touchMeta();
    emitHook(HOOKS.STATE_CHANGED, {
      path: source,
      oldValue,
      newValue: undefined,
      state: this._state
    });
    this._emitCampaignStateUpdated({ source: 'unset', path: source, oldValue, newValue: undefined });
    return true;
  }

  /**
   * Ersetzt den gesamten State.
   * @param {any} newState
   */
  replace(newState) {
    const oldState = this._state;
    this._state = foundry.utils.deepClone(newState);
    this._touchMeta();

    // Canonical hook â€” routed through central emitter (also fires legacy alias)
    emitHook(HOOKS.STATE_REPLACED, {
      oldState,
      newState: this._state
    });
    this._emitCampaignStateUpdated({ source: 'replace', oldState, newState: this._state });

    this._dirty = true;
  }


  _emitCampaignStateUpdated(context = {}) {
    try {
      emitHook(HOOKS.CAMPAIGN_UPDATED, { state: this._state, ...context });
    } catch (_err) {
      // non-fatal custom hook
    }
  }

  /**
   * Markiert State als dirty und aktualisiert Meta-Timestamps.
   * @private
   */
  _touchMeta() {
    if (!this._state.meta) this._state.meta = {};
    const now = new Date().toISOString();
    if (!this._state.meta.createdAt) {
      this._state.meta.createdAt = now;
    }
    this._state.meta.updatedAt = now;
    this._dirty = true;
  }

  /**
   * Speichert den aktuellen State in game.settings.
   *
   * @param {Object} [options]
   * @param {boolean} [options.force=false] - Ignoriert autoSave & dirty-Flag.
   * @returns {Promise<any>} Gespeicherter State.
   */
  async save({ force = false } = {}) {
    // Persisted world-state must never retain test artifacts or legacy transport wrappers.
    // This is intentionally non-destructive for canonical fields and keeps runtime state exportable.
    try {
      this.migrateState(this._state);
    } catch (err) {
      this.logger?.warn?.('JanusStateCore.save(): migrateState vor Persist fehlgeschlagen.', err);
    }

    // Tests (JanusTestHarness) dÃ¼rfen den World-State nicht verÃ¤ndern.
    // Statt Methoden zur Laufzeit auszutauschen (was mit gebundenen Referenzen
    // kollidieren kann), schalten wir Persistenz Ã¼ber ein Flag ab.
    if (this._suppressPersist) {
      this.logger?.debug?.('JanusStateCore.save(): Persistenz ist unterdrÃ¼ckt (Testlauf).', { force });
      return this._state;
    }

    // autoSave respektieren, wenn nicht forciert.
    // WICHTIG: Beim forcierten Boot-Save darf fehlende/frÃ¼he Config-AuflÃ¶sung die
    // komplette Ready-Pipeline nicht blockieren.
    let autoSave = true;
    if (!force) {
      try {
        // Guard: check if setting exists to avoid early-boot errors
        if (game.settings.settings.has(`${MODULE_ID}.autoSave`)) {
          autoSave = JanusConfig.get('autoSave') !== false;
        }
      } catch (_err) {
        autoSave = true;
      }

      if (!autoSave) {
        this.logger?.warn?.('JanusStateCore.save(): autoSave ist deaktiviert, Speichern Ã¼bersprungen.', {
          dirty: this._dirty
        });
        return this._state;
      }

      if (!this._dirty) {
        return this._state;
      }
    }

    this._touchMeta();

    await game.settings.set(MODULE_ID, this.settingsKey, this._state);

    // Legacy-key sync: only on first save after migration (reduces IO by 50%)
    if (this._legacySyncPending) {
      try {
        await game.settings.set(MODULE_ID, this.legacySettingsKey, this._state);
        this._legacySyncPending = false;
      } catch (_e) {
        // Legacy key not registered; ignore.
      }
    }
    this._dirty = false;

    this.logger?.debug?.('JanusStateCore: State gespeichert.', {
      autoSave,
      force
    });

    // Canonical hook â€” routed through central emitter (also fires legacy alias)
    emitHook(HOOKS.STATE_SAVED, { state: this._state });
    this._emitCampaignStateUpdated({ source: 'save', state: this._state });

    return this._state;
  }

  /**
   * FÃ¼hrt eine State-Mutation mit Rollback-Support aus.
   *
   * @template T
   * @param {function(JanusStateCore): (T|Promise<T>)} mutator
   * @returns {Promise<T>}
   */
  async transaction(mutator, opts = {}) {
    if (typeof mutator !== 'function') {
      throw new Error('JanusStateCore.transaction(): mutator muss eine Funktion sein.');
    }

    // --- Atomic Lock Queueing ---
    const parentLock = this.#lock;
    let unlock;
    this.#lock = new Promise((res) => { unlock = res; });

    try {
      // Warten bis vorherige Transaktionen abgeschlossen sind
      await parentLock;

      const snapshot = foundry.utils.deepClone(this._state);
      const wasDirty = this._dirty;

      try {
        const result = await mutator(this);
        return result;
      } catch (err) {
        // Rollback
        this._state = snapshot;
        this._dirty = wasDirty;

        // Kontrollierte Rollbacks (Tests/No-Op) sollen die Konsole nicht zumÃ¼llen.
        // Der Test-Harness wirft bewusst einen Sentinel-Error, um Ã„nderungen sauber zurÃ¼ckzudrehen.
        const isTestRollback = (e) => {
          const msg = String(e?.message ?? '');
          const name = String(e?.name ?? '');
          return name === 'JanusTestRollback' || msg === 'JANUS_TEST_ROLLBACK';
        };
        const isExpectedRollback = (e) => {
          const msg = String(e?.message ?? '');
          const name = String(e?.name ?? '');
          if (typeof opts?.isExpectedRollback === 'function') return !!opts.isExpectedRollback(e);
          if (Array.isArray(opts?.expectedErrors)) {
            return opts.expectedErrors.some((needle) => {
              const value = String(needle ?? '');
              return value && (msg === value || name === value || msg.includes(value));
            });
          }
          return false;
        };

        if (isTestRollback(err)) {
          if (!opts?.silent) this.logger?.debug?.('State-Transaktion: Test-Rollback ausgefÃ¼hrt (kein Fehler).');
          return undefined;
        }

        if (isExpectedRollback(err)) {
          if (!opts?.silent) this.logger?.debug?.('State-Transaktion: erwarteter Rollback ausgefÃ¼hrt.', { message: err?.message, name: err?.name });
          throw err;
        }

        if (!opts?.silent) this.logger?.error?.('State-Transaktion fehlgeschlagen. Ã„nderungen zurÃ¼ckgesetzt.', err);
        throw err;
      }
    } finally {
      // Lock freigeben fÃ¼r nÃ¤chsten in der Queue
      unlock();
    }
  }

  /** @returns {boolean} */
  get isReady() { return !!this._ready; }
}

