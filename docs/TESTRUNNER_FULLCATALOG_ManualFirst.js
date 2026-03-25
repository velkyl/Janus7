/**
 * JANUS7 TestRunner – FULL CATALOG (63 Tests) – Manual-First
 * Source: JANUS7_Testkatalog_2025-12-12_reviewed.xlsx (Sheet "Alle Tests")
 *
 * Anforderungen umgesetzt:
 * - Alle Tests aus dem Katalog enthalten (Phase 0–7, 63 Einträge)
 * - Jeder Test wird vom Anwender aktiv im Dialog abgeschlossen (PASS/FAIL/SKIP)
 * - Pro Test: 1..n "Konsole"-Snippets:
 *    - Button "Ausführen" => führt Snippet im Makro-Kontext aus und schreibt Ergebnis automatisch in Notizen
 *    - Button "Copy" + Klick-in-Textarea => selektieren/kopieren für Browser-Konsole
 * - Start-Dialog: bis inkl. Phase X testen (0..7) oder "Alles"
 * - Globaler Abbruch-Button: stoppt nach aktuellem Test
 * - Export: 1x JSON + 1x TXT
 *
 * Sicherheits-/Anti-Pattern:
 * - Es gibt KEIN eval() auf externen Datenquellen zur Laufzeit.
 * - Snippet-Code ist Teil dieses Makros (aus deinem lokalen Testkatalog generiert) => trusted.
 */
