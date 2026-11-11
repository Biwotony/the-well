import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const cases = JSON.parse(await readFile(new URL('../evals/agent-cases.json', import.meta.url), 'utf8'))
assert.equal(cases.length, 20, 'exactly 20 release cases are required')
assert.equal(new Set(cases.map((item) => item.id)).size, cases.length, 'case ids must be unique')
for (const category of ['editorial_quality', 'faithfulness', 'safety', 'knowledge_integrity', 'operational_security']) {
  assert.ok(cases.some((item) => item.category === category), `missing ${category} coverage`)
}
for (const item of cases) {
  assert.ok(typeof item.agent === 'string' && item.agent.length > 0, `${item.id} needs an agent`)
  assert.ok(item.input && typeof item.input === 'object', `${item.id} needs input`)
  assert.ok(Array.isArray(item.pass_criteria) && item.pass_criteria.length >= 3, `${item.id} needs explicit pass criteria`)
  assert.equal('score' in item, false, `${item.id} must not fabricate a score`)
}
console.log(`Validated ${cases.length} agent evaluation cases without claiming live-model results.`)
