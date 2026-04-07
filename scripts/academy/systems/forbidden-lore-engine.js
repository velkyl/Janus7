export class JanusForbiddenLoreEngine {
    
    // --- FORSCHUNG IM GIFTSCHRANK ---
    static async researchForbidden(actor, qs) {
        const qId = "Q_FORBIDDEN_ARCHIVES";
        if (!Janus7.QuestEngine.isActive(qId)) return;

        // Wissen steigt um die erspielten QS
        Janus7.QuestEngine.updateResource(qId, "forbidden_lore", qs);
        
        // Risiko: Selbst bei Erfolg steigt die Heat leicht (man verbringt Zeit in der Sperrzone)
        Janus7.QuestEngine.updateResource(qId, "discovery_heat", 1);
        
        ui.notifications.info(`[Janus7] ${actor.name} gräbt tief in den verbotenen Schriften (+${qs} Lore, +1 Heat).`);
        Janus7.QuestEngine.evaluateMilestones(qId);
    }

    // --- RISIKO-MANIPULATION (Taktiker-Fokus) ---
    static async reduceHeat(actor, qs) {
        const qId = "Q_FORBIDDEN_ARCHIVES";
        if (!Janus7.QuestEngine.isActive(qId)) return;

        // Helden können Spuren verwischen (mittels Verbergen oder Gassenwissen)
        Janus7.QuestEngine.updateResource(qId, "discovery_heat", -qs);
        ui.notifications.info(`[Janus7] ${actor.name} verwischt Spuren und täuscht die Wachen (-${qs} Heat).`);
    }

    static async failState(actor) {
        const qId = "Q_FORBIDDEN_ARCHIVES";
        if (!Janus7.QuestEngine.isActive(qId)) return;

        // Ein Patzer beim Forschen oder Schleichen eskaliert die Heat massiv
        Janus7.QuestEngine.updateResource(qId, "discovery_heat", 3);
        ui.notifications.warn(`[Janus7] ${actor.name} hat ein Buch fallen lassen oder ein Schutzziel ausgelöst! (+3 Heat)`);
        Janus7.QuestEngine.evaluateMilestones(qId);
    }
}
