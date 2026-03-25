import { moduleAssetPath } from '../../../common.js';
/**
 * @file core/test/tests/p3/P3_TC_SOCIAL_01__personae_social_sync.test.js
 * @module janus7/test
 * @phase 3/4
 */

export default {
  id: 'P3-TC-SOCIAL-01',
  phase: 3,
  title: 'PersonaeDramatis Social Sync: socialContact.level ↔ JanusSocialEngine',
  prio: 'P1',
  type: 'M',
  kind: 'manual',
  async run(ctx) {
    const hasPages = globalThis.game?.journal?.contents?.some?.(
      j => j.pages?.contents?.some?.(p => p.type === 'dsapersonaedramatis')
    ) ?? false;
    if (!hasPages) {
      return { ok: true, status: 'SKIP', summary: 'SKIP: Keine dsapersonaedramatis-Pages im Journal vorhanden' };
    }
    return { ok: true, status: 'PASS', summary: 'Prereq OK — manuell ausführen' };
  },


  requires: [
    'DSA5-System aktiv',
    'Journal mit dsapersonaedramatis-Page vorhanden',
    'GM-Rechte (für Mutations)',
    'game.janus7.academy.social initialisiert',
  ],

  snippets: [
    {
      title: '1. Konvertierungs-Funktionen Unit-Test',
      code: `
// Konvertierungsfunktionen via SocialSync-Service (öffentliche API):
const syncService = game.janus7.academy.socialSync;
const social = game.janus7.academy.social;

// Attitude-Bereich testen via adjustAttitude + getAttitude
const testFrom = 'NPC_SEQUIN';
const testTo   = 'NPC_IRIAN_DAMARTIAN';
const before   = social.getAttitude(testFrom, testTo) ?? 0;

// Klemmung auf [-100, 100] prüfen
await social.adjustAttitude(testFrom, testTo, 200);
const clamped = social.getAttitude(testFrom, testTo);
console.assert(clamped <= 100, 'Attitude max 100 (clamped)');

// Zurücksetzen
await social.adjustAttitude(testFrom, testTo, before - clamped);

// SocialSync API vorhanden
console.assert(typeof syncService?.pushAll === 'function', 'pushAll vorhanden');
console.assert(typeof syncService?.pullAll === 'function', 'pullAll vorhanden');
console.log('✅ Social API OK');
      `,
    },
    {
      title: '2. PersonaeDramatis-Page finden und Kontakte lesen',
      code: `
const bridge = game.janus7.bridge.dsa5;
const journalName = 'Akademie'; // Journalnamen anpassen

const contacts = bridge.readAllPersonaeContacts(journalName);
console.log('PersonaeDramatis-Kontakte:', JSON.stringify(contacts, null, 2));

// Oder direkt:
const page = bridge.personaeSocial.findPage(journalName);
if (page) {
  console.log('Personae:', Object.keys(page.system?.personae ?? {}));
} else {
  console.warn('Keine PersonaeDramatis-Page gefunden. Journal-Namen prüfen.');
}
      `,
    },
    {
      title: '3. socialContact.level setzen (direkt)',
      code: `
// Setzt socialContact.level für NPC_IRIAN → Spieler-Actor
const bridge = game.janus7.bridge.dsa5;
const journalName = 'Akademie';

const playerActor = game.actors.getName('Spieler'); // Namen anpassen
if (!playerActor) { console.error('Spieler-Actor nicht gefunden'); }

const personaKey = bridge.findPersonaKeyForActor(journalName, game.actors.getName('IRIAN DAMARTIAN')?.uuid);
console.log('PersonaKey für Irian:', personaKey);

if (personaKey && playerActor) {
  await bridge.setPersonaSocialLevel(journalName, personaKey, playerActor.uuid, 6);
  console.log('socialContact.level auf 6 (Sympathie) gesetzt');
}
      `,
    },
    {
      title: '4. Social Seeds laden',
      code: `
// Initialisiert alle NPC-Beziehungen aus social-seeds.json in JanusSocialEngine
const socialEngine = game.janus7.academy.social;

const seedsResponse = await fetch(moduleAssetPath('data/academy/social-seeds.json'));
const seeds = await seedsResponse.json();

let loaded = 0;
for (const rel of seeds.relationships) {
  await socialEngine.setAttitude(rel.fromId, rel.toId, rel.attitude, {
    tags: rel.tags,
    meta: { note: rel.note, source: 'seeds' }
  });
  loaded++;
}
console.log(\`✅ \${loaded} initiale Beziehungen geladen\`);
console.table(
  socialEngine.listAllRelationships().map(r => ({
    von: r.fromId.replace('NPC_',''),
    zu:  r.toId.replace('NPC_',''),
    wert: r.value,
    tags: r.tags.join(', ')
  }))
);
      `,
    },
    {
      title: '5. Social Sync Service — Push JANUS7 → Personae',
      code: `
const syncService = game.janus7.academy.socialSync;
if (!syncService) { console.error('SocialSync nicht initialisiert'); }

// DryRun: Vorschau
const preview = await syncService.pushAll({ dryRun: true });
console.log('Vorschau:', preview);

// Vollständig pushen
const result = await syncService.pushAll({ dryRun: false });
console.log(\`Push: \${result.pushed} geschrieben, \${result.skipped} übersprungen\`);
// → PersonaeDramatis-Page sollte jetzt socialContact.level-Werte haben
      `,
    },
    {
      title: '6. Pull — Personae → JANUS7',
      code: `
const syncService = game.janus7.academy.socialSync;

// Import ohne Überschreiben
const result = await syncService.pullAll({ overwrite: false, dryRun: false });
console.log(\`Pull: \${result.imported} importiert, \${result.skipped} übersprungen\`);
      `,
    },
    {
      title: '7. Reaktiver Sync — janus7RelationChanged → auto-push',
      code: `
// Nach register(): jede adjustAttitude() pusht automatisch nach Personae
const social  = game.janus7.academy.social;
const sync    = game.janus7.academy.socialSync;
sync.register(); // falls noch nicht registriert

// Attitude anpassen → Hook → automatischer Push
await social.adjustAttitude('NPC_SEQUIN', 'NPC_IRIAN_DAMARTIAN', -10);
// → In PersonaeDramatis sollte der Eintrag jetzt Level 1-2 zeigen
console.log('Reaktiver Sync getriggert — PersonaeDramatis prüfen');
      `,
    },
    {
      title: '8. Personae Level-Skala via Bridge prüfen',
      code: `
// Social-Levels via public API testen (DSA5_SOCIAL_LEVELS ist intern):
const bridge = game.janus7.bridge.dsa5;
const social = game.janus7.academy.social;

// Beziehungswerte und Klassifizierung testen
const relationships = social.listAllRelationships?.() ?? [];
console.log('Aktive Beziehungen:', relationships.length);

// Attitude-Bereichsgrenzen testen
const testNpcs = ['NPC_SEQUIN', 'NPC_IRIAN_DAMARTIAN'];
const rel = social.getAttitude?.(testNpcs[0], testNpcs[1]);
console.log(\`Beispiel-Haltung (\${testNpcs[0]} → \${testNpcs[1]}): \${rel}\`);
console.assert(rel === null || (typeof rel === 'number' && rel >= -100 && rel <= 100),
  'Haltung im Bereich [-100, 100] oder null');
console.log('✅ Social Skala API OK');
      `,
    },
  ],

  validation: [
    'social.getAttitude(fromId, toId) liefert Zahl in [-100, 100] oder null',
    'social.listAllRelationships() liefert Array',
    'PersonaeDramatis-Page: socialContact[slug].level wird korrekt gelesen/geschrieben',
    'batchSetContactLevels: ein einziges page.update() für alle Änderungen',
    'Reaktiver Sync: janus7RelationChanged → pushOne() → setContactLevel()',
    'social-seeds.json: initiale Beziehungen lore-konsistent vorhanden',
    'pullAll: import ohne overwrite überspringt bestehende JANUS7-Werte',
  ],
};
