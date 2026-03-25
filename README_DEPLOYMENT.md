# JANUS7 Deployment / Update (Foundry v13+)

Dieses Dokument beschreibt die **praktische Installation**, Updates und typische Fehlerbilder.

## Installation (frisch)
1. Foundry beenden.
2. `Data/modules/` öffnen.
3. Ordner `janus7/` anlegen (falls noch nicht vorhanden).
4. ZIP-Inhalt **in genau diesen Ordner** entpacken, so dass `Data/modules/janus7/module.json` existiert.
5. Foundry starten → Welt öffnen → **Modul „JANUS7“ aktivieren**.
6. Browser-Client: **Hard Reload** (Strg+F5), damit alte JS-Caches weg sind.

## Update (beste Praxis)
1. Foundry beenden.
2. Alten Ordner `Data/modules/janus7/` löschen oder umbenennen (Backup optional).
3. Neue Version nach `Data/modules/janus7/` entpacken.
4. Foundry starten → Welt öffnen → Hard Reload.

**Anti-Pattern (bitte nicht):**
- ZIP „drüber entpacken“ und hoffen. Das produziert genau die Art von Mischzustand, den du gerade siehst.
- Den Modulordner falsch benennen (z. B. `janus7-v0.8.10` statt `janus7`).

## Funktionstest
- Öffne in Foundry: *Einstellungen → Modul-Einstellungen* → **JANUS7 Control Panel**.
- Öffne: *Einstellungen → Modul-Einstellungen* → **JANUS7 Test Runner** → „Full Catalog“.

Wenn der UI-Attach wieder wegbricht, ist das ein harter Indikator für fehlende/defekte Dateien (404) oder einen Mischzustand.

## Troubleshooting (schnell)
### Symptom: „Failed to fetch dynamically imported module …/ui/index.js“
Das ist fast immer **kein Cache-Problem**, sondern:
- eine Datei fehlt (Zip-Entpacken unvollständig / Antivirus / falscher Pfad), oder
- ein Untermodul von `ui/index.js` fehlt (Browser meldet es nur indirekt), oder
- du hast noch Alt- und Neu-Dateien gemischt.

**Sofort-Check:**
- Browser öffnen: `http://localhost:30000/modules/janus7/ui/index.js`
  - Wenn das **nicht** als JS angezeigt wird → Server liefert nicht die Datei, sondern 404/HTML.
  - Dann: sauber neu installieren wie oben.

## Versionsquelle (SSOT)
- **Single Source of Truth:** `module.json` (Feld `version`).
- Zusatz: `VERSION.json` ist die Release-Historie.
