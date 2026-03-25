# DEVELOPMENT – JANUS7

## Coding Standards
- ESM Imports/Exports (Foundry v13+)
- Keine deprecated APIs (V1 Application, global JournalSheet etc.)
- Keine globalen Side-Effects außerhalb von Hooks

## JSDoc / Kommentare
- Öffentliche APIs (Bridge/Core) **müssen** JSDoc haben.
- Kommentare erklären “Warum”, nicht “Was”.
- Kein toter Kommentar-Müll.

## Error Handling
- Fehler sind Daten: klare Error-Typen (siehe `core/errors.js`, `bridge/dsa5/errors.js`)
- Logs sind strukturiert (keine willkürlichen console.logs im Produktivpfad)

## Release-Vorgehen (Kurzform)
1. TestRunner (bis Zielphase) ausführen
2. Logs sichern (TXT+JSON)
3. CHANGELOG aktualisieren
4. Version in `module.json` bumpen
5. ZIP bauen

Details: `docs/RELEASE.md`

## Best Practices

### 10.4 Foundry V13 & ApplicationV2 Fallstricke (Migration Traps)

1. **Scene Controls (`getSceneControlButtons`)**
   Tools, die über diesen Hook in die linke Werkzeugleiste (z. B. unter "Tokens") gepusht werden, **müssen** in Foundry V13 das Property `button: true` erhalten. Andernfalls behandelt die Canvas/UI-Logik das Tool je nach Build als unsichtbares State-Toggle und rendert keinen klickbaren Button.

2. **Tab-Navigation (`ApplicationV2` Tabs)**
   Wenn in einer `ApplicationV2`-Klasse unter `DEFAULT_OPTIONS.window.tabs` eine `group` gesetzt wird (z. B. `group: "main"`), erwartet der Tab-Binder passende HTML-Attribute `data-group="main"` sowohl im Tab-Nav als auch in den Tab-Panels. Fehlen diese im `.hbs`-Template, sind die Tabs funktional "tot".

   *Best Practice:* Bei einfachen Single-Layer-Tabs die `group` im JS weglassen und das Default-Verhalten nutzen, oder konsequent `data-group` in HBS nachziehen.
