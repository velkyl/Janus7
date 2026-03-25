export default {
  id: 'P4-TC-09',
  title: 'Cron service registered and exposes job API',
  phases: [4],
  kind: 'auto',
  expected: 'game.janus7.services.cron exists and addJob/register/unregister are functions.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const cron = engine?.services?.cron ?? engine?.cron ?? null;
    const ok = !!cron && ['addJob','register','unregister'].every((fn) => typeof cron?.[fn] === 'function');
    return { ok, summary: ok ? 'Cron service verfügbar' : 'Cron service fehlt oder API unvollständig', notes: [`hasCron=${!!cron}`] };
  }
};
