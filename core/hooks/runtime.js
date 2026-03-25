const RUNTIME_HOOK_STORE_KEY = '__janus7_runtime_hook_store__';

function getRuntimeHookStore() {
  globalThis[RUNTIME_HOOK_STORE_KEY] ??= new Map();
  return globalThis[RUNTIME_HOOK_STORE_KEY];
}

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

export function registerEngineHook(engine, bucket, hookName, fn, { once = false } = {}) {
  if (!engine || !bucket || !hookName || typeof fn !== 'function') return null;
  engine[bucket] ??= [];
  const id = once ? Hooks.once(hookName, fn) : Hooks.on(hookName, fn);
  const entry = { name: hookName, id };
  engine[bucket].push(entry);
  return entry;
}

export function listEngineHookBuckets(engine) {
  if (!engine || typeof engine !== 'object') return [];
  return Object.keys(engine).filter((field) => /^_.*HookIds$/.test(field) && Array.isArray(engine[field]));
}

export function cleanupEngineHookBuckets(engine, buckets = null) {
  const targets = Array.isArray(buckets) && buckets.length ? buckets : listEngineHookBuckets(engine);
  let removed = 0;
  for (const bucket of targets) {
    removed += cleanupEngineHookBucket(engine, bucket);
  }
  return removed;
}
