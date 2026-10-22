// Xeno-Stark: a repository map, with GitHub as the source of truth.
const $ = id => document.getElementById(id);
const DEFAULT_REPO = 'raiinman/xeno-stark-visualizer';
const validRepo = value => /^[\w.-]+\/[\w.-]+$/.test(value);
const requestedRepo = new URL(location.href).searchParams.get('repo');
const state = {
  repo: validRepo(requestedRepo || '') ? requestedRepo : DEFAULT_REPO,
  branch: 'main', commits: [], index: 0, files: [], nodes: [], trees: new Map(),
  yaw: 0, pitch: 0.12, zoom: 1, autoRotate: false, query: '', folder: '',
  hovered: null, playing: false, loading: false, version: 0, selection: 0,
  changed: new Set(), changedAt: 0, source: '', noticeTimer: null
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = $('graph');
const ctx = canvas.getContext('2d');
const core = new Image();
core.src = new URL('../public/assets/arc-xeno-core.jpg', import.meta.url).href;
let width = 0, height = 0, projections = [], lastFrame = 0, dirty = true;
let palette = {};
let playTimer;

function notice(message, persistent = false) {
  clearTimeout(state.noticeTimer);
  $('notice').textContent = message;
  $('notice').hidden = !message;
  if (message && !persistent) state.noticeTimer = setTimeout(() => $('notice').hidden = true, 6500);
}

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${state.repo}${path ? '/' + path : ''}`, {
    headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(18000)
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new Error('GitHub’s request limit was reached. Try again later.');
    if (response.status === 404) throw new Error('Repository or commit not found. Use a public repository.');
    if (response.status === 409) throw new Error('This repository has no commits yet.');
    throw new Error(`GitHub could not load this repository (${response.status}).`);
  }
  return response.json();
}

function normalizeCommit(c) {
  return { sha: c.sha, tree: c.commit.tree.sha, message: c.commit.message.split('\n')[0],
    date: c.commit.author?.date || c.commit.committer.date,
    author: c.author?.login || c.commit.author?.name || 'Unknown author' };
}

function cleanTree(tree) {
  return tree.filter(f => f.type === 'blob' || f.type === 'commit')
    .map(f => ({ path: f.path, sha: f.sha, size: f.size || 0, type: f.type }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function getTree(commit) {
  if (state.trees.has(commit.sha)) return state.trees.get(commit.sha);
  const data = await github(`git/trees/${commit.tree}?recursive=1`);
  if (data.truncated) throw new Error('This repository is too large for GitHub’s recursive file listing. Choose a smaller repository.');
  const files = cleanTree(data.tree);
  state.trees.set(commit.sha, files);
  return files;
}

function repoHeader() {
  const [owner, name] = state.repo.split('/');
  $('repo-link').replaceChildren(document.createTextNode(`${owner}/`));
  const strong = document.createElement('strong');
  strong.textContent = name;
  $('repo-link').append(strong);
  $('repo-link').href = `https://github.com/${state.repo}`;
  $('repo-link').title = `Open ${state.repo} on GitHub`;
  $('repo-input').value = state.repo;
  $('branch-name').textContent = state.branch;
  document.title = `${name} | Xeno-Stark`;
}

function updateHistory() {
  const c = state.commits[state.index];
  $('history').max = Math.max(0, state.commits.length - 1);
  $('history').value = state.index;
  $('history').disabled = state.commits.length < 2;
  $('play-button').disabled = state.commits.length < 2;
  $('latest-button').disabled = state.index === state.commits.length - 1 || !c;
  $('history-position').textContent = c ? `${state.index + 1} / ${state.commits.length}` : '';
  if (!c) return;
  $('commit-link').textContent = c.message;
  $('commit-link').title = c.message;
  $('commit-link').href = `https://github.com/${state.repo}/commit/${c.sha}`;
  const date = new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  $('commit-meta').textContent = `${c.sha.slice(0, 7)} · ${c.author} · ${date}${state.index === state.commits.length - 1 ? ' · latest' : ''}`;
  $('data-source').textContent = `${state.source}. Showing up to 40 recent commits.`;
}