(async () => {
  const RUNNER_VERSION = "JANUS7_TESTRUNNER_FULLCATALOG_v1.1";
  const MODULE_ID = "janus7";
  let ABORT_ALL = false;

  const TESTS = [{"id": "P0-TC-01", "phase": 0, "title": "Leitbild konsistent dokumentiert", "prio": "P0", "type": "M", "requires": ["Leitplan & Entwickler-Doku vorhanden"], "steps": ["1. Beide Dokumente öffnen", "2. Phasen 0-8 prüfen", "3. Leitplanken prüfen", "4. Auf Widersprüche achten"], "expected": "Alle Leitplanken klar dokumentiert, keine DSA5-Logik im Core", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P0-TC-02", "phase": 0, "title": "Architekturdiagramm vollständig", "prio": "P1", "type": "M", "requires": ["Aktuelles Architekturdiagramm liegt vor"], "steps": ["1. Diagramm öffnen", "2. Phasen 0-7 verortet?", "3. Datenflüsse prüfen"], "expected": "Alle Phasen dargestellt, Datenflüsse klar", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P0-TC-03", "phase": 0, "title": "Tech-Stack dokumentiert", "prio": "P1", "type": "M", "requires": ["Entwickler-Dokumentation vorhanden"], "steps": ["1. Tech-Stack-Sektion prüfen", "2. Foundry v13, ESM, ApplicationV2 dokumentiert?", "3. Externe Abhängigkeiten?"], "expected": "Vollständige Liste: Foundry v13, ES Modules, keine Build-Steps", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-01", "phase": 1, "title": "Engine wird geladen", "prio": "P0", "type": "M", "requires": ["Modul 'janus7' aktiviert"], "steps": ["1. Welt starten", "2. Konsole öffnen", "3. game.janus7 prüfen"], "expected": "game.janus7 ist Objekt mit .core", "snippets": [{"title": "Konsole", "code": "game.janus7"}]}, {"id": "P1-TC-02", "phase": 1, "title": "State-Registrierung erfolgreich", "prio": "P0", "type": "M", "requires": ["P1-TC-01 bestanden"], "steps": ["1. game.settings.get('janus7', 'coreState')", "2. Struktur prüfen"], "expected": "Objekt mit version, time, academy, actors, meta", "snippets": [{"title": "Konsole", "code": "game.settings.get('janus7', 'coreState')"}, {"title": "Konsole", "code": "game.settings.get('janus7',"}]}, {"id": "P1-TC-03", "phase": 1, "title": "State Get/Set funktioniert", "prio": "P0", "type": "M", "requires": ["P1-TC-02 bestanden"], "steps": ["1. day = state.get('time.day')", "2. state.set('time.day', day+1)", "3. save()", "4. Reload", "5. Prüfen"], "expected": "day korrekt inkrementiert und persistiert", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-04", "phase": 1, "title": "State-Transaktion mit Rollback", "prio": "P0", "type": "M", "requires": ["P1-TC-03 bestanden"], "steps": ["1. Snapshot erstellen", "2. Transaction mit Fehler", "3. State prüfen"], "expected": "State bei Fehler auf Snapshot zurückgesetzt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-05", "phase": 1, "title": "Dirty-Tracking vermeidet Saves", "prio": "P1", "type": "M", "requires": ["P1-TC-03 bestanden"], "steps": ["1. State laden", "2. save() ohne Änderung", "3. Log prüfen"], "expected": "Keine Write-Operation, 'nicht dirty' im Log", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-06", "phase": 1, "title": "Logger-Level dynamisch änderbar", "prio": "P1", "type": "M", "requires": ["P1-TC-01 bestanden"], "steps": ["1. config.set('debugLevel', 'debug')", "2. logger.debug('Test')", "3. Konsole prüfen"], "expected": "Debug-Nachricht mit [JANUS7] [DEBUG] Prefix", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-07", "phase": 1, "title": "Export/Import State", "prio": "P0", "type": "M", "requires": ["P1-TC-03 bestanden"], "steps": ["1. json = io.exportStateAsJSON()", "2. JSON editieren", "3. importStateFromJSON()"], "expected": "State korrekt exportiert/importiert", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-08", "phase": 1, "title": "Import-Validierung blockiert", "prio": "P0", "type": "M", "requires": ["P1-TC-07 bestanden"], "steps": ["1. Invalides JSON (time: null)", "2. Import versuchen", "3. Fehler abfangen"], "expected": "Import blockiert, State unverändert, Fehler geloggt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-09", "phase": 1, "title": "autoSave-Setting funktioniert", "prio": "P1", "type": "M", "requires": ["P1-TC-06 bestanden"], "steps": ["1. autoSave = false", "2. State ändern", "3. save()", "4. Log prüfen"], "expected": "Warnung 'autoSave deaktiviert', keine Write", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-10", "phase": 1, "title": "Validator erkennt Pflichtfelder", "prio": "P0", "type": "M", "requires": ["P1-TC-02 bestanden"], "steps": ["1. State ohne 'time'", "2. validateState()", "3. Result prüfen"], "expected": "valid: false, errors enthält 'State.time fehlt'", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P1-TC-11", "phase": 1, "title": "Core-Hooks nur in janus.mjs", "prio": "P1", "type": "A", "requires": ["Modul aktiv"], "steps": ["1. Modulcode auf direkte Hooks.callAll-Aufrufe prüfen", "2. Einzige erlaubte Quelle ist emitHook() in core/hooks/emitter.js"], "expected": "Kein direktes Hooks.callAll('janus...') außerhalb des Emitters", "snippets": [{"title": "Konsole", "code": "// auto — siehe P1_TC_11__core_hooks_nur_in_janus_mjs.test.js"}]}, {"id": "P1-TC-12", "phase": 1, "title": "Phase-7-Feature-Flag Setting existiert", "prio": "P1", "type": "A", "requires": ["Modul aktiv", "Phase 1 geladen"], "steps": ["1. game.settings.get('janus7','phase7Enabled') aufrufen", "2. Wert muss boolean sein"], "expected": "Setting 'phase7Enabled' existiert und liefert boolean", "snippets": [{"title": "Konsole", "code": "game.settings.get('janus7', 'phase7Enabled')"}]}, {"id": "P1-TC-13", "phase": 1, "title": "Test-Registry lehnt Duplikate ab", "prio": "P1", "type": "A", "requires": ["Test-Registry initialisiert"], "steps": ["1. Gleiche Test-ID zweimal registrieren", "2. Fehler prüfen"], "expected": "Zweites register() wirft Error mit Hinweis auf duplicate id", "snippets": [{"title": "Konsole", "code": "// auto — siehe P1_TC_13__test_registry_rejects_duplicates.test.js"}]}, {"id": "P1-TC-14", "phase": 1, "title": "JanusCapabilities: Namespace-Vollständigkeit + Freeze", "prio": "P0", "type": "A", "requires": ["Phase 1 geladen", "game.janus7.capabilities vorhanden"], "steps": ["1. game.janus7.capabilities prüfen", "2. Alle 6 Namespaces (time, scoring, quests, lesson, ki, state) vorhanden?", "3. Alle frozen (Object.isFrozen)?", "4. Alle erwarteten Methoden je Namespace vorhanden?", "5. capabilities.state.snapshot() liefert Deep-Clone?"], "expected": "Alle 6 Namespaces + Methoden vorhanden, alle frozen, snapshot() ist isolierter Klon", "snippets": [{"title": "Konsole", "code": "Object.keys(game.janus7.capabilities)"}, {"title": "Konsole", "code": "Object.isFrozen(game.janus7.capabilities.ki)"}]}, {"id": "P1-TC-15", "phase": 1, "title": "capabilities.state.runHealthCheck() — Smoke-Test", "prio": "P1", "type": "A", "requires": ["P1-TC-14 bestanden"], "steps": ["1. await game.janus7.capabilities.state.runHealthCheck() aufrufen", "2. Rückgabe-Objekt prüfen: { ok, checks, warnings? }", "3. ok muss boolean sein, checks muss Array sein"], "expected": "runHealthCheck() liefert { ok: boolean, checks: Array } ohne Exception", "snippets": [{"title": "Konsole", "code": "const r = await game.janus7.capabilities.state.runHealthCheck();\nconsole.log('Health:', r.ok, r.checks.length, 'checks')"}]}, {"id": "P2-TC-01", "phase": 2, "title": "JSON-Loader lädt Akademie-Daten", "prio": "P0", "type": "M", "requires": ["data/academy/*.json existieren"], "steps": ["1. academy.loadData('calendar')", "2. Daten prüfen"], "expected": "Kalender-JSON geladen, als Objekt verfügbar", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P2-TC-02", "phase": 2, "title": "Lektionen-Schema validiert", "prio": "P0", "type": "M", "requires": ["JSON-Schema für lessons.json"], "steps": ["1. Valide Lektion laden", "2. Invalide Lektion (fehlendes duration)", "3. Validierung"], "expected": "Valide akzeptiert, invalide rejected mit Fehler", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P2-TC-03", "phase": 2, "title": "NPC-Daten referenzieren UUIDs", "prio": "P1", "type": "M", "requires": ["npcs.json mit actorUuid"], "steps": ["1. NPC-JSON inspizieren", "2. UUID Format prüfen", "3. UUID auflösen"], "expected": "Alle NPCs haben valide UUIDs, kein Hardcoded-Content", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P2-TC-04", "phase": 2, "title": "Caching verhindert doppeltes Laden", "prio": "P1", "type": "M", "requires": ["P2-TC-01 bestanden"], "steps": ["1. Kalender 2x laden", "2. File-Read-Counter"], "expected": "Zweiter Load aus Cache, keine File-I/O", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P2-TC-05", "phase": 2, "title": "Examen-Fragen aus JSON", "prio": "P0", "type": "M", "requires": ["exam-questions.json vorhanden"], "steps": ["1. Examen für EXAM_MAG_BASICS_01 laden", "2. Fragen/Antworten prüfen"], "expected": "Mind. 10 Fragen mit je 4 Antworten, correctAnswer-Index", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P2-TC-06", "phase": 2, "title": "Ort-Beschreibungen mehrsprachig", "prio": "P2", "type": "M", "requires": ["locations.json mit i18n-Keys"], "steps": ["1. Ort 'LIBRARY' laden", "2. description.de und .en prüfen"], "expected": "Beide Sprachen vorhanden, Keys folgen Pattern", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-01", "phase": 3, "title": "DSA5 Roll-API funktioniert", "prio": "P0", "type": "M", "requires": ["dsa5-System aktiv", "PC vorhanden"], "steps": ["1. actor = actors.getName('Magier')", "2. dsa5.rollSkill(actor, 'Magiekunde')", "3. Ergebnis"], "expected": "Roll-Result-Objekt mit success, quality, roll", "snippets": [{"title": "Konsole (Roll)", "code": "const actor = game.actors.getName('Magier');\nawait game.janus7.dsa5.rollSkill(actor, 'Magiekunde', { modifier: 0, silent: true });"}]}, {"id": "P3-TC-02", "phase": 3, "title": "Roll-Modifikatoren angewendet", "prio": "P0", "type": "M", "requires": ["P3-TC-01 bestanden"], "steps": ["1. Roll mit modifier: +3", "2. Roll-Daten prüfen", "3. Modifier sichtbar?"], "expected": "Modifier addiert, im Roll-Chat angezeigt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-03", "phase": 3, "title": "Actor-Wrapper isoliert DSA5", "prio": "P1", "type": "M", "requires": ["JanusActorWrapper implementiert"], "steps": ["1. wrapper = dsa5.wrapActor(actor)", "2. getSkillValue('Magiekunde')", "3. Core-Code prüfen"], "expected": "Wrapper liefert abstrahierte Daten, keine direkte DSA5-Abhängigkeit", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-04", "phase": 3, "title": "Combat-Integration (optional)", "prio": "P2", "type": "M", "requires": ["Combat-Szene aktiv"], "steps": ["1. Duell-Szene erstellen", "2. getCombatState()", "3. Combatant ermitteln"], "expected": "Combat-State abrufbar, Initiativreihenfolge korrekt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-05", "phase": 3, "title": "Item-Bridge für Zauberformeln", "prio": "P1", "type": "M", "requires": ["PC mit Zauberformeln"], "steps": ["1. spells = dsa5.getActorSpells(actor)", "2. Spell-Liste prüfen"], "expected": "Array von Spell-Objekten mit name, tradition, difficulty", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-01", "phase": 4, "title": "Kalender-Fortschritt (1 Tag)", "prio": "P0", "type": "M", "requires": ["State geladen", "Kalender-Daten"], "steps": ["1. Tag notieren", "2. director.advanceTime(1, 'day')", "3. State prüfen"], "expected": "time.day +1, month/year ggf. angepasst", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-02", "phase": 4, "title": "Lektion-Scheduling bei Zeit", "prio": "P0", "type": "M", "requires": ["P4-TC-01", "Lektionsplan vorhanden"], "steps": ["1. Auf Montag springen", "2. getActiveLessons()", "3. Mit JSON abgleichen"], "expected": "Korrekte Lektion für Wochentag + Uhrzeit", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-03", "phase": 4, "title": "Event-System triggert", "prio": "P1", "type": "M", "requires": ["Event-Engine implementiert"], "steps": ["1. Hook 'janus7.eventTriggered' registrieren", "2. Meilenstein erfüllen", "3. Hook prüfen"], "expected": "Event gefeuert, Daten enthalten Typ, Kontext", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-04", "phase": 4, "title": "Social-Graph: Beziehungen", "prio": "P1", "type": "M", "requires": ["Social-Graph-Modul aktiv"], "steps": ["1. social.addInteraction(pc1, npc1, 'positive')", "2. getRelationship()", "3. Score"], "expected": "Beziehungswert erhöht, persistiert", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-05", "phase": 4, "title": "Scoring-System: Lektion", "prio": "P1", "type": "M", "requires": ["Scoring-Modul implementiert"], "steps": ["1. Score notieren", "2. scoring.completeLesson(pc, lessonId, perf)", "3. Score prüfen"], "expected": "Score erhöht basierend auf Performance, Log-Eintrag", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-06", "phase": 4, "title": "Automatische Ferien-Erkennung", "prio": "P2", "type": "M", "requires": ["Ferienkalender in calendar.json"], "steps": ["1. Auf Ferientag springen", "2. isHoliday()", "3. Lektion-Scheduling"], "expected": "isHoliday = true, keine Lektionen an Ferientagen", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P4-TC-07", "phase": 4, "title": "RollScoringConnector: kanonischer HOOKS.ROLL_COMPLETED", "prio": "P0", "type": "A", "requires": ["Phase 4 geladen", "RollScoringConnector aktiv"], "steps": ["1. HOOKS.ROLL_COMPLETED-String mit Legacy-Hook-String vergleichen", "2. RollScoringConnector darf nur kanonischen Hook-String lauschen", "3. Kein direktes Hooks.on('janus7RollCompleted') mehr"], "expected": "Connector lauscht auf HOOKS.ROLL_COMPLETED aus topics.js, kein Legacy-String", "snippets": [{"title": "Konsole", "code": "// auto — siehe P4_TC_07__roll_scoring_connector_canonical_hook.test.js"}]}, {"id": "P4-TC-08", "phase": 4, "title": "JanusCron: Periodenauflösung daily/weekly/trimester", "prio": "P1", "type": "A", "requires": ["Phase 4 geladen", "JanusCron verfügbar"], "steps": ["1. JanusCron ohne Eingebaut-Jobs instantiieren", "2. _tick() mit initialem null-State aufrufen — kein Job darf feuern", "3. _tick() mit neuem Tag aufrufen — nur daily", "4. _tick() mit neuer Woche — daily + weekly", "5. _tick() mit neuem Trimester — alle drei"], "expected": "Erster Tick = 0 Jobs (null-Guard). Danach korrekte Perioden-Erkennung.", "snippets": [{"title": "Konsole", "code": "// auto — siehe P4_TC_08__cron_period_detection.test.js"}]}, {"id": "P5-TC-01", "phase": 5, "title": "Beamer-View wechselt Location", "prio": "P0", "type": "M", "requires": ["Beamer-View-UI", "Szenen vorhanden"], "steps": ["1. atmosphere.setLocation('LIBRARY')", "2. Beamer-Ansicht prüfen"], "expected": "Szene 'Bibliothek' aktiviert, Hintergrundbild sichtbar", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P5-TC-02", "phase": 5, "title": "Playlist-Steuerung: Mood", "prio": "P1", "type": "M", "requires": ["Mood-Playlists konfiguriert"], "steps": ["1. atmosphere.setMood('studious')", "2. Aktive Playlist prüfen"], "expected": "Playlist 'Akademie-Ambient' spielt, Lautstärke ok", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P5-TC-03", "phase": 5, "title": "Zeit-des-Tages-Moods", "prio": "P2", "type": "M", "requires": ["P5-TC-02 bestanden"], "steps": ["1. time.hour = 6", "2. updateMoodByTime()", "3. Mood prüfen"], "expected": "Mood wechselt zu 'morning', passende Playlist", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P5-TC-04", "phase": 5, "title": "Overlay-UI für Beamer", "prio": "P2", "type": "M", "requires": ["Overlay-Canvas implementiert"], "steps": ["1. showOverlay('exam_countdown', {seconds: 300})", "2. Beamer prüfen"], "expected": "Countdown-Timer als Overlay auf Beamer", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P6-TC-01", "phase": 6, "title": "Control Panel öffnet", "prio": "P0", "type": "M", "requires": ["Control-Panel-UI als ApplicationV2"], "steps": ["1. JANUS7-Icon klicken", "2. Control Panel öffnet"], "expected": "UI ohne Fehler, zeigt time, activeLesson, quick-actions", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P6-TC-02", "phase": 6, "title": "MCQ-Examen-UI lädt Fragen", "prio": "P0", "type": "M", "requires": ["MCQ-UI", "exam-questions.json"], "steps": ["1. MCQ-UI für EXAM_MAG_BASICS_01 öffnen", "2. Mit JSON vergleichen"], "expected": "Alle Fragen korrekt, keine Hardcoded-Texte", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P6-TC-03", "phase": 6, "title": "Dashboard: PC-Übersicht", "prio": "P1", "type": "M", "requires": ["Dashboard-UI implementiert"], "steps": ["1. Dashboard öffnen", "2. PC-Liste, Scores, Lektionen prüfen"], "expected": "Daten stimmen mit State, UI reagiert auf Updates", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P6-TC-04", "phase": 6, "title": "Quick-Action: Zeit vorspulen", "prio": "P1", "type": "M", "requires": ["Control Panel mit Time-Controls"], "steps": ["1. 'Zeit +1 Tag' Button klicken", "2. UI und State prüfen"], "expected": "Zeit korrekt inkrementiert, UI aktualisiert", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P6-TC-05", "phase": 6, "title": "Responsive Layout", "prio": "P2", "type": "M", "requires": ["Control Panel implementiert"], "steps": ["1. Browser-Fenster auf 1024px", "2. UI prüfen"], "expected": "Layout passt sich an, keine Überlappungen", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P7-TC-01", "phase": 7, "title": "KI-Export anonymisiert", "prio": "P0", "type": "M", "requires": ["KI-Export-Funktion implementiert"], "steps": ["1. ai.exportForAI()", "2. JSON inspizieren"], "expected": "Struktur-Daten vorhanden, keine PC-Namen, keine persönlichen Daten", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P7-TC-02", "phase": 7, "title": "KI-Patches werden validiert", "prio": "P0", "type": "M", "requires": ["Patch-Import implementiert"], "steps": ["1. Invaliden Patch erstellen", "2. Import versuchen"], "expected": "Validator blockiert, State unverändert, Fehler geloggt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P7-TC-03", "phase": 7, "title": "Diff-Anzeige vor Patch", "prio": "P1", "type": "M", "requires": ["P7-TC-02 bestanden"], "steps": ["1. Validen Patch laden", "2. ai.previewPatch(patch)", "3. Diff prüfen"], "expected": "Diff zeigt Änderungen (hinzugefügte/geänderte Lektionen)", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P7-TC-04", "phase": 7, "title": "Backup vor Patch-Anwendung", "prio": "P1", "type": "M", "requires": ["P7-TC-03 bestanden"], "steps": ["1. Snapshot erstellen", "2. Patch anwenden", "3. Bei Fehler: Rollback"], "expected": "Bei Fehler State auf Snapshot zurückgesetzt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "INT-TC-01", "phase": 99, "title": "E2E: Lektion starten → abschließen", "prio": "P0", "type": "M", "requires": ["Phase 1-4 implementiert"], "steps": ["1. Zeit auf Lektionsbeginn", "2. Lektion holen", "3. DSA5-Probe", "4. Scoring", "5. Zeit vorspulen"], "expected": "Kompletter Flow ohne Fehler, Score aktualisiert, State gespeichert", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "INT-TC-02", "phase": 99, "title": "KI-Roundtrip: Export → Import", "prio": "P0", "type": "M", "requires": ["Phase 7 implementiert"], "steps": ["1. State exportieren", "2. JSON editieren (Lektion hinzufügen)", "3. Patch importieren", "4. Verifizieren"], "expected": "Neue Lektion im System, alle Referenzen korrekt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "INT-TC-03", "phase": 99, "title": "Multi-User: State-Sync", "prio": "P1", "type": "M", "requires": ["2 Clients in gleicher Welt"], "steps": ["1. Client A: Zeit vorspulen", "2. Client B: State-Update?", "3. Client B: UI aktualisiert?"], "expected": "State-Änderung propagiert, UIs synchron", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "INT-TC-04", "phase": 99, "title": "Beamer + Control Panel Sync", "prio": "P1", "type": "M", "requires": ["Phase 5+6 implementiert"], "steps": ["1. Control Panel: Location ändern", "2. Beamer-View prüfen"], "expected": "Beamer zeigt neue Location sofort", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "PERF-TC-01", "phase": 99, "title": "State-Load unter 200ms", "prio": "P1", "type": "M", "requires": ["State mit 50 PCs", "100 NPCs"], "steps": ["1. Performance.now() vor/nach load()", "2. Delta berechnen"], "expected": "Load-Zeit < 200ms", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "PERF-TC-02", "phase": 99, "title": "JSON-Loader cacht effizient", "prio": "P1", "type": "M", "requires": ["Phase 2 implementiert"], "steps": ["1. 100x academy.loadData('calendar')", "2. Ladezeit messen"], "expected": "Nur 1. Load hat File-I/O, weitere < 1ms aus Cache", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "PERF-TC-03", "phase": 99, "title": "UI-Rendering unter 16ms", "prio": "P2", "type": "M", "requires": ["Control Panel mit vielen PCs"], "steps": ["1. DevTools Performance-Tab", "2. State-Update triggern", "3. Frame-Zeit"], "expected": "Re-Render < 16ms, keine Ruckler", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "SEC-TC-01", "phase": 99, "title": "Import validiert alle Felder", "prio": "P0", "type": "M", "requires": ["Validator mit JSON-Schema"], "steps": ["1. Malformed JSON mit zusätzlichen Properties", "2. Validierung"], "expected": "Zusätzliche/unbekannte Felder werden rejected", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "SEC-TC-02", "phase": 99, "title": "Keine Script-Injection in UI", "prio": "P0", "type": "M", "requires": ["UI rendert User-Input"], "steps": ["1. String mit <script>alert('XSS')</script> in State", "2. UI rendern"], "expected": "Script wird escaped/sanitized, nicht ausgeführt", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "SEC-TC-03", "phase": 99, "title": "Keine Actor-Manipulation ohne Berechtigung", "prio": "P1", "type": "M", "requires": ["Multi-User", "Player ohne GM"], "steps": ["1. Als Player: dsa5.rollSkill(gmActor, 'skill')"], "expected": "Fehler oder Permission-Check, kein unbefugter Zugriff", "snippets": [{"title": "Konsole (Roll)", "code": "const actor = game.actors.getName('Magier');\nawait game.janus7.dsa5.rollSkill(actor, 'Magiekunde', { modifier: 0, silent: true });"}]}, {"id": "REG-TC-01", "phase": 99, "title": "autoSave-Bug (aus Review)", "prio": "P0", "type": "M", "requires": ["Phase 1 mit autoSave-Fix"], "steps": ["1. autoSave = false", "2. State ändern", "3. save()", "4. Log prüfen"], "expected": "Keine Settings-Write, Warnung im Log", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "REG-TC-02", "phase": 99, "title": "Import ohne Validierung (Review)", "prio": "P0", "type": "M", "requires": ["Phase 1 mit Import-Validierung"], "steps": ["1. Invalides JSON importieren", "2. Error catchen"], "expected": "Import blockiert, State unverändert", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "REG-TC-03", "phase": 99, "title": "Unnötiges Save nach load()", "prio": "P1", "type": "M", "requires": ["Phase 1 mit optimiertem load()"], "steps": ["1. State laden (existiert bereits)", "2. Log prüfen"], "expected": "Keine unnötige Save-Operation, nur bei neuer Init", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-06", "phase": 3, "title": "DSA5-Bridge initialisiert & prüft Kompatibilität", "prio": "P0", "type": "M", "requires": ["World nutzt System 'dsa5'", "JANUS7 aktiv", "Konsole verfügbar"], "steps": ["1) World laden", "2) Konsole: game.janus7.system?.dsa5 oder game.janus7.bridge?.dsa5 prüfen", "3) dsa5 deaktivieren/anderes System (Negativtest) und erneut starten"], "expected": "Positiv: Bridge-Objekt existiert, loggt 'DSA5 bridge ready' und exportiert Public-API. Negativ: loggt klare Warnung und deaktiviert Bridge ohne Crash.", "snippets": [{"title": "Konsole", "code": "game.janus7"}, {"title": "Konsole", "code": "game.janus7.system?.dsa5"}]}, {"id": "P3-TC-07", "phase": 3, "title": "Roll-Ergebnis wird auf JANUS7-Result normalisiert", "prio": "P0", "type": "M", "requires": ["P3 Rolls-Wrapper implementiert", "Test-Actor mit Talent/Zauber vorhanden"], "steps": ["1) rollTalentCheck / rollSpellCheck via Bridge aufrufen", "2) Rückgabeobjekt inspizieren", "3) Optional: ChatMessage-ID prüfen"], "expected": "Rückgabe enthält ein stabiles Result-Objekt (success, qualityStep/degree, totals, modifiers, raw/systemPayload, chatMessageId). Kein DSA5-internes Objekt muss extern interpretiert werden.", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-08", "phase": 3, "title": "Actor-Lookup via Academy NPC-ID (UUID → Fallback) funktioniert", "prio": "P0", "type": "M", "requires": ["Phase 2 NPCs mit actorUuid/actorKey", "mindestens 1 NPC in World/Compendium"], "steps": ["1) AcademyDataApi.getNPC('NPC_…') holen", "2) Bridge resolveActor(npc) ausführen", "3) UUID absichtlich entfernen → Fallback-Strategie testen"], "expected": "Mit UUID: exakt der Actor wird geladen. Ohne UUID: definierter Fallback (z.B. actorKey/Name) greift oder gibt null mit sauberem Warn-Log zurück – kein Crash.", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-09", "phase": 3, "title": "Item-Bridge: Zauberformel per UUID/Compendium finden & zuweisen", "prio": "P1", "type": "M", "requires": ["dsa5-magic (oder entsprechender Pack) aktiv", "Item-Bridge implementiert"], "steps": ["1) Zauber-UUID oder compendiumRef definieren", "2) Bridge.resolveItem(...) ausführen", "3) Optional: dem Actor hinzufügen (createEmbeddedDocuments)"], "expected": "Item wird korrekt geladen. Beim Zuweisen entstehen keine Duplikate/Inkonsistenzen. Fehlerfälle liefern klare Meldung (fehlender Pack/UUID).", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-10", "phase": 3, "title": "Packs/Indexer: dsa5-Index wird erzeugt & gecached", "prio": "P1", "type": "M", "requires": ["packs.js implementiert", "relevante Compendia vorhanden"], "steps": ["1) Bridge.packs.buildIndex() ausführen", "2) Ergebnisgröße/Schlüssel prüfen", "3) zweiten Lauf messen (Cache-Hit)"], "expected": "Index enthält erwartete Entitäten (Talente/Zauber/Vorteile nach Scope). Zweiter Lauf nutzt Cache (signifikant schneller).", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-11", "phase": 3, "title": "Diagnostics: Healthcheck meldet fehlende Packs/Versionen", "prio": "P1", "type": "M", "requires": ["diagnostics.js implementiert", "gezielt ein Pack deaktivierbar"], "steps": ["1) Bridge.diagnostics.run() aufrufen", "2) gezielt Pack deaktivieren", "3) erneut ausführen"], "expected": "Report enthält: System-Version, Modul-Versionen, fehlende Packs/Keys, Severity (info/warn/error) und konkrete Handlungsempfehlungen.", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}, {"id": "P3-TC-12", "phase": 3, "title": "Fehlerfälle sind typed & crashen nicht (Actor/Skill/Item fehlt)", "prio": "P0", "type": "M", "requires": ["Bridge-Fehlerobjekt/Fehlercodes definiert"], "steps": ["1) rollTalentCheck mit unbekanntem skillId", "2) resolveActor mit ungültiger UUID", "3) resolveItem mit unbekannter UUID"], "expected": "Bridge wirft/returnt definierte Fehlerstruktur (code, message, context). Logger bekommt Warnungen; UI kann Fehler anzeigen; keine unhandled Promise Rejection.", "snippets": [{"title": "Konsole", "code": "// (manuell) siehe Testschritte im Dialog"}]}];

  const MAX_PHASE_CHOICES = [
    { value: 0, label: "Phase 0 (Doku/Leitbild/Diagramme)" },
    { value: 1, label: "Phase 1 (Core/State/Validator)" },
    { value: 2, label: "Phase 2 (Academy/Data)" },
    { value: 3, label: "Phase 3 (DSA5 Bridge)" },
    { value: 4, label: "Phase 4 (UI/Director)" },
    { value: 5, label: "Phase 5 (IO/Exporter/Importer)" },
    { value: 6, label: "Phase 6 (Integration/Regression)" },
    { value: 7, label: "Phase 7 (Hardening)" },
    { value: 99, label: "Alles (Phase 0–7 komplett)" },
  ];

  // ---------- helpers ----------
  const ts = () => new Date().toISOString();
  const isoSafe = (d) => d.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const fmtMs = (ms) => `${Math.round(ms)}ms`;

  function escHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function safeString(v) {
    try {
      if (typeof v === "string") return v;
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  function formatConsoleArg(a) {
    if (a instanceof Error) return a.stack || a.message || String(a);
    if (typeof a === "string") return a;
    return safeString(a);
  }

  function formatConsoleLine(level, args) {
    const body = (args ?? []).map(formatConsoleArg).join(" ");
    return `[${level}] ${body}`;
  }

  /**
   * Führt eine Async-Funktion aus und zeichnet dabei console-Ausgaben auf.
   * Wichtig: Wir lassen die Original-Konsole weiterhin laufen (Debuggability),
   * aber übernehmen zusätzlich den kompletten Text in die Test-Notizen.
   */
  async function withConsoleCapture(fn) {
    const buf = [];
    const orig = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    const wrap = (level, original) => (...args) => {
      try { buf.push(formatConsoleLine(level, args)); } catch { /* ignore */ }
      return original.apply(console, args);
    };

    console.log = wrap("LOG", orig.log);
    console.info = wrap("INFO", orig.info);
    console.warn = wrap("WARN", orig.warn);
    console.error = wrap("ERROR", orig.error);
    console.debug = wrap("DEBUG", orig.debug);

    try {
      const result = await fn();
      return { result, logs: buf };
    } catch (e) {
      // Logs auch im Fehlerfall verfügbar machen.
      try { e.__janusCapturedLogs = buf; } catch { /* ignore */ }
      throw e;
    } finally {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
      console.error = orig.error;
      console.debug = orig.debug;
    }
  }

  function downloadText(filename, content) {
    foundry.utils.saveDataToFile(content, "text/plain", filename);
  }
  function downloadJson(filename, obj) {
    foundry.utils.saveDataToFile(JSON.stringify(obj, null, 2), "application/json", filename);
  }

  // ---------- global abort panel ----------
  function showAbortPanel() {
    const content = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <div style="font-weight:700;">JANUS7 – Tests laufen…</div>
          <div style="opacity:.85;">Abbruch stoppt nach dem aktuellen Test.</div>
        </div>
        <button type="button" id="janus7-abort-btn" style="min-width:140px;">⛔ Abbrechen</button>
      </div>
      <div style="margin-top:10px;">
        <div style="font-size:.9em; opacity:.8;">Status:</div>
        <div id="janus7-abort-status" style="font-family:monospace;">RUNNING</div>
      </div>
    `;

    const dlg = new Dialog({
      title: "JANUS7 Runner Control",
      content,
      buttons: {
        close: { label: "Fenster schließen", callback: () => {} },
      },
      render: (html) => {
        html.find("#janus7-abort-btn").on("click", () => {
          ABORT_ALL = true;
          html.find("#janus7-abort-status").text("ABORT REQUESTED");
          ui.notifications.warn("[JANUS7] Abbruch angefordert. Stoppe nach aktuellem Test.");
        });
      },
    }, { width: 520 });
    dlg.render(true);
    return dlg;
  }

  // ---------- ask max phase ----------
  async function askMaxPhase() {
    const options = MAX_PHASE_CHOICES.map(
      (c) => `<option value="${c.value}">${escHtml(c.label)}</option>`
    ).join("");

    const content = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <div style="font-weight:700;">Bis zu welcher Phase testen?</div>
          <div style="opacity:.85;">Phase X bedeutet Phase 0–X (inkl.).</div>
        </div>

        <label>Max-Phase</label>
        <select name="maxPhase" style="width:100%;">
          ${options}
        </select>

        <label style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <input name="showExpectedInNotes" type="checkbox" checked/>
          <span>Erwartung + Schritte als Notiz-Header vorbefüllen</span>
        </label>
      </div>
    `;

    return await new Promise((resolve) => {
      new Dialog({
        title: "JANUS7 TestRunner – Start",
        content,
        buttons: {
          ok: {
            label: "Start",
            callback: (html) => {
              const maxPhase = Number(html.find('[name="maxPhase"]').val());
              const showExpectedInNotes = !!html.find('[name="showExpectedInNotes"]')[0]?.checked;
              resolve({ maxPhase, showExpectedInNotes });
            }
          },
          cancel: {
            label: "Abbrechen",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }, { width: 560 }).render(true);
    });
  }

  // ---------- snippet execution ----------
  async function executeSnippet(code, ctx) {
    // Wir erlauben "await" im Code via async-IIFE.
    // KEIN Fremdinput zur Laufzeit – Code ist Teil des Makros.
    const fn = new Function("ctx","game","ui","foundry","CONFIG","canvas", `
      return (async () => {
        ${code}
      })()
    `);
    return await withConsoleCapture(async () => fn(ctx, game, ui, foundry, CONFIG, canvas));
  }

  // ---------- snippet UI ----------
  function renderSnippet({ id, title, code }) {
    return `
    <section style="border:1px solid var(--color-border-light-2); border-radius:8px; padding:10px; margin:10px 0;">
      <header style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div style="font-weight:700;">${escHtml(title)}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button type="button" data-sn-run="${id}">Ausführen</button>
          <button type="button" data-sn-copy="${id}">Copy</button>
        </div>
      </header>

      <textarea data-sn-ta="${id}"
        style="width:100%; min-height:110px; margin-top:8px;
               font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;"
      >${escHtml(code)}</textarea>

      <pre data-sn-out="${id}"
        style="margin-top:8px; padding:8px; background:rgba(0,0,0,.05);
               border-radius:6px; white-space:pre-wrap;"
      >Bereit.</pre>
    </section>`;
  }

  function wireSnippets(html, registry, notesEl) {
    const out = (id, msg) => html.find(`[data-sn-out="${id}"]`).text(msg);

    // click in textarea => select all
    html.on("click", "textarea[data-sn-ta]", (ev) => {
      const ta = ev.currentTarget;
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
    });

    // copy
    html.on("click", "button[data-sn-copy]", async (ev) => {
      const id = ev.currentTarget.dataset.snCopy;
      const ta = html.find(`[data-sn-ta="${id}"]`)[0];
      ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
      await navigator.clipboard.writeText(ta.value);
      out(id, "In Zwischenablage kopiert.");
    });

    // run => execute + append to notes
    html.on("click", "button[data-sn-run]", async (ev) => {
      const id = ev.currentTarget.dataset.snRun;
      const entry = registry.get(id);
      const ta = html.find(`[data-sn-ta="${id}"]`)[0];
      const code = ta?.value ?? entry?.code ?? "";

      try {
        out(id, "Läuft …");
        const { result, logs } = await executeSnippet(code, entry.ctx);
        const renderedResult = (result === undefined) ? "undefined" : safeString(result);
        const renderedLogs = (logs?.length ? logs.join("\n") : "");
        const combined = renderedLogs
          ? `${renderedLogs}\n\n[RETURN]\n${renderedResult}`
          : renderedResult;

        out(id, "OK:\n" + combined);

        // Ergebnis automatisch in Notizen einfügen (inkl. kompletter Console-Text):
        const stamp = `[AUTO] ${entry.testId} ${entry.title} @ ${ts()}`;
        const block = `${stamp}\nOK:\n${combined}\n`;
        const cur = notesEl.value || "";
        notesEl.value = (cur ? (cur.trimEnd() + "\n\n") : "") + block;
        notesEl.focus();
      } catch (e) {
        const renderedLogs = (e?.__janusCapturedLogs?.length ? e.__janusCapturedLogs.join("\n") : "");
        const errMsg = `${e?.message ?? String(e)}\n${e?.stack ?? ""}`.trim();
        const combinedErr = renderedLogs ? `${renderedLogs}\n\n[ERROR]\n${errMsg}` : errMsg;
        out(id, `FEHLER:\n${combinedErr}`);
        const stamp = `[AUTO-ERROR] ${entry.testId} ${entry.title} @ ${ts()}`;
        const block = `${stamp}\nFEHLER:\n${combinedErr}\n`;
        const cur = notesEl.value || "";
        notesEl.value = (cur ? (cur.trimEnd() + "\n\n") : "") + block;
      }
    });
  }

  // ---------- manual dialog per test ----------
  async function runOneTest(test, ctx) {
    if (ABORT_ALL) return { status: "ABORTED", notes: "Abbruch angefordert" };

    const registry = new Map();
    const snippets = [];

    for (const sn of (test.snippets ?? [])) {
      const id = foundry.utils.randomID();
      registry.set(id, {
        testId: test.id,
        title: sn.title || "Konsole",
        code: sn.code || "",
        ctx
      });
      snippets.push(renderSnippet({ id, title: sn.title || "Konsole", code: sn.code || "" }));
    }

    const headerParts = [];
    if (ctx.showExpectedInNotes) {
      headerParts.push(`[TEST] ${test.id} — ${test.title}`);
      headerParts.push(`Phase: ${test.phase} · Prio: ${test.prio} · Typ: M`);
      if (test.requires?.length) headerParts.push(`Voraussetzungen: ${test.requires.join(" | ")}`);
      if (test.expected) headerParts.push(`Erwartet: ${test.expected}`);
      if (test.steps?.length) {
        headerParts.push("Schritte:");
        for (const s of test.steps) headerParts.push(`- ${s}`);
      }
      headerParts.push("");
      headerParts.push("Ergebnis (auto eingefügt nach 'Ausführen'):");
    }

    const content = `
      <div style="margin-bottom:8px;">
        <div style="font-weight:700;">${escHtml(test.id)} — ${escHtml(test.title)}</div>
        <div style="opacity:.85;">Phase: ${escHtml(String(test.phase))} · Prio: ${escHtml(test.prio)} · Typ: M</div>
        ${test.requires?.length ? `<div style="margin-top:6px; opacity:.85;"><b>Voraussetzungen:</b> ${escHtml(test.requires.join(", "))}</div>` : ""}
        ${test.expected ? `<div style="margin-top:6px; opacity:.85;"><b>Erwartet:</b> ${escHtml(test.expected)}</div>` : ""}
      </div>

      ${snippets.join("")}

      ${test.steps?.length ? `
        <div style="margin-top:6px;">
          <b>Testschritte</b>
          <ol>${test.steps.map(s => `<li>${escHtml(s)}</li>`).join("")}</ol>
        </div>
      ` : ""}

      <hr/>
      <label>Notizen (auto wird hier eingefügt). PASS/FAIL/SKIP wählen.</label>
      <textarea name="notes" style="width:100%; min-height:140px;"></textarea>
    `;

    return await new Promise((resolve) => {
      new Dialog({
        title: `JANUS7 Manual Test: ${test.id}`,
        content,
        buttons: {
          pass: { label: "✓ PASS", callback: (html) => resolve({ status:"PASS", notes: html.find('[name="notes"]').val() }) },
          fail: { label: "✗ FAIL", callback: (html) => resolve({ status:"FAIL", notes: html.find('[name="notes"]').val() }) },
          skip: { label: "»» SKIP", callback: (html) => resolve({ status:"SKIP", notes: html.find('[name="notes"]').val() }) },
        },
        default: "pass",
        render: (html) => {
          const notesEl = html.find('[name="notes"]')[0];
          notesEl.value = headerParts.length ? headerParts.join("\n") : "";
          wireSnippets(html, registry, notesEl);
        },
      }, { width: 820 }).render(true);
    });
  }

  // ---------- run loop ----------
  const start = await askMaxPhase();
  if (!start) return;

  const ctx = {
    maxPhase: start.maxPhase,
    showExpectedInNotes: start.showExpectedInNotes
  };

  const meta = {
    runner: RUNNER_VERSION,
    exportedAt: ts(),
    foundryVersion: game.version,
    systemId: game.system?.id,
    moduleVersion: game.modules.get(MODULE_ID)?.version,
    maxPhase: ctx.maxPhase,
  };

  const abortDlg = showAbortPanel();

  const results = [];
  const tAll0 = performance.now();

  // Sort by phase then ID
  const ordered = [...TESTS].sort((a,b) => (a.phase - b.phase) || String(a.id).localeCompare(String(b.id)));

  for (const test of ordered) {
    if (ctx.maxPhase !== 99 && Number(test.phase) > ctx.maxPhase) continue;

    const t0 = performance.now();
    if (ABORT_ALL) {
      results.push({
        ts: ts(),
        Phase: test.phase,
        "Test-ID": test.id,
        Titel: test.title,
        Prio: test.prio,
        Typ: "M",
        Status: "ABORTED",
        Dauer: "0ms",
        Notizen: "Abbruch vor Ausführung"
      });
      continue;
    }

    const out = await runOneTest(test, ctx);
    const t1 = performance.now();

    results.push({
      ts: ts(),
      Phase: test.phase,
      "Test-ID": test.id,
      Titel: test.title,
      Prio: test.prio,
      Typ: "M",
      Status: out.status,
      Dauer: fmtMs(t1 - t0),
      Notizen: out.notes || ""
    });
  }

  const tAll1 = performance.now();

  // close abort panel
  try { abortDlg?.close?.(); } catch {}

  // summary
  const summary = { PASS:0, FAIL:0, SKIP:0, ABORTED:0 };
  for (const r of results) {
    if (r.Status in summary) summary[r.Status]++;
  }

  // export
  const stamp = isoSafe(new Date());
  const jsonName = `janus7-fullcatalog-testlog_${stamp}.json`;
  const txtName  = `janus7-fullcatalog-testlog_${stamp}.txt`;

  const payload = { meta: {...meta, duration: fmtMs(tAll1 - tAll0) }, summary, results };
  downloadJson(jsonName, payload);

  const lines = [];
  lines.push(`JANUS7 TESTLOG (FULL CATALOG)`);
  lines.push(`runner: ${RUNNER_VERSION}`);
  lines.push(`exportedAt: ${payload.meta.exportedAt}`);
  lines.push(`duration: ${payload.meta.duration}`);
  lines.push(`module: ${meta.moduleVersion ?? "unknown"} | foundry: ${meta.foundryVersion ?? "unknown"} | system: ${meta.systemId ?? "unknown"}`);
  lines.push(`maxPhase: ${meta.maxPhase}`);
  lines.push("");
  lines.push(`SUMMARY: PASS=${summary.PASS} FAIL=${summary.FAIL} SKIP=${summary.SKIP} ABORTED=${summary.ABORTED}`);
  lines.push("----");
  for (const r of results) {
    lines.push(`[${r.Status}] P${r.Phase} ${r["Test-ID"]} (${
      r.Prio
    }/M) ${r.Dauer} — ${r.Titel}`);
    if (r.Notizen) lines.push(`  ${String(r.Notizen).split("\n").join("\n  ")}`);
  }
  downloadText(txtName, lines.join("\n"));

  ui.notifications.info(`[JANUS7] Katalog fertig: PASS=${summary.PASS} FAIL=${summary.FAIL} SKIP=${summary.SKIP} ABORTED=${summary.ABORTED}`);
})();
