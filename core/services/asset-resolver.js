/**
 * Central resolver for module-local asset paths.
 * Keeps JANUS7 runtime paths in one place and provides
 * a single point for future deployment/path strategy changes.
 */
export class JanusAssetResolver {
  static moduleId() {
    try {
      const url = new URL(import.meta.url);
      const match = url.pathname.match(/\/modules\/([^/]+)\//);
      if (match) return match[1];
    } catch (_) {}
    return 'janus7';
  }

  static moduleRoot() {
    return `modules/${this.moduleId()}`;
  }

  static normalize(path = '') {
    return String(path ?? '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');
  }

  static asset(path = '') {
    const rel = this.normalize(path);
    return rel ? `${this.moduleRoot()}/${rel}` : this.moduleRoot();
  }

  static template(path = '') {
    const rel = this.normalize(path).replace(/^templates\//, '');
    return this.asset(`templates/${rel}`);
  }

  static data(path = '') {
    const rel = this.normalize(path).replace(/^data\//, '');
    return this.asset(`data/${rel}`);
  }

  static scripts(path = '') {
    const rel = this.normalize(path).replace(/^scripts\//, '');
    return this.asset(`scripts/${rel}`);
  }
}

export default JanusAssetResolver;
