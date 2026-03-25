// JANUS7 – Atmosphere: Disable
await game.janus7.core.state.transaction(async (s) => {
  s.set("features.atmosphere.enabled", false);
});
await game.janus7.core.state.save({ force: true });
ui.notifications.info("JANUS7 Atmosphere: disabled");
