/**
 * @file bridge/dsa5/group-check.js
 * @module janus7/bridge/dsa5
 * @phase 3
 *
 * Zweck:
 *   Kapselt die DSA5-Gruppenprobe (GroupCheck / GC) für JANUS7-Akademie-Prüfungen.
 *   Nutzt `game.dsa5.apps.RequestRoll.showGCMessage()` als einzigen Einstiegspunkt.
 *
 * Architektur:
 *   - Keine direkten dsa5-Interna außer dem dokumentierten game.dsa5.apps.RequestRoll.
 *   - Kein UI-Coupling. Rückgabe der Chat-Message-ID für nachgelagerte Auswertung.
 *   - Lauscht optional auf 'postProcessDSARoll' um Ergebnisse zu aggregieren.
 *
 * Öffentliche API:
 *   groupCheck.showGroupCheckMessage(opts)     → ChatMessage-ID
 *   groupCheck.waitForGroupCheckResults(opts)  → Promise<GCResult>
 *   groupCheck.conductGroupExam(opts)          → Promise<GCResult> (kombiniert beides)
 */

/**
 * @typedef {Object} GroupCheckOptions
 * @property {string}   skillName      - Lokalisierter Talentname (muss in DSA5-Kompendia vorhanden sein)
 * @property {number}   [modifier=0]   - Erschwernis / Erleichterung
 * @property {number}   [maxRolls=6]   - Anzahl erwarteter Würfe (= Schülerzahl)
 * @property {number}   [targetQs=10]  - Ziel-Qualitätsstufen-Summe
 * @property {string}   [label]        - Optionaler Anzeigetitel (Default: skillName)
 * @property {boolean}  [gmOnly=false] - Wenn true: Nachricht nur sichtbar für GM
 */

/**
 * @typedef {Object} GCResult
 * @property {string}   messageId      - Foundry ChatMessage-ID
 * @property {number}   totalQs        - Summierte Qualitätsstufen aller Würfe
 * @property {number}   successCount   - Anzahl bestandener Proben (successLevel >= 0)
 * @property {number}   failCount      - Anzahl gescheiterter Proben
 * @property {boolean}  botched        - Mindestens ein Patzer enthalten
 * @property {boolean}  targetMet      - totalQs >= targetQs
 * @property {Array}    results        - Rohdaten aus DSA5 GC-Message flags
 */

export class DSA5GroupCheckBridge {
  /**
   * @param {object} deps
   * @param {Console} [deps.logger]
   */
  constructor({ logger } = {}) {
    this.logger = logger ?? console;
  }

  // ─── Öffentliche API ────────────────────────────────────────────────────────

  /**
   * Erstellt eine DSA5-Gruppenproben-Chat-Nachricht.
   * Spieler sehen die Nachricht und können per Klick auf das Icon würfeln.
   *
   * @param {GroupCheckOptions} opts
   * @returns {Promise<string>} Chat-Message-ID der erzeugten GC-Nachricht
   * @throws {Error} wenn DSA5 nicht verfügbar oder Talent unbekannt
   *
   * @example
   * const msgId = await groupCheck.showGroupCheckMessage({
   *   skillName: 'Magiekunde',
   *   modifier: -2,
   *   maxRolls: 5,
   *   targetQs: 8,
   *   label: 'Abschlussprüfung Arkanologie'
   * });
   */
  async showGroupCheckMessage({
    skillName,
    modifier = 0,
    maxRolls = 6,
    targetQs = 10,
    label = null,
    gmOnly = false,
  }) {
    this._assertAvailable();

    const RequestRoll = game.dsa5?.apps?.RequestRoll;
    if (!RequestRoll?.showGCMessage) {
      throw new Error('JANUS7 GroupCheck: game.dsa5.apps.RequestRoll.showGCMessage nicht verfügbar');
    }

    // Talenttyp ermitteln (skill / spell / liturgy etc.)
    const skillType = await this._resolveSkillType(skillName);
    if (!skillType) {
      throw new Error(`JANUS7 GroupCheck: Talent "${skillName}" nicht in DSA5-Kompendium gefunden`);
    }

    const configuration = {
      maxRolls,
      openRolls: maxRolls,
      doneRolls: 0,
      targetQs,
      rollOptions: [
        {
          type: skillType,
          modifier,
          calculatedModifier: modifier,
          target: skillName,
        },
      ],
    };

    // datasetOptions für Anzeige im Chat
    const datasetOptions = label ? { label } : {};

    // modeOverride: 'gmroll' = sichtbar für GM + Würfelnder, false = öffentlich
    const modeOverride = gmOnly ? 'gmroll' : false;

    this.logger?.info?.('JANUS7 | GroupCheck | Erstelle GC-Nachricht', {
      skillName,
      skillType,
      modifier,
      maxRolls,
      targetQs,
    });

    // DSA5 erstellt die Chat-Nachricht intern
    await RequestRoll.showGCMessage(skillName, modifier, configuration, {
      datasetOptions,
      modeOverride,
    });

    // Nachricht-ID aus dem letzten Chat-Eintrag auslesen
    // (DSA5 gibt keine ID zurück, daher letzten Eintrag nehmen)
    const messageId = this._getLastChatMessageId();

    this.logger?.info?.('JANUS7 | GroupCheck | Nachricht erstellt', { messageId });

    return messageId;
  }

