# JANUS7 — Scene Regions Bridge: GM-Workflow

**Datei:** `bridges/foundry/SceneRegionsBridge.mjs`  
**Phase:** Block A / Services  
**Zweck:** Automatische Location-Erkennung wenn ein Token in eine Foundry-Region betritt.

---

## Überblick

Wenn der `SceneRegionsBridge` aktiv ist, reagiert JANUS7 automatisch auf `tokenEnter`-Events in Foundry-Regionen und setzt `academy.currentLocationId` im State — ohne manuelle GM-Interaktion.

**Voraussetzung:** Foundry VTT v12+ (Scene Regions API). Der Bridge wird bei `janus7Ready` registriert.

---

## Auflösungs-Reihenfolge (Priorität)

Für jede Region, die ein Token betritt, wird die Location in dieser Reihenfolge bestimmt:

### 1. Explizites Flag (Empfohlen)

```js
// Einmalig in einer Makro-Konsole oder via Foundry-Entwicklertools:
await region.setFlag('janus7', 'locationId', 'LOC_GROSSE_AULA');
```

Dies ist der direkteste Weg und hat oberste Priorität.

---

### 2. Region-Name beginnt mit `LOC_`

Wenn der Foundry-Region-Name exakt einer JANUS7-Location-ID entspricht:

```
Region-Name: LOC_HAUPTBIBLIOTHEK_3_EBENEN  →  Location: LOC_HAUPTBIBLIOTHEK_3_EBENEN
```

Kein Code nötig — Region in Foundry benennen, fertig.

---

### 3. sceneKey-Reverse-Lookup (Automatisch)

Wenn Region-Name dem `sceneKey` aus `locations.json` entspricht:

```
Region-Name: scene_library_main  →  Location: LOC_HAUPTBIBLIOTHEK_3_EBENEN
```

---

## Alle Locations & sceneKeys

| Location-ID | Name | sceneKey |
|---|---|---|
| `LOC_HAUPTEINGANG_EMPFANGSHALLE` | Haupteingang & Empfangshalle | `scene_main_entrance` |
| `LOC_INNENHOF_AKADEMIEHOF` | Innenhof (Akademiehof) | `scene_courtyard` |
| `LOC_GROSSE_AULA` | Große Aula | `scene_great_hall` |
| `LOC_SPEISESAAL` | Speisesaal | `scene_dining_hall` |
| `LOC_CLASSROOM_THEORY_EAST` | Theoriesaal Ostflügel | `scene_theory_east` |
| `LOC_THEORIESAAL_WESTFLUEGEL_ARITHMETIK` | Theoriesaal Westflügel (Arithmetik) | `scene_theory_west` |
| `LOC_PRAKTISCHER_UEBUNGSRAUM_KAMPFZAUBER` | Prakt. Übungsraum (Kampfzauber) | `scene_practice_hall` |
| `LOC_ALCHEMIE_LABOR_TURM_DER_TAUSEND_TRAENKE` | Alchemie-Labor | `scene_alchemy_lab` |
| `LOC_STERNWARTE_DACHTURM` | Sternwarte (Dachturm) | `scene_observatory` |
| `LOC_HAUPTBIBLIOTHEK_3_EBENEN` | Hauptbibliothek (3 Ebenen) | `scene_library_main` |
| `LOC_VERBOTENE_SEKTION_KELLERGEWOELBE` | Verbotene Sektion (Kellergewölbe) | `scene_library_forbidden` |
| `LOC_ARCHIV_KARTENKAMMER` | Archiv & Kartenkammer | `scene_archive` |
| `LOC_LESEZIMMER_STUDIERSTUBEN` | Lesezimmer & Studierstuben | `scene_study_rooms` |
| `LOC_SCHLAFSAAL_ELEVIUM_1_3_JAHR` | Schlafsaal Elevium (1–3 Jahr) | `scene_dorm_elevium` |
| `LOC_MAGISTER_QUARTIERE` | Magister-Quartiere | `scene_magister_quarters` |
| `LOC_MEDITATIONSRAUM` | Meditationsraum | `scene_meditation` |
| `LOC_HEILZIMMER_KRANKENSTATION` | Heilzimmer / Krankenstation | `scene_infirmary` |
| `LOC_RITUALKAMMER` | Ritualkammer | `scene_ritual_chamber` |
| `LOC_WERKSTATT_HJALGAR` | Werkstatt (Hjalgar) | `scene_workshop` |
| `LOC_GEHEIMGAENGE` | Geheimgänge | `scene_secret_passages` |
| `LOC_PODIUMSGEWOELBE_FINALE` | Podiumsgewölbe (Finale) | `scene_podium_vault` |
| `LOC_AKADEMIEGARTEN_KRAEUTER` | Akademiegarten (Kräuter) | `scene_herb_garden` |
| `LOC_UEBUNGSPLATZ_IM_FREIEN` | Übungsplatz im Freien | `scene_training_grounds` |
| `LOC_STADTTOR_ANSCHLUSS_PUNIN` | Stadttor-Anschluss (Punin) | `scene_city_gate` |

