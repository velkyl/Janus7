# DSA5 Bridge — Fehlersuche

---

## `DSA5NotAvailableError` — DSA5 nicht geladen

**Symptom:** `bridge.available === false`, alle Proben schlagen fehl.

**Ursachen:**
1. Das Modul wird ohne DSA5-System geladen (z.B. in einer leeren Testwelt)
2. DSA5-System-Version < `7.0.0`
3. Foundry < v13

**Prüfung:**
```javascript
console.log(game.janus7.dsa5.capabilities);
// { systemAvailable: false, systemId: 'dsa5', ... }
```

**Lösung:** DSA5 installieren und als aktives System setzen. JANUS7 läuft ohne Bridge im degraded mode weiter — Akademie-Daten und State sind weiterhin verfügbar.

---

## `DSA5ResolveError` — Actor/Item nicht gefunden

**Symptom:** `await bridge.actors.resolveActor('NPC_XYZ')` wirft Fehler.

**Ursachen:**
1. Der JANUS-NPC-Key ist noch nicht mit einer Foundry-Actor-UUID verknüpft
2. Der Actor existiert nicht in der Welt
3. UUID ist veraltet (Actor wurde gelöscht/neu erstellt)

**Prüfung:**
```javascript
// Verknüpfungen anzeigen
console.log(game.janus7.core.state.get('foundryLinks.npcs'));
// z.B. { NPC_KOSMAAR: 'Actor.abc123', ... }
```

**Lösung:**
```javascript
// UUID manuell setzen (als GM)
await game.janus7.director.set(
  'foundryLinks.npcs.NPC_KOSMAAR',
  'Actor.deinEchteUuid'
);
```

---

## Capabilities `null` nach Modulstart

**Symptom:** `bridge.capabilities === null` obwohl DSA5 lädt.

**Ursache:** `bridge.init()` wurde noch nicht aufgerufen oder ist fehlgeschlagen.

**Prüfung:**
```javascript
// Foundry-Konsole
game.janus7.dsa5.capabilities; // null?
```

**Lösung:** JANUS7-Modul deaktivieren und reaktivieren. Das triggert `janus7Ready`, welches `bridge.init()` aufruft. Alternativ:
```javascript
await game.janus7.dsa5.init(); // manuell
```

---

## Probe läuft, aber `result.success === null`

**Symptom:** `requestSkillCheck()` wirft keinen Fehler, `success` ist `null`.

**Ursache:** Das DSA5-Ergebnisobjekt hat eine unbekannte Struktur — die Bridge konnte es nicht normalisieren.

**Prüfung:**
```javascript
console.log(result.raw); // Original-Ergebnis von DSA5
```

**Lösung:** In der Datei `bridge/dsa5/rolls.js` die `normalizeRollResult()`-Funktion um das neue Ergebnisformat erweitern. Bitte Issue anlegen mit dem `raw`-Wert.

---

## Timed Conditions werden nicht entfernt

**Symptom:** `applyTimedAcademyCondition()` legt den Zustand an, er bleibt jedoch dauerhaft.

**Ursache:** DSA5 `actor.addTimedCondition` ist nicht verfügbar (`hasTimedConditions === false`).

**Prüfung:**
```javascript
game.janus7.dsa5.hasCapability('hasTimedConditions'); // false?
```

**Lösung:** DSA5 auf Version ≥ 7.0.0 aktualisieren. Als Workaround kann der Zustand manuell nach X Tagen via `removeCondition()` entfernt werden.

---

## Mondphasen-Modifikatoren laden nicht

**Symptom:** `bridge.moon.getModifier(...)` liefert immer `0`.

**Ursache:** `data/academy/moon-modifiers.json` konnte nicht geladen werden.

**Prüfung:**
```javascript
// Foundry-Netzwerk-Tab → moon-modifiers.json Request prüfen
// Oder:
fetch('/modules/Janus7/data/academy/moon-modifiers.json')
  .then(r => r.json()).then(console.log);
```

**Lösung:** Sicherstellen, dass `data/academy/moon-modifiers.json` im Modul-Verzeichnis vorhanden und valides JSON ist.

---

## Hook-Leak-Warnung im Log

**Symptom:** Log zeigt `[JANUS7] Duplicate hook registration` oder Hooks feuern doppelt.

**Ursache:** `bridge/dsa5/moon.js` oder `hooks-bridge.js` wurden mehrfach initialisiert (Hot-Reload oder Modul-Neustart ohne Foundry-Reload).

**Lösung:** `_cleanupCoreHooks()` wird bei erneutem Modulstart in `janus.mjs` aufgerufen und bereinigt alle registrierten Hooks. Bei persistentem Problem: Foundry-Seite komplett neu laden (F5).

---

## Diagnose-Report erzeugen

```javascript
// Vollständiger DSA5-Bridge-Report:
const report = await game.janus7.dsa5.runDiagnostics?.()
  ?? { ok: false, checks: [] };

report.checks.forEach(c => {
  const icon = c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
  console.log(`${icon} [${c.id}] ${c.message}`);
});
```
