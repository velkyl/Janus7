// JANUS7 – Atmosphere: Master Volume…
const s = game.janus7.core.state;
const cur = Number(s.get("atmosphere.masterVolume") ?? 1.0);
const content = `
<form>
  <div class="form-group">
    <label>Master Volume (0.0 – 1.0)</label>
    <input type="range" name="mv" min="0" max="1" step="0.05" value="${cur}"/>
    <p class="notes">Aktuell: ${cur}</p>
  </div>
</form>`;
new Dialog({
  title: "JANUS7 – Master Volume",
  content,
  buttons: {
    save: {
      label: "Save",
      callback: async (html) => {
        const v = Number(html.find('[name="mv"]').val());
        await game.janus7.atmosphere.setMasterVolume(v, { broadcast: true });
        ui.notifications.info(`Master Volume gesetzt: ${v}`);
      }
    }
  },
  default: "save"
}).render(true);
