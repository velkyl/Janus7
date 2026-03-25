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
 * Parses markdown text into structured data.
 * @param {string} text
 * @returns {Array<Object>}
 */
function parseMarkdownContent(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = { level: 0, title: 'Document', content: '', tables: [] };
  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      if (currentSection.content.trim() || currentSection.tables.length > 0 || currentSection.level > 0) {
        currentSection.content = currentSection.content.trim();
        sections.push(currentSection);
      }
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: '',
        tables: []
      };
      currentTable = null;
      continue;
    }

    // Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const isSeparator = /^\|[\s-|:]+\|$/.test(trimmed);
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
        currentSection.tables.push(currentTable);
      } else if (!isSeparator) {
        // If it's not a separator line, it's a row
        const rowData = {};
        currentTable.headers.forEach((header, index) => {
          rowData[header] = cells[index] || '';
        });
        currentTable.rows.push(rowData);
      }
      continue;
    }

    // Normal text
    // Reset table parsing if we hit an empty line or normal text
    if (trimmed === '') {
      currentTable = null;
      continue;
    }

    currentTable = null;
    currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
  }

  // Push the last section
  if (currentSection.content.trim() || currentSection.tables.length > 0 || currentSection.level > 0) {
    currentSection.content = currentSection.content.trim();
    sections.push(currentSection);
  }

  return sections;
}

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
    sections: parseMarkdownContent(text)
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
