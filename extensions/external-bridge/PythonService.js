/**
 * @file extensions/external-bridge/PythonService.js
 * Enables execution of Python scripts from Janus7.
 */

export class JanusPythonService {
  /**
   * @param {Object} deps
   * @param {import('../../core/logger.js').JanusLogger} [deps.logger]
   * @param {any} [deps.io] - KI IO Service for roundtrips
   */
  constructor({ logger, io } = {}) {
    this.logger = logger ?? console;
    this.io = io;
    this._pendingTasks = new Map();
  }

  /**
   * Executes a Python script.
   * 
   * @param {string} scriptPath - Path to the script
   * @param {Object} [args={}] - Data passed to the script
   * @returns {Promise<any>}
   */
  async execute(scriptPath, args = {}) {
    const taskId = `py_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.info(`[JANUS7][Python] Starting task ${taskId}: ${scriptPath}`);

    // If we are in Electron/Node, we can try direct execution
    if (this._isNode()) {
      try {
        return await this._executeDirect(scriptPath, args);
      } catch (err) {
        this.logger.warn(`[JANUS7][Python] Direct execution failed, falling back to outbox`, err);
      }
    }

    // Fallback: Write to outbox and wait
    return this._executeViaOutbox(taskId, scriptPath, args);
  }

  /** @private */
  _isNode() {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
  }

  /** @private */
  async _executeDirect(scriptPath, args) {
    const { spawn } = await import('node:child_process');
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [scriptPath, JSON.stringify(args)]);
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => { stdout += data; });
      pythonProcess.stderr.on('data', (data) => { stderr += data; });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (_) {
          resolve(stdout);
        }
      });
    });
  }

  /** @private */
  async _executeViaOutbox(taskId, scriptPath, args) {
    if (!this.io?.exportToOutbox) {
      throw new Error('KI IO Service not available for Python roundtrip');
    }

    const payload = {
      version: 'JANUS_EXTERNAL_TASK_V1',
      taskId,
      type: 'python',
      script: scriptPath,
      args,
      timestamp: new Date().toISOString()
    };

    // Write to outbox
    const filename = `task_${taskId}.json`;
    await this.io.exportToOutbox({ bundle: payload, filename, storage: 'world' });
    
    this.logger.info(`[JANUS7][Python] Task ${taskId} written to outbox. Waiting for result...`);

    // Poll for result file (result_{taskId}.json) in inbox
    const resultFilename = `result_${taskId}.json`;
    const maxRetries = 10;
    const pollInterval = 1000;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, pollInterval));
      
      try {
        const inboxFiles = await this.io.listInboxFiles();
        const found = inboxFiles.some(f => f.endsWith(resultFilename));
        
        if (found) {
          this.logger.info(`[JANUS7][Python] Result found for task ${taskId}. Importing...`);
          // Note: importFromInbox currently returns the result of applyImport.
          // We might need a raw read if we don't want to apply patches.
          // But for Python results, we usually want to read the data.
          
          // Assuming the bridge writes a JSON that importFromInbox can handle:
          const result = await this.io.importFromInbox(resultFilename);
          return result;
        }
      } catch (err) {
        this.logger.debug(`[JANUS7][Python] Poll attempt ${i+1} failed: ${err.message}`);
      }
    }

    return { 
      status: 'timeout', 
      taskId, 
      info: 'Task written to outbox, but no response received within timeout. Background worker might be offline.' 
    };
  }
}
