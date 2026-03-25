export default {
  id: 'P6-TC-17',
  title: 'ControlPanel liefert Quest-Actor-Kandidaten und Social-Fachoutput',
  phases: [6],
  kind: 'auto',
  expected: 'questActorCandidates stehen im Context und _buildDirectorWorkflowView reichert Social-/Questdaten an.',
  async run({ engine }) {
    const App = engine?.ui?.apps?.controlPanel;
    if (!App) throw new Error('controlPanel App-Klasse fehlt');
    const app = new App({});
    try {
      const ctx = await app._prepareContext({});
      const candidatesOk = Array.isArray(ctx?.questActorCandidates) && ctx.questActorCandidates.length > 0;

      app._directorWorkflow = {
        lastAction: 'directorEvaluateSocial',
        lastRunAt: new Date().toISOString(),
        lastResult: {
          advanced: [{ socialLinkId: 'SLINK_KOSMAAR', rank: 1, eventTriggerId: 'E_SLINK_KOSMAAR_01' }],
          suggestions: [{ quest: { id: 'Q_DEMO_LIBRARY', label: 'Demo Quest' }, score: 0.4, reasons: ['thread suggests quest'] }],
          questStarted: { questId: 'Q_DEMO_LIBRARY', actorId: 'party', actorLabel: 'Gruppe / Party', title: 'Demo Quest' }
        },
        history: []
      };
      const workflow = app._buildDirectorWorkflowView({ queuedEventCount: 0, lessonCount: 0, activeQuestCount: 0 });
      const socialOk = Array.isArray(workflow?.socialAdvances) && workflow.socialAdvances.length > 0 && 'perkCount' in workflow.socialAdvances[0];
      const questOk = Array.isArray(workflow?.questSuggestions) && workflow.questSuggestions.length > 0 && !!workflow.questSuggestions[0].actorLabel;
      const startedOk = !!workflow?.startedQuest?.title;
      return {
        ok: candidatesOk && socialOk && questOk && startedOk,
        summary: `actors=${ctx?.questActorCandidates?.length ?? 0} social=${workflow?.socialAdvances?.length ?? 0} quests=${workflow?.questSuggestions?.length ?? 0}`
      };
    } finally {
      try { await app.close?.({ force: true }); } catch (_e) {}
    }
  }
};
