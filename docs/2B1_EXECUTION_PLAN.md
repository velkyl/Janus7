# 2B.1 Execution Plan

Stand: 2026-04-09

## Zweck

Dieser Plan beschreibt die konkrete Abarbeitung von 2B.1 im Repo. Er ist bewusst operativ und auf kleine, pruefbare Schritte zugeschnitten.

## Scope von 2B.1

2B.1 fuehrt noch keine Profilmigration durch. Ziel ist:

- Inventur
- Konsumentenpruefung
- Vertragsentscheidung
- Referenzrahmen

## Arbeitspakete

### Block 1: Inventur und Konsumenten

#### Schritt 1

Profilinventar verifizieren:

- `punin`
- `festum`
- `gareth`
- `lowangen`

Ergebnis:

- Dateimatrix pro Profil

#### Schritt 2

Konsumentenbild verifizieren:

- Loader
- Runtime
- UI
- Validatoren

Ergebnis:

- Nutzungsstatus pro Datendomaene

### Block 2: Vertrag und Referenz

#### Schritt 3

Punin in Datenschichten zerlegen:

- Kern
- Unterricht
- Sozial/Factions
- Quests
- Events
- Orte
- Extensions
- Seed/Export

#### Schritt 4

Vertrag in `core-profile` und `full-profile` aufteilen, falls der Vollvertrag operativ zu schwer bleibt.

Ergebnis:

- 2B-Vertragsmatrix

### Block 3: Gegenproben

#### Schritt 5

Lowangen gegen Quellenprofil-Schwelle pruefen.

#### Schritt 6

Gareth als politische/offizielle Gegenprobe redaktionell nachschaerfen.

## Erwartete Abschlussartefakte

- `2B1_PROFILE_INVENTORY.md`
- `2B1_PROFILE_CONSUMERS.md`
- `2B1_CONTRACT_MATRIX.md`
- `2B1_REFERENCE_FRAMES.md`
- optional spaeter:
  - `2B1_PUNIN_ACCEPTANCE.md`
  - `2B1_DECISION_SUMMARY.md`

## Harte Abbruchkriterien

2B.1 darf nicht direkt in 2B.2 weiterlaufen, wenn:

- Root vs `academy/` nicht als reale Konvergenzfrage beantwortet ist
- `full-profile` und `core-profile` weiter unklar bleiben
- Punin gleichzeitig Referenz und unaufgeloester Sonderfall bleibt
- Lowangen als Quellengegenprobe nicht tragfaehig beschrieben werden kann

## Wahrscheinlich naechster sinnvoller Implementierungsschritt

2B.2 sollte mit einem engen Scope starten:

- Punin-Strukturbereinigung vorbereiten
- keine Datenmigration in einem Grosswurf
- zuerst Referenzpfade festziehen
- erst danach Inhaltserweiterung
