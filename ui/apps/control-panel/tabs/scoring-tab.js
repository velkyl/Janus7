/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @file ui/control-panel/tabs/scoring-tab.js
 * @module janus7/ui
 * @phase 6
 *
 * Scoring Tab
 * - Visual house point bars
 * - Recent awards (history)
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

function _fmtTs(ts) {
  try {
    return new Date(ts).toLocaleString('de-DE');
  } catch {
    return String(ts ?? '');
  }
}

/**
 * Status: legacy / disconnected renderer.
 * Not wired into JanusControlPanelApp v2; kept for audit and possible reuse.
 * @param {object} snap
 * @returns {string}
 */
export function renderScoringTab(snap) {
  const engine = snap.engine;
  const data = engine?.academy?.data;
  const scoring = engine?.simulation?.scoring ?? engine?.academy?.scoring;

  const circles = data?.listCircles?.() ?? [];
  const circleById = new Map(circles.map((c) => [c.id, c]));

  const stateScoring = snap.state?.scoring ?? {};
  const circleScores = stateScoring.circles ?? {};
  const entries = Object.entries(circleScores)
    .map(([id, points]) => ({ id, points: Number(points ?? 0) }))
    .sort((a, b) => b.points - a.points);

  const max = Math.max(1, ...entries.map((e) => e.points));

  const bars = entries
    .map((e) => {
      const c = circleById.get(e.id) ?? null;
      const name = c?.name ?? e.id;
      const color = c?.color ?? c?.primaryColor ?? null;
      const crest = c?.crest ?? c?.icon ?? '';
      const pct = Math.round((e.points / max) * 100);
      return `
        <div class="j7cp-bar-row">
          <div class="j7cp-bar-label">
            <span class="j7cp-house-pill" data-janus-color="${color ? JanusUI.escape(color) : ''}">
              ${crest ? `<span class="j7cp-house-crest">${JanusUI.escape(crest)}</span>` : ''}
              <span>${JanusUI.escape(name)}</span>
            </span>
          </div>
          <div class="j7cp-bar-track">
            <div class="j7cp-bar-fill" data-fill-pct="${pct}"></div>
          </div>
          <div class="j7cp-bar-value">${JanusUI.escape(String(e.points))}</div>
        </div>
      `;
    })
    .join('');

  const history = (stateScoring.lastAwarded ?? [])
    .slice()
    .reverse()
    .slice(0, 12)
    .map((h) => {
      const label = h.targetType === 'circle'
        ? (circleById.get(h.targetId)?.name ?? h.targetId)
        : h.targetId;
      const sign = Number(h.amount) > 0 ? '+' : '';
      return `
        <li>
          <span class="j7cp-history-ts">${JanusUI.escape(_fmtTs(h.timestamp))}</span>
          <span class="j7cp-history-amt">${JanusUI.escape(`${sign}${h.amount}`)}</span>
          <span class="j7cp-history-target">${JanusUI.escape(label)}</span>
          <span class="j7cp-history-reason">${JanusUI.escape(h.reason ?? '')}</span>
        </li>
      `;
    })
    .join('');

  return `
    <div class="j7cp-panel j7cp-scoring">
      <section class="j7cp-section">
        <h3><i class="fas fa-trophy"></i> ${_t('JANUS7.UI.Scoring.HousePoints','Hauspunkte')}</h3>
        ${bars || `<p class="j7cp-muted">${_t('JANUS7.UI.Empty','Keine Daten')}</p>`}
      </section>

      <section class="j7cp-section">
        <h3><i class="fas fa-history"></i> ${_t('JANUS7.UI.Scoring.Recent','Letzte Vergaben')}</h3>
        <ol class="j7cp-history">
          ${history || `<li class="j7cp-muted">${_t('JANUS7.UI.Empty','Keine Daten')}</li>`}
        </ol>
        <p class="j7cp-hint">${_t('JANUS7.UI.Scoring.Hint','Nur die letzten Einträge der scoring.lastAwarded-Historie. Später: Filter, Timeline, Drilldown.')}</p>
      </section>
    </div>
  `;
}

export default renderScoringTab;
