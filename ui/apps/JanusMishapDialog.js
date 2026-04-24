/**
 * @file ui/apps/JanusMishapDialog.js
 * @phase 6 (UI) / 8 (Mishap Extension)
 *
 * Zeigt dem SL den gewürfelten Patzer-Eintrag.
 * Buttons: "An alle posten" (ChatMessage) · "Neu würfeln" · Schließen.
 *
 * Wird über JanusMishapDialog.showForMishap(mishap, context) geöffnet â€”
 * typischerweise aus bootMishapGenerator() heraus nach einem erkannten Patzer.
 * Kann auch manuell über JanusMishapDialog.showSingleton() geöffnet werden.
 */

import { JanusBaseApp } from '../core/base-app.js';
import { moduleTemplatePath } from '../../core/common.js';

export class JanusMishapDialog extends JanusBaseApp {

  static DEFAULT_OPTIONS = {
    id: 'janus7-mishap-dialog',
    classes: ['janus7-app', 'janus7-mishap-dialog'],
    position: { width: 500, height: 'auto' },
    window: {
      title: 'Patzer-Generator · Akademie',
      resizable: false,
      minimizable: true,
      icon: 'fas fa-bomb',
    },
    actions: {
      postToChat: 'onPostToChat',
      reroll: 'onReroll',
    },
  };

  static PARTS = {
    content: {
      template: moduleTemplatePath('extensions/mishap-generator/mishap-dialog.hbs'),
    },
  };

  /**
   * @param {object} mishap   â€” Eintrag aus mishaps.json
   * @param {object} context  â€” { spellName, actorName }
   * @param {object} options  â€” AppV2 options
   */
  constructor(mishap = null, context = {}, options = {}) {
    super(options);
    this._mishap  = mishap;
    this._context = context;
  }

  // â”€â”€â”€ Kontext â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _prepareContext(_options) {
    const mishap     = this._mishap;
    const spellName  = this._context?.spellName ?? 'â€”';
    const actorName  = this._context?.actorName ?? 'â€”';
    const isEmpty    = !mishap || mishap.id === '_empty';

    return { mishap, spellName, actorName, isEmpty };
  }

  // â”€â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async onPostToChat(_event, _target) {
    const mishap = this._mishap;
    if (!mishap || mishap.id === '_empty') return;

    const spellHint = this._context?.spellName
      ? `<em>Zauber: ${this._context.spellName}</em> · `
      : '';
    const actorHint = this._context?.actorName
      ? `<strong>${this._context.actorName}</strong> â€” `
      : '';

    await ChatMessage.create({
      content: `
        <div class="janus7-mishap-chat-msg">
          <p class="janus7-mishap-chat-header">
            <i class="fas fa-bomb"></i>
            <strong>Zauberei-Patzer!</strong>
          </p>
          <p>${actorHint}${spellHint}</p>
          <p class="janus7-mishap-chat-title">${mishap.title}</p>
          <p class="janus7-mishap-chat-text">${mishap.text}</p>
        </div>
      `,
      speaker: ChatMessage.getSpeaker({ alias: 'JANUS · Akademie' }),
    });

    await this.close();
  }

  async onReroll(_event, _target) {
    try {
      const { rollMishap } = await import('../../extensions/mishap-generator/mishap-generator.js');
      const newMishap = await rollMishap();
      if (!newMishap) return;
      this._mishap = newMishap;
      await this.render({ force: true });
    } catch (err) {
      (game?.janus7?.core?.logger ?? console).warn?.('[JANUS7][Mishap] Reroll fehlgeschlagen.', err);
    }
  }

  // â”€â”€â”€ Singleton-API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Öffnet den Dialog mit einem konkreten Patzer-Ergebnis.
   * Schließt eine ggf. bereits offene Instanz vorher.
   * @param {object} mishap
   * @param {object} [context]
   * @returns {JanusMishapDialog}
   */
  static showForMishap(mishap, context = {}) {
    if (this._instance?.rendered) {
      try { this._instance.close({ force: true }); } catch (_) {}
    }
    this._instance = new this(mishap, context);
    this._instance.render({ force: true });
    return this._instance;
  }

  /**
   * Öffnet den Dialog leer (für manuelle SL-Nutzung via Makro).
   * @returns {JanusMishapDialog}
   */
  static showSingleton() {
    if (this._instance?.rendered) {
      try { this._instance.bringToFront?.(); } catch (_) {}
      return this._instance;
    }
    const empty = { id: '_empty', title: 'Kein Patzer aktiv', text: 'Warte auf einen Zauber-Patzer im DSA5-Würfelprotokoll.' };
    return this.showForMishap(empty);
  }
}

