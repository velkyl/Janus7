**JANUS7**

Zauberakademie-Betriebssystem

Betriebsanleitung v3

Quickstart · Setup · Workflows · Wartung · Troubleshooting

v0.9.12.42 · Foundry VTT v13+ · DSA5 · März 2026

🖱️ UI-Standardpfad ⌨️ Konsole 🎲 GM only 🧙 Spieler ⚙️ Automatisch ✅ Tip ⚠️ Warn 🚫 Blocker

> **QUICKSTART — In 5 Minuten startklar**

Nur diese Seite lesen, bevor du losspielst. Alles andere ist Referenz.

| **Schritt** | **Aktion**                                                 | **Erwartetes Ergebnis**           |
|-------------|------------------------------------------------------------|-----------------------------------|
| 1           | Konsole (F12): game.janus7                                 | Objekt sichtbar — nicht undefined |
| 2           | Scene Controls → JANUS-Symbol: Shell öffnen                | Shell erscheint                   |
| 3           | Shell → Tools → Session Prep (📋)                          | Überblick über aktuelle Session   |
| 4           | Shell → Director → WorkflowStepper → Schritt 1: Tagesstart | Queue, Social, Quests automatisch |
| 5           | WorkflowStepper → Schritt 2: Lektion starten               | "Magiekunde gestartet"            |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>✅ Alles grün? Dann bist du bereit.</strong></p>
<p>Schritt 1 fehlschlägt → Kap. 3 (Installation)</p>
<p>Schritt 4 zeigt "no_lesson_in_slot" → Kap. 6.1 (Stundenplan)</p>
<p>Fehlermeldungen in der Konsole → Kap. 14 (Troubleshooting)</p></td>
</tr>
</tbody>
</table>

|                                                          |
|----------------------------------------------------------|
| **━━━ STANDARD-SESSION ━━━ 5 Klicks über die Shell ━━━** |

| **\#** | **Shell-Klick**                   | **Effekt**                        | **Frequenz**   |
|--------|-----------------------------------|-----------------------------------|----------------|
| 1      | Director → Tagesstart             | Queue, Social, Quests auto        | 1× pro Tag     |
| 2      | WorkflowStepper → Lektion starten | Buffs, Mondbonus, Hook feuert     | 1× pro Stunde  |
| 3      | DSA5-Sheet → Talent klicken       | Probe würfeln (Standard-Foundry)  | Während Stunde |
| 4      | Tools → Scoring → ⭐              | Punkte vergeben, Rangliste sofort | Nach Stunde    |
| 5      | TimeControl → +1 Phase            | Nächster Slot, Mood auto          | Ende Stunde    |

> **Legende & Reifegrade**

| **Symbol**                  | **Bedeutung**                                           | **Wann nutzen**             |
|-----------------------------|---------------------------------------------------------|-----------------------------|
| 🖱️ \[UI — Standardpfad\]    | Beschreibt den normalen UI-Weg. IMMER zuerst probieren. | Alltagsbetrieb              |
| ⌨️ \[Konsole — Power User\] | Konsolenbefehl (F12). Nur bei Bedarf oder Debug.        | Admin, Diagnose, Automation |
| 🎲 \[GM only\]              | Nur für den Spielleiter. Spieler haben keinen Zugriff.  | GM-Aktionen                 |
| 🧙 \[Spieler\]              | Für Spieler zugänglich.                                 | Spieler-Aktionen            |
| ⚙️ Automatisch              | Passiert ohne Klick — JANUS7 erledigt das.              | Nach Hook-Events            |
| ✅ Tip                      | Best-Practice-Empfehlung.                               | Allgemein                   |
| ⚠️ Warnung                  | Wichtiger Hinweis, kein Blocker.                        | Vorsicht                    |
| 🚫 Blocker / Gefahr         | Kann Daten beschädigen.                                 | Nur mit Bedacht             |
| 💡 Beispiel                 | Konkretes Praxisbeispiel.                               | Verstehen                   |
| 🔧 Optional                 | Braucht Zusatz-Setup, kein Kernbetrieb.                 | Wenn eingerichtet           |

**Reifegrade der Systeme**

| **System**            | **Reifegrad**    | **Voraussetzung**                     |
|-----------------------|------------------|---------------------------------------|
| Core State / IO       | ✅ Stabil (Kern) | Nur JANUS7                            |
| Stundenplan, Kalender | ✅ Stabil (Kern) | Nur JANUS7                            |
| Scoring & Zirkel      | ✅ Stabil (Kern) | Nur JANUS7                            |
| Director Workflow     | ✅ Stabil (Kern) | Nur JANUS7                            |
| DSA5 Proben / AP      | ✅ Stabil        | JANUS7 + DSA5                         |
| KI-Roundtrip          | ✅ Stabil        | JANUS7 + Inbox-Verzeichnis            |
| Atmosphere DJ         | 🔧 Optional      | JANUS7 + Playlists in Foundry         |
| Mondphasen            | 🔧 Optional      | JANUS7 + DSA5-Kalendermodul aktiv     |
| Lehrer-Buffs          | 🔧 Optional      | JANUS7 + DSA5 + Actor-Links           |
| PersonaeDramatis-Sync | 🔧 Optional      | JANUS7 + DSA5 + PersonaeMod + Journal |
| Gruppen-Schips        | 🔧 Optional      | JANUS7 + DSA5 + groupschips \> 0      |

> **1. Installation & Ersteinrichtung (einmalig)**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚠️ Nur einmal nötig</strong></p>
<p>Diese Schritte sind einmalig. Nach erfolgreichem Setup nur noch Kap. 13.1 (Update-Checkliste) bei Updates.</p></td>
</tr>
</tbody>
</table>

**1.1 Modul installieren**

1.  **ZIP entpacken** — Datei janus7_v0.9.12.42.zip extrahieren

2.  **Zielordner prüfen** — Inhalt MUSS unter Data/modules/janus7/ liegen

