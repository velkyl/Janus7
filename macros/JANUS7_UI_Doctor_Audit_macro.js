/**
 * @file macros/JANUS7_UI_Doctor_Audit_macro.js
 *
 * JANUS7 UI Doctor (Audit Macro)
 * ==============================
 * Scans JANUS7 UI layer for architectural violations:
 *
 * Goals (Phase 6 refactor contract)
 * - UI contains no business logic (Presenter/Renderer must be pure)
 * - UI must NOT mutate state (no game.settings.set, no core.state writes)
 * - UI must NOT access engine internals
 * - UI must NOT access DSA5 internals (actor.system / CONFIG.DSA5 / system imports)
 * - UI actions must route through Director/Core (Action Router may call director.*)
 *
 * Output
 * - Whisper report to the executing user
 * - Console warnings with structured findings
 *
 * Notes
 * - Read-only: does NOT mutate anything.
 * - File list is embedded at build-time (generatedAt: 2026-01-21T20:05:48Z).
 */

const MODULE_ID = "Janus7";
const UI_FILES = [
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

// --- Policy ---
function policyFor(path) {
  // Allowed patterns differ by layer
  if (path.startsWith("ui/actions/")) return "actions";
  if (path.startsWith("ui/presenters/")) return "presenter";
  if (path.startsWith("ui/renderers/")) return "renderer";
  if (path === "ui/control-panel/JanusControlPanelApp.js") return "app";
  if (path === "ui/phase6.js") return "bootstrap";
  return "ui";
}

function isAllowed(path, type) {
  // Layer-specific allowances
  if (type === "director-reference") {
    // Only Action Router and Application may reference director.*
    const layer = policyFor(path);
    return layer === "actions" || layer === "app" || layer === "bootstrap";
  }
  if (type === "foundry-utils") {
    // Renderers may use foundry.utils (escapeHTML etc)
    const layer = policyFor(path);
    return layer === "renderer" || layer === "app";
  }
  return false;
}

async function fetchText(relPath) {
  const url = `modules/${MODULE_ID}/${relPath}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.text();
}

function scan(text, path) {
  const findings = [];
  const pushAll = (re, type) => {
    let m;
    while ((m = re.exec(text))) findings.push({ type, index: m.index, match: m[0] });
  };

  // --- Hard violations (any UI file) ---
  pushAll(/\bgame\.settings\.set\b/g, "state-write:game.settings.set");
  pushAll(/\bcore\.state\.(set|update|transaction|importSnapshot)\b/g, "state-write:core.state.*");
  pushAll(/\bengine\b/g, "engine-reference");
  pushAll(/\bactor\.system\b/g, "dsa5:actor.system");
  pushAll(/\bCONFIG\.DSA5\b/g, "dsa5:CONFIG.DSA5");

  // DSA5 internal imports (should only exist in systems/dsa5 bridge/facade, never in ui)
  pushAll(/\bimport\s+[^;]+\s+from\s+["']\/?systems\/dsa5\/[^"']+["']/g, "dsa5-import:/systems/dsa5/*");
  pushAll(/\bimport\s*\(\s*["']\/?systems\/dsa5\/[^"']+["']\s*\)/g, "dsa5-dynamic-import:/systems/dsa5/*");

  // --- Layer rules ---
  // Director reference outside allowed layers
  if (!isAllowed(path, "director-reference")) {
    pushAll(/\bdirector\b|\bgame\.janus7\.director\b/g, "layer:director-reference");
  }

  // Foundry utils outside renderer/app is suspicious (often used for escaping in renderers)
  if (!isAllowed(path, "foundry-utils")) {
    pushAll(/\bfoundry\.utils\b/g, "layer:foundry.utils");
  }

  // Commands/legacy patterns
  pushAll(/\bJanusCommands\b/g, "legacy:JanusCommands");
  pushAll(/ui\/commands\.js/g, "legacy:ui/commands.js");

  return findings;
}

function contextSnippet(text, idx, radius = 90) {
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function summarize(findings) {
  const by = new Map();
  for (const f of findings) {
    by.set(f.type, (by.get(f.type) ?? 0) + 1);
  }
  return Array.from(by.entries()).map(([type,count]) => ({ type, count })).sort((a,b)=>b.count-a.count);
}

const core = game?.janus7?.core;
const log = core?.logger?.child?.("ui-doctor") ?? console;

const results = [];
for (const rel of UI_FILES) {
  try {
    const txt = await fetchText(rel);
    const f = scan(txt, rel);
    if (f.length) {
      results.push({
        file: rel,
        layer: policyFor(rel),
        summary: summarize(f),
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
    content: `<p><b>JANUS7 UI Doctor:</b> ✅ Keine UI-Verstöße gefunden (State/Engine/DSA5/Layering).</p>`,
    whisper: [game.user.id]
  });
  log.info("JANUS7 UI Doctor: No violations found.");
} else {
  const lines = [];
  lines.push(`<p><b>JANUS7 UI Doctor:</b> ❌ Verstöße: <b>${violations.length}</b></p>`);

  for (const v of violations) {
    lines.push(`<hr/><p><b>${v.file}</b> <span style="opacity:.7">[${v.layer}]</span></p>`);
    for (const s of v.summary.slice(0, 8)) {
      lines.push(`<div><b>${s.type}</b>: ${s.count}</div>`);
    }
    for (const f of v.findings.slice(0, 6)) {
      lines.push(`<div style="font-family:monospace; font-size: 12px;">• ${f.type} … ${foundry.utils.escapeHTML(f.snippet)}</div>`);
    }
    if (v.findings.length > 6) {
      lines.push(`<div style="opacity:0.7;">(+${v.findings.length - 6} weitere Treffer, Details in Console)</div>`);
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

  log.warn("JANUS7 UI Doctor violations", { violations, errors });
}
