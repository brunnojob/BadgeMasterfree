import {gatewayRequest} from './gateway.js';
import {API_BASE} from './config.js';
export function createAuth({toast}){
 const accounts={primary:null,helper:null};const subscribers=new Set();let expiry;
 const read=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}};
 const write=(key,value)=>{try{if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,JSON.stringify(value));}catch{throw new Error('O navegador precisa permitir armazenamento de sessão para entrar com GitHub.');}};
 function notify(){
  const primary=accounts.primary;$('loginAccount').textContent=primary?`@${primary.user.login}`:'Entrar com GitHub ↗';$('logoutAccount').hidden=!primary;
  $('connectedAccount').textContent=primary?`Conta que executa e recebe o crédito: @${primary.user.login}`:'Entre com a conta GitHub que deverá receber o crédito das atividades.';
  $('helperAccount').textContent=accounts.helper?`Conta auxiliar: @${accounts.helper.user.login}`:'Nenhuma conta auxiliar conectada.';
  for(const fn of subscribers)fn(accounts);
  clearTimeout(expiry);const next=Math.min(...Object.values(accounts).filter(Boolean).map(a=>a.expiresAt));
  if(Number.isFinite(next))expiry=setTimeout(()=>{for(const role of ['primary','helper'])if(accounts[role]?.expiresAt<=Date.now()){accounts[role]=null;write('bm.auth.'+role,null);}notify();toast('Sessão expirada. Conecte novamente a conta.');},Math.max(0,next-Date.now()));
 }
 const $=id=>document.getElementById(id);
 async function login(role='primary'){
  try{if(accounts[role]){const dialog=$('authDialog');$('authRole').value=role;$('authTitle').textContent=`Conta conectada: @${accounts[role].user.login}`;$('authExplanation').textContent='Para escolher outra conta, continue e selecione o usuário na página oficial do GitHub.';dialog.showModal();return;}
   $('authRole').value=role;$('authTitle').textContent=role==='helper'?'Conectar conta auxiliar':'Entrar com GitHub';$('authExplanation').textContent=role==='helper'?'Esta segunda conta abrirá perguntas e aceitará respostas publicadas pela conta principal. Escolha uma conta diferente.':'Entre com a conta que executará os PRs, commits e respostas. Confira o usuário antes de executar.';$('authDialog').showModal();
  }catch(e){toast(e.message);}
 }
 $('loginAccount').onclick=()=>login('primary');$('connectAccount').onclick=()=>login('primary');$('connectHelper').onclick=()=>login('helper');
 $('closeAuth').onclick=()=>$('authDialog').close();
 $('authorizeAccount').onclick=async()=>{
  const button=$('authorizeAccount');button.disabled=true;$('authError').textContent='';
  try{const role=$('authRole').value;const result=await gatewayRequest(API_BASE,'start',{});write('bm.oauth.v3',{flow:result.flow,state:result.state,role,created:Date.now()});location.assign(result.url);}
  catch(e){$('authError').textContent=e.message;button.disabled=false;}
 };
 $('logoutAccount').onclick=()=>{for(const role of ['primary','helper']){accounts[role]=null;write('bm.auth.'+role,null);}write('bm.pendingJob',null);notify();toast('Sessões encerradas neste navegador.');};
 async function restore(){
  const params=new URLSearchParams(location.search);
  if(params.has('code')||params.has('error')){
   history.replaceState(null,'',location.pathname+'#automation');const saved=read('bm.oauth.v3');write('bm.oauth.v3',null);
   try{if(params.has('error'))throw new Error('Login cancelado no GitHub.');if(!saved||saved.state!==params.get('state')||Date.now()-saved.created>600000||!['primary','helper'].includes(saved.role))throw new Error('Login expirado ou estado inválido. Entre novamente.');
    const result=await gatewayRequest(API_BASE,'exchange',{flow:saved.flow,state:saved.state,code:params.get('code')});write('bm.auth.'+saved.role,result);
   }catch(e){toast(e.message);}
  }
  for(const role of ['primary','helper']){const saved=read('bm.auth.'+role);if(!saved||saved.expiresAt<=Date.now()){write('bm.auth.'+role,null);continue;}
   try{const user=await gatewayRequest(API_BASE,'me',undefined,saved.session);accounts[role]={...saved,user};}
   catch(e){if(e.status===401)write('bm.auth.'+role,null);toast(e.message);}
  }
  if(accounts.primary&&accounts.helper&&accounts.primary.user.id===accounts.helper.user.id){accounts.helper=null;write('bm.auth.helper',null);toast('A conta auxiliar deve ser diferente da conta principal.');}
  notify();
 }
 const auth={accounts,subscribe(fn){subscribers.add(fn);fn(accounts);},login,async request(action,body,params){if(!accounts.primary)throw new Error('Entre com a conta principal para continuar.');return gatewayRequest(API_BASE,action,body,accounts.primary.session,params);}};
 auth.ready=restore();return auth;
}
