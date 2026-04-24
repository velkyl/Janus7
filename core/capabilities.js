/**
 * @file core/capabilities.js
 * @module janus7
 * @phase 1
 *
 * Zweck:
 * Stabiler externer Vertragsraum für JANUS7-Consumer (Makros, externe Skripte, Phase 7).
 * Schirmt externe Aufrufer von internen Engine-Strukturen ab.
 *
 * Architektur:
 * - Anti-Corruption-Layer: Capabilities delegieren auf interne Engines.
 * - Kein Live-State-Leak nach außen (nur Snapshots / Deep-Clones).
 * - Keine Business-Logik in dieser Datei (nur Adapter/Delegation).
 * - Bestehende Pfade (game.janus7.core.state etc.) bleiben unberührt.
 * - game.janus7.capabilities wird am Ende des ready()-Hooks eingefroren (Object.freeze).
 *
 * Invariante:
 * - Methoden dürfen nicht werfen, wenn die zugehörige Phase noch nicht geladen ist.
 *   Stattdessen: defensiver Null-Check + aussagekräftige Fehlermeldung.
 *
 * Verwendung:
 * ```js
 * // Zeit voranbringen
 * await game.janus7.capabilities.time.advanceDay();
 *
 * // Punkte gutschreiben
 * await game.janus7.capabilities.scoring.addCirclePoints('feuer', 5, 'Gute Antwort');
 *
 * // Quest starten
 * await game.janus7.capabilities.quests.startQuest('Q_DEMO_LIBRARY', { actorId: 'Actor.xyz' });
 *
 * // State-Snapshot (kein Live-Objekt)
 * const snap = game.janus7.capabilities.state.snapshot();
 * ```
 */

/**
 * Stabiler Capability-Vertrag für externe JANUS7-Consumer.
 *
 * @class JanusCapabilities
 */
