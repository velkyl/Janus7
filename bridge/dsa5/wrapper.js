/**
 * @file bridge/dsa5/wrapper.js
 * @module janus7
 * @phase 3
 *
 * Zweck:
 * Actor-Wrapper: bietet helper-basierte, drift-resistente Zugriffe (Skills/Spells/etc.).
 *
 * Architektur:
 * - Diese Datei ist Teil von Phase 3 und darf nur Abhängigkeiten zu Phasen <= 3 haben.
 * - Öffentliche Funktionen/Exports sind JSDoc-dokumentiert, damit JANUS7 langfristig wartbar bleibt.
 *
 * Hinweis:
 * - Keine deprecated Foundry APIs (v13+).
 */

/**
 * JanusActorWrapper
 *
 * Ziel:
 * - JANUS7-Code soll NICHT direkt auf dsa5 Actor.system-Strukturen zugreifen.
 * - Dieser Wrapper bietet eine kleine, stabile Oberfläche.
 *
 * NOTE:
 * DSA5 intern kann sich ändern. Daher: defensiv lesen, nie mutieren.
 */

/**
 * JanusActorWrapper
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class JanusActorWrapper {
  /**
   * @param {Actor} actor
   */
  constructor(actor) {
    this.actor = actor;
  }

  /**
   * Liefert den Talentwert (z.B. "Magiekunde") als Zahl.
   *
   * Implementierung ist bewusst robust:
   * 1) Embedded Item (skill/talent) mit passendem Namen
   * 2) Fallback: bekannte DSA5-Datenpfade (best-effort)
   *
   * @param {string} skillName
   * @returns {number|null}
   */
  getSkillValue(skillName) {
    const raw = String(skillName ?? '').trim();
    if (!raw) return null;

    // Normalisierung: case-insensitive, optionales " (… )" am Ende entfernen
    const norm = (s) =>
      String(s ?? '')
        .trim()
        .replace(/\s*\([^)]*\)\s*$/u, '')
        .toLowerCase();

    const wanted = norm(raw);

    const pickNumber = (obj) => {
      if (obj == null) return null;
      if (typeof obj === 'number' && Number.isFinite(obj)) return obj;
      if (typeof obj !== 'object') return null;
      // häufige Wertfelder (best-effort, aber kontrolliert)
      const paths = [
        ['value'],
        ['fw'],
        ['taw'],
        ['talentValue'],
        ['talentValue', 'value'],
        ['value', 'value'],
        ['total'],
      ];
      for (const p of paths) {
        let cur = obj;
        for (const k of p) cur = cur?.[k];
        const n = Number(cur);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };

    // 1) Embedded Items (DSA5 nutzt i.d.R. Items für Talente/Zauber)
    try {
      const item = this.actor?.items
        ? Array.from(this.actor.items.values()).find((i) => {
            // DSA5 kann Talente/Skills je nach Setup/Import als Items abbilden.
            // Wir vermeiden harte Typ-Annahmen und matchen primär über Namen.
            const n = norm(i?.name);
            if (!n) return false;
            return n === wanted;
          })
        : null;
      const v = pickNumber(item?.system);
      if (typeof v === 'number') return v;
    } catch (_e) {
      // ignore
    }

    // 2) Best-effort Fallback: DSA5 system data (never assume exact schema)
    try {
      const sys = this.actor?.system ?? {};

      // 2a) klassische Container (falls vorhanden)
      const scanContainer = (root) => {
        if (!root || typeof root !== 'object') return null;

        // direkter Key-Zugriff
        const direct = root[wanted] ?? root[raw] ?? null;
        const d = pickNumber(direct);
        if (typeof d === 'number') return d;

        // Objektwerte durchsuchen
        for (const [k, val] of Object.entries(root)) {
          const n = norm(val?.name ?? k);
          if (n !== wanted) continue;
          const hit = pickNumber(val);
          if (typeof hit === 'number') return hit;
        }
        return null;
      };

      // häufige Muster: talents/skills ODER modifier-container (dsa5 hat z.B. skillModifiers)
      for (const key of ['talents', 'skills', 'skillModifiers', 'happyTalents']) {
        const hit = scanContainer(sys[key]);
        if (typeof hit === 'number') return hit;
      }

      // 2b) falls es Gruppenebenen gibt (talents.skills usw.)
      for (const key of ['talents', 'skills']) {
        const root = sys[key];
        if (!root || typeof root !== 'object') continue;
        for (const group of Object.values(root)) {
          const hit = scanContainer(group);
          if (typeof hit === 'number') return hit;
        }
      }

      return null;
    } catch (_e) {
      return null;
    }
  }
}