import { JanusSlotResolver } from '../../academy/slot-resolver.js';
import { JanusContentSuggestionService } from '../on-the-fly/JanusContentSuggestionService.js';

export class JanusSessionPrepService {
  constructor({ engine, logger } = {}) {
    this.engine = engine ?? globalThis.game?.janus7 ?? null;
    this.logger = logger ?? this.engine?.core?.logger ?? console;
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
    const suggestions = this._buildSuggestions({ slotRef, currentSlot, upcoming, questsSummary, activeLocation, diagnosticsSummary });
    const suggestedMoods = this._collectSuggestedMoods({ engine, slotRef, currentSlot, activeLocation });
    const sceneChecklist = this._buildSceneChecklist({ engine, academyData, slotRef, currentSlot, currentCast, upcoming, activeLocation, suggestedMoods });
    const prepAgenda = this._buildPrepAgenda({ academyData, slotRef, currentSlot, currentCast, upcoming, sceneChecklist });
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
      contentSeeds,
      meta: {
        horizonSlots,
        questCount: questsSummary.items.length,
        currentCastCount: currentCast.length,
        checklistCount: sceneChecklist.length,
        prepAgendaCount: prepAgenda.length,
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


  _buildPrepAgenda({ academyData, slotRef, currentSlot, currentCast, upcoming, sceneChecklist }) {
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

    const joinTop = (items = [], max = 2) => items.filter(Boolean).slice(0, max).join(', ');
    const formatSlotLabel = (localSlotRef = {}) => `W${localSlotRef?.week ?? '—'} · ${localSlotRef?.day ?? '—'} / ${localSlotRef?.phase ?? '—'}`;

    const pushAgenda = ({ slotLabel, localSlotRef, checklist, type, title, summary, focus, teacherName = null, lessonId = null, locationId = null, locationName = null, moodId = null, moodLabel = null, detailBadges = [], notes = [] }) => {
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
      });
    };

    for (const entry of slots) {
      const slot = entry?.slot ?? {};
      const cast = entry?.cast ?? [];
      const checklist = entry?.checklist ?? null;

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
          ],
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
          ],
        });
      }

      const event = slot?.events?.[0] ?? null;
      if (event) {
        pushAgenda({
          slotLabel: entry.label,
          localSlotRef: entry.slotRef,
          checklist,
          type: 'event',
          title: event?.title ?? event?.name ?? event?.id ?? 'Event',
          summary: event?.summary ?? event?.description ?? '',
          focus: 'Story-Hook und Reaktionspfade der NSCs kurz vorstrukturieren.',
          detailBadges: [
            event?.type ? `Typ: ${event.type}` : null,
            Array.isArray(event?.tags) && event.tags.length ? `Tags: ${joinTop(event.tags)}` : null,
            Array.isArray(event?.relatedStoryThreads) && event.relatedStoryThreads.length ? `Threads: ${joinTop(event.relatedStoryThreads)}` : null,
          ],
          notes: [
            cast.length ? `Besetzung bereit: ${joinTop(cast.map((npc) => npc?.name), 3)}` : null,
            checklist?.moodLabel && checklist?.moodLabel !== '—' ? `Stimmung: ${checklist.moodLabel}` : null,
            checklist?.locationName && checklist?.locationName !== '—' ? `Ort: ${checklist.locationName}` : null,
          ],
        });
      }
    }

    return agenda.slice(0, 6);
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

  _buildSuggestions({ slotRef, currentSlot, upcoming, questsSummary, activeLocation, diagnosticsSummary }) {
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
