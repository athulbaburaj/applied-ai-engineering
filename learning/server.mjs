import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { emptyProgress, validateProgress } from './model.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
export const curriculum = JSON.parse(await readFile(path.join(here, 'curriculum.json'), 'utf8'));
const lessons = new Set(curriculum.weeks.flatMap(w => w.lessons));
const files = { '/': ['index.html','text/html'], '/app.mjs':['app.mjs','text/javascript'], '/style.css':['style.css','text/css'], '/model.mjs':['model.mjs','text/javascript'] };

export async function createApp({ progressFile = path.join(root, '.learning-progress.json') } = {}) {
  let progress;
  try { progress = validateProgress(JSON.parse(await readFile(progressFile, 'utf8')), curriculum); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Cannot read progress; back up and repair ${progressFile}: ${error.message}`);
    progress = emptyProgress();
  }
  let writes = Promise.resolve();
  return http.createServer(async (req, res) => {
    function send(status, data, type='application/json') {
      res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" });
      res.end(type === 'application/json' ? JSON.stringify(data) : data);
    }
    try {
      const expectedHost = `127.0.0.1:${serverPort(res)}`;
      if (req.headers.host !== expectedHost && req.headers.host !== `localhost:${serverPort(res)}`) return send(403,{error:'Use the local dashboard address.'});
      const url = new URL(req.url, `http://${expectedHost}`);
      if (req.method === 'GET' && files[url.pathname]) {
        const [name,type] = files[url.pathname];
        return send(200,await readFile(path.join(here,name),'utf8'),type);
      }
      if (req.method === 'GET' && url.pathname === '/api/curriculum') return send(200,curriculum);
      if (req.method === 'GET' && url.pathname === '/api/progress') return send(200,progress);
      if (req.method === 'GET' && url.pathname === '/api/lesson') {
        const lesson = url.searchParams.get('path');
        if (!lessons.has(lesson)) return send(404,{error:'Lesson not in this learning route.'});
        const markdown = await readFile(path.join(root,lesson,'docs/en.md'),'utf8');
        const quizData = JSON.parse(await readFile(path.join(root,lesson,'quiz.json'),'utf8'));
        return send(200,{ markdown, questions: Array.isArray(quizData) ? quizData : quizData.questions });
      }
      if (req.method === 'PUT' && url.pathname === '/api/progress') {
        if (![`http://${expectedHost}`,`http://localhost:${serverPort(res)}`].includes(req.headers.origin)) return send(403,{error:'Save requests must originate from this dashboard.'});
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'Expected JSON.'});
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 1024*1024) return send(413,{error:'Progress file exceeds 1 MB.'}); }
        let next;
        try { next = validateProgress(JSON.parse(body),curriculum); }
        catch (error) { return send(400,{error:error.message}); }
        const write = writes.then(async () => {
          await mkdir(path.dirname(progressFile),{ recursive:true });
          await writeFile(progressFile+'.tmp',JSON.stringify(next,null,2)+'\n','utf8');
          await rename(progressFile+'.tmp',progressFile);
          progress = next;
        });
        writes = write.catch(() => {});
        await write;
        return send(200,{saved:true});
      }
      return send(404,{error:'Not found.'});
    } catch (error) { console.error(error.message); if (!res.headersSent) send(500,{error:'Could not complete request. Your previous progress file has been preserved.'}); }
  });
}
function serverPort(res) { return res.socket.localPort; }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createApp();
  const port = Number(process.env.PORT || 4311);
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port,'127.0.0.1',() => console.log(`Applied AI dashboard: http://127.0.0.1:${server.address().port}`));
}
