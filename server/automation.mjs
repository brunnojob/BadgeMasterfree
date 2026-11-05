import {randomUUID} from 'node:crypto';
import {seal,unseal} from './security.mjs';
const fail=(message,status=400)=>{const error=new Error(message);error.status=status;throw error;};
const segment=value=>encodeURIComponent(value);
export function repositoryName(value){
 if(typeof value!=='string'||!/^([a-z\d](?:[a-z\d-]{0,38}))\/([a-z\d_.-]{1,100})$/i.test(value)||['.','..'].includes(value.split('/')[1]))fail('Escolha um repositório válido.');
 return value.split('/').map(segment).join('/');
}
function text(value,label,min=1,max=6000){if(typeof value!=='string'||value.trim().length<min||value.length>max)fail(`${label}: use entre ${min} e ${max} caracteres.`);return value.trim();}
function client(token){
 async function rest(path,method='GET',body){
  const response=await fetch(`https://api.github.com${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'BadgeMasterfree',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  if(response.status===404)return null;
  const data=response.status===204?null:await response.json();
  if(!response.ok){const status=[401,403,409,422,429].includes(response.status)?response.status:502;fail(response.status===403||response.status===429?'GitHub: limite de chamadas, proteção ou permissão insuficiente. Aguarde ou confira as permissões; nenhuma proteção será alterada.':`GitHub: ${data?.message||'não foi possível concluir a operação.'}`,status);}
  return data;
 }
 async function graphql(query,variables){const data=await rest('/graphql','POST',{query,variables});if(!data||data.errors?.length)fail(data?.errors?.map(e=>e.message).join('; ')||'Discussions indisponível.',422);return data.data;}
 return {rest,graphql};
}
async function target(api,repo){const r=await api.rest(`/repos/${repositoryName(repo)}`);if(!r||r.private||r.archived||r.disabled||!r.permissions?.push)fail('Selecione um repositório público ativo com permissão de escrita.',403);return r;}
function summary(r){return {id:r.id,full_name:r.full_name,default_branch:r.default_branch,has_discussions:r.has_discussions};}
const categoryQuery='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){id discussionCategories(first:100){nodes{id name isAnswerable}}}}';
async function helperSession(input,key,uid){let session;try{session=unseal(input.helperSession,key,'session');}catch{fail('Conecte novamente a conta auxiliar.',401);}const api=client(session.token);const user=await api.rest('/user');if(!user||user.id===uid)fail('Galaxy Brain exige uma conta auxiliar diferente da conta que receberá o crédito.');return {api,user};}
export async function automation(request,token,key){
 const action=new URL(request.url).searchParams.get('action');const api=client(token);const user=await api.rest('/user');if(!user)fail('Entre novamente com GitHub.',401);
 if(action==='repos'&&request.method==='GET'){
  const page=Number(new URL(request.url).searchParams.get('page')||1);if(!Number.isInteger(page)||page<1||page>10)fail('Página inválida.');
  const rows=await api.rest(`/user/repos?affiliation=owner,collaborator&sort=updated&per_page=100&page=${page}`);
  return {user:{id:user.id,login:user.login},items:(rows||[]).filter(r=>!r.private&&!r.archived&&!r.disabled&&r.permissions?.push).map(summary),more:rows?.length===100};
 }
 if(request.method!=='POST')fail('Método inválido.',405);
 let input;try{input=await request.json();}catch{fail('JSON inválido.');}if(!input||typeof input!=='object'||Array.isArray(input))fail('JSON inválido.');
 if(action==='lab'){
  if(input.confirmed!==true)fail('Confirme a criação do repositório público.');
  let repo=await api.rest(`/repos/${segment(user.login)}/badgemaster-lab`);
  if(!repo)repo=await api.rest('/user/repos','POST',{name:'badgemaster-lab',description:'GitHub workflow exercises created with BadgeMasterfree',auto_init:true,private:false});
  if(!repo||repo.private||repo.owner.id!==user.id)fail('O laboratório existente precisa ser público e pertencer à conta conectada.',403);
  return {repo:summary(repo)};
 }
 if(action==='prepare'){
  if(!['pull-shark','yolo','pair','galaxy'].includes(input.badge))fail('Escolha uma automação.');
  const repo=await target(api,input.repo);const count=Number(input.count);const max=input.badge==='pull-shark'?16:input.badge==='galaxy'?2:1;
  if(!Number.isInteger(count)||count<1||count>max)fail(`Quantidade permitida: 1 a ${max}.`);
  const title=text(input.title,'Título',5,120),content=text(input.content,'Conteúdo',20,6000);
  const job={kind:'automation',uid:user.id,login:user.login,repo:repo.full_name,base:repo.default_branch,badge:input.badge,count,title,content,autoMerge:input.autoMerge===true,run:randomUUID(),item:0,step:0,exp:Date.now()+3600000,results:[]};
  if(job.badge==='pair'){
   const login=text(input.coauthor,'Usuário do coautor',1,39);if(!/^[a-z\d]+(?:-[a-z\d]+)*$/i.test(login))fail('Usuário do coautor inválido.');
   const author=await api.rest(`/users/${segment(login)}`);if(!author||author.id===user.id||author.type!=='User')fail('Escolha outro usuário GitHub como coautor.');
   if(input.coauthorConfirmed!==true)fail('Confirme a participação do coautor.');
   const email=input.coauthorEmail?.trim()||`${author.id}+${author.login}@users.noreply.github.com`;
   if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)||email.length>254)fail('E-mail do coautor inválido.');
   job.coauthor={login:author.login,email};
  }
  if(job.badge==='galaxy'){
   if(!repo.has_discussions)fail('Ative Discussions e crie uma categoria de perguntas e respostas nas configurações do repositório.');
   const helper=await helperSession(input,key,user.id);job.helper=helper.user.id;job.helperLogin=helper.user.login;
   job.question=text(input.question,'Pergunta',20,6000);
   const [owner,name]=repo.full_name.split('/');const data=await api.graphql(categoryQuery,{owner,name});const category=data.repository?.discussionCategories.nodes.find(c=>c.isAnswerable);
   if(!category)fail('O repositório precisa de uma categoria Q&A que permita aceitar respostas.');
   job.category=category.id;job.repositoryId=data.repository.id;
  }
  return {job:seal(job,key),preview:{account:user.login,repository:job.repo,badge:job.badge,count,autoMerge:job.autoMerge,title,content,question:job.question,helper:job.helperLogin,coauthor:job.coauthor?.login}};
 }
 if(action!=='step')fail('Operação desconhecida.',404);
 if(input.confirmed!==true)fail('Confirme a execução antes de alterar o GitHub.');
 let job;try{job=unseal(input.job,key,'automation');}catch{fail('Plano expirado. Prepare uma nova execução.',401);}
 if(job.uid!==user.id)fail('O plano pertence a outra conta GitHub.',403);
 if(job.done)return {done:true,job:input.job,results:job.results,message:'Execução já concluída.'};
 const repo=await target(api,job.repo);const base=`/repos/${repositoryName(job.repo)}`;
 let message,url;
 if(job.badge==='galaxy'){
  const helper=await helperSession(input,key,user.id);if(helper.user.id!==job.helper)fail('Reconecte a mesma conta auxiliar utilizada na prévia.',403);
  const marker=`<!-- badgemaster:${job.run}:${job.item} -->`;
  if(job.step===0){
   const [owner,name]=job.repo.split('/');const data=await helper.api.graphql('query($owner:String!,$name:String!,$category:ID!){repository(owner:$owner,name:$name){discussions(first:100,categoryId:$category){nodes{id url body author{login}}}}}',{owner,name,category:job.category});
   let discussion=data.repository?.discussions.nodes.find(d=>d.body.includes(marker)&&d.author?.login===helper.user.login);
   if(!discussion){const created=await helper.api.graphql('mutation($input:CreateDiscussionInput!){createDiscussion(input:$input){discussion{id url}}}',{input:{repositoryId:job.repositoryId,categoryId:job.category,title:`${job.title} (${job.item+1}/${job.count})`,body:`${job.question}\n\n${marker}`}});discussion=created.createDiscussion.discussion;}
   job.discussion=discussion.id;job.url=discussion.url;message=`Pergunta publicada por @${helper.user.login}.`;
  }else if(job.step===1){
   const data=await api.graphql('query($id:ID!){node(id:$id){... on Discussion{id comments(first:100){nodes{id url body author{login}}}}}}',{id:job.discussion});
   let comment=data.node?.comments.nodes.find(c=>c.body.includes(marker)&&c.author?.login===user.login);
   if(!comment){const created=await api.graphql('mutation($input:AddDiscussionCommentInput!){addDiscussionComment(input:$input){comment{id url}}}',{input:{discussionId:job.discussion,body:`${job.content}\n\n${marker}`}});comment=created.addDiscussionComment.comment;}
   job.comment=comment.id;message=`Resposta publicada por @${user.login}.`;
  }else if(job.step===2){
   const data=await helper.api.graphql('query($id:ID!){node(id:$id){... on DiscussionComment{id isAnswer viewerCanMarkAsAnswer author{login} discussion{id}}}}',{id:job.comment});const c=data.node;
   if(!c||c.author?.login!==job.login||c.discussion?.id!==job.discussion)fail('A resposta não corresponde à conta e à discussão do plano.',403);
   if(!c.isAnswer){if(!c.viewerCanMarkAsAnswer)fail('A conta auxiliar não pode aceitar esta resposta.',403);await helper.api.graphql('mutation($id:ID!){markDiscussionCommentAsAnswer(input:{id:$id}){discussion{id}}}',{id:job.comment});}
   message=`Resposta aceita pela conta @${helper.user.login}.`;
  }else{
   const data=await api.graphql('query($id:ID!){node(id:$id){... on Discussion{id answer{id author{login}}}}}',{id:job.discussion});
   if(data.node?.answer?.id!==job.comment||data.node.answer.author?.login!==job.login)fail('O GitHub ainda não confirmou a resposta aceita. Retome para verificar.',409);
   job.results.push({type:'discussion',url:job.url,account:job.login,status:'answer-accepted'});message='Resposta aceita confirmada na API do GitHub.';job.item++;job.step=-1;delete job.discussion;delete job.comment;
  }
  url=job.url;
 }else{
  const branch=`badgemaster/${job.run}/${job.item+1}`;const head=encodeURIComponent(branch);const path=`badgemaster/sessions/${job.run}-${job.item+1}.md`;
  if(job.step===0){
   const existing=await api.rest(`${base}/git/ref/heads/${head}`);
   if(!existing){const ref=await api.rest(`${base}/git/ref/heads/${encodeURIComponent(job.base)}`);if(!ref)fail('O repositório está vazio ou a branch padrão não existe.',422);await api.rest(`${base}/git/refs`,'POST',{ref:`refs/heads/${branch}`,sha:ref.object.sha});}
   message=`Branch ${branch} preparada.`;
  }else if(job.step===1){
   const body=`# ${job.title}\n\n${job.content}\n\n## Workflow\n\n- Account: @${job.login}\n- Session: ${job.run}\n- Exercise: ${job.item+1}/${job.count}\n- Mode: ${job.badge}\n`;
   const previous=await api.rest(`${base}/contents/${path}?ref=${head}`);const content=Buffer.from(body).toString('base64');
   if(previous&&previous.content?.replace(/\s/g,'')!==content)fail('O arquivo da sessão já existe com conteúdo diferente. Nenhum arquivo foi sobrescrito.',409);
   if(!previous)await api.rest(`${base}/contents/${path}`,'PUT',{message:`${job.title}${job.coauthor?`\n\nCo-authored-by: ${job.coauthor.login} <${job.coauthor.email}>`:''}`,branch,content});
   message=job.coauthor?'Commit com coautoria criado.':'Commit da sessão criado.';
  }else if(job.step===2){
   const prs=await api.rest(`${base}/pulls?state=all&head=${encodeURIComponent(repo.owner.login+':'+branch)}&base=${encodeURIComponent(job.base)}`);
   const pr=prs?.[0]||await api.rest(`${base}/pulls`,'POST',{head:branch,base:job.base,title:`${job.title} (${job.item+1}/${job.count})`,body:`${job.content}\n\nWorkflow ${job.badge} criado no BadgeMasterfree pela conta @${job.login}.\n\nSession: ${job.run}`});
   if(!pr)fail('O GitHub não retornou o pull request.',502);job.pr=pr.number;job.url=pr.html_url;job.head=pr.head.sha;message=`PR #${pr.number} aberto.`;
   if(!job.autoMerge){job.results.push({type:'pr',number:pr.number,url:pr.html_url,status:'open'});job.item++;job.step=-1;}
  }else if(job.step===3){
   const pr=await api.rest(`${base}/pulls/${job.pr}`);if(!pr)fail('PR indisponível.',404);
   if(pr.head.sha!==job.head||pr.head.ref!==branch||pr.base.ref!==job.base)fail('O PR foi alterado depois da prévia. Merge interrompido.',409);
   if(!pr.merged){if(pr.state!=='open')fail('O PR foi fechado sem merge.',409);const result=await api.rest(`${base}/pulls/${job.pr}/merge`,'PUT',{sha:job.head,merge_method:'merge'});if(!result?.merged)fail('O GitHub não confirmou o merge. Confira os checks e regras do repositório.',409);}
   message=`Merge do PR #${job.pr} executado.`;
  }else{
   const pr=await api.rest(`${base}/pulls/${job.pr}`);if(!pr?.merged||!pr.merged_at)fail('Merge ainda não confirmado. Retome para consultar novamente.',409);
   job.results.push({type:'pr',number:job.pr,url:pr.html_url,status:'merged'});message=`Merge do PR #${job.pr} confirmado no GitHub.`;job.item++;job.step=-1;
  }
  url=job.url;
 }
 job.step++;job.done=job.item>=job.count;
 return {job:seal(job,key),done:job.done,message,url,completed:job.item,total:job.count,results:job.results};
}
