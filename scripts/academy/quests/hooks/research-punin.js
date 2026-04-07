// Janus7 Research-Hook (Punin - Compendium Suche)
// Datei: scripts/academy/quests/hooks/research-punin.js

Hooks.on("dsa5.roll", (rollData) => {
    const quest = Janus7.QuestEngine.getQuest("Q_LIBRARY_COMPENDIUM");
    if (!quest || quest.state.status !== "active") return;

    const skillName = rollData.source.name;
    const qs = rollData.qualityStep || 0;
    const isFailed = rollData.successLevel < 0;
    
    // Nur spezifische Talente zählen als Recherche
    if (["Magiekunde", "Götter & Kulte", "Sagen & Legenden"].includes(skillName)) {
        
        // 1. Intervall (Zeit) erhöhen, egal ob Erfolg oder Misserfolg
        Janus7.QuestEngine.updateResource("Q_LIBRARY_COMPENDIUM", "time_intervals", 1);
        
        if (!isFailed && qs > 0) {
            // 2. Bei Erfolg: QS dem Fortschritt hinzufügen
            Janus7.QuestEngine.updateResource("Q_LIBRARY_COMPENDIUM", "research_qs", qs);
            ui.notifications.info(`[Janus7] Recherche erfolgreich! +${qs} QS gesammelt.`);
        } else {
            // Bei Patzer oder Misserfolg: Narrativer Rückschlag
            ui.notifications.warn(`[Janus7] Sackgasse! Eine Woche verschwendet, ohne neue Erkenntnisse.`);
        }

        // 3. Meilensteine prüfen (Events feuern)
        Janus7.QuestEngine.evaluateMilestones("Q_LIBRARY_COMPENDIUM");
    }
});
