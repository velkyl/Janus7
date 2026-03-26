export function buildDiagnosticSnapshot(engine) {
  const state = engine?.core?.state?.get?.() ?? {};
  const graph = engine?.graph ?? null;
  const graphObj = graph?.getGraph?.() ?? null;
  const graphCache = graph?.diagnostics?.cache?.() ?? graph?.cache?.snapshot?.() ?? null;
  const lastReport = engine?.diagnostics?.getLastReport?.() ?? null;
  const academyValidation = engine?.academy?.data?.validation ?? engine?.academy?.data?.getValidation?.() ?? null;
  const academyReferenceDiagnostics = academyValidation?.academyReferenceDiagnostics ?? academyValidation ?? null;
  const optionalLoadWarnings = Array.isArray(academyValidation?.optionalLoadWarnings)
    ? academyValidation.optionalLoadWarnings.slice(0, 10)
    : [];
  const serviceReport = engine?.serviceRegistry?.getReport?.()
    ?? engine?.services?.registry?.getReport?.()
    ?? { ready: [], pending: [], uptime: {} };
  const errorSummary = engine?.errors?.getSummary?.()
    ?? { totalErrors: 0, totalWarnings: 0, byPhase: {}, latest: [] };

  return {
    moduleId: engine?.moduleId ?? 'janus7',
    moduleVersion: game?.modules?.get?.('Janus7')?.version ?? engine?.version ?? 'unknown',
    worldId: game?.world?.id ?? null,
    foundryVersion: game?.version ?? null,
    systemId: game?.system?.id ?? null,
    systemVersion: game?.system?.version ?? null,
    generatedAt: new Date().toISOString(),
    directorMode: engine?.core?.director?.kernel?.mode ?? engine?.director?.kernel?.mode ?? null,
    stateStatus: {
      hasState: !!engine?.core?.state,
      version: state?.meta?.version ?? null,
      schemaVersion: state?.meta?.schemaVersion ?? null,
      activeLocationId: state?.academy?.currentLocationId ?? null,
      time: state?.time ?? null
    },
    graph: {
      available: !!graph,
      dirty: !!graph?.isDirty?.(),
      lastBuildAt: graph?.getStatus?.()?.lastBuildAt ?? null,
      nodes: graphObj?.getAllNodes?.().length ?? 0,
      edges: graphObj?.getAllEdges?.().length ?? 0,
      cache: graphCache ?? { size: 0, hits: 0, misses: 0, invalidations: 0 }
    },
    diagnostics: {
      health: lastReport?.health ?? null,
      warnings: Array.isArray(lastReport?.warnings) ? lastReport.warnings.slice(0, 10) : [],
      recentChecks: Array.isArray(lastReport?.checks) ? lastReport.checks.slice(0, 10) : [],
      academyValidation: academyReferenceDiagnostics,
      optionalLoadWarnings
    },
    services: serviceReport,
    errors: errorSummary,
    ui: {
      openWindows: Object.keys(globalThis.ui?.windows ?? {}).length,
      isGM: !!game?.user?.isGM,
      userId: game?.user?.id ?? null
    }
  };
}

export default buildDiagnosticSnapshot;
