import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler } from '../api/gateway.mjs';
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
export function createAppServer(){
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');return;}
   if(url.pathname==='/api/gateway'){
    let size=0;const chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>32768){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
    const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
    const response=await handler(request);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
   const decoded=decodeURIComponent(url.pathname);
   const path=resolve(root,decoded==='/'?'index.html':'.'+decoded);
   if(!path.startsWith(root+'/')){res.writeHead(403);res.end('Forbidden');return;}
   try{const content=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:content);}catch(error){if(['ENOENT','EISDIR','ENOTDIR'].includes(error.code)){res.writeHead(404);res.end('Not found');return;}throw error;}
  }catch(error){console.error('HTTP request failed',{name:error.name});if(!res.headersSent)res.writeHead(500);res.end('Internal server error');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8080);
 const server=createAppServer();server.listen(port,'0.0.0.0',()=>console.log(`BadgeMasterfree listening on 0.0.0.0:${port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
}
