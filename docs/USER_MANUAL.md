# JANUS7 â€“ Nutzerhandbuch (v0.9.12.44)

**Stand:** 2026-03-25  
**Foundry:** v13+  
**Zielgruppe:** Spielleitung (GM) und fortgeschrittene Nutzer (Debug/IO optional)

Dieses Handbuch erklÃ¤rt **wie JANUS7 in Foundry bedient wird**: Bedienlogik, Workflows, UIâ€‘Apps, typische Fehlerbilder.
Es ersetzt **nicht** die Entwicklerdokumentation (Architektur/Code), sondern ist die **Alltagsanleitung**.

> **Wichtig (SSOT):**
> - **Build-/Modulversion**: `game.modules.get('Janus7')?.version` (bzw. `module.json`)
> - **State-Version**: `state.meta.version` bedeutet â€žState zuletzt gespeichert unter Modulversion Xâ€œ.
>   Das ist **nicht** die laufende Build-Version.

---

## 1. Grundprinzipien

### 1.1 Rollen und Rechte
- **GM**: volle Steuerung (Director/Control Panel, Import/Export, Tests, Killâ€‘Switches).
- **Spieler**: je nach Konfiguration Sicht auf bestimmte Journals/Ãœbersichten, in der Regel **keine** Adminâ€‘Aktionen.

Viele Aktionen sind bewusst **GMâ€‘only** (z. B. KIâ€‘Import/Apply, TestRunner, Systemâ€‘Toggles).

### 1.2 â€žWas ist JANUS7â€œ in 30 Sekunden
JANUS7 ist ein **Akademieâ€‘Betriebssystem**: Zeit/Termine, Unterricht, Quests/Events, Social/Roster, Scoring (HÃ¤user/Zirkel), AtmosphÃ¤re (Moods/Audio) plus **SSOTâ€‘State** und eine **UI** zum Steuern.

### 1.3 SSOT und Persistenz
- JANUS7 hÃ¤lt einen **zentralen State** (Campaign State). Ã„nderungen Ã¼ber UI/Commands werden in diesen State geschrieben.
- Der State wird gespeichert, sobald er als â€ždirtyâ€œ markiert und persistiert wird.
- Import/Export und Syncâ€‘Features dienen dazu, State und Foundryâ€‘Dokumente (Scenes/Journals/Playlists/Actors) konsistent zu halten.

---

## 2. Einstieg: Erste 10 Minuten

### 2.1 Installation (Kurz)
Siehe **`docs/INSTALLATION.md`**.

### 2.2 Modul starten und â€žlÃ¤uft es?â€œ prÃ¼fen
1) Welt laden â†’ als GM einloggen.
2) Ã–ffne den **JANUS7 Director / Control Panel**.
3) Ã–ffne das **Command Center**.
4) FÃ¼hre (wenn du sicher gehen willst) den **Testkatalog** aus.

Wenn UI leer ist oder Aktionen â€žnichts tunâ€œ: siehe Abschnitt **9 Troubleshooting**.

---

## 3. Die wichtigsten OberflÃ¤chen

JANUS7 bringt mehrere **UIâ€‘Apps**. Die zentrale Steuerung ist der **Director (Control Panel)**.

### 3.1 Director / Control Panel (Zentrale)
Der Director ist die GMâ€‘Schaltzentrale. Er bÃ¼ndelt:
- Zeitsteuerung und â€žJetztâ€œ-Anzeige
- Slotâ€‘Builder (Stunden/Slots aus Bausteinen)
- Quests (Journal + VorschlÃ¤ge)
- People (Roster / Zuordnungen)
- Places (Orte/VerknÃ¼pfungen/Moods)
- KI Roundtrip (Phase 7, wenn aktiviert)
- Sync (VerknÃ¼pfungen Foundry â†” JANUS)
- System (Tests, Killâ€‘Switches, Config)
- Diagnostics (Buildâ€‘Info, Engineâ€‘Status)

**Tabs (Sollâ€‘Design):**
- `overview`
- `schedule`
- `quests`
- `people`
- `places`
- `ki`
- `sync`
- `system`
- `diagnostics`

> Tipp: Wenn du dich nur an *eine* OberflÃ¤che gewÃ¶hnst: **Director**.

### 3.2 Command Center
Das Command Center ist das â€žTerminal mit Buttonsâ€œ.
- Es bietet kategorisierte Aktionen (Diagnose, Daten, IO, System, Tests, etc.).
- Es ist ideal, um Dinge reproduzierbar auszufÃ¼hren (und sich nicht durch Tabs zu klicken).

### 3.3 Academy Overview
Die Academy Overview dient als **Ãœbersicht** (typisch: Woche/Slots, Navigation, Statusanzeigen). Je nach Build kann sie auch Slotâ€‘Setzen/Navigation unterstÃ¼tzen.

### 3.4 Scoring View
Scoring verwaltet **Zirkel/HÃ¤user** und Punkte.
- Zirkel/HÃ¤user anlegen
- Punkte vergeben
- Leaderboard anzeigen

