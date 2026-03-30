**JANUS7**

TestSuite Professionalisierung

*Masterdokument v1.0*

Basis: JANUS7 v0.9.12.26 · Foundry VTT v13.351 · DSA5 ≥ 7.0.0

Referenzdatum: 2026-03-13

|                                                                                                                                                                                                                                                                                                                                 |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Zweck dieses Dokuments: Vollständige Spezifikation, um die JANUS7-Testlandschaft von 142 Tests auf eine professionelle, reproduzierbare und KI-gestützt implementierbare TestSuite auszubauen. Enthält Gap-Analyse, aktualisierten Testkatalog (182 Tests), Standalone-Modul-Konzept sowie KI-taugliche Implementierungsphasen. |

**1. Executive Summary**

JANUS7 v0.9.12.26 hat eine funktional breite Testbasis: 142 Testfälle, davon 98 automatisierte und 40 manuelle. Der letzte Lauf (2026-03-12) zeigte 105/0/0 (PASS/FAIL/ERROR) bei 4 SKIP und 33 MANUAL. Das ist ein solider Startpunkt, aber kein professioneller Endstand.

Dieses Dokument adressiert drei strukturelle Schwächen:

- Versionsdrift: test-catalog.json auf 0.9.12.6, extended-test-manifest.json auf 0.9.12.3 — beide stehen 20+ Patches hinter dem SSOT 0.9.12.26.

- Qualitative Lücken: SEC-, PERF- und REG-Tests sind durchgehend manuell. Keine HookTraceEngine. Kein strukturiertes Diagnostics Export. Kein Multi-Client Simulator.

- Architektonische Vermischung: Testsystem (Runner, Registry, Apps, Harness) liegt innerhalb von janus7 — erhöht den Produktions-Footprint und verhindert Wiederverwendung.

Die Lösung: Ein separates Foundry-Modul janus7-testsuite plus 40 neue Tests (→ 182 gesamt), HookTraceEngine, Diagnostics Bundle Export, Multi-Client Simulator und formelle Release-Gates.

**2. Ist-Analyse**

**2.1 Laufzeit-Fakten (Stand 2026-03-12)**

| **Kennzahl**                                | **Wert**                     |
|---------------------------------------------|------------------------------|
| SSOT-Version                                | 0.9.12.26                    |
| Foundry                                     | 13.351                       |
| DSA5                                        | 7.4.7                        |
| Testdateien im Archiv                       | 142                          |
| Auto-Tests                                  | 98                           |
| Manual-Tests                                | 40                           |
| Unbekannter Kind (P2-TC-07/08, P7-TC-08/09) | 4                            |
| Letzter Lauf: PASS / FAIL / ERROR           | 105 / 0 / 0                  |
| SKIP / MANUAL                               | 4 / 33                       |
| test-catalog.json Version                   | 0.9.12.6 ⚠ Drift +20 Patches |
| extended-test-manifest.json Version         | 0.9.12.3 ⚠ Drift +23 Patches |

**2.2 Verteilung nach Suite**

| **Suite** | **Dateien** | **Auto** | **Manual** | **Release-kritisch** |
|-----------|-------------|----------|------------|----------------------|
| p0        | 3           | 0        | 3          | Nein                 |
| p1        | 17          | 15       | 2          | Ja                   |
| p15       | 16          | 16       | 0          | Mittel               |
| p16       | 10          | 10       | 0          | Ja                   |
| p2        | 8           | 5        | 3          | Ja                   |
| p3        | 15          | 2        | 13         | Ja                   |
| p4        | 11          | 9        | 2          | Ja                   |
| p4b       | 9           | 8        | 1          | Ja                   |
| p5        | 4           | 2        | 2          | Mittel               |
| p6        | 22          | 22       | 0          | Ja                   |
| p7        | 12          | 10       | 2          | Ja                   |
| perf      | 3           | 0        | 3          | Mittel               |
| reg       | 3           | 0        | 3          | Mittel               |
| sec       | 3           | 0        | 3          | Hoch                 |
| int       | 4           | 0        | 4          | Hoch                 |

**2.3 Identifizierte Anomalien**

| **ID / Bereich**                          | **Anomalie**                                | **Handlungsbedarf**                               |
|-------------------------------------------|---------------------------------------------|---------------------------------------------------|
| P2-TC-07/08, P7-TC-08/09                  | kind = '?' im Manifest                      | Auf auto setzen, import paths verifizieren        |
| P6_TC_04\_\_permissions, P6_TC_06\_\_i18n | Rohe Dateinamen als IDs im Manifest         | Normalisieren auf P6-TC-04, P6-TC-05              |
| test-catalog.json                         | Version 0.9.12.6, 20 Patches hinter SSOT    | Auf 0.9.12.26 anheben, fehlende IDs nachtragen    |
| extended-test-manifest.json               | Version 0.9.12.3, 23 Patches hinter SSOT    | Neu generieren, alle 142 IDs verifizieren         |
| SEC-TC-01/02/03                           | Alle manuell, kein Auto-Pendant             | Schrittweise auf auto migrieren (Phase B)         |
| REG-TC-01/02/03                           | Alle manuell, keine Auto-Regressions-Guards | Auf auto konvertieren (Phase A)                   |
| PERF-TC-01/02/03                          | Manuell ohne numerische Schwellwerte        | Thresholds definieren + auto assertions (Phase C) |
| INT-TC-01-04                              | Manuell ohne Preconditions/Evidence         | Guided Harness Steps + Evidence Probes (Phase E)  |

**3. Gap-Analyse & Handlungsbedarf**

**3.1 Fehlende Infrastruktur-Komponenten**

| **Komponente**                   | **Status**                                 | **Risiko ohne diese**                                                                    |
|----------------------------------|--------------------------------------------|------------------------------------------------------------------------------------------|
| HookTraceEngine                  | Nicht vorhanden                            | Keine Reihenfolgenanalyse bei Hook-Fehlern; Cron/Quest/Import-Bugs schwer reproduzierbar |
| Diagnostics Bundle Export        | Nicht als eigenständiges System vorhanden  | Fehlerberichte nicht reproduzierbar; keine standardisierte Evidenz                       |
| Multi-Client Test Simulator      | Nicht vorhanden (Sync Engine ≠ Simulator)  | Permissions/Sync/Beamer-Fälle nicht systematisch testbar                                 |
| Deterministische Fixture-Profile | Nicht als benannte World-Profile vorhanden | Testläufe hängen von Weltzustand ab; nicht reproduzierbar                                |
| Release-Gate Report Generator    | Nicht vorhanden                            | Release-Entscheidung auf manuelle Inspektion angewiesen                                  |

**3.2 Qualitative Testlücken nach Domäne**

| **Domäne**         | **Lücke**                                                       | **Neue Tests (Phase B)**          |
|--------------------|-----------------------------------------------------------------|-----------------------------------|
| Core/State         | Migration, Rollback-Tiefe, Backup-Rotation, Sync-Dirty          | T-CORE-01 bis T-CORE-10           |
| Academy Data       | World-Override-Merge, Cache-Invalidierung, Schema-Fehler        | T-DATA-01 bis T-DATA-06           |
| DSA5 Bridge        | Silent Roll-Vertrag, Advancement-Block, Actor-Kapselung         | T-BRIDGE-01 bis T-BRIDGE-08       |
| Simulation         | Lesson→Score-Einmaligkeit, Cron-Grenzen, LivingWorld-Idempotenz | T-SIM-01 bis T-SIM-08             |
| UI/Shell           | Panel-Routing, Evidence-Persistenz, Command-Delegation          | T-UI-01 bis T-UI-04               |
| Security/Perf/Sync | Import-Policy, Graph-Perf-Smoke, Multi-Client-Smoke             | T-SEC-01/02, T-PERF-01, T-SYNC-01 |

