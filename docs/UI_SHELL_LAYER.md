
# JANUS7 UI Shell Layer

Stand: v0.9.12.44

## Ziel
Additive, modulare OberflÃ¤che innerhalb von JANUS7.
Sie ergÃ¤nzt die bestehenden Einzel-Apps und ersetzt sie nicht abrupt.

## Architektur
- `ui/apps/JanusShellApp.js`
  - Hauptfenster / Layer-Shell
  - View-State (`director`, `academy`, `tools`)
  - Panel-State (`scoring`, `social`, `diagnostics`, ...)
- `ui/layer/view-registry.js`
  - registriert die drei Haupt-Views
  - jede View baut ihr Modell Ã¼ber `build(engine)`
- `ui/layer/panel-registry.js`
  - registriert Panels als Metadaten + Builder
  - neue Panels werden hier additiv ergÃ¤nzt
- `ui/layer/action-router.js`
  - Action-Dispatch fÃ¼r Commands, App-Ã–ffnungen und Panel-Aktionen
- `ui/layer/bridge.js`
  - hÃ¤ngt die Shell als `engine.uiLayer.openShell()` ein
  - registriert einen Scene-Control-Button

## Erweiterung
### Neues Panel
1. Definition in `ui/layer/panel-registry.js` ergÃ¤nzen
2. optional `build(engine)` hinzufÃ¼gen
3. Buttons/Aktionen konfigurieren

### Neue View
1. `registerView({ id, title, icon, build })`
2. passendes Template `templates/shell/views/<id>.hbs`
3. Shell verwendet die View automatisch

## Zugriff
- `game.janus7.ui.open('shell')`
- `game.janus7.uiLayer.openShell()`
- Scene Controls: `JANUS Shell Ã¶ffnen`

