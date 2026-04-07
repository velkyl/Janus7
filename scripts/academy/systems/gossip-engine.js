export class JanusGossipEngine {
    
    // --- GERÜCHTE SAMMELN ---
    static async gainGossip(actor, qs) {
        const qId = "Q_SOCIAL_INTRIGUE";
        if (!Janus7.QuestEngine.isActive(qId)) return;

        // Tratsch ist anstrengend. Bei mehr als 2 QS erhält der Held 1 Stress.
        if (qs > 2) {
            // Greift auf Element 2 zurück
            game.modules.get("janus7").api?.TimeStressEngine?.addStress(actor, 1, "Anstrengende soziale Manöver");
        }

        Janus7.QuestEngine.updateResource(qId, "gossip_points", qs);
        ui.notifications.info(`[Janus7] 🗣️ ${actor.name} hat nützliche Gerüchte aufgeschnappt (+${qs} Gossip).`);
        Janus7.QuestEngine.evaluateMilestones(qId);
    }

    // --- SABOTAGE & INTRIGEN (Taktiker-Waffe) ---
    static async sabotageTarget(actor, targetName, cost, effectType) {
        const qId = "Q_SOCIAL_INTRIGUE";
        const currentGossip = Janus7.QuestEngine.getResource(qId, "gossip_points").current;

        if (currentGossip < cost) {
            ui.notifications.error(`[Janus7] Nicht genug Druckmittel (Gossip), um gegen ${targetName} vorzugehen!`);
            return;
        }

        // Währung bezahlen
        Janus7.QuestEngine.updateResource(qId, "gossip_points", -cost);

        // Effekt abhandeln
        if (effectType === "ruin_reputation") {
            ui.notifications.warn(`[Janus7] 🗡️ Rufmord! ${actor.name} streut giftige Gerüchte über ${targetName}. Dessen Ansehen sinkt drastisch.`);
            // Hier könnte man den Social Link des Ziels zu Lehrern senken
        } 
        else if (effectType === "lower_exam_curve") {
            ui.notifications.warn(`[Janus7] 📜 Sabotage! ${actor.name} hat die Lernunterlagen von ${targetName} vernichtet. Die Klausurkurve sinkt.`);
            // Greift auf Element 3 zurück (Study Levels des NSC-Rivalen senken)
        }
    }
}
