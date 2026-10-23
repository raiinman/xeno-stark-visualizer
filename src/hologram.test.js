import test from 'node:test';
import assert from 'node:assert/strict';
import {nodePose} from './hologram.js';
test('retained nodes interpolate and interrupted transitions preserve position',()=>{
  const node={path:'file',x:10,y:5,z:2};
  const state={transition:{at:100,duration:1000,from:new Map([['file',{x:0,y:0,z:0,pop:1}]])}};
  assert.equal(nodePose(node,0,state,100).x,0);
  const middle=nodePose(node,0,state,600);assert.equal(middle.x,5);assert.equal(middle.t,1);
  const next={transition:{at:600,duration:1000,from:new Map([['file',middle]])}};
  assert.equal(nodePose({...node,x:-10},0,next,600).x,5);
  assert.equal(nodePose(node,0,state,1100).x,10);
});
test('new nodes grow in and reduced motion lands immediately',()=>{
  const node={path:'new',x:5,y:2,z:1};
  const state={transition:{at:0,duration:2000,from:new Map()}};
  assert.equal(nodePose(node,0,state,0).t,0);
  assert.equal(nodePose(node,0,state,2000).pop,1);
  assert.equal(nodePose(node,0,state,0,false).x,5);
});
