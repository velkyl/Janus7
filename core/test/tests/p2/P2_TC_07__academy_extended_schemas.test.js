import { JanusValidator } from '../../../../core/validator.js';
async function read(rel) {
  const moduleId = globalThis.game?.modules?.get?.('Janus7')?.id ?? 'Janus7';
  const url = `/modules/${moduleId}/${String(rel).replace(/^\/+/, '')}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.json();
}

export default {
  id: 'P2-TC-07',
  title: 'Academy extended schemas validate core domains',
  phases: [2],
  kind: 'auto',
  expected: 'Extended academy datasets pass the validator',
  async run() {
    const v = new JanusValidator({ logger: console });
    const checks = [
      ['academy.circles', await read('data/academy/circles.json')],
      ['academy.collections', await read('data/academy/collections.json')],
      ['academy.subjects', await read('data/academy/subjects.json')],
      ['academy.socialLinks', await read('data/academy/social_links.json')],
      ['academy.schoolStats', await read('data/academy/school_stats.json')],
      ['academy.milestones', await read('data/academy/milestones.json')],
      ['academy.apAwards', await read('data/academy/ap-awards.json')]
    ];
    const failures = [];
    for (const [key, data] of checks) {
      const res = v.validate(key, data);
      if (!res.valid) failures.push(`${key}: ${res.errors.join(' | ')}`);
    }
    return { ok: failures.length === 0, summary: failures.length ? failures.join(' || ') : `OK (${checks.length} domains)` };
  }
};
