import { JanusTimeStressEngine } from "../systems/time-stress-engine.js";

Hooks.on("dsa5.roll", (rollData) => {
    // Filtere nur Spieler-Charaktere
    const actor = game.actors.get(rollData.speaker.actor);
    if (!actor || !actor.hasPlayerOwner) return;

    const isFailed = rollData.successLevel < 0;
    const isBotch = rollData.successLevel < -1; // Patzer (Doppel-20 etc.)

    if (isBotch) {
        JanusTimeStressEngine.addStress(actor, 3, "Katastrophaler Fehlschlag beim Zaubern/Lernen");
    } else if (isFailed) {
        // Bei normalen Fehlschlägen nur Stress, wenn es geistig fordernd war (Wissen/Zauber)
        const skillType = rollData.source.type; // 'spell', 'skill', etc.
        if (skillType === "spell" || skillType === "ritual" || rollData.source.name === "Magiekunde") {
            JanusTimeStressEngine.addStress(actor, 1, "Frustration durch Misserfolg");
        }
    }
});
