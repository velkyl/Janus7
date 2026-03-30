import { JanusSessionPrepService } from '../session-prep/JanusSessionPrepService.js';

const STATUS_META = Object.freeze({
  graduated: { label: 'Alumni', icon: 'fas fa-user-graduate' },
  mentor: { label: 'Mentor', icon: 'fas fa-hands-helping' },
  returned: { label: 'Rueckkehr-NSC', icon: 'fas fa-user-clock' },
  inactive: { label: 'Inaktiv', icon: 'fas fa-user-slash' }
});

function _normalizeStatus(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return STATUS_META[key] ? key : 'graduated';
}

function _formatPeriodLabel(period = {}) {
  const year = Number(period?.year);
  const trimester = Number(period?.trimester);
  if (Number.isFinite(year) && Number.isFinite(trimester)) {
    return `Jahr ${year} · Trimester ${trimester}`;
  }
  if (Number.isFinite(year)) return `Jahr ${year}`;
  return 'Unbekannt';
}

function _buildPeriodFromTime(time = {}) {
  return {
    year: Number.isFinite(Number(time?.year)) ? Number(time.year) : null,
    trimester: Number.isFinite(Number(time?.trimester)) ? Number(time.trimester) : null,
    week: Number.isFinite(Number(time?.week)) ? Number(time.week) : null,
    day: time?.dayName ?? time?.day ?? null,
    phase: time?.phase ?? time?.slotName ?? null
  };
}

function _getStatusMeta(status) {
  const key = _normalizeStatus(status);
  return { key, ...(STATUS_META[key] ?? STATUS_META.graduated) };
}

function _normalizeFocus(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'mentor') return 'mentor';
  if (key === 'return') return 'return';
  return null;
}

function _focusLabel(value) {
  const key = _normalizeFocus(value);
  if (key === 'mentor') return 'Mentor priorisiert';
  if (key === 'return') return 'Rueckkehr-Arc priorisiert';
  return '—';
}

export class JanusAlumniService {
  constructor({ engine, logger, state, academyData } = {}) {
    this.engine = engine ?? globalThis.game?.janus7 ?? null;
    this.logger = logger ?? this.engine?.core?.logger ?? console;
    this.state = state ?? this.engine?.core?.state ?? null;
    this.academyData = academyData ?? this.engine?.academy?.data ?? null;
  }

  _getRoot() {
    return foundry.utils.deepClone(this.state?.get?.('academy.alumni') ?? { records: {}, history: [] });
  }

  _getStudents() {
    try {
      return this.academyData?.listStudents?.() ?? [];
    } catch (_err) {
      return [];
    }
  }

  _getNpc(npcId) {
    try {
      return this.academyData?.getNpc?.(npcId) ?? null;
    } catch (_err) {
      return null;
    }
  }

  _enrichRecord(npc = {}, record = {}) {
    const status = _getStatusMeta(record?.status);
    const period = record?.graduationPeriod ?? {};
    return {
      npcId: npc?.id ?? record?.npcId ?? null,
      actorKey: npc?.foundry?.actorKey ?? null,
      name: npc?.name ?? record?.name ?? 'Unbekannt',
      roleText: npc?.profile?.roleText ?? 'Ehemalige Schuelerin / Ehemaliger Schueler',
      sourceGroup: npc?.source?.group ?? null,
      status: status.key,
      statusLabel: status.label,
      statusIcon: status.icon,
      note: String(record?.note ?? '').trim() || null,
      focus: _normalizeFocus(record?.focus),
      focusLabel: _focusLabel(record?.focus),
      graduationPeriod: period,
      graduationLabel: _formatPeriodLabel(period),
      sourceExamId: String(record?.sourceExamId ?? '').trim() || null,
      firstTrackedAt: record?.firstTrackedAt ?? null,
      updatedAt: record?.updatedAt ?? null,
      isMentor: status.key == 'mentor',
      isReturned: status.key == 'returned',
      isInactive: status.key == 'inactive'
    };
  }

