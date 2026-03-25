// janus7/core/test/manual-store.js (ESM)

import { MODULE_ID } from '../common.js';

export const MANUAL_TEST_RESULTS_SETTING = 'manualTestResults';
export const MANUAL_TEST_HOOK = 'janus7TestManualResultsChanged';
export const MANUAL_TEST_STATUSES = Object.freeze(['PASS', 'FAIL', 'SKIP']);

function clone(value) {
  try {
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeStatus(value, fallback = 'SKIP') {
  const raw = String(value ?? '').trim().toUpperCase();
  return MANUAL_TEST_STATUSES.includes(raw) ? raw : fallback;
}

function settingApi() {
  return game?.settings;
}

export async function readManualTestResults() {
  try {
    const raw = settingApi()?.get?.(MODULE_ID, MANUAL_TEST_RESULTS_SETTING);
    return raw && typeof raw === 'object' ? clone(raw) : {};
  } catch {
    return {};
  }
}

export async function readManualTestResult(testId) {
  const all = await readManualTestResults();
  return all?.[testId] ?? null;
}

export function normalizeManualTestEntry(testId, entry = {}, test = null) {
  return {
    testId: String(testId ?? test?.id ?? '').trim(),
    status: normalizeStatus(entry?.status, 'SKIP'),
    notes: String(entry?.notes ?? '').trim(),
    updatedAt: entry?.updatedAt ?? new Date().toISOString(),
    updatedBy: entry?.updatedBy ?? (game?.user?.name ?? 'unknown'),
    userId: entry?.userId ?? (game?.user?.id ?? null),
    title: test?.title ?? entry?.title ?? null,
    source: 'guided-manual'
  };
}

export async function writeManualTestResult(testId, entry = {}, test = null) {
  const key = String(testId ?? test?.id ?? '').trim();
  if (!key) throw new Error('writeManualTestResult: testId required');
  const all = await readManualTestResults();
  const normalized = normalizeManualTestEntry(key, entry, test);
  all[key] = normalized;
  await settingApi()?.set?.(MODULE_ID, MANUAL_TEST_RESULTS_SETTING, all);
  try { Hooks.callAll(MANUAL_TEST_HOOK, { testId: key, entry: normalized, all: clone(all) }); } catch (_) {}
  return normalized;
}

export async function clearManualTestResult(testId) {
  const key = String(testId ?? '').trim();
  if (!key) return false;
  const all = await readManualTestResults();
  if (!(key in all)) return false;
  delete all[key];
  await settingApi()?.set?.(MODULE_ID, MANUAL_TEST_RESULTS_SETTING, all);
  try { Hooks.callAll(MANUAL_TEST_HOOK, { testId: key, entry: null, all: clone(all) }); } catch (_) {}
  return true;
}

export async function resetManualTestResults() {
  await settingApi()?.set?.(MODULE_ID, MANUAL_TEST_RESULTS_SETTING, {});
  try { Hooks.callAll(MANUAL_TEST_HOOK, { testId: null, entry: null, all: {} }); } catch (_) {}
  return true;
}

export function manualEntryToRunnerResult(test, entry, ms = 0) {
  const notes = String(entry?.notes ?? '').trim();
  const who = String(entry?.updatedBy ?? '').trim();
  const when = String(entry?.updatedAt ?? '').trim();
  const summaryBits = ['Manueller Test dokumentiert'];
  if (notes) summaryBits.push(notes);
  const result = {
    ...test,
    status: normalizeStatus(entry?.status, 'SKIP'),
    summary: summaryBits.join(' · '),
    details: {
      manual: true,
      notes,
      updatedAt: when || null,
      updatedBy: who || null
    },
    ms: Number.isFinite(ms) ? ms : 0
  };
  return result;
}
