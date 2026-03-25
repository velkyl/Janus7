# JANUS7 – Nutzerhandbuch (v0.9.12.43)

**Stand:** 2026-03-25  
**Foundry:** v13+  
**Zielgruppe:** Spielleitung (GM) und fortgeschrittene Nutzer (Debug/IO optional)

Dieses Handbuch erklärt **wie JANUS7 in Foundry bedient wird**: Bedienlogik, Workflows, UI‑Apps, typische Fehlerbilder.
Es ersetzt **nicht** die Entwicklerdokumentation (Architektur/Code), sondern ist die **Alltagsanleitung**.

> **Wichtig (SSOT):**
> - **Build-/Modulversion**: `game.modules.get('Janus7')?.version` (bzw. `module.json`)
> - **State-Version**: `state.meta.version` bedeutet „State zuletzt gespeichert unter Modulversion X“.
>   Das ist **nicht** die laufende Build-Version.

---

## 1. Grundprinzipien

### 1.1 Rollen und Rechte
- **GM**: volle Steuerung (Director/Control Panel, Import/Export, Tests, Kill‑Switches).
- **Spieler**: je nach Konfiguration Sicht auf bestimmte Journals/Übersichten, in der Regel **keine** Admin‑Aktionen.

Viele Aktionen sind bewusst **GM‑only** (z. B. KI‑Import/Apply, TestRunner, System‑Toggles).

### 1.2 „Was ist JANUS7“ in 30 Sekunden
JANUS7 ist ein **Akademie‑Betriebssystem**: Zeit/Termine, Unterricht, Quests/Events, Social/Roster, Scoring (Häuser/Zirkel), Atmosphäre (Moods/Audio) plus **SSOT‑State** und eine **UI** zum Steuern.

### 1.3 SSOT und Persistenz
- JANUS7 hält einen **zentralen State** (Campaign State). Änderungen über UI/Commands werden in diesen State geschrieben.
- Der State wird gespeichert, sobald er als „dirty“ markiert und persistiert wird.
- Import/Export und Sync‑Features dienen dazu, State und Foundry‑Dokumente (Scenes/Journals/Playlists/Actors) konsistent zu halten.

---

## 2. Einstieg: Erste 10 Minuten

### 2.1 Installation (Kurz)
Siehe **`docs/INSTALLATION.md`**.

### 2.2 Modul starten und „läuft es?“ prüfen
1) Welt laden → als GM einloggen.
2) Öffne den **JANUS7 Director / Control Panel**.
3) Öffne das **Command Center**.
4) Führe (wenn du sicher gehen willst) den **Testkatalog** aus.

Wenn UI leer ist oder Aktionen „nichts tun“: siehe Abschnitt **9 Troubleshooting**.

---

## 3. Die wichtigsten Oberflächen

JANUS7 bringt mehrere **UI‑Apps**. Die zentrale Steuerung ist der **Director (Control Panel)**.

### 3.1 Director / Control Panel (Zentrale)
Der Director ist die GM‑Schaltzentrale. Er bündelt:
- Zeitsteuerung und „Jetzt“-Anzeige
- Slot‑Builder (Stunden/Slots aus Bausteinen)
- Quests (Journal + Vorschläge)
- People (Roster / Zuordnungen)
- Places (Orte/Verknüpfungen/Moods)
- KI Roundtrip (Phase 7, wenn aktiviert)
- Sync (Verknüpfungen Foundry ↔ JANUS)
- System (Tests, Kill‑Switches, Config)
- Diagnostics (Build‑Info, Engine‑Status)

**Tabs (Soll‑Design):**
- `overview`
- `schedule`
- `quests`
- `people`
- `places`
- `ki`
- `sync`
- `system`
- `diagnostics`

> Tipp: Wenn du dich nur an *eine* Oberfläche gewöhnst: **Director**.

### 3.2 Command Center
Das Command Center ist das „Terminal mit Buttons“.
- Es bietet kategorisierte Aktionen (Diagnose, Daten, IO, System, Tests, etc.).
- Es ist ideal, um Dinge reproduzierbar auszuführen (und sich nicht durch Tabs zu klicken).

### 3.3 Academy Overview
Die Academy Overview dient als **Übersicht** (typisch: Woche/Slots, Navigation, Statusanzeigen). Je nach Build kann sie auch Slot‑Setzen/Navigation unterstützen.

