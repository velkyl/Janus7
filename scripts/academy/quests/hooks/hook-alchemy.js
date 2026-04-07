Hooks.on("dsa5.roll", (rollData) => {
    const qId = "Q_ALCHEMY_HAZARD";
    const quest = Janus7.QuestEngine.getQuest(qId);
    if (!quest || quest.state.status !== "active") return;

    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0;
    const qs = rollData.qualityStep || 1;

    if (["Alchimie", "Pflanzenkunde"].includes(skillName)) {
        if (!isFailed) {
            Janus7.QuestEngine.updateResource(qId, "stability", qs);
            ui.notifications.info(`[Janus7] Tinktur stabilisiert (+${qs} QS).`);
        } else {
            Janus7.QuestEngine.updateResource(qId, "pressure", 1);
            ui.notifications.warn(`[Janus7] Fehler! Kesseldruck steigt.`);
        }
    }
    // Taktik-Aktion: Druck ablassen
    if (["Körperbeherrschung", "Mechanik"].includes(skillName) && !isFailed) {
        Janus7.QuestEngine.updateResource(qId, "pressure", -1);
        ui.notifications.info(`[Janus7] Druckventil erfolgreich betätigt.`);
    }
    Janus7.QuestEngine.evaluateMilestones(qId);
});
