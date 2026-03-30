**JANUS7 — Spielerhandzettel**

Alles was du als Spieler über JANUS7 wissen musst

v0.9.12.42 · Foundry VTT v13+ · DSA5

> **Das Wichtigste zuerst**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🧙 Was du NICHT brauchst</strong></p>
<p>✗ Keine Konsole (F12)</p>
<p>✗ Keine Konfiguration</p>
<p>✗ Kein JANUS7 öffnen</p>
<p>JANUS7 läuft unsichtbar im Hintergrund. Du spielst wie immer über das DSA5-Charakter-Sheet.</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎲 Was der GM für dich erledigt</strong></p>
<p>⚙️ Zeit voranschreiten — du brauchst nichts klicken</p>
<p>⚙️ Lektion starten — Active Effects erscheinen automatisch auf deinem Sheet</p>
<p>⚙️ Punkte vergeben — Rangliste aktualisiert sich von alleine</p>
<p>⚙️ Social-Werte anpassen — laufen im Hintergrund</p></td>
</tr>
</tbody>
</table>

> **Während der Session**

**Proben würfeln (deine Hauptaktion)**

1.  DSA5-Charakter-Sheet öffnen (wie immer)

2.  Talent anklicken (z.B. Magiekunde) → Würfelwurf

3.  Ergebnis erscheint im Chat mit Qualitätsstufe (QS 1–6)

4.  JANUS7 vergibt Punkte automatisch basierend auf QS

**Active Effects auf deinem Sheet**

Wenn der Lehrer besonders guten Unterricht macht, erscheinen grüne Boni auf deinem Sheet:

| **Buff**             | **Was er bewirkt**                                     | **Kommt von**            |
|----------------------|--------------------------------------------------------|--------------------------|
| FP +2 auf Magiekunde | 2 extra Fertigkeitspunkte auf nächste Magiekunde-Probe | Lehrer Kosmaar           |
| QS +1 auf Zauber     | Qualitätsstufe wird um 1 erhöht                        | Besonderer Unterricht    |
| Neuauswurf (Spell)   | Darf nächsten Zauber neu würfeln                       | Spezial-Unterricht       |
| exam_panic (1 Tag)   | Probe-Malus nach Prüfungsversagen                      | Automatisch nach Prüfung |
| stress (7 Tage)      | Leichter Malus nach Prüfung                            | Automatisch nach Prüfung |

**Schips einsetzen**

5.  Würfelwurf durchführen

6.  Rechtsklick auf den Würfelwurf im Chat → "Glück einsetzen"

7.  Schip wird von deinem Sheet abgezogen

> **Was du selbst nachschauen kannst**

| **Was**     | **Öffnen**                                                            | **Inhalt**                      |
|-------------|-----------------------------------------------------------------------|---------------------------------|
| Stundenplan | game.janus7.ui.open("academyOverview")                                | Wochenstundenplan, aktiver Slot |
| Rangliste   | game.janus7.ui.open("scoringView")                                    | Punkte aller vier Zirkel        |
| Mondphase   | Konsole: game.janus7.bridge.dsa5.getMoonPhaseName()                   | Aktuelle Phase und Boni         |
| Meine AP    | game.janus7.bridge.dsa5.getXpStatus(game.actors.getName("Mein Char")) | total / spent / free            |
| NPC-Haltung | game.janus7.academy.social.getAttitude("NPC_A","NPC_B")               | Wert -100 bis +100              |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Rangliste in der Konsole</strong></p>
<p>// Öffnet das Scoring-Fenster:</p>
<p>game.janus7.ui.open("scoringView")</p>
<p>// Wie steht Irian bei Kosmaar?</p>
<p>game.janus7.academy.social.getAttitude("NPC_IRIAN_DAMARTIAN","NPC_SIRDON_KOSMAAR")</p>
<p>// → 71 = Level 8 "Zuneigung" — sehr guter Stand!</p>
<p>// Meine freien AP:</p>
<p>await game.janus7.bridge.dsa5.getXpStatus(game.actors.getName("Irian Damartian"))</p>
<p>// → { total:1250, spent:1215, free:35 }</p></td>
</tr>
</tbody>
</table>

> **Die Vier Zirkel**

| **Zirkel**             | **Element** | **Symbol** |
|------------------------|-------------|------------|
| Zirkel des Salamanders | Feuer 🔴    | salamander |
| Zirkel der Stäbe       | Luft 🔵     | staves     |
| Zirkel der Schwerter   | Wasser ⚪   | swords     |
| Zirkel der Sicheln     | Erde 🟢     | sickles    |

> **Nach der Session**

- Charakter-Sheet prüfen: Neue AP? Neue Active Effects (Stress, Panik)?

- Rangliste prüfen: Hat sich dein Zirkel verbessert?

- Quest-Journal prüfen: Neue Quests von GM hinzugefügt?

- Mondphase für nächste Session notieren (Boni planen!)

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>📅 Aventurische Wochentage (Unterrichtsrhythmus)</strong></p>
<p>Praiosstag · Rohalstag · Feuertag · Träviatag · Borontag · Hesindstag</p>
<p>Marastag · Rondriastag · Efferdstag · Rahajatag · Ingerimm · Pheydtag</p>
<p>Tagesslots: Morgens | Frühstück | Vormittags | Mittagspause | Nachmittags | Abend | Nacht</p></td>
</tr>
</tbody>
</table>

JANUS7 v0.9.12.42 · Spielerhandzettel · März 2026
