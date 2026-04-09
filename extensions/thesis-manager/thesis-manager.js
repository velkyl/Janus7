/**
 * Epic 1: Der Thesis-Manager
 * Ziel: Ein System, das den Recherche-Fortschritt der Scholaren trackt, 
 * indem es Foundry-Journale (aus der dsa5-library oder Homebrew) als "Quellen" sammelt.
 */

import { JanusThesisApp } from '../../ui/apps/JanusThesisApp.js';

export function bootThesisManager() {
    // Add to global API for easy access (e.g. from Shell or Macros)
    if (game.janus7) {
        game.janus7.openThesisManager = () => JanusThesisApp.showSingleton();
    }
}
