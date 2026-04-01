/**
 * Mocking Foundry/DSA5 globals for node-based tests.
 * Enhanced for Phase 8: supports setting persistence in-memory for logic tests.
 */
export const mockFoundry = () => {
    const settings_store = new Map([
        ['debugLevel', 'info'],
        ['enableUI', false],
        ['activeProfile', 'punin'],
        ['state', null],
        ['coreState', null]
    ]);

    const hooks = {
      on: (topic, cb) => { 
        return "hook-id-mock";
      },
      once: (topic, cb) => { 
        if (topic === 'init' || topic === 'ready') {
          // Set timeout to avoid immediate sync execution 
          // which can lead to race conditions in some engine loaders
          setTimeout(cb, 10);
        }
      },
      call: (topic, ...args) => {},
      callAll: (topic, ...args) => {},
      runScripts: (topic, ...args) => {},
      off: (id) => {}
    };

    const g = {
      modules: { 
        get: (id) => {
          if (id === 'Janus7') return { version: '1.0.0', active: true };
          return undefined;
        }
      },
      settings: {
        get: (mod, key) => {
          return settings_store.get(key);
        },
        set: (mod, key, val) => {
          settings_store.set(key, val);
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
      folders: { 
        contents: [], 
        find: () => null
      },
      janus7: null,
      i18n: {
        localize: (k) => k,
        format: (k, d) => k
      },
      world: { id: 'test-world' }
    };

    const uMock = {
      notifications: {
        info: (m) => console.log(`[UI:INFO] ${m}`),
        warn: (m) => console.warn(`[UI:WARN] ${m}`),
        error: (m) => console.error(`[UI:ERROR] ${m}`)
      },
      sidebar: { tabs: {} },
      chat: { post: () => {} }
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
    globalThis.ui = uMock;
    globalThis.foundry = f;
    globalThis.fromUuid = async (uuid) => null;
    globalThis.Folder = {
        create: async (data) => ({ ...data, id: `mock-folder-${Math.random()}` })
    };

    if (typeof global !== 'undefined') {
        global.Hooks = hooks;
        global.game = g;
        global.ui = uMock;
        global.foundry = f;
        global.fromUuid = globalThis.fromUuid;
        global.Folder = globalThis.Folder;
        global.JournalEntry = { create: async () => ({}) };
        global.Item = { create: async () => ({}) };
    }

    // Performance mock
    if (typeof performance === 'undefined') {
        globalThis.performance = {
            now: () => Date.now()
        };
    }
};
