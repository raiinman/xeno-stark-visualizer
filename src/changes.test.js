import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTrees,changeMarkers} from './changes.js';
test('classifies added changed removed and unchanged files independently',()=>{
 const before=[{path:'src/edit.js',sha:'1'},{path:'old.txt',sha:'2'},{path:'same',sha:'3'}];
 const after=[{path:'src/edit.js',sha:'4'},{path:'new.txt',sha:'5'},{path:'same',sha:'3'}];
 const result=compareTrees(before,after);
 assert.deepEqual(result.added.map(f=>f.path),['new.txt']);assert.deepEqual(result.changed.map(f=>f.path),['src/edit.js']);assert.deepEqual(result.removed.map(f=>f.path),['old.txt']);
 const markers=changeMarkers(result);assert.equal(markers.get('src'),'~ Contents');assert.equal(markers.get('same'),undefined);assert.equal(markers.get('old.txt'),'− Removed');
});
test('mode-only changes and rename pairs remain explicit',()=>{
 const result=compareTrees([{path:'run',sha:'1',mode:'100644'},{path:'old',sha:'2'}],[{path:'run',sha:'1',mode:'100755'},{path:'new',sha:'2'}]);
 assert.equal(result.changed.length,1);assert.equal(result.added.length,1);assert.equal(result.removed.length,1);
});