### 3.5 Social View
Social verwaltet Beziehungen/NPCâ€‘Kontext.
- Zuordnung von Lehrern/SchÃ¼lern/NSCs
- (Optional) Beziehung/Attitudeâ€‘Logik, Auswertung

### 3.6 Atmosphere DJ
Atmosphere DJ steuert Moods/Audio:
- Mood auswÃ¤hlen
- Volumes/KanÃ¤le
- Autoâ€‘Flags / Trigger

### 3.7 State Inspector
Readâ€‘Only Blick in den State (Debug). Perfekt, um zu prÃ¼fen:
- â€žIst mein Klick Ã¼berhaupt im State angekommen?â€œ
- â€žWelche Keys/IDs existieren?â€œ

### 3.8 Config Panel / Sync Panel
- **Config Panel**: Featureâ€‘Flags, Mappingâ€‘Einstellungen, Systemparameter.
- **Sync Panel**: VerknÃ¼pfung und Abgleich zwischen JANUSâ€‘State und Foundryâ€‘Dokumenten.

---

## 4. Zeit & Kalender bedienen

JANUS7 verwendet ein Akademieâ€‘Zeitmodell (Year/Trimester/Week/Day/Slot). Es gibt zwei typische Nutzungsarten:

### 4.1 â€žWir spielen liveâ€œ (Sessionâ€‘Betrieb)
- Zu Beginn: â€žJetztâ€œ korrekt setzen.
- WÃ¤hrend der Session: Slots/Phasen/Tag fortschreiben.
- Bei Szenenwechsel: Orte/Moods passend setzen.

### 4.2 â€žIch plane vorâ€œ (Prepâ€‘Betrieb)
- Woche/Trimester setzen
- Slots mit Unterricht/Events fÃ¼llen
- Questâ€‘VorschlÃ¤ge prÃ¼fen und aktivieren

### 4.3 Bedienmuster
Je nach UIâ€‘Stand:
- Im Directorâ€‘Tab `overview`/`schedule` existieren Buttons fÃ¼r `+1 Slot`, `+1 Phase`, `+1 Tag`.
- Alternativ im Command Center entsprechende Commands.

**Konsole (optional):**
```js
await game.janus7.commands.advanceSlot({ steps: 1 });
await game.janus7.commands.advancePhase({ steps: 1 });
await game.janus7.commands.advanceDay({ steps: 1 });
await game.janus7.commands.setSlot({ dayIndex: 0, slotIndex: 2 });
```

---

## 5. Stundenplan & Slotâ€‘Builder (Schedule)

Der Slotâ€‘Builder ist dafÃ¼r gedacht, aus mehreren Elementen (Bausteinen) eine â€žStundeâ€œ / einen Slot zusammenzustellen und daraus z. B. ein Journal zu generieren.

### 5.1 Grundidee
- Du sammelst Inhalte (Lehrstoff, Szene, NPCs, Orte, Notizen) in einer Builderâ€‘Liste.
- Dann generierst du daraus ein **Journal** oder einen **verknÃ¼pften Termin**.

### 5.2 Drag & Drop (Soll)
Im Director sind Dropâ€‘Zonen vorgesehen:
- `slot-builder` â†’ Elemente landen in der Builderâ€‘Liste
- `people` â†’ Zuordnung zu Rollen (Lehrer/SchÃ¼ler/NSCs)
- `location` â†’ Orte/Szenen/Playlists/Journals verlinken
- `ki-context` â†’ Kontextâ€‘Hints sammeln

Wenn Drag & Drop in deinem Build noch nicht vollstÃ¤ndig â€žschÃ¶nâ€œ ist: siehe **9.4**.

### 5.3 Generierung: Journal/Termin
Der konkrete Ablauf hÃ¤ngt davon ab, welche Generatorâ€‘Funktionen im Build freigeschaltet sind.
Erwarte:
- Builderâ€‘Liste â†’ â€žErzeugenâ€œ â†’ Journal wird angelegt
- Slot/Termin bekommt Verweise (Journal, Scene, People, Mood)

---

## 6. Quests (Phase 4b)

### 6.1 Ziel
Quests geben dem Akademiealltag Struktur:
- Aufgaben, AuftrÃ¤ge, PrÃ¼fungen, GerÃ¼chte, Beziehungen
- VorschlÃ¤ge abhÃ¤ngig vom aktuellen State (Zeit, Trimester, Roster, Orte)

### 6.2 Questâ€‘Journal Ã¶ffnen
Im Director gibt es eine Aktion â€žQuestâ€‘Journal Ã¶ffnenâ€œ.

### 6.3 Questâ€‘VorschlÃ¤ge
Im Director existiert eine Aktion â€žQuestâ€‘VorschlÃ¤geâ€œ.
- Erwartung: JANUS7 generiert VorschlÃ¤ge aus Stateâ€‘Parametern.
- VorschlÃ¤ge sollten als **Textfelder** erscheinen (damit du Ã¼berschreiben kannst).

