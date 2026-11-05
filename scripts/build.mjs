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
const outputs={};
for(const file of ['model.js','gateway.js','config.js','auth.js','automation-ui.js','app.js']){
 let source=await readFile(`web/${file}`,'utf8');
 for(const [original,versioned] of Object.entries(outputs))source=source.replaceAll(`'./${original}'`,`'./${versioned}'`);
 const name=file.replace('.js',`.${hash(source)}.js`);outputs[file]=name;
 await writeFile(`dist/${name}`,source);
 if(file==='app.js')await writeFile('dist/app.js',source);
}
const css=await readFile('web/style.css','utf8');
const cssName=`style.${hash(css)}.css`;
const html=(await readFile('web/index.html','utf8')).replace('href="style.css"',`href="${cssName}"`).replace('src="app.js"',`src="${outputs['app.js']}"`);
await writeFile(`dist/${cssName}`,css);await writeFile('dist/index.html',html);
for(const [name,path] of Object.entries(assets))await cp(`Media/Badges/${path}`,`dist/assets/${name}`);
await cp('Media/Badges/Star-Struck/PNG/StarStruck_Gold.png','dist/badge.png');
await writeFile('dist/.nojekyll','');
