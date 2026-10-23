#!/usr/bin/env node
// Renders the kit's templates/ into a target repository from an answers file.
//
//   node render.mjs --answers answers.json --out <repo> [--overwrite path,path] [--dry-run]
//   node render.mjs --classify <repo>      # which tracked files the installed hook treats as tests
//
// Template syntax:
// - {{NAME}}: a value from the answers, a derived value or a default (see SPEC below).
// - Lines that are exactly `<!-- @if key=value -->` / `<!-- @endif -->` keep or drop the lines between them
//   (also inside code fences). Blocks don't nest.
// - Every other standalone HTML comment (and every full-line `#` comment in YAML) is setup guidance and is removed,
//   except next to an optional placeholder the user skipped: then the comment stays under a TODO(agentic-loop) line.
// Existing files are never overwritten unless listed in --overwrite: the new version is written next to them as
// `<file>.agentic-loop-new` and reported as a conflict to merge by hand.
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const TEMPLATES = join(KIT, 'templates')

const TRACKERS = {
  notion: { name: 'Notion', fetch: '`notion-fetch` with the page URL', key: 'https://www.notion.so/…' },
  linear: { name: 'Linear', fetch: '`get_issue` with the issue key', key: 'ABC-123' },
  jira: { name: 'Jira', fetch: '`getJiraIssue` with the issue key', key: 'ABC-123' },
  github: { name: 'GitHub Issues', fetch: '`issue_read` with owner, repo and issue number', key: '#123' },
}

// kind: required (must be answered) | default (falls back to `value`) | todo (may be skipped; leaves a TODO and keeps
// the example comment next to it) | silent (may be skipped; the line disappears).
const SPEC = {
  PROJECT_NAME: { kind: 'required' },
  PROJECT_ONE_LINER: { kind: 'required' },
  PROJECT_SHORT_CONTEXT: { kind: 'default', value: a => a.PROJECT_ONE_LINER },
  DOCS_DIR: { kind: 'default', value: () => 'docs' },
  MOST_USED_DOCS: { kind: 'default', value: a => `[AI workflow](${a.DOCS_DIR}/ai/workflow.md)` },
  RUNTIME_VERSIONS: { kind: 'required' },
  CMD_INSTALL: { kind: 'required' },
  CMD_INSTALL_WORKTREE: { kind: 'default', value: a => a.CMD_INSTALL },
  CMD_TEST: { kind: 'required' },
  CMD_TEST_ONE: { kind: 'required' },
  CMD_DEV: { kind: 'silent' },
  CMD_LINT: { kind: 'silent' },
  CMD_TYPECHECK: { kind: 'silent' },
  CMD_BUILD: { kind: 'silent' },
  CMD_E2E: { kind: 'silent' },
  CMD_E2E_SETUP: { kind: 'silent' },
  E2E_WHEN: { kind: 'default', value: () => 'anything user-visible or an external interface' },
  E2E_NOTES: { kind: 'silent' },
  SCOPED_CHECKS_HINT: { kind: 'default', value: a => `run only the affected tests (\`${a.CMD_TEST_ONE}\`)` },
  FORBIDDEN_COMMANDS: { kind: 'todo', todo: 'list the commands agents must never run unasked (deploys, migrations, production).' },
  TEST_FILE_CONVENTION: { kind: 'required' },
  EXAMPLE_TEST_PATH: { kind: 'required' },
  TESTING_GUIDE: { kind: 'default', value: () => 'AGENTS.md' },
  DETERMINISM_TOOLS: { kind: 'default', value: () => 'fake clocks, fixed seeds' },
  TYPE_ESCAPE_HATCHES: { kind: 'default', value: () => 'type-checker or linter suppressions' },
  CONTRACT_DOC_HINT: { kind: 'default', value: () => '' },
  HARD_CONSTRAINTS: { kind: 'todo', todo: 'add up to ten non-obvious rules that break something when ignored (see the examples).' },
  RESEARCH_CONSTRAINT_CHECKS: { kind: 'default', value: () => 'every hard constraint in `AGENTS.md`.' },
  REVIEW_CONSTRAINT_CHECKS: { kind: 'default', value: () => 'every bullet under Hard constraints.' },
  OPENSPEC_CONTEXT: {
    kind: 'default',
    value: a => `Write all artifacts in English.\nTests are written before implementation (${a.TEST_FILE_CONVENTION}) and never hit the network.`,
  },
  LITE_DEFINITION: {
    kind: 'default',
    value: () => 'one package or module, no new user-visible behavior beyond a fix, no API or contract change, roughly under 100 changed lines.',
  },
  MAX_REVIEW_ROUNDS: { kind: 'default', value: () => '3' },
  MAX_PARALLEL: { kind: 'default', value: () => '3' },
  SHARED_HOTSPOTS: {
    kind: 'default',
    value: () => "a package's public entry point, the dependency manifest, the route table, database migrations",
  },
  BRANCH_PREFIX: { kind: 'default', value: () => 'change/' },
  TRACKER_NAME: { kind: 'default', value: a => TRACKERS[a.tracker]?.name ?? a.tracker },
  TRACKER_FETCH_HINT: { kind: 'default', value: a => TRACKERS[a.tracker]?.fetch ?? 'the tool that fetches one item by URL or key' },
  TICKET_KEY_EXAMPLE: { kind: 'default', value: a => TRACKERS[a.tracker]?.key ?? 'ABC-123' },
  CODING_STANDARDS_LINKS: { kind: 'todo', todo: 'link the coding standards the reviewer checks diffs against.' },
  CODING_STANDARDS: { kind: 'todo', todo: 'write the standards the reviewer checks diffs against (see the examples).' },
  RULE_ID_PREFIX: {
    kind: 'default',
    value: a => a.PROJECT_NAME.split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'RULE',
  },
  RULES_DB_NAME: { kind: 'required' },
  RULES_DB_URL: { kind: 'required' },
  RULES_DATA_SOURCE: { kind: 'required' },
  ...Object.fromEntries(
    ['ORCHESTRATOR', 'RESEARCHER', 'SPEC_WRITER', 'TEST_WRITER', 'DEVELOPER', 'REVIEWER', 'PROPOSED'].map(r => [
      `VIEW_${r}`,
      { kind: 'required' },
    ]),
  ),
}

