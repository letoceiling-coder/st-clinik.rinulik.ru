// Stop hook: runs only checks relevant to files changed since the last check.
// - TypeScript: `tsc --noEmit`, errors reported only for changed files (old errors elsewhere are ignored).
// - PHPUnit: only test classes related to changed PHP files (full suite takes ~5 min).
// Each change set is checked once (fingerprint in .claude/hooks/.state.json) and the hook never
// re-blocks while Claude is already reacting to a previous block (stop_hook_active) — no fix loops.
// Disable for a session: set CLAUDE_SKIP_CHECKS=1.
import { execSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const statePath = path.join(root, '.claude', 'hooks', '.state.json');

let input = {};
try {
    input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {}
if (input.stop_hook_active || process.env.CLAUDE_SKIP_CHECKS === '1') {
    process.exit(0);
}

let changed = [];
try {
    changed = execSync('git status --porcelain -uall', { cwd: root, encoding: 'utf8' })
        .split('\n')
        .filter((line) => line.length > 3 && !line.startsWith(' D') && !line.startsWith('D '))
        .map((line) => line.slice(3).trim().replace(/^.* -> /, '').replace(/^"|"$/g, ''));
} catch {
    process.exit(0);
}

const tsFiles = changed.filter((f) => /^resources\/js\/.*\.tsx?$/.test(f));
const phpFiles = changed.filter((f) => /^(app|tests|database|routes|config)\/.*\.php$/.test(f));

function fingerprint(files) {
    const hash = crypto.createHash('sha1');
    for (const file of [...files].sort()) {
        try {
            const stat = fs.statSync(path.join(root, file));
            hash.update(`${file}:${stat.size}:${stat.mtimeMs}\n`);
        } catch {}
    }
    return hash.digest('hex');
}

let state = {};
try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
} catch {}

const problems = [];
const notes = [];

const tsPrint = fingerprint(tsFiles);
if (tsFiles.length && state.ts !== tsPrint) {
    const run = spawnSync('npx tsc --noEmit --pretty false', { cwd: root, shell: true, encoding: 'utf8', timeout: 180_000 });
    const errors = (run.stdout + run.stderr)
        .split('\n')
        .filter((line) => tsFiles.some((file) => line.replaceAll('\\', '/').startsWith(file + '(')));
    if (errors.length) {
        problems.push(`TypeScript (${errors.length}):\n${errors.slice(0, 20).join('\n')}`);
    }
    state.ts = tsPrint;
}

const phpPrint = fingerprint(phpFiles);
if (phpFiles.length && state.php !== phpPrint) {
    const testClasses = new Set();
    const testFiles = listTests(path.join(root, 'tests'));
    for (const file of phpFiles) {
        const base = path.basename(file, '.php');
        if (file.startsWith('tests/') && base.endsWith('Test')) {
            testClasses.add(base);
            continue;
        }
        if (!file.startsWith('app/')) {
            continue;
        }
        const pattern = new RegExp(`\\b${base}\\b`);
        for (const testFile of testFiles) {
            if (pattern.test(fs.readFileSync(testFile, 'utf8'))) {
                testClasses.add(path.basename(testFile, '.php'));
            }
        }
    }
    const selected = [...testClasses].slice(0, 15);
    if (testClasses.size > 15) {
        notes.push(`PHPUnit: связанных тестов ${testClasses.size}, запущено 15. Полный прогон — через qa-engineer.`);
    }
    if (selected.length) {
        const run = spawnSync('php', ['artisan', 'test', '--compact', `--filter=(${selected.join('|')})`], { cwd: root, encoding: 'utf8', timeout: 240_000 });
        if (run.status !== 0) {
            problems.push(`PHPUnit (${selected.join(', ')}):\n${(run.stdout + run.stderr).trim().slice(-2500)}`);
        }
    } else if (phpFiles.some((f) => /^(routes|database|config)\//.test(f))) {
        notes.push('PHPUnit: изменены routes/database/config — связанные тесты не определены автоматически.');
    }
    state.php = phpPrint;
}

try {
    fs.writeFileSync(statePath, JSON.stringify(state));
} catch {}

if (problems.length) {
    process.stderr.write(`Автопроверки нашли проблемы в изменённых файлах (сообщается один раз):\n\n${problems.join('\n\n')}\n${notes.join('\n')}`);
    process.exit(2);
}
if (notes.length) {
    process.stdout.write(JSON.stringify({ systemMessage: notes.join('\n') }));
}

function listTests(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'playwright') {
            out.push(...listTests(full));
        } else if (entry.name.endsWith('Test.php')) {
            out.push(full);
        }
    }
    return out;
}