### 3.4 Scoring View
Scoring verwaltet **Zirkel/Häuser** und Punkte.
- Zirkel/Häuser anlegen
- Punkte vergeben
- Leaderboard anzeigen

### 3.5 Social View
Social verwaltet Beziehungen/NPC‑Kontext.
- Zuordnung von Lehrern/Schülern/NSCs
- (Optional) Beziehung/Attitude‑Logik, Auswertung

### 3.6 Atmosphere DJ
Atmosphere DJ steuert Moods/Audio:
- Mood auswählen
- Volumes/Kanäle
- Auto‑Flags / Trigger

### 3.7 State Inspector
Read‑Only Blick in den State (Debug). Perfekt, um zu prüfen:
- „Ist mein Klick überhaupt im State angekommen?“
- „Welche Keys/IDs existieren?“

### 3.8 Config Panel / Sync Panel
- **Config Panel**: Feature‑Flags, Mapping‑Einstellungen, Systemparameter.
- **Sync Panel**: Verknüpfung und Abgleich zwischen JANUS‑State und Foundry‑Dokumenten.

---

## 4. Zeit & Kalender bedienen

JANUS7 verwendet ein Akademie‑Zeitmodell (Year/Trimester/Week/Day/Slot). Es gibt zwei typische Nutzungsarten:

### 4.1 „Wir spielen live“ (Session‑Betrieb)
- Zu Beginn: „Jetzt“ korrekt setzen.
- Während der Session: Slots/Phasen/Tag fortschreiben.
- Bei Szenenwechsel: Orte/Moods passend setzen.

### 4.2 „Ich plane vor“ (Prep‑Betrieb)
- Woche/Trimester setzen
- Slots mit Unterricht/Events füllen
- Quest‑Vorschläge prüfen und aktivieren

### 4.3 Bedienmuster
Je nach UI‑Stand:
- Im Director‑Tab `overview`/`schedule` existieren Buttons für `+1 Slot`, `+1 Phase`, `+1 Tag`.
- Alternativ im Command Center entsprechende Commands.

**Konsole (optional):**
```js
await game.janus7.commands.advanceSlot({ steps: 1 });
await game.janus7.commands.advancePhase({ steps: 1 });
await game.janus7.commands.advanceDay({ steps: 1 });
await game.janus7.commands.setSlot({ dayIndex: 0, slotIndex: 2 });
```

---

## 5. Stundenplan & Slot‑Builder (Schedule)

Der Slot‑Builder ist dafür gedacht, aus mehreren Elementen (Bausteinen) eine „Stunde“ / einen Slot zusammenzustellen und daraus z. B. ein Journal zu generieren.

### 5.1 Grundidee
- Du sammelst Inhalte (Lehrstoff, Szene, NPCs, Orte, Notizen) in einer Builder‑Liste.
- Dann generierst du daraus ein **Journal** oder einen **verknüpften Termin**.

### 5.2 Drag & Drop (Soll)
Im Director sind Drop‑Zonen vorgesehen:
- `slot-builder` → Elemente landen in der Builder‑Liste
- `people` → Zuordnung zu Rollen (Lehrer/Schüler/NSCs)
- `location` → Orte/Szenen/Playlists/Journals verlinken
- `ki-context` → Kontext‑Hints sammeln

Wenn Drag & Drop in deinem Build noch nicht vollständig „schön“ ist: siehe **9.4**.

### 5.3 Generierung: Journal/Termin
Der konkrete Ablauf hängt davon ab, welche Generator‑Funktionen im Build freigeschaltet sind.
Erwarte:
- Builder‑Liste → „Erzeugen“ → Journal wird angelegt
- Slot/Termin bekommt Verweise (Journal, Scene, People, Mood)

---

## 6. Quests (Phase 4b)

### 6.1 Ziel
Quests geben dem Akademiealltag Struktur:
- Aufgaben, Aufträge, Prüfungen, Gerüchte, Beziehungen
- Vorschläge abhängig vom aktuellen State (Zeit, Trimester, Roster, Orte)

### 6.2 Quest‑Journal öffnen
Im Director gibt es eine Aktion „Quest‑Journal öffnen“.

### 6.3 Quest‑Vorschläge
Im Director existiert eine Aktion „Quest‑Vorschläge“.
- Erwartung: JANUS7 generiert Vorschläge aus State‑Parametern.
- Vorschläge sollten als **Textfelder** erscheinen (damit du überschreiben kannst).

