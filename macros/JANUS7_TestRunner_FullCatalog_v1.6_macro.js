(async () => {
  try {
    const { getDsa5, isDsa5Active } = await import("/modules/janus7/bridge/dsa5/index.js");

    // --- JANUS7 DSA5 Bridge helpers (auto-injected) ---
    const __janus7Core = game?.janus7?.core;
    const __janus7Logger = __janus7Core?.logger;
    const __dsa5 = __janus7Logger ? getDsa5({ logger: __janus7Logger }) : null;

    function __j7Sys(actor, path, fallback = undefined) {
      if (!__dsa5) return fallback;
      const res = __dsa5.getActorSystemValue(actor, path, fallback);
      return res?.ok ? res.value : fallback;
    }

    function __j7Cfg(path, fallback = undefined) {
      if (!__dsa5) return fallback;
      const res = __dsa5.getConfig(path);
      return res?.ok ? res.value : fallback;
    }
    // --- /JANUS7 DSA5 Bridge helpers ---

/**
 * JANUS7 TestRunner – FULL CATALOG (Erweitert) v1.6
 *
 * - Enthält alle Tests aus "JANUS7_Testkatalog_Erweitert"
 * - Behält die bestehende Runner-UX/Funktionalität (Snippets, PASS/FAIL/SKIP, Export, Abbruch) bei
 */
  const RUNNER_VERSION = "JANUS7_TESTRUNNER_FULLCATALOG_v1.6";
  const MODULE_ID = "janus7";
  let ABORT_ALL = false;

  // --- TEST DEFINITIONEN (voller Katalog) ---
  const TESTS = [
  {
    "id": "P0-TC-01",
    "phase": 0,
    "title": "Leitbild konsistent dokumentiert",
    "prio": "P0",
    "type": "M",
    "purpose": "Leitbild konsistent dokumentiert",
    "description": "Testkatalog-Check: Leitbild konsistent dokumentiert",
    "requires": [
      "Leitplan & Entwickler-Doku vorhanden"
    ],
    "steps": [
      "Beide Dokumente öffnen",
      "Phasen 0-8 prüfen",
      "Leitplanken prüfen (Hybrid-First, Data-Driven, SSOT, Modul-Agnostik, KI-Ready)",
      "Auf Widersprüche achten"
    ],
    "expected": "Alle Leitplanken klar dokumentiert, keine DSA5-Logik im Core",
    "snippets": []
  },
  {
    "id": "P0-TC-02",
    "phase": 0,
    "title": "Architekturdiagramm vollständig",
    "prio": "P1",
    "type": "M",
    "purpose": "Architekturdiagramm vollständig",
    "description": "Testkatalog-Check: Architekturdiagramm vollständig",
    "requires": [
      "Aktuelles Architekturdiagramm liegt vor"
    ],
    "steps": [
      "Diagramm öffnen",
      "Phasen 0-7 verortet?",
      "Datenflüsse zwischen Core, Academy Data, DSA5 Bridge und UI nachvollziehbar?"
    ],
    "expected": "Alle Phasen dargestellt, Datenflüsse klar, keine magischen Verbindungen",
    "snippets": []
  },
  {
    "id": "P0-TC-03",
    "phase": 0,
    "title": "Tech-Stack dokumentiert",
    "prio": "P1",
    "type": "M",
    "purpose": "Tech-Stack dokumentiert",
    "description": "Testkatalog-Check: Tech-Stack dokumentiert",
    "requires": [
      "Entwickler-Dokumentation vorhanden"
    ],
    "steps": [
      "Tech-Stack-Sektion prüfen",
      "Foundry v13, ESM, ApplicationV2 dokumentiert?",
      "Externe Abhängigkeiten aufgelistet?"
    ],
    "expected": "Vollständige Liste: Foundry v13, ES Modules, keine Build-Steps außer optional",
    "snippets": []
  },
  {
    "id": "P1-TC-01",
    "phase": 1,
    "title": "Engine wird geladen",
    "prio": "P0",
    "type": "M",
    "purpose": "Engine wird geladen",
    "description": "Testkatalog-Check: Engine wird geladen",
    "requires": [
      "Modul 'janus7' im Foundry aktiviert"
    ],
    "steps": [
      "Welt starten",
      "Konsole öffnen (F",
      "'game.janus7' eingeben"
    ],
    "expected": "game.janus7 ist ein Objekt mit .core Property",
    "snippets": [
      {
        "title": "Konsole",
        "code": "return game.janus7;"
      }
    ]
  },
  {
    "id": "P1-TC-02",
    "phase": 1,
    "title": "State-Registrierung erfolgreich",
    "prio": "P0",
    "type": "M",
    "purpose": "State-Registrierung erfolgreich",
    "description": "Testkatalog-Check: State-Registrierung erfolgreich",
    "requires": [
      "P1-TC-01 bestanden"
    ],
    "steps": [
      "game.settings.get('janus7', 'coreState') ausführen",
      "Struktur prüfen"
    ],
    "expected": "Objekt mit version, time, academy, actors, meta",
    "snippets": [
      {
        "title": "State Settings Get",
        "code": "return game.settings.get('janus7','coreState');"
      },
      {
        "title": "State API Get",
        "code": "return game.janus7?.core?.state?.get?.();"
      }
    ]
  },
  {
    "id": "P1-TC-03",
    "phase": 1,
    "title": "State Get/Set funktioniert",
    "prio": "P0",
    "type": "M/A",
    "purpose": "State Get/Set funktioniert",
    "description": "Testkatalog-Check: State Get/Set funktioniert",
    "requires": [
      "P1-TC-02 bestanden"
    ],
    "steps": [
      "day = game.janus",
      "core.state.get('time.day')",
      "game.janus",
      "core.state.set('time.day', day +",
      "await game.janus",
      "core.state.save()",
      "Welt neu laden",
      "day prüfen"
    ],
    "expected": "day wurde korrekt inkrementiert und persistiert",
    "snippets": [
      {
        "title": "State Set/Get (time.day +1)",
        "code": "const s=game.janus7.core.state;\nconst old=s.get('time.day');\nawait s.set('time.day', (old??0)+1);\nreturn {old, now:s.get('time.day')};"
      }
    ]
  },
  {
    "id": "P1-TC-04",
    "phase": 1,
    "title": "State-Transaktion mit Rollback",
    "prio": "P0",
    "type": "A",
    "purpose": "State-Transaktion mit Rollback",
    "description": "Testkatalog-Check: State-Transaktion mit Rollback",
    "requires": [
      "P1-TC-03 bestanden"
    ],
    "steps": [
      "Snapshot erstellen",
      "Transaction mit absichtlichem Fehler ausführen",
      "State nach Fehler prüfen"
    ],
    "expected": "State wird bei Fehler auf Snapshot zurückgesetzt",
    "snippets": [
      {
        "title": "Transaction Rollback (intentional)",
        "code": "const st=game.janus7.core.state;\nconst before=st.get('time.week');\ntry{\n  await st.transaction(async()=>{ await st.set('time.week', 123); throw new Error('intentional'); });\n}catch(e){/*expected*/}\nconst after=st.get('time.week');\nreturn {before, after, ok: before===after};"
      }
    ]
  },
  {
    "id": "P1-TC-05",
    "phase": 1,
    "title": "Dirty-Tracking vermeidet unnötige Saves",
    "prio": "P1",
    "type": "A",
    "purpose": "Dirty-Tracking vermeidet unnötige Saves",
    "description": "Testkatalog-Check: Dirty-Tracking vermeidet unnötige Saves",
    "requires": [
      "P1-TC-03 bestanden"
    ],
    "steps": [
      "State laden",
      "save() ohne Änderung aufrufen",
      "Log prüfen"
    ],
    "expected": "Keine Settings-Write-Operation, Log zeigt 'State nicht dirty'",
    "snippets": []
  },
  {
    "id": "P1-TC-06",
    "phase": 1,
    "title": "Logger-Level dynamisch änderbar",
    "prio": "P1",
    "type": "M",
    "purpose": "Logger-Level dynamisch änderbar",
    "description": "Testkatalog-Check: Logger-Level dynamisch änderbar",
    "requires": [
      "P1-TC-01 bestanden"
    ],
    "steps": [
      "await game.janus",
      "core.config.set('debugLevel', 'debug')",
      "game.janus",
      "core.logger.debug('Test') ausführen",
      "Konsole prüfen"
    ],
    "expected": "Debug-Nachricht erscheint in Konsole mit [JANUS7] [DEBUG] Prefix",
    "snippets": []
  },
  {
    "id": "P1-TC-07",
    "phase": 1,
    "title": "Export/Import State",
    "prio": "P0",
    "type": "M",
    "purpose": "Export/Import State",
    "description": "Testkatalog-Check: Export/Import State",
    "requires": [
      "P1-TC-03 bestanden"
    ],
    "steps": [
      "json = game.janus",
      "core.io.exportStateAsJSON()",
      "In Datei speichern",
      "JSON editieren (z.B. time.day ändern)",
      "await game.janus",
      "core.io.importStateFromJSON(json)"
    ],
    "expected": "State wird korrekt exportiert/importiert",
    "snippets": [
      {
        "title": "Export/Import Roundtrip",
        "code": "const io=game.janus7?.core?.io;\nif(!io) return 'SKIP: io fehlt';\nconst json=io.exportStateAsJSON();\nawait io.importStateFromJSON(json,{save:true,validate:true});\nreturn 'Re-Import erfolgreich.';"
      }
    ]
  },
  {
    "id": "P1-TC-08",
    "phase": 1,
    "title": "Import-Validierung blockiert invalide Daten",
    "prio": "P0",
    "type": "A",
    "purpose": "Import-Validierung blockiert invalide Daten",
    "description": "Testkatalog-Check: Import-Validierung blockiert invalide Daten",
    "requires": [
      "P1-TC-07 bestanden"
    ],
    "steps": [
      "Invalides JSON erstellen (z.B. time: null)",
      "Import versuchen",
      "Fehler abfangen"
    ],
    "expected": "Import wird blockiert, State bleibt unverändert, Fehler geloggt",
    "snippets": []
  },
  {
    "id": "P1-TC-09",
    "phase": 1,
    "title": "autoSave-Setting funktioniert",
    "prio": "P1",
    "type": "M/A",
    "purpose": "autoSave-Setting funktioniert",
    "description": "Testkatalog-Check: autoSave-Setting funktioniert",
    "requires": [
      "P1-TC-06 bestanden"
    ],
    "steps": [
      "autoSave auf false setzen",
      "State ändern",
      "save() aufrufen",
      "Log prüfen"
    ],
    "expected": "Warnung 'autoSave deaktiviert' im Log, keine Settings-Write",
    "snippets": []
  },
  {
    "id": "P1-TC-10",
    "phase": 1,
    "title": "Validator erkennt fehlende Pflichtfelder",
    "prio": "P0",
    "type": "A",
    "purpose": "Validator erkennt fehlende Pflichtfelder",
    "description": "Testkatalog-Check: Validator erkennt fehlende Pflichtfelder",
    "requires": [
      "P1-TC-02 bestanden"
    ],
    "steps": [
      "State ohne 'time' Property erstellen",
      "game.janus",
      "core.validator.validateState(state)",
      "Result prüfen"
    ],
    "expected": "valid: false, errors enthält 'State.time fehlt'",
    "snippets": []
  },
  {
    "id": "P2-TC-01",
    "phase": 2,
    "title": "JSON-Loader lädt Akademie-Daten",
    "prio": "P0",
    "type": "M/A",
    "purpose": "JSON-Loader lädt Akademie-Daten",
    "description": "Testkatalog-Check: JSON-Loader lädt Akademie-Daten",
    "requires": [
      "data/academy/*.json Dateien existieren"
    ],
    "steps": [
      "game.janus",
      "academy.loadData('calendar')",
      "Daten prüfen"
    ],
    "expected": "Kalender-JSON geladen, als Objekt verfügbar",
    "snippets": [
      {
        "title": "validateIntegrity()",
        "code": "const api=game.janus7?.academy?.data;\nif(!api) return 'SKIP: academy.data fehlt';\nconst t0=performance.now();\nconst r=api.validateIntegrity?.();\nconst t1=performance.now();\nreturn {result:r, durationMs:(t1-t0)};"
      }
    ]
  },
  {
    "id": "P2-TC-02",
    "phase": 2,
    "title": "Lektionen-Schema validiert korrekt",
    "prio": "P0",
    "type": "A",
    "purpose": "Lektionen-Schema validiert korrekt",
    "description": "Testkatalog-Check: Lektionen-Schema validiert korrekt",
    "requires": [
      "JSON-Schema für lessons.json definiert"
    ],
    "steps": [
      "Valide Lektion laden",
      "Invalide Lektion (fehlendes 'duration') laden",
      "Validierung prüfen"
    ],
    "expected": "Valide Lektion akzeptiert, invalide rejected mit spezifischem Fehler",
    "snippets": []
  },
  {
    "id": "P2-TC-03",
    "phase": 2,
    "title": "NPC-Daten referenzieren DSA5-UUIDs",
    "prio": "P1",
    "type": "M",
    "purpose": "NPC-Daten referenzieren DSA5-UUIDs",
    "description": "Testkatalog-Check: NPC-Daten referenzieren DSA5-UUIDs",
    "requires": [
      "npcs.json mit actorUuid-Feld vorhanden"
    ],
    "steps": [
      "NPC-JSON inspizieren",
      "actorUuid Format prüfen (Actor.xxxxx)",
      "UUID im Spiel auflösen"
    ],
    "expected": "Alle NPCs haben valide UUIDs, kein Hardcoded-Content",
    "snippets": []
  },
  {
    "id": "P2-TC-04",
    "phase": 2,
    "title": "Caching-Layer verhindert doppeltes Laden",
    "prio": "P1",
    "type": "A",
    "purpose": "Caching-Layer verhindert doppeltes Laden",
    "description": "Testkatalog-Check: Caching-Layer verhindert doppeltes Laden",
    "requires": [
      "P2-TC-01 bestanden"
    ],
    "steps": [
      "Kalender 2x laden",
      "File-Read-Counter prüfen"
    ],
    "expected": "Zweiter Load kommt aus Cache, keine File-I/O",
    "snippets": []
  },
  {
    "id": "P2-TC-05",
    "phase": 2,
    "title": "Examen-Fragen aus JSON laden",
    "prio": "P0",
    "type": "M",
    "purpose": "Examen-Fragen aus JSON laden",
    "description": "Testkatalog-Check: Examen-Fragen aus JSON laden",
    "requires": [
      "exam-questions.json vorhanden"
    ],
    "steps": [
      "Examen-Daten für EXAM_MAG_BASICS_01 laden",
      "Fragen und Antworten prüfen"
    ],
    "expected": "Mind. 10 Fragen mit je 4 Antwortoptionen, correctAnswer-Index gesetzt",
    "snippets": []
  },
  {
    "id": "P2-TC-06",
    "phase": 2,
    "title": "Ort-Beschreibungen mehrsprachig",
    "prio": "P2",
    "type": "M",
    "purpose": "Ort-Beschreibungen mehrsprachig",
    "description": "Testkatalog-Check: Ort-Beschreibungen mehrsprachig",
    "requires": [
      "locations.json mit i18n-Keys"
    ],
    "steps": [
      "Ort 'LIBRARY' laden",
      "description.de und description.en prüfen"
    ],
    "expected": "Beide Sprachen vorhanden, Keys folgen Pattern 'JANUS7.Locations.{ID}.Description'",
    "snippets": []
  },
  {
    "id": "P3-TC-01",
    "phase": 3,
    "title": "DSA5 Roll-API funktioniert",
    "prio": "P0",
    "type": "M",
    "purpose": "DSA5 Roll-API funktioniert",
    "description": "Testkatalog-Check: DSA5 Roll-API funktioniert",
    "requires": [
      "dsa5-System aktiv",
      "PC-Actor vorhanden"
    ],
    "steps": [
      "actor = game.actors.getName('Test-Magier')",
      "await game.janus",
      "dsa",
      "rollSkill(actor, 'Magiekunde')",
      "Ergebnis prüfen"
    ],
    "expected": "Roll-Result-Objekt mit success, quality, roll-Daten",
    "snippets": [
      {
        "title": "DSA5 Bridge vorhanden",
        "code": "const b=game.janus7?.bridge?.dsa5 || game.janus7?.dsa5;\nreturn {exists:!!b, systemId:b?.systemId, available:b?.available};"
      }
    ]
  },
  {
    "id": "P3-TC-02",
    "phase": 3,
    "title": "Roll-Modifikatoren werden angewendet",
    "prio": "P0",
    "type": "A",
    "purpose": "Roll-Modifikatoren werden angewendet",
    "description": "Testkatalog-Check: Roll-Modifikatoren werden angewendet",
    "requires": [
      "P3-TC-01 bestanden"
    ],
    "steps": [
      "Roll mit modifier: +3 ausführen",
      "Roll-Daten prüfen",
      "Modifier im Ergebnis sichtbar?"
    ],
    "expected": "Modifier korrekt addiert, im Roll-Chat angezeigt",
    "snippets": [
      {
        "title": "Resolve Academy NPC Actor",
        "code": "const fn=game.janus7?.dsa5?.resolveAcademyNpcActor;\nif(typeof fn!=='function') return 'SKIP: resolveAcademyNpcActor fehlt';\nreturn await fn('NPC_JIRDAN_FELENIUS');"
      }
    ]
  },
  {
    "id": "P3-TC-03",
    "phase": 3,
    "title": "Actor-Wrapper isoliert DSA5-Logik",
    "prio": "P1",
    "type": "M",
    "purpose": "Actor-Wrapper isoliert DSA5-Logik",
    "description": "Testkatalog-Check: Actor-Wrapper isoliert DSA5-Logik",
    "requires": [
      "JanusActorWrapper implementiert"
    ],
    "steps": [
      "wrapper = game.janus",
      "dsa",
      "wrapActor(actor)",
      "wrapper.getSkillValue('Magiekunde')",
      "Core-Code prüft nicht direkt __j7Sys(actor, \"\", {})"
    ],
    "expected": "Wrapper liefert abstrahierte Daten, keine direkte DSA5-Abhängigkeit im Core",
    "snippets": [
      {
        "title": "Roll Skill (silent)",
        "code": "const actor=game.user.character||game.actors.contents[0];\nif(!actor) return 'SKIP: kein Actor';\nconst fn=game.janus7?.dsa5?.rollSkill;\nif(typeof fn!=='function') return 'SKIP: rollSkill fehlt';\nreturn await fn(actor,'Magiekunde',{modifier:0,silent:true});"
      }
    ]
  },
  {
    "id": "P3-TC-04",
    "phase": 3,
    "title": "Combat-Integration (optional)",
    "prio": "P2",
    "type": "M",
    "purpose": "Combat-Integration (optional)",
    "description": "Testkatalog-Check: Combat-Integration (optional)",
    "requires": [
      "Combat-Szene aktiv"
    ],
    "steps": [
      "Duell-Szene erstellen",
      "game.janus",
      "dsa",
      "getCombatState()",
      "Aktiver Combatant ermitteln"
    ],
    "expected": "Combat-State abrufbar, Initiativreihenfolge korrekt",
    "snippets": [
      {
        "title": "Pack Index build + find",
        "code": "const packs=game.janus7?.bridge?.dsa5?.packs;\nif(!packs) return 'SKIP: packs API fehlt';\nawait packs.buildIndex();\nreturn await packs.findByName('Odem Arcanum',{type:'spell'});"
      }
    ]
  },
  {
    "id": "P3-TC-05",
    "phase": 3,
    "title": "Item-Bridge für Zauberformeln",
    "prio": "P1",
    "type": "M",
    "purpose": "Item-Bridge für Zauberformeln",
    "description": "Testkatalog-Check: Item-Bridge für Zauberformeln",
    "requires": [
      "PC mit Zauberformeln"
    ],
    "steps": [
      "spells = game.janus",
      "dsa",
      "getActorSpells(actor)",
      "Spell-Liste prüfen"
    ],
    "expected": "Array von Spell-Objekten mit name, tradition, difficulty",
    "snippets": [
      {
        "title": "Bridge Diagnostics",
        "code": "const b=game.janus7?.bridge?.dsa5;\nif(!b?.runDiagnostics) return 'SKIP: runDiagnostics fehlt';\nreturn await b.runDiagnostics();"
      }
    ]
  },
  {
    "id": "P4-TC-01",
    "phase": 4,
    "title": "Kalender-Fortschritt (1 Tag)",
    "prio": "P0",
    "type": "M",
    "purpose": "Kalender-Fortschritt (1 Tag)",
    "description": "Testkatalog-Check: Kalender-Fortschritt (1 Tag)",
    "requires": [
      "State geladen",
      "Kalender-Daten vorhanden"
    ],
    "steps": [
      "Aktueller Tag notieren",
      "await game.janus",
      "director.advanceTime(1, 'day')",
      "State prüfen"
    ],
    "expected": "time.day +1, time.month/year ggf. angepasst (Monatsende)",
    "snippets": []
  },
  {
    "id": "P4-TC-02",
    "phase": 4,
    "title": "Lektion-Scheduling bei Zeitfortschritt",
    "prio": "P0",
    "type": "M/A",
    "purpose": "Lektion-Scheduling bei Zeitfortschritt",
    "description": "Testkatalog-Check: Lektion-Scheduling bei Zeitfortschritt",
    "requires": [
      "P4-TC-01 bestanden",
      "Lektionsplan für Wochentag hinterlegt"
    ],
    "steps": [
      "Auf Montag springen",
      "activeLesson = game.janus",
      "director.getActiveLessons()",
      "Lektion mit calendar.json abgleichen"
    ],
    "expected": "Korrekte Lektion(en) für Wochentag + Uhrzeit ermittelt",
    "snippets": []
  },
  {
    "id": "P4-TC-03",
    "phase": 4,
    "title": "Event-System triggert bei Meilensteinen",
    "prio": "P1",
    "type": "A",
    "purpose": "Event-System triggert bei Meilensteinen",
    "description": "Testkatalog-Check: Event-System triggert bei Meilensteinen",
    "requires": [
      "Event-Engine implementiert"
    ],
    "steps": [
      "Hook 'janus",
      "eventTriggered' registrieren",
      "Meilenstein-Bedingung erfüllen (z.B. 10 Tage vergangen)",
      "Hook-Callback prüfen"
    ],
    "expected": "Event gefeuert, Event-Daten enthalten Typ, Trigger-Kontext",
    "snippets": []
  },
  {
    "id": "P4-TC-04",
    "phase": 4,
    "title": "Social-Graph: Beziehungen tracken",
    "prio": "P1",
    "type": "M",
    "purpose": "Social-Graph: Beziehungen tracken",
    "description": "Testkatalog-Check: Social-Graph: Beziehungen tracken",
    "requires": [
      "Social-Graph-Modul aktiv"
    ],
    "steps": [
      "game.janus",
      "social.addInteraction(pc1, npc1, 'positive')",
      "relationship = game.janus",
      "social.getRelationship(pc1, npc",
      "Score prüfen"
    ],
    "expected": "Beziehungswert erhöht, persistiert im State",
    "snippets": []
  },
  {
    "id": "P4-TC-05",
    "phase": 4,
    "title": "Scoring-System: Lektion abgeschlossen",
    "prio": "P1",
    "type": "M",
    "purpose": "Scoring-System: Lektion abgeschlossen",
    "description": "Testkatalog-Check: Scoring-System: Lektion abgeschlossen",
    "requires": [
      "Scoring-Modul implementiert"
    ],
    "steps": [
      "Score vor Lektion notieren",
      "game.janus",
      "scoring.completeLesson(pc, lessonId, performance)",
      "Score danach prüfen"
    ],
    "expected": "Score erhöht basierend auf Performance (1-5 Punkte), Log-Eintrag erstellt",
    "snippets": []
  },
  {
    "id": "P4-TC-06",
    "phase": 4,
    "title": "Automatische Ferien-Erkennung",
    "prio": "P2",
    "type": "A",
    "purpose": "Automatische Ferien-Erkennung",
    "description": "Testkatalog-Check: Automatische Ferien-Erkennung",
    "requires": [
      "Ferienkalender in calendar.json"
    ],
    "steps": [
      "Auf Ferientag springen",
      "isHoliday = game.janus",
      "calendar.isHoliday()",
      "Lektion-Scheduling prüfen"
    ],
    "expected": "isHoliday = true, keine Lektionen an diesem Tag geplant",
    "snippets": []
  },
  {
    "id": "P5-TC-01",
    "phase": 5,
    "title": "Beamer-View wechselt Location-Hintergrund",
    "prio": "P0",
    "type": "M",
    "purpose": "Beamer-View wechselt Location-Hintergrund",
    "description": "Testkatalog-Check: Beamer-View wechselt Location-Hintergrund",
    "requires": [
      "Beamer-View-UI implementiert",
      "Szenen für Locations vorhanden"
    ],
    "steps": [
      "game.janus",
      "atmosphere.setLocation('LIBRARY')",
      "Beamer-Ansicht prüfen (zweiter Monitor)"
    ],
    "expected": "Szene 'Bibliothek' aktiviert, Hintergrundbild sichtbar",
    "snippets": [
      {
        "title": "Atmosphere API",
        "code": "return {atm:!!game.janus7?.atmosphere, keys:Object.keys(game.janus7?.atmosphere||{})};"
      }
    ]
  },
  {
    "id": "P5-TC-02",
    "phase": 5,
    "title": "Playlist-Steuerung: Mood 'studious'",
    "prio": "P1",
    "type": "M",
    "purpose": "Playlist-Steuerung: Mood 'studious'",
    "description": "Testkatalog-Check: Playlist-Steuerung: Mood 'studious'",
    "requires": [
      "Mood-Playlists konfiguriert"
    ],
    "steps": [
      "game.janus",
      "atmosphere.setMood('studious')",
      "Aktive Playlist prüfen"
    ],
    "expected": "Playlist 'Akademie-Ambient' spielt, Lautstärke angemessen",
    "snippets": [
      {
        "title": "stopAll() no-throw",
        "code": "const atm=game.janus7?.atmosphere;\nif(!atm?.stopAll) return 'SKIP: stopAll fehlt';\nawait atm.stopAll();\nreturn 'No-throw.';"
      }
    ]
  },
  {
    "id": "P5-TC-03",
    "phase": 5,
    "title": "Zeit-des-Tages-Moods (morgens/abends)",
    "prio": "P2",
    "type": "A",
    "purpose": "Zeit-des-Tages-Moods (morgens/abends)",
    "description": "Testkatalog-Check: Zeit-des-Tages-Moods (morgens/abends)",
    "requires": [
      "P5-TC-02 bestanden"
    ],
    "steps": [
      "time.hour auf 6 setzen",
      "game.janus",
      "atmosphere.updateMoodByTime()",
      "Mood prüfen"
    ],
    "expected": "Mood wechselt zu 'morning', passende Playlist startet",
    "snippets": []
  },
  {
    "id": "P5-TC-04",
    "phase": 5,
    "title": "Overlay-UI für Beamer (optionales Feature)",
    "prio": "P2",
    "type": "M",
    "purpose": "Overlay-UI für Beamer (optionales Feature)",
    "description": "Testkatalog-Check: Overlay-UI für Beamer (optionales Feature)",
    "requires": [
      "Overlay-Canvas implementiert"
    ],
    "steps": [
      "game.janus",
      "atmosphere.showOverlay('exam_countdown', { seconds: 300 })",
      "Beamer prüfen"
    ],
    "expected": "Countdown-Timer als Overlay auf Beamer sichtbar",
    "snippets": []
  },
  {
    "id": "P6-TC-01",
    "phase": 6,
    "title": "Control Panel öffnet",
    "prio": "P0",
    "type": "M",
    "purpose": "Control Panel öffnet",
    "description": "Testkatalog-Check: Control Panel öffnet",
    "requires": [
      "Control-Panel-UI als ApplicationV2"
    ],
    "steps": [
      "JANUS7-Icon im UI klicken",
      "Control Panel öffnet"
    ],
    "expected": "UI ohne Fehler, zeigt time, activeLesson, quick-actions",
    "snippets": []
  },
  {
    "id": "P6-TC-02",
    "phase": 6,
    "title": "MCQ-Examen-UI lädt Fragen",
    "prio": "P0",
    "type": "M",
    "purpose": "MCQ-Examen-UI lädt Fragen",
    "description": "Testkatalog-Check: MCQ-Examen-UI lädt Fragen",
    "requires": [
      "MCQ-UI implementiert",
      "exam-questions.json vorhanden"
    ],
    "steps": [
      "MCQ-UI für EXAM_MAG_BASICS_01 öffnen",
      "Fragen mit JSON vergleichen"
    ],
    "expected": "Alle Fragen korrekt angezeigt, keine Hardcoded-Texte",
    "snippets": []
  },
  {
    "id": "P6-TC-03",
    "phase": 6,
    "title": "Dashboard: PC-Übersicht",
    "prio": "P1",
    "type": "M",
    "purpose": "Dashboard: PC-Übersicht",
    "description": "Testkatalog-Check: Dashboard: PC-Übersicht",
    "requires": [
      "Dashboard-UI implementiert"
    ],
    "steps": [
      "Dashboard öffnen",
      "PC-Liste, Scores, aktuelle Lektionen prüfen"
    ],
    "expected": "Daten stimmen mit State überein, UI reagiert auf State-Updates",
    "snippets": []
  },
  {
    "id": "P6-TC-04",
    "phase": 6,
    "title": "Quick-Action: Zeit vorspulen",
    "prio": "P1",
    "type": "M",
    "purpose": "Quick-Action: Zeit vorspulen",
    "description": "Testkatalog-Check: Quick-Action: Zeit vorspulen",
    "requires": [
      "Control Panel mit Time-Controls"
    ],
    "steps": [
      "'Zeit +1 Tag' Button klicken",
      "UI und State prüfen"
    ],
    "expected": "Zeit korrekt inkrementiert, UI aktualisiert",
    "snippets": []
  },
  {
    "id": "P6-TC-05",
    "phase": 6,
    "title": "Responsive Layout (Tablet/Desktop)",
    "prio": "P2",
    "type": "M",
    "purpose": "Responsive Layout (Tablet/Desktop)",
    "description": "Testkatalog-Check: Responsive Layout (Tablet/Desktop)",
    "requires": [
      "Control Panel implementiert"
    ],
    "steps": [
      "Browser-Fenster auf 1024px Breite reduzieren",
      "UI prüfen"
    ],
    "expected": "Layout passt sich an, keine Überlappungen",
    "snippets": []
  },
  {
    "id": "P7-TC-01",
    "phase": 7,
    "title": "KI-Export anonymisiert",
    "prio": "P0",
    "type": "M/A",
    "purpose": "KI-Export anonymisiert",
    "description": "Testkatalog-Check: KI-Export anonymisiert",
    "requires": [
      "KI-Export-Funktion implementiert"
    ],
    "steps": [
      "game.janus",
      "ai.exportForAI()",
      "JSON inspizieren"
    ],
    "expected": "Struktur-Daten (IDs, Lektionen) vorhanden, keine PC-Namen, keine persönlichen Daten",
    "snippets": []
  },
  {
    "id": "P7-TC-02",
    "phase": 7,
    "title": "KI-Patches werden validiert",
    "prio": "P0",
    "type": "A",
    "purpose": "KI-Patches werden validiert",
    "description": "Testkatalog-Check: KI-Patches werden validiert",
    "requires": [
      "Patch-Import implementiert"
    ],
    "steps": [
      "Invaliden Patch erstellen (fehlende Lesson-Struktur)",
      "Import versuchen"
    ],
    "expected": "Validator blockiert, State unverändert, Fehler geloggt",
    "snippets": []
  },
  {
    "id": "P7-TC-03",
    "phase": 7,
    "title": "Diff-Anzeige vor Patch-Import",
    "prio": "P1",
    "type": "M",
    "purpose": "Diff-Anzeige vor Patch-Import",
    "description": "Testkatalog-Check: Diff-Anzeige vor Patch-Import",
    "requires": [
      "P7-TC-02 bestanden"
    ],
    "steps": [
      "Validen Patch laden",
      "game.janus",
      "ai.previewPatch(patch)",
      "Diff prüfen"
    ],
    "expected": "Diff zeigt Änderungen (hinzugefügte/geänderte Lektionen)",
    "snippets": []
  },
  {
    "id": "P7-TC-04",
    "phase": 7,
    "title": "Backup vor Patch-Anwendung",
    "prio": "P1",
    "type": "A",
    "purpose": "Backup vor Patch-Anwendung",
    "description": "Testkatalog-Check: Backup vor Patch-Anwendung",
    "requires": [
      "P7-TC-03 bestanden"
    ],
    "steps": [
      "State-Snapshot erstellen",
      "Patch anwenden",
      "Bei Fehler: Rollback prüfen"
    ],
    "expected": "Bei Fehler wird State auf Snapshot zurückgesetzt",
    "snippets": []
  },
  {
    "id": "REG-TC-01",
    "phase": 97,
    "title": "autoSave-Bug (aus Review)",
    "prio": "P0",
    "type": "A",
    "purpose": "autoSave-Bug (aus Review)",
    "description": "Testkatalog-Check: autoSave-Bug (aus Review)",
    "requires": [
      "Phase 1 mit autoSave-Fix"
    ],
    "steps": [
      "autoSave auf false",
      "State ändern",
      "save() aufrufen",
      "Log prüfen"
    ],
    "expected": "Keine Settings-Write, Warnung im Log",
    "snippets": []
  },
  {
    "id": "REG-TC-02",
    "phase": 97,
    "title": "Import ohne Validierung (aus Review)",
    "prio": "P0",
    "type": "A",
    "purpose": "Import ohne Validierung (aus Review)",
    "description": "Testkatalog-Check: Import ohne Validierung (aus Review)",
    "requires": [
      "Phase 1 mit Import-Validierung"
    ],
    "steps": [
      "Invalides JSON importieren",
      "Error catchen"
    ],
    "expected": "Import wird blockiert, State unverändert",
    "snippets": []
  },
  {
    "id": "REG-TC-03",
    "phase": 97,
    "title": "Unnötiges Save nach load() (aus Review)",
    "prio": "P1",
    "type": "A",
    "purpose": "Unnötiges Save nach load() (aus Review)",
    "description": "Testkatalog-Check: Unnötiges Save nach load() (aus Review)",
    "requires": [
      "Phase 1 mit optimiertem load()"
    ],
    "steps": [
      "State laden (bereits existiert)",
      "Log prüfen"
    ],
    "expected": "Keine unnötige Save-Operation, nur bei neuer Initialisierung",
    "snippets": []
  },
  {
    "id": "SEC-TC-01",
    "phase": 98,
    "title": "Import validiert alle Felder",
    "prio": "P0",
    "type": "A",
    "purpose": "Import validiert alle Felder",
    "description": "Testkatalog-Check: Import validiert alle Felder",
    "requires": [
      "Validator mit JSON-Schema"
    ],
    "steps": [
      "Malformed JSON mit zusätzlichen Properties importieren",
      "Validierung prüfen"
    ],
    "expected": "Zusätzliche/unbekannte Felder werden rejected",
    "snippets": []
  },
  {
    "id": "SEC-TC-02",
    "phase": 98,
    "title": "Keine Script-Injection in UI",
    "prio": "P0",
    "type": "A",
    "purpose": "Keine Script-Injection in UI",
    "description": "Testkatalog-Check: Keine Script-Injection in UI",
    "requires": [
      "UI rendert User-Input"
    ],
    "steps": [
      "String mit <script>alert('XSS')</script> in State setzen",
      "UI rendern"
    ],
    "expected": "Script wird escaped/sanitized, nicht ausgeführt",
    "snippets": []
  },
  {
    "id": "SEC-TC-03",
    "phase": 98,
    "title": "Keine DSA5-Actor-Manipulation ohne Berechtigung",
    "prio": "P1",
    "type": "M",
    "purpose": "Keine DSA5-Actor-Manipulation ohne Berechtigung",
    "description": "Testkatalog-Check: Keine DSA5-Actor-Manipulation ohne Berechtigung",
    "requires": [
      "Multi-User-Setup",
      "Player ohne GM-Rechte"
    ],
    "steps": [
      "Als Player: game.janus",
      "dsa",
      "rollSkill(gmActor, 'skill') aufrufen"
    ],
    "expected": "Fehler oder Permission-Check, kein unbefugter Zugriff",
    "snippets": []
  },
  {
    "id": "INT-TC-01",
    "phase": 99,
    "title": "End-to-End: Lektion starten → abschließen",
    "prio": "P0",
    "type": "M",
    "purpose": "End-to-End: Lektion starten → abschließen",
    "description": "Testkatalog-Check: End-to-End: Lektion starten → abschließen",
    "requires": [
      "Phase 1-4 implementiert"
    ],
    "steps": [
      "Zeit auf Lektionsbeginn setzen",
      "Lektion aus Schedule holen",
      "DSA5-Probe für PC durchführen",
      "Scoring updaten",
      "Zeit vorspulen"
    ],
    "expected": "Kompletter Flow ohne Fehler, Score aktualisiert, State gespeichert",
    "snippets": []
  },
  {
    "id": "INT-TC-02",
    "phase": 99,
    "title": "KI-Roundtrip: Export → Edit → Import",
    "prio": "P0",
    "type": "M",
    "purpose": "KI-Roundtrip: Export → Edit → Import",
    "description": "Testkatalog-Check: KI-Roundtrip: Export → Edit → Import",
    "requires": [
      "Phase 7 implementiert"
    ],
    "steps": [
      "State exportieren",
      "JSON extern editieren (Lektion hinzufügen)",
      "Patch importieren",
      "Lektion im System verifizieren"
    ],
    "expected": "Neue Lektion im System verfügbar, alle Referenzen korrekt",
    "snippets": []
  },
  {
    "id": "INT-TC-03",
    "phase": 99,
    "title": "Multi-User: State-Sync",
    "prio": "P1",
    "type": "M",
    "purpose": "Multi-User: State-Sync",
    "description": "Testkatalog-Check: Multi-User: State-Sync",
    "requires": [
      "2 Clients in gleicher Welt"
    ],
    "steps": [
      "Client A: Zeit vorspulen",
      "Client B: State-Update empfangen?",
      "Client B: UI aktualisiert?"
    ],
    "expected": "State-Änderung propagiert zu allen Clients, UIs synchron",
    "snippets": []
  },
  {
    "id": "INT-TC-04",
    "phase": 99,
    "title": "Beamer + Control Panel Sync",
    "prio": "P1",
    "type": "M",
    "purpose": "Beamer + Control Panel Sync",
    "description": "Testkatalog-Check: Beamer + Control Panel Sync",
    "requires": [
      "Phase 5+6 implementiert"
    ],
    "steps": [
      "Control Panel: Location ändern",
      "Beamer-View prüfen"
    ],
    "expected": "Beamer zeigt neue Location sofort",
    "snippets": []
  },
  {
    "id": "PERF-TC-01",
    "phase": 99,
    "title": "State-Load unter 200ms",
    "prio": "P1",
    "type": "A",
    "purpose": "State-Load unter 200ms",
    "description": "Testkatalog-Check: State-Load unter 200ms",
    "requires": [
      "State mit realistischen Daten (50 PCs",
      "100 NPCs)"
    ],
    "steps": [
      "Performance.now() vor/nach load()",
      "Delta berechnen"
    ],
    "expected": "Load-Zeit < 200ms",
    "snippets": []
  },
  {
    "id": "PERF-TC-02",
    "phase": 99,
    "title": "JSON-Loader cacht effizient",
    "prio": "P1",
    "type": "A",
    "purpose": "JSON-Loader cacht effizient",
    "description": "Testkatalog-Check: JSON-Loader cacht effizient",
    "requires": [
      "Phase 2 implementiert"
    ],
    "steps": [
      "100x academy.loadData('calendar')",
      "Ladezeit messen"
    ],
    "expected": "Nur 1. Load hat File-I/O, weitere < 1ms aus Cache",
    "snippets": []
  },
  {
    "id": "PERF-TC-03",
    "phase": 99,
    "title": "UI-Rendering unter 16ms (60fps)",
    "prio": "P2",
    "type": "M",
    "purpose": "UI-Rendering unter 16ms (60fps)",
    "description": "Testkatalog-Check: UI-Rendering unter 16ms (60fps)",
    "requires": [
      "Control Panel mit vielen PCs"
    ],
    "steps": [
      "DevTools Performance-Tab",
      "State-Update triggern",
      "Frame-Zeit messen"
    ],
    "expected": "Re-Render < 16ms, keine Ruckler",
    "snippets": []
  }
];

  // ---------------------------------------------------------------------------
  // UI & LOGIC (Runner Code)
  // ---------------------------------------------------------------------------

  const MAX_PHASE_CHOICES = [
    { value: 0, label: "Phase 0 (Doku/Leitbild)" },
    { value: 1, label: "Phase 1 (Core/State)" },
    { value: 2, label: "Phase 2 (Academy Data)" },
    { value: 3, label: "Phase 3 (DSA5 Bridge)" },
    { value: 4, label: "Phase 4 (Simulation)" },
    { value: 5, label: "Phase 5 (Atmosphere)" },
    { value: 6, label: "Phase 6 (UI)" },
    { value: 7, label: "Phase 7 (KI)" },
    { value: 98, label: "Security-Tests (SEC)" },
    { value: 97, label: "Regression-Tests (REG)" },
    { value: 99, label: "Integration & Perf (INT/PERF)" },
    { value: 100, label: "ALLES (0–7 + SEC + REG + INT/PERF)" },
  ];

  const ts = () => new Date().toISOString();
  const isoSafe = (d) => d.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const fmtMs = (ms) => `${Math.round(ms)}ms`;

  function escHtml(s) {
    return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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

  async function withConsoleCapture(fn) {
    const buf = [];
    const orig = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
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
      return { result, logs: buf, success: true };
    } catch (e) {
      try { e.__janusCapturedLogs = buf; } catch { /* ignore */ }
      return { error: e, logs: buf, success: false };
    } finally {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
      console.error = orig.error;
      console.debug = orig.debug;
    }
  }

  function downloadJson(filename, obj) {
    foundry.utils.saveDataToFile(JSON.stringify(obj, null, 2), "application/json", filename);
  }

  function showAbortPanel() {
    const content = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <div style="font-weight:700;">JANUS7 Tests laufen…</div>
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
      buttons: { close: { label: "Fenster schließen", callback: () => {} } },
      render: (html) => {
        html.find("#janus7-abort-btn").on("click", () => {
          ABORT_ALL = true;
          html.find("#janus7-abort-status").text("ABORT REQUESTED");
          ui.notifications.warn("[JANUS7] Abbruch angefordert.");
        });
      },
    }, { width: 520 });
    dlg.render(true);
    return dlg;
  }

  async function askMaxPhase() {
    const options = MAX_PHASE_CHOICES.map(c => `<option value="${c.value}">${escHtml(c.label)}</option>`).join("");
    const content = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label>Max-Phase wählen:</label>
        <select name="maxPhase" style="width:100%;">${options}</select>
        <label style="display:flex; align-items:center; gap:8px; margin-top:6px;">
          <input name="showExpectedInNotes" type="checkbox" checked/>
          <span>Erwartung in Notizen vorbefüllen</span>
        </label>
      </div>
    `;
    return await new Promise((resolve) => {
      new Dialog({
        title: "JANUS7 TestRunner Start",
        content,
        buttons: {
          ok: {
            label: "Start",
            callback: (html) => {
              resolve({
                maxPhase: Number(html.find('[name="maxPhase"]').val()),
                showExpectedInNotes: !!html.find('[name="showExpectedInNotes"]')[0]?.checked
              });
            }
          },
          cancel: { label: "Abbrechen", callback: () => resolve(null) }
        },
        default: "ok"
      }, { width: 420 }).render(true);
    });
  }

  async function executeSnippet(code, ctx) {
    const fn = new Function("ctx","game","ui","foundry","CONFIG","canvas", `
      return (async () => {
        ${code}
      })()
    `);
    return await withConsoleCapture(async () => fn(ctx, game, ui, foundry, CONFIG, canvas));
  }

  function renderSnippet({ id, title, code }) {
    return `
    <section style="border:1px solid var(--color-border-light-2); border-radius:8px; padding:10px; margin:10px 0;">
      <header style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div style="font-weight:700;">${escHtml(title)}</div>
        <div style="display:flex; gap:6px;">
          <button type="button" data-sn-run="${id}">Ausführen</button>
          <button type="button" data-sn-copy="${id}">Kopieren</button>
        </div>
      </header>
      <textarea data-sn-ta="${id}" style="width:100%; min-height:80px; margin-top:8px; font-family:monospace;">${escHtml(code)}</textarea>
      <pre data-sn-out="${id}" style="margin-top:8px; padding:8px; background:rgba(0,0,0,.05); border-radius:6px; white-space:pre-wrap; border-left: 5px solid #ccc;">Bereit.</pre>
    </section>`;
  }

  function wireSnippets(html, registry, notesEl) {
    const getOut = (id) => html.find(`[data-sn-out="${id}"]`);

    html.on("click", "button[data-sn-copy]", async (ev) => {
      const id = ev.currentTarget.dataset.snCopy;
      const ta = html.find(`[data-sn-ta="${id}"]`)[0];
      await navigator.clipboard.writeText(ta.value);
      getOut(id).text("Kopiert!");
    });

    html.on("click", "button[data-sn-run]", async (ev) => {
      const id = ev.currentTarget.dataset.snRun;
      const entry = registry.get(id);
      const ta = html.find(`[data-sn-ta="${id}"]`)[0];
      const out = getOut(id);

      out.text("Läuft …").css("background", "rgba(0,0,0,.05)").css("border-left-color", "#ccc");

      const { result, logs, success, error } = await executeSnippet(ta.value, entry.ctx);

      if (success) {
        const combined = (logs.length ? logs.join("\n") + "\n\n[RETURN]\n" : "") + safeString(result);
        out.text("OK:\n" + combined)
           .css("background", "#d1fae5")
           .css("color", "#065f46")
           .css("border-left-color", "#10b981");

        const block = `[AUTO-PASS] ${entry.title} @ ${ts()}\nOK:\n${combined}\n`;
        notesEl.value = (notesEl.value ? notesEl.value.trimEnd() + "\n\n" : "") + block;
      } else {
        const errMsg = `${error?.message}\n${error?.stack}`;
        const combinedErr = (logs.length ? logs.join("\n") + "\n\n[ERROR]\n" : "") + errMsg;

        out.text("FEHLER:\n" + combinedErr)
           .css("background", "#fee2e2")
           .css("color", "#991b1b")
           .css("border-left-color", "#ef4444");

        notesEl.value = (notesEl.value ? notesEl.value.trimEnd() + "\n\n" : "") + `[AUTO-FAIL] ${entry.title}\n${errMsg}\n`;
      }
    });
  }

  async function runOneTest(test, ctx) {
    if (ABORT_ALL) return { status: "ABORTED", notes: "Abbruch" };

    const registry = new Map();
    const snippetsHtml = (test.snippets || []).map(sn => {
      const id = foundry.utils.randomID();
      registry.set(id, { ...sn, ctx, testId: test.id });
      return renderSnippet({ id, title: sn.title, code: sn.code });
    }).join("");

    let defaultNotes = "";
    if (ctx.showExpectedInNotes) {
      defaultNotes =
`[TEST] ${test.id} - ${test.title}
Zweck: ${test.purpose || test.title}
Erwartet: ${test.expected || ""}

`;
    }

    const requires = (test.requires?.length ? `<div><b>Voraussetzungen:</b> ${escHtml(test.requires.join(", "))}</div>` : "");
    const steps = (test.steps?.length ? `<ol style="margin-top: 5px;">${test.steps.map(s=>`<li>${escHtml(s)}</li>`).join("")}</ol>` : "<i>Keine Schritte im Katalog angegeben.</i>");

    const content = `
      <div style="margin-bottom:10px; font-family:sans-serif;">
        <h3 style="border-bottom:2px solid var(--color-primary); padding-bottom:5px;">${escHtml(test.id)}: ${escHtml(test.title)}</h3>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:rgba(0,0,0,0.03); padding:10px; border-radius:5px; margin-bottom:10px;">
          <div><b>Phase:</b> ${test.phase}</div>
          <div><b>Typ:</b> ${escHtml(test.type || "")}</div>
          <div><b>Priorität:</b> ${escHtml(test.prio || "")}</div>
          <div>${requires}</div>
        </div>

        <div style="background:#fff3cd; padding:10px; border-left:4px solid #ffc107; margin-bottom:10px; color:#856404;">
          <b>Erwartetes Ergebnis:</b><br/>${escHtml(test.expected || "")}
        </div>

        <div style="margin-bottom:10px;">
          <b>Beschreibung:</b> ${escHtml(test.description || "")}
        </div>

        <div style="margin-top:6px;">
          <b>Testschritte:</b>
          ${steps}
        </div>
      </div>

      ${snippetsHtml}

      <hr/>
      <label><b>Notizen / Ergebnis:</b></label>
      <textarea name="notes" style="width:100%; min-height:150px; font-family:monospace;">${escHtml(defaultNotes)}</textarea>
    `;

    return await new Promise(resolve => {
      new Dialog({
        title: `Test ${test.id} (${test.prio || ""})`,
        content,
        buttons: {
          pass: { label: "✓ PASS", callback: (h) => resolve({ status: "PASS", notes: h.find('[name="notes"]').val() }) },
          fail: { label: "✗ FAIL", callback: (h) => resolve({ status: "FAIL", notes: h.find('[name="notes"]').val() }) },
          skip: { label: "» SKIP", callback: (h) => resolve({ status: "SKIP", notes: h.find('[name="notes"]').val() }) }
        },
        default: "pass",
        render: (html) => wireSnippets(html, registry, html.find('[name="notes"]')[0])
      }, { width: 820, height: "auto" }).render(true);
    });
  }

  // --- MAIN LOOP ---
  const start = await askMaxPhase();
  if (!start) return;

  const ctx = { ...start };
  const meta = { runner: RUNNER_VERSION, exportedAt: ts(), user: game.user.name };
  const abortDlg = showAbortPanel();
  const results = [];

  const testsToRun = TESTS
    .filter(t => {
      if (start.maxPhase === 100) return true;
      // Spezielle Gruppen:
      if (start.maxPhase === 99) return t.phase === 99;
      if (start.maxPhase === 98) return t.phase === 98;
      if (start.maxPhase === 97) return t.phase === 97;
      // Normal: bis zur Phase
      return t.phase <= start.maxPhase;
    })
    .sort((a,b) => (a.phase - b.phase) || a.id.localeCompare(b.id));

  for (const test of testsToRun) {
    if (ABORT_ALL) break;
    const t0 = performance.now();
    const out = await runOneTest(test, ctx);
    const t1 = performance.now();
    results.push({
      ...test,
      status: out.status,
      duration: fmtMs(t1 - t0),
      notes: out.notes,
      timestamp: ts()
    });
  }

  abortDlg.close();

  // Export
  const summary = { PASS: 0, FAIL: 0, SKIP: 0, ABORTED: ABORT_ALL ? 1 : 0 };
  results.forEach(r => { if (summary[r.status] !== undefined) summary[r.status]++; });

  const stamp = isoSafe(new Date());
  downloadJson(`janus7_testlog_${stamp}.json`, { meta, summary, results });

  ui.notifications.info(`Testlauf beendet. P:${summary.PASS} F:${summary.FAIL} S:${summary.SKIP}`);
  } catch (err) {
    console.error("[JANUS7][Macro][TestRunner] Failed:", err);
    ui?.notifications?.error?.("JANUS7 TestRunner failed. See console for details.");
  }
})();
