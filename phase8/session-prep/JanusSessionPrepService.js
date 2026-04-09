import { JanusSlotResolver } from '../../academy/slot-resolver.js';
import { JanusContentSuggestionService } from '../on-the-fly/JanusContentSuggestionService.js';
import { STATE_PATHS } from '../../core/common.js';
import JanusAssetResolver from '../../core/services/asset-resolver.js';

export class JanusSessionPrepService {
  constructor({ engine, logger } = {}) {
    this.engine = engine ?? globalThis.game?.janus7 ?? null;
    this.logger = logger ?? this.engine?.core?.logger ?? console;
    this._moduleJsonCache = new Map();
  }

  async buildReport({ horizonSlots = 3 } = {}) {
    const engine = this.engine ?? globalThis.game?.janus7 ?? null;
    const state = engine?.core?.state?.get?.() ?? {};
    const academyData = engine?.academy?.data ?? null;
    const calendar = engine?.academy?.calendar ?? null;
    const quests = engine?.academy?.quests ?? null;
    const diagnostics = engine?.diagnostics ?? null;
    const resolver = new JanusSlotResolver({ academyData, logger: this.logger, maxLessonsPerSlot: 2 });

    const slotRef = calendar?.getCurrentSlotRef?.() ?? {
      year: state?.time?.year ?? null,
      trimester: state?.time?.trimester ?? null,
      week: state?.time?.week ?? null,
      day: state?.time?.day ?? state?.time?.dayName ?? null,
      phase: state?.time?.phase ?? state?.time?.slotName ?? null,
      dayIndex: state?.time?.dayIndex ?? null,
      slotIndex: state?.time?.slotIndex ?? null,
    };

    const currentSlot = slotRef?.day && slotRef?.phase ? await resolver.resolveSlot(slotRef) : { lessons: [], exams: [], events: [], meta: { reason: 'no-slot' } };
    const currentCast = this._collectNpcCastForSlot({ slot: currentSlot, academyData });
    const upcoming = await this._collectUpcomingSlots({ resolver, calendar, slotRef, horizonSlots, academyData });
    const questsSummary = this._collectOpenQuests({ quests, academyData });
    const activeLocation = this._collectActiveLocation({ state, academyData });
    const diagnosticsSummary = await this._collectDiagnostics({ diagnostics });
    const suggestedMoods = this._collectSuggestedMoods({ engine, slotRef, currentSlot, activeLocation });
    const sceneChecklist = this._buildSceneChecklist({ engine, academyData, slotRef, currentSlot, currentCast, upcoming, activeLocation, suggestedMoods });
    const prepAgenda = this._buildPrepAgenda({ academyData, slotRef, currentSlot, currentCast, upcoming, sceneChecklist, questsSummary });
    const suggestions = this._buildSuggestions({ slotRef, currentSlot, upcoming, questsSummary, activeLocation, diagnosticsSummary, prepAgenda });
    const worldChronicleEntries = await this._collectWorldChronicleEntries({ academyData, activeLocation, slotRef });
    const chroniclePreview = await this._collectChroniclePreview({ engine, academyData, questsSummary, state, worldChronicleEntries });
    const socialStoryHookQueue = this._collectSocialStoryHookQueue({ state, academyData });
    const chronicleSeed = this._buildChronicleSeed({ slotRef, prepAgenda, chroniclePreview, questsSummary, activeLocation });
    const gradeEntries = this._collectGradeEntries({ engine, academyData });
    const gradeOverview = this._buildGradeOverview({ gradeEntries, academyData });
    const gradeLedger = this._buildGradeLedger({ gradeEntries, slotRef });
    const trimesterGrades = this._buildTrimesterGrades({ gradeEntries, slotRef, academyData });
    const reportCardDrafts = this._buildReportCardDrafts({ gradeEntries, trimesterGrades, slotRef });
    const reportCardExportBundle = this._buildReportCardExportBundle({ reportCardDrafts, trimesterGrades, slotRef });
    const reportCardJournalBundle = this._buildReportCardJournalBundle({ reportCardDrafts, reportCardExportBundle, slotRef });
    const gradeExportSeeds = this._buildGradeExportSeeds({ gradeEntries, trimesterGrades, slotRef });
    const contentSeeds = new JanusContentSuggestionService({ engine, logger: this.logger }).buildSeeds({ slotRef, currentSlot, activeLocation, quests: questsSummary });

    return {
      generatedAt: new Date().toISOString(),
      slotRef,
      currentSlot,
      currentCast,
      upcoming,
      quests: questsSummary,
      activeLocation,
      diagnostics: diagnosticsSummary,
      suggestions,
      suggestedMoods,
      sceneChecklist,
      prepAgenda,
      chroniclePreview,
      socialStoryHookQueue,
      chronicleSeed,
      gradeOverview,
      gradeLedger,
      trimesterGrades,
      reportCardDrafts,
      reportCardExportBundle,
      reportCardJournalBundle,
      gradeExportSeeds,
      contentSeeds,
      meta: {
        horizonSlots,
        questCount: questsSummary.items.length,
        currentCastCount: currentCast.length,
        checklistCount: sceneChecklist.length,
        prepAgendaCount: prepAgenda.length,
        chronicleCount: chroniclePreview.length,
        socialStoryHookCount: socialStoryHookQueue.items.length,
        chronicleSeedLength: chronicleSeed.text.length,
        gradeEntryCount: gradeEntries.length,
        gradeLedgerCount: gradeLedger.items.length,
        trimesterGradeCount: trimesterGrades.items.length,
        reportCardDraftCount: reportCardDrafts.length,
        reportCardExportItemCount: reportCardExportBundle?.summary?.actorCount ?? 0,
        reportCardJournalItemCount: reportCardJournalBundle?.summary?.entryCount ?? 0,
        gradeExportSeedCount: gradeExportSeeds.length,
        warningCount: diagnosticsSummary.warnings.length,
        suggestedMoodCount: suggestedMoods.length,
      }
    };
  }

  async _collectUpcomingSlots({ resolver, calendar, slotRef, horizonSlots, academyData }) {
    const items = [];
    if (!calendar?.config || !slotRef) return items;

    const dayOrder = calendar.config?.dayOrder ?? [];
    const slotOrder = calendar.config?.slotOrder ?? calendar.config?.phaseOrder ?? [];
    const max = Math.max(1, Number(horizonSlots) || 3);

    let dayIndex = Number(slotRef?.dayIndex ?? dayOrder.indexOf(slotRef?.day));
    let slotIndex = Number(slotRef?.slotIndex ?? slotOrder.indexOf(slotRef?.phase));
    let week = Number(slotRef?.week ?? 1);
    let trimester = Number(slotRef?.trimester ?? 1);
    let year = Number(slotRef?.year ?? 1);

    if (!Number.isFinite(dayIndex) || dayIndex < 0) dayIndex = 0;
    if (!Number.isFinite(slotIndex) || slotIndex < 0) slotIndex = 0;

    for (let i = 0; i < max; i++) {
      if (i > 0) {
        slotIndex += 1;
        if (slotIndex >= slotOrder.length) {
          slotIndex = 0;
          dayIndex += 1;
        }
        if (dayIndex >= dayOrder.length) {
          dayIndex = 0;
          week += 1;
        }
      }

      const ref = {
        year,
        trimester,
        week,
        day: dayOrder[dayIndex] ?? slotRef?.day,
        phase: slotOrder[slotIndex] ?? slotRef?.phase,
        dayIndex,
        slotIndex,
      };
      const resolution = await resolver.resolveSlot(ref);
      items.push({
        slotRef: ref,
        lessons: resolution?.lessons ?? [],
        exams: resolution?.exams ?? [],
        events: resolution?.events ?? [],
        cast: this._collectNpcCastForSlot({ slot: resolution, academyData }),
      });
    }

    return items;
  }

