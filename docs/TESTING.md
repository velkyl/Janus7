# TESTING – JANUS7

## Ziel
Der Testbereich soll **sichtbar**, **ehrlich** und **betrieblich nützlich** sein.
Nicht jeder shipped Test ist automatisch bindend oder automatisierbar. Deshalb trennt JANUS7 ab `0.9.9.44` strikt zwischen Sichtbarkeit und Ausführbarkeit.

## Testklassen
- **binding**: kleine, harte Pflichtmenge. Release-relevant.
- **extended-auto**: weitere automatisierte Tests, nützlich für Breite, aber nicht automatisch Release-Gate.
- **manual**: shipped Testdefinitionen / Checklisten / Snippets, standardmäßig nicht autorun.
- **catalog-only**: Metadaten aus dem JSON-Katalog ohne geladene Testdatei.

## Default-Verhalten des Runners
Standardlauf zeigt **alle** registrierten Tests, führt aber nur aus:
- `kind=auto` in `binding` und `extended-auto`

Standardlauf führt **nicht automatisch** aus:
- `manual`
- `catalog-only`
- `import-failed`

Diese erscheinen stattdessen explizit als:
- `MANUAL`
- `CATALOG`
- `IMPORT_FAILED`

## UI-Sichtbarkeit
Die Test-UI zeigt jetzt:
- KPIs: Gesamt, Auto aktiv, PASS, FAIL, ERROR, Importfehler, Manuell, Katalog
- Suite-Metriken pro Klasse
- Filter nach **Phase**, **Klasse**, **Status**

## Operative Regel
Ein grüner Auto-Lauf bedeutet jetzt nur noch:
- die aktive Auto-Menge ist grün
- nicht: dass alle shipped Tests automatisch ausgeführt wurden

Genau so soll es sein. Alles andere wäre ein Beruhigungsmittel mit hübscher Farbe.
