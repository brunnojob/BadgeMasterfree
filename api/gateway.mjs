import { seal, unseal, random, challenge, targetPath } from '../server/security.mjs';
const scopes = 'read:user public_repo user:follow';
const json = (data, status=200, headers={}) => Response.json(data,{status,headers});
export async function handler(request) {
  const frontend = process.env.FRONTEND_URL || 'https://brunnojob.github.io/BadgeMasterfree/';
  const origin = new URL(frontend).origin;
  const incoming = request.headers.get('origin');
  const headers = {'Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Referrer-Policy':'no-referrer'};
  if (incoming && incoming !== origin) return json({error:'Origin not allowed'},403);
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  const action = new URL(request.url).searchParams.get('action');
  const ready = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.SESSION_SECRET?.length>=32);
  if (action==='status') return json({ready,callback:frontend,scopes},200,headers);
  if (!ready) return json({error:'O login está em configuração. Explore os projetos públicos enquanto isso.'},503,headers);
  const key=process.env.SESSION_SECRET;
  try {
    if (action==='start' && request.method==='POST') {
      const state=random(), verifier=random();
      const flow=seal({kind:'flow',state,verifier,exp:Date.now()+600000},key);
      const url=new URL('https://github.com/login/oauth/authorize');
      url.search=new URLSearchParams({client_id:process.env.GITHUB_CLIENT_ID,redirect_uri:frontend,scope:scopes,state,code_challenge:challenge(verifier),code_challenge_method:'S256',allow_signup:'false'});
      return json({url:url.href,flow,state},200,headers);
    }
    if (action==='exchange' && request.method==='POST') {
      const input=await request.json();
      let flow;
      try {flow=unseal(input.flow,key,'flow');} catch {return json({error:'Login expirado. Tente novamente.'},401,headers);}
      if(input.state!==flow.state || typeof input.code!=='string' || input.code.length>512) return json({error:'Invalid OAuth state'},400,headers);
      const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.GITHUB_CLIENT_ID,client_secret:process.env.GITHUB_CLIENT_SECRET,code:input.code,redirect_uri:frontend,code_verifier:flow.verifier}),signal:AbortSignal.timeout(12000)});
      const data=await response.json();
      if(!response.ok || !data.access_token) return json({error:'O GitHub não autorizou o login. Tente novamente.'},401,headers);
      const granted=new Set((data.scope||'').split(/[ ,]+/));
      if(!['public_repo','user:follow'].every(s=>granted.has(s))) return json({error:'As permissões para stars e follows não foram autorizadas.'},403,headers);
      const exp=Date.now()+Math.min(Number(data.expires_in)||3600,3600)*1000;
      return json({session:seal({kind:'session',token:data.access_token,exp},key),expiresAt:exp},200,headers);
    }
    let session;
    try {session=unseal(request.headers.get('authorization')?.replace(/^Bearer /,''),key,'session');} catch {return json({error:'Entre novamente com GitHub.'},401,headers);}
    const gh=async(path,method='GET')=>{
      const r=await fetch(`https://api.github.com${path}`,{method,headers:{Authorization:`Bearer ${session.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'BadgeMasterfree',...(method==='PUT'?{'Content-Length':'0'}:{})},signal:AbortSignal.timeout(12000)});
      if(r.status===204 || r.status===404) return {status:r.status};
      if(!r.ok) {const error=new Error(r.status===403 || r.status===429?'Limite da API ou permissão insuficiente. Aguarde e tente novamente.':'O GitHub não concluiu a solicitação.');error.status=r.status;throw error;}
      return {status:r.status,data:await r.json(),next:r.headers.get('link')?.includes('rel="next"')||false};
    };
    if(request.method==='GET' && action==='me') return json((await gh('/user')).data,200,headers);
    if(request.method==='GET' && action==='matches') {
      const list=async(path)=>{let rows=[],truncated=false;for(let page=1;page<=10;page++){const r=await gh(`${path}?per_page=100&page=${page}`);rows.push(...r.data);if(!r.next) return {rows,truncated};truncated=page===10;}return {rows,truncated};};
      const [followers,following]=await Promise.all([list('/user/followers'),list('/user/following')]);
      const ids=new Set(followers.rows.map(x=>x.id));
      return json({items:following.rows.filter(x=>ids.has(x.id)),truncated:followers.truncated||following.truncated},200,headers);
    }
    if(request.method==='POST' && action==='act') {
      const {type,target,confirmed}=await request.json();
      if(confirmed!==true) return json({error:'Confirme a ação individualmente.'},400,headers);
      let path;try{path=targetPath(type,target);}catch{return json({error:'Destino inválido.'},400,headers);}
      const existing=await gh(path);
      if(existing.status!==204) {const changed=await gh(path,'PUT');if(changed.status!==204) return json({error:'Destino indisponível.'},404,headers);}
      let match=false;
      if(type==='follow'){const me=(await gh('/user')).data;match=(await gh(`/users/${target}/following/${me.login}`)).status===204;}
      return json({ok:true,already:existing.status===204,match},200,headers);
    }
    return json({error:'Not found'},404,headers);
  } catch(error) {
    console.error('BadgeMasterfree request failed', {action,name:error.name,status:error.status||500});
    return json({error:error.status?error.message:'Não foi possível concluir. Tente novamente.'},error.status||500,headers);
  }
}
export const GET=handler;
export const POST=handler;
export const OPTIONS=handler;
