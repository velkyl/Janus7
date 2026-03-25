/**
 * JANUS7_TestRunner_0to5_WithChecklist
 * - Läuft automatisierte Tests (Phase 0–5 soweit möglich)
 * - Öffnet danach eine ausfüllbare Checkliste für Manual/SKIP-Tests
 * - Erstellt Chat-Report inkl. ausgefüllter Manual-Checks
 *
 * GM empfohlen.
 */

(async () => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  const fmtMs = (n) => `${Math.round(n)}ms`;
  const nowIso = () => new Date().toISOString();

  const results = []; // {phase,id,title,status,details,manual:boolean}
  const add = (phase, id, title, status, details = "", manual = false) =>
    results.push({ phase, id, title, status, details, manual });

  const ok = (p, id, t, d="") => add(p, id, t, "PASS", d);
  const fail = (p, id, t, e) => add(p, id, t, "FAIL", e?.stack || e?.message || String(e));
  const manual = (p, id, t, hint="") => add(p, id, t, "SKIP", hint, true);

  const chat = async (html) => ChatMessage.create({ content: html });

  // --- Preconditions ---
  const t0 = performance.now();
  if (!game?.janus7) {
    ui.notifications.error("JANUS7 nicht geladen: game.janus7 fehlt.");
    return;
  }

  const J = game.janus7;
  const state = J?.core?.state;
  const io = J?.core?.io;

  if (!state || !io) {
    ui.notifications.error("JANUS7 Core APIs fehlen (core.state/core.io).");
    return;
  }

  // --- Snapshot/Restore (best effort) ---
  let snapshotJSON = null;
  try {
    snapshotJSON = io.exportStateAsJSON();
  } catch (e) {
    console.warn("[JANUS7] Snapshot-Export fehlgeschlagen", e);
    ui.notifications.warn("Snapshot-Export fehlgeschlagen (Tests laufen ohne Restore-Safety).");
  }
  const restore = async () => {
    if (!snapshotJSON) return;
    try { await io.importStateFromJSON(snapshotJSON); }
    catch (e) {
      console.warn("[JANUS7] Snapshot-Restore fehlgeschlagen", e);
      ui.notifications.warn("Snapshot-Restore fehlgeschlagen (siehe Konsole).");
    }
  };

  // ============================================================
  // Phase 0: (Manual)
  // ============================================================
  manual(0, "P0-TC-01", "Leitbild konsistent dokumentiert", "Doku/Leitbild gegen Repo/Docs prüfen.");
  manual(0, "P0-TC-02", "Architekturdiagramm vollständig", "Diagramme/Phasenmodell gegen Implementierung prüfen.");
  manual(0, "P0-TC-03", "Tech-Stack dokumentiert", "Foundry v13+, ESM, keine Buildsteps, etc.");

  // ============================================================
  // Phase 1: Core & State (Auto)
  // ============================================================
  ok(1, "P1-TC-01", "Engine geladen", "game.janus7 vorhanden.");

  try {
    const s = game.settings.get("janus7", "coreState");
    if (!s || typeof s !== "object") throw new Error("coreState ist kein Objekt.");
    ok(1, "P1-TC-02", "State registriert", "coreState OK.");
  } catch (e) { fail(1, "P1-TC-02", "State registriert", e); }

  try {
    const before = state.get("time.day");
    state.set("time.day", (Number(before) || 0) + 1);
    if (typeof state.save === "function") await state.save();
    const after = state.get("time.day");
    if (after !== (Number(before) || 0) + 1) throw new Error(`time.day nicht inkrementiert: ${before} -> ${after}`);
    ok(1, "P1-TC-03", "State Get/Set", `time.day ${before} -> ${after}`);
  } catch (e) { fail(1, "P1-TC-03", "State Get/Set", e); }

  if (typeof state.transaction === "function") {
    try {
      const before = state.get("time.week");
      let threw = false;
      try {
        await state.transaction(async () => {
          state.set("time.week", (Number(before) || 0) + 999);
          throw new Error("intentional");
        });
      } catch { threw = true; }
      const after = state.get("time.week");
      if (!threw) throw new Error("Transaction hat nicht geworfen.");
      if (after !== before) throw new Error(`Rollback fehlgeschlagen: ${before} -> ${after}`);
      ok(1, "P1-TC-04", "Transaction Rollback", `time.week blieb ${after}`);
    } catch (e) { fail(1, "P1-TC-04", "Transaction Rollback", e); }
  } else {
    manual(1, "P1-TC-04", "Transaction Rollback", "state.transaction nicht vorhanden → manuell prüfen/entscheiden.");
  }

  try {
    const exported = io.exportStateAsJSON();
    await io.importStateFromJSON(exported);
    ok(1, "P1-TC-07", "Export/Import", "Re-Import erfolgreich.");
  } catch (e) { fail(1, "P1-TC-07", "Export/Import", e); }

  // ============================================================
  // Phase 2: Static Data (Auto + Manual)
  // ============================================================
  const dataApi = J?.academy?.data;
  if (dataApi?.validateIntegrity) {
    try {
      const t = performance.now();
      await dataApi.validateIntegrity();
      ok(2, "P2-TC-01", "AcademyData validateIntegrity", `Dauer ${fmtMs(performance.now() - t)}`);
    } catch (e) { fail(2, "P2-TC-01", "AcademyData validateIntegrity", e); }
  } else {
    manual(2, "P2-TC-01", "AcademyData validateIntegrity", "API nicht gefunden → Data-Load manuell prüfen.");
  }

  manual(2, "P2-TC-M1", "Datenkonsistenz stichprobenartig", "1–2 Lessons/NPC/Locations querprüfen (UUID/Tags/Refs).");

  // ============================================================
  // Phase 3: DSA5 Bridge (Auto + Manual)
  // ============================================================
  const dsa5 = J?.dsa5 || J?.bridge?.dsa5;
  if (dsa5?.assertAvailable) {
    try { await dsa5.assertAvailable(); ok(3, "P3-TC-00", "DSA5 Bridge verfügbar"); }
    catch (e) { fail(3, "P3-TC-00", "DSA5 Bridge verfügbar", e); }
  } else {
    manual(3, "P3-TC-00", "DSA5 Bridge verfügbar", "Bridge API nicht gefunden → init prüfen.");
  }

  manual(3, "P3-TC-M1", "Probenqualität plausibel", "Ein, zwei Skill/Zauber-Proben mit echtem Actor durchführen.");

  // ============================================================
  // Phase 4: Simulation (Auto + Manual)
  // ============================================================
  const cal = J?.academy?.calendar || J?.simulation?.calendar;
  if (cal?.advanceDay) {
    try {
      const before = state.get("time.day");
      await cal.advanceDay(1);
      const after = state.get("time.day");
      ok(4, "P4-TC-01", "Kalender advanceDay(1)", `${before} -> ${after}`);
    } catch (e) { fail(4, "P4-TC-01", "Kalender advanceDay(1)", e); }
  } else {
    manual(4, "P4-TC-01", "Kalender advanceDay(1)", "API nicht gefunden → Kalender-Engine manuell prüfen.");
  }

  manual(4, "P4-TC-M1", "Events/Scoring plausibel", "Ein Event triggern, prüfen ob Scoring/Logs erwartbar reagieren.");

  // ============================================================
  // Phase 5: Atmosphere (Auto + Manual)
  // ============================================================
  const atm = J?.atmosphere;
  if (!atm) {
    manual(5, "P5-TC-00", "Atmosphere API verfügbar", "game.janus7.atmosphere fehlt → init prüfen.");
  } else {
    ok(5, "P5-TC-00", "Atmosphere API verfügbar", "game.janus7.atmosphere vorhanden.");

    // Smoke: stopAll darf nicht crashen (bei euch aktuell: now undefined)
    if (typeof atm.stopAll === "function") {
      try {
        await atm.stopAll(); // sollte nach dem Fix nicht mehr crashen
        ok(5, "P5-TC-01", "Atmosphere stopAll()", "No-throw.");
      } catch (e) { fail(5, "P5-TC-01", "Atmosphere stopAll()", e); }
    } else {
      manual(5, "P5-TC-01", "Atmosphere stopAll()", "atm.stopAll fehlt → Macro/Engine prüfen.");
    }

    // Rest ist in der Regel umgebungsabhängig (Playlists/Audio/Second Screen)
    manual(5, "P5-TC-M2", "Master-Client Prinzip", "Audio läuft nur auf Master-Client (2 Clients testen).");
    manual(5, "P5-TC-M3", "Manual Mood Apply", "Mood setzen → Playlist/Track wechselt erwartbar.");
    manual(5, "P5-TC-M4", "Anti-Flapping", "Cooldown/MinDuration greift, höhere Prio überschreibt.");
    manual(5, "P5-TC-M5", "Event-Override Watchdog", "Override läuft ab → fällt auf Auto-Mood zurück.");
  }

  // Restore state after automated part
  await restore();

  // ============================================================
  // Manual Checklist Dialog
  // ============================================================
  const manualTests = results.filter(r => r.manual);

  const dialogHtml = `
  <style>
    .j7t-row { display:grid; grid-template-columns: 60px 110px 1fr 220px; gap:8px; align-items:start; padding:6px 0; border-bottom:1px solid #ddd; }
    .j7t-h { font-weight:bold; border-bottom:2px solid #bbb; padding-bottom:8px; margin-bottom:8px; }
    .j7t-note { width:100%; min-height:44px; }
    .j7t-sel { width:100%; }
    .j7t-small { font-size:12px; opacity:.8; }
  </style>
  <div class="j7t-h j7t-row">
    <div>Phase</div><div>ID</div><div>Test</div><div>Ergebnis / Notiz</div>
  </div>
  ${manualTests.map((t, i) => `
    <div class="j7t-row">
      <div>${esc(t.phase)}</div>
      <div><code>${esc(t.id)}</code></div>
      <div>
        <div>${esc(t.title)}</div>
        <div class="j7t-small">${esc(t.details || "")}</div>
      </div>
      <div>
        <select class="j7t-sel" name="status-${i}">
          <option value="SKIP" selected>SKIP / Nicht geprüft</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
        </select>
        <textarea class="j7t-note" name="note-${i}" placeholder="Notiz (optional)"></textarea>
      </div>
    </div>
  `).join("")}
  `;

  const manualFilled = await new Promise((resolve) => {
    new Dialog({
      title: "JANUS7 TestRunner – Manual/SKIP Tests ausfüllen",
      content: dialogHtml,
      buttons: {
        done: {
          label: "Übernehmen & Report erzeugen",
          callback: (html) => {
            const out = manualTests.map((t, i) => {
              const status = html.find(`[name="status-${i}"]`).val();
              const note = html.find(`[name="note-${i}"]`).val();
              return { id: t.id, status, note: String(note || "").trim() };
            });
            resolve(out);
          }
        },
        cancel: {
          label: "Abbrechen (alles bleibt SKIP)",
          callback: () => resolve([])
        }
      },
      default: "done",
      close: () => resolve([]),
    }).render(true);
  });

  // Apply manual inputs back into results
  for (const m of manualFilled) {
    const r = results.find(x => x.id === m.id);
    if (!r) continue;
    r.status = m.status || r.status;
    if (m.note) r.details = r.details ? `${r.details}\nNotiz: ${m.note}` : `Notiz: ${m.note}`;
  }

  // ============================================================
  // Report
  // ============================================================
  const counts = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
  const badge = (st) => ({
    PASS: `<span style="color:#0a0;font-weight:bold">PASS</span>`,
    FAIL: `<span style="color:#c00;font-weight:bold">FAIL</span>`,
    SKIP: `<span style="color:#888">SKIP</span>`
  }[st] || esc(st));

  const rows = results
    .sort((a,b) => (a.phase - b.phase) || a.id.localeCompare(b.id))
    .map(r => `
      <tr>
        <td>${esc(r.phase)}</td>
        <td><code>${esc(r.id)}</code></td>
        <td>${esc(r.title)}</td>
        <td>${badge(r.status)}</td>
        <td style="white-space:pre-wrap;max-width:520px">${esc(r.details || "")}</td>
      </tr>`
    ).join("");

  const dt = performance.now() - t0;
  await chat(`
    <h2>JANUS7 TestRunner (Phase 0–5)</h2>
    <p><b>Timestamp:</b> ${esc(nowIso())}<br/>
       <b>Dauer:</b> ${esc(fmtMs(dt))}<br/>
       <b>Summary:</b> PASS=${counts.PASS||0} | FAIL=${counts.FAIL||0} | SKIP=${counts.SKIP||0}
    </p>
    <table style="width:100%;border-collapse:collapse" border="1" cellpadding="4">
      <thead><tr><th>Phase</th><th>ID</th><th>Test</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);

  if ((counts.FAIL || 0) > 0) ui.notifications.error(`JANUS7 TestRunner: ${counts.FAIL} FAIL`);
  else ui.notifications.info(`JANUS7 TestRunner: ${counts.PASS || 0} PASS, ${counts.SKIP || 0} SKIP`);
})();