import { JanusUI } from '../../helpers.js';
import { JanusConfig } from '../../../core/config.js';

/** @param {any} ctx */
function resolveEngine(ctx) {
  if (ctx && typeof ctx._getEngine === 'function') return ctx._getEngine();
  return globalThis.game?.janus7 ?? null;
}

export const CONTROL_PANEL_ACTIONS = {
      // ── UI Apps (alle Oberflächen) ────────────────────────────────────────
      async openAcademyOverview(_ev)  { return resolveEngine(this)?.ui?.open?.('academyOverview'); },
      async openScoring(_ev)          { return resolveEngine(this)?.ui?.open?.('scoringView'); },
      async openSocial(_ev)           { return resolveEngine(this)?.ui?.open?.('socialView'); },
      async openScoringView(_ev)      { return resolveEngine(this)?.ui?.open?.('scoringView'); },
      async openSocialView(_ev)       { return resolveEngine(this)?.ui?.open?.('socialView'); },
      async openAtmosphereDJ(_ev)     { return resolveEngine(this)?.ui?.open?.('atmosphereDJ'); },
      async openStateInspector(_ev)   { return resolveEngine(this)?.ui?.open?.('stateInspector'); },
      async openCommandCenter(_ev)    { return resolveEngine(this)?.ui?.open?.('commandCenter'); },
      async openConfigPanel(_ev)      { return resolveEngine(this)?.ui?.open?.('configPanel'); },
      async openAcademyDataStudio(_ev){ return resolveEngine(this)?.ui?.open?.('academyDataStudio'); },
      async openLessonLibrary(_ev)    { return resolveEngine(this)?.ui?.open?.('lessonLibrary'); },
      async openSessionPrepWizard(_ev){ return resolveEngine(this)?.ui?.open?.('sessionPrepWizard'); },
      async openKiBackupManager(_ev){ return resolveEngine(this)?.ui?.open?.('kiBackupManager'); },

      // ── Sync Panel ────────────────────────────────────────────────────────
      async openSyncPanel(_ev) {
        return resolveEngine(this)?.ui?.open?.('syncPanel');
      },

      // ── Phase 7 (KI Roundtrip; AI = Legacy Alias) ───────────────────────────────
      async openKiRoundtrip(_ev) {
        const e = resolveEngine(this);
        if (!game?.user?.isGM) { ui.notifications?.warn?.('Nur der GM kann den KI-Roundtrip öffnen.'); return false; }
        if (JanusConfig.get('enablePhase7') === false) { ui.notifications?.warn?.('Phase 7 ist deaktiviert.'); return false; }
        return e?.ui?.open?.('kiRoundtrip');
      },

      // ── KI-Kontext-Aktionen (KI-Tab) ─────────────────────────────────────
      /** Export das Bundle mit _kiContextItems als contextHints, kopiert in Clipboard. */
      async kiExportClipboard(_ev) {
        const e = resolveEngine(this);
        if (!game?.user?.isGM) { ui.notifications?.warn?.('GM only.'); return; }
        try {
          const bundle = await this._buildKiBundle(e);
          await JanusUI.copyToClipboard(JSON.stringify(bundle, null, 2));
          ui.notifications?.info?.('KI-Bundle in Zwischenablage kopiert.');
        } catch (err) {
          this._getLogger().warn?.('[JANUS7][Director] kiExportClipboard failed', err);
          ui.notifications?.error?.('Export fehlgeschlagen (siehe Konsole).');
        }
      },

      /** Export das Bundle als JSON-Datei (Outbox). */
      async kiExportFile(_ev) {
        const e = resolveEngine(this);
        if (!game?.user?.isGM) { ui.notifications?.warn?.('GM only.'); return; }
        try {
          const bundle = await this._buildKiBundle(e);
          const filename = `ki_export_${Date.now()}.json`;
          // Nutze capabilities.ki.exportToOutbox wenn verfügbar (capabilities-first), sonst saveDataToFile
          const kiApi = e?.capabilities?.ki ?? e?.ki ?? null;
          if (kiApi?.exportToOutbox) {
            const result = await kiApi.exportToOutbox({ contextHints: bundle.contextHints ?? [] });
            ui.notifications?.info?.(`KI-Bundle exportiert: ${result?.filename ?? filename}`);
          } else {
            await saveDataToFile(JSON.stringify(bundle, null, 2), 'text/json', filename);
            ui.notifications?.info?.(`KI-Bundle gespeichert: ${filename}`);
          }
        } catch (err) {
          this._getLogger().warn?.('[JANUS7][Director] kiExportFile failed', err);
          ui.notifications?.error?.('Export fehlgeschlagen (siehe Konsole).');
        }
      },

      /** Leert die KI-Kontext-Drop-Zone. */
      async kiClearContext(_ev) {
        this._kiContextItems = [];
        this.render({ force: true });
        ui.notifications?.info?.('KI-Kontext geleert.');
      },

      /** Liest die Import-Textarea, ruft engine.ki.previewImport(), zeigt Diff. */
      async kiPreviewImport(_ev) {
        const e = resolveEngine(this);
        if (!game?.user?.isGM) { ui.notifications?.warn?.('GM only.'); return; }
        const textarea = this.element?.querySelector?.('.j7-ki-import-textarea');
        const diffOutput = this.element?.querySelector?.('.j7-ki-diff-output');
        if (!textarea) { ui.notifications?.warn?.('Import-Textfeld nicht gefunden.'); return; }
        let patch;
        try { patch = JSON.parse(textarea.value); }
        catch { ui.notifications?.error?.('Ungültiges JSON im Import-Textfeld.'); return; }
        try {
          const diffs = await (e?.capabilities?.ki ?? e?.ki)?.previewImport?.(patch) ?? [];
          if (diffOutput) diffOutput.textContent = JSON.stringify(diffs, null, 2);
          ui.notifications?.info?.(`Preview: ${Array.isArray(diffs) ? diffs.length : '?'} Änderungen gefunden.`);
        } catch (err) {
          if (diffOutput) diffOutput.textContent = `Fehler: ${err?.message}`;
          this._getLogger().warn?.('[JANUS7][Director] kiPreviewImport failed', err);
          ui.notifications?.error?.('Preview fehlgeschlagen (siehe Konsole).');
        }
      },

      /** Wendet den Import aus der Textarea transaktional an. */
      async kiApplyImport(_ev) {
        const e = resolveEngine(this);
        if (!game?.user?.isGM) { ui.notifications?.warn?.('GM only.'); return; }
        const textarea = this.element?.querySelector?.('.j7-ki-import-textarea');
        if (!textarea) { ui.notifications?.warn?.('Import-Textfeld nicht gefunden.'); return; }
        let patch;
        try { patch = JSON.parse(textarea.value); }
        catch { ui.notifications?.error?.('Ungültiges JSON im Import-Textfeld.'); return; }
        // Sicherheitsdialog
        const ok = await this._confirmKiApply();
        if (!ok) return;
        try {
          const result = await (e?.capabilities?.ki ?? e?.ki)?.applyImport?.(patch);
          ui.notifications?.info?.(`KI-Import angewandt: ${result?.applied ?? '?'} Änderungen.`);
          this.render({ force: true });
        } catch (err) {
          this._getLogger().warn?.('[JANUS7][Director] kiApplyImport failed', err);
          ui.notifications?.error?.('Import fehlgeschlagen — State unverändert (Rollback). Siehe Konsole.');
        }
      },

      // ── Quest ─────────────────────────────────────────────────────────────
      async openQuestJournal(_ev) {
        try {
          const mod = await import('../../../scripts/ui/quest-journal.js');
          new mod.JanusQuestJournal().render({ force: true, focus: true });
          return true;
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] openQuestJournal failed', err);
          ui.notifications?.error?.('Quest-Journal konnte nicht geöffnet werden.');
          return false;
        }
      },
      async openQuestSuggestions(_ev) {
        const e = resolveEngine(this);
        try {
          const s = this._buildQuestSuggestionsFallback(e);
          return await this._openQuestSuggestionsDialog(s);
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] openQuestSuggestions failed', err);
          ui.notifications?.warn?.('Quest-Vorschläge konnten nicht angezeigt werden.');
          return false;
        }
      },
      async openTestResults(_ev) { return resolveEngine(this)?.test?.openResults?.(); },
      async openGuidedManualTests(_ev) { resolveEngine(this)?.test?.openGuidedManualTests?.(); return true; },

      // ── Settings ─────────────────────────────────────────────────────────
      async openSettings(_ev) {
        const e = resolveEngine(this);
        try {
          if (e?.ui?.apps?.settingsTestHarness) return e.ui.open('settingsTestHarness');
        } catch (_) {}
        try {
          game?.settings?.sheet?.render?.(true);
          ui.notifications?.info?.('Foundry-Einstellungen geöffnet.');
          return true;
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] openSettings failed', err);
          return false;
        }
      },

      async openTroubleshooting(_ev) {
        const content = `<div class="janus7-card j7-dialog-card-reset">
          <p class="j7-dialog-heading"><strong>Troubleshooting</strong></p>
          <ol class="j7-dialog-list">
            <li>Browser-Cache + Foundry-Cache löschen.</li>
            <li>Module-Ordner muss exakt <code>&lt;Foundry-Data&gt;/Data/modules/&lt;janus7&gt;/</code> heißen.</li>
            <li>Konsole: Suche nach <code>[JANUS7]</code>, <code>SyntaxError</code>, <code>Failed to fetch</code>.</li>
            <li><code>game.janus7.test.runCatalog({openWindow:true})</code> ausführen.</li>
          </ol>
        </div>`;
        try {
          const D2 = foundry?.applications?.api?.DialogV2;
          if (D2?.prompt) {
            await D2.prompt({ window: { title: 'JANUS7 — Troubleshooting' }, content, ok: { label: 'OK' }, rejectClose: false, modal: true });
            return true;
          }
          return await Dialog.prompt({ title: 'JANUS7 — Troubleshooting', content, label: 'OK' });
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] openTroubleshooting failed', err);
          return false;
        }
      },

      // ── Zeitsteuerung ────────────────────────────────────────────────────
      async advanceSlot(ev) {
        const e   = resolveEngine(this);
        const steps = Number(ev?.currentTarget?.dataset?.steps ?? '1');
        try {
          if (Number.isFinite(steps) && e?.commands?.advanceSlot) return await e.commands.advanceSlot({ amount: steps });
          if (Number.isFinite(steps) && e?.calendar?.advanceSlot)  return await e.calendar.advanceSlot({ steps });
          throw new Error('advanceSlot not available');
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] advanceSlot failed', err);
          ui.notifications?.error?.('advanceSlot fehlgeschlagen.');
          return false;
        }
      },
      async advancePhase(_ev) {
        const e = resolveEngine(this);
        if (e?.commands?.advancePhase) return await e.commands.advancePhase({});
        ui.notifications?.warn?.('advancePhase nicht verfügbar.'); return false;
      },
      async advanceDay(_ev) {
        const e = resolveEngine(this);
        if (e?.commands?.advanceDay) return await e.commands.advanceDay({});
        ui.notifications?.warn?.('advanceDay nicht verfügbar.'); return false;
      },

      async startDirectorDay(_ev) {
        const e = resolveEngine(this);
        const director = e?.core?.director ?? e?.director;
        try {
          if (!director?.kernel?.startDay) throw new Error('director.kernel.startDay nicht verfügbar');
          const result = await director.kernel.startDay({
            advanceDay: false,
            triggerQueuedEvents: true,
            evaluateSocial: true,
            generateQuests: true,
            runLesson: false,
            save: true,
          });
          const summary = [];
          summary.push(`Queue: ${result?.queued?.processed?.length ?? 0}`);
          summary.push(`Social: ${result?.social?.available ? 'ok' : 'n/a'}`);
          summary.push(`Quest-Ideen: ${result?.quests?.suggestions?.length ?? 0}`);
          this._rememberDirectorWorkflow('startDirectorDay', result);
          ui.notifications?.info?.(`Director-Tagesstart ausgeführt. ${summary.join(' · ')}`);
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('startDirectorDay', null, { error: err });
          this._getLogger().warn?.('[JANUS7] startDirectorDay failed', err);
          ui.notifications?.error?.('Director-Tagesstart fehlgeschlagen.');
          return false;
        }
      },
      async directorRunLesson(_ev) {
        const e = resolveEngine(this);
        const director = e?.core?.director ?? e?.director;
        try {
          if (!director?.kernel?.runLesson) throw new Error('director.kernel.runLesson nicht verfügbar');
          const result = await director.kernel.runLesson({ save: false });
          if (!result?.ok) {
            ui.notifications?.warn?.(`Keine Lesson gestartet (${result?.reason ?? 'unbekannt'}).`);
            return result;
          }
          this._rememberDirectorWorkflow('directorRunLesson', result);
          ui.notifications?.info?.(`Lesson gestartet: ${result?.lesson?.title ?? result?.lessonId ?? 'unbekannt'}`);
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('directorRunLesson', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorRunLesson failed', err);
          ui.notifications?.error?.('Lesson-Start fehlgeschlagen.');
          return false;
        }
      },
      async directorProcessQueue(_ev) {
        const e = resolveEngine(this);
        const director = e?.core?.director ?? e?.director;
        try {
          if (!director?.kernel?.dequeueQueuedEvents) throw new Error('director.kernel.dequeueQueuedEvents nicht verfügbar');
          const result = await director.kernel.dequeueQueuedEvents({ limit: 3, present: true, save: true });
          this._rememberDirectorWorkflow('directorProcessQueue', result);
          ui.notifications?.info?.(`Queue verarbeitet: ${result?.processed?.length ?? 0} Events, verbleibend ${result?.remainingCount ?? 0}.`);
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('directorProcessQueue', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorProcessQueue failed', err);
          ui.notifications?.error?.('Event-Queue Verarbeitung fehlgeschlagen.');
          return false;
        }
      },
      async directorGenerateQuests(_ev) {
        const e = resolveEngine(this);
        const director = e?.core?.director ?? e?.director;
        try {
          if (!director?.kernel?.generateQuests) throw new Error('director.kernel.generateQuests nicht verfügbar');
          const result = await director.kernel.generateQuests({ limit: 5 });
          const count = result?.suggestions?.length ?? 0;
          this._rememberDirectorWorkflow('directorGenerateQuests', result);
          ui.notifications?.info?.(`Quest-Vorschläge aktualisiert: ${count} Treffer.`);
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('directorGenerateQuests', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorGenerateQuests failed', err);
          ui.notifications?.error?.('Quest-Vorschläge konnten nicht erzeugt werden.');
          return false;
        }
      },
      async directorAcceptQuestSuggestion(ev) {
        const e = resolveEngine(this);
        const director = e?.core?.director ?? e?.director;
        const questId = String(ev?.currentTarget?.dataset?.questId ?? '').trim();
        if (!questId) {
          ui.notifications?.warn?.('Kein Quest-Vorschlag ausgewählt.');
          return false;
        }
        try {
          const actor = await this._chooseQuestStartActor();
          const actorId = actor?.uuid ?? 'party';
          const actorLabel = actor?.label ?? actorId;
          if (!director?.kernel?.acceptQuest) throw new Error('director.kernel.acceptQuest nicht verfügbar');
          const accepted = await director.kernel.acceptQuest(questId, actorId, { save: true });
          if (!accepted?.ok) throw new Error(accepted?.reason ?? 'Quest-Übernahme fehlgeschlagen');
          const title = accepted?.title ?? accepted?.quest?.title ?? accepted?.quest?.name ?? questId;
          const workflowResult = {
            ok: true,
            questStarted: { questId, actorId, actorLabel, title },
            acceptance: accepted,
            suggestions: (this._directorWorkflow?.lastResult?.suggestions ?? []).filter((entry) => {
              const id = entry?.quest?.id ?? entry?.id ?? null;
              return id && id !== questId;
            })
          };
          this._rememberDirectorWorkflow('directorAcceptQuestSuggestion', workflowResult);
          ui.notifications?.info?.(`Quest gestartet: ${title} (${actorLabel})`);
          await this.render?.(true);
          return workflowResult;
        } catch (err) {
          this._rememberDirectorWorkflow('directorAcceptQuestSuggestion', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorAcceptQuestSuggestion failed', err);
          ui.notifications?.error?.('Quest-Vorschlag konnte nicht übernommen werden.');
          return false;
        }
      },
      async directorEvaluateSocial(_ev) {
        const e = resolveEngine(this);
        const director = e?.core?.director ?? e?.director;
        try {
          if (!director?.kernel?.evaluateSocialLinks) throw new Error('director.kernel.evaluateSocialLinks nicht verfügbar');
          const result = await director.kernel.evaluateSocialLinks({ save: true });
          const advanced = Array.isArray(result?.advanced) ? result.advanced.length : 0;
          this._rememberDirectorWorkflow('directorEvaluateSocial', result);
          ui.notifications?.info?.(`Social-Link-Auswertung abgeschlossen: ${advanced} Fortschritte.`);
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('directorEvaluateSocial', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorEvaluateSocial failed', err);
          ui.notifications?.error?.('Social-Link-Auswertung fehlgeschlagen.');
          return false;
        }
      },
      async directorApplyMood(_ev) {
        try {
          const result = await this._applyDirectorMood();
          if (!result?.ok) {
            ui.notifications?.warn?.(`Director-Stimmung nicht angewendet (${result?.reason ?? 'kein Treffer'}).`);
            return result;
          }
          this._rememberDirectorWorkflow('directorApplyMood', result);
          ui.notifications?.info?.(`Stimmung angewendet: ${result?.moodLabel ?? result?.moodId ?? 'unbekannt'}`);
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('directorApplyMood', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorApplyMood failed', err);
          ui.notifications?.error?.('Director-Stimmung konnte nicht angewendet werden.');
          return false;
        }
      },
      async directorRunbookNext(_ev) {
        try {
          const result = await this._runDirectorNextAction();
          await this.render?.(true);
          return result;
        } catch (err) {
          this._rememberDirectorWorkflow('directorRunbookNext', null, { error: err });
          this._getLogger().warn?.('[JANUS7] directorRunbookNext failed', err);
          ui.notifications?.error?.('Director-Runbook konnte nicht fortgesetzt werden.');
          return false;
        }
      },
      async refreshPanel(_ev) {
        try { this.render?.(true); return true; } catch (err) {
          this._getLogger().warn?.('[JANUS7] refreshPanel failed', err);
          try { JanusControlPanelApp.showSingleton(); } catch (_) {}
          return false;
        }
      },

      // ── Slot-Builder ─────────────────────────────────────────────────────
      async clearSlotBuilder(_ev) { this._slotBuilder = []; this.render({ force: true }); return true; },
      async generateSlotJournal(_ev) { return await this._generateJournalForCurrentSlot(); },

      // ── Locations ────────────────────────────────────────────────────────
      async activateLocationScene(ev) {
        const e     = resolveEngine(this);
        const locId = ev?.currentTarget?.dataset?.locationId;
        if (!locId) return;
        const loc   = e?.academy?.data?.getLocation?.(locId) ?? null;
        if (!loc)   return ui.notifications?.warn?.(`Location nicht gefunden: ${locId}`);
        let scene = null;
        try {
          const uuid = loc?.foundry?.sceneUuid ?? null;
          if (uuid && globalThis.fromUuid) scene = await globalThis.fromUuid(uuid);
          const key = loc?.foundry?.sceneKey ?? null;
          if (!scene && key && game?.scenes) {
            scene = game.scenes.find((s) => s.getFlag?.('janus7', 'key') === key) ?? null;
          }
          if (!scene && game?.scenes) {
            const needle = String(loc.name ?? '').trim().toLowerCase();
            if (needle) scene = game.scenes.find((s) => String(s.name ?? '').trim().toLowerCase() === needle) ?? null;
          }
          if (!scene) return ui.notifications?.warn?.(`Keine Scene gefunden für: ${loc.name}`);
          if (scene.activate) await scene.activate();
          if (scene.view)     await scene.view();
        } catch (err) {
          e?.core?.logger?.error?.('activateLocationScene failed', err);
          ui.notifications?.error?.('Scene-Aktivierung fehlgeschlagen.');
        }
      },

      async applyLocationMood(ev) {
        const e     = resolveEngine(this);
        const locId = ev?.currentTarget?.dataset?.locationId;
        if (!locId) return;
        const loc     = e?.academy?.data?.getLocation?.(locId) ?? null;
        const moodKey = loc?.defaultMoodKey ?? loc?.foundry?.defaultMoodKey ?? null;
        if (!moodKey) return ui.notifications?.warn?.('Diese Location hat keinen defaultMoodKey.');
        try {
          await e?.atmosphere?.applyMood?.(moodKey, { broadcast: true, reason: 'control-panel/location' });
        } catch (err) {
          e?.core?.logger?.error?.('applyLocationMood failed', err);
          ui.notifications?.error?.('Mood konnte nicht gesetzt werden.');
        }
      },

      // ── Clipboard ────────────────────────────────────────────────────────
      async copyAiContext(_ev) {
        const e   = resolveEngine(this);
        const ctx = e?.getAiContext?.() ?? null;
        await JanusUI.copyToClipboard(JSON.stringify(ctx, null, 2));
        ui.notifications?.info?.('AI-Context in Zwischenablage kopiert.');
      },
      async copyState(_ev) {
        const e    = resolveEngine(this);
        const snap = e?.core?.state?.snapshot?.() ?? null;
        await JanusUI.copyToClipboard(JSON.stringify(snap, null, 2));
        ui.notifications?.info?.('State-Snapshot in Zwischenablage kopiert.');
      },
      async copyDiagnosticsReport(_ev) {
        const e = resolveEngine(this);
        const report = await (e?.diagnostics?.report?.({ notify: false }) ?? e?.diagnostics?.run?.({ notify: false }));
        await JanusUI.copyToClipboard(JSON.stringify(report ?? {}, null, 2));
        ui.notifications?.info?.('Diagnosebericht in Zwischenablage kopiert.');
      },
      async refreshDiagnostics(_ev) {
        const e = resolveEngine(this);
        try {
          const report = await (e?.diagnostics?.report?.({ notify: false }) ?? e?.diagnostics?.run?.({ notify: false }));
          this._diagnosticsReport = report ?? null;
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] refreshDiagnostics failed', err);
          ui.notifications?.warn?.('Diagnose konnte nicht aktualisiert werden.');
        }
        await this.render?.(true);
        return true;
      },

      async copyDiagnosticSnapshot(_ev) {
        const e = resolveEngine(this);
        const snapshot = e?.diagnostics?.snapshot?.() ?? {};
        await JanusUI.copyToClipboard(JSON.stringify(snapshot, null, 2));
        ui.notifications?.info?.('Diagnose-Snapshot in Zwischenablage kopiert.');
      },
      async graphInvalidate(_ev) {
        const e = resolveEngine(this);
        e?.graph?.cache?.invalidate?.();
        e?.graph?.markDirty?.('state');
        ui.notifications?.info?.('Graph-Cache invalidiert.');
        await this.render?.({ force: true });
        return true;
      },
      async graphRebuild(_ev) {
        const e = resolveEngine(this);
        await e?.graph?.build?.({ force: true });
        ui.notifications?.info?.('Graph neu aufgebaut.');
        await this.render?.({ force: true });
        return true;
      },

      // ── Tests ────────────────────────────────────────────────────────────
      async runSmokeTests(_ev) {
        const e = resolveEngine(this);
        try {
          if (e?.commands?.runSmokeTests)  return await e.commands.runSmokeTests({});
          return await e?.test?.runCatalog?.({ openWindow: true });
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] runSmokeTests failed', err);
          ui.notifications?.error?.('Smoke Tests fehlgeschlagen.'); return false;
        }
      },
      async runFullCatalog(_ev) {
        const e = resolveEngine(this);
        try {
          if (e?.commands?.runFullCatalog) return await e.commands.runFullCatalog({});
          return await e?.test?.runCatalog?.({ openWindow: true });
        } catch (err) {
          this._getLogger().warn?.('[JANUS7] runFullCatalog failed', err);
          ui.notifications?.error?.('Full Catalog fehlgeschlagen.'); return false;
        }
      },
      async runCatalogConsole(_ev) {
        const e = resolveEngine(this);
        try { return await e?.test?.runCatalog?.({ openWindow: false }); }
        catch (err) {
          this._getLogger().warn?.('[JANUS7] runCatalogConsole failed', err);
          ui.notifications?.error?.('Catalog → Console fehlgeschlagen.'); return false;
        }
      },
      async runCatalogWindow(_ev) {
        const e = resolveEngine(this);
        try { return await e?.test?.runCatalog?.({ openWindow: true }); }
        catch (err) {
          this._getLogger().warn?.('[JANUS7] runCatalogWindow failed', err);
          ui.notifications?.error?.('Catalog → Window fehlgeschlagen.'); return false;
        }
      }
    };
