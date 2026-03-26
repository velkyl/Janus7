/**
 * @file core/validator/schemas-academy.js
 * @module janus7
 * @phase 2
 *
 * Academy-Schema-Definitionen für alle JANUS7 Academy-Datensätze.
 * Ausgelagert aus core/validator.js (war: 1291 Zeilen God-Object).
 *
 * Importiert von: core/validator/index.js
 */

// ─── Academy: Lessons ─────────────────────────────────────────────────────────

export const ACADEMY_LESSONS_SCHEMA = {
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

// ─── Academy: Exam Questions ──────────────────────────────────────────────────

export const ACADEMY_EXAM_QUESTIONS_SCHEMA = {
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

// ─── Academy: Calendar ────────────────────────────────────────────────────────

export const ACADEMY_CALENDAR_SCHEMA = {
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

// ─── Academy: Exams ───────────────────────────────────────────────────────────

export const ACADEMY_EXAMS_SCHEMA = {
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

// ─── Academy: NPCs ────────────────────────────────────────────────────────────

export const ACADEMY_NPCS_SCHEMA = {
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

// ─── Academy: Locations ───────────────────────────────────────────────────────

export const ACADEMY_LOCATIONS_SCHEMA = {
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

// ─── Academy: Library ─────────────────────────────────────────────────────────

export const ACADEMY_LIBRARY_SCHEMA = {
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

// ─── Academy: Events ──────────────────────────────────────────────────────────

export const ACADEMY_EVENTS_SCHEMA = {
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

// ─── Academy: Spell Curriculum ────────────────────────────────────────────────

export const ACADEMY_SPELL_CURRICULUM_SCHEMA = {
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

// ─── Academy: Alchemy Recipes ─────────────────────────────────────────────────

export const ACADEMY_ALCHEMY_RECIPES_SCHEMA = {
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

// ─── Academy: Lesson Generator ────────────────────────────────────────────────

export const ACADEMY_LESSON_GENERATOR_SCHEMA = {
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

// ─── Academy: Calendar Template ───────────────────────────────────────────────

export const ACADEMY_CALENDAR_TEMPLATE_SCHEMA = {
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

// ─── Academy: Teaching Sessions ───────────────────────────────────────────────

export const ACADEMY_TEACHING_SESSIONS_SCHEMA = {
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

// ─── Academy: Circles ─────────────────────────────────────────────────────────

export const ACADEMY_CIRCLES_SCHEMA = {
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

// ─── Academy: Collections ─────────────────────────────────────────────────────

export const ACADEMY_COLLECTIONS_SCHEMA = {
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

// ─── Academy: Subjects ────────────────────────────────────────────────────────

export const ACADEMY_SUBJECTS_SCHEMA = {
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

// ─── Academy: Social Links ────────────────────────────────────────────────────

export const ACADEMY_SOCIAL_LINKS_SCHEMA = {
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

// ─── Academy: School Stats ────────────────────────────────────────────────────

export const ACADEMY_SCHOOL_STATS_SCHEMA = {
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

// ─── Academy: Milestones ──────────────────────────────────────────────────────

export const ACADEMY_MILESTONES_SCHEMA = {
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

// ─── Academy: AP Awards ───────────────────────────────────────────────────────

export const ACADEMY_AP_AWARDS_SCHEMA = {
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
