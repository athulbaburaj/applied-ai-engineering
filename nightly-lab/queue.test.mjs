import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildQueue, selectNext } from './queue.mjs';
const curriculum=JSON.parse(await readFile(new URL('../learning/curriculum.json',import.meta.url),'utf8'));
test('queue is based on phase 11 first and deterministic',()=>{
 const q=buildQueue(curriculum);
 assert.ok(q.length>10);
 assert.ok(q[0].lesson.startsWith('phases/11-'));
 assert.equal(new Set(q.map(x=>x.slug)).size,q.length);
 assert.deepEqual(q,buildQueue(curriculum));
});
test('selects next incomplete topic',()=>{
 const q=buildQueue(curriculum);
 assert.equal(selectNext(q,x=>x.slug===q[0].slug).slug,q[1].slug);
 assert.equal(selectNext(q,()=>true),null);
});
test('rejects unsafe lesson paths',()=>assert.throws(()=>buildQueue({weeks:[{number:1,lessons:['../../private']}]})));
