# Update 0.9.12.42

## Änderungen seit 0.9.12.37

- ARCH: Moon Hook-Centralization — bridge/dsa5/moon.js registriert updateWorldTime nicht mehr direkt; Delegation via janus.mjs
- TEST: P1-TC-11 scannt bridge/dsa5/moon.js auf Hook-Leaks
- TEST: P3-BUFF/FATE/SOCIAL/TRAD mit Prereq-Gates (auto-SKIP bei fehlenden Weltdaten)
- FIX: bridge/dsa5/index.js ruft timedCond.applyTimedAcademyCondition() korrekt auf
- FIX: KI-Inbox-Verzeichnis wird vor FilePicker-Open und importFromInbox best-effort angelegt
- RELEASE: Versionierung module.json/VERSION.json/package.json/README auf 0.9.12.40 synchronisiert

## Gesamtstatus (0.9.12.40)

| Phase | Status |
|-------|--------|
| P0 Leitbild | ✅ Done |
| P1 Core & State | ✅ Done |
| P2 Academy Data | ✅ Done |
| P3 DSA5 Bridge | ✅ Done (Moon/Fate/Advancement/TimedCond/PostRoll/Social/Tradition) |
| P4 Simulation | ✅ Done |
| P5 Atmosphere | ✅ Done |
| P6 UI / Shell | ✅ Done |
| P7 KI-Integration | ✅ Done (Roundtrip, Preflight, Backup) |
| P8 Backlog | ⏳ In Progress |

## Bekannte offene Punkte

- KI-Import: Dateiexistenzprüfung vor fetch() nur best-effort (Verzeichnis wird angelegt, Datei nicht vorab geprüft)
- Weltabhängigkeiten: Actor-UUID-Mappings für NPCs müssen weltseitig konfiguriert werden
- P1-TC-05: Idempotent-Set-Optimierung bewusst zurückgestellt (SKIP)
