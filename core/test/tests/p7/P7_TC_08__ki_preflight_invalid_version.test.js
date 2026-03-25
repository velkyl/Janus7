export default {
  id: 'P7-TC-08',
  title: 'KI preflight rejects unsupported response versions',
  phases: [7],
  kind: 'auto',
  expected: 'preflightImport returns ok=false for unsupported versions',
  async run({ ctx }) {
    const api = ctx?.engine?.capabilities?.ki ?? ctx?.engine?.ki ?? null;
    if (!api || typeof api.preflightImport !== 'function') {
      return { ok: false, summary: 'preflightImport missing' };
    }
    const report = await api.preflightImport({ version: 'WRONG', changes: {} });
    return { ok: report?.ok === false, summary: report?.errors?.[0] ?? 'expected failing preflight' };
  }
};