### 6.4 Lifecycle (typisch)
- Vorschlag → Aktivieren
- Aktiv → Fortschritt/Notizen
- Erledigt → Archiv

---

## 7. Scoring (Zirkel/Häuser)

### 7.1 Zirkel/Häuser anlegen
1) Öffne **Scoring View**.
2) „Zirkel/Haus anlegen“.
3) **ID/Name** vergeben (kurz, stabil).
4) Optional: Initial‑Score.

**Empfehlung für IDs:**
- Keine Leerzeichen
- Stabil (wird als Key gespeichert)
- Beispiel: `Haus_Feuerturm`, `Zirkel_Smaragd`

### 7.2 Punkte vergeben
- Zirkel auswählen
- Punkte/Grund setzen
- Speichern

### 7.3 Typische Fehler
- „Zirkel existiert nicht“ → ID falsch geschrieben oder noch nicht angelegt.
- „Punkte verschwinden“ → State nicht gespeichert (siehe 9).

---

## 8. People & Places

### 8.1 People (Roster)
Ziel: Lehrkräfte/Schüler/NSCs als **Roster** im State halten.

Typischer Flow:
1) Director → Tab `people`
2) Actors (Lehrer/Schüler/NSCs) hineinziehen
3) Rollen zuweisen

### 8.2 Places (Orte)
Ziel: Orte mit Foundry‑Dokumenten verbinden:
- Scene
- Playlist / Audio
- Journal
- Default Mood

Typischer Flow:
1) Director → Tab `places`
2) Scene/Playlist/Journal per Drag&Drop zuordnen
3) Default Mood setzen

---

## 9. Troubleshooting (Nutzer‑Sicht)

### 9.1 „UI öffnet, aber zeigt keine Daten“
Checkliste:
1) Bist du **GM**?
2) Ist `game.janus7` vorhanden?
3) Ist der State geladen (State Inspector öffnen)?
4) Gibt es Fehlermeldungen in der Browser‑Konsole?

### 9.2 „Buttons tun nichts“
- Häufigste Ursache: Aktion ist GM‑only.
- Oder: Feature‑Flag deaktiviert.
- Oder: Fehler im Render/Template.

### 9.3 „Versionen wirken unterschiedlich (0.9.9.x)“
- Build-Version aus `game.modules.get('Janus7')?.version`.
- State-Version ist historisch.

### 9.4 „Drag & Drop geht nicht“
- Manche Drop‑Zonen sind nur aktiv, wenn du exakt den richtigen Dokument‑Typ dropst (Actor vs Scene vs Playlist).
- Prüfe, ob du aus der Sidebar den richtigen Typ ziehst.
- Wenn es weiterhin nicht geht: Konsole prüfen (Fehler beim drop‑Handler).

### 9.5 Wenn gar nichts mehr geht
- TestRunner ausführen (Full Catalog), Ergebnis anschauen.
- `docs/TROUBLESHOOTING.md` nutzen.

---

## 10. Praxis-Workflows

### 10.1 Session‑Start (GM)
1) Director öffnen
2) Diagnostics: Engine‑Status ok?
3) Zeit „Jetzt“ setzen
4) Orte/Moods vorbereiten
5) Quests prüfen (was ist heute dran?)

### 10.2 Unterricht/Slot planen
1) Schedule/Slot‑Builder öffnen
2) Bausteine sammeln (Lehrstoff, NPC, Ort, Notizen)
3) Journal erzeugen
4) Slot verlinken (Scene/Mood/People)

### 10.3 Scoring nach Szenen
1) Scoring View öffnen
2) Zirkel wählen
3) Award/Punkte vergeben

---

## 11. Glossar
- **Director**: Zentrale GM‑UI (Control Panel)
- **Slot**: Zeiteinheit im Tagesplan (z. B. Unterrichtsstunde)
- **Phase**: gröbere Einteilung (z. B. Morgen/Mittag/Abend)
- **Roster**: People‑Liste im State (Lehrer/Schüler/NSCs)
- **Mood**: Atmosphere‑Kontext (Audio/Playlist/Theme)
- **SSOT**: Single Source of Truth (State + Modulversion)

---

## 12. Änderungslog des Handbuchs
- v0.9.9.24: Erstfassung „komplettes Handbuch ohne Bilder“ (Workflows + UI‑Orientierung)
