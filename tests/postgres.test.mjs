import test from 'node:test';
import assert from 'node:assert/strict';
import { NeonCommunityStore } from '../server/community-postgres.mjs';
import { communityStore, communityConfigured } from '../server/community.mjs';
import { handler } from '../api/gateway.mjs';

const user={id:123,login:'member'};
const input={name:'Member',bio:'API research',skills:'JavaScript',projects:['member/lab'],available:true,visible:true};

test('Postgres store awaits initialization and parameterizes profile writes and deletion',async()=>{
  const calls=[];
  const sql=async(strings,...values)=>{calls.push({query:strings.join('?'),values});return [];};
  const store=new NeonCommunityStore(null,sql);
  const profile=await store.save(user,input);
  await store.delete(user.id);
  assert.equal(profile.id,123);
  assert.equal(calls.filter(call=>call.query.includes('CREATE TABLE')).length,1);
  assert.equal(calls[1].values[0],123);
  assert.deepEqual(JSON.parse(calls[1].values[2]),profile);
  assert.deepEqual(calls[2].values,[123]);
  assert.ok(!calls[1].query.includes(input.bio));
});

test('Postgres listing hides private profiles, escapes wildcard searches and preserves pagination',async()=>{
  const calls=[];
  const profiles=Array.from({length:25},(_,id)=>({profile:{id}}));
  const sql=async(strings,...values)=>{const query=strings.join('?');calls.push({query,values});return query.includes('SELECT')?profiles:[];};
  const store=new NeonCommunityStore(null,sql);
  const result=await store.list("%' OR true --",2);
  assert.equal(result.items.length,24);
  assert.equal(result.more,true);
  assert.match(calls[1].query,/WHERE visible=true/);
  assert.match(calls[1].query,/ESCAPE '!'/);
  assert.equal(calls[1].values[0],"%!%' OR true --%");
  assert.equal(calls[1].values[1],24);
});

test('Postgres store rejects invalid identity before any database request',async()=>{
  let count=0;
  const store=new NeonCommunityStore(null,async()=>{count++;return [];});
  await assert.rejects(()=>store.save({...user,id:-1},input));
  await assert.rejects(()=>store.save(user,{...input,projects:['../secret']}));
  assert.equal(count,0);
});

test('failed initialization can recover on the next request',async()=>{
  let calls=0;
  const store=new NeonCommunityStore(null,async()=>{if(++calls===1)throw new Error('database unavailable');return [];});
  await assert.rejects(()=>store.get(123));
  assert.equal(await store.get(123),null);
  assert.equal(calls,3);
});

test('Vercel never falls back to an ephemeral SQLite database',async()=>{
  const keys=['VERCEL','DATABASE_URL','COMMUNITY_DB_PATH'];
  const old=keys.map(key=>process.env[key]);
  try{
    process.env.VERCEL='1';
    delete process.env.DATABASE_URL;
    process.env.COMMUNITY_DB_PATH='/tmp/community.sqlite';
    assert.equal(communityConfigured(),false);
    await assert.rejects(()=>communityStore(),error=>error.status===503);
    const response=await handler(new Request('https://example.test/api/gateway?action=status'));
    const status=await response.json();
    assert.equal(status.platform,'vercel');
    assert.equal(status.communityReady,false);
  }finally{keys.forEach((key,index)=>old[index]===undefined?delete process.env[key]:process.env[key]=old[index]);}
});
