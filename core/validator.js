/**
 * @file core/validator.js
 * @module janus7
 * @phase 1
 *
 * Zweck:
 * Validierung des Core-State (Schema- und Invariantenchecks).
 *
 * Architektur:
 * - Diese Datei ist Teil von Phase 1 und darf nur Abhängigkeiten zu Phasen <= 1 haben.
 * - Öffentliche Funktionen/Exports sind JSDoc-dokumentiert, damit JANUS7 langfristig wartbar bleibt.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */

/**
 * Einfacher Validierungs-Layer für JANUS7.
 * Unterstützt deklarative Schemas für State und Academy-Daten.
 *
 * Hinweis:
 * - Dies ist KEIN vollständiger JSON-Schema Validator.
 * - Unterstützt: type, required, properties, items, min/max (number),
 *   minLength/maxLength (string), minItems/maxItems (array), enum, nullable.
 */

// -------------------------
// Schemas (Phase 1 + 2)
// -------------------------

// State-Schema (STRICT)
//
// Ziel (Phase-7-Readiness):
// - Import darf keine unbekannten Keys akzeptieren.
// - Falsche Typen müssen hart abgelehnt werden.
// - Schema ist bewusst "whitelist-based".
//
// Hinweise:
// - Für flexiblere Subtrees (z.B. actors.pcs / examResults) erlauben wir dynamische Keys
//   via additionalProperties: { ... }.
// - Meta-Timestamps: ältere Exporte können null enthalten -> nullable.
const SCORE_VALUE_SCHEMA = {
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

const SCORING_ROOT_SCHEMA = {
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

const STATE_SCHEMA = {
  type: 'object',
  required: ['time', 'meta', 'academy', 'actors', 'scoring', 'display'],
  additionalProperties: false,
  properties: {
    meta: {
      type: 'object',
      required: ['version', 'schemaVersion', 'createdAt', 'updatedAt'],
      // Meta ist absichtlich erweiterbar (z.B. roundtripTest, buildInfo, provenance).
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
        // Feature-Toggles (Roadmap-Flags)
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
        // Legacy field used by some exports/UI. It mirrors the effective mood.
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

        // Foundry calendar sync (lenient legacy fields)
        worldTime: { type: 'number', nullable: true },
        world: { type: 'object', nullable: true, additionalProperties: true },

        // Legacy-Compat (einige Engines nutzen diese Aliase)
        phase: { type: 'string', nullable: true }
      }
    },
    academy: {
      type: 'object',
      required: ['examResults'],
      // Extensible: social, quests, and future subtrees are added by phases.
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
          // Legacy quest alias; canonical SSOT lives at root questStates.
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

// Academy: Lessons
const ACADEMY_LESSONS_SCHEMA = {
  type: 'object',
  required: ['meta', 'lessons'],
  properties: {
    meta: { type: 'object' },
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'subject'],
        properties: {
          id: { type: 'string', minLength: 3 },
          name: { type: 'string', minLength: 1 },
          subject: { type: 'string', minLength: 1 },
          yearRange: { type: 'array', items: { type: 'number', min: 1 }, nullable: true },
          summary: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          teacherNpcId: { type: 'string', nullable: true },
          durationSlots: { type: 'number', min: 1, nullable: true },
          mechanics: { type: 'object', nullable: true },
          scoringImpact: { type: 'object', nullable: true },
          references: { type: 'object', nullable: true }
        }
      }
    }
  }
};

// Academy: Exam Questions (MC / Sets)
const ACADEMY_EXAM_QUESTIONS_SCHEMA = {
  type: 'object',
  required: ['meta', 'questionSets'],
  properties: {
    meta: { type: 'object' },
    questionSets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'questions'],
        properties: {
          id: { type: 'string', minLength: 3 },
          examId: { type: 'string', nullable: true },
          title: { type: 'string', nullable: true },
          displayMode: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'text', 'answers'],
              properties: {
                id: { type: 'string', minLength: 2 },
                text: { type: 'string', minLength: 1 },
                multiSelect: { type: 'boolean', nullable: true },
                difficulty: { type: 'number', nullable: true },
                topics: { type: 'array', items: { type: 'string' }, nullable: true },
                relatedSkillId: { type: 'string', nullable: true },
                answers: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['id', 'text', 'isCorrect'],
                    properties: {
                      id: { type: 'string' },
                      text: { type: 'string' },
                      isCorrect: { type: 'boolean' },
                      points: { type: 'number', min: 0, nullable: true }
                    }
                  }
                },
                explanation: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  }
};

