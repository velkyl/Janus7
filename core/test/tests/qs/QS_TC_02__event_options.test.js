export default {
  id: "TC-QS-02",
  title: "Quest Event Spawning & Options",
  phases: [4],
  kind: "auto",
  expected: "spawnFromPool zieht Events korrekt; presentEvent liefert optionen.",
  whereToFind: "game.janus7.academy.events",
  async run(ctx) {
    const engine = ctx?.engine ?? globalThis.game?.janus7;
    const eventsEngine = engine?.academy?.events;
    if (!eventsEngine) return { ok: false, summary: "JanusEventsEngine fehlt" };

    const actorId = "Actor.QSTestEvents";
    const poolName = "mock_pool";
    const eventId = "E_MOCK_EVENT";

    // Mocks
    const origGetPool = eventsEngine._getPool;
    const origGetEvent = eventsEngine._getEvent;
    const origGetOptions = eventsEngine._getOptionsForEvent;

    eventsEngine._getPool = (p) => p === poolName ? { poolId: poolName, events: [eventId] } : null;
    eventsEngine._getEvent = (e) => e === eventId ? { eventId, triggerExpr: "" } : null; // no trigger expr = always spawns
    eventsEngine._getOptionsForEvent = (e) => e === eventId ? [
      { optionId: "OPT_A", reqExpr: "player.level >= 1" },
      { optionId: "OPT_B", reqExpr: "" } // always available
    ] : [];

    // Wir mocken den conditions evaluator, der prüft, ob player.level >= 1...
    // da wir den echten evaluater haben, können ast-Logiken bei leerem context fails ergeben,
    // wir setzen also voraus, dass reqExpr: "false" scheitern würde, aber "" passiert immer.
    // Wir ändern "player.level >= 1" auf "false" um zu testen, dass OPT_A gefiltert wird.
    eventsEngine._getOptionsForEvent = (e) => e === eventId ? [
      { optionId: "OPT_A", reqExpr: "false" },
      { optionId: "OPT_B", reqExpr: "" } 
    ] : [];


    try {
      // 1. Spawn
      const spawned = await eventsEngine.spawnFromPool(poolName, { actorId });
      if (!spawned || spawned.eventId !== eventId) {
        return { ok: false, summary: "spawnFromPool lieferte das gemockte Event nicht zurück." };
      }

      // 2. Present options
      const presentation = await eventsEngine.presentEvent(eventId, { actorId });
      if (!presentation || !presentation.options) {
        return { ok: false, summary: "presentEvent hat keine Optionen geliefert." };
      }

      if (presentation.options.length !== 1 || presentation.options[0].optionId !== "OPT_B") {
        return { ok: false, summary: `presentEvent hat falsche Anzahl Optionen gefiltert: ${JSON.stringify(presentation.options)}` };
      }

    } catch (e) {
      return { ok: false, summary: `Fehler: ${e.message}` };
    } finally {
      eventsEngine._getPool = origGetPool;
      eventsEngine._getEvent = origGetEvent;
      eventsEngine._getOptionsForEvent = origGetOptions;
    }

    return { ok: true, summary: "Pool-Spawning und Requirement-Filtering der Optionen erfolgreich (Option B überlebte)." };
  }
};
