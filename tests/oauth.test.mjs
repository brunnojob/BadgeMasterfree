import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../api/gateway.mjs';
import { unseal, challenge } from '../server/security.mjs';
import { gatewayRequest } from '../web/gateway.js';
const key='test-session-secret-longer-than-32-characters';
const names=['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','SESSION_SECRET'];
function configure(){const old=names.map(n=>process.env[n]);process.env.GITHUB_CLIENT_ID='test-client';process.env.GITHUB_CLIENT_SECRET='test-secret';process.env.SESSION_SECRET=key;return()=>names.forEach((n,i)=>old[i]===undefined?delete process.env[n]:process.env[n]=old[i]);}
const req=(action,body)=>new Request(`https://example.test/api/gateway?action=${action}`,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('configuration diagnostics identify missing names without disclosing secrets',async()=>{
 const restore=configure();try{delete process.env.GITHUB_CLIENT_SECRET;process.env.SESSION_SECRET='short';const data=await (await handler(req('status'))).json();assert.equal(data.ready,false);assert.deepEqual(data.missing,['GITHUB_CLIENT_SECRET','SESSION_SECRET']);assert.ok(!JSON.stringify(data).includes('test-client'));assert.equal((await handler(req('start',{}))).status,503);}finally{restore();}
});
test('OAuth start and exchange preserve callback, state and PKCE',async()=>{
 const restore=configure(),original=globalThis.fetch;let calls=0;
 try{
 const start=await (await handler(req('start',{}))).json();const url=new URL(start.url),flow=unseal(start.flow,key,'flow');assert.equal(url.searchParams.get('state'),start.state);assert.equal(url.searchParams.get('redirect_uri'),'https://brunnojob.github.io/BadgeMasterfree/');assert.equal(url.searchParams.get('code_challenge'),challenge(flow.verifier));
 globalThis.fetch=async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.code_verifier,flow.verifier);assert.equal(body.redirect_uri,'https://brunnojob.github.io/BadgeMasterfree/');return Response.json({access_token:'private-token',scope:'read:user,public_repo,user:follow',expires_in:3600});};
 assert.equal((await handler(req('exchange',{flow:start.flow,state:'wrong',code:'code'}))).status,400);assert.equal(calls,0);
 const result=await handler(req('exchange',{flow:start.flow,state:start.state,code:'code'}));assert.equal(result.status,200);const data=await result.json();assert.equal(unseal(data.session,key,'session').token,'private-token');assert.ok(!JSON.stringify(data).includes('private-token'));assert.equal(calls,1);
 }finally{globalThis.fetch=original;restore();}
});
test('malformed OAuth JSON returns 400 instead of crashing',async()=>{
 const restore=configure();try{for(const body of ['null','{','[]']){const result=await handler(new Request('https://example.test/api/gateway?action=exchange',{method:'POST',body}));assert.equal(result.status,400);}}finally{restore();}
});
test('frontend gateway reports unavailable servers, non-JSON replies and config errors',async()=>{
 const original=globalThis.fetch;try{
 globalThis.fetch=async()=>{throw new TypeError('fetch failed');};await assert.rejects(()=>gatewayRequest('https://example.test/api/gateway','start',{}),/acessar o servidor/);
 globalThis.fetch=async()=>new Response('<html>bad gateway</html>',{status:502});await assert.rejects(()=>gatewayRequest('https://example.test/api/gateway','start',{}),/resposta inválida/);
 globalThis.fetch=async()=>Response.json({error:'Configure GITHUB_CLIENT_SECRET'},{status:503});await assert.rejects(()=>gatewayRequest('https://example.test/api/gateway','start',{}),/GITHUB_CLIENT_SECRET/);
 globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).searchParams.get('action'),'me');assert.equal(options.headers.Authorization,'Bearer sealed-session');return Response.json({login:'brunnojob'});};assert.equal((await gatewayRequest('https://example.test/api/gateway','me',undefined,'sealed-session')).login,'brunnojob');
 }finally{globalThis.fetch=original;}
});