  _buildSceneChecklist({ engine, academyData, slotRef, currentSlot, currentCast, upcoming, activeLocation, suggestedMoods }) {
    const items = [];

    const summarizeTitles = (slot = {}) => {
      const names = [
        ...(slot?.lessons ?? []).map((entry) => entry?.title ?? entry?.id).filter(Boolean),
        ...(slot?.exams ?? []).map((entry) => entry?.title ?? entry?.id).filter(Boolean),
        ...(slot?.events ?? []).map((entry) => entry?.title ?? entry?.id).filter(Boolean),
      ];
      return names.slice(0, 3);
    };

    const resolveLocation = (slot = {}, fallbackLocation = null) => {
      const records = [...(slot?.lessons ?? []), ...(slot?.exams ?? []), ...(slot?.events ?? [])];
      for (const record of records) {
        const locationId = String(record?.locationId ?? '').trim();
        if (locationId) {
          const location = academyData?.getLocation?.(locationId) ?? null;
          return {
            id: locationId,
            name: location?.name ?? locationId,
            defaultMoodKey: location?.defaultMoodKey ?? location?.foundry?.defaultMoodKey ?? null,
          };
        }
        const raw = record?.location ?? record?.room ?? record?.place ?? null;
        if (raw) return { id: null, name: String(raw), defaultMoodKey: null };
      }
      return fallbackLocation ? { id: fallbackLocation.id ?? null, name: fallbackLocation.name ?? '—', defaultMoodKey: fallbackLocation.defaultMoodKey ?? null } : null;
    };

    const resolveMoodSummary = ({ localSlotRef, slot, locationSummary, fallbackMoods = [] }) => {
      const controller = engine?.atmosphere?.controller ?? null;
      const locationMood = locationSummary?.id ? controller?.resolveMoodForLocation?.(locationSummary.id) ?? null : null;
      if (locationMood) return { id: locationMood?.id ?? locationMood?.key ?? locationMood?.moodId ?? null, label: locationMood?.name ?? locationMood?.id ?? '—', source: 'location' };

      for (const event of (slot?.events ?? [])) {
        const eventMood = controller?.resolveMoodForEvent?.(event) ?? null;
        if (eventMood) return { id: eventMood?.id ?? eventMood?.key ?? eventMood?.moodId ?? null, label: eventMood?.name ?? eventMood?.id ?? '—', source: 'event' };
      }

      const slotMood = controller?.resolveMoodForSlot?.(localSlotRef) ?? null;
      if (slotMood) return { id: slotMood?.id ?? slotMood?.key ?? slotMood?.moodId ?? null, label: slotMood?.name ?? slotMood?.id ?? '—', source: 'slot' };

      if (Array.isArray(fallbackMoods) && fallbackMoods.length > 0) {
        return { id: fallbackMoods[0]?.id ?? null, label: fallbackMoods[0]?.label ?? '—', source: fallbackMoods[0]?.source ?? 'suggested' };
      }

      if (locationSummary?.defaultMoodKey) return { id: locationSummary.defaultMoodKey, label: locationSummary.defaultMoodKey, source: 'location-default' };
      return { id: null, label: '—', source: null };
    };

    const pushItem = ({ label, localSlotRef, slot, cast, fallbackLocation = null, fallbackMoods = [] }) => {
      const locationSummary = resolveLocation(slot, fallbackLocation);
      const moodSummary = resolveMoodSummary({ localSlotRef, slot, locationSummary, fallbackMoods });
      items.push({
        label,
        slotLabel: `W${localSlotRef?.week ?? '—'} · ${localSlotRef?.day ?? '—'} / ${localSlotRef?.phase ?? '—'}`,
        locationId: locationSummary?.id ?? null,
        locationName: locationSummary?.name ?? '—',
        moodId: moodSummary.id ?? null,
        moodLabel: moodSummary.label,
        moodSource: moodSummary.source,
        castNames: Array.isArray(cast) ? cast.map((entry) => entry?.name).filter(Boolean).slice(0, 4) : [],
        contentTitles: summarizeTitles(slot),
      });
    };

    pushItem({
      label: 'Aktueller Slot',
      localSlotRef: slotRef,
      slot: currentSlot,
      cast: currentCast,
      fallbackLocation: activeLocation,
      fallbackMoods: suggestedMoods,
    });

    for (const [index, nextSlot] of (upcoming ?? []).slice(1, 3).entries()) {
      pushItem({
        label: index === 0 ? 'Nächster Slot' : 'Danach',
        localSlotRef: nextSlot?.slotRef ?? {},
        slot: nextSlot,
        cast: nextSlot?.cast ?? [],
      });
    }

    return items;
  }


  _buildPrepAgenda({ academyData, slotRef, currentSlot, currentCast, upcoming, sceneChecklist, questsSummary }) {
    const agenda = [];
    const slots = [
      { label: 'Jetzt', slotRef, slot: currentSlot, cast: currentCast, checklist: sceneChecklist?.[0] ?? null },
      ...((upcoming ?? []).slice(1, 3).map((slot, index) => ({
        label: index === 0 ? 'Als Naechstes' : 'Danach',
        slotRef: slot?.slotRef ?? {},
        slot,
        cast: slot?.cast ?? [],
        checklist: sceneChecklist?.[index + 1] ?? null,
      })))
    ];

    const activeQuests = Array.isArray(questsSummary?.items) ? questsSummary.items : [];
    const joinTop = (items = [], max = 2) => items.filter(Boolean).slice(0, max).join(', ');
    const formatSlotLabel = (localSlotRef = {}) => `W${localSlotRef?.week ?? '—'} · ${localSlotRef?.day ?? '—'} / ${localSlotRef?.phase ?? '—'}`;
    const normalizeId = (value) => String(value ?? '').trim().toLowerCase();
    const collectStoryThreads = (slot = {}) => {
      const seen = new Set();
      const items = [];
      for (const event of (slot?.events ?? [])) {
        for (const threadId of (Array.isArray(event?.relatedStoryThreads) ? event.relatedStoryThreads : [])) {
          const key = normalizeId(threadId);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          items.push(String(threadId));
        }
      }
      return items;
    };
    const collectQuestMatches = (slot = {}) => {
      const eventIds = new Set((slot?.events ?? []).map((event) => normalizeId(event?.id)).filter(Boolean));
      return activeQuests.filter((quest) => eventIds.has(normalizeId(quest?.currentEventId)));
    };

    const pushAgenda = ({ slotLabel, localSlotRef, checklist, type, title, summary, focus, teacherName = null, lessonId = null, locationId = null, locationName = null, moodId = null, moodLabel = null, detailBadges = [], notes = [], questTitles = [], storyThreads = [], currentEventId = null, actorId = null, narrativePriority = false }) => {
      agenda.push({
        slotLabel,
        timeLabel: formatSlotLabel(localSlotRef),
        type,
        typeLabel: type === 'lesson' ? 'Lektion' : (type === 'exam' ? 'Pruefung' : 'Event'),
        title: title ?? '—',
        summary: summary ?? '',
        focus: focus ?? '',
        teacherName: teacherName ?? null,
        lessonId: lessonId ?? null,
        locationId: locationId ?? checklist?.locationId ?? null,
        locationName: locationName ?? checklist?.locationName ?? '—',
        moodId: moodId ?? checklist?.moodId ?? null,
        moodLabel: moodLabel ?? checklist?.moodLabel ?? '—',
        detailBadges: detailBadges.filter(Boolean).slice(0, 4),
        notes: notes.filter(Boolean).slice(0, 4),
        questTitles: questTitles.filter(Boolean).slice(0, 3),
        storyThreads: storyThreads.filter(Boolean).slice(0, 3),
        currentEventId: currentEventId ?? null,
        actorId: actorId ?? null,
        narrativePriority: !!narrativePriority,
      });
    };

    for (const entry of slots) {
      const slot = entry?.slot ?? {};
      const cast = entry?.cast ?? [];
      const checklist = entry?.checklist ?? null;
      const questMatches = collectQuestMatches(slot);
      const storyThreads = collectStoryThreads(slot);

      const lesson = slot?.lessons?.[0] ?? null;
      if (lesson) {
        const teacherNpcId = String(lesson?.teacherNpcId ?? lesson?.teacherNpcIds?.[0] ?? '').trim();
        const teacher = teacherNpcId ? academyData?.getNpc?.(teacherNpcId) ?? null : null;
        const skills = (lesson?.mechanics?.skills ?? []).map((skill) => skill?.systemSkillId).filter(Boolean);
        const checks = (lesson?.mechanics?.checks ?? []).map((check) => `${check?.type ?? 'Check'}${check?.targetSkillId ? `: ${check.targetSkillId}` : ''}`).filter(Boolean);
        const refs = lesson?.references ?? {};
        pushAgenda({
          slotLabel: entry.label,
          localSlotRef: entry.slotRef,
          checklist,
          type: 'lesson',
          title: lesson?.title ?? lesson?.name ?? lesson?.id ?? 'Lektion',
          summary: lesson?.summary ?? '',
          focus: `Unterrichtsbeat vorbereiten${teacher?.name ? ` mit ${teacher.name}` : ''}.`,
          teacherName: teacher?.name ?? null,
          lessonId: lesson?.id ?? null,
          detailBadges: [
            skills.length ? `Skills: ${joinTop(skills)}` : null,
            checks.length ? `Checks: ${joinTop(checks)}` : null,
            Array.isArray(lesson?.tags) && lesson.tags.length ? `Tags: ${joinTop(lesson.tags)}` : null,
            refs?.libraryItemIds?.length ? `Bibliothek: ${joinTop(refs.libraryItemIds)}` : null,
          ],
          notes: [
            lesson?.durationSlots ? `Dauer: ${lesson.durationSlots} Slot(s)` : null,
            cast.length ? `Besetzung bereit: ${joinTop(cast.map((npc) => npc?.name), 3)}` : null,
            refs?.dsa5RuleRefs?.length ? `Regelbezug: ${joinTop(refs.dsa5RuleRefs)}` : null,
            questMatches.length ? `Narrativer Anschluss: ${joinTop(questMatches.map((quest) => quest?.title), 2)}` : null,
          ],
          questTitles: questMatches.map((quest) => quest?.title),
          storyThreads,
          narrativePriority: questMatches.length > 0 || storyThreads.length > 0,
        });
      }

      const exam = slot?.exams?.[0] ?? null;
      if (exam) {
        const skills = (exam?.mechanics?.skills ?? []).map((skill) => skill?.systemSkillId).filter(Boolean);
        const mode = String(exam?.interaction?.mode ?? exam?.type ?? '').trim();
        const thresholds = exam?.gradingScheme ?? {};
        pushAgenda({
          slotLabel: entry.label,
          localSlotRef: entry.slotRef,
          checklist,
          type: 'exam',
          title: exam?.title ?? exam?.name ?? exam?.id ?? 'Pruefung',
          summary: exam?.summary ?? '',
          focus: mode ? `Pruefungsablauf fuer Modus ${mode} bereitlegen.` : 'Pruefungsablauf und Bewertung vorbereiten.',
          detailBadges: [
            mode ? `Modus: ${mode}` : null,
            skills.length ? `Skills: ${joinTop(skills)}` : null,
            thresholds?.passThreshold != null ? `Bestehen: ${thresholds.passThreshold}` : null,
            thresholds?.excellentThreshold != null ? `Exzellent: ${thresholds.excellentThreshold}` : null,
          ],
          notes: [
            exam?.interaction?.questionSetId ? `Fragensatz: ${exam.interaction.questionSetId}` : null,
            exam?.references?.libraryItemIds?.length ? `Bibliothek: ${joinTop(exam.references.libraryItemIds)}` : null,
            cast.length ? `Besetzung bereit: ${joinTop(cast.map((npc) => npc?.name), 3)}` : null,
            questMatches.length ? `Narrativer Anschluss: ${joinTop(questMatches.map((quest) => quest?.title), 2)}` : null,
          ],
          questTitles: questMatches.map((quest) => quest?.title),
          storyThreads,
          narrativePriority: questMatches.length > 0 || storyThreads.length > 0,
        });
      }

      const event = slot?.events?.[0] ?? null;
      if (event) {
        const primaryQuest = questMatches[0] ?? null;
        const eventFocus = primaryQuest
          ? `Aktive Quest anschliessen: ${primaryQuest.title}. Naechsten Knoten oder Event-Entscheidung vorbereiten.`
          : 'Story-Hook und Reaktionspfade der NSCs kurz vorstrukturieren.';
        pushAgenda({
          slotLabel: entry.label,
          localSlotRef: entry.slotRef,
          checklist,
          type: 'event',
          title: event?.title ?? event?.name ?? event?.id ?? 'Event',
          summary: event?.summary ?? event?.description ?? '',
          focus: eventFocus,
          detailBadges: [
            event?.type ? `Typ: ${event.type}` : null,
            Array.isArray(event?.tags) && event.tags.length ? `Tags: ${joinTop(event.tags)}` : null,
            Array.isArray(event?.relatedStoryThreads) && event.relatedStoryThreads.length ? `Threads: ${joinTop(event.relatedStoryThreads)}` : null,
          ],
          notes: [
            cast.length ? `Besetzung bereit: ${joinTop(cast.map((npc) => npc?.name), 3)}` : null,
            checklist?.moodLabel && checklist?.moodLabel !== '—' ? `Stimmung: ${checklist.moodLabel}` : null,
            checklist?.locationName && checklist?.locationName !== '—' ? `Ort: ${checklist.locationName}` : null,
            primaryQuest?.currentNodeTitle ? `Quest-Knoten: ${primaryQuest.currentNodeTitle}` : null,
          ],
          questTitles: questMatches.map((quest) => quest?.title),
          storyThreads,
          currentEventId: primaryQuest?.currentEventId ?? event?.id ?? null,
          actorId: primaryQuest?.actorId ?? null,
          narrativePriority: questMatches.length > 0 || storyThreads.length > 0,
        });
      }
    }

    return agenda.slice(0, 6);
  }