**4. Architekturentscheidung: Standalone-Modul janus7-testsuite**

**4.1 Motivation**

Das aktuelle Testsystem (Runner, Registry, Guided Harness App, TestResult App, Manual Store, alle 142+ .test.js-Dateien) liegt vollständig innerhalb von janus7 unter core/test/ und ui/apps/. Das verursacht mehrere strukturelle Probleme:

- ~30 Testdateien und 3 Debug-Apps laufen in jeder Produktions-Foundry-Instanz mit.

- Die Test-UI (JanusGuidedManualTestApp, JanusTestResultApp, JanusSettingsTestHarnessApp) ist für Endspieler irrelevant, aber immer geladen.

- Das Testsystem ist ausschließlich für JANUS7 verwendbar — kein Mehrwert für andere DSA5-Module.

- Änderungen am Testsystem erfordern ein Release von janus7 selbst.

**4.2 Proposed Solution: janus7-testsuite als eigenes Foundry-Modul**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Modul-ID: janus7-testsuite</strong></p>
<p>Ein eigenständiges Foundry VTT v13-Modul, das als dediziertes QA-Werkzeug für JANUS7 fungiert. Im Produktionsbetrieb nicht aktiviert. In Entwicklungs- und Testumgebungen parallel zu janus7 geladen.</p></td>
</tr>
</tbody>
</table>

**4.2.1 Modulkonfiguration (module.json Zielstruktur)**

| **Feld**                                          | **Wert**                        |
|---------------------------------------------------|---------------------------------|
| id                                                | janus7-testsuite                |
| title                                             | JANUS7 TestSuite — QA Framework |
| version                                           | 1.0.0 (separat versioniert)     |
| compatibility.minimum                             | 13                              |
| relationships.requires\[0\].id                    | janus7                          |
| relationships.requires\[0\].compatibility.minimum | 0.9.12.0                        |
| esmodules                                         | \['scripts/j7ts.mjs'\]          |
| styles                                            | \['styles/j7ts.css'\]           |
| languages                                         | de, en                          |

**4.2.2 Namespace und API-Oberfläche**

Das Modul exponiert game.j7ts als Einstiegspunkt. Foundry-Hooks greifen auf game.janus7 zu, das von janus7 selbst bereitgestellt wird.

| **API**               | **Beschreibung**                                           |
|-----------------------|------------------------------------------------------------|
| game.j7ts.runner      | Test Runner — startet, stoppt, reportet Läufe              |
| game.j7ts.registry    | Test Registry — registriert und verwaltet Testfälle        |
| game.j7ts.harness     | Guided Manual Harness — Steps, Evidence, Preconditions     |
| game.j7ts.trace       | HookTraceEngine — start, stop, export, query               |
| game.j7ts.diagnostics | Diagnostics Bundle Export — erzeugt und exportiert Bundles |
| game.j7ts.simulator   | Multi-Client Simulator — Profile, Setup, Reset             |
| game.j7ts.catalog     | Test Catalog — deklarative Metadaten aller Tests           |

**4.2.3 Verbleib in janus7-core vs. Migration zu janus7-testsuite**

| **Artefakt**                           | **Verbleib**                                   | **Begründung**                         |
|----------------------------------------|------------------------------------------------|----------------------------------------|
| core/test/registry.js                  | → janus7-testsuite                             | Reines QA-Artefakt                     |
| core/test/runner.js                    | → janus7-testsuite                             | Reines QA-Artefakt                     |
| core/test/normalize.js                 | → janus7-testsuite                             | Reines QA-Artefakt                     |
| core/test/manual-store.js              | → janus7-testsuite (eigener Setting-Namespace) | Test-Persistenz, kein Produktionswert  |
| core/test/guided/guided-harness.js     | → janus7-testsuite                             | Reines QA-Artefakt                     |
| core/test/tests/\*\*/\*.test.js        | → janus7-testsuite                             | Alle Testfälle                         |
| ui/apps/JanusGuidedManualTestApp.js    | → janus7-testsuite                             | Debug-App                              |
| ui/apps/JanusTestResultApp.js          | → janus7-testsuite                             | Debug-App                              |
| ui/apps/JanusSettingsTestHarnessApp.js | → janus7-testsuite                             | Debug-App                              |
| core/diagnostics.js                    | In janus7 BLEIBEN                              | Produktions-Diagnose, kein QA-Exklusiv |
| core/capabilities.js                   | In janus7 BLEIBEN                              | Produktions-Feature                    |
| data/tests/test-catalog.json           | → janus7-testsuite/data/                       | Deklarativer Katalog                   |

**4.3 Vorteile und Trade-offs**

| **Aspekt**            | **Vorteil**                                            | **Trade-off**                                            |
|-----------------------|--------------------------------------------------------|----------------------------------------------------------|
| Produktions-Footprint | janus7 um ~30 Dateien schlanker                        | Migration erfordert einmaligen Aufwand                   |
| Wiederverwendbarkeit  | Andere DSA5-Module können j7ts-Framework nutzen        | Neue Dependency für QA-Umgebung                          |
| Versionierung         | TestSuite unabhängig von janus7-Releases versionierbar | Kompatibilitäts-Matrix muss gepflegt werden              |
| Aktivierung           | Per Foundry Modul-Management an/aus schaltbar          | Kein Schutz gegen Aktivierung in Produktion (Doku nötig) |
| Sauberkeit            | Keine Test-Apps in der Produktions-UI                  | Test-Apps sind nun aus dem normalen janus7-Menü weg      |

|                                                                                                                                                                                                                                                                                  |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ⚠ Migrationsregel: Der Manual Store muss seinen Settings-Namespace von 'janus7' auf 'janus7-testsuite' wechseln. Persistierte Testergebnisse aus früheren Läufen sind nach Migration nicht automatisch übertragen. Dieses ist ein einmaliger, bewusst akzeptierter Datenschnitt. |

**5. Zielarchitektur der TestSuite**

**5.1 Verzeichnisstruktur (Zielzustand)**

Nachfolgend die vollständige Ziel-Verzeichnisstruktur des Moduls janus7-testsuite. Artefakte, die noch nicht vorhanden sind, sind als ★ NEU markiert.

