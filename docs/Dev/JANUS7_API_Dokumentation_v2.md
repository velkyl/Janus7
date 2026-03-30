**JANUS7 v0.9.0**

API-Referenz & Verwendungsdokumentation

**Implementierte APIs · Roadmap-Lücken · Geplante APIs (Phase 4c / 6b / 7a)**

Stand: 20. Februar 2026 · Vollständige Beschreibung aller Klassen, Methoden und deren Verwendung

<table>
<colgroup>
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Phase 1</strong></p>
<p>Core &amp; State</p>
<p>6 Klassen · 28 APIs</p></td>
<td><p><strong>Phase 2</strong></p>
<p>Academy Data</p>
<p>1 Klasse · 16 APIs</p></td>
<td><p><strong>Phase 3</strong></p>
<p>DSA5 Bridge</p>
<p>1 Klasse · 12 APIs</p></td>
<td><p><strong>Phase 4 / 4b</strong></p>
<p>Simulation</p>
<p>7 Klassen · 40 APIs</p></td>
<td><p><strong>Phase 5 / 6 / 7</strong></p>
<p>Atmo · UI · AI</p>
<p>3 Klassen · 14 APIs</p></td>
</tr>
</tbody>
</table>

|                                         |
|-----------------------------------------|
| **PHASE 1 ─ CORE & STATE ARCHITECTURE** |

Phase 1 bildet das Fundament von JANUS7. Alle höheren Phasen bauen ausschließlich auf diesen Klassen auf. Kein anderer Code darf den State direkt manipulieren – das muss über den Director oder die jeweilige Engine-Schicht geschehen.

**1.1 JanusStateCore**

|                                                  |
|--------------------------------------------------|
| **Klasse: JanusStateCore · Pfad: core/state.js** |

Zentraler Zustandsspeicher von JANUS7. Implementiert ein Transaktionsmodell mit automatischem Rollback, versionierten Schema-Migrationen und persistenter Speicherung über Foundry-Settings. Alle Engines lesen und schreiben über diese Klasse – niemals direkt über game.settings oder andere globale Objekte.

|                                                                                                                                                                                   |                                                                                        |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| **constructor({ logger })** → JanusStateCore                                                                                                                                      |                                                                                        |
| new JanusStateCore({ logger: JanusLogger })                                                                                                                                       |                                                                                        |
| Erstellt die State-Engine. Setzt den Settings-Key auf 'coreState' (primär) und 'state' (Legacy-Migration). Der interne State ist anfangs null und wird erst durch init() befüllt. |                                                                                        |
| **Parameter**                                                                                                                                                                     | **logger** – JanusLogger? Logger-Instanz für interne Ausgaben. Fallback: console.      |
| **Rückgabe**                                                                                                                                                                      | JanusStateCore                                                                         |
| **Verwendet in**                                                                                                                                                                  | **core/index.js** → this.core.state = new JanusStateCore({ logger: this.core.logger }) |

|                                                                                                                                                                                                                   |                                                                   |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| **init()** → Promise\<void\>                                                                                                                                                                                      |                                                                   |
| async init(): Promise\<void\>                                                                                                                                                                                     |                                                                   |
| Lädt den State aus game.settings (oder legt einen neuen Default-State an) und führt die Schema-Migration durch. Muss vor allen anderen Operationen aufgerufen werden. Feuert danach den Hook 'janus7StateLoaded'. |                                                                   |
| **Rückgabe**                                                                                                                                                                                                      | Promise\<void\>                                                   |
| **Verwendet in**                                                                                                                                                                                                  | **core/index.js** → engine.ready() → await this.core.state.init() |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>get(path)</strong> → any (Deep-Clone für Objekte)</td>
</tr>
<tr class="even">
<td colspan="2">get(path: string = ''): any</td>
</tr>
<tr class="odd">
<td colspan="2">Pfadbasierter Lesezugriff auf den State. Gibt bei leerem Pfad den gesamten State zurück. Gibt für Objekte immer einen Deep-Clone zurück, um das SSOT-Prinzip zu schützen – Mutationen am Rückgabewert haben keinen Effekt auf den internen State.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><strong>path</strong> – string Dot-Notation-Pfad, z.B. 'time.week', 'scoring.circles'. Leer = gesamter State.</td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>any (Deep-Clone für Objekte)</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td><p>• Gibt Deep-Clone zurück – direktes Mutieren des Ergebnisses verändert NICHT den State.</p>
<p>• Primitive Werte (number, string, boolean) werden direkt zurückgegeben.</p></td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/scoring.js</strong> → _ensureScoringRoot() → state.get('scoring')</p>
<p><strong>academy/calendar.js</strong> → advanceSlot() → state.get('time')</p>
<p><strong>atmosphere/controller.js</strong> → status() → state.get('atmosphere.*')</p>
<p><strong>scripts/academy/quests/quest-engine.js</strong> → startQuest() → state.get('academy.quests.*')</p>
<p><strong>ui/commands/quest.js</strong> → Direkte Zugriffe (B-05 Architekturverletzung)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>set(path, value)</strong> → any (neuer Wert)</td>
</tr>
<tr class="even">
<td colspan="2">set(path: string, value: any): any</td>
</tr>
<tr class="odd">
<td colspan="2">Schreibt einen Wert per Dot-Notation-Pfad in den State. Aktualisiert meta.updatedAt, markiert den State als dirty und feuert den Hook 'janus7StateChanged' mit old/new-Value.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>path</strong> – string Dot-Notation-Pfad, z.B. 'time.week'.</p>
<p><strong>value</strong> – any Neuer Wert. Wird unverändert gesetzt (kein Clone).</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>any (neuer Wert)</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/scoring.js</strong> → Innerhalb von transaction(): state.set('scoring', scoring)</p>
<p><strong>academy/calendar.js</strong> → advanceSlot(), advanceDay(): state.set('time', normalized)</p>
<p><strong>academy/social.js</strong> → _updateRelationship(): state.set('actors.relationships', ...)</p>
<p><strong>academy/exams.js</strong> → recordExamResult(): state.set('academy.examResults', ...)</p>
<p><strong>atmosphere/controller.js</strong> → Alle Setter: state.set('atmosphere.*', ...)</p>
<p><strong>scripts/academy/quests/quest-engine.js</strong> → startQuest(), completeQuest(): state.set('academy.quests.*', ...)</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>transaction(mutator)</strong> → Promise&lt;any&gt; (Rückgabewert des mutators)</td>
</tr>
<tr class="even">
<td colspan="2">async transaction(mutator: (state: JanusStateCore) =&gt; any, opts?: {silent?: boolean}): Promise&lt;any&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Führt eine atomare State-Mutation aus. Erstellt vorher einen Snapshot des aktuellen States. Falls der Mutator eine Exception wirft, wird der Snapshot wiederhergestellt (Rollback). Spezial-Exception 'JANUS_TEST_ROLLBACK' rollt ohne Fehlerausgabe zurück.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>mutator</strong> – function(state) Callback-Funktion, die den State mutiert. Erhält die JanusStateCore-Instanz als Argument.</p>
<p><strong>opts.silent</strong> – boolean Unterdrückt Fehler-Logging bei Rollbacks (nützlich für Tests).</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;any&gt; (Rückgabewert des mutators)</td>
</tr>
<tr class="even">
<td><strong>Fehler</strong></td>
<td><strong>Weiterleitung</strong> Alle Exceptions aus dem Mutator werden nach Rollback weitergegeben.</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Wird von allen Engines für State-Mutationen verwendet.</p>
<p>• ACHTUNG: Die atmosphere/controller.js verwendet async-Mutatoren – der Rollback gilt dann nur für synchrone Fehler vor dem ersten await.</p></td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/scoring.js</strong> → addCirclePoints(), addStudentPoints() – atomare Punktevergabe</p>
<p><strong>academy/calendar.js</strong> → advanceSlot(), advanceDay() – Zeitfortschritt</p>
<p><strong>academy/social.js</strong> → _updateRelationship() – Beziehungsänderungen</p>
<p><strong>academy/exams.js</strong> → recordExamResult() – Prüfungsergebnisse</p>
<p><strong>academy/locations-engine.js</strong> → setCurrentLocation() – Ortswechsel</p>
<p><strong>atmosphere/controller.js</strong> → 11× – alle State-Mutationen im Atmosphere-Controller</p>
<p><strong>scripts/academy/quests/quest-engine.js</strong> → startQuest(), progressToNode(), completeQuest()</p>
<p><strong>scripts/academy/events/event-engine.js</strong> → Event-State-Mutationen</p>
<p><strong>scripts/academy/effects/effect-adapter.js</strong> → Effect-Anwendung</p>
<p><strong>core/io.js</strong> → importStateFromObject() – atomarer Import</p>
<p><strong>ui/commands/atmosphere.js</strong> → ARCHITEKTURVERLETZUNG: Direkter Aufruf aus UI-Schicht</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>save({ force })</strong> → Promise&lt;any&gt; (gespeicherter State)</td>
</tr>
<tr class="even">
<td colspan="2">async save({ force?: boolean }): Promise&lt;any&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Persistiert den aktuellen State in game.settings unter dem Key 'coreState'. Respektiert das autoSave-Setting – bei force: true wird immer gespeichert. Feuert den Hook 'janus7StateSaved'. Bei aktiver Test-Unterdrückung (_suppressPersist) ist der Aufruf ein No-Op.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><strong>force</strong> – boolean true = ignoriert autoSave-Flag und dirty-Check. false (default) = nur bei dirty &amp;&amp; autoSave.</td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;any&gt; (gespeicherter State)</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td><p>• Der Director.saveState() ist der bevorzugte Aufrufweg aus der UI-Schicht.</p>
<p>• Direkter Aufruf aus UI ist eine Architekturverletzung.</p></td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/director.js</strong> → saveState() → this.state.save()</p>
<p><strong>scripts/academy/quests/quest-engine.js</strong> → Nach startQuest() und completeQuest(): state.save({ force: false })</p>
<p><strong>atmosphere/controller.js</strong> → setMasterClient(), setMasterVolume(): state.save({ force: true })</p>
<p><strong>ui/commands/atmosphere.js</strong> → ARCHITEKTURVERLETZUNG: Direkter Aufruf</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                                                           |                                                                                                        |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| **replace(newState)** → void                                                                                                                                              |                                                                                                        |
| replace(newState: any): void                                                                                                                                              |                                                                                                        |
| Ersetzt den gesamten State durch ein neues Objekt (Deep-Clone des Parameters). Feuert den Hook 'janus7StateReplaced'. Wird ausschließlich für den State-Import verwendet. |                                                                                                        |
| **Parameter**                                                                                                                                                             | **newState** – object Vollständiger neuer State. Wird deep-cloned um den Eingabeparameter zu schützen. |
| **Rückgabe**                                                                                                                                                              | void                                                                                                   |
| **Verwendet in**                                                                                                                                                          | **core/io.js** → importStateFromObject() → state.replace(candidate)                                    |

|                                                                                                                               |                                                                            |
|-------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| **snapshot()** → object (Deep-Clone des gesamten States)                                                                      |                                                                            |
| snapshot(): object                                                                                                            |                                                                            |
| Alias für get('') – liefert einen Deep-Clone des vollständigen States. Für Rückwärtskompatibilität mit älterem UI-/Test-Code. |                                                                            |
| **Rückgabe**                                                                                                                  | object (Deep-Clone des gesamten States)                                    |
| **Hinweise**                                                                                                                  | • Nicht direkt in produktivem Command-Code verwendet – nur in alten Tests. |
| Nicht aktiv genutzt im Command-Layer                                                                                          |                                                                            |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>migrateState(stateObj?)</strong> → { changed: boolean, state: any }</td>
</tr>
<tr class="even">
<td colspan="2">migrateState(stateObj?: any): { changed: boolean, state: any }</td>
</tr>
<tr class="odd">
<td colspan="2">Führt eine non-destructive Schema-Migration durch: ergänzt fehlende Felder, entfernt Transport-Wrapper, normalisiert null-Werte und aligniert die Modul-Version. Wird automatisch bei load() aufgerufen.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>{ changed: boolean, state: any }</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/state.js</strong> → load() – automatisch beim State-Laden</p>
<p><strong>core/io.js</strong> → importStateFromObject() bei validate:false</p></td>
</tr>
</tbody>
</table>

**1.2 JanusDirector**

|                                                    |
|----------------------------------------------------|
| **Klasse: JanusDirector · Pfad: core/director.js** |

Orchestrierungs-Facade für die UI-Schicht und Makros. Alle Schreiboperationen sind GM-gesichert. UI-Commands sollen ausschließlich über den Director auf den State zugreifen – nie direkt auf core.state.

game.janus7.director oder game.janus7.core.director (beide zeigen auf dieselbe Instanz)

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>get(path, fallback?)</strong> → any</td>
</tr>
<tr class="even">
<td colspan="2">get(path: string, fallback?: any): any</td>
</tr>
<tr class="odd">
<td colspan="2">Proxy auf state.get(). Liest einen Wert aus dem State per Dot-Notation.</td>
</tr>
<tr class="even">
<td colspan="2"><strong>⚠ BUG / ACHTUNG:</strong> B-04: Der fallback-Parameter wird von state.get() ignoriert. Workaround: return this.state.get(path) ?? fallback</td>
</tr>
<tr class="odd">
<td><strong>Parameter</strong></td>
<td><p><strong>path</strong> – string Dot-Notation-Pfad.</p>
<p><strong>fallback</strong> – any Fallback-Wert (wird an state.get() übergeben, dort aber ignoriert – Bug B-04).</p></td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>any</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><strong>ui/commands/time.js</strong> → _director().get() – Lesezugriff in Time-Commands</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>set(path, value, opts?)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async set(path: string, value: any, opts?: { save?: boolean }): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">GM-gesicherter State-Write. Schreibt einen Wert per Pfad und speichert optional.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>path</strong> – string Dot-Notation-Pfad.</p>
<p><strong>value</strong> – any Neuer Wert.</p>
<p><strong>opts.save</strong> – boolean true (default): speichert danach. false: kein automatisches Speichern.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>ui/commands/quest.js</strong> → importQuests(): director.set('academy.quests', questData, { save:true })</p>
<p><strong>ui/commands/state.js</strong> → Indirekt via director-Methoden</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                                                   |                                               |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| **batch(fn, opts?)** → Promise\<any\>                                                                                                                             |                                               |
| async batch(fn: ({ get, set }) =\> any, opts?: { save?: boolean }): Promise\<any\>                                                                                |                                               |
| Führt eine Batch-Mutation via Callback aus. Der Callback erhält { get, set } und kann beliebig viele State-Writes durchführen. Am Ende wird einmalig gespeichert. |                                               |
| **⚠ BUG / ACHTUNG:** B-08: Die set()-Funktion im Callback ist async. Aufrufer müssen await set() verwenden, sonst läuft der Save vor der Mutation durch.          |                                               |
| **Rückgabe**                                                                                                                                                      | Promise\<any\>                                |
| **Hinweise**                                                                                                                                                      | • Im aktuellen Command-Layer nicht verwendet. |
| Nicht aktiv genutzt im Command-Layer                                                                                                                              |                                               |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>saveState(opts?)</strong> → Promise&lt;any&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async saveState(opts?: { force?: boolean }): Promise&lt;any&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Persistiert den State via state.save(). Zentraler Aufrufpunkt für alle UI-Commands.</td>
</tr>
<tr class="even">
<td colspan="2"><strong>⚠ BUG / ACHTUNG:</strong> B-06: Die Parameter 'reason' und 'forceSave' werden still ignoriert. Nur 'force' wird an state.save() weitergegeben.</td>
</tr>
<tr class="odd">
<td><strong>Parameter</strong></td>
<td><strong>opts.force</strong> – boolean true = Speichern erzwingen, autoSave ignorieren.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;any&gt;</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>ui/commands/time.js</strong> → Nach advanceMany() und syncCalendar()</p>
<p><strong>ui/commands/state.js</strong> → saveState command</p>
<p><strong>core/director.js</strong> → Intern von set(), batch(), _advance(), applyMood(), _mutate()</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>exportState()</strong> → object (Deep-Clone des States)</td>
</tr>
<tr class="even">
<td colspan="2">exportState(): object</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt einen Deep-Clone des aktuellen States zurück. GM-gesichert. Delegiert an io.exportState().</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>object (Deep-Clone des States)</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>ui/commands/state.js</strong> → exportState, copyState, validateState, exportJson</p>
<p><strong>ui/commands/system.js</strong> → Diagnostics-Snapshot</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>importState(snapshot, opts?)</strong> → Promise&lt;boolean&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async importState(snapshot: object, opts?: { validate?: boolean, mode?: 'strict'|'lenient', save?: boolean, force?: boolean }): Promise&lt;boolean&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Importiert einen State-Snapshot. Lenient-Mode (Standard): keine Schema-Validierung, alte/partielle States werden akzeptiert. Strict-Mode: Schema-Validierung vor Import.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>snapshot</strong> – object State-Objekt. Muss zumindest die Pflicht-Felder enthalten.</p>
<p><strong>opts.validate</strong> – boolean true = Schema-Validierung vor Import. Default abhängig von mode.</p>
<p><strong>opts.mode</strong> – 'lenient'|'strict' lenient (default): Validierung deaktiviert. strict: Validierung aktiv.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;boolean&gt;</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>ui/commands/state.js</strong> → importState command – mit { validate: !!validate, force: true }</p>
<p><strong>ui/commands/system.js</strong> → importStateFromJson – mit { validate: false, save: true, force: true }</p></td>
</tr>
</tbody>
</table>

