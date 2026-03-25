/**
 * @file tools/md-to-json.js
 * @module janus7-tools
 *
 * Zweck:
 *  Hilfsskript (optional, nicht in Foundry geladen), um Markdown-Lehrpläne
 *  deterministisch in JSON-Strukturen unter data/academy zu konvertieren.
 *
 * Hinweis:
 *  - Dieses Skript ist ein Platzhalter und dient als Startpunkt für einen
 *    reproduzierbaren Content-Workflow. Es wird nicht automatisch ausgeführt.
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';

/**
 * Sehr einfacher Stub-Parser: Liest eine Markdown-Datei und gibt eine
 * minimale JSON-Struktur zurück. In echten Projekten sollte hier eine
 * robuste Parser-Logik entstehen.
 *
 * @param {string} mdPath
 */
export function parseMarkdownCurriculum(mdPath) {
  const text = fs.readFileSync(mdPath, 'utf-8');
  return {
    source: path.basename(mdPath),
    length: text.length,
    // TODO: Überschriften / Sections / Tabellen in strukturierte Daten überführen
  };
}

/**
 * CLI-Einstieg:
 *  node tools/md-to-json.js input.md output.json
 */
async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node tools/md-to-json.js <input.md> <output.json>');
    process.exit(1);
  }

  const absIn = path.resolve(input);
  const absOut = path.resolve(output);

  const data = parseMarkdownCurriculum(absIn);
  fs.writeFileSync(absOut, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Wrote JSON to ${absOut}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Direkt über node ausgeführt
  main().catch((err) => {
    console.error('md-to-json failed', err);
    process.exit(1);
  });
}
