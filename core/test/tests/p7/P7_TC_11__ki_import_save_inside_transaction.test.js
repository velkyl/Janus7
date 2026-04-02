import { moduleAssetPath } from '../../../../core/common.js';

export default {
  id: 'P7-TC-11',
  title: 'KI import persists inside transaction boundary',
  phases: [7],
  kind: 'auto',
  expected: 'applyImport uses an async state.transaction and performs state.save within that transaction.',
  whereToFind: 'phase7/import/JanusKiImportService.js',
  async run() {
    const response = await fetch(moduleAssetPath('phase7/import/JanusKiImportService.js'));
    if (!response.ok) {
      throw new Error(`KI import source unreadable (${response.status})`);
    }

    const src = await response.text();
    if (!src.includes('await this.state.transaction(async () => {')) {
      throw new Error('applyImport nutzt keine async transaction');
    }

    const txStart = src.indexOf('await this.state.transaction(async () => {');
    const txEnd = src.indexOf("}, { expectedErrors: ['TEST_IMPORT_ROLLBACK'] });", txStart);
    if (txStart < 0 || txEnd < 0) {
      throw new Error('Transaction boundary konnte nicht bestimmt werden');
    }

    const txBody = src.slice(txStart, txEnd);
    if (!txBody.includes('await this.state.save({ force: true });')) {
      throw new Error('state.save liegt nicht innerhalb der transaction');
    }

    return { ok: true, summary: 'KI import speichert innerhalb der transaction.' };
  }
};
