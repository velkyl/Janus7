Hooks.on("dsa5.roll", (rollData) => {
    const qId = "Q_NIGHTMARKET_RUN";
    if (!Janus7.QuestEngine.isActive(qId)) return;

    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0;
    
    // Taktiker wählen Routen. Gassenwissen (kürzere Route), Schleichen (sichere Route)
    if (["Gassenwissen", "Schleichen"].includes(skillName)) {
        if (!isFailed) {
            Janus7.QuestEngine.updateResource(qId, "path_progress", 1);
            ui.notifications.info("[Janus7] Ihr habt den nächsten Knotenpunkt im Pointcrawl erreicht.");
        } else {
            Janus7.QuestEngine.updateResource(qId, "heat", 2);
            ui.notifications.warn("[Janus7] Ihr seid in eine Sackgasse geraten oder habt Lärm gemacht! Heat steigt massiv.");
        }
        Janus7.QuestEngine.evaluateMilestones(qId);
    }
});