async function showCommit(index, { animate = true } = {}) {
  const version = state.version;
  const selection = ++state.selection;
  const clamped = Math.max(0, Math.min(index, state.commits.length - 1));
  const commit = state.commits[clamped];
  if (!commit) return;
  $('map-status').textContent = 'Loading files…';
  try {
    const files = await getTree(commit);
    if (version !== state.version || selection !== state.selection) return;
    const previous = new Map(state.files.map(f => [f.path, f.sha]));
    state.changed = new Set(animate ? files.filter(f => previous.get(f.path) !== f.sha).map(f => f.path) : []);
    state.changedAt = performance.now();
    state.files = files;
    state.index = clamped;
    state.hovered = null;
    $('tooltip').hidden = true;
    buildMap();
    updateHistory();
  } catch (error) {
    if (version !== state.version || selection !== state.selection) return;
    stopPlayback();
    notice(error.message || 'Could not load that commit. Try again.');
    updateMapStatus();
    updateHistory();
  }
}

async function refresh({ first = false } = {}) {
  if (state.loading) return;
  const version = state.version;
  const selection = state.selection;
  state.loading = true;
  $('refresh-button').disabled = true;
  try {
    if (first) {
      const repo = await github('');
      if (version !== state.version) return;
      state.branch = repo.default_branch;
      repoHeader();
    }
    const data = await github(`commits?sha=${encodeURIComponent(state.branch)}&per_page=40`);
    if (version !== state.version) return;
    const commits = data.map(normalizeCommit).reverse();
    if (!commits.length) throw new Error('This repository has no commits yet.');
    const wasLatest = state.index === state.commits.length - 1;
    const oldSha = state.commits[state.index]?.sha;
    const oldLatest = state.commits.at(-1)?.sha;
    // Fetch before replacing visible history, so an API error keeps the snapshot usable.
    await getTree(commits.at(-1));
    if (version !== state.version) return;
    if (selection !== state.selection) return;
    if (oldLatest === commits.at(-1).sha && state.files.length) {
      state.source = 'Connected to GitHub';
      updateHistory();
      return;
    }
    state.commits = commits;
    state.source = 'Connected to GitHub';
    $('empty-state').hidden = true;
    const kept = commits.findIndex(c => c.sha === oldSha);
    const next = wasLatest || !oldSha ? commits.length - 1 : Math.max(0, kept);
    await showCommit(next, { animate: oldLatest !== commits.at(-1).sha && !!oldLatest });
    if (oldLatest && oldLatest !== commits.at(-1).sha) notice(wasLatest ? 'Repository updated. Changed files are highlighted.' : 'New commits available. Choose Latest to see them.');
  } catch (error) {
    if (version !== state.version) return;
    const message = error.message || 'Could not reach GitHub. Check your connection and try again.';
    if (state.files.length) {
      state.source = 'Deployment snapshot (live GitHub updates unavailable)';
      $('data-source').textContent = `${state.source}. ${message}`;
      notice('Live updates unavailable. Showing the saved repository snapshot.');
    } else {
      $('empty-message').textContent = message;
      $('empty-state').hidden = false;
      $('map-status').textContent = 'Repository unavailable';
      $('commit-link').textContent = 'Could not load repository';
    }
  } finally {
    if (version === state.version) {
      state.loading = false;
      $('refresh-button').disabled = false;
    }
  }
}

