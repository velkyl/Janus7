import { DSA5FateBridge, SCHIP_SOURCE } from '../../../../bridge/dsa5/fate.js';

export default {
  id: 'P3-TC-FATE-02',
  title: 'Fate Bridge: Edge Cases for _onActorUpdate',
  phases: [3],
  kind: 'auto',
  expected: '_onActorUpdate should handle null/undefined changes safely and not emit hooks.',
  run: async (ctx) => {
    const originalFoundry = globalThis.foundry;
    const originalHooks = globalThis.Hooks;
    const originalGame = globalThis.game;

    let emittedHooks = [];

    // Mock Foundry globals
    globalThis.foundry = {
      utils: {
        getProperty: (obj, path) => {
          return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
        }
      }
    };

    globalThis.Hooks = {
      on: () => 1,
      off: () => {}
    };

    globalThis.game = {
      actors: [],
      time: { worldTime: 100 }
    };

    const bridge = new DSA5FateBridge({
      logger: {
        warn: () => {},
        info: () => {},
        debug: () => {},
        error: () => {}
      }
    });

    // Mock emitHook dynamically to intercept it
    // In fate.js, emitHook is imported from core/hooks/emitter.js
    // Since we can't easily intercept the direct import, we will rely on internal logic
    // or monkey patch if possible. But fate.js doesn't expose it.
    // Instead of intercepting emitHook, we'll verify it doesn't crash,
    // and if we provide an actor that *should* trigger, we can test it differently.
    // Actually, we can check _lastPersonalSchips to see if it was modified when it shouldn't be.

    try {
      const actor = {
        id: 'actor1',
        uuid: 'Actor.actor1',
        name: 'Test Actor',
        system: {
          status: {
            fatePoints: {
              value: 3
            }
          }
        }
      };

      // Set initial state
      bridge._lastPersonalSchips.set(actor.id, 3);

      // Edge case 1: changes is empty (newValue is undefined)
      const changes1 = {};
      bridge._onActorUpdate(actor, changes1);

      // _lastPersonalSchips should remain 3, not updated because it returned early
      if (bridge._lastPersonalSchips.get(actor.id) !== 3) {
        return { ok: false, summary: 'Failed: _onActorUpdate modified state for empty changes' };
      }

      // Edge case 2: changes explicitly sets it to null
      const changes2 = { system: { status: { fatePoints: { value: null } } } };
      bridge._onActorUpdate(actor, changes2);

      if (bridge._lastPersonalSchips.get(actor.id) !== 3) {
        return { ok: false, summary: 'Failed: _onActorUpdate modified state for null value' };
      }

      // Edge case 3: Tracked actors filter
      bridge._trackedActorIds = new Set(['otherActor']);
      const changes3 = { system: { status: { fatePoints: { value: 2 } } } };
      bridge._onActorUpdate(actor, changes3); // should return early

      if (bridge._lastPersonalSchips.get(actor.id) !== 3) {
        return { ok: false, summary: 'Failed: _onActorUpdate ignored tracked actors filter' };
      }

      return { ok: true, summary: 'Edge cases handled correctly' };
    } catch (err) {
      return { ok: false, summary: `Error thrown: ${err.message}` };
    } finally {
      globalThis.foundry = originalFoundry;
      globalThis.Hooks = originalHooks;
      globalThis.game = originalGame;
    }
  }
};