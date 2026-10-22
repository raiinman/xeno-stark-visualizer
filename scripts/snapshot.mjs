// Build a real, API-independent repository snapshot for the Pages deployment.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, cpSync } from 'node:fs';
import path from 'node:path';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const repo = process.env.GITHUB_REPOSITORY || 'raiinman/xeno-stark-visualizer';
const branch = process.env.GITHUB_REF_NAME || git('branch', '--show-current').trim() || 'main';
const commits = git('log', '-40', '--format=%H%x00%T%x00%aI%x00%an%x00%s').trim().split('\n').filter(Boolean).map(line => {
  const [sha, tree, date, author, message] = line.split('\0');
  return { sha, tree, date, author, message };
}).reverse();
const files = git('ls-tree', '-r', '-l', '-z', 'HEAD').split('\0').filter(Boolean).map(line => {
  const tab = line.indexOf('\t');
  const [, type, sha, size] = line.slice(0, tab).trim().split(/\s+/);
  return { path: line.slice(tab + 1), type, sha, size: Number(size) || 0 };
}).sort((a,b) => a.path.localeCompare(b.path));
const out = path.resolve('public/data');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'repository.json'), JSON.stringify({ repo, branch, commits, files }));
if (process.argv.includes('--site')) {
  mkdirSync('dist', { recursive: true });
  for (const file of ['index.html', 'src', 'public']) cpSync(file, path.join('dist', file), { recursive: true });
  writeFileSync('dist/.nojekyll', '');
}
console.log(`Snapshot: ${files.length} real files, ${commits.length} recent commits.`);
