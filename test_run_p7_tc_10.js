import P7_TC_10 from './core/test/tests/p7/P7_TC_10__ki_import_rejects_empty_patches.test.js';
import { JanusKiImportService } from './phase7/import/JanusKiImportService.js';
import { JanusKiDiffService } from './phase7/diff/JanusKiDiffService.js';

const mockState = {
  getPath: () => ({}),
  transaction: async (cb) => { await cb(); },
  save: async () => {},
  get: () => ({})
};
const mockValidator = {
  validateSchema: () => ({ valid: true, errors: [] }),
  validateState: () => ({ valid: true, errors: [] })
};

const diffService = new JanusKiDiffService({ logger: console, validator: mockValidator });
const service = new JanusKiImportService({ state: mockState, validator: mockValidator, logger: console, diffService });

const ctx = {
  engine: {
    capabilities: {
      ki: {
        preflightImport: (payload) => service.preflightImport(payload)
      }
    }
  }
};

(async () => {
  const result = await P7_TC_10.run({ ctx });
  console.log('Test Result:', result);
})();
