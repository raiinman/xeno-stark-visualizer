// Clean-room multi-language import extractor (MIT License — raiinman/xeno-stark-visualizer)
import path from 'node:path';

const EXT_CANDIDATES = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.css', '.scss'];

export function parseImportsFromSource(filePath, content, knownFilesSet) {
  const ext = path.extname(filePath).toLowerCase();
  const rawSpecs = new Set();

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'].includes(ext)) {
    const re = /(?:import\s+[^'"]*from\s+|import\s*\(|require\s*\(|export\s+[^'"]*from\s+)['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) rawSpecs.add(m[1]);
  } else if (ext === '.py') {
    const re = /^\s*(?:from\s+([.\w]+)\s+import|import\s+([.\w]+))/gm;
    let m;
    while ((m = re.exec(content)) !== null) rawSpecs.add(m[1] || m[2]);
  } else if (ext === '.go') {
    const re = /"([^"]+)"/g;
    let m;
    while ((m = re.exec(content)) !== null) rawSpecs.add(m[1]);
  } else if (ext === '.rs') {
    const re = /\b(?:use|mod)\s+([\w:]+)/g;
    let m;
    while ((m = re.exec(content)) !== null) rawSpecs.add(m[1]);
  } else if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) {
    const re = /^\s*#include\s+["<]([^">]+)[">]/gm;
    let m;
    while ((m = re.exec(content)) !== null) rawSpecs.add(m[1]);
  } else if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
    const re = /@import\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) rawSpecs.add(m[1]);
  }

  const resolved = new Set();
  const dir = path.posix.dirname(filePath);

  for (const spec of rawSpecs) {
    if (spec.startsWith('.')) {
      const base = path.posix.normalize(path.posix.join(dir, spec));
      for (const candExt of EXT_CANDIDATES) {
        const cand = base + candExt;
        if (knownFilesSet.has(cand)) {
          resolved.add(cand);
          break;
        }
        const indexCand = path.posix.join(base, 'index' + candExt);
        if (knownFilesSet.has(indexCand)) {
          resolved.add(indexCand);
          break;
        }
      }
    } else {
      const norm = spec.replace(/::/g, '/').replace(/\./g, '/');
      for (const known of knownFilesSet) {
        if (known !== filePath && (known.endsWith(norm + path.extname(known)) || known.endsWith('/' + spec))) {
          resolved.add(known);
          break;
        }
      }
    }
  }
  return Array.from(resolved);
}