3.  **Häufiger Fehler** — Wenn der ZIP-Inhalt "janus7_final/" heißt → eine Ebene hochschieben

4.  **Foundry** — Modul-Manager → JANUS7 aktivieren → Welt neu laden (F5)

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🚫 Installatfehler vermeiden</strong></p>
<p>FALSCH: Data/modules/janus7/janus7_final/module.json ← doppelter Ordner!</p>
<p>RICHTIG: Data/modules/janus7/module.json</p></td>
</tr>
</tbody>
</table>

**1.2 Erstcheck — läuft JANUS7?**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Konsole (F12) — 30 Sekunden Check</strong></p>
<p>game.janus7 // → Objekt (nicht undefined)</p>
<p>game.modules.get("janus7").version // → "0.9.12.42"</p>
<p>(await game.janus7.capabilities.state.runHealthCheck()).ok // → true</p></td>
</tr>
</tbody>
</table>

**1.3 Setup-Checkliste vor Erstbetrieb**

| **☐** | **Schritt**                                               | **Ohne diesen Schritt**             | **Prio**  |
|-------|-----------------------------------------------------------|-------------------------------------|-----------|
| ☐     | Feature-Flags aktivieren: features.academySimulation=true | Stundenplan/Lektion/Scoring inaktiv | MUSS      |
| ☐     | Scene Mappings: Orte → Foundry-Szenen verknüpfen          | "Szene aktivieren" ohne Effekt      | Empfohlen |
| ☐     | Actor-Links: Schüler-NPCs → Foundry-Actors verknüpfen     | Lehrer-Buffs/AP/Conditions fehlen   | Empfohlen |
| ☐     | Healthcheck: runHealthCheck() → 17 Checks grün            | Unbekannte Systemfehler             | MUSS      |
| ☐     | Test: Lektionstest starten → Ergebnis ok                  | Keine Selbstprüfung                 | Empfohlen |
| ☐     | Playlists anlegen + in Atmosphere verknüpfen              | Kein Ton (Atmosphere optional)      | Optional  |
| ☐     | DSA5-Kalender: Aventurischer Kalender (nicht None)        | Mondphasen funktionieren nicht      | Optional  |
| ☐     | Group Schips in DSA5: max \> 0 setzen                     | Gruppen-Schips immer 0              | Optional  |
| ☐     | PersonaeDramatis: Journal-Pages für NPCs                  | Social-Sync deaktiviert             | Optional  |

**1.4 Feature-Flags aktivieren**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Config Panel öffnen</strong></p>
<p>game.janus7.ui.open("configPanel") → Tab "Features"</p>
<p>academySimulation: ✅ aktivieren (Pflicht)</p>
<p>atmosphere: ✅ nur wenn Playlists eingerichtet</p>
<p>enablePhase7 (KI): ✅ für KI-Roundtrip</p></td>
</tr>
</tbody>
</table>

**1.5 Actor-Links einrichten**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Drag &amp; Drop</strong></p>
<p>1. Shell → Academy View → NPCsCard</p>
<p>2. Foundry Sidebar → Actors-Tab</p>
<p>3. Spieler-Actor auf entsprechenden NPC-Slot ziehen</p>
<p>NPC_IRIAN_DAMARTIAN → Irian-Spieler-Actor</p>
<p>NPC_ELRIKA_REBENLIEB → Elrika-Spieler-Actor</p>
<p>NPC_SEQUIN → Sequin-Spieler-Actor</p>
<p>NPC_LYSANDRA_VOM_BORNLAND → Lysandra-Spieler-Actor</p>
<p>NPC_THORWALD_DER_BAER → Thorwald-Spieler-Actor</p></td>
</tr>
</tbody>
</table>

> **2. Berechtigungsmatrix**

| **Funktion**        | **GM** | **Spieler** | **Hinweis**               |
|---------------------|--------|-------------|---------------------------|
| Shell öffnen        | ✅     | ✅          | Beide                     |
| Stundenplan lesen   | ✅     | ✅          | Lesezugriff               |
| Rangliste lesen     | ✅     | ✅          | Lesezugriff               |
| DSA5-Probe würfeln  | ✅     | ✅          | DSA5-Sheet                |
| Schips einsetzen    | ✅     | ✅          | DSA5-Sheet                |
| Mondstatus lesen    | ✅     | ✅          | bridge.getMoonPhaseName() |
| Zeit voranschreiten | ✅     | 🚫          | Director                  |
| Lektion starten     | ✅     | 🚫          | directorRunLesson()       |
| Punkte vergeben     | ✅     | 🚫          | Scoring                   |
| AP vergeben         | ✅     | 🚫          | bridge.awardXp()          |
| Social ändern       | ✅     | 🚫          | social.adjustAttitude()   |
| KI Export/Import    | ✅     | 🚫          | Mit Sicherheitsdialog     |
| Config Panel        | ✅     | 🚫          | —                         |
| State Inspector     | ✅     | 🚫          | —                         |
| Atmosphere DJ       | ✅     | 🚫          | Master Client             |
| Actor-Links setzen  | ✅     | 🚫          | —                         |

> **3. Weltabhängigkeiten**

