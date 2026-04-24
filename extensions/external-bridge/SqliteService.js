/**
 * @file extensions/external-bridge/SqliteService.js
 * Enables SQLite database queries from Janus7.
 */

export class JanusSqliteService {
  /**
   * @param {Object} deps
   * @param {import('../../core/logger.js').JanusLogger} [deps.logger]
   * @param {any} [deps.io] - KI IO Service for roundtrips
   */
  constructor({ logger, io } = {}) {
    this.logger = logger ?? console;
    this.io = io;
  }

  /**
   * Executes a SQL query against a database.
   * 
   * @param {string} dbPath - Path to the SQLite file
   * @param {string} query - SQL query string
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<any[]>}
   */
  async query(dbPath, query, params = []) {
    const taskId = `sql_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.info(`[JANUS7][SQL] Executing query on ${dbPath}: ${query.substring(0, 50)}...`);

    // If we are in Electron/Node, we can try direct execution via better-sqlite3
    if (this._isNode()) {
      try {
        return await this._queryDirect(dbPath, query, params);
      } catch (err) {
        this.logger.warn(`[JANUS7][SQL] Direct query failed, falling back to outbox`, err);
      }
    }

    // Fallback: Write to outbox and wait
    return this._queryViaOutbox(taskId, dbPath, query, params);
  }

  /** @private */
  _isNode() {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
  }

  /** @private */
  async _queryDirect(dbPath, query, params) {
    // Dynamic import to avoid errors in browser
    try {
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(dbPath, { readonly: true });
      try {
        const stmt = db.prepare(query);
        return stmt.all(...params);
      } finally {
        db.close();
      }
    } catch (err) {
      throw new Error(`Direct SQLite access failed: ${err.message}`);
    }
  }

  /** @private */
  async _queryViaOutbox(taskId, dbPath, query, params) {
    if (!this.io?.exportToOutbox) {
      throw new Error('KI IO Service not available for SQL roundtrip');
    }

    const payload = {
      version: 'JANUS_EXTERNAL_TASK_V1',
      taskId,
      type: 'sqlite',
      db: dbPath,
      query,
      params,
      timestamp: new Date().toISOString()
    };

    const filename = `task_${taskId}.json`;
    await this.io.exportToOutbox({ bundle: payload, filename, storage: 'world' });
    
    this.logger.info(`[JANUS7][SQL] Task ${taskId} written to outbox.`);

    return { status: 'queued', taskId, info: 'SQL Task written to outbox. Background worker required.' };
  }

  /**
   * Syncs the entire academy data bundle to SQLite.
   * 
   * @param {string} dbPath 
   * @param {object} data 
   * @returns {Promise<object>}
   */
  async syncDatabase(dbPath, data) {
    const taskId = `sync_${Date.now()}`;
    this.logger.info(`[JANUS7][SQL] Syncing database ${dbPath}...`);

    const payload = {
      version: 'JANUS_EXTERNAL_TASK_V1',
      taskId,
      type: 'sync',
      db: dbPath,
      data,
      timestamp: new Date().toISOString()
    };

    const filename = `task_${taskId}.json`;
    await this.io.exportToOutbox({ bundle: payload, filename, storage: 'world' });
    
    return { status: 'queued', taskId, info: 'Sync Task written to outbox.' };
  }
}
