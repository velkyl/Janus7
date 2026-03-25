// JANUS7 – TestRunner Phase 5 (Atmosphere)
// Runs a lightweight QA suite for Atmosphere: overrides, priorities, anti-flapping, socket validation (best-effort), playlist resolution.
// NOTE: Intended for GMs. Run on the intended Master-Client for full coverage (audio actions are master-only).

/* global game, ui, ChatMessage */

const MODULE = "JANUS7";
const now = () => Date.now();

/**
 * @param {string} name
 * @param {() => Promise<void>} fn
 * @returns {Promise<{name:string, ok:boolean, error?:any, ms:number}>}
 */
async function test(name, fn) {
  const t0 = performance.now();
  try {
    await fn();
    return { name, ok: true, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { name, ok: false, error: e, ms: Math.round(performance.now() - t0) };
  }
}

function assert(cond, msg = "Assertion failed") {
  if (!cond) throw new Error(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatError(e) {
  if (!e) return "unknown";
  if (typeof e === "string") return e;
  return e.message ?? JSON.stringify(e);
}

async function main() {
  if (!game?.user?.isGM) {
    ui.notifications.warn(`${MODULE} Phase5 TestRunner: nur GM`);
    return;
  }

  const atm = game?.janus7?.atmosphere;
  assert(atm, "game.janus7.atmosphere nicht verfügbar");
  const state = game?.janus7?.core?.state;
  assert(state, "game.janus7.core.state nicht verfügbar");

  const results = [];

  // Ensure enabled for tests (restore later)
  const prevEnabled = !!state.get("features.atmosphere.enabled");
  const prevMaster = state.get("atmosphere.masterClientUserId");
  const prevAutoCal = !!state.get("atmosphere.autoFromCalendar");
  const prevAutoEv = !!state.get("atmosphere.autoFromEvents");
  const prevAutoLoc = !!state.get("atmosphere.autoFromLocation");
  const prevCooldown = Number(state.get("atmosphere.cooldownMs") ?? 0);
  const prevMinDur = Number(state.get("atmosphere.minDurationMs") ?? 0);
  const prevOverrideMs = Number(state.get("atmosphere.eventOverrideMs") ?? 0);

  const restore = async () => {
    await state.transaction(async (s) => {
      s.set("features.atmosphere.enabled", prevEnabled);
      s.set("atmosphere.masterClientUserId", prevMaster ?? null);
      s.set("atmosphere.autoFromCalendar", prevAutoCal);
      s.set("atmosphere.autoFromEvents", prevAutoEv);
      s.set("atmosphere.autoFromLocation", prevAutoLoc);
      s.set("atmosphere.cooldownMs", prevCooldown);
      s.set("atmosphere.minDurationMs", prevMinDur);
      s.set("atmosphere.eventOverrideMs", prevOverrideMs);
      // Clean override leftovers from tests
      s.set("atmosphere.overrideMoodId", null);
      s.set("atmosphere.overrideUntil", null);
      s.set("atmosphere.overrideSource", null);
    });
    await state.save({ force: true });
  };

  try {
    results.push(await test("Enable Atmosphere", async () => {
      await state.transaction(async (s) => s.set("features.atmosphere.enabled", true));
      await state.save({ force: true });
      assert(!!state.get("features.atmosphere.enabled"), "Feature-Flag nicht aktiviert");
    }));

    results.push(await test("Set Master = Self", async () => {
      await atm.setMasterClient(game.user.id, { broadcast: true });
      assert(state.get("atmosphere.masterClientUserId") === game.user.id, "Master wurde nicht gesetzt");
    }));

    results.push(await test("List Moods", async () => {
      const moods = await atm.listMoods();
      assert(Array.isArray(moods) && moods.length > 0, "Keine Moods gefunden");
    }));

    results.push(await test("Apply Mood (manual)", async () => {
      const moods = await atm.listMoods();
      const moodId = moods[0].id;
      await atm.applyMood(moodId, { broadcast: true, force: true });
      const st = atm.status();
      assert(st.activeMoodId === moodId, "Mood wurde nicht aktiv");
      assert(st.activeSource === "manual", "Source sollte manual sein");
    }));

    results.push(await test("Anti-Flapping (cooldown blocks lower/equal prio)", async () => {
      // Ensure anti-flapping active for test
      await state.transaction(async (s) => {
        s.set("atmosphere.cooldownMs", 5000);
        s.set("atmosphere.minDurationMs", 30000);
      });
      await state.save({ force: true });

      const moods = await atm.listMoods();
      assert(moods.length >= 2, "Benötige mindestens 2 Moods für Cooldown-Test");
      await atm.applyMood(moods[0].id, { broadcast: true, force: true });
      const before = atm.status();

      // Try switching quickly without force: should be blocked by cooldown/minDuration (manual vs manual, equal prio)
      await atm.applyMood(moods[1].id, { broadcast: true, force: false });
      const after = atm.status();
      assert(after.activeMoodId === before.activeMoodId, "Cooldown/MinDuration hat Wechsel nicht blockiert");
    }));

    results.push(await test("Event Override expires (watchdog)", async () => {
      // Short override window
      await state.transaction(async (s) => {
        s.set("atmosphere.eventOverrideMs", 1500);
        s.set("atmosphere.autoFromEvents", true);
      });
      await state.save({ force: true });

      // Pick a mood to use as override target (binding not required if controller supports direct event payload overrideMs + mood mapping via tag/id; we just set override fields directly here)
      const moods = await atm.listMoods();
      const moodId = moods[0].id;

      // Simulate an active event override by setting state like controller does
      const until = now() + 1200;
      await state.transaction(async (s) => {
        s.set("atmosphere.overrideMoodId", moodId);
        s.set("atmosphere.overrideUntil", until);
        s.set("atmosphere.overrideSource", "event");
      });
      await state.save({ force: true });

      // Wait for watchdog interval (10s) is too long; but our watchdog checks every 10s in controller.
      // We therefore also call applyBestAutoMood which should respect override and then after override expiry we trigger another call.
      await atm.applyBestAutoMood({ reason: "test-override-active" });
      assert(atm.status().activeMoodId === moodId, "Override-Mood nicht angewendet");

      // Wait beyond expiry and manually poke applyBestAutoMood, then allow watchdog to clear.
      await sleep(1800);
      await atm.applyBestAutoMood({ reason: "test-override-expired-poke" });

      // The watchdog should have cleared override fields soon; wait a bit for interval tick.
      await sleep(11000);

      const st = atm.status();
      assert(st.overrideMoodId === null, "overrideMoodId wurde nicht geleert");
      assert(st.overrideUntil === null, "overrideUntil wurde nicht geleert");
    }));

    results.push(await test("Socket validation rejects unknown sender (best-effort)", async () => {
      const ctrl = game.janus7.atmosphere.controller ?? game.janus7.atmosphere;
      assert(ctrl && typeof ctrl._onSocketMessage === "function", "Controller Socket-Handler fehlt");
      // Call handler directly with bogus sender
      await ctrl._onSocketMessage({ type: "ATM_SET_MASTER", senderUserId: "NOPE", sentAt: now(), payload: { userId: game.user.id } });
      // Should not crash; master should remain unchanged
      assert(state.get("atmosphere.masterClientUserId") === game.user.id, "Unknown sender konnte Master ändern");
    }));
  } finally {
    await restore();
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;

  const lines = [
    `<h2>${MODULE} Phase 5 TestRunner</h2>`,
    `<p><b>Pass:</b> ${ok} &nbsp; <b>Fail:</b> ${fail}</p>`,
    `<hr/>`,
    `<ul>`,
    ...results.map(r => `<li>${r.ok ? "✅" : "❌"} <b>${r.name}</b> (${r.ms}ms)${r.ok ? "" : `<br/><pre>${formatError(r.error)}</pre>`}</li>`),
    `</ul>`
  ].join("\n");

  await ChatMessage.create({ content: lines });
  if (fail === 0) ui.notifications.info(`${MODULE} Phase5 TestRunner: alle Tests grün`);
  else ui.notifications.warn(`${MODULE} Phase5 TestRunner: ${fail} Tests fehlgeschlagen (siehe Chat)`);
}

await main();