async function loadRepository(repo) {
  stopPlayback();
  state.version++;
  state.selection++;
  state.repo = repo;
  state.loading = false;
  state.commits = [];
  state.files = [];
  state.trees.clear();
  state.query = '';
  state.folder = '';
  state.index = 0;
  state.hovered = null;
  $('tooltip').hidden = true;
  $('search').value = '';
  $('empty-state').hidden = true;
  $('retry-button').hidden = false;
  notice('');
  resetCamera();
  repoHeader();
  buildMap();
  $('map-status').textContent = 'Loading repository…';
  const version = state.version;
  if (repo === DEFAULT_REPO) {
    try {
      const response = await fetch(new URL('../public/data/repository.json', import.meta.url), { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const snapshot = await response.json();
        if (version !== state.version) return;
        if (snapshot.repo === repo && snapshot.commits?.length && Array.isArray(snapshot.files)) {
          state.branch = snapshot.branch;
          state.commits = snapshot.commits;
          state.source = 'Snapshot from the last site deployment';
          state.trees.set(snapshot.commits.at(-1).sha, snapshot.files);
          repoHeader();
          await showCommit(snapshot.commits.length - 1, { animate: false });
        }
      }
    } catch { /* Live GitHub loading remains available if the build snapshot is missing. */ }
  }
  if (version === state.version) await refresh({ first: true });
}

function matchingFiles() {
  return state.files.filter(f => (!state.folder || f.path.startsWith(`${state.folder}/`)) && f.path.toLowerCase().includes(state.query));
}

function buildMap() {
  const files = matchingFiles();
  const root = { path: '', name: state.repo.split('/')[1], folder: true, children: [], depth: 0, x: 0, y: 0, z: 0 };
  const folders = new Map([['', root]]);
  const nodes = [root];
  for (const f of files) {
    const parts = f.path.split('/');
    let parent = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('/');
      if (!folders.has(path)) {
        const folder = { path, name: `${parts[i]}/`, folder: true, children: [], parent, depth: i + 1 };
        folders.set(path, folder);
        parent.children.push(folder);
        nodes.push(folder);
      }
      parent = folders.get(path);
    }
    const node = { ...f, name: parts.at(-1), parent, depth: parts.length, folder: false };
    parent.children.push(node);
    nodes.push(node);
  }
  let leaf = 0;
  const maxDepth = Math.max(2, ...nodes.map(n => n.depth));
  function place(node) {
    if (!node.folder) {
      node.angle = (leaf++ / Math.max(1, files.length)) * Math.PI * 2 - Math.PI / 2;
      node.radius = 1;
      return node.angle;
    }
    const angles = node.children.map(place);
    node.angle = angles.length ? (angles[0] + angles.at(-1)) / 2 : 0;
    node.radius = node === root ? 0 : 0.22 + (node.depth / maxDepth) * 0.48;
    return node.angle;
  }
  place(root);
  for (const node of nodes) {
    node.x = Math.cos(node.angle) * node.radius;
    node.y = Math.sin(node.angle) * node.radius;
    node.z = node === root ? 0 : Math.sin(node.angle * 3 + node.depth) * 0.12;
  }
  state.nodes = files.length ? nodes : [];
  updateMapStatus();
  renderFileList(files);
  $('clear-filter').hidden = !state.folder && !state.query;
  $('empty-state').hidden = !!files.length || !state.files.length;
  if (!files.length && state.files.length) {
    $('empty-message').textContent = 'No matching files. Clear the search to see the full map.';
    $('retry-button').hidden = true;
  } else $('retry-button').hidden = false;
  dirty = true;
}

function updateMapStatus() {
  const count = matchingFiles().length;
  $('map-status').textContent = state.files.length ? `${count} ${count === 1 ? 'file' : 'files'}${state.folder || state.query ? ` of ${state.files.length}` : ''} · ${state.nodes.filter(n => n.folder && n.path).length} folders` : 'Loading repository…';
}

function fileUrl(file) {
  const sha = state.commits[state.index]?.sha;
  const path = file.path.split('/').map(encodeURIComponent).join('/');
  return `https://github.com/${state.repo}/${file.type === 'commit' ? 'tree' : 'blob'}/${sha}/${path}`;
}

function renderFileList(files) {
  const fragment = document.createDocumentFragment();
  for (const file of files) {
    const a = document.createElement('a');
    a.className = 'file-link';
    a.href = fileUrl(file);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = file.path;
    fragment.append(a);
  }
  if (!files.length) {
    const p = document.createElement('p');
    p.className = 'panel-note';
    p.textContent = 'No matching files.';
    fragment.append(p);
  }
  $('file-list').replaceChildren(fragment);
}

function readPalette() {
  const styles = getComputedStyle(document.body);
  palette = Object.fromEntries(['cyan', 'green', 'gold', 'muted', 'text', 'bg'].map(name => [name, styles.getPropertyValue(`--${name}`).trim()]));
  dirty = true;
}

function resize() {
  const box = canvas.getBoundingClientRect();
  width = box.width;
  height = box.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dirty = true;
}

