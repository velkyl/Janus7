/**
 * @file ui/apps/JanusScoringViewApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Scoring View: Zirkel- und Schülerpunkte, Award-Log, manuelle Award-Vergabe.
 * Award-Aktionen gehen über den Director (kein direktes State-Mutieren im UI).
 * GM-only für Mutationen; Lesezugriff für alle.
 */
import { MODULE_ID, moduleTemplatePath } from '../../core/common.js';
import { JanusBaseApp } from '../core/base-app.js';
import { JanusUI } from '../helpers.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

/*
 * JANUS7 — Scoring View (Phase 6 UI)
 *
 * Ziel:
 * - Anzeigen: Zirkel- & Schülerpunkte + Award-Log
 * - Vergabe: manuelles Awarding (GM-only) via Director (persistiert sauber)
 */

export class JanusScoringViewApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-scoring-view',
    tag: 'section',
    classes: ['janus7-app', 'janus7', 'app', 'scoring-view'],
    window: {
      title: 'JANUS7 — Scoring',
      resizable: true,
      minimizable: true,
      width: 980,
      height: 740,
    },
    actions: {
      refresh: '_onRefresh',
      createCircle: '_onCreateCircle',
      deleteCircle: '_onDeleteCircle',
      awardCircle: '_onAwardCircle',
      awardStudent: '_onAwardStudent',
    },
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/scoring-view.hbs') },
  };

  /** @override */
  _configureRenderOptions(options) {
    options = super._configureRenderOptions(options ?? {}) ?? (options ?? {});
    options.window ??= {};
    options.window.title = 'JANUS7 — Scoring';
    return options;
  }

  /** @override */
  _prepareContext(options) {
    const engine = game.janus7;
    const academyData = engine?.academy?.data ?? null;
    const scoring = engine?.academy?.scoring ?? engine?.simulation?.scoring ?? null;

    if (!engine || !academyData || !scoring) {
      // Fallback: read directly from state so view shows data even if Phase4 is delayed
      const rawState = engine?.core?.state?.get?.() ?? {};
      const rawScoring = rawState?.scoring ?? {};
      const rawStudents = Object.entries(rawScoring.students ?? {}).map(([id, score]) => ({
        id, score: Number(score ?? 0), name: id
      })).sort((a, b) => b.score - a.score);
      const rawAwards = (rawScoring.lastAwarded ?? []).slice(-20).reverse().map((e) => ({
        type: e.targetType ?? 'student',
        target: e.targetId ?? '',
        targetName: e.targetId ?? '',
        delta: Number(e.amount ?? 0),
        reason: e.reason ?? '',
        ts: e.timestamp ?? null,
        source: e.source ?? 'manual',
      }));
      if (!engine) {
        return { notReady: true, circles: [], students: [], lastAwards: [], pcOptions: [] };
      }
      return {
        notReady: false,
        circles: [],
        students: rawStudents,
        lastAwards: rawAwards,
        pcOptions: rawStudents,
        stateOnly: true,
      };
    }

    const resolvePersonName = (id) => {
      const npc = academyData.getNpc?.(id);
      if (npc?.name) return npc.name;
      // Support legacy / test data that stored Foundry Actor IDs instead of NPC IDs
      const actor = game.actors?.get?.(id);
      if (actor?.name) return actor.name;
      return id;
    };

    // Circles
    const circleScores = (scoring.getCircleScores?.() ?? [])
      .map(({ circleId, score }) => {
        const c = academyData.getCircle?.(circleId);
        return {
          id: circleId,
          name: c?.name ?? circleId,
          score: Number(score ?? 0),
        };
      })
      .sort((a, b) => (b.score - a.score) || a.name.localeCompare(b.name));

    // Students
    const studentScores = (scoring.getStudentScores?.({ topN: 50 }) ?? [])
      .map(({ studentId, score }) => {
        return {
          id: studentId,
          name: resolvePersonName(studentId),
          score: Number(score ?? 0),
        };
      })
      .sort((a, b) => (b.score - a.score) || a.name.localeCompare(b.name));

    // Award log (display friendly)
    const awardLog = (scoring.getAwardLog?.({ limit: 50 }) ?? []).map((e) => {
      const type = e.type ?? 'unknown';
      const targetId = e.target ?? '';
      let targetName = targetId;
      if (type === 'circle') {
        targetName = academyData.getCircle?.(targetId)?.name ?? targetId;
      } else if (type === 'student') {
        targetName = resolvePersonName(targetId);
      }
      return {
        type,
        // Template expects legacy field names `targetName` and `delta`.
        targetName,
        delta: Number(e.amount ?? 0),
        reason: e.reason ?? '',
        ts: e.ts ?? null,
        source: e.source ?? '',
      };
    });

    // Options for awarding (students only)
    const pcs = (academyData.getNpcs?.() ?? []).filter((n) => String(n.role ?? '').toLowerCase() === 'student');
    const pcOptions = pcs
      .map((n) => ({ id: n.id, name: n.name ?? n.id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      notReady: false,
      circles: circleScores,
      students: studentScores,
      lastAwards: awardLog,
      pcOptions,
      snapshots: this._buildSnapshotTrend(scoring),
    };
  }

  async _onRefresh(event, target) {
    event?.preventDefault?.();
    await this.render({ force: true });
  }

  async _onAwardCircle(event, target) {
    event.preventDefault();
    const form = target.closest('form');
    const data = new FormData(form);
    const circleId = String(data.get('circleId') ?? '');
    const amount = Number.parseInt(String(data.get('circleAmount') ?? '0'), 10) || 0;
    const reason = String(data.get('circleReason') ?? '');
    if (!circleId || !amount) return;

    try {
      const director = game.janus7.core.director;
      await director.scoring.addCirclePoints(circleId, amount, reason, { forceSave: true });
      await this.render({ force: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 Scoring awardCircle failed', err);
      ui.notifications?.error?.('JANUS7: Vergabe fehlgeschlagen (Details in Konsole).');
    }
  }

  async _onCreateCircle(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) {
      ui.notifications?.warn?.('Nur der GM kann Zirkel/Häuser anlegen.');
      return;
    }

    const DialogV2 = foundry?.applications?.api?.DialogV2;
    const idInput = 'janus7-create-circle-id';
    const scoreInput = 'janus7-create-circle-initial';
    const content = `
      <div class="j7-dialog-form-col">
        <p class="j7-dialog-text-muted">Legt einen neuen Zirkel/Haus im Scoring-State an. Der Name ist zugleich die ID.</p>
        <div class="j7-dialog-form-row">
          <label class="j7-dialog-label-fixed" for="${idInput}">Name/ID</label>
          <input id="${idInput}" class="j7-dialog-input-grow" type="text" placeholder="z.B. Roter Zirkel" />
        </div>
        <div class="j7-dialog-form-row">
          <label class="j7-dialog-label-fixed" for="${scoreInput}">Startpunkte</label>
          <input id="${scoreInput}" class="j7-dialog-input-number" type="number" value="0" step="1" />
        </div>
      </div>
    `;

    // Dialog input handling: DialogV2 returns a value, but the DOM nodes are not reliable after close.
    // We therefore read values from the prompt result root when possible.
    let circleId = '';
    let initial = 0;

    const readFromRoot = (root) => {
      try {
        const idEl = root?.querySelector?.(`#${idInput}`);
        const scEl = root?.querySelector?.(`#${scoreInput}`);
        const id = (idEl?.value ?? '').trim();
        const sc = Number(scEl?.value ?? 0);
        return { id, sc };
      } catch (_) { return { id: '', sc: 0 }; }
    };

    const assignFromResult = (res) => {
      // Possible shapes (Foundry minor-dependent): HTMLElement, {element}, {html}, or plain object.
      const root = (res instanceof HTMLElement) ? res
        : (res?.element instanceof HTMLElement) ? res.element
        : (res?.html instanceof HTMLElement) ? res.html
        : null;

      if (root) {
        const { id, sc } = readFromRoot(root);
        if (id) circleId = id;
        if (Number.isFinite(sc)) initial = sc;
        return;
      }

      // Last resort: object-ish return
      const maybeId = (res?.[idInput] ?? res?.circleId ?? res?.id ?? res?.name ?? '').toString().trim();
      const maybeSc = Number(res?.[scoreInput] ?? res?.initial ?? res?.score ?? 0);
      if (maybeId) circleId = maybeId;
      if (Number.isFinite(maybeSc)) initial = maybeSc;
    };

    if (DialogV2?.prompt) {
      const res = await DialogV2.prompt({
        window: { title: 'JANUS7 — Zirkel/Haus anlegen' },
        content,
        ok: {
          label: 'Anlegen',
          callback: (_event, button) => ({
            circleId: button?.form?.elements?.[idInput]?.value ?? '',
            initial: Number(button?.form?.elements?.[scoreInput]?.value ?? 0)
          })
        },
        rejectClose: false,
        modal: true,
      }).catch(() => null);
      if (res === null) return;
      assignFromResult(res);
    } else {
      // Fallback (kann V1-Deprecation triggern, aber besser als keine Funktion)
      const res = await Dialog.prompt({ title: 'JANUS7 — Zirkel/Haus anlegen', content, label: 'Anlegen' }).catch(() => null);
      if (res === null) return;
      assignFromResult(res);
    }
    if (!circleId) {
      ui.notifications?.warn?.('Kein Name/ID angegeben.');
      return;
    }
    if (!Number.isFinite(initial)) {
      ui.notifications?.warn?.('Startpunkte müssen eine Zahl sein.');
      return;
    }

    try {
      const director = game.janus7.core.director;
      const res = await director.scoring.ensureCircle(circleId, initial, { forceSave: true });
      if (res?.created) ui.notifications?.info?.(`Zirkel/Haus angelegt: ${res.circleId}`);
      else ui.notifications?.info?.(`Existiert bereits: ${res.circleId}`);
      await this.render({ force: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 Scoring createCircle failed', err);
      ui.notifications?.error?.('JANUS7: Anlegen fehlgeschlagen (Details in Konsole).');
    }
  }

  async _onDeleteCircle(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) {
      ui.notifications?.warn?.('Nur der GM kann Zirkel/Häuser löschen.');
      return;
    }
    const circleId = target?.dataset?.circleId ?? '';
    if (!circleId) return;

    // Foundry v13+: DialogV2 (ApplicationV2). Fallback auf AppV1 bis v16.
    let confirmed = false;
    try {
      const DialogV2 = foundry?.applications?.api?.DialogV2;
      if (DialogV2?.confirm) {
        confirmed = await DialogV2.confirm({
          window: { title: 'JANUS7 — Zirkel/Haus löschen' },
          content: `<p>Wirklich löschen: <strong>${circleId}</strong>?</p><p class="notes">Das entfernt den Eintrag aus scoring.circles (Punkte gehen verloren).</p>`,
          yes: { label: 'Löschen', icon: 'fas fa-trash' },
          no:  { label: 'Abbrechen' },
          rejectClose: false,
          modal: true,
        }).catch(() => false);
      } else {
        confirmed = await Dialog.confirm({
          title: 'JANUS7 — Zirkel/Haus löschen',
          content: `<p>Wirklich löschen: <strong>${circleId}</strong>?</p><p class="notes">Das entfernt den Eintrag aus scoring.circles (Punkte gehen verloren).</p>`,
          yes: () => true, no: () => false, defaultYes: false,
        }).catch(() => false);
      }
    } catch (_) { confirmed = false; }

    if (!confirmed) return;

    try {
      const director = game.janus7.core.director;
      const removed = await director.scoring.deleteCircle(circleId, { forceSave: true });
      if (removed) ui.notifications?.info?.(`Gelöscht: ${circleId}`);
      await this.render({ force: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 Scoring deleteCircle failed', err);
      ui.notifications?.error?.('JANUS7: Löschen fehlgeschlagen (Details in Konsole).');
    }
  }

  async _onAwardStudent(event, target) {
    event.preventDefault();
    const form = target.closest('form');
    const data = new FormData(form);
    const studentId = String(data.get('studentId') ?? '');
    const amount = Number.parseInt(String(data.get('studentAmount') ?? '0'), 10) || 0;
    const reason = String(data.get('studentReason') ?? '');
    if (!studentId || !amount) return;

    try {
      const director = game.janus7.core.director;
      await director.scoring.addStudentPoints(studentId, amount, reason, { forceSave: true });
      await this.render({ force: true });
    } catch (err) {
      this._getLogger().error?.('JANUS7 Scoring awardStudent failed', err);
      ui.notifications?.error?.('JANUS7: Vergabe fehlgeschlagen (Details in Konsole).');
    }
  }

  /**
   * Bereitet Snapshot-Trend-Daten für das Template auf.
   * Liefert die letzten N Snapshots als flaches Array mit Trend-Delta.
   *
   * @param {import('../../academy/scoring.js').JanusScoringEngine} scoring
   * @param {number} [limit=14]  - Anzahl angezeigter Snapshots (Tage)
   * @returns {{ rows: object[], circleIds: string[], hasData: boolean }}
   */
  _buildSnapshotTrend(scoring, limit = 14) {
    try {
      const engine = game.janus7;
      const rawSnapshots = engine?.core?.state?.getPath?.('academy.scoring.dailySnapshots') ?? [];

      if (!Array.isArray(rawSnapshots) || rawSnapshots.length === 0) {
        return { rows: [], circleIds: [], hasData: false };
      }

      const slice = rawSnapshots.slice(-limit);

      // Alle Zirkel-IDs aus allen Snapshots sammeln
      const circleIds = [...new Set(
        slice.flatMap((s) => Object.keys(s?.circles ?? {}))
      )].sort();

      // Rows mit Trend-Delta (Vergleich zum Vortag)
      const rows = slice.map((snap, i) => {
        const prev = i > 0 ? slice[i - 1] : null;
        const circleDeltas = {};
        for (const cid of circleIds) {
          const cur  = Number(snap?.circles?.[cid] ?? 0);
          const last = Number(prev?.circles?.[cid] ?? 0);
          const delta = i > 0 ? cur - last : null;
          circleDeltas[cid] = {
            score: cur,
            delta,
            trend:      delta === null ? '—' : delta > 0 ? '▲' : delta < 0 ? '▼' : '—',
            trendClass: delta === null ? 'janus7-trend-flat'
                      : delta > 0    ? 'janus7-trend-up'
                      : delta < 0    ? 'janus7-trend-down'
                      :                'janus7-trend-flat',
            deltaAbs:   delta !== null ? Math.abs(delta) : null,
          };
        }
        return {
          ts: snap.ts ?? null,
          label: snap.slotRef
            ? `W${snap.slotRef.week ?? '?'}/T${snap.slotRef.trimester ?? '?'}`
            : (snap.ts ? new Date(snap.ts).toLocaleDateString('de-DE') : '?'),
          circles: circleDeltas,
          topStudent: snap.topStudents?.[0] ?? null,
        };
      }).reverse(); // Neueste zuerst

      return { rows, circleIds, hasData: rows.length > 0 };
    } catch (err) {
      this._getLogger().warn?.('JANUS7 _buildSnapshotTrend fehlgeschlagen', err);
      return { rows: [], circleIds: [], hasData: false };
    }
  }
}