> janus7-testsuite/
>
> module.json
>
> scripts/
>
> j7ts.mjs ← Bootstrap / Entry Point
>
> src/
>
> core/
>
> registry.js ← (aus janus7 migriert)
>
> runner.js ← (aus janus7 migriert)
>
> normalize.js ← (aus janus7 migriert)
>
> manual-store.js ← (aus janus7 migriert, Namespace geändert)
>
> register-builtins.js ← (aus janus7 migriert)
>
> register-catalog.js ← (aus janus7 migriert)
>
> guided/
>
> guided-harness.js ← (aus janus7 migriert)
>
> guided-actions.js
>
> **guided-probes.js ★ NEU**
>
> **guided-evidence.js ★ NEU**
>
> **guided-preconditions.js ★ NEU**
>
> **observability/ ★ NEU**
>
> **HookTraceEngine.js ★ NEU**
>
> **trace-format.js ★ NEU**
>
> **diagnostics-bundle.js ★ NEU**
>
> **fixtures/ ★ NEU**
>
> profiles/
>
> **minimal/world.json ★ NEU**
>
> **academy/world.json ★ NEU**
>
> **permissions/world.json ★ NEU**
>
> **sync/world.json ★ NEU**
>
> **simulators/ ★ NEU**
>
> **multi-client-simulator.js ★ NEU**
>
> perf/
>
> **measure.js ★ NEU**
>
> tests/
>
> p0/ p1/ p15/ p16/ p2/ p3/ p4/ p4b/ p5/ p6/ p7/
>
> perf/ reg/ sec/ int/ core/ data/ bridge/ sim/ ui/
>
> apps/
>
> JanusGuidedManualTestApp.js ← (aus janus7 migriert)
>
> JanusTestResultApp.js ← (aus janus7 migriert)
>
> JanusSettingsTestHarnessApp.js ← (aus janus7 migriert)
>
> templates/ ← Handlebars-Templates für Apps
>
> data/
>
> test-catalog.json ← (aus janus7 migriert, version angehoben)
>
> extended-test-manifest.json ← (aus janus7 migriert, neu generiert)
>
> styles/
>
> j7ts.css
>
> lang/
>
> de.json / en.json

- Grün (★ NEU): Neue Artefakte, die in Phase C/D/E/F implementiert werden.

- Orange (migriert): Aus janus7 zu übernehmende Dateien mit ggf. Namespace-Anpassungen.

**5.2 Testklassen und Release-Relevanz**

| **Testklasse** | **Ziel**                                | **Release-Relevanz** | **Tooling**              |
|----------------|-----------------------------------------|----------------------|--------------------------|
| unit           | Logik-Invarianten; keine externen Deps  | Hoch                 | Runner auto              |
| integration    | Subsysteme im Zusammenspiel             | Hoch                 | Runner auto              |
| component      | App-Context, Actions, Template-Verträge | Mittel–Hoch          | Runner auto              |
| guided-manual  | Reale Foundry/DSA5/UI/Audio-Wahrnehmung | Hoch für Kernflows   | Guided Harness           |
| security       | Invalid Input, Rechte, Import-Härtung   | Hoch                 | Runner auto + guided     |
| performance    | Smoke-Metriken mit Schwellwerten        | Mittel               | Runner auto + measure.js |
| multi-client   | Sync, Rechte, Beamer, GM/Player         | Hoch                 | Simulator + guided       |
| regression     | Guards gegen bekannte Bugs              | Mittel               | Runner auto              |

**6. Vollständiger Testkatalog v2.0 (182 Tests)**

Der Katalog enthält alle 142 bestehenden Tests (bereinigt und aktualisiert) plus 40 neue Tests. Spalten: ID — Kind — Suite — Titel — Phase — Klasse — Priorität — Release-Kritisch.

**6.1 Bestehende Tests (142) — aktualisiert und bereinigt**

|                                                                                                                                                                                                                                                                                                                                                                                        |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Korrekturen gegenüber bisherigem Manifest: (1) P2-TC-07/08 und P7-TC-08/09: kind auf 'auto' korrigiert. (2) P6_TC_04\_\_permissions und P6_TC_06\_\_i18n: IDs normalisiert auf P6-TC-04 / P6-TC-05. (3) REG-TC-01/02/03: als Migrationskandidaten zu auto markiert. (4) SEC-TC-01/02/03: für Phase-B-Härtung vorgemerkt. (5) Alle PERF-Tests mit Threshold-Pflicht (Phase C) markiert. |

