import { neon } from '@neondatabase/serverless';
import { memberProfile } from './community.mjs';

export class NeonCommunityStore {
  constructor(url,sql) {
    this.sql=sql || neon(url);
    this.initialized=null;
  }
  async ready() {
    if(!this.initialized) this.initialized=this.sql`CREATE TABLE IF NOT EXISTS badgemaster_members (
      id BIGINT PRIMARY KEY,
      login TEXT NOT NULL,
      profile JSONB NOT NULL,
      visible BOOLEAN NOT NULL,
      updated BIGINT NOT NULL
    )`.catch(error=>{this.initialized=null;throw error;});
    await this.initialized;
  }
  async get(id) {
    await this.ready();
    const rows=await this.sql`SELECT profile FROM badgemaster_members WHERE id=${id}`;
    return rows[0]?.profile || null;
  }
  async save(user,input) {
    const profile=memberProfile(user,input);
    await this.ready();
    await this.sql`INSERT INTO badgemaster_members (id,login,profile,visible,updated)
      VALUES (${user.id},${user.login},${JSON.stringify(profile)}::jsonb,${profile.visible},${Date.now()})
      ON CONFLICT(id) DO UPDATE SET login=EXCLUDED.login,profile=EXCLUDED.profile,visible=EXCLUDED.visible,updated=EXCLUDED.updated`;
    return profile;
  }
  async list(query='',page=1) {
    await this.ready();
    const pattern=`%${query.replace(/[!%_]/g,'!$&')}%`;
    const rows=await this.sql`SELECT profile FROM badgemaster_members
      WHERE visible=true AND profile::text ILIKE ${pattern} ESCAPE '!'
      ORDER BY updated DESC,id ASC LIMIT 25 OFFSET ${(page-1)*24}`;
    return {items:rows.slice(0,24).map(row=>row.profile),more:rows.length>24,page};
  }
  async delete(id) {
    await this.ready();
    await this.sql`DELETE FROM badgemaster_members WHERE id=${id}`;
  }
}
