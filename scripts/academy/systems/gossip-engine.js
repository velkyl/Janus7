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

export class JanusRumorManager {
    /**
     * Lädt ein zufälliges Gerücht basierend auf der Situation
     * @param {string} category - staff, students, arcane, city
     */
    static async getRandomRumor(category) {
        const response = await fetch("modules/janus7/data/profiles/punin/rumors.json");
        const data = await response.json();
        const pool = data.rumors.filter(r => r.category === category);
        
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /**
     * "Aktiviert" ein Gerücht für einen Spieler. 
     * Das Gerücht wird als "Wissens-Item" im Actor gespeichert.
     */
    static async learnRumor(actor, rumorId) {
        let learned = actor.getFlag("janus7", "learned_rumors") || [];
        if (!learned.includes(rumorId)) {
            learned.push(rumorId);
            await actor.setFlag("janus7", "learned_rumors", learned);
            ui.notifications.info(`[Janus7] Neues Gerücht aufgeschnappt: ID ${rumorId}`);
        }
    }

    /**
     * Wendet den mechanischen Effekt eines Gerüchts an.
     * @param {string} rumorId 
     * @param {object} context - VTT Context (Probe, NPC, Location)
     */
    static async resolveRumorEffect(rumorId, context) {
        // Logik zur Umsetzung der Tabelle (Mapping ID zu Effekt)
        switch(rumorId) {
            case "R_026": 
                context.modifier += 2; // Bonus gegen Sequin
                break;
            case "R_051":
                if (context.aspCost) context.aspCost -= 2; // Matrix-Anomalie Nutzen
                break;
            case "R_080":
                // Spezialfall: Heat Senkung
                game.modules.get("janus7").api?.HeatEngine?.modifyHeat(-3);
                break;
        }
        return context;
    }
}
