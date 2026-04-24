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
import { JanusCommands } from '../commands/index.js';

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
      refresh: 'onRefresh',
      selectFrom: 'onSelectFrom',
      selectTo: 'onSelectTo',
      adjust: 'onAdjust',
      executeCommand: 'onExecuteCommand'
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
    this.enableAutoRefresh(['janus7RelationChanged', 'janus7StoryHookChanged']);

    const root = this.element;
    if (!root) return;
    root.querySelector('[name="fromId"]')?.addEventListener('change', (ev) => {
      this.onSelectFrom(ev, ev.currentTarget);
    });
    root.querySelector('[name="toId"]')?.addEventListener('change', (ev) => {
      this.onSelectTo(ev, ev.currentTarget);
    });
  }

  async onRefresh(_event,_target){ this.refresh(); }

  async onSelectFrom(event, target) {
    event?.preventDefault?.();
    const id = target?.value ?? target?.dataset?.value;
    this._fromId = id || null;
    this.refresh();
  }

  async onSelectTo(event, target) {
    event?.preventDefault?.();
    const id = target?.value ?? target?.dataset?.value;
    this._toId = id || null;
    this.refresh();
  }

  async onAdjust(event, target) {
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
      this.refresh();
    } catch (err) {
      this._getLogger().error?.('JANUS7 | adjustAttitude failed', err);
      ui.notifications.error(`Änderung fehlgeschlagen: ${err.message}`);
    }
  }

  async onExecuteCommand(event, target) {
    event?.preventDefault?.();
    const commandId = String(target?.dataset?.commandId ?? '').trim();
    if (!commandId) return;

    const command = JanusCommands[commandId];
    if (typeof command !== 'function') {
      ui.notifications.error(`Command not found: ${commandId}`);
      this._getLogger().error?.(`[JanusSocialViewApp] Command not found: ${commandId}`);
      return;
    }

    try {
      const dataset = { ...target.dataset };
      const result = await command(dataset);
      if (result?.success === false && !result?.cancelled) {
        ui.notifications.error(`Command failed: ${commandId}`);
      }
      this.refresh();
    } catch (err) {
      this._getLogger().error?.('[JanusSocialViewApp] command execution failed', err);
      ui.notifications.error(`Command error: ${commandId}`);
    }
  }

  _buildStoryHookQueueView(engine, npcs = [], pcs = []) {
    const storyHooks = engine?.core?.state?.get?.('academy.social.storyHooks') ?? {};
    const records = Object.values(storyHooks?.records ?? {});
    const resolveName = (id) => {
      if (!id) return 'â€”';
      return npcs.find((entry) => entry.id === id)?.name
        ?? pcs.find((entry) => entry.id === id)?.name
        ?? id;
    };
    const order = { queued: 0, completed: 1, discarded: 2 };
    const items = records
      .map((entry) => {
        const status = String(entry?.status ?? 'queued').trim() || 'queued';
        return {
          hookId: entry?.hookId ?? entry?.id ?? null,
          title: entry?.title ?? 'Social-Story-Hook',
          detail: entry?.detail ?? 'â€”',
          priorityLabel: entry?.priorityLabel ?? 'Normal',
          status,
          statusLabel: status === 'completed' ? 'Abgeschlossen' : status === 'discarded' ? 'Verworfen' : 'Vorgemerkt',
          fromName: resolveName(entry?.fromId ?? null),
          toName: resolveName(entry?.toId ?? null),
          updatedAt: entry?.updatedAt ?? null,
          updatedAtLabel: entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString('de-DE') : 'â€”',
          isQueued: status === 'queued',
          isCompleted: status === 'completed',
          isDiscarded: status === 'discarded'
        };
      })
      .sort((a, b) => {
        const statusDelta = (order[a.status] ?? 99) - (order[b.status] ?? 99);
        if (statusDelta !== 0) return statusDelta;
        return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
      })
      .slice(0, 8);

    const history = (Array.isArray(storyHooks?.history) ? storyHooks.history : [])
      .slice(0, 6)
      .map((entry) => ({
        actionLabel: entry?.actionLabel ?? 'Hook geändert',
        changedAtLabel: entry?.changedAt ? new Date(entry.changedAt).toLocaleString('de-DE') : 'â€”'
      }));

    return {
      items,
      history,
      summary: {
        total: records.length,
        queued: records.filter((entry) => String(entry?.status ?? 'queued') === 'queued').length,
        completed: records.filter((entry) => String(entry?.status ?? 'queued') === 'completed').length,
        discarded: records.filter((entry) => String(entry?.status ?? 'queued') === 'discarded').length,
      }
    };
  }

  _prepareContext(_options) {
    const engine = game.janus7;
    const social = engine?.academy?.social;
    const academyData = engine?.academy?.data;

    if (!engine || !social) return { notReady: true };

    const npcs = (academyData?.getNpcs?.() ?? []).map(n => ({ id: n.id, name: n.name ?? n.id }));
    const pcs = (game.actors?.filter?.(a => a.type === 'character') ?? []).map(a => ({ id: a.id, name: a.name }));

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

    const livingEvents = engine?.core?.state?.get?.('academy.social.livingEvents') ?? {};
    const livingHistory = (Array.isArray(livingEvents?.history) ? livingEvents.history : []).slice(0, 8).map((entry) => ({
      title: entry?.title ?? 'Autonomes Beziehungs-Event',
      summary: entry?.summary ?? 'â€”',
      category: entry?.category ?? 'npc-network',
      deltaLabel: `${Number(entry?.delta ?? 0) > 0 ? '+' : ''}${Number(entry?.delta ?? 0)}`,
      pairLabel: `${entry?.fromName ?? entry?.fromId ?? '?'} -> ${entry?.toName ?? entry?.toId ?? '?'}`
    }));

    const storyHookQueue = this._buildStoryHookQueueView(engine, npcs, pcs);

    const gateEngine = engine?.academy?.gateEngine ?? null;
    const socialLinksGateOpen = gateEngine
      ? gateEngine.isGateOpen('GATE_SOCIAL_LINKS_MENTOR')
      : true; // Kein Gate-System aktiv â†’ alles anzeigen (legacy-Kompatibilität)
    const socialLinksFullOpen = gateEngine
      ? gateEngine.isGateOpen('GATE_SOCIAL_LINKS_FULL')
      : true;
    const npcAttitudeGateOpen = gateEngine
      ? gateEngine.isGateOpen('GATE_NPC_ATTITUDE_DISPLAY')
      : true;

    return {
      notReady: false,
      isGM: game.user?.isGM ?? false,
      npcs,
      pcs,
      fromId,
      toId,
      attitude,
      outgoing: outgoingView,
      livingHistory,
      storyHookQueue,
      socialLinksGateOpen,
      socialLinksFullOpen,
      npcAttitudeGateOpen,
    };
  }
}

