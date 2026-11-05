export function setupAutomation(auth,{toast}){
 const $=id=>document.getElementById(id);let current=null,running=false,stop=false,prepared=null,expiry=0;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const names={'pull-shark':'Pull Shark',yolo:'YOLO',pair:'Pair Extraordinaire',galaxy:'Galaxy Brain'};
 function log(message,url){const item=node('li');item.append(node('span',message));if(url){const a=node('a','Abrir no GitHub ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';item.append(a);}$('executionLog').append(item);}
 function storeJob(){try{if(current)sessionStorage.setItem('bm.pendingJob',JSON.stringify({job:current,uid:auth.accounts.primary?.user.id,expiry}));else sessionStorage.removeItem('bm.pendingJob');}catch{toast('Não foi possível guardar o ponto de retomada nesta aba.');}}
 function badgeChanged(){const badge=$('automationBadge').value;const max=badge==='pull-shark'?16:badge==='galaxy'?2:1;$('automationCount').max=max;$('automationCount').value=badge==='pull-shark'||badge==='galaxy'?2:1;$('pairOptions').hidden=badge!=='pair';$('galaxyOptions').hidden=badge!=='galaxy';$('mergeOption').hidden=badge==='galaxy';for(const el of $('pairOptions').querySelectorAll('input'))el.disabled=badge!=='pair';$('discussionQuestion').disabled=badge!=='galaxy';$('pairParticipated').required=badge==='pair';$('pairLogin').required=badge==='pair';$('discussionQuestion').required=badge==='galaxy';$('automationHint').textContent=badge==='galaxy'?'A conta auxiliar publica a pergunta; a principal responde; a auxiliar aceita a resposta. Discussions deve estar ativado com categoria Q&A.':'O fluxo cria branch, commit e PR. Com merge automático ativado, mescla e verifica o resultado, respeitando as regras do repositório.';}
 $('automationBadge').onchange=badgeChanged;badgeChanged();
 async function loadRepos(append=false){
  const button=$('loadRepositories');button.disabled=true;
  try{let page=1,more=true;const select=$('automationRepo');const selected=select.value;if(!append)select.replaceChildren(new Option('Selecione um repositório público',''));
   while(more&&page<=10){const result=await auth.request('repos',undefined,{page});for(const repo of result.items)if(!Array.from(select.options).some(o=>o.value===repo.full_name))select.add(new Option(repo.full_name,repo.full_name));more=result.more;page++;}
   select.value=selected;toast('Repositórios públicos atualizados.');
  }catch(e){toast(e.message);}finally{button.disabled=false;}
 }
 $('loadRepositories').onclick=()=>loadRepos();
 $('createLab').onclick=()=>{
  if(!auth.accounts.primary){auth.login();return;}
  $('createLabAccount').textContent=`Será criado o repositório público ${auth.accounts.primary.user.login}/badgemaster-lab. Se já existir, ele será selecionado.`;$('labDialog').showModal();
 };
 $('cancelLab').onclick=()=>$('labDialog').close();
 $('confirmLab').onclick=async()=>{const button=$('confirmLab');button.disabled=true;try{const result=await auth.request('lab',{confirmed:true});const select=$('automationRepo');if(!Array.from(select.options).some(o=>o.value===result.repo.full_name))select.add(new Option(result.repo.full_name,result.repo.full_name));select.value=result.repo.full_name;$('labDialog').close();toast('Laboratório selecionado.');}catch(e){toast(e.message);}finally{button.disabled=false;}};
 $('automationForm').onsubmit=async event=>{
  event.preventDefault();if(running||current){toast('Conclua ou encerre a execução atual antes de preparar outra.');return;}if(!auth.accounts.primary){auth.login();return;}
  const button=$('prepareAutomation');button.disabled=true;
  try{const result=await auth.request('prepare',{badge:$('automationBadge').value,repo:$('automationRepo').value,count:Number($('automationCount').value),title:$('automationTitle').value,content:$('automationContent').value,question:$('discussionQuestion').value,autoMerge:$('autoMerge').checked,coauthor:$('pairLogin').value,coauthorEmail:$('pairEmail').value,coauthorConfirmed:$('pairParticipated').checked,helperSession:auth.accounts.helper?.session});
   prepared=result.job;const p=result.preview;$('executionPreview').replaceChildren();for(const [label,value] of [['Conta que recebe o crédito',p.account],['Repositório',p.repository],['Fluxo',names[p.badge]],['Quantidade',p.count],['Merge automático',p.badge==='galaxy'?'Não se aplica':p.autoMerge?'Sim':'Não; PRs ficarão abertos'],...(p.coauthor?[['Coautor',p.coauthor]]:[]),...(p.helper?[['Conta auxiliar',p.helper]]:[])]){const row=node('p');row.append(node('strong',label+': '),node('span',String(value)));$('executionPreview').append(row);}
   $('previewContent').textContent=(p.question?`Pergunta:\n${p.question}\n\nResposta:\n`:'')+p.content;$('runDialog').showModal();
  }catch(e){toast(e.message);}finally{button.disabled=false;}
 };
 $('cancelRun').onclick=()=>{prepared=null;$('runDialog').close();};
 $('confirmRun').onclick=()=>{current=prepared;prepared=null;expiry=Date.now()+3600000;storeJob();$('executionLog').replaceChildren();$('runDialog').close();execute();};
 async function execute(){
  if(running||!current)return;running=true;stop=false;$('pauseExecution').hidden=false;$('resumeExecution').hidden=true;$('discardExecution').hidden=true;$('executionStatus').textContent='Executando na conta conectada…';$('prepareAutomation').disabled=true;
  try{while(current&&!stop){const result=await auth.request('step',{job:current,confirmed:true,helperSession:auth.accounts.helper?.session});current=result.job;storeJob();log(result.message,result.url);$('executionStatus').textContent=`${result.completed||0} / ${result.total||'?'} atividades concluídas`;
    if(result.done){current=null;storeJob();$('executionStatus').textContent='Atividades confirmadas no GitHub. A exibição das badges pode levar algum tempo.';break;}
    await new Promise(resolve=>setTimeout(resolve,1100));
   }
   if(stop&&current)$('executionStatus').textContent='Pausado. As operações já concluídas permanecem no GitHub.';
  }catch(e){log(e.message);$('executionStatus').textContent='Execução interrompida. Confira o erro e retome do último passo.';}
  finally{running=false;$('pauseExecution').hidden=true;$('resumeExecution').hidden=!current;$('discardExecution').hidden=!current;$('prepareAutomation').disabled=Boolean(current);}
 }
 $('pauseExecution').onclick=()=>{stop=true;$('executionStatus').textContent='Pausando após a operação em andamento…';};
 $('resumeExecution').onclick=execute;
 $('discardExecution').onclick=()=>{if(running)return;current=null;storeJob();$('resumeExecution').hidden=true;$('discardExecution').hidden=true;$('prepareAutomation').disabled=false;$('executionStatus').textContent='Execução encerrada. Os registros já criados no GitHub foram mantidos.';};
 auth.subscribe(accounts=>{
  $('automationFields').disabled=!accounts.primary||running;$('automationForm').setAttribute('aria-busy',String(running));
  if(!accounts.primary){stop=true;current=null;$('resumeExecution').hidden=true;$('discardExecution').hidden=true;return;}
  try{const saved=JSON.parse(sessionStorage.getItem('bm.pendingJob')||'null');if(saved&&saved.uid===accounts.primary.user.id&&saved.expiry>Date.now()&&!running){current=saved.job;expiry=saved.expiry;$('resumeExecution').hidden=false;$('discardExecution').hidden=false;$('prepareAutomation').disabled=true;$('executionStatus').textContent='Há uma execução pendente. Retome para consultar o último passo.';}}catch{}
 });
}
