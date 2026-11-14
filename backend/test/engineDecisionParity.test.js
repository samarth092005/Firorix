import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RecommendationEngine, RECOMMENDATION_OUTCOMES, BUSINESS_OUTCOMES, GOVERNANCE_STATES } from '../src/engine/recommendationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, '../../shared/test-fixtures/engineParityScenarios.json');

test('Backend / Frontend Parity: 14-Scenario Decision Engine Parity Suite (Shared Fixture Driven)', async (t) => {
  const recEngine = new RecommendationEngine();

  assert.ok(fs.existsSync(FIXTURE_PATH), `Shared parity fixture must exist at: ${FIXTURE_PATH}`);
  const rawFixtures = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const scenarios = JSON.parse(rawFixtures);

  assert.strictEqual(Array.isArray(scenarios), true, 'Fixture must contain an array of scenarios');
  assert.strictEqual(scenarios.length, 14, 'Fixture must contain exactly 14 parity scenarios');

  for (const scn of scenarios) {
    await t.test(`${scn.index}. ${scn.name}`, () => {
      const res = recEngine.generate({
        assessment: scn.inputs.assessment,
        requirement: scn.inputs.requirement,
        candidate: scn.inputs.candidate,
        context: scn.inputs.context
      });

      assert.strictEqual(
        res.outcome,
        scn.expected.outcome,
        `Scenario ${scn.index} (${scn.name}) outcome mismatch: expected ${scn.expected.outcome}, got ${res.outcome}`
      );
      assert.strictEqual(
        res.businessOutcome,
        scn.expected.businessOutcome,
        `Scenario ${scn.index} (${scn.name}) businessOutcome mismatch: expected ${scn.expected.businessOutcome}, got ${res.businessOutcome}`
      );
      assert.strictEqual(
        res.governanceState,
        scn.expected.governanceState,
        `Scenario ${scn.index} (${scn.name}) governanceState mismatch: expected ${scn.expected.governanceState}, got ${res.governanceState}`
      );
      assert.strictEqual(
        res.isBusinessOutcome,
        scn.expected.isBusinessOutcome,
        `Scenario ${scn.index} (${scn.name}) isBusinessOutcome mismatch: expected ${scn.expected.isBusinessOutcome}, got ${res.isBusinessOutcome}`
      );
    });
  }
});
