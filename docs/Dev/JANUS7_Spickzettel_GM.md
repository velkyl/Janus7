**JANUS7 — GM-Spieltisch-Spickzettel**

v0.9.12.42 · Alle Felder = 1 Klick/Befehl

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🌅 VOR DER SESSION</strong></p>
<p>☐ Session Prep Wizard öffnen</p>
<p>☐ Mondstatus prüfen</p>
<p>☐ Stundenplan prüfen</p>
<p>☐ Offene Quests prüfen</p>
<p>☐ Szenen vorbereiten</p>
<p>☐ Atmosphere-Moods planen</p>
<p>🔑 Shell → Tools → Session Prep</p>
<p>🔑 bridge.dsa5.getMoonPhaseName()</p></td>
<td><p><strong>⚡ WÄHREND DER SESSION</strong></p>
<p>☐ Tagesstart (1×/Tag) → Schritt 1</p>
<p>☐ Szene + Mood setzen</p>
<p>☐ Lektion starten → Schritt 2</p>
<p>☐ Inhalt beschreiben</p>
<p>☐ Proben würfeln lassen</p>
<p>☐ +1 Phase → TimeControl</p>
<p>☐ Punkte vergeben (Scoring)</p>
<p>☐ Social-Reaktionen eintragen</p>
<p>☐ Queue (wenn Events ausstehen)</p>
<p>🔑 Shell → WorkflowStepper</p></td>
<td><p><strong>🌙 NACH DER SESSION</strong></p>
<p>☐ AP vergeben (Prüfungen)</p>
<p>☐ Quest-Ideen → Schritt 4</p>
<p>☐ Social-Auswertung → Schritt 5</p>
<p>☐ State speichern</p>
<p>☐ Optional: KI-Export</p>
<p>🔑 processBatchExamResults()</p>
<p>🔑 director.kernel.generateQuests()</p>
<p>🔑 director.kernel.evaluateSocialLinks()</p>
<p>🔑 core.state.save()</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🎵 MOODS</strong></p>
<p>studious → Theorie/Lernen</p>
<p>mystical → Zauberübungen</p>
<p>tense → Prüfung</p>
<p>calm → Pause/Mahlzeit</p>
<p>adventurous → Quest-Start</p>
<p>solemn → Zeremonie</p>
<p>🔑 Shell → Tools → Atmosphere</p></td>
<td><p><strong>🏆 SCORING (Punkte)</strong></p>
<p>QS 1: 5 Punkte</p>
<p>QS 2–3: 10 Punkte</p>
<p>QS 4–6: 15 Punkte</p>
<p>Kritisch+QS4+: 20 Punkte</p>
<p>Alle Gruppe ok: 10/Zirkel</p>
<p>Prüfung bestanden: 10 AP</p>
<p>Mit Auszeichnung: 12 AP</p>
<p>🔑 Shell → Tools → Scoring</p></td>
<td><p><strong>🌙 MONDPHASEN</strong></p>
<p>ToteMada (Neu): kein Bonus</p>
<p>Kelch/Rad†: +1 FP</p>
<p>ZunehmendesRad: +1 FP/+2 Score</p>
<p>★ Vollmond (Rad): +2 FP, +1 QS</p>
<p>AbnehmenderHelm: kein Bonus</p>
<p>🔑 bridge.dsa5.getCurrentMoonStatus()</p>
<p>🔑 bridge.dsa5.getMoonPhaseName()</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>🚫 NOTFALL — Probleme?</strong></p>
<p>game.janus7 = undefined → Browser-Cache leeren (Ctrl+Shift+R)</p>
<p>"no_lesson_in_slot" → Academy View → Timetable → Slot waehlen</p>
<p>Healthcheck: (await capabilities.state.runHealthCheck()).ok --&gt; true?</p></td>
</tr>
</tbody>
</table>

JANUS7 v0.9.12.42 · Zum Ausdrucken und Laminieren
