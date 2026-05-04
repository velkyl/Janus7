# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Module Identity

JANUS7 is a FoundryVTT module (`id: Janus7`, v0.9.12.46) that acts as an academy management OS for DSA5 magic academy campaigns. It requires FoundryVTT v13+ and the DSA5 system (≥7.0.0). The single registered entry point is `scripts/janus.mjs`.

## Commands

```bash
# Run all validators (JSON, academy data, profiles, security, imports, tests, paths, versions)
npm run validate

# Lint all source directories (zero warnings allowed)
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Individual validators
npm run validate:json          # JSON syntax in data/
npm run validate:academy       # Academy data referential integrity
npm run validate:security      # Security checks
npm run validate:imports       # Import policy enforcement
npm run validate:profiles      # Profile contract validation
npm run validate:versions      # VERSION.json / module.json / package.json sync
npm run validate:no-hardcoded-module-paths  # No "modules/Janus7/" literals in code
npm run validate:test-registry # Test harness registry completeness
npm run validate:test-manifest # Test manifest integrity
```

There is no build step — the module runs directly as ES modules in FoundryVTT. Hot reload is enabled for `styles/`, `templates/`, and `data/` in a running FoundryVTT instance.

## Architecture: Phase System

The codebase is organized into strictly ordered phases. **Phase N may only import from phases ≤ N.** Violating this creates circular dependencies.

| Phase | Directory | Purpose |
|---|---|---|
| 1 | `core/` | Engine, state, config, logger, validator, hooks, IO — loaded synchronously |
| 2 | `academy/` | Academy data API — injected into engine during `ready` hook |
| 3 | `bridge/dsa5/` | DSA5 system bridge — injected alongside Phase 2 |
| 4 | `academy/phase4.js`, `scripts/integration/phase4-*` | Simulation: calendar, scoring, lessons, exams, living world, progression |
| 5 | `atmosphere/` | Audio mood management |
| 6 | `ui/` | JANUS Shell, control panel, commands, layer/registry system |
| 7 | `phase7/` | KI roundtrip — export/import AI-generated patches |
| 8 | `extensions/` | Meta-layer: thesis-manager, labor-interface, doom-engine, mishap-generator |

**Kill switches:** Phases 4–8 can be disabled via `JanusConfig` flags (`enableSimulation`, `enableAtmosphere`, `enableUI`, `enablePhase7`, feature flags for Phase 8). All phase loads are wrapped in try/catch — a failing phase does not block boot.

## Core Architecture Contracts

### Settings Access — Rule A1.1
`game.settings.get/set/register` is **forbidden** outside of `core/config.js`. Always use `JanusConfig.get(key)` / `JanusConfig.set(key, value)`. ESLint enforces this with `[JANUS7-A1]` warnings.

### Phase 8 Import Boundary — Rule A1.2
`extensions/` (phase8) code may only be imported via `scripts/extensions/`. Direct imports from `**/phase8/**` are blocked by ESLint.

### Public API Contract
External consumers (macros, Phase 7 KI, other modules) must only use `game.janus7.capabilities`. This object is frozen after `ready()`. Direct access to `engine.*` internals is not a stable API. See `CAPABILITIES_GUIDE.md` for usage.

```js
const caps = game.janus7.capabilities;
// Namespaces: caps.time, caps.scoring, caps.quests, caps.lesson, caps.ki, caps.state, caps.ext
await caps.time.advanceDay();
await caps.scoring.addCirclePoints('feuer', 5, 'Reason');
```

### Hook System
Use constants from `core/hooks/topics.js` (the `HOOKS` object), never magic strings. Emit only via `emitHook()` from `core/hooks/emitter.js`. Canonical hooks use dot notation (`janus7.date.changed`); camelCase aliases exist for backward compatibility and are fired automatically.

### State Access
Use `STATE_PATHS` constants from `core/common.js` for all path-based state reads/writes. Legacy path aliases emit sunset warnings and will be removed in v1.0.

### Asset Paths
Never hardcode `modules/Janus7/` in code. Use `moduleAssetPath(relativePath)` from `core/common.js`. The validator `validate:no-hardcoded-module-paths` enforces this.

## Key Files

| File | Role |
|---|---|
| `scripts/janus.mjs` | Single entry point — registers all Foundry Hooks, orchestrates phase loading |
| `core/index.js` | `Janus7Engine` class — service registry, lifecycle, error aggregation |
| `core/config.js` | `JanusConfig` — only file allowed to call `game.settings.*` directly |
| `core/state.js` | `JanusStateCore` — versioned, persistent state with transactions and rollback |
| `core/capabilities.js` | `JanusCapabilities` — frozen external API contract |
| `core/hooks/topics.js` | Canonical `HOOKS` constants + legacy aliases |
| `core/hooks/emitter.js` | `emitHook()` — sole emission point, reentrancy-protected |
| `core/common.js` | `MODULE_ID`, `STATE_PATHS`, `AVENTURIAN_CALENDAR`, `moduleAssetPath()` |
| `bridge/dsa5/index.js` | `DSA5SystemBridge` — all DSA5 system integration (~1400 lines, 30+ sub-bridges) |
| `academy/data-api.js` | `AcademyDataApi` — read-only facade for all academy JSON content |
| `ui/apps/JanusShellApp.js` | Primary UI (~2100 lines) with Director/Academy/Scoring/Social/Quests tabs |
| `ui/layer/action-router.js` | Dispatches all UI actions |
| `VERSION.json` | Master version file — must stay in sync with `module.json` and `package.json` |

## Data Layer

`data/` holds 500+ JSON files as the SSOT for academy content (lessons, NPCs, circles, exams, locations, quests, spells, social links). Changes to JSON schema must update validators in `tools/` accordingly. Referential integrity (e.g. lesson → circle IDs) is checked by `validate:academy`. Content is accessed exclusively through `AcademyDataApi`, never by direct file import in non-data code.

## Service Registry Pattern

Services register themselves via `engine.markServiceReady(key, instance)`. Async consumers wait via `engine.serviceRegistry.waitFor(key, timeoutMs)`. This prevents ordering races between phases. Game-level accessors: `game.janus7.core`, `game.janus7.academy`, `game.janus7.bridge`, `game.janus7.capabilities`.

## Testing

Tests live in `core/test/` (166 files) and `macros/` (29 macros for manual workflows). The test harness auto-discovers tests via `register-builtins`. Integration tests run inside a live FoundryVTT session. Use `validate:test-registry` and `validate:test-manifest` to verify harness completeness from the CLI.

## FoundryVTT Compatibility Notes

- Target: v13 (`minimum: "13"`, `verified: "13.351"`). v14/v15 deprecations (DialogV2, ApplicationV2, removal of ApplicationV1) are handled with workarounds where needed.
- `Hooks.on/once` for Foundry core hooks (`init`, `ready`, `closingWorld`) are registered **only** in `scripts/janus.mjs`. Phase modules export `setupPhaseX(engine)` functions instead.
- `foundry.utils.unsetProperty` is used with fallback to `foundry.utils.deleteProperty` for v12/v13 drift — see `core/state.js`.
