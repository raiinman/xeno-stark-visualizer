import { layoutHologramNodes, drawHologram } from './hologram.js';
import { createFilePreview } from './filePreview.js';
import { createRepositoryExplorer } from './repositoryExplorer.js';
// A cached pre-preview shell can meet newer scripts during a Pages rollout.
// Migrate it once to a fresh shell, preserving the chosen repository query.
if (document.getElementById('file-preview')?.tagName !== 'TEMPLATE' || !document.getElementById('file-dock') || !document.getElementById('repository-explorer') || !document.getElementById('layout')) {
  const fresh = new URL(location.href);
  const version = new URL(import.meta.url).searchParams.get('v') || 'command-deck-3';
  if (fresh.searchParams.get('_ui') !== version) {
    fresh.searchParams.set('_ui', version);
    location.replace(fresh.href);
  } else {
    document.getElementById('map-status').textContent = 'A new version is available. Refresh this page to load it.';
  }
} else {
// Xeno-Stark: a repository map, with GitHub as the source of truth.
const $ = id => document.getElementById(id);
const DEFAULT_REPO = 'raiinman/xeno-stark-visualizer';
const validRepo = value => typeof value === 'string' && /^[\w.-]+\/[\w.-]+$/.test(value);
const requestedRepo = new URL(location.href).searchParams.get('repo');
const WORKSPACE_KEY = 'xeno-stark:workspace:v1';
let savedWorkspace = {};
try {
  const saved = JSON.parse(localStorage.getItem(WORKSPACE_KEY));
  if (saved?.version === 1) savedWorkspace = saved;
} catch { /* Browser storage is optional. */ }
const state = {
  repo: validRepo(requestedRepo || '') ? requestedRepo : validRepo(savedWorkspace.repo || '') ? savedWorkspace.repo : DEFAULT_REPO,
  branch: 'main', commits: [], index: 0, files: [], nodes: [], trees: new Map(),
  yaw: 0.45, pitch: 0.55, zoom: 1, autoRotate: true, query: '', folder: '',
  theme: ['fusion','jarvis','muthur'].includes(savedWorkspace.theme) ? savedWorkspace.theme : 'fusion',
  layoutMode: ['orbital','helix','hive'].includes(savedWorkspace.layoutMode) ? savedWorkspace.layoutMode : 'orbital', previewPath: null, previewTarget: null,
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
const filePreview = createFilePreview({
  getContext: () => ({ repo: state.repo, sha: state.commits[state.index]?.sha }),
  onOpen: file => { stopPlayback(); state.previewPath = file.path; hover(null, 0, 0); dirty = true; },
  onClose: () => { state.previewPath = null; state.previewTarget = null; canvas.focus({ preventScroll: true }); dirty = true; },
  onGeometryChange: () => { dirty = true; }
});
const explorer = createRepositoryExplorer({
  getContext: () => ({ repo: state.repo, branch: state.branch, files: state.files, commits: state.commits, index: state.index, info: state.repositoryInfo, theme: state.theme, layoutMode: state.layoutMode }),
  onRepository: repo => { const url = new URL(location.href);url.searchParams.set('repo',repo);history.replaceState(null,'',url);loadRepository(repo); },
  onCommit: index => { stopPlayback();showCommit(index); },
  onFolder: path => { state.folder = path;state.query = '';$('search').value = '';buildMap();$('hologram').scrollIntoView({ block: 'start', behavior: 'instant' }); },
  onFile: file => filePreview.open(file),
  onTheme: setTheme,
  onLayout: setLayout,
  onExport: exportRepository
});
function saveWorkspace() {
  try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ version: 1, repo: state.repo, theme: state.theme, layoutMode: state.layoutMode })); }
  catch { /* Restricted or full storage must not interrupt the workspace. */ }
}
function setTheme(theme) { state.theme = theme;document.body.dataset.theme = theme;$('theme').value = theme;readPalette();explorer.update();saveWorkspace(); }
function setLayout(layout) { state.layoutMode = layout;$('layout').value = layout;layoutHologramNodes(state.nodes,layout);dirty = true;explorer.update();saveWorkspace(); }
function exportRepository(kind) {
  const download = (blob, name) => { const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href = url;a.download = name;a.click();setTimeout(() => URL.revokeObjectURL(url),1000); };
  if (kind === 'png') canvas.toBlob(blob => { if(blob)download(blob,'xeno-stark-hologram.png'); });
  else download(new Blob([JSON.stringify({ repo: state.repo, branch: state.branch, commits: state.commits.slice(0,state.index + 1), files: state.files },null,2)],{type:'application/json'}),'repository.json');
}

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
  explorer.update();
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
  explorer.update();
}

