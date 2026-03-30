import { MODULE_ID } from '../../core/common.js';
import { JanusSessionPrepService } from '../session-prep/JanusSessionPrepService.js';

function _escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _slugify(value = '') {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function _moduleVersion() {
  return game?.modules?.get?.(MODULE_ID)?.version ?? 'unknown';
}

export class JanusReportCardOutputService {
  constructor({ engine, logger } = {}) {
    this.engine = engine ?? globalThis.game?.janus7 ?? null;
    this.logger = logger ?? this.engine?.core?.logger ?? console;
  }

  async buildArtifacts({ horizonSlots = 3 } = {}) {
    const report = await new JanusSessionPrepService({ engine: this.engine, logger: this.logger }).buildReport({ horizonSlots });
    const drafts = report?.reportCardDrafts ?? [];
    const exportBundle = report?.reportCardExportBundle ?? null;
    const journalBundle = report?.reportCardJournalBundle ?? null;
    const pdfBundle = this._buildPdfBundle({ drafts, exportBundle, report });
    return { report, drafts, exportBundle, journalBundle, pdfBundle };
  }

  _renderHtmlList(items = [], fallback = '—') {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    const rendered = safeItems.length ? safeItems : [fallback];
    return `<ul>${rendered.map((entry) => `<li>${_escapeHtml(entry)}</li>`).join('')}</ul>`;
  }

  _renderEvidenceTable(items = []) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return '<p class="j7-pdf__dim">Keine belastbaren Prüfungsnachweise vorhanden.</p>';
    const rows = safeItems.map((entry) => `
      <tr>
        <td>${_escapeHtml(entry?.examTitle ?? 'Prüfung')}</td>
        <td>${_escapeHtml(entry?.scoreLabel ?? '—')}${entry?.percent != null ? ` (${_escapeHtml(`${entry.percent}%`)})` : ''}</td>
        <td>${_escapeHtml(entry?.statusLabel ?? '—')}</td>
        <td>${_escapeHtml(entry?.attemptedAtLabel ?? '—')}</td>
      </tr>`).join('');
    return `
      <table class="j7-pdf__table">
        <thead><tr><th>Prüfung</th><th>Ergebnis</th><th>Status</th><th>Zeitpunkt</th></tr></thead>
        <tbody>${rows}
        </tbody>
      </table>`;
  }

  _renderReportCardArticle(draft = {}, periodLabel = '—') {
    const payload = draft?.payload ?? {};
    const evaluation = payload?.evaluation ?? {};
    const narrative = payload?.narrative ?? {};
    const evidence = payload?.evidence ?? [];
    return `
      <article class="j7-pdf__card">
        <header class="j7-pdf__header">
          <div>
            <h2>${_escapeHtml(draft?.actorName ?? '—')}</h2>
            <p class="j7-pdf__sub">${_escapeHtml(periodLabel)}</p>
          </div>
          <div class="j7-pdf__badge">${_escapeHtml(draft?.finalGradeLabel ?? '—')}</div>
        </header>
        <section class="j7-pdf__meta">
          <div><strong>Status:</strong> ${_escapeHtml(draft?.statusLabel ?? '—')}</div>
          <div><strong>Mittelwert:</strong> ${_escapeHtml(evaluation?.avgPercentLabel ?? '—')}</div>
          <div><strong>Bonus:</strong> ${_escapeHtml(evaluation?.bonusLabel ?? '0')}</div>
          <div><strong>Grundlage:</strong> ${_escapeHtml(draft?.evidenceLabel ?? '—')} | ${_escapeHtml(draft?.confidenceLabel ?? '—')}</div>
        </section>
        <section>
          <h3>Stärken</h3>
          ${this._renderHtmlList(narrative?.strengths ?? [], 'Keine belastbaren Stärken ableitbar.')}
        </section>
        <section>
          <h3>Risiken</h3>
          ${this._renderHtmlList(narrative?.concerns ?? [], 'Keine akuten Risiken ableitbar.')}
        </section>
        <section>
          <h3>Empfehlungen</h3>
          ${this._renderHtmlList(narrative?.recommendations ?? [], 'Keine Empfehlungen ableitbar.')}
        </section>
        <section>
          <h3>Prüfungsnachweise</h3>
          ${this._renderEvidenceTable(evidence)}
        </section>
      </article>`;
  }

  _buildPdfBundle({ drafts, exportBundle, report }) {
    const periodLabel = exportBundle?.payload?.period?.label ?? `Jahr ${report?.slotRef?.year ?? '—'} · Trimester ${report?.slotRef?.trimester ?? '—'}`;
    const title = `JANUS7 Zeugnisse · ${periodLabel}`;
    const cards = (drafts ?? []).map((draft) => this._renderReportCardArticle(draft, periodLabel)).join('');
    const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${_escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1715; background: #f7f1e7; margin: 0; }
  .j7-pdf { max-width: 980px; margin: 0 auto; padding: 24px; }
  .j7-pdf__title { margin-bottom: 20px; border-bottom: 2px solid #7a5b37; padding-bottom: 12px; }
  .j7-pdf__title h1 { margin: 0 0 6px; font-size: 28px; }
  .j7-pdf__title p { margin: 0; color: #5b5144; }
  .j7-pdf__grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
  .j7-pdf__card { background: #fffdfa; border: 1px solid #c9b796; border-radius: 12px; padding: 18px; page-break-inside: avoid; box-shadow: 0 3px 14px rgba(52, 32, 9, 0.08); }
  .j7-pdf__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  .j7-pdf__header h2 { margin: 0; font-size: 22px; }
  .j7-pdf__sub, .j7-pdf__dim { color: #5b5144; }
  .j7-pdf__badge { border: 1px solid #7a5b37; border-radius: 999px; padding: 6px 10px; font-weight: 700; background: #f4ead5; }
  .j7-pdf__meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin-bottom: 12px; }
  .j7-pdf section { margin-top: 12px; }
  .j7-pdf section h3 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; }
  .j7-pdf ul { margin: 0; padding-left: 18px; }
  .j7-pdf li { margin: 4px 0; }
  .j7-pdf__table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .j7-pdf__table th, .j7-pdf__table td { border-bottom: 1px solid #d9ccb6; padding: 6px 8px; text-align: left; vertical-align: top; }
</style>
</head>
<body>
  <main class="j7-pdf">
    <header class="j7-pdf__title">
      <h1>${_escapeHtml(title)}</h1>
      <p>${_escapeHtml(exportBundle?.payload?.scheme?.name ?? '—')} · Akteure: ${_escapeHtml(String(exportBundle?.summary?.actorCount ?? drafts?.length ?? 0))}</p>
    </header>
    <section class="j7-pdf__grid">
      ${cards || '<p class="j7-pdf__dim">Keine belastbaren Zeugnisdaten vorhanden.</p>'}
    </section>
  </main>
</body>
</html>`;
    return {
      id: 'report-card-pdf-bundle',
      title,
      periodLabel,
      filename: `janus7-zeugnisse-${_slugify(periodLabel) || Date.now()}.html`,
      html,
      actorCount: drafts?.length ?? 0,
    };
  }

  async exportPdf() {
    const { drafts, pdfBundle } = await this.buildArtifacts();
    if (!Array.isArray(drafts) || !drafts.length) throw new Error('Keine Zeugnisdaten für PDF-Export vorhanden.');
    try {
      foundry?.utils?.saveDataToFile?.(pdfBundle.html, 'text/html', pdfBundle.filename);
    } catch (err) {
      this.logger?.warn?.('[ReportCardOutput] HTML-Snapshot konnte nicht gespeichert werden.', err);
    }

    const popup = globalThis.open?.('', '_blank', 'noopener,noreferrer') ?? null;
    if (!popup) {
      ui.notifications?.warn?.('Print-Fenster konnte nicht geöffnet werden. HTML-Snapshot wurde exportiert.');
      return { exported: true, printed: false, actorCount: drafts.length, filename: pdfBundle.filename };
    }

    popup.document.open();
    popup.document.write(pdfBundle.html);
    popup.document.close();
    globalThis.setTimeout?.(() => {
      try { popup.focus?.(); } catch {}
      try { popup.print?.(); } catch {}
    }, 250);

    ui.notifications?.info?.(`Zeugnis-PDF vorbereitet: ${drafts.length} Akteure`);
    return { exported: true, printed: true, actorCount: drafts.length, filename: pdfBundle.filename };
  }

  _findExistingJournal(journalName, periodLabel) {
    return game?.journal?.getName?.(journalName)
      ?? (game?.journal?.contents ?? []).find((entry) => entry?.flags?.[MODULE_ID]?.reportCardPeriodLabel === periodLabel)
      ?? null;
  }

  _buildJournalPageData({ entry, draft, periodLabel }) {
    const content = this._renderReportCardArticle(draft, periodLabel);
    return {
      name: entry?.pageName ?? `${draft?.actorName ?? '—'} · Trimesterzeugnis`,
      type: 'text',
      text: { content, format: 1 },
      flags: {
        [MODULE_ID]: {
          managed: true,
          kind: 'report-card-page',
          actorId: draft?.actorId ?? null,
          periodLabel,
          pageType: 'reportCard'
        }
      }
    };
  }

  async writeJournals() {
    const { drafts, journalBundle } = await this.buildArtifacts();
    const payload = journalBundle?.payload ?? null;
    const entries = payload?.entries ?? [];
    if (!entries.length) throw new Error('Keine Journal-Daten für Zeugnisse vorhanden.');

    const periodLabel = payload?.period?.label ?? '—';
    const journalName = payload?.journalName ?? `Zeugnisse · ${periodLabel}`;
    const draftByActor = new Map((drafts ?? []).map((draft) => [String(draft?.actorId ?? ''), draft]));
    const flags = {
      [MODULE_ID]: {
        managed: true,
        kind: 'report-card-journal',
        reportCardPeriodLabel: periodLabel,
        reportCardBundleType: payload?.type ?? 'janus7.reportCardJournalBundle.v1',
        source: { kind: 'report-card', moduleVersion: _moduleVersion() },
        syncedAt: new Date().toISOString(),
      }
    };

    let journal = this._findExistingJournal(journalName, periodLabel);
    if (!journal) {
      const pages = entries.map((entry) => this._buildJournalPageData({
        entry,
        draft: draftByActor.get(String(entry?.actorId ?? '')) ?? null,
        periodLabel,
      }));
      journal = await JournalEntry.create({ name: journalName, pages, flags });
      if (!journal) throw new Error('JournalEntry.create für Zeugnisse fehlgeschlagen.');
      ui.notifications?.info?.(`Zeugnis-Journal erstellt: ${journalName}`);
      return { created: true, updatedPages: 0, createdPages: pages.length, journalName };
    }

    await journal.update({ name: journalName, flags: { ...journal.flags, ...flags } });
    const existingByName = new Map((journal.pages?.contents ?? journal.pages ?? []).map((page) => [page?.name, page]));
    const updates = [];
    const creates = [];
    for (const entry of entries) {
      const draft = draftByActor.get(String(entry?.actorId ?? '')) ?? null;
      const pageData = this._buildJournalPageData({ entry, draft, periodLabel });
      const existing = existingByName.get(pageData.name) ?? null;
      if (existing?.id) {
        updates.push({ _id: existing.id, ...pageData });
      } else {
        creates.push(pageData);
      }
    }
    if (updates.length) await journal.updateEmbeddedDocuments('JournalEntryPage', updates);
    if (creates.length) await journal.createEmbeddedDocuments('JournalEntryPage', creates);
    ui.notifications?.info?.(`Zeugnis-Journal aktualisiert: ${journalName}`);
    return { created: false, updatedPages: updates.length, createdPages: creates.length, journalName };
  }
}

export default JanusReportCardOutputService;
