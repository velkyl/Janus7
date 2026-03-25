/**
 * Director/runtime context helpers for JanusControlPanelApp.
 * Welle 2 extraction step: pure data shaping around director runtime / workflow.
 */

export function getQuestStartCandidates({ peopleView = null, userCharacter = null } = {}) {
  const candidates = [];
  const pushUnique = (uuid, label, source) => {
    const key = String(uuid ?? '').trim();
    if (!key) return;
    if (candidates.some((entry) => entry.uuid === key)) return;
    candidates.push({ uuid: key, label: label ?? key, source });
  };

  const students = peopleView?.students ?? [];
  const teachers = peopleView?.teachers ?? [];
  const npcs = peopleView?.npcs ?? [];
  for (const row of students) pushUnique(row?.uuid, row?.name, 'student');
  const charUuid = userCharacter?.uuid ?? null;
  const charName = userCharacter?.name ?? null;
  if (charUuid) pushUnique(charUuid, charName ?? charUuid, 'user-character');
  for (const row of teachers) pushUnique(row?.uuid, row?.name, 'teacher');
  for (const row of npcs) pushUnique(row?.uuid, row?.name, 'npc');
  if (!candidates.length) pushUnique('party', 'Gruppe / Party', 'fallback');
  return candidates;
}

export function prepareDirectorRuntimeSummary({ engine = null, logger = null } = {}) {
  let directorSummary = {
    slot: null,
    lessonCount: 0,
    eventCount: 0,
    queuedEventCount: 0,
    activeQuestCount: 0,
    lessons: [],
    events: [],
    queuedEvents: [],
    activeQuests: [],
    graph: null,
    available: false,
  };
  try {
    const director = engine?.core?.director ?? engine?.director;
    if (director?.kernel?.getRuntimeSummary) {
      const summary = director.kernel.getRuntimeSummary() ?? {};
      directorSummary = {
        ...directorSummary,
        ...summary,
        available: true,
        lessons: Array.isArray(summary.lessons) ? summary.lessons.slice(0, 5) : [],
        events: Array.isArray(summary.events) ? summary.events.slice(0, 5) : [],
        queuedEvents: Array.isArray(summary.queuedEvents) ? summary.queuedEvents.slice(0, 5) : [],
        activeQuests: Array.isArray(summary.activeQuests) ? summary.activeQuests.slice(0, 5) : [],
      };
    }
  } catch (err) {
    logger?.warn?.('[JANUS7][Director] runtime summary failed', err);
  }
  const directorRuntime = {
    available: !!directorSummary.available,
    lessonCount: Number(directorSummary.lessonCount ?? directorSummary.lessons?.length ?? 0),
    eventCount: Number(directorSummary.eventCount ?? directorSummary.events?.length ?? 0),
    queuedEventCount: Number(directorSummary.queuedEventCount ?? directorSummary.queuedEvents?.length ?? 0),
    activeQuestCount: Number(directorSummary.activeQuestCount ?? directorSummary.activeQuests?.length ?? 0),
    graphNodeCount: Number(directorSummary.graph?.nodeCount ?? 0),
    graphEdgeCount: Number(directorSummary.graph?.edgeCount ?? 0),
    currentLessonId: directorSummary.currentLessonId ?? null,
    queuedEvents: (directorSummary.queuedEvents ?? []).map((entry) => ({
      label: entry?.label ?? entry?.eventId ?? entry?.id ?? 'queued-event',
      type: entry?.type ?? entry?.kind ?? 'event'
    })),
    activeQuests: (directorSummary.activeQuests ?? []).map((entry) => ({
      label: entry?.title ?? entry?.name ?? entry?.questId ?? entry?.id ?? 'quest',
      status: entry?.status ?? 'active'
    })),
  };
  return { directorSummary, directorRuntime };
}

