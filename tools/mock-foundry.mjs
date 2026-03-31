/**
 * Mocking Foundry/DSA5 globals for node-based tests.
 */
export const mockFoundry = () => {
    const hooks = {
      on: (topic, cb) => { 
        return "hook-id-mock";
      },
      once: (topic, cb) => { if (topic === 'init' || topic === 'ready') cb(); },
      call: (topic, ...args) => {},
      off: (id) => {}
    };

    const g = {
      modules: { get: () => ({ version: '1.0.0' }) },
      settings: {
        get: (mod, key) => {
          if (key === 'debugLevel') return 'info';
          if (key === 'coreState') return null;
          if (key === 'state') return null;
          if (key === 'enableUI') return true;
          return undefined;
        },
        set: (mod, key, val) => {
          return Promise.resolve(val);
        },
        register: () => {},
        settings: new Map(),
        storage: new Map()
      },
      user: { isGM: true, id: 'gm-id' },
      users: { get: () => ({ isGM: true }) },
      scenes: { contents: [] },
      actors: { contents: [], get: () => null },
      items: { contents: [], get: () => null },
      journal: { contents: [], get: () => null },
      janus7: null,
      i18n: {
        localize: (k) => k,
        format: (k, d) => k
      },
      world: { id: 'test-world' }
    };

    const f = {
      utils: {
        deepClone: (obj) => {
          if (!obj) return obj;
          try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
        },
        mergeObject: (a, b) => Object.assign(a, b),
        getProperty: (obj, path) => {
          if (!path) return obj;
          return path.split('.').reduce((o, i) => o?.[i], obj);
        },
        setProperty: (obj, path, val) => {
          if (!path) return false;
          const parts = path.split('.');
          const last = parts.pop();
          const target = parts.reduce((o, i) => o[i] ??= {}, obj);
          target[last] = val;
          return true;
        }
      }
    };

    globalThis.Hooks = hooks;
    globalThis.game = g;
    globalThis.foundry = f;
    globalThis.fromUuid = async (uuid) => null;

    if (typeof global !== 'undefined') {
        global.Hooks = hooks;
        global.game = g;
        global.foundry = f;
        global.fromUuid = globalThis.fromUuid;
    }

    // Performance mock
    if (typeof performance === 'undefined') {
        globalThis.performance = {
            now: () => Date.now()
        };
    }
};
