/**
 * @file phase7/ki/GeminiService.js
 * @module janus7
 * @phase 7
 *
 * Purpose:
 * Direct integration with Google Gemini API for real-time enrichment and generation.
 */

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

    const includeState = opts.includeState !== false;
    const context = includeState ? this.aiService?.getContext(opts) : null;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model || 'gemini-1.5-flash'}:generateContent?key=${this.apiKey}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeout ?? 15000);
    
    // Construct parts
    const parts = [];
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
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || response.statusText;
        throw new Error(`Gemini API Error: ${msg}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        this.logger?.warn?.('GeminiService: Empty response from API', result);
        throw new Error('Empty response from AI.');
      }

      return text;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Gemini API request timed out (15s).');
      }
      this.logger?.error?.('GeminiService: Generation failed', err);
      throw err;
    } finally {
      clearTimeout(timeout);
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
        model: 'gemini-1.5-flash',
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
}
