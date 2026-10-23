// Keep a bounded, real file tree for the selected commit, never source contents.
const PREFIX = 'xeno-stark:tree:v1:';
const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value);
const path = value => typeof value === 'string' && value.length <= 2000 && value.split('/').every(p=>p && p!=='.' && p!=='..');
export function readCachedView(repo, selectedSha) {
  if (!sha(selectedSha)) return null;
  try {
    const value = JSON.parse(localStorage.getItem(PREFIX+repo.toLowerCase()));
    if (value?.version !== 1 || value.repo.toLowerCase() !== repo.toLowerCase() || value.selectedSha !== selectedSha) return null;
    if (!Array.isArray(value.commits) || value.commits.length > 42 || !value.commits.some(c=>c.sha === selectedSha)) return null;
    if (!value.commits.every(c=>sha(c.sha)&&sha(c.tree)&&typeof c.message==='string'&&typeof c.author==='string'&&Number.isFinite(Date.parse(c.date)))) return null;
    if (!Array.isArray(value.files) || value.files.length > 20000 || !value.files.every(f=>path(f.path)&&sha(f.sha)&&['blob','commit'].includes(f.type)&&Number.isFinite(f.size)&&f.size>=0)) return null;
    return value;
  } catch { return null; }
}
export function cacheSelectedView(repo, selectedSha, commits, files, branch = 'main') {
  try {
    const key = PREFIX+repo.toLowerCase();
    const serialized = JSON.stringify({version:1,repo,selectedSha,commits,files,branch,time:Date.now()});
    if (serialized.length > 1_000_000) return;
    const others = Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)&&k!==key).map(k=>{
      const value=localStorage.getItem(k);let time=0;try{time=JSON.parse(value).time||0;}catch{}return {key:k,length:value?.length||0,time};
    }).sort((a,b)=>b.time-a.time);
    let budget=serialized.length;
    others.forEach((entry,index)=>{budget+=entry.length;if(index>=2||budget>2_000_000)localStorage.removeItem(entry.key);});
    localStorage.setItem(key,serialized);
  } catch { /* Storage quotas or denied access must not interrupt the live map. */ }
}
