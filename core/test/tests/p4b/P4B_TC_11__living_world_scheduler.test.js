export default {
  id: 'P4B-TC-11',
  title: 'Living World Scheduler registriert sich an der Engine',
  phases: [4,4.5],
  kind: 'auto',
  expected: 'engine.academy.livingWorld.scheduler ist vorhanden',
  whereToFind: 'game.janus7.academy.livingWorld.scheduler',
  run: async () => {
    const scheduler = game?.janus7?.academy?.livingWorld?.scheduler;
    return {
      ok: !!scheduler,
      summary: scheduler ? 'Living World Scheduler vorhanden' : 'Living World Scheduler fehlt',
    };
  }
};
