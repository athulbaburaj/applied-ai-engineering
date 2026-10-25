import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, curriculum } from './server.mjs';
import { emptyProgress, validateProgress, summarize, taskIds } from './model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('route starts in Phase 11, has twelve weeks and unique task IDs',()=>{
  assert.equal(curriculum.weeks.length,12);
  assert.ok(curriculum.weeks[0].lessons.every(p=>p.startsWith('phases/11-')));
  assert.equal(taskIds(curriculum).size,curriculum.weeks.flatMap(w=>w.tasks).length);
  assert.deepEqual(curriculum.weeks.map(w=>w.number),Array.from({length:12},(_,i)=>i+1));
});
test('every learning resource, runnable example, project and quiz exists',async()=>{
  for(const week of curriculum.weeks) {
    await readFile(path.join(root,week.project,'README.md'));
    for(const lesson of week.lessons) {
      await readFile(path.join(root,lesson,'docs/en.md'));
      assert.ok((await readdir(path.join(root,lesson,'code'))).some(name=>/\.(py|ts|rs|jl)$/.test(name)));
      const raw=JSON.parse(await readFile(path.join(root,lesson,'quiz.json'),'utf8'));
      const questions=Array.isArray(raw)?raw:raw.questions;
      assert.ok(questions.length>0);
      for(const q of questions) { assert.ok(typeof q.question==='string');assert.ok(q.options.length>1);assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length);assert.ok(typeof q.explanation==='string'); }
    }
  }
});
test('completion and hours use known tasks only',()=>{
  const value=emptyProgress();value.tasks['w1-build']=true;value.hours['1']=2.5;
  const summary=summarize(validateProgress(value,curriculum),curriculum);
  assert.equal(summary.done,1);assert.equal(summary.hours,2.5);
  value.tasks['invented']=true;assert.throws(()=>validateProgress(value,curriculum));
});
test('imports reject invalid versions, excessive notes and malformed data',()=>{
  assert.throws(()=>validateProgress({version:99},curriculum));
  for(const mutate of [v=>v.hours['1']=-1,v=>v.hours['1']=Infinity,v=>v.notes['1']='x'.repeat(20001),v=>v.quizzes['bad']={correct:1,total:2},v=>v.tasks=[]]) {
    const value=emptyProgress();mutate(value);assert.throws(()=>validateProgress(value,curriculum));
  }
});
test('server saves and restores notes, checklists, hours and scores',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'applied-ai-test-'));
  const progressFile=path.join(directory,'progress.json');
  let server=await createApp({progressFile});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const value=emptyProgress();value.tasks['w1-build']=true;value.notes['1']='A failure worth investigating';value.evidence['1']='reports/baseline.json';value.hours['1']=3.25;value.quizzes[curriculum.weeks[0].lessons[0]]={correct:2,total:3};
    const saved=await fetch(origin+'/api/progress',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
    assert.equal(saved.status,200);
    assert.deepEqual(JSON.parse(await readFile(progressFile,'utf8')),value);
    await new Promise(resolve=>server.close(resolve));
    server=await createApp({progressFile});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
    assert.deepEqual(await (await fetch(origin+'/api/progress')).json(),value);
    for(const lesson of new Set(curriculum.weeks.flatMap(w=>w.lessons))) {
      const response=await fetch(origin+'/api/lesson?path='+encodeURIComponent(lesson));assert.equal(response.status,200);assert.ok((await response.json()).markdown.length>0);
    }
  }finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
test('server rejects cross-origin writes, invalid imports and arbitrary files',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'applied-ai-test-'));
  const server=await createApp({progressFile:path.join(directory,'progress.json')});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(origin+'/api/progress',{method:'PUT',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(emptyProgress())})).status,403);
    assert.equal((await fetch(origin+'/api/progress',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'})).status,400);
    assert.equal((await fetch(origin+'/api/lesson?path=../../.git/config')).status,404);
    assert.equal((await fetch(origin+'/.learning-progress.json')).status,404);
    const page=await fetch(origin+'/');assert.equal(page.status,200);assert.ok(page.headers.get('content-security-policy').includes("script-src 'self'"));
    assert.deepEqual(await(await fetch(origin+'/api/progress')).json(),emptyProgress());
  }finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
test('a corrupt saved file blocks startup instead of erasing progress',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'applied-ai-test-'));
  const progressFile=path.join(directory,'progress.json');
  try{await writeFile(progressFile,'broken');await assert.rejects(createApp({progressFile}),/Cannot read progress/);assert.equal(await readFile(progressFile,'utf8'),'broken');}
  finally{await rm(directory,{recursive:true,force:true});}
});