async function showCommit(index, { animate = true } = {}) {
  if (filePreview.isOpen) filePreview.close();
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
      state.repositoryInfo = repo;
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
  filePreview.close({ preserve: true });
  stopPlayback();
  state.version++;
  state.selection++;
  state.repo = repo;
  saveWorkspace();
  state.loading = false;
  state.commits = [];
  state.files = [];
  state.repositoryInfo = null;
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
      const snapshotUrl = new URL('../public/data/repository.json', import.meta.url);
      const buildVersion = new URL(import.meta.url).searchParams.get('v');
      if (buildVersion) snapshotUrl.searchParams.set('v', buildVersion);
      const response = await fetch(snapshotUrl, { signal: AbortSignal.timeout(8000) });
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
  if (version === state.version) {
    await refresh({ first: true });
    if (version === state.version) filePreview.restore();
  }
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
  state.nodes = files.length ? nodes : [];
  layoutHologramNodes(state.nodes, state.layoutMode);
  updateMapStatus();
  renderFileList(files);
  $('clear-filter').hidden = !state.folder && !state.query;
  $('empty-state').hidden = !!files.length || !state.files.length;
  if (!files.length && state.files.length) {
    $('empty-message').textContent = 'No matching files. Clear the search to see the full map.';
    $('retry-button').hidden = true;
  } else $('retry-button').hidden = false;
  dirty = true;
  explorer.update();
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
    a.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      panel('files', false);
      filePreview.open(file);
    });
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

function draw(time) {
  if (filePreview.activeWindow) {
    const pane = filePreview.activeWindow.getBoundingClientRect();
    const graph = canvas.getBoundingClientRect();
    state.previewTarget = { x: pane.left - graph.left, y: pane.top - graph.top + 45 };
  }
  projections = drawHologram({
    ctx, width, height, state, core, palette, time,
    motion: !reducedMotion.matches && !document.hidden,
    labels: $('labels').checked
  });
}

function frame(time) {
  const delta = Math.min(40, time - lastFrame);
  lastFrame = time;
  const moving = state.autoRotate && !state.hovered && !state.previewPath && !reducedMotion.matches && !document.hidden;
  if (moving) { state.yaw += delta * 0.00013; dirty = true; }
  if (!reducedMotion.matches && !document.hidden) dirty = true;
  if (dirty) { draw(time); dirty = false; }
  requestAnimationFrame(frame);
}

function hitTest(x, y) {
  return [...projections].sort((a,b) => a.depth-b.depth).find(p => {
    if (!p.node.parent) return false;
    const b = p.labelBox;
    return Math.hypot(p.x-x,p.y-y) < Math.max(13, (p.r || 5) + 4) || (b && x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h);
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
  $('tooltip-action').textContent = node.folder ? 'Click to focus this folder' : 'Click to project this file';
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
    else if (node) filePreview.open(node);
  }
  if (!pointers.size) drag=null;
  else {const p=[...pointers.values()][0];drag={...p,moved:true};}
});
canvas.addEventListener('pointercancel',()=>{pointers.clear();drag=null;});
canvas.addEventListener('pointerleave',()=>{if (!drag) hover(null,0,0);});
canvas.addEventListener('wheel',event=>{
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();zoom(Math.exp(-event.deltaY*.001));
},{passive:false});
function zoom(factor) {state.zoom=Math.max(.45,Math.min(3.5,state.zoom*factor));dirty=true;}
function setRotate(value) {state.autoRotate=value;$('rotate-button').setAttribute('aria-pressed',String(value));$('rotate-button').setAttribute('aria-label',`${value?'Stop':'Start'} automatic rotation`);dirty=true;}
function resetCamera() {state.yaw=.45;state.pitch=.55;state.zoom=1;setRotate(!reducedMotion.matches);dirty=true;}

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
$('theme').onchange=event=>setTheme(event.target.value);
$('layout').onchange=event=>setLayout(event.target.value);
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
  if (event.target.closest('.holo-page')) return;
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
document.body.dataset.theme = state.theme;
$('theme').value = state.theme;
$('layout').value = state.layoutMode;
readPalette();
resize();
requestAnimationFrame(frame);
loadRepository(state.repo);

}
