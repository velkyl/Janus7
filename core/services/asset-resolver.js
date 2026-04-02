/**
 * Central resolver for module-local asset paths.
 * Keeps JANUS7 runtime paths in one place and provides
 * a single point for future deployment/path strategy changes.
 */
export class JanusAssetResolver {
  /**
   * Resolves the active module id from `import.meta.url`.
   *
   * @returns {string}
   */
  static moduleId() {
    try {
      const url = new URL(import.meta.url);
      const match = url.pathname.match(/\/modules\/([^/]+)\//);
      if (match) return match[1];
    } catch (_) {}
    return 'Janus7';
  }

  /**
   * Returns the root web path for the active JANUS7 module.
   *
   * @returns {string}
   */
  static moduleRoot() {
    return `/modules/${this.moduleId()}`;
  }

  /**
   * Normalizes a relative module path to forward-slash notation.
   *
   * @param {string} [path]
   * @returns {string}
   */
  static normalize(path = '') {
    return String(path ?? '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');
  }

  /**
   * Builds a module-local asset URL.
   *
   * @param {string} [path]
   * @returns {string}
   */
  static asset(path = '') {
    const rel = this.normalize(path);
    return rel ? `${this.moduleRoot()}/${rel}` : this.moduleRoot();
  }

  /**
   * Builds a module-local Handlebars template URL.
   *
   * @param {string} [path]
   * @returns {string}
   */
  static template(path = '') {
    const rel = this.normalize(path).replace(/^templates\//, '');
    return this.asset(`templates/${rel}`);
  }

  /**
   * Builds a module-local data URL.
   *
   * @param {string} [path]
   * @returns {string}
   */
  static data(path = '') {
    const rel = this.normalize(path).replace(/^data\//, '');
    return this.asset(`data/${rel}`);
  }

  /**
   * Builds a module-local script URL.
   *
   * @param {string} [path]
   * @returns {string}
   */
  static scripts(path = '') {
    const rel = this.normalize(path).replace(/^scripts\//, '');
    return this.asset(`scripts/${rel}`);
  }
}

export default JanusAssetResolver;
