import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const fail = (message, status=400) => { throw Object.assign(new Error(message), {status}); };
const text = (value, max, label) => {
  if (typeof value !== 'string' || value.length > max) fail(`${label}: limite de ${max} caracteres.`);
  return value.trim();
};
export function validateProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Cadastro inválido.');
  const name=text(input.name,80,'Nome');
  if (!name) fail('Informe seu nome.');
  const bio=text(input.bio,600,'Bio');
  const skills=text(input.skills,200,'Habilidades');
  if (typeof input.available !== 'boolean' || typeof input.visible !== 'boolean') fail('Selecione a visibilidade e disponibilidade.');
  if (!Array.isArray(input.projects) || input.projects.length>6) fail('Adicione até 6 projetos.');
  const projects=[...new Set(input.projects.map(value=>{
    const repo=text(value,140,'Projeto');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]{1,100}$/.test(repo) || ['.','..'].includes(repo.split('/')[1])) fail('Use projetos no formato dono/repositorio.');
    return repo;
  }))];
  return {name,bio,skills,available:input.available,visible:input.visible,projects};
}
export function memberProfile(user,input) {
  if (!Number.isSafeInteger(user.id) || user.id<=0 || !/^[a-zA-Z0-9-]{1,39}$/.test(user.login)) fail('Identidade GitHub inválida.',401);
  return {...validateProfile(input),id:user.id,login:user.login,avatar:`https://avatars.githubusercontent.com/u/${user.id}`,url:`https://github.com/${user.login}`};
}
export class CommunityStore {
  constructor(path) {
    if (path!==':memory:') mkdirSync(dirname(resolve(path)),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY, login TEXT NOT NULL, profile TEXT NOT NULL, visible INTEGER NOT NULL, updated INTEGER NOT NULL);`);
  }
  get(id) { const row=this.db.prepare('SELECT profile FROM members WHERE id=?').get(id);return row?JSON.parse(row.profile):null; }
  save(user, input) {
    const profile=memberProfile(user,input);
    this.db.prepare('INSERT INTO members VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login,profile=excluded.profile,visible=excluded.visible,updated=excluded.updated').run(user.id,user.login,JSON.stringify(profile),Number(profile.visible),Date.now());
    return profile;
  }
  list(query='',page=1) {
    const pattern=`%${query.replace(/[\\%_]/g,'\\$&')}%`;
    const rows=this.db.prepare("SELECT profile FROM members WHERE visible=1 AND (profile LIKE ? ESCAPE '\\') ORDER BY updated DESC,id ASC LIMIT 25 OFFSET ?").all(pattern,(page-1)*24);
    return {items:rows.slice(0,24).map(row=>JSON.parse(row.profile)),more:rows.length>24,page};
  }
  delete(id) { this.db.prepare('DELETE FROM members WHERE id=?').run(id); }
  close() { this.db.close(); }
}
let store,path;
let remote,remoteUrl;
export function communityConfigured() {
  return Boolean(process.env.DATABASE_URL || (!process.env.VERCEL && process.env.COMMUNITY_DB_PATH));
}
export async function communityStore() {
  if(process.env.DATABASE_URL) {
    if(remoteUrl!==process.env.DATABASE_URL) {
      const { NeonCommunityStore }=await import('./community-postgres.mjs');
      remote=new NeonCommunityStore(process.env.DATABASE_URL);
      remoteUrl=process.env.DATABASE_URL;
    }
    return remote;
  }
  if(process.env.VERCEL) fail('Cadastro indisponível: conecte um banco Neon Postgres e configure DATABASE_URL na Vercel.',503);
  const next=process.env.COMMUNITY_DB_PATH;
  if (!next) fail('Cadastro indisponível: configure o armazenamento persistente da comunidade no servidor.',503);
  if (path!==next) {store?.close();store=new CommunityStore(next);path=next;}
  return store;
}
