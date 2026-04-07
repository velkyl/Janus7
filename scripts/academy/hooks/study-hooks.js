import { JanusStudyEngine } from "../systems/study-engine.js";

Hooks.on("dsa5.roll", (rollData) => {
    const actor = game.actors.get(rollData.speaker.actor);
    if (!actor || !actor.hasPlayerOwner) return;

    const timeSlot = game.settings.get("janus7", "current_time_slot_idx"); 
    // 0 = Vormittag, 1 = Nachmittag, 2 = Nacht

    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0;
    const qs = rollData.qualityStep || 0;

    // Nur Nachmittags-Aktionen zählen als freies Lernen
    if (timeSlot === 1 && !isFailed && qs > 0) {
        
        // Liste der Kernfächer, die für Klausuren relevant sind
        const coreSubjects = ["Magiekunde", "Sphärenkunde", "Götter & Kulte", "Sternkunde", "Alchimie"];
        
        if (coreSubjects.includes(skillName)) {
            JanusStudyEngine.addStudyProgress(actor, skillName, qs);
            
            // Kostet Freizeit, erzeugt leicht Stress (optional, falls sie zu viel pushen)
            // JanusTimeStressEngine.addStress(actor, 1, "Erschöpfendes Studium"); 
        }
    }
});
