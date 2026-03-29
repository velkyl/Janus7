// ui/layer/director-context.js

export function prepareDirectorRuntimeSummary({ engine, logger }) {
  const director = engine?.core?.director;
  return {
    directorSummary: { available: !!director },
    directorRuntime: {
      mode: director?.workflow?.mode ?? 'idle',
      state: director?.workflow?.state ?? 'init',
      runbookId: director?.workflow?.runbookId ?? null
    }
  };
}

export function buildDirectorRunbookView(directorRuntime, directorWorkflow) {
  return {
    suggestedAction: directorWorkflow?.suggestedAction ?? null,
    moodSuggestion: directorWorkflow?.moodSuggestion ?? null
  };
}

export function buildDirectorWorkflowView({ directorWorkflow, directorRuntime, engine, questCandidates }) {
  // Try mapping the old app state fields back
  return {
    socialAdvances: directorWorkflow?.socialAdvances ?? [],
    startedQuest: directorWorkflow?.startedQuest ?? null,
    suggestedAction: directorWorkflow?.suggestedAction ?? { label: 'Keine Aktion anstehend', reason: 'Alles läuft.', action: 'directorRunbookNext' },
    moodSuggestion: directorWorkflow?.moodSuggestion ?? { moodLabel: 'Neutral' }
  };
}
