// Janus7 Stealth-Hook (Punin - Session 1)
// Datei: scripts/academy/quests/hooks/stealth-punin.js

Hooks.on("dsa5.roll", (rollData) => {
    // Nur aktiv, wenn die Quest läuft
    const quest = Janus7.QuestEngine.getQuest("Q_NIGHT_STEALTH_01");
    if (!quest || quest.state.status !== "active") return;

    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0; // DSA5 Foundry System Logik
    const actorName = rollData.speaker.alias;

    // Trigger: Fehlgeschlagenes Verbergen erzeugt Lärm
    if (skillName === "Verbergen" && isFailed) {
        Janus7.QuestEngine.updateResource("Q_NIGHT_STEALTH_01", "noise_level", 1);
        
        ui.notifications.warn(`[Janus7] ${actorName} hat ein Geräusch verursacht! Lärmpegel steigt.`);
        
        // Prüfe Meilensteine (Lärm >= 3 oder 6)
        Janus7.QuestEngine.evaluateMilestones("Q_NIGHT_STEALTH_01");
    }

    // Trigger: Erfolgreiche Sinnesschärfe beim Spähen generiert Taktik-Punkte
    if (skillName === "Sinnesschärfe" && !isFailed) {
        const qs = rollData.qualityStep || 1;
        ui.notifications.info(`[Janus7] ${actorName} erkennt die Patrouillenroute (QS ${qs}). Nächste Verbergen-Probe +1.`);
        // Hier ggf. einen temporären Buff via Janus7.LessonBuffManager verteilen
    }
});
