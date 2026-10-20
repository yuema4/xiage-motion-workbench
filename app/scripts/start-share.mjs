import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = await new Promise((resolvePort, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const chosen = probe.address().port;
    probe.close(() => resolvePort(chosen));
  });
});
const server = spawn(process.execPath, ['scripts/serve-dist.mjs', '--port', String(port)], {
  cwd: root, stdio: ['ignore', 'pipe', 'inherit'],
});
let opened = false;
function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'cmd'
    : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => console.log(`请手动打开 ${url}`));
}
server.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (!opened && chunk.toString().includes('http://')) {
    opened = true;
    openBrowser(`http://127.0.0.1:${port}/`);
  }
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.on('exit', (code) => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
