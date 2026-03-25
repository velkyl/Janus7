/**
 * @file phase7/diff/JanusKiDiffService.js
 * Lightweight diff + reference-normalisation helpers for KI roundtrips.
 * Besides basic snapshot diffs, this service can auto-correct missing actor
 * references by resolving against Foundry actors and local JANUS indices.
 */

import { DSA5_COMMON_SKILLS, DSA5_SKILL_ALIASES } from '../../bridge/dsa5/constants.js';

const ACTORISH_KEYS = new Set([
  'actorid', 'actoruuid', 'actorref', 'actorreference', 'npcid', 'teacherid',
  'studentid', 'ownerid', 'speakerid', 'targetactorid', 'targetnpcid'
]);

const SKILLISH_KEYS = new Set([
  'skill', 'skillname', 'skill_name', 'talent', 'talentname', 'talent_name',
  'probe', 'check', 'checkname', 'check_name', 'ability', 'abilityname'
]);

const DEFAULT_SKILL_OPTIONS = Array.from(new Set(DSA5_COMMON_SKILLS)).sort((a, b) => a.localeCompare(b, 'de'));

export class JanusKiDiffService {
  constructor({ logger, validator } = {}) {
    this.logger = logger ?? console;
    this.validator = validator ?? null;
  }

  static buildChangeId(changeKey, idx, path = '') {
    return [changeKey ?? 'unknown', Number.isFinite(idx) ? idx : 'x', path || 'root'].join('::');
  }

  diff(oldSnap, newSnap) {
    const changes = [];
    const allKeys = new Set([
      ...Object.keys(oldSnap || {}),
      ...Object.keys(newSnap || {})
    ]);
    for (const key of allKeys) {
      const oldVal = oldSnap ? oldSnap[key] : undefined;
      const newVal = newSnap ? newSnap[key] : undefined;
      if (oldVal === undefined && newVal !== undefined) {
        changes.push({ op: 'add', key, before: undefined, after: newVal });
      } else if (newVal === undefined && oldVal !== undefined) {
        changes.push({ op: 'delete', key, before: oldVal, after: undefined });
      } else {
        const oldJson = typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal;
        const newJson = typeof newVal === 'object' ? JSON.stringify(newVal) : newVal;
        if (oldJson !== newJson) changes.push({ op: 'update', key, before: oldVal, after: newVal });
      }
    }
    return changes;
  }

  normalizeResponseReferences(response, { state, schema } = {}) {
    this._validateResponseShape(response, schema);

    const clone = globalThis.foundry?.utils?.deepClone
      ? globalThis.foundry.utils.deepClone(response)
      : JSON.parse(JSON.stringify(response ?? {}));
    const annotations = {};
    const changes = clone?.changes ?? {};

    for (const [changeKey, arr] of Object.entries(changes)) {
      if (!Array.isArray(arr)) continue;
      arr.forEach((entry, idx) => {
        const path = entry?.path ?? '';
        const id = JanusKiDiffService.buildChangeId(changeKey, idx, path);
        const result = this._autocorrectValue(entry, { state, changeKey, path });
        annotations[id] = {
          autoCorrected: !!result.autoCorrected,
          missingReference: !!result.missingReference,
          correctedFields: result.correctedFields ?? [],
          invalidSkill: !!result.invalidSkill,
          invalidSkillValue: result.invalidSkillValue ?? null,
          invalidSkillFieldPath: result.invalidSkillFieldPath ?? null,
          skillFallbackOptions: result.skillFallbackOptions ?? DEFAULT_SKILL_OPTIONS,
          id
        };
        arr[idx] = result.value;
      });
    }

    return { response: clone, annotations };
  }


  _validateResponseShape(response, schema = null) {
    if (!response || typeof response !== 'object') {
      throw new Error('JANUS7 KI diff: response must be an object');
    }
    if (response.version !== 'JANUS_KI_RESPONSE_V1') {
      throw new Error(`JANUS7 KI diff: unsupported response version: ${response.version}`);
    }
    if (!response.changes || typeof response.changes !== 'object' || Array.isArray(response.changes)) {
      throw new Error('JANUS7 KI diff: response.changes must be an object');
    }
    if (schema && this.validator?.validateSchema) {
      const res = this.validator.validateSchema(response, schema, 'KI response preview');
      if (!res?.valid) {
        const msg = Array.isArray(res?.errors) && res.errors.length
          ? String(res.errors[0])
          : 'Schema validation failed';
        throw new Error(`JANUS7 KI diff: ${msg}`);
      }
    }
  }