  /**
   * Wartet auf den Abschluss einer laufenden Gruppenprobe.
   * Resolved wenn alle erwarteten Würfe eingegangen sind ODER der Timeout abläuft.
   *
   * @param {object} opts
   * @param {string} opts.messageId     - ID der GC-Chat-Nachricht
   * @param {number} opts.expectedRolls - Wie viele Würfe erwartet werden
   * @param {number} [opts.targetQs=10] - Ziel-QS-Summe für targetMet
   * @param {number} [opts.timeoutMs=300000] - Timeout in ms (Default: 5 Minuten)
   * @returns {Promise<GCResult>}
   */
  async waitForGroupCheckResults({
    messageId,
    expectedRolls,
    targetQs = 10,
    timeoutMs = 300_000,
  }) {
    this._assertAvailable();

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let hookId = null;
      let intervalId = null;

      const finish = (reason) => {
        if (hookId !== null) Hooks.off('updateChatMessage', hookId);
        if (intervalId !== null) clearInterval(intervalId);
        try {
          const result = this._extractGCResult(messageId, targetQs);
          this.logger?.info?.('JANUS7 | GroupCheck | Abgeschlossen', { reason, ...result });
          resolve(result);
        } catch (err) {
          this.logger?.error?.('JANUS7 | GroupCheck | _extractGCResult fehlgeschlagen', { reason, err: err?.message });
          reject(err);
        }
      };

      // Lauscht auf Chat-Message-Updates (DSA5 rerenderGC schreibt flags.gc)
      hookId = Hooks.on('updateChatMessage', (message, _diff, _opts, _userId) => {
        if (message.id !== messageId) return;
        const gcData = message.flags?.gc;
        if (!gcData) return;

        const doneRolls = gcData.results?.length ?? 0;
        if (doneRolls >= expectedRolls) {
          finish('all_rolls_complete');
        }
      });

      // Timeout-Wächter
      intervalId = setInterval(() => {
        if (Date.now() - startTime >= timeoutMs) {
          finish('timeout');
        }
      }, 5000);
    });
  }

  /**
   * Kombiniert showGroupCheckMessage + waitForGroupCheckResults.
   * Für die Exam-Engine: feuert die GC und wartet auf Ergebnisse.
   *
   * @param {GroupCheckOptions & { expectedRolls?: number, timeoutMs?: number }} opts
   * @returns {Promise<GCResult>}
   *
   * @example
   * const result = await bridge.groupCheck.conductGroupExam({
   *   skillName: 'Magiekunde',
   *   modifier: -2,
   *   maxRolls: 5,
   *   expectedRolls: 5,
   *   targetQs: 8,
   *   label: 'Arkanologie-Abschlussprüfung'
   * });
   * // result.targetMet → true/false
   * // result.totalQs  → z.B. 12
   */
  async conductGroupExam({
    skillName,
    modifier = 0,
    maxRolls = 6,
    expectedRolls = null,
    targetQs = 10,
    label = null,
    gmOnly = false,
    timeoutMs = 300_000,
  }) {
    const messageId = await this.showGroupCheckMessage({
      skillName,
      modifier,
      maxRolls,
      targetQs,
      label,
      gmOnly,
    });

    const result = await this.waitForGroupCheckResults({
      messageId,
      expectedRolls: expectedRolls ?? maxRolls,
      targetQs,
      timeoutMs,
    });

    return result;
  }

  // ─── Interne Hilfsmethoden ──────────────────────────────────────────────────

  /**
   * Prüft DSA5-Verfügbarkeit.
   * @private
   */
  _assertAvailable() {
    if (!game?.dsa5?.apps?.RequestRoll) {
      throw new Error('JANUS7 GroupCheck: DSA5-System nicht initialisiert (game.dsa5 fehlt)');
    }
  }

  /**
   * Ermittelt den DSA5-Itemtyp eines Talents anhand des Namens.
   * Sucht in der Skill-Autocomplete-Liste von DSA5.
   *
   * @param {string} skillName
   * @returns {Promise<string|null>} 'skill' | 'spell' | 'liturgy' | 'ritual' | 'ceremony' | null
   * @private
   */
  async _resolveSkillType(skillName) {
    try {
      // DSA5ChatAutoCompletion.skills ist nach 'ready' verfügbar
      const DSA5ChatAutoCompletion = game.dsa5?.apps?.DSA5_Utility
        ? null
        : null;

      // Primär: über die autocompletion-Liste (schnell, gecacht)
      // Diese wird von DSA5 bei ready befüllt und enthält name + type
      const autoSkills = game.dsa5?.config?.skills
        ?? (await this._loadSkillsFromPacks());

      if (autoSkills) {
        const found = autoSkills.find(
          (s) => s.name?.toLowerCase() === skillName.toLowerCase()
        );
        if (found) return found.type ?? 'skill';
      }

      // Fallback: direkte Suche über allSkills() (teuer aber zuverlässig)
      const skills = await game.dsa5.apps.DSA5_Utility.allSkills();
      const skill = skills?.find(
        (s) => s.name?.toLowerCase() === skillName.toLowerCase()
      );
      if (skill) return skill.type ?? 'skill';

      return null;
    } catch (err) {
      this.logger?.warn?.('JANUS7 | GroupCheck | _resolveSkillType fehlgeschlagen', {
        skillName,
        error: err?.message,
      });
      // Graceful fallback: die meisten Akademie-Talente sind 'skill'
      return 'skill';
    }
  }

  /**
   * Lädt Skills aus DSA5-Packs als Fallback.
   * @private
   */
  async _loadSkillsFromPacks() {
    try {
      const skills = await game.dsa5.apps.DSA5_Utility.allSkills();
      return skills ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Liest die letzte erzeugte Chat-Message-ID aus.
   * DSA5 gibt beim showGCMessage keine ID zurück, daher holen wir
   * die jüngste Nachricht aus game.messages.
   *
   * @returns {string|null}
   * @private
   */
  _getLastChatMessageId() {
    const messages = [...(game.messages?.contents ?? [])];
    if (!messages.length) return null;
    // Neueste zuerst (messages sind chronologisch sortiert)
    return messages[messages.length - 1]?.id ?? null;
  }

  /**
   * Liest GC-Ergebnis aus den flags einer Chat-Nachricht.
   *
   * @param {string} messageId
   * @param {number} targetQs
   * @returns {GCResult}
   * @private
   */
  _extractGCResult(messageId, targetQs) {
    const message = game.messages?.get(messageId);
    const gcData = message?.flags?.gc ?? {};
    const results = gcData.results ?? [];

    const totalQs = gcData.qs ?? results.reduce((sum, r) => sum + (r.qs ?? 0), 0);
    const successCount = results.filter((r) => (r.success ?? 0) >= 0).length;
    const failCount = results.filter((r) => (r.success ?? 0) < 0).length;
    const botched = gcData.botched ?? false;

    return {
      messageId,
      totalQs,
      successCount,
      failCount,
      botched,
      targetMet: totalQs >= targetQs,
      results,
    };
  }
}
