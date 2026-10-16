import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommunityStore, validateProfile } from '../server/community.mjs';
import { handler } from '../api/gateway.mjs';
import { seal } from '../server/security.mjs';
const input={name:'Brunno',bio:'Industrial software',skills:'Java, C++',projects:['brunnojob/BadgeMasterfree'],available:true,visible:true};
const user={id:169157603,login:'brunnojob'};
test('profiles survive restart, remain unique by GitHub ID and support visibility, search and deletion',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bm-community-')),file=join(dir,'community.sqlite');let store=new CommunityStore(file);
 try{
  store.save(user,input);store.save({...user,login:'renamed'},{...input,name:'New name'});store.close();store=new CommunityStore(file);
  assert.equal(store.get(user.id).login,'renamed');assert.equal(store.list('Java').items.length,1);assert.equal(store.list('%').items.length,0);
  store.save(user,{...input,visible:false});assert.equal(store.list().items.length,0);assert.equal(store.get(user.id).visible,false);
  store.save(user,input);store.delete(user.id);assert.equal(store.get(user.id),null);assert.equal(store.list().items.length,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('profile validation rejects unsafe projects, oversized content and invalid fields',()=>{
 for(const projects of [['../secret'],['a/..'],['javascript:alert(1)'],Array(7).fill('a/b')])assert.throws(()=>validateProfile({...input,projects}));
 for(const change of [{name:''},{bio:'x'.repeat(601)},{visible:'true'},{projects:null}])assert.throws(()=>validateProfile({...input,...change}));
});
test('directory pagination does not omit members',()=>{
 const store=new CommunityStore(':memory:');try{for(let i=1;i<=25;i++)store.save({id:i,login:`user${i}`},input);const first=store.list('',1),second=store.list('',2);assert.equal(first.more,true);assert.equal(second.more,false);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,25);}finally{store.close();}
});
test('gateway authenticates registration, verifies project ownership and never exposes tokens',async()=>{
 const keys=['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','SESSION_SECRET','COMMUNITY_DB_PATH'],old=keys.map(k=>process.env[k]),original=globalThis.fetch;
 const key='a-secure-key-with-more-than-32-characters';
 Object.assign(process.env,{GITHUB_CLIENT_ID:'client',GITHUB_CLIENT_SECRET:'secret',SESSION_SECRET:key,COMMUNITY_DB_PATH:':memory:'});
 const session=seal({kind:'session',token:'private-github-token',exp:Date.now()+60000},key);
 const req=(action,body,token=session)=>new Request(`https://test.invalid/api/gateway?action=${action}`,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let ownerId=user.id;
 globalThis.fetch=async url=>Response.json(String(url).endsWith('/user')?user:{owner:{id:ownerId},private:false});
 try{
  assert.equal((await handler(req('profile',input,null))).status,401);
  assert.equal((await handler(req('profile',input))).status,200);
  const directory=await (await handler(req('community',undefined,null))).json();assert.equal(directory.items.length,1);assert.ok(!JSON.stringify(directory).includes('private-github-token'));
  ownerId=999;assert.equal((await handler(req('profile',input))).status,400);
  assert.equal((await (await handler(req('profile'))).json()).profile.id,user.id);
  assert.equal((await handler(req('profile',{delete:true,id:999}))).status,200);
  assert.equal((await (await handler(req('community',undefined,null))).json()).items.length,0);
 }finally{globalThis.fetch=original;keys.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]);}
});
