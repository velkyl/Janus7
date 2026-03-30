import fs from 'node:fs';
import path from 'node:path';
import { JanusValidator } from '../core/validator.js';

const root = process.cwd();
const academyRoot = path.join(root, 'data', 'academy');

function readJson(rel) {
  const full = path.join(root, rel);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

const validator = new JanusValidator({ logger: console });
const datasets = {
  lessons: readJson('data/academy/lessons.json'),
  exams: readJson('data/academy/exams.json'),
  gradingSchemes: readJson('data/academy/grading-schemes.json'),
  examQuestions: readJson('data/academy/exam-questions.json'),
  npcs: readJson('data/academy/npcs.json'),
  locations: readJson('data/academy/locations.json'),
  library: readJson('data/academy/library.json'),
  events: readJson('data/academy/events.json'),
  circles: readJson('data/academy/circles.json'),
  collections: readJson('data/academy/collections.json'),
  subjects: readJson('data/academy/subjects.json'),
  teachingSessions: readJson('data/academy/teaching-sessions.json'),
  socialLinks: readJson('data/academy/social_links.json'),
  schoolStats: readJson('data/academy/school_stats.json'),
  alchemyRecipes: readJson('data/academy/alchemy-recipes.json'),
  milestones: readJson('data/academy/milestones.json'),
  apAwards: readJson('data/academy/ap-awards.json')
};

const checks = [
  ['academy.lessons', datasets.lessons],
  ['academy.exams', datasets.exams],
  ['academy.gradingSchemes', datasets.gradingSchemes],
  ['academy.examQuestions', datasets.examQuestions],
  ['academy.npcs', datasets.npcs],
  ['academy.locations', datasets.locations],
  ['academy.library', datasets.library],
  ['academy.events', datasets.events],
  ['academy.circles', datasets.circles],
  ['academy.collections', datasets.collections],
  ['academy.subjects', datasets.subjects],
  ['academy.teachingSessions', datasets.teachingSessions],
  ['academy.socialLinks', datasets.socialLinks],
  ['academy.schoolStats', datasets.schoolStats],
  ['academy.alchemyRecipes', datasets.alchemyRecipes],
  ['academy.milestones', datasets.milestones],
  ['academy.apAwards', datasets.apAwards]
];

let failed = 0;
for (const [key, data] of checks) {
  const res = validator.validate(key, data);
  if (!res.valid) {
    failed += 1;
    console.error(`[ACADEMY SCHEMA FAIL] ${key}`);
    for (const msg of res.errors) console.error(`  - ${msg}`);
  }
}

const refs = validator.validateAcademyReferenceIntegrity(datasets, { strict: false });
if (refs.errors.length || refs.warnings.length) {
  console.warn(`[ACADEMY REFERENCES] errors=${refs.errors.length} warnings=${refs.warnings.length}`);
  for (const msg of refs.errors) console.error(`  [ERROR] ${msg}`);
  for (const msg of refs.warnings) console.warn(`  [WARN] ${msg}`);
}

if (failed || refs.errors.length) {
  console.error(`Academy validation failed (schemas=${failed}, refErrors=${refs.errors.length})`);
  process.exit(1);
}
console.log(`Academy validation ok (schemas=${checks.length}, refWarnings=${refs.warnings.length})`);
