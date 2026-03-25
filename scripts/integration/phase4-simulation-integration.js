/**
 * Phase 4 Simulation Integration
 *
 * Registers Phase-4 (Simulation) hooks early, so downstream systems (e.g. Quest/Events)
 * can rely on engine.simulation.calendar being present when janus7Ready fires.
 *
 * NOTE: This file should be imported BEFORE quest-system-integration.js.
 */
import '../../academy/phase4.js';
