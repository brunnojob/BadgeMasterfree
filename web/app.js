import {badges, validUsername, coauthorTrailer, normalizeProgress} from './model.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const link=(text,url,cls)=>{const a=el('a',text,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const format=n=>new Intl.NumberFormat('pt-BR').format(n);
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,6000);}
let progress={};
try{progress=normalizeProgress(JSON.parse(localStorage.getItem('bm.plan.v2')||'{}'));}catch{}
function updateProgress(){const done=Object.values(progress).filter(Boolean).length;$('progressLabel').textContent=`${done} / ${badges.length*3} etapas concluídas`;}
function saveProgress(){try{localStorage.setItem('bm.plan.v2',JSON.stringify(progress));}catch{toast('O armazenamento está indisponível. Exporte o plano para guardar seu progresso.');}updateProgress();}
for(const badge of badges){
  const card=el('article',undefined,'badge-card');const top=el('div',undefined,'badge-top');
  const img=el('img');img.src=`assets/${badge.image}`;img.alt='';img.width=92;img.height=92;img.loading='lazy';
  top.append(img,el('span',badge.type,'micro'));card.append(top,el('h3',badge.name),el('p',badge.description));
  const list=el('div',undefined,'checklist');
  badge.steps.forEach((step,i)=>{const label=el('label');const checkbox=el('input');checkbox.type='checkbox';const key=`${badge.id}:${i}`;checkbox.checked=Boolean(progress[key]);checkbox.onchange=()=>{if(checkbox.checked)progress[key]=true;else delete progress[key];saveProgress();};label.append(checkbox,el('span',step));list.append(label);});
  card.append(list,link(badge.link+' ↗',badge.url,'plain-link'));$('badgeGrid').append(card);
}
updateProgress();
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{
  for(const other of document.querySelectorAll('[data-tool]')){const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));$(other.dataset.tool+'Panel').hidden=!active;}
};
async function github(path,signal){
  const response=await fetch('https://api.github.com'+path,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
  if(!response.ok){if(response.status===404)throw new Error('Perfil não encontrado. Confira o usuário.');if([403,429].includes(response.status))throw new Error('Limite público do GitHub atingido. Aguarde alguns minutos e tente novamente.');throw new Error('O GitHub não respondeu à consulta. Tente novamente.');}
  return response.json();
}
let profileController;
$('profileForm').onsubmit=async event=>{
  event.preventDefault();const username=$('username').value.trim();if(!validUsername(username)){toast('Digite um usuário GitHub válido.');return;}
  profileController?.abort();profileController=new AbortController();const controller=profileController;$('analyze').disabled=true;$('profileResult').replaceChildren(el('p','Consultando o perfil público…'));
  try{
    const profile=await github(`/users/${encodeURIComponent(username)}`,controller.signal);
    const summary=el('div',undefined,'profile-summary');const image=el('img');image.src=profile.avatar_url;image.alt='';image.width=48;image.height=48;summary.append(image,link('@'+profile.login,profile.html_url),el('span',profile.bio||'Construindo em público.'));
    const stats=el('div',undefined,'stats');for(const [value,label] of [[profile.public_repos,'repositórios públicos'],[profile.followers,'seguidores'],[profile.following,'seguindo']]){const stat=el('div');stat.append(el('strong',format(value)),el('span',label));stats.append(stat);}
    $('profileResult').replaceChildren(summary,stats);
    const prs=el('p','Consultando PRs mesclados…','hint');$('profileResult').append(prs);
    try{const result=await github(`/search/issues?q=${encodeURIComponent('is:pr is:merged author:'+profile.login)}&per_page=1`,controller.signal);prs.replaceChildren(link(`${format(result.total_count)} PRs públicos mesclados ↗`,`https://github.com/search?q=${encodeURIComponent('is:pr is:merged author:'+profile.login)}&type=pullrequests`));if(result.incomplete_results)prs.append(' · resultado parcial');}
    catch(error){if(controller.signal.aborted)return;prs.textContent='PRs indisponíveis: '+error.message;}
    $('profileResult').append(el('p','Consulta pública de atividade; não verifica badges concedidas nem inclui contribuições privadas.','hint'));
  }catch(error){if(!controller.signal.aborted)$('profileResult').replaceChildren(el('p',error.name==='TimeoutError'?'O GitHub demorou para responder. Tente novamente.':error.message));}
  finally{if(profileController===controller)$('analyze').disabled=false;}
};
$('coauthorForm').onsubmit=event=>{event.preventDefault();try{$('trailer').value=coauthorTrailer($('coauthorName').value,$('coauthorEmail').value);}catch(error){toast(error.message);}};
$('copyTrailer').onclick=async()=>{if(!$('trailer').value){toast('Gere um trailer primeiro.');return;}try{await navigator.clipboard.writeText($('trailer').value);toast('Trailer copiado.');}catch{$('trailer').focus();$('trailer').select();toast('Selecione e copie o trailer com Ctrl+C.');}};
$('exportPlan').onclick=()=>{const text=['# Meu plano — BadgeMasterfree','',...badges.flatMap(b=>['## '+b.name,...b.steps.map((s,i)=>`- [${progress[`${b.id}:${i}`]?'x':' '}] ${s}`),'']),'Criado com https://brunnojob.github.io/BadgeMasterfree/'].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=el('a');a.href=url;a.download='badgemasterfree-plan.md';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function setupSearch(kind){
  const isRepo=kind==='repo', prefix=isRepo?'repo':'people', form=$(prefix+'Form'), results=$(prefix+'Results'), more=$(isRepo?'moreRepos':'morePeople');
  let page=1,query='',controller;
  async function run(append=false){
    controller?.abort();controller=new AbortController();const current=controller;const submit=form.querySelector('button');submit.disabled=true;more.hidden=true;
    if(!append)results.replaceChildren(el('p','Consultando o GitHub…'));
    try{const data=await github(`/search/${isRepo?'repositories':'users'}?q=${encodeURIComponent(query)}&per_page=12&page=${page}&sort=${isRepo?'updated':'followers'}&order=desc`,current.signal);if(current.signal.aborted)return;if(!append)results.replaceChildren();
      for(const item of data.items){const card=el('article',undefined,'result-card');const owner=isRepo?item.owner:item;const image=el('img');image.src=owner.avatar_url;image.alt='';image.width=40;image.height=40;image.loading='lazy';card.append(image,el('h3',isRepo?item.full_name:item.login),el('p',isRepo?(item.description||'Conheça o projeto e seu código-fonte.'):'Explore os projetos e as contribuições deste perfil.'));
        if(isRepo)card.append(el('div',`${item.language||'Open source'} · ${format(item.stargazers_count)} stars`,'micro'));
        card.append(link(isRepo?'Explorar projeto ↗':'Conhecer perfil ↗',item.html_url,'plain-link'));
        if(isRepo)card.append(link('Ver issues abertas ↗',item.html_url+'/issues','plain-link'));
        results.append(card);
      }
      if(!data.items.length&&!append)results.append(el('p','Nenhum resultado. Experimente outro termo.'));
      more.hidden=data.items.length<12||page*12>=Math.min(data.total_count,1000);if(data.incomplete_results)results.append(el('p','O GitHub retornou resultados parciais.','hint'));
    }catch(error){if(current.signal.aborted)return;if(append){page--;more.hidden=false;toast(error.message);}else results.replaceChildren(el('p',error.name==='TimeoutError'?'A consulta demorou. Tente novamente.':error.message));}
    finally{if(controller===current)submit.disabled=false;}
  }
  form.onsubmit=event=>{event.preventDefault();page=1;const input=$(prefix+'Query').value.trim().replace(/[\r\n]/g,' ');query=isRepo?`${input||'topic:good-first-issue'} archived:false is:public${$('language').value?` language:"${$('language').value}"`:''}`:(input||'type:user repos:>0');run();};
  more.onclick=()=>{page++;run(true);};
}
setupSearch('repo');setupSearch('people');