  listAlumni() {
    const root = this._getRoot();
    const records = root?.records ?? {};
    return Object.entries(records)
      .map(([npcId, record]) => this._enrichRecord(this._getNpc(npcId), { ...record, npcId }))
      .filter((entry) => entry?.npcId && entry?.name)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status.localeCompare(b.status, 'de');
        return a.name.localeCompare(b.name, 'de');
      });
  }

  listCandidates(limit = 8) {
    const tracked = new Set(this.listAlumni().map((entry) => String(entry.npcId)));
    return this._getStudents()
      .filter((npc) => npc?.id && !tracked.has(String(npc.id)))
      .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'de'))
      .slice(0, Math.max(0, Number(limit) || 0))
      .map((npc) => ({
        id: npc.id,
        name: npc.name ?? npc.id,
        roleText: npc?.profile?.roleText ?? 'Schuelerin / Schueler',
        sourceGroup: npc?.source?.group ?? null,
      }));
  }

  async _buildGradeContext() {
    try {
      const report = await new JanusSessionPrepService({ engine: this.engine, logger: this.logger }).buildReport({ horizonSlots: 1 });
      const trimesterMap = new Map((report?.trimesterGrades?.items ?? []).map((entry) => [String(entry?.actorId ?? ''), entry]));
      const draftMap = new Map((report?.reportCardDrafts ?? []).map((entry) => [String(entry?.actorId ?? ''), entry]));
      return { trimesterMap, draftMap, report };
    } catch (err) {
      this.logger?.warn?.('[AlumniService] Grade-Kontext konnte nicht aufgebaut werden.', err);
      return { trimesterMap: new Map(), draftMap: new Map(), report: null };
    }
  }

  _collectNarrativeContext(report = null) {
    const prepAgenda = Array.isArray(report?.prepAgenda) ? report.prepAgenda : [];
    const quests = Array.isArray(report?.quests?.items) ? report.quests.items : [];
    const seenThreads = new Set();
    const storyThreads = [];
    for (const entry of prepAgenda) {
      for (const thread of (Array.isArray(entry?.storyThreads) ? entry.storyThreads : [])) {
        const key = String(thread ?? '').trim().toLowerCase();
        if (!key || seenThreads.has(key)) continue;
        seenThreads.add(key);
        storyThreads.push(String(thread));
      }
    }
    return {
      questTitles: quests.map((entry) => entry?.title).filter(Boolean).slice(0, 3),
      storyThreads: storyThreads.slice(0, 3),
      narrativeAgendaCount: prepAgenda.filter((entry) => entry?.narrativePriority).length,
    };
  }

  _buildReentrySuggestions(alumni = [], narrativeContext = {}) {
    const items = [];
    const hasNarrativePressure = (narrativeContext?.questTitles?.length ?? 0) > 0 || (narrativeContext?.storyThreads?.length ?? 0) > 0 || Number(narrativeContext?.narrativeAgendaCount ?? 0) > 0;

    for (const entry of alumni) {
      const tags = Array.isArray(this._getNpc(entry?.npcId)?.tags) ? this._getNpc(entry.npcId).tags : [];
      const scoreSignals = [];
      if (entry?.isMentor) scoreSignals.push({ kind: 'mentor', weight: 4, label: 'Bereits als Mentor markiert' });
      if (entry?.isReturned) scoreSignals.push({ kind: 'returned', weight: 4, label: 'Bereits als Rueckkehr-NSC markiert' });
      if (entry?.hasGradeContext && String(entry?.latestGradeStatusLabel ?? '').trim() === 'belastbar') scoreSignals.push({ kind: 'stable-grade', weight: 3, label: 'Belastbarer Leistungsstand vorhanden' });
      if (entry?.hasReportCardDraft) scoreSignals.push({ kind: 'report-card', weight: 2, label: 'Zeugnisentwurf vorhanden' });
      if (String(entry?.latestGradeLabel ?? '').trim() && String(entry.latestGradeLabel).trim() !== '—') scoreSignals.push({ kind: 'grade', weight: 1, label: `Note ${entry.latestGradeLabel}` });
      if (tags.includes('kanonisch')) scoreSignals.push({ kind: 'canon', weight: 1, label: 'Kanonische Figur' });
      if (hasNarrativePressure && (entry?.isMentor || entry?.isReturned || tags.includes('der_aussenseiter') || tags.includes('die_rivalin') || tags.includes('die_vorzeige_scholarin'))) {
        scoreSignals.push({ kind: 'narrative', weight: 2, label: 'Aktive Quest- oder Story-Anschluesse vorhanden' });
      }
      if (tags.includes('der_aussenseiter') || tags.includes('die_rivalin') || tags.includes('die_vorzeige_scholarin')) {
        scoreSignals.push({ kind: 'arc', weight: 2, label: 'Klarer dramatischer Schueler-Arc' });
      }
      const score = scoreSignals.reduce((sum, signal) => sum + Number(signal.weight || 0), 0);
      if (score <= 0) continue;

      const suggestedRole = entry?.isMentor ? 'Mentor' : (entry?.isReturned ? 'Rueckkehr-NSC' : (score >= 5 ? 'Mentor-Kandidat' : 'Rueckkehr-Kandidat'));
      const rationale = scoreSignals.slice(0, 3).map((signal) => signal.label).join(' · ') || 'Belastbare Alumni-Daten vorhanden';
      items.push({
        npcId: entry?.npcId ?? null,
        name: entry?.name ?? 'Unbekannt',
        suggestedRole,
        score,
        rationale,
        narrativeHint: hasNarrativePressure
          ? [
              ...(Array.isArray(narrativeContext?.questTitles) ? narrativeContext.questTitles.slice(0, 2) : []),
              ...(Array.isArray(narrativeContext?.storyThreads) ? narrativeContext.storyThreads.slice(0, 2) : []),
            ].filter(Boolean).join(' · ') || 'Quest- oder Story-Anschluss vorhanden'
          : '—',
        statusLabel: entry?.statusLabel ?? '—',
        isMentor: !!entry?.isMentor,
        isReturned: !!entry?.isReturned,
        focus: entry?.focus ?? null,
        focusLabel: entry?.focusLabel ?? '—',
        latestGradeLabel: entry?.latestGradeLabel ?? '—',
        supportingExamsLabel: entry?.supportingExamsLabel ?? '—',
      });
    }

    return items
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String(a.name).localeCompare(String(b.name), 'de'))
      .slice(0, 5);
  }

  async getOverview() {
    const alumni = this.listAlumni();
    const root = this._getRoot();
    const history = Array.isArray(root?.history) ? root.history.slice(0, 6) : [];
    const { trimesterMap, draftMap, report } = await this._buildGradeContext();
    const enrichedAlumni = alumni.map((entry) => {
      const trimesterGrade = trimesterMap.get(String(entry?.npcId ?? '').trim()) ?? null;
      const reportCardDraft = draftMap.get(String(entry?.npcId ?? '').trim()) ?? null;
      return {
        ...entry,
        trimesterGrade,
        reportCardDraft,
        latestGradeLabel: trimesterGrade?.finalGradeLabel ?? '—',
        latestGradeStatusLabel: trimesterGrade?.statusLabel ?? 'keine Bewertung',
        latestGradeEvidenceLabel: trimesterGrade?.evidenceLabel ?? 'keine Evidenz',
        latestGradeConfidenceLabel: trimesterGrade?.confidenceLabel ?? '—',
        supportingExamsLabel: trimesterGrade?.supportingExamsLabel ?? '—',
        hasGradeContext: !!trimesterGrade,
        hasReportCardDraft: !!reportCardDraft,
      };
    });
    const narrativeContext = this._collectNarrativeContext(report);
    const reentrySuggestions = this._buildReentrySuggestions(enrichedAlumni, narrativeContext);
    return {
      summary: {
        total: enrichedAlumni.length,
        mentors: enrichedAlumni.filter((entry) => entry.isMentor).length,
        returned: enrichedAlumni.filter((entry) => entry.isReturned).length,
        inactive: enrichedAlumni.filter((entry) => entry.isInactive).length,
        graded: enrichedAlumni.filter((entry) => entry.hasGradeContext).length,
        suggested: reentrySuggestions.length,
        narrativeHooks: (narrativeContext.questTitles?.length ?? 0) + (narrativeContext.storyThreads?.length ?? 0),
      },
      alumni: enrichedAlumni,
      candidates: this.listCandidates(6),
      narrativeContext,
      reentrySuggestions,
      recentChanges: history.map((entry) => ({
        npcId: entry?.npcId ?? null,
        name: this._getNpc(entry?.npcId)?.name ?? entry?.name ?? 'Unbekannt',
        actionLabel: entry?.actionLabel ?? 'Aktualisiert',
        changedAt: entry?.changedAt ?? null,
        statusLabel: _getStatusMeta(entry?.status).label,
      }))
    };
  }

  async registerAlumnus({ npcId, status = 'graduated', note = '', sourceExamId = null } = {}) {
    const normalizedNpcId = String(npcId ?? '').trim();
    if (!normalizedNpcId) throw new Error('npcId fehlt');
    const npc = this._getNpc(normalizedNpcId);
    if (!npc) throw new Error(`NPC nicht gefunden: ${normalizedNpcId}`);
    if (String(npc?.role ?? '').trim() !== 'student') {
      throw new Error(`Nur Schueler koennen als Alumni markiert werden: ${normalizedNpcId}`);
    }

    const normalizedStatus = _normalizeStatus(status);
    const now = new Date().toISOString();
    const time = this.state?.get?.('time') ?? {};
    const graduationPeriod = _buildPeriodFromTime(time);

    await this.state.transaction(async (tx) => {
      const root = foundry.utils.deepClone(tx.get('academy.alumni') ?? { records: {}, history: [] });
      const existing = root.records?.[normalizedNpcId] ?? {};
      root.records ??= {};
      root.history = Array.isArray(root.history) ? root.history : [];
      root.records[normalizedNpcId] = {
        npcId: normalizedNpcId,
        status: normalizedStatus,
        note: String(note ?? '').trim() || existing.note || null,
        sourceExamId: String(sourceExamId ?? '').trim() || existing.sourceExamId || null,
        graduationPeriod: existing.graduationPeriod ?? graduationPeriod,
        firstTrackedAt: existing.firstTrackedAt ?? now,
        updatedAt: now,
      };
      root.history.unshift({
        npcId: normalizedNpcId,
        status: normalizedStatus,
        action: existing.npcId ? 'updated' : 'registered',
        actionLabel: existing.npcId ? 'Alumni aktualisiert' : 'Als Alumni markiert',
        changedAt: now,
      });
      root.history = root.history.slice(0, 24);
      tx.set('academy.alumni', root);
    });

    ui.notifications?.info?.(`Alumni erfasst: ${npc.name ?? normalizedNpcId}`);
    return await this.getOverview();
  }


  async setAlumniFocus({ npcId, focus = null } = {}) {
    const normalizedNpcId = String(npcId ?? '').trim();
    if (!normalizedNpcId) throw new Error('npcId fehlt');
    const npc = this._getNpc(normalizedNpcId);
    if (!npc) throw new Error(`NPC nicht gefunden: ${normalizedNpcId}`);

    const normalizedFocus = _normalizeFocus(focus);
    const now = new Date().toISOString();

    await this.state.transaction(async (tx) => {
      const root = foundry.utils.deepClone(tx.get('academy.alumni') ?? { records: {}, history: [] });
      const existing = root.records?.[normalizedNpcId] ?? null;
      if (!existing) throw new Error(`Kein Alumni-Eintrag fuer ${normalizedNpcId} vorhanden`);
      root.records ??= {};
      root.history = Array.isArray(root.history) ? root.history : [];
      root.records[normalizedNpcId] = {
        ...existing,
        focus: normalizedFocus,
        updatedAt: now,
      };
      root.history.unshift({
        npcId: normalizedNpcId,
        status: existing?.status ?? 'graduated',
        action: 'focus',
        actionLabel: normalizedFocus ? `Wiedereinsatz markiert: ${_focusLabel(normalizedFocus)}` : 'Wiedereinsatz-Fokus entfernt',
        changedAt: now,
      });
      root.history = root.history.slice(0, 24);
      tx.set('academy.alumni', root);
    });

    ui.notifications?.info?.(`Alumni-Fokus gesetzt: ${npc.name ?? normalizedNpcId}`);
    return await this.getOverview();
  }

  async setAlumniStatus({ npcId, status = 'graduated' } = {}) {
    const normalizedNpcId = String(npcId ?? '').trim();
    if (!normalizedNpcId) throw new Error('npcId fehlt');
    const npc = this._getNpc(normalizedNpcId);
    if (!npc) throw new Error(`NPC nicht gefunden: ${normalizedNpcId}`);

    const normalizedStatus = _normalizeStatus(status);
    const now = new Date().toISOString();

    await this.state.transaction(async (tx) => {
      const root = foundry.utils.deepClone(tx.get('academy.alumni') ?? { records: {}, history: [] });
      const existing = root.records?.[normalizedNpcId] ?? null;
      if (!existing) throw new Error(`Kein Alumni-Eintrag fuer ${normalizedNpcId} vorhanden`);
      root.records ??= {};
      root.history = Array.isArray(root.history) ? root.history : [];
      root.records[normalizedNpcId] = {
        ...existing,
        status: normalizedStatus,
        updatedAt: now,
      };
      root.history.unshift({
        npcId: normalizedNpcId,
        status: normalizedStatus,
        action: 'status',
        actionLabel: `Status gesetzt: ${_getStatusMeta(normalizedStatus).label}`,
        changedAt: now,
      });
      root.history = root.history.slice(0, 24);
      tx.set('academy.alumni', root);
    });

    ui.notifications?.info?.(`Alumni-Status gesetzt: ${npc.name ?? normalizedNpcId}`);
    return await this.getOverview();
  }
}

export default JanusAlumniService;
