import { JanusForbiddenLoreEngine } from "../systems/forbidden-lore-engine.js";

Hooks.on("dsa5.roll", (rollData) => {
    const actor = game.actors.get(rollData.speaker.actor);
    if (!actor || !actor.hasPlayerOwner) return;

    // Hole den aktuellen Zeit-Slot (0=Vormittag, 1=Nachmittag, 2=Nacht)
    const timeSlot = game.settings.get("janus7", "current_time_slot_idx"); 
    const qId = "Q_FORBIDDEN_ARCHIVES";

    if (timeSlot === 2 && Janus7.QuestEngine.isActive(qId)) {
        const skillName = rollData.source.name;
        const isFailed = rollData.successLevel < 0;
        const isBotch = rollData.successLevel < -1;
        const qs = rollData.qualityStep || 0;

        // 1. Forschen (Magiekunde, Sagen & Legenden)
        if (["Magiekunde", "Sagen & Legenden", "Sphärenkunde"].includes(skillName)) {
            if (isBotch || isFailed) {
                JanusForbiddenLoreEngine.failState(actor);
            } else if (qs > 0) {
                JanusForbiddenLoreEngine.researchForbidden(actor, qs);
            }
        }

        // 2. Spuren verwischen & Schleichen (Verbergen, Schlösserknacken)
        if (["Verbergen", "Schlösserknacken"].includes(skillName)) {
            if (isBotch || isFailed) {
                JanusForbiddenLoreEngine.failState(actor);
            } else if (qs > 0) {
                // Erfolgreiches Schleichen senkt die aufgebaute Heat
                JanusForbiddenLoreEngine.reduceHeat(actor, Math.ceil(qs / 2)); 
            }
        }
    }
});
