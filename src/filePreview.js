// Independent holographic panes. Each owns its request, geometry, focus, and content.
const IMAGE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i;
const BINARY = /\.(?:zip|gz|7z|pdf|woff2?|ttf|mp[34]|wav|ogg|exe|dll|glb|blend|psd|kra)$/i;
const MAX_BYTES = 600_000;
const MAX_LINES = 2000;

export function createFilePreview({ getContext, onOpen, onClose, onGeometryChange = () => {} }) {
  const template = document.getElementById('file-preview');
  const workspace = document.getElementById('workspace');
  const tileButton = document.getElementById('tile-previews');
  const windows = new Map();
  let active = null, layer = 40, serial = 0, manuallyArranged = false;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  let storageRepo = getContext().repo, saveTimer, ready = false, restoring = false;
  const storageKey = repo => `xeno-stark:windows:v1:${repo.toLowerCase()}`;
  const validRect = rect => rect && ['x','y','w','h'].every(k => Number.isFinite(rect[k])) && rect.w > 0 && rect.h > 0;

  function saveNow() {
    clearTimeout(saveTimer);
    if (!ready || restoring) return;
    try {
      const panes = [...windows.values()].sort((a,b) => Number(a.element.style.zIndex) - Number(b.element.style.zIndex)).map(win => ({
        file: { path: win.file.path, size: win.file.size, type: win.file.type },
        context: win.context, rect: win.rect, restore: win.restore,
        wrapped: !win.element.classList.contains('no-wrap')
      }));
      localStorage.setItem(storageKey(storageRepo), JSON.stringify({ version: 1, panes, manuallyArranged }));
    } catch { /* Restricted or full browser storage must not break the viewer. */ }
  }
  function saveSoon() {
    if (!ready || restoring) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 150);
  }
  function restore() {
    clearTimeout(saveTimer);
    storageRepo = getContext().repo;
    ready = true;
    // Do not replace panes opened by the user while repository data was loading.
    if (windows.size) return;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(storageKey(storageRepo))); }
    catch { return; }
    if (saved?.version !== 1 || !Array.isArray(saved.panes)) return;
    restoring = true;
    try {
      for (const entry of saved.panes.slice(-30)) {
        const { file, context, rect } = entry || {};
        if (!file || typeof file.path !== 'string' || !file.path || file.path.length > 2000 || file.path.startsWith('/') || file.path.split('/').some(p => !p || p === '.' || p === '..')) continue;
        if (typeof context?.repo !== 'string' || context.repo.toLowerCase() !== storageRepo.toLowerCase() || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(context.sha || '') || !validRect(rect)) continue;
        const safeFile = { path: file.path, size: Math.max(0, Number(file.size) || 0), type: file.type === 'commit' ? 'commit' : 'blob' };
        const safeContext = { repo: storageRepo, sha: context.sha };
        const key = `${storageRepo}/${context.sha}/${file.path}`;
        if (windows.has(key)) continue;
        const win = createPane(safeFile, safeContext, key);
        win.element.classList.add('settled');
        geometry(win, validRect(entry.restore) ? bounds() : rect);
        win.restore = validRect(entry.restore) ? fit(entry.restore) : null;
        win.view('maximize').setAttribute('aria-label', win.restore ? 'Restore window size' : 'Maximize window');
        win.element.classList.toggle('no-wrap', entry.wrapped === false);
        win.view('wrap').setAttribute('aria-pressed', String(entry.wrapped !== false));
        focus(win);
      }
      manuallyArranged = saved.manuallyArranged === true;
      tileButton.hidden = windows.size < 2;
    } finally { restoring = false; }
  }
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  function bounds() {
    const r = workspace.getBoundingClientRect();
    return { x: r.left + 10, y: r.top + 52, w: r.width - 20, h: Math.max(160, r.height - 106) };
  }
  function fit(rect) {
    const b = bounds();
    const w = clamp(rect.w, Math.min(300, b.w), b.w);
    const h = clamp(rect.h, Math.min(210, b.h), b.h);
    return { x: clamp(rect.x, b.x, b.x + b.w - w), y: clamp(rect.y, b.y, b.y + b.h - h), w, h };
  }
  function geometry(win, rect) {
    win.rect = fit(rect);
    Object.assign(win.element.style, { left: `${win.rect.x}px`, top: `${win.rect.y}px`, width: `${win.rect.w}px`, height: `${win.rect.h}px` });
    onGeometryChange();
    saveSoon();
  }
  function focus(win, keyboard = false) {
    active = win;
    for (const other of windows.values()) other.element.classList.toggle('is-active', other === win);
    win.element.style.zIndex = ++layer;
    tileButton.style.zIndex = layer + 1;
    onOpen(win.file);
    if (keyboard) win.element.querySelector('.preview-header').focus({ preventScroll: true });
    saveSoon();
  }
  function dismiss(win, restoreFocus = true) {
    win.cancel();
    win.element.remove();
    windows.delete(win.key);
    tileButton.hidden = windows.size < 2;
    if (active === win) {
      active = [...windows.values()].sort((a,b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0] || null;
      if (active) focus(active, restoreFocus);
      else onClose();
    }
    if (!windows.size) manuallyArranged = false;
    onGeometryChange();
    saveSoon();
  }
  function close({ preserve = false } = {}) {
    if (preserve) saveNow();
    clearTimeout(saveTimer);
    if (!windows.size) { if (preserve) ready = false; return; }
    for (const win of windows.values()) { win.cancel(); win.element.remove(); }
    windows.clear();active = null;manuallyArranged = false;tileButton.hidden = true;
    onClose();onGeometryChange();
    if (preserve) ready = false;
    else saveNow();
  }
  function tile() {
    const b = bounds(), count = windows.size;
    if (!count) return;
    const columns = Math.min(count <= 3 ? count : Math.ceil(Math.sqrt(count)), Math.max(1, Math.floor((b.w + 10) / 310)));
    const rows = Math.ceil(count / columns), gap = 10;
    const w = (b.w - gap * (columns - 1)) / columns;
    const h = rows === 1 ? Math.min(580, b.h * .86) : (b.h - gap * (rows - 1)) / rows;
    const offsetY = rows === 1 ? (b.h - h) / 2 : 0;
    [...windows.values()].forEach((win, i) => {
      win.restore = null;
      win.element.classList.add('settled');
      geometry(win, { x: b.x + (i % columns) * (w + gap), y: b.y + offsetY + Math.floor(i / columns) * (h + gap), w, h });
      win.view('maximize').setAttribute('aria-label', 'Maximize window');
    });
  }
  function maximize(win) {
    win.element.classList.add('settled');
    manuallyArranged = true;
    if (win.restore) { geometry(win, win.restore); win.restore = null; }
    else { win.restore = { ...win.rect }; geometry(win, bounds()); }
    win.view('maximize').setAttribute('aria-label', win.restore ? 'Restore window size' : 'Maximize window');
    focus(win);
  }
  function gesture(event, win, edge = '') {
    if (event.button !== 0 || (!edge && event.target.closest('button,a,input'))) return;
    event.preventDefault();
    focus(win);
    manuallyArranged = true;
    win.element.classList.add('settled', 'is-moving');
    const target = event.currentTarget, start = { ...win.rect }, sx = event.clientX, sy = event.clientY;
    target.setPointerCapture(event.pointerId);
    const move = e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      win.restore = null;
      win.view('maximize').setAttribute('aria-label', 'Maximize window');
      if (!edge) { geometry(win, { ...start, x: start.x + dx, y: start.y + dy }); return; }
      const b = bounds(), minW = Math.min(300, b.w), minH = Math.min(210, b.h);
      let x = start.x, y = start.y, right = start.x + start.w, bottom = start.y + start.h;
      if (edge.includes('e')) right = clamp(right + dx, x + minW, b.x + b.w);
      if (edge.includes('s')) bottom = clamp(bottom + dy, y + minH, b.y + b.h);
      if (edge.includes('w')) x = clamp(x + dx, b.x, right - minW);
      if (edge.includes('n')) y = clamp(y + dy, b.y, bottom - minH);
      geometry(win, { x, y, w: right - x, h: bottom - y });
    };
    const end = () => {
      win.element.classList.remove('is-moving');
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      target.removeEventListener('lostpointercapture', end);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    target.addEventListener('lostpointercapture', end);
  }

  function createPane(file, context, key) {
    const pane = template.content.firstElementChild.cloneNode(true);
    const view = name => pane.querySelector(`[data-preview="${name}"]`);
    let controller = null, requestId = 0;
    const win = { element: pane, file, context, key, view, rect: null, restore: null, cancel: () => { requestId++; controller?.abort(); } };
    pane.setAttribute('aria-label', `${file.path} holographic file window`);
    const headingId = `file-window-${++serial}`;
    view('title').id = headingId;
    pane.setAttribute('aria-labelledby', headingId);
    view('title').textContent = file.path.split('/').at(-1);
    view('path').textContent = file.path;
    view('ref').textContent = `${context.repo} · ${context.sha.slice(0, 7)}`;
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    view('github').href = `https://github.com/${context.repo}/${file.type === 'commit' ? 'tree' : 'blob'}/${context.sha}/${path}`;
    view('close').onclick = () => dismiss(win);
    view('maximize').onclick = () => maximize(win);
    view('wrap').onclick = () => {
      const wrapped = pane.classList.toggle('no-wrap') === false;
      view('wrap').setAttribute('aria-pressed', String(wrapped));
      saveSoon();
    };
    view('retry').onclick = () => load(file, context);
    pane.addEventListener('pointerdown', () => focus(win));
    pane.addEventListener('focusin', () => { if (active !== win) focus(win); });
    pane.addEventListener('animationend', () => pane.classList.add('settled'));
    const header = pane.querySelector('.preview-header');
    header.setAttribute('aria-label', `Move ${file.path}. Arrow keys move; Shift moves faster. Double-click to maximize.`);
    header.addEventListener('pointerdown', event => gesture(event, win));
    header.addEventListener('dblclick', event => { if (!event.target.closest('button,a')) maximize(win); });
    header.addEventListener('keydown', event => {
      if (event.target !== header || !event.key.startsWith('Arrow')) return;
      event.preventDefault();
      manuallyArranged = true;
      pane.classList.add('settled');
      const step = event.shiftKey ? 30 : 10;
      geometry(win, { ...win.rect, x: win.rect.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), y: win.rect.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) });
    });
    for (const edge of ['n','e','s','w','ne','se','sw','nw']) {
      const handle = document.createElement('button');
      handle.className = `window-resize resize-${edge}`;
      handle.dataset.edge = edge;
      handle.tabIndex = edge === 'se' ? 0 : -1;
      handle.setAttribute('aria-label', `Resize ${file.path} window. Arrow keys change width and height.`);
      handle.addEventListener('pointerdown', event => gesture(event, win, edge));
      handle.addEventListener('keydown', event => {
        if (!event.key.startsWith('Arrow')) return;
        event.preventDefault();manuallyArranged = true;pane.classList.add('settled');
        const step = event.shiftKey ? 30 : 10;
        geometry(win, { ...win.rect, w: win.rect.w + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), h: win.rect.h + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) });
      });
      pane.append(handle);
    }
      function message(text, action = false) {
    const p = document.createElement('p');
    p.className = 'preview-message';
    p.textContent = text;
    view('content').replaceChildren(p);
    view('retry').hidden = !action;
  }

  function renderCode(text, path) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    if (lines.at(-1) === '') lines.pop();
    const code = document.createElement('div');
    code.className = 'preview-code';
    const fragment = document.createDocumentFragment();
    // Coloring is cosmetic; repository text is always inserted as text, never as HTML.
    const syntax = /\.(?:[cm]?js|[jt]sx?|json|css|html|ya?ml|py|sh)$/i.test(path);
    const token = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|import|from|export|if|else|class|async|await|true|false|null|def|for|while|new)\b|\b\d+(?:\.\d+)?\b)/g;
    for (let i = 0; i < Math.min(lines.length, MAX_LINES); i++) {
      const row = document.createElement('div');
      row.className = 'code-line';
      const number = document.createElement('span');
      number.className = 'line-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = i + 1;
      const content = document.createElement('span');
      content.className = 'line-content';
      if (syntax) {
        let previous = 0;
        for (const match of lines[i].matchAll(token)) {
          content.append(document.createTextNode(lines[i].slice(previous, match.index)));
          const span = document.createElement('span');
          span.className = /^['"]/.test(match[0]) ? 'token-string' : /^\d/.test(match[0]) ? 'token-number' : 'token-keyword';
          span.textContent = match[0];
          content.append(span);
          previous = match.index + match[0].length;
        }
        content.append(document.createTextNode(lines[i].slice(previous) || (previous === 0 ? ' ' : '')));
      } else content.textContent = lines[i] || ' ';
      row.append(number, content);
      fragment.append(row);
    }
    code.append(fragment);
    view('content').replaceChildren(code);
    view('status').textContent = `${lines.length.toLocaleString()} lines${lines.length > MAX_LINES ? ' · previewing the first 2,000' : ''}`;
    if (!lines.length) message('This file is empty.');
  }

  async function load(file, context) {
    controller?.abort();
    const id = ++requestId;
    controller = new AbortController();
    const abort = controller;
    const timeout = setTimeout(() => abort.abort(), 20000);
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    const raw = `https://raw.githubusercontent.com/${context.repo}/${context.sha}/${path}`;
    const stillCurrent = () => id === requestId && pane.isConnected;
    view('status').textContent = 'Retrieving file…';
    view('retry').hidden = true;
    view('content').scrollTop = 0;
    message('Establishing holographic projection…');
    try {
      if (IMAGE.test(file.path)) {
        if (file.size > 12_000_000) throw new Error('This image is too large for an inline preview.');
        const img = document.createElement('img');
        img.className = 'preview-image';
        img.alt = file.path;
        img.src = raw;
        await Promise.race([
          img.decode(),
          new Promise((_, reject) => abort.signal.addEventListener('abort', () => {
            img.removeAttribute('src');
            reject(new DOMException('Image request aborted', 'AbortError'));
          }, { once: true }))
        ]);
        if (!stillCurrent()) return;
        view('content').replaceChildren(img);
        view('status').textContent = `${img.naturalWidth} × ${img.naturalHeight} image`;
        return;
      }
      if (file.type === 'commit' || BINARY.test(file.path) || file.size > MAX_BYTES) {
        view('status').textContent = file.type === 'commit' ? 'Git submodule' : 'Preview unavailable';
        message(file.type === 'commit' ? 'This node points to a Git submodule. Open it on GitHub to explore it.' : 'This file is binary or too large for an inline preview. Open it on GitHub to view or download it.');
        return;
      }
      const response = await fetch(raw, { signal: abort.signal });
      if (!response.ok) throw new Error(`File request failed (${response.status}).`);
      // Stream with a hard byte limit, including when GitHub omits Content-Length.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '', bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); throw new Error('This file is too large for an inline preview. Open it on GitHub.'); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      if (!stillCurrent()) return;
      if (text.includes('\0')) {
        view('status').textContent = 'Binary file';
        message('This is a binary file. Open it on GitHub to view or download it.');
      } else renderCode(text, file.path);
    } catch (error) {
      if (!stillCurrent()) return;
      view('status').textContent = 'Connection interrupted';
      message(error.name === 'AbortError' ? 'The file request timed out. Try again or open it on GitHub.' : `${error.message} Try again or open it on GitHub.`, true);
    } finally {
      clearTimeout(timeout);
    }
  }


    workspace.append(pane);
    windows.set(key, win);
    const b = bounds(), w = Math.min(740, b.w * .66), h = Math.min(580, b.h * .92);
    geometry(win, { x: b.x + b.w - w - (windows.size - 1) * 28, y: b.y + (windows.size - 1) * 26, w, h });
    load(file, context);
    return win;
  }

  function open(file) {
    const context = getContext();
    if (!context.sha) return;
    if (storageRepo !== context.repo) { clearTimeout(saveTimer); storageRepo = context.repo; }
    ready = true;
    const key = `${context.repo}/${context.sha}/${file.path}`;
    let win = windows.get(key);
    if (!win) {
      win = createPane(file, context, key);
      if (windows.size > 1 && !manuallyArranged) tile();
    }
    tileButton.hidden = windows.size < 2;
    focus(win, true);
  }
  tileButton.onclick = () => { manuallyArranged = true; tile(); };
  window.addEventListener('resize', () => {
    if (bounds().w < 700 && windows.size > 1) { tile(); return; }
    for (const win of windows.values()) geometry(win, win.restore ? bounds() : win.rect);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active && (active.element.contains(event.target) || event.target === document.body)) {
      event.preventDefault();event.stopImmediatePropagation();dismiss(active);
    }
  }, true);
  return { open, close, restore, get isOpen() { return windows.size > 0; }, get activeWindow() { return active?.element || null; } };
}
