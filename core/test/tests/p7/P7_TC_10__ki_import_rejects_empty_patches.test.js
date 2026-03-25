/**
 * P7_TC_10 — KI import rejects empty or invalid patches
 *
 * This test ensures that the semantic validation in JanusKiImportService
 * correctly rejects KI responses with invalid patches, specifically:
 * - Empty objects in journalEntries
 * - Non-objects (e.g. null, undefined) in journalEntries
 * - Non-objects in generic update arrays (e.g. calendarUpdates)
 */

export default {
  id: 'P7-TC-10',
  title: 'KI import rejects empty or invalid patches',
  phases: [7],
  kind: 'auto',
  expected: 'preflightImport returns ok=false when patches are empty or not objects',
  async run({ ctx }) {
    const api = ctx?.engine?.capabilities?.ki ?? ctx?.engine?.ki ?? null;
    if (!api || typeof api.preflightImport !== 'function') {
      return { ok: false, summary: 'preflightImport missing' };
    }

    const testCases = [
      {
        name: 'Empty journal entry object',
        payload: {
          version: 'JANUS_KI_RESPONSE_V1',
          changes: { journalEntries: [{}] }
        },
        expectedError: 'journalEntries Eintrag darf nicht leer sein.'
      },
      {
        name: 'Null in journal entries',
        payload: {
          version: 'JANUS_KI_RESPONSE_V1',
          changes: { journalEntries: [null] }
        },
        expectedError: 'journalEntries muss Objekte enthalten.'
      },
      {
        name: 'Primitive in journal entries',
        payload: {
          version: 'JANUS_KI_RESPONSE_V1',
          changes: { journalEntries: ['invalid_string'] }
        },
        expectedError: 'journalEntries muss Objekte enthalten.'
      },
      {
        name: 'Null patch in generic updates',
        payload: {
          version: 'JANUS_KI_RESPONSE_V1',
          changes: { calendarUpdates: [null] }
        },
        expectedError: 'calendarUpdates enthält ungültige Patch-Objekte.'
      }
    ];

    const failures = [];

    for (const tc of testCases) {
      // preflightImport returns an object like { ok: boolean, errors: string[], summary: any[] }
      const report = await api.preflightImport(tc.payload);

      if (report.ok) {
        failures.push(`${tc.name} should have failed but preflight returned ok=true`);
        continue;
      }

      // Check if the expected error string is included in the errors array
      const hasExpectedError = report.errors.some(err => err.includes(tc.expectedError));
      if (!hasExpectedError) {
        failures.push(`${tc.name} did not contain the expected error message. Got errors: ${JSON.stringify(report.errors)}`);
      }
    }

    if (failures.length > 0) {
      return { ok: false, summary: failures.join('; ') };
    }

    return { ok: true, summary: 'All invalid patches were correctly rejected' };
  }
};