const SWITCHES = {
  rules: ['markdown', 'notion'],
  standards: ['local', 'links'],
  graph: ['none', 'graphify'],
  cursor: ['no', 'yes'],
}

/** Answers + defaults + values derived from them. */
export function resolve(raw) {
  const a = { ...raw }
  for (const [key, allowed] of Object.entries(SWITCHES)) {
    a[key] ??= allowed[0]
    if (!allowed.includes(a[key])) throw new Error(`"${key}" must be one of ${allowed.join(', ')}, got "${a[key]}"`)
  }
  a.tracker = String(a.tracker ?? 'none').toLowerCase()
  const blank = v => v === undefined || v === null || String(v).trim() === ''
  for (const [name, spec] of Object.entries(SPEC)) {
    if (blank(a[name]) && spec.kind === 'default') a[name] = spec.value(a)
    else if (blank(a[name])) delete a[name]
  }
  // Switches derived from which commands exist.
  for (const [key, cmd] of [['lint', 'CMD_LINT'], ['typecheck', 'CMD_TYPECHECK'], ['build', 'CMD_BUILD'], ['e2e', 'CMD_E2E'], ['dev', 'CMD_DEV']]) {
    a[key] = a[cmd] ? 'yes' : 'no'
  }
  a.trackerOn = a.tracker === 'none' ? 'no' : 'yes'

  const checks = [['lint', 'CMD_LINT'], ['typecheck', 'CMD_TYPECHECK'], ['test', 'CMD_TEST'], ['build', 'CMD_BUILD']].filter(([, c]) => a[c])
  const cmds = checks.map(([, c]) => `\`${a[c]}\``)
  a.GATE_LIST = cmds.length > 1 ? `${cmds.slice(0, -1).join(', ')} and ${cmds.at(-1)} pass` : `${cmds[0]} passes`
  a.GATE_NAMES = [...checks.map(([n]) => n), ...(a.e2e === 'yes' ? ['e2e'] : [])].join(', ')
  const status = checks.map(([n]) => `${n} ✓`).join(' ')
  a.DEV_GATE_LINE = `Gate: ${status}${a.e2e === 'yes' ? ' (e2e: run | not needed: <reason>)' : ''}`
  a.REVIEW_GATE_LINE = `Gate: ${checks.map(([n]) => `${n} ✓/✗`).join(' ')}${a.e2e === 'yes' ? ' e2e ✓/✗/n.a.' : ''}`
  a.REPORT_GATE_LINE = `Gate: ${status}${a.e2e === 'yes' ? ' e2e ✓|n.a.|not run (<reason>)' : ''}`
  a.ARCHIVE_GRAPH_STEP = a.graph === 'graphify' ? ', then run `graphify update .`' : ''
  a.FINISH_GRAPH_STEP = a.graph === 'graphify' ? ', and run `graphify update .`' : ''
  a.TASK_INPUTS = a.trackerOn === 'yes' ? `${a.TRACKER_NAME} URL or key, or a description` : 'a description'
  a.TASK_ARG_HINT = a.trackerOn === 'yes' ? '<tracker url or key | description | resume <change-id>>' : '<description | resume <change-id>>'
  return a
}