---

## Setup-Workflows

### Workflow A: Schnellstart (Region-Name = Location-ID)

Für neue Scenes ohne bestehende Regionen:

1. Scene öffnen → **Scene bearbeiten** → Tab **Regionen**
2. Region erstellen, Name = exakte Location-ID (z. B. `LOC_GROSSE_AULA`)
3. Verhalten `Subscene` oder leer — kein besonderes Behavior nötig
4. Token in die Region bewegen → Location wird automatisch gesetzt

**Vorteil:** Kein Makro, kein Flag-Setup. Nachteil: Wenig sprechende Namen in Foundry.

---

### Workflow B: sceneKey-Mapping (Empfohlen für bestehende Regionen)

Wenn Regionen bereits sprechende Namen haben (z. B. `Bibliothek`):

1. Foundry-Entwicklerkonsole öffnen (F12)
2. Region-Objekt ermitteln:
   ```js
   const scene = canvas.scene;
   const region = scene.regions.getName('Bibliothek');
   ```
3. Flag setzen:
   ```js
   await region.setFlag('janus7', 'locationId', 'LOC_HAUPTBIBLIOTHEK_3_EBENEN');
   ```
4. Verifizieren:
   ```js
   region.getFlag('janus7', 'locationId'); // 'LOC_HAUPTBIBLIOTHEK_3_EBENEN'
   ```

---

### Workflow C: Bulk-Setup via Makro

Für Scenes mit vielen Regionen empfiehlt sich ein einmaliges Setup-Makro:

```js
// Makro: JANUS7 Region-Setup
// Passt RegionName → LocationId an — einmalig ausführen, dann löschen.

const MAPPINGS = {
  'Große Aula':       'LOC_GROSSE_AULA',
  'Bibliothek':       'LOC_HAUPTBIBLIOTHEK_3_EBENEN',
  'Speisesaal':       'LOC_SPEISESAAL',
  'Meditationsraum':  'LOC_MEDITATIONSRAUM',
  'Labor':            'LOC_ALCHEMIE_LABOR_TURM_DER_TAUSEND_TRAENKE',
  // ... weitere nach Bedarf
};

const scene = canvas.scene;
let count = 0;
for (const [regionName, locationId] of Object.entries(MAPPINGS)) {
  const region = scene.regions.getName(regionName);
  if (!region) { console.warn(`Region nicht gefunden: ${regionName}`); continue; }
  await region.setFlag('janus7', 'locationId', locationId);
  console.log(`✓ ${regionName} → ${locationId}`);
  count++;
}
console.log(`Setup abgeschlossen: ${count} Regionen konfiguriert.`);
```

---

## Verifikation

Nach dem Setup aktuelle Location prüfen:

```js
// Browser-Konsole oder Makro
game.janus7.core.state.getPath?.('academy.currentLocationId');
// → 'LOC_GROSSE_AULA' (o.ä.)
```

Oder via Chat-CLI:
```
/janus lesson.status
```

---

## Bekannte Einschränkungen

- **Eine aktive Location pro Token:** Betritt ein Token mehrere Regionen gleichzeitig, gewinnt die zuerst registrierte. Der Bridge ist idempotent für dieselbe Location.
- **Exit-Logik:** Verlässt ein Token eine Region, wird die Location nur gelöscht wenn kein anderes Token derselben Location noch aktiv ist.
- **GM-only State-Mutation:** Nur der GM-Client schreibt in den JANUS7-State. Player-Tokens triggern den Hook, aber die Mutation passiert nur wenn `game.user.isGM === true`.
- **Deaktivierung:** `engine._sceneRegionsBridge.unregister()` in der Konsole.

---

## Hook-Integration

Jede Location-Änderung feuert `janus7.location.changed`:

```js
Hooks.on('janus7.location.changed', ({ locationId, location, source }) => {
  console.log(`Location: ${locationId} (${location?.name}) via ${source}`);
});
```

Alias: `janus7LocationChanged` (Legacy).

---

*Zuletzt aktualisiert: v0.9.9.32 (Block A + Services)*
