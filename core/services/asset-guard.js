import { MODULE_ID } from '../common.js';

/**
 * AssetGuard
 * 
 * Detects missing Janus assets and offers AI-driven restoration.
 */
export class JanusAssetGuard {
  constructor(engine) {
    this.engine = engine;
    this._missingAssets = new Set();
    this._setupListener();
  }

  _setupListener() {
    window.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        const src = e.target.src;
        if (src.includes(`modules/${MODULE_ID}/assets`)) {
          this._handleMissingAsset(src, e.target);
        }
      }
    }, true);
  }

  _handleMissingAsset(src, element) {
    if (this._missingAssets.has(src)) return;
    this._missingAssets.add(src);

    const filename = src.split('/').pop();
    const isIcon = src.includes('/icons/');
    
    console.warn(`[JANUS7] Missing asset detected: ${src}`);

    // Pulse the missing icon if it's in a list
    element.classList.add('j7-missing-asset-pulse');

    // Offer restoration if Gemini is ready
    if (game.janus7?.ki?.gemini?.isEnabled) {
      ui.notifications.warn(`JANUS7: Asset fehlt: ${filename}. Klicke in der Janus-Shell auf den KI-Director zur Wiederherstellung.`, { permanent: false });
    }
  }

  get missingAssets() { return Array.from(this._missingAssets); }
}
