export default {
  id: 'P4-TC-10',
  title: 'Time reactor registered and hookable',
  phases: [4],
  kind: 'auto',
  expected: 'game.janus7.services.time.reactor exists and exposes start/stop or equivalent API.',
  async run(ctx) {
    const engine = ctx?.engine ?? game?.janus7;
    const reactor = engine?.services?.time?.reactor ?? engine?.time?.reactor ?? null;
    const candidates = ['start', 'stop', 'register', 'unregister', 'tick'];
    const available = candidates.filter((fn) => typeof reactor?.[fn] === 'function');
    const ok = !!reactor && available.length >= 2;
    return { ok, summary: ok ? `Time reactor verfügbar (${available.join(', ')})` : 'Time reactor fehlt oder API zu klein', notes: [`hasReactor=${!!reactor}`] };
  }
};
