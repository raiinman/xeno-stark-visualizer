import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheSelectedView,readCachedView} from './viewCache.js';
const sha='a'.repeat(40),otherSha='b'.repeat(40);
const commits=[{sha,tree:sha,message:'Real revision',author:'Owner',date:'2026-10-22T12:00:00Z'}];
const files=[{path:'src/app.js',sha,type:'blob',size:123}];
function storage(){return {getItem(key){return this[key]??null;},setItem(key,value){this[key]=String(value);},removeItem(key){delete this[key];}};}
test('cache restores only the exact repository and commit',()=>{
  globalThis.localStorage=storage();cacheSelectedView('Owner/Repo',sha,commits,files,'master');
  assert.deepEqual(readCachedView('owner/repo',sha).files,files);
  assert.equal(readCachedView('owner/repo',sha).branch,'master');
  assert.equal(readCachedView('owner/repo',otherSha),null);
  assert.equal(readCachedView('other/repo',sha),null);
});
test('invalid cached trees cannot become a displayed file map',()=>{
  globalThis.localStorage=storage();cacheSelectedView('owner/repo',sha,commits,files);
  const key='xeno-stark:tree:v1:owner/repo',bad=JSON.parse(localStorage.getItem(key));
  bad.files[0].path='../outside';localStorage.setItem(key,JSON.stringify(bad));
  assert.equal(readCachedView('owner/repo',sha),null);
});
test('tree cache evicts only its own older entries and stays within three repos',()=>{
  globalThis.localStorage=storage();localStorage.setItem('xeno-stark:workspace:v2:owner/repo','keep preferences');
  for(let i=0;i<5;i++)cacheSelectedView('owner/repo'+i,sha,commits,files);
  assert.equal(Object.keys(localStorage).filter(k=>k.startsWith('xeno-stark:tree:v1:')).length,3);
  assert.equal(localStorage.getItem('xeno-stark:workspace:v2:owner/repo'),'keep preferences');
  assert.ok(readCachedView('owner/repo4',sha));
});
test('denied storage leaves live viewing available',()=>{
  globalThis.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.equal(readCachedView('owner/repo',sha),null);
  assert.doesNotThrow(()=>cacheSelectedView('owner/repo',sha,commits,files));
});
