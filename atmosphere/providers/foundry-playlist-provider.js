/**
 * @file atmosphere/providers/foundry-playlist-provider.js
 * @module janus7
 * @phase 5
 *
 * FoundryPlaylistProvider:
 * - Findet eine Playlist per UUID, id oder Name.
 * - Startet/stoppt Playlists über Foundry-API.
 * - Best-effort Volume + Fade (ohne persistente DB-Änderungen).
 *
 * Hinweis:
 * Foundry APIs können je nach Minor-Version leicht variieren; wir sind defensiv und loggen Warnungen,
 * statt hart zu crashen.
 */

export class FoundryPlaylistProvider {
  /**
   * @param {object} params
   * @param {import('../../core/logger.js').JanusLogger} params.logger
   */
  constructor({ logger }) {
    this.logger = logger;
  }

  /**
   * @param {string} playlistRef UUID | id | Name
   * @returns {Promise<any|null>} Playlist
   */
  async resolvePlaylist(playlistRef) {
    if (!playlistRef || typeof playlistRef !== 'string') return null;

    // UUID
    if (playlistRef.startsWith('Playlist.') || playlistRef.startsWith('Compendium.') || playlistRef.startsWith('uuid:')) {
      try {
        const uuid = playlistRef.startsWith('uuid:') ? playlistRef.slice(5) : playlistRef;
        // Note: fromUuid is a Foundry VTT global (not DSA5-specific).
        // It is intentionally allowed here as it resolves Foundry Documents, not system data.
        const doc = await (globalThis.fromUuid ?? fromUuid)(uuid);
        if (doc) return doc;
      } catch {
        // ignore
      }
    }

    // ID
    const byId = game?.playlists?.get?.(playlistRef);
    if (byId) return byId;

    // Name
    const name = playlistRef.trim().toLowerCase();
    const byName = game?.playlists?.find?.((p) => (p?.name ?? '').trim().toLowerCase() === name);
    if (byName) return byName;

    return null;
  }

  /**
   * Spielt Playlist (alle Sounds).
   *
   * @param {string} playlistRef
   * @param {object} [opts]
   * @param {number} [opts.volume] 0..1 (runtime)
   * @param {number} [opts.fadeInMs] best-effort
   */
  async playPlaylist(playlistRef, opts = {}) {
    const playlist = await this.resolvePlaylist(playlistRef);
    if (!playlist) {
      this.logger?.warn?.('FoundryPlaylistProvider: Playlist nicht gefunden', { playlistRef });
      return false;
    }

    try {
      // Start
      if (typeof playlist.playAll === 'function') {
        // Manche Foundry-Versionen unterstützen Optionen; wir sind defensiv.
        try {
          await playlist.playAll(opts);
        } catch {
          await playlist.playAll();
        }
      } else if (typeof playlist.play === 'function') {
        await playlist.play();
      } else {
        this.logger?.warn?.('FoundryPlaylistProvider.playPlaylist: Keine play*-Methode auf Playlist', { playlistRef });
        return false;
      }

      // Runtime volume/fade
      if (typeof opts.volume === 'number') {
        await this.setPlaylistVolumeRuntime(playlist, opts.volume, { fadeMs: opts.fadeInMs ?? 0 });
      }

      return true;
    } catch (err) {
      this.logger?.error?.('FoundryPlaylistProvider.playPlaylist: Fehler', { playlistRef, error: err });
      return false;
    }
  }

  /**
   * Stoppt Playlist (alle Sounds).
   *
   * @param {string} playlistRef
   * @param {object} [opts]
   * @param {number} [opts.fadeOutMs] best-effort
   */
  async stopPlaylist(playlistRef, opts = {}) {
    const playlist = await this.resolvePlaylist(playlistRef);
    if (!playlist) return false;

    try {
      // Fade out via runtime volume ramp (best-effort)
      if (opts.fadeOutMs && opts.fadeOutMs > 0) {
        await this.setPlaylistVolumeRuntime(playlist, 0, { fadeMs: opts.fadeOutMs });
      }

      if (typeof playlist.stopAll === 'function') {
        await playlist.stopAll();
      } else if (typeof playlist.stop === 'function') {
        await playlist.stop();
      } else {
        this.logger?.warn?.('FoundryPlaylistProvider.stopPlaylist: Keine stop*-Methode auf Playlist', { playlistRef });
        return false;
      }
      return true;
    } catch (err) {
      this.logger?.error?.('FoundryPlaylistProvider.stopPlaylist: Fehler', { playlistRef, error: err });
      return false;
    }
  }

  /**
   * Stoppt alle Playlists (best-effort).
   * @param {object} [opts]
   * @param {number} [opts.fadeOutMs]
   */
  async stopAll(opts = {}) {
    try {
      const list = Array.from(game?.playlists ?? []);
      for (const p of list) {
        // Nur stoppen, wenn aktiv (best-effort property)
        const isPlaying = p?.playing ?? p?.isPlaying ?? false;
        if (!isPlaying) continue;
        await this.stopPlaylist(p.id, opts);
      }
      return true;
    } catch (err) {
      this.logger?.error?.('FoundryPlaylistProvider.stopAll: Fehler', { error: err });
      return false;
    }
  }

  /**
   * Best-effort: setzt *runtime* Lautstärke für aktuell spielende PlaylistSounds,
   * ohne persistente Dokument-Updates.
   *
   * @param {any} playlist
   * @param {number} targetVolume 0..1
   * @param {object} [opts]
   * @param {number} [opts.fadeMs]
   */
  async setPlaylistVolumeRuntime(playlist, targetVolume, opts = {}) {
    const fadeMs = Math.max(0, Number(opts.fadeMs ?? 0));
    const vol = Math.max(0, Math.min(1, Number(targetVolume)));

    const sounds = Array.from(playlist?.sounds ?? []);
    if (sounds.length === 0) return;

    const setNow = (v) => {
      for (const s of sounds) {
        // Foundry: PlaylistSound hat häufig ein `sound` (Howl/Audio) Objekt mit volume()
        const runtime = s?.sound;
        try {
          if (runtime?.volume && typeof runtime.volume === 'function') runtime.volume(v);
          else if (typeof runtime?.setVolume === 'function') runtime.setVolume(v);
          else if (runtime && 'volume' in runtime) runtime.volume = v;
        } catch {
          // ignore
        }
      }
    };

    if (!fadeMs) {
      setNow(vol);
      return;
    }

    // Fade: Ramp 12.5 fps
    const steps = Math.max(1, Math.floor(fadeMs / 80));
    // Best guess: read first sound volume
    let current = null;
    try {
      const rt = sounds[0]?.sound;
      if (rt?.volume && typeof rt.volume === 'function') current = rt.volume();
      else if (rt && typeof rt.volume === 'number') current = rt.volume;
    } catch {
      // ignore
    }
    if (typeof current !== 'number') current = 1.0;

    const delta = (vol - current) / steps;

    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 80));
      setNow(Math.max(0, Math.min(1, current + delta * i)));
    }
  }
}

export default FoundryPlaylistProvider;