// Academy: Calendar
const ACADEMY_CALENDAR_SCHEMA = {
  type: 'object',
  required: ['meta', 'entries'],
  properties: {
    meta: { type: 'object' },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'year', 'trimester', 'week', 'day', 'phase', 'type'],
        properties: {
          id: { type: 'string' },
          year: { type: 'number', min: 1 },
          trimester: { type: 'number', min: 1 },
          week: { type: 'number', min: 1 },
          day: { type: 'string' },
          phase: { type: 'string' },
          type: { type: 'string' },
          lessonId: { type: 'string', nullable: true },
          examId: { type: 'string', nullable: true },
          eventId: { type: 'string', nullable: true },
          holidayKey: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true }
        }
      }
    }
  }
};

// Academy: Exams
const ACADEMY_EXAMS_SCHEMA = {
  type: 'object',
  required: ['meta', 'exams'],
  properties: {
    meta: { type: 'object' },
    exams: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          summary: { type: 'string', nullable: true },
          lessonIds: { type: 'array', items: { type: 'string' }, nullable: true },
          mechanics: { type: 'object', nullable: true },
          gradingScheme: { type: 'object', nullable: true },
          interaction: { type: 'object', nullable: true },
          references: { type: 'object', nullable: true }
        }
      }
    }
  }
};

// Academy: NPCs (extended knowledge)
const ACADEMY_NPCS_SCHEMA = {
  type: 'object',
  required: ['meta', 'npcs'],
  properties: {
    meta: { type: 'object' },
    npcs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'role', 'tags', 'foundry'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          house: { type: 'string', nullable: true },
          year: { type: 'number', nullable: true },
          relations: { type: 'array', items: { type: 'object' }, nullable: true },
          foundry: {
            type: 'object',
            required: ['actorKey', 'actorUuid'],
            properties: {
              actorKey: { type: 'string', nullable: true },
              actorUuid: { type: 'string', nullable: true }
            }
          },
          profile: {
            type: 'object',
            nullable: true,
            properties: {
              subtitle: { type: 'string', nullable: true },
              roleText: { type: 'string', nullable: true },
              titles: { type: 'string', nullable: true },
              born: { type: 'string', nullable: true },
              age: { type: 'string', nullable: true },
              species: { type: 'string', nullable: true },
              origin: { type: 'string', nullable: true },
              size: { type: 'string', nullable: true },
              preamble: { type: 'string', nullable: true },
              sections: { type: 'object', nullable: true }
            }
          },
          source: { type: 'object', nullable: true }
        }
      }
    }
  }
};

// Academy: Locations (extended knowledge)
const ACADEMY_LOCATIONS_SCHEMA = {
  type: 'object',
  required: ['meta', 'locations'],
  properties: {
    meta: { type: 'object' },
    locations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'type', 'tags', 'foundry'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          defaultMoodKey: { type: 'string', nullable: true },
          foundry: {
            type: 'object',
            required: ['sceneKey', 'sceneUuid'],
            properties: {
              sceneKey: { type: 'string', nullable: true },
              sceneUuid: { type: 'string', nullable: true }
            }
          },
          profile: {
            type: 'object',
            nullable: true,
            properties: {
              size: { type: 'string', nullable: true },
              light: { type: 'string', nullable: true },
              preamble: { type: 'string', nullable: true },
              sections: { type: 'object', nullable: true },
              assetsYaml: { type: 'array', items: { type: 'string' }, nullable: true }
            }
          },
          source: { type: 'object', nullable: true }
        }
      }
    }
  }
};

// Academy: Library
const ACADEMY_LIBRARY_SCHEMA = {
  type: 'object',
  required: ['meta', 'items'],
  properties: {
    meta: { type: 'object' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'type'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          summary: { type: 'string', nullable: true },
          knowledgeHooks: { type: 'array', items: { type: 'object' }, nullable: true },
          foundry: {
            type: 'object',
            nullable: true,
            properties: {
              journalKey: { type: 'string', nullable: true },
              journalUuid: { type: 'string', nullable: true }
            }
          }
        }
      }
    }
  }
};

// Academy: Events
const ACADEMY_EVENTS_SCHEMA = {
  type: 'object',
  required: ['meta', 'events'],
  properties: {
    meta: { type: 'object' },
    events: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'type'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          summary: { type: 'string', nullable: true },
          locationId: { type: 'string', nullable: true },
          relatedStoryThreads: { type: 'array', items: { type: 'string' }, nullable: true },
          calendarRefs: { type: 'array', items: { type: 'object' }, nullable: true }
        }
      }
    }
  }
};


