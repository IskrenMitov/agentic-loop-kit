// Tests for templates/scripts/agent-hooks/block-test-edits.mjs, run against a throwaway git repo.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'

const HOOK = new URL('../templates/scripts/agent-hooks/block-test-edits.mjs', import.meta.url).pathname
let repo

function run(payload) {
  const result = spawnSync('node', [HOOK], { input: JSON.stringify({ cwd: repo, ...payload }), encoding: 'utf8' })
  return result.status
}
const edit = (file, agent) => run({ tool_name: 'Edit', agent_type: agent, tool_input: { file_path: join(repo, file) } })
const bash = command => run({ tool_name: 'Bash', tool_input: { command } })

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'hook-'))
  execFileSync('git', ['init', '-q'], { cwd: repo })
  mkdirSync(join(repo, 'src'), { recursive: true })
  mkdirSync(join(repo, 'tests'), { recursive: true })
  writeFileSync(join(repo, 'src/refund.py'), '')
  writeFileSync(join(repo, 'tests/test_refund.py'), '')
})
after(() => rmSync(repo, { recursive: true, force: true }))

describe('without an active lock', () => {
  test('developer may edit source', () => assert.equal(edit('src/refund.py', 'developer'), 0))
  test('developer may not edit tests', () => assert.equal(edit('tests/test_refund.py', 'developer'), 2))
  test('test-writer may edit tests', () => assert.equal(edit('tests/test_refund.py', 'test-writer'), 0))
  test('test-writer may not edit source', () => assert.equal(edit('src/refund.py', 'test-writer'), 2))
  test('main session may edit anything', () => assert.equal(edit('tests/test_refund.py', undefined), 0))
  test('git stash is allowed', () => assert.equal(bash('git stash'), 0))
  test('recognizes common test conventions', () => {
    for (const file of ['a.spec.ts', 'a.test.js', 'pkg/a_test.go', 'spec/a_spec.rb', 'src/test/java/ATest.java', 'src/__tests__/a.ts']) {
      assert.equal(edit(file, 'developer'), 2, file)
    }
  })
})

describe('with a locked test', () => {
  before(() => {
    mkdirSync(join(repo, '.loop/fix-refund'), { recursive: true })
    writeFileSync(join(repo, '.loop/fix-refund/locked-tests.txt'), '# locked\ntests/test_refund.py\n')
  })
  test('nobody may edit the locked test', () => assert.equal(edit('tests/test_refund.py', undefined), 2))
  test('test-writer may not edit the locked test', () => assert.equal(edit('tests/test_refund.py', 'test-writer'), 2))
  test('shell writes to the locked test are blocked', () => assert.equal(bash('echo x >> tests/test_refund.py'), 2))
  test('reverting git commands are blocked', () => {
    for (const cmd of ['git stash', 'git reset --hard', 'git checkout .', 'git restore .', 'git clean -fd']) {
      assert.equal(bash(cmd), 2, cmd)
    }
  })
  test('unrelated commands are allowed', () => assert.equal(bash('cat tests/test_refund.py'), 0))
})