|                                                                                                          |                                                                               |
|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| **validateState(snapshot?)** → { valid: boolean, errors: string\[\] }                                    |                                                                               |
| validateState(snapshot?: object, opts?: {}): { valid: boolean, errors: string\[\] }                      |                                                                               |
| Validiert einen State-Snapshot gegen das STATE_SCHEMA. Ohne Parameter wird der aktuelle State validiert. |                                                                               |
| **Rückgabe**                                                                                             | { valid: boolean, errors: string\[\] }                                        |
| **Verwendet in**                                                                                         | **ui/commands/state.js** → validateState command – gibt Ergebnis an UI zurück |

**Director-Facades für Domain-Operationen**

Der Director bietet Facade-Objekte für die wichtigsten Domains. Diese delegieren intern an die jeweiligen Engine-Instanzen:

|                                                                                                                   |                                                           |
|-------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **director.time.advanceSlot(opts?)** → Promise\<SlotRef\>                                                         |                                                           |
| director.time.advanceSlot(opts?: { save?: boolean }): Promise\<SlotRef\>                                          |                                                           |
| Rückt die Akademie-Zeit um einen Slot vor. Delegiert an CalendarEngine.advanceSlot(). Feuert 'janus7DateChanged'. |                                                           |
| **Rückgabe**                                                                                                      | Promise\<SlotRef\>                                        |
| **Verwendet in**                                                                                                  | **ui/commands/time.js** → \_advanceMany('advanceSlot', n) |

|                                                                          |                                                          |
|--------------------------------------------------------------------------|----------------------------------------------------------|
| **director.time.advanceDay(opts?)** → Promise\<SlotRef\>                 |                                                          |
| director.time.advanceDay(opts?: { save?: boolean }): Promise\<SlotRef\>  |                                                          |
| Rückt um einen vollen Tag vor. Delegiert an CalendarEngine.advanceDay(). |                                                          |
| **Rückgabe**                                                             | Promise\<SlotRef\>                                       |
| **Verwendet in**                                                         | **ui/commands/time.js** → \_advanceMany('advanceDay', n) |

|                                                                           |                                                            |
|---------------------------------------------------------------------------|------------------------------------------------------------|
| **director.time.advancePhase(opts?)** → Promise\<SlotRef\>                |                                                            |
| director.time.advancePhase(opts?: { save?: boolean }): Promise\<SlotRef\> |                                                            |
| Legacy-Alias für advanceSlot(). 'Phase' = Slot im Phase-6-Modell.         |                                                            |
| **Rückgabe**                                                              | Promise\<SlotRef\>                                         |
| **Verwendet in**                                                          | **ui/commands/time.js** → \_advanceMany('advancePhase', n) |

|                                                                                       |                                           |
|---------------------------------------------------------------------------------------|-------------------------------------------|
| **director.time.setSlot(dayIndex, slotIndex, opts?)** → Promise\<SlotRef\>            |                                           |
| director.time.setSlot(dayIndex: number, slotIndex: number, opts?): Promise\<SlotRef\> |                                           |
| Setzt die Zeit direkt auf einen bestimmten Tag- und Slot-Index.                       |                                           |
| **Rückgabe**                                                                          | Promise\<SlotRef\>                        |
| **Verwendet in**                                                                      | **ui/commands/time.js** → setSlot command |

|                                                             |                                                 |
|-------------------------------------------------------------|-------------------------------------------------|
| **director.time.resetCalendar(opts?)** → Promise\<SlotRef\> |                                                 |
| director.time.resetCalendar(opts?): Promise\<SlotRef\>      |                                                 |
| Setzt den Kalender auf Woche 1, Tag 1, Slot 0 zurück.       |                                                 |
| **Rückgabe**                                                | Promise\<SlotRef\>                              |
| **Verwendet in**                                            | **ui/commands/time.js** → resetCalendar command |

|                                                                                                               |                                                             |
|---------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| **director.scoring.addCirclePoints(circleId, amount, reason, opts?)** → Promise\<number\> (neuer Punktestand) |                                                             |
| director.scoring.addCirclePoints(circleId, amount, reason, opts?): Promise\<number\>                          |                                                             |
| Addiert Punkte für einen Zirkel. Delegiert an ScoringEngine.addCirclePoints().                                |                                                             |
| **Rückgabe**                                                                                                  | Promise\<number\> (neuer Punktestand)                       |
| **Hinweise**                                                                                                  | • Im Command-Layer nicht direkt aufgerufen – nur via Tests. |
| **Verwendet in**                                                                                              | **Test-Suite** → Phase-4 Director-Tests                     |

|                                                                           |                                         |
|---------------------------------------------------------------------------|-----------------------------------------|
| **director.social.setAttitude(from, to, value, opts?)** → Promise\<void\> |                                         |
| director.social.setAttitude(fromId, toId, value, opts?): Promise\<void\>  |                                         |
| Setzt die Social-Relationship auf einen absoluten Wert.                   |                                         |
| **Rückgabe**                                                              | Promise\<void\>                         |
| **Verwendet in**                                                          | **Test-Suite** → Phase-4 Director-Tests |

**1.3 JanusIO**

|                                        |
|----------------------------------------|
| **Klasse: JanusIO · Pfad: core/io.js** |

Import/Export-Layer für State-Serialisierung. Kapselt JSON-Parsing und Schema-Validierung vor dem Import.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>exportState()</strong> → object (Deep-Clone)</td>
</tr>
<tr class="even">
<td colspan="2">exportState(): object</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt einen Deep-Clone des gesamten States zurück. Wird von Director.exportState() aufgerufen.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>object (Deep-Clone)</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/director.js</strong> → exportState()</p>
<p><strong>core/io.js</strong> → exportStateAsJSON() ruft dies auf</p></td>
</tr>
</tbody>
</table>

|                                                                                       |                                                           |
|---------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **exportStateAsJSON(pretty?)** → string (JSON)                                        |                                                           |
| exportStateAsJSON(pretty?: boolean): string                                           |                                                           |
| Gibt den State als JSON-String zurück. pretty=true (default) für formatierte Ausgabe. |                                                           |
| **Rückgabe**                                                                          | string (JSON)                                             |
| **Hinweise**                                                                          | • Im Command-Layer nicht direkt verwendet (nur in Tests). |
| Nicht aktiv genutzt im Command-Layer                                                  |                                                           |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>importStateFromObject(obj, opts?)</strong> → Promise&lt;boolean&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async importStateFromObject(obj: object, opts?: { save?, validate?, silentValidation? }): Promise&lt;boolean&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Importiert ein Objekt als neuen State. Validiert optional gegen STATE_SCHEMA, erstellt Deep-Clone, führt optionale Migration durch und ersetzt den State via transaction(). Nur GM darf importieren.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>obj</strong> – object State-Objekt. Darf partial sein wenn validate=false.</p>
<p><strong>opts.save</strong> – boolean true (default): speichert nach Import.</p>
<p><strong>opts.validate</strong> – boolean true (default): Schema-Validierung vor Import.</p>
<p><strong>opts.silentValidation</strong> – boolean Unterdrückt Warn-Log bei Validierungsfehlern.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;boolean&gt;</td>
</tr>
<tr class="even">
<td><strong>Fehler</strong></td>
<td><p><strong>JanusStateError</strong> Bei ungültigem Objekt oder fehlenden GM-Rechten.</p>
<p><strong>JanusValidationError</strong> Bei Schema-Validierungsfehler (wenn validate=true).</p></td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><strong>core/director.js</strong> → importState() → this.io.importStateFromObject()</td>
</tr>
</tbody>
</table>

|                                                                    |                                            |
|--------------------------------------------------------------------|--------------------------------------------|
| **importStateFromJSON(json, opts?)** → Promise\<boolean\>          |                                            |
| async importStateFromJSON(json: string, opts?): Promise\<boolean\> |                                            |
| Parst einen JSON-String und delegiert an importStateFromObject().  |                                            |
| **Rückgabe**                                                       | Promise\<boolean\>                         |
| **Hinweise**                                                       | • Im Command-Layer nicht direkt verwendet. |
| Nicht aktiv genutzt im Command-Layer                               |                                            |

**1.4 JanusLogger**

|                                                |
|------------------------------------------------|
| **Klasse: JanusLogger · Pfad: core/logger.js** |

Level-basierter Logger mit optionalem Scoping. Alle Engine-Klassen halten eine Logger-Referenz unter this.logger. Unterstützt 5 Log-Level: debug, info, warn, error, fatal.

|                                                                                                                                                                         |                                                                        |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **debug/info/warn/error/fatal(...args)** → void                                                                                                                         |                                                                        |
| debug(...args), info(...args), warn(...args), error(...args), fatal(...args): void                                                                                      |                                                                        |
| Gibt eine Log-Nachricht auf der entsprechenden Konsolen-Ebene aus. Ignoriert Aufrufe unterhalb des eingestellten Log-Levels. Format: \[PREFIX\] \[LEVEL\] arg1 arg2 ... |                                                                        |
| **Rückgabe**                                                                                                                                                            | void                                                                   |
| **Verwendet in**                                                                                                                                                        | **Alle Engine-Klassen** → 183 Logger-Aufrufe in der gesamten Codebasis |

|                                                                                                 |                                                                       |
|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **child(scope)** → JanusLogger                                                                  |                                                                       |
| child(scope: string): JanusLogger                                                               |                                                                       |
| Erstellt einen Kind-Logger mit erweitertem Prefix (PREFIX:scope). Erbt den aktuellen Log-Level. |                                                                       |
| **Parameter**                                                                                   | **scope** – string Unterbereich, z.B. 'director', 'calendar'.         |
| **Rückgabe**                                                                                    | JanusLogger                                                           |
| **Verwendet in**                                                                                | **core/director.js** → this.logger = core.logger?.child?.('director') |

|                                                                        |                                                                   |
|------------------------------------------------------------------------|-------------------------------------------------------------------|
| **setLevel(level)** → void                                             |                                                                   |
| setLevel(level: 'debug'\|'info'\|'warn'\|'error'\|'fatal'): void       |                                                                   |
| Setzt den minimalen Log-Level. Nachrichten unterhalb werden ignoriert. |                                                                   |
| **Rückgabe**                                                           | void                                                              |
| **Verwendet in**                                                       | **core/config.js** → applyToLogger(): logger.setLevel(debugLevel) |

**1.5 JanusConfig**

|                                                         |
|---------------------------------------------------------|
| **Klasse: JanusConfig (static) · Pfad: core/config.js** |

Statische Wrapper-Klasse für alle JANUS7-Settings. Alle Settings-Zugriffe sollen über diese Klasse laufen, nicht direkt über game.settings.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>JanusConfig.get(key)</strong> → any</td>
</tr>
<tr class="even">
<td colspan="2">static get(key: string): any</td>
</tr>
<tr class="odd">
<td colspan="2">Liest einen Setting-Wert. Äquivalent zu game.settings.get('janus7', key).</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>any</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/state.js</strong> → save() → JanusConfig.get('autoSave')</p>
<p><strong>core/index.js</strong> → JanusConfig.get('enableUI'), JanusConfig.get('debugLevel')</p>
<p><strong>core/director.js</strong> → isSubsystemEnabled()-Checks</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                                                                                  |                                                                  |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| **JanusConfig.registerSettings()** → void                                                                                                                                                        |                                                                  |
| static registerSettings(): void                                                                                                                                                                  |                                                                  |
| Registriert alle JANUS7-Settings in Foundry (debugLevel, autoSave, enableUI, enableSimulation, enableAtmosphere, enableQuestSystem, slotResolverMaxLessons, uiHighContrast, sceneMappings u.a.). |                                                                  |
| **Rückgabe**                                                                                                                                                                                     | void                                                             |
| **Verwendet in**                                                                                                                                                                                 | **core/index.js** → engine.init() – als erstes vor allem anderen |

|                                                                                           |                                                            |
|-------------------------------------------------------------------------------------------|------------------------------------------------------------|
| **JanusConfig.isSubsystemEnabled(subsystem)** → boolean                                   |                                                            |
| static isSubsystemEnabled(subsystem: 'simulation'\|'atmosphere'\|'ui'\|'quests'): boolean |                                                            |
| Prüft ob ein Subsystem aktiviert ist. Liest die entsprechenden enable\*-Settings.         |                                                            |
| **Rückgabe**                                                                              | boolean                                                    |
| **Verwendet in**                                                                          | **core/director.js** → Guard-Checks vor Domain-Operationen |

**1.6 JanusValidator**

|                                                      |
|------------------------------------------------------|
| **Klasse: JanusValidator · Pfad: core/validator.js** |

Schema-Validator für State und Academy-Daten. Whitelist-basiert – unbekannte Keys werden abgelehnt. Kein vollständiger JSON-Schema-Validator, aber für JANUS7-Zwecke ausreichend.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>validateState(json)</strong> → { valid: boolean, errors: string[] }</td>
</tr>
<tr class="even">
<td colspan="2">validateState(json: any): { valid: boolean, errors: string[] }</td>
</tr>
<tr class="odd">
<td colspan="2">Validiert ein Objekt gegen das STATE_SCHEMA. Prüft Typen, Pflichtfelder, additionalProperties. Gibt { valid: false, errors: [...] } bei Validierungsfehlern zurück.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>{ valid: boolean, errors: string[] }</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/director.js</strong> → validateState()</p>
<p><strong>core/io.js</strong> → importStateFromObject() bei validate:true</p></td>
</tr>
</tbody>
</table>

