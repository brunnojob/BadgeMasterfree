export function setupCommunity({request,getViewer,login,toast}) {
  const $=id=>document.getElementById(id);
  let profile=null, page=1, version=0, editing=false, query='';
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const link=(label,url)=>{const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function renderMember(member) {
    const card=node('article');card.className='member-card';
    const avatar=node('img');avatar.src=member.avatar;avatar.alt='';avatar.loading='lazy';
    card.append(avatar,node('h3',member.name),link(`@${member.login} ↗`,member.url),node('p',member.bio),node('p',member.skills));
    if(member.available){const badge=node('span','Disponível para colaborar');badge.className='tag';card.append(badge);}
    const projects=node('div');projects.className='member-projects';
    for(const repo of member.projects)projects.append(link(repo+' ↗',`https://github.com/${repo}`));
    card.append(projects,link('Conhecer no GitHub ↗',member.url));return card;
  }
  async function load(more=false) {
    const current=++version;
    if(!more){page=1;$('memberList').replaceChildren(node('p','Carregando comunidade…'));}
    $('moreMembers').hidden=true;
    try{
      const data=await request('community',undefined,{q:query,page});
      if(current!==version)return;
      if(!more)$('memberList').replaceChildren();
      for(const member of data.items)$('memberList').append(renderMember(member));
      if(!more&&!data.items.length)$('memberList').append(node('p','Nenhum perfil encontrado. Crie seu cadastro e convide sua rede.'));
      $('moreMembers').hidden=!data.more;
    }catch(error){if(current!==version)return;if(more)page--;else $('memberList').replaceChildren(node('p',error.message));toast(error.message);}
  }
  function openEditor(){
    const user=getViewer();if(!user)return;
    $('profileTitle').textContent=profile?'Editar cadastro':'Criar cadastro';
    $('profileIdentity').textContent=`Identificado como @${user.login}`;
    $('profileName').value=profile?.name||user.name||user.login;
    $('profileBio').value=profile?.bio||user.bio||'';
    $('profileSkills').value=profile?.skills||'';
    $('profileProjects').value=(profile?.projects||[]).join('\n');
    $('profileAvailable').checked=profile?.available||false;
    $('profileVisible').checked=profile?.visible||false;
    $('deleteProfile').hidden=!profile;$('profileFeedback').textContent='';
    $('profileDialog').showModal();
  }
  async function edit(){
    if(!getViewer()){sessionStorage.setItem('bm.register','1');login();return;}
    try{profile=(await request('profile')).profile;openEditor();}catch(e){toast(e.message);}
  }
  $('editProfile').onclick=edit;
  $('closeProfile').onclick=()=>$('profileDialog').close();
  $('memberSearch').onsubmit=e=>{e.preventDefault();query=$('memberQuery').value.trim();load();};
  $('moreMembers').onclick=()=>{page++;load(true);};
  $('profileForm').onsubmit=async e=>{
    e.preventDefault();if(editing)return;editing=true;$('saveProfile').disabled=true;
    try{
      profile=(await request('profile',{name:$('profileName').value,bio:$('profileBio').value,skills:$('profileSkills').value,projects:$('profileProjects').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),available:$('profileAvailable').checked,visible:$('profileVisible').checked})).profile;
      $('profileDialog').close();$('editProfile').textContent='Editar meu perfil';toast('Cadastro salvo. Seu perfil já está pronto.');load();
    }catch(error){$('profileFeedback').textContent=error.message;}finally{editing=false;$('saveProfile').disabled=false;}
  };
  $('deleteProfile').onclick=async()=>{
    if(editing||!confirm('Excluir seu cadastro, bio e projetos da comunidade? Sua conta GitHub será mantida.'))return;
    editing=true;$('deleteProfile').disabled=true;
    try{await request('profile',{delete:true});profile=null;$('profileDialog').close();$('editProfile').textContent='Criar meu perfil ↗';toast('Cadastro excluído.');load();}
    catch(e){$('profileFeedback').textContent=e.message;}finally{editing=false;$('deleteProfile').disabled=false;}
  };
  return {edit,load,signedOut(){$('signup').textContent='Criar cadastro';profile=null;$('profileDialog').close();$('editProfile').textContent='Criar meu perfil ↗';},async signedIn(){
    $('signup').textContent='Meu cadastro';
    try{profile=(await request('profile')).profile;const register=sessionStorage.getItem('bm.register');sessionStorage.removeItem('bm.register');$('editProfile').textContent=profile?'Editar meu perfil':'Criar meu perfil ↗';if(!profile||register)openEditor();}catch(e){toast(e.message);}
  }};
}
