// Importiere die Engine (Pfade ggf. an deine Modul-Struktur anpassen)
const { JanusTimeStressEngine } = await import("/modules/janus7/scripts/academy/systems/time-stress-engine.js");

// Prüfe ob Setting existiert, sonst lege es temporär an
if (!game.settings.settings.has("janus7.current_time_slot_idx")) {
    game.settings.register("janus7", "current_time_slot_idx", {
        name: "Aktueller Zeit-Slot",
        scope: "world",
        config: false,
        type: Number,
        default: 0
    });
}

// Zeit voranschreiten lassen
JanusTimeStressEngine.advanceTimeSlot();
