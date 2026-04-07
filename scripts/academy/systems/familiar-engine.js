export class JanusFamiliarEngine {
    
    // --- MISSION STARTEN ---
    static async dispatchFamiliar(actor, missionId) {
        if (!actor) return;
        
        // Prüfe, ob das Tier bereits unterwegs ist
        const activeMission = actor.getFlag("janus7", "active_familiar_mission");
        if (activeMission) {
            ui.notifications.warn(`[Janus7] Der Vertraute von ${actor.name} ist bereits auf einer Mission!`);
            return;
        }

        // Lade Mission (in einer echten Umgebung aus dem ContentLoader)
        const missions = await fetch("modules/janus7/data/profiles/punin/familiar_missions.json").then(r => r.json());
        const missionDef = missions.missions.find(m => m.id === missionId);
        
        if (!missionDef) return;

        const bondLevel = actor.getFlag("janus7", "familiar_bond_level") || 1;
        if (bondLevel < missionDef.required_bond) {
            ui.notifications.error(`[Janus7] Die Bindung (Stufe ${bondLevel}) ist zu schwach für diese Mission.`);
            return;
        }

        // Mission im Actor-Flag speichern
        await actor.setFlag("janus7", "active_familiar_mission", {
            id: missionId,
            name: missionDef.name,
            slots_remaining: missionDef.duration_slots,
            rewards: missionDef.rewards,
            bond_used: bondLevel
        });

        ui.notifications.info(`🐾 Der Vertraute von ${actor.name} ist aufgebrochen: "${missionDef.name}".`);
    }

    // --- MISSIONEN AUSWERTEN (Wird beim Zeitwechsel aufgerufen) ---
    static async processActiveMissions() {
        const actors = game.actors.filter(a => a.hasPlayerOwner && a.type === "character");
        
        for (let actor of actors) {
            let mission = actor.getFlag("janus7", "active_familiar_mission");
            if (!mission) continue;

            mission.slots_remaining -= 1;

            if (mission.slots_remaining <= 0) {
                // Mission beendet -> Würfeln! (1W20 + BondLevel vs. Schwierigkeit 10)
                let roll = new Roll("1d20 + @bond", { bond: mission.bond_used }).evaluate({async: false});
                let resultText = "";

                if (roll.total >= 15) {
                    resultText = `<b>Kritischer Erfolg!</b> Der Vertraute war extrem erfolgreich.`;
                    // Hier Trigger für mission.rewards.critical_success
                } else if (roll.total >= 10) {
                    resultText = `<b>Erfolg!</b> Mission erfolgreich abgeschlossen.`;
                    // Hier Trigger für mission.rewards.success
                } else {
                    resultText = `<b>Fehlschlag!</b> Der Vertraute kam mit leeren Pfoten zurück.`;
                    // Hier Trigger für mission.rewards.failure
                }

                ChatMessage.create({
                    speaker: { alias: "Vertrauten-Band" },
                    content: `<h3>Rückkehr des Vertrauten (${actor.name})</h3><p>Mission: ${mission.name}</p><p>${resultText}</p>`,
                    whisper: [game.user.id] // Nur an den Besitzer/GM
                });

                // Flag löschen, Tier ist wieder frei
                await actor.unsetFlag("janus7", "active_familiar_mission");
            } else {
                // Update den Timer
                await actor.setFlag("janus7", "active_familiar_mission", mission);
            }
        }
    }
}
