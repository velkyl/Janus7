export default {
  id: 'P16-TC-11',
  title: 'Quest Journal blendet Gerüchte-Wahrheit für Nicht-GM aus',
  phases: [6],
  kind: 'auto',
  expected: 'Nicht-GM-Kontext setzt truthLabel auf "Unklar" und revealRumorTruth auf false.',
  whereToFind: 'scripts/ui/quest-journal.js',
  async run() {
    const previousFoundry = globalThis.foundry;
    const previousGame = globalThis.game;
    const previousHooks = globalThis.Hooks;

    class MockAppV2 {
      constructor(options = {}) {
        this.options = options;
      }
      enableAutoRefresh() {}
      render() { return Promise.resolve(this); }
    }

    try {
      globalThis.Hooks = {
        on() { return 1; },
        off() {}
      };
      globalThis.foundry = {
        applications: {
          api: {
            HandlebarsApplicationMixin: (Base) => Base,
            ApplicationV2: MockAppV2
          }
        },
        utils: {
          debounce: (fn) => fn,
          deepClone: (value) => JSON.parse(JSON.stringify(value)),
          getType: (value) => {
            if (value === null) return 'null';
            if (Array.isArray(value)) return 'Array';
            if (value === undefined) return 'undefined';
            return Object.prototype.toString.call(value).slice(8, -1);
          }
        }
      };

      globalThis.game = {
        user: {
          isGM: false,
          character: { uuid: 'Actor.player', id: 'player', name: 'Adeptin' }
        },
        actors: [{ type: 'character', uuid: 'Actor.player', id: 'player', name: 'Adeptin' }],
        janus7: {
          academy: {
            data: {
              async getContentRegistry() {
                return { quests: [] };
              },
              buildQuestSummary() {
                return [];
              },
              buildRumorBoard() {
                return [{ id: 'R1', text: 'Testgerücht', truthLevel: 0.8, heard: false, decayDays: 3 }];
              },
              buildFactionStanding() {
                return [];
              },
              buildEventContext() {
                return { activeLocationId: 'punin' };
              }
            },
            quests: {}
          }
        }
      };

      const { JanusQuestJournal } = await import('../../../../scripts/ui/quest-journal.js');
      const app = new JanusQuestJournal();
      const context = await app._prepareContext({});

      if (context?.revealRumorTruth !== false) {
        throw new Error('revealRumorTruth muss für Nicht-GM false sein');
      }
      if (context?.rumors?.[0]?.truthLabel !== 'Unklar') {
        throw new Error(`truthLabel drift: erwartet "Unklar", erhielt "${context?.rumors?.[0]?.truthLabel}"`);
      }

      return { ok: true, summary: 'Nicht-GM sieht keinen Wahrheitsgrad im Quest Journal.' };
    } finally {
      globalThis.foundry = previousFoundry;
      globalThis.game = previousGame;
      globalThis.Hooks = previousHooks;
    }
  }
};