  _autocorrectValue(value, ctx = {}) {
    if (!value || typeof value !== 'object') {
      return {
        value,
        autoCorrected: false,
        missingReference: false,
        correctedFields: [],
        invalidSkill: false,
        invalidSkillValue: null,
        invalidSkillFieldPath: null,
        skillFallbackOptions: DEFAULT_SKILL_OPTIONS
      };
    }

    const clone = Array.isArray(value) ? value.map((v) => v) : { ...value };
    let autoCorrected = false;
    let missingReference = false;
    let invalidSkill = false;
    let invalidSkillValue = null;
    let invalidSkillFieldPath = null;
    const correctedFields = [];

    const visit = (obj, pathHint = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, current] of Object.entries(obj)) {
        const fieldPath = pathHint ? `${pathHint}.${key}` : key;
        if (current && typeof current === 'object') {
          visit(current, fieldPath);
          continue;
        }

        const keyLc = String(key).toLowerCase();
        const actorishPath = /(actor|npc|teacher|student|speaker|owner)/i.test(`${ctx.path ?? ''}.${fieldPath}`);
        if (typeof current === 'string' && (ACTORISH_KEYS.has(keyLc) || actorishPath)) {
          const resolved = this._resolveActorReference(current, {
            state: ctx.state,
            hintName: obj.name ?? obj.actorName ?? obj.npcName ?? obj.label ?? null
          });
          if (resolved.autoCorrected) {
            obj[key] = resolved.id;
            autoCorrected = true;
            correctedFields.push(fieldPath);
          }
          if (resolved.missingReference) {
            missingReference = true;
          }
          continue;
        }

        if (typeof current === 'string' && this._looksLikeSkillField(keyLc, `${ctx.path ?? ''}.${fieldPath}`)) {
          const resolvedSkill = this._resolveSkillName(current);
          if (resolvedSkill.invalidSkill) {
            invalidSkill = true;
            invalidSkillValue = invalidSkillValue ?? current;
            invalidSkillFieldPath = invalidSkillFieldPath ?? fieldPath;
          } else if (resolvedSkill.skill && resolvedSkill.skill !== current) {
            obj[key] = resolvedSkill.skill;
            autoCorrected = true;
            correctedFields.push(fieldPath);
          }
        }
      }
    };

    visit(clone, '');
    return {
      value: clone,
      autoCorrected,
      missingReference,
      correctedFields,
      invalidSkill,
      invalidSkillValue,
      invalidSkillFieldPath,
      skillFallbackOptions: DEFAULT_SKILL_OPTIONS
    };
  }

  _looksLikeSkillField(keyLc, fullPath) {
    if (SKILLISH_KEYS.has(keyLc)) return true;
    return /(skill[_-]?checks?|skill|talent|probe)/i.test(fullPath ?? '');
  }

  _resolveSkillName(rawSkill) {
    const skill = String(rawSkill ?? '').trim();
    if (!skill) return { skill: rawSkill, autoCorrected: false, invalidSkill: false };
    const exact = this._resolveCanonicalSkill(skill);
    if (exact) return { skill: exact, autoCorrected: exact !== skill, invalidSkill: false };

    const alias = DSA5_SKILL_ALIASES[this._normalize(skill)];
    if (alias) {
      return { skill: alias, autoCorrected: true, invalidSkill: false };
    }

    return { skill: rawSkill, autoCorrected: false, invalidSkill: true };
  }

  _resolveCanonicalSkill(skill) {
    const normSkill = this._normalize(skill);
    if (!normSkill) return null;
    const skills = this._collectSkillCandidates();
    return skills.find((candidate) => this._normalize(candidate) === normSkill) ?? null;
  }

  _collectSkillCandidates() {
    const seen = new Map();
    const push = (name) => {
      const raw = String(name ?? '').trim();
      if (!raw) return;
      const key = this._normalize(raw);
      if (!key || seen.has(key)) return;
      seen.set(key, raw);
    };

    DEFAULT_SKILL_OPTIONS.forEach(push);

    try {
      const gameSkills = globalThis.game?.items
        ? Array.from(globalThis.game.items).filter((item) => item?.type === 'skill')
        : [];
      gameSkills.forEach((item) => push(item?.name));
    } catch (_) { /* ignore */ }

    try {
      const actors = globalThis.game?.actors ? Array.from(globalThis.game.actors) : [];
      actors.forEach((actor) => {
        const items = actor?.items ? Array.from(actor.items) : [];
        items.filter((item) => item?.type === 'skill').forEach((item) => push(item?.name));
      });
    } catch (_) { /* ignore */ }

    return Array.from(seen.values());
  }

  _resolveActorReference(rawRef, { state, hintName } = {}) {
    const ref = String(rawRef ?? '').trim();
    if (!ref) return { id: rawRef, autoCorrected: false, missingReference: false };
    const candidates = this._collectActorCandidates({ state });
    const refLc = ref.toLowerCase();

    const exact = candidates.find((c) => c.id === ref || c.uuid === ref || c.name.toLowerCase() === refLc);
    if (exact) {
      if (exact.id === ref || exact.uuid === ref) return { id: exact.id, autoCorrected: false, missingReference: false };
      return { id: exact.id, autoCorrected: true, missingReference: false, matchedName: exact.name };
    }

    const probe = String(hintName ?? ref).trim();
    const match = this._findClosestActor(probe, candidates);
    if (match) {
      this.logger?.debug?.('[JANUS7][KI Diff] Actor reference auto-corrected', { from: ref, to: match.id, name: match.name });
      return { id: match.id, autoCorrected: true, missingReference: false, matchedName: match.name };
    }

    return { id: rawRef, autoCorrected: false, missingReference: true };
  }

  _collectActorCandidates({ state } = {}) {
    const candidates = [];
    const seen = new Set();
    const push = (entry) => {
      if (!entry) return;
      const id = entry.id ?? entry._id ?? null;
      const name = entry.name ?? entry.label ?? entry.title ?? null;
      const uuid = entry.uuid ?? null;
      if (!id || !name) return;
      if (seen.has(id)) return;
      seen.add(id);
      candidates.push({ id: String(id), uuid: uuid ? String(uuid) : '', name: String(name) });
    };

    try {
      const actors = globalThis.game?.actors ? Array.from(globalThis.game.actors) : [];
      actors.forEach((a) => push({ id: a.id, uuid: a.uuid, name: a.name }));
    } catch (_) { /* ignore */ }

    const buckets = [
      state?.getPath?.('foundryLinks.npcs'),
      state?.getPath?.('foundryLinks.pcs'),
      state?.getPath?.('actors.npcs'),
      state?.getPath?.('actors.pcs')
    ];
    for (const bucket of buckets) {
      if (!bucket) continue;
      if (Array.isArray(bucket)) {
        bucket.forEach(push);
        continue;
      }
      if (typeof bucket === 'object') {
        for (const [id, value] of Object.entries(bucket)) {
          if (typeof value === 'string') push({ id, uuid: value, name: id });
          else push({ id, ...value });
        }
      }
    }

    const academyBuckets = [
      state?.getPath?.('academy.npcs'),
      state?.getPath?.('academy.students'),
      state?.getPath?.('academy.teachers')
    ];
    for (const bucket of academyBuckets) {
      if (Array.isArray(bucket)) bucket.forEach(push);
    }
    return candidates;
  }

  _findClosestActor(probe, candidates) {
    const normProbe = this._normalize(probe);
    if (!normProbe) return null;

    let best = null;
    let bestScore = 0;
    for (const candidate of candidates) {
      const normName = this._normalize(candidate.name);
      if (!normName) continue;
      let score = 0;
      if (normName === normProbe) score = 1;
      else if (normName.includes(normProbe) || normProbe.includes(normName)) score = 0.95;
      else score = this._similarity(normProbe, normName);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return bestScore >= 0.72 ? best : null;
  }

  _normalize(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  _similarity(a, b) {
    const dist = this._levenshtein(a, b);
    const max = Math.max(a.length, b.length, 1);
    return 1 - dist / max;
  }

  _levenshtein(a, b) {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const dp = Array.from({ length: rows }, (_, i) => {
      const row = new Array(cols).fill(0);
      row[0] = i;
      return row;
    });
    for (let j = 0; j < cols; j++) dp[0][j] = j;
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[a.length][b.length];
  }
}
