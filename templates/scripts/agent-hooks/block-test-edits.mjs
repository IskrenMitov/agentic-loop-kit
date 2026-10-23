#!/usr/bin/env node
// PreToolUse hook (Claude Code and Cursor). Keeps tests written by the test-writer immutable during /task:
// - any agent: no edits to paths listed in openspec/changes/*/locked-tests.txt or .loop/*/locked-tests.txt;
// - Claude Code only (the payload carries agent_type): `developer` never edits test files and
//   `test-writer` only edits test files.
// Exit 2 blocks the tool call in both tools; allowed calls print nothing.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

// What counts as a test file. The default covers common conventions (JS/TS, Python, Go, Ruby, JVM, .NET, PHP);
// narrow it to your repo's convention during setup. Keep it in sync with the test-writer's allowed files.
const TEST_FILE = new RegExp(
  [
    String.raw`\.(spec|test)\.[cm]?[jt]sx?$`, // foo.spec.ts, foo.test.js
    String.raw`\.test-util\.[cm]?[jt]s$`, // shared test helpers
    String.raw`(^|/)test_[^/]+\.py$|_test\.py$`, // pytest
    String.raw`_test\.go$`, // Go
    String.raw`_spec\.rb$|_test\.rb$`, // RSpec, Minitest
    String.raw`(Test|Tests|Spec|IT)\.(java|kt|scala|cs)$`, // JUnit, Kotest, xUnit
    String.raw`Test\.php$`, // PHPUnit
    String.raw`(^|/)(__tests__|tests?|spec)/`, // dedicated test directories
  ].join('|'),
)
const WRITE_TOOLS = /^(Edit|Write|MultiEdit|NotebookEdit|StrReplace|Delete|EditNotebook|ApplyPatch)$/i
const SHELL_TOOLS = /^(Bash|Shell)$/i
const MUTATING_SHELL = /\b(sed\s+-i|perl\s+-\w*i|rm|mv|cp|tee|truncate|touch|git\s+(checkout|restore|rm|mv))\b/
const REVERTING_SHELL = /\bgit\s+(reset\s+--hard|checkout\s+(--\s+)?\.(\s|$)|restore\s+\.(\s|$)|stash|clean\s+-\w*f)/

function git(cwd, ...args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

function existingDir(path) {
  let dir = path
  while (!existsSync(dir) && dirname(dir) !== dir) dir = dirname(dir)
  return dir
}

/** The checkout `dir` belongs to, plus the main checkout when it is a linked worktree. */
function roots(dir) {
  const top = git(dir, 'rev-parse', '--show-toplevel')
  if (!top) return []
  const common = git(dir, 'rev-parse', '--path-format=absolute', '--git-common-dir')
  const main = common ? dirname(common) : top
  return [...new Set([top, main])]
}

function lockedPaths(rootDirs) {
  const locked = new Set()
  for (const root of rootDirs) {
    for (const base of ['openspec/changes', '.loop']) {
      const dir = join(root, base)
      if (!existsSync(dir)) continue
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name, 'locked-tests.txt')
        if (!entry.isDirectory() || !existsSync(file)) continue
        for (const line of readFileSync(file, 'utf8').split('\n')) {
          const path = line.trim()
          if (path && !path.startsWith('#')) locked.add(path.replace(/^\.\//, ''))
        }
      }
    }
  }
  return locked
}

function block(reason) {
  const message = `Blocked by scripts/agent-hooks/block-test-edits.mjs: ${reason}`
  process.stdout.write(JSON.stringify({ permission: 'deny', user_message: message, agent_message: message }))
  process.stderr.write(message)
  process.exit(2)
}

const raw = readFileSync(0, 'utf8')
if (!raw.trim()) process.exit(0)
const input = JSON.parse(raw)
const tool = String(input.tool_name ?? '')
const args = input.tool_input ?? {}
const agent = input.agent_type ?? null
const cwd = input.cwd ?? process.cwd()

if (WRITE_TOOLS.test(tool)) {
  const target = args.file_path ?? args.path ?? args.notebook_path ?? args.target_file
  if (!target) process.exit(0)
  const abs = isAbsolute(target) ? target : resolve(cwd, target)
  const rootDirs = roots(existingDir(dirname(abs)))
  if (!rootDirs.length) process.exit(0)
  const rel = relative(rootDirs[0], abs)
  if (lockedPaths(rootDirs).has(rel)) {
    block(`${rel} is a locked test of an active /task. If the test is wrong, report it to the orchestrator instead of editing it.`)
  }
  if (agent === 'developer' && TEST_FILE.test(rel)) {
    block(`the developer agent must not edit test files (${rel}). Report test problems to the orchestrator.`)
  }
  if (agent === 'test-writer' && !TEST_FILE.test(rel)) {
    block(`the test-writer agent may only edit test files (see TEST_FILE in this hook), not ${rel}.`)
  }
} else if (SHELL_TOOLS.test(tool)) {
  const command = String(args.command ?? '')
  const rootDirs = roots(args.working_directory ?? cwd)
  const locked = lockedPaths(rootDirs)
  if (!locked.size) process.exit(0)
  if (REVERTING_SHELL.test(command)) {
    block('this git command can revert locked tests while a /task is active. Use a narrower command that names the files.')
  }
  const touched = [...locked].find(path => command.includes(path))
  if (touched && (MUTATING_SHELL.test(command) || new RegExp(`>>?\\s*['"]?\\S*${touched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(command))) {
    block(`this command would modify the locked test ${touched}.`)
  }
}
