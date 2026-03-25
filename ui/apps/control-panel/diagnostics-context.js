export async function buildDiagnosticsView({ engine, state = {}, aiPreview = {}, directorRuntime = {}, getSetting = (() => false), cachedReport = null } = {}) {
  const e = engine ?? null;
  let diagReport = cachedReport ?? null;
  if (!diagReport) {
    try {
      diagReport = await (e?.diagnostics?.report?.({ notify: false }) ?? e?.diagnostics?.run?.({ notify: false }));
    } catch (_err) {
      diagReport = null;
    }
  }
  const diagSections = diagReport?.sections ?? {};
  const diagnosticSnapshot = e?.diagnostics?.snapshot?.() ?? null;
  return {
    generatedAt: diagReport?.meta?.generatedAt ?? new Date().toISOString(),
    snapshotGeneratedAt: diagnosticSnapshot?.generatedAt ?? null,
    build: {
      moduleId: diagSections?.build?.moduleId ?? aiPreview.moduleId ?? 'janus7',
      moduleVersion: diagSections?.build?.moduleVersion ?? aiPreview.moduleVersion ?? game?.modules?.get?.('janus7')?.version ?? '—',
      stateVersion: diagSections?.build?.stateVersion ?? state?.meta?.version ?? '—',
      stateSchemaVersion: diagSections?.build?.stateSchemaVersion ?? state?.meta?.schemaVersion ?? aiPreview.schemaVersion ?? '—',
      foundryVersion: diagSections?.build?.foundryVersion ?? game?.version ?? '—',
      systemVersion: diagSections?.build?.systemVersion ?? game?.system?.version ?? '—'
    },
    sync: {
      socketDeclared: !!diagSections?.sync?.socketDeclared,
      socketAvailable: !!diagSections?.sync?.socketAvailable,
      syncWithDSA5Calendar: !!diagSections?.sync?.syncWithDSA5Calendar,
      activeLocationId: diagSections?.sync?.activeLocationId ?? state?.academy?.currentLocationId ?? '—'
    },
    graph: {
      available: !!diagnosticSnapshot?.graph?.available,
      dirty: !!diagnosticSnapshot?.graph?.dirty,
      lastBuildAt: diagnosticSnapshot?.graph?.lastBuildAt ?? '—',
      nodes: Number(diagnosticSnapshot?.graph?.nodes ?? directorRuntime?.graphNodeCount ?? 0),
      edges: Number(diagnosticSnapshot?.graph?.edges ?? directorRuntime?.graphEdgeCount ?? 0),
      cache: diagnosticSnapshot?.graph?.cache ?? { size: 0, hits: 0, misses: 0, invalidations: 0 }
    },
    state: {
      statusVersion: diagnosticSnapshot?.stateStatus?.version ?? state?.meta?.version ?? '—',
      schemaVersion: diagnosticSnapshot?.stateStatus?.schemaVersion ?? state?.meta?.schemaVersion ?? '—',
      activeLocationId: diagnosticSnapshot?.stateStatus?.activeLocationId ?? state?.academy?.currentLocationId ?? '—'
    },
    phase7: {
      enabled: !!diagSections?.phase7?.enabled,
      apiReady: !!diagSections?.phase7?.apiReady,
      importHistoryCount: diagSections?.phase7?.importHistoryCount ?? 0,
      backupCount: diagSections?.phase7?.backupCount ?? 0,
      lastImportStatus: diagSections?.phase7?.lastImportStatus ?? '—',
      lastBackupRef: diagSections?.phase7?.lastBackupRef ?? '—'
    },
    tests: {
      totalResults: diagSections?.tests?.totalResults ?? (Array.isArray(e?.test?.results) ? e.test.results.length : 0),
      importFailed: diagSections?.tests?.importFailed ?? 0,
      lastRunAt: diagSections?.tests?.lastRunAt ?? e?.test?.lastRunAt ?? '—'
    },
    logger: {
      debugLevel: diagSections?.logger?.debugLevel ?? getSetting('debugLevel', 'info'),
      recentWarnings: Array.isArray(diagSections?.logger?.recentWarnings) ? diagSections.logger.recentWarnings : []
    },
    ui: {
      lastUiError: diagSections?.ui?.lastUiError ?? e?.diagnostics?.lastUiError ?? null
    },
    modules: {
      activeOptionalModules: Array.isArray(diagSections?.modules?.activeOptionalModules) ? diagSections.modules.activeOptionalModules : []
    },
    warnings: Array.isArray(diagReport?.warnings) ? diagReport.warnings : [],
    snapshot: diagnosticSnapshot
  };
}

export default buildDiagnosticsView;
