/**
 * @file phase7/ki/GeminiService.js
 * @module janus7
 * @phase 7
 *
 * Purpose:
 * Direct integration with Google Gemini API for real-time enrichment and generation.
 */

import { MODULE_ID } from '../../core/common.js';
import { JanusConfig } from '../../core/config.js';
import { Prompts } from './prompts.js';

/**
 * JanusGeminiService
 * 
 * Logic to communicate with Google Gemini API.
 */
export class JanusGeminiService {
  /**
   * @param {Object} deps
   * @param {import('../../core/logger.js').JanusLogger} deps.logger
   * @param {import('../../core/ai.js').JanusAiService} deps.aiService
   */
  constructor({ logger, aiService } = {}) {
    this.logger = logger;
    this.aiService = aiService;
    
    /** @type {JanusKnowledgeBridge|null} */
    this.kiBridge = null;
  }

  /**
   * Sets the knowledge bridge instance for tool use.
   * @param {JanusKnowledgeBridge} bridge 
   */
  setKiBridge(bridge) {
    this.kiBridge = bridge;
  }

  /**
   * Returns true if Gemini enrichment is enabled and an API key is present.
   * @returns {boolean}
   */
  get isEnabled() {
    return JanusConfig.isSubsystemEnabled('gemini') && !!this.apiKey;
  }

  /**
   * Returns the configured API key.
   * @returns {string}
   */
  get apiKey() {
    return JanusConfig.get('geminiApiKey') || '';
  }

  _normalizeModelId(model, fallback = '') {
    let value = String(model || fallback || '').trim();
    if (value === 'gemini-3-flash') value = 'models/gemini-1.5-flash-latest';
    if (value === 'nano-banana') value = 'models/imagen-3.0-generate-001';
    return value.startsWith('models/') ? value : `models/${value}`;
  }

