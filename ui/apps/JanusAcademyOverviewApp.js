import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusAcademyOverviewApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Wochen-/Tagesübersicht des Akademiekalenders.
 * Zeigt ein Grid aus Tagen (Spalten) × Zeitphasen (Zeilen) für die aktuelle Woche.
 * Read-only – Slot-Setzen über Director (kein direktes State-Mutieren).
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';

/**
 * JanusAcademyOverviewApp
 * Wochen-/Tagesübersicht über den Akademiekalender.
 *
 * UI-Regel: read-only + Engine-Calls (keine direkten State-Mutationen).
 */
export class JanusAcademyOverviewApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-academy-overview',
    classes: ['janus7-app', 'janus7-academy-overview'],
    position: { width: 1100, height: 750 },
    window: {
      title: 'JANUS7 · Academy Overview',
      resizable: true,
    },
    actions: {
      refresh: JanusAcademyOverviewApp.onRefresh,
      selectSlot: JanusAcademyOverviewApp.onSelectSlot,
      setActiveSlot: JanusAcademyOverviewApp.onSetActiveSlot,
      gotoToday: JanusAcademyOverviewApp.onGotoToday,
      openLessonLibrary: JanusAcademyOverviewApp.onOpenLessonLibrary
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/academy-overview.hbs') }
  };

  constructor(options={}) {
    super(options);
    /** @type {any|null} */
    this._selectedSlotRef = null;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['janus7StateChanged', 'janus7DateChanged']);

    // Doppelklick auf Zeitslot → als aktiven Slot setzen
    this.element?.querySelectorAll?.('[data-action="selectSlot"]').forEach((cell) => {
      cell.addEventListener('dblclick', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        JanusAcademyOverviewApp.onSetActiveSlot.call(this, ev, cell);
      });
    });
  }

  static async onRefresh(_event, _target) {
    this.refresh();
  }

  static async onGotoToday(_event, _target) {
    const engine = game.janus7;
    const slotRef = engine?.academy?.calendar?.getCurrentSlotRef?.();
    this._selectedSlotRef = slotRef ?? null;
    this.refresh();
  }

  static async onOpenLessonLibrary(_event, _target) {
    try {
      return game?.janus7?.ui?.open?.('lessonLibrary');
    } catch (err) {
      this._getLogger?.().warn?.('JANUS7 onOpenLessonLibrary failed', err);
      ui.notifications?.error?.('JANUS7: Lesson Library konnte nicht geöffnet werden.');
      return null;
    }
  }

  static async onSelectSlot(event, target) {
    event?.preventDefault?.();
    const ds = target?.dataset ?? {};
    const year = Number(ds.year);
    const trimester = Number(ds.trimester);
    const week = Number(ds.week);
    const day = ds.day;
    const phase = ds.phase;

    if (!day || !phase || !Number.isFinite(year) || !Number.isFinite(week)) return;

    this._selectedSlotRef = { year, trimester, week, day, phase };
    this.refresh();
  }

  /**
   * Doppelklick: Zeitslot als aktiven Spielzeitpunkt setzen.
   * Mappt day/phase (Strings) → dayIndex/slotIndex via calendar.config.
   */
  static async onSetActiveSlot(event, target) {
    event?.preventDefault?.();
    const ds = target?.dataset ?? {};
    const day = ds.day;
    const phase = ds.phase;
    if (!day || !phase) return;

    const engine = game.janus7;
    const calendar = engine?.academy?.calendar;
    if (!calendar) return;

    const dayOrder = calendar.config?.dayOrder ?? [];
    const slotOrder = calendar.config?.slotOrder ?? calendar.config?.phaseOrder ?? [];

    const dayIndex = dayOrder.indexOf(day);
    const slotIndex = slotOrder.indexOf(phase);

    if (dayIndex < 0 || slotIndex < 0) {
      this._getLogger().warn?.(`JANUS7 onSetActiveSlot: day="${day}" (idx ${dayIndex}), phase="${phase}" (idx ${slotIndex}) – nicht in config gefunden.`);
      return;
    }

    try {
      await engine.core.director.time.setSlot(dayIndex, slotIndex, { save: true });
      this._selectedSlotRef = { year: Number(ds.year), trimester: Number(ds.trimester), week: Number(ds.week), day, phase };
      this.refresh();
      ui.notifications?.info?.(`Zeitslot gesetzt: ${day} / ${phase}`);
    } catch (err) {
      this._getLogger().error?.('JANUS7 onSetActiveSlot failed', err);
      ui.notifications?.error?.('JANUS7: Slot konnte nicht gesetzt werden.');
    }
  }

  async _prepareContext(_options) {
    const engine = game.janus7;
    const calendar = engine?.academy?.calendar;
    const academyData = engine?.academy?.data;

    if (!engine || !calendar) {
      return { notReady: true };
    }

    const slotRefNow = calendar.getCurrentSlotRef?.() ?? null;
    const time = engine.core?.state?.get?.('time') ?? engine.core?.state?.get?.()?.time ?? {};
    const year = Number(time?.year ?? slotRefNow?.year ?? 1044);
    const trimester = Number(time?.trimester ?? slotRefNow?.trimester ?? 1);
    const week = Number(time?.week ?? slotRefNow?.week ?? 1);

    const dayOrder = calendar.config?.dayOrder ?? [];
    const slotOrder = calendar.config?.slotOrder ?? calendar.config?.phaseOrder ?? [];

    // Build grid: rows = phases, cols = days
    const grid = [];
    for (const phase of slotOrder) {
      const row = { phase, cells: [] };
      for (const day of dayOrder) {
        const entries = calendar.getCalendarEntriesForDay?.({ year, trimester, week, day }) ?? [];
        const entry = entries.find(e => String(e.phase) === String(phase)) ?? null;

        // Resolve display
        let label = '—';
        let kind = 'empty';
        let detail = null;

        if (entry) {
          kind = entry.type ?? 'entry';
          // Common patterns in data: lessonId / examId / eventId
          const lessonId = entry.lessonId ?? entry.lesson ?? entry.refLessonId;
          const examId = entry.examId ?? entry.exam ?? entry.refExamId;
          const eventId = entry.eventId ?? entry.event ?? entry.refEventId;

          if (lessonId && academyData?.getLesson) {
            const lesson = academyData.getLesson(lessonId);
            label = lesson?.title ?? lessonId;
            detail = { type: 'lesson', id: lessonId };
          } else if (examId && academyData?.getExam) {
            const exam = academyData.getExam(examId);
            label = exam?.title ?? examId;
            detail = { type: 'exam', id: examId };
          } else if (eventId && academyData?.getEvent) {
            const ev = academyData.getEvent(eventId);
            label = ev?.title ?? eventId;
            detail = { type: 'event', id: eventId };
          } else {
            label = entry.title ?? lessonId ?? examId ?? eventId ?? entry.id ?? 'Eintrag';
            detail = { type: entry.type ?? 'entry', id: entry.id ?? null };
          }
        }

        const isNow =
          !!slotRefNow &&
          slotRefNow.year === year &&
          slotRefNow.week === week &&
          String(slotRefNow.day) === String(day) &&
          String(slotRefNow.phase) === String(phase);

        row.cells.push({
          year, trimester, week, day, phase,
          label,
          kind,
          isNow,
          hasEntry: !!entry,
          entryId: entry?.id ?? null
        });
      }
      grid.push(row);
    }

    // Selected slot details
    const selected = this._selectedSlotRef ?? slotRefNow;
    let selectedDetails = null;
    if (selected) {
      const entries = calendar.getCalendarEntriesForDay?.(selected) ?? [];
      const entry = entries.find(e => String(e.phase) === String(selected.phase)) ?? null;

      selectedDetails = {
        slotRef: selected,
        entry: entry ?? null,
        entryJson: entry ? JSON.stringify(entry, null, 2) : ''
      };
    }

    return {
      notReady: false,
      isGM: game.user?.isGM ?? false,
      weekInfo: { year, trimester, week },
      dayOrder,
      slotOrder,
      grid,
      selected: selectedDetails
    };
  }
}
