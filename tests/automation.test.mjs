import test from 'node:test';
import assert from 'node:assert/strict';
import {automation,repositoryName} from '../server/automation.mjs';
import {seal,unseal} from '../server/security.mjs';
const key='automation-test-session-key-with-32-characters';
const repo={id:7,full_name:'main/lab',name:'lab',owner:{id:1,login:'main'},permissions:{push:true},default_branch:'main',has_discussions:true,private:false};
const primary={id:1,login:'main',type:'User'},helper={id:2,login:'helper',type:'User'};
const helperSession=seal({kind:'session',token:'helper-token',exp:Date.now()+60000},key);
function request(action,body){return new Request('https://test/api/gateway?action='+action,{method:'POST',body:JSON.stringify(body)});}
async function fixture(run){
 const original=globalThis.fetch;const state={files:new Map(),branches:new Set(),prs:[],writes:[],merged:false,discussion:null,comment:null,answer:null,mutations:[],private:false};
 globalThis.fetch=async(url,options={})=>{
  const path=decodeURIComponent(new URL(url).pathname),method=options.method||'GET',body=options.body?JSON.parse(options.body):null,who=options.headers.Authorization==='Bearer helper-token'?helper:primary;
  if(method!=='GET')state.writes.push({path,method,body,who:who.login});
  if(path==='/user')return Response.json(who);
  if(path==='/users/helper')return Response.json(helper);
  if(path==='/repos/main/lab')return Response.json({...repo,private:state.private});
  if(path==='/graphql'){
   const q=body.query,v=body.variables;state.mutations.push({q,who:who.login});
   if(q.includes('discussionCategories'))return Response.json({data:{repository:{id:'R_7',discussionCategories:{nodes:[{id:'C_1',name:'Q&A',isAnswerable:true}]}}}});
   if(q.includes('discussions(first:100'))return Response.json({data:{repository:{discussions:{nodes:state.discussion?[state.discussion]:[]}}}});
   if(q.includes('createDiscussion(')){state.discussion={id:'D_1',url:'https://github.com/main/lab/discussions/1',body:v.input.body,author:{login:who.login}};return Response.json({data:{createDiscussion:{discussion:state.discussion}}});}
   if(q.includes('comments(first:100'))return Response.json({data:{node:{comments:{nodes:state.comment?[state.comment]:[]}}}});
   if(q.includes('addDiscussionComment(')){state.comment={id:'DC_1',url:'https://github.com/main/lab/discussions/1#discussioncomment-1',body:v.input.body,author:{login:who.login}};return Response.json({data:{addDiscussionComment:{comment:state.comment}}});}
   if(q.includes('viewerCanMarkAsAnswer'))return Response.json({data:{node:{...state.comment,isAnswer:Boolean(state.answer),viewerCanMarkAsAnswer:who.id===2,discussion:{id:'D_1'}}}});
   if(q.includes('markDiscussionCommentAsAnswer(')){assert.equal(who.id,2);state.answer=state.comment;return Response.json({data:{markDiscussionCommentAsAnswer:{discussion:{id:'D_1'}}}});}
   if(q.includes('answer{id'))return Response.json({data:{node:{id:'D_1',answer:state.answer}}});
   throw new Error('Unexpected GraphQL query');
  }
  if(path.startsWith('/repos/main/lab/git/ref/heads/')){const name=path.split('/heads/')[1];return name==='main'||state.branches.has(name)?Response.json({object:{sha:'base'}}):Response.json({message:'Not found'},{status:404});}
  if(path.endsWith('/git/refs')&&method==='POST'){state.branches.add(body.ref.replace('refs/heads/',''));return Response.json({ref:body.ref});}
  if(path.includes('/contents/')){
   if(method==='GET')return state.files.has(path)?Response.json(state.files.get(path)):Response.json({message:'Not found'},{status:404});
   state.files.set(path,{content:body.content,sha:'file-sha'});return Response.json({commit:{sha:'commit-sha'}});
  }
  if(path==='/repos/main/lab/pulls'){
   if(method==='GET'){const head=new URL(url).searchParams.get('head').split(':')[1];return Response.json(state.prs.filter(p=>p.head.ref===head));}
   const pr={number:state.prs.length+1,html_url:'https://github.com/main/lab/pull/'+(state.prs.length+1),head:{sha:'head-'+state.prs.length,ref:body.head},base:{ref:body.base},state:'open',merged:false};state.prs.push(pr);return Response.json(pr);
  }
  if(path.match(/\/pulls\/\d+\/merge$/)){const number=Number(path.split('/').at(-2)),pr=state.prs[number-1];assert.equal(body.sha,pr.head.sha);pr.merged=true;pr.merged_at=new Date().toISOString();return Response.json({merged:true});}
  if(path.match(/\/pulls\/\d+$/))return Response.json(state.prs[Number(path.split('/').at(-1))-1]);
  throw new Error(`Unexpected ${method} ${path}`);
 };
 try{await run(state);}finally{globalThis.fetch=original;}
}
const prepare=(badge,extra={})=>automation(request('prepare',{repo:'main/lab',badge,count:1,title:'Document a validated workflow',content:'Describe the implementation and include reproducible validation steps.',autoMerge:true,...extra}),'primary-token',key);
async function finish(job,extra={}){let result;for(let i=0;i<100;i++){result=await automation(request('step',{job,confirmed:true,...extra}),'primary-token',key);job=result.job;if(result.done)return result;}throw new Error('Workflow did not terminate');}
test('Pull Shark executes two actual PR workflows and verifies both merges',()=>fixture(async state=>{
 const prepared=await prepare('pull-shark',{count:2});assert.equal(state.writes.length,0);assert.equal(prepared.preview.account,'main');const result=await finish(prepared.job);
 assert.equal(result.results.length,2);assert.ok(result.results.every(r=>r.status==='merged'));assert.equal(state.files.size,2);assert.equal(state.prs.length,2);
 assert.equal(state.writes.filter(w=>w.path.endsWith('/merge')).length,2);
}));
test('YOLO merges without requesting a review and open-only mode never merges',()=>fixture(async state=>{
 await finish((await prepare('yolo')).job);assert.ok(!state.writes.some(w=>w.path.includes('requested_reviewers')));
 const result=await finish((await prepare('pull-shark',{autoMerge:false})).job);assert.equal(result.results[0].status,'open');assert.equal(state.writes.filter(w=>w.path.endsWith('/merge')).length,1);
}));
test('Pair uses the authenticated author and confirmed coauthor trailer',()=>fixture(async state=>{
 await assert.rejects(()=>prepare('pair',{coauthor:'helper'}),/participação/);assert.equal(state.writes.length,0);
 await finish((await prepare('pair',{coauthor:'helper',coauthorConfirmed:true})).job);
 const commit=state.writes.find(w=>w.path.includes('/contents/'));assert.match(commit.body.message,/Co-authored-by: helper <2\+helper@users.noreply.github.com>/);assert.equal(commit.who,'main');assert.equal(commit.body.author,undefined);
}));
test('Galaxy has helper question, primary answer, helper acceptance and verified authorship',()=>fixture(async state=>{
 const result=await finish((await prepare('galaxy',{helperSession,question:'How can a maintainer reproduce and validate a proposed improvement?'})).job,{helperSession});
 assert.equal(state.discussion.author.login,'helper');assert.equal(state.answer.author.login,'main');assert.equal(result.results[0].status,'answer-accepted');
 assert.equal(state.mutations.find(x=>x.q.includes('markDiscussionCommentAsAnswer(')).who,'helper');
}));
test('steps reject absent approval, wrong account, expired jobs and private repositories',()=>fixture(async state=>{
 const prepared=await prepare('yolo');await assert.rejects(()=>automation(request('step',{job:prepared.job}),'primary-token',key),/Confirme/);
 const job=unseal(prepared.job,key,'automation');await assert.rejects(()=>automation(request('step',{job:seal({...job,uid:99},key),confirmed:true}),'primary-token',key),/outra conta/);
 await assert.rejects(()=>automation(request('step',{job:seal({...job,exp:1},key),confirmed:true}),'primary-token',key),/expirado/);
 state.private=true;await assert.rejects(()=>automation(request('step',{job:prepared.job,confirmed:true}),'primary-token',key),/público/);assert.equal(state.writes.length,0);
}));
test('replaying a step after a lost response recovers branches, files and PRs without duplicates',()=>fixture(async state=>{
 let job=(await prepare('yolo')).job;
 for(let i=0;i<3;i++){await automation(request('step',{job,confirmed:true}),'primary-token',key);const result=await automation(request('step',{job,confirmed:true}),'primary-token',key);job=result.job;}
 assert.equal(state.branches.size,1);assert.equal(state.files.size,1);assert.equal(state.prs.length,1);
}));
test('repository names reject path traversal and query injection',()=>{for(const value of ['a/..','a/.','a/b/c','a/b?x=1','https://evil.test'])assert.throws(()=>repositoryName(value));assert.equal(repositoryName('main/lab'),'main/lab');});

test('large prepared payloads remain resumable and changed PR heads block merge',()=>fixture(async state=>{
 const long=await prepare('galaxy',{helperSession,question:'A'.repeat(6000),content:'B'.repeat(6000)});
 assert.equal(unseal(long.job,key,'automation').content.length,6000);
 let job=(await prepare('yolo')).job;
 for(let i=0;i<3;i++)job=(await automation(request('step',{job,confirmed:true}),'primary-token',key)).job;
 state.prs[0].head.sha='someone-elses-change';
 await assert.rejects(()=>automation(request('step',{job,confirmed:true}),'primary-token',key),/alterado/);
 assert.equal(state.writes.filter(w=>w.path.endsWith('/merge')).length,0);
}));
