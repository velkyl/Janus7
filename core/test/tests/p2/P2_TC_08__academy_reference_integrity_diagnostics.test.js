import { JanusValidator } from '../../../../core/validator.js';
async function read(rel) {
  const moduleId = globalThis.game?.modules?.get?.('janus7')?.id ?? 'janus7';
  const url = `/modules/${moduleId}/${String(rel).replace(/^\/+/, '')}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.json();
}

export default {
  id: 'P2-TC-08',
  title: 'Academy reference integrity diagnostics are emitted',
  phases: [2],
  kind: 'auto',
  expected: 'Validator returns a diagnostic object with errors and/or warnings for unresolved references',
  async run() {
    const v = new JanusValidator({ logger: console });
    const result = v.validateAcademyReferenceIntegrity({
      lessons: await read('data/academy/lessons.json'),
      exams: await read('data/academy/exams.json'),
      examQuestions: await read('data/academy/exam-questions.json'),
      npcs: await read('data/academy/npcs.json'),
      locations: await read('data/academy/locations.json'),
      library: await read('data/academy/library.json'),
      events: await read('data/academy/events.json'),
      circles: await read('data/academy/circles.json'),
      teachingSessions: await read('data/academy/teaching-sessions.json'),
      socialLinks: await read('data/academy/social_links.json'),
      collections: await read('data/academy/collections.json')
    });
    const ok = Array.isArray(result?.errors) && Array.isArray(result?.warnings);
    return { ok, summary: ok ? `errors=${result.errors.length} warnings=${result.warnings.length}` : 'validator returned invalid diagnostics object' };
  }
};
