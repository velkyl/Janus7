
# JANUS7 Test Harness (Integrated)

## Ziel
- Single Point of Truth für die Validierung der Phasen 0–8.
- Tests als ESM-Testobjekte: `export default { id, title, phases, kind, expected, whereToFind, run }`.
- Keine Globals außerhalb `game.janus7`.
- Tests dürfen den Init/Ready-Flow nie unterbrechen.

## Einstieg
- Bevorzugt über **Command Center** oder **Test Results** öffnen.
- Konsole:
  - `await game.janus7.test.openResults()`
  - `await game.janus7.test.runCatalog({ openWindow: true })`

Hinweis:
- Der produktive Einstieg ist der integrierte, lazy-geladene Runner aus `scripts/integration/test-runner-integration.js`.
- `ui/apps/JanusSettingsTestHarnessApp.js` ist nur ein Wrapper für ein optionales Devtools-Bundle und kein verlässlicher Primärpfad im Produktions-Release.

## Batch-Regel
- `kind: "manual"` wird im Batch **SKIP** (Anzeige in UI, aber keine automatische PASS/FAIL Bewertung).

## Struktur
- `core/test/registry.js` – Registry
- `core/test/runner.js` – Runner
- `core/test/tests/pX/*.test.js` – einzelne Tests

## Migration aus Excel-Testkatalog
- Jede Zeile → eine `.test.js` Datei
- `Typ`:
  - `M` → `kind:"manual"`
  - `A` → `kind:"auto"`
  - `M/A` → `kind:"auto"` + ausführliche Notes/Expected
