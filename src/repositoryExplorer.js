// The original command deck, relocated below the hologram and backed by real GitHub data.
export function createRepositoryExplorer({ getContext, onRepository, onCommit, onFolder, onFile, onTheme, onLayout, onExport }) {
  const root = document.getElementById('repository-explorer');
  root.innerHTML = `
    <header class="deck-heading"><div><h1>XENO-STARK // CHRONICLE</h1><p>Repository command deck</p></div><a href="#hologram" class="text-button">Back to hologram ↑</a></header>
    <div class="deck-toolbar">
      <form id="deck-repo-form"><label for="deck-repo-input">GitHub repository</label><div class="deck-input-row"><input id="deck-repo-input" placeholder="owner/repository" required><button type="submit" class="text-button">Load repo</button></div></form>
      <label class="deck-repos">Recent public repositories<select id="deck-repo-select"><option value="">Loading repositories…</option></select></label>
      <label>Visual lens<select id="deck-theme"><option value="fusion">ARC-XENO</option><option value="jarvis">J.A.R.V.I.S.</option><option value="muthur">MUTHUR-6000</option></select></label>
      <label>3D topology<select id="deck-layout"><option value="orbital">Orbital rings</option><option value="helix">Xeno helix</option><option value="hive">Hive sphere</option></select></label>
    </div>
    <p id="deck-status" class="deck-status" role="status"></p>
    <div class="deck-grid">
      <article class="deck-panel deck-overview"><div class="deck-art"><img src="public/assets/hero-command-deck.jpg" alt="Original Stark-Xeno command deck"><div><h2 id="deck-repo-name"></h2><p id="deck-description"></p></div></div><div class="deck-facts"><span><b id="deck-files">0</b> files</span><span><b id="deck-folders">0</b> folders</span><span><b id="deck-size">0</b> tracked</span><span id="deck-branch"></span></div><div class="deck-links"><a id="deck-github" class="text-button" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a><button id="deck-refresh" class="text-button">Refresh</button></div></article>
      <article class="deck-panel"><header><h2>Chrono-commit telemetry</h2><a id="deck-commit-link" target="_blank" rel="noopener noreferrer"></a></header><h3 id="deck-commit-message">Loading history…</h3><p id="deck-commit-meta" class="deck-meta"></p><p id="deck-commit-stats" class="deck-delta"></p><div id="deck-changed-files" class="deck-changes"></div></article>
      <article class="deck-panel"><header><h2>Sector clusters</h2><button id="deck-all-files" class="text-button">All files</button></header><p class="deck-meta">Focus a folder in the hologram.</p><div id="deck-folders-list" class="deck-sectors"></div></article>
      <article class="deck-panel deck-history"><header><h2>GitHub commit history</h2><span id="deck-history-count" class="deck-meta"></span></header><div id="deck-commits" class="deck-commits"></div></article>
    </div>
    <div class="deck-utilities"><details id="deck-dox"><summary>DOX tree / AGENTS.md</summary><p class="deck-meta">Project the actual instructions tracked in this commit.</p><div id="deck-dox-list" class="deck-docs"></div></details><details><summary>Load / CLI</summary><p>Load any public repository using its GitHub name above. For optional local history and import analysis:</p><pre>node scripts/analyze.mjs /path/to/repository --max=400</pre><p class="deck-meta">The CLI exports history.json. This live map reads GitHub's actual file tree.</p></details><details><summary>Export / display</summary><div class="deck-export"><button id="deck-export-png" class="text-button">Export graph PNG</button><button id="deck-export-json" class="text-button">Export repository JSON</button><label><input id="deck-sound" type="checkbox"> SFX feedback</label><label><input id="deck-background" type="checkbox" checked> Chamber backdrop</label></div></details></div>`;
  const $ = id => root.querySelector(`#${id}`);
  let owner = '', ownerRequest = 0, commitKey = '', commitRequest = 0;
  const ownerCache = new Map(), commitCache = new Map();
  let audio = null;
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
  $('deck-all-files').onclick = () => onFolder('');
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
    $('deck-repo-name').textContent = c.repo;
    if (document.activeElement !== $('deck-repo-input')) $('deck-repo-input').value = c.repo;
    $('deck-description').textContent = c.info?.description || 'GitHub file structure and real commit history';
    $('deck-files').textContent = c.files.length.toLocaleString();
    const folders = new Set();for (const file of c.files) { const parts = file.path.split('/');for(let i = 1;i < parts.length;i++)folders.add(parts.slice(0,i).join('/')); }
    $('deck-folders').textContent = folders.size;
    const bytes = c.files.reduce((sum,f) => sum + (f.size || 0), 0);
    $('deck-size').textContent = bytes >= 1048576 ? `${(bytes/1048576).toFixed(1)} MB` : `${Math.round(bytes/1024)} KB`;
    $('deck-branch').textContent = `branch: ${c.branch}`;
    $('deck-github').href = `https://github.com/${c.repo}`;
    $('deck-theme').value = c.theme;$('deck-layout').value = c.layoutMode;
    if (owner !== c.repo.split('/')[0]) repositories(c.repo.split('/')[0]);
    else if (ownerCache.has(owner)) $('deck-repo-select').value = c.repo;
    $('deck-folders-list').replaceChildren(...[...folders].sort().map(path => {
      const count = c.files.filter(f => f.path.startsWith(path + '/')).length;
      const el = button(`${path}/`, () => { beep();onFolder(path); }, 'deck-sector');
      const n = document.createElement('span');n.textContent = `${count} files`;el.append(n);return el;
    }));
    const docs = c.files.filter(f => f.path.split('/').at(-1) === 'AGENTS.md');
    $('deck-dox-list').replaceChildren(...docs.map(file => button(file.path, () => project(file))));
    if (!docs.length) $('deck-dox-list').textContent = 'No AGENTS.md files in this commit.';
    $('deck-history-count').textContent = `${c.commits.length} recent commits`;
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
    $('deck-commit-meta').textContent = `${commit.author} · ${new Date(commit.date).toLocaleString()}`;
    $('deck-commit-link').textContent = `#${commit.sha.slice(0,7)}`;
    $('deck-commit-link').href = `https://github.com/${c.repo}/commit/${commit.sha}`;
    commitDetails(c, commit);
  }
  return { update, beep };
}