// Academy: Spell Curriculum (Zauber-Lehrplan)
const ACADEMY_SPELL_CURRICULUM_SCHEMA = {
  type: 'object',
  required: ['meta', 'modules'],
  properties: {
    meta: { type: 'object' },
    tree: { type: 'array', items: { type: 'object' }, nullable: true },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'entries', 'spells'],
        properties: {
          id: { type: 'string', minLength: 3 },
          title: { type: 'string', minLength: 1 },
          path: { type: 'array', items: { type: 'string' }, nullable: true },
          notes: { type: 'string', nullable: true },
          entries: {
            type: 'array',
            items: {
              type: 'object',
              required: ['kind'],
              properties: {
                kind: { type: 'string', enum: ['spell', 'note', 'table'] },
                text: { type: 'string', nullable: true },
                spell: { type: 'object', nullable: true },
                table: { type: 'object', nullable: true }
              }
            }
          },
          spells: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'raw'],
              properties: {
                name: { type: 'string', minLength: 1 },
                details: { type: 'string', nullable: true },
                source: { type: 'string', nullable: true },
                note: { type: 'string', nullable: true },
                raw: { type: 'string', minLength: 1 }
              }
            }
          }
        }
      }
    }
  }
};


// Academy: Alchemy Recipes (Unterricht)
const ACADEMY_ALCHEMY_RECIPES_SCHEMA = {
  type: 'object',
  required: ['meta', 'recipes'],
  properties: {
    meta: { type: 'object' },
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'ingredients', 'qualityLevels', 'tags', 'foundry'],
        properties: {
          id: { type: 'string', minLength: 5 },
          name: { type: 'string', minLength: 1 },
          difficulty: { type: 'number', nullable: true },
          lab: { type: 'string', nullable: true },
          time: { type: 'string', nullable: true },
          costPerLevel: { type: 'string', nullable: true },
          cost: { type: 'string', nullable: true },
          apValue: { type: 'string', nullable: true },
          prerequisite: { type: 'string', nullable: true },
          ingredients: { type: 'array', items: { type: 'string' } },
          qualityLevels: {
            type: 'array',
            items: {
              type: 'object',
              required: ['key', 'effect'],
              properties: {
                qs: { type: 'number', nullable: true },
                key: { type: 'string' },
                effect: { type: 'string' }
              }
            }
          },
          effect: { type: 'string', nullable: true },
          failure: { type: 'string', nullable: true },
          teachingHint: { type: 'string', nullable: true },
          shelfLife: { type: 'string', nullable: true },
          range: { type: 'string', nullable: true },
          duration: { type: 'string', nullable: true },
          tags: { type: 'array', items: { type: 'string' } },
          path: { type: 'array', items: { type: 'string' }, nullable: true },
          foundry: {
            type: 'object',
            required: ['itemKey', 'itemUuid'],
            properties: {
              itemKey: { type: 'string', nullable: true },
              itemUuid: { type: 'string', nullable: true }
            }
          },
          raw: { type: 'object', nullable: true }
        }
      }
    }
  }
};


// Academy: Lesson Generator (Templates)
const ACADEMY_LESSON_GENERATOR_SCHEMA = {
  type: 'object',
  required: ['meta', 'templates'],
  properties: {
    meta: { type: 'object' },
    overview: { type: 'object', nullable: true },
    workflow: { type: 'array', items: { type: 'object' }, nullable: true },
    ruleProgressionTable: { type: 'object', nullable: true },
    templates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'subject', 'segments', 'handouts'],
        properties: {
          id: { type: 'string', minLength: 5 },
          subject: { type: 'string', minLength: 2 },
          teacherHint: { type: 'string', nullable: true },
          topicPlaceholder: { type: 'string', nullable: true },
          segments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', minLength: 1 },
                minutes: { type: 'number', nullable: true },
                text: { type: 'string', nullable: true },
                bullets: { type: 'array', items: { type: 'string' }, nullable: true }
              }
            }
          },
          handouts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', minLength: 1 },
                minutes: { type: 'number', nullable: true },
                text: { type: 'string', nullable: true },
                bullets: { type: 'array', items: { type: 'string' }, nullable: true }
              }
            }
          },
          notes: { type: 'string', nullable: true }
        }
      }
    },
    rawTree: { type: 'array', items: { type: 'object' }, nullable: true }
  }
};


