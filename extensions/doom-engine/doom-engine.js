import { getJanusCore } from '../../core/index.js';

/**
 * Epic 3: Die Doom-Engine / Risiko-Tracker
 * Ein passiv im Hintergrund laufender Meta-Mechanik,
 * die den exzessiven Gebrauch dunkler Magie bestraft.
 */

export function trackDoom(spellItem, rollResult) {
  const { state, logger, director } = getJanusCore();
  if (!state || !logger || !director) return;

  const isDemonic = spellItem?.system?.trait?.includes("Dämonisch");
  const isTemporal = spellItem?.system?.trait?.includes("Temporal");
  const isBotch = rollResult?.botch;

  if (isDemonic || isTemporal || isBotch) {
      state.transaction(() => {
          let currentDoom = state.get("academy.metrics.doom") || 0;
          currentDoom += isBotch ? 5 : 1;
          state.set("academy.metrics.doom", currentDoom);
          
          logger.warn(`JANUS | Doom increased to ${currentDoom} due to dark magic.`);
          
          // Threshold-Trigger für den Director
          if (currentDoom >= 50 && !state.get("academy.flags.doom_event_1")) {
              director.triggerEvent("evt_doom_inquisition_visit");
              state.set("academy.flags.doom_event_1", true);
          }
      });
  }
}

import { JanusDoomApp } from '../../ui/apps/JanusDoomApp.js';

// Wir klinken uns in die DSA5-Würfelauswertung ein.
export function bootDoomEngine() {
    if (game.janus7) {
        game.janus7.openDoomMonitor = () => JanusDoomApp.showSingleton();
    }
    
    Hooks.on("createChatMessage", (message) => {
        const dsa5Data = message.flags?.dsa5;
        if (!dsa5Data || !dsa5Data.itemData) return;
        
        const item = dsa5Data.itemData;
        
        // Prüfen, ob es ein Zauber oder Ritual ist
        if (item.type === "spell" || item.type === "ritual") {
             const isBotch = (dsa5Data.rollBotch === true) || message.content?.includes('botch');
             trackDoom(item, { botch: isBotch });
        }
    });
}
