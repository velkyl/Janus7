/**
 * @file core/validator/schemas-state.js
 * @module janus7
 * @phase 1
 *
 * State-Schema-Definitionen fÃ¼r den JANUS7 Core-State.
 * Ausgelagert aus core/validator.js (war: 1291 Zeilen God-Object).
 *
 * Importiert von: core/validator/index.js
 */

// â”€â”€â”€ Shared Sub-Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const SCORE_VALUE_SCHEMA = {
  anyOf: [
    { type: 'number' },
    {
      type: 'object',
      additionalProperties: true,
      properties: {
        score: { type: 'number', nullable: true },
        value: { type: 'number', nullable: true },
        points: { type: 'number', nullable: true }
      }
    }
  ]
};

export const SCORING_ROOT_SCHEMA = {
  type: 'object',
  nullable: true,
  additionalProperties: true,
  properties: {
    circles: { type: 'object', nullable: true, additionalProperties: SCORE_VALUE_SCHEMA },
    students: { type: 'object', nullable: true, additionalProperties: SCORE_VALUE_SCHEMA },
    lastAwarded: { type: 'array', nullable: true, items: { type: 'object' } },
    dailySnapshots: { type: 'array', nullable: true, items: { type: 'object' } }
  }
};

// â”€â”€â”€ Core State Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const STATE_SCHEMA = {
  type: 'object',
  required: ['time', 'meta', 'academy', 'actors', 'display'],
  additionalProperties: false,
  properties: {
    meta: {
      type: 'object',
      required: ['version', 'schemaVersion', 'createdAt', 'updatedAt'],
      additionalProperties: true,
      properties: {
        version: { type: 'string', minLength: 1 },
        schemaVersion: { type: 'string', minLength: 1 },
        createdAt: { type: 'string', nullable: true },
        updatedAt: { type: 'string', nullable: true }
      }
    },
    features: {
      type: 'object',
      nullable: true,
      additionalProperties: false,
      properties: {
        social: { type: 'boolean', nullable: true },
        scoring: { type: 'boolean', nullable: true },
        atmosphere: {
          type: 'object',
          required: ['enabled'],
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' }
          }
        }
      }
    },
    atmosphere: {
      type: 'object',
      nullable: true,
      additionalProperties: false,
      properties: {
        masterClientUserId: { type: 'string', nullable: true },
        activeMoodId: { type: 'string', nullable: true },
        activePlaylistRef: { type: 'string', nullable: true },
        autoFromCalendar: { type: 'boolean', nullable: true },
        autoFromEvents: { type: 'boolean', nullable: true },
        autoFromLocation: { type: 'boolean', nullable: true },
        masterVolume: { type: 'number', nullable: true, min: 0 },
        paused: {
          type: 'object',
          nullable: true,
          additionalProperties: false,
          properties: {
            isPaused: { type: 'boolean', nullable: true },
            moodId: { type: 'string', nullable: true },
            playlistRef: { type: 'string', nullable: true }
          }
        },
        lastAppliedAt: { type: ['string', 'number'], nullable: true },
        activeSource: { type: 'string', nullable: true },
        lastChangeAt: { type: ['string', 'number'], nullable: true },
        cooldownMs: { type: 'number', nullable: true, min: 0 },
        minDurationMs: { type: 'number', nullable: true, min: 0 },
        overrideMoodId: { type: 'string', nullable: true },
        mood: { type: 'string', nullable: true },
        overrideUntil: { anyOf: [{ type: 'string' }, { type: 'number' }], nullable: true },
        overrideSource: { type: 'string', nullable: true },
        eventOverrideMs: { type: 'number', nullable: true, min: 0 }
      }
    },
    time: {
      type: 'object',
      required: ['year', 'trimester', 'week', 'dayIndex', 'slotIndex'],
      additionalProperties: false,
      properties: {
        year: { type: 'number', min: 1000, max: 1100 },
        month: { type: 'number', nullable: true, min: 1, max: 12 },
        day: { anyOf: [ { type: 'number', min: 1, max: 31 }, { type: 'string', minLength: 1 } ], nullable: true },
        hour: { type: 'number', nullable: true, min: 0, max: 23 },
        trimester: { type: 'number', min: 1, max: 4 },
        week: { type: 'number', min: 1 },
        dayIndex: { type: 'number', min: 0 },
        slotIndex: { type: 'number', min: 0 },
        dayName: { type: 'string', nullable: true },
        slotName: { type: 'string', nullable: true },
        totalDaysPassed: { type: 'number', nullable: true, min: 0 },
        isHoliday: { type: 'boolean', nullable: true },
        worldTime: { type: 'number', nullable: true },
        world: { type: 'object', nullable: true, additionalProperties: true },
        phase: { type: 'string', nullable: true }
      }
    },
    academy: {
      type: 'object',
      required: ['examResults'],
      additionalProperties: true,
      properties: {
        currentLocationId: { type: 'string', nullable: true },
        examResults: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: { type: 'object' }
          }
        },
        social: {
          type: 'object',
          nullable: true,
          additionalProperties: true,
          properties: {
            relationships: { type: 'object', nullable: true, additionalProperties: true }
          }
        },
        quests: {
          type: 'object',
          nullable: true,
          additionalProperties: true
        },
        scoring: SCORING_ROOT_SCHEMA
      }
    },
    actors: {
      type: 'object',
      required: ['pcs', 'npcs'],
      additionalProperties: false,
      properties: {
        pcs: {
          type: 'object',
          additionalProperties: {
            anyOf: [
              { type: 'object' },
              { type: 'string' }
            ]
          }
        },
        npcs: {
          type: 'object',
          additionalProperties: {
            anyOf: [
              { type: 'object' },
              { type: 'string' }
            ]
          }
        }
      }
    },
    foundryLinks: {
      type: 'object',
      nullable: true,
      additionalProperties: false,
      properties: {
        npcs: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        pcs: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        locations: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        scenes: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        playlists: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        items: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        journals: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        rollTables: { type: 'object', nullable: true, additionalProperties: { type: 'string' } },
        macros: { type: 'object', nullable: true, additionalProperties: { type: 'string' } }
      }
    },
    playerState: {
      type: 'object',
      nullable: true,
      additionalProperties: true
    },
    questStates: {
      type: 'object',
      nullable: true,
      additionalProperties: true
    },
    scoring: SCORING_ROOT_SCHEMA,
    display: {
      type: 'object',
      required: ['beamerMode'],
      additionalProperties: false,
      properties: {
        beamerMode: { type: 'boolean' }
      }
    }
  }
};