| **Feature**           | **Modul**                   | **Welt-Konfiguration**      | **Optional?**          |
|-----------------------|-----------------------------|-----------------------------|------------------------|
| Stundenplan/Lektionen | JANUS7                      | Keine                       | Nein — Kern            |
| Director Workflow     | JANUS7                      | Keine                       | Nein — Kern            |
| Scoring & Zirkel      | JANUS7                      | Keine                       | Nein — Kern            |
| DSA5-Proben/AP        | JANUS7 + DSA5               | DSA5 aktiv                  | Nein                   |
| Lehrer-Buffs          | JANUS7 + DSA5               | Actor-Links (NPC→Actor)     | Nein wenn Links fehlen |
| KI-Roundtrip          | JANUS7                      | Inbox auto-erstellt         | Nein                   |
| Atmosphere            | JANUS7                      | Playlists in Foundry        | Ja                     |
| Mondphasen            | JANUS7 + DSA5               | Kalender ≠ None             | Ja                     |
| Timed Conditions      | JANUS7 + DSA5               | Actor-Links                 | Ja                     |
| PersonaeDramatis-Sync | JANUS7 + DSA5 + PersonaeMod | dsapersonaedramatis-Journal | Ja                     |
| Gruppen-Schips        | JANUS7 + DSA5               | dsa5.groupschips max \> 0   | Ja                     |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>✅ Minimal-Setup reicht für den Start</strong></p>
<p>JANUS7 + DSA5 + features.academySimulation=true → Kern vollständig nutzbar.</p>
<p>Atmosphere, Mondphasen, PersonaeDramatis und Buffs nachrüsten wenn bereit.</p></td>
</tr>
</tbody>
</table>

> **4. Shell — Hauptoberfläche**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Öffnen</strong></p>
<p>Scene Controls → JANUS-Symbol oder Ctrl+K → "Shell" → Enter</p></td>
</tr>
</tbody>
</table>

**4.1 Drei Views**

| **View**     | **Wann**              | **Inhalt**                                           |
|--------------|-----------------------|------------------------------------------------------|
| 🧭 Director  | Im Spiel — täglich    | Zeit, NowPlaying, Runbook, Rangliste, Quests, Events |
| 🏰 Akademie  | Vor/zwischen Sessions | Stundenplan, Orte, NPCs, Zirkel                      |
| 🔧 Werkzeuge | Sub-Apps öffnen       | Scoring, Social, Atmosphere, KI, Config …            |

**4.2 Director-Karten**

| **Karte**       | **Zeigt**                          | **Klick-Aktion**            |
|-----------------|------------------------------------|-----------------------------|
| TimeControl     | Wochentag · Slot · Trimester       | +1 Phase +1 Tag Reset       |
| NowPlaying      | Lektion · Lehrer · Ort · Mondbonus | Lektion starten Mood setzen |
| WorkflowStepper | 5-Schritt-Runbook mit Haken        | Schritt per Klick ausführen |
| HouseCup        | Zirkelrangliste mit Balken         | → Scoring-Panel             |
| QuestsWidget    | Aktive Quests                      | → Quest-Journal             |
| EventQueue      | Wartende Auto-Events               | Event klicken = verarbeiten |

> **5. Unterrichts-Workflow**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>📋 Spickzettel (ausschneiden)</strong></p>
<p>① Prep-Wizard → ② Szene + Mood → ③ Tagesstart (1×/Tag) → ④ Lektion starten</p>
<p>→ ⑤ Proben würfeln → ⑥ +1 Phase → ⑦ Punkte → ⑧ Social → ⑨ Save</p></td>
</tr>
</tbody>
</table>

|                          |
|--------------------------|
| **━━━ VORBEREITUNG ━━━** |

**5.1 Session Prep Wizard**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Öffnen</strong></p>
<p>Shell → Tools → Session Prep (📋)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🔧 [Optional — benötigt Zusatz-Setup] Mondstatus prüfen</strong></p>
<p>bridge.dsa5.getMoonPhaseName() — Boni für Spieler ankündigen</p></td>
</tr>
</tbody>
</table>

**5.2 Szene & Atmosphere**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Szene aktivieren</strong></p>
<p>Shell → Academy View → LocationsCard → Ort → "Szene aktivieren"</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Mood setzen</strong></p>
<p>Shell → Tools → Atmosphere (🎵) → Mood-Button klicken</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🔧 [Optional — benötigt Zusatz-Setup] Atmosphere ist optional</strong></p>
<p>Wenn Playlists noch nicht eingerichtet: Mood-Button zeigt Fehler → ignorierbar.</p>
<p>Ohne Atmosphere läuft der Rest vollständig.</p></td>
</tr>
</tbody>
</table>

| **Unterricht** | **Mood**    |
|----------------|-------------|
| Theorie/Lernen | studious    |
| Zauberübungen  | mystical    |
| Prüfung        | tense       |
| Pause          | calm        |
| Quest-Start    | adventurous |
| Zeremonie      | solemn      |

|                          |
|--------------------------|
| **━━━ DURCHFÜHRUNG ━━━** |

**5.3 Tagesstart (einmal pro Tag)**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 [GM only] WorkflowStepper → Schritt 1</strong></p>
<p>Control Panel oder Shell → Director → WorkflowStepper → Schritt 1: "Tagesstart"</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚙️ Was passiert automatisch vs. was du tun musst</strong></p>
<p>AUTOMATISCH (JANUS7 erledigt das):</p>
<p>→ Queue verarbeitet (ausstehende Events feuern)</p>
<p>→ Social Links ausgewertet (Fortschritte)</p>
<p>→ Quest-Vorschläge generiert (bis 5)</p>
<p>→ State gespeichert (wenn autoSave aktiv)</p>
<p>DEIN NÄCHSTER SCHRITT:</p>
<p>▶ Meldung lesen: "Queue: X · Social: ok · Quest-Ideen: Y"</p>
<p>▶ Quest-Ideen prüfen → Schritt 4 im Runbook</p></td>
</tr>
</tbody>
</table>

