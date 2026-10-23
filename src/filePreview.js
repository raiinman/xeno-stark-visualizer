// A native modal keeps keyboard focus in the summoned pane while the graph stays visible.
const $ = id => document.getElementById(id);
const IMAGE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i;
const BINARY = /\.(?:zip|gz|7z|pdf|woff2?|ttf|mp[34]|wav|ogg|exe|dll|glb|blend|psd|kra)$/i;
const MAX_BYTES = 600_000;
const MAX_LINES = 2000;

export function createFilePreview({ getContext, onOpen, onClose }) {
  const dialog = $('file-preview');
  let controller = null, current = null, requestId = 0;

  function close() {
    controller?.abort();
    requestId++;
    if (dialog.open) dialog.close();
  }

  function message(text, action = false) {
    const p = document.createElement('p');
    p.className = 'preview-message';
    p.textContent = text;
    $('preview-content').replaceChildren(p);
    $('preview-retry').hidden = !action;
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
    $('preview-content').replaceChildren(code);
    $('preview-status').textContent = `${lines.length.toLocaleString()} lines${lines.length > MAX_LINES ? ' · previewing the first 2,000' : ''}`;
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
    const stillCurrent = () => id === requestId && dialog.open;
    $('preview-status').textContent = 'Retrieving file…';
    $('preview-retry').hidden = true;
    $('preview-content').scrollTop = 0;
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
        $('preview-content').replaceChildren(img);
        $('preview-status').textContent = `${img.naturalWidth} × ${img.naturalHeight} image`;
        return;
      }
      if (file.type === 'commit' || BINARY.test(file.path) || file.size > MAX_BYTES) {
        $('preview-status').textContent = file.type === 'commit' ? 'Git submodule' : 'Preview unavailable';
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
        $('preview-status').textContent = 'Binary file';
        message('This is a binary file. Open it on GitHub to view or download it.');
      } else renderCode(text, file.path);
    } catch (error) {
      if (!stillCurrent()) return;
      $('preview-status').textContent = 'Connection interrupted';
      message(error.name === 'AbortError' ? 'The file request timed out. Try again or open it on GitHub.' : `${error.message} Try again or open it on GitHub.`, true);
    } finally {
      clearTimeout(timeout);
    }
  }

  function open(file) {
    const context = getContext();
    if (!context.sha) return;
    current = { file, context };
    $('preview-title').textContent = file.path.split('/').at(-1);
    $('preview-path').textContent = file.path;
    $('preview-ref').textContent = `${context.repo} · ${context.sha.slice(0, 7)}`;
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    $('preview-github').href = `https://github.com/${context.repo}/${file.type === 'commit' ? 'tree' : 'blob'}/${context.sha}/${path}`;
    if (!dialog.open) dialog.showModal();
    $('preview-close').focus({ preventScroll: true });
    onOpen(file);
    load(file, context);
  }

  $('preview-close').onclick = close;
  $('preview-retry').onclick = () => current && load(current.file, current.context);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { controller?.abort(); requestId++; current = null; onClose(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });
  return { open, close, get isOpen() { return dialog.open; } };
}
