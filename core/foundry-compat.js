/**
 * Shared Foundry compatibility helpers for JANUS7.
 * Keep cross-generation class lookups centralized so V14/V15 migration work
 * stays localized instead of spreading namespace assumptions across the repo.
 */

/**
 * Resolve the FilePicker class across supported Foundry generations.
 *
 * @returns {typeof globalThis.FilePicker|null}
 */
export function getFilePickerClass() {
  return foundry?.applications?.ux?.FilePicker       // v14 kanonisch
    ?? foundry?.applications?.apps?.FilePicker       // hypothetischer v13-Pfad
    ?? CONFIG?.ux?.FilePicker
    ?? globalThis.FilePicker
    ?? null;
}

/**
 * Resolve the DragDrop helper across supported Foundry generations.
 *
 * @returns {typeof globalThis.DragDrop|null}
 */
export function getDragDropClass() {
  return foundry?.applications?.ux?.DragDrop
    ?? CONFIG?.ux?.DragDrop
    ?? globalThis.DragDrop
    ?? null;
}

/**
 * Best-effort nested directory creation for FilePicker data paths.
 *
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
export async function ensureDataDirectory(dir) {
  const FilePicker = getFilePickerClass();
  if (!FilePicker || !dir || typeof FilePicker.createDirectory !== 'function') return false;

  const parts = String(dir).split('/').filter(Boolean);
  if (!parts.length) return false;

  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    try {
      await FilePicker.createDirectory('data', acc, { notify: false });
    } catch (err) {
      const msg = String(err?.message ?? err ?? '').toLowerCase();
      if (msg.includes('already exists')) continue;
    }
  }

  return true;
}
