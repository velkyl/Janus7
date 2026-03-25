/**
 * Ensures that incoming context objects conform to the expected
 * schema.  Normalizes undefined values to null or empty arrays and
 * fills missing version numbers.  Call this before passing a context
 * into the query service.
 */
export class GraphContextNormalizer {
  /**
   * Normalizes an arbitrary context into the expected shape.
   * @param {any} raw
   * @returns {import('./types.js').GraphContext}
   */
  static normalize(raw) {
    const ctx = {
      version: typeof raw?.version === 'number' ? raw.version : 1,
      lessonId: raw?.lessonId ?? null,
      locationId: raw?.locationId ?? null,
      npcIds: Array.isArray(raw?.npcIds) ? raw.npcIds.filter((x) => typeof x === 'string') : [],
      threadIds: Array.isArray(raw?.threadIds) ? raw.threadIds.filter((x) => typeof x === 'string') : [],
      questIds: Array.isArray(raw?.questIds) ? raw.questIds.filter((x) => typeof x === 'string') : [],
      tags: Array.isArray(raw?.tags) ? raw.tags.filter((x) => typeof x === 'string') : [],
    };
    return ctx;
  }
}