export class JanusCapabilities {
  /**
   * @param {import('./index.js').Janus7Engine} engine - Die laufende JANUS7-Engine-Instanz.
   */
  constructor(engine) {
    /** @private */
    this._engine = engine;
    /** @private @type {Set<string>} */
    this._warned = new Set();

    /**
     * Zeit-Capabilities.
     * @type {Readonly<{ advanceSlot: Function, advanceDay: Function }>}
     */
    this.time = Object.freeze({
      /**
       * Rückt den Akademie-Kalender um einen Slot (Phase) vor.
       * @returns {Promise<void>}
       */
      advanceSlot: async () => {
        const cal = this._calendar();
        if (!cal?.advanceSlot) {
          this._warn('time.advanceSlot', 'Kalender nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return cal.advanceSlot();
      },

      /**
       * Rückt den Akademie-Kalender um einen Tag vor.
       * @returns {Promise<void>}
       */
      advanceDay: async () => {
        const cal = this._calendar();
        if (!cal?.advanceDay) {
          this._warn('time.advanceDay', 'Kalender nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return cal.advanceDay();
      },
    });

    /**
     * Scoring-Capabilities.
     * @type {Readonly<{ addCirclePoints: Function, addStudentPoints: Function }>}
     */
    this.scoring = Object.freeze({
      /**
       * Fügt Punkte zu einem Zirkel hinzu.
       * @param {string} circleId   - Zirkel-ID (z. B. 'feuer').
       * @param {number} delta      - Punktedelta (positiv oder negativ).
       * @param {string} [reason]   - Begründung für das Audit-Log.
       * @returns {Promise<void>}
       */
      addCirclePoints: async (circleId, delta, reason = 'manual') => {
        const scoring = this._scoring();
        if (!scoring?.addCirclePoints) {
          this._warn('scoring.addCirclePoints', 'Scoring-Engine nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return scoring.addCirclePoints(circleId, delta, reason, { source: 'capabilities' });
      },

      /**
       * Fügt Punkte zu einem Schüler hinzu.
       * @param {string} studentId  - Schüler-/NPC-ID.
       * @param {number} delta      - Punktedelta.
       * @param {string} [reason]   - Begründung für das Audit-Log.
       * @returns {Promise<void>}
       */
      addStudentPoints: async (studentId, delta, reason = 'manual') => {
        const scoring = this._scoring();
        if (!scoring?.addStudentPoints) {
          this._warn('scoring.addStudentPoints', 'Scoring-Engine nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return scoring.addStudentPoints(studentId, delta, reason, { source: 'capabilities' });
      },
    });

    /**
     * Quest-Capabilities.
     * @type {Readonly<{ startQuest: Function }>}
     */
    this.quests = Object.freeze({
      /**
       * Startet eine Quest für einen Akteur.
       * @param {string} questId          - Quest-ID (z. B. 'Q_DEMO_LIBRARY').
       * @param {{ actorId?: string }} [opts] - Optionen.
       * @returns {Promise<any>}
       */
      startQuest: async (questId, opts = {}) => {
        const quests = this._quests();
        if (!quests?.startQuest) {
          this._warn('quests.startQuest', 'Quest-Engine nicht verfügbar (Phase 4b noch nicht geladen?)');
          return null;
        }
        return quests.startQuest(questId, opts);
      },
    });

    /**
     * Lektion & Prüfungs-Capabilities.
     * Steuern den RollScoringConnector (welche Lektion/Prüfung gerade aktiv ist).
     * @type {Readonly<{ setActiveLesson: Function, setActiveExam: Function, clearActive: Function, getActive: Function }>}
     */
    this.lesson = Object.freeze({
      /**
       * Setzt die aktuell aktive Lektion.
       * @param {string} lessonId
       * @returns {Promise<void>}
       */
      setActiveLesson: async (lessonId) => {
        const connector = this._rollConnector();
        if (!connector?.setActiveLesson) {
          this._warn('lesson.setActiveLesson', 'RollScoringConnector nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return connector.setActiveLesson(lessonId);
      },

      /**
       * Setzt die aktuell aktive Prüfung.
       * @param {string} examId
       * @returns {Promise<void>}
       */
      setActiveExam: async (examId) => {
        const connector = this._rollConnector();
        if (!connector?.setActiveExam) {
          this._warn('lesson.setActiveExam', 'RollScoringConnector nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return connector.setActiveExam(examId);
      },

      /**
       * Beendet aktive Lektion oder Prüfung.
       * @returns {Promise<void>}
       */
      clearActive: async () => {
        const connector = this._rollConnector();
        if (!connector?.clearActive) {
          this._warn('lesson.clearActive', 'RollScoringConnector nicht verfügbar (Phase 4 noch nicht geladen?)');
          return;
        }
        return connector.clearActive();
      },

      /**
       * Gibt aktive Lektion/Prüfung aus dem State zurück.
       * @returns {{ activeLessonId: string|null, activeExamId: string|null }}
       */
      getActive: () => {
        const sim = this._engine?.core?.state?.get?.('simulation')
          ?? this._engine?.core?.state?.get?.('academy')
          ?? {};
        return {
          activeLessonId: sim?.activeLessonId ?? null,
          activeExamId:   sim?.activeExamId   ?? null,
        };
      },
    });

    /**
     * KI-Export/Import-Capabilities (Phase 7).
     * Stabiler Vertragspunkt für externe Makros + Phase-7-Roundtrip.
     * @type {Readonly<{ exportBundle: Function, preflightImport: Function, previewImport: Function, applyImport: Function, exportToOutbox: Function, importFromInbox: Function, getImportHistory: Function, listBackups: Function, restoreBackup: Function }>}
     */
    this.ki = Object.freeze({
      /**
       * Exportiert ein KI-Paket im JANUS_EXPORT_V2-Format.
       * @param {object} [opts]
       * @returns {Promise<object>} Export-Bundle
       */
      exportBundle: async (opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.exportBundle) {
          this._warn('ki.exportBundle', 'KI-Service nicht verfügbar (Phase 7 noch nicht geladen?)');
          return null;
        }
        return ki.exportBundle(opts);
      },

      /**
       * Zeigt eine Vorschau eines KI-Antwort-Patches ohne State-Mutation.
       * @param {object} response  - KI-Antwort (JANUS_IMPORT_V2 Format)
       * @param {object} [opts]
       * @returns {Promise<object>} Diff-Vorschau
       */
      preflightImport: async (response, opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.preflightImport) {
          this._warn('ki.preflightImport', 'KI-Service nicht verfügbar (Phase 7 noch nicht geladen?)');
          return { ok: false, errors: ['KI-Service nicht verfügbar'] };
        }
        return ki.preflightImport(response, opts);
      },

      previewImport: async (response, opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.previewImport) {
          this._warn('ki.previewImport', 'KI-Service nicht verfügbar (Phase 7 noch nicht geladen?)');
          return null;
        }
        return ki.previewImport(response, opts);
      },

      /**
       * Wendet einen KI-Antwort-Patch transaktional auf den State an.
       * @param {object} response  - KI-Antwort (JANUS_IMPORT_V2 Format)
       * @param {object} [opts]
       * @returns {Promise<object>} Import-Ergebnis
       */
      applyImport: async (response, opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.applyImport) {
          this._warn('ki.applyImport', 'KI-Service nicht verfügbar (Phase 7 noch nicht geladen?)');
          return null;
        }
        return ki.applyImport(response, opts);
      },

      /**
       * Schreibt ein Export-Bundle in den Dateisystem-Outbox.
       * @param {object} [opts]
       * @returns {Promise<object>}
       */
      exportToOutbox: async (opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.exportToOutbox) {
          this._warn('ki.exportToOutbox', 'KI-IO-Service nicht verfügbar (Phase 7 noch nicht geladen?)');
          return null;
        }
        return ki.exportToOutbox(opts);
      },

      /**
       * Liest und importiert ein Bundle aus dem Filesystem-Inbox.
       * @param {string} filename
       * @param {object} [opts]
       * @returns {Promise<object>}
       */
      importFromInbox: async (filename, opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.importFromInbox) {
          this._warn('ki.importFromInbox', 'KI-IO-Service nicht verfügbar (Phase 7 noch nicht geladen?)');
          return null;
        }
        return ki.importFromInbox(filename, opts);
      },

      /**
       * Gibt die Liste vergangener KI-Imports zurück.
       * @returns {object[]}
       */
      getImportHistory: () => {
        const ki = this._ki();
        if (!ki?.getImportHistory) return [];
        return ki.getImportHistory();
      },

      listBackups: async () => {
        const ki = await this._ensureKi();
        if (!ki?.listBackups) return [];
        return ki.listBackups();
      },

      restoreBackup: async (fileRef, opts = {}) => {
        const ki = await this._ensureKi();
        if (!ki?.restoreBackup) {
          this._warn('ki.restoreBackup', 'KI-Backup-Restore nicht verfügbar (Phase 7 noch nicht geladen?)');
          return null;
        }
        return ki.restoreBackup(fileRef, opts);
      },
    });

    /**
     * State-Capabilities.
     * @type {Readonly<{ snapshot: Function, runHealthCheck: Function }>}
     */
    this.state = Object.freeze({
      /**
       * Gibt einen tiefen Klon des aktuellen JANUS7-States zurück.
       * Kein Live-Objekt, keine Referenz auf interne State-Strukturen.
       * @returns {object|null}
       */
      snapshot: () => {
        const state = this._engine?.core?.state;
        if (!state) return null;
        // snapshot() liefert bereits einen deep-clone (Phase 1 Invariante)
        return state.snapshot?.() ?? foundry.utils.deepClone(state._state ?? {});
      },

      /**
       * Führt eine schnelle Integritätsprüfung des JANUS7-Systems aus.
       * @returns {Promise<object>} Diagnostics-Ergebnis
       */
      runHealthCheck: async () => {
        try {
          const diagFn = this._engine?.diagnostics?.run;
          if (typeof diagFn === 'function') {
            const report = await diagFn({ notify: false, verbose: false });
            return {
              ...report,
              status: report.health ?? (report.ok ? 'ok' : 'fail'),
            };
          }
          // Fallback: minimale State-Prüfung
          const snap = this._engine?.core?.state?.snapshot?.();
          return {
            status: snap ? 'ok' : 'no-state',
            meta: snap?.meta ?? null,
          };
        } catch (err) {
          return { status: 'error', message: err?.message };
        }
      },
    });

    /**
     * Externe Brücken (SQL / Python).
     * @type {Readonly<{ python: Function, sqlite: Function }>}
     */
    this.ext = Object.freeze({
      /**
       * Führt ein Python-Skript aus.
       * @param {string} script - Pfad zum Skript.
       * @param {object} [args={}] - Argumente.
       * @returns {Promise<any>}
       */
      runScript: async (script, args = {}) => {
        const python = this._engine?.ext?.python;
        if (!python) {
          this._warn('ext.runScript', 'Python-Service nicht verfügbar.');
          return null;
        }
        return python.execute(script, args);
      },

      /**
       * Führt eine SQL-Abfrage aus.
       * @param {string} db - Pfad zur DB.
       * @param {string} query - SQL-Query.
       * @param {any[]} [params=[]] - Parameter.
       * @returns {Promise<any[]>}
       */
      querySql: async (db, query, params = []) => {
        const sqlite = this._engine?.ext?.sqlite;
        if (!sqlite) {
          this._warn('ext.querySql', 'SQLite-Service nicht verfügbar.');
          return [];
        }
        return sqlite.query(db, query, params);
      }
    });
  }

  // ── Private Hilfsmethoden ────────────────────────────────────────────────

  /** @private */
  _calendar() {
    return this._engine?.simulation?.calendar
      ?? this._engine?.academy?.calendar
      ?? this._engine?.calendar
      ?? null;
  }

  /** @private */
  _scoring() {
    return this._engine?.simulation?.scoring
      ?? this._engine?.academy?.scoring
      ?? null;
  }

  /** @private */
  _quests() {
    return this._engine?.simulation?.quests
      ?? this._engine?.academy?.quests
      ?? null;
  }

  /** @private */
  _rollConnector() {
    return this._engine?.academy?.rollConnector ?? null;
  }

  /** @private */
  _ki() {
    return this._engine?.ki ?? this._engine?.ai ?? null;
  }

  /** @private */
  async _ensureKi() {
    let ki = this._ki();
    if (ki?.exportBundle || ki?.previewImport || ki?.applyImport) return ki;

    try {
      const mod = await import('../scripts/integration/phase7-ki-integration.js');
      mod?.attachPhase7Ki?.(this._engine);
    } catch (err) {
      (this._engine?.core?.logger ?? console)
        .warn?.('[JANUS7][Capabilities.ki] ensure attach failed', { message: err?.message });
    }

    ki = this._ki();
    return ki ?? null;
  }

  /** @private */
  _warn(method, msg) {
    if (this._warned.has(method)) return;
    this._warned.add(method);
    (this._engine?.core?.logger ?? console)
      .warn?.(`[JANUS7][Capabilities.${method}] ${msg}`);
  }
}
