import { summarize, validateProgress } from './model.mjs';

const $ = selector => document.querySelector(selector);
const el = (tag, text, className) => { const node=document.createElement(tag); if(text!==undefined) node.textContent=text; if(className) node.className=className; return node; };
let curriculum, progress, selected=1, saveQueue=Promise.resolve(), dirty=false, lessonRequest=0;
async function api(url, options) {
  const response=await fetch(url,options);
  const value=await response.json();
  if(!response.ok) throw new Error(value.error || `Request failed (${response.status})`);
  return value;
}
function status(message, error=false) { $('#saveStatus').textContent=message; $('#saveStatus').classList.toggle('error',error); }
function save() {
  dirty=true;
  const snapshot=JSON.stringify(progress);
  status('Saving…');
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
    try {
      await api('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:snapshot});
      if(snapshot===JSON.stringify(progress)) { dirty=false; status('Saved on this computer'); }
    } catch(error) { status(`Save failed: ${error.message} Export a backup.`,true); }
  });
  return saveQueue;
}
function updateMetrics() {
  const summary=summarize(progress,curriculum);
  $('#percent').textContent=`${summary.percent}%`;
  $('#completed').textContent=`${summary.done} / ${summary.total}`;
  $('#hoursTotal').textContent=`${Number(summary.hours.toFixed(1))} h`;
  const next=curriculum.weeks.find(w=>w.tasks.some(t=>!progress.tasks[t.id]));
  $('#nextWeek').textContent=next?`Week ${String(next.number).padStart(2,'0')}`:'Complete';
  $('#weeks').replaceChildren(...curriculum.weeks.map(week=>{
    const button=el('button',undefined,'week-button'); button.type='button';
    button.append(el('span',String(week.number).padStart(2,'0'),'num'),el('span',week.title));
    if(week.number===selected) button.setAttribute('aria-current','step');
    if(week.tasks.every(t=>progress.tasks[t.id])) button.append(el('span','✓','tick'));
    button.onclick=()=>selectWeek(week.number);
    return button;
  }));
}
function selectWeek(n) { selected=n; history.replaceState(null,'',`#week-${n}`); render(); }
function render() {
  updateMetrics();
  const week=curriculum.weeks[selected-1], section=$('#week');
  section.replaceChildren();
  section.append(el('p',`WEEK ${String(selected).padStart(2,'0')} / 12`,'eyebrow'));
  const heading=el('div',undefined,'week-heading');
  heading.append(el('h2',week.title),el('span',`~${week.hours} h · your pace`,'pill'));
  section.append(heading,el('p',week.goal,'goal'),el('p','01 / EXPLORE THE LESSONS','section-label'));
  const list=el('div',undefined,'lesson-list');
  for(const path of week.lessons) {
    const score=progress.quizzes[path];
    const button=el('button',`${lessonName(path)}${score?` · quiz ${score.correct}/${score.total}`:''}`,'lesson-button');
    button.type='button'; button.onclick=()=>openLesson(path); list.append(button);
  }
  section.append(list,el('p','02 / MAKE SOMETHING REAL','section-label'));
  for(const task of week.tasks) {
    const label=el('label',undefined,'task'), checkbox=el('input'); checkbox.type='checkbox'; checkbox.checked=!!progress.tasks[task.id]; checkbox.dataset.task=task.id;
    const text=el('span');text.append(el('span',task.kind.toUpperCase(),'kind'),el('span',task.label,'task-text'));
    checkbox.onchange=()=>{progress.tasks[task.id]=checkbox.checked;updateMetrics();save();};
    label.append(checkbox,text);section.append(label);
  }
  const project=el('p',undefined,'project'), link=el('a','Browse the related project starter ↗');
  link.href=`https://github.com/athulbaburaj/applied-ai-engineering/tree/main/${week.project}`;link.target='_blank';link.rel='noreferrer';project.append(link);section.append(project);
  const box=el('div',undefined,'reflection');
  for(const [field,title,placeholder] of [['notes','Your lab notes','What failed? What did you change? What can you explain now?'],['evidence','Evidence & artifacts','Paste a commit URL, report path, demo link, and the key result.']]) {
    const label=el('label',title);label.htmlFor=field;
    const input=el('textarea');input.id=field;input.maxLength=20000;input.placeholder=placeholder;input.value=progress[field][selected]||'';
    input.oninput=()=>{ progress[field][selected]=input.value; dirty=true; status('Unsaved edits · save when you leave this field'); };
    input.onchange=()=>save();box.append(label,input);
  }
  const label=el('label','Hours invested this week'); label.htmlFor='hours';
  const hours=el('input');hours.type='number';hours.id='hours';hours.min=0;hours.max=1000;hours.step='0.25';hours.value=progress.hours[selected]||0;
  hours.onchange=()=>{ if(!hours.checkValidity() || !Number.isFinite(Number(hours.value))) {hours.reportValidity();return;} progress.hours[selected]=Number(hours.value);updateMetrics();save(); };
  box.append(label,hours,el('small','Total for this week. Updates when you leave the field.')); section.append(box);
  const navigation=el('div',undefined,'week-nav');
  const prev=el('button','← Previous week');prev.disabled=selected===1;prev.onclick=()=>selectWeek(selected-1);
  const next=el('button','Next week →');next.disabled=selected===12;next.onclick=()=>selectWeek(selected+1);navigation.append(prev,next);section.append(navigation);
}
function lessonName(path) { return path.split('/').at(-1).slice(3).replaceAll('-',' '); }
function renderMarkdown(text, target) {
  target.replaceChildren();let code=null;
  for(const line of text.split('\n')) {
    if(line.startsWith('```')) {if(code)code=null;else {code=el('pre','');target.append(code);}continue;}
    if(code) { code.textContent+=line+'\n';continue; }
    const heading=line.match(/^(#{1,6})\s+(.*)/);
    if(heading) target.append(el(`h${heading[1].length}`,heading[2]));
    else if(line.trim()) target.append(el('p',line));
  }
}
async function openLesson(path) {
  const request=++lessonRequest;
  $('#readerTitle').textContent=lessonName(path);
  $('#lessonText').textContent='Loading lesson…';$('#quiz').replaceChildren();
  $('#sourceLink').href=`https://github.com/athulbaburaj/applied-ai-engineering/tree/main/${path}`;
  if(!$('#reader').open) $('#reader').showModal();
  $('#reader').scrollTop=0;
  try {
    const data=await api(`/api/lesson?path=${encodeURIComponent(path)}`);
    if(request!==lessonRequest)return;
    renderMarkdown(data.markdown,$('#lessonText'));
    const questions=data.questions;
    if(!Array.isArray(questions)||!questions.length) {$('#quiz').textContent='No quiz available for this lesson.';return;}
    $('#quiz').append(el('h2','Check your understanding'),el('p','Practice quiz. Scores are saved separately; mark the learning task complete after reading and running the example.'));
    const form=el('form'), fields=[];
    questions.forEach((q,i)=>{
      const field=el('fieldset');field.append(el('legend',`${i+1}. ${q.question}`));
      q.options.forEach((option,j)=>{
        const label=el('label'),input=el('input');input.type='radio';input.name=`q${i}`;input.value=j;input.required=true;label.append(input,document.createTextNode(' '+option));field.append(label);
      });fields.push(field);form.append(field);
    });
    const submit=el('button','Check answers & save score');submit.type='submit';
    const result=el('p');result.setAttribute('role','status');form.append(submit,result);
    form.onsubmit=event=>{
      event.preventDefault();let correct=0;const answers=new FormData(form);
      questions.forEach((q,i)=>{const ok=Number(answers.get(`q${i}`))===q.correct;correct+=Number(ok); fields[i].querySelector('.feedback')?.remove();fields[i].append(el('p',`${ok?'Correct.':'Review this one. Correct answer: '+q.options[q.correct]+'.'} ${q.explanation || 'Revisit the lesson to explain this answer in your own words.'}`,'feedback'));});
      progress.quizzes[path]={correct,total:questions.length};save();render();result.textContent=`${correct} / ${questions.length}. Review the explanations and try again when ready.`;
    };$('#quiz').append(form);
  }catch(error){if(request===lessonRequest)$('#lessonText').textContent=`Could not open lesson: ${error.message}`;}
}
$('#closeReader').onclick=()=>$('#reader').close();
$('#export').onclick=()=>{
  if(!progress)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)+'\n'],{type:'application/json'}));
  const link=el('a');link.href=url;link.download=`applied-ai-progress-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#import').onclick=()=>{if(progress)$('#importFile').click();};
$('#importFile').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>1024*1024)throw new Error('File exceeds 1 MB.');
    const next=validateProgress(JSON.parse(await file.text()),curriculum);
    if(!confirm('Replace current progress with this backup? Export your current progress first if you want to keep it.'))return;
    progress=next;render();await save();
  }catch(error){status(`Import failed: ${error.message}`,true);}finally{event.target.value='';}
};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
try {
  [curriculum,progress]=await Promise.all([api('/api/curriculum'),api('/api/progress')]);
  progress=validateProgress(progress,curriculum);
  const hash=location.hash.match(/^#week-(\d+)$/);selected=hash?Math.min(12,Math.max(1,Number(hash[1]))):curriculum.weeks.find(w=>w.tasks.some(t=>!progress.tasks[t.id]))?.number||12;
  render();status('Saved on this computer');
}catch(error){status(`Could not load dashboard: ${error.message}`,true);$('#week').textContent='Keep this page open, check the server, then reload. No progress has been overwritten.';}
