/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/academy-tab.js
 * @module janus7/ui
 * @phase 6
 *
 * Academy Overview Tab
 * - Roster (students)
 * - Week overview (very lightweight visual grid)
 *
 * NOTE:
 * This tab intentionally stays "data-only" – it reads from AcademyDataApi + Calendar facade.
 */

import { JanusUI } from '../../../helpers.js';

function _t(key, fallback) {
  try {
    const v = game?.i18n?.localize?.(key);
    return (v && v !== key) ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @param {object} snap
 * @returns {string}
 */
export function renderAcademyTab(snap) {
  const engine = snap.engine;
  const data = engine?.academy?.data;
  const cal = engine?.calendar ?? engine?.academy?.calendar ?? engine?.simulation?.calendar;
  const slotResolver = engine?.simulation?.slotResolver ?? engine?.academy?.slotResolver;

  const students = data?.listStudents?.() ?? [];
  const circles = data?.listCircles?.() ?? [];

  // Build quick circle lookup for house colors/icons
  const circleById = new Map(circles.map((c) => [c.id, c]));

  // Week grid
  const current = cal?.getCurrentSlotRef?.() ?? snap.state?.time ?? null;
  const weekDays = (data?.getCalendarTemplate?.()?.dayOrder) || ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const phases = (data?.getCalendarTemplate?.()?.phases) || ['morning','midday','afternoon'];

  const cells = [];
  for (const day of weekDays) {
    const col = [];
    for (const phase of phases) {
      const slotRef = {
        year: current?.year,
        trimester: current?.trimester,
        week: current?.week,
        day,
        phase,
      };
      const res = slotResolver?.resolveSlot?.(slotRef) ?? null;
      const lessons = res?.lessons ?? [];
      const exams = res?.exams ?? [];
      const events = res?.events ?? [];

      const lessonLabel = lessons[0]?.name ?? lessons[0]?.title ?? null;
      const examLabel = exams[0]?.name ?? null;
      const eventLabel = events[0]?.name ?? null;

      col.push({ day, phase, lessonLabel, examLabel, eventLabel, count: lessons.length + exams.length + events.length });
    }
    cells.push(col);
  }

  const rosterRows = students
    .slice()
    .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'de'))
    .map((s) => {
      const circleId = s?.house ?? s?.circle ?? null;
      const circle = circleId ? circleById.get(circleId) : null;
      const crest = circle?.crest ?? circle?.icon ?? null;
      const color = circle?.color ?? circle?.primaryColor ?? null;
      const houseLabel = circle?.name ?? circleId ?? '—';
      return `
        <tr>
          <td class="j7cp-rost-name">${JanusUI.escape(s?.name ?? '—')}</td>
          <td class="j7cp-rost-house">
            <span class="j7cp-house-pill" data-janus-color="${color ? JanusUI.escape(color) : ''}">
              ${crest ? `<span class="j7cp-house-crest">${JanusUI.escape(crest)}</span>` : ''}
              <span>${JanusUI.escape(houseLabel)}</span>
            </span>
          </td>
          <td class="j7cp-rost-year">${JanusUI.escape(String(s?.year ?? '—'))}</td>
          <td class="j7cp-rost-tags">${JanusUI.escape((s?.tags ?? []).join(', '))}</td>
        </tr>
      `;
    })
    .join('');

  const weekHeader = weekDays
    .map((d) => `<th>${JanusUI.escape(_t(`JANUS7.UI.Weekday.${d}`, d))}</th>`)
    .join('');

  const weekBody = phases
    .map((phase, rIdx) => {
      const phaseLabel = _t(`JANUS7.UI.Phase.${phase}`, phase);
      const rowTds = weekDays
        .map((day, cIdx) => {
          const cell = cells[cIdx][rIdx];
          const parts = [cell.lessonLabel, cell.examLabel ? `📝 ${cell.examLabel}` : null, cell.eventLabel ? `✨ ${cell.eventLabel}` : null].filter(Boolean);
          const txt = parts.length ? parts.join('<br>') : '<span class="j7cp-muted">—</span>';
          const isNow = day === current?.day && phase === current?.phase;
          return `<td class="j7cp-week-cell ${isNow ? 'j7cp-week-cell-now' : ''}">${txt}</td>`;
        })
        .join('');
      return `<tr><th class="j7cp-week-phase">${JanusUI.escape(phaseLabel)}</th>${rowTds}</tr>`;
    })
    .join('');

  return `
    <div class="j7cp-panel j7cp-academy">
      <section class="j7cp-section">
        <h3><i class="fas fa-users"></i> ${_t('JANUS7.UI.Academy.Roster','Roster')}</h3>
        <div class="j7cp-table-wrap">
          <table class="j7cp-table j7cp-roster">
            <thead>
              <tr>
                <th>${_t('JANUS7.UI.Academy.Student','Schüler')}</th>
                <th>${_t('JANUS7.UI.Academy.House','Zirkel')}</th>
                <th>${_t('JANUS7.UI.Academy.Year','Jahr')}</th>
                <th>${_t('JANUS7.UI.Academy.Tags','Tags')}</th>
              </tr>
            </thead>
            <tbody>
              ${rosterRows || `<tr><td colspan="4" class="j7cp-muted">${_t('JANUS7.UI.Empty','Keine Daten')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-calendar-week"></i> ${_t('JANUS7.UI.Academy.Week','Wochenübersicht')}</h3>
        <div class="j7cp-table-wrap">
          <table class="j7cp-table j7cp-week">
            <thead>
              <tr>
                <th>${_t('JANUS7.UI.Academy.Phase','Phase')}</th>
                ${weekHeader}
              </tr>
            </thead>
            <tbody>
              ${weekBody}
            </tbody>
          </table>
        </div>
        <p class="j7cp-hint">${_t('JANUS7.UI.Academy.WeekHint','Hinweis: Die Wochenansicht ist bewusst leichtgewichtig (SlotResolver) und wird später zu einer echten Kalender-UI ausgebaut.')}</p>
      </section>
    </div>
  `;
}

export default renderAcademyTab;