|                                                                                         |                                                       |
|-----------------------------------------------------------------------------------------|-------------------------------------------------------|
| **validate(key, data)** → { valid: boolean, errors: string\[\] }                        |                                                       |
| validate(key: string, data: any): { valid: boolean, errors: string\[\] }                |                                                       |
| Validiert Daten gegen ein registriertes Schema per Key ('state', 'lesson', 'npc', ...). |                                                       |
| **Rückgabe**                                                                            | { valid: boolean, errors: string\[\] }                |
| **Verwendet in**                                                                        | **academy/data-api.js** → JSON-Validierung beim Laden |

|                                                                                                 |                                                                        |
|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **assertSchema(data, schema, label?)** → void                                                   |                                                                        |
| assertSchema(data: any, schema: object, label?: string): void                                   |                                                                        |
| Wie validateSchema, wirft aber bei Fehlern eine JanusValidationError statt false zurückzugeben. |                                                                        |
| **Rückgabe**                                                                                    | void                                                                   |
| **Verwendet in**                                                                                | **academy/data-api.js** → Harte Validierung kritischer Datenstrukturen |

|                                |
|--------------------------------|
| **PHASE 2 ─ ACADEMY DATA API** |

Phase 2 kapselt alle statischen JSON-Daten der Akademie (Lektionen, NPCs, Kalender, Orte, Events). Einzige SSOT für statische Inhalte – kein anderer Code liest die JSON-Dateien direkt.

**2.1 AcademyDataApi**

|                                                        |
|--------------------------------------------------------|
| **Klasse: AcademyDataApi · Pfad: academy/data-api.js** |

game.janus7.academy.data

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>init()</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async init(): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Lädt alle Akademie-Daten parallel über Promise.all(): lessons.json, npcs.json, calendar.json, locations.json, events.json. Optional: event-index.json, calendar-template.json. Alle Daten werden in einem Modul-Level-Cache gehalten.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• ACHTUNG: cache: 'no-store' auf allen Fetches – statische Daten werden beim Reload immer neu geladen.</p>
<p>• Verwendet fetch() – läuft im Browser, nicht in Node.js.</p></td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><strong>core/index.js</strong> → engine.ready() → await this.academy.data.init()</td>
</tr>
</tbody>
</table>

|                                                                    |                                                        |
|--------------------------------------------------------------------|--------------------------------------------------------|
| **getLessons()** → ReadonlyArray\<Lesson\>                         |                                                        |
| getLessons(): ReadonlyArray\<any\>                                 |                                                        |
| Gibt alle geladenen Lektionen als Array zurück (aus lessons.json). |                                                        |
| **Rückgabe**                                                       | ReadonlyArray\<Lesson\>                                |
| **Verwendet in**                                                   | **academy/lessons.js** → Lektions-Suche und -Filterung |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>getLesson(id)</strong> → Lesson | null</td>
</tr>
<tr class="even">
<td colspan="2">getLesson(id: string): Lesson | null</td>
</tr>
<tr class="odd">
<td colspan="2">Sucht eine Lektion per ID. Case-sensitive.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Lesson | null</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/lessons.js</strong> → getLesson(), getLessonsForSlot()</p>
<p><strong>ui/commands/academy.js</strong> → academy.data.getLesson(id)</p></td>
</tr>
</tbody>
</table>

|                                                            |                                                                                      |
|------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **listLessonIds(limit?)** → string\[\]                     |                                                                                      |
| listLessonIds(limit?: number = 50): string\[\]             |                                                                                      |
| Gibt die ersten N Lektion-IDs zurück (begrenzt auf limit). |                                                                                      |
| **Rückgabe**                                               | string\[\]                                                                           |
| **Verwendet in**                                           | **ui/commands/academy.js** → listLessons command → academy.data.listLessonIds(limit) |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>getNpcs() / getNpc(id)</strong> → NPC[] | NPC | null</td>
</tr>
<tr class="even">
<td colspan="2">getNpcs(): ReadonlyArray&lt;NPC&gt; / getNpc(id: string): NPC | null</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt alle NPCs (aus npcs.json) oder einen einzelnen NPC per ID zurück.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>NPC[] | NPC | null</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/lessons.js</strong> → getLessonContext() – Teacher-NPC laden</p>
<p><strong>bridge/dsa5/actors.js</strong> → resolveFromAcademyNpcId()</p></td>
</tr>
</tbody>
</table>

|                                                            |                                               |
|------------------------------------------------------------|-----------------------------------------------|
| **loadNpcs()** → Promise\<NPC\[\]\>                        |                                               |
| async loadNpcs(): Promise\<NPC\[\]\>                       |                                               |
| Gibt die gecachten NPC-Daten zurück (kein erneuter Fetch). |                                               |
| **Rückgabe**                                               | Promise\<NPC\[\]\>                            |
| **Verwendet in**                                           | **ui/commands/academy.js** → listNpcs command |

|                                                                                       |                                                              |
|---------------------------------------------------------------------------------------|--------------------------------------------------------------|
| **getLocations() / getLocation(id)** → Location\[\] \| Location \| null               |                                                              |
| getLocations(): ReadonlyArray\<Location\> / getLocation(id: string): Location \| null |                                                              |
| Gibt alle Orte (aus locations.json) oder einen einzelnen Ort per ID zurück.           |                                                              |
| **Rückgabe**                                                                          | Location\[\] \| Location \| null                             |
| **Verwendet in**                                                                      | **academy/lessons.js** → getLessonContext() – Location laden |

|                                                |                                                    |
|------------------------------------------------|----------------------------------------------------|
| **loadLocations()** → Promise\<Location\[\]\>  |                                                    |
| async loadLocations(): Promise\<Location\[\]\> |                                                    |
| Gibt die gecachten Orts-Daten zurück.          |                                                    |
| **Rückgabe**                                   | Promise\<Location\[\]\>                            |
| **Verwendet in**                               | **ui/commands/academy.js** → listLocations command |

|                                                                                 |                                                 |
|---------------------------------------------------------------------------------|-------------------------------------------------|
| **loadSpellIndex()** → Promise\<any\>                                           |                                                 |
| async loadSpellIndex(): Promise\<any\>                                          |                                                 |
| Lädt/cached den Zauberlehrplan-Index (spells/\*.json oder Compendium-Referenz). |                                                 |
| **Rückgabe**                                                                    | Promise\<any\>                                  |
| **Verwendet in**                                                                | **ui/commands/academy.js** → listSpells command |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>getCalendarEntries() / findCalendarEntries(query)</strong> → Entry[] (alle) | Entry[] (gefiltert)</td>
</tr>
<tr class="even">
<td colspan="2">getCalendarEntries(): ReadonlyArray&lt;Entry&gt; / findCalendarEntries(query: {}): Entry[]</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt alle Kalendereinträge zurück oder filtert nach year/trimester/week/day. Wird von CalendarEngine für Slot-Lookups verwendet.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Entry[] (alle) | Entry[] (gefiltert)</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/calendar.js</strong> → getCalendarEntriesForDay()</p>
<p><strong>academy/lessons.js</strong> → getLessonsForSlot() – Kalender-Einträge filtern</p>
<p><strong>academy/exams.js</strong> → getExamsForSlot() – Kalender-Einträge filtern</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                                                                                    |                                                                                                     |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| **getContentRegistry(opts?)** → Promise\<ContentRegistry\>                                                                                                                                         |                                                                                                     |
| async getContentRegistry(opts?: {}): Promise\<ContentRegistry\>                                                                                                                                    |                                                                                                     |
| Lädt/cached die vollständige Content-Registry (Quests, Events, Effects aus scripts/academy/content/). Wird von quest-system-integration.js aufgerufen und als engine.academy.data.content gesetzt. |                                                                                                     |
| **Rückgabe**                                                                                                                                                                                       | Promise\<ContentRegistry\>                                                                          |
| **Verwendet in**                                                                                                                                                                                   | **scripts/integration/quest-system-integration.js** → engine.academy.data.content = contentRegistry |

|                                  |
|----------------------------------|
| **PHASE 3 ─ DSA5 SYSTEM BRIDGE** |

Phase 3 kapselt alle Zugriffe auf das DSA5-System in Foundry. Kein anderer Code soll DSA5-interne APIs direkt aufrufen. Die Bridge erkennt automatisch Capabilities (Skill-Rolls, Magie, Kampf) und liefert saubere Fehlermeldungen bei fehlenden Features.

game.janus7.bridge.dsa5 (Alias: game.janus7.dsa5)

**3.1 DSA5SystemBridge**

|                                                           |
|-----------------------------------------------------------|
| **Klasse: DSA5SystemBridge · Pfad: bridge/dsa5/index.js** |

|                                                                                                                                                                                                                                              |                                                                    |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| **init()** → Promise\<void\>                                                                                                                                                                                                                 |                                                                    |
| async init(): Promise\<void\>                                                                                                                                                                                                                |                                                                    |
| Erkennt alle verfügbaren DSA5-Capabilities (setupSkill, basicTest, setupCharacteristic, setupSpell, setupWeapon) und schreibt das Ergebnis in this.capabilities. Kein Fehler bei fehlendem DSA5 – nur Capabilities werden auf false gesetzt. |                                                                    |
| **Rückgabe**                                                                                                                                                                                                                                 | Promise\<void\>                                                    |
| **Verwendet in**                                                                                                                                                                                                                             | **core/index.js** → engine.ready() → await this.bridge.dsa5.init() |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>hasCapability(key)</strong> → boolean</td>
</tr>
<tr class="even">
<td colspan="2">hasCapability(key: string): boolean</td>
</tr>
<tr class="odd">
<td colspan="2">Prüft ob eine Capability aktiv ist. Sichere Alternative zu direktem Capabilities-Objektzugriff.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><strong>key</strong> – z.B. 'hasSetupSkill', 'hasBasicTest', 'systemAvailable', 'hasConfigDSA5'</td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>boolean</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>bridge/dsa5/</strong> → Intern vor jedem Roll-Aufruf</p>
<p><strong>Test-Suite</strong> → Capability-Tests</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>rollSkill(actorRef, skillRef, options?)</strong> → Promise&lt;RollResult&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async rollSkill(actorRef: Actor|string, skillRef: Item|string, options?: RollOptions): Promise&lt;RollResult&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Führt einen Talentwürfel für einen Actor aus. Sucht das Skill-Item zuerst embedded auf dem Actor, dann im Compendium. Delegiert intern an requestSkillCheck(). Unterstützt Modifier, Erschwernis/Erleichterung.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>actorRef</strong> – Actor|string Actor-Instanz, UUID oder Name.</p>
<p><strong>skillRef</strong> – Item|string Skill-Item, UUID oder Name des Talents.</p>
<p><strong>options.modifier</strong> – number Modifikator auf den Würfelwurf.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;RollResult&gt;</td>
</tr>
<tr class="even">
<td><strong>Fehler</strong></td>
<td><strong>DSA5NotAvailableError</strong> Wenn DSA5-System nicht verfügbar oder Capabilities fehlen.</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><strong>ui/commands/system.js</strong> → bridgeRollTest command: dsa5.rollSkill(actor, skill)</td>
</tr>
</tbody>
</table>

|                                                                                                                             |                                            |
|-----------------------------------------------------------------------------------------------------------------------------|--------------------------------------------|
| **requestSkillCheck(args)** → Promise\<RollResult\>                                                                         |                                            |
| async requestSkillCheck(args: { actorRef, skillRef, options? }): Promise\<RollResult\>                                      |                                            |
| Niedrigere API als rollSkill – keine Name-Auflösung, kein Compendium-Lookup. Direkte Weiterleitung an das DSA5-Roll-System. |                                            |
| **Rückgabe**                                                                                                                | Promise\<RollResult\>                      |
| **Hinweise**                                                                                                                | • Im Command-Layer nicht direkt verwendet. |
| Nicht aktiv genutzt im Command-Layer                                                                                        |                                            |

|                                                              |                                            |
|--------------------------------------------------------------|--------------------------------------------|
| **requestAttributeCheck(args)** → Promise\<RollResult\>      |                                            |
| async requestAttributeCheck(args: {}): Promise\<RollResult\> |                                            |
| Eigenschaftsprobe (Mut, Klugheit, etc.) via DSA5-basicTest.  |                                            |
| **Rückgabe**                                                 | Promise\<RollResult\>                      |
| **Hinweise**                                                 | • Im Command-Layer nicht direkt verwendet. |
| Nicht aktiv genutzt im Command-Layer                         |                                            |

|                                                         |                                            |
|---------------------------------------------------------|--------------------------------------------|
| **requestSpellCast(args)** → Promise\<RollResult\>      |                                            |
| async requestSpellCast(args: {}): Promise\<RollResult\> |                                            |
| Zauberwürfel via DSA5-setupSpell + basicTest.           |                                            |
| **Rückgabe**                                            | Promise\<RollResult\>                      |
| **Hinweise**                                            | • Im Command-Layer nicht direkt verwendet. |
| Nicht aktiv genutzt im Command-Layer                    |                                            |

|                                                      |                                            |
|------------------------------------------------------|--------------------------------------------|
| **requestAttack(args)** → Promise\<RollResult\>      |                                            |
| async requestAttack(args: {}): Promise\<RollResult\> |                                            |
| Angriffswürfel via DSA5-setupWeapon + basicTest.     |                                            |
| **Rückgabe**                                         | Promise\<RollResult\>                      |
| **Hinweise**                                         | • Im Command-Layer nicht direkt verwendet. |
| Nicht aktiv genutzt im Command-Layer                 |                                            |

|                                                                                                                                                             |                                                  |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|
| **wrapActor(actorRef)** → Promise\<JanusActorWrapper\>                                                                                                      |                                                  |
| async wrapActor(actorRef: Actor\|string): Promise\<JanusActorWrapper\>                                                                                      |                                                  |
| Gibt einen sicheren Wrapper um einen DSA5-Actor zurück. Der Wrapper exponiert standardisierte Felder (name, attributes, skills) ohne direkte DSA5-Internas. |                                                  |
| **Rückgabe**                                                                                                                                                | Promise\<JanusActorWrapper\>                     |
| **Verwendet in**                                                                                                                                            | **bridge/dsa5/rolls.js** → Intern bei jedem Roll |

