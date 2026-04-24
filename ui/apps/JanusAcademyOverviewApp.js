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
      refresh: 'onRefresh',
      selectSlot: 'onSelectSlot',
      setActiveSlot: 'onSetActiveSlot',
      gotoToday: 'onGotoToday',
      openLessonLibrary: 'onOpenLessonLibrary'
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/academy-overview.hbs') }
  };

  constructor(options={}) {
    super(options);
    /** @type {any|null} */
    this._selectedSlotRef = null;
    this._weekContext = {
      year: null,
      trimester: null,
      week: null,
      dayOrder: [],
      slotOrder: [],
      slotRefNow: null,
      entriesByDay: new Map(),
      grid: [],
      selectedDetails: null
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['janus7StateChanged', 'janus7DateChanged']);

    // Doppelklick auf Zeitslot ? als aktiven Slot setzen
    this.element?.querySelectorAll?.('[data-action="selectSlot"]').forEach((cell) => {
      cell.addEventListener('dblclick', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.onSetActiveSlot(ev, cell);
      });
    });
  }

  async onRefresh(_event, _target) {
    this.refresh();
  }

  async onGotoToday(_event, _target) {
    const engine = game.janus7;
    const slotRef = engine?.academy?.calendar?.getCurrentSlotRef?.();
    this._selectedSlotRef = slotRef ?? null;
    this.refresh();
  }

  async onOpenLessonLibrary(_event, _target) {
    try {
      return game?.janus7?.ui?.open?.('lessonLibrary');
    } catch (err) {
      this._getLogger?.().warn?.('JANUS7 onOpenLessonLibrary failed', err);
      ui.notifications?.error?.('JANUS7: Lesson Library konnte nicht geöffnet werden.');
      return null;
    }
  }

  async onSelectSlot(event, target) {
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
   * Mappt day/phase (Strings) ? dayIndex/slotIndex via calendar.config.
   */
  async onSetActiveSlot(event, target) {
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

  async _preRender(options) {
    await super._preRender?.(options);
    this.#prefetchWeekContext();
  }

  _prepareContext(_options) {
    const engine = game.janus7;
    const calendar = engine?.academy?.calendar;
    if (!engine || !calendar) {
      return { notReady: true };
    }

    return {
      notReady: false,
      isGM: game.user?.isGM ?? false,
      weekInfo: {
        year: this._weekContext.year,
        trimester: this._weekContext.trimester,
        week: this._weekContext.week
      },
      dayOrder: this._weekContext.dayOrder,
      slotOrder: this._weekContext.slotOrder,
      grid: this._weekContext.grid,
      selected: this._weekContext.selectedDetails
    };
  }

  #prefetchWeekContext() {
    const engine = game.janus7;
    const calendar = engine?.academy?.calendar;
    const academyData = engine?.academy?.data;

    if (!engine || !calendar) {
      this._weekContext = {
        year: null,
        trimester: null,
        week: null,
        dayOrder: [],
        slotOrder: [],
        slotRefNow: null,
        entriesByDay: new Map(),
        grid: [],
        selectedDetails: null
      };
      return;
    }

    const slotRefNow = calendar.getCurrentSlotRef?.() ?? null;
    const time = engine.core?.state?.get?.('time') ?? engine.core?.state?.get?.()?.time ?? {};
    const year = Number(time?.year ?? slotRefNow?.year ?? 1044);
    const trimester = Number(time?.trimester ?? slotRefNow?.trimester ?? 1);
    const week = Number(time?.week ?? slotRefNow?.week ?? 1);

    const dayOrder = calendar.config?.dayOrder ?? [];
    const slotOrder = calendar.config?.slotOrder ?? calendar.config?.phaseOrder ?? [];

    const entriesByDay = new Map(
      dayOrder.map((day) => [
        String(day),
        calendar.getCalendarEntriesForDay?.({ year, trimester, week, day }) ?? []
      ])
    );

    const grid = slotOrder.map((phase) => ({
      phase,
      cells: dayOrder.map((day) => this.#buildGridCell({
        year,
        trimester,
        week,
        day,
        phase,
        slotRefNow,
        academyData,
        entries: entriesByDay.get(String(day)) ?? []
      }))
    }));

    const selected = this._selectedSlotRef ?? slotRefNow;
    const selectedEntries = selected ? (entriesByDay.get(String(selected.day)) ?? []) : [];
    const selectedEntry = selected
      ? selectedEntries.find((entry) => String(entry.phase) === String(selected.phase)) ?? null
      : null;

    this._weekContext = {
      year,
      trimester,
      week,
      dayOrder,
      slotOrder,
      slotRefNow,
      entriesByDay,
      grid,
      selectedDetails: selected ? {
        slotRef: selected,
        entry: selectedEntry,
        entryJson: selectedEntry ? JSON.stringify(selectedEntry, null, 2) : ''
      } : null
    };
  }

  #buildGridCell({ year, trimester, week, day, phase, slotRefNow, academyData, entries }) {
    const entry = entries.find((candidate) => String(candidate.phase) === String(phase)) ?? null;

    let label = '—';
    let kind = 'empty';

    if (entry) {
      kind = entry.type ?? 'entry';
      const lessonId = entry.lessonId ?? entry.lesson ?? entry.refLessonId;
      const examId = entry.examId ?? entry.exam ?? entry.refExamId;
      const eventId = entry.eventId ?? entry.event ?? entry.refEventId;

      if (lessonId && academyData?.getLesson) {
        label = academyData.getLesson(lessonId)?.title ?? lessonId;
      } else if (examId && academyData?.getExam) {
        label = academyData.getExam(examId)?.title ?? examId;
      } else if (eventId && academyData?.getEvent) {
        label = academyData.getEvent(eventId)?.title ?? eventId;
      } else {
        label = entry.title ?? lessonId ?? examId ?? eventId ?? entry.id ?? 'Eintrag';
      }
    }

    const isNow =
      !!slotRefNow &&
      slotRefNow.year === year &&
      slotRefNow.week === week &&
      String(slotRefNow.day) === String(day) &&
      String(slotRefNow.phase) === String(phase);

    return {
      year,
      trimester,
      week,
      day,
      phase,
      label,
      kind,
      isNow,
      hasEntry: !!entry,
      entryId: entry?.id ?? null
    };
  }
}


