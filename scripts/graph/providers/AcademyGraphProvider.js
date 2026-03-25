import { GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES, GRAPH_SOURCES } from '../constants.js';

/**
 * Provider that extracts node and edge data from the static academy
 * definitions.  Uses the academy data API to list NPCs, lessons and
 * locations and constructs nodes for each.  Creates TEACHES edges
 * linking NPCs to lessons when a lesson has a defined teacherNpcId.
 */
export class AcademyGraphProvider {
  /**
   * @param {{ academyData: any, logger?: any }} opts
   */
  constructor({ academyData, logger } = {}) {
    this.academyData = academyData;
    this.logger = logger;
  }

  getName() {
    return 'AcademyGraphProvider';
  }

  /**
   * Collects nodes and edges from the academy data.  Missing data
   * gracefully results in empty arrays.  The provider attempts to
   * call getX() methods on the data API but falls back to listX()
   * conventions if those are defined.
   *
   * @returns {Promise<import('../types.js').GraphContribution>}
   */
  async collect() {
    const nodes = [];
    const edges = [];
    const data = this.academyData;
    if (!data) return { nodes, edges };

    // Helper to coerce arrays or fallback to empty
    const toArray = (val) => Array.isArray(val) ? val : [];

    // List NPCs
    let npcs = [];
    try {
      npcs = toArray(data.getNpcs?.() ?? data.listNpcs?.() ?? []);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] AcademyGraphProvider: getNpcs failed', { message: err?.message });
    }
    for (const npc of npcs) {
      if (!npc || !npc.id) continue;
      nodes.push({
        id: npc.id,
        type: GRAPH_NODE_TYPES.NPC,
        label: npc.name ?? npc.id,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {
          rank: npc.rank ?? npc.role ?? null,
          tags: npc.tags ?? []
        }
      });
    }

    // List lessons
    let lessons = [];
    try {
      lessons = toArray(data.getLessons?.() ?? data.listLessons?.() ?? []);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] AcademyGraphProvider: getLessons failed', { message: err?.message });
    }
    for (const lesson of lessons) {
      if (!lesson || !lesson.id) continue;
      nodes.push({
        id: lesson.id,
        type: GRAPH_NODE_TYPES.LESSON,
        label: lesson.name ?? lesson.id,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {
          subjectId: lesson.subject ?? null,
          teacherId: lesson.teacherNpcId ?? null,
          tags: lesson.tags ?? []
        }
      });
      if (lesson.teacherNpcId) {
        edges.push({
          from: lesson.teacherNpcId,
          to: lesson.id,
          type: GRAPH_EDGE_TYPES.TEACHES,
          weight: 1,
          meta: {}
        });
      }
      if (lesson.locationId) {
        edges.push({
          from: lesson.id,
          to: lesson.locationId,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 1,
          meta: {}
        });
      }
      if (lesson.subject) {
        edges.push({
          from: lesson.id,
          to: `subject:${lesson.subject}`,
          type: GRAPH_EDGE_TYPES.PART_OF,
          weight: 0.8,
          meta: {}
        });
      }
      for (const libraryItemId of Array.isArray(lesson.references?.libraryItemIds) ? lesson.references.libraryItemIds : []) {
        if (!libraryItemId) continue;
        edges.push({
          from: lesson.id,
          to: libraryItemId,
          type: GRAPH_EDGE_TYPES.RELATED_TO,
          weight: 0.7,
          meta: { relation: 'library-reference' }
        });
      }
    }

    // List locations
    let locations = [];
    try {
      locations = toArray(data.getLocations?.() ?? data.listLocations?.() ?? []);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] AcademyGraphProvider: getLocations failed', { message: err?.message });
    }
    for (const loc of locations) {
      if (!loc || !loc.id) continue;
      nodes.push({
        id: loc.id,
        type: GRAPH_NODE_TYPES.LOCATION,
        label: loc.name ?? loc.id,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {
          tags: loc.tags ?? []
        }
      });
    }

    // Library items
    let libraryItems = [];
    try {
      libraryItems = toArray(data.getLibraryItems?.() ?? data.getLibrary?.() ?? data.listLibraryItems?.() ?? []);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] AcademyGraphProvider: getLibraryItems failed', { message: err?.message });
    }
    for (const item of libraryItems) {
      if (!item || !item.id) continue;
      nodes.push({
        id: item.id,
        type: GRAPH_NODE_TYPES.LIBRARY_ITEM,
        label: item.title ?? item.name ?? item.id,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {
          itemType: item.type ?? null,
          tags: item.tags ?? [],
          journalUuid: item.foundry?.journalUuid ?? null,
          journalKey: item.foundry?.journalKey ?? null
        }
      });
    }

    // Subjects derived from lessons to avoid hard dependency on a dedicated API surface.
    const subjectIds = [...new Set(lessons.map((l) => String(l?.subject ?? '').trim()).filter(Boolean))];
    for (const subjectId of subjectIds) {
      nodes.push({
        id: `subject:${subjectId}`,
        type: GRAPH_NODE_TYPES.SUBJECT ?? 'subject',
        label: subjectId,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {}
      });
    }

    // Events
    let events = [];
    try {
      events = toArray(data.getEvents?.() ?? data.listEvents?.() ?? []);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] AcademyGraphProvider: getEvents failed', { message: err?.message });
    }
    for (const evt of events) {
      if (!evt || !evt.id) continue;
      nodes.push({
        id: evt.id,
        type: GRAPH_NODE_TYPES.EVENT,
        label: evt.name ?? evt.title ?? evt.id,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {
          category: evt.category ?? evt.type ?? null,
          locationId: evt.locationId ?? null,
          tags: evt.tags ?? []
        }
      });
      if (evt.locationId) {
        edges.push({
          from: evt.id,
          to: evt.locationId,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 0.8,
          meta: {}
        });
      }
      const relatedThreads = Array.isArray(evt.relatedStoryThreads) ? evt.relatedStoryThreads : [];
      for (const threadId of relatedThreads) {
        edges.push({
          from: evt.id,
          to: threadId,
          type: GRAPH_EDGE_TYPES.RELATED_TO,
          weight: 0.5,
          meta: { role: 'story-thread' }
        });
      }
    }

    // Circles
    let circles = [];
    try {
      circles = toArray(data.getCircles?.() ?? data.listCircles?.() ?? []);
    } catch (err) {
      this.logger?.debug?.('[JANUS7] AcademyGraphProvider: getCircles failed', { message: err?.message });
    }
    for (const circle of circles) {
      if (!circle || !circle.id) continue;
      nodes.push({
        id: circle.id,
        type: GRAPH_NODE_TYPES.CIRCLE,
        label: circle.name ?? circle.id,
        source: GRAPH_SOURCES.ACADEMY,
        meta: {
          element: circle.element ?? null,
          color: circle.color ?? null,
          locationId: circle.locationId ?? null
        }
      });
      if (circle.locationId) {
        edges.push({
          from: circle.id,
          to: circle.locationId,
          type: GRAPH_EDGE_TYPES.LOCATED_IN,
          weight: 0.6,
          meta: {}
        });
      }
    }
    return { nodes, edges };
  }
}