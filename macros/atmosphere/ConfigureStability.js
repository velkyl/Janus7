// JANUS7 – Atmosphere: Configure Stability (Cooldown/MinDuration/Override)
const s = game.janus7.core.state;
const cooldownMs = Number(s.get("atmosphere.cooldownMs") ?? 5000);
const minDurationMs = Number(s.get("atmosphere.minDurationMs") ?? 30000);
const eventOverrideMs = Number(s.get("atmosphere.eventOverrideMs") ?? 600000);
const content = `
<form>
  <div class="form-group"><label>Cooldown (ms)</label><input type="number" name="cooldownMs" value="${cooldownMs}" min="0" step="1000"/></div>
  <div class="form-group"><label>Min Duration (ms)</label><input type="number" name="minDurationMs" value="${minDurationMs}" min="0" step="1000"/></div>
  <div class="form-group"><label>Event Override (ms)</label><input type="number" name="eventOverrideMs" value="${eventOverrideMs}" min="0" step="10000"/></div>
</form>`;
new Dialog({
  title: "JANUS7 – Atmosphere Stability",
  content,
  buttons: {
    save: {
      label: "Save",
      callback: async (html) => {
        const c = Number(html.find('[name="cooldownMs"]').val()) || 0;
        const m = Number(html.find('[name="minDurationMs"]').val()) || 0;
        const e = Number(html.find('[name="eventOverrideMs"]').val()) || 0;
        await s.transaction(async (st) => {
          st.set("atmosphere.cooldownMs", Math.max(0, c));
          st.set("atmosphere.minDurationMs", Math.max(0, m));
          st.set("atmosphere.eventOverrideMs", Math.max(0, e));
        });
        await s.save({ force: true });
        ui.notifications.info("Atmosphere Stability gespeichert");
      }
    }
  },
  default: "save"
}).render(true);
