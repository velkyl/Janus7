/**
 * Phase 3: DSA5 System Bridge – Fehlerklassen
 * @module janus7/bridge/dsa5/errors
 */

/**
 * JanusBridgeError
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class JanusBridgeError extends Error {
  /**
   * @param {string} message
   * @param {object} [context]
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'JanusBridgeError';
    /** @type {object} */
    this.context = context;
  }
}

/**
 * DSA5NotAvailableError
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class DSA5NotAvailableError extends JanusBridgeError {
  constructor(message = 'DSA5 System ist nicht verfügbar.', context = {}) {
    super(message, context);
    this.name = 'DSA5NotAvailableError';
  }
}

/**
 * DSA5ResolveError
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class DSA5ResolveError extends JanusBridgeError {
  constructor(message = 'DSA5 Dokument konnte nicht aufgelöst werden.', context = {}) {
    super(message, context);
    this.name = 'DSA5ResolveError';
  }
}

/**
 * DSA5RollError
 *
 * @description
 * Öffentliche API von JANUS7.
 * Diese Funktion/Klasse ist Teil der stabilen Oberfläche
 * und wird durch den Testkatalog abgesichert.
 *
 * @remarks
 * - Keine UI-Seiteneffekte
 * - Keine direkten Zugriffe auf Foundry- oder dsa5-Interna außerhalb definierter APIs
 * - Änderungen hier erfordern Anpassungen im Testkatalog
 */
export class DSA5RollError extends JanusBridgeError {
  constructor(message = 'DSA5 Probe konnte nicht ausgeführt werden.', context = {}) {
    super(message, context);
    this.name = 'DSA5RollError';
  }
}