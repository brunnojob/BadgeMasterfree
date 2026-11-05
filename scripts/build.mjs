import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
const model=await readFile('web/model.js','utf8');
const modelName=`model.${hash(model)}.js`;
const app=(await readFile('web/app.js','utf8')).replace('./model.js',`./${modelName}`);
const appName=`app.${hash(app)}.js`;
const css=await readFile('web/style.css','utf8');
const cssName=`style.${hash(css)}.css`;
const html=(await readFile('web/index.html','utf8')).replace('href="style.css"',`href="${cssName}"`).replace('src="app.js"',`src="${appName}"`);
for(const [name,content] of [[modelName,model],[appName,app],[cssName,css],['index.html',html],['app.js',app]])await writeFile(`dist/${name}`,content);
for(const [name,path] of Object.entries(assets))await cp(`Media/Badges/${path}`,`dist/assets/${name}`);
await cp('Media/Badges/Star-Struck/PNG/StarStruck_Gold.png','dist/badge.png');
await writeFile('dist/.nojekyll','');