| **ID**          | **Kind** | **Klasse**    | **Priorität** | **RC** |
|-----------------|----------|---------------|---------------|--------|
| INT-TC-01       | manual   | guided-manual | Hoch          | Nein   |
| INT-TC-02       | manual   | guided-manual | Hoch          | Nein   |
| INT-TC-03       | manual   | guided-manual | Hoch          | Nein   |
| INT-TC-04       | manual   | guided-manual | Hoch          | Nein   |
| P0-TC-01        | manual   | manual        | Niedrig       | Nein   |
| P0-TC-02        | manual   | manual        | Niedrig       | Nein   |
| P0-TC-03        | manual   | manual        | Niedrig       | Nein   |
| P1-TC-01        | auto     | unit          | Hoch          | Ja     |
| P1-TC-02        | auto     | unit          | Hoch          | Ja     |
| P1-TC-03        | auto     | unit          | Hoch          | Ja     |
| P1-TC-04        | auto     | integration   | Hoch          | Ja     |
| P1-TC-05        | auto     | unit          | Mittel        | Ja     |
| P1-TC-06        | manual   | manual        | Niedrig       | Nein   |
| P1-TC-07        | auto     | integration   | Hoch          | Ja     |
| P1-TC-08        | auto     | security      | Hoch          | Ja     |
| P1-TC-09        | auto     | unit          | Mittel        | Nein   |
| P1-TC-10        | auto     | unit          | Hoch          | Ja     |
| P1-TC-11        | auto     | unit          | Mittel        | Nein   |
| P1-TC-12        | auto     | unit          | Niedrig       | Nein   |
| P1-TC-13        | auto     | unit          | Mittel        | Nein   |
| P1-TC-14        | auto     | unit          | Mittel        | Nein   |
| P1-TC-15        | auto     | unit          | Mittel        | Nein   |
| P1-TC-16        | auto     | unit          | Niedrig       | Nein   |
| P1-TC-17        | auto     | unit          | Niedrig       | Nein   |
| P15-TC-01       | auto     | unit          | Mittel        | Nein   |
| P15-TC-02       | auto     | integration   | Hoch          | Ja     |
| P15-TC-03       | auto     | unit          | Hoch          | Ja     |
| P15-TC-04       | auto     | integration   | Mittel        | Nein   |
| P15-TC-05       | auto     | unit          | Mittel        | Nein   |
| P15-TC-06       | auto     | integration   | Mittel        | Nein   |
| P15-TC-07       | auto     | integration   | Mittel        | Nein   |
| P15-TC-08       | auto     | unit          | Niedrig       | Nein   |
| P15-TC-09       | auto     | integration   | Mittel        | Nein   |
| P15-TC-10       | auto     | integration   | Mittel        | Nein   |
| P15-TC-11       | auto     | integration   | Mittel        | Nein   |
| P15-TC-12       | auto     | integration   | Niedrig       | Nein   |
| P15-TC-13       | auto     | unit          | Niedrig       | Nein   |
| P15-TC-14       | auto     | unit          | Mittel        | Nein   |
| P15-TC-15       | auto     | unit          | Mittel        | Nein   |
| P15-TC-16       | auto     | component     | Niedrig       | Nein   |
| P16-TC-01       | auto     | unit          | Hoch          | Ja     |
| P16-TC-02       | auto     | unit          | Mittel        | Nein   |
| P16-TC-03       | auto     | security      | Hoch          | Ja     |
| P16-TC-04       | auto     | integration   | Mittel        | Nein   |
| P16-TC-05       | auto     | integration   | Mittel        | Nein   |
| P16-TC-06       | auto     | unit          | Mittel        | Nein   |
| P16-TC-07       | auto     | component     | Hoch          | Ja     |
| P16-TC-08       | auto     | component     | Mittel        | Nein   |
| P16-TC-09       | auto     | component     | Niedrig       | Nein   |
| P16-TC-10       | auto     | component     | Hoch          | Ja     |
| P2-TC-01        | auto     | unit          | Hoch          | Ja     |
| P2-TC-02        | auto     | unit          | Mittel        | Ja     |
| P2-TC-03        | manual   | manual        | Mittel        | Nein   |
| P2-TC-04        | auto     | integration   | Hoch          | Ja     |
| P2-TC-05        | manual   | manual        | Mittel        | Nein   |
| P2-TC-06        | manual   | manual        | Niedrig       | Nein   |
| P2-TC-07        | auto     | unit          | Mittel        | Ja     |
| P2-TC-08        | auto     | unit          | Mittel        | Ja     |
| P3-TC-01        | manual   | guided-manual | Hoch          | Nein   |
| P3-TC-02        | auto     | unit          | Hoch          | Ja     |
| P3-TC-03        | manual   | guided-manual | Hoch          | Nein   |
| P3-TC-04        | manual   | manual        | Niedrig       | Nein   |
| P3-TC-05        | manual   | guided-manual | Mittel        | Nein   |
| P3-TC-12        | auto     | unit          | Mittel        | Nein   |
| P3-TC-13        | auto     | unit          | Niedrig       | Nein   |
| P3-TC-ADV-01    | manual   | guided-manual | Hoch          | Nein   |
| P3-TC-BUFF-01   | manual   | guided-manual | Mittel        | Nein   |
| P3-TC-FATE-01   | manual   | guided-manual | Hoch          | Nein   |
| P3-TC-MOON-01   | manual   | guided-manual | Mittel        | Nein   |
| P3-TC-SOCIAL-01 | manual   | guided-manual | Mittel        | Nein   |
| P3-TC-TIMED-01  | manual   | guided-manual | Mittel        | Nein   |
| P3-TRAD-TC-01   | manual   | guided-manual | Mittel        | Nein   |
| P3-GC-TC-01     | manual   | guided-manual | Mittel        | Nein   |
| P4-TC-01        | auto     | integration   | Hoch          | Ja     |
| P4-TC-02        | auto     | unit          | Mittel        | Nein   |
| P4-TC-03        | auto     | unit          | Hoch          | Ja     |
| P4-TC-04        | auto     | unit          | Hoch          | Ja     |
| P4-TC-04A       | manual   | manual        | Niedrig       | Nein   |
| P4-TC-05        | manual   | guided-manual | Hoch          | Nein   |
| P4-TC-06        | auto     | unit          | Mittel        | Nein   |
| P4-TC-07        | auto     | integration   | Hoch          | Ja     |
| P4-TC-08        | auto     | unit          | Hoch          | Ja     |
| P4-TC-09        | auto     | unit          | Mittel        | Nein   |
| P4-TC-10        | auto     | unit          | Mittel        | Nein   |
| P4B-TC-01       | auto     | integration   | Hoch          | Ja     |
| P4B-TC-02       | auto     | integration   | Hoch          | Ja     |
| P4B-TC-03       | auto     | integration   | Hoch          | Ja     |
| P4B-TC-04       | manual   | guided-manual | Hoch          | Nein   |
| P4B-TC-11       | auto     | unit          | Mittel        | Nein   |
| P4B-TC-12       | auto     | integration   | Mittel        | Nein   |
| P4B-TC-13       | auto     | unit          | Mittel        | Nein   |
| P4B-TC-14       | auto     | unit          | Mittel        | Nein   |
| P4B-TC-15       | auto     | unit          | Niedrig       | Nein   |
| P5-TC-01        | auto     | unit          | Mittel        | Nein   |
| P5-TC-02        | manual   | guided-manual | Mittel        | Nein   |
| P5-TC-03        | auto     | unit          | Mittel        | Nein   |
| P5-TC-04        | manual   | guided-manual | Mittel        | Nein   |
| P6-TC-01        | auto     | component     | Hoch          | Ja     |
| P6-TC-02        | auto     | component     | Mittel        | Nein   |
| P6-TC-03        | auto     | integration   | Hoch          | Ja     |
| P6-TC-04        | auto     | security      | Hoch          | Ja     |
| P6-TC-05        | auto     | unit          | Mittel        | Nein   |
| P6-TC-07        | auto     | component     | Mittel        | Nein   |
| P6-TC-08        | auto     | unit          | Mittel        | Nein   |
| P6-TC-09        | auto     | integration   | Mittel        | Nein   |
| P6-TC-10        | auto     | component     | Mittel        | Nein   |
| P6-TC-11        | auto     | component     | Mittel        | Nein   |
| P6-TC-12        | auto     | component     | Niedrig       | Nein   |
| P6-TC-13        | auto     | component     | Niedrig       | Nein   |
| P6-TC-14        | auto     | component     | Niedrig       | Nein   |
| P6-TC-15        | auto     | component     | Niedrig       | Nein   |
| P6-TC-16        | auto     | component     | Niedrig       | Nein   |
| P6-TC-17        | auto     | component     | Mittel        | Nein   |
| P6-TC-18        | auto     | unit          | Niedrig       | Nein   |
| P6-TC-19        | auto     | unit          | Niedrig       | Nein   |
| P6-TC-20        | auto     | unit          | Hoch          | Ja     |
| P6-TC-21        | auto     | component     | Mittel        | Nein   |
| P6-TC-22        | auto     | component     | Hoch          | Ja     |
| P7-TC-01        | auto     | integration   | Hoch          | Ja     |
| P7-TC-02        | auto     | unit          | Hoch          | Ja     |
| P7-TC-03        | auto     | security      | Hoch          | Ja     |
| P7-TC-04        | auto     | integration   | Hoch          | Ja     |
| P7-TC-05        | auto     | integration   | Hoch          | Ja     |
| P7-TC-06        | auto     | integration   | Hoch          | Ja     |
| P7-TC-07        | auto     | integration   | Hoch          | Ja     |
| P7-TC-A1        | auto     | security      | Hoch          | Ja     |
| P7-TC-A2        | manual   | guided-manual | Mittel        | Nein   |
| P7-TC-A3        | auto     | unit          | Niedrig       | Nein   |
| P7-TC-08        | auto     | unit          | Hoch          | Ja     |
| P7-TC-09        | auto     | unit          | Hoch          | Ja     |
| PERF-TC-01      | manual   | performance   | Mittel        | Nein   |
| PERF-TC-02      | manual   | performance   | Mittel        | Nein   |
| PERF-TC-03      | manual   | performance   | Mittel        | Nein   |
| REG-TC-01       | manual   | regression    | Mittel        | Nein   |
| REG-TC-02       | manual   | regression    | Mittel        | Nein   |
| REG-TC-03       | manual   | regression    | Mittel        | Nein   |
| SEC-TC-01       | manual   | security      | Hoch          | Nein   |
| SEC-TC-02       | manual   | security      | Hoch          | Nein   |
| SEC-TC-03       | manual   | security      | Hoch          | Nein   |

**6.2 Neue Tests (40) — Phase B**

|                                                                                                                                                                                                                              |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ID-Konvention: T-{DOMAIN}-{NN} für neue Tests (T-CORE, T-DATA, T-BRIDGE, T-SIM, T-UI, T-SEC, T-PERF, T-SYNC). Diese IDs sind bewusst von bestehenden Phase-IDs getrennt, um sie als 'Wave 5 Hardening' klar zu kennzeichnen. |

