/**
 * JANUS7 – Guided Manual Tests
 *
 * Öffnet den geführten Manual-Test-Lauf und speichert Ergebnisse persistent.
 */

(async () => {
  const api = game?.janus7?.test?.openGuidedManualTests;
  if (!api) {
    ui.notifications.error('JANUS7 Guided Manual Tests nicht verfügbar.');
    return;
  }

  const result = await api({ awaitCompletion: true });
  const counts = result?.counts ?? {};
  ui.notifications.info(`Guided Manual beendet: PASS ${counts.pass ?? 0} | FAIL ${counts.fail ?? 0} | SKIP ${counts.skip ?? 0} | OFFEN ${counts.pending ?? 0}`);
  return result;
})();
