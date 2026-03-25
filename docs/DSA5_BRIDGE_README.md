# DSA5 Bridge — Übersicht

**Phase:** 3
**Status:** ✅ Produktionsreif
**Datei:** `bridge/dsa5/index.js`
**Version:** 0.3.9+

---

## Was ist die DSA5 Bridge?

Die DSA5 Bridge ist die **Abstraktionsschicht** zwischen JANUS7 und dem Foundry-VTT-System `dsa5` (Das Schwarze Auge 5). Sie kapselt alle systemspezifischen Interna (Actor-Zugriffe, Item-Management, Proben, Compendia) hinter einer stabilen, versionierten API.

**Kernprinzip:** JANUS7-Code darf niemals direkt auf `game.dsa5.*`, `actor.system.*` oder DSA5-interne Strukturen zugreifen. Ausnahmslos über die Bridge.

---

## Warum eine Bridge?

Das DSA5-System entwickelt sich aktiv weiter. Ohne Abstraktionsschicht würde jedes DSA5-Update potenziell den gesamten JANUS7-Code brechen. Die Bridge:

- isoliert DSA5-Breaking-Changes auf eine einzige Datei
- ermöglicht Mock-basierte Tests ohne laufendes Foundry
- bietet eine saubere, typisierte API für JANUS7-Engines
- protokolliert Capability-Gaps statt stumm zu versagen

---

## Verfügbarkeit prüfen

```javascript
const bridge = game.janus7.dsa5;

// Ist DSA5 überhaupt geladen?
if (!bridge.available) {
  ui.notifications.warn('DSA5 nicht verfügbar.');
  return;
}

// Capabilities abrufen (nach init())
const caps = bridge.capabilities;
console.log(caps.systemVersion);      // z.B. "7.5.0"
console.log(caps.hasSetupSkill);      // true/false
console.log(caps.hasTimedConditions); // true/false

// Einzelne Capability prüfen
if (bridge.hasCapability('hasFatePoints')) {
  await bridge.fate.useOnRoll(actor, roll);
}
```

---

## Sub-Bridges (Übersicht)

| Property | Klasse | Zweck |
|---|---|---|
| `bridge.resolver` | `DSA5Resolver` | UUID/Name → Dokument |
| `bridge.rolls` | `DSA5RollApi` | Proben (Talente, Eigenschaften, Zauber) |
| `bridge.actors` | `DSA5ActorBridge` | Actor-Zugriff und -Auflösung |
| `bridge.items` | `DSA5ItemBridge` | Item-Management |
| `bridge.packs` | `DSA5PacksIndex` | Compendium-Zugriff |
| `bridge.conditions` | `DSA5ConditionBridge` | Zustände anlegen/entfernen |
| `bridge.attributes` | `DSA5AttributeReader` | Grundeigenschaften lesen |
| `bridge.calendarSync` | `DSA5CalendarSync` | DSA5-Kalender ↔ JANUS7 |
| `bridge.journal` | `DSA5JournalBridge` | Journal-Einträge |
| `bridge.damage` | `DSA5DamageBridge` | Schaden anwenden |
| `bridge.itemFactory` | `DSA5ItemFactoryBridge` | Items aus Compendium erzeugen |
| `bridge.library` | `AcademyLibraryService` | Bibliotheks-Compendium |
| `bridge.groupCheck` | `DSA5GroupCheckBridge` | Gruppenproben |
| `bridge.tradition` | `DSA5TraditionBridge` | Magietradition lesen |
| `bridge.timedCond` | `DSA5TimedConditionBridge` | Zeitlich begrenzte Zustände |
| `bridge.postRoll` | `DSA5PostRollBuffBridge` | Post-Roll-Buffs |
| `bridge.personae` | `DSA5PersonaeSocialBridge` | Personae-Dramatis-Social |
| `bridge.advancement` | `DSA5AdvancementBridge` | Steigerungskosten |
| `bridge.fate` | `DSA5FateBridge` | Schicksal / S-Chips |
| `bridge.moon` | `DSA5MoonBridge` | Mondphasen-Modifikatoren |
| `bridge.hooks` | `DSA5HooksBridge` | DSA5-Roll-Hooks |

---

## Verwandte Dokumente

- [DSA5_BRIDGE_API.md](./DSA5_BRIDGE_API.md) — Vollständige API-Referenz
- [DSA5_BRIDGE_USAGE_GUIDE.md](./DSA5_BRIDGE_USAGE_GUIDE.md) — Praxisbeispiele
- [DSA5_BRIDGE_ARCHITECTURE.md](./DSA5_BRIDGE_ARCHITECTURE.md) — Architektur-Entscheidungen
- [DSA5_BRIDGE_TROUBLESHOOTING.md](./DSA5_BRIDGE_TROUBLESHOOTING.md) — Fehlersuche
- [PHASE3_PRODUCTION_CERTIFICATE.md](./PHASE3_PRODUCTION_CERTIFICATE.md) — Abnahme-Zertifikat