function switchValue(a, key) {
  return key === 'tracker' ? a.trackerOn : a[key]
}

/** Renders one template's text. Returns { text, missing, todos }. */
export function renderText(text, a, { yaml = false } = {}) {
  const missing = new Set()
  const todos = []
  // 1. Conditional blocks.
  const kept = []
  let active = true
  for (const line of text.split('\n')) {
    const open = line.trim().match(/^<!-- @if (\w+)=(\w+) -->$/)
    if (open) {
      const v = switchValue(a, open[1])
      if (v === undefined) throw new Error(`unknown switch "${open[1]}"`)
      active = v === open[2]
      continue
    }
    if (line.trim() === '<!-- @endif -->') {
      active = true
      continue
    }
    if (active) kept.push(line)
  }

  // 2. Comment blocks (standalone HTML comments; full-line # comments in YAML).
  const commentOf = new Array(kept.length).fill(-1)
  const blocks = []
  for (let i = 0; i < kept.length; i++) {
    const t = kept[i].trim()
    if (yaml ? t.startsWith('#') : t.startsWith('<!--')) {
      let j = i
      if (!yaml) while (j < kept.length && !kept[j].includes('-->')) j++
      else while (j + 1 < kept.length && kept[j + 1].trim().startsWith('#')) j++
      blocks.push({ start: i, end: j, keep: false })
      for (let k = i; k <= j; k++) commentOf[k] = blocks.length - 1
      i = j
    }
  }

  // 3. Placeholders. Skipped optional placeholders on their own line remove the line.
  const out = []
  for (let i = 0; i < kept.length; i++) {
    if (commentOf[i] !== -1) {
      out.push({ i, line: kept[i], block: commentOf[i] })
      continue
    }
    const line = kept[i]
    const names = [...line.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map(m => m[1])
    const skipped = names.filter(n => a[n] === undefined)
    if (skipped.length) {
      const standalone = line.trim() === `{{${skipped[0]}}}`
      const kind = SPEC[skipped[0]]?.kind
      if (standalone && kind === 'silent') continue
      if (standalone && kind === 'todo') {
        const indent = line.match(/^\s*/)[0]
        todos.push(skipped[0])
        out.push({ i, line: `${indent}${yaml ? '#' : '<!--'} TODO(agentic-loop): ${SPEC[skipped[0]].todo}${yaml ? '' : ' -->'}` })
        for (const b of [commentOf[i - 1], commentOf[i + 1]]) if (b !== undefined && b !== -1) blocks[b].keep = true
        continue
      }
      skipped.forEach(n => missing.add(n))
    }
    const standaloneName = line.trim().match(/^\{\{([A-Z0-9_]+)\}\}$/)?.[1]
    if (standaloneName && a[standaloneName] !== undefined) {
      const indent = line.match(/^\s*/)[0]
      out.push({ i, line: String(a[standaloneName]).split('\n').map(l => (l ? indent + l : l)).join('\n') })
    } else {
      out.push({ i, line: line.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, n) => (a[n] === undefined ? m : String(a[n]))) })
    }
  }

  // 4. Drop guidance comments that aren't kept; collapse blank lines outside code fences.
  const lines = out.filter(o => o.block === undefined || blocks[o.block].keep).map(o => o.line).join('\n').split('\n')
  const result = []
  let fence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) fence = !fence
    if (!fence && line.trim() === '' && (result.length === 0 || result.at(-1).trim() === '')) continue
    result.push(line.replace(/\s+$/, ''))
  }
  while (result.length && result.at(-1) === '') result.pop()
  // A leftover {{X}} inside another value (e.g. a default that names a placeholder) gets one more pass.
  const final = result.join('\n').replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, n) => (a[n] === undefined ? (missing.add(n), m) : String(a[n])))
  return { text: `${final}\n`, missing: [...missing], todos }
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

