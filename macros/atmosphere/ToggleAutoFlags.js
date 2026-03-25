// JANUS7 – Atmosphere: Toggle Auto (Calendar/Event/Location)
const s = game.janus7.core.state;
const curCal = !!s.get("atmosphere.autoFromCalendar");
const curEv = !!s.get("atmosphere.autoFromEvents");
const curLoc = !!s.get("atmosphere.autoFromLocation");
const content = `
<form>
  <div class="form-group"><label><input type="checkbox" name="cal" ${curCal ? "checked" : ""}/> Calendar</label></div>
  <div class="form-group"><label><input type="checkbox" name="ev" ${curEv ? "checked" : ""}/> Events</label></div>
  <div class="form-group"><label><input type="checkbox" name="loc" ${curLoc ? "checked" : ""}/> Location</label></div>
</form>`;
new Dialog({
  title: "JANUS7 – Auto-Moods",
  content,
  buttons: {
    save: {
      label: "Save",
      callback: async (html) => {
        await game.janus7.atmosphere.setAutoFromCalendar(!!html.find('[name="cal"]').is(':checked'), { broadcast: true });
        await game.janus7.atmosphere.setAutoFromEvents(!!html.find('[name="ev"]').is(':checked'), { broadcast: true });
        await game.janus7.atmosphere.setAutoFromLocation(!!html.find('[name="loc"]').is(':checked'), { broadcast: true });
        ui.notifications.info("Auto-Moods aktualisiert");
      }
    }
  },
  default: "save"
}).render(true);
