/**
 * Central registry of graph constants used throughout the JANUS knowledge graph.
 *
 * Node types represent the core domain entities that can appear in the graph.
 * Edge types capture the relationships between these entities.  These enums
 * are frozen to prevent accidental mutation at runtime.
 */

// Core node categories.  Keep these values simple strings; additional
// metadata can be stored on the node itself via the `meta` field.
export const GRAPH_NODE_TYPES = Object.freeze({
  NPC:        'npc',      // Non‑player characters from the academy data
  LESSON:     'lesson',   // Lessons defined in the academy schedule
  LOCATION:   'location', // Physical or conceptual places within the academy
  THREAD:     'thread',   // Story or quest threads tracked in the state
  QUEST:      'quest',    // Quests that are active or available to players
  SUBJECT:    'subject',
  EVENT:      'event',
  CIRCLE:     'circle',
  SOCIAL_LINK:'social_link',
  DSA5_ENTRY: 'dsa5_entry',
  LIBRARY_ITEM: 'library_item'
});

// Relationship categories between nodes.  Edges of these types
// connect two nodes in the graph to describe how they influence each
// other.  The semantics of each relationship are defined in the
// consuming logic rather than here.
export const GRAPH_EDGE_TYPES = Object.freeze({
  TEACHES:   'teaches',    // NPC → Lesson: the NPC teaches the lesson
  ATTENDS:   'attends',    // NPC → Lesson: the NPC attends the lesson
  LOCATED_IN:'located_in', // Lesson/Quest → Location: occurs at the location
  RELATED_TO:'related_to', // Arbitrary semantic linkage between entities
  REQUIRES:  'requires',   // Quest → Something: quest requires this entity
  UNLOCKS:   'unlocks',    // Quest → Something: quest unlocks this entity
  CONFLICTS:'conflicts',   // Two entities are in opposition
  SUGGESTS: 'suggests',    // Thread → Quest: thread suggests pursuing a quest
  BELONGS_TO:'belongs_to',
  PART_OF:   'part_of',
  TRIGGERS:  'triggers',
  PARTICIPATES:'participates'
});

// Sources describe where a given node or edge originated.  This helps
// diagnostics and caching logic understand what upstream data changed
// when invalidating the graph.
export const GRAPH_SOURCES = Object.freeze({
  ACADEMY:    'academy',    // Data pulled from the academy JSON definitions
  STATE:      'state',      // Dynamic state managed by JanusStateCore
  DSA5_INDEX: 'dsa5-index'  // Data indexed from DSA5 compendia (optional)
});