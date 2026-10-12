import test from 'node:test';
import assert from 'node:assert/strict';
import { seal,unseal,targetPath,challenge } from '../server/security.mjs';
import { handler } from '../api/gateway.mjs';
const key='test-key-that-is-at-least-32-characters-long';
test('sessions reject tampering, wrong purpose and expiry',()=>{const payload={kind:'session',token:'private-test',exp:2000};const value=seal(payload,key);assert.deepEqual(unseal(value,key,'session',1000),payload);assert.throws(()=>unseal(value,key,'flow',1000));assert.throws(()=>unseal(value,key,'session',2000));assert.throws(()=>unseal(value.slice(0,20)+'XX'+value.slice(22),key,'session',1000));assert.ok(!value.includes('private-test'));});
test('API destinations cannot escape allowlisted star/follow routes',()=>{assert.equal(targetPath('star','brunnojob/BadgeMasterfree'),'/user/starred/brunnojob/BadgeMasterfree');assert.equal(targetPath('follow','brunnojob'),'/user/following/brunnojob');for(const target of ['a/..','a/.','a/b/c','https://evil.com','a%2fb','a?x=1'])assert.throws(()=>targetPath('star',target));assert.throws(()=>targetPath('delete','brunnojob'));});
test('PKCE matches RFC 7636 test vector',()=>{assert.equal(challenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');});
test('unconfigured login fails clearly and hostile origins are rejected',async()=>{const response=await handler(new Request('https://example.com/api/gateway?action=start',{method:'POST'}));assert.equal(response.status,503);const blocked=await handler(new Request('https://example.com/api/gateway?action=status',{headers:{Origin:'https://evil.test'}}));assert.equal(blocked.status,403);});
test('writes require explicit confirmation and do not call upstream without it',async()=>{
  const before={...process.env};const original=globalThis.fetch;
  process.env.GITHUB_CLIENT_ID='test';process.env.GITHUB_CLIENT_SECRET='test';process.env.SESSION_SECRET=key;
  let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Unexpected network');};
  try{const session=seal({kind:'session',token:'test',exp:Date.now()+60000},key);const r=await handler(new Request('https://example.com/api/gateway?action=act',{method:'POST',headers:{Authorization:`Bearer ${session}`,'Content-Type':'application/json'},body:JSON.stringify({type:'star',target:'brunnojob/BadgeMasterfree'})}));assert.equal(r.status,400);assert.equal(calls,0);}finally{globalThis.fetch=original;for(const k of ['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','SESSION_SECRET']){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
