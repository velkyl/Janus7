# KI in JANUS7 â€” StabilitÃ¤t, Workflow, Grenzen

Stand: **v0.9.12.46** (Phase 7 / produktiver Roundtrip mit konservativen Schutzschienen)

## Produktiv nutzbar
- Export eines `JANUS_EXPORT_V2` Bundles
- Preview einer `JANUS_KI_RESPONSE_V1`
- Diff, selektive Ãœbernahme und Apply im GM-Kontext
- Backup vor Apply
- Restore von Backups
- Versions- und Schema-PrÃ¼fung
- referenznahe Autokorrektur/Fuzzy-Hinweise im Diff

## Empfohlener produktiver Workflow
1. **Export** aus dem aktuellen Weltstand erzeugen.
2. **KI-Antwort** nur auf Basis dieses Exports erstellen lassen.
3. **Preview** in JANUS7 ausfÃ¼hren.
4. **Preflight prÃ¼fen**: Version, Schema, semantische Fehler, Diff-Anzahl.
5. Nur sinnvolle Diffs **selektiv Ã¼bernehmen**.
6. **Apply** nur als GM und nur mit erzeugtem Backup.
7. Bei Problemen: **Restore** des letzten Backups, dann neuen Export ziehen.

## Schutzmechanismen
- Importpfade bleiben relativ und werden auf unsichere Segmente geprÃ¼ft.
- Antwortversion und Modulversion werden gegengeprÃ¼ft.
- Schema-Pruefung laeuft vor Preview/Apply.
- importFromInbox() prueft Inbox-Dateien vor dem Fetch, wenn die World-Dateiliste verfuegbar ist.
- Apply ohne erfolgreichen Backup-Pfad wird in Welten mit Backup-Support abgebrochen.
- Restore kann optional validieren und speichert danach den State erneut.

## Grenzen
- KI liefert VorschlÃ¤ge, keine Wahrheit.
- ReferenzintegritÃ¤t der Kampagnendaten wird diagnostiziert, aber nicht jede Altlast wird automatisch repariert.
- Selektive Ãœbernahme reduziert Risiko, ersetzt aber kein Review.

## Was noch nicht 100 % elegant ist
- einige Legacy-Apps nutzen noch Wrapper statt reiner Shell-Panels
- Preview/Apply ist robust, aber UX-seitig noch kein Vollkomfort-Wizard
- Restore bei stark abweichenden DatenstÃ¤nden bleibt ein GM-Eingriff, kein Knopf-magisch-alles-gut