function project(node) {
  const x = node.x * Math.cos(state.yaw) + node.z * Math.sin(state.yaw);
  const z = -node.x * Math.sin(state.yaw) + node.z * Math.cos(state.yaw);
  const y = node.y * Math.cos(state.pitch) - z * Math.sin(state.pitch);
  const depth = node.y * Math.sin(state.pitch) + z * Math.cos(state.pitch);
  const scale = 3 / (3 + depth);
  // More vertical space on phones keeps the map legible without horizontal scrolling.
  const rx = Math.max(40, Math.min(width * 0.33, height * 0.37)) * state.zoom;
  const ry = Math.max(40, Math.min(height * 0.36, width * 0.39)) * state.zoom;
  return { node, x: width / 2 + x * rx * scale, y: height / 2 + y * ry * scale, scale, depth };
}

function draw(time) {
  ctx.clearRect(0, 0, width, height);
  projections = state.nodes.map(project);
  if (!projections.length) return;
  const byNode = new Map(projections.map(p => [p.node, p]));
  const cx = width / 2, cy = height / 2;
  const ring = Math.min(width * 0.3, height * 0.34) * state.zoom;
  ctx.strokeStyle = palette.cyan;
  ctx.globalAlpha = 0.09;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, ring * 0.48, ring * 0.48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, ring * 1.24, -0.14, 0.5);
  ctx.arc(cx, cy, ring * 1.24, Math.PI - 0.14, Math.PI + 0.5);
  ctx.stroke();
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    const r = ring * 0.48;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r + (i % 4 ? 3 : 7)), cy + Math.sin(a) * (r + (i % 4 ? 3 : 7)));
    ctx.stroke();
  }
  const active = new Set();
  let ancestor = state.hovered;
  while (ancestor) { active.add(ancestor); ancestor = ancestor.parent; }
  // Real folder links, with an organic bend in place of the old simulated import mesh.
  for (const p of projections) {
    if (!p.node.parent) continue;
    const parent = byNode.get(p.node.parent);
    const lit = active.has(p.node) || (state.hovered?.folder && p.node.path.startsWith(`${state.hovered.path}/`));
    ctx.globalAlpha = lit ? 0.85 : 0.22;
    ctx.strokeStyle = lit ? palette.green : palette.cyan;
    ctx.lineWidth = lit ? 1.4 : 0.8;
    ctx.beginPath();
    ctx.moveTo(parent.x, parent.y);
    const dx = p.x - parent.x, dy = p.y - parent.y;
    ctx.bezierCurveTo(parent.x + dx * 0.4 - dy * 0.09, parent.y + dy * 0.4 + dx * 0.09,
      parent.x + dx * 0.75, parent.y + dy * 0.75, p.x, p.y);
    ctx.stroke();
  }
  const labels = [];
  const ordered = [...projections].sort((a, b) => b.depth - a.depth);
  for (const p of ordered) {
    const n = p.node;
    const hovered = n === state.hovered;
    const changed = state.changed.has(n.path) && time - state.changedAt < 2500;
    const color = n.folder ? palette.gold : changed ? palette.green : palette.cyan;
    const r = !n.parent ? 19 : n.folder ? 5.5 : hovered ? 6 : 4;
    ctx.globalAlpha = hovered ? 1 : 0.85;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    if (!n.parent) {
      if (core.complete && core.naturalWidth) {
        ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,19,0,Math.PI*2);ctx.clip();ctx.globalAlpha=.65;ctx.drawImage(core,p.x-19,p.y-19,38,38);ctx.restore();
      }
      ctx.globalAlpha = .5;
      ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.stroke();
    } else {
      ctx.beginPath();
      if (n.folder) { ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.lineWidth=1;ctx.stroke();ctx.fillRect(p.x-1,p.y-1,2,2); }
      else { ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill(); }
      if (hovered || changed) {
        ctx.globalAlpha = hovered ? 0.45 : 0.25;
        ctx.beginPath();ctx.arc(p.x,p.y,r+5,0,Math.PI*2);ctx.stroke();
      }
    }
    if (!$('labels').checked || !n.parent) continue;
    labels.push({ ...p, r, color, hovered });
  }
  // Greedy label placement hides only collisions. Full paths remain in hover and the file list.
  const occupied = [];
  labels.sort((a,b) => Number(b.hovered)-Number(a.hovered) || Number(b.node.folder)-Number(a.node.folder));
  for (const p of labels) {
    const fontSize = width < 600 ? 11 : 12;
    ctx.font = `${p.node.folder ? '500 ' : ''}${fontSize}px ui-monospace, Consolas, monospace`;
    const maxChars = width < 600 ? 19 : 30;
    const text = p.node.name.length > maxChars ? `${p.node.name.slice(0, maxChars - 1)}…` : p.node.name;
    const tw = ctx.measureText(text).width;
    const left = p.x < cx;
    const tx = left ? p.x - p.r - 9 - tw : p.x + p.r + 9;
    const ty = p.y - 6;
    const box = { x: tx-2, y: ty-3, w: tw+4, h: 17 };
    if (tx < 10 || tx + tw > width - 10 || ty < 60 || ty > height - 50) continue;
    if (!p.hovered && occupied.some(b => box.x < b.x+b.w && box.x+box.w > b.x && box.y < b.y+b.h && box.y+box.h > b.y)) continue;
    occupied.push(box);
    p.labelBox = box;
    const original = byNode.get(p.node);
    original.labelBox = box;
    ctx.globalAlpha = .92;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(box.x,box.y,box.w,box.h);
    ctx.fillStyle = p.node.folder ? palette.gold : hoveredLabelColor(p.node);
    ctx.fillText(text,tx,p.y+4);
  }
  ctx.globalAlpha = 1;
}

