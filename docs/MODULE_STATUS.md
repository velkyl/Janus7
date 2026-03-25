# Update 0.9.12.43

## Änderungen seit 0.9.12.42

- DOKU: README, Index, Status, Installation, KI- und Release-Dokumente auf `0.9.12.43` synchronisiert
- CI: GitHub-Workflow validiert jetzt das Repo statt eines kaputten npm-Publish-/`npm ci`-Pfads
- ARCH: gemeinsame Runtime-Hook-Hilfe eingeführt; Engine-Cleanup räumt alle `_*HookIds`-Buckets auf
- GC: mehrere Ready-/Domain-Hooks auf kanonische `HOOKS.*`-Topics umgestellt; Legacy-Alias-Nutzung reduziert

## Gesamtstatus (0.9.12.43)

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
