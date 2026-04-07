import { JanusAcademyEngine } from "../systems/academy-core-engine.js";

Hooks.on("dsa5.roll", (rollData) => {
    const actor = game.actors.get(rollData.speaker.actor);
    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0;
    const qs = rollData.qualityStep || 0;

    // 1. ALLGEMEINER STRESS-TRIGGER (Jeder Patzer / Misserfolg erzeugt Stress)
    if (isFailed) {
        JanusAcademyEngine.addStress(actor, 1);
    }

    // 2. GOSSIP SYSTEM (Gassenwissen / Überreden in der Freizeit)
    const timeSlot = actor.getFlag("janus7", "current_timeslot") || "afternoon";
    if (timeSlot === "afternoon" && ["Gassenwissen", "Sagen & Legenden"].includes(skillName) && !isFailed) {
        JanusAcademyEngine.generateGossip(actor, qs);
    }

    // 3. STUDY SYSTEM (Lernen am Vormittag/Nachmittag)
    if (["Magiekunde", "Sphärenkunde", "Götter & Kulte", "Sternkunde"].includes(skillName) && !isFailed) {
        // Zählt als Studium, wenn keine spezielle Quest läuft
        if (!Janus7.QuestEngine.hasActiveQuests()) {
            JanusAcademyEngine.addStudyProgress(actor, skillName, qs);
        }
    }

    // 4. QUEST ROUTING (Verteiler an aktive Janus7 JSON-Quests)
    const activeQuests = Janus7.QuestEngine.getAllQuests().filter(q => q.state.status === "active");
    
    activeQuests.forEach(quest => {
        const qId = quest.id;

        // A) Stealth Run (Nachts)
        if (qId === "Q_NIGHT_STEALTH_01" && skillName === "Verbergen" && isFailed) {
            Janus7.QuestEngine.updateResource(qId, "noise_level", 1);
        }

        // B) Alchemie Desaster
        if (qId === "Q_ALCHEMY_HAZARD" && ["Alchimie"].includes(skillName)) {
            if (!isFailed) Janus7.QuestEngine.updateResource(qId, "stability", qs);
            else Janus7.QuestEngine.updateResource(qId, "pressure", 1);
        }

        // C) Soziales Duell
        if (qId === "Q_SOCIAL_DUEL" && ["Einschüchtern", "Betören"].includes(skillName)) {
            if (!isFailed) Janus7.QuestEngine.updateResource(qId, "ego_sequin", -qs);
            else Janus7.QuestEngine.updateResource(qId, "ego_party", -1);
        }

        // D) Verbotenes Wissen (Giftschrank-Mechanik)
        if (qId === "Q_FORBIDDEN_ARCHIVES" && ["Schlösserknacken", "Verbergen"].includes(skillName)) {
            if (isFailed) Janus7.QuestEngine.updateResource(qId, "discovery_heat", 2);
        }
        if (qId === "Q_FORBIDDEN_ARCHIVES" && ["Magiekunde"].includes(skillName) && !isFailed) {
            Janus7.QuestEngine.updateResource(qId, "forbidden_lore", qs);
            Janus7.QuestEngine.updateResource(qId, "discovery_heat", 1); // Auch bei Erfolg steigt Risiko!
        }
    });
});

// 5. VERTRAUTENTIER-ROUTING (Sonderaktion)
Hooks.on("janus7.dispatchFamiliar", (actorId, actionType) => {
    const actor = game.actors.get(actorId);
    ui.notifications.info(`${actor.name} schickt den Vertrauten auf die Mission: ${actionType}`);
    // Der Vertraute agiert autark. Nach X Minuten (VTT Zeit) kommt ein Resultat zurück.
});
