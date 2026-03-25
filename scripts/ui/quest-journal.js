import { moduleTemplatePath } from '../../core/common.js';
/**
 * Quest Journal - ApplicationV2 UI Component
 * Enhanced in v0.9.10.12 to surface Quest / Rumor / Faction summaries
 * from AcademyDataApi view-model builders instead of ad-hoc raw registry reads.
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function _actorCandidates(actor) {
  return [actor?.uuid, actor?.id].filter(Boolean);
}

function _fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('de-DE');
  } catch (_err) {
    return String(value);
  }
}

function _normQuestDef(raw = {}) {
  const questId = raw.questId ?? raw.id ?? null;
  return {
    questId,
    title: raw.title ?? raw.name ?? questId ?? 'Unbenannte Quest',
    description: raw.description ?? raw.summary ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    deadlineDays: raw.deadlineDays ?? null,
    prio: raw.prio ?? null,
    raw
  };
}

export class JanusQuestJournal extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'janus7-quest-journal',
    tag: 'div',
    classes: ['janus7', 'janus7-quest-journal-app'],
    window: {
      title: 'Quest Journal',
      resizable: true
    },
    position: {
      width: 980,
      height: 760
    },
    actions: {
      viewQuest: this._onViewQuest,
      startQuest: this._onStartQuest,
      completeQuest: this._onCompleteQuest,
      refreshJournal: this._onRefreshJournal
    }
  };

  static PARTS = {
    header: {
      template: moduleTemplatePath('templates/quest-system/quest-journal-header.hbs')
    },
    content: {
      template: moduleTemplatePath('templates/quest-system/quest-journal.hbs'),
      scrollable: ['.quest-journal-main', '.quest-journal-sidebar']
    }
  };

  async _prepareContext(_options) {
    const actor = game.user.character || game.actors.find((a) => a.type === 'character');
    if (!actor) {
      return {
        hasActor: false,
        error: 'Kein Character gefunden. Bitte einen Character auswählen.'
      };
    }

    const dataApi = game.janus7?.academy?.data;
    const questEngine = game.janus7?.academy?.quests;
    if (!dataApi || !questEngine) {
      return {
        hasActor: true,
        actor: actor.name,
        error: 'Quest-System nicht initialisiert. Bitte JANUS7 laden.'
      };
    }

    const actorKeys = new Set(_actorCandidates(actor));
    const registry = await dataApi.getContentRegistry?.().catch?.(() => null);
    const questDefs = (registry?.quests ?? [])
      .map(_normQuestDef)
      .filter((q) => !!q.questId);

    const summaries = (dataApi.buildQuestSummary?.() ?? [])
      .filter((entry) => actorKeys.has(entry.actorId));

    const summariesByQuestId = new Map(summaries.map((entry) => [entry.questId, entry]));

    const activeQuests = summaries
      .filter((entry) => String(entry.status) === 'active')
      .map((entry) => {
        const def = questDefs.find((q) => q.questId === entry.questId) ?? _normQuestDef({ id: entry.questId, title: entry.title });
        return {
          ...def,
          state: entry,
          startedAtLabel: _fmtDate(entry.startedAt),
          hasDeadline: Number.isFinite(Number(entry.deadlineDays))
        };
      })
      .sort((a, b) => String(a.title).localeCompare(String(b.title), 'de'));

    const completedQuests = summaries
      .filter((entry) => String(entry.status) === 'completed')
      .map((entry) => {
        const def = questDefs.find((q) => q.questId === entry.questId) ?? _normQuestDef({ id: entry.questId, title: entry.title });
        return {
          ...def,
          state: entry,
          startedAtLabel: _fmtDate(entry.startedAt)
        };
      })
      .sort((a, b) => String(a.title).localeCompare(String(b.title), 'de'));

    const availableQuests = questDefs
      .filter((def) => !summariesByQuestId.has(def.questId))
      .sort((a, b) => String(a.title).localeCompare(String(b.title), 'de'));

    const rumors = (dataApi.buildRumorBoard?.() ?? []).map((rumor) => ({
      ...rumor,
      truthLabel: typeof rumor.truthLevel === 'number' ? `${Math.round(rumor.truthLevel * 100)}%` : '—',
      stateClass: rumor.heard ? 'heard' : 'new'
    }));

    const factions = (dataApi.buildFactionStanding?.() ?? []).map((faction) => ({
      ...faction,
      pointsLabel: Number.isFinite(Number(faction.points)) ? String(faction.points) : '0',
      reputationLabel: Number.isFinite(Number(faction.reputation)) ? String(faction.reputation) : '0',
      perksText: Array.isArray(faction.perks)
        ? faction.perks.map((p) => p?.effectId ?? p?.name ?? p?.id ?? 'Perk').join(', ')
        : ''
    }));

    const eventContext = dataApi.buildEventContext?.() ?? {};
    const summaryCards = {
      activeQuests: activeQuests.length,
      availableQuests: availableQuests.length,
      completedQuests: completedQuests.length,
      unheardRumors: rumors.filter((r) => !r.heard).length,
      factions: factions.length,
      currentLocationId: eventContext.activeLocationId ?? '—'
    };

    return {
      hasActor: true,
      actor: actor.name,
      actorId: actor.uuid,
      actorIds: Array.from(actorKeys),
      summaryCards,
      activeQuests,
      availableQuests,
      completedQuests,
      rumors,
      factions,
      eventContext,
      hasActive: activeQuests.length > 0,
      hasAvailable: availableQuests.length > 0,
      hasCompleted: completedQuests.length > 0,
      hasRumors: rumors.length > 0,
      hasFactions: factions.length > 0
    };
  }

  static async _onRefreshJournal(event, _target) {
    event?.preventDefault?.();
    this.render({ force: true });
  }

  static async _onViewQuest(event, target) {
    event?.preventDefault?.();
    const questId = target.dataset.questId;
    const actorId = target.dataset.actorId;
    const dataApi = game.janus7?.academy?.data;
    const questEngine = game.janus7?.academy?.quests;

    const quest = await dataApi?.getQuest?.(questId);
    const state = questEngine?.getActiveQuest?.(actorId, questId);
    const content = `
      <h3>${quest?.title ?? questId}</h3>
      <p>${quest?.description ?? 'Keine Beschreibung vorhanden.'}</p>
      ${state ? `
        <hr>
        <p><strong>Status:</strong> ${state.status}</p>
        <p><strong>Aktueller Knoten:</strong> ${state.currentNodeId ?? '—'}</p>
        <p><strong>Gestartet:</strong> ${_fmtDate(state.startedAt)}</p>
      ` : ''}
      ${Array.isArray(quest?.nodes) && quest.nodes.length ? `
        <hr>
        <p><strong>Knoten:</strong> ${quest.nodes.map((n) => n.nodeId ?? n.id ?? '?').join(', ')}</p>
      ` : ''}
    `;

    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2 && typeof DialogV2.prompt === 'function') {
      await DialogV2.prompt({
        window: { title: quest?.title ?? questId },
        content,
        ok: { label: 'Schließen' },
        rejectClose: false,
      }).catch(() => {});
      return;
    }

    new Dialog({
      title: quest?.title ?? questId,
      content,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: 'Schließen' }
      },
      default: 'ok'
    }, { classes: ['janus7', 'quest-journal-dialog'] }).render(true);
  }

  static async _onStartQuest(event, target) {
    event?.preventDefault?.();
    const questId = target.dataset.questId;
    const actorId = target.dataset.actorId;

    try {
      await game.janus7.academy.quests.startQuest(questId, { actorId });
      ui.notifications.info(`Quest gestartet: ${questId}`);
      this.render({ force: true });
    } catch (err) {
      ui.notifications.error(`Fehler beim Starten: ${err.message}`);
    }
  }

  static async _onCompleteQuest(event, target) {
    event?.preventDefault?.();
    const questId = target.dataset.questId;
    const actorId = target.dataset.actorId;

    try {
      await game.janus7.academy.quests.completeQuest(questId, { actorId });
      ui.notifications.info(`Quest abgeschlossen: ${questId}`);
      this.render({ force: true });
    } catch (err) {
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }
}