**5.4 Lektion starten**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 [GM only] WorkflowStepper → Schritt 2</strong></p>
<p>Shell → WorkflowStepper → Schritt 2: "Lektion starten"</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚙️ Was passiert automatisch vs. was du tun musst</strong></p>
<p>AUTOMATISCH (JANUS7 erledigt das):</p>
<p>→ Slot als aktiv markiert</p>
<p>→ Hook janus7.lesson.started feuert</p>
<p>→ LessonBuffManager: Lehrer-Buffs auf alle verknüpften Schüler-Actors (wenn Actor-Links ok)</p>
<p>→ Mondphasen-Modifier berechnet (wenn Kalender aktiv)</p>
<p>→ NowPlaying aktualisiert: Lektionsdetails sichtbar</p>
<p>DEIN NÄCHSTER SCHRITT:</p>
<p>▶ Inhalt beschreiben: Lehrer, Ort, Thema, Mondbonus ankündigen</p>
<p>▶ Proben anleiten (Schritt 5.5)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚠️ Lektion startet nicht — "no_lesson_in_slot"</strong></p>
<p>Ursache: Für diesen Slot ist kein Unterricht im Stundenplan.</p>
<p>→ Shell → Academy View → Timetable → belegten Slot anklicken</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚠️ Lehrer-Buff erscheint nicht</strong></p>
<p>Ursache A: Actor-Link für diesen Schüler-NPC fehlt → NPCsCard → Actor verknüpfen</p>
<p>Ursache B: bridge.dsa5 nicht verfügbar → DSA5 prüfen</p>
<p>Test: await game.janus7.bridge.dsa5.applyTeacherBonus(actor, {...}) direkt</p></td>
</tr>
</tbody>
</table>

**5.5 Proben abhalten**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🧙 [Spieler] Einzelprobe</strong></p>
<p>DSA5-Charakter-Sheet → Talent anklicken → Würfelwurf → Ergebnis im Chat</p>
<p>Aktive Lehrer-Buffs erscheinen als grüne Active Effects auf dem Sheet.</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 [GM only] Gruppenprobe</strong></p>
<p>Alle Schüler gleichzeitig würfeln lassen:</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Gruppenprobe</strong></p>
<p>await game.janus7.bridge.dsa5.rollGroupCheck({</p>
<p>skillName: "Magiekunde",</p>
<p>participants: game.actors.filter(a =&gt; a.type === "character"),</p>
<p>modifier: 0</p>
<p>}); // Chat: "3/4 bestanden — Irian QS3, Elrika QS2, Sequin QS1"</p></td>
</tr>
</tbody>
</table>

**5.6 Zeit voranschreiten**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Ende der Stunde</strong></p>
<p>Shell → TimeControl → "+1 Phase" (oder WorkflowStepper nächster Schritt)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚙️ Was passiert automatisch vs. was du tun musst</strong></p>
<p>AUTOMATISCH (JANUS7 erledigt das):</p>
<p>→ Slot-Index inkrementiert</p>
<p>→ Auto-Mood wechselt wenn aktiviert</p>
<p>→ Hook janus7.date.changed wenn Tageswechsel</p>
<p>DEIN NÄCHSTER SCHRITT:</p></td>
</tr>
</tbody>
</table>

|                           |
|---------------------------|
| **━━━ NACHBEREITUNG ━━━** |

**5.7 Punkte vergeben**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Scoring</strong></p>
<p>Shell → Tools → Scoring (🏆) → Zirkel-Karte → ⭐ → Punktzahl eingeben → OK</p></td>
</tr>
</tbody>
</table>

| **Ergebnis**         | **Punkte (Empfehlung)** |
|----------------------|-------------------------|
| QS 1                 | 5                       |
| QS 2–3               | 10                      |
| QS 4–6               | 15                      |
| QS 4–6 + Kritisch    | 20                      |
| Alle Gruppenprobe ok | 10/Zirkel               |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚙️ Was passiert automatisch vs. was du tun musst</strong></p>
<p>AUTOMATISCH (JANUS7 erledigt das):</p>
<p>→ Rangliste in HouseCup-Karte sofort aktualisiert</p>
<p>→ Hook janus7.scoring.changed feuert</p>
<p>→ Bei autoSave: State gespeichert</p>
<p>DEIN NÄCHSTER SCHRITT:</p>
<p>▶ Eventuelle Quest-Punkte manuell prüfen</p>
<p>▶ Social-Reaktionen eintragen (5.8)</p></td>
</tr>
</tbody>
</table>

**5.8 Social-Reaktionen**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Social View</strong></p>
<p>Shell → Tools → Social (👥) → Von/Zu wählen → Wert eingeben → Anpassen</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Direkt</strong></p>
<p>await game.janus7.academy.social.adjustAttitude("NPC_SIRDON_KOSMAAR","NPC_IRIAN_DAMARTIAN",+8);</p></td>
</tr>
</tbody>
</table>

> **6. Prüfungsworkflow**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>📋 Spickzettel</strong></p>
<p>① Mood: tense → ② Szene: Große Aula → ③ Mondbonus ankündigen</p>
<p>→ ④ Proben (QS notieren) → ⑤ Batch-Auswertung → ⑥ AP vergeben → ⑦ Conditions prüfen</p></td>
</tr>
</tbody>
</table>

|                          |
|--------------------------|
| **━━━ VORBEREITUNG ━━━** |

**6.1 Prüfungsatmosphäre**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🖱️ [UI — Standardpfad] Setup</strong></p>
<p>1. Atmosphere DJ → "tense" klicken</p>
<p>2. LocationsCard → "Große Aula" → Szene aktivieren</p>
<p>3. Mondstatus prüfen → bei Vollmond ankündigen (+2 FP, +1 QS auf Zauberkunde)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Mondstatus</strong></p>
<p>const m = game.janus7.bridge.dsa5.getCurrentMoonStatus();</p>
<p>if (m?.isFullMoon) ui.notifications.info("Vollmond! +2 FP, +1 QS auf Zauberkunde");</p></td>
</tr>
</tbody>
</table>

|                          |
|--------------------------|
| **━━━ DURCHFÜHRUNG ━━━** |

**6.2 Ergebnis-Tabelle**

| **QS** | **Status**              | **AP** | **Automatische Condition**           |
|--------|-------------------------|--------|--------------------------------------|
| QS 4–6 | passed_with_distinction | 12–14  | Keine negativen                      |
| QS 2–3 | passed                  | 10     | Keine negativen                      |
| QS 1   | marginal_fail           | 0      | stress — 3 Tage                      |
| QS 0   | failed                  | 0      | exam_panic (1 Tag) + stress (7 Tage) |

