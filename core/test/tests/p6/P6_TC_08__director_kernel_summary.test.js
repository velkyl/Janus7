export default {
  id: 'P6-TC-08',
  title: 'Director Kernel liefert Laufzeit-Summary',
  phases: [6],
  kind: 'auto',
  expected: 'director.kernel.getRuntimeSummary() liefert Slot-, Queue- und Quest-Infos.',
  async run({ engine }) {
    const dir = engine?.core?.director ?? engine?.director;
    if (!dir?.kernel?.getRuntimeSummary) throw new Error('director.kernel.getRuntimeSummary fehlt');
    const summary = dir.kernel.getRuntimeSummary();
    return {
      ok: !!summary && typeof summary === 'object' && !!summary.slot && typeof summary.lessonCount === 'number' && typeof summary.queuedEventCount === 'number' && typeof summary.activeQuestCount === 'number',
      summary: `lessonCount=${summary?.lessonCount ?? 'n/a'} | queued=${summary?.queuedEventCount ?? 'n/a'} | activeQuests=${summary?.activeQuestCount ?? 'n/a'}`
    };
  }
};
