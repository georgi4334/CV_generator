// Prints the test coverage of every package as a Markdown table (CI puts it in the run summary).
// Run `pnpm coverage` first. There is no minimum yet: the numbers are there to show where tests are thin.
import { existsSync, readFileSync } from 'node:fs'
import { stdout } from 'node:process'

const packages = [
  ['shared', 'packages/shared'],
  ['api', 'apps/api'],
  ['web', 'apps/web'],
]

const print = (text) => stdout.write(`${text}\n`)

const rows = []
for (const [name, dir] of packages) {
  const file = `${dir}/coverage/coverage-summary.json`
  if (!existsSync(file)) continue
  const { total } = JSON.parse(readFileSync(file, 'utf8'))
  const pct = (key) => `${total[key].pct}%`
  rows.push(
    `| ${name} | ${pct('statements')} | ${pct('branches')} | ${pct('functions')} | ${pct('lines')} |`,
  )
}

print('## Test coverage (unit and API tests)\n')
print('| Package | Statements | Branches | Functions | Lines |')
print('| ------- | ---------- | -------- | --------- | ----- |')
print(rows.join('\n') || '| (no coverage found: run `pnpm coverage`) | | | | |')