  async _collectChroniclePreview({ engine, academyData, questsSummary, state = null, worldChronicleEntries = [] }) {
    const rootState = state ?? engine?.core?.state ?? null;
    const entries = [
      ...this._collectQuestChronicleEntries({ state: rootState, academyData, questsSummary }),
      ...this._collectScoringChronicleEntries({ engine, academyData }),
      ...this._collectExamChronicleEntries({ state: rootState, academyData }),
      ...this._collectSocialChronicleEntries({ state: rootState, academyData, questsSummary }),
      ...this._collectResourceChronicleEntries({ state: rootState, academyData }),
      ...this._collectActivityChronicleEntries({ state: rootState, academyData }),
      ...worldChronicleEntries,
    ];

    return entries
      .filter((entry) => entry && entry.title)
      .sort((a, b) => Number(b?.priorityScore ?? 0) - Number(a?.priorityScore ?? 0) || this._chronicleAt(b.at) - this._chronicleAt(a.at))
      .slice(0, 12)
      .map((entry) => ({ ...entry, atLabel: entry?.atLabel ?? this._formatChronicleAt(entry.at) }));
  }

  async _loadModuleJsonData(path) {
    const key = String(path ?? '').trim();
    if (!key) return null;
    if (this._moduleJsonCache.has(key)) return this._moduleJsonCache.get(key);

    const promise = (async () => {
      const response = await fetch(JanusAssetResolver.data(key), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`);
      return response.json();
    })();

    this._moduleJsonCache.set(key, promise);
    try {
      return await promise;
    } catch (err) {
      this._moduleJsonCache.delete(key);
      throw err;
    }
  }

  _deriveRelevantWorldLocations({ academyData, activeLocation, cityRows = [] }) {
    const tokens = new Set();
    const addCityMatches = (value) => {
      const normalized = String(value ?? '').trim().toLowerCase();
      if (!normalized) return;
      for (const row of cityRows) {
        const cityName = String(row?.name ?? '').trim();
        const cityKey = cityName.toLowerCase();
        if (!cityKey) continue;
        if (normalized.includes(cityKey) || cityKey.includes(normalized)) tokens.add(cityName);
      }
    };

    addCityMatches(activeLocation?.name ?? '');

    const locations = typeof academyData?.listLocations === 'function' ? academyData.listLocations() : [];
    for (const location of Array.isArray(locations) ? locations.slice(0, 40) : []) {
      addCityMatches(location?.name ?? '');
    }

    return [...tokens];
  }

  async _collectWorldChronicleEntries({ academyData, activeLocation, slotRef }) {
    const targetYear = Number(slotRef?.year ?? 0);
    if (!Number.isFinite(targetYear) || targetYear <= 0) return [];

    let dailyChronicle;
    let cityLore;
    try {
      [dailyChronicle, cityLore] = await Promise.all([
        this._loadModuleJsonData('events/bote_daily_chronicle.json'),
        this._loadModuleJsonData('world_lore/cities.json'),
      ]);
    } catch (err) {
      this.logger?.warn?.('[JANUS7] SessionPrep: world chronicle load failed', { message: err?.message });
      return [];
    }

    const relevantLocations = this._deriveRelevantWorldLocations({
      academyData,
      activeLocation,
      cityRows: Array.isArray(cityLore?.cities) ? cityLore.cities : [],
    });

    const exactMatches = [];
    const fallbackMatches = [];
    for (const day of (dailyChronicle?.days ?? [])) {
      if (Number(String(day?.date ?? '').slice(0, 4)) !== targetYear) continue;
      for (const entry of (day?.entries ?? [])) {
        if (!entry?.label) continue;
        const mapped = {
          category: 'world',
          icon: 'fa-newspaper',
          at: `${day?.date ?? ''}T00:00:00Z`,
          atLabel: `${day?.date ?? 'unbekannt'} BF`,
          title: `Bote: ${entry.label}`,
          detail: [
            entry?.location ?? null,
            entry?.sourceType === 'curated_anchor' ? 'Kanonanker' : null,
            entry?.sourceType === 'meisterinfo_inferred_date' ? 'Meisterinfo' : null,
            entry?.description ?? null,
          ].filter(Boolean).join(' · '),
          priorityScore: entry?.sourceType === 'curated_anchor' ? 4 : (entry?.sourceType === 'meisterinfo_inferred_date' ? 3 : 1),
        };

        if (relevantLocations.length && relevantLocations.includes(String(entry?.location ?? '').trim())) {
          exactMatches.push(mapped);
        } else if (entry?.sourceType !== 'generated_daily_hook') {
          fallbackMatches.push(mapped);
        }
      }
    }

    return [...exactMatches.slice(0, 4), ...fallbackMatches.slice(0, Math.max(0, 4 - exactMatches.length))];
  }

  _collectQuestChronicleEntries({ state, academyData, questsSummary }) {
    const questRoot = state?.get?.(STATE_PATHS.ACADEMY_QUESTS) ?? state?.get?.(STATE_PATHS.QUEST_STATES) ?? {};
    const questTitleMap = new Map((questsSummary?.items ?? []).map((item) => [String(item?.questId ?? ''), item?.title ?? item?.questId]));
    const currentNodeMap = new Map((questsSummary?.items ?? []).map((item) => [String(item?.questId ?? ''), item?.currentNodeTitle ?? item?.currentNodeId ?? null]));
    const items = [];

    for (const [actorId, quests] of Object.entries(questRoot || {})) {
      for (const [questId, questState] of Object.entries(quests || {})) {
        const title = questTitleMap.get(String(questId)) ?? questId;
        const actorLabel = this._resolveChronicleActorLabel(actorId, academyData);
        if (questState?.startedAt) {
          items.push({
            category: 'quest',
            icon: 'fa-scroll',
            at: questState.startedAt,
            title: `Quest gestartet: ${title}`,
            detail: actorLabel ? `Akteur: ${actorLabel}` : `Quest-ID: ${questId}`,
          });
        }
        const history = Array.isArray(questState?.history) ? questState.history : [];
        const latest = history[history.length - 1] ?? null;
        if (latest?.timestamp) {
          const currentNodeTitle = currentNodeMap.get(String(questId)) ?? questState?.currentNodeId ?? latest?.nodeId ?? '—';
          items.push({
            category: 'quest',
            icon: 'fa-signs-post',
            at: latest.timestamp,
            title: `Quest fortgeschrieben: ${title}`,
            detail: `Aktueller Knoten: ${currentNodeTitle}`,
          });
        }
      }
    }

    return items;
  }

  _collectScoringChronicleEntries({ engine, academyData }) {
    const log = engine?.academy?.scoring?.getAwardLog?.({ limit: 8 }) ?? [];
    return log.map((entry) => {
      const targetType = String(entry?.type ?? '').trim();
      const targetId = String(entry?.target ?? '').trim();
      const targetLabel = targetType === 'circle'
        ? (academyData?.getCircle?.(targetId)?.name ?? targetId)
        : (academyData?.getNpc?.(targetId)?.name ?? targetId);
      const amount = Number(entry?.amount ?? 0);
      const signed = amount > 0 ? `+${amount}` : `${amount}`;
      return {
        category: 'scoring',
        icon: 'fa-trophy',
        at: entry?.ts ?? null,
        title: `${targetType === 'circle' ? 'Zirkelpunkte' : 'Schuelerpunkte'}: ${targetLabel} ${signed}`,
        detail: entry?.reason ? `${entry.reason} (${entry?.source ?? 'manual'})` : `Quelle: ${entry?.source ?? 'manual'}`,
      };
    });
  }

  _collectExamChronicleEntries({ state, academyData }) {
    const root = state?.get?.(STATE_PATHS.ACADEMY_EXAM_RESULTS) ?? {};
    const items = [];
    for (const [actorId, exams] of Object.entries(root || {})) {
      const actorLabel = this._resolveChronicleActorLabel(actorId, academyData);
      for (const [examId, examState] of Object.entries(exams || {})) {
        const attempt = Array.isArray(examState?.attempts) ? examState.attempts[examState.attempts.length - 1] ?? null : null;
        if (!attempt?.timestamp) continue;
        const exam = academyData?.getExam?.(examId) ?? null;
        const title = exam?.name ?? exam?.title ?? examId;
        const scorePart = Number.isFinite(attempt?.score) && Number.isFinite(attempt?.maxScore)
          ? ` (${attempt.score}/${attempt.maxScore})`
          : '';
        items.push({
          category: 'exam',
          icon: 'fa-graduation-cap',
          at: attempt.timestamp,
          title: `Pruefung ${attempt?.status ?? 'unknown'}: ${title}${scorePart}`,
          detail: actorLabel ? `Akteur: ${actorLabel}` : `Exam-ID: ${examId}`,
        });
      }
    }
    return items;
  }

  _buildSocialStoryHookId(entry = {}) {
    return String(`${entry?.category ?? 'social'}:${entry?.fromId ?? 'na'}:${entry?.toId ?? 'na'}:${entry?.at ?? 'na'}:${entry?.title ?? 'event'}`)
      .toLowerCase()
      .replace(/[^a-z0-9:_-]+/g, '-');
  }

  _collectSocialStoryHookQueue({ state, academyData }) {
    const root = state?.academy?.social?.storyHooks ?? {};
    const records = root?.records ?? {};
    const history = Array.isArray(root?.history) ? root.history : [];
    const items = Object.values(records)
      .filter((entry) => entry?.hookId)
      .sort((a, b) => this._chronicleAt(b?.updatedAt ?? b?.queuedAt) - this._chronicleAt(a?.updatedAt ?? a?.queuedAt))
      .slice(0, 8)
      .map((entry) => ({
        hookId: entry?.hookId ?? null,
        title: entry?.title ?? 'Social-Story-Hook',
        detail: entry?.detail ?? '—',
        priorityLabel: entry?.priorityLabel ?? 'Living-World-Dynamik',
        status: entry?.status ?? 'queued',
        statusLabel: entry?.status === 'completed' ? 'Abgeschlossen' : (entry?.status === 'discarded' ? 'Verworfen' : 'Vorgemerkt'),
        isQueued: (entry?.status ?? 'queued') === 'queued',
        isCompleted: entry?.status === 'completed',
        isDiscarded: entry?.status === 'discarded',
        fromName: academyData?.getNpc?.(entry?.fromId)?.name ?? entry?.fromId ?? '—',
        toName: academyData?.getNpc?.(entry?.toId)?.name ?? entry?.toId ?? '—',
        queuedAtLabel: this._formatChronicleAt(entry?.queuedAt ?? null),
        updatedAtLabel: this._formatChronicleAt(entry?.updatedAt ?? null),
      }));

    return {
      items,
      summary: {
        total: items.length,
        recentChanges: history.slice(0, 4).map((entry) => ({
          actionLabel: entry?.actionLabel ?? 'Aktualisiert',
          changedAtLabel: this._formatChronicleAt(entry?.changedAt ?? null),
        })),
      },
    };
  }

  _collectSocialChronicleEntries({ state, academyData, questsSummary }) {
    const root = state?.get?.('academy.social.livingEvents') ?? {};
    const alumniRoot = state?.get?.('academy.alumni') ?? { records: {} };
    const storyHookRoot = state?.get?.('academy.social.storyHooks') ?? { records: {} };
    const history = Array.isArray(root?.history) ? root.history : [];
    const alumniRecords = alumniRoot?.records ?? {};
    const storyHookRecords = storyHookRoot?.records ?? {};
    const questTitles = (questsSummary?.items ?? []).map((entry) => entry?.title).filter(Boolean);

    const getAlumniRecord = (npcId) => alumniRecords?.[String(npcId ?? '').trim()] ?? null;

    return history.slice(0, 6).map((entry) => {
      const fromName = academyData?.getNpc?.(entry?.fromId)?.name ?? entry?.fromName ?? entry?.fromId ?? '—';
      const toName = academyData?.getNpc?.(entry?.toId)?.name ?? entry?.toName ?? entry?.toId ?? '—';
      const delta = Number(entry?.delta ?? 0);
      const deltaLabel = `${delta > 0 ? '+' : ''}${delta}`;
      const hookId = this._buildSocialStoryHookId(entry);
      const fromAlumni = getAlumniRecord(entry?.fromId);
      const toAlumni = getAlumniRecord(entry?.toId);
      const existingHook = storyHookRecords?.[hookId] ?? null;
      const signals = [];
      let priorityScore = 0;

      if (String(entry?.category ?? '').trim() === 'mentor-line') {
        signals.push('Mentorenlinie');
        priorityScore += 2;
      }
      if (String(entry?.category ?? '').trim() === 'peer-rivalry') {
        signals.push('Jahrgangsrivalitaet');
        priorityScore += 1;
      }
      if (fromAlumni?.status === 'mentor' || toAlumni?.status === 'mentor' || fromAlumni?.focus === 'mentor' || toAlumni?.focus === 'mentor') {
        signals.push('Alumni-Mentorbezug');
        priorityScore += 2;
      }
      if (fromAlumni?.status === 'returned' || toAlumni?.status === 'returned' || fromAlumni?.focus === 'return' || toAlumni?.focus === 'return') {
        signals.push('Rueckkehrbezug');
        priorityScore += 1;
      }
      if (questTitles.length && (String(entry?.category ?? '').trim() === 'mentor-line' || String(entry?.category ?? '').trim() === 'peer-rivalry')) {
        signals.push(`Quest-Druck: ${questTitles[0]}`);
        priorityScore += 1;
      }

      return {
        category: 'social',
        icon: 'fa-shuffle',
        at: entry?.at ?? null,
        title: entry?.title ?? 'Autonomes Beziehungs-Event',
        detail: `${fromName} -> ${toName} | ${entry?.category ?? 'npc-network'} | ${deltaLabel}`,
        hookId,
        fromId: entry?.fromId ?? null,
        toId: entry?.toId ?? null,
        priorityScore,
        priorityLabel: signals.length ? signals.join(' · ') : 'Living-World-Dynamik',
        narrativePriority: priorityScore > 0,
        hookQueued: !!existingHook,
        hookStatusLabel: existingHook?.status === 'queued' ? 'Story-Hook vorgemerkt' : null,
      };
    });
  }

  _collectResourceChronicleEntries({ state, academyData }) {
    const resourceCfg = new Map((academyData?.getResourcesConfig?.() ?? []).map((row) => [String(row?.id ?? ''), row]));
    const statCfg = new Map((academyData?.getSchoolStatsConfig?.() ?? []).map((row) => [String(row?.id ?? ''), row]));
    const resourceHistory = Array.isArray(state?.get?.('academy.resourceHistory')) ? state.get('academy.resourceHistory') : [];
    const statHistory = Array.isArray(state?.get?.('academy.schoolStatHistory')) ? state.get('academy.schoolStatHistory') : [];
    return [
      ...resourceHistory.slice(0, 4).map((entry) => {
        const cfg = resourceCfg.get(String(entry?.resourceId ?? '')) ?? null;
        const signed = Number(entry?.delta ?? 0) > 0 ? `+${Number(entry?.delta ?? 0)}` : `${Number(entry?.delta ?? 0)}`;
        return {
          category: 'resource',
          icon: 'fa-box-open',
          at: entry?.at ?? null,
          title: `Ressource: ${cfg?.name ?? cfg?.label ?? entry?.resourceId ?? '—'} ${signed}`,
          detail: entry?.reason ? `${entry.reason} · Stand ${entry?.after ?? '—'}` : `Stand ${entry?.after ?? '—'}`,
        };
      }),
      ...statHistory.slice(0, 4).map((entry) => {
        const cfg = statCfg.get(String(entry?.statId ?? '')) ?? null;
        const signed = Number(entry?.delta ?? 0) > 0 ? `+${Number(entry?.delta ?? 0)}` : `${Number(entry?.delta ?? 0)}`;
        return {
          category: 'school',
          icon: 'fa-chart-line',
          at: entry?.at ?? null,
          title: `Schulstatus: ${cfg?.name ?? cfg?.label ?? entry?.statId ?? '—'} ${signed}`,
          detail: entry?.reason ? `${entry.reason} · Stand ${entry?.after ?? '—'}` : `Stand ${entry?.after ?? '—'}`,
        };
      }),
    ];
  }

  _collectActivityChronicleEntries({ state, academyData }) {
    const history = Array.isArray(state?.get?.('academy.activityHistory')) ? state.get('academy.activityHistory') : [];
    return history.slice(0, 4).map((entry) => {
      const location = academyData?.getLocation?.(entry?.locationId ?? null) ?? null;
      const actorLabel = this._resolveChronicleActorLabel(entry?.actorId ?? null, academyData);
      return {
        category: 'activity',
        icon: 'fa-person-walking',
        at: entry?.at ?? null,
        title: `Aktivitaet: ${location?.name ?? entry?.locationId ?? '—'}`,
        detail: [entry?.activityType ?? null, actorLabel ? `Akteur ${actorLabel}` : null, entry?.targetSkill ? `Skill ${entry.targetSkill}` : null].filter(Boolean).join(' · '),
      };
    });
  }

  _resolveChronicleActorLabel(actorId = null, academyData = null) {
    const id = String(actorId ?? '').trim();
    if (!id) return null;
    return academyData?.getNpc?.(id)?.name ?? game?.actors?.get?.(id)?.name ?? id;
  }

  _chronicleAt(value) {
    if (Number.isFinite(value)) return Number(value);
    const parsed = Date.parse(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  _formatChronicleAt(value) {
    const stamp = this._chronicleAt(value);
    if (!stamp) return '—';
    return new Date(stamp).toISOString();
  }


  _getDefaultGradeSchemeContext(academyData) {
    const schemeId = academyData?.getDefaultGradingSchemeId?.() ?? null;
    const scheme = schemeId ? academyData?.getGradingScheme?.(schemeId) ?? null : null;
    const gradeEntries = [...(Array.isArray(scheme?.grades) ? scheme.grades : [])]
      .sort((a, b) => Number(a?.minScore ?? 0) - Number(b?.minScore ?? 0));
    return {
      schemeId,
      schemeName: scheme?.name ?? '—',
      gradeEntries,
    };
  }

  _pickGradeFromSchemeEntries(schemeEntries, percent) {
    const normalized = Number(percent ?? 0);
    const sorted = [...(Array.isArray(schemeEntries) ? schemeEntries : [])]
      .sort((a, b) => Number(a?.minScore ?? 0) - Number(b?.minScore ?? 0));
    let chosen = sorted[0] ?? null;
    for (const grade of sorted) {
      if (normalized >= Number(grade?.minScore ?? 0)) chosen = grade;
    }
    return chosen;
  }

  _collectGradeEntries({ engine, academyData }) {
    const examsEngine = engine?.academy?.exams ?? null;
    const examRoot = engine?.core?.state?.get?.(STATE_PATHS.ACADEMY_EXAM_RESULTS) ?? {};
    const { schemeId: defaultSchemeId, schemeName: defaultSchemeName, gradeEntries: defaultGradeEntries } = this._getDefaultGradeSchemeContext(academyData);
    const items = [];

    for (const [actorId, exams] of Object.entries(examRoot || {})) {
      const actorName = this._resolveChronicleActorLabel(actorId, academyData) ?? actorId;
      for (const [examId, examState] of Object.entries(exams || {})) {
        const attempts = Array.isArray(examState?.attempts) ? examState.attempts : [];
        const latestAttempt = attempts[attempts.length - 1] ?? null;
        const score = Number(latestAttempt?.score);
        const maxScore = Number(latestAttempt?.maxScore);
        const examDef = academyData?.getExam?.(examId) ?? null;
        const grading = Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
          ? examsEngine?.determineStatusFromScore?.({ score, maxScore, examDef }) ?? null
          : null;
        const percent = grading?.percent ?? (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0
          ? Math.max(0, Math.min(100, (score / maxScore) * 100))
          : null);
        const grade = percent != null ? this._pickGradeFromSchemeEntries(defaultGradeEntries, percent) : null;
        const academicContext = latestAttempt?.meta?.academicContext ?? null;
        items.push({
          actorId,
          actorName,
          examId,
          examTitle: examDef?.name ?? examDef?.title ?? examId,
          attemptedAt: latestAttempt?.timestamp ?? null,
          attemptedAtLabel: this._formatChronicleAt(latestAttempt?.timestamp ?? null),
          statusId: grading?.statusId ?? latestAttempt?.status ?? examState?.status ?? 'unknown',
          statusLabel: grading?.label ?? latestAttempt?.meta?.gradingLabel ?? latestAttempt?.status ?? examState?.status ?? 'Unbekannt',
          percent: percent != null ? Math.round(percent * 10) / 10 : null,
          scoreLabel: Number.isFinite(score) && Number.isFinite(maxScore) ? `${score}/${maxScore}` : '—',
          gradeId: grade?.id ?? null,
          gradeLabel: grade?.name ?? null,
          gradeColor: grade?.color ?? null,
          gradeBonus: Number.isFinite(Number(grade?.bonus)) ? Number(grade.bonus) : null,
          schemeId: defaultSchemeId,
          schemeName: defaultSchemeName,
          academicContext: academicContext ? {
            year: Number.isFinite(Number(academicContext?.year)) ? Number(academicContext.year) : null,
            trimester: Number.isFinite(Number(academicContext?.trimester)) ? Number(academicContext.trimester) : null,
            week: Number.isFinite(Number(academicContext?.week)) ? Number(academicContext.week) : null,
            day: academicContext?.day ?? null,
            phase: academicContext?.phase ?? null,
          } : null,
        });
      }
    }

    return items
      .filter((entry) => entry?.examTitle)
      .sort((a, b) => this._chronicleAt(b.attemptedAt) - this._chronicleAt(a.attemptedAt));
  }

  _buildGradeOverview({ gradeEntries, academyData }) {
    const visible = (gradeEntries ?? []).slice(0, 8);
    const schemeId = visible[0]?.schemeId ?? academyData?.getDefaultGradingSchemeId?.() ?? null;
    const schemeName = visible[0]?.schemeName ?? (schemeId ? academyData?.getGradingScheme?.(schemeId)?.name ?? '—' : '—');
    return {
      schemeId,
      schemeName,
      items: visible,
      summary: {
        total: (gradeEntries ?? []).length,
        excellent: (gradeEntries ?? []).filter((entry) => entry.statusId === 'excellent').length,
        passed: (gradeEntries ?? []).filter((entry) => entry.statusId === 'passed').length,
        failed: (gradeEntries ?? []).filter((entry) => entry.statusId === 'failed').length,
      },
    };
  }

  _buildGradeLedger({ gradeEntries, slotRef }) {
    const targetYear = Number(slotRef?.year ?? 0);
    const targetTrimester = Number(slotRef?.trimester ?? 0);
    const grouped = new Map();

    for (const entry of (gradeEntries ?? [])) {
      const key = String(entry?.actorId ?? '').trim();
      if (!key) continue;
      const bucket = grouped.get(key) ?? { actorId: key, actorName: entry?.actorName ?? key, entries: [] };
      bucket.entries.push(entry);
      grouped.set(key, bucket);
    }

    const items = [...grouped.values()].map((bucket) => {
      const allEntries = [...bucket.entries].sort((a, b) => this._chronicleAt(b.attemptedAt) - this._chronicleAt(a.attemptedAt));
      const periodEntries = allEntries.filter((entry) => Number(entry?.academicContext?.year ?? 0) === targetYear && Number(entry?.academicContext?.trimester ?? 0) === targetTrimester);
      const scopedEntries = periodEntries.length ? periodEntries : allEntries;
      const percents = scopedEntries.map((entry) => entry?.percent).filter((value) => Number.isFinite(value));
      const bonuses = scopedEntries.map((entry) => entry?.gradeBonus).filter((value) => Number.isFinite(value));
      const latest = scopedEntries[0] ?? allEntries[0] ?? null;
      const avgPercent = percents.length ? Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 10) / 10 : null;
      const bonusTotal = bonuses.length ? bonuses.reduce((sum, value) => sum + value, 0) : 0;
      return {
        actorId: bucket.actorId,
        actorName: bucket.actorName,
        scopeLabel: periodEntries.length ? 'aktuelles Trimester' : 'gesamt',
        examsTaken: scopedEntries.length,
        avgPercentLabel: avgPercent != null ? `${avgPercent}%` : '—',
        avgBonusLabel: bonuses.length ? `${bonusTotal > 0 ? '+' : ''}${bonusTotal}` : '0',
        passedCount: scopedEntries.filter((entry) => entry.statusId === 'passed' || entry.statusId === 'excellent').length,
        failedCount: scopedEntries.filter((entry) => entry.statusId === 'failed').length,
        latestExamTitle: latest?.examTitle ?? '—',
        latestStatusLabel: latest?.statusLabel ?? '—',
        latestAttemptedAtLabel: latest?.attemptedAtLabel ?? '—',
        periodTaggedCount: periodEntries.length,
        untaggedCount: allEntries.filter((entry) => !entry?.academicContext?.trimester || !entry?.academicContext?.year).length,
      };
    })
    .sort((a, b) => {
      const aPercent = Number.parseFloat(String(a.avgPercentLabel).replace('%', ''));
      const bPercent = Number.parseFloat(String(b.avgPercentLabel).replace('%', ''));
      const safeA = Number.isFinite(aPercent) ? aPercent : -1;
      const safeB = Number.isFinite(bPercent) ? bPercent : -1;
      return safeB - safeA || b.examsTaken - a.examsTaken || String(a.actorName).localeCompare(String(b.actorName));
    })
    .slice(0, 8);

    return {
      periodLabel: `Jahr ${slotRef?.year ?? '—'} · Trimester ${slotRef?.trimester ?? '—'}`,
      items,
      summary: {
        actorCount: items.length,
        currentTrimesterTagged: items.filter((entry) => entry.periodTaggedCount > 0).length,
      },
    };
  }

  _buildTrimesterGrades({ gradeEntries, slotRef, academyData }) {
    const { schemeId, schemeName, gradeEntries: schemeEntries } = this._getDefaultGradeSchemeContext(academyData);
    const targetYear = Number(slotRef?.year ?? 0);
    const targetTrimester = Number(slotRef?.trimester ?? 0);
    const grouped = new Map();

    for (const entry of (gradeEntries ?? [])) {
      const key = String(entry?.actorId ?? '').trim();
      if (!key) continue;
      const bucket = grouped.get(key) ?? { actorId: key, actorName: entry?.actorName ?? key, entries: [] };
      bucket.entries.push(entry);
      grouped.set(key, bucket);
    }

    const items = [...grouped.values()].map((bucket) => {
      const allEntries = [...bucket.entries].sort((a, b) => this._chronicleAt(b.attemptedAt) - this._chronicleAt(a.attemptedAt));
      const periodEntries = allEntries.filter((entry) => Number(entry?.academicContext?.year ?? 0) === targetYear && Number(entry?.academicContext?.trimester ?? 0) === targetTrimester);
      const scopedEntries = periodEntries.length ? periodEntries : allEntries;
      const percents = scopedEntries.map((entry) => entry?.percent).filter((value) => Number.isFinite(value));
      const avgPercent = percents.length ? Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 10) / 10 : null;
      const finalGrade = avgPercent != null ? this._pickGradeFromSchemeEntries(schemeEntries, avgPercent) : null;
      const latest = scopedEntries[0] ?? allEntries[0] ?? null;
      const evidenceCount = scopedEntries.length;
      const confidenceLabel = periodEntries.length ? 'trimesterbasiert' : 'Fallback gesamt';
      const statusLabel = finalGrade?.id === 'fail'
        ? 'kritisch'
        : (evidenceCount < 2 ? 'vorlaeufig' : 'belastbar');
      return {
        actorId: bucket.actorId,
        actorName: bucket.actorName,
        finalGradeId: finalGrade?.id ?? null,
        finalGradeLabel: finalGrade?.name ?? '—',
        finalBonusLabel: Number.isFinite(Number(finalGrade?.bonus)) ? `${Number(finalGrade.bonus) > 0 ? '+' : ''}${Number(finalGrade.bonus)}` : '0',
        avgPercentLabel: avgPercent != null ? `${avgPercent}%` : '—',
        evidenceLabel: `${evidenceCount} Pruefung(en)`,
        confidenceLabel,
        statusLabel,
        supportingExamsLabel: scopedEntries.slice(0, 3).map((entry) => entry?.examTitle).filter(Boolean).join(', ') || '—',
        latestExamTitle: latest?.examTitle ?? '—',
        latestStatusLabel: latest?.statusLabel ?? '—',
      };
    })
    .sort((a, b) => {
      const aPercent = Number.parseFloat(String(a.avgPercentLabel).replace('%', ''));
      const bPercent = Number.parseFloat(String(b.avgPercentLabel).replace('%', ''));
      const safeA = Number.isFinite(aPercent) ? aPercent : -1;
      const safeB = Number.isFinite(bPercent) ? bPercent : -1;
      return safeB - safeA || String(a.actorName).localeCompare(String(b.actorName));
    })
    .slice(0, 8);

    return {
      schemeId,
      schemeName,
      periodLabel: `Jahr ${slotRef?.year ?? '—'} · Trimester ${slotRef?.trimester ?? '—'}`,
      items,
      summary: {
        actorCount: items.length,
        criticalCount: items.filter((entry) => entry.statusLabel === 'kritisch').length,
        provisionalCount: items.filter((entry) => entry.statusLabel === 'vorlaeufig').length,
      },
    };
  }


  _buildReportCardDrafts({ gradeEntries, trimesterGrades, slotRef }) {
    const targetYear = Number(slotRef?.year ?? 0);
    const targetTrimester = Number(slotRef?.trimester ?? 0);
    const grouped = new Map();

    for (const entry of (gradeEntries ?? [])) {
      const key = String(entry?.actorId ?? '').trim();
      if (!key) continue;
      const bucket = grouped.get(key) ?? { actorId: key, actorName: entry?.actorName ?? key, entries: [] };
      bucket.entries.push(entry);
      grouped.set(key, bucket);
    }

    return (trimesterGrades?.items ?? []).map((gradeEntry) => {
      const bucket = grouped.get(String(gradeEntry?.actorId ?? '').trim()) ?? null;
      const allEntries = [...(bucket?.entries ?? [])].sort((a, b) => this._chronicleAt(b.attemptedAt) - this._chronicleAt(a.attemptedAt));
      const periodEntries = allEntries.filter((entry) => Number(entry?.academicContext?.year ?? 0) === targetYear && Number(entry?.academicContext?.trimester ?? 0) === targetTrimester);
      const scopedEntries = periodEntries.length ? periodEntries : allEntries;
      const bestEntries = [...scopedEntries]
        .sort((a, b) => Number(b?.percent ?? -1) - Number(a?.percent ?? -1))
        .slice(0, 2);
      const weakEntries = [...scopedEntries]
        .filter((entry) => entry?.statusId === 'failed' || Number(entry?.percent ?? 0) < 60)
        .sort((a, b) => Number(a?.percent ?? 101) - Number(b?.percent ?? 101))
        .slice(0, 2);
      const strengths = bestEntries.length
        ? bestEntries.map((entry) => `${entry?.examTitle ?? 'Pruefung'} (${entry?.percent != null ? `${entry.percent}%` : entry?.statusLabel ?? '—'})`)
        : ['Keine belastbaren Spitzenleistungen ableitbar.'];
      const concerns = weakEntries.length
        ? weakEntries.map((entry) => `${entry?.examTitle ?? 'Pruefung'} (${entry?.statusLabel ?? '—'})`)
        : ['Keine akuten Leistungssorgen aus den vorliegenden Pruefungen ableitbar.'];
      const recommendations = [];
      if (gradeEntry?.statusLabel === 'kritisch') {
        recommendations.push('Naechste Pruefung gezielt vorbereiten und Betreuungsbedarf pruefen.');
      }
      if (gradeEntry?.statusLabel === 'vorlaeufig') {
        recommendations.push('Weitere belastbare Leistungsnachweise im aktuellen Trimester sammeln.');
      }
      if (!recommendations.length) {
        recommendations.push('Leistungsniveau halten und auf die naechste Schluesselpruefung vorbereiten.');
      }
      const payload = {
        type: 'janus7.reportCardDraft.v1',
        actorId: gradeEntry?.actorId ?? null,
        actorName: gradeEntry?.actorName ?? '—',
        period: {
          year: Number.isFinite(targetYear) && targetYear > 0 ? targetYear : null,
          trimester: Number.isFinite(targetTrimester) && targetTrimester > 0 ? targetTrimester : null,
          label: trimesterGrades?.periodLabel ?? `Jahr ${slotRef?.year ?? '—'} · Trimester ${slotRef?.trimester ?? '—'}`,
        },
        evaluation: {
          finalGradeId: gradeEntry?.finalGradeId ?? null,
          finalGradeLabel: gradeEntry?.finalGradeLabel ?? '—',
          avgPercentLabel: gradeEntry?.avgPercentLabel ?? '—',
          bonusLabel: gradeEntry?.finalBonusLabel ?? '0',
          statusLabel: gradeEntry?.statusLabel ?? '—',
          confidenceLabel: gradeEntry?.confidenceLabel ?? '—',
          evidenceLabel: gradeEntry?.evidenceLabel ?? '—',
        },
        evidence: scopedEntries.slice(0, 5).map((entry) => ({
          examId: entry?.examId ?? null,
          examTitle: entry?.examTitle ?? '—',
          statusId: entry?.statusId ?? null,
          statusLabel: entry?.statusLabel ?? '—',
          percent: entry?.percent ?? null,
          scoreLabel: entry?.scoreLabel ?? '—',
          attemptedAt: entry?.attemptedAt ?? null,
          attemptedAtLabel: entry?.attemptedAtLabel ?? '—',
        })),
        narrative: {
          strengths,
          concerns,
          recommendations,
        },
      };
      return {
        id: `report-card-draft-${gradeEntry?.actorId ?? 'unknown'}`,
        actorId: gradeEntry?.actorId ?? null,
        actorName: gradeEntry?.actorName ?? '—',
        title: `Zeugnisentwurf · ${gradeEntry?.actorName ?? '—'}`,
        statusLabel: gradeEntry?.statusLabel ?? '—',
        finalGradeLabel: gradeEntry?.finalGradeLabel ?? '—',
        confidenceLabel: gradeEntry?.confidenceLabel ?? '—',
        evidenceLabel: gradeEntry?.evidenceLabel ?? '—',
        payload,
        text: JSON.stringify(payload, null, 2),
      };
    });
  }

  _buildReportCardExportBundle({ reportCardDrafts, trimesterGrades, slotRef }) {
    const items = (reportCardDrafts ?? []).map((draft) => ({
      draftId: draft?.id ?? null,
      actorId: draft?.actorId ?? null,
      actorName: draft?.actorName ?? '—',
      finalGradeLabel: draft?.finalGradeLabel ?? '—',
      statusLabel: draft?.statusLabel ?? '—',
      confidenceLabel: draft?.confidenceLabel ?? '—',
      evidenceLabel: draft?.evidenceLabel ?? '—',
      draft: draft?.payload ?? null,
    }));
    const payload = {
      type: 'janus7.reportCardExportBundle.v1',
      generatedAt: new Date().toISOString(),
      period: {
        year: Number.isFinite(Number(slotRef?.year)) ? Number(slotRef.year) : null,
        trimester: Number.isFinite(Number(slotRef?.trimester)) ? Number(slotRef.trimester) : null,
        label: trimesterGrades?.periodLabel ?? `Jahr ${slotRef?.year ?? '—'} · Trimester ${slotRef?.trimester ?? '—'}`,
      },
      scheme: {
        id: trimesterGrades?.schemeId ?? null,
        name: trimesterGrades?.schemeName ?? '—',
      },
      summary: {
        actorCount: items.length,
        criticalCount: trimesterGrades?.summary?.criticalCount ?? 0,
        provisionalCount: trimesterGrades?.summary?.provisionalCount ?? 0,
      },
      items,
    };
    return {
      id: 'report-card-export-bundle',
      title: 'Zeugnis-/Journal-Export Bundle',
      summary: payload.summary,
      text: JSON.stringify(payload, null, 2),
      payload,
    };
  }

  _buildReportCardJournalBundle({ reportCardDrafts, reportCardExportBundle, slotRef }) {
    const periodLabel = reportCardExportBundle?.payload?.period?.label ?? `Jahr ${slotRef?.year ?? '—'} · Trimester ${slotRef?.trimester ?? '—'}`;
    const entries = (reportCardDrafts ?? []).map((draft) => {
      const payload = draft?.payload ?? {};
      const strengths = Array.isArray(payload?.narrative?.strengths) ? payload.narrative.strengths : [];
      const concerns = Array.isArray(payload?.narrative?.concerns) ? payload.narrative.concerns : [];
      const recommendations = Array.isArray(payload?.narrative?.recommendations) ? payload.narrative.recommendations : [];
      const evidence = Array.isArray(payload?.evidence) ? payload.evidence : [];
      const lines = [
        `# Zeugnisentwurf: ${draft?.actorName ?? '—'}`,
        '',
        `- Zeitraum: ${periodLabel}`,
        `- Finale Note: ${draft?.finalGradeLabel ?? '—'}`,
        `- Status: ${draft?.statusLabel ?? '—'}`,
        `- Belastung: ${draft?.evidenceLabel ?? '—'} | ${draft?.confidenceLabel ?? '—'}`,
        '',
        '## Staerken',
        ...(strengths.length ? strengths.map((entry) => `- ${entry}`) : ['- Keine belastbaren Staerken ableitbar.']),
        '',
        '## Risiken',
        ...(concerns.length ? concerns.map((entry) => `- ${entry}`) : ['- Keine akuten Risiken ableitbar.']),
        '',
        '## Empfehlungen',
        ...(recommendations.length ? recommendations.map((entry) => `- ${entry}`) : ['- Keine Empfehlungen ableitbar.']),
        '',
        '## Pruefungsnachweise',
        ...(evidence.length ? evidence.map((entry) => `- ${entry?.examTitle ?? 'Pruefung'} | ${entry?.scoreLabel ?? '—'}${entry?.percent != null ? ` (${entry.percent}%)` : ''} | ${entry?.statusLabel ?? '—'} | ${entry?.attemptedAtLabel ?? '—'}`) : ['- Keine Nachweise vorhanden.']),
      ];
      return {
        id: `report-card-journal-${draft?.actorId ?? 'unknown'}`,
        actorId: draft?.actorId ?? null,
        actorName: draft?.actorName ?? '—',
        journalName: `Zeugnisse · ${periodLabel}`,
        pageName: `${draft?.actorName ?? '—'} · Trimesterzeugnis`,
        format: 'markdown',
        content: lines.join('\n'),
        flags: {
          janus7: {
            type: 'reportCardJournalPage.v1',
            actorId: draft?.actorId ?? null,
            periodLabel,
          },
        },
      };
    });
    const payload = {
      type: 'janus7.reportCardJournalBundle.v1',
      generatedAt: new Date().toISOString(),
      journalName: `Zeugnisse · ${periodLabel}`,
      period: reportCardExportBundle?.payload?.period ?? {
        year: Number.isFinite(Number(slotRef?.year)) ? Number(slotRef.year) : null,
        trimester: Number.isFinite(Number(slotRef?.trimester)) ? Number(slotRef.trimester) : null,
        label: periodLabel,
      },
      entries,
    };
    return {
      id: 'report-card-journal-bundle',
      title: 'Zeugnis-Journal-Bundle',
      summary: { entryCount: entries.length },
      text: JSON.stringify(payload, null, 2),
      payload,
    };
  }

