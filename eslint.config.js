// eslint.config.js — JANUS7 Import-Policy (Flat Config, ESLint 9+)
// Architekturvertrag: Kein direkter game.settings Zugriff außerhalb von core/config.js
// Migrated from .eslintrc.cjs — alle Regeln und Ausnahmen identisch.

import js from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Base recommended ruleset
  js.configs.recommended,

  // ── Globale Konfiguration ──────────────────────────────────────────────────
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        globalThis: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        HTMLElement: 'readonly',
        CSS: 'readonly',
        performance: 'readonly',
        queueMicrotask: 'readonly',
        structuredClone: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        Janus7: 'readonly',
        AudioHelper: 'readonly',
        args: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Foundry VTT core globals
        game: 'readonly',
        ui: 'readonly',
        Hooks: 'readonly',
        foundry: 'readonly',
        canvas: 'readonly',
        CONFIG: 'readonly',
        FilePicker: 'readonly',
        // Foundry VTT document globals
        fromUuid: 'readonly',
        fromUuidSync: 'readonly',
        ChatMessage: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        Scene: 'readonly',
        Folder: 'readonly',
        Playlist: 'readonly',
        PlaylistSound: 'readonly',
        JournalEntry: 'readonly',
        JournalEntryPage: 'readonly',
        Macro: 'readonly',
        Token: 'readonly',
        User: 'readonly',
        // Foundry VTT app globals
        Application: 'readonly',
        FormApplication: 'readonly',
        Dialog: 'readonly',
        // Foundry VTT utility globals
        renderTemplate: 'readonly',
        loadTemplates: 'readonly',
        getTemplate: 'readonly',
        TextEditor: 'readonly',
        mergeObject: 'readonly',
        duplicate: 'readonly',
        isNewerVersion: 'readonly',
        randomID: 'readonly',
        Roll: 'readonly',
      },
    },

    rules: {
      // ── RULE A1.1: Kein direkter game.settings.get/set ──────────────────────
      // Alle Settings-Zugriffe MÜSSEN über JanusConfig.get() / JanusConfig.set() laufen.
      // Ausnahme: core/config.js selbst (override unten).
      'no-restricted-syntax': [
        'warn',
        {
          // Greift auf game.settings.get(…) zu
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='settings'][callee.property.name='get']",
          message:
            '[JANUS7-A1] Direkter game.settings.get() Zugriff verboten. Nutze JanusConfig.get(key).',
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='settings'][callee.property.name='set']",
          message:
            '[JANUS7-A1] Direkter game.settings.set() Zugriff verboten. Nutze JanusConfig.set(key, value).',
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='settings'][callee.property.name='register']",
          message:
            '[JANUS7-A1] Direkter game.settings.register() Zugriff verboten. Nur in core/config.js erlaubt.',
        },
      ],

      // ── RULE A1.2: Extensions nur via public-api ──────────────────────────
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['**/phase8/*', '**/phase8/**'],
              message:
                '[JANUS7-A1] phase8/ Code darf nur über scripts/extensions/ importiert werden.',
            },
          ],
        },
      ],

      // Suppress noisy base rules that conflict with Foundry patterns
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^(_|exp$|err$|e$)'
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // ── Override: Entry-Point-Privilege ───────────────────────────────────────
  // janus.mjs und config.js sind von den A1-Regeln ausgenommen.
  {
    files: ['scripts/janus.mjs', 'core/config.js'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },

  // ── Override: Core-Interna ─────────────────────────────────────────────────
  // core/ implementiert die Policy selbst.
  {
    files: ['core/**/*.js', 'core/**/*.mjs'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // ── Override: Test-Tools ──────────────────────────────────────────────────
  // tools/ validiert die Architektur selbst — keine Import-Restriktionen.
  {
    files: ['tools/**/*.js', 'tools/**/*.mjs'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },

  // ── Ignore patterns ───────────────────────────────────────────────────────
  {
    ignores: ['node_modules/**', '*.min.js', 'packs/**'],
  },
];
