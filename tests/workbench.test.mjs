import test from 'node:test';
import assert from 'node:assert/strict';
import {badges, validUsername, coauthorTrailer, normalizeProgress} from '../web/model.js';

test('profile lookup accepts GitHub usernames and rejects paths and query injection',()=>{
  for(const name of ['brunnojob','ineedfoundmyway','valid-name','a'.repeat(39)])assert.equal(validUsername(name),true);
  for(const name of ['', '-start','end-','double--dash','user/repo','user?q=x','a'.repeat(40)])assert.equal(validUsername(name),false);
});

test('coauthor trailer preserves attribution and rejects extra trailers or invalid addresses',()=>{
  assert.equal(coauthorTrailer(' Bruno ',' bruno@example.com '),'Co-authored-by: Bruno <bruno@example.com>');
  for(const [name,email] of [['Bruno\nCo-authored-by: Fake','b@example.com'],['<Bruno>','b@example.com'],['Bruno','b@example.com\nSigned-off-by: X'],['Bruno','bad'],['','b@example.com']])assert.throws(()=>coauthorTrailer(name,email));
});

test('stored progress only restores recognized boolean checklist entries',()=>{
  assert.deepEqual(normalizeProgress(null),{});
  assert.deepEqual(normalizeProgress({'pull-shark:0':true,'pair:2':true,'pair:3':true,'sponsor:1':'true','removed:0':true}),{'pull-shark:0':true,'pair:2':true});
  assert.equal(new Set(badges.map(b=>b.id)).size,badges.length);
});