export function buildDirectorRunbookView(directorRuntime = {}, directorWorkflow = {}) {
  const queuePending = Number(directorRuntime?.queuedEventCount ?? 0) > 0;
  const lessonAvailable = Number(directorRuntime?.lessonCount ?? 0) > 0;
  const moodReady = !!directorWorkflow?.moodSuggestion?.moodId;
  const socialCount = Array.isArray(directorWorkflow?.socialAdvances) ? directorWorkflow.socialAdvances.length : 0;
  const questCount = Array.isArray(directorWorkflow?.questSuggestions) ? directorWorkflow.questSuggestions.length : 0;
  const steps = [
    { id: 'daystart', label: 'Tagesstart', action: 'startDirectorDay', status: directorWorkflow?.lastAction === 'Tagesstart' ? 'done' : 'ready', detail: directorWorkflow?.lastAction === 'Tagesstart' ? 'Zuletzt ausgeführt.' : 'Normalisiert Slot und zieht Queue/Social/Quest-Kontext nach.' },
    { id: 'queue', label: 'Queue', action: 'directorProcessQueue', status: queuePending ? 'ready' : 'done', detail: queuePending ? `${directorRuntime.queuedEventCount} Runtime-Events warten.` : 'Keine wartenden Runtime-Events.' },
    { id: 'lesson', label: 'Lesson', action: 'directorRunLesson', status: lessonAvailable ? 'ready' : 'idle', detail: lessonAvailable ? 'Für den aktuellen Slot liegt eine Lesson vor.' : 'Keine Lesson im aktuellen Slot ermittelt.' },
    { id: 'mood', label: 'Stimmung', action: 'directorApplyMood', status: moodReady ? 'ready' : 'idle', detail: moodReady ? `Empfohlen: ${directorWorkflow?.moodSuggestion?.moodLabel ?? directorWorkflow?.moodSuggestion?.moodId}` : 'Keine eindeutige Mood-Empfehlung für Slot/Ort.' },
    { id: 'social', label: 'Social', action: 'directorEvaluateSocial', status: socialCount > 0 ? 'done' : 'ready', detail: socialCount > 0 ? `${socialCount} letzte Fortschritte im Speicher.` : 'Beziehungen prüfen und Fortschritte schreiben.' },
    { id: 'quests', label: 'Quests', action: 'directorGenerateQuests', status: questCount > 0 ? 'done' : 'ready', detail: questCount > 0 ? `${questCount} letzte Quest-Ideen vorhanden.` : 'Neue Quest-Ideen aus Graph/Social aufbauen.' }
  ];
  return { available: true, steps, suggestedAction: directorWorkflow?.nextAction ?? null, moodSuggestion: directorWorkflow?.moodSuggestion ?? null };
}

