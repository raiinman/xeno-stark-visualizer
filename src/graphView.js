// Bound rendering work without dropping files from the repository or search.
export const GRAPH_NODE_LIMIT = 80;
export function sanitizeNavigation(saved = {}) {
  let folder = typeof saved?.folder === 'string' ? saved.folder : '';
  if (folder.length > 2000 || folder && folder.split('/').some(part=>!part || part==='.' || part==='..')) folder = '';
  return {folder,page:Number.isSafeInteger(saved?.page) && saved.page >= 0 ? saved.page : 0,query:typeof saved?.query === 'string' ? saved.query.slice(0,500).trim().toLowerCase() : ''};
}
export function reconcileNavigation(saved,files) {
  const navigation = sanitizeNavigation(saved), original = navigation.folder;
  while(navigation.folder && !files.some(file=>file.path.startsWith(navigation.folder+'/'))) navigation.folder = navigation.folder.split('/').slice(0,-1).join('/');
  if (navigation.folder !== original) navigation.page = 0;
  return navigation;
}
export function buildGraphView(files, { folder = '', name = 'Repository', page = 0 } = {}) {
  const root = { path: folder, name: folder ? folder.split('/').at(-1) + '/' : name, folder: true, children: [], depth: 0, x: 0, y: 0, z: 0 };
  const folders = new Map([[folder, root]]), nodes = [root];
  // Preserve the original full hierarchy for small maps. Stop construction at the cap.
  outer: for (const file of files) {
    const relative = folder ? file.path.slice(folder.length + 1) : file.path;
    const parts = relative.split('/');let parent = root;
    for (let i=0;i<parts.length-1;i++) {
      const path = [folder,...parts.slice(0,i+1)].filter(Boolean).join('/');
      if (!folders.has(path)) {
        const node = {path,name:parts[i]+'/',folder:true,parent,children:[],depth:i+1};
        folders.set(path,node);parent.children.push(node);nodes.push(node);
      }
      parent = folders.get(path);
      if (nodes.length >= GRAPH_NODE_LIMIT) break outer;
    }
    const node = {...file,name:parts.at(-1),folder:false,parent,depth:parts.length};
    parent.children.push(node);nodes.push(node);
    if (nodes.length > GRAPH_NODE_LIMIT) break;
  }
  if (nodes.length <= GRAPH_NODE_LIMIT && nodes.filter(n=>!n.folder).length === files.length) return {nodes:files.length?nodes:[],grouped:false,page:0,pages:1,total:files.length};
  // Large maps show immediate children. Folder nodes summarize real descendants.
  root.children = [];
  const entries = new Map();
  for (const file of files) {
    const relative = folder ? file.path.slice(folder.length+1) : file.path;
    const [first,...rest] = relative.split('/');
    const path = [folder,first].filter(Boolean).join('/');
    if (rest.length) {
      if (!entries.has(path)) entries.set(path,{path,name:first+'/',folder:true,parent:root,children:[],depth:1,fileCount:0});
      entries.get(path).fileCount++;
    } else entries.set(path,{...file,name:first,folder:false,parent:root,depth:1});
  }
  const all = [...entries.values()].sort((a,b)=>Number(b.folder)-Number(a.folder)||a.path.localeCompare(b.path));
  const pageSize = GRAPH_NODE_LIMIT-1, pages = Math.max(1,Math.ceil(all.length/pageSize));
  page = Math.max(0,Math.min(pages-1,page));
  root.children = all.slice(page*pageSize,(page+1)*pageSize);
  return {nodes:[root,...root.children],grouped:true,page,pages,total:all.length};
}
