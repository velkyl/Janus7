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
  'KNOWLEDGE BRIDGE AVAILABLE: You now have access to semantic search and world actions. ',
  'If you need to find an entity (NPC, item, spell), use game.janus7.ki.search(domain, query). ',
  'To interact with the world, use game.janus7.ki.executeAction(type, uuid, params). ',
  'Supported actions: "spawnActor", "openDocument", "rollTable", "playSound". ',
  'You can moderate academic lessons using these tools to spawn teachers or play atmospheric sounds. ',
  'When generating a lesson narrative, you can include JavaScript code blocks using these tools.'
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
    event: ({ text, meta }) => `Enrich the following event description for a Dark Eye (DSA5) campaign.
Context: Magic Academy in Aventuria.
Original Text: "${text}"
Metadata: ${JSON.stringify(meta)}
Produce a detailed, atmospheric, and lore-friendly description in German.`,
    
    situation: ({ text, meta }) => `Describe the following situation in a magic academy. 
Original: "${text}"
Context: ${JSON.stringify(meta)}
Provide choices and sensory details.`,
    
    visual: ({ text, meta }) => `Generate a highly detailed visual prompt for an AI image generator (like Midjourney or DALL-E) based on this description:
"${text}"
Context: ${JSON.stringify(meta)}
Focus on light, composition, and Aventurian aesthetics.`
  }
};
