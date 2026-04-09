/**
 * @file atmosphere/MusicDiscoveryEngine.js
 * @module janus7
 * @phase 5+ (Extension)
 *
 * MusicDiscoveryEngine:
 * - Lädt und verwaltet den Musik-Katalog (Metadaten von beaTunes/KI).
 * - Bietet Such- und Scoring-Logik für dynamische Musikauswahl.
 * - Unterstützt Mood-zu-Song Matching basierend auf Tag-Similarity und AI-Scores.
 */

export class MusicDiscoveryEngine {
  /**
   * @param {object} params
   * @param {import('../core/logger.js').JanusLogger} params.logger
   * @param {object} params.engine
   */
  constructor({ logger, engine }) {
    this.logger = logger;
    this.engine = engine;
    
    /** @type {any[]} */
    this._catalog = [];
    this._isLoaded = false;
  }

  /**
   * Lädt den Katalog aus einer JSON-Datei.
   * @param {string} [path]
   */
  async loadCatalog(path) {
    const catalogPath = path ?? 'data/academy/atmosphere/music-catalog.json';
    try {
      this.logger?.info?.('Atmosphere: Lade Musik-Katalog...', { path: catalogPath });
      
      const response = await fetch(catalogPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      this._catalog = data.songs ?? [];
      this._isLoaded = true;
      
      this.logger?.info?.(`Atmosphere: Katalog geladen (${this._catalog.length} Tracks)`);
      return true;
    } catch (err) {
      this.logger?.error?.('Atmosphere: Musik-Katalog konnte nicht geladen werden', { path: catalogPath, error: err });
      return false;
    }
  }

  /**
   * Findet den besten Track für einen gegebenen Kontext.
   * @param {object} query
   * @param {string} [query.mood] Mood-Tag (tense, calm, etc.)
   * @param {string[]} [query.tags] Zusätzliche Tags
   * @param {string} [query.sceneKey] AI-Scene Key (z.B. academy_morning)
   * @param {string} [query.color] Gewünschte Farbe/Mood-Farbe (aus beaTunes)
   * @param {number} [query.minScore] Mindest-AI-Score
   * @returns {any|null} Track-Objekt
   */
  findBestTrack(query = {}) {
    if (!this._isLoaded || this._catalog.length === 0) return null;

    // 1. Scoring-Map erstellen
    const scoredTracks = this._catalog.map(track => {
      let score = 0;

      // AI-Score Gewichtung (höchste Prio)
      if (query.sceneKey && track.ai_scores?.[query.sceneKey]) {
        score += track.ai_scores[query.sceneKey] * 100;
      }

      // Mood Match
      const moodMatches = query.mood && (track.metadata?.mood === query.mood || track.metadata?.tags?.includes(query.mood));
      if (moodMatches) score += 30;

      // Color Match (beaTunes native color matching)
      if (query.color && track.metadata?.color && track.metadata.color.toLowerCase() === query.color.toLowerCase()) {
        score += 25;
      }

      // Key Match (Optional, für harmonische Übergänge falls implementiert)
      // score += matchKey(prevKey, track.metadata.key) ? 10 : 0;

      // Tag Match
      if (query.tags && track.metadata?.tags) {
        const matches = query.tags.filter(t => track.metadata.tags.includes(t.toLowerCase())).length;
        score += matches * 15;
      }

      // BPM Penalty (Ambient sollte nicht zu schnell sein)
      if (query.mood === 'calm' && track.metadata?.bpm > 100) score -= 20;

      return { track, score };
    });

    // 2. Sortieren nach Score
    scoredTracks.sort((a, b) => b.score - a.score);

    // 3. Top-Ergebnis validieren
    const best = scoredTracks[0];
    if (!best || best.score <= (query.minScore ?? 10)) return null;

    this.logger?.debug?.(`Atmosphere: Match-Score für "${best.track.title}": ${best.score}`);
    return best.track;
  }

  /** @returns {boolean} */
  get isReady() { return this._isLoaded; }

  /** @returns {any[]} */
  get catalog() { return this._catalog; }
}

export default MusicDiscoveryEngine;
