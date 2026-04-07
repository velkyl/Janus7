export class JanusTimeStressEngine {
    static get TIME_SLOTS() {
        return ["Vormittag (Unterricht)", "Nachmittag (Lernen/Freizeit)", "Nacht (Schlafen/Schleichen)"];
    }

    // --- STRESS MANAGEMENT ---
    static async addStress(actor, amount, reason = "") {
        if (!actor) return;
        
        let currentStress = actor.getFlag("janus7", "stress_level") || 0;
        let newStress = currentStress + amount;
        await actor.setFlag("janus7", "stress_level", newStress);
        
        ui.notifications.warn(`[Janus7] ${actor.name} erhält ${amount} Stress. (Grund: ${reason}). Gesamt: ${newStress}`);
        
        this.checkStressOverload(actor, newStress);
    }

    static async checkStressOverload(actor, currentStress) {
        // Lese die KO des Helden aus dem DSA5 System
        const koValue = actor.system.status.ko.value;
        
        if (currentStress >= koValue) {
            ui.notifications.error(`[Janus7] STRESS-OVERLOAD: ${actor.name} bricht unter der Belastung zusammen!`);
            
            // Füge den DSA5 Zustand "Erschöpfung" hinzu (Condition ID in Foundry DSA5)
            const condition = game.dsa5.config.conditions.find(c => c.name === "Erschöpfung" || c.id === "exhaustion");
            if (condition) {
                await actor.addCondition(condition.id, 1, false);
            }
        }
    }

    // --- ZEIT MANAGEMENT & ERHOLUNG ---
    static async advanceTimeSlot() {
        let currentSlotIdx = game.settings.get("janus7", "current_time_slot_idx") || 0;
        let nextSlotIdx = (currentSlotIdx + 1) % 3;
        
        await game.settings.set("janus7", "current_time_slot_idx", nextSlotIdx);
        const slotName = this.TIME_SLOTS[nextSlotIdx];
        
        ChatMessage.create({
            content: `<h2>Tageszeitwechsel</h2><p>Es ist nun: <b>${slotName}</b>.</p>`,
            speaker: { alias: "Akademie-Glocke" }
        });

        // Wenn es "Vormittag" wird (also eine Nacht vergangen ist), erholen sich alle Helden
        if (nextSlotIdx === 0) {
            this.nightlyRecovery();
        }
    }

    static async nightlyRecovery() {
        // Alle Spieler-Charaktere durchgehen
        const actors = game.actors.filter(a => a.hasPlayerOwner && a.type === "character");
        for (let actor of actors) {
            let currentStress = actor.getFlag("janus7", "stress_level") || 0;
            if (currentStress > 0) {
                // Erholung: 1W3 + (KO / 4)
                let roll = new Roll("1d3").evaluate({async: false});
                let recovery = roll.total + Math.floor(actor.system.status.ko.value / 4);
                let newStress = Math.max(0, currentStress - recovery);
                
                await actor.setFlag("janus7", "stress_level", newStress);
                ui.notifications.info(`[Janus7] ${actor.name} hat sich im Schlaf erholt (-${currentStress - newStress} Stress).`);
            }
        }
    }
}
