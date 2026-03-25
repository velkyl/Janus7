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
    const upcoming = await this._collectUpcomingSlots({ resolver, calendar, slotRef, horizonSlots });
    const questsSummary = this._collectOpenQuests({ quests, academyData });
    const activeLocation = this._collectActiveLocation({ state, academyData });
    const diagnosticsSummary = await this._collectDiagnostics({ diagnostics });
    const suggestions = this._buildSuggestions({ slotRef, currentSlot, upcoming, questsSummary, activeLocation, diagnosticsSummary });
    const contentSeeds = new JanusContentSuggestionService({ engine, logger: this.logger }).buildSeeds({ slotRef, currentSlot, activeLocation, quests: questsSummary });

    return {
      generatedAt: new Date().toISOString(),
      slotRef,
      currentSlot,
      upcoming,
      quests: questsSummary,
      activeLocation,
      diagnostics: diagnosticsSummary,
      suggestions,
      contentSeeds,
      meta: {
        horizonSlots,
        questCount: questsSummary.items.length,
        warningCount: diagnosticsSummary.warnings.length,
      }
    };
  }

  async _collectUpcomingSlots({ resolver, calendar, slotRef, horizonSlots }) {
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
      });
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
