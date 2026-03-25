/**
 * JANUS7 – Event Message Listener (v0.4.5)
 *
 * Zweck:
 *  - Übergangs-Makro bis Phase 6 UI:
 *  - Abonniert den Hook `janus7EventMessage` und erzeugt daraus ChatMessages.
 *
 * Nutzung:
 *  1) Als GM ein Script-Makro anlegen
 *  2) Diesen Code einfügen
 *  3) Ausführen → Listener ist aktiv, bis Foundry neu geladen wird
 *
 * Deaktivieren:
 *  - Foundry reloaden ODER den Listener manuell entfernen (siehe Konsole-Ausgabe).
 */

(async () => {
  const TAG = "JANUS7-EventMessageListener";

  if (!game?.user?.isGM) {
    ui.notifications?.error?.("[JANUS7] Nur der GM darf dieses Makro ausführen.");
    return;
  }

  if (!globalThis.Hooks) {
    ui.notifications?.error?.("[JANUS7] Hooks API nicht verfügbar.");
    return;
  }

  // Wenn bereits aktiv, nicht doppelt registrieren
  const store = globalThis._janus7Listeners ?? (globalThis._janus7Listeners = {});
  if (store.eventMessageListenerId) {
    ui.notifications?.warn?.("[JANUS7] EventMessageListener ist bereits aktiv.");
    console.log(`[${TAG}] Bereits aktiv. Listener-ID:`, store.eventMessageListenerId);
    return;
  }

  const handler = async (payload) => {
    try {
      const content = payload?.content ?? "";
      if (!content) return;

      await ChatMessage.create({
        content,
        speaker: { alias: "JANUS7 Event" }
      });
    } catch (err) {
      console.error(`[${TAG}] Fehler beim Erzeugen der ChatMessage`, err, payload);
    }
  };

  // Foundry Hooks.on gibt bei v11+ eine ID zurück (number). Wir speichern sie zur optionalen Entfernung.
  const id = Hooks.on("janus7EventMessage", handler);
  store.eventMessageListenerId = id;
  store.eventMessageListenerHandler = handler;

  ui.notifications?.info?.("[JANUS7] EventMessageListener aktiv: Events werden im Chat ausgegeben.");
  console.log(`[${TAG}] Aktiv. Listener-ID:`, id);
  console.log(`[${TAG}] Zum Entfernen in der Konsole: Hooks.off("janus7EventMessage", _janus7Listeners.eventMessageListenerHandler)`);
})();

