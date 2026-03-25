import { performance } from 'perf_hooks';
import { CompendiumLibrary } from './bridge/compendium-library.js';

// Mock global Foundry objects
global.game = {
  packs: {
    get: (id) => {},
    [Symbol.iterator]: function* () {
      yield {
        collection: 'dsa5.spells',
        documentName: 'Item',
        metadata: {
          system: 'dsa5',
          label: 'Spells',
          package: 'dsa5',
        },
        getIndex: async () => {
          const items = [];
          for (let i = 0; i < 5000; i++) {
            items.push({ _id: `id_spell_${i}`, name: `Spell ${i}`, type: 'spell' });
          }
          return items;
        }
      };
      yield {
        collection: 'core.items',
        documentName: 'Item',
        metadata: {
          system: 'core',
          label: 'Core Items',
          package: 'core',
        },
        getIndex: async () => {
          const items = [];
          for (let i = 0; i < 5000; i++) {
            items.push({ _id: `id_item_${i}`, name: `Item ${i}`, type: 'weapon' });
          }
          return items;
        }
      };
    }
  }
};

async function runBenchmark() {
  const lib = new CompendiumLibrary({ logger: { info: () => {}, warn: () => {} } });

  // Build the index to isolate lookup performance from indexing performance
  await lib.buildIndex('Item');

  // Prepare names to look up
  const namesToLookUp = [];
  for (let i = 0; i < 1000; i++) {
    namesToLookUp.push(`Spell ${i}`);
    namesToLookUp.push(`Item ${i}`);
    namesToLookUp.push(`Unknown ${i}`);
  }

  const start = performance.now();
  await lib.findBatch(namesToLookUp, 'Item');
  const end = performance.now();

  console.log(`findBatch took ${(end - start).toFixed(2)} ms for ${namesToLookUp.length} lookups over 10000 items.`);
}

runBenchmark().catch(console.error);