  _buildGradeExportSeeds({ gradeEntries, trimesterGrades, slotRef }) {
    const targetYear = Number(slotRef?.year ?? 0);
    const targetTrimester = Number(slotRef?.trimester ?? 0);
    const grouped = new Map();

    for (const entry of (gradeEntries ?? [])) {
      const key = String(entry?.actorId ?? '').trim();
      if (!key) continue;
      const bucket = grouped.get(key) ?? { actorId: key, actorName: entry?.actorName ?? key, entries: [] };
      bucket.entries.push(entry);
      grouped.set(key, bucket);
    }

    return (trimesterGrades?.items ?? []).map((gradeEntry) => {
      const bucket = grouped.get(String(gradeEntry?.actorId ?? '').trim()) ?? null;
      const allEntries = [...(bucket?.entries ?? [])].sort((a, b) => this._chronicleAt(b.attemptedAt) - this._chronicleAt(a.attemptedAt));
      const periodEntries = allEntries.filter((entry) => Number(entry?.academicContext?.year ?? 0) === targetYear && Number(entry?.academicContext?.trimester ?? 0) === targetTrimester);
      const scopedEntries = periodEntries.length ? periodEntries : allEntries;
      const attemptLines = scopedEntries.slice(0, 5).map((entry) => {
        const gradePart = entry?.gradeLabel ? ` | Note: ${entry.gradeLabel}` : '';
        return `- ${entry?.examTitle ?? 'Pruefung'} | Ergebnis: ${entry?.scoreLabel ?? '—'}${entry?.percent != null ? ` (${entry.percent}%)` : ''} | Status: ${entry?.statusLabel ?? '—'}${gradePart} | Zeitpunkt: ${entry?.attemptedAtLabel ?? '—'}`;
      });
      const text = [
        'JANUS7 Trimester Grade Seed',
        `Akteur: ${gradeEntry?.actorName ?? '—'}`,
        `Bezugsfenster: ${trimesterGrades?.periodLabel ?? `Jahr ${slotRef?.year ?? '—'} · Trimester ${slotRef?.trimester ?? '—'}`}`,
        `Status: ${gradeEntry?.statusLabel ?? '—'}`,
        `Finale Note: ${gradeEntry?.finalGradeLabel ?? '—'}`,
        `Mittelwert: ${gradeEntry?.avgPercentLabel ?? '—'}`,
        `Bonus: ${gradeEntry?.finalBonusLabel ?? '0'}`,
        `Grundlage: ${gradeEntry?.evidenceLabel ?? '—'} | ${gradeEntry?.confidenceLabel ?? '—'}`,
        `Unterstuetzende Pruefungen: ${gradeEntry?.supportingExamsLabel ?? '—'}`,
        '',
        'Pruefungsverlauf:',
        ...(attemptLines.length ? attemptLines : ['- Keine belastbaren Pruefungseintraege vorhanden.']),
        '',
        'Schreibe daraus einen kompakten Trimesterbericht mit:',
        '- 1 Satz Leistungszusammenfassung',
        '- 1 Satz zu Staerken oder Problemen',
        '- 2 Bullet-Points fuer naechste Foerder- oder Pruefungsschritte',
      ].join('\n');

      return {
        id: `trimester-grade-seed-${gradeEntry?.actorId ?? 'unknown'}`,
        actorId: gradeEntry?.actorId ?? null,
        actorName: gradeEntry?.actorName ?? '—',
        title: `Trimesterbericht Seed · ${gradeEntry?.actorName ?? '—'}`,
        statusLabel: gradeEntry?.statusLabel ?? '—',
        text,
      };
    });
  }

