Hooks.on("dsa5.roll", (rollData) => {
    const qId = "Q_SOCIAL_DUEL";
    if (!Janus7.QuestEngine.isActive(qId)) return;

    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0;
    const qs = rollData.qualityStep || 1;

    // Angriffe auf Sequins Ego
    if (["Einschüchtern", "Überreden", "Verbergen"].includes(skillName)) {
        if (!isFailed) {
            Janus7.QuestEngine.updateResource(qId, "ego_sequin", -qs);
            ui.notifications.info(`[Janus7] Treffer gegen Sequins Ego! (-${qs})`);
        } else {
            Janus7.QuestEngine.updateResource(qId, "ego_party", -1);
            ui.notifications.warn(`[Janus7] Patzer! Eure Gruppe wird ausgelacht.`);
        }
        Janus7.QuestEngine.evaluateMilestones(qId);
    }
});
