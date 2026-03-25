# SECURITY – JANUS7

## Grundsatz
JANUS7 behandelt Eingaben (JSON, User-Input) als potenziell unsicher.

## Regeln
- Kein `eval()` auf externen Strings
- Validierung von Importdaten
- Keine stillen Schreiboperationen in Tests
- Logging ohne Geheimdaten

## TestRunner
Der Runner führt nur Code aus, der im Makro selbst definiert ist (`runFn`),
nicht frei eingeklebte externe Skripte.
