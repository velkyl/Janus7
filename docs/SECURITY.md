# SECURITY – JANUS7

## Grundsatz
JANUS7 behandelt Eingaben (JSON, User-Input) als potenziell unsicher.

## Regeln
- Kein `eval()` auf externen Strings
- Validierung von Importdaten
- Keine stillen Schreiboperationen in Tests
- Logging ohne Geheimdaten

## GM-Zugriffsschutz in Action-Handlers

**Wichtig:** Template-`disabled`-Attribute sind reine UI-Hints. Ein Spieler kann jeden
`data-action`-Handler über die Browser-Konsole direkt aufrufen:
```js
app._onApply(new Event('click'));  // umgeht das disabled-Attribut vollständig
```

Alle mutierenden Action-Handler müssen daher als **erste Zeile** den Guard aufrufen:
```js
async _onMeineMutation(event) {
  if (!this._requireGM('meineMutation')) return;
  // ...
}
```

`_requireGM()` ist in `JanusBaseApp` definiert und steht allen Subklassen zur Verfügung.
Bei Nicht-GM: `ui.notifications.warn` + Log-Eintrag + `return false`.

### Faustregel: Wann ist `_requireGM()` Pflicht?

| Kategorie | Guard erforderlich |
|---|---|
| State-Mutation (apply, import) | Ja |
| Datei-Schreiben auf dem Server | Ja |
| SQL-Execution / Script-Execution | Ja |
| Journal-/Dokument-Mutation | Ja |
| Export in Textarea / Clipboard | Nein (read-only) |
| Diff-Preview (keine Mutation) | Nein |
| UI-State (Mode, Checkbox-Toggle) | Nein |

## TestRunner
Der Runner führt nur Code aus, der im Makro selbst definiert ist (`runFn`),
nicht frei eingeklebte externe Skripte.