| **ID**      | **Kind**      | **Suite** | **Titel (Kurzform)**                                         | **Phase** | **Klasse**    | **Prio** | **RC** |
|-------------|---------------|-----------|--------------------------------------------------------------|-----------|---------------|----------|--------|
| T-CORE-01   | auto          | core      | State-Migration lässt Root-/Alias-Pfade korrekt zusammenlauf | P1        | integration   | Hoch     | Ja     |
| T-CORE-02   | auto          | core      | Dirty-Tracking ignoriert idempotente set()-Aufrufe           | P1        | unit          | Hoch     | Ja     |
| T-CORE-03   | auto          | core      | Rollback stellt komplexe Nested-Änderungen vollständig wiede | P1        | integration   | Hoch     | Ja     |
| T-CORE-04   | auto          | core      | Backup-Rotation hält nur erlaubte Anzahl und löscht determin | P1        | unit          | Mittel   | Nein   |
| T-CORE-05   | auto          | core      | IO-Import blockiert Pflichtverletzungen mit lesbaren Fehlern | P1        | integration   | Hoch     | Ja     |
| T-CORE-06   | auto          | core      | Capabilities liefern isolierte Snapshots                     | P1        | unit          | Mittel   | Nein   |
| T-CORE-07   | auto          | core      | Diagnostics-Report bleibt stabil bei leerem/partiellem State | P1        | component     | Hoch     | Ja     |
| T-CORE-08   | auto          | core      | Sync Engine markiert nur relevante Updates als dirty         | P1        | integration   | Mittel   | Nein   |
| T-CORE-09   | auto          | core      | Director Runtime Summary bleibt ohne aktive Lesson/Quest kon | P4        | unit          | Mittel   | Nein   |
| T-CORE-10   | auto          | core      | FolderService liefert kanonische Pfade ohne Duplikate        | P1        | unit          | Niedrig  | Nein   |
| T-DATA-01   | auto          | data      | AcademyDataApi merged World-Overrides ohne Referenzverlust   | P2        | integration   | Hoch     | Ja     |
| T-DATA-02   | auto          | data      | Reload ersetzt Registry statt sie anzureichern               | P2        | integration   | Hoch     | Ja     |
| T-DATA-03   | auto          | data      | Reference Integrity meldet defekte IDs domänenspezifisch     | P2        | unit          | Mittel   | Nein   |
| T-DATA-04   | auto          | data      | Cache invalidiert sauber nach World-Edit                     | P2        | integration   | Mittel   | Nein   |
| T-DATA-05   | auto          | data      | Data Studio speichert und liest denselben Datensatz konsiste | P2        | component     | Mittel   | Nein   |
| T-DATA-06   | auto          | data      | Schemaänderung erzeugt bewusstes und lesbares Fehlersignal   | P2        | unit          | Mittel   | Nein   |
| T-BRIDGE-01 | auto          | bridge    | Silent DSA5 Roll liefert stabile Vertragsform ohne UI        | P3        | integration   | Hoch     | Ja     |
| T-BRIDGE-02 | guided-manual | bridge    | Group Check: Chat-Nachricht + Aggregation (guided)           | P3        | guided-manual | Mittel   | Nein   |
| T-BRIDGE-03 | auto          | bridge    | Advancement Bridge blockiert ungültige AP-Steigerung         | P3        | integration   | Hoch     | Ja     |
| T-BRIDGE-04 | auto          | bridge    | Fate Bridge: liest/verbraucht Schips deterministisch         | P3        | integration   | Hoch     | Ja     |
| T-BRIDGE-05 | auto          | bridge    | Moon Bridge reagiert auf Phasenwechsel-Hooks                 | P3        | integration   | Mittel   | Nein   |
| T-BRIDGE-06 | auto          | bridge    | Timed Conditions setzen und entfernen Effekte sauber         | P3        | integration   | Mittel   | Nein   |
| T-BRIDGE-07 | auto          | bridge    | Item Bridge löst Zauber-/Traditionsdaten ohne Null-Falsifika | P3        | integration   | Mittel   | Nein   |
| T-BRIDGE-08 | auto          | bridge    | Actor Wrapper kapselt DSA5-Daten; Core greift nicht direkt a | P3        | unit          | Hoch     | Ja     |
| T-SIM-01    | auto          | sim       | Lesson Completion berechnet Score-Delta und Logeintrag genau | P4        | integration   | Hoch     | Ja     |
| T-SIM-02    | guided-manual | sim       | Quest Persistenz über Reload hält Node-State konsistent      | P4        | guided-manual | Hoch     | Nein   |
| T-SIM-03    | auto          | sim       | Cron feuert Perioden nur an echten Grenzen                   | P4        | unit          | Hoch     | Ja     |
| T-SIM-04    | auto          | sim       | Time Reactor startet/stoppt ohne doppelte Registrierung      | P4        | integration   | Mittel   | Nein   |
| T-SIM-05    | auto          | sim       | Social clamp hält auch Extremserien stabil                   | P4        | unit          | Mittel   | Nein   |
| T-SIM-06    | auto          | sim       | Living World tickt nur einmal pro Tageswechsel               | P4        | integration   | Hoch     | Ja     |
| T-SIM-07    | auto          | sim       | Event Engine verschickt erwartete Nachrichten ohne UI-Leck   | P4        | integration   | Mittel   | Nein   |
| T-SIM-08    | auto          | sim       | RuleEvaluator meldet invalide Regeln als Diagnose statt stil | P4        | unit          | Mittel   | Nein   |
| T-UI-01     | auto          | ui        | Shell öffnet korrektes Panel und aktualisiert Active-State   | P6        | component     | Hoch     | Ja     |
| T-UI-02     | auto          | ui        | Guided Harness persistiert Step-Status und Evidence          | P6        | component     | Hoch     | Ja     |
| T-UI-03     | auto          | ui        | Command Center delegiert Actions ohne implizite Seiteneffekt | P6        | component     | Mittel   | Nein   |
| T-UI-04     | auto          | ui        | TestResultApp zeigt Auto/Manual/Skip konsistent an           | P6        | component     | Mittel   | Nein   |
| T-SEC-01    | guided-manual | sec       | Nicht-GM kann keine GM-Aktion über Commands oder UI triggern | P6        | security      | Hoch     | Nein   |
| T-SEC-02    | auto          | sec       | Import extra fields policy ist nachvollziehbar und determini | P7        | security      | Hoch     | Ja     |
| T-PERF-01   | auto          | perf      | Graph build bleibt unter definierter Smoke-Grenze (\<500ms)  | P15       | performance   | Mittel   | Nein   |
| T-SYNC-01   | guided-manual | sync      | Zwei Clients sehen State-Update und UI-Folge konsistent      | P1        | multi-client  | Hoch     | Nein   |

**7. Implementierungsplan — 6 KI-taugliche Phasen**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>KI-Tauglichkeits-Prinzip</strong></p>
<p>Jede Phase ist so spezifiziert, dass ein LLM (Claude, ChatGPT, Gemini) sie ohne Halluzinationen implementieren kann. Das bedeutet: (1) Exakte Dateinamen und Pfade. (2) Vollständige Datenverträge (keine impliziten Annahmen). (3) Klare Abbruchkriterien (wann ist die Phase fertig). (4) Keine Abhängigkeiten auf nicht-existente APIs ohne explizite Fallback-Beschreibung. (5) Verifikationsschritte, die maschinell überprüfbar sind.</p></td>
</tr>
</tbody>
</table>

**Phase A — Testarchitektur & Metadaten bereinigen**

**Ziel:** Sauberer Ausgangszustand; alle vorhandenen Tests korrekt klassifiziert; Manifest auf SSOT-Version.

