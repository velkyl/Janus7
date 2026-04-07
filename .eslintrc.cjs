// .eslintrc.cjs — JANUS7 Import-Policy (Schritt A1)
// Architekturvertrag: Kein direkter game.settings Zugriff außerhalb von core/config.js
'use strict';

module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },

  rules: {
    // ── RULE A1.1: Kein direkter game.settings.get/set ─────────────────────
    // Alle Settings-Zugriffe MÜSSEN über JanusConfig.get() / JanusConfig.set() laufen.
    // Ausnahme: core/config.js selbst (override unten).
    'no-restricted-syntax': [
      'warn',
      {
        // Greift auf game.settings.get(…) zu
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='settings'][callee.property.name='get']",
        message:
          '[JANUS7-A1] Direkter game.settings.get() Zugriff verboten. Nutze JanusConfig.get(key).'
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='settings'][callee.property.name='set']",
        message:
          '[JANUS7-A1] Direkter game.settings.set() Zugriff verboten. Nutze JanusConfig.set(key, value).'
      },
      {
        selector: "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='settings'][callee.property.name='register']",
        message:
          '[JANUS7-A1] Direkter game.settings.register() Zugriff verboten. Nur in core/config.js erlaubt.'
      }
    ],

    // ── RULE A1.2: Extensions nur via public-api ────────────────────────────
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['**/phase8/*', '**/phase8/**'],
            message:
              '[JANUS7-A1] phase8/ Code darf nur über scripts/extensions/ importiert werden.'
          }
        ]
      }
    ]
  },

  overrides: [
    {
      // Entry-Point-Privilege: janus.mjs und config.js sind exempt
      files: ['scripts/janus.mjs', 'core/config.js'],
      rules: {
        'no-restricted-syntax': 'off',
        'no-restricted-imports': 'off'
      }
    },
    {
      // Core-Interna sind exempt (sie implementieren die Policy)
      files: ['core/**/*.js', 'core/**/*.mjs'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    },
    {
      // Test-Tools sind exempt (validieren die Architektur selbst)
      files: ['tools/**/*.js', 'tools/**/*.mjs'],
      rules: {
        'no-restricted-syntax': 'off',
        'no-restricted-imports': 'off'
      }
    }
  ]
};