|                           |
|---------------------------|
| **━━━ NACHBEREITUNG ━━━** |

**6.3 Batch-Auswertung**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Alle Schüler auf einmal</strong></p>
<p>await game.janus7.academy.learningProgress.processBatchExamResults([</p>
<p>{ actorRef: game.actors.getName("Irian Damartian").uuid, status:"passed_with_distinction", qualityStep:5 },</p>
<p>{ actorRef: game.actors.getName("Elrika Rebenlieb").uuid, status:"passed", qualityStep:3 },</p>
<p>{ actorRef: game.actors.getName("Sequin").uuid, status:"marginal_fail", qualityStep:1 },</p>
<p>{ actorRef: game.actors.getName("Lysandra vom Bornland").uuid, status:"failed", qualityStep:0 },</p>
<p>], "EXAM_MAG_BASICS_01");</p>
<p>// Automatisch: AP vergeben + Conditions setzen + Hook janus7.exam.result.recorded</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚙️ Was passiert automatisch vs. was du tun musst</strong></p>
<p>AUTOMATISCH (JANUS7 erledigt das):</p>
<p>→ AP auf Actors gebucht (via bridge.dsa5.awardXp)</p>
<p>→ Timed Conditions gesetzt: exam_panic / stress als DSA5 Active Effects</p>
<p>→ Hook janus7.exam.result.recorded feuert</p>
<p>→ LearningProgress-Journal-Einträge aktualisiert</p>
<p>DEIN NÄCHSTER SCHRITT:</p>
<p>▶ Prüfungsgespräche führen (Nachgespräch)</p>
<p>▶ Optional: Stress-Dauer über Meditationsproben reduzieren</p></td>
</tr>
</tbody>
</table>

> **7. KI-Roundtrip**

**7.1 Workflow**

| **Schritt** | **Aktion**                           | **Wer**               |
|-------------|--------------------------------------|-----------------------|
| 1 Export    | Bundle exportieren (Lite/Woche/Voll) | GM — KI Roundtrip App |
| 2 KI        | JSON + Aufgabe an externe KI         | GM — extern           |
| 3 Ablegen   | Antwort als .json in inbox/          | GM — Dateimanager     |
| 4 Prüfen    | "Vorschau" → Diff sichten            | GM — App              |
| 5 Anwenden  | "Auswahl anwenden" → transaktional   | System                |

**7.2 Guter Patch vs. schlechter Patch**

| **Typ**                    | **Beispiel**                                                    | **Erlaubt?**                  |
|----------------------------|-----------------------------------------------------------------|-------------------------------|
| ✅ Gut: neue Lektion       | "op":"set","path":"academy.customLessons.LES_NEW","value":{...} | Ja                            |
| ✅ Gut: Social-Änderung    | "op":"set","path":"social.relationships.NPC_A.NPC_B","value":71 | Ja                            |
| ✅ Gut: neuer Quest        | "op":"set","path":"academy.quests.QUEST_NEW","value":{...}      | Ja                            |
| 🚫 Schlecht: Zeit          | path":"time.week" oder "time.year"                              | NEIN — Kampagne springt       |
| 🚫 Schlecht: ID umbenennen | bestehende ID ändern                                            | NEIN — bricht alle Referenzen |
| 🚫 Schlecht: meta.\*       | path":"meta.version"                                            | NEIN — auto-gesetzt           |
| 🚫 Schlecht: History       | path":"scoring.history"                                         | NEIN — Daten verfälscht       |

**7.3 Minimalbundle-Referenz**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>JANUS_KI_RESPONSE_V1 — 1 Social + 1 Lektion + 1 Quest</strong></p>
<p>{</p>
<p>"version": "JANUS_KI_RESPONSE_V1",</p>
<p>"generatedAt": "2026-03-21T12:00:00Z",</p>
<p>"patches": [</p>
<p>{ "op":"set", "path":"social.relationships.NPC_SIRDON_KOSMAAR.NPC_IRIAN_DAMARTIAN", "value":71 },</p>
<p>{ "op":"set", "path":"academy.customLessons.LES_Y2_T1_MAGTH_NEW",</p>
<p>"value": { "id":"LES_Y2_T1_MAGTH_NEW", "title":"Magietheorie II", "subject":"magietheorie" } },</p>
<p>{ "op":"set", "path":"academy.quests.QUEST_LYSANDRA_REDEMPTION",</p>
<p>"value": { "id":"QUEST_LYSANDRA_REDEMPTION", "title":"Lysandras zweite Chance", "active":true } }</p>
<p>]</p>
<p>}</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>✅ Pflichtregeln vor jedem Import</strong></p>
<p>1. Backup prüfen: KI Backup Manager öffnen → letztes Backup vorhanden?</p>
<p>2. Immer "Vorschau" vor "Anwenden"</p>
<p>3. Keine time.* / meta.* / scoring.history Patches im Diff?</p>
<p>4. Alle IDs exakt wie im Export (keine Abkürzungen!)</p></td>
</tr>
</tbody>
</table>

> **8. Director-Workflow**

| **Schritt** | **Name**          | **Wann**        | **Was**                    |
|-------------|-------------------|-----------------|----------------------------|
| 1           | Tagesstart        | 1× pro Tag      | Queue + Social + Quests    |
| 2           | Lektion starten   | Jede Stunde     | runLesson() + Buffs + Hook |
| 3           | Queue verarbeiten | Nach Szenen     | Bis 3 Events               |
| 4           | Quest-Ideen       | Nach Unterricht | 5 Vorschläge generieren    |
| 5           | Social auswerten  | Tagesende       | Beziehungsfortschritte     |