**A.1 Manifest-Bereinigung**

Eingabe-Artefakt: mod/data/tests/extended-test-manifest.json (aktuell v0.9.12.3).

Aufgaben für die KI:

1.  Lese extended-test-manifest.json ein.

2.  Setze "moduleVersion" auf "0.9.12.26".

3.  Für IDs P2-TC-07, P2-TC-08, P7-TC-08, P7-TC-09: setze kind auf "auto", suiteClass auf "extended-auto".

4.  Normalisiere IDs: "P6_TC_04\_\_permissions" → "P6-TC-04", "P6_TC_06\_\_i18n" → "P6-TC-05".

5.  Schreibe die korrigierte Datei zurück und erzeuge eine JSON-Diff-Summary als Verifikation.

Verifikation: Die Datei darf keine ID mehr enthalten, die einen Underscore-Doppel-Underscore-Muster enthält. Das grep-Pattern \[a-z\]\_\[A-Z\] darf keine Treffer im id-Feld liefern.

**A.2 Test-Catalog-Update**

Eingabe-Artefakt: mod/data/tests/test-catalog.json (aktuell v0.9.12.6).

Aufgaben: (1) version und moduleVersion auf 0.9.12.26 setzen. (2) Fehlende IDs aus dem extended-test-manifest nachtragen. (3) required-Array vollständig auf alle 142 bestehenden IDs ausweiten. (4) JSON-Schema der Einträge prüfen: jeder Eintrag braucht id, phase, kind, title.

**A.3 Testklassen-Metadaten ergänzen**

Aufgabe: Alle .test.js-Dateien sollen im export-Default-Objekt ein Feld class (string, eine der Testklassen aus Abschnitt 5.2) und releaseCritical (boolean) enthalten.

Vorgehen für die KI: Für jede .test.js-Datei in core/test/tests/\*\*/ (142 Dateien), lese das export default {...}-Objekt ein und ergänze class und releaseCritical gemäß der Tabelle in Abschnitt 6.1. Liefere nach Abschluss eine CSV-Zusammenfassung: ID, class, releaseCritical.

Abbruchkriterium Phase A: grep -r 'class:' core/test/tests/\*\*/\*.test.js liefert 142 Treffer.

**Phase B — 40 neue Tests implementieren**

Abhängigkeit: Phase A abgeschlossen.

Die 40 neuen Tests werden in 6 Blöcken geliefert. Jede KI-Sitzung implementiert genau einen Block (max. 10 Tests). Reihenfolge: T-CORE → T-DATA → T-BRIDGE → T-SIM → T-UI → T-SEC/PERF/SYNC.

**B.1 Teststruktur-Template (für jede neue Datei)**

Jede neue .test.js-Datei muss folgendes Schema einhalten:

> export default {
>
> id: 'T-CORE-01',
>
> title: 'State-Migration: Root-/Alias-Pfade',
>
> class: 'integration',
>
> phases: \[1\],
>
> releaseCritical: true,
>
> kind: 'auto',
>
> priority: 'high', // 'high' \| 'medium' \| 'low'
>
> tags: \['state', 'migration', 'alias'\],
>
> preconditions: \[
>
> 'game.janus7.state ist initialisiert',
>
> 'Keine bestehende World-Migration läuft',
>
> \],
>
> expected: 'Alias-Pfad wird korrekt auf Root-Pfad abgebildet.',
>
> failureModes: \[
>
> 'Alias bleibt unaufgelöst → State enthält doppelte Pfade',
>
> 'Root-Pfad überschreibt Alias ohne Merge → Datenverlust',
>
> \],
>
> async run(ctx) {
>
> // Arrange
>
> // Act
>
> // Assert
>
> return ctx.pass('Beschreibung des Erfolgs');
>
> }
>
> };

**B.2 KI-Sitzungsaufteilung**

| **Sitzung** | **Tests**                         | **Dateien (Ziel)**                   | **Abhängigkeiten im Code**                          |
|-------------|-----------------------------------|--------------------------------------|-----------------------------------------------------|
| B1          | T-CORE-01 bis T-CORE-10           | tests/core/T_CORE\_\*.test.js        | game.janus7.state, game.janus7.io, game.janus7.sync |
| B2          | T-DATA-01 bis T-DATA-06           | tests/data/T_DATA\_\*.test.js        | game.janus7.academy.dataApi, game.janus7.io         |
| B3          | T-BRIDGE-01 bis T-BRIDGE-08       | tests/bridge/T_BRIDGE\_\*.test.js    | game.janus7.bridge.dsa5.\*                          |
| B4          | T-SIM-01 bis T-SIM-08             | tests/sim/T_SIM\_\*.test.js          | game.janus7.academy.\*, game.janus7.director        |
| B5          | T-UI-01 bis T-UI-04               | tests/ui/T_UI\_\*.test.js            | game.j7ts.harness, game.janus7.ui.apps              |
| B6          | T-SEC-01/02, T-PERF-01, T-SYNC-01 | tests/sec/, tests/perf/, tests/sync/ | game.janus7.\*, game.j7ts.simulator                 |

**B.3 Register-builtins Erweiterung**

Nach jeder Sitzung (B1–B6): register-builtins.js erweitern, die neuen Import-Pfade eintragen und das extended-test-manifest.json mit den neuen Einträgen aktualisieren. Die KI liefert den Diff für register-builtins.js und die neuen JSON-Einträge für das Manifest.

Abbruchkriterium Phase B: extended-test-manifest.json enthält 182 Einträge. Runner zeigt total: 182.

**Phase C — HookTraceEngine + Diagnostics Bundle**

Neue Dateien in janus7-testsuite/src/observability/:

**C.1 HookTraceEngine — vollständiger Datenvertrag**

| **Feld**       | **Typ**           | **Pflicht** | **Beschreibung**                                                          |
|----------------|-------------------|-------------|---------------------------------------------------------------------------|
| hook           | string            | Ja          | Hook-Name, z. B. janus7.roll.completed                                    |
| ts             | string (ISO-8601) | Ja          | Zeitpunkt der Aufzeichnung (performance.now als Basis empfohlen)          |
| source         | string            | Nein        | Emitter: Dienstname, App-ID oder 'unknown'                                |
| payloadSummary | object            | Nein        | Bewusst gekürztes, serialisierbares Nutzlast-Objekt. Max. 512 Bytes JSON. |
| sequence       | number            | Ja          | Fortlaufende Nummer; startet bei 1 pro Trace-Session                      |
| durationMs     | number            | Nein        | Zeit zwischen diesem und dem vorherigen Hook (optional)                   |
| error          | boolean           | Nein        | true wenn Hook oder Listener einen Fehler warf                            |
| errorMessage   | string            | Nein        | Fehlermeldung wenn error = true                                           |

**C.2 HookTraceEngine — öffentliche API**

> // In janus7-testsuite/src/observability/HookTraceEngine.js
>
> export class HookTraceEngine {
>
> start(hookPatterns = \[\]) // Patterns: Glob-ähnlich, z.B. 'janus7.\*'
>
> stop() // Stoppt Aufzeichnung, Trace bleibt im Speicher
>
> clear() // Löscht Trace
>
> export() // Gibt Array\<TraceEntry\> zurück
>
> exportJSON() // Gibt JSON-String zurück
>
> query(filter) // filter: { hook?, source?, error? }
>
> assertOrder(hookA, hookB)// Wirft AssertionError wenn hookA nicht vor hookB
>
> assertNoDuplicates(hook) // Prüft auf Doppelregistrierungen
>
> }

