// JANUS7 – Atmosphere: Apply Mood…
const moods = await game.janus7.atmosphere.listMoods();
const options = moods.map(m => `<option value="${m.id}">${m.name ?? m.id}</option>`).join("");
const content = `
<form>
  <div class="form-group">
    <label>Mood</label>
    <select name="moodId">${options}</select>
  </div>
</form>`;
new Dialog({
  title: "JANUS7 – Apply Mood",
  content,
  buttons: {
    apply: {
      label: "Apply",
      callback: async (html) => {
        const moodId = html.find('[name="moodId"]').val();
        await game.janus7.atmosphere.applyMood(moodId, { broadcast: true, force: true });
        ui.notifications.info(`Mood angewendet: ${moodId}`);
      }
    },
    stop: {
      label: "Stop All",
      callback: async () => {
        await game.janus7.atmosphere.stopAll({ broadcast: true });
      }
    }
  },
  default: "apply"
}).render(true);
