
import { getQuickPanels } from './panel-registry.js';
import { HOOKS } from '../../core/hooks/topics.js';
import { registerRuntimeHook } from '../../core/hooks/runtime.js';

const GM_OVERLAY_ID = 'janus7-gm-quick-overlay';

const JanusGmQuickOverlay = {
  _engine: null,
  _listenersBound: false,
  _hookIds: [],

  attach(engine) {
    this._engine = engine ?? null;
    if (!this._listenersBound) this._bindJanusHooks();
    this.refresh();
  },

  detach() {
    this._engine = null;
    this.remove();
  },

  _bindJanusHooks() {
    this._listenersBound = true;
    for (const topic of [HOOKS.STATE_CHANGED, HOOKS.DATE_CHANGED, HOOKS.SCORE_CHANGED]) {
      const id = Hooks.on(topic, () => this.refresh());
      this._hookIds.push({ topic, id });
    }
  },

  _shouldShow() {
    return !!this._engine && !!game?.user?.isGM && (game?.settings?.get?.('janus7', 'enableUI') !== false);
  },

  _ensureElement() {
    let el = document.getElementById(GM_OVERLAY_ID);
    if (el) return el;
    el = document.createElement('section');
    el.id = GM_OVERLAY_ID;
    el.className = 'janus7-gm-overlay';
    el.setAttribute('aria-label', 'JANUS7 GM Quick Access');
    el.addEventListener('click', (event) => this._onClick(event));
    document.body.appendChild(el);
    return el;
  },

  remove() {
    document.getElementById(GM_OVERLAY_ID)?.remove();
  },

  _makeNode(tag, className, text = null) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== null) node.textContent = String(text);
    return node;
  },

  refresh() {
    if (!this._shouldShow()) {
      this.remove();
      return;
    }

    const el = this._ensureElement();
    const data = this._buildViewModel();
    el.replaceChildren();

    const head = this._makeNode('div', 'janus7-gm-overlay__head');
    const headCopy = this._makeNode('div');
    headCopy.append(
      this._makeNode('div', 'janus7-gm-overlay__eyebrow', 'GM Quick Access'),
      this._makeNode('div', 'janus7-gm-overlay__title', `${data.time.day} · ${data.time.phase}`)
    );
    const shellButton = this._makeNode('button', 'janus7-gm-overlay__btn janus7-gm-overlay__btn--ghost', 'Shell');
    shellButton.type = 'button';
    shellButton.dataset.role = 'open-shell';
    head.append(headCopy, shellButton);

    const stats = this._makeNode('div', 'janus7-gm-overlay__stats');
    const timeStat = this._makeNode('div', 'janus7-gm-overlay__stat');
    timeStat.append(
      this._makeNode('span', '', 'Zeit'),
      this._makeNode('strong', '', `W${data.time.week} · Y${data.time.year}`)
    );
    const leaderStat = this._makeNode('div', 'janus7-gm-overlay__stat');
    leaderStat.append(
      this._makeNode('span', '', 'Fuehrender Zirkel'),
      this._makeNode('strong', '', data.scoring.leader)
    );
    stats.append(timeStat, leaderStat);

    const circles = this._makeNode('div', 'janus7-gm-overlay__circles');
    for (const entry of data.scoring.topCircles) {
      const row = this._makeNode('div', 'janus7-gm-overlay__circle');
      row.append(
        this._makeNode('span', '', entry.name),
        this._makeNode('strong', '', entry.score)
      );
      circles.append(row);
    }

    const actions = this._makeNode('div', 'janus7-gm-overlay__actions');
    for (const action of [
      { role: 'advance-slot', label: '+1 Slot' },
      { role: 'advance-day', label: '+1 Tag' },
      { role: 'open-scoring', label: 'Scoring' }
    ]) {
      const button = this._makeNode('button', 'janus7-gm-overlay__btn', action.label);
      button.type = 'button';
      button.dataset.role = action.role;
      actions.append(button);
    }

    el.append(head, stats, circles, actions);
  },

  _buildViewModel() {
    const time = this._engine?.core?.state?.get?.('time') ?? {};
    const scoringEngine = this._engine?.academy?.scoring ?? this._engine?.simulation?.scoring ?? null;
    let circleScores = [];

    if (typeof scoringEngine?.getCircleScores === 'function') {
      circleScores = scoringEngine.getCircleScores().map((entry) => ({
        name: entry?.circleId ?? entry?.id ?? 'Zirkel',
        score: Number(entry?.score ?? 0)
      }));
    } else {
      const raw = this._engine?.core?.state?.get?.('academy.scoring.circles') ?? this._engine?.core?.state?.get?.('scoring.circles') ?? {};
      circleScores = Object.entries(raw).map(([id, value]) => ({ name: id, score: Number(value?.score ?? value ?? 0) }));
    }

    circleScores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'de'));
    const topCircles = circleScores.slice(0, 3);

    return {
      time: {
        day: time?.dayName ?? time?.day ?? '—',
        phase: time?.phase ?? time?.slotName ?? '—',
        week: time?.week ?? '—',
        year: time?.year ?? '—'
      },
      scoring: {
        leader: topCircles[0] ? `${topCircles[0].name} (${topCircles[0].score})` : '—',
        topCircles: topCircles.length ? topCircles : [{ name: 'Keine Werte', score: '—' }]
      }
    };
  },

  async _onClick(event) {
    const role = event?.target?.closest?.('[data-role]')?.dataset?.role ?? null;
    if (!role) return;
    event.preventDefault();

    switch (role) {
      case 'open-shell':
        game?.janus7?.ui?.open?.('shell');
        break;
      case 'open-scoring':
        game?.janus7?.ui?.open?.('shell', { viewId: 'tools' });
        break;
      case 'advance-slot':
        await game?.janus7?.commands?.advanceSlot?.({ amount: 1 });
        break;
      case 'advance-day':
        await game?.janus7?.commands?.advanceDay?.({ amount: 1 });
        break;
      default:
        break;
    }

    this.refresh();
  }
};

