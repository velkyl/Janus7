/**
 * @file bridge/dsa5/calendar-sync.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 * Synchronisiert JANUS7-Zeitmodell (Trimester/Woche/Slot) mit dem
 * DSA5-Kalender (DSAWorldCalendar — boronsche Monate/Tage).
 *
 * JANUS7-Zeit ist der Master.
 * DSA5-Kalender ist der Beamer-kompatible Anzeigelayer.
 *
 * Architektur:
 * - Liest/schreibt DSA5-Zeit über game.time und DSAWorldCalendar.
 * - Eigene Zeitrechnung läuft in JanusStateCore (Phase 1).
 * - Diese Klasse ist eine reine Sync-Brücke.
 *
 * DSA5-Bosphoran Kalender:
 *   12 Monate + Namenloser Tag (Index 12)
 *   Monate: Praios(0), Rondra(1), Efferd(2), Travia(3), Boron(4), Hesinde(5),
 *           Firun(6), Tsa(7), Phex(8), Peraine(9), Ingerimm(10), Rahja(11), Namenloser(12)
 *   Tage/Monat: 30 (außer Namenloser = 5)
 */

// ─── DSA5 Bosphoran Monatsnamen ──────────────────────────────────────────────
export const DSA5_MONTHS = Object.freeze([
  'Praios', 'Rondra', 'Efferd', 'Travia', 'Boron', 'Hesinde',
  'Firun', 'Tsa', 'Phex', 'Peraine', 'Ingerimm', 'Rahja', 'Namenloser',
]);

/** Tage pro Monat (Bosonrischen Kalenders). Namenloser = 5 */
export const DSA5_DAYS_PER_MONTH = Object.freeze([30,30,30,30,30,30,30,30,30,30,30,30,5]);

/** Akademiejahr-Startmonat: Praios (0) */
const ACADEMY_YEAR_START_MONTH = 0;
/** Akademiejahr-Starttag */
const ACADEMY_YEAR_START_DAY   = 1;
/** Standardjahr für neue Kampagnen */
const DEFAULT_BASE_YEAR = 1040;

/**
 * DSA5CalendarSync
 *
 * @description
 * Öffentliche API von JANUS7.
 * Konvertiert JANUS7-Zeiteinheiten ↔ DSA5-Bosphoran-Datum.
 *
 * @remarks
 * - Keine Mutation von JANUS7-State (nur Foundry game.time)
 * - DSA5-Kalender wird nur beschrieben wenn GM und Kalender aktiv
 */
export class DSA5CalendarSync {
  /**
   * @param {object} [deps]
   * @param {Console} [deps.logger]
   * @param {number} [deps.baseYear=1040]  - Startjahr der Kampagne (boronisch)
   */
  constructor({ logger, baseYear } = {}) {
    this.logger   = logger ?? console;
    this.baseYear = baseYear ?? DEFAULT_BASE_YEAR;
  }

  // ─── Konvertierung: JANUS7 → DSA5-Datum ─────────────────────────────────

