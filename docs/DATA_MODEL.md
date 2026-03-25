# DATA_MODEL – JANUS7

## Core State (Phase 1)
Der State ist versioniert, persistent und wird über eine zentrale API verwaltet.

### Anforderungen
- atomic transactions (Rollback)
- Validierung vor Persistenz
- Schema/Evolution (Migrationen später möglich)

## Academy Data (Phase 2)
- JSON-Dateien unter `data/`
- Zugriff nur über `AcademyDataApi` (keine ad-hoc fetches)
