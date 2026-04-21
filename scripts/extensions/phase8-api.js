/**
 * @file scripts/extensions/phase8-api.js
 * @phase 8 public gateway
 *
 * Thin async facade for phase8 services. UI- and shell-level consumers
 * must depend on this gateway instead of importing phase8 internals
 * directly, so architectural boundaries stay explicit and lintable.
 */

export async function createJanusAlumniService({ engine, logger } = {}) {
  const { JanusAlumniService } = await import('../../phase8/alumni/JanusAlumniService.js');
  return new JanusAlumniService({ engine, logger });
}

export async function createJanusReportCardOutputService({ engine, logger } = {}) {
  const { JanusReportCardOutputService } = await import('../../phase8/report-cards/JanusReportCardOutputService.js');
  return new JanusReportCardOutputService({ engine, logger });
}

export async function createJanusSocialStoryHookService({ engine, logger } = {}) {
  const { JanusSocialStoryHookService } = await import('../../phase8/social/JanusSocialStoryHookService.js');
  return new JanusSocialStoryHookService({ engine, logger });
}

export async function createJanusSessionPrepService({ engine, logger } = {}) {
  const { JanusSessionPrepService } = await import('../../phase8/session-prep/JanusSessionPrepService.js');
  return new JanusSessionPrepService({ engine, logger });
}
