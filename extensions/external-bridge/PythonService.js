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

    // In a real implementation, we would poll the inbox or wait for a socket event.
    // For now, we return a message that the task is queued.
    return { status: 'queued', taskId, info: 'Task written to outbox. Background worker required.' };
  }
}
