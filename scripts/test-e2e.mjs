import { spawn } from 'node:child_process';
// Playwright sets FORCE_COLOR for its workers; remove the conflicting host setting.
const env = { ...process.env };
delete env.NO_COLOR;
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], { env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
