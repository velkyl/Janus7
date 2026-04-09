// Makro für Spieler (z.B. "Räucherwerk anzünden", "Licht dimmen")
const qId = "Q_GHOST_PUZZLE";
// Logik: Prüfe, ob die richtige Kondition getriggert wurde (z.B. Blaues Licht)
if (args[0] === "correct_trigger") {
    Janus7.QuestEngine.updateResource(qId, "resonance", 1);
    ui.notifications.info("[Janus7] Die Raum-Resonanz stabilisiert sich. Der Geist wird greifbarer.");
    Janus7.QuestEngine.evaluateMilestones(qId);
} else {
    // Strafe bei falschem Trigger
    ui.notifications.error("[Janus7] Falsche Frequenz! Der Geist entzieht euch 1W3 AsP.");
    // Hier AsP-Abzug Logik für Foundry Actor einfügen
}
