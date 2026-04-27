/**
 * @file phase7/ki/prompts.js
 * This module contains prompt templates for various large language
 * models (LLMs) used during Phase 7 of JANUS7. Prompts guide the
 * model in producing responses adhering to the JANUS_KI_RESPONSE_V1
 * schema. The templates here are intentionally minimal and should be
 * customised further to provide campaign context, guidelines and
 * examples. Consult docs/KI_HANDOVER.md for additional design
 * principles around prompt engineering.
 */

/**
 * Critical ID and value rules shared across all prompts.
 * Prevents LLMs from inventing IDs not present in the state and from
 * writing object values where plain numbers are required.
 * Root cause: world analysis showed every KI import writing
 * {circleA: {score:10}} instead of {salamander: 5} — a fabricated ID
 * with an object value, neither of which matches the scoring schema.
 * @private
 */
const ID_RULES = [
  'CRITICAL ID RULE: All IDs in path values (circle IDs, NPC IDs, actor IDs, location IDs) ',
  'MUST be copied verbatim from the exportBundle. NEVER invent or guess IDs. ',
  'To update a circle score, read the circle ID from exportBundle.campaign_state.academy.scoring.circles. ',
  'Example: if scoring.circles is {"salamander": 5}, use path "circles.salamander", NOT "circles.circleA". ',
  'CRITICAL VALUE RULE: scoring patch values MUST be plain numbers (e.g. 15), never objects like {score:15}. ',
].join('');

const KNOWLEDGE_BRIDGE_RULES = [
  'KNOWLEDGE BRIDGE AVAILABLE: You now have access to semantic search, world actions, and external tools. ',
  'If you need to find an entity (NPC, item, spell), use search(domain, query). ',
  'To interact with the world, use executeAction(type, uuid, params). ',
  'EXTERNAL TOOLS: You can query external databases or run scripts. ',
  '- external_sql_query(db, query, params): Use this for advanced campaign data (e.g. from Keeper Helper). ',
  '- external_python_script(script, args): Use this for specialized data processing. ',
  'Supported actions: "spawnActor", "openDocument", "rollTable", "playSound". ',
  'You can moderate academic lessons using these tools to spawn teachers or play atmospheric sounds.'
].join('');

export const Prompts = {
  /**
   * Default prompt for ChatGPT. Instructs the model to produce a
   * JSON object conforming to JANUS_KI_RESPONSE_V1.
   */
  chatgpt: ({ instructions = '' } = {}) => {
    return [
      'You are an AI assistant for the JANUS7 campaign. You will receive an exportBundle object containing the current campaign state. ',
      'Analyse the state and respond with a JSON object that exactly matches the JANUS_KI_RESPONSE_V1 format. ',
      'Do not include any properties other than version, sourceExportMeta, changes and notes. ',
      'Populate sourceExportMeta with the meta section from the exportBundle. ',
      'Populate changes with arrays of update objects for calendarUpdates, lessonUpdates, eventUpdates, scoringAdjustments, socialAdjustments, and journalEntries. ',
      ID_RULES,
      KNOWLEDGE_BRIDGE_RULES,
      instructions,
      'Return only valid JSON with no additional commentary.'
    ].join('');
  },

  /**
   * Prompt for Claude.
   */
  claude: ({ instructions = '' } = {}) => {
    return [
      'As an AI orchestrator for JANUS7, generate a JSON object conforming to JANUS_KI_RESPONSE_V1. ',
      'You are given an exportBundle describing the current state. Use it to propose updates. ',
      'Fill sourceExportMeta with exportBundle.meta. Populate changes arrays with objects defining state changes. ',
      ID_RULES,
      KNOWLEDGE_BRIDGE_RULES,
      instructions,
      'Respond only with JSON.'
    ].join('');
  },

  /**
   * Prompt for Gemini.
   */
  gemini: ({ instructions = '' } = {}) => {
    return [
      'Given the following exportBundle, craft a JANUS_KI_RESPONSE_V1 JSON response. ',
      'Adhere strictly to the schema: include version, sourceExportMeta, changes, and notes only. ',
      'Use exportBundle.meta for sourceExportMeta. Enumerate proposed changes in the appropriate arrays within changes. ',
      ID_RULES,
      KNOWLEDGE_BRIDGE_RULES,
      instructions,
      'Output must be valid JSON and nothing else.'
    ].join('');
  },

  /**
   * Real-time enrichment templates for different types.
   */
  ENRICHMENT: {
    event: ({ text, meta }) => `Du bist der Chronist der Janus-Akademie. Beschreibe das folgende Ereignis für eine "Das Schwarze Auge" (DSA5) Kampagne.
Nutze eine atmosphärische, mittelalterliche Sprache, die den mystischen Flair einer Magierakademie in Aventurien einfängt.
Originaler Text: "${text}"
Metadaten: ${JSON.stringify(meta)}
Antworte in elegantem Deutsch. Achte auf Details wie Kerzenschein, den Geruch von Pergament oder das ferne Murmeln von Zauberformeln.`,
    
    situation: ({ text, meta }) => `Beschreibe die folgende Situation in der Akademie. Biete dem Spielleiter sensorische Details (Hören, Riechen, Tasten) und schlage zwei mögliche Handlungsoptionen für die Spieler vor.
Original: "${text}"
Kontext: ${JSON.stringify(meta)}
Stil: Immersiv, aventurisch, geheimnisvoll.`,
    
    visual: ({ text, meta }) => `Generiere einen hochdetaillierten Visual Prompt für einen KI-Bildgenerator (Imagen/Midjourney).
Thema: "${text}"
Kontext: ${JSON.stringify(meta)}
Ästhetik: Aventurisch (DSA), Fokus auf dramatische Lichtsetzung (Chiaroscuro), Staubpartikel im Licht, antike Artefakte. Vermeide generische High-Fantasy; nutze bodenständige, aber magisch durchsetzte Details.`,
    
    dialogue: ({ text, meta }) => `Generiere einen Dialog-Schnipsel für einen NSC der Akademie.
NSC-Profil: ${JSON.stringify(meta.npc)}
Beziehung zum Spieler: ${meta.relationship}
Situation: ${text}
Der NSC sollte seinem Stand und seiner Persönlichkeit entsprechend sprechen (z.B. arrogant als Hochmagier, eifrig als Adept). Sprache: Deutsch.`,
    
    consequences: ({ action, state }) => `Die Spieler haben folgende Aktion durchgeführt: "${action}".
Basierend auf dem aktuellen Zustand der Akademie (${JSON.stringify(state)}), schlage drei filmische und regeltechnisch relevante Konsequenzen vor.
Eine Konsequenz sollte positiv, eine neutral und eine gefährlich sein.
Antworte auf Deutsch mit "Option 1: [Titel]", "Option 2: [Titel]", "Option 3: [Titel]".`,
    
    atmosphere: ({ situation, state }) => `Schlage atmosphärische Änderungen für diese Situation vor: "${situation}".
Aktueller Status: ${JSON.stringify(state)}
Gib an: Lichtfarbe (Hex-Code), eine musikalische Stimmung (z.B. 'Sphärisch', 'Bedrohlich', 'Feierlich') und eine kurze sensorische Beschreibung (Geruch, Temperatur).`
  }
};