**8.1 Quest annehmen — wo sehe ich ihn danach?**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>💡 Beispiel: Quest annehmen → Foundry Journal</strong></p>
<p>GM: WorkflowStepper Schritt 4 → Quest-Vorschlag "Lysandras zweite Chance" erscheint.</p>
<p>"Quest übernehmen" klicken → Actor auswählen: "Lysandra vom Bornland"</p>
<p>Automatisch passiert:</p>
<p>→ Foundry Journal-Eintrag "QUEST_LYSANDRA_REDEMPTION" erstellt</p>
<p>→ QuestsWidget zeigt Quest mit Fortschrittsleiste</p>
<p>→ Hook janus7.quest.started feuert</p>
<p>→ Director erinnert in nächster Session an den Quest</p>
<p>Wo nachsehen: Shell → Director View → QuestsWidget oder Foundry Journal</p></td>
</tr>
</tbody>
</table>

> **9. Spieler-Perspektive**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🧙 [Spieler] Kurzfassung</strong></p>
<p>Du brauchst keine Konsole. Deine Hauptinteraktion: DSA5-Charakter-Sheet.</p>
<p>JANUS7 läuft unsichtbar im Hintergrund und bereichert das Spiel.</p></td>
</tr>
</tbody>
</table>

| **Was**     | **Öffnen**                             | **Inhalt**                      |
|-------------|----------------------------------------|---------------------------------|
| Stundenplan | game.janus7.ui.open("academyOverview") | Wochenstundenplan, aktiver Slot |
| Rangliste   | game.janus7.ui.open("scoringView")     | Zirkel-Punkte                   |
| Mondbonus   | bridge.dsa5.getMoonPhaseName()         | Aktuelle Phase + Bonus          |
| Eigene AP   | bridge.dsa5.getXpStatus(actor)         | total / free                    |
| NPC-Haltung | social.getAttitude(a,b)                | Zahl -100 bis +100              |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>💡 Beispiel: Beziehung zu Kosmaar prüfen</strong></p>
<p>Spieler: "Wie steht Irian eigentlich bei Kosmaar?"</p>
<p>Konsole: game.janus7.academy.social.getAttitude("NPC_IRIAN_DAMARTIAN","NPC_SIRDON_KOSMAAR")</p>
<p>→ 71 → Level 8 (Zuneigung) → "Kosmaar schätzt Irian sehr!"</p></td>
</tr>
</tbody>
</table>

> **10. Wartung & Pflege**

**10.1 Update-Checkliste — 60 Sekunden**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🔄 Nach jedem Modul-Update</strong></p>
<p>1. Version prüfen: game.modules.get("janus7").version → neue Version?</p>
<p>2. Healthcheck: (await capabilities.state.runHealthCheck()).ok → true?</p>
<p>3. Diagnostics: await diagnostics.report({ notify:true }) → health ok?</p>
<p>4. Test-Katalog: test.runCatalog({ openWindow:true }) → 0 Fails?</p>
<p>5. Shell öffnen + 1 Lektion starten → alles wie vorher?</p>
<p>6. Save: await core.state.save({ force:true }) → State-Version aligniert</p></td>
</tr>
</tbody>
</table>

**10.2 State-Version-Drift**

Nach einem Update kann der gespeicherte State eine ältere Versionsnummer tragen. JANUS7 zeigt eine Warnung:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Drift erkennen und beheben</strong></p>
<p>const r = await game.janus7.diagnostics.report({ notify:false });</p>
<p>// Warning: "World coreState version (0.9.12.37) differs from module (0.9.12.42)"</p>
<p>// Lösung:</p>
<p>await game.janus7.core.state.save({ force: true });</p>
<p>// → Drift weg, meta.version automatisch aligniert</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>✅ State-Drift ist kein Blocker</strong></p>
<p>Alle Kampagnendaten bleiben vollständig erhalten.</p>
<p>Einmal speichern → Warning verschwindet.</p></td>
</tr>
</tbody>
</table>

**10.3 Nach fehlgeschlagenem KI-Import**

5.  **Ruhig bleiben** — JANUS7 macht automatischen Rollback bei Import-Fehlern

6.  **Backup prüfen** — game.janus7.ui.open("kiBackupManager") → letztes Backup?

7.  **Backup wiederherstellen** — "Wiederherstellen" → Sicherheitsabfrage → State zurück

8.  **Bundle prüfen** — version: "JANUS_KI_RESPONSE_V1"? IDs korrekt? Keine time.\* Patches?

**10.4 Actor-/Scene-Links reparieren**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Diagnose</strong></p>
<p>// Broken Edges prüfen</p>
<p>const d = await game.janus7.graph.diagnostics.run();</p>
<p>console.log("Broken Edges:", d.brokenEdgeCount); // 0 ideal, 1-5 tolerierbar</p>
<p>// Graph neu aufbauen</p>
<p>await game.janus7.graph.build({ force: true });</p>
<p>// Scene-Link manuell: Shell → LocationsCard → neue Szene droppen</p></td>
</tr>
</tbody>
</table>

> **11. Troubleshooting**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🚫 BLOCKER Diese Symptome stoppen das Spiel</strong></p>
<p>game.janus7 = undefined → Modul nicht geladen: Browser-Cache leeren, F12 prüfen, Kap. 1.1</p>
<p>"no_lesson_in_slot" → Stundenplan leer: Academy View → Timetable → Slot anklicken, Kap. 5.4</p>
<p>Healthcheck: fail &gt; 0 → Kritischer Systemfehler: Kap. 11.3 Volldiagnose</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>⚠️ EINGESCHRÄNKT Spielbar mit Einschränkung</strong></p>
<p>KI-Import HTTP 404 → Inbox fehlt: "Durchsuchen" klicken (erstellt Ordner auto)</p>
<p>Punkte verschwinden → autoSave aus: config.set("autoSave",true)</p>
<p>Moon = null → Kalender auf "None": DSA5-Einstellungen → Aventurischer Kalender</p>
<p>Buffs nicht gesetzt → Actor-Links fehlen: NPCsCard → Actor verknüpfen</p>
<p>state.version.drift → state.save() einmal ausführen → weg</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🔧 NUR OPTIONAL Nur optionales System betroffen</strong></p>
<p>Social-Sync kein Effekt → PersonaeDramatis fehlt (optional)</p>
<p>Atmosphere kein Ton → Playlists nicht eingerichtet (optional)</p>
<p>brokenEdgeCount &gt; 0 → graph.build() → oft selbstheilend</p>
<p>Gruppen-Schips 0/0 → DSA5-Einstellungen → groupschips max setzen (optional)</p></td>
</tr>
</tbody>
</table>

