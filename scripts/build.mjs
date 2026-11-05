import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
const assets={
  'pull-shark.png':'Pull-Shark/PNG/PullShark.png',
  'pair.png':'Pair-Extraordinaire/PNG/PairExtraordinaire.png',
  'starstruck.png':'Star-Struck/PNG/StarStruck_Gold.png',
  'galaxy.png':'Galaxy-Brain/PNG/GalaxyBrain.png',
  'sponsor.png':'GitHub-Sponsor/PNG/GitHubSponsorBadge.png',
  'yolo.png':'YOLO/PNG/YOLO_Badge.png'
};
await rm('dist',{recursive:true,force:true});
await mkdir('dist/assets',{recursive:true});
for(const file of ['index.html','style.css','app.js','model.js'])await cp(`web/${file}`,`dist/${file}`);
for(const [name,path] of Object.entries(assets))await cp(`Media/Badges/${path}`,`dist/assets/${name}`);
await cp('Media/Badges/Star-Struck/PNG/StarStruck_Gold.png','dist/badge.png');
await writeFile('dist/.nojekyll','');