**C.3 Diagnostics Bundle — Paketinhalt**

| **Datei/Block**          | **Quelle**                       | **Pflicht** | **Zweck**                                                             |
|--------------------------|----------------------------------|-------------|-----------------------------------------------------------------------|
| diagnostics-summary.json | core/diagnostics + Testkontext   | Ja          | JANUS7-Version, Foundry-Version, DSA5-Version, User-Rolle, Weltprofil |
| hook-trace.json          | HookTraceEngine.exportJSON()     | Nein        | Reihenfolge + Payload-Summary                                         |
| state-snapshot.json      | game.janus7.state snapshot       | Ja          | Relevanter Zustand zum Fehlerzeitpunkt                                |
| test-result.json         | Runner / Guided Harness          | Ja          | Test-ID, Schritt, Status, Notes, Evidence                             |
| recent-logs.txt          | JanusLogger letzte 100 Einträge  | Ja          | Letzte signifikante Log-Einträge                                      |
| ui-context.json          | Optional: aktuell gerenderte App | Nein        | Gerenderter oder vorbereiteter Context                                |
| environment.json         | Foundry.system + game.modules    | Ja          | Versionen und Rolle des Clients                                       |

**C.4 Performance-Schwellwerte (verbindlich für PERF-Tests)**

| **Test**                          | **Schwelle**                  | **Aktion bei Überschreitung**               |
|-----------------------------------|-------------------------------|---------------------------------------------|
| PERF-TC-01: State-Load            | \< 200ms                      | FAIL + Warning im Log                       |
| PERF-TC-02: JSON-Loader Cache-Hit | \< 10ms nach erstem Load      | FAIL                                        |
| PERF-TC-03: UI-Rendering Frame    | \< 16ms (60fps)               | WARN (nicht FAIL, da abhängig von Hardware) |
| T-PERF-01: Graph Build (\<500ms)  | \< 500ms für kompletten Build | FAIL bei \> 500ms, WARN bei \> 300ms        |

Abbruchkriterium Phase C: HookTraceEngine.test.js grün, Diagnostics Bundle Export erzeugt vollständige 7-teilige Paketstruktur.

**Phase D — Guided Harness v3.0**

Abhängigkeit: Phase A + Phase C abgeschlossen.

Ziel: Der Guided Harness unterstützt strukturierte Preconditions, Evidence-Probes und Step-Status-Persistenz über Sitzungen hinweg.

**D.1 Neue guided/-Artefakte**

| **Datei**               | **Funktion**                                      | **Neue API**                                                              |
|-------------------------|---------------------------------------------------|---------------------------------------------------------------------------|
| guided-preconditions.js | Prüft und dokumentiert Vorbedingungen eines Tests | checkPrecondition(id, label, checkFn)                                     |
| guided-evidence.js      | Sammelt und persistiert Evidence-Artefakte        | addEvidence(stepId, type, data)                                           |
| guided-probes.js        | Automatische Assertions während guided Steps      | probe.hookTrace(hookName), probe.stateSnapshot(path), probe.dom(selector) |

**D.2 Erweitertes Step-Objekt**

> {
>
> id: 'step-001',
>
> label: 'Lektion starten',
>
> preconditions: \['Actor mit DSA5-Charakter geladen'\],
>
> action: 'game.janus7.director.startLesson(actorId, lessonId)',
>
> expectedResult: 'State enthält activeLesson mit korrekter actorId',
>
> probes: \[
>
> { type: 'hookTrace', hook: 'janus7.lesson.started' },
>
> { type: 'stateSnapshot', path: 'academy.activeLesson' },
>
> \],
>
> evidenceRequired: false,
>
> manualVerification: 'UI zeigt Lektion im Control Panel an',
>
> }

Abbruchkriterium Phase D: JanusGuidedManualTestApp zeigt für jeden Schritt Preconditions, Probe-Status und Evidence-Anhänge korrekt an.

**Phase E — Multi-Client Simulator**

Abhängigkeit: Phase A + Phase D abgeschlossen.

**E.1 Simulator-Profile**

| **Profil-ID** | **Akteure**                       | **Setup-Schritte**                                                                                                                          | **Prüfungen**                                                         |
|---------------|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| permissions   | GM + 1 Player (gleiche Welt)      | 1\. Welt mit permissions-fixture öffnen 2. Player-Client auf Player-Account einloggen 3. game.j7ts.simulator.setup('permissions') ausführen | GM-only Actions blockiert? Keine unbefugte State-Mutation?            |
| sync          | GM + 1 Player                     | 1\. Welt mit sync-fixture öffnen 2. game.j7ts.simulator.setup('sync')                                                                       | State-Änderung propagiert? UI beider Clients aktualisiert?            |
| beamer        | GM + Beamer-Client (kein Spieler) | 1\. Welt mit academy-fixture öffnen 2. Beamer-Client als Observer einloggen                                                                 | Atmosphäre/Standort/Slide sichtbar? Kein Player-Content im Beamer?    |
| triad         | GM + 2 Player                     | 1\. Welt mit sync-fixture 2. Zwei Player-Clients                                                                                            | Gleichzeitige Mutation: Konflikt-Verhalten? Reihenfolge determiniert? |

**E.2 Simulator-API**

> game.j7ts.simulator.setup('permissions') // Welt-Zustand + Rollen vorbereiten
>
> game.j7ts.simulator.reset() // World-State zurücksetzen
>
> game.j7ts.simulator.listProfiles() // Verfügbare Profile
>
> game.j7ts.simulator.getConsoleCommands('sync') // Console-Befehle für Profil

Abbruchkriterium Phase E: INT-TC-03 (Multi-User: State-Sync) und T-SYNC-01 laufen über das 'sync'-Profil vollständig durch und persistieren Ergebnisse im Manual Store.

**Phase F — Release-Gates & Gate-Report Generator**

Abhängigkeit: Alle Phasen A–E abgeschlossen.

**F.1 Formelle Release-Gates (verbindliche Muss-Kriterien)**

| **Gate** | **Prüfung**                                                                   | **Wer prüft**            | **Blocking?**                      |
|----------|-------------------------------------------------------------------------------|--------------------------|------------------------------------|
| G-1      | 0 FAIL / 0 ERROR im aktiven Auto-Set (alle 182 auto-Tests, die laufen können) | Runner auto              | Ja                                 |
| G-2      | Alle RC-markierten Guided Manual Tests: PASS oder BLOCKED mit Begründung      | Guided Harness           | Ja                                 |
| G-3      | Permissions-Kernfälle (P6-TC-04, P16-TC-03, T-SEC-01, T-SEC-02): PASS         | Runner + guided          | Ja                                 |
| G-4      | Persistenz-/Reload-Kernfälle (P1-TC-07, T-CORE-03, T-DATA-02): PASS           | Runner auto              | Ja                                 |
| G-5      | Security-Kernfälle (P7-TC-03, P7-TC-A1, SEC-TC-01/02/03): PASS                | Runner auto + guided     | Ja                                 |
| G-6      | Perf-Smokes unter definierten Schwellwerten (PERF-TC-01/02, T-PERF-01)        | Runner auto + measure.js | Warn (kein Blocker wenn begründet) |
| G-7      | Gate-Report erzeugt, archiviert und SSOT-Version enthält                      | Gate Report Generator    | Ja                                 |
| G-8      | README, INSTALLATION, USER_MANUAL, GUIDED_MANUAL_HARNESS auf SSOT-Version     | Manuelle Dok-Prüfung     | Ja                                 |