  _buildChronicleSeed({ slotRef, prepAgenda, chroniclePreview, questsSummary, activeLocation }) {
    const socialEntries = (chroniclePreview ?? []).filter((entry) => entry?.category === 'social');
    const header = [
      'JANUS7 Campaign Chronicle Seed',
      `Zeitfenster: Woche ${slotRef?.week ?? '—'} · ${slotRef?.day ?? '—'} / ${slotRef?.phase ?? '—'}`,
      `Aktiver Ort: ${activeLocation?.name ?? '—'}`,
      `Autonome Social-Events: ${socialEntries.length}`,
      '',
    ];

    const agendaLines = (prepAgenda ?? []).slice(0, 4).map((entry) => {
      const questPart = Array.isArray(entry?.questTitles) && entry.questTitles.length ? ` | Quest: ${entry.questTitles.join(', ')}` : '';
      return `- ${entry?.slotLabel ?? 'Slot'} / ${entry?.typeLabel ?? 'Eintrag'}: ${entry?.title ?? '—'} | Fokus: ${entry?.focus ?? '—'}${questPart}`;
    });

    const chronicleLines = (chroniclePreview ?? []).slice(0, 8).map((entry) => {
      return `- [${entry?.category ?? 'entry'}] ${entry?.title ?? '—'} :: ${entry?.detail ?? '—'}`;
    });
    const socialLines = socialEntries.slice(0, 4).map((entry) => {
      const priorityPart = entry?.priorityLabel ? ` | Prioritaet: ${entry.priorityLabel}` : '';
      return `- ${entry?.title ?? 'Social-Event'} :: ${entry?.detail ?? '—'}${priorityPart}`;
    });

    const questLines = (questsSummary?.items ?? []).slice(0, 4).map((quest) => {
      return `- ${quest?.title ?? quest?.questId ?? 'Quest'} | Node: ${quest?.currentNodeTitle ?? quest?.currentNodeId ?? '—'} | Actor: ${quest?.actorId ?? '—'}`;
    });

    const text = [
      ...header,
      'Vorbereitungsagenda:',
      ...(agendaLines.length ? agendaLines : ['- Keine belastbare Agenda vorhanden.']),
      '',
      'Chronik-Vorschau:',
      ...(chronicleLines.length ? chronicleLines : ['- Keine belastbaren Chronik-Eintraege vorhanden.']),
      '',
      'Autonome Social-Dynamiken:',
      ...(socialLines.length ? socialLines : ['- Keine autonomen Social-Events im aktuellen Rueckblick.']),
      '',
      'Offene Quests:',
      ...(questLines.length ? questLines : ['- Keine aktiven Quests.']),
      '',
      'Schreibe daraus eine kurze Sitzungs-Chronik mit:',
      '- 1 Absatz Rueckblick auf die letzten relevanten Ereignisse',
      '- 1 Absatz aktueller Vorbereitungsstand',
      '- 3 Bullet-Points fuer die naechsten wahrscheinlichen Szenen',
    ].join('\n');

    return {
      id: 'campaign-chronicle-seed',
      title: 'Campaign Chronicle Seed',
      text,
    };
  }

