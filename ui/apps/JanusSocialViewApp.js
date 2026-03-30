import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusSocialViewApp.js
 * @module janus7/ui
 * @phase 6
 *
 * Social View: Anzeige und Anpassung von NPC-Beziehungen und Attitude-Werten.
 * Schreibt über die SocialEngine (kein direktes State-Mutieren).
 * GM-only für Mutationen.
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';

/**
 * JanusSocialViewApp
 * Anzeige & Anpassung von Beziehungen/Attitude via SocialEngine.
 */
export class JanusSocialViewApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus-social-view',
    classes: ['janus7-app', 'janus7-social-view'],
    position: { width: 950, height: 720 },
    window: {
      title: 'JANUS7 · Social',
      resizable: true,
    },
    actions: {
      refresh: JanusSocialViewApp.onRefresh,
      selectFrom: JanusSocialViewApp.onSelectFrom,
      selectTo: JanusSocialViewApp.onSelectTo,
      adjust: JanusSocialViewApp.onAdjust
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/social-view.hbs') }
  };

  constructor(options={}) {
    super(options);
    this._fromId = null;
    this._toId = null;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.enableAutoRefresh(['janus7RelationChanged']);

    const root = this.element;
    if (!root) return;
    root.querySelector('[name="fromId"]')?.addEventListener('change', (ev) => {
      this.constructor.onSelectFrom.call(this, ev, ev.currentTarget);
    });
    root.querySelector('[name="toId"]')?.addEventListener('change', (ev) => {
      this.constructor.onSelectTo.call(this, ev, ev.currentTarget);
    });
  }

  static async onRefresh(_event,_target){ this.refresh(); }

  static async onSelectFrom(event, target) {
    event?.preventDefault?.();
    const id = target?.value ?? target?.dataset?.value;
    this._fromId = id || null;
    this.refresh();
  }

  static async onSelectTo(event, target) {
    event?.preventDefault?.();
    const id = target?.value ?? target?.dataset?.value;
    this._toId = id || null;
    this.refresh();
  }

  static async onAdjust(event, target) {
    event?.preventDefault?.();
    if (!game.user?.isGM) return ui.notifications.warn('Nur GM darf Beziehungen ändern.');

    const delta = Number(target?.dataset?.delta ?? 0);
    if (!delta) return;

    const fromId = this._fromId;
    const toId = this._toId;
    if (!fromId || !toId) return ui.notifications.warn('Bitte Absender und Ziel wählen.');

    try {
      await game.janus7?.academy?.social?.adjustAttitude?.(fromId, toId, delta, { reason: 'UI' });
      ui.notifications.info(`Beziehung angepasst: ${delta > 0 ? '+' : ''}${delta}`);
    } catch (err) {
      this._getLogger().error?.('JANUS7 | adjustAttitude failed', err);
      ui.notifications.error(`Änderung fehlgeschlagen: ${err.message}`);
    }
  }

  async _prepareContext(_options) {
    const engine = game.janus7;
    const social = engine?.academy?.social;
    const academyData = engine?.academy?.data;

    if (!engine || !social) return { notReady: true };

    const npcs = (academyData?.getNpcs?.() ?? []).map(n => ({ id: n.id, name: n.name ?? n.id }));
    const pcs = (game.actors?.filter?.(a => a.type === 'character') ?? []).map(a => ({ id: a.id, name: a.name }));

    // Default selections
    const fromId = this._fromId ?? (npcs[0]?.id ?? pcs[0]?.id ?? null);
    const toId = this._toId ?? (pcs[0]?.id ?? npcs[0]?.id ?? null);
    this._fromId = fromId;
    this._toId = toId;

    const attitude = (fromId && toId) ? (social.getAttitude?.(fromId, toId) ?? 0) : 0;
    const outgoing = fromId ? (social.listRelationshipsFrom?.(fromId) ?? []) : [];

    const outgoingView = outgoing.map(r => ({
      fromId: r.fromId ?? fromId,
      toId: r.toId,
      value: r.value ?? 0,
      toName: pcs.find(p => p.id === r.toId)?.name
        ?? npcs.find(n => n.id === r.toId)?.name
        ?? r.toId
    })).sort((a,b)=> (b.value??0)-(a.value??0));

    return {
      notReady: false,
      isGM: game.user?.isGM ?? false,
      npcs,
      pcs,
      fromId,
      toId,
      attitude,
      outgoing: outgoingView
    };
  }
}
