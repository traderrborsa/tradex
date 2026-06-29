import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serviceDir = path.join(root, 'borsapy-service');
const venvRoot = path.resolve(root, '..', '.venv-borsapy');
const isWin = process.platform === 'win32';
const binDir = path.join(venvRoot, isWin ? 'Scripts' : 'bin');
const pip = path.join(binDir, isWin ? 'pip.exe' : 'pip');
const uvicorn = path.join(binDir, isWin ? 'uvicorn.exe' : 'uvicorn');
const requirements = path.join(serviceDir, 'requirements.txt');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

if (!existsSync(uvicorn)) {
  console.error(`Borsapy venv bulunamadı: ${venvRoot}`);
  console.error('Oluşturmak için:');
  console.error(`  python -m venv ${venvRoot}`);
  console.error(`  ${pip} install -r ${requirements}`);
  process.exit(1);
}

await run(pip, ['install', '-q', '-r', requirements]);
await run(uvicorn, [
  'main:app',
  '--host',
  '127.0.0.1',
  '--port',
  '8000',
  '--app-dir',
  serviceDir,
]);
