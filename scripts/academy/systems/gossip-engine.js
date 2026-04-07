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
     * Lädt ein zufälliges Gerücht basierend auf der Situation und ersetzt Platzhalter.
     * @param {string} category - staff, students, arcane, city
     */
    static async getRandomRumor(category) {
        const response = await fetch("modules/janus7/data/profiles/punin/rumors.json");
        const data = await response.json();
        const templates = data.rumor_templates[category];
        
        if (!templates?.length) return null;

        const template = templates[Math.floor(Math.random() * templates.length)];
        const processedText = await this._replacePlaceholders(template.text);
        
        return {
            ...template,
            content: processedText // Das UI erwartet 'content'
        };
    }

    /**
     * Ersetzt [Platzhalter] durch reale Daten aus dem Modul.
     */
    static async _replacePlaceholders(text) {
        const replacements = {
            "[Instructor]": async () => {
                const npcs = await Janus7.DataApi.getNpcs() || [];
                const staff = npcs.filter(n => n.tags?.includes("staff") || n.type === "instructor");
                return staff.length ? staff[Math.floor(Math.random() * staff.length)].name : "Ein Magister";
            },
            "[Student]": async () => {
                const npcs = await Janus7.DataApi.getNpcs() || [];
                const pupils = npcs.filter(n => n.tags?.includes("student") || n.type === "pupil");
                return pupils.length ? pupils[Math.floor(Math.random() * pupils.length)].name : "Ein Scholar";
            },
            "[Location]": async () => {
                const locs = await Janus7.DataApi.getLocations() || [];
                return locs.length ? locs[Math.floor(Math.random() * locs.length)].name : "Ein geheimer Ort";
            },
            "[Subject]": async () => {
                const subs = await Janus7.DataApi.getSubjects() || []; // Existiert laut User
                return subs.length ? subs[Math.floor(Math.random() * subs.length)].name : "Ein magisches Fach";
            },
            "[Item]": () => "ein rätselhaftes Artefakt",
            "[NPC]": async () => {
                const npcs = await Janus7.DataApi.getNpcs() || [];
                return npcs.length ? npcs[Math.floor(Math.random() * npcs.length)].name : "Jemand Unbekanntes";
            }
        };

        let result = text;
        for (const [placeholder, resolver] of Object.entries(replacements)) {
            if (result.includes(placeholder)) {
                const val = await resolver();
                result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), val);
            }
        }
        return result;
    }

    /**
     * "Aktiviert" ein Gerücht für einen Spieler. 
     */
    static async learnRumor(actor, rumorData) {
        let learned = actor.getFlag("janus7", "learned_rumors") || [];
        // Wir speichern das ganze Objekt, da 'content' nun dynamisch generiert wurde
        if (!learned.find(r => r.id === rumorData.id && r.content === rumorData.content)) {
            learned.push(rumorData);
            await actor.setFlag("janus7", "learned_rumors", learned);
            ui.notifications.info(`[Janus7] Neues Gerücht aufgeschnappt: ${rumorData.content}`);
        }
    }

    /**
     * Wendet den mechanischen Effekt eines Gerüchts an.
     */
    static async resolveRumorEffect(rumorId, context) {
        // Erweitertes Mapping basierend auf den neuen 'effect' Keys
        switch(rumorId) {
            case "ST01":
            case "S03":
            case "S11":
                // Blackmail Logik
                context.modifier += 2; 
                break;
            case "A01":
                if (context.spellMod) context.spellMod += 2;
                break;
            case "C05":
                // Stress Heilung
                game.modules.get("janus7").api?.TimeStressEngine?.addStress(context.actor, -3);
                break;
        }
        return context;
    }
}
