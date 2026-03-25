# JANUS7 Welle 2 Content-Pack

Dieses Paket baut auf deiner angereicherten `AkademieJSON.zip` auf und erweitert den Akademie-Alltag deutlich.

## Welle-2-Schwerpunkte
- **Akademiealltag**: Morgen-, Mensa-, Nacht- und Explorations-Events sind jetzt in die JANUS-Indizes verdrahtet.
- **Studium & Wahlpflicht**: Kraftlinienmagie, Vergleichende Druidenmagie, Artefaktbindung, Disputatio und Meditationsklausuren.
- **Zirkel & Intrigen**: Orior, Rohals Erben, Societas Prodigiosis.
- **Life-of-a-Wizard-Flair**: Mensa-Szenen, Strafdienst, verlorene Tiere, kleine Demütigungen, geheime Treffen.
- **Neue Räume**: Prima Culina, Karzer, Thaumatoturris, Kartensaal, Collegium Nandurium, versiegelter Nordturm, Akademiegarten.

## Enthalten
- 15 neue Lessons
- 7 neue Locations
- 8 neue Bibliothekseinträge
- 8 neue NPCs
- 19 neue Kalender-/Slot-Einträge
- 6 neue JANUS-Quests
- 44 neu verdrahtete/ergänzte Events
- 48 neue Optionen

## Einspielen
1. Foundry beenden.
2. Backup von `Data/modules/janus7/` anlegen.
3. ZIP entpacken.
4. Die enthaltenen Dateien **über** deinen bestehenden Modulordner kopieren.
5. Foundry starten.
6. Als GM deine World öffnen.
7. Dann in der Browser-Konsole oder über den Command Center:
```js
await game.janus7.ui.commands.execute('seedImportAcademyToJournals', { mode: 'merge' });
await game.janus7.ui.commands.execute('openAcademyDataStudio');
```

## Prüfliste
- Lessons erscheinen im Academy Data Studio
- Neue Orte sind im Datensatz vorhanden
- Event-Index enthält `morgen`, `mensa`, `nacht`, `study_intrigue`, `study_minor`
- Quests `Q_NORDTURM_LIGHTS`, `Q_PRODIGIOSIS_INITIATION`, `Q_THAUMATOTURRIS_BINDING`, `Q_CULINA_FAVOR`, `Q_FAMILIAR_FUGITIVE`, `Q_ORIOR_VS_ROHAL` sind gelistet

## Hinweis
Das Pack ist ein **Content-Overlay**, kein Modulcode-Release.
