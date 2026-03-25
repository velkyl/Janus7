// JANUS7 – Atmosphere: Enable
await game.janus7.core.state.transaction(async (s) => {
  s.set("features.atmosphere.enabled", true);
});
await game.janus7.core.state.save({ force: true });
ui.notifications.info("JANUS7 Atmosphere: enabled");
