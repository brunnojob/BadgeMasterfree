import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createAppServer } from '../server/http.mjs';
test('HTTP runtime serves built frontend and gateway without exposing source',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs']);
 const server=createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(url+'/healthz')).status,200);
  const page=await fetch(url+'/');assert.equal(page.status,200);const html=await page.text();assert.match(html,/BadgeMasterfree/);
  const script=html.match(/src="(app\.[a-f0-9]{12}\.js)"/)[1];
  const style=html.match(/href="(style\.[a-f0-9]{12}\.css)"/)[1];
  const code=await (await fetch(url+'/'+script)).text();
  const model=code.match(/from '\.\/(model\.[a-f0-9]{12}\.js)'/)[1];
  assert.equal((await fetch(url+'/'+model)).status,200);
  assert.equal((await fetch(url+'/'+style)).status,200);
  assert.doesNotMatch(code,/vercel\.app|setupCommunity/);
  assert.match((await fetch(url+'/app.js')).headers.get('content-type'),/javascript/);
  assert.equal((await fetch(url+'/.env')).status,404);
  assert.equal((await fetch(url+'/server/security.mjs')).status,404);
  assert.equal((await fetch(url+'/api/gateway?action=status')).status,200);
  assert.equal((await fetch(url+'/api/gateway?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
  assert.equal((await fetch(url+'/api/gateway?action=status',{headers:{Origin:'https://evil.test'}})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