**11.1 Diagnostics-Report interpretieren**

| **Feld**            | **Sollwert**    | **Warnbereich**     | **Kritisch**         |
|---------------------|-----------------|---------------------|----------------------|
| health              | ok              | warn                | fail → Blocker       |
| summary.ok          | 17              | 15–16               | \< 15                |
| summary.fail        | 0               | —                   | \> 0 → sofort prüfen |
| summary.warn        | 0               | 1–3                 | \> 3 → untersuchen   |
| brokenEdgeCount     | 0               | 1–5                 | \> 5 → graph.build() |
| semanticIssueCount  | 0               | 1–3                 | \> 3                 |
| state.version.drift | nicht vorhanden | warn (unbedenklich) | —                    |
| strictPassed        | true            | false (hinweis)     | —                    |

**11.2 Vollständige Systemprüfung**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>60-Sekunden-Diagnose</strong></p>
<p>const h = await game.janus7.capabilities.state.runHealthCheck();</p>
<p>console.log(h.ok ? "✅ OK" : "⚠️ Probleme");</p>
<p>h.checks.filter(c =&gt; !c.ok).forEach(c =&gt; console.error(c.id, ":", c.message));</p>
<p>await game.janus7.diagnostics.report({ notify: true }); // Vollbericht</p>
<p>await game.janus7.test.runCatalog({ openWindow: true }); // 142 Tests</p></td>
</tr>
</tbody>
</table>

> **12. Portierung auf andere Akademien**

**12.1 7-Schritte-Migration**

| **Schritt**        | **Datei / Ort**             | **Was ändern**                      |
|--------------------|-----------------------------|-------------------------------------|
| 1\. NPCs           | data/academy/npcs.json      | IDs, Namen, Rollen (Lehrer/Schüler) |
| 2\. Orte           | data/academy/locations.json | Ortsnamen, IDs, Typ, Mood-Preset    |
| 3\. Zirkel         | data/academy/circles.json   | Namen, Farben, Elemente             |
| 4\. Lektionen      | data/academy/lessons.json   | Alle Lektions-IDs, Titel, Fächer    |
| 5\. Scene Mappings | Config Panel                | Orts-IDs → Foundry-Szenen           |
| 6\. Actor-Links    | Shell → NPCsCard            | Schüler-NPCs → Spieler-Actors       |
| 7\. Test           | Healthcheck + Probe-Session | Alle 17 Checks grün?                |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🚫 ID-Format niemals ändern</strong></p>
<p>Präfix-Schema MUSS eingehalten werden:</p>
<p>NPCs: NPC_GROSSBUCHSTABEN z.B. NPC_SIRDON_KOSMAAR</p>
<p>Lektionen: LES_Y{Jahr}_T{Tri}_{Fach}_{Nr} z.B. LES_Y1_T1_MAGIEK_01</p>
<p>Orte: LOC_BESCHREIBUNG z.B. LOC_GROSSE_AULA</p>
<p>Zirkel: kleinbuchstaben z.B. salamander</p>
<p>Bestehende IDs NIEMALS umbenennen — alle State-Referenzen werden ungültig!</p>
<p>Neue IDs hinzufügen ist unbedenklich.</p></td>
</tr>
</tbody>
</table>

> **13. Glossar — JANUS7-Begriffe**

| **Begriff**            | **Bedeutung**                                                                            |
|------------------------|------------------------------------------------------------------------------------------|
| Academy Data API       | Lädt und cached alle statischen Akademie-Daten (NPCs, Lektionen, Orte, Zirkel)           |
| Actor-Link             | Verknüpfung eines JANUS7-NPC mit einem Foundry-Actor-Dokument (Drag&Drop)                |
| Atmosphere DJ          | System zur Steuerung von Playlists und Stimmungen (Moods) für alle Clients               |
| Bridge (DSA5)          | Abstraktionsschicht zwischen JANUS7 und dem DSA5-Foundry-System                          |
| Capabilities           | Stabiler, eingefrorener API-Kontrakt: game.janus7.capabilities.\*                        |
| Director               | Intelligentes Leit-System mit Runbook, Tagesstart, Quest-Vorschlägen                     |
| Director Kernel        | Kernlogik des Directors: startDay(), runLesson(), generateQuests() usw.                  |
| EventQueue             | Warteschlange für automatische Events (Mondphasenwechsel, NPC-Ereignisse)                |
| Hook                   | Foundry-Event, das JANUS7 emittiert wenn etwas passiert (z.B. janus7.lesson.started)     |
| HouseCup               | Ranglisten-Karte in der Shell (Director View) für alle Zirkel                            |
| Inbox / Outbox         | Verzeichnisse worlds/\[welt\]/janus7/io/inbox/ und .../outbox/ für KI-Dateien            |
| JANUS_KI_RESPONSE_V1   | Format für KI-Antwort-Bundles (version + patches Array)                                  |
| KI-Roundtrip           | Export → KI-Bearbeitung → Import-Workflow                                                |
| Lektion (LES\_)        | Datensatz für eine Unterrichtseinheit mit Titel, Fach, Lehrer, Ort                       |
| Mood                   | Stimmungs-Preset (studious/mystical/tense/calm/…) mit verknüpfter Playlist               |
| NowPlaying             | Shell-Karte: zeigt aktuelle Lektion, Lehrer, Ort und Mondbonus                           |
| Runbook                | 5-Schritt-Tagesablauf im WorkflowStepper: Tagesstart → Lektion → Queue → Quests → Social |
| Scoring                | Punktesystem für Zirkel-Wettbewerb (addCirclePoints, HouseCup)                           |
| Social                 | Beziehungswerte -100 bis +100 zwischen NPCs und Spielercharakteren                       |
| Slot                   | Unterrichtseinheit (Morgens/Frühstück/Vormittags/Mittagspause/Nachmittags/Abend/Nacht)   |
| State (JanusStateCore) | Einzige Wahrheitsquelle (SSOT) für den gesamten Kampagnenstatus                          |
| Timed Condition        | Zeitlich begrenzter DSA5-Active-Effect (z.B. exam_panic für 1 Tag)                       |
| WorkflowStepper        | UI-Karte in der Shell mit dem Runbook und Fortschrittsmarkierungen                       |
| Zirkel                 | Haus/Gruppe der Akademie (Salamander/Stäbe/Schwerter/Sicheln)                            |

