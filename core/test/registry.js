// janus7/core/test/registry.js (ESM)

/**
 * Minimal Test Registry for JANUS7.
 *
 * Contract:
 * - A test is an object with at least: { id: string, title?: string, run?: Function, kind?: string }
 * - We keep it intentionally tiny: your real test suite can grow from here.
 */
export default class JanusTestRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this._tests = new Map();
  }

  /** @param {any} test */
  register(test) {
    if (!test || typeof test !== 'object') {
      throw new Error('JanusTestRegistry.register: test must be an object');
    }
    if (!test.id || typeof test.id !== 'string') {
      throw new Error('JanusTestRegistry.register: test.id (string) required');
    }

    if (this._tests.has(test.id)) {
      throw new Error(`JanusTestRegistry.register: duplicate test id: ${test.id}`);
    }

    this._tests.set(test.id, test);
    return test;
  }

  /** @param {any[]} tests */
  registerMany(tests = []) {
    for (const t of tests) this.register(t);
    return this;
  }

  /** @param {string} id */
  get(id) {
    return this._tests.get(id);
  }

  /** @param {string} id */
  has(id) {
    return this._tests.has(id);
  }

  list() {
    return Array.from(this._tests.values());
  }

  clear() {
    this._tests.clear();
  }
}