**F.2 Gate-Report-Format**

> {
>
> 'version': '0.9.12.X',
>
> 'foundry': '13.351',
>
> 'dsa5': '7.4.7',
>
> 'timestamp': '2026-XX-XXTXX:XX:XXZ',
>
> 'gates': {
>
> 'G-1': { 'status': 'PASS', 'auto_total': 182, 'auto_pass': 182 },
>
> 'G-2': { 'status': 'PASS', 'rc_total': 24, 'rc_pass': 24, 'rc_blocked': 0 },
>
> 'G-3': { 'status': 'PASS' },
>
> 'G-4': { 'status': 'PASS' },
>
> 'G-5': { 'status': 'PASS' },
>
> 'G-6': { 'status': 'WARN', 'note': 'PERF-TC-03 leicht über Schwelle (18ms)' },
>
> 'G-7': { 'status': 'PASS' },
>
> 'G-8': { 'status': 'PASS' }
>
> },
>
> 'decision': 'RELEASE' // oder 'BLOCKED' oder 'CONDITIONAL'
>
> }

**8. QA-Betriebsroutine**

**8.1 Nach jedem Patch**

- Auto-Smoke-Lauf (alle auto-Tests, die keine Foundry-Laufzeitumgebung benötigen).

- Gezielter Delta-Lauf für betroffene Domänen (Tags aus Commit-Message auslesen).

- Bei UI-/Permissions-/Sync-Themen: Guided Manual Delta-Pack (relevante RC-Tests).

- Bei Fehlern: Diagnostics Bundle exportieren und im Ticket verlinken.

**8.2 Vor jedem Release Candidate**

- Vollständiger Auto-Lauf (alle 182 auto-Tests).

- Guided Core Pack (INT-TC-01, INT-TC-02, alle P3-guided Tests).

- Permissions-/Security-Pack (G-3, G-5).

- Persistenz- und Reload-Prüfung (G-4).

- Performance-Smoke (G-6).

- Gate-Report erzeugen (G-7).

**8.3 Vor finalem Release**

- Multi-Client-/Beamer-/Sync-Szenarien (E1–E4 alle Profile).

- Abgleich Known Issues gegen reale Blocker.

- Validierung der Dokumentation: G-8.

- CHANGELOG.md, VERSION.json, module.json auf Konsistenz prüfen.

**8.4 Entscheidungsmatrix für Releases**

| **Situation**                                                | **Entscheidung**                                       |
|--------------------------------------------------------------|--------------------------------------------------------|
| G-1 bis G-5 alle PASS, G-6 WARN mit Begründung, G-7+G-8 PASS | RELEASE — Gate-Report archivieren                      |
| G-1 FAIL (auch ein einziger Test)                            | BLOCKED — kein Release bis PASS                        |
| G-2 BLOCKED ohne Begründung                                  | BLOCKED — Begründung erforderlich                      |
| G-3 oder G-5 irgendein FAIL                                  | BLOCKED — Security ist nicht verhandelbar              |
| G-8 FAIL (Doku nicht auf SSOT)                               | CONDITIONAL — Release nur mit Doku-Hotfix-Commitzenent |

**9. Anhang**

**9.1 Migrations-Checkliste: janus7 → janus7-testsuite**

| **Schritt** | **Aufgabe**                                                                                            | **Status** |
|-------------|--------------------------------------------------------------------------------------------------------|------------|
| M-1         | Neues Foundry-Modul janus7-testsuite anlegen (module.json, j7ts.mjs)                                   | ☐ Offen    |
| M-2         | core/test/\*.js nach janus7-testsuite/src/core/ kopieren                                               | ☐ Offen    |
| M-3         | core/test/guided/ nach janus7-testsuite/src/guided/ kopieren                                           | ☐ Offen    |
| M-4         | core/test/tests/\*\*/ nach janus7-testsuite/tests/ kopieren                                            | ☐ Offen    |
| M-5         | ui/apps/JanusGuidedManualTestApp.js + JanusTestResultApp.js + JanusSettingsTestHarnessApp.js migrieren | ☐ Offen    |
| M-6         | manual-store.js: Setting-Namespace von 'janus7' auf 'janus7-testsuite' ändern                          | ☐ Offen    |
| M-7         | data/tests/\*.json nach janus7-testsuite/data/ kopieren und Version anheben                            | ☐ Offen    |
| M-8         | register-builtins.js: Import-Pfade auf neue Struktur anpassen                                          | ☐ Offen    |
| M-9         | In janus7: Hooks, die vom Testsystem abgehört wurden, dokumentieren (damit j7ts sie finden kann)       | ☐ Offen    |
| M-10        | Test: janus7 allein starten → keine Test-Apps in der UI, keine Test-Imports in der Konsole             | ☐ Offen    |
| M-11        | Test: janus7 + janus7-testsuite starten → alle 142 Tests laufen durch, 105 PASS                        | ☐ Offen    |
| M-12        | CHANGELOG.md in janus7 + janus7-testsuite pflegen                                                      | ☐ Offen    |

**9.2 Glossar**

| **Begriff**            | **Definition**                                                                      |
|------------------------|-------------------------------------------------------------------------------------|
| SSOT                   | Single Source of Truth — aktuell janus7 v0.9.12.26                                  |
| RC                     | Release Candidate                                                                   |
| Gate                   | Formelles Abnahmekriterium für einen Release-Entscheid                              |
| Guided Harness         | Semi-automatische Testoberfläche mit Steps, Preconditions, Evidence                 |
| HookTraceEngine        | Mitschneide-System für Foundry/JANUS7 Hooks mit Reihenfolgenanalyse                 |
| Diagnostics Bundle     | Standardisiertes Fehlerpaket aus 7 Dateien für reproduzierbare Bugreports           |
| Multi-Client Simulator | Profilbasiertes System zur Simulation von GM/Player/Beamer-Szenarien                |
| Fixture                | Definierter Startzustand einer Foundry-Welt für deterministische Tests              |
| releaseCritical        | Flag auf Testebene: true → muss vor Release PASS sein                               |
| Wave                   | Gruppe gleichzeitig implementierter Tests (aktuell bis Wave 4; Wave 5 = Phasen B–F) |

**9.3 Bekannte Deferred Issues aus Audit v0.9.10.17**

|                                                                                                                                                  |
|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Diese Issues wurden im Audit v0.9.10.17 identifiziert, aber bewusst nicht in diesem Sprint behoben. Sie sind als Testfälle in Phase B abgedeckt. |

| **Issue**              | **Beschreibung**                                                      | **Abgedeckt durch**           |
|------------------------|-----------------------------------------------------------------------|-------------------------------|
| State.save() nach Tick | Progression markiert State dirty, ruft aber save() nicht auf          | T-CORE-08 (Sync Dirty)        |
| Test-Manifest Drift    | 62 von 106 Tests nicht registriert (alt)                              | Phase A vollständig           |
| new Function Injection | Code-Injection-Risiko in Engine-Dateien (bereits gefixt in 0.9.10.17) | SEC-TC-02 (Guard-Test bleibt) |

*JANUS7 TestSuite Professionalisierung · Masterdokument v1.0 · 2026-03-13*

*Basis: JANUS7 v0.9.12.26 · 182 Tests · 6 Implementierungsphasen*
