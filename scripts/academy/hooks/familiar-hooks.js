import { JanusFamiliarEngine } from "../systems/familiar-engine.js";

// Hooke dich in das Event ein, wenn der Spielleiter die Zeit voranschreiten lässt
Hooks.on("janus7TimeSlotAdvanced", async (_newSlotIdx) => {
    // 1. Stress & Erholung berechnen (wie in Element 2)
    // ...
    
    // 2. Vertrauten-Missionen abarbeiten
    await JanusFamiliarEngine.processActiveMissions();
});