/** Which template files are installed, and where. */
export function plan(a) {
  const skip = {
    '.claude/skills/task-intake/SKILL.md': a.trackerOn !== 'yes',
    'docs/ai/team-rules.md': a.rules !== 'markdown',
    'docs/ai/coding-standards.md': a.standards !== 'local',
    '.cursor/hooks.json': a.cursor !== 'yes',
  }
  return walk(TEMPLATES)
    .map(path => relative(TEMPLATES, path))
    .filter(rel => rel !== 'gitignore.append' && !skip[rel])
    .map(rel => ({ rel, target: rel.startsWith('docs/') ? `${a.DOCS_DIR}/${rel.slice(5)}` : rel }))
}

function hookWithPatterns(text, patterns) {
  if (!patterns?.length) return text
  const body = patterns.map(p => `    String.raw\`${p}\`,`).join('\n')
  const replaced = text.replace(/(const TEST_FILE = new RegExp\(\n  \[\n)[\s\S]*?(\n  \]\.join\('\|'\),)/, (m, start, end) => start + body + end)
  if (replaced === text) throw new Error('could not find the TEST_FILE pattern list in the hook')
  return replaced
}

export function render(raw, outDir, { overwrite = [], dryRun = false } = {}) {
  const a = resolve(raw)
  const report = { created: [], overwritten: [], conflicts: [], todos: [], missing: [] }
  for (const { rel, target } of plan(a)) {
    let text = readFileSync(join(TEMPLATES, rel), 'utf8')
    if (rel.endsWith('.md') || rel.endsWith('.yaml')) {
      const r = renderText(text, a, { yaml: rel.endsWith('.yaml') })
      text = r.text
      r.missing.forEach(n => report.missing.push(`${target}: {{${n}}}`))
      r.todos.forEach(n => report.todos.push(`${target}: ${n}`))
    }
    if (rel.endsWith('block-test-edits.mjs')) text = hookWithPatterns(text, a.hookTestPatterns)
    const dest = join(outDir, target)
    let written = dest
    if (existsSync(dest) && !overwrite.includes(target)) {
      written = `${dest}.agentic-loop-new`
      report.conflicts.push(target)
    } else (existsSync(dest) ? report.overwritten : report.created).push(target)
    if (!dryRun) {
      mkdirSync(dirname(written), { recursive: true })
      writeFileSync(written, text)
    }
  }
  // .gitignore: append the lines that aren't there yet.
  const wanted = readFileSync(join(TEMPLATES, 'gitignore.append'), 'utf8').split('\n').filter(Boolean)
  const gi = join(outDir, '.gitignore')
  const current = existsSync(gi) ? readFileSync(gi, 'utf8') : ''
  const add = wanted.filter(l => l.startsWith('#') || !current.split('\n').includes(l))
  if (add.some(l => !l.startsWith('#')) && !dryRun) {
    const prefix = current === '' ? '' : current.endsWith('\n') ? '\n' : '\n\n'
    appendFileSync(gi, `${prefix}${add.join('\n')}\n`)
  }
  return report
}

function classify(repo) {
  const hook = readFileSync(join(repo, 'scripts/agent-hooks/block-test-edits.mjs'), 'utf8')
  const expr = hook.match(/const TEST_FILE = (new RegExp\([\s\S]*?\n\)|\/.*\/[a-z]*)\n/)?.[1]
  if (!expr) throw new Error('TEST_FILE not found in the hook')
  const TEST_FILE = new Function(`return ${expr}`)()
  const files = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean)
  const tests = files.filter(f => TEST_FILE.test(f))
  console.log(`${tests.length} of ${files.length} tracked files count as tests:`)
  for (const f of tests.slice(0, 200)) console.log(`  ${f}`)
  if (tests.length > 200) console.log(`  … ${tests.length - 200} more`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const opt = name => {
    const i = args.indexOf(name)
    return i === -1 ? undefined : args[i + 1]
  }
  try {
    if (opt('--classify')) {
      classify(opt('--classify'))
    } else {
      const answers = opt('--answers')
      const out = opt('--out')
      if (!answers || !out) throw new Error('usage: render.mjs --answers <file> --out <repo> [--overwrite a,b] [--dry-run]')
      const report = render(JSON.parse(readFileSync(answers, 'utf8')), out, {
        overwrite: (opt('--overwrite') ?? '').split(',').filter(Boolean),
        dryRun: args.includes('--dry-run'),
      })
      console.log(JSON.stringify(report, null, 2))
      if (report.missing.length) process.exit(1)
    }
  } catch (error) {
    console.error(`render.mjs: ${error.message}`)
    process.exit(1)
  }
}