// Academy: Calendar Template (Schedule Definitions)
const ACADEMY_CALENDAR_TEMPLATE_SCHEMA = {
  type: 'object',
  required: ['meta', 'plans', 'timeSlots'],
  properties: {
    meta: { type: 'object' },
    timeSlots: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'start', 'end', 'label'],
        properties: {
          id: { type: 'string', minLength: 5 },
          start: { type: 'string', minLength: 4 },
          end: { type: 'string', minLength: 4 },
          label: { type: 'string', minLength: 3 }
        }
      }
    },
    plans: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'days'],
        properties: {
          id: { type: 'string', minLength: 5 },
          name: { type: 'string', minLength: 3 },
          track: { type: 'string', nullable: true },
          semesters: { type: 'array', items: { type: 'number' }, nullable: true },
          days: { type: 'object', nullable: true },
          rawTables: { type: 'array', items: { type: 'object' }, nullable: true },
          source: { type: 'object', nullable: true }
        }
      }
    }
  }
};


// Academy: Teaching Sessions (Derived from schedules)
const ACADEMY_TEACHING_SESSIONS_SCHEMA = {
  type: 'object',
  required: ['meta', 'sessions'],
  properties: {
    meta: { type: 'object' },
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'planId', 'day', 'subject', 'type'],
        properties: {
          id: { type: 'string', minLength: 6 },
          planId: { type: 'string', minLength: 5 },
          day: { type: 'string', minLength: 3 },
          slotId: { type: 'string', nullable: true },
          start: { type: 'string', nullable: true },
          end: { type: 'string', nullable: true },
          subject: { type: 'string', minLength: 1 },
          subjectKey: { type: 'string', nullable: true },
          teacher: { type: 'string', nullable: true },
          room: { type: 'string', nullable: true },
          type: { type: 'string', minLength: 3 },
          notes: { type: 'string', nullable: true },
          templateIds: { type: 'array', items: { type: 'string' }, nullable: true },
          npcIdCandidates: { type: 'array', items: { type: 'object' }, nullable: true },
          locationIdCandidates: { type: 'array', items: { type: 'object' }, nullable: true },
          source: { type: 'object', nullable: true }
        }
      }
    },
    index: { type: 'object', nullable: true }
  }
};



// Academy: Circles
const ACADEMY_CIRCLES_SCHEMA = {
  type: 'object',
  required: ['circles'],
  properties: {
    version: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    meta: { type: 'object', nullable: true },
    circles: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', minLength: 2 },
          name: { type: 'string', minLength: 1 },
          shortName: { type: 'string', nullable: true },
          locationId: { type: 'string', nullable: true },
          element: { type: 'string', nullable: true },
          traits: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'object', additionalProperties: true }], nullable: true }
        }
      }
    }
  }
};

const ACADEMY_COLLECTIONS_SCHEMA = {
  type: 'object',
  required: ['meta', 'collections'],
  properties: {
    meta: { type: 'object' },
    collections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'items'],
        properties: {
          id: { type: 'string', minLength: 2 },
          name: { type: 'string', minLength: 1 },
          items: { type: 'array', items: { type: 'object' } },
          completionReward: { type: 'object', nullable: true }
        }
      }
    }
  }
};

const ACADEMY_SUBJECTS_SCHEMA = {
  type: 'object',
  required: ['subjects'],
  properties: {
    version: { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    meta: { type: 'object', nullable: true },
    categories: { type: 'object', nullable: true, additionalProperties: true },
    subjects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'category'],
        properties: {
          id: { type: 'string', minLength: 2 },
          name: { type: 'string', minLength: 1 },
          category: { type: 'string', minLength: 1 },
          shortName: { type: 'string', nullable: true },
          primaryAttribute: { type: 'string', nullable: true }
        }
      }
    }
  }
};

const ACADEMY_SOCIAL_LINKS_SCHEMA = {
  type: 'object',
  required: ['meta', 'socialLinks'],
  properties: {
    meta: { type: 'object' },
    socialLinks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'npcId', 'ranks'],
        properties: {
          id: { type: 'string', minLength: 2 },
          npcId: { type: 'string', minLength: 1 },
          maxRank: { type: 'number', nullable: true },
          ranks: { type: 'array', minItems: 1, items: { type: 'object' } }
        }
      }
    }
  }
};

const ACADEMY_SCHOOL_STATS_SCHEMA = {
  type: 'object',
  required: ['meta', 'stats'],
  properties: {
    meta: { type: 'object' },
    stats: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'min', 'max'],
        properties: {
          id: { type: 'string', minLength: 2 },
          label: { type: 'string', minLength: 1 },
          min: { type: 'number' },
          max: { type: 'number' },
          default: { type: 'number', nullable: true }
        }
      }
    }
  }
};

