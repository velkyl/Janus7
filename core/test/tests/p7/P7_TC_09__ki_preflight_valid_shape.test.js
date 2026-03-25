export default {
  id: 'P7-TC-09',
  title: 'KI preflight accepts minimal valid response shape',
  phases: [7],
  kind: 'auto',
  expected: 'preflightImport returns ok=true for a minimal valid no-op response',
  async run({ ctx }) {
    const api = ctx?.engine?.capabilities?.ki ?? ctx?.engine?.ki ?? null;
    if (!api || typeof api.preflightImport !== 'function') {
      return { ok: false, summary: 'preflightImport missing' };
    }
    const report = await api.preflightImport({ version: 'JANUS_KI_RESPONSE_V1', changes: {} });
    return { ok: report?.ok === true, summary: report?.ok ? 'preflight ok' : (report?.errors?.[0] ?? 'preflight failed') };
  }
};