> **14. Abnahme-Checkliste vor Kampagnenstart**

Diese Checkliste bestätigt, dass JANUS7 vollständig konfiguriert und betriebsbereit ist:

| **☐** | **Prüfpunkt**         | **Befehl / Weg**                         | **Erwartetes Ergebnis** |
|-------|-----------------------|------------------------------------------|-------------------------|
| ☐     | JANUS7 startet        | game.janus7                              | Objekt sichtbar         |
| ☐     | Version korrekt       | game.modules.get("janus7").version       | "0.9.12.42"             |
| ☐     | Healthcheck grün      | runHealthCheck().ok                      | true, 17 Checks         |
| ☐     | Alle 142 Tests grün   | test.runCatalog()                        | 0 FAILs, max 9 SKIPs    |
| ☐     | Feature-Flags aktiv   | config.get("features").academySimulation | true                    |
| ☐     | Stundenplan vorhanden | Shell → Academy View → Timetable         | Lektionen sichtbar      |
| ☐     | Lektionstest ok       | directorRunLesson()                      | ok: true, Lektionstitel |
| ☐     | Scoring funktioniert  | scoring.addCirclePoints("salamander",1)  | HouseCup aktualisiert   |
| ☐     | Social funktioniert   | social.adjustAttitude("NPC_A","NPC_B",5) | Wert gespeichert        |
| ☐     | Actor-Links ok        | bridge.dsa5.getXpStatus(actor)           | { free: N }             |
| ☐     | KI-Export ok          | kiApi.exportToOutbox({ mode:"lite" })    | Datei in outbox/        |
| ☐     | State Save ok         | core.state.save()                        | Kein Fehler             |
| ☐     | Diagnostics sauber    | diagnostics.report({ notify:true })      | health: "ok"            |

> **Anhang — Schnellreferenz**

**A. Alle Apps**

| **App**            | **Konsole**                  | **GM only?** |
|--------------------|------------------------------|--------------|
| Shell              | ui.openShell()               | Nein         |
| Control Panel      | ui.open("controlPanel")      | Ja           |
| Akademie-Übersicht | ui.open("academyOverview")   | Nein (read)  |
| Scoring            | ui.open("scoringView")       | Vergabe: Ja  |
| Social View        | ui.open("socialView")        | Ja           |
| Atmosphere DJ      | ui.open("atmosphereDJ")      | Ja           |
| KI Roundtrip       | ui.open("kiRoundtrip")       | Ja           |
| KI Backup Manager  | ui.open("kiBackupManager")   | Ja           |
| State Inspector    | ui.open("stateInspector")    | Ja           |
| Config Panel       | ui.open("configPanel")       | Ja           |
| Data Studio        | ui.open("academyDataStudio") | Ja           |
| Lektionsbibliothek | ui.open("lessonLibrary")     | Nein (read)  |
| Session Prep       | ui.open("sessionPrepWizard") | Ja           |

**B. Konsolen-Schnellreferenz**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Häufigste Befehle</strong></p>
<p>// System</p>
<p>game.janus7 // Engine ok?</p>
<p>(await capabilities.state.runHealthCheck()).ok // true?</p>
<p>await diagnostics.report({ notify:true }) // Vollbericht</p>
<p>await core.state.save() // Speichern</p>
<p>// Zeit &amp; Director</p>
<p>await commands.advanceSlot({ amount:1 }) // +1 Phase</p>
<p>await director.kernel.startDay({ save:true }) // Tagesstart</p>
<p>await director.kernel.runLesson({ save:false }) // Lektion</p>
<p>await director.kernel.generateQuests({ limit:5 }) // Quests</p>
<p>// Social &amp; Scoring</p>
<p>await academy.social.adjustAttitude("NPC_A","NPC_B",10)</p>
<p>await capabilities.scoring.addCirclePoints("salamander",10)</p>
<p>// DSA5</p>
<p>bridge.dsa5.getCurrentMoonStatus()</p>
<p>await bridge.dsa5.getXpStatus(actor)</p>
<p>await bridge.dsa5.awardXp(actor, 10, "Grund")</p></td>
</tr>
</tbody>
</table>

**C. GM-Session-Checkliste (ausdrucken)**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 Vor der Session</strong></p>
<p>☐ Session Prep Wizard ☐ Mondstatus ☐ Stundenplan ☐ Offene Quests ☐ Szenen/Moods</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 Pro Unterrichtseinheit</strong></p>
<p>☐ Tagesstart (1×/Tag) ☐ Szene + Mood ☐ Lektion starten ☐ Proben würfeln</p>
<p>☐ +1 Phase ☐ Punkte vergeben ☐ Social ☐ Queue (wenn nötig)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 Nach der Session</strong></p>
<p>☐ AP vergeben (Prüfungen) ☐ Quest-Vorschläge ☐ Social-Auswertung ☐ State speichern</p></td>
</tr>
</tbody>
</table>

JANUS7 v0.9.12.42 · Betriebsanleitung v3 · März 2026
