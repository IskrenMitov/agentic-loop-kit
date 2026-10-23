// Renders the example and fixture answers and checks the output is complete and consistent.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { render } from '../skills/setup/scripts/render.mjs'

const root = new URL('..', import.meta.url).pathname
const answers = path => JSON.parse(readFileSync(join(root, path), 'utf8'))
const dirs = []
function tmp() {
  const dir = mkdtempSync(join(tmpdir(), 'render-'))
  dirs.push(dir)
  return dir
}
after(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })))

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

for (const fixture of ['examples/acme-orders/answers.json', 'tests/fixtures/minimal.json', 'tests/fixtures/notion.json']) {
  describe(fixture, () => {
    const out = tmp()
    const report = render(answers(fixture), out)

    test('no missing values', () => assert.deepEqual(report.missing, []))
    test('no leftover placeholders or markers', () => {
      for (const file of files(out)) {
        const text = readFileSync(file, 'utf8')
        assert.doesNotMatch(text, /\{\{[A-Z0-9_]+\}\}|<!-- @(if|endif)/, file)
      }
    })
    test('JSON files parse', () => {
      for (const file of files(out).filter(f => f.endsWith('.json'))) JSON.parse(readFileSync(file, 'utf8'))
    })
    test('the hook is valid JavaScript', () => {
      execFileSync('node', ['--check', join(out, 'scripts/agent-hooks/block-test-edits.mjs')])
    })
  })
}

test('the acme example AGENTS.md is the rendered one', () => {
  const out = tmp()
  render(answers('examples/acme-orders/answers.json'), out)
  assert.equal(readFileSync(join(out, 'AGENTS.md'), 'utf8'), readFileSync(join(root, 'examples/acme-orders/AGENTS.md'), 'utf8'))
})

test('optional files follow the switches', () => {
  const minimal = tmp()
  render(answers('tests/fixtures/minimal.json'), minimal)
  assert.ok(!existsSync(join(minimal, '.claude/skills/task-intake/SKILL.md')))
  assert.ok(!existsSync(join(minimal, '.cursor/hooks.json')))
  assert.ok(existsSync(join(minimal, 'docs/ai/team-rules.md')))
  const notion = tmp()
  render(answers('tests/fixtures/notion.json'), notion)
  assert.ok(existsSync(join(notion, '.claude/skills/task-intake/SKILL.md')))
  assert.ok(existsSync(join(notion, '.cursor/hooks.json')))
  assert.ok(!existsSync(join(notion, 'docs/ai/team-rules.md')))
  assert.ok(!existsSync(join(notion, 'docs/ai/coding-standards.md')))
})

test('skipped optional commands disappear from the gate', () => {
  const out = tmp()
  render(answers('tests/fixtures/minimal.json'), out)
  const gate = readFileSync(join(out, '.claude/skills/quality-gate/SKILL.md'), 'utf8')
  assert.doesNotMatch(gate, /e2e|build|lint/i)
  assert.match(readFileSync(join(out, 'AGENTS.md'), 'utf8'), /1\. `npm test` passes\./)
})

test('existing files are never overwritten', () => {
  const out = tmp()
  writeFileSync(join(out, 'AGENTS.md'), 'mine\n')
  writeFileSync(join(out, '.gitignore'), 'node_modules')
  const report = render(answers('tests/fixtures/minimal.json'), out)
  assert.deepEqual(report.conflicts, ['AGENTS.md'])
  assert.equal(readFileSync(join(out, 'AGENTS.md'), 'utf8'), 'mine\n')
  assert.ok(existsSync(join(out, 'AGENTS.md.agentic-loop-new')))
  render(answers('tests/fixtures/minimal.json'), out)
  const gitignore = readFileSync(join(out, '.gitignore'), 'utf8')
  assert.equal(gitignore.match(/\.loop\//g).length, 1, 'appending twice must not duplicate lines')
  assert.ok(gitignore.startsWith('node_modules\n\n# agentic loop'))
})

test('custom test patterns reach the hook', () => {
  const out = tmp()
  render(answers('examples/acme-orders/answers.json'), out)
  execFileSync('git', ['init', '-q'], { cwd: out })
  const hook = join(out, 'scripts/agent-hooks/block-test-edits.mjs')
  const edit = file =>
    spawnSync('node', [hook], {
      input: JSON.stringify({ tool_name: 'Edit', agent_type: 'developer', cwd: out, tool_input: { file_path: join(out, file) } }),
    }).status
  assert.equal(edit('tests/orders/test_refund.py'), 2)
  assert.equal(edit('app/orders/refund.py'), 0)
  assert.equal(edit('src/a.spec.ts'), 0, 'the default JS pattern was replaced')
})