function hoveredLabelColor(node) { return node === state.hovered ? palette.text : palette.muted; }

function frame(time) {
  const delta = Math.min(40, time - lastFrame);
  lastFrame = time;
  const moving = state.autoRotate && !state.hovered && !reducedMotion.matches && !document.hidden;
  if (moving) { state.yaw += delta * 0.000035; dirty = true; }
  if (state.changed.size && time - state.changedAt < 2700) dirty = true;
  if (dirty) { draw(time); dirty = false; }
  requestAnimationFrame(frame);
}

function hitTest(x, y) {
  return [...projections].sort((a,b) => a.depth-b.depth).find(p => {
    if (!p.node.parent) return false;
    const b = p.labelBox;
    return Math.hypot(p.x-x,p.y-y) < (p.node.folder ? 14 : 13) || (b && x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h);
  })?.node;
}

function hover(node, x, y) {
  state.hovered = node;
  dirty = true;
  canvas.style.cursor = node ? 'pointer' : 'grab';
  $('tooltip').hidden = !node;
  if (!node) return;
  $('tooltip-name').textContent = node.name;
  $('tooltip-path').textContent = node.path;
  $('tooltip-action').textContent = node.folder ? 'Click to focus this folder' : 'Click to open on GitHub';
  const box = $('tooltip').getBoundingClientRect();
  $('tooltip').style.left = `${Math.max(12,Math.min(x+18,width-box.width-12))}px`;
  $('tooltip').style.top = `${Math.max(48,Math.min(y+18,height-box.height-55))}px`;
}

let drag = null;
const pointers = new Map();
let pinchDistance = 0;
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  canvas.setPointerCapture(event.pointerId);
  drag = {x:event.clientX,y:event.clientY,moved:false};
  if (pointers.size === 2) { const [a,b] = [...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);drag.moved=true; }
});
canvas.addEventListener('pointermove', event => {
  const rect = canvas.getBoundingClientRect();
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  if (!pointers.has(event.pointerId)) { hover(hitTest(x,y),x,y);return; }
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if (pointers.size === 2) {
    const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);
    if (pinchDistance > 0) zoom(distance/pinchDistance);
    pinchDistance=distance;drag.moved=true;return;
  }
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if (!drag.moved && Math.hypot(dx,dy)<5) return;
  drag.moved=true;drag.x=event.clientX;drag.y=event.clientY;
  state.yaw += dx*.004;
  state.pitch = Math.max(-.9,Math.min(.9,state.pitch+dy*.003));
  setRotate(false);hover(null,0,0);dirty=true;
});
canvas.addEventListener('pointerup',event=>{
  const clicked=drag && !drag.moved && pointers.size===1;
  pointers.delete(event.pointerId);
  if (clicked) {
    const rect=canvas.getBoundingClientRect();
    const node=hitTest(event.clientX-rect.left,event.clientY-rect.top);
    if (node?.folder) {state.folder=node.path;state.hovered=null;$('tooltip').hidden=true;buildMap();}
    else if (node) window.open(fileUrl(node),'_blank','noopener,noreferrer');
  }
  if (!pointers.size) drag=null;
  else {const p=[...pointers.values()][0];drag={...p,moved:true};}
});
canvas.addEventListener('pointercancel',()=>{pointers.clear();drag=null;});
canvas.addEventListener('pointerleave',()=>{if (!drag) hover(null,0,0);});
canvas.addEventListener('wheel',event=>{event.preventDefault();zoom(Math.exp(-event.deltaY*.001));},{passive:false});
function zoom(factor) {state.zoom=Math.max(.45,Math.min(3.5,state.zoom*factor));dirty=true;}
function setRotate(value) {state.autoRotate=value;$('rotate-button').setAttribute('aria-pressed',String(value));$('rotate-button').setAttribute('aria-label',`${value?'Stop':'Start'} automatic rotation`);dirty=true;}
function resetCamera() {state.yaw=0;state.pitch=.12;state.zoom=1;setRotate(false);dirty=true;}