  _displayModelName(id, displayName = '') {
    if (displayName) return displayName;
    return String(id ?? '').replace(/^models\//, '');
  }

  _dedupeModels(models = []) {
    const deduped = new Map();
    for (const model of Array.isArray(models) ? models : []) {
      const id = String(model?.id ?? '').trim();
      if (!id || deduped.has(id)) continue;
      deduped.set(id, { id, name: this._displayModelName(id, model?.name) });
    }
    return Array.from(deduped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  _hasGenerationMethod(model, method) {
    return new Set(model?.supportedGenerationMethods ?? []).has(method);
  }

  _isTextGenerationModel(model) {
    const id = String(model?.name ?? '').trim();
    const shortId = id.replace(/^models\//, '');
    if (!id.startsWith('models/gemini-')) return false;
    if (!this._hasGenerationMethod(model, 'generateContent')) return false;
    if (/(image|tts|embedding|aqa|live|audio)/i.test(shortId)) return false;
    return true;
  }

  _isImageGenerationModel(model) {
    const id = String(model?.name ?? '').trim();
    const shortId = id.replace(/^models\//, '');
    const methods = new Set(model?.supportedGenerationMethods ?? []);
    if (!id) return false;
    if (id.startsWith('models/imagen-')) return true;
    if (methods.has('predict')) return /(imagen|image|vision)/i.test(shortId) || id.startsWith('models/gemini-');
    if (id.startsWith('models/gemini-') && (methods.has('generateImages') || methods.has('generateImage'))) return true;
    return false;
  }

  async _fetchJson(url, { timeout = 15000, method = 'GET', headers, body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || response.statusText;
        throw new Error(`Gemini API Error: ${msg}`);
      }
      return await response.json();
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`Gemini API request timed out (${timeout}ms).`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  _getDefaultTextModels() {
    return this._dedupeModels([
      { id: this._normalizeModelId(JanusConfig.get('geminiTextModel') || 'models/gemini-1.5-flash') },
      ...(JanusConfig.get('availableGeminiTextModels') || []),
      ...(JanusConfig.get('availableGeminiModels') || []).filter((model) => String(model?.id ?? '').startsWith('models/gemini-'))
    ]);
  }

  _getDefaultImageModels() {
    return this._dedupeModels([
      { id: this._normalizeModelId(JanusConfig.get('geminiVisualModel') || 'models/imagen-3.0-generate-001') },
      ...(JanusConfig.get('availableGeminiImageModels') || []),
      ...(JanusConfig.get('availableGeminiModels') || []).filter((model) => this._isImageGenerationModel({ name: model?.id, supportedGenerationMethods: model?.supportedGenerationMethods }))
    ]);
  }

  _selectTextModels(rawModels = []) {
    const models = rawModels
      .filter((model) => this._isTextGenerationModel(model))
      .map((model) => ({
        id: model.name,
        name: this._displayModelName(model.name, model.displayName)
      }));
    return this._dedupeModels([...this._getDefaultTextModels(), ...models]);
  }

  _selectImageModels(rawModels = []) {
    const models = rawModels
      .filter((model) => this._isImageGenerationModel(model))
      .map((model) => ({
        id: model.name,
        name: this._displayModelName(model.name, model.displayName)
      }));
    return this._dedupeModels([...this._getDefaultImageModels(), ...models]);
  }

  /**
   * Core method to call Gemini API.
   * 
   * @param {string} prompt - The prompt text.
   * @param {Object} [opts] - Options for context and generation.
   * @param {boolean} [opts.includeState=true] - Whether to include the Janus state context.
   * @param {string} [opts.model='gemini-1.5-flash'] - Model identifier.
   * @returns {Promise<string>}
   */
  async generateContent(prompt, opts = {}) {
    if (!this.isEnabled) {
      if (!JanusConfig.get('enableGemini')) {
         throw new Error('Gemini enrichment is disabled in settings.');
      }
      throw new Error('Gemini API key is missing.');
    }

    const systemPrompt = JanusConfig.get('geminiSystemPrompt') || '';
    const includeState = opts.includeState !== false;
    const context = includeState ? this.aiService?.getContext(opts) : null;
    
    const rawModel = opts.model || JanusConfig.get('geminiTextModel') || 'models/gemini-1.5-flash-latest';
    const model = this._normalizeModelId(rawModel).replace(/^models\//, '');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    // Construct parts
    const parts = [];
    if (systemPrompt) {
      parts.push({ text: `SYSTEM INSTRUCTION: ${systemPrompt}\n\n` });
    }
    if (context) {
      parts.push({ text: `JANUS7 SYSTEM CONTEXT (JSON):\n${JSON.stringify(context, null, 2)}\n\n---\n` });
    }
    parts.push({ text: prompt });

    const body = {
      contents: [
        {
          role: 'user',
          parts: parts
        }
      ],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 2048,
      }
    };

    try {
      this.logger?.debug?.('GeminiService: Sending request...', { promptSnippet: prompt.substring(0, 100) });

      // Support for Function Calling (Tools)
      const tools = this._getToolDefinitions();
      const toolConfig = { function_calling_config: { mode: 'AUTO' } };

      const requestBody = {
        ...body,
        tools: opts.useTools !== false ? tools : undefined,
        tool_config: opts.useTools !== false ? toolConfig : undefined
      };

      let result = await this._fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        timeout: opts.timeout ?? 15000
      });

      // Handle Tool Calls (single level for now)
      const candidate = result.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      if (part?.functionCall) {
        this.logger?.info?.('GeminiService: AI requested tool call', part.functionCall);
        const toolResult = await this._executeToolCall(part.functionCall);
        
        // Follow up with tool result
        const followUpBody = {
          contents: [
            ...body.contents,
            candidate.content,
            {
              role: 'function',
              parts: [{
                functionResponse: {
                  name: part.functionCall.name,
                  response: { content: toolResult }
                }
              }]
            }
          ],
          generationConfig: body.generationConfig
        };

        this.logger?.debug?.('GeminiService: Sending tool response back to AI...');
        result = await this._fetchJson(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followUpBody),
          timeout: opts.timeout ?? 15000
        });
      }

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        this.logger?.warn?.('GeminiService: Empty response from API', result);
        throw new Error('Empty response from AI.');
      }

      return text;
    } catch (err) {
      this.logger?.error?.('GeminiService: Generation failed', err);
      throw err;
    }
  }

  /** @private */
  _getToolDefinitions() {
    return [{
      function_declarations: [
        {
          name: 'dsa_knowledge_search',
          description: 'Search for DSA5 entities (NPCs, items, spells, locations) by domain and name.',
          parameters: {
            type: 'OBJECT',
            properties: {
              domain: { 
                type: 'STRING', 
                description: 'The semantic domain to search in',
                enum: [
                  'magic.spell', 'magic.liturgy', 
                  'item.weapon', 'item.armor', 'item.equipment', 'item.herb',
                  'trait.special_ability', 'trait.advantage',
                  'creature.beast', 'creature.demon', 'creature.npc',
                  'journal.lore', 'scene.location', 'all'
                ] 
              },
              query: { type: 'STRING', description: 'The search term' }
            },
            required: ['domain', 'query']
          }
        },
        {
          name: 'dsa_knowledge_retrieve',
          description: 'Retrieve full details and content for a specific entity by its UUID.',
          parameters: {
            type: 'OBJECT',
            properties: {
              uuid: { type: 'STRING', description: 'The unique Foundry UUID of the entity' }
            },
            required: ['uuid']
          }
        },
        {
          name: 'foundry_action',
          description: 'Execute an action in the Foundry world (spawn actor, open document, play sound).',
          parameters: {
            type: 'OBJECT',
            properties: {
              action: { 
                type: 'STRING', 
                description: 'The action to perform',
                enum: ['spawnActor', 'openDocument', 'rollTable', 'playSound'] 
              },
              uuid: { type: 'STRING', description: 'The UUID of the target entity' },
              params: { 
                type: 'OBJECT', 
                description: 'Optional parameters (x, y coordinates for spawn, etc.)',
                properties: {
                  x: { type: 'NUMBER' },
                  y: { type: 'NUMBER' },
                  volume: { type: 'NUMBER' }
                }
              }
            },
            required: ['action', 'uuid']
          }
        },
        {
          name: 'external_sql_query',
          description: 'Query a SQLite database (e.g. Keeper Helper) for advanced campaign data.',
          parameters: {
            type: 'OBJECT',
            properties: {
              db: { type: 'STRING', description: 'Path to the .db file' },
              query: { type: 'STRING', description: 'SQL SELECT query' },
              params: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Query parameters' }
            },
            required: ['db', 'query']
          }
        },
        {
          name: 'external_python_script',
          description: 'Execute a specialized Python script for data processing or generation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              script: { type: 'STRING', description: 'Path to the .py script' },
              args: { type: 'OBJECT', description: 'Arguments passed to the script' }
            },
            required: ['script']
          }
        }
      ]
    }];
  }

  /** @private */
  async _executeToolCall(call) {
    if (!this.kiBridge) {
      this.logger?.warn?.('GeminiService: Tool call requested but no kiBridge set.');
      return { error: 'Knowledge Bridge not available.' };
    }

    try {
      switch (call.name) {
        case 'dsa_knowledge_search':
          return await this.kiBridge.search(call.args.domain, call.args.query);
        case 'dsa_knowledge_retrieve':
          return await this.kiBridge.retrieve(call.args.uuid);
        case 'foundry_action':
          return await this.kiBridge.executeAction(call.args.action, call.args.uuid, call.args.params);
        case 'external_sql_query':
          return await this.kiBridge.executeAction('sqlQuery', null, call.args);
        case 'external_python_script':
          return await this.kiBridge.executeAction('runScript', null, call.args);
        default:
          return { error: `Unknown tool: ${call.name}` };
      }
    } catch (err) {
      this.logger?.error?.(`GeminiService: Tool execution failed (${call.name})`, err);
      return { error: err.message };
    }
  }

  /**
   * Tests the connection to Gemini API.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const res = await this.generateContent('Hello, are you online? Respond with only "OK".', {
        includeState: false,
        model: 'models/gemini-1.5-flash',
        timeout: 5000
      });
      return res.trim().toUpperCase().includes('OK');
    } catch (err) {
      this.logger?.error?.('GeminiService: Connection test failed', err);
      return false;
    }
  }

  /**
   * High-level enrichment method.
   * 
   * @param {string} type - 'room', 'event', 'quest', 'situation'
   * @param {string} sourceText - Original text to enrich
   * @param {Object} [meta] - Optional additional metadata
   * @returns {Promise<string>}
   */
  async enrich(type, sourceText, meta = {}) {
    const templateFn = Prompts.ENRICHMENT[type] || Prompts.ENRICHMENT.situation;
    const prompt = templateFn({ text: sourceText, meta });

    return this.generateContent(prompt, { includeDirector: true });
  }

  /**
   * Suggests an AI image prompt.
   */
  async suggestVisual(sourceText, meta = {}) {
    const prompt = Prompts.ENRICHMENT.visual({ text: sourceText, meta });
    return this.generateContent(prompt, { includeDirector: true });
  }

  /**
   * Generates an image using Gemini (Imagen) and saves it to the Foundry server.
   * 
   * @param {string} prompt - Visual prompt.
   * @param {Object} [opts] - Options.
   * @param {string} [opts.filename] - Desired filename.
   * @param {string} [opts.aspectRatio='1:1'] - '1:1', '16:9', '4:3', '3:4'
   * @returns {Promise<string>} - The web path to the saved image.
   */
  async generateAndSaveImage(prompt, opts = {}) {
    if (!this.isEnabled) throw new Error('Gemini is not enabled.');

    // We use configured model or default
    const model = this._normalizeModelId(opts.model || JanusConfig.get('geminiVisualModel') || 'models/imagen-3.0-generate-001').substring(7);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${this.apiKey}`;
    
    // Apply visual system prompt as style override
    const stylePrompt = JanusConfig.get('imagenSystemPrompt') || '';
    const fullPrompt = stylePrompt ? `${prompt}. Style: ${stylePrompt}` : prompt;

    // Imagen 3 request structure
    const body = {
      instances: [{ prompt: fullPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: opts.aspectRatio || "1:1",
        outputMimeType: "image/png"
      }
    };

    try {
      this.logger?.info?.('GeminiService: Generating image...', { prompt });
      const result = await this._fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: opts.timeout ?? 30000
      });
      const base64Data = result.predictions?.[0]?.bytesBase64Encoded || result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Data) {
        throw new Error('No image data received from Gemini.');
      }

      // 2. Save to Foundry
      const name = opts.filename || `gen_${Date.now()}.png`;
      const folderPath = `modules/${MODULE_ID}/assets/generated`;
      
      // Convert to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const file = new File([blob], name, { type: 'image/png' });

      // Upload via Foundry FilePicker
      // We assume the directory exists or FilePicker creates it (usually needs manual dir creation via FilePicker.createDirectory)
      try { await FilePicker.createDirectory('data', folderPath); } catch (e) { /* ignore if already exists */ }
      
      const uploadRes = await FilePicker.upload('data', folderPath, file, {});
      this.logger?.info?.('GeminiService: Image saved', { path: uploadRes.path });

      return uploadRes.path;
    } catch (err) {
      this.logger?.error?.('GeminiService: Image generation failed', err);
      throw err;
    }
  }

  /**
   * Proposes consequences for an action.
   */
  async generateConsequences(action, stateOverride = null) {
    const state = stateOverride || this.aiService?.getContext() || {};
    const prompt = Prompts.ENRICHMENT.consequences({ action, state });
    return this.generateContent(prompt, { includeState: false }); // state already in prompt
  }

  /**
   * Suggests atmospheric changes.
   */
  async suggestAtmosphere(situation) {
    const state = this.aiService?.getContext() || {};
    const prompt = Prompts.ENRICHMENT.atmosphere({ situation, state });
    return this.generateContent(prompt, { includeState: false });
  }

  /**
   * Fetches the list of available models from the Google API.
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  async fetchAvailableModels() {
    if (!this.apiKey) throw new Error('API Key missing.');

    try {
      const rawModels = [];
      let pageToken = '';

      do {
        const tokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}${tokenQuery}`;
        const data = await this._fetchJson(url, { timeout: 15000 });
        rawModels.push(...(data.models || []));
        pageToken = data.nextPageToken || '';
      } while (pageToken);

      const textModels = this._selectTextModels(rawModels);
      const imageModels = this._selectImageModels(rawModels);
      const allModels = this._dedupeModels([...textModels, ...imageModels]);

      await JanusConfig.set('availableGeminiTextModels', textModels);
      await JanusConfig.set('availableGeminiImageModels', imageModels);
      await JanusConfig.set('availableGeminiModels', allModels);

      return { textModels, imageModels, allModels };
    } catch (err) {
      this.logger?.error?.('GeminiService: Failed to fetch models', err);
      throw err;
    }
  }
}