|                                                                                                     |                                                           |
|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **resolveActor(ref)** → Promise\<Actor\>                                                            |                                                           |
| async resolveActor(ref: Actor\|string): Promise\<Actor\>                                            |                                                           |
| Löst einen Actor aus UUID, Name oder direkter Instanz auf. Cached Ergebnis für wiederholte Aufrufe. |                                                           |
| **Rückgabe**                                                                                        | Promise\<Actor\>                                          |
| **Verwendet in**                                                                                    | **bridge/dsa5/** → Intern bei rollSkill() und wrapActor() |

|                                                                                                                                            |                                              |
|--------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| **getActorSpells(actorRef, options?)** → Promise\<Item\[\]\> (sortiert, dedupliziert)                                                      |                                              |
| async getActorSpells(actorRef: Actor\|string, options?: { source?, learnedOnly? }): Promise\<Item\[\]\>                                    |                                              |
| Gibt alle Zauber-Items eines Actors zurück. Filtert nach Typ 'spell', optional nur erlernte. Ergebnis ist alphabetisch sortiert (deutsch). |                                              |
| **Rückgabe**                                                                                                                               | Promise\<Item\[\]\> (sortiert, dedupliziert) |
| **Verwendet in**                                                                                                                           | **bridge/dsa5/** → Intern für Spell-Listen   |

|                                                                                           |                                                       |
|-------------------------------------------------------------------------------------------|-------------------------------------------------------|
| **resolveAcademyNpcActor(npcId)** → Promise\<Actor\|null\>                                |                                                       |
| async resolveAcademyNpcActor(npcId: string): Promise\<Actor\|null\>                       |                                                       |
| Sucht den Foundry-Actor zu einem JANUS7-NPC (npcs.json) per actorUUID oder Name-Matching. |                                                       |
| **Rückgabe**                                                                              | Promise\<Actor\|null\>                                |
| **Verwendet in**                                                                          | **bridge/dsa5/actors.js** → resolveFromAcademyNpcId() |

|                                                                                               |                                                 |
|-----------------------------------------------------------------------------------------------|-------------------------------------------------|
| **ensureSpellOnActor(params)** → Promise\<boolean\>                                           |                                                 |
| async ensureSpellOnActor(params: {}): Promise\<boolean\>                                      |                                                 |
| Stellt sicher, dass ein bestimmter Zauber auf einem Actor vorhanden ist. Fügt ihn ggf. hinzu. |                                                 |
| **Rückgabe**                                                                                  | Promise\<boolean\>                              |
| **Verwendet in**                                                                              | **bridge/dsa5/items.js** → Quest-/Effect-System |

|                                          |
|------------------------------------------|
| **PHASE 4 ─ ACADEMY SIMULATION ENGINES** |

Phase 4 implementiert die Akademie-Logik: Kalender, Lektionen, Prüfungen, Punkte, Soziales und Orte. Alle Engines hängen unter game.janus7.academy.\* (Alias: game.janus7.simulation.\*).

**4.1 JanusCalendarEngine**

|                                                             |
|-------------------------------------------------------------|
| **Klasse: JanusCalendarEngine · Pfad: academy/calendar.js** |

game.janus7.academy.calendar

Verwaltet das Akademie-Zeitmodell: 7-Tage-Woche (aventurische Tagesnamen), 10-Slot-Tag, 12-Wochen-Trimester, 3-Trimester-Jahr. Hält Synchronisation mit Foundry-worldTime optional aufrecht.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>getCurrentSlotRef()</strong> → SlotRef { year, trimester, week, day, phase, dayIndex, slotIndex }</td>
</tr>
<tr class="even">
<td colspan="2">getCurrentSlotRef(): SlotRef</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt den aktuellen Zeitreferenz-Snapshot zurück. Liest aus dem State und normalisiert Indices zu Tagesnamen. Nicht-mutierend.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>SlotRef { year, trimester, week, day, phase, dayIndex, slotIndex }</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/director.js</strong> → director.time.getRef()</p>
<p><strong>academy/lessons.js</strong> → getLessonsForCurrentSlot()</p>
<p><strong>academy/exams.js</strong> → getExamsForCurrentSlot()</p>
<p><strong>core/index.js</strong> → getAiContext() – Zeitangabe im AI-Kontext</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                                                                          |                                                                               |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| **advanceSlot({ steps? })** → Promise\<SlotRef\> (neuer Zeitpunkt)                                                                                                                       |                                                                               |
| async advanceSlot({ steps?: number = 1 }): Promise\<SlotRef\>                                                                                                                            |                                                                               |
| Rückt um N Slots vor. Berechnet Rollover (Tag → Woche → Trimester → Jahr). Pflegt totalDaysPassed und isHoliday. Feuert 'janus7DateChanged'. Optional: synchronisiert Foundry-worldTime. |                                                                               |
| **Parameter**                                                                                                                                                                            | **steps** – number Anzahl Slots. Kann negativ sein (rückwärts). Default: 1.   |
| **Rückgabe**                                                                                                                                                                             | Promise\<SlotRef\> (neuer Zeitpunkt)                                          |
| **Verwendet in**                                                                                                                                                                         | **core/director.js** → director.time.advanceSlot() → \_advance('advanceSlot') |

|                                                                 |                                                     |
|-----------------------------------------------------------------|-----------------------------------------------------|
| **advancePhase({ steps? })** → Promise\<SlotRef\>               |                                                     |
| async advancePhase({ steps?: number = 1 }): Promise\<SlotRef\>  |                                                     |
| Legacy-Alias für advanceSlot(). Phase = Slot im Phase-6-Modell. |                                                     |
| **Rückgabe**                                                    | Promise\<SlotRef\>                                  |
| **Verwendet in**                                                | **core/director.js** → director.time.advancePhase() |

|                                                                                       |                                                                                                                |
|---------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| **advanceDay({ days? })** → Promise\<SlotRef\>                                        |                                                                                                                |
| async advanceDay({ days?: number = 1 }): Promise\<SlotRef\>                           |                                                                                                                |
| Rückt um N ganze Tage vor. Slot-Index bleibt unverändert. Feuert 'janus7DateChanged'. |                                                                                                                |
| **Rückgabe**                                                                          | Promise\<SlotRef\>                                                                                             |
| **Hinweise**                                                                          | • ACHTUNG: doppelter \_advanceWorldTime()-Aufruf in der Implementierung (Bug – Foundry-Zeit wird 2× advanced). |
| **Verwendet in**                                                                      | **core/director.js** → director.time.advanceDay()                                                              |

|                                                                                                                                                       |                                                                        |
|-------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **getCalendarEntriesForDay(dayRef)** → CalendarEntry\[\]                                                                                              |                                                                        |
| getCalendarEntriesForDay(dayRef: DayRef): any\[\]                                                                                                     |                                                                        |
| Gibt alle Kalendereinträge für einen Tag (alle Slots) zurück. Fallback auf virtuelle Einträge aus teaching-sessions.json wenn calendar.json leer ist. |                                                                        |
| **Rückgabe**                                                                                                                                          | CalendarEntry\[\]                                                      |
| **Verwendet in**                                                                                                                                      | **academy/lessons.js** → getLessonsForSlot() – Slot-zu-Lektion-Mapping |

|                                                              |                                             |
|--------------------------------------------------------------|---------------------------------------------|
| **getCalendarEntryForCurrentSlot()** → CalendarEntry \| null |                                             |
| getCalendarEntryForCurrentSlot(): CalendarEntry \| null      |                                             |
| Gibt den Kalendereintrag für den aktuellen Slot zurück.      |                                             |
| **Rückgabe**                                                 | CalendarEntry \| null                       |
| **Verwendet in**                                             | **academy/events.js** → Event-Trigger-Logik |

|                                                                             |                                                                                      |
|-----------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **getEventsForCurrentSlot()** → Event\[\]                                   |                                                                                      |
| getEventsForCurrentSlot(): Event\[\]                                        |                                                                                      |
| Gibt alle Events aus events.json zurück, die für den aktuellen Slot gelten. |                                                                                      |
| **Rückgabe**                                                                | Event\[\]                                                                            |
| **Verwendet in**                                                            | **scripts/integration/quest-system-integration.js** → Event-Trigger bei Slot-Wechsel |

|                                                                                                                                                                      |                                                                                               |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| **enableWorldTimeSync({ enabled, slotSeconds? })** → void                                                                                                            |                                                                                               |
| enableWorldTimeSync({ enabled?: boolean, slotSeconds?: number }): void                                                                                               |                                                                                               |
| Aktiviert/deaktiviert die Synchronisation mit Foundry-worldTime. slotSeconds gibt an, wie viele Echtzeitsekunden einem Slot entsprechen (Default: 86400/10 = 8640s). |                                                                                               |
| **Rückgabe**                                                                                                                                                         | void                                                                                          |
| **Verwendet in**                                                                                                                                                     | **scripts/integration/quest-system-integration.js** → Optionale Aktivierung nach Phase-4-Init |

|                                                                                                                               |                                                       |
|-------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|
| **syncFromWorldTime({ force? })** → Promise\<void\>                                                                           |                                                       |
| async syncFromWorldTime({ force?: boolean }): Promise\<void\>                                                                 |                                                       |
| Synchronisiert den JANUS7-Kalender vom aktuellen Foundry-worldTime. Berechnet dayIndex und slotIndex aus game.time.worldTime. |                                                       |
| **Rückgabe**                                                                                                                  | Promise\<void\>                                       |
| **Verwendet in**                                                                                                              | **academy/phase4.js** → updateWorldTime-Hook-Callback |

**4.2 JanusScoringEngine**

|                                                           |
|-----------------------------------------------------------|
| **Klasse: JanusScoringEngine · Pfad: academy/scoring.js** |

game.janus7.academy.scoring

Verwaltet Zirkel-/Hauspunkte und individuelle Schülerpunkte. Hält eine History der letzten 200 Vergaben (automatisch getrimmt).

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>addCirclePoints(circleId, amount, reason, options?)</strong> → Promise&lt;number&gt; (neuer Punktestand)</td>
</tr>
<tr class="even">
<td colspan="2">async addCirclePoints(circleId: string, amount: number, reason: string, options?: AwardOptions): Promise&lt;number&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Addiert Punkte für einen Zirkel/ein Haus. Normalisiert die ID (lowercase, trim). Schreibt History-Eintrag in scoring.lastAwarded. Feuert 'janus7ScoreChanged'.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>circleId</strong> – string ID des Zirkels (wird normalisiert).</p>
<p><strong>amount</strong> – number Delta-Wert (positiv oder negativ). 0 wird ignoriert.</p>
<p><strong>reason</strong> – string Beschreibung der Vergabe (für Logs und History).</p>
<p><strong>options.source</strong> – string 'lesson'|'exam'|'event'|'manual' – Quelle der Vergabe.</p>
<p><strong>options.meta</strong> – any Beliebige Metadaten (z.B. lessonId, examId).</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;number&gt; (neuer Punktestand)</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/director.js</strong> → director.scoring.addCirclePoints()</p>
<p><strong>Test-Suite</strong> → Phase-4 Scoring-Tests</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>addStudentPoints(studentId, amount, reason, options?)</strong> → Promise&lt;number&gt; (neuer Punktestand)</td>
</tr>
<tr class="even">
<td colspan="2">async addStudentPoints(studentId: string, amount: number, reason: string, options?): Promise&lt;number&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Wie addCirclePoints, aber für individuelle Schüler-Punkte.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;number&gt; (neuer Punktestand)</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>core/director.js</strong> → director.scoring.addStudentPoints()</p>
<p><strong>Test-Suite</strong> → Phase-4 Scoring-Tests</p></td>
</tr>
</tbody>
</table>

|                                                      |                                                          |
|------------------------------------------------------|----------------------------------------------------------|
| **getCircleScore(circleId)** → number                |                                                          |
| getCircleScore(circleId: string): number             |                                                          |
| Gibt den aktuellen Punktestand eines Zirkels zurück. |                                                          |
| **Rückgabe**                                         | number                                                   |
| **Verwendet in**                                     | **ui/apps/JanusScoringViewApp.js** → Leaderboard-Anzeige |

|                                                       |                                                      |
|-------------------------------------------------------|------------------------------------------------------|
| **getStudentScore(studentId)** → number               |                                                      |
| getStudentScore(studentId: string): number            |                                                      |
| Gibt den aktuellen Punktestand eines Schülers zurück. |                                                      |
| **Rückgabe**                                          | number                                               |
| **Verwendet in**                                      | **ui/apps/JanusScoringViewApp.js** → Schüler-Ranking |

|                                                                                                  |                                                     |
|--------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| **getLeaderboard({ type?, topN? })** → { id, score }\[\] (absteigend sortiert)                   |                                                     |
| getLeaderboard({ type?: 'circle'\|'student', topN?: number }): { id: string, score: number }\[\] |                                                     |
| Gibt ein Leaderboard für Zirkel oder Schüler zurück, absteigend nach Score sortiert.             |                                                     |
| **Rückgabe**                                                                                     | { id, score }\[\] (absteigend sortiert)             |
| **Verwendet in**                                                                                 | **ui/apps/JanusScoringViewApp.js** → Leaderboard-UI |

|                                                                                                    |                                                                        |
|----------------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| **getCircleScores() / getStudentScores(opts?)** → Array                                            |                                                                        |
| getCircleScores(): { circleId, score }\[\] / getStudentScores({ topN? }): { studentId, score }\[\] |                                                                        |
| Kompatibilitäts-Shims für JanusScoringViewApp. Wrapper um getLeaderboard().                        |                                                                        |
| **Rückgabe**                                                                                       | Array                                                                  |
| **Verwendet in**                                                                                   | **ui/apps/JanusScoringViewApp.js** → Direkter Zugriff für UI-Rendering |

|                                                                      |                                                   |
|----------------------------------------------------------------------|---------------------------------------------------|
| **getLastAwards()** → AwardEntry\[\]                                 |                                                   |
| getLastAwards(): AwardEntry\[\]                                      |                                                   |
| Gibt alle History-Einträge (max. 200) in scoring.lastAwarded zurück. |                                                   |
| **Rückgabe**                                                         | AwardEntry\[\]                                    |
| **Verwendet in**                                                     | **academy/scoring.js** → getAwardLog() nutzt dies |

|                                                                                                                      |                                                           |
|----------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **getAwardLog({ limit? })** → AwardLogEntry\[\] (neueste zuerst, normalisiertes Format)                              |                                                           |
| getAwardLog({ limit?: number = 50 }): AwardLogEntry\[\]                                                              |                                                           |
| Gibt die letzten N Award-History-Einträge normalisiert zurück. Format: { type, target, amount, reason, ts, source }. |                                                           |
| **Rückgabe**                                                                                                         | AwardLogEntry\[\] (neueste zuerst, normalisiertes Format) |
| **Verwendet in**                                                                                                     | **ui/apps/JanusScoringViewApp.js** → Award-Log-Anzeige    |

|                                                                                              |                                                                    |
|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| **applyExamImpact(examDef, examResults?)** → Promise\<void\>                                 |                                                                    |
| async applyExamImpact(examDef: any, examResults?: any): Promise\<void\>                      |                                                                    |
| Wertet scoringImpact aus einer Exam-Definition aus und vergibt Punkte an Zirkel und Schüler. |                                                                    |
| **Rückgabe**                                                                                 | Promise\<void\>                                                    |
| **Verwendet in**                                                                             | **academy/exams.js** → applyScoringImpact() nach Prüfungsabschluss |

**4.3 JanusSocialEngine**

|                                                         |
|---------------------------------------------------------|
| **Klasse: JanusSocialEngine · Pfad: academy/social.js** |

game.janus7.academy.social

|                                                                                      |                                                                |
|--------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **getRelationship(fromId, toId)** → Relationship \| null                             |                                                                |
| getRelationship(fromId: string, toId: string): Relationship \| null                  |                                                                |
| Gibt das vollständige Relationship-Objekt zurück ({ value, tags, meta, updatedAt }). |                                                                |
| **Rückgabe**                                                                         | Relationship \| null                                           |
| **Verwendet in**                                                                     | **academy/social.js** → getAttitude(), listRelationshipsFrom() |

|                                                    |                               |
|----------------------------------------------------|-------------------------------|
| **getAttitude(fromId, toId)** → number (default 0) |                               |
| getAttitude(fromId: string, toId: string): number  |                               |
| Gibt nur den numerischen Attitüden-Wert zurück.    |                               |
| **Rückgabe**                                       | number (default 0)            |
| **Verwendet in**                                   | **Test-Suite** → Social-Tests |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>setAttitude(fromId, toId, value, options?)</strong> → Promise&lt;number&gt; (neuer Wert)</td>
</tr>
<tr class="even">
<td colspan="2">async setAttitude(fromId, toId, value: number, options?): Promise&lt;number&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Setzt die Attitüde von fromId gegenüber toId auf einen absoluten Wert. Feuert 'janus7RelationChanged'.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>fromId / toId</strong> – Actor-UUIDs oder NPC-IDs.</p>
<p><strong>value</strong> – number Neuer Attitüden-Wert (kein Range-Limit definiert).</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;number&gt; (neuer Wert)</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><strong>core/director.js</strong> → director.social.setAttitude() / director.setRelation()</td>
</tr>
</tbody>
</table>

|                                                                                    |                                                                                     |
|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| **adjustAttitude(fromId, toId, delta, options?)** → Promise\<number\> (neuer Wert) |                                                                                     |
| async adjustAttitude(fromId, toId, delta: number, options?): Promise\<number\>     |                                                                                     |
| Addiert delta auf den bestehenden Attitüden-Wert.                                  |                                                                                     |
| **Rückgabe**                                                                       | Promise\<number\> (neuer Wert)                                                      |
| **Verwendet in**                                                                   | **core/director.js** → director.social.adjustAttitude() / director.adjustRelation() |

|                                                                   |                                                          |
|-------------------------------------------------------------------|----------------------------------------------------------|
| **listRelationshipsFrom(fromId)** → Relationship\[\]              |                                                          |
| listRelationshipsFrom(fromId: string): Relationship\[\]           |                                                          |
| Gibt alle Beziehungen zurück, die fromId zu anderen Personen hat. |                                                          |
| **Rückgabe**                                                      | Relationship\[\]                                         |
| **Verwendet in**                                                  | **ui/apps/JanusSocialViewApp.js** → Social-Graph-Anzeige |

|                                                                                            |                                                                |
|--------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **listRelationshipsTo(toId) / listAllRelationships()** → Relationship\[\]                  |                                                                |
| listRelationshipsTo(toId): Relationship\[\] / listAllRelationships(): Relationship\[\]     |                                                                |
| Gibt alle eingehenden Beziehungen zu toId zurück, oder alle Beziehungen im gesamten Graph. |                                                                |
| **Rückgabe**                                                                               | Relationship\[\]                                               |
| **Verwendet in**                                                                           | **ui/apps/JanusSocialViewApp.js** → Vollständiger Social-Graph |

**4.4 JanusLessonsEngine**

|                                                           |
|-----------------------------------------------------------|
| **Klasse: JanusLessonsEngine · Pfad: academy/lessons.js** |

game.janus7.academy.lessons

|                                                                |                                                                     |
|----------------------------------------------------------------|---------------------------------------------------------------------|
| **getLesson(id)** → Lesson \| null                             |                                                                     |
| getLesson(id: string): Lesson \| null                          |                                                                     |
| Gibt eine Lektion per ID zurück (delegiert an AcademyDataApi). |                                                                     |
| **Rückgabe**                                                   | Lesson \| null                                                      |
| **Verwendet in**                                               | **academy/lessons.js** → getLessonsForSlot() – Lektion-Objekt laden |

|                                                     |                                |
|-----------------------------------------------------|--------------------------------|
| **listLessonsByTag(tag)** → Lesson\[\]              |                                |
| listLessonsByTag(tag: string): Lesson\[\]           |                                |
| Filtert Lektionen nach Tag (z.B. 'magie', 'kampf'). |                                |
| **Rückgabe**                                        | Lesson\[\]                     |
| **Verwendet in**                                    | **ui/apps/** → Lektion-Browser |

|                                                          |                                   |
|----------------------------------------------------------|-----------------------------------|
| **listLessonsByTeacher(npcId)** → Lesson\[\]             |                                   |
| listLessonsByTeacher(npcId: string): Lesson\[\]          |                                   |
| Gibt alle Lektionen eines bestimmten Lehrer-NPCs zurück. |                                   |
| **Rückgabe**                                             | Lesson\[\]                        |
| **Verwendet in**                                         | **ui/apps/** → Lehrer-Stundenplan |

|                                                                                                                          |                                                                  |
|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| **getLessonsForSlot(slotRef)** → { calendarEntry, lesson }\[\]                                                           |                                                                  |
| getLessonsForSlot(slotRef: SlotRef): LessonWithContext\[\]                                                               |                                                                  |
| Gibt alle Lektionen für einen bestimmten Slot zurück. Nutzt SlotResolver wenn verfügbar, sonst direktes Kalender-Lookup. |                                                                  |
| **Rückgabe**                                                                                                             | { calendarEntry, lesson }\[\]                                    |
| **Verwendet in**                                                                                                         | **academy/slot-resolver.js** → resolveSlot() – Lektion-Zuordnung |

|                                                        |                                    |
|--------------------------------------------------------|------------------------------------|
| **getLessonsForCurrentSlot()** → LessonWithContext\[\] |                                    |
| getLessonsForCurrentSlot(): LessonWithContext\[\]      |                                    |
| Gibt Lektionen für den aktuellen Kalender-Slot zurück. |                                    |
| **Rückgabe**                                           | LessonWithContext\[\]              |
| **Verwendet in**                                       | **ui/apps/** → Aktueller-Slot-View |

|                                                                                                   |                                                                  |
|---------------------------------------------------------------------------------------------------|------------------------------------------------------------------|
| **getLessonContext(lessonId)** → { lesson, teacher: NPC\|null, location: Location\|null } \| null |                                                                  |
| getLessonContext(lessonId: string): { lesson, teacher, location } \| null                         |                                                                  |
| Gibt eine Lektion mit aufgelöstem Lehrer-NPC und Lernort zurück.                                  |                                                                  |
| **Rückgabe**                                                                                      | { lesson, teacher: NPC\|null, location: Location\|null } \| null |
| **Verwendet in**                                                                                  | **ui/apps/** → Lektion-Detail-Ansicht                            |

**4.5 JanusExamsEngine**

|                                                       |
|-------------------------------------------------------|
| **Klasse: JanusExamsEngine · Pfad: academy/exams.js** |

game.janus7.academy.exams

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>recordExamResult({ actorUuid, examId, status, score, maxScore, meta })</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async recordExamResult({...}): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Speichert ein Prüfungsergebnis in academy.examResults.{actorUuid}.{examId}. Pflegt bestScore und Attempts-Array. Mehrfache Abgaben werden akkumuliert.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>actorUuid + examId</strong> – Pflichtfelder – ohne diese wirft die Methode.</p>
<p><strong>status</strong> – 'not-taken'|'failed'|'passed'|'excellent'</p>
<p><strong>score / maxScore</strong> – Erreichte und maximale Punktzahl.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><strong>academy/exams.js</strong> → recordAndApplyResult() – Convenience-Methode</td>
</tr>
</tbody>
</table>

|                                                                                                                                                                              |                                                 |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| **recordAndApplyResult({ actorUuid, examId, score, maxScore, examDef?, applyScoring? })** → Promise\<{ statusId, label, percent }\>                                          |                                                 |
| async recordAndApplyResult({...}): Promise\<GradingResult\>                                                                                                                  |                                                 |
| Convenience-API: Berechnet Benotung (determineStatusFromScore), speichert Ergebnis und wendet Scoring-Impact an. Einzige notwendige API für vollständigen Prüfungsabschluss. |                                                 |
| **Rückgabe**                                                                                                                                                                 | Promise\<{ statusId, label, percent }\>         |
| **Verwendet in**                                                                                                                                                             | **Test-Suite + Phase-5-UI** → Prüfungsabschluss |

|                                                                                                                                                  |                                                      |
|--------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|
| **determineStatusFromScore({ score, maxScore, examDef? })** → { statusId: string, label: string, percent: number }                               |                                                      |
| determineStatusFromScore({...}): { statusId, label, percent }                                                                                    |                                                      |
| Leitet aus Score/MaxScore einen Status ab (failed/passed/excellent). Nutzt gradingScheme aus examDef oder Fallback-Hartcode (50%/80%-Schwellen). |                                                      |
| **Rückgabe**                                                                                                                                     | { statusId: string, label: string, percent: number } |
| **Verwendet in**                                                                                                                                 | **academy/exams.js** → recordAndApplyResult() intern |

|                                                                                                                |                                                      |
|----------------------------------------------------------------------------------------------------------------|------------------------------------------------------|
| **getExamsForSlot(slotRef) / getExamsForCurrentSlot()** → ExamContext\[\] { calendarEntry, exam, questionSet } |                                                      |
| getExamsForSlot(slotRef): ExamContext\[\] / getExamsForCurrentSlot(): ExamContext\[\]                          |                                                      |
| Gibt alle für einen Slot geplanten Prüfungen zurück (inkl. Fragen-Set).                                        |                                                      |
| **Rückgabe**                                                                                                   | ExamContext\[\] { calendarEntry, exam, questionSet } |
| **Verwendet in**                                                                                               | **ui/apps/** → Prüfungsplan-Anzeige                  |

**4.6 JanusSlotResolver**

|                                                                |
|----------------------------------------------------------------|
| **Klasse: JanusSlotResolver · Pfad: academy/slot-resolver.js** |

game.janus7.academy.slotResolver

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>resolveSlot(slotRef)</strong> → Promise&lt;{ lessons, exams, events, meta }&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async resolveSlot(slotRef: SlotRef): Promise&lt;ResolvedSlot&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt alle Lektionen, Prüfungen und Events für einen Slot zurück. Prüft zunächst teaching-sessions.json, dann calendar.json-Lookup. Respektiert maxLessonsPerSlot aus Config.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;{ lessons, exams, events, meta }&gt;</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>academy/lessons.js</strong> → getLessonsForSlot() – wenn SlotResolver verfügbar</p>
<p><strong>academy/exams.js</strong> → getExamsForSlot() – wenn SlotResolver verfügbar</p>
<p><strong>core/index.js</strong> → debug.resolveSlot() / debug.explainSlot()</p></td>
</tr>
</tbody>
</table>

|                                                     |                                         |
|-----------------------------------------------------|-----------------------------------------|
| **resolveCurrentSlot()** → Promise\<ResolvedSlot\>  |                                         |
| async resolveCurrentSlot(): Promise\<ResolvedSlot\> |                                         |
| Wie resolveSlot, nutzt aktuellen Kalender-Slot.     |                                         |
| **Rückgabe**                                        | Promise\<ResolvedSlot\>                 |
| **Verwendet in**                                    | **Test-Suite** → Slot-Integration-Tests |

**4.7 JanusLocationsEngine**

|                                                                      |
|----------------------------------------------------------------------|
| **Klasse: JanusLocationsEngine · Pfad: academy/locations-engine.js** |

game.janus7.academy.locations

|                                                                                                     |                                                          |
|-----------------------------------------------------------------------------------------------------|----------------------------------------------------------|
| **getCurrentLocation()** → Location \| null                                                         |                                                          |
| getCurrentLocation(): Location \| null                                                              |                                                          |
| Gibt den Ort-Datensatz für den aktuell gesetzten Ort (aus State: academy.currentLocationId) zurück. |                                                          |
| **Rückgabe**                                                                                        | Location \| null                                         |
| **Verwendet in**                                                                                    | **atmosphere/controller.js** → Auto-Mood bei Ortswechsel |

|                                                                                     |                                   |
|-------------------------------------------------------------------------------------|-----------------------------------|
| **setCurrentLocation(locationId, opts?)** → Promise\<Location \| null\>             |                                   |
| async setCurrentLocation(locationId: string, opts?): Promise\<Location\|null\>      |                                   |
| Setzt den aktuellen Ort im State (academy.currentLocationId). Persistiert optional. |                                   |
| **Rückgabe**                                                                        | Promise\<Location \| null\>       |
| **Verwendet in**                                                                    | **ui/apps/** → Ort-Wechsel via UI |

|                                    |                           |
|------------------------------------|---------------------------|
| **listLocations()** → Location\[\] |                           |
| listLocations(): Location\[\]      |                           |
| Gibt alle verfügbaren Orte zurück. |                           |
| **Rückgabe**                       | Location\[\]              |
| **Verwendet in**                   | **ui/apps/** → Orte-Liste |

|                                     |
|-------------------------------------|
| **PHASE 4b ─ QUEST & EVENT SYSTEM** |

game.janus7.academy.quests / .events / .conditions / .effects

**4b.1 JanusQuestEngine**

|                                                                             |
|-----------------------------------------------------------------------------|
| **Klasse: JanusQuestEngine · Pfad: scripts/academy/quests/quest-engine.js** |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>startQuest(questId, { actorId })</strong> → Promise&lt;QuestDef&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async startQuest(questId: string, { actorId: string }): Promise&lt;QuestDef&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Startet eine Quest für einen Actor. Erstellt den Quest-State-Eintrag unter academy.quests.{actorId}.{questId}, setzt Status auf 'active' und triggert den Start-Node. Feuert 'janus7QuestStarted'.</td>
</tr>
<tr class="even">
<td colspan="2"><strong>⚠ BUG / ACHTUNG:</strong> B-03: Im Command-Layer fehlt ein actorId-Fallback für GMs ohne zugewiesenen Character. Workaround: actorId: 'academy' explizit übergeben.</td>
</tr>
<tr class="odd">
<td><strong>Parameter</strong></td>
<td><p><strong>questId</strong> – string Quest-ID aus der Content-Registry (z.B. 'Q_DEMO_LIBRARY').</p>
<p><strong>actorId</strong> – string UUID des Actors oder 'academy' für GM-globale Quests.</p></td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;QuestDef&gt;</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><strong>ui/commands/quest.js</strong> → startQuest command</td>
</tr>
</tbody>
</table>

|                                                                                                                                                                    |                                                                      |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
| **completeQuest(questId, { actorId })** → Promise\<void\>                                                                                                          |                                                                      |
| async completeQuest(questId: string, { actorId: string }): Promise\<void\>                                                                                         |                                                                      |
| Markiert eine Quest als abgeschlossen. Setzt Status auf 'completed' und fügt completedAt-Timestamp hinzu. Feuert 'janus7QuestCompleted'.                           |                                                                      |
| **⚠ BUG / ACHTUNG:** B-01: ui/commands/quest.js übergibt actorId als raw String statt als { actorId }. Das führt zu actorId = undefined und bricht den State-Pfad. |                                                                      |
| **Rückgabe**                                                                                                                                                       | Promise\<void\>                                                      |
| **Verwendet in**                                                                                                                                                   | **ui/commands/quest.js** → completeQuest command (FEHLERHAFT – B-01) |

|                                                                                                                                            |                                                                                         |
|--------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| **progressToNode(questId, nodeId, { actorId })** → Promise\<{ success, nextNodeId? }\>                                                     |                                                                                         |
| async progressToNode(questId, nodeId, { actorId }): Promise\<NodeResult\>                                                                  |                                                                                         |
| Rückt eine aktive Quest zum angegebenen Node vor. Schreibt History-Eintrag. Feuert 'janus7QuestNodeChanged'. Triggert dann den neuen Node. |                                                                                         |
| **Rückgabe**                                                                                                                               | Promise\<{ success, nextNodeId? }\>                                                     |
| **Verwendet in**                                                                                                                           | **scripts/academy/events/event-engine.js** → Automatischer Quest-Fortschritt nach Event |

|                                                                                      |                                                 |
|--------------------------------------------------------------------------------------|-------------------------------------------------|
| **getActiveQuest(actorId, questId)** → QuestState \| undefined                       |                                                 |
| getActiveQuest(actorId: string, questId: string): QuestState \| undefined            |                                                 |
| Gibt den aktuellen Quest-State zurück { status, currentNodeId, history, startedAt }. |                                                 |
| **Rückgabe**                                                                         | QuestState \| undefined                         |
| **Verwendet in**                                                                     | **ui/commands/quest.js** → Quest-Status-Anzeige |

|                                                                                                                                       |                                                         |
|---------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| **listQuests({ actorId?, status? })** → QuestState\[\] (gefiltert nach actorId und/oder status)                                       |                                                         |
| listQuests({ actorId?: string, status?: string }): QuestState\[\]                                                                     |                                                         |
| Listet Quests aus dem State. Iteriert alle Actors im Quest-Map oder nur einen bestimmten. Filter nach Status ('active', 'completed'). |                                                         |
| **Rückgabe**                                                                                                                          | QuestState\[\] (gefiltert nach actorId und/oder status) |
| **Verwendet in**                                                                                                                      | **ui/commands/quest.js** → listActiveQuests command     |

|                                              |
|----------------------------------------------|
| **PHASE 5 ─ HYBRID & ATMOSPHERE CONTROLLER** |

game.janus7.atmosphere.controller

Phase 5 steuert Beamer-Projektionen, Playlisten und Stimmungen für den physischen Spieltisch. Nutzt ein Master-Client-Modell: nur ein Client (typ. GM) steuert die Foundry-Playlisten. Alle anderen Clients senden Socket-Anfragen.

**5.1 JanusAtmosphereController**

|                                                                        |
|------------------------------------------------------------------------|
| **Klasse: JanusAtmosphereController · Pfad: atmosphere/controller.js** |

|                                                                                                      |                                                                                     |
|------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| **init()** → Promise\<boolean\> (false wenn Atmosphere deaktiviert)                                  |                                                                                     |
| async init(): Promise\<boolean\>                                                                     |                                                                                     |
| Initialisiert Atmosphere: lädt moods.json, setzt Auto-Master-Client (GM), startet Override-Watchdog. |                                                                                     |
| **Rückgabe**                                                                                         | Promise\<boolean\> (false wenn Atmosphere deaktiviert)                              |
| **Verwendet in**                                                                                     | **atmosphere/phase5.js** → Hooks.on('janus7Ready', () =\> engine.atmosphere.init()) |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>applyMood(moodId, opts?)</strong> → Promise&lt;boolean&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async applyMood(moodId: string, opts?: { broadcast?, force? }): Promise&lt;boolean&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Wendet eine Stimmung an: startet zugehörige Playlist, setzt activeMoodId im State. Broadcast: sendet Socket-Anfrage an Master-Client. Feuert 'janus7AtmosphereChanged'.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>moodId</strong> – string ID der Stimmung aus moods.json.</p>
<p><strong>opts.broadcast</strong> – boolean true (default): Socket-Anfrage an Master wenn kein Master.</p>
<p><strong>opts.force</strong> – boolean true: überspringt Anti-Flapping-Check (cooldownMs).</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;boolean&gt;</td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>ui/apps/AtmosphereDJApp.js</strong> → Mood-Button-Klick</p>
<p><strong>ui/commands/atmosphere.js</strong> → applyMood command</p>
<p><strong>core/director.js</strong> → director.applyMood()</p></td>
</tr>
</tbody>
</table>

|                                                                      |                                                    |
|----------------------------------------------------------------------|----------------------------------------------------|
| **listMoods()** → AtmosphereMood\[\] { id, label, playlistRef, ... } |                                                    |
| listMoods(): AtmosphereMood\[\]                                      |                                                    |
| Gibt alle geladenen Moods aus moods.json zurück.                     |                                                    |
| **Rückgabe**                                                         | AtmosphereMood\[\] { id, label, playlistRef, ... } |
| **Verwendet in**                                                     | **ui/apps/AtmosphereDJApp.js** → Mood-Auswahl-UI   |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>status()</strong> → AtmosphereStatus { enabled, isMasterClient, masterClientUserId, activeMoodId, ... }</td>
</tr>
<tr class="even">
<td colspan="2">status(): AtmosphereStatus</td>
</tr>
<tr class="odd">
<td colspan="2">Gibt einen vollständigen Diagnose-Snapshot der Atmosphere zurück. Enthält alle relevanten State-Felder für Debug und UI.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>AtmosphereStatus { enabled, isMasterClient, masterClientUserId, activeMoodId, ... }</td>
</tr>
<tr class="odd">
<td><strong>Verwendet in</strong></td>
<td><p><strong>ui/apps/AtmosphereDJApp.js</strong> → Status-Anzeige</p>
<p><strong>ui/commands/atmosphere.js</strong> → getAtmosphereStatus command</p></td>
</tr>
</tbody>
</table>

|                                                                                                                                            |                                                             |
|--------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| **setMasterClient(userId, opts?)** → Promise\<boolean\>                                                                                    |                                                             |
| async setMasterClient(userId: string\|null, opts?: { broadcast? }): Promise\<boolean\>                                                     |                                                             |
| Setzt den Master-Client (welcher Foundry-Client spielt die Playlisten ab). Nur GM darf dies. Persistiert in atmosphere.masterClientUserId. |                                                             |
| **Rückgabe**                                                                                                                               | Promise\<boolean\>                                          |
| **Verwendet in**                                                                                                                           | **ui/commands/atmosphere.js** → setAtmosphereMaster command |

|                                                                                  |                                                             |
|----------------------------------------------------------------------------------|-------------------------------------------------------------|
| **setMasterVolume(volume, opts?)** → Promise\<boolean\>                          |                                                             |
| async setMasterVolume(volume: number, opts?: { broadcast? }): Promise\<boolean\> |                                                             |
| Setzt die globale Lautstärke (0..1). Persistiert in atmosphere.masterVolume.     |                                                             |
| **Rückgabe**                                                                     | Promise\<boolean\>                                          |
| **Verwendet in**                                                                 | **ui/commands/atmosphere.js** → setAtmosphereVolume command |

|                                                                                   |                                                      |
|-----------------------------------------------------------------------------------|------------------------------------------------------|
| **playPlaylist(playlistRef, opts?)** → Promise\<boolean\>                         |                                                      |
| async playPlaylist(playlistRef: string, opts?): Promise\<boolean\>                |                                                      |
| Spielt eine Foundry-Playlist direkt ab (hybrid: Socket-Anfrage wenn kein Master). |                                                      |
| **Rückgabe**                                                                      | Promise\<boolean\>                                   |
| **Verwendet in**                                                                  | **ui/commands/atmosphere.js** → playPlaylist command |

|                                                                                                                   |                                                                                   |
|-------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| **stopAll(opts?) / pause(opts?) / resume(opts?)** → Promise\<boolean\>                                            |                                                                                   |
| async stopAll() / pause() / resume(): Promise\<boolean\>                                                          |                                                                                   |
| Stoppt alle Playlisten, pausiert oder setzt sie fort. Schreibt Pause-Snapshot in State für Resume-Funktionalität. |                                                                                   |
| **Rückgabe**                                                                                                      | Promise\<boolean\>                                                                |
| **Verwendet in**                                                                                                  | **ui/commands/atmosphere.js** → stopAtmosphere, pauseAtmosphere, resumeAtmosphere |

|                                                                                                                      |                                                        |
|----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| **setAutoFromCalendar/Events/Location(enabled, opts?)** → Promise\<boolean\>                                         |                                                        |
| async setAutoFrom\*(enabled: boolean, opts?): Promise\<boolean\>                                                     |                                                        |
| Aktiviert automatische Mood-Steuerung aus Kalender, Events oder Ort. Persistiert die Flags in atmosphere.autoFrom\*. |                                                        |
| **Rückgabe**                                                                                                         | Promise\<boolean\>                                     |
| **Verwendet in**                                                                                                     | **ui/commands/atmosphere.js** → setAutoFrom\*-Commands |

|                                                       |                                                         |
|-------------------------------------------------------|---------------------------------------------------------|
| **destroy()** → void                                  |                                                         |
| destroy(): void                                       |                                                         |
| Räumt Ressourcen auf: stoppt Override-Watchdog-Timer. |                                                         |
| **Rückgabe**                                          | void                                                    |
| **Verwendet in**                                      | **core/index.js** → engine.cleanup() – bei Modul-Reload |

|                              |
|------------------------------|
| **PHASE – ─ HOOKS-REFERENZ** |

JANUS7 feuert Custom-Hooks über Hooks.callAll(). Externe Module und Integrations-Skripte können diese abhören. Interne Listener sind in quest-system-integration.js registriert.

| **Hook-Name**                 | **Gefeuert von**            | **Payload**                                         | **Listener**                        | **Status**   |
|-------------------------------|-----------------------------|-----------------------------------------------------|-------------------------------------|--------------|
| **janus7Ready**               | core/index.js · ready()     | engine: Janus7Engine                                | phase5, phase6, quest-system, ui    | **Aktiv**    |
| **janus7StateLoaded**         | core/state.js · load()      | { state, isNew }                                    | – (kein interner Listener)          | **Dead**     |
| **janus7StateChanged**        | core/state.js · set()       | { path, oldValue, newValue, state }                 | – (für externe Module)              | **Dead**     |
| **janus7StateReplaced**       | core/state.js · replace()   | { oldState, newState }                              | – (für externe Module)              | **Dead**     |
| **janus7StateSaved**          | core/state.js · save()      | { state }                                           | – (für externe Module)              | **Dead**     |
| **janus7DateChanged**         | academy/calendar.js         | { previous, current, reason }                       | – (für externe Module)              | **Dead**     |
| **janus7ScoreChanged**        | academy/scoring.js          | { targetType, targetId, amount, newScore, source }  | – (für externe Module)              | **Dead**     |
| **janus7RelationChanged**     | academy/social.js           | { fromId, toId, oldValue, newValue }                | – (für externe Module)              | **Dead**     |
| **janus7AtmosphereChanged**   | atmosphere/controller.js    | { moodId, playlistRef, source, masterClientUserId } | – (für externe Module)              | **Dead**     |
| **janus7QuestStarted**        | quest-engine.js             | { questId, actorId, quest }                         | quest-system-integration.js         | **Aktiv**    |
| **janus7QuestCompleted**      | quest-engine.js             | { questId, actorId }                                | quest-system-integration.js         | **Aktiv**    |
| **janus7QuestNodeChanged**    | quest-engine.js             | { questId, nodeId, actorId }                        | – (kein interner Listener)          | **Dead**     |
| **janus7QuestSystemReady**    | phase4-quest-integration.js | engine                                              | – (kein interner Listener)          | **Dead**     |
| **janus7EventShown**          | event-engine.js             | { eventId, actorId, event }                         | quest-system-integration.js (Popup) | **Partiell** |
| **janus7EventOptionSelected** | scripts/ui/event-popup.js   | { eventId, optionId, actorId }                      | quest-system-integration.js         | **Partiell** |
| **janus7EffectsApplied**      | effect-adapter.js           | { effectIds, changes, context }                     | – (kein interner Listener)          | **Dead**     |

Legende: **Aktiv** = Listener registriert · **Partiell** = Listener vorhanden, aber abhängig von optionaler UI-Datei · **Dead** = kein interner Listener, nur für externe Module

|                                                                       |
|-----------------------------------------------------------------------|
| **PHASE 4c ─ FEHLENDE APIs – PHASE 4 ERWEITERUNGEN (ROADMAP-LÜCKEN)** |

|                                                                                                                                    |
|------------------------------------------------------------------------------------------------------------------------------------|
| **⚠ NICHT IMPLEMENTIERT –** Folgende APIs sind in der Roadmap definiert, existieren aber noch nicht im Code. Status: OFFEN / TODO. |

**4c.1 JanusStoryEngine ⚠ FEHLT KOMPLETT**

|                                                                                          |
|------------------------------------------------------------------------------------------|
| **Klasse: JanusStoryEngine · Ziel-Pfad: academy/story.js · STATUS: NICHT IMPLEMENTIERT** |

Die Roadmap (Phase 4.7) definiert Story-Threads als eigenen Engine-Bereich: offene/abgeschlossene/eskalierte Kampagnen-Stränge mit Bezug zu Events, Lektionen und NPCs. Die Engine soll Einträge in state.story.chronicle schreiben. Derzeit kein Namespace, kein State-Subtree, keine Klasse vorhanden.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>addChronicleEntry(entry)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async addChronicleEntry(entry: ChronicleEntry): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Fügt einen Eintrag in state.story.chronicle ein (z.B. 'Event X hat Beziehung Y beeinflusst'). Stempel mit timestamp und source. Feuert Hook 'janus7ChronicleUpdated'.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>entry.type</strong> – string 'event'|'lesson'|'exam'|'social'|'manual'</p>
<p><strong>entry.text</strong> – string Beschreibender Text für das Chronik-Eintrag.</p>
<p><strong>entry.refs</strong> – string[] Referenzierte IDs (eventId, npcId, lessonId etc.).</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td><p>• State-Subtree: state.story.chronicle (Array).</p>
<p>• Muss in JanusStateCore-Schema ergänzt werden.</p></td>
</tr>
<tr class="odd">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>openThread(threadId, title, opts?)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async openThread(threadId: string, title: string, opts?): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Öffnet einen neuen Story-Thread in state.story.threads. Threads können mit Events, NPCs und Lektionen verknüpft werden.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>threadId</strong> – string Eindeutige ID des Threads.</p>
<p><strong>title</strong> – string Menschenlesbare Bezeichnung.</p>
<p><strong>opts.refs</strong> – string[] Initiale Referenzen (eventIds, npcIds).</p>
<p><strong>opts.priority</strong> – 'main'|'side'|'background' Relevanz des Strangs.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                             |                 |
|---------------------------------------------------------------------------------------------|-----------------|
| **closeThread(threadId, resolution?)** → Promise\<void\>                                    |                 |
| async closeThread(threadId: string, resolution?: string): Promise\<void\>                   |                 |
| Schließt einen Story-Thread ab. Setzt Status auf 'completed' mit optionalem Abschluss-Text. |                 |
| **Rückgabe**                                                                                | Promise\<void\> |
| Nicht aktiv genutzt im Command-Layer                                                        |                 |

|                                                                                                             |                 |
|-------------------------------------------------------------------------------------------------------------|-----------------|
| **escalateThread(threadId, reason?)** → Promise\<void\>                                                     |                 |
| async escalateThread(threadId: string, reason?: string): Promise\<void\>                                    |                 |
| Markiert einen Thread als eskaliert (Status: 'escalated'). Für Plot-Wendungen und unerwartete Konsequenzen. |                 |
| **Rückgabe**                                                                                                | Promise\<void\> |
| Nicht aktiv genutzt im Command-Layer                                                                        |                 |

|                                                                        |            |
|------------------------------------------------------------------------|------------|
| **listThreads({ status? })** → Thread\[\]                              |            |
| listThreads({ status?: 'open'\|'escalated'\|'completed' }): Thread\[\] |            |
| Gibt alle oder nach Status gefilterte Story-Threads zurück.            |            |
| **Rückgabe**                                                           | Thread\[\] |
| Nicht aktiv genutzt im Command-Layer                                   |            |

**4c.2 JanusEventEngine – fehlende Trigger-API**

|                                                                                                         |
|---------------------------------------------------------------------------------------------------------|
| **Klasse: JanusEventEngine · Pfad: scripts/academy/events/event-engine.js · STATUS: SCHREIB-API FEHLT** |

Die lesenden Methoden (getEvent, listEventsForSlot) sind vorhanden. Die Roadmap definiert jedoch zusätzlich einen aktiven Trigger-Pfad mit Wirkung auf Chronicle, Scoring und Social sowie eine upsertEvent-Methode für den Phase-7-Importer.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>triggerEvent(eventId, options?)</strong> → Promise&lt;{ eventId, triggered: boolean, effects: string[] }&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async triggerEvent(eventId: string, options?: { actorId?, silent? }): Promise&lt;EventResult&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Löst ein Event aktiv aus. Schreibt Eintrag in story.chronicle, kann Scoring- und Social-Effekte auslösen, feuert Hook 'janus7EventTriggered'. Derzeit nur über quest-system-integration.js erreichbar.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>eventId</strong> – string ID aus events.json.</p>
<p><strong>options.actorId</strong> – string Bezugsperson/Actor für das Event.</p>
<p><strong>options.silent</strong> – boolean true = kein Chat-Output, nur State-Effekte.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;{ eventId, triggered: boolean, effects: string[] }&gt;</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td><p>• Derzeit nur Lese-API vorhanden (getEvent, listEventsForSlot).</p>
<p>• Der Trigger-Pfad läuft als Workaround über event-engine.js intern mit direktem state.transaction().</p></td>
</tr>
<tr class="odd">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>upsertEvent(eventDef)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async upsertEvent(eventDef: EventDefinition): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Fügt ein neues Event zur Academy-Datenbank hinzu oder aktualisiert ein bestehendes. Benötigt für Phase-7-KI-Importer (applyPatchPlan ruft diese API auf).</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• ACHTUNG: Events sind derzeit rein statisch in events.json – kein dynamisches Schreiben möglich.</p>
<p>• Implementierung erfordert entweder: (a) Mutables-Cache in AcademyDataApi oder (b) separaten Dynamic-Events-State-Subtree.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

**4c.3 JanusLessonsEngine – fehlende Schreib-APIs**

|                                                                   |
|-------------------------------------------------------------------|
| **Pfad: academy/lessons.js · STATUS: NUR LESE-API IMPLEMENTIERT** |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>upsertLesson(lessonDef)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async upsertLesson(lessonDef: LessonDefinition): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Fügt eine Lektion hinzu oder aktualisiert sie. Benötigt für Phase-7-Importer (applyPatchPlan). Gleiche Problematik wie upsertEvent – statische JSON vs. dynamischer Mutables-Cache.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Phase-7-Spec: importer.js ruft academy.lessons.upsertLesson() auf.</p>
<p>• Noch nicht implementiert – Lektionen sind read-only aus lessons.json.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                                                                       |                                                                |
|---------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **exportModel()** → LessonsExport { lessons\[\], teachingSessions\[\] }                                                               |                                                                |
| exportModel(): LessonsExport                                                                                                          |                                                                |
| Exportiert das vollständige Lektions-Datenmodell als serialisierbares Objekt. Datenquelle für JanusKIExporter.createExportSnapshot(). |                                                                |
| **Rückgabe**                                                                                                                          | LessonsExport { lessons\[\], teachingSessions\[\] }            |
| **Hinweise**                                                                                                                          | • Benötigt für Phase-7-Exporter: academy.lessons.exportModel() |
| Nicht aktiv genutzt im Command-Layer                                                                                                  |                                                                |

**4c.4 JanusCalendarEngine – fehlende Schreib-APIs**

|                                                               |
|---------------------------------------------------------------|
| **Pfad: academy/calendar.js · STATUS: MUTATIONS-APIs FEHLEN** |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>moveLesson(from, to)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async moveLesson(from: SlotRef &amp; { lessonId }, to: SlotRef): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Verschiebt eine Lektion von einem Kalender-Slot in einen anderen. Roadmap-UI-Spec: 'Drag auf Stundenplan → Calendar.moveLesson()'. Erfordert mutable Calendar-Einträge.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Voraussetzung: mutable calendar entries (derzeit statisch aus calendar.json).</p>
<p>• Phase-6-UI: Drag&amp;Drop im Academy-Overview-Grid.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>applyChanges(changes)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async applyChanges(changes: CalendarChangeset): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Wendet einen Batch von Kalender-Änderungen atomisch an. Wird von Phase-7-Importer aufgerufen (applyPatchPlan). Änderungen können neue Einträge, Verschiebungen und Löschungen enthalten.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Phase-7-Spec: importer.js ruft academy.calendar.applyChanges() auf.</p>
<p>• Benötigt mutable Kalender-Daten im State oder separaten Overlay-Layer.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                                     |                                                        |
|-----------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| **exportModel()** → CalendarExport { entries\[\], config, currentSlotRef }                          |                                                        |
| exportModel(): CalendarExport                                                                       |                                                        |
| Exportiert den vollständigen Kalender als serialisierbares Objekt. Datenquelle für JanusKIExporter. |                                                        |
| **Rückgabe**                                                                                        | CalendarExport { entries\[\], config, currentSlotRef } |
| Nicht aktiv genutzt im Command-Layer                                                                |                                                        |

**4c.5 JanusSocialEngine – fehlende Methoden (Roadmap 4.6)**

|                                                              |
|--------------------------------------------------------------|
| **Pfad: academy/social.js · STATUS: ERWEITERTE APIs FEHLEN** |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>adjustReputation(scopeId, delta, reason?)</strong> → Promise&lt;number&gt; (neuer Reputationswert)</td>
</tr>
<tr class="even">
<td colspan="2">async adjustReputation(scopeId: string, delta: number, reason?: string): Promise&lt;number&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Passt die Reputation in einem definierten Scope an. scopeId kann 'academy', 'faculty', 'students' oder ein individueller Zirkel sein. Ergänzt die personenbezogenen Attitüden-Werte durch scope-weite Werte.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>scopeId</strong> – string 'academy' | 'faculty' | 'students' | circleId</p>
<p><strong>delta</strong> – number Relativer Delta-Wert (positiv oder negativ).</p>
<p><strong>reason</strong> – string? Begründung für History-Log.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;number&gt; (neuer Reputationswert)</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td>• State-Subtree: state.actors.reputation.{scopeId}. Noch nicht im State-Schema vorhanden.</td>
</tr>
<tr class="odd">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>addTag(actorId, tag) / removeTag(actorId, tag)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async addTag(actorId: string, tag: string): Promise&lt;void&gt; / removeTag(...): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Fügt einem Actor einen Tag hinzu oder entfernt ihn (z.B. 'troublemaker', 'star-pupil', 'trusted'). Tags können von Event-Triggern und Consequences ausgelesen werden.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• State-Subtree: state.actors.tags.{actorId} (Set/Array).</p>
<p>• Benötigt für Consequence-System und Director-Actions.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>applyLessonSocialEffects(lessonDef, context)</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async applyLessonSocialEffects(lessonDef: any, context: { participants: string[] }): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Wertet soziale Effekte einer Lektion aus und schreibt sie in den Social-Graph. Beispiel: Gruppenarbeit stärkt Beziehungen zwischen Teilnehmern. lessonDef.socialEffects steuert die Wirkung.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Roadmap-Spec (4.6): 'Lessons entscheiden, wann Social-Effekte ausgelöst werden'.</p>
<p>• lessonDef.socialEffects ist noch nicht im Lektion-Schema definiert.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                                     |                                                              |
|-----------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| **exportModel()** → SocialExport { relationships: {}, reputation: {}, tags: {} }                    |                                                              |
| exportModel(): SocialExport                                                                         |                                                              |
| Exportiert den gesamten Social-Graph als serialisierbares Objekt. Datenquelle für Phase-7-Exporter. |                                                              |
| **Rückgabe**                                                                                        | SocialExport { relationships: {}, reputation: {}, tags: {} } |
| Nicht aktiv genutzt im Command-Layer                                                                |                                                              |

**4c.6 JanusScoringEngine – fehlende Export-Methode**

|                                                         |
|---------------------------------------------------------|
| **Pfad: academy/scoring.js · STATUS: EXPORT-API FEHLT** |

|                                                                                                                                                                                          |                                                                |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **exportModel()** → ScoringExport { circles: {}, students: {}, lastAwarded: \[\] }                                                                                                       |                                                                |
| exportModel(): ScoringExport                                                                                                                                                             |                                                                |
| Exportiert alle Scoring-Daten als serialisierbares Objekt für den Phase-7-Exporter. Äquivalent zu getLeaderboard() + getLastAwards(), aber strukturiert als vollständiges Export-Objekt. |                                                                |
| **Rückgabe**                                                                                                                                                                             | ScoringExport { circles: {}, students: {}, lastAwarded: \[\] } |
| Nicht aktiv genutzt im Command-Layer                                                                                                                                                     |                                                                |

|                                                            |
|------------------------------------------------------------|
| **PHASE 6b ─ FEHLENDE UI-APPS – PHASE 6 (ROADMAP-LÜCKEN)** |

|                                                                                                                        |
|------------------------------------------------------------------------------------------------------------------------|
| **⚠ NICHT IMPLEMENTIERT –** Folgende ApplicationV2-Apps sind im Roadmap-Scope Phase 6 definiert, aber nicht vorhanden. |

**6b.1 JanusAcademyOverviewApp ⚠ FEHLT**

|                                                                                                                           |
|---------------------------------------------------------------------------------------------------------------------------|
| **App: Academy Overview (Wochenplan-Grid) · Ziel-Pfad: ui/apps/JanusAcademyOverviewApp.js · STATUS: NICHT IMPLEMENTIERT** |

Zeigt den Wochenplan als Grid (7 Tage × 10 Slots). Klick auf Slot → Detail-Overlay mit Lektion, Event, Prüfung. Navigation zwischen Wochen/Trimestern. Laut Roadmap auch mit Drag&Drop zur Lektion-Verschiebung (→ calendar.moveLesson()).

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>render(force?, options?) [ApplicationV2]</strong> → Promise&lt;void&gt;</td>
</tr>
<tr class="even">
<td colspan="2">render(force?: boolean, options?): Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Rendert das Wochenplan-Grid. Liest CalendarEngine.getCurrentSlotRef() und SlotResolver.resolveSlot() für jeden sichtbaren Slot. Hebt aktuellen Slot hervor.</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;void&gt;</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Abhängig von: CalendarEngine, LessonsEngine, ExamsEngine, SlotResolver.</p>
<p>• Phase-6-Roadmap: 'Academy Overview – Wochenplan-Grid, Slot-Details, Navigation' → 2–3 PT.</p>
<p>• Drag&amp;Drop erfordert calendar.moveLesson() (4c.4 – ebenfalls fehlend).</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

**6b.2 JanusStateInspectorApp ⚠ FEHLT**

|                                                                                                                       |
|-----------------------------------------------------------------------------------------------------------------------|
| **App: State Inspector (JSON/TreeView) · Ziel-Pfad: ui/apps/JanusStateInspectorApp.js · STATUS: NICHT IMPLEMENTIERT** |

Read-only JSON-/Baumansicht des gesamten States. Für Debug und Diagnose. Laut Roadmap als Tab im Control Panel oder als separates Fenster. Zeigt aktuellen State-Snapshot, Schema-Version und Last-Modified.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>render()</strong> → void</td>
</tr>
<tr class="even">
<td colspan="2">render(): void</td>
</tr>
<tr class="odd">
<td colspan="2">Rendert den State-Tree. Liest director.exportState() und stellt ihn als aufklappbaren JSON-Baum dar. Filter-Funktion für State-Pfade (z.B. nur 'time.*' anzeigen).</td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>void</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Roadmap: 'State Inspector &amp; optional Config Panel → 2–3 PT'.</p>
<p>• Derzeit: State-Inspektion nur über Browser-Konsole möglich.</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

**6b.3 JanusConfigDialogApp ⚠ FEHLT**

|                                                                                                   |
|---------------------------------------------------------------------------------------------------|
| **App: Config-Dialog · Ziel-Pfad: ui/apps/JanusConfigDialogApp.js · STATUS: NICHT IMPLEMENTIERT** |

Einfaches Konfigurations-UI für kritische Mappings (z.B. Szene → Mood, Ort → Mood). Speichert via JanusConfig.set(). Roadmap beschränkt dies bewusst auf 1–2 exemplarische Mappings – kein vollständiger World-Builder.

**6b.4 Permissions-Matrix ⚠ NICHT IMPLEMENTIERT**

|                                                                                   |
|-----------------------------------------------------------------------------------|
| **Quer-Thema: Rollen-basierte Sichtbarkeit · STATUS: KEIN GUARD-LAYER VORHANDEN** |

Die Roadmap definiert eine Permissions-Matrix: welche Rolle (GM, Trusted Player, Player) welche Apps öffnen und welche Aktionen ausführen darf. Derzeit: alle game.user.isGM-Guards sind inline in einzelnen Commands. Kein zentrales Permissions-Objekt.

| **Feature / App**           | **GM**          | **Trusted Player** | **Player**    |
|-----------------------------|-----------------|--------------------|---------------|
| Control Panel öffnen        | ✓ Implementiert | – Offen            | ✗ Gesperrt    |
| Kalender-Ansicht (Overview) | – App fehlt     | – Offen            | read-only     |
| State Inspector             | – App fehlt     | ✗ GM-only          | ✗ GM-only     |
| Scoring-Leaderboard (read)  | ✓ Vorhanden     | – Guard fehlt      | – Guard fehlt |

**6b.5 i18n / Lokalisierung ⚠ NICHT IMPLEMENTIERT**

|                                                                                           |
|-------------------------------------------------------------------------------------------|
| **Quer-Thema: DE/EN Lokalisierung · STATUS: KEINE lang/\*.json-Nutzung IM COMMAND-LAYER** |

Die Roadmap fordert grundlegende i18n (DE/EN). lang/de.json / lang/en.json sind in module.json registriert, werden aber vom gesamten Command-Layer und den UI-Apps nicht genutzt. Alle Strings sind hardcoded auf Deutsch.

Ausstehend: Systematische Ersetzung aller display-seitigen Strings durch game.i18n.localize('janus7.key')-Aufrufe.

|                                                                        |
|------------------------------------------------------------------------|
| **PHASE 7a ─ FEHLENDE APIs – PHASE 7 KI-INTEGRATION (KOMPLETT OFFEN)** |

|                                                                                                                                                                        |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **⚠ PHASE 7 STUB –** Der gesamte Namespace game.janus7.ki ist laut Roadmap definiert, aber nicht implementiert. Nur getAiContext() als Rumpf vorhanden (mit Bug B-02). |

Namespace-Struktur gemäß Roadmap (ki/):

> game.janus7.ki = { exporter: JanusKIExporter, // ki/exporter.js – FEHLT importer: JanusKIImporter, // ki/importer.js – FEHLT prompts: JanusKIPrompts, // ki/prompts.js – FEHLT diff: JanusKIDiff // ki/diff.js – OPTIONAL, FEHLT }

**7a.1 JanusKIExporter ⚠ FEHLT**

|                                                                                       |
|---------------------------------------------------------------------------------------|
| **Klasse: JanusKIExporter · Ziel-Pfad: ki/exporter.js · STATUS: NICHT IMPLEMENTIERT** |

Erstellt KI-freundliche Export-Snapshots (JANUS_EXPORT_V2) aus State + Akademiedaten. Kann als JSON-Datei heruntergeladen oder als ZIP im JANUS_KI_KIT-Layout gepackt werden.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>createExportSnapshot(options?)</strong> → JanusExportV2 (vollständiges Export-Objekt)</td>
</tr>
<tr class="even">
<td colspan="2">createExportSnapshot(options?: ExportOptions): JanusExportV2</td>
</tr>
<tr class="odd">
<td colspan="2">Aggregiert Daten von JanusStateCore (State-Snapshot), CalendarEngine.exportModel(), LessonsEngine.exportModel(), EventEngine.exportModel(), ScoringEngine.exportModel(), SocialEngine.exportModel() und der NPC/Locations-Datenbank zu einem JANUS_EXPORT_V2-Objekt.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>options.includeLore</strong> – boolean Inkludiert Lore-Texte aus Journalen.</p>
<p><strong>options.includeReferences</strong> – boolean Inkludiert NPC/Location-Referenzen.</p>
<p><strong>options.includeArtPlaceholders</strong> – boolean Fügt Art-Prompt-Platzhalter für Szenen/NPCs hinzu.</p>
<p><strong>options.mode</strong> – 'full'|'lite'|'currentWeek' 'lite': nur State + aktuelle Woche. 'full': alles.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>JanusExportV2 (vollständiges Export-Objekt)</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td><p>• JANUS_EXPORT_V2-Format: { version, meta: { exportedAt, world, janusVersion, system }, campaign_state, academy: { calendar, lessons, exams, events, scoring, social }, references: { npcs, locations } }</p>
<p>• Benötigt: exportModel()-Methoden auf allen Engines (4c.3–4c.6 – ebenfalls fehlend).</p></td>
</tr>
<tr class="odd">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                                                     |                 |
|---------------------------------------------------------------------------------------------------------------------|-----------------|
| **downloadExport(options?)** → Promise\<void\>                                                                      |                 |
| async downloadExport(options?): Promise\<void\>                                                                     |                 |
| Generiert JANUS_EXPORT_V2-Snapshot und löst Browser-Download als JSON-Datei aus via foundry.utils.saveDataToFile(). |                 |
| **Rückgabe**                                                                                                        | Promise\<void\> |
| Nicht aktiv genutzt im Command-Layer                                                                                |                 |

|                                                                                                                                                                                                                                     |                                                                |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **downloadKIPackage(options?)** → Promise\<void\>                                                                                                                                                                                   |                                                                |
| async downloadKIPackage(options?): Promise\<void\>                                                                                                                                                                                  |                                                                |
| Erstellt ZIP-Paket im JANUS_KI_KIT-Layout: 00_README/, 01_MODULE_CURRENT/ (Export JSON), 02_PROMPTS_CURRENT/ (generierte Prompts), 07_KNOWLEDGE_AKADEMIE_DGDZ/ (Lore-Referenzen). Analog zum bestehenden manuellen KI-Kit-Workflow. |                                                                |
| **Rückgabe**                                                                                                                                                                                                                        | Promise\<void\>                                                |
| **Hinweise**                                                                                                                                                                                                                        | • Benötigt JSZip oder ähnliche Browser-kompatible ZIP-Library. |
| Nicht aktiv genutzt im Command-Layer                                                                                                                                                                                                |                                                                |

**7a.2 JanusKIImporter ⚠ FEHLT**

|                                                                                       |
|---------------------------------------------------------------------------------------|
| **Klasse: JanusKIImporter · Ziel-Pfad: ki/importer.js · STATUS: NICHT IMPLEMENTIERT** |

Validiert KI-Antworten (JANUS_KI_RESPONSE_V1), erzeugt Patch-Plan, zeigt Vorschau im UI und wendet ausgewählte Änderungen über Engine-APIs an. Kein Blind-Automerge – SL entscheidet per Häkchen.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>previewImport(file)</strong> → Promise&lt;JanusKIPatchPlan&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async previewImport(file: File): Promise&lt;JanusKIPatchPlan&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Liest JSON-Datei ein, prüft ob JANUS_KI_RESPONSE_V1 oder JANUS_IMPORT_V1, validiert via JanusValidator, prüft Referenzen (gibt es die NPCs/Lessons noch?), optional DSA5-Check via Bridge. Gibt einen strukturierten Patchplan mit lesbar formulierten Änderungen zurück.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><strong>file</strong> – File Browser-File-Objekt (via FilePicker/Drag&amp;Drop).</td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;JanusKIPatchPlan&gt;</td>
</tr>
<tr class="even">
<td><strong>Fehler</strong></td>
<td><strong>JanusValidationError</strong> Wenn Schema-Version unbekannt oder Pflichtfelder fehlen.</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• JanusKIPatchPlan: { version, sourceExportMeta, changes: { calendarUpdates?, lessonUpdates?, eventUpdates?, scoringAdjustments?, socialAdjustments?, journalEntries? }, summary: string }</p>
<p>• Validator-Erweiterung erforderlich: registerSchema('JANUS_KI_RESPONSE_V1', schema)</p></td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>applyPatchPlan(patchPlan, options?)</strong> → Promise&lt;{ applied: number, skipped: number, errors: string[] }&gt;</td>
</tr>
<tr class="even">
<td colspan="2">async applyPatchPlan(patchPlan: JanusKIPatchPlan, options?: { selectedChanges?: string[] }): Promise&lt;ApplyResult&gt;</td>
</tr>
<tr class="odd">
<td colspan="2">Wendet ausgewählte Änderungen aus dem Patchplan an. Ruft ausschließlich Engine-APIs auf: calendar.applyChanges(), lessons.upsertLesson(), events.upsertEvent(), scoring.addCirclePoints(), social.setAttitude(). Erstellt automatisches Backup vor Anwendung.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><strong>options.selectedChanges</strong> – string[] IDs der zu übernehmenden Änderungen. Ohne Angabe: alle.</td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>Promise&lt;{ applied: number, skipped: number, errors: string[] }&gt;</td>
</tr>
<tr class="even">
<td><strong>Hinweise</strong></td>
<td><p>• Alle Engine-APIs in applyPatchPlan() sind noch fehlend (upsertLesson, upsertEvent, calendar.applyChanges).</p>
<p>• Backup-Strategie: state.snapshot() vor Apply, Rollback bei Fehler.</p></td>
</tr>
<tr class="odd">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                                                                                     |                             |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------|
| **importJanusImportV1(file)** → Promise\<JanusKIPatchPlan\>                                                                                         |                             |
| async importJanusImportV1(file: File): Promise\<JanusKIPatchPlan\>                                                                                  |                             |
| Sonderfall: Importiert direkt ein JANUS_IMPORT_V1-Dokument (bestehendes Importformat für Schuljahres-/Stundenplan-Daten) anstelle einer KI-Antwort. |                             |
| **Rückgabe**                                                                                                                                        | Promise\<JanusKIPatchPlan\> |
| Nicht aktiv genutzt im Command-Layer                                                                                                                |                             |

**7a.3 JanusKIPrompts ⚠ FEHLT**

|                                                                                     |
|-------------------------------------------------------------------------------------|
| **Klasse: JanusKIPrompts · Ziel-Pfad: ki/prompts.js · STATUS: NICHT IMPLEMENTIERT** |

Generiert vorbereitete Prompt-Templates aus einem JANUS_EXPORT_V2-Objekt für Copy&Paste in Gemini/ChatGPT/Claude. Die Prompts erklären das JANUS_KI_RESPONSE_V1-Schema, damit die KI strukturiertes JSON zurückgibt.

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>buildPrompt(exportObj, mode)</strong> → string (fertiger Prompt-Text)</td>
</tr>
<tr class="even">
<td colspan="2">buildPrompt(exportObj: JanusExportV2, mode: 'lessons'|'events'|'social'|'scoring'|'story'): string</td>
</tr>
<tr class="odd">
<td colspan="2">Erstellt einen Prompt für einen spezifischen Aufgaben-Typ. Enthält: Kontext aus exportObj, Aufgabenbeschreibung, erwartetes Output-Schema (JANUS_KI_RESPONSE_V1-Snippet), Beispiel.</td>
</tr>
<tr class="even">
<td><strong>Parameter</strong></td>
<td><p><strong>exportObj</strong> – JanusExportV2 Aktueller Export-Snapshot als Kontext-Basis.</p>
<p><strong>mode</strong> – string 'lessons': Lektionen verbessern. 'events': neue Events generieren. 'social': Beziehungen anpassen. 'scoring': Scoring-Adjustments. 'story': Nebenplots generieren.</p></td>
</tr>
<tr class="odd">
<td><strong>Rückgabe</strong></td>
<td>string (fertiger Prompt-Text)</td>
</tr>
<tr class="even">
<td colspan="2">Nicht aktiv genutzt im Command-Layer</td>
</tr>
</tbody>
</table>

|                                                                                                                                        |                                                        |
|----------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| **buildPromptPack(exportObj)** → Array von { title, content } – mehrere fertige Prompts                                                |                                                        |
| buildPromptPack(exportObj: JanusExportV2): { title: string, content: string }\[\]                                                      |                                                        |
| Generiert ein vollständiges Prompt-Paket mit mehreren Anwendungsfällen. Wird in downloadKIPackage() als 02_PROMPTS_CURRENT/ eingefügt. |                                                        |
| **Rückgabe**                                                                                                                           | Array von { title, content } – mehrere fertige Prompts |
| Nicht aktiv genutzt im Command-Layer                                                                                                   |                                                        |

**7a.4 JanusKIDiff (optional) ⚠ FEHLT**

|                                                                                         |
|-----------------------------------------------------------------------------------------|
| **Klasse: JanusKIDiff · Ziel-Pfad: ki/diff.js · STATUS: OPTIONAL, NICHT IMPLEMENTIERT** |

|                                                                                                                                                                                              |                                          |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| **describePatchPlan(patchPlan)** → string (menschenlesbare Zusammenfassung)                                                                                                                  |                                          |
| describePatchPlan(patchPlan: JanusKIPatchPlan): string                                                                                                                                       |                                          |
| Konvertiert einen Patchplan in lesbaren Deutsch-Text für die Import-Vorschau. Beispiel: 'Slot Montag/Zeitslot-3 → Lektion MAGIE_GRUNDLAGEN entfernt. Neue Lektion ALCHIMIE_EIN hinzugefügt.' |                                          |
| **Rückgabe**                                                                                                                                                                                 | string (menschenlesbare Zusammenfassung) |
| Nicht aktiv genutzt im Command-Layer                                                                                                                                                         |                                          |

|                                                         |
|---------------------------------------------------------|
| **PHASE – ─ GEPLANTE HOOKS – NOCH NICHT IMPLEMENTIERT** |

Folgende Hooks sind aus der Roadmap oder dem Quest/Event-System implizit als notwendig ableitbar, wurden aber noch nicht in den Code aufgenommen:

| **Hook-Name**               | **Soll gefeuert von**                 | **Geplanter Payload**           | **Geplanter Listener** | **Status** |
|-----------------------------|---------------------------------------|---------------------------------|------------------------|------------|
| **janus7EventTriggered**    | event-engine.js (triggerEvent)        | { eventId, actorId, effects }   | Atmosphere (Auto-Mood) | **Fehlt**  |
| **janus7ChronicleUpdated**  | story.js (addChronicleEntry)          | { entry, threadId? }            | UI (ChronicleView)     | **Fehlt**  |
| **janus7ThreadOpened**      | story.js (openThread)                 | { threadId, title, priority }   | UI (Control Panel)     | **Fehlt**  |
| **janus7ThreadClosed**      | story.js (closeThread)                | { threadId, resolution }        | UI (Control Panel)     | **Fehlt**  |
| **janus7LessonUpdated**     | lessons.js (upsertLesson)             | { lessonId, lessonDef, source } | UI (Academy Overview)  | **Fehlt**  |
| **janus7KIImportApplied**   | ki/importer.js (applyPatchPlan)       | { changes, stats }              | UI (Notification)      | **Fehlt**  |
| **janus7KIExportReady**     | ki/exporter.js (createExportSnapshot) | { exportObj, format }           | UI (Download-Button)   | **Fehlt**  |
| **janus7ReputationChanged** | social.js (adjustReputation)          | { scopeId, oldValue, newValue } | UI (Social View)       | **Fehlt**  |

Legende Status: **Fehlt** = Hook ist aus der Roadmap ableitbar, weder gefeuert noch registriert.

|                                             |
|---------------------------------------------|
| **PHASE 7 ─ KI-INTEGRATION (getAiContext)** |

<table>
<colgroup>
<col style="width: 17%" />
<col style="width: 82%" />
</colgroup>
<tbody>
<tr class="odd">
<td colspan="2"><strong>getAiContext(opts?)</strong> → AiContext { schemaVersion, moduleId, moduleVersion, date, state, requested, module }</td>
</tr>
<tr class="even">
<td colspan="2">getAiContext(opts?: { includeDirector?: boolean, includeDiagnostics?: boolean }): AiContext</td>
</tr>
<tr class="odd">
<td colspan="2">Erstellt einen Kontext-Snapshot für den KI-Roundtrip (Phase 7). Enthält Modul-Version, aktuellen Zeitpunkt und State-Export. Optional: Director-Felder (activeQuest, activeEvent, flags).</td>
</tr>
<tr class="even">
<td colspan="2"><strong>⚠ BUG / ACHTUNG:</strong> B-02: state.export() existiert nicht auf JanusStateCore. Der Aufruf schlägt immer still fehl und gibt { error: 'state.export failed' } zurück. Fix: Ersetzen durch _self?.core?.io?.exportState?.()</td>
</tr>
<tr class="odd">
<td><strong>Parameter</strong></td>
<td><p><strong>opts.includeDirector</strong> – boolean Fügt Director-Felder (quest.active, event.active, flags) hinzu.</p>
<p><strong>opts.includeDiagnostics</strong> – boolean Behält Diagnostics im State-Export.</p></td>
</tr>
<tr class="even">
<td><strong>Rückgabe</strong></td>
<td>AiContext { schemaVersion, moduleId, moduleVersion, date, state, requested, module }</td>
</tr>
<tr class="odd">
<td><strong>Hinweise</strong></td>
<td><p>• Verfügbar als game.janus7.getAiContext().</p>
<p>• Phase 7 ist noch ein Stub – kein vollständiger Export/Import-Roundtrip implementiert.</p>
<p>• Kein JANUS_EXPORT_V2 oder JANUS_KI_RESPONSE_V1 vorhanden.</p></td>
</tr>
<tr class="even">
<td><strong>Verwendet in</strong></td>
<td><p><strong>Test-Suite</strong> → Phase-7 Smoke-Test prüft Existenz und schemaVersion</p>
<p><strong>game.janus7.getAiContext()</strong> → Direkt aus Makros aufrufbar</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Dokumentation generiert aus:</strong> janus7_v0_9_0_clean.zip</p>
<p>Methoden ohne 'Verwendet in'-Eintrag sind im aktiven Command-Layer nicht genutzt (gelb markiert).</p>
<p>Bugs sind im Text mit ⚠ markiert und entsprechen den Befunden aus der Code-Analyse (JANUS7_Code_Analyse.docx).</p>
<p><strong>Fehlende APIs (Roadmap-Lücken) sind in Abschnitten 4c / 6b / 7a dokumentiert und mit ⚠ FEHLT markiert.</strong></p></td>
</tr>
</tbody>
</table>