export function buildDirectorWorkflowView({ directorWorkflow = {}, directorRuntime = {}, engine = null, questCandidates = [] } = {}) {
  const wf = directorWorkflow ?? {};
  const actionLabels = {
    startDirectorDay: 'Tagesstart',
    directorRunLesson: 'Lesson starten',
    directorProcessQueue: 'Queue abarbeiten',
    directorGenerateQuests: 'Quest-Ideen erzeugen',
    directorAcceptQuestSuggestion: 'Quest-Vorschlag übernehmen',
    directorEvaluateSocial: 'Social-Auswertung',
    directorApplyMood: 'Stimmung anwenden',
    directorRunbookNext: 'Empfehlung ausführen',
  };
  const lastAction = wf.lastAction ? (actionLabels[wf.lastAction] ?? wf.lastAction) : null;
  const lastResult = wf.lastResult ?? null;
  const hasError = !!wf.lastError;
  const queueItems = (lastResult?.processed ?? lastResult?.queued?.processed ?? []).map((entry) => ({
    label: entry?.label ?? entry?.eventId ?? entry?.id ?? 'event',
    type: entry?.type ?? entry?.kind ?? 'event',
    status: entry?.error ? 'error' : 'ok'
  }));
  const questActor = questCandidates?.[0] ?? { uuid: 'party', label: 'Gruppe / Party' };
  const academyData = engine?.academy?.data ?? null;
  const questSuggestions = (lastResult?.suggestions ?? lastResult?.quests?.suggestions ?? []).map((entry) => {
    const questId = entry?.quest?.id ?? entry?.id ?? null;
    const questDef = questId ? (academyData?.getQuestIndex?.()?.find?.((row) => String(row?.id ?? '') === String(questId)) ?? null) : null;
    return {
      questId,
      label: entry?.quest?.label ?? entry?.quest?.title ?? questDef?.title ?? entry?.title ?? questId ?? 'quest',
      reason: Array.isArray(entry?.reasons) ? entry.reasons.join(', ') : (entry?.reason ?? 'Kontexttreffer'),
      score: Number(entry?.score ?? 0),
      actorId: questActor.uuid,
      actorLabel: questActor.label,
    };
  });
  const socialAdvances = (lastResult?.advanced ?? lastResult?.social?.advanced ?? []).map((entry) => {
    const linkId = entry?.socialLinkId ?? entry?.id ?? null;
    const linkDef = linkId ? academyData?.getSocialLink?.(linkId) ?? null : null;
    const npcId = linkDef?.npcId ?? entry?.npcId ?? null;
    const npc = npcId ? academyData?.getNpc?.(npcId) ?? null : null;
    const perks = Array.isArray(linkDef?.ranks)
      ? ((linkDef.ranks.find((row) => Number(row?.level) === Number(entry?.rank ?? entry?.newRank ?? entry?.level ?? -1))?.perkIds) ?? [])
      : [];
    return {
      linkId,
      label: npc?.name ?? entry?.label ?? entry?.npcName ?? npcId ?? 'social-link',
      arcana: linkDef?.arcana ?? null,
      rank: entry?.rank ?? entry?.newRank ?? entry?.level ?? null,
      delta: entry?.delta ?? null,
      eventTriggerId: entry?.eventTriggerId ?? null,
      perkCount: perks.length,
      perks: perks.slice(0, 3),
    };
  });
  const lessonResult = lastResult?.lesson ?? (lastResult?.ok && (lastResult?.lesson || lastResult?.lessonId) ? lastResult : null);
  const resultLines = [];
  if (lastResult?.slot?.day || lastResult?.slot?.phase) resultLines.push(`Slot: ${lastResult?.slot?.day ?? '?'} / ${lastResult?.slot?.phase ?? '?'}`);
  if (Array.isArray(lastResult?.queued?.processed)) resultLines.push(`Queue verarbeitet: ${lastResult.queued.processed.length}`);
  if (Array.isArray(lastResult?.processed)) resultLines.push(`Events verarbeitet: ${lastResult.processed.length}`);
  if (Array.isArray(lastResult?.social?.advanced)) resultLines.push(`Social-Fortschritte: ${lastResult.social.advanced.length}`);
  if (Array.isArray(lastResult?.advanced)) resultLines.push(`Social-Fortschritte: ${lastResult.advanced.length}`);
  if (Array.isArray(lastResult?.quests?.suggestions)) resultLines.push(`Quest-Ideen: ${lastResult.quests.suggestions.length}`);
  if (Array.isArray(lastResult?.suggestions)) resultLines.push(`Quest-Ideen: ${lastResult.suggestions.length}`);
  if (lastResult?.questStarted?.title || lastResult?.questStarted?.questId) resultLines.push(`Quest gestartet: ${lastResult?.questStarted?.title ?? lastResult?.questStarted?.questId}`);
  if (lessonResult?.lesson?.title || lessonResult?.lessonId) resultLines.push(`Lesson: ${lessonResult?.lesson?.title ?? lessonResult?.lessonId}`);

  const moodSuggestion = (() => {
    try {
      const controller = engine?.atmosphere?.controller ?? engine?.atmosphere;
      if (!controller) return null;
      const state = engine?.core?.state?.get?.() ?? {};
      const time = state.time ?? {};
      const calendar = engine?.academy?.calendar;
      const slotRef = calendar?.getCurrentSlotRef?.(time) ?? { day: time.day, phase: time.phase };
      const currentLocationId = state?.academy?.currentLocationId ?? null;
      const locationMood = controller.resolveMoodForLocation?.(currentLocationId) ?? null;
      const slotMood = controller.resolveMoodForSlot?.(slotRef) ?? null;
      const mood = locationMood ?? slotMood ?? null;
      const moodId = mood?.id ?? mood?.moodId ?? null;
      if (!moodId) return null;
      return { moodId, moodLabel: mood?.name ?? moodId, source: locationMood ? 'location' : 'slot' };
    } catch (_err) {
      return null;
    }
  })();

  let nextAction = null;
  if (hasError) {
    nextAction = { action: 'refreshPanel', label: 'Panel aktualisieren', reason: 'Letzter Director-Lauf endete mit Fehler. Erst stabilisieren.' };
  } else if ((directorRuntime?.queuedEventCount ?? 0) > 0) {
    nextAction = { action: 'directorProcessQueue', label: 'Queue abarbeiten', reason: `${directorRuntime.queuedEventCount} Runtime-Events warten noch.` };
  } else if ((directorRuntime?.lessonCount ?? 0) > 0 && !lessonResult) {
    nextAction = { action: 'directorRunLesson', label: 'Lesson starten', reason: 'Für den aktuellen Slot liegt eine Lesson vor.' };
  } else if (moodSuggestion && wf.lastAction !== 'directorApplyMood') {
    nextAction = { action: 'directorApplyMood', label: 'Stimmung anwenden', reason: `Atmosphäre-Vorschlag verfügbar: ${moodSuggestion.moodLabel}.` };
  } else if ((directorRuntime?.activeQuestCount ?? 0) === 0 || questSuggestions.length > 0) {
    nextAction = { action: 'directorGenerateQuests', label: 'Quest-Ideen prüfen', reason: questSuggestions.length > 0 ? 'Neue Vorschläge aus dem letzten Lauf vorhanden.' : 'Kein aktiver Quest-Fokus sichtbar.' };
  } else {
    nextAction = { action: 'directorEvaluateSocial', label: 'Social-Auswertung prüfen', reason: 'Tagesfluss ist stabil, jetzt Beziehungen fortschreiben.' };
  }

  return {
    available: true,
    status: hasError ? 'error' : (lastAction ? 'ok' : 'idle'),
    lastAction,
    lastRunAt: wf.lastRunAt ?? null,
    lastError: wf.lastError ?? null,
    resultLines,
    queueItems: queueItems.slice(0, 8),
    questSuggestions: questSuggestions.slice(0, 8),
    socialAdvances: socialAdvances.slice(0, 8),
    lessonResult: lessonResult ? {
      title: lessonResult?.lesson?.title ?? lessonResult?.lessonId ?? 'Lesson',
      teacher: lessonResult?.teacher?.name ?? lessonResult?.teacher?.id ?? '—',
      location: lessonResult?.location?.name ?? lessonResult?.location?.id ?? '—'
    } : null,
    startedQuest: lastResult?.questStarted ? {
      title: lastResult.questStarted.title ?? lastResult.questStarted.questId ?? 'Quest',
      actorLabel: lastResult.questStarted.actorLabel ?? lastResult.questStarted.actorId ?? '—'
    } : null,
    history: (Array.isArray(wf.history) ? wf.history : []).slice(0, 5).map((entry) => ({
      label: actionLabels[entry?.action] ?? entry?.action ?? 'Aktion',
      at: entry?.at ?? null,
      ok: !!entry?.ok,
      detail: entry?.error ?? (entry?.result?.questStarted?.title ?? entry?.result?.lesson?.title ?? entry?.result?.lessonId ?? null)
    })),
    nextAction,
    moodSuggestion,
  };
}

export function buildQuestSuggestionsFallback(engine = null) {
  const st = engine?.core?.state?.get?.() ?? {};
  const time = st.time ?? {};
  const mood = st.atmosphere?.activeMoodId ?? st.atmosphere?.mood ?? 'neutral';
  const day = time.dayName ?? time.day ?? 'Tag';
  const phase = time.phase ?? 'Phase';
  return [
    { title: `Gerücht am ${day} (${phase})`, hook: `Stimmung: „${mood}". Jemand bittet um diskrete Hilfe.` },
    { title: 'Vermisstes Buch', hook: 'In der Bibliothek fehlt ein Werk. Jemand hat es sehr bewusst entfernt.' },
    { title: 'Ort reagiert', hook: 'Beim Betreten eines Ortes kippt die Atmosphäre. Woran liegt es wirklich?' }
  ];
}
