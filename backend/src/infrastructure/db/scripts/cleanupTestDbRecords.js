import { DatabasePool } from '../pool.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../../../data');

async function cleanTestRecords() {
  const pool = await DatabasePool.getPool();

  // 1. Clean test assessments
  const asmPath = path.join(dataDir, 'assessments.json');
  const validAsms = new Set(JSON.parse(fs.readFileSync(asmPath, 'utf8')).map(a => a.id));
  const dbAsms = await pool.query('SELECT id FROM assessments;');
  for (const row of dbAsms.rows) {
    if (!validAsms.has(row.id)) {
      console.log('Cleaning test assessment:', row.id);
      await pool.query('DELETE FROM fit_gap_dimensions WHERE assessment_id = $1;', [row.id]);
      await pool.query('DELETE FROM assessment_audit_events WHERE assessment_id = $1;', [row.id]);
      await pool.query('DELETE FROM assessments WHERE id = $1;', [row.id]);
    }
  }

  // 2. Clean test generation projects
  const genDir = path.join(dataDir, 'generation-projects');
  const validProjects = new Set(fs.readdirSync(genDir));
  const dbProjects = await pool.query('SELECT project_id FROM generation_projects;');
  for (const row of dbProjects.rows) {
    if (!validProjects.has(row.project_id)) {
      console.log('Cleaning test project:', row.project_id);
      await pool.query('DELETE FROM generation_artifacts WHERE project_id = $1;', [row.project_id]);
      await pool.query('DELETE FROM generation_specifications WHERE project_id = $1;', [row.project_id]);
      await pool.query('DELETE FROM generation_activity_events WHERE project_id = $1;', [row.project_id]);
      await pool.query('DELETE FROM generation_projects WHERE project_id = $1;', [row.project_id]);
    }
  }

  // 3. Clean test handoffs
  const hndPath = path.join(dataDir, 'generationHandoffs.json');
  const validHandoffs = new Set(JSON.parse(fs.readFileSync(hndPath, 'utf8')).map(h => h.handoffId));
  const dbHandoffs = await pool.query('SELECT handoff_id FROM generation_handoffs;');
  for (const row of dbHandoffs.rows) {
    if (!validHandoffs.has(row.handoff_id)) {
      console.log('Cleaning test handoff:', row.handoff_id);
      await pool.query('DELETE FROM build_architect_approvals WHERE handoff_id = $1;', [row.handoff_id]);
      await pool.query('DELETE FROM generation_handoffs WHERE handoff_id = $1;', [row.handoff_id]);
    }
  }

  console.log('Cleanup completed successfully.');
  await DatabasePool.close();
}

cleanTestRecords().catch(console.error);