export const JanusUiLayerBridge = {
  attach(engine) {
    if (!engine) return;
    engine.uiLayer = engine.uiLayer ?? {};
    engine.uiLayer.getQuickPanels = getQuickPanels;
    engine.uiLayer.openShell = (options = {}) => game?.janus7?.ui?.open?.('shell', options);
    engine.uiLayer.open = engine.uiLayer.openShell;
    engine.uiLayer.refreshGmQuickOverlay = () => JanusGmQuickOverlay.refresh();
    engine.uiLayer.removeGmQuickOverlay = () => JanusGmQuickOverlay.remove();
    JanusGmQuickOverlay.attach(engine);
  },

  registerSceneTools(engine) {
    const contributor = (controls) => {
      const token = Array.isArray(controls)
        ? controls.find((c) => c?.name === 'token')
        : controls?.token;
      const tools = token?.tools;
      if (!tools) return;
      const tool = {
        name: 'openJanusShell',
        title: 'JANUS Shell öffnen',
        icon: 'fas fa-layer-group',
        order: 1,
        button: true,
        visible: !!game?.user?.isGM,
        onChange: () => {
          try { game?.janus7?.ui?.open?.('shell'); } catch (err) { console.warn('[JANUS7][Shell] open failed', err); }
        }
      };
      if (Array.isArray(tools)) {
        if (!tools.some((t) => t?.name === tool.name)) tools.push(tool);
      } else if (!tools[tool.name]) {
        tools[tool.name] = tool;
      }
    };

    if (engine?.ui?.registerSceneControlsContributor) {
      engine.ui.registerSceneControlsContributor(contributor);
    } else {
      engine._pendingSceneControlContribs = engine._pendingSceneControlContribs ?? [];
      engine._pendingSceneControlContribs.push(contributor);
    }
  }
};

registerRuntimeHook('janus7:ready:ui-layer-bridge', HOOKS.ENGINE_READY, (engine) => {
  try {
    JanusUiLayerBridge.attach(engine);
    JanusUiLayerBridge.registerSceneTools(engine);
  } catch (err) {
    (engine?.core?.logger ?? console).warn?.('[JANUS7][Shell] bridge attach failed', err);
  }
});

try {
  if (game?.janus7) JanusUiLayerBridge.attach(game.janus7);
} catch (_) {}
