import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGraphView,GRAPH_NODE_LIMIT,sanitizeNavigation,reconcileNavigation} from './graphView.js';
import {layoutHologramNodes} from './hologram.js';

test('small maps retain complete real hierarchy',()=>{
  const files=[{path:'README.md'},{path:'src/app.js'},{path:'src/nested/module.js'}];
  const view=buildGraphView(files);
  assert.equal(view.grouped,false);
  assert.deepEqual(view.nodes.filter(n=>!n.folder).map(n=>n.path),files.map(f=>f.path));
  assert.equal(view.nodes.find(n=>n.path==='src/nested/module.js').parent.path,'src/nested');
});
test('thousands of folders stay bounded and every folder is reachable by paging',()=>{
  const files=Array.from({length:3810},(_,i)=>({path:`skills/skill-${i}/SKILL.md`}));
  const root=buildGraphView(files);
  assert.equal(root.nodes.find(n=>n.path==='skills').fileCount,3810);
  const first=buildGraphView(files,{folder:'skills'}),seen=new Set();
  for(let page=0;page<first.pages;page++){
    const view=buildGraphView(files,{folder:'skills',page});
    assert.ok(view.nodes.length<=GRAPH_NODE_LIMIT);
    for(const node of view.nodes.filter(n=>n.parent))seen.add(node.path);
    for(const mode of ['orbital','helix','hive']){
      layoutHologramNodes(view.nodes,mode);
      assert.ok(view.nodes.every(n=>['x','y','z'].every(k=>Number.isFinite(n[k]))));
    }
  }
  assert.equal(seen.size,3810);
  const detail=buildGraphView(files.filter(f=>f.path.startsWith('skills/skill-100/')),{folder:'skills/skill-100'});
  assert.equal(detail.nodes.find(n=>!n.folder).path,'skills/skill-100/SKILL.md');
});
test('large flat folders page all files without exceeding the node budget',()=>{
  const files=Array.from({length:400},(_,i)=>({path:`file-${i}.js`})),seen=new Set();
  const first=buildGraphView(files);
  for(let page=0;page<first.pages;page++){
    const view=buildGraphView(files,{page});assert.ok(view.nodes.length<=GRAPH_NODE_LIMIT);
    for(const n of view.nodes.filter(n=>!n.folder))seen.add(n.path);
  }
  assert.equal(seen.size,files.length);
  assert.equal(buildGraphView(files,{page:999}).page,first.pages-1);
});
test('deep paths cannot evade the cap through their ancestor folders',()=>{
  const file={path:Array.from({length:200},(_,i)=>`folder${i}`).join('/')+'/file.md'};
  const view=buildGraphView([file]);
  assert.ok(view.grouped);assert.ok(view.nodes.length<=GRAPH_NODE_LIMIT);
  assert.equal(view.nodes[1].fileCount,1);
  assert.deepEqual(buildGraphView([]).nodes,[]);
});
test('saved navigation validates folder, page, and search without rejecting real folder names',()=>{
  assert.deepEqual(sanitizeNavigation({folder:'skills/3d-and-web',page:3,query:'  Skill.MD '}),{folder:'skills/3d-and-web',page:3,query:'skill.md'});
  for(const folder of ['../outside','/absolute','src//nested','src/./nested',[],null]) assert.equal(sanitizeNavigation({folder}).folder,'');
  for(const page of [-1,NaN,Infinity,1.5,'2']) assert.equal(sanitizeNavigation({page}).page,0);
  assert.deepEqual(sanitizeNavigation(null),{folder:'',page:0,query:''});
});
test('removed folders restore to the nearest surviving ancestor and reset the page',()=>{
  const files=[{path:'src/remaining/file.js'}];
  assert.deepEqual(reconcileNavigation({folder:'src/deleted/nested',page:3,query:'file'},files),{folder:'src',page:0,query:'file'});
  assert.deepEqual(reconcileNavigation({folder:'src/remaining',page:3},files),{folder:'src/remaining',page:3,query:''});
  assert.deepEqual(reconcileNavigation({folder:'gone',page:2},files),{folder:'',page:0,query:''});
});