  /**
   * Konvertiert ein JANUS7-Zeitobjekt in ein DSA5-Bosphoran-Datum.
   *
   * @param {{ trimester?: number, week?: number, day?: number, year?: number }} janusTime
   * @returns {{ year: number, month: number, monthName: string, dayOfMonth: number, totalDays: number }}
   */
  janusTimeToDSA5Date(janusTime = {}) {
    const trimester = (janusTime.trimester ?? 1) - 1;  // 0-basiert
    const week      = (janusTime.week ?? 1) - 1;

    // BUG FIX #5: Der State speichert dayIndex (0-basiert), nicht day (Name-String).
    // janusTime.day ist ein Wochentag-Name wie "Efferdstag", KEIN 1-basierter Integer.
    // Korrekte Quelle: dayIndex (0-basiert, direkt verwendbar).
    const dayOffset = Number.isFinite(janusTime.dayIndex)
      ? Number(janusTime.dayIndex)
      : 0;  // Fallback: Wochenanfang

    // BUG FIX #4: janusTime.year ist das ABSOLUTE boronische Jahr (z.B. 1039 BF),
    // KEIN Delta auf baseYear. baseYear + year würde 1040 + 1039 = 2079 ergeben.
    // Korrekte Berechnung: year direkt verwenden, Fallback auf baseYear.
    const year = Number.isFinite(janusTime.year) ? Number(janusTime.year) : this.baseYear;

    // JANUS7: 3 Trimester à ~13 Wochen; ~7 Monate Akademiebetrieb
    // Mapping: 1 Trimester ≈ 4 Monate, Startpunkt = Praios
    const totalAcademyDay = trimester * 117 + week * 7 + dayOffset;

    // Auf Bosphoran-Datum mappen (innerhalb des gegebenen Jahres)
    let remaining = totalAcademyDay;
    let month     = ACADEMY_YEAR_START_MONTH;

    // Verteile totalAcademyDay auf Monate; überroll ins nächste Jahr falls nötig.
    let yearOffset = 0;
    while (remaining >= 0 && month < DSA5_DAYS_PER_MONTH.length) {
      const daysInMonth = DSA5_DAYS_PER_MONTH[month];
      if (remaining < daysInMonth) break;
      remaining -= daysInMonth;
      month++;
      if (month >= DSA5_DAYS_PER_MONTH.length) {
        month = 0;
        yearOffset++;
      }
    }

    const finalYear  = year + yearOffset;
    const dayOfMonth = ACADEMY_YEAR_START_DAY + remaining;
    const totalDays  = this._daysFromEpoch(finalYear, month, dayOfMonth);

    return {
      year:      finalYear,
      month,
      monthName:  DSA5_MONTHS[month] ?? `Monat ${month}`,
      dayOfMonth,
      totalDays,
    };
  }

  /**
   * Konvertiert ein DSA5-Datum zurück in eine JANUS7-Zeitannäherung.
   *
   * @param {{ year: number, month: number, dayOfMonth: number }} dsa5Date
   * @returns {{ trimester: number, week: number, day: number }}
   */
  dsa5DateToJanusTime(dsa5Date) {
    const { year = this.baseYear, month = 0, dayOfMonth = 1 } = dsa5Date;
    const yearDelta = year - this.baseYear;

    // Gesamttage seit Akademiestart
    let totalDays = yearDelta * 365; // Näherung (kein Schaltjahr im Boron-Kalender)
    for (let m = 0; m < month; m++) {
      totalDays += DSA5_DAYS_PER_MONTH[m];
    }
    totalDays += (dayOfMonth - ACADEMY_YEAR_START_DAY);

    const trimester = Math.floor(totalDays / 117) + 1;
    const remaining = totalDays % 117;
    const week      = Math.floor(remaining / 7) + 1;
    const day       = (remaining % 7) + 1;

    return { trimester: Math.max(1, trimester), week: Math.max(1, week), day: Math.max(1, day) };
  }

  // ─── Foundry game.time Integration ──────────────────────────────────────

  /**
   * Schreibt JANUS7-Zeit als Foundry worldTime (Sekunden seit Epoch).
   * GM-only; gibt false zurück wenn kein GM oder kein DSA5-Kalender aktiv.
   *
   * @param {{ trimester?: number, week?: number, day?: number, year?: number }} janusTime
   * @returns {Promise<boolean>}
   */
  async pushToFoundryTime(janusTime) {
    if (!game.user?.isGM) {
      this.logger?.debug?.('[CalendarSync] Nur GM darf game.time schreiben.');
      return false;
    }

    if (!this._isDsa5CalendarActive()) {
      this.logger?.debug?.('[CalendarSync] DSA5-Kalender nicht aktiv, skip.');
      return false;
    }

    try {
      const dsa5Date  = this.janusTimeToDSA5Date(janusTime);
      const worldTime = dsa5Date.totalDays * 86400; // Tage → Sekunden
      await game.time.advance(worldTime - game.time.worldTime);
      this.logger?.info?.(`[CalendarSync] Foundry time → ${dsa5Date.dayOfMonth}. ${dsa5Date.monthName} ${dsa5Date.year}`);
      return true;
    } catch (err) {
      this.logger?.warn?.('[CalendarSync] pushToFoundryTime fehlgeschlagen', { err });
      return false;
    }
  }

