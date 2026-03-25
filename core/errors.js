/**
 * Basisklassen für JANUS7-Fehler.
 */

/**
 * JanusError
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
export class JanusError extends Error {
  /**
   * @param {string} message
   * @param {Object} [context]
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'JanusError';
    this.context = context;
  }
}

/**
 * JanusStateError
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
export class JanusStateError extends JanusError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'JanusStateError';
  }
}

/**
 * JanusValidationError
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
export class JanusValidationError extends JanusError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'JanusValidationError';
  }
}


/**
 * JanusConfigError
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
export class JanusConfigError extends JanusError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'JanusConfigError';
  }
}

/**
 * JanusStateCorruptionError
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
export class JanusStateCorruptionError extends JanusStateError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'JanusStateCorruptionError';
  }
}

/**
 * JanusImportError
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
export class JanusImportError extends JanusError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'JanusImportError';
  }
}