# JANUS7 Release 0.9.12.3

## Korrigiert
- Dokumentation, Release-Metadaten und Versionsstände konsolidiert
- Academy-Datendomänen formalisiert und mit zusätzlichen JSON-Schemas abgesichert
- Referenzintegritätsdiagnostik für Lessons, Exams, Circles, Social Links und scoring-nahe Daten ergänzt
- KI-Roundtrip mit Preflight für Version, Schema und Semantik gehärtet
- App-Reifegrade dokumentiert und als Manifest im UI-Code verfügbar gemacht
- Testkatalog um Schema-, Referenz- und KI-Preflight-Tests ergänzt

## Offene Risiken
- Academy-Referenzprüfung meldet weiterhin 34 Legacy-/Alias-Warnungen in den Inhaltsdaten
- Shell-Cutover ist weit, aber nicht jede Alt-App ist bereits vollständig absorbiert
- Vollständige Live-Abnahme in der produktiven Foundry-Welt bleibt notwendig

## Sinnvolle nächste Welle
- Bereinigung der realen Academy-Referenzwarnungen im Datenbestand
- weiterer UI-Cutover von Legacy-Apps in echte Shell-Panels
- Live-Test + gezieltes Runtime-Audit in Foundry
