const RUNTIME_HOOK_STORE_KEY = '__janus7_runtime_hook_store__';

/**
 * @typedef {object} JanusRuntimeHookEntry
 * @property {string} key
 * @property {string} name
 * @property {number} id
 * @property {boolean} once
 */

/**
 * @typedef {object} JanusEngineHookEntry
 * @property {string} name
 * @property {number} id
 */

function getRuntimeHookStore() {
  globalThis[RUNTIME_HOOK_STORE_KEY] ??= new Map();
  return globalThis[RUNTIME_HOOK_STORE_KEY];
}

/**
 * Registers or replaces a global runtime hook entry by a stable key.
 *
 * @param {string} key
 * @param {string} hookName
 * @param {(...args: unknown[]) => unknown} fn
 * @param {{ once?: boolean }} [options]
 * @returns {JanusRuntimeHookEntry|null}
 */
export function registerRuntimeHook(key, hookName, fn, { once = false } = {}) {
  if (!key || !hookName || typeof fn !== 'function') return null;
  const store = getRuntimeHookStore();
  const previous = store.get(key);
  if (previous?.name && previous?.id != null) {
    try { Hooks.off(previous.name, previous.id); } catch (_) { /* noop */ }
  }

  const id = once ? Hooks.once(hookName, fn) : Hooks.on(hookName, fn);
  const entry = { key, name: hookName, id, once: Boolean(once) };
  store.set(key, entry);
  return entry;
}

/**
 * Removes hook registrations stored in a specific engine bucket.
 *
 * @param {Record<string, unknown>} engine
 * @param {string} bucket
 * @param {{ name?: string|null }} [options]
 * @returns {number}
 */
export function cleanupEngineHookBucket(engine, bucket, { name = null } = {}) {
  if (!engine || !bucket) return 0;
  const entries = Array.isArray(engine[bucket]) ? engine[bucket] : [];
  if (!entries.length) {
    engine[bucket] = [];
    return 0;
  }

  const keep = [];
  let removed = 0;
  for (const entry of entries) {
    if (name != null && entry?.name !== name) {
      keep.push(entry);
      continue;
    }
    if (entry?.name && entry?.id != null) {
      try { Hooks.off(entry.name, entry.id); } catch (_) { /* noop */ }
    }
    removed += 1;
  }

  engine[bucket] = keep;
  return removed;
}

/**
 * Registers a hook in an engine-owned bucket for later teardown.
 *
 * @param {Record<string, unknown>} engine
 * @param {string} bucket
 * @param {string} hookName
 * @param {(...args: unknown[]) => unknown} fn
 * @param {{ once?: boolean }} [options]
 * @returns {JanusEngineHookEntry|null}
 */
export function registerEngineHook(engine, bucket, hookName, fn, { once = false } = {}) {
  if (!engine || !bucket || !hookName || typeof fn !== 'function') return null;
  engine[bucket] ??= [];
  const id = once ? Hooks.once(hookName, fn) : Hooks.on(hookName, fn);
  const entry = { name: hookName, id };
  engine[bucket].push(entry);
  return entry;
}

/**
 * Lists engine fields that currently act as tracked hook buckets.
 *
 * @param {Record<string, unknown>|null|undefined} engine
 * @returns {string[]}
 */
export function listEngineHookBuckets(engine) {
  if (!engine || typeof engine !== 'object') return [];
  return Object.keys(engine).filter((field) => /^_.*HookIds$/.test(field) && Array.isArray(engine[field]));
}

/**
 * Cleans one or more engine hook buckets and returns the number of removed hooks.
 *
 * @param {Record<string, unknown>} engine
 * @param {string[]|null} [buckets]
 * @returns {number}
 */
export function cleanupEngineHookBuckets(engine, buckets = null) {
  const targets = Array.isArray(buckets) && buckets.length ? buckets : listEngineHookBuckets(engine);
  let removed = 0;
  for (const bucket of targets) {
    removed += cleanupEngineHookBucket(engine, bucket);
  }
  return removed;
}
