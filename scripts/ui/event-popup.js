import { moduleTemplatePath } from '../core/public-api.mjs';
import { JanusBaseApp } from '../../ui/core/base-app.js';
/**
 * Event Popup - Shows event with contextual Quest / Rumor data.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusEventPopup extends HandlebarsApplicationMixin(JanusBaseApp) {
  constructor(options = {}) {
    super(options);
    this.eventId = options.eventId;
    this.actorId = options.actorId;
    this.event = options.event;
    this.eventOptions = Array.isArray(options.options) ? options.options : [];
  }

  static DEFAULT_OPTIONS = {
    id: 'janus7-event-popup',
    tag: 'div',
    classes: ['janus7', 'janus7-event-popup-app'],
    window: {
      title: 'Event',
      resizable: true
    },
    position: {
      width: 760,
      height: 680
    },
    actions: {
      selectOption: '_onSelectOption',
      close: '_onClose',
      refreshPopup: '_onRefresh',
      enrichEvent: '_onEnrichEvent'
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('templates/quest-system/event-popup.hbs')
    }
  };

  async _preRender(options) {
    await super._preRender(options);
    const dataApi = game.janus7?.academy?.data;
    if (!this.event && this.eventId && dataApi?.getEvent) {
      this.event = await dataApi.getEvent(this.eventId).catch(() => null);
    }

    if (!Array.isArray(this.eventOptions) || !this.eventOptions.length) {
      this.eventOptions = await dataApi?.getOptionsForParent?.('event', this.eventId).catch?.(() => []) ?? [];
    }

    this.__renderCache = {
      event: this.event ?? { title: this.eventId ?? 'Unbekanntes Event', description: 'Kein Event geladen.' },
      options: this.eventOptions,
      eventContext: dataApi?.buildEventContext?.() ?? {}
    };
  }

  _prepareContext(_options) {
    const { event, options, eventContext } = this.__renderCache ?? {};
    const activeQuests = (eventContext?.activeQuests ?? []).filter((q) => !this.actorId || q.actorId === this.actorId);
    const availableRumors = eventContext?.availableRumors ?? [];

    return {
      event,
      options,
      actorId: this.actorId,
      hasOptions: (options ?? []).length > 0,
      activeQuests,
      availableRumors,
      hasActiveQuests: activeQuests.length > 0,
      hasRumors: availableRumors.length > 0,
      activeLocationId: eventContext?.activeLocationId ?? '—',
      geminiEnabled: game.janus7?.ki?.gemini?.isEnabled ?? false
    };
  }

  async _onRefresh(event, _target) {
    event?.preventDefault?.();
    this.render({ force: true });
  }

  async _onSelectOption(event, target) {
    event?.preventDefault?.();
    const optionId = target.dataset.optionId;
    const actorId = target.dataset.actorId;

    try {
      const result = await game.janus7.academy.events.selectOption(optionId, { actorId });
      if (result.success) {
        ui.notifications.info('Option gewählt. Die Akademie tut so, als sei das alles völlig normal.');
        this.close();
      } else {
        ui.notifications.warn(`Fehler: ${result.reason}`);
      }
    } catch (err) {
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }

  _onClose(event, _target) {
    event?.preventDefault?.();
    this.close();
  }

  async _onEnrichEvent(event, _target) {
    event?.preventDefault?.();
    if (!game.janus7.ki.gemini.isEnabled) return;

    try {
      const originalDescription = this.event?.description || '';
      const originalTitle = this.event?.title || '';

      ui.notifications.info('Gemini analysiert die Situation...');
      
      const enrichedText = await game.janus7.ki.gemini.enrich('event', originalDescription, {
        title: originalTitle,
        eventId: this.eventId,
        location: this.activeLocationId
      });

      if (this.event) {
        this.event.description = enrichedText;
        this.render({ force: true });
      }

      ui.notifications.info('Text erfolgreich angereichert.');
    } catch (err) {
      ui.notifications.error(`KI Fehler: ${err.message}`);
    }
  }
}