  _collectNpcCastForSlot({ slot, academyData }) {
    const items = [];
    const seen = new Set();

    const pushNpc = ({ npcId = null, sourceType = 'slot', sourceLabel = '' } = {}) => {
      const id = String(npcId ?? '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      const npc = academyData?.getNpc?.(id) ?? null;
      items.push({
        npcId: id,
        name: npc?.name ?? id,
        role: npc?.role ?? null,
        actorUuid: npc?.actorUuid ?? null,
        sourceType,
        sourceLabel,
      });
    };

    const collectIds = (record = {}, fields = []) => fields.flatMap((field) => {
      const value = record?.[field];
      if (Array.isArray(value)) return value;
      return value ? [value] : [];
    });

    for (const lesson of (slot?.lessons ?? [])) {
      const ids = collectIds(lesson, ['teacherNpcIds', 'teacherNpcId']);
      for (const npcId of ids) pushNpc({ npcId, sourceType: 'lesson', sourceLabel: lesson?.title ?? lesson?.id ?? 'Lektion' });
    }

    for (const exam of (slot?.exams ?? [])) {
      const ids = collectIds(exam, ['teacherNpcIds', 'teacherNpcId', 'examinerNpcId', 'proctorNpcId', 'npcIds', 'npcId']);
      for (const npcId of ids) pushNpc({ npcId, sourceType: 'exam', sourceLabel: exam?.title ?? exam?.id ?? 'Pruefung' });
    }

    for (const event of (slot?.events ?? [])) {
      const ids = collectIds(event, ['npcIds', 'npcId', 'teacherNpcIds', 'teacherNpcId']);
      for (const npcId of ids) pushNpc({ npcId, sourceType: 'event', sourceLabel: event?.title ?? event?.id ?? 'Event' });
    }

    return items;
  }

  _collectOpenQuests({ quests, academyData }) {
    const items = [];
    const open = quests?.listQuests?.({ status: 'active' }) ?? [];
    for (const entry of open.slice(0, 12)) {
      const questDef = academyData?.content?.by?.quest?.get?.(entry.questId) ?? null;
      const nodeDef = academyData?.content?.by?.node?.get?.(entry.currentNodeId) ?? null;
      items.push({
        actorId: entry.actorId,
        questId: entry.questId,
        title: questDef?.title ?? entry.questId,
        status: entry.status ?? 'active',
        currentNodeId: entry.currentNodeId ?? null,
        currentNodeTitle: nodeDef?.title ?? nodeDef?.eventId ?? entry.currentNodeId ?? null,
        currentEventId: nodeDef?.eventId ?? null,
        startedAt: entry.startedAt ?? null,
      });
    }
    return { total: open.length, items };
  }

  _collectActiveLocation({ state, academyData }) {
    const id = state?.academy?.currentLocationId ?? null;
    const location = id ? academyData?.getLocation?.(id) ?? null : null;
    return {
      id,
      name: location?.name ?? id ?? '—',
      zone: location?.zone ?? null,
      defaultMoodKey: location?.defaultMoodKey ?? location?.foundry?.defaultMoodKey ?? null,
      description: location?.description ?? '',
    };
  }

  _collectSuggestedMoods({ engine, slotRef, currentSlot, activeLocation }) {
    const controller = engine?.atmosphere?.controller ?? null;
    const moods = Array.isArray(controller?.listMoods?.()) ? controller.listMoods() : [];
    const moodMap = new Map(moods.map((m) => [String(m?.id ?? m?.key ?? m?.moodId ?? ''), m]).filter(([id]) => id));
    const status = controller?.status?.() ?? {};
    const items = [];
    const seen = new Set();

    const pushMood = ({ mood = null, moodId = null, source = 'mood', detail = '', unavailableDetail = '' } = {}) => {
      const resolvedMoodId = String(mood?.id ?? mood?.key ?? mood?.moodId ?? moodId ?? '').trim();
      if (!resolvedMoodId || seen.has(resolvedMoodId)) return;
      seen.add(resolvedMoodId);

      const known = mood ?? moodMap.get(resolvedMoodId) ?? null;
      items.push({
        id: resolvedMoodId,
        label: known?.name ?? resolvedMoodId,
        source,
        detail: known ? detail : (unavailableDetail || detail || 'Mood-Key ist aktuell nicht im Atmosphere-Controller geladen.'),
        isActive: resolvedMoodId === String(status?.activeMoodId ?? ''),
        isAvailable: !!known,
      });
    };

    if (status?.activeMoodId) {
      pushMood({
        moodId: status.activeMoodId,
        source: 'active',
        detail: 'Aktuell laufende Stimmung im Systemstatus.'
      });
    }

    if (activeLocation?.id) {
      pushMood({
        mood: controller?.resolveMoodForLocation?.(activeLocation.id) ?? null,
        source: 'location',
        detail: `Automatische Standort-Stimmung fuer ${activeLocation.name}.`
      });
    }

    if (activeLocation?.defaultMoodKey) {
      pushMood({
        moodId: activeLocation.defaultMoodKey,
        source: 'location-default',
        detail: `In ${activeLocation.name} als Default-Mood hinterlegt.`,
        unavailableDetail: `Default-Mood fuer ${activeLocation.name} ist hinterlegt, aber aktuell nicht im Atmosphere-Controller geladen.`
      });
    }

    pushMood({
      mood: controller?.resolveMoodForSlot?.(slotRef) ?? null,
      source: 'slot',
      detail: `Automatische Slot-Stimmung fuer ${slotRef?.day ?? '—'} / ${slotRef?.phase ?? '—'}.`
    });

    for (const event of (currentSlot?.events ?? []).slice(0, 3)) {
      const title = event?.title ?? event?.id ?? 'Event';
      pushMood({
        mood: controller?.resolveMoodForEvent?.(event) ?? null,
        source: 'event',
        detail: `Passend zu ${title}.`
      });
    }

    return items.slice(0, 4);
  }

  async _collectDiagnostics({ diagnostics }) {
    try {
      const report = await (diagnostics?.report?.({ notify: false, verbose: false }) ?? diagnostics?.run?.({ notify: false, verbose: false }));
      return {
        health: report?.health ?? 'unknown',
        warnings: report?.warnings ?? [],
        sections: report?.sections ?? {},
      };
    } catch (_err) {
      return { health: 'unknown', warnings: [], sections: {} };
    }
  }

  _buildSuggestions({ slotRef, currentSlot, upcoming, questsSummary, activeLocation, diagnosticsSummary, prepAgenda }) {
    const suggestions = [];
    const currentCounts = (currentSlot?.lessons?.length ?? 0) + (currentSlot?.exams?.length ?? 0) + (currentSlot?.events?.length ?? 0);

    if (currentCounts > 0) {
      suggestions.push({
        kind: 'now',
        icon: 'fa-play-circle',
        title: 'Aktuellen Slot vorbereiten',
        detail: `Im aktuellen Slot liegen ${currentCounts} Inhalt(e). Prüfe Lehrer, Ort, Handouts und mögliche Würfelproben.`
      });
    } else {
      suggestions.push({
        kind: 'now',
        icon: 'fa-compass',
        title: 'Leerlauf-Slot dramaturgisch füllen',
        detail: 'Aktuell ist kein kanonischer Inhalt hinterlegt. Nutze Quests, freie Szene oder improvisierten Unterricht.'
      });
    }

    if (upcoming.some((s) => (s.exams?.length ?? 0) > 0)) {
      suggestions.push({
        kind: 'exam',
        icon: 'fa-graduation-cap',
        title: 'Prüfung in Reichweite',
        detail: 'Mindestens ein kommender Slot enthält eine Prüfung. Prüfe Fragen, Scoring und Raumzuordnung.'
      });
    }

    if (questsSummary.total > 0) {
      suggestions.push({
        kind: 'quest',
        icon: 'fa-scroll',
        title: 'Offene Quests reviewen',
        detail: `${questsSummary.total} aktive Quest(s) gefunden. Prüfe Node-Status, Fristen und mögliche Anschluss-Szenen.`
      });
    }

    const narrativeHits = Array.isArray(prepAgenda) ? prepAgenda.filter((entry) => entry?.narrativePriority) : [];
    if (narrativeHits.length > 0) {
      suggestions.push({
        kind: 'narrative',
        icon: 'fa-feather-pointed',
        title: 'Narrative Anschluss-Szene vormerken',
        detail: `${narrativeHits.length} vorbereitete Slot-Eintraege tragen Quest- oder Story-Bezug. Diese Szenen zuerst mit Hook und Konsequenz absichern.`
      });
    }

    if (activeLocation?.defaultMoodKey) {
      suggestions.push({
        kind: 'mood',
        icon: 'fa-music',
        title: 'Atmosphäre vorziehen',
        detail: `Für ${activeLocation.name} ist das Mood-Key „${activeLocation.defaultMoodKey}“ hinterlegt. Atmosphere DJ rechtzeitig vorbereiten.`
      });
    }

    if ((diagnosticsSummary?.warnings?.length ?? 0) > 0 || diagnosticsSummary?.health === 'warn' || diagnosticsSummary?.health === 'fail') {
      suggestions.push({
        kind: 'tech',
        icon: 'fa-stethoscope',
        title: 'Technische Warnungen prüfen',
        detail: `Diagnostics melden ${diagnosticsSummary.warnings.length} Warnung(en). Vor Spielstart kurz gegenlesen.`
      });
    }

    suggestions.push({
      kind: 'timeline',
      icon: 'fa-calendar-day',
      title: 'Nächste 2–3 Slots scannen',
      detail: `Aktuelle Zeit: Woche ${slotRef?.week ?? '—'}, ${slotRef?.day ?? '—'} / ${slotRef?.phase ?? '—'}. Bereite Übergänge vor, nicht nur die aktuelle Szene.`
    });

    return suggestions.slice(0, 8);
  }
}

export default JanusSessionPrepService;
