// ui/layer/director-context.js

function normalizeQuestCandidateMap(questCandidates = []) {
  return new Map(
    (Array.isArray(questCandidates) ? questCandidates : [])
      .filter((entry) => entry && (entry.actorId || entry.actorUuid))
      .map((entry) => [String(entry.actorId ?? entry.actorUuid), entry])
  );
}

function normalizeSocialAdvances(directorWorkflow = {}) {
  const explicit = Array.isArray(directorWorkflow?.socialAdvances) ? directorWorkflow.socialAdvances : [];
  if (explicit.length > 0) return explicit;

  const advanced = directorWorkflow?.lastResult?.advanced
    ?? directorWorkflow?.lastResult?.social?.advanced
    ?? [];

  return (Array.isArray(advanced) ? advanced : []).map((entry) => ({
    ...entry,
    label: entry?.label ?? entry?.socialLinkId ?? 'Social Link',
    rank: Number(entry?.rank ?? 0),
    perkCount: Number(entry?.perkCount ?? entry?.perks?.length ?? 0),
    eventTriggerId: entry?.eventTriggerId ?? null
  }));
}

function normalizeQuestSuggestions(directorWorkflow = {}, questCandidates = []) {
  const explicit = Array.isArray(directorWorkflow?.questSuggestions) ? directorWorkflow.questSuggestions : [];
  const source = explicit.length > 0 ? explicit : (directorWorkflow?.lastResult?.suggestions ?? []);
  const candidateMap = normalizeQuestCandidateMap(questCandidates);

  return (Array.isArray(source) ? source : []).map((entry, index) => {
    const actorId = entry?.actorId ?? directorWorkflow?.lastResult?.questStarted?.actorId ?? 'party';
    const actor = candidateMap.get(String(actorId)) ?? null;
    const quest = entry?.quest ?? {};
    const reasons = Array.isArray(entry?.reasons)
      ? entry.reasons
      : (entry?.reason ? [entry.reason] : []);

    return {
      ...entry,
      index,
      actorId,
      actorLabel: entry?.actorLabel ?? actor?.actorLabel ?? actor?.label ?? 'Gruppe / Party',
      questId: quest?.id ?? entry?.questId ?? null,
      title: quest?.title ?? quest?.label ?? entry?.title ?? entry?.questId ?? 'Quest-Vorschlag',
      score: Number(entry?.score ?? 0),
      reasons
    };
  });
}

function normalizeStartedQuest(directorWorkflow = {}, questCandidates = []) {
  const source = directorWorkflow?.startedQuest ?? directorWorkflow?.lastResult?.questStarted ?? null;
  if (!source) return null;

  const candidateMap = normalizeQuestCandidateMap(questCandidates);
  const actor = candidateMap.get(String(source?.actorId ?? 'party')) ?? null;

  return {
    ...source,
    actorLabel: source?.actorLabel ?? actor?.actorLabel ?? actor?.label ?? 'Gruppe / Party',
    title: source?.title ?? source?.label ?? source?.questTitle ?? source?.questId ?? 'Quest'
  };
}

function inferNextAction({ directorRuntime = {}, questSuggestions = [], socialAdvances = [] } = {}) {
  if (questSuggestions.length > 0) {
    return { label: 'Quest-Vorschlag prÃ¼fen', reason: 'Es liegen neue Quest-VorschlÃ¤ge vor.', action: 'directorAcceptQuestSuggestion' };
  }
  if (Number(directorRuntime?.queuedEventCount ?? 0) > 0) {
    return { label: 'Queue verarbeiten', reason: 'Es warten geplante Ereignisse auf AusfÃ¼hrung.', action: 'directorProcessQueue' };
  }
  if (socialAdvances.length > 0) {
    return { label: 'Social-Auswertung prÃ¼fen', reason: 'Neue Social-Fortschritte wurden erzeugt.', action: 'directorEvaluateSocial' };
  }
  if (Number(directorRuntime?.lessonCount ?? 0) > 0) {
    return { label: 'Unterricht ausfÃ¼hren', reason: 'Im aktuellen Slot ist Unterricht hinterlegt.', action: 'directorRunLesson' };
  }
  return { label: 'Tageslauf fortsetzen', reason: 'Keine offenen PrioritÃ¤ten erkannt.', action: 'directorRunbookNext' };
}

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
  const steps = [
    { id: 'queue', label: 'Queue', value: Number(directorRuntime?.queuedEventCount ?? 0) },
    { id: 'lessons', label: 'Lessons', value: Number(directorRuntime?.lessonCount ?? 0) },
    { id: 'quests', label: 'Quests', value: Number(directorRuntime?.activeQuestCount ?? 0) }
  ];

  return {
    steps,
    suggestedAction: directorWorkflow?.nextAction ?? directorWorkflow?.suggestedAction ?? inferNextAction({ directorRuntime, questSuggestions: directorWorkflow?.questSuggestions ?? [], socialAdvances: directorWorkflow?.socialAdvances ?? [] }),
    moodSuggestion: directorWorkflow?.moodSuggestion ?? { moodLabel: 'Neutral' }
  };
}

export function buildDirectorWorkflowView({ directorWorkflow, directorRuntime, engine, questCandidates }) {
  const socialAdvances = normalizeSocialAdvances(directorWorkflow);
  const questSuggestions = normalizeQuestSuggestions(directorWorkflow, questCandidates);
  const startedQuest = normalizeStartedQuest(directorWorkflow, questCandidates);
  const nextAction = directorWorkflow?.nextAction
    ?? directorWorkflow?.suggestedAction
    ?? inferNextAction({ directorRuntime, questSuggestions, socialAdvances });
  const history = Array.isArray(directorWorkflow?.history) ? directorWorkflow.history : [];

  return {
    socialAdvances,
    questSuggestions,
    startedQuest,
    history,
    nextAction,
    suggestedAction: nextAction,
    moodSuggestion: directorWorkflow?.moodSuggestion ?? { moodLabel: 'Neutral' },
    lastAction: directorWorkflow?.lastAction ?? null,
    lastRunAt: directorWorkflow?.lastRunAt ?? null,
    lastError: directorWorkflow?.lastError ?? null
  };
}