const ACADEMY_MILESTONES_SCHEMA = {
  type: 'object',
  required: ['meta', 'milestones'],
  properties: {
    meta: { type: 'object' },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'outcomes'],
        properties: {
          id: { type: 'string', minLength: 2 },
          name: { type: 'string', minLength: 1 },
          evaluationExpr: { type: 'string', nullable: true },
          outcomes: { type: 'array', minItems: 1, items: { type: 'object' } }
        }
      }
    }
  }
};

const ACADEMY_AP_AWARDS_SCHEMA = {
  type: 'object',
  required: ['version', 'examOutcomes', 'attendanceXpPerSlot', 'attendanceXpMax'],
  properties: {
    version: { type: 'string', minLength: 1 },
    description: { type: 'string', nullable: true },
    notes: { type: 'array', items: { type: 'string' }, nullable: true },
    examOutcomes: { type: 'object', additionalProperties: { type: 'object' } },
    attendanceXpPerSlot: { type: 'number', min: 0 },
    attendanceXpMax: { type: 'number', min: 0 }
  }
};

// -------------------------
// Validator
// -------------------------

/**
 * JanusValidator
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
export class JanusValidator {
  /**
   * @param {logger?: any} [options]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
    /** @type {Map<string, any>} */
    this._schemas = new Map();

    // Phase 1
    this.registerSchema('state', STATE_SCHEMA);

    // Phase 2
    this.registerSchema('academy.calendar', ACADEMY_CALENDAR_SCHEMA);
    this.registerSchema('academy.lessons', ACADEMY_LESSONS_SCHEMA);
    this.registerSchema('academy.exams', ACADEMY_EXAMS_SCHEMA);
    this.registerSchema('academy.examQuestions', ACADEMY_EXAM_QUESTIONS_SCHEMA);
    this.registerSchema('academy.npcs', ACADEMY_NPCS_SCHEMA);
    this.registerSchema('academy.locations', ACADEMY_LOCATIONS_SCHEMA);
    this.registerSchema('academy.library', ACADEMY_LIBRARY_SCHEMA);
    this.registerSchema('academy.events', ACADEMY_EVENTS_SCHEMA);
    this.registerSchema('academy.spellCurriculum', ACADEMY_SPELL_CURRICULUM_SCHEMA);
    this.registerSchema('academy.alchemyRecipes', ACADEMY_ALCHEMY_RECIPES_SCHEMA);
    this.registerSchema('academy.lessonGenerator', ACADEMY_LESSON_GENERATOR_SCHEMA);
    this.registerSchema('academy.calendarTemplate', ACADEMY_CALENDAR_TEMPLATE_SCHEMA);
    this.registerSchema('academy.teachingSessions', ACADEMY_TEACHING_SESSIONS_SCHEMA);
    this.registerSchema('academy.circles', ACADEMY_CIRCLES_SCHEMA);
    this.registerSchema('academy.collections', ACADEMY_COLLECTIONS_SCHEMA);
    this.registerSchema('academy.subjects', ACADEMY_SUBJECTS_SCHEMA);
    this.registerSchema('academy.socialLinks', ACADEMY_SOCIAL_LINKS_SCHEMA);
    this.registerSchema('academy.schoolStats', ACADEMY_SCHOOL_STATS_SCHEMA);
    this.registerSchema('academy.milestones', ACADEMY_MILESTONES_SCHEMA);
    this.registerSchema('academy.apAwards', ACADEMY_AP_AWARDS_SCHEMA);
  }

  /**
   * @param {string} key
   * @param {any} schema
   */
  registerSchema(key, schema) {
    this._schemas.set(key, schema);
  }

  /**
   * @param {string} key
   * @param {any} data
   * @returns { {valid: boolean, errors: string[]} }
   */
  validate(key, data) {
    const schema = this._schemas.get(key);
    if (!schema) {
      return { valid: true, errors: [] };
    }

    const errors = [];
    this._validateAgainstSchema(schema, data, 'root', errors);

    if (errors.length && this.logger?.warn) {
      this.logger.warn(`Validation for ${key} failed:`, errors);
    }

    return { valid: errors.length === 0, errors };
  }

  
  /**
   * Assert that data matches a provided schema object.
   * This is a compatibility helper for older callers which pass an inline schema.
   *
   * @param {any} data
   * @param {any} schema
   * @param {string} [label]
   * @returns {true}
   */
  assertSchema(data, schema, label = 'schema') {
    const errors = [];
    this._validateAgainstSchema(schema, data, 'root', errors);
    if (errors.length) {
      const msg = `Validation for ${label} failed: ${errors.join(' | ')}`;
      if (this.logger?.warn) this.logger.warn(msg);
      throw new Error(msg);
    }
    return true;
  }

  /**
   * Validate data against an inline schema object without throwing.
   * @param {any} data
   * @param {any} schema
   * @param {string} [label]
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateSchema(data, schema, label = 'schema') {
    const errors = [];
    this._validateAgainstSchema(schema, data, 'root', errors);
    if (errors.length && this.logger?.warn) this.logger.warn(`Validation for ${label} failed:`, errors);
    return { valid: errors.length === 0, errors };
  }

// --- Convenience ---
  validateState(json) { return this.validate('state', json); }
  validateAcademyCalendar(json) { return this.validate('academy.calendar', json); }
  validateAcademyLessons(json) { return this.validate('academy.lessons', json); }
  validateAcademyExams(json) { return this.validate('academy.exams', json); }
  validateExamQuestions(json) { return this.validate('academy.examQuestions', json); }
  validateAcademyNPCs(json) { return this.validate('academy.npcs', json); }
  validateAcademyLocations(json) { return this.validate('academy.locations', json); }
  validateAcademyLibrary(json) { return this.validate('academy.library', json); }
  validateAcademyEvents(json) { return this.validate('academy.events', json); }
  validateAcademySpellCurriculum(json) { return this.validate('academy.spellCurriculum', json); }
  validateAcademyAlchemyRecipes(json) { return this.validate('academy.alchemyRecipes', json); }
  validateAcademyLessonGenerator(json) { return this.validate('academy.lessonGenerator', json); }
  validateAcademyCalendarTemplate(json) { return this.validate('academy.calendarTemplate', json); }
  validateAcademyTeachingSessions(json) { return this.validate('academy.teachingSessions', json); }
  validateAcademyCircles(json) { return this.validate('academy.circles', json); }
  validateAcademyCollections(json) { return this.validate('academy.collections', json); }
  validateAcademySubjects(json) { return this.validate('academy.subjects', json); }
  validateAcademySocialLinks(json) { return this.validate('academy.socialLinks', json); }
  validateAcademySchoolStats(json) { return this.validate('academy.schoolStats', json); }
  validateAcademyMilestones(json) { return this.validate('academy.milestones', json); }
  validateAcademyApAwards(json) { return this.validate('academy.apAwards', json); }

  validateAcademyReferenceIntegrity(datasets = {}, { strict = false } = {}) {
    const errors = [];
    const warnings = [];
    const lessons = Array.isArray(datasets?.lessons?.lessons) ? datasets.lessons.lessons : [];
    const exams = Array.isArray(datasets?.exams?.exams) ? datasets.exams.exams : [];
    const examQuestionSets = Array.isArray(datasets?.examQuestions?.questionSets) ? datasets.examQuestions.questionSets : [];
    const npcs = Array.isArray(datasets?.npcs?.npcs) ? datasets.npcs.npcs : [];
    const locations = Array.isArray(datasets?.locations?.locations) ? datasets.locations.locations : [];
    const libraryItems = Array.isArray(datasets?.library?.items) ? datasets.library.items : [];
    const events = Array.isArray(datasets?.events?.events) ? datasets.events.events : [];
    const circles = Array.isArray(datasets?.circles?.circles) ? datasets.circles.circles : [];
    const teachingSessions = Array.isArray(datasets?.teachingSessions?.sessions) ? datasets.teachingSessions.sessions : [];
    const socialLinks = Array.isArray(datasets?.socialLinks?.socialLinks) ? datasets.socialLinks.socialLinks : [];
    const collections = Array.isArray(datasets?.collections?.collections) ? datasets.collections.collections : [];
    const questionIds = new Set(examQuestionSets.map((row) => row?.id).filter(Boolean));
    const lessonIds = new Set(lessons.map((row) => row?.id).filter(Boolean));
    const npcIds = new Set(npcs.map((row) => row?.id).filter(Boolean));
    const locationIds = new Set(locations.map((row) => row?.id).filter(Boolean));
    const libraryIds = new Set(libraryItems.map((row) => row?.id).filter(Boolean));
    const eventIds = new Set(events.map((row) => row?.id).filter(Boolean));
    const circleIds = new Set(circles.map((row) => row?.id).filter(Boolean));
    const emit = (bucket, domain, owner, field, ref, details = '') => bucket.push(`${domain} ${owner}: Referenz ${field}=${ref} wurde nicht gefunden${details ? ` (${details})` : ''}.`);
    const npcVariants = (raw) => {
      const id = String(raw ?? '').trim();
      const tail = id.replace(/^npc_/i, '').replace(/^NPC_/i, '').toUpperCase();
      return [id.toUpperCase(), `NPC_${tail}`, `npc_${tail.toLowerCase()}`];
    };
    const check = (set, ref, variants = []) => set.has(ref) || variants.some((candidate) => set.has(candidate));

    for (const lesson of lessons) {
      if (lesson?.teacherNpcId && !check(npcIds, lesson.teacherNpcId, npcVariants(lesson.teacherNpcId))) emit(warnings, 'lesson', lesson?.id ?? '<lesson>', 'teacherNpcId', lesson.teacherNpcId, 'kein NPC mit passender ID im Datensatz');
      for (const libraryItemId of (lesson?.references?.libraryItemIds ?? [])) if (libraryItemId && !libraryIds.has(libraryItemId)) emit(warnings, 'lesson', lesson?.id ?? '<lesson>', 'references.libraryItemIds', libraryItemId, 'kein Bibliothekseintrag vorhanden');
    }
    for (const exam of exams) {
      for (const lessonId of (exam?.lessonIds ?? [])) if (lessonId && !lessonIds.has(lessonId)) emit(warnings, 'exam', exam?.id ?? '<exam>', 'lessonIds', lessonId);
      const qid = exam?.interaction?.questionSetId;
      if (qid && !questionIds.has(qid)) emit(warnings, 'exam', exam?.id ?? '<exam>', 'interaction.questionSetId', qid);
    }
    for (const circle of circles) if (circle?.locationId && !locationIds.has(circle.locationId)) emit(warnings, 'circle', circle?.id ?? '<circle>', 'locationId', circle.locationId);
    for (const row of collections) {
      for (const item of (row?.items ?? [])) if (item?.locationId && !locationIds.has(item.locationId)) emit(warnings, 'collection', row?.id ?? '<collection>', 'items.locationId', item.locationId);
      for (const circleId of (row?.completionReward?.circleIds ?? [])) if (circleId && !circleIds.has(circleId)) emit(warnings, 'collection', row?.id ?? '<collection>', 'completionReward.circleIds', circleId);
    }
    for (const row of socialLinks) {
      if (row?.npcId && !check(npcIds, row.npcId, npcVariants(row.npcId))) emit(errors, 'socialLink', row?.id ?? '<socialLink>', 'npcId', row.npcId);
      for (const rank of (row?.ranks ?? [])) if (rank?.eventTriggerId && !eventIds.has(rank.eventTriggerId)) emit(warnings, 'socialLink', row?.id ?? '<socialLink>', 'ranks.eventTriggerId', rank.eventTriggerId);
    }
    for (const row of teachingSessions) {
      for (const candidate of (row?.npcIdCandidates ?? [])) if (candidate?.npcId && !check(npcIds, candidate.npcId, npcVariants(candidate.npcId))) emit(warnings, 'teachingSession', row?.id ?? '<session>', 'npcIdCandidates.npcId', candidate.npcId);
      for (const candidate of (row?.locationIdCandidates ?? [])) if (candidate?.locationId && !locationIds.has(candidate.locationId)) emit(warnings, 'teachingSession', row?.id ?? '<session>', 'locationIdCandidates.locationId', candidate.locationId);
    }
    if (strict && warnings.length) errors.push(...warnings);
    return { valid: errors.length === 0, errors, warnings };
  }

  // --- interne Rekursion ---
  _validateAgainstSchema(schema, value, path, errors) {

    // Explicit null is only allowed when the schema opts in.
    // ("missing" is represented by `undefined`, which we simply don't validate if optional.)
    if (value === null) {
      if (schema?.nullable) return;
      errors.push(`${path} darf nicht null sein.`);
      return;
    }
    
    // Union types: allow multiple alternative schemas (first match wins)
    if (schema && Array.isArray(schema.anyOf)) {
      const variantErrors = [];
      for (const variant of schema.anyOf) {
        const tmp = [];
        this._validateAgainstSchema(variant, value, path, tmp);
        if (tmp.length === 0) return; // valid for this variant
        variantErrors.push(tmp);
      }
      // None matched -> surface a compact error (first errors of each variant)
      const examples = variantErrors.map(v => v[0]).filter(Boolean);
      errors.push(examples.length ? examples.join(" ODER ") : `${path} hat ein ungültiges Format.`);
      return;
    }

    // Support type arrays (e.g. {type: ['string','number']}) – try each variant
    if (Array.isArray(schema.type)) {
      const anyMatch = schema.type.some((t) => {
        const tmp = [];
        this._validateAgainstSchema({ ...schema, type: t }, value, path, tmp);
        return tmp.length === 0;
      });
      if (!anyMatch) {
        errors.push(`${path} muss vom Typ ${schema.type.join(' oder ')} sein.`);
      }
      return;
    }

    switch (schema.type) {
      case 'object': {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${path} muss ein Objekt sein.`);
          return;
        }
        if (schema.required) {
          for (const key of schema.required) {
            const hasKey = (key in value) && value[key] !== undefined;
            if (!hasKey) {
              errors.push(`${path}.${key} ist erforderlich.`);
              continue;
            }
            // Required implies "not null" unless the property is explicitly nullable.
            if (value[key] === null) {
              const propSchema = schema.properties?.[key];
              const nullable = !!propSchema?.nullable;
              if (!nullable) errors.push(`${path}.${key} darf nicht null sein.`);
            }
          }
        }
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in value) {
              this._validateAgainstSchema(propSchema, value[key], `${path}.${key}`, errors);
            }
          }
        }

        // additionalProperties support (whitelist / dynamic maps)
        // - false: reject unknown keys
        // - true: allow any unknown keys (no validation)
        // - schema object: validate all unknown keys against this schema
        if (schema.additionalProperties === false) {
          const allowed = new Set(Object.keys(schema.properties ?? {}));
          for (const k of Object.keys(value)) {
            if (!allowed.has(k)) errors.push(`${path}.${k} ist nicht erlaubt (unknown key).`);
          }
        } else if (schema.additionalProperties === true) {
          // Explicitly allow any additional properties without validation
          // (used for extensible objects like meta, where unknown keys are OK)
        } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          const allowed = new Set(Object.keys(schema.properties ?? {}));
          for (const k of Object.keys(value)) {
            if (allowed.has(k)) continue;
            this._validateAgainstSchema(schema.additionalProperties, value[k], `${path}.${k}`, errors);
          }
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(value)) {
          errors.push(`${path} muss ein Array sein.`);
          return;
        }
        if (schema.minItems != null && value.length < schema.minItems) {
          errors.push(`${path} muss mindestens ${schema.minItems} Elemente haben.`);
        }
        if (schema.maxItems != null && value.length > schema.maxItems) {
          errors.push(`${path} darf höchstens ${schema.maxItems} Elemente haben.`);
        }
        if (schema.items) {
          value.forEach((item, idx) => {
            this._validateAgainstSchema(schema.items, item, `${path}[${idx}]`, errors);
          });
        }
        break;
      }
      case 'string': {
        if (typeof value !== 'string') {
          errors.push(`${path} muss ein String sein.`);
          return;
        }
        if (schema.const !== undefined && value !== schema.const) {
          errors.push(`${path} muss exakt "${schema.const}" sein.`);
          return;
        }
        const minLen = schema.minLength;
        if (minLen != null && value.length < minLen) {
          errors.push(`${path} muss mindestens ${minLen} Zeichen lang sein.`);
        }
        if (schema.maxLength != null && value.length > schema.maxLength) {
          errors.push(`${path} darf höchstens ${schema.maxLength} Zeichen lang sein.`);
        }
        if (schema.enum && !schema.enum.includes(value)) {
          errors.push(`${path} muss einer der Werte sein: ${schema.enum.join(', ')}`);
        }
        break;
      }
      case 'number': {
        if (typeof value !== 'number') {
          errors.push(`${path} muss eine Zahl sein.`);
          return;
        }
        if (schema.const !== undefined && value !== schema.const) {
          errors.push(`${path} muss exakt ${schema.const} sein.`);
          return;
        }
        if (schema.min != null && value < schema.min) {
          errors.push(`${path} muss >= ${schema.min} sein.`);
        }
        if (schema.max != null && value > schema.max) {
          errors.push(`${path} muss <= ${schema.max} sein.`);
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push(`${path} muss ein Boolean sein.`);
          break;
        }
        if (schema.const !== undefined && value !== schema.const) {
          errors.push(`${path} muss exakt ${schema.const} sein.`);
        }
        break;
      }
      default:
        break;
    }
  }
}