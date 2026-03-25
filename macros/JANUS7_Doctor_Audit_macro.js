/**
 * @file macros/JANUS7_Doctor_Audit_macro.js
 *
 * JANUS7 Doctor (Audit Macro)
 * ==========================
 * Scans JANUS7 module JS files for architecture violations:
 *
 * 1) DSA5 isolation
 *    - Direct `actor.system` access outside DSA5 bridge
 *    - Direct `CONFIG.DSA5` access outside DSA5 bridge
 *    - Direct imports from DSA5 system internals ("/systems/dsa5/...") outside the bridge/facade
 *
 * 2) State isolation (Phase 1 SSOT)
 *    - Direct writes to `game.settings.set("janus7","state", ...)` outside core/state.js
 *    - Direct writes to `game.settings.set(MODULE_ID,"state", ...)` style patterns (heuristic)
 *
 * Output
 * - Whisper to the executing user (chat)
 * - Console warn with structured report
 *
 * Notes
 * - Read-only: does NOT mutate anything.
 * - File list is embedded at build-time (generatedAt: 2026-01-21T19:52:55Z).
 */

const MODULE_ID = "Janus7";
const STATE_KEY = "state";
const FILE_INDEX = [
  "academy/calendar.js",
  "academy/data-api.js",
  "academy/events.js",
  "academy/exams.js",
  "academy/lessons.js",
  "academy/locations-engine.js",
  "academy/phase4.js",
  "academy/scoring.js",
  "academy/slot-resolver.js",
  "academy/social.js",
  "atmosphere/controller.js",
  "atmosphere/phase5.js",
  "atmosphere/providers/foundry-playlist-provider.js",
  "bridge/dsa5/actors.js",
  "bridge/dsa5/constants.js",
  "bridge/dsa5/diagnostics.js",
  "bridge/dsa5/errors.js",
  "bridge/dsa5/index.js",
  "bridge/dsa5/items.js",
  "bridge/dsa5/packs.js",
  "bridge/dsa5/resolver.js",
  "bridge/dsa5/rolls.js",
  "bridge/dsa5/wrapper.js",
  "bridge/index.js",
  "core/common.js",
  "core/config.js",
  "core/diagnostics.js",
  "core/director.js",
  "core/errors.js",
  "core/index.js",
  "core/io.js",
  "core/logger.js",
  "core/state.js",
  "core/test/registry.js",
  "core/test/runner.js",
  "core/test/tests/p0/P0_TC_01__leitbild_konsistent.test.js",
  "core/test/tests/p1/P1_TC_01__engine_wird_geladen.test.js",
  "core/test/tests/p6/P6_TC_01__control_panel_oeffnet.test.js",
  "core/test/tests/p6/P6_TC_02__mcq_examen_ui_laedt_fragen.test.js",
  "core/test/tests/p6/P6_TC_03__director_time_advance.test.js",
  "core/test/tests/p6/P6_TC_04__permissions.test.js",
  "core/test/tests/p6/P6_TC_06__i18n.test.js",
  "core/validator.js",
  "devtools/index.js",
  "devtools/test-bridge.js",
  "devtools/test-harness/app.js",
  "devtools/test-harness/catalog-loader.js",
  "devtools/test-harness/ctx-api.js",
  "devtools/test-harness/harness.js",
  "devtools/test-harness/snippet-exec.js",
  "devtools/test-harness/ui-log-buffer.js",
  "discovery/approval.js",
  "discovery/index.js",
  "discovery/phase6_5.js",
  "discovery/search-engine.js",
  "discovery/semantic-domains.js",
  "docs/TESTRUNNER_FULLCATALOG_ManualFirst.js",
  "macros/JANUS7 #U2013 Phase 4 Quick Demo (Version 0.4.1).js",
  "macros/JANUS7 #U2013 Phase 4 TestRunner (Version 0.4.3).js",
  "macros/JANUS7 Full Functional Test Macro (v0.4.9).js",
  "macros/JANUS7 Phase4 Seed Verifier (deterministisch).js",
  "macros/JANUS7_Control_Panel_Open.js",
  "macros/JANUS7_EventMessageListener.js",
  "macros/JANUS7_Phase4_QuickDemo.js",
  "macros/JANUS7_TestRunner_0to5_WithChecklist.js",
  "macros/JANUS7_TestRunner_EdgeCases.js",
  "macros/JANUS7_TestRunner_FullCatalog_v1.5_macro.js",
  "macros/JANUS7_TestRunner_FullCatalog_v1.6_macro.js",
  "macros/JANUS7_TestRunner_Phase1-3.js",
  "macros/JANUS7_TestRunner_Phase4.js",
  "macros/JANUS7_TestRunner_Phase5.js",
  "macros/JANUS7_TestRunner_SlotResolver.js",
  "macros/atmosphere/ApplyMoodDialog.js",
  "macros/atmosphere/ClearMaster.js",
  "macros/atmosphere/ConfigureStability.js",
  "macros/atmosphere/Disable.js",
  "macros/atmosphere/Enable.js",
  "macros/atmosphere/Pause.js",
  "macros/atmosphere/Resume.js",
  "macros/atmosphere/SetMasterSelf.js",
  "macros/atmosphere/SetMasterVolume.js",
  "macros/atmosphere/ShowStatus.js",
  "macros/atmosphere/ToggleAutoFlags.js",
  "bridge/dsa5/index.js",
  "bridge/dsa5/index.js",
  "tools/md-to-json.js",
  "ui/commands.js",
  "ui/control-panel/JanusControlPanelApp.js",
  "ui/control-panel/tabs/academy-tab.js",
  "ui/control-panel/tabs/atmo-tab.js",
  "ui/control-panel/tabs/debug-tab.js",
  "ui/control-panel/tabs/scoring-tab.js",
  "ui/control-panel/tabs/social-tab.js",
  "ui/control-panel/tabs/status-tab.js",
  "ui/control-panel/tabs/time-tab.js",
  "ui/core/base-app.js",
  "ui/helpers.js",
  "ui/permissions.js",
  "ui/phase6.js",
  "ui/test-harness/JanusSettingsTestHarnessApp.js"
];