  /**
   * Liest die aktuelle Foundry worldTime und konvertiert sie in ein DSA5-Datum.
   *
   * @returns {{ year: number, month: number, monthName: string, dayOfMonth: number } | null}
   */
  readCurrentDSA5Date() {
    if (!this._isDsa5CalendarActive()) return null;
    try {
      const totalDays = Math.floor((game.time?.worldTime ?? 0) / 86400);
      return this._daysToDate(totalDays);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Liefert einen lesbaren Datums-String im Bosphoran-Format.
   * @param {{ year: number, month: number, monthName: string, dayOfMonth: number }} dsa5Date
   * @returns {string}
   */
  formatDSA5Date(dsa5Date) {
    if (!dsa5Date) return '—';
    return `${dsa5Date.dayOfMonth}. ${dsa5Date.monthName} ${dsa5Date.year} BF`;
  }

  /**
   * Registriert einen DSA5-Kalender-Event für ein JANUS7-Ereignis (JournalPage).
   * Schreibt in eine dsacalendar-JournalPage.
   *
   * @param {object} opts
   * @param {string} opts.journalId  - ID oder Name des Kalender-Journals
   * @param {string} opts.title      - Event-Titel
   * @param {string} [opts.content]  - HTML-Beschreibung
   * @param {{ trimester, week, day }} opts.janusTime
   * @param {number} [opts.category=2]  - 0=allgemein, 2=event, 4=milestone
   * @returns {Promise<boolean>}
   */
  async addCalendarEvent({ journalId, title, content = '', janusTime, category = 2 }) {
    if (!game.user?.isGM) return false;

    try {
      const journal = game.journal?.get(journalId) ?? game.journal?.getName(journalId);
      if (!journal) {
        this.logger?.warn?.(`[CalendarSync] Journal nicht gefunden: ${journalId}`);
        return false;
      }

      // Finde die erste dsacalendar-Page
      const page = journal.pages?.find((p) => p.type === 'dsacalendar');
      if (!page) {
        this.logger?.warn?.(`[CalendarSync] Keine dsacalendar-Page in ${journalId}`);
        return false;
      }

      const dsa5Date = this.janusTimeToDSA5Date(janusTime);
      const entryKey = `janus_${Date.now()}_${foundry.utils.randomID(4)}`;

      const existing = page.system?.calendarentries ?? {};
      await page.update({
        'system.calendarentries': {
          ...existing,
          [entryKey]: {
            title,
            content,
            location: 'Akademie',
            from: {
              dayOfMonth: dsa5Date.dayOfMonth,
              month:      dsa5Date.month,
              year:       dsa5Date.year,
              day:        dsa5Date.totalDays,
            },
            category,
            visible:   true,
            recurring: false,
          },
        },
      });

      this.logger?.info?.(`[CalendarSync] Kalender-Event erstellt: ${title}`);
      return true;
    } catch (err) {
      this.logger?.warn?.('[CalendarSync] addCalendarEvent fehlgeschlagen', { err });
      return false;
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** @private */
  _isDsa5CalendarActive() {
    try {
      return game.system?.id === 'dsa5'
        && typeof game.dsa5?.apps?.WorldCalendar !== 'undefined';
    } catch (_e) {
      return false;
    }
  }

  /** @private — Tage seit einer festen Epoche berechnen (Näherung) */
  _daysFromEpoch(year, month, day) {
    const yearDays = (year - 1) * 365; // kein Schaltjahr
    let monthDays = 0;
    for (let m = 0; m < month; m++) monthDays += DSA5_DAYS_PER_MONTH[m];
    return yearDays + monthDays + (day - 1);
  }

  /** @private — Tage → Datum zurückrechnen */
  _daysToDate(totalDays) {
    let remaining = totalDays;
    let year      = 1;

    const daysPerYear = 365;
    year = Math.floor(remaining / daysPerYear) + 1;
    remaining = remaining % daysPerYear;

    let month = 0;
    while (month < DSA5_DAYS_PER_MONTH.length - 1 && remaining >= DSA5_DAYS_PER_MONTH[month]) {
      remaining -= DSA5_DAYS_PER_MONTH[month];
      month++;
    }

    return {
      year,
      month,
      monthName:  DSA5_MONTHS[month],
      dayOfMonth: remaining + 1,
      totalDays:  totalDays,
    };
  }
}
