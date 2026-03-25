import { JanusError } from '../core/errors.js';

/**
 * Custom errors for JANUS7 Phase 7 (AI roundtrip import/diff).
 */

/**
 * Error thrown when an AI bundle fails validation against the schema or
 * contains unknown/unsupported fields in strict mode.
 *
 * @extends Error
 */
export class JanusAiBundleInvalidError extends JanusError {
  /**
   * @param {string} message
   * @param {Object} [opts]
   * @param {string[]} [opts.errors]
   */
  constructor(message, { errors } = {}) {
    super(message);
    this.name = 'JanusAiBundleInvalidError';
    /** @type {string[]} */
    this.errors = Array.isArray(errors) ? errors : [];
  }
}

/**
 * Error thrown when applying an AI bundle results in a conflict during the
 * state mutation (e.g. invalid diff application). The state will be
 * rolled back to its previous snapshot automatically by the transaction.
 *
 * @extends Error
 */
export class JanusAiDiffConflictError extends JanusError {
  /**
   * @param {string} message
   * @param {Object} [opts]
   * @param {any[]} [opts.conflicts]
   */
  constructor(message, { conflicts } = {}) {
    super(message);
    this.name = 'JanusAiDiffConflictError';
    /** @type {any[]} */
    this.conflicts = Array.isArray(conflicts) ? conflicts : [];
  }
}

/**
 * Error thrown when a caller attempts to perform an operation that is not
 * permitted. This is used to gate sensitive AI import operations to GM
 * users only. When running under a non-Foundry environment (e.g. test
 * harness) this error will not be thrown unless explicitly triggered.
 *
 * @extends Error
 */
export class JanusAiPermissionError extends JanusError {
  /**
   * @param {string} message
   * @param {Object} [opts]
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = 'JanusAiPermissionError';
    // capture any extra context for debugging
    Object.assign(this, opts);
  }
}

/**
 * Error thrown when a KI response (patch) fails validation against the
 * expected schema or contains an unsupported structure. This is
 * analogous to JanusAiBundleInvalidError but for JANUS_KI_RESPONSE_V1
 * objects. The `errors` array may include additional messages from
 * the validator.
 *
 * @extends Error
 */
export class JanusKiResponseInvalidError extends JanusError {
  /**
   * @param {string} message
   * @param {Object} [opts]
   * @param {string[]} [opts.errors]
   */
  constructor(message, { errors } = {}) {
    super(message);
    this.name = 'JanusKiResponseInvalidError';
    /** @type {string[]} */
    this.errors = Array.isArray(errors) ? errors : [];
  }
}

// ---------------------------------------------------------------------------
// KI aliases for legacy AI error types (SSOT naming).
// ---------------------------------------------------------------------------
export class JanusKiBundleInvalidError extends JanusAiBundleInvalidError {
  constructor(message, opts = {}) { super(message, opts); this.name = 'JanusKiBundleInvalidError'; }
}

export class JanusKiDiffConflictError extends JanusAiDiffConflictError {
  constructor(message, opts = {}) { super(message, opts); this.name = 'JanusKiDiffConflictError'; }
}

export class JanusKiPermissionError extends JanusAiPermissionError {
  constructor(message, opts = {}) { super(message, opts); this.name = 'JanusKiPermissionError'; }
}
