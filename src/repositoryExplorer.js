// The original command deck, relocated below the hologram and backed by real GitHub data.
export function createRepositoryExplorer({ getContext, onRepository, onCommit, onFolder, onFile, onTheme, onLayout, onExport }) {
  const root = document.getElementById('repository-explorer');
  root.innerHTML = `
    <header class="deck-heading"><div><h1>XENO-STARK // CHRONICLE</h1><p>Dead Signal Interactive · Repository command deck</p></div><a href="#hologram" class="text-button">Back to hologram ↑</a></header>
    <div class="deck-toolbar">
      <form id="deck-repo-form"><label for="deck-repo-input">GitHub repository</label><div class="deck-input-row"><input id="deck-repo-input" placeholder="owner/repository" required><button type="submit" class="text-button">Load repo</button></div></form>
      <label class="deck-repos">Recent public repositories<select id="deck-repo-select"><option value="">Loading repositories…</option></select></label>
      <label>Visual theme<select id="deck-theme"><option value="fusion">ARC-XENO</option><option value="jarvis">J.A.R.V.I.S.</option><option value="muthur">MUTHUR-6000</option></select></label>
      <label>Graph layout<select id="deck-layout"><option value="orbital">Orbital rings</option><option value="helix">Double helix</option><option value="hive">Hive cells</option></select></label>
    </div>
    <div class="deck-lens-preview"><canvas id="deck-preview" aria-label="Live preview of the selected visual lens and topology"></canvas><div><h2 id="deck-lens-name"></h2><p id="deck-lens-description"></p><h3 id="deck-topology-name"></h3><p id="deck-topology-description"></p><a href="#hologram" class="text-button">View in hologram ↑</a></div></div>
    <p id="deck-status" class="deck-status" role="status"></p>
    <div class="deck-grid">
      <article class="deck-panel deck-overview"><div class="deck-art"><img src="public/assets/hero-command-deck.jpg" alt="Original Stark-Xeno command deck"><div><h2 id="deck-repo-name"></h2><p id="deck-description"></p></div></div><div class="deck-facts"><span><b id="deck-files">0</b> files</span><span><b id="deck-folders">0</b> folders</span><span><b id="deck-size">0</b> tracked</span><span id="deck-branch"></span></div><div class="deck-links"><a id="deck-github" class="text-button" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a><button id="deck-refresh" class="text-button">Refresh</button></div></article>
      <article class="deck-panel"><header><h2>Selected commit</h2><a id="deck-commit-link" target="_blank" rel="noopener noreferrer"></a></header><h3 id="deck-commit-message">Loading history…</h3><p id="deck-commit-meta" class="deck-meta"></p><p id="deck-commit-stats" class="deck-delta"></p><div id="deck-changed-files" class="deck-changes"></div></article>
      <article class="deck-panel"><header><h2>Folders</h2><button id="deck-all-files" class="text-button" aria-expanded="false" aria-controls="deck-sector-browser">Browse all files</button></header><p class="deck-meta">Browse a folder here, then project a file or focus its graph.</p><input id="deck-folder-search" class="folder-search" type="search" aria-label="Find a folder" placeholder="Find a folder…"><p id="deck-folder-count" class="deck-meta"></p><div id="deck-folders-list" class="deck-sectors"></div><button id="deck-more-folders" class="text-button" hidden>Show more folders</button><div id="deck-sector-browser" class="sector-browser" hidden><label for="deck-file-search">Find a file in <span id="deck-sector-path">all folders</span></label><input id="deck-file-search" type="search" placeholder="Filter by path or filename…"><div class="sector-browser-meta"><span id="deck-file-count" role="status"></span><button id="deck-focus-sector" class="text-button">Show folder in graph ↑</button></div><div id="deck-sector-files" class="sector-files"></div><button id="deck-more-files" class="text-button" hidden>Show more files</button></div></article>
      <article class="deck-panel deck-history"><header><h2>Commit history</h2><span id="deck-history-count" class="deck-meta"></span></header><div id="deck-commits" class="deck-commits"></div></article>
    </div>
    <div class="deck-utilities"><details id="deck-dox"><summary>Project instructions (AGENTS.md)</summary><p class="deck-meta">Project the actual instructions tracked in this commit.</p><div id="deck-dox-list" class="deck-docs"></div></details><details><summary>Local analysis</summary><p>Load any public repository using its GitHub name above. For optional local history and import analysis:</p><pre>node scripts/analyze.mjs /path/to/repository --max=400</pre><p class="deck-meta">The CLI exports history.json. This live map reads GitHub's actual file tree.</p></details><details><summary>Export / display</summary><div class="deck-export"><button id="deck-export-png" class="text-button">Export graph PNG</button><button id="deck-export-json" class="text-button">Export repository JSON</button><label><input id="deck-sound" type="checkbox"> SFX feedback</label><label><input id="deck-background" type="checkbox" checked> Chamber backdrop</label></div></details></div>`;
  const $ = id => root.querySelector(`#${id}`);
  let owner = '', ownerRequest = 0, commitKey = '', commitRequest = 0;
  const ownerCache = new Map(), commitCache = new Map();
  let audio = null;
  let sectorPath = '', sectorQuery = '', sectorLimit = 100, browserRepo = '';
  let indexedFiles = null, folderEntries = [], folderLimit = 40, folderQuery = '';
  function renderSectors() {
    const rank = path => path.toLowerCase() === folderQuery ? 0 : path.toLowerCase().startsWith(folderQuery + '/') ? 1 : 2;
    const matches = folderEntries.filter(([path])=>path.toLowerCase().includes(folderQuery)).sort(([a],[b])=>rank(a)-rank(b)||a.localeCompare(b));
    $('deck-folder-count').textContent = `${Math.min(folderLimit,matches.length)} of ${matches.length} folders`;
    $('deck-folders-list').replaceChildren(...matches.slice(0,folderLimit).map(([path,count])=>{
      const el = button(`${path}/`,()=>{beep();browseSector(path);},'deck-sector');el.dataset.path=path;
      el.setAttribute('aria-pressed',String(!$('deck-sector-browser').hidden&&path===sectorPath));
      const n=document.createElement('span');n.textContent=`${count} files`;el.append(n);return el;
    }));
    $('deck-more-folders').hidden=matches.length<=folderLimit;
  }
  function renderSectorFiles() {
    const files = getContext().files.filter(file => (!sectorPath || file.path.startsWith(sectorPath + '/')) && file.path.toLowerCase().includes(sectorQuery));
    $('deck-sector-path').textContent = sectorPath ? `${sectorPath}/` : 'all folders';
    $('deck-file-count').textContent = `${files.length} matching files${files.length > sectorLimit ? ` · showing ${sectorLimit}` : ''}`;
    $('deck-sector-files').replaceChildren(...files.slice(0,sectorLimit).map(file => button(file.path, () => project(file))));
    if (!files.length) $('deck-sector-files').textContent = 'No files match this filter.';
    $('deck-more-files').hidden = files.length <= sectorLimit;
    for (const el of $('deck-folders-list').children) el.setAttribute('aria-pressed', String(el.dataset.path === sectorPath));
  }
  function browseSector(path) {
    sectorPath = path;sectorQuery = '';sectorLimit = 100;
    $('deck-sector-browser').hidden = false;$('deck-all-files').setAttribute('aria-expanded','true');
    $('deck-file-search').value = '';renderSectorFiles();
    $('deck-file-search').focus({preventScroll:true});
  }
  function beep() {
    if (!$('deck-sound').checked) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      osc.type = 'sine';osc.frequency.setValueAtTime(660, now);osc.frequency.exponentialRampToValueAtTime(980, now + .07);
      gain.gain.setValueAtTime(.025, now);gain.gain.exponentialRampToValueAtTime(.001, now + .1);
      osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now + .12);
    } catch { /* Audio is an optional, user-enabled effect. */ }
  }
  async function request(path) {
    const response = await fetch(`https://api.github.com/${path}`, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub request limit reached. Try again later.' : `GitHub request failed (${response.status}).`);
    return response.json();
  }
  function project(file) { beep();onFile(file); }
  function button(text, callback, className = 'deck-file') {
    const element = document.createElement('button');element.type = 'button';element.className = className;element.textContent = text;element.onclick = callback;return element;
  }
  function loadRepo(value) {
    const repo = value.trim().replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '').replace(/\.git$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { $('deck-status').textContent = 'Enter a repository as owner/repository.';return; }
    $('deck-status').textContent = 'Loading repository…';beep();onRepository(repo);
  }
  $('deck-repo-form').onsubmit = event => { event.preventDefault();loadRepo($('deck-repo-input').value); };
  $('deck-repo-select').onchange = event => { if (event.target.value) loadRepo(event.target.value); };
  $('deck-theme').onchange = event => { beep();onTheme(event.target.value); };
  $('deck-layout').onchange = event => { beep();onLayout(event.target.value); };
  $('deck-all-files').onclick = () => browseSector('');
  $('deck-folder-search').oninput = event => {folderQuery=event.target.value.trim().toLowerCase();folderLimit=40;renderSectors();};
  $('deck-more-folders').onclick = () => {folderLimit+=40;renderSectors();};
  $('deck-file-search').oninput = event => { sectorQuery = event.target.value.trim().toLowerCase();sectorLimit = 100;renderSectorFiles(); };
  $('deck-more-files').onclick = () => { sectorLimit += 100;renderSectorFiles(); };
  $('deck-focus-sector').onclick = () => onFolder(sectorPath);
  $('deck-refresh').onclick = () => { owner = '';commitKey = '';ownerCache.clear();commitCache.clear();document.getElementById('refresh-button').click();update(); };
  $('deck-export-png').onclick = () => onExport('png');
  $('deck-export-json').onclick = () => onExport('json');
  $('deck-sound').onchange = beep;
  $('deck-background').onchange = event => document.body.classList.toggle('no-chamber', !event.target.checked);

  async function repositories(nextOwner) {
    owner = nextOwner;const requestId = ++ownerRequest;
    try {
      const repos = ownerCache.get(owner) || await request(`users/${encodeURIComponent(owner)}/repos?sort=updated&per_page=100&type=owner`);
      if (requestId !== ownerRequest) return;
      ownerCache.set(owner, repos);
      const placeholder = document.createElement('option');placeholder.value = '';placeholder.textContent = 'Choose a repository…';
      $('deck-repo-select').replaceChildren(placeholder, ...repos.map(repo => {
        const option = document.createElement('option');option.value = repo.full_name;option.textContent = repo.name;return option;
      }));
      $('deck-repo-select').value = getContext().repo;
      $('deck-status').textContent = `Up to 100 recent public repositories from ${owner}.`;
    } catch (error) {
      if (requestId !== ownerRequest) return;
      const option = document.createElement('option');option.value = '';option.textContent = 'Enter owner/repository instead';$('deck-repo-select').replaceChildren(option);
      $('deck-status').textContent = error.message;
    }
  }
  async function commitDetails(context, commit) {
    const key = `${context.repo}/${commit.sha}`;
    if (key === commitKey) return;
    commitKey = key;const id = ++commitRequest;
    $('deck-commit-stats').textContent = 'Loading changes from GitHub…';$('deck-changed-files').replaceChildren();
    try {
      const data = commitCache.get(key) || await request(`repos/${context.repo}/commits/${commit.sha}`);
      if (id !== commitRequest) return;
      commitCache.set(key, data);
      const changes = data.files || [];
      $('deck-commit-stats').textContent = `${changes.length}${changes.length >= 300 ? '+' : ''} files changed · +${data.stats?.additions || 0} / −${data.stats?.deletions || 0} lines`;
      const current = new Map(context.files.map(f => [f.path, f]));
      $('deck-changed-files').replaceChildren(...changes.map(change => {
        if (change.status === 'removed') { const p = document.createElement('span');p.className = 'deck-removed';p.textContent = `${change.filename} (removed)`;return p; }
        const file = current.get(change.filename) || { path: change.filename, type: 'blob', size: 0 };
        return button(change.filename, () => project(file));
      }));
    } catch (error) { if (id === commitRequest) $('deck-commit-stats').textContent = `${error.message} Commit metadata and the graph remain available.`; }
  }
  function update() {
    const c = getContext(), commit = c.commits[c.index];
    if (browserRepo !== c.repo) {
      browserRepo = c.repo;sectorPath = '';sectorQuery = '';sectorLimit = 100;
      folderQuery = '';folderLimit = 40;$('deck-folder-search').value = '';
      $('deck-sector-browser').hidden = true;$('deck-file-search').value = '';$('deck-all-files').setAttribute('aria-expanded','false');
    }
    $('deck-repo-name').textContent = c.repo;
    if (document.activeElement !== $('deck-repo-input')) $('deck-repo-input').value = c.repo;
    $('deck-description').textContent = c.info?.description || 'GitHub file structure and real commit history';
    $('deck-files').textContent = c.files.length.toLocaleString();
    if (indexedFiles !== c.files) {
      indexedFiles = c.files;const counts = new Map();
      for(const file of c.files){const parts=file.path.split('/');for(let i=1;i<parts.length;i++){const path=parts.slice(0,i).join('/');counts.set(path,(counts.get(path)||0)+1);}}
      folderEntries=[...counts].sort(([a],[b])=>a.localeCompare(b));
    }
    $('deck-folders').textContent = folderEntries.length;
    const bytes = c.files.reduce((sum,f) => sum + (f.size || 0), 0);
    $('deck-size').textContent = bytes >= 1048576 ? `${(bytes/1048576).toFixed(1)} MB` : `${Math.round(bytes/1024)} KB`;
    $('deck-branch').textContent = `branch: ${c.branch}`;
    $('deck-github').href = `https://github.com/${c.repo}`;
    $('deck-theme').value = c.theme;$('deck-layout').value = c.layoutMode;
    const lenses = {
      fusion: ['ARC-XENO fusion', 'An arc reactor powers the map. Gold reactor vanes, cyan hex cores and crossing mechanical rings, with alien energy flowing along folder links.'],
      jarvis: ['J.A.R.V.I.S. tactical', 'A precision targeting display. Ice-blue file glyphs, gold folder outlines, angular circuit links and calibrated brackets around the core.'],
      muthur: ['MUTHUR-6000 bioscan', 'Organic green phosphor. Living spore nodes, curved vascular links, radar sweeps and a pulsing containment field.']
    };
    const topologies = {
      orbital: ['Orbital sectors', 'Each folder owns a satellite cluster around the central repository. Rings map its orbital planes.'],
      helix: ['Double helix', 'Files climb two intertwined strands. Depth and height separate the sequence, with folder hubs linking their descendants.'],
      hive: ['Hive cells', 'Folders form cells across a spherical shell. Each cell holds its own file swarm around a local hub.']
    };
    [$('deck-lens-name').textContent,$('deck-lens-description').textContent] = lenses[c.theme];
    [$('deck-topology-name').textContent,$('deck-topology-description').textContent] = topologies[c.layoutMode];
    if (owner !== c.repo.split('/')[0]) repositories(c.repo.split('/')[0]);
    else if (ownerCache.has(owner)) $('deck-repo-select').value = c.repo;
    renderSectors();
    if (!$('deck-sector-browser').hidden) renderSectorFiles();
    const docs = c.files.filter(f => f.path.split('/').at(-1) === 'AGENTS.md');
    $('deck-dox-list').replaceChildren(...docs.map(file => button(file.path, () => project(file))));
    if (!docs.length) $('deck-dox-list').textContent = 'No AGENTS.md files in this commit.';
    $('deck-history-count').textContent = `${c.commits.length} commits available`;
    $('deck-commits').replaceChildren(...c.commits.map((item,index) => {
      const el = button('', () => { beep();onCommit(index); }, 'deck-commit');
      el.classList.toggle('is-current',index === c.index);el.setAttribute('aria-pressed',String(index === c.index));
      const hash = document.createElement('code');hash.textContent = item.sha.slice(0,7);
      const title = document.createElement('span');title.textContent = item.message;
      const date = document.createElement('time');date.textContent = item.date.slice(0,10);date.dateTime = item.date;
      el.append(hash,title,date);return el;
    }).reverse());
    if (!commit) {
      commitKey = '';commitRequest++;
      $('deck-commit-message').textContent = 'Loading history…';
      $('deck-commit-meta').textContent = '';$('deck-commit-stats').textContent = '';
      $('deck-commit-link').textContent = '';$('deck-changed-files').replaceChildren();
      return;
    }
    $('deck-commit-message').textContent = commit.message;
    $('deck-commit-meta').textContent = `Commit by ${commit.author} · ${new Date(commit.date).toLocaleString()}`;
    $('deck-commit-link').textContent = `#${commit.sha.slice(0,7)}`;
    $('deck-commit-link').href = `https://github.com/${c.repo}/commit/${commit.sha}`;
    commitDetails(c, commit);
  }
  return { update, beep };
}
