$path = "d:\RPG Lokal\FoundryVTT\Data\modules\Janus7\scripts\janus.mjs"
$content = Get-Content $path -Raw
$contentLines = $content -split "\r?\n"

$startIdx = 682 # index for line 683
$endIdx = 1002 # index for line 1003

$before = $contentLines[0..($startIdx-1)]
$after = $contentLines[($endIdx+1)..($contentLines.Length-1)]

$middle = @(
    "  _registerCoreHook('getSceneControlButtons', (controls) => {",
    "    try {",
    "      attachJanusSceneControls(controls, JANUS_GLOBAL.engine);",
    "    } catch (err) {",
    "      (JANUS_GLOBAL.engine?.core?.logger ?? console).warn?.('[JANUS7] getSceneControlButtons Fehler:', { message: err?.message });",
    "    }",
    "  });"
)

$temp = $before + $middle + $after

$discoveryIdx = 243 # index for where to insert discovery integration
$beforeDiscovery = $temp[0..($discoveryIdx-1)]
$afterDiscovery = $temp[$discoveryIdx..($temp.Length-1)]

$discoveryBlock = @(
    "  // ─────────────────────────────────────────────────────────────",
    "  // Discovery & Search Bridge",
    "  try {",
    "    await import('../discovery/phase6_5.js');",
    "    logger?.debug?.('[JANUS7] Phase 6.5 (Discovery) integration loaded.');",
    "  } catch (err) {",
    "    _recordIssue(engine, 'discovery', 'module-load', err);",
    "    logger?.warn?.('[JANUS7] Phase 6.5 (Discovery) failed to load.', { message: err?.message });",
    "  }",
    ""
)

$final = $beforeDiscovery + $discoveryBlock + $afterDiscovery
$final | Set-Content $path