function panel(name, open, returnFocus = false) {
  for (const other of ['files','settings']) {
    $(other+'-panel').hidden = other !== name || !open;
    $(other+'-button').setAttribute('aria-expanded',String(other===name && open));
  }
  if (open) $('close-'+name).focus();
  else if (returnFocus) $(name+'-button').focus();
}
for (const name of ['files','settings']) {
  $(name+'-button').onclick=()=>panel(name,$(name+'-panel').hidden);
  $('close-'+name).onclick=()=>panel(name,false,true);
}
$('zoom-in').onclick=()=>zoom(1.18);
$('zoom-out').onclick=()=>zoom(1/1.18);
$('reset-button').onclick=resetCamera;
$('rotate-button').onclick=()=>setRotate(!state.autoRotate);
$('labels').onchange=()=>{dirty=true;};
$('theme').onchange=event=>{document.body.dataset.theme=event.target.value;readPalette();};
$('search').oninput=event=>{state.query=event.target.value.trim().toLowerCase();state.hovered=null;$('tooltip').hidden=true;buildMap();};
$('clear-filter').onclick=()=>{state.folder='';state.query='';$('search').value='';buildMap();};
$('repo-form').onsubmit=event=>{
  event.preventDefault();
  let repo=$('repo-input').value.trim().replace(/^https:\/\/github\.com\//i,'').replace(/\/$/,'').replace(/\.git$/,'');
  if (!validRepo(repo)) {notice('Enter a public repository as owner/repository.');return;}
  const url=new URL(location.href);url.searchParams.set('repo',repo);history.replaceState(null,'',url);
  panel('settings',false);loadRepository(repo);
};
$('refresh-button').onclick=()=>{notice('Checking GitHub…');refresh({first:true});};
$('retry-button').onclick=()=>loadRepository(state.repo);
$('history').oninput=event=>{stopPlayback();showCommit(Number(event.target.value));};
$('latest-button').onclick=()=>{stopPlayback();showCommit(state.commits.length-1);};
function stopPlayback(){clearTimeout(playTimer);state.playing=false;$('play-button').setAttribute('aria-label','Play recent commit history');$('play-button').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';}
$('play-button').onclick=async()=>{
  if(state.playing){stopPlayback();return;}
  state.playing=true;
  $('play-button').setAttribute('aria-label','Pause history');
  $('play-button').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  if(state.index===state.commits.length-1) await showCommit(0);
  async function step(){if(!state.playing)return;if(state.index>=state.commits.length-1){stopPlayback();return;}await showCommit(state.index+1);if(state.playing)playTimer=setTimeout(step,1800);}
  if(state.playing)playTimer=setTimeout(step,1800);
};
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    if(!$('files-panel').hidden)panel('files',false,true);
    else if(!$('settings-panel').hidden)panel('settings',false,true);
    else {state.query='';state.folder='';$('search').value='';buildMap();}
    hover(null,0,0);
  }
  if(event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('search').focus();}
});
document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('.drawer,.settings-panel,#files-button,#settings-button'))panel('files',false);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});
setInterval(()=>{if(!document.hidden && !state.playing)refresh();},300000);
new ResizeObserver(resize).observe($('workspace'));
core.onload=()=>{dirty=true;};
readPalette();
resize();
requestAnimationFrame(frame);
loadRepository(state.repo);
