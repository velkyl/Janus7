import { GRAPH_NODE_TYPES, GRAPH_EDGE_TYPES, GRAPH_SOURCES } from '../constants.js';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleCaseWords(value) {
  return String(value ?? '')
    .split(/[ _-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseRuleRefCandidates(ref) {
  const raw = String(ref ?? '').trim();
  if (!raw) return [];
  const cleaned = raw.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(':');
  const head = String(parts[0] ?? '').trim().toUpperCase();
  const tail = String(parts.slice(1).join(':') ?? '').trim();
  const out = [];
  if (tail) out.push(tail);
  switch (head) {
    case 'TALENT':
    case 'MERKMAL':
    case 'TRADITION':
    case 'PROBEN':
    case 'GILDENRECHT':
    case 'GRUNDLAGEN':
      break;
    default:
      if (cleaned) out.push(cleaned);
      break;
  }
  if (!tail && cleaned) out.push(cleaned);
  return [...new Set(out.filter(Boolean))];
}

function skillIdToCandidates(skillId) {
  const raw = String(skillId ?? '').trim();
  if (!raw) return [];
  const stripped = raw
    .replace(/^TALENT[_: ]+/i, '')
    .replace(/^ATTRIBUTE[_: ]+/i, '')
    .replace(/^SKILL[_: ]+/i, '');
  const spaced = stripped.replace(/_/g, ' ').trim();
  const title = titleCaseWords(stripped);
  const umlauted = spaced
    .replace(/ae/gi, 'ä')
    .replace(/oe/gi, 'ö')
    .replace(/ue/gi, 'ü');
  const umlautTitle = titleCaseWords(umlauted);
  return [...new Set([title, spaced, umlauted, umlautTitle].filter(Boolean))];
}

/**
 * Provider for a light DSA5 compendium/library index.
 *
 * Besides building lightweight rule-entry nodes, this provider can now
 * derive semantic academy→DSA5 edges from lesson rule references and
 * library knowledge hooks without materializing full Foundry documents.
 */
export class Dsa5IndexGraphProvider {
  /**
   * @param {{ index: any, academyData?: any, logger?: any, maxEntries?: number }} opts
   */
  constructor({ index, academyData = null, logger, maxEntries = 2000 } = {}) {
    this.index = index;
    this.academyData = academyData;
    this.logger = logger;
    this.maxEntries = Number.isFinite(maxEntries) ? maxEntries : 2000;
  }

  getName() {
    return 'Dsa5IndexGraphProvider';
  }

  async _readEntries() {
    const idx = this.index;
    if (!idx) return [];
    try {
      if (typeof idx.entries === 'function') {
        return await idx.entries({ limit: this.maxEntries });
      }
      if (typeof idx.getEntries === 'function') {
        return await idx.getEntries({ limit: this.maxEntries });
      }
      if (typeof idx.ensureIndex === 'function') {
        await idx.ensureIndex({ documentName: 'Item' });
      }
      if (idx._byUuid instanceof Map) {
        return Array.from(idx._byUuid.values()).slice(0, this.maxEntries);
      }
    } catch (err) {
      this.logger?.warn?.('[JANUS7] Dsa5IndexGraphProvider: index read failed', { message: err?.message });
    }
    return [];
  }

  _buildNameIndex(entries) {
    const byName = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
      const uuid = String(entry?.uuid ?? '').trim();
      if (!uuid) continue;
      const id = `dsa5:${uuid}`;
      const names = [entry?.name, entry?.label];
      for (const name of names) {
        const key = normalizeText(name);
        if (!key) continue;
        const bucket = byName.get(key) ?? [];
        bucket.push({ entry, id });
        byName.set(key, bucket);
      }
    }
    return byName;
  }

  _resolveReferenceTargets(candidates, byName) {
    const resolved = [];
    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      const key = normalizeText(candidate);
      if (!key) continue;
      const direct = byName.get(key) ?? [];
      if (direct.length) {
        resolved.push(...direct.map((row) => ({ ...row, candidate, match: 'exact' })));
        continue;
      }
      for (const [nameKey, rows] of byName.entries()) {
        if (nameKey.includes(key) || key.includes(nameKey)) {
          resolved.push(...rows.map((row) => ({ ...row, candidate, match: 'fuzzy' })));
        }
      }
    }
    const seen = new Set();
    return resolved.filter((row) => {
      const sig = `${row.id}::${row.candidate}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  _collectSemanticEdges(entries) {
    const edges = [];
    const seenEdges = new Set();
    const pushEdge = (edge) => {
      const sig = `${edge.from}::${edge.to}::${edge.type}::${edge.meta?.relation ?? ''}`;
      if (seenEdges.has(sig)) return;
      seenEdges.add(sig);
      edges.push(edge);
    };
    const data = this.academyData;
    if (!data) return edges;
    const byName = this._buildNameIndex(entries);

    let lessons = [];
    let libraryItems = [];
    try {
      lessons = Array.isArray(data.getLessons?.()) ? data.getLessons() : [];
    } catch (_err) { lessons = []; }
    try {
      libraryItems = Array.isArray(data.getLibraryItems?.())
        ? data.getLibraryItems()
        : (Array.isArray(data.getLibrary?.()) ? data.getLibrary() : []);
    } catch (_err) { libraryItems = []; }

    for (const lesson of lessons) {
      if (!lesson?.id) continue;
      const refs = Array.isArray(lesson.references?.dsa5RuleRefs) ? lesson.references.dsa5RuleRefs : [];
      const targets = this._resolveReferenceTargets(refs.flatMap(parseRuleRefCandidates), byName);
      for (const target of targets) {
        pushEdge({
          from: lesson.id,
          to: target.id,
          type: GRAPH_EDGE_TYPES.RELATED_TO,
          weight: target.match === 'exact' ? 0.95 : 0.75,
          meta: {
            relation: 'dsa5-rule-ref',
            ruleRef: target.candidate,
            match: target.match
          }
        });
        if (lesson.subject) {
          pushEdge({
            from: `subject:${lesson.subject}`,
            to: target.id,
            type: GRAPH_EDGE_TYPES.RELATED_TO,
            weight: target.match === 'exact' ? 0.45 : 0.3,
            meta: {
              relation: 'subject-rule-ref',
              viaLessonId: lesson.id,
              ruleRef: target.candidate,
              match: target.match
            }
          });
        }
      }
    }

    for (const item of libraryItems) {
      if (!item?.id) continue;
      const skillRefs = (Array.isArray(item.knowledgeHooks) ? item.knowledgeHooks : [])
        .flatMap((hook) => skillIdToCandidates(hook?.relatedSkillId));
      const targets = this._resolveReferenceTargets(skillRefs, byName);
      for (const target of targets) {
        pushEdge({
          from: item.id,
          to: target.id,
          type: GRAPH_EDGE_TYPES.RELATED_TO,
          weight: target.match === 'exact' ? 0.85 : 0.65,
          meta: {
            relation: 'knowledge-hook',
            skillRef: target.candidate,
            match: target.match
          }
        });
      }
    }

    return edges;
  }

  async collect() {
    const nodes = [];
    const entries = await this._readEntries();
    for (const entry of Array.isArray(entries) ? entries : []) {
      const uuid = String(entry?.uuid ?? '').trim();
      if (!uuid) continue;
      const id = `dsa5:${uuid}`;
      nodes.push({
        id,
        type: GRAPH_NODE_TYPES.DSA5_ENTRY,
        label: entry?.name ?? uuid,
        source: GRAPH_SOURCES.DSA5_INDEX,
        meta: {
          uuid,
          itemType: entry?.type ?? null,
          pack: entry?.pack ?? null,
          packLabel: entry?.packLabel ?? null,
          packageName: entry?.packageName ?? null,
          img: entry?.img ?? null
        }
      });
    }
    const edges = this._collectSemanticEdges(entries);
    return { nodes, edges };
  }
}
