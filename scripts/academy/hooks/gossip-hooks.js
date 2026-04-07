import { JanusGossipEngine } from "../systems/gossip-engine.js";

Hooks.on("dsa5.roll", (rollData) => {
    const actor = game.actors.get(rollData.speaker.actor);
    if (!actor || !actor.hasPlayerOwner) return;

    // Nur aktiv, wenn die Quest läuft
    if (!Janus7.QuestEngine.isActive("Q_SOCIAL_INTRIGUE")) return;

    const skillName = rollData.source.name;
    const isFailed = rollData.successLevel < 0;
    const isBotch = rollData.successLevel < -1;
    const qs = rollData.qualityStep || 0;

    // Spezifische Talente für die Gerüchteküche
    const gossipSkills = ["Gassenwissen", "Menschenkenntnis", "Überreden", "Betören"];

    if (gossipSkills.includes(skillName)) {
        if (isBotch) {
            // Harte Strafe bei Patzern: Die Gruppe verliert Gossip, weil sie beim Schnüffeln erwischt wurde
            ui.notifications.error(`[Janus7] Katastrophe! ${actor.name} wurde beim Spionieren erwischt! Ihr verliert massiv Gossip.`);
            Janus7.QuestEngine.updateResource("Q_SOCIAL_INTRIGUE", "gossip_points", -3);
        } else if (!isFailed && qs > 0) {
            // Bei Erfolg: Währung aufs Konto
            JanusGossipEngine.gainGossip(actor, qs);
        }
    }
});
