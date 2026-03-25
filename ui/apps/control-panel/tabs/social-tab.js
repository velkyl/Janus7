/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/social-tab.js
 * @module janus7/ui
 * @phase 6
 *
 * Social Tab
 * - Visual-ish relationship list (lightweight, no heavy graph lib)
 * - Weekly event timeline (read-only)
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

function _safeArr(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @param {object} snap
 * @returns {string}
 */
export function renderSocialTab(snap) {
  const engine = snap.engine;
  const data = engine?.academy?.data;
  const cal = engine?.simulation?.calendar ?? engine?.calendar;
  const slotResolver = engine?.simulation?.slotResolver ?? engine?.academy?.slotResolver;

  const students = data?.listStudents?.() ?? [];
  const npcs = engine?.academy?.data?._npcs?.npcs ?? engine?.academy?.data?.npcs ?? []; // defensive
  const byId = new Map(_safeArr(engine?.academy?.data?._npcs?.npcs ?? data?._npcs?.npcs ?? (data?.listTeachers?.() ?? []).concat(students)).map((n)=>[n.id,n]));

  // Pick focus: first student (later: selector)
  const focus = students[0] ?? null;
  const rels = _safeArr(focus?.relations);

  const relRows = rels
    .slice(0, 20)
    .map((r) => {
      const target = byId.get(r?.targetId) ?? null;
      const name = target?.name ?? r?.targetId ?? '—';
      const type = r?.type ?? 'relation';
      const strength = r?.strength ?? r?.value ?? '';
      const note = r?.note ?? '';
      return `
        <div class="j7cp-rel-row">
          <div class="j7cp-rel-type">${JanusUI.escape(String(type))}</div>
          <div class="j7cp-rel-target">${JanusUI.escape(String(name))}</div>
          <div class="j7cp-rel-strength">${JanusUI.escape(String(strength))}</div>
          <div class="j7cp-rel-note">${JanusUI.escape(String(note))}</div>
        </div>
      `;
    })
    .join('');

  // Weekly timeline (events in current week via SlotResolver)
  const current = cal?.getCurrentSlotRef?.() ?? snap.state?.time ?? null;
  const weekDays = (data?.getCalendarTemplate?.()?.dayOrder) || ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const phases = (data?.getCalendarTemplate?.()?.phases) || ['morning','midday','afternoon'];
  const timeline = [];

  for (const day of weekDays) {
    for (const phase of phases) {
      const slotRef = { year: current?.year, trimester: current?.trimester, week: current?.week, day, phase };
      const res = slotResolver?.resolveSlot?.(slotRef) ?? null;
      for (const ev of _safeArr(res?.events)) {
        timeline.push({ day, phase, name: ev?.name ?? ev?.title ?? 'Event', id: ev?.id ?? null });
      }
    }
  }

  const timelineRows = timeline
    .map((e) => {
      const dayLbl = _t(`JANUS7.UI.Weekday.${e.day}`, e.day);
      const phaseLbl = _t(`JANUS7.UI.Phase.${e.phase}`, e.phase);
      return `<li><span class="j7cp-tl-when">${JanusUI.escape(`${dayLbl} / ${phaseLbl}`)}</span> <span class="j7cp-tl-what">✨ ${JanusUI.escape(e.name)}</span></li>`;
    })
    .join('');

  return `
    <div class="j7cp-panel j7cp-social">
      <section class="j7cp-section">
        <h3><i class="fas fa-project-diagram"></i> ${_t('JANUS7.UI.Social.Graph','Sozial-Graph')}</h3>
        <p class="j7cp-hint">${_t('JANUS7.UI.Social.Hint','Aktuell: leichtgewichtige Relation-Liste. Später: echte Graph-Visualisierung + Filter.')}</p>

        <div class="j7cp-social-focus">
          <strong>${_t('JANUS7.UI.Social.Focus','Fokus')}</strong>:
          <span>${JanusUI.escape(focus?.name ?? _t('JANUS7.UI.Empty','Keine Daten'))}</span>
        </div>

        <div class="j7cp-rel-grid">
          <div class="j7cp-rel-row j7cp-rel-head">
            <div>${_t('JANUS7.UI.Social.Type','Typ')}</div>
            <div>${_t('JANUS7.UI.Social.Target','Ziel')}</div>
            <div>${_t('JANUS7.UI.Social.Strength','Stärke')}</div>
            <div>${_t('JANUS7.UI.Social.Note','Notiz')}</div>
          </div>
          ${relRows || `<div class="j7cp-muted">${_t('JANUS7.UI.Empty','Keine Daten')}</div>`}
        </div>
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-stream"></i> ${_t('JANUS7.UI.Social.Timeline','Timeline (Woche)')}</h3>
        <ol class="j7cp-timeline">
          ${timelineRows || `<li class="j7cp-muted">${_t('JANUS7.UI.Empty','Keine Daten')}</li>`}
        </ol>
      </section>
    </div>
  `;
}

export default renderSocialTab;
