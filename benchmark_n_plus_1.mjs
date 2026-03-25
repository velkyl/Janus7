import { performance } from 'perf_hooks';

// Simulate Foundry VTT documents and API
class MockDocument {
  constructor(id, name, folderId = null) {
    this.id = id;
    this.name = name;
    this.folder = { id: folderId };
    this.flags = { janus7: { managed: true } };
    this.updateCount = 0;
  }
  async update(data) {
    // Simulate database I/O latency (e.g., 5ms)
    await new Promise(resolve => setTimeout(resolve, 5));
    if (data.folder) this.folder.id = data.folder;
    if (data.flags) this.flags = { ...this.flags, ...data.flags };
    this.updateCount++;
  }
}

class MockDocumentClass {
  static async updateDocuments(updates) {
    // Simulate database I/O latency for a bulk operation.
    // Usually a bit longer than a single update, but much less than N updates.
    await new Promise(resolve => setTimeout(resolve, 15));
    for (const update of updates) {
      const doc = MockDocumentClass.collection.find(d => d.id === update._id);
      if (doc) {
        if (update.folder) doc.folder.id = update.folder;
        if (update.flags) doc.flags = { ...doc.flags, ...update.flags };
        doc.updateCount++;
      }
    }
  }
}

// Generate test data
const NUM_DOCS = 100;
const journals = Array.from({ length: NUM_DOCS }, (_, i) => new MockDocument(`j${i}`, `Journal ${i}`));
MockDocumentClass.collection = journals;

// Simulate target folder ID
const TARGET_FOLDER_ID = "targetFolder123";

async function runNPlus1() {
  const start = performance.now();
  let moved = 0;
  for (const j of journals) {
    // reset
    j.folder.id = null;
    const targetFolderId = TARGET_FOLDER_ID;

    if (j.folder?.id === targetFolderId) continue;

    await j.update({ folder: targetFolderId, flags: { janus7: { ...j.flags.janus7, folderKey: 'someKey' } } });
    moved++;
  }
  const end = performance.now();
  return end - start;
}

async function runBulk() {
  const start = performance.now();
  let moved = 0;
  const updates = [];

  for (const j of journals) {
    // reset
    j.folder.id = null;
    const targetFolderId = TARGET_FOLDER_ID;

    if (j.folder?.id === targetFolderId) continue;

    updates.push({
      _id: j.id,
      folder: targetFolderId,
      flags: { janus7: { ...j.flags.janus7, folderKey: 'someKey' } }
    });
    moved++;
  }

  if (updates.length > 0) {
    await MockDocumentClass.updateDocuments(updates);
  }

  const end = performance.now();
  return end - start;
}

async function run() {
  console.log(`Benchmarking with ${NUM_DOCS} documents...`);
  const nPlus1Time = await runNPlus1();
  console.log(`N+1 Updates: ${nPlus1Time.toFixed(2)} ms`);

  const bulkTime = await runBulk();
  console.log(`Bulk Update: ${bulkTime.toFixed(2)} ms`);

  console.log(`Improvement: ${((nPlus1Time - bulkTime) / nPlus1Time * 100).toFixed(2)}% faster`);
}

run();
