import { moduleTemplatePath } from '../../core/common.js';
/**
 * @file ui/apps/JanusSyncPanelApp.js
 * @module janus7/ui
 * @phase 6
 *
 * JanusSyncPanelApp
 *
 * Zeigt den Abgleich zwischen JANUS7-JSON-Daten und dem realen Foundry-Weltbestand.
 * Pro Entität:
 *  ✅ LINKED        — UUID vorhanden & Entität existiert
 *  🟡 FOUND-BY-NAME — Kein UUID, aber Name matcht → "Verknüpfen"-Button
 *  ❌ MISSING       — Nicht vorhanden → "Anlegen"-Button
 *  ⚠️ BROKEN       — UUID da, Entität gelöscht → "Neu anlegen / Suchen"-Button
 *
 * Drag & Drop:
 *  - Jede MISSING/BROKEN-Zeile akzeptiert Drops von Foundry-Sidebar-Einträgen
 *    (Actors, Scenes, Playlists) → verknüpft automatisch
 *  - LINKED-Zeilen können auf den Canvas gedragged werden
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
import { JanusBaseApp } from '../core/base-app.js';
import { JanusSyncEngine, SyncStatus } from '../../core/sync-engine.js';

export class JanusSyncPanelApp extends HandlebarsApplicationMixin(JanusBaseApp) {
  static _instance = null;

  static showSingleton(options = {}) {
    if (!this._instance) this._instance = new this(options);
    this._instance.render({ force: true });
    return this._instance;
  }

  static DEFAULT_OPTIONS = {
    id: 'janus7-sync-panel',
    classes: ['janus7-app', 'janus7-sync-panel'],
    position: { width: 980, height: 720, top: 60, left: 120 },
    window: {
      title: 'JANUS7 · Welt-Synchronisation',
      resizable: true,
    },
    actions: {
      rescan:              JanusSyncPanelApp.onRescan,
      switchTab:           JanusSyncPanelApp.onSwitchTab,
      linkExisting:        JanusSyncPanelApp.onLinkExisting,
      createEntity:        JanusSyncPanelApp.onCreateEntity,
      importFromCompendium: JanusSyncPanelApp.onImportFromCompendium,
      importAllCompendium: JanusSyncPanelApp.onImportAllCompendium,
      openEntity:          JanusSyncPanelApp.onOpenEntity,
      unlinkEntity:        JanusSyncPanelApp.onUnlinkEntity,
      syncAll:             JanusSyncPanelApp.onSyncAll,
    }
  };

  static PARTS = {
    main: { template: moduleTemplatePath('templates/apps/sync-panel.hbs') }
  };

  constructor(options = {}) {
    super(options);
    this._activeTab  = 'npcs';
    this._scanning   = false;
    this._reports    = { npcs: null, locations: null, playlists: null, alchemy: null, library: null, spells: null, lessons: null };
    this._syncEngine = null;
  }

  /**
   * Mappt UI-Tab → persistenter Link-Typ (State.foundryLinks.*)
   * @private
   */
  _linkTypeForTab(tab) {
    if (tab === 'npcs') return 'npcs';
    if (tab === 'locations') return 'locations';
    if (tab === 'playlists') return 'playlists';
    if (tab === 'alchemy') return 'items';
    if (tab === 'library' || tab === 'lessons' || tab === 'exams') return 'journals';
    return null;
  }

  // ─── Engine ────────────────────────────────────────────────────────────────

  _getSync() {
    if (!this._syncEngine) {
      const logger = game.janus7?.core?.logger ?? console;
      this._syncEngine = new JanusSyncEngine({ logger });
    }
    return this._syncEngine;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._initDropTargets();
    this._initDragSources();
  }

  // ─── Context ───────────────────────────────────────────────────────────────

  async _preRender(options) {
    await super._preRender(options);
    if (!game.user?.isGM) return;
    const engine = game.janus7;
    const ad = engine?.academy?.data;
    if (!ad?.isReady) return;
    const sync = this._getSync();
    if (!this._reports[this._activeTab]) {
      this._reports[this._activeTab] = await this._runScan(this._activeTab, ad, sync);
    }
  }

  _prepareContext(_options) {
    if (!game.user?.isGM) return { notGM: true };

    const engine = game.janus7;
    const ad     = engine?.academy?.data;

    if (!ad?.isReady) {
      return { notReady: true };
    }

    const report = this._reports[this._activeTab];
    const counts = this._countStatuses(report);

    return {
      notGM:     false,
      notReady:  false,
      scanning:  this._scanning,
      activeTab: this._activeTab,
      tabs: [
        { key: 'npcs',      label: 'NSCs',            icon: 'fa-user-friends' },
        { key: 'locations', label: 'Orte/Szenen',      icon: 'fa-map' },
        { key: 'playlists', label: 'Playlisten',       icon: 'fa-music' },
        { key: 'library',   label: 'Bibliothek',       icon: 'fa-book' },
        { key: 'alchemy',   label: 'Alchemie',         icon: 'fa-flask' },
        { key: 'spells',    label: 'Zauber (Lookup)',   icon: 'fa-hat-wizard' },
        { key: 'lessons',   label: 'Lektionen',        icon: 'fa-chalkboard-teacher' },
      ],
      report,
      counts,
      SyncStatus,
    };
  }

  /** @private */
  async _runScan(tab, ad, sync) {
    this._scanning = true;
    try {
      if (tab === 'npcs') {
        const npcs = ad.getNpcs?.() ?? [];
        return await sync.reconcile('npcs', npcs);
      }
      if (tab === 'locations') {
        const locs = ad.getLocations?.() ?? [];
        return await sync.reconcile('locations', locs);
      }
      if (tab === 'playlists') {
        const moods = game.janus7?.atmosphere?.controller?.listMoods?.() ?? [];
        const plData = moods
          .filter(m => m.playlistName || m.playlist || m.playlistRef)
          .map(m => ({
            id:   `PLAYLIST_${(m.playlistName ?? m.playlistRef ?? m.id ?? '?').toUpperCase().replace(/[^A-Z0-9]/g,'_')}`,
            name: m.playlistName ?? m.playlistRef ?? m.name,
            foundry: {},
          }));
        return await sync.reconcile('playlists', plData);
      }
      if (tab === 'alchemy') {
        const recipes = ad.getAlchemyRecipes?.()?.recipes ?? ad.getAlchemyRecipes?.() ?? [];
        return await sync.reconcile('alchemy', recipes);
      }
      if (tab === 'library') {
        const libData = ad.getLibrary?.() ?? [];
        const items = Array.isArray(libData) ? libData : (libData.items ?? []);
        return await sync.reconcile('library', items);
      }
      if (tab === 'spells') {
        // Zauber: separater Compendium-Lookup, max 50 um Performance zu schonen
        const spellsData = ad.getSpellsIndex?.() ?? [];
        const limited = Array.isArray(spellsData) ? spellsData.slice(0, 50) : [];
        return await sync.reconcileSpells(limited);
      }
      if (tab === 'lessons') {
        const lessons = ad.getLessons?.() ?? ad.getNpcs?.()?.map?.(n => null)?.filter(Boolean) ?? [];
        const lessonList = Array.isArray(lessons) ? lessons : [];
        return await sync.reconcile('lessons', lessonList);
      }
    } finally {
      this._scanning = false;
    }
    return [];
  }

  /** @private */
  _countStatuses(report) {
    if (!report) return { total: 0, linked: 0, found: 0, missing: 0, broken: 0 };
    return {
      total:      report.length,
      linked:     report.filter(r => r.status === SyncStatus.LINKED).length,
      found:      report.filter(r => r.status === SyncStatus.FOUND_BY_NAME).length,
      compendium: report.filter(r => r.status === SyncStatus.FOUND_IN_COMPENDIUM).length,
      missing:    report.filter(r => r.status === SyncStatus.MISSING).length,
      broken:     report.filter(r => r.status === SyncStatus.BROKEN).length,
    };
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  static async onRescan() {
    this._reports = { npcs: null, locations: null, playlists: null, alchemy: null, library: null, spells: null, lessons: null };
    await this.refresh();
  }

  static async onSwitchTab(event, target) {
    event?.preventDefault?.();
    const tab = target?.dataset?.tab;
    if (!tab || tab === this._activeTab) return;
    this._activeTab = tab;
    await this.refresh();
  }

  /**
   * "Verknüpfen" — öffnet einen simplen Name-Picker für die Entität.
   */
  static async onLinkExisting(event, target) {
    event?.preventDefault?.();
    const janusId = target?.closest('[data-janus-id]')?.dataset?.janusId;
    if (!janusId) return;

    const tab = this._activeTab;
    const candidates = JanusSyncPanelApp._getCandidates(tab);
    if (!candidates.length) {
      return ui.notifications.warn('Keine Foundry-Entitäten gefunden.');
    }

    const options = candidates.map(c =>
      `<option value="${c.uuid}">${c.name}</option>`
    ).join('');

    const uuid = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Verknüpfen: ${janusId}` },
      content: `
        <p>Wähle die zugehörige Foundry-Entität für <strong>${janusId}</strong>:</p>
        <select name="uuid" style="width:100%; margin-top:8px">
          ${options}
        </select>`,
      ok: {
        label: 'Verknüpfen',
        callback: (_event, button) => button.form?.elements?.uuid?.value ?? null
      },
      rejectClose: false,
    }).catch(() => null);

    if (!uuid) return;

    const sync = this._getSync();
    await sync.linkEntity(janusId, uuid, { type: this._linkTypeForTab(this._activeTab) });
    this._reports[tab] = null; // Force rescan
    await this.refresh();
    ui.notifications.info(`Verknüpft: ${janusId} → ${uuid}`);
  }

  /**
   * "Anlegen" — erstellt Foundry-Entität aus JSON-Daten mit Bestätigungsdialog.
   */
  static async onCreateEntity(event, target) {
    event?.preventDefault?.();
    const janusId = target?.closest('[data-janus-id]')?.dataset?.janusId;
    if (!janusId) return;

    const report = this._reports[this._activeTab];
    const entry  = report?.find(r => r.id === janusId);
    if (!entry) return;

    // Bestätigungsdialog mit Vorschau der Profildaten
    const profilePreview = JanusSyncPanelApp._buildProfilePreview(entry.entity);
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Anlegen: ${entry.entity.name}` },
      content: `
        <p>Soll <strong>${entry.entity.name}</strong> jetzt in Foundry angelegt werden?</p>
        <p class="notification hint">Alle verfügbaren JSON-Daten werden übernommen:</p>
        <div style="max-height:300px; overflow-y:auto; border:1px solid var(--color-border-light-2);
                    border-radius:6px; padding:10px; margin-top:8px; font-size:12px;">
          ${profilePreview}
        </div>`,
      yes: { label: '<i class="fas fa-plus"></i> Anlegen' },
      no:  { label: 'Abbrechen' },
    });
    if (!confirmed) return;

    const sync = this._getSync();
    try {
      if (this._activeTab === 'npcs') {
        await sync.createActorFromNPC(entry.entity);
      } else if (this._activeTab === 'locations') {
        await sync.createSceneFromLocation(entry.entity);
      } else if (this._activeTab === 'playlists') {
        await sync.createPlaylist(entry.entity);
      } else if (this._activeTab === 'alchemy') {
        await sync.createItemFromRecipe(entry.entity);
      } else if (this._activeTab === 'library') {
        await sync.createJournalFromLibrary(entry.entity);
      } else if (this._activeTab === 'lessons') {
        await sync.createJournalFromLesson(entry.entity);
      } else if (this._activeTab === 'spells') {
        ui.notifications.warn('Zauber werden aus DSA5-Compendien geladen – nicht manuell angelegt.');
        return;
      }
      this._reports[this._activeTab] = null;
      await this.refresh();
      ui.notifications.info(`"${entry.entity.name}" wurde angelegt und verknüpft.`);
    } catch (err) {
      this._getLogger().error?.('JANUS7 | createEntity failed', err);
      ui.notifications.error(`Fehler: ${err.message}`);
    }
  }

  /** Öffnet die verknüpfte Foundry-Entität. */
  static async onOpenEntity(event, target) {
    event?.preventDefault?.();
    const uuid = target?.closest('[data-janus-id]')?.dataset?.foundryUuid;
    if (!uuid) return;
    const doc = await fromUuid(uuid);
    doc?.sheet?.render({ force: true });
  }

  /** Entfernt eine UUID-Verknüpfung. */
  static async onUnlinkEntity(event, target) {
    event?.preventDefault?.();
    const janusId = target?.closest('[data-janus-id]')?.dataset?.janusId;
    if (!janusId) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Verknüpfung aufheben' },
      content: `<p>UUID-Verknüpfung für <strong>${janusId}</strong> entfernen?</p>
                <p class="notification warning">Die Foundry-Entität bleibt erhalten.</p>`,
    });
    if (!confirmed) return;

    const sync = this._getSync();
    await sync.unlinkEntity(janusId, { type: this._linkTypeForTab(this._activeTab) });
    this._reports[this._activeTab] = null;
    await this.refresh();
  }

  /**
   * Importiert einen Compendium-Fund in die Welt.
   */
  static async onImportFromCompendium(event, target) {
    event?.preventDefault?.();
    const janusId = target?.closest('[data-janus-id]')?.dataset?.janusId;
    if (!janusId) return;

    const report = this._reports[this._activeTab];
    const entry  = report?.find(r => r.id === janusId);
    if (!entry?.compHit) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Aus Bibliothek importieren: ${entry.entity.name ?? entry.entity.title}` },
      content: `
        <p>Soll <strong>${entry.compHit.name}</strong> aus
        <em>${entry.compHit.packLabel}</em> in die Welt importiert werden?</p>
        <p class="notification hint">
          Eine Kopie wird in der Welt angelegt und automatisch mit JANUS7 verknüpft.
        </p>`,
      yes: { label: '<i class="fas fa-download"></i> Importieren' },
      no:  { label: 'Abbrechen' },
    });
    if (!confirmed) return;

    const sync = this._getSync();
    try {
      await sync.importFromCompendium(janusId, entry.compHit, { type: this._linkTypeForTab(this._activeTab) });
      this._reports[this._activeTab] = null;
      await this.refresh();
      ui.notifications.info(`"${entry.compHit.name}" importiert und verknüpft.`);
    } catch (err) {
      this._getLogger().error?.('JANUS7 | importFromCompendium failed', err);
      ui.notifications.error(`Import fehlgeschlagen: ${err.message}`);
    }
  }

  /**
   * Importiert alle FOUND_IN_COMPENDIUM-Einträge des aktiven Tabs.
   */
  static async onImportAllCompendium(event, _target) {
    event?.preventDefault?.();
    const report = this._reports[this._activeTab];
    const candidates = report?.filter(r =>
      r.status === 'found-in-compendium' && r.compHit
    ) ?? [];

    if (!candidates.length) {
      return ui.notifications.info('Keine Bibliotheks-Treffer zum Importieren.');
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${candidates.length} Einträge aus Bibliothek importieren` },
      content: `
        <p>Sollen <strong>${candidates.length} Einträge</strong> aus der Bibliothek importiert werden?</p>
        <ul>${candidates.map(r => `<li>${r.compHit.name} <span style="opacity:.6">(${r.compHit.packLabel})</span></li>`).join('')}</ul>`,
    });
    if (!confirmed) return;

    const sync = this._getSync();
    try {
      const { imported, failed } = await sync.importAllFromCompendium(report, { type: this._linkTypeForTab(this._activeTab) });
      this._reports[this._activeTab] = null;
      await this.refresh();
      ui.notifications.info(`Import: ${imported} importiert, ${failed} Fehler.`);
    } catch (err) {
      ui.notifications.error(`Batch-Import fehlgeschlagen: ${err.message}`);
    }
  }

  /** Legt alle fehlenden Entitäten des aktiven Tabs auf einmal an. */
  static async onSyncAll(event, _target) {
    event?.preventDefault?.();
    const report  = this._reports[this._activeTab];
    const missing = report?.filter(r =>
      r.status === SyncStatus.MISSING || r.status === SyncStatus.BROKEN
    ) ?? [];

    if (!missing.length) {
      return ui.notifications.info('Alles bereits synchronisiert.');
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${missing.length} Entitäten anlegen` },
      content: `<p>Sollen <strong>${missing.length} fehlende Einträge</strong> jetzt angelegt werden?</p>
                <ul>${missing.map(r => `<li>${r.entity.name}</li>`).join('')}</ul>`,
    });
    if (!confirmed) return;

    const sync = this._getSync();
    let done = 0;
    let failed = 0;
    for (const entry of missing) {
      try {
        if (this._activeTab === 'npcs')
          await sync.createActorFromNPC(entry.entity);
        else if (this._activeTab === 'locations')
          await sync.createSceneFromLocation(entry.entity);
        else if (this._activeTab === 'playlists')
          await sync.createPlaylist(entry.entity);
        else if (this._activeTab === 'alchemy')
          await sync.createItemFromRecipe(entry.entity);
        else if (this._activeTab === 'library')
          await sync.createJournalFromLibrary(entry.entity);
        else if (this._activeTab === 'lessons')
          await sync.createJournalFromLesson(entry.entity);
        else if (this._activeTab === 'spells')
          await sync.linkEntity(entry.id, entry.uuid, { type: this._linkTypeForTab(this._activeTab) }); // auto-link
        done++;
      } catch (err) {
        failed++;
        this._getLogger().error?.(`JANUS7 | syncAll failed for ${entry.id}:`, err);
      }
    }

    this._reports[this._activeTab] = null;
    await this.refresh();
    ui.notifications.info(`Sync abgeschlossen: ${done} angelegt, ${failed} Fehler.`);
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  /**
   * Registriert Drop-Ziele (Zeilen mit ❌/⚠️ Status).
   * @private
   */
  _initDropTargets() {
    const rows = this.element?.querySelectorAll?.('[data-janus-id][data-droppable]') ?? [];
    rows.forEach(row => {
      row.addEventListener('dragover', ev => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'link';
        row.classList.add('janus7-drop-hover');
      });
      row.addEventListener('dragleave', () => {
        row.classList.remove('janus7-drop-hover');
      });
      row.addEventListener('drop', async ev => {
        ev.preventDefault();
        row.classList.remove('janus7-drop-hover');
        await this._onDropOnRow(ev, row);
      });
    });
  }

  /**
   * Macht LINKED-Zeilen draggable (→ Foundry-Canvas / Sidebar).
   * @private
   */
  _initDragSources() {
    const sources = this.element?.querySelectorAll?.('[data-janus-id][data-foundry-uuid]') ?? [];
    sources.forEach(row => {
      row.setAttribute('draggable', 'true');
      row.addEventListener('dragstart', ev => {
        const uuid  = row.dataset.foundryUuid;
        const type  = row.dataset.foundryType ?? 'Actor';
        const name  = row.querySelector('.janus7-sync-name')?.textContent?.trim() ?? '';
        ev.dataTransfer.setData('text/plain', uuid);
        ev.dataTransfer.setData('application/json', JSON.stringify({
          type,
          uuid,
          id:   uuid.split('.')[1] ?? uuid,
          data: { name },
        }));
        row.classList.add('janus7-dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('janus7-dragging');
      });
    });
  }

  /**
   * Verarbeitet Drop-Events auf Zeilen (Foundry-Sidebar-Drag).
   * @private
   */
  async _onDropOnRow(ev, row) {
    const janusId = row.dataset.janusId;
    if (!janusId) return;

    let data = null;
    try {
      const text = ev.dataTransfer.getData('application/json')
                || ev.dataTransfer.getData('text/plain');
      data = JSON.parse(text);
    } catch {
      return ui.notifications.warn('Konnte Drop-Daten nicht lesen.');
    }

    // Foundry UUID aus Drop-Daten extrahieren
    const uuid = data?.uuid
      ?? (data?.type && data?.id ? `${data.type}.${data.id}` : null);

    if (!uuid) return ui.notifications.warn('Keine UUID in Drop-Daten.');

    const sync = this._getSync();
    await sync.linkEntity(janusId, uuid, { type: this._linkTypeForTab(this._activeTab) });
    this._reports[this._activeTab] = null;
    await this.refresh();
    ui.notifications.info(`Verknüpft per Drag & Drop: ${janusId} → ${uuid}`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  static _getCandidates(tab) {
    if (tab === 'npcs')      return game.actors?.contents ?? [];
    if (tab === 'locations') return game.scenes?.contents ?? [];
    if (tab === 'playlists') return game.playlists?.contents ?? [];
    if (tab === 'alchemy')   return game.items?.contents ?? [];
    if (tab === 'library' || tab === 'lessons' || tab === 'exams')
                             return game.journal?.contents ?? [];
    if (tab === 'spells')    return []; // nur Compendium, kein world-pick
    return [];
  }

  static _buildProfilePreview(entity) {
    const p = entity?.profile ?? {};
    const lines = [];
    if (p.subtitle)  lines.push(`<div><strong>${p.subtitle}</strong></div>`);
    if (p.roleText)  lines.push(`<div><em>${p.roleText}</em></div>`);
    if (p.species)   lines.push(`<div>Spezies: ${p.species}</div>`);
    if (p.born)      lines.push(`<div>Geboren: ${p.born} (${p.age ?? '?'})</div>`);
    if (p.origin)    lines.push(`<div>Herkunft: ${p.origin}</div>`);
    if (p.size)      lines.push(`<div>Größe / Fläche: ${p.size}</div>`);
    if (p.light)     lines.push(`<div>Licht: ${p.light}</div>`);
    const secs = Object.keys(p.sections ?? {});
    if (secs.length) {
      lines.push(`<div style="margin-top:4px"><strong>Sektionen:</strong> ${secs.join(', ')}</div>`);
    }
    return lines.join('\n') || '<em>Keine Profildaten verfügbar.</em>';
  }
}