### 6.4 Lifecycle (typisch)
- Vorschlag â†’ Aktivieren
- Aktiv â†’ Fortschritt/Notizen
- Erledigt â†’ Archiv

---

## 7. Scoring (Zirkel/HÃ¤user)

### 7.1 Zirkel/HÃ¤user anlegen
1) Ã–ffne **Scoring View**.
2) â€žZirkel/Haus anlegenâ€œ.
3) **ID/Name** vergeben (kurz, stabil).
4) Optional: Initialâ€‘Score.

**Empfehlung fÃ¼r IDs:**
- Keine Leerzeichen
- Stabil (wird als Key gespeichert)
- Beispiel: `Haus_Feuerturm`, `Zirkel_Smaragd`

### 7.2 Punkte vergeben
- Zirkel auswÃ¤hlen
- Punkte/Grund setzen
- Speichern

### 7.3 Typische Fehler
- â€žZirkel existiert nichtâ€œ â†’ ID falsch geschrieben oder noch nicht angelegt.
- â€žPunkte verschwindenâ€œ â†’ State nicht gespeichert (siehe 9).

---

## 8. People & Places

### 8.1 People (Roster)
Ziel: LehrkrÃ¤fte/SchÃ¼ler/NSCs als **Roster** im State halten.

Typischer Flow:
1) Director â†’ Tab `people`
2) Actors (Lehrer/SchÃ¼ler/NSCs) hineinziehen
3) Rollen zuweisen

### 8.2 Places (Orte)
Ziel: Orte mit Foundryâ€‘Dokumenten verbinden:
- Scene
- Playlist / Audio
- Journal
- Default Mood

Typischer Flow:
1) Director â†’ Tab `places`
2) Scene/Playlist/Journal per Drag&Drop zuordnen
3) Default Mood setzen

---

## 9. Troubleshooting (Nutzerâ€‘Sicht)

### 9.1 â€žUI Ã¶ffnet, aber zeigt keine Datenâ€œ
Checkliste:
1) Bist du **GM**?
2) Ist `game.janus7` vorhanden?
3) Ist der State geladen (State Inspector Ã¶ffnen)?
4) Gibt es Fehlermeldungen in der Browserâ€‘Konsole?

### 9.2 â€žButtons tun nichtsâ€œ
- HÃ¤ufigste Ursache: Aktion ist GMâ€‘only.
- Oder: Featureâ€‘Flag deaktiviert.
- Oder: Fehler im Render/Template.

### 9.3 â€žVersionen wirken unterschiedlich (0.9.9.x)â€œ
- Build-Version aus `game.modules.get('Janus7')?.version`.
- State-Version ist historisch.

### 9.4 â€žDrag & Drop geht nichtâ€œ
- Manche Dropâ€‘Zonen sind nur aktiv, wenn du exakt den richtigen Dokumentâ€‘Typ dropst (Actor vs Scene vs Playlist).
- PrÃ¼fe, ob du aus der Sidebar den richtigen Typ ziehst.
- Wenn es weiterhin nicht geht: Konsole prÃ¼fen (Fehler beim dropâ€‘Handler).

### 9.5 Wenn gar nichts mehr geht
- TestRunner ausfÃ¼hren (Full Catalog), Ergebnis anschauen.
- `docs/TROUBLESHOOTING.md` nutzen.

---

## 10. Praxis-Workflows

### 10.1 Sessionâ€‘Start (GM)
1) Director Ã¶ffnen
2) Diagnostics: Engineâ€‘Status ok?
3) Zeit â€žJetztâ€œ setzen
4) Orte/Moods vorbereiten
5) Quests prÃ¼fen (was ist heute dran?)

### 10.2 Unterricht/Slot planen
1) Schedule/Slotâ€‘Builder Ã¶ffnen
2) Bausteine sammeln (Lehrstoff, NPC, Ort, Notizen)
3) Journal erzeugen
4) Slot verlinken (Scene/Mood/People)

### 10.3 Scoring nach Szenen
1) Scoring View Ã¶ffnen
2) Zirkel wÃ¤hlen
3) Award/Punkte vergeben

---

## 11. Glossar
- **Director**: Zentrale GMâ€‘UI (Control Panel)
- **Slot**: Zeiteinheit im Tagesplan (z. B. Unterrichtsstunde)
- **Phase**: grÃ¶bere Einteilung (z. B. Morgen/Mittag/Abend)
- **Roster**: Peopleâ€‘Liste im State (Lehrer/SchÃ¼ler/NSCs)
- **Mood**: Atmosphereâ€‘Kontext (Audio/Playlist/Theme)
- **SSOT**: Single Source of Truth (State + Modulversion)

---

## 12. Ã„nderungslog des Handbuchs
- v0.9.9.24: Erstfassung â€žkomplettes Handbuch ohne Bilderâ€œ (Workflows + UIâ€‘Orientierung)

