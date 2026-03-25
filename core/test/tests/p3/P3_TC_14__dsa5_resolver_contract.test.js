import { DSA5Resolver } from '../../../../bridge/dsa5/resolver.js';
import { DSA5ResolveError } from '../../../../bridge/dsa5/errors.js';

export default {
  id: 'P3-TC-14',
  title: 'DSA5Resolver Contract',
  phases: [3],
  kind: 'auto',
  expected: 'DSA5Resolver resolves Actors and Items via UUID, ID, or Name/Pack heuristic.',
  run: async (ctx) => {
    const logs = [];
    const mockLogger = {
      warn: (msg, ...args) => logs.push({ level: 'warn', msg, args }),
      info: (msg, ...args) => logs.push({ level: 'info', msg, args }),
      error: (msg, ...args) => logs.push({ level: 'error', msg, args })
    };

    // Mocking Foundry Globals
    const originalGame = globalThis.game;
    const originalCanvas = globalThis.canvas;
    const originalFromUuid = globalThis.fromUuid;

    const mockDocs = new Map();
    const mockPacks = new Map();

    globalThis.game = {
      packs: {
        get: (id) => mockPacks.get(id)
      },
      actors: {
        get: (id) => Array.from(mockDocs.values()).find(d => d.documentName === 'Actor' && d._id === id)
      }
    };

    globalThis.canvas = {
      tokens: {
        get: (id) => {
          const doc = mockDocs.get(id);
          // Simple mock: if it has an actor property, we treat it as a token in this test
          return doc?.actor ? doc : null;
        }
      }
    };

    globalThis.fromUuid = async (uuid) => {
      if (uuid === 'fail') throw new Error('UUID Fail');
      return mockDocs.get(uuid) ?? null;
    };

    try {
      const resolver = new DSA5Resolver({ logger: mockLogger });

      // 1. Context Binding
      const { fromUuid } = resolver;
      mockDocs.set('Actor.123', { documentName: 'Actor', name: 'Test Actor' });
      const boundCheck = await fromUuid('Actor.123');
      if (boundCheck?.name !== 'Test Actor') return { ok: false, summary: 'Context binding failed' };

      // 2. fromUuid error handling
      const failResult = await resolver.fromUuid('fail');
      if (failResult !== null || !logs.some(l => l.msg.includes('fromUuid fehlgeschlagen'))) {
        return { ok: false, summary: 'fromUuid error handling failed' };
      }

      // 3. Compendium Indexing
      mockPacks.set('dsa5.items', {
        getIndex: async () => [
          { _id: 'i1', name: 'Sword', type: 'item' },
          { _id: 'i2', name: 'Shield', type: 'item' }
        ]
      });

      const idx = await resolver.getPackIndex('dsa5.items');
      if (idx.length !== 2) return { ok: false, summary: 'getPackIndex failed' };

      // Cache check
      mockPacks.delete('dsa5.items');
      const cachedIdx = await resolver.getPackIndex('dsa5.items');
      if (cachedIdx.length !== 2) return { ok: false, summary: 'getPackIndex caching failed' };

      // 4. Finding in Compendium
      const hit = await resolver.findInCompendium({ pack: 'dsa5.items', name: 'wo' }); // Should find Sword
      if (hit?._id !== 'i1') return { ok: false, summary: 'findInCompendium (contains) failed' };

      const exact = await resolver.findInCompendium({ pack: 'dsa5.items', name: 'Shield' });
      if (exact?._id !== 'i2') return { ok: false, summary: 'findInCompendium (exact) failed' };

      // 5. resolveItem
      const itemDoc = { _id: 'i1', documentName: 'Item', name: 'Sword' };
      mockDocs.set('Item.i1', itemDoc);
      mockPacks.set('dsa5.items', {
          getIndex: async () => [{ _id: 'i1', name: 'Sword' }],
          getDocument: async (id) => id === 'i1' ? itemDoc : null
      });

      const resItem = await resolver.resolveItem('Item.i1');
      if (resItem !== itemDoc) return { ok: false, summary: 'resolveItem (UUID) failed' };

      const resItemHeuristic = await resolver.resolveItem('Sword', { pack: 'dsa5.items', name: 'Sword' });
      if (resItemHeuristic !== itemDoc) return { ok: false, summary: 'resolveItem (Heuristic) failed' };

      // 6. resolveActor
      const actorDoc = { _id: 'a1', documentName: 'Actor', name: 'Hero' };
      mockDocs.set('Actor.a1', actorDoc);
      const resActor = await resolver.resolveActor('Actor.a1');
      if (resActor !== actorDoc) return { ok: false, summary: 'resolveActor (UUID) failed' };

      const resActorId = await resolver.resolveActor('a1');
      if (resActorId !== actorDoc) return { ok: false, summary: 'resolveActor (ID) failed' };

      const tokenDoc = { _id: 't1', actor: actorDoc };
      mockDocs.set('t1', tokenDoc);
      const resActorToken = await resolver.resolveActor('t1');
      if (resActorToken !== actorDoc) return { ok: false, summary: 'resolveActor (Token) failed' };

      // 7. require
      const reqActor = await resolver.require('Actor', 'Actor.a1');
      if (reqActor !== actorDoc) return { ok: false, summary: 'require (Actor) failed' };

      try {
        await resolver.require('Item', 'NonExistent');
        return { ok: false, summary: 'require should have failed' };
      } catch (err) {
        if (!(err instanceof DSA5ResolveError)) return { ok: false, summary: 'require threw wrong error type' };
      }

      return { ok: true, summary: 'DSA5Resolver contract verified' };
    } finally {
      globalThis.game = originalGame;
      globalThis.canvas = originalCanvas;
      globalThis.fromUuid = originalFromUuid;
    }
  }
};
