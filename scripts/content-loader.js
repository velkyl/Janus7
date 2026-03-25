/**
 * @file scripts/content-loader.js — FACADE (backward-compat, v0.9.9.15)
 * @module janus7/scripts/content-loader
 *
 * Facade für rückwärtskompatible Imports.
 * Kanonischer Pfad: scripts/academy/content/content-loader.js
 *
 * HINWEIS: Diese Datei bleibt erhalten solange integrated-catalog.js
 * (core/test/integrated-catalog.js, Zeile ~370) noch diesen Pfad referenziert.
 * Entfernen erst nach Migration des Smoke-Tests auf den kanonischen Pfad.
 * @deprecated seit v0.9.9.15 — wird in einem späteren Release entfernt
 */

export { JanusContentLoader } from './academy/content/content-loader.js';
export { default } from './academy/content/content-loader.js';
