import { moduleTemplatePath } from '../../core/common.js';
/**
 * Event Popup - Shows event with contextual Quest / Rumor data.
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class JanusEventPopup extends HandlebarsApplicationMixin(ApplicationV2) {
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
      selectOption: this._onSelectOption,
      close: this._onClose,
      refreshPopup: this._onRefresh
    }
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('templates/quest-system/event-popup.hbs')
    }
  };

  async _prepareContext(_options) {
    const dataApi = game.janus7?.academy?.data;
    if (!this.event && this.eventId && dataApi?.getEvent) {
      this.event = await dataApi.getEvent(this.eventId).catch(() => null);
    }

    if (!Array.isArray(this.eventOptions) || !this.eventOptions.length) {
      this.eventOptions = await dataApi?.getOptionsForParent?.('event', this.eventId).catch?.(() => []) ?? [];
    }

    const eventContext = dataApi?.buildEventContext?.() ?? {};
    const activeQuests = (eventContext.activeQuests ?? []).filter((q) => !this.actorId || q.actorId === this.actorId);
    const availableRumors = eventContext.availableRumors ?? [];

    return {
      event: this.event ?? { title: this.eventId ?? 'Unbekanntes Event', description: 'Kein Event geladen.' },
      options: this.eventOptions,
      actorId: this.actorId,
      hasOptions: this.eventOptions.length > 0,
      activeQuests,
      availableRumors,
      hasActiveQuests: activeQuests.length > 0,
      hasRumors: availableRumors.length > 0,
      activeLocationId: eventContext.activeLocationId ?? '—'
    };
  }

  static async _onRefresh(event, _target) {
    event?.preventDefault?.();
    this.render({ force: true });
  }

  static async _onSelectOption(event, target) {
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

  static _onClose(event, _target) {
    event?.preventDefault?.();
    this.close();
  }
}
