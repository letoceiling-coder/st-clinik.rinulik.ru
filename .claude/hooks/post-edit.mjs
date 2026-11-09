// PostToolUse (Edit|Write): formats the edited PHP file with Pint. Silent on success.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let input = {};
try {
    input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {
    process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !filePath.endsWith('.php')) {
    process.exit(0);
}

const relative = path.relative(root, path.resolve(root, filePath)).replaceAll('\\', '/');
if (relative.startsWith('..') || /^(vendor|storage|bootstrap\/cache|node_modules)\//.test(relative)) {
    process.exit(0);
}

const result = spawnSync('php', ['vendor/bin/pint', relative, '--quiet'], { cwd: root, encoding: 'utf8', timeout: 60_000 });
if (result.status !== 0 && result.status !== null) {
    process.stderr.write(`Pint не смог отформатировать ${relative}:\n${(result.stdout + result.stderr).slice(-1500)}`);
    process.exit(1); // non-blocking warning
}
