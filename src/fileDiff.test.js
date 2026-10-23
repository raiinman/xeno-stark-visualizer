import test from 'node:test';
import assert from 'node:assert/strict';
import {diffRows} from './fileDiff.js';
test('aligns changed blocks and preserves unchanged line numbers',()=>{
 const {rows}=diffRows('a\nb\nc','a\nnew\nextra\nc');
 assert.equal(rows[0].changed,false);assert.equal(rows[1].old.text,'b');assert.equal(rows[1].next.text,'new');assert.equal(rows[2].old,undefined);assert.equal(rows[2].next.text,'extra');assert.equal(rows[3].old.line,3);assert.equal(rows[3].next.line,4);
});
test('unchanged, deleted, and inert HTML text remain accurate',()=>{
 assert.equal(diffRows('same','same').rows[0].changed,false);
 const rows=diffRows('gone\nkeep','keep').rows;assert.equal(rows[0].old.text,'gone');assert.equal(rows[0].next,undefined);
 assert.equal(diffRows('old','<script>bad()</script>').rows[0].next.text,'<script>bad()</script>');
});
test('bounds long comparisons and discloses truncation',()=>{
 const result=diffRows(Array(2002).fill('x').join('\n'),'x');assert.equal(result.truncated,true);assert.ok(result.rows.length<=2000);
});
