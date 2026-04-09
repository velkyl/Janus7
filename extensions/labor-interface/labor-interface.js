/**
 * Epic 2: Labor-Interface & Stash-Manager
 * Ziel: Ein "Quality of Life"-Feature für das Crafting. 
 * Verknüpft offizielle Alchimie-Rezepte mit einem Gruppen-Inventar (Stash)
 * und automatisiert den Verbrauchs-Workflow.
 */

import { JanusLaborApp } from '../../ui/apps/JanusLaborApp.js';

export function bootLaborInterface() {
    if (game.janus7) {
        game.janus7.openLaborInterface = () => JanusLaborApp.showSingleton();
    }
}
