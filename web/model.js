export const badges = [
  {id:'pull-shark',name:'Pull Shark',image:'pull-shark.png',type:'CONTRIBUIÇÃO',description:'Leve uma melhoria do primeiro commit até um pull request mesclado.',steps:['Escolher uma issue e ler CONTRIBUTING','Implementar e validar a melhoria','Abrir o PR e acompanhar a revisão'],url:'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests',link:'Preparar um pull request'},
  {id:'pair',name:'Pair Extraordinaire',image:'pair.png',type:'COLABORAÇÃO',description:'Trabalhe em conjunto e registre a coautoria nos commits do PR.',steps:['Combinar uma tarefa com outro desenvolvedor','Criar a solução em conjunto','Registrar coautoria e acompanhar o merge'],url:'https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors',link:'Entender coautoria'},
  {id:'starstruck',name:'Starstruck',image:'starstruck.png',type:'PROJETO',description:'Construa um repositório útil que outras pessoas queiram acompanhar.',steps:['Publicar uma solução com exemplo funcional','Documentar instalação, uso e contribuição','Compartilhar o projeto com a comunidade'],url:'https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories',link:'Melhorar seu repositório'},
  {id:'galaxy',name:'Galaxy Brain',image:'galaxy.png',type:'CONHECIMENTO',description:'Ajude em discussões com respostas claras e soluções verificáveis.',steps:['Encontrar uma pergunta em Discussions','Reproduzir o problema e preparar uma resposta','Acompanhar o retorno de quem perguntou'],url:'https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/participating-in-a-discussion',link:'Participar de discussões'},
  {id:'sponsor',name:'Public Sponsor',image:'sponsor.png',type:'APOIO',description:'Conheça o GitHub Sponsors e apoie um mantenedor quando fizer sentido.',steps:['Conhecer os projetos e seus mantenedores','Consultar condições e visibilidade em Sponsors','Conferir o patrocínio e a exibição no GitHub'],url:'https://github.com/sponsors',link:'Conhecer GitHub Sponsors'},
  {id:'yolo',name:'YOLO',image:'yolo.png',type:'WORKFLOW',description:'Associado a um PR mesclado sem revisão. Entenda o fluxo e as regras do projeto.',steps:['Entender o processo de revisão do repositório','Validar a mudança com os checks disponíveis','Conferir as regras de merge com o mantenedor'],url:'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request',link:'Entender o merge'}
];
export function validUsername(value) { return typeof value==='string' && value.length<=39 && /^[a-z\d]+(?:-[a-z\d]+)*$/i.test(value); }
export function coauthorTrailer(name,email) {
  const n=name.trim(), e=email.trim();
  if(!n || /[\r\n<>]/.test(n) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(e)) throw new Error('Confira o nome e o e-mail do coautor.');
  return `Co-authored-by: ${n} <${e}>`;
}
export function normalizeProgress(value) {
  const result={};
  if(!value || typeof value!=='object') return result;
  for(const badge of badges) for(let i=0;i<badge.steps.length;i++) {
    const key=`${badge.id}:${i}`;
    if(value[key]===true)result[key]=true;
  }
  return result;
}
