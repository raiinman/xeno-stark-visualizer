#!/usr/bin/env node
// Clean-room Git History & Import Graph Analyzer (MIT License — raiinman/xeno-stark-visualizer)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseImportsFromSource } from './importParsers.mjs';

const args = process.argv.slice(2);
const targetRepo = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const maxArg = args.find(a => a.startsWith('--max='));
const maxCommits = maxArg ? parseInt(maxArg.split('=')[1], 10) : 400;

const DEFAULT_EXCLUDES = ['node_modules/', '.git/', 'dist/', 'build/', '__pycache__/', '.venv/', 'package-lock.json'];

function isExcluded(filePath) {
  return DEFAULT_EXCLUDES.some(ex => filePath.startsWith(ex) || filePath.includes('/' + ex));
}

function findNearestDox(filePath, knownFiles) {
  const parts = filePath.split('/');
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('/') + '/AGENTS.md';
    if (knownFiles.has(candidate)) return candidate;
  }
  return 'root/AGENTS.md';
}

console.log(`[XENO-STARK ANALYZER] Scanning git history in: ${targetRepo}`);
const rawLog = execSync(
  `git -C "${targetRepo}" log --reverse --max-count=${maxCommits} --date=short --pretty=format:"COMMIT_SEP|%h|%an|%ad|%s" --numstat`,
  { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
);

const commits = [];
const knownFiles = new Set();
const blocks = rawLog.split('COMMIT_SEP|').filter(Boolean);

blocks.forEach((block, idx) => {
  const lines = block.trim().split('\n');
  const [hash, author, date, message] = lines[0].split('|');
  const changes = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\t+/);
    if (parts.length < 3) continue;
    const added = parseInt(parts[0], 10) || 10;
    const removed = parseInt(parts[1], 10) || 0;
    const filePath = parts[2].replace(/\\/g, '/');
    if (isExcluded(filePath)) continue;

    knownFiles.add(filePath);
    let imports = [];
    let loc = added;
    const absFile = path.join(targetRepo, filePath);
    if (fs.existsSync(absFile) && fs.statSync(absFile).isFile()) {
      try {
        const content = fs.readFileSync(absFile, 'utf-8');
        loc = content.split('\n').length;
        imports = parseImportsFromSource(filePath, content, knownFiles);
      } catch (_) {}
    }

    changes.push({
      path: filePath,
      cluster: filePath.includes('/') ? filePath.split('/')[0] : 'root',
      dox: findNearestDox(filePath, knownFiles),
      loc,
      added,
      removed,
      churn: added + removed,
      imports
    });
  }

  if (changes.length > 0) {
    commits.push({ index: idx, hash, author, date, message, changes });
  }
});

const repoName = `raiinman/${path.basename(targetRepo)}`;
const payload = {
  repoName,
  branchMeta: 'main • Clean-Room MIT • DOX AGENTS.md Active',
  generatedAt: new Date().toISOString(),
  commits
};

const outPath = path.resolve(process.cwd(), 'public/data/history.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
console.log(`[XENO-STARK ANALYZER] Wrote ${commits.length} commits (${knownFiles.size} files) to ${outPath}`);
