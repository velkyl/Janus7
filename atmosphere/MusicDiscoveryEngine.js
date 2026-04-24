/**
 * @file atmosphere/MusicDiscoveryEngine.js
 * @module janus7
 * @phase 5+ (Extension)
 *
 * MusicDiscoveryEngine (V3 Core):
 * - Lädt und verwaltet den Musik-Katalog (Metadaten von janus_rpg_audio_analyzer_v3 oder beaTunes).
 * - Bietet Such- und Scoring-Logik für dynamische Musikauswahl.
 * - Unterstützt Mood-zu-Song Matching basierend auf:
 *   - AI Scores (Scene-specific)
 *   - Signal-Features (Energy, BPM)
 *   - Semantic Tags (Mood, Setting, Situation)
 *   - External Tags (Last.fm, MusicBrainz)
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
   * Lädt den Katalog aus einer JSON-Datei (V3 Format).
   * @param {string} [path]
   */
  async loadCatalog(path) {
    const catalogPath = path ?? 'modules/Janus7/data/academy/atmosphere/music-catalog.json';
    try {
      this.logger?.info?.('Atmosphere: Lade Musik-Katalog (V3)...', { path: catalogPath });
      
      const response = await fetch(catalogPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      // V3 nutzt "tracks", Legacy "songs"
      this._catalog = data.tracks ?? data.songs ?? [];
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
   * @param {string} [query.color] Gewünschte Farbe (beaTunes)
   * @param {number} [query.energy] Gewünschtes Energie-Level (0..1)
   * @param {number} [query.minScore] Mindest-AI-Score
   * @returns {any|null} Track-Objekt
   */
  findBestTrack(query = {}) {
    if (!this._isLoaded || this._catalog.length === 0) return null;

    const scoredTracks = this._catalog.map(track => {
      let score = 0;

      // 1. AI-Score (Scene-spezifisch aus dem Analyzer)
      if (query.sceneKey && track.ai_scores?.[query.sceneKey]) {
        score += track.ai_scores[query.sceneKey] * 100;
      }

      // 2. Signal-Feature Matching (Energy)
      if (query.energy != null && track.analysis?.energy_level != null) {
        const diff = Math.abs(query.energy - track.analysis.energy_level);
        score += Math.max(0, (1 - diff) * 40);
      }

      // 3. Mood & Tag Matching (Semantic)
      const semantic = track.tags ?? track.metadata ?? {};
      if (query.mood) {
        if (semantic.mood?.includes(query.mood)) score += 30;
        if (semantic.situation?.includes(query.mood)) score += 20;
      }

      // 4. Color Matching (beaTunes)
      const trackColor = track.analysis?.color ?? semantic.color;
      if (query.color && trackColor && trackColor.toLowerCase() === query.color.toLowerCase()) {
        score += 25;
      }

      // 5. External Tags (Last.fm etc.)
      if (query.tags && track.external?.lastfm_tags) {
        const matches = query.tags.filter(t => track.external.lastfm_tags.map(lt => lt.toLowerCase()).includes(t.toLowerCase())).length;
        score += matches * 10;
      }

      // 6. Generic Tags
      if (query.tags && semantic.tags) {
        const matches = query.tags.filter(t => semantic.tags.includes(t.toLowerCase())).length;
        score += matches * 15;
      }

      return { track, score };
    });

    scoredTracks.sort((a, b) => b.score - a.score);

    const best = scoredTracks[0];
    if (!best || best.score <= (query.minScore ?? 15)) return null;

    return {
        ...best.track,
        path: best.track.file_path ?? best.track.path, // Normalize path key
        matchScore: best.score
    };
  }

  /** @returns {boolean} */
  get isReady() { return this._isLoaded; }

  /** @returns {any[]} */
  get catalog() { return this._catalog; }
}

export default MusicDiscoveryEngine;