function isAllowedFile(path) {
  // DSA5 bridge layer may touch system internals
  if (path === "bridge/dsa5/index.js") return true;

  // Core is allowed to write state (SSOT)
  if (path === "core/state.js") return true;

  return false;
}

async function fetchText(relPath) {
  const url = `modules/${MODULE_ID}/${relPath}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.text();
}

function scan(text) {
  const findings = [];

  // --- DSA5 isolation ---
  const reActorSystem = /\bactor\.system\b/g;
  const reConfigDSA5 = /\bCONFIG\.DSA5\b/g;

  // Importing DSA5 internals: import ... from "/systems/dsa5/..." or 'systems/dsa5/...'
  const reDsa5InternalImport = /\bimport\s+[^;]+\s+from\s+["']\/?systems\/dsa5\/[^"']+["']/g;

  // Also catch dynamic import('/systems/dsa5/...')
  const reDsa5DynamicImport = /\bimport\s*\(\s*["']\/?systems\/dsa5\/[^"']+["']\s*\)/g;

  // --- State isolation ---
  // Direct: game.settings.set("janus7","state", ...)
  const reDirectStateWrite = /\bgame\.settings\.set\s*\(\s*["']janus7["']\s*,\s*["']state["']/g;

  // Heuristic: game.settings.set(MODULE_ID, "state", ...) or game.settings.set(moduleId,"state",...)
  // This won't catch every variant; it's meant to flag suspicious writes.
  const reHeuristicStateWrite = /\bgame\.settings\.set\s*\(\s*([A-Za-z_$][\w$]*|MODULE_ID)\s*,\s*["']state["']/g;

  const pushAll = (re, type) => {
    let m;
    while ((m = re.exec(text))) findings.push({ type, index: m.index, match: m[0] });
  };

  pushAll(reActorSystem, "actor.system");
  pushAll(reConfigDSA5, "CONFIG.DSA5");
  pushAll(reDsa5InternalImport, "import:/systems/dsa5/*");
  pushAll(reDsa5DynamicImport, "dynamic-import:/systems/dsa5/*");
  pushAll(reDirectStateWrite, "state-write:game.settings.set('janus7','state')");
  pushAll(reHeuristicStateWrite, "state-write:heuristic");

  return findings;
}

function contextSnippet(text, idx, radius = 90) {
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function groupFindings(findings) {
  const byType = new Map();
  for (const f of findings) {
    if (!byType.has(f.type)) byType.set(f.type, []);
    byType.get(f.type).push(f);
  }
  return Array.from(byType.entries()).map(([type, arr]) => ({ type, count: arr.length }));
}

const core = game?.janus7?.core;
const log = core?.logger?.child?.("doctor") ?? console;

const results = [];
for (const rel of FILE_INDEX) {
  if (!rel.endsWith(".js")) continue;
  if (isAllowedFile(rel)) continue;

  try {
    const txt = await fetchText(rel);
    const f = scan(txt);
    if (f.length) {
      results.push({
        file: rel,
        summary: groupFindings(f),
        findings: f.map(x => ({ ...x, snippet: contextSnippet(txt, x.index) }))
      });
    }
  } catch (err) {
    results.push({ file: rel, error: String(err) });
  }
}

const violations = results.filter(r => r.findings?.length);
const errors = results.filter(r => r.error);

if (!violations.length && !errors.length) {
  ChatMessage.create({
    content: `<p><b>JANUS7 Doctor:</b> ✅ Keine Verstöße gefunden (DSA5/State Isolation).</p>`,
    whisper: [game.user.id]
  });
  log.info("JANUS7 Doctor: No violations found.");
} else {
  const lines = [];
  lines.push(`<p><b>JANUS7 Doctor:</b> ❌ Verstöße gefunden: <b>${violations.length}</b></p>`);

  for (const v of violations) {
    lines.push(`<hr/><p><b>${v.file}</b></p>`);
    for (const s of v.summary) {
      lines.push(`<div><b>${s.type}</b>: ${s.count}</div>`);
    }
    for (const f of v.findings.slice(0, 8)) {
      lines.push(`<div style="font-family:monospace; font-size: 12px;">• ${f.type} … ${foundry.utils.escapeHTML(f.snippet)}</div>`);
    }
    if (v.findings.length > 8) {
      lines.push(`<div style="opacity:0.7;">(+${v.findings.length - 8} weitere Treffer, Details in Console)</div>`);
    }
  }

  if (errors.length) {
    lines.push(`<hr/><p><b>Fetch Errors:</b> ${errors.length}</p>`);
    for (const e of errors) lines.push(`<div style="font-family:monospace; font-size: 12px;">• ${e.file}: ${foundry.utils.escapeHTML(e.error)}</div>`);
  }

  ChatMessage.create({
    content: lines.join(""),
    whisper: [game.user.id]
  });

  log.warn("JANUS7 Doctor violations", { violations, errors });
}
