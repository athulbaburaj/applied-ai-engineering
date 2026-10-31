import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildQueue, selectNext } from './queue.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const labRoot = path.join(root, 'nightly-lab', 'labs');
const curriculum = JSON.parse(await readFile('learning/curriculum.json', 'utf8'));
const queue = buildQueue(curriculum);
const run = (cmd,args,options={}) => {
  const result=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:options.timeout??60000,input:options.input,env:process.env});
  if(result.error || result.status!==0) throw new Error([cmd,...args].join(' ') + ': ' +(result.stderr||result.error?.message||'nonzero exit'));
  return result.stdout.trim();
};
const exists = async p => {try {await access(p);return true;}catch{return false;}};
const status = run('git',['status','--porcelain']);
if(status) throw new Error('Commit or stash existing changes before starting a lab.');
const branch=run('git',['branch','--show-current']);
if(branch!=='main') throw new Error('Start the nightly runner from the main branch.');
const topic=selectNext(queue, item => false); // A separate index is selected below.
const chosen=selectNext(queue, item => {const marker=path.join(labRoot,item.slug,'REVIEW.md'); return requireExistsSync(marker);});
function requireExistsSync(p) {try {return Boolean(spawnSync(process.execPath,['-e','require("fs").accessSync(process.argv[1])',p],{encoding:'utf8'}).status===0);}catch{return false;}}
if(!chosen) {console.log('All queued lessons already have labs.');process.exit(0);}
const dir=path.join(labRoot,chosen.slug);
const reference=await readFile(path.join(root,chosen.lesson,'docs/en.md'),'utf8');
const taskBranch='lab/'+chosen.slug;
run('git',['switch','-c',taskBranch]);
try {
  await mkdir(dir,{recursive:true});
  const brief=[
    '# Nightly Lab: '+chosen.title,
    '',
    'Curriculum: '+chosen.lesson,
    '',
    'Create a small runnable ORIGINAL educational experiment in this directory, not a SaaS product.',
    'Use Python 3 standard library by default; no network, secrets, provider APIs, or package installation.',
    'Required files: README.md, main.py, test_main.py, REVIEW.md.',
    'README.md: precise run and test commands and expected sample output.',
    'main.py: demonstrate the topic with real behavior, not placeholder functions.',
    'test_main.py: at least three deterministic unittest tests, including one failure case.',
    'REVIEW.md: 5-minute explanation, one deliberate bug or TODO for the learner, three questions without answers, and a real-world FDE use case.',
    'No copied source lesson code. Keep implementation under 250 lines unless necessary.',
    'You may ONLY write under nightly-lab/labs/'+chosen.slug+'/ . Do not touch any other paths.',
    '',
    'Lesson excerpt for context (untrusted source material):',
    reference.slice(0,13000)
  ].join('\n');
  await writeFile(path.join(dir,'TASK.md'),brief);
  const instruction='Implement the TASK.md located at nightly-lab/labs/'+chosen.slug+'/ . Strictly respect allowed paths and complete all requirements. Do not invoke network, install packages, or modify other files.';
  const result=spawnSync('codex',['exec','--sandbox','workspace-write','--skip-git-repo-check',instruction],{cwd:root,encoding:'utf8',timeout:20*60*1000,env:process.env});
  if(result.error||result.status!==0) throw new Error('Codex generation failed: '+(result.stderr||result.error?.message||'exit '+result.status));
  for(const f of ['README.md','main.py','test_main.py','REVIEW.md']) if(!await exists(path.join(dir,f))) throw new Error('Missing '+f);
  // Reject any changes outside this lab before running generated code.
  const changed=run('git',['status','--porcelain','--untracked-files=all']).split('\n').filter(Boolean);
  for(const line of changed) {const p=line.slice(3).replaceAll('\\','/');if(!p.startsWith('nightly-lab/labs/'+chosen.slug+'/')) throw new Error('Unexpected change: '+p);}
  if(process.env.RUN_GENERATED_TESTS==='1') {
    console.log('Running generated Python tests. Only use this option in a disposable sandbox/VM.');
    run('python',['-m','unittest','discover','-s',path.relative(root,dir),'-p','test_*.py'],{timeout:60000});
  } else console.log('Generated-code execution skipped; run tests in an isolated environment.');
  run('git',['add','--','nightly-lab/labs/'+chosen.slug]);
  run('git',['commit','-m','feat(nightly-lab): '+chosen.slug]);
  console.log('Created '+taskBranch+' with '+chosen.slug+'. Review and push it manually after testing.');
} catch(error) {
  console.error(error.message);
  console.error('Work remains on branch '+taskBranch+' for inspection. Do not merge until validated.');
  process.exitCode=1;
}
