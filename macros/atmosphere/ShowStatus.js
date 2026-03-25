// JANUS7 – Atmosphere: Status / Diagnose
const st = game.janus7.atmosphere.status();
const text = [
  `enabled: ${st.enabled}`,
  `isMaster: ${st.isMaster}`,
  `masterUserId: ${st.masterUserId}`,
  `activeMoodId: ${st.activeMoodId}`,
  `activeSource: ${st.activeSource}`,
  `overrideMoodId: ${st.overrideMoodId}`,
  `overrideUntil: ${st.overrideUntil}`,
  `cooldownMs: ${st.cooldownMs}`,
  `minDurationMs: ${st.minDurationMs}`,
  `masterVolume: ${st.masterVolume}`
].join("\n");
ChatMessage.create({ content: `<pre>${text}</pre>` });
