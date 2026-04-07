export class JanusAcademyEngine {
    static init() {
        // Initiale Registrierung der Akademie-Ressourcen auf dem Actor-Flag
        console.log("[Janus7] Academy Core Engine initialisiert.");
    }

    // --- 1. ZEIT & STRESS (Academagia / Persona) ---
    static async advanceTime(actor, slot = "morning") {
        // slots: morning (class), afternoon (study/free), night (stealth/sleep)
        await actor.setFlag("janus7", "current_timeslot", slot);
        
        // Nächtliche Erholung (Senkt Stress, heilt)
        if (slot === "morning") {
            let currentStress = actor.getFlag("janus7", "stress") || 0;
            let recovery = Math.max(1, Math.floor(actor.system.status.ko.value / 4));
            await actor.setFlag("janus7", "stress", Math.max(0, currentStress - recovery));
            
            // Krankheit/Erschöpfung prüfen (Stress über KO)
            if (currentStress >= actor.system.status.ko.value) {
                ui.notifications.error(`${actor.name} bricht unter der Last zusammen! Erschöpfung (Stufe 1).`);
                // Hier Foundry-Effect "Erschöpfung" applizieren
            }
        }
    }

    static async addStress(actor, amount) {
        let currentStress = actor.getFlag("janus7", "stress") || 0;
        await actor.setFlag("janus7", "stress", currentStress + amount);
        ui.notifications.warn(`[Stress] ${actor.name} erhält ${amount} Stress. (Gesamt: ${currentStress + amount})`);
    }

    // --- 2. STUDY LEVELS & EXAMS (Academagia) ---
    static async addStudyProgress(actor, subject, qs) {
        let progress = actor.getFlag("janus7", `study_${subject}`) || 0;
        await actor.setFlag("janus7", `study_${subject}`, progress + qs);
        ui.notifications.info(`[Studium] ${actor.name} sammelt ${qs} QS in ${subject}.`);
        
        // Meilenstein: Neues Wissen freigeschaltet
        if (progress + qs >= 20 && progress < 20) {
            ui.notifications.info(`Glory! ${actor.name} dominiert das Fach ${subject}.`);
        }
    }

    // --- 3. SOCIAL LINKS & CLIQUEN (Persona) ---
    static async updateSocialLink(actor, npcId, amount) {
        let currentLink = actor.getFlag("janus7", `social_link_${npcId}`) || 0;
        let newLink = Math.min(10, Math.max(0, currentLink + amount));
        await actor.setFlag("janus7", `social_link_${npcId}`, newLink);
        
        ui.notifications.info(`[Social Link] Beziehung zu ${npcId} ändert sich auf Stufe ${newLink}.`);
        
        // Mechanische Belohnungen freischalten
        if (newLink === 5) {
            // Beispiel: Lehrer gewährt Labor-Zugang
            Janus7.QuestEngine.updateResource("GLOBAL", "lab_access_unlocked", 1);
        }
    }

    // --- 4. GOSSIP & GERÜCHTEKÜCHE ---
    static async generateGossip(actor, qs) {
        let gossipPoints = actor.getFlag("janus7", "gossip_resource") || 0;
        await actor.setFlag("janus7", "gossip_resource", gossipPoints + qs);
        ui.notifications.info(`[Gerüchteküche] ${actor.name} schnappt Gerüchte auf. (+${qs} Gossip)`);
    }
